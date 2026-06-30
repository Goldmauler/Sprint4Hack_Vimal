# LexRedact — Approach & Execution Flow

This document explains *how* LexRedact actually works internally: the design philosophy, the exact request/response flow from upload to export, and how each subsystem (parsing, detection, risk scoring, review, theming, audit) fits together. For feature marketing and judge-facing comparisons, see `README.md`. This file is the engineering explanation.

---

## 1. Design Philosophy

PS3's failure mode isn't "Sam doesn't see flagged items" — it's that Sam sees them and still misses things, because:

1. A tool that only *hides* things gives him no signal about what it *didn't* hide. A miss is invisible by construction.
2. A flat list of every flagged item trains him to rubber-stamp. When the same name appears 9 times, confirming instance #1 feels like confirming all 9.
3. Trusting a single detector (regex *or* LLM, not both) means a category of PII that detector is structurally bad at will always slip through, no matter how careful the reviewer is.

So the system is built around three structural decisions, not just a confidence-threshold UI:

- **Two independent detectors, always both, never just one.** A deterministic regex/NLP layer and a contextual LLM layer each run on every document. Neither is "the real one" with the other as backup — they're complementary, and a missed-PII pass actively hunts for what *both* layers failed to flag originally.
- **Render the review queue as a problem to be solved, not a list to be clicked through.** Repeated entities collapse into one decision with a clearly counted blast radius. Risk score, not arrival order, decides what Sam sees first.
- **Never let an external dependency make a document unreviewable.** If Gemini is down, the document still loads, still gets a review queue, and Sam can still finish his job — just without the contextual layer for that pass.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React)                                                  │
│  LoadDocumentDialog → useReviewState (reducer) → ReviewWorkspace  │
└───────────────┬─────────────────────────────────┬─────────────────┘
                │ PDF/DOCX bytes                   │ text content
                ▼                                   ▼
        /api/extract-file                  /api/process-document
        (pdf-parse / mammoth)               /api/reprocess-theme
                │                                   │
                └──────────────► plain text ◄───────┘
                                       │
                          ┌────────────┴────────────┐
                          ▼                          ▼
                document-parser.ts           classify-document.ts
                (format detection)           (keyword theme scoring)
                          │                          │
                          ▼                          ▼
                pii-detector.ts (regex)      llm-client.ts (Gemini,
                gap-detection.ts (regex)      4-model fallback chain)
                          │                          │
                          └────────────┬─────────────┘
                                       ▼
                          document-processor.ts
                    (merge, dedupe, gap-scan again, risk score)
                                       │
                                       ▼
                              ReviewState (client)
                          spans, auditLog, reviewableSpanIds
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            entity-grouper.ts   CorrectionPanel    ExportButtons
          (× N instances UI)   (audit log entry)  (redacted .txt +
                                                     audit .json)
```

---

## 3. End-to-End Execution Flow

### Step 1 — Document enters the system

`LoadDocumentDialog.tsx` accepts four upload paths, all converging on the same `onLoad(text, filename)` callback:

| Input | Path |
|---|---|
| `.txt` / `.json` | `FileReader.readAsText()` client-side, instant |
| `.pdf` | `POST /api/extract-file` → `pdf-parse` extracts the text layer server-side |
| `.docx` | `POST /api/extract-file` → `mammoth.extractRawText()` server-side |
| Pasted text | Used directly |

`onLoad` calls `loadDocument(content, filename)` from `useReviewState`, which kicks off `runDocumentPipeline` — everything downstream of this point is format-agnostic; a PDF and a hand-typed paste are indistinguishable from here on.

### Step 2 — Format parsing (`document-parser.ts`)

`parseUploadedContent(content, filename)` looks at the raw string and decides which of four sub-formats it's looking at:

- **Plain text** — no annotations, the LLM/regex layer detects everything from scratch
- **JSON with a `suggestions` array** — pre-annotated by an upstream tool; treated as "existing suggestions to *audit*," not raw text to detect from scratch
- **Inline markers** `{{PERSON:0.95}}Name{{/}}` — parsed into annotations, markers stripped to produce `rawText`
- **Bracket markers** `[[PERSON NAME] John Smith [name]]` — same idea, different syntax

This matters because it changes the rest of the pipeline: imported annotations go through an **audit** path (Gemini checks *existing* calls for correctness), while raw text goes through a **detection** path (Gemini finds PII from nothing).

### Step 3 — Instant keyword-only pass (client-perceived speed)

Before any network call, `runDocumentPipeline` does a full local pass synchronously:

1. `classifyDocument(rawText)` — counts legal/medical/finance keyword hits (e.g. "plaintiff", "diagnosis", "routing") and scores a `DocumentType` (`general | legal | medical | finance | hybrid`) with a confidence derived from hit ratio. This is **not** an LLM call — it's instant.
2. `buildProcessedDocument(parsed, classification)` runs `detectAllPII()` (regex/pattern detection — see §4) and `detectGaps()` (a second, more aggressive regex pass — see §4) entirely client-request-free.
3. This result is dispatched immediately (`LOAD_DOCUMENT_PROCESSED`) so the UI never shows a blank screen — Sam sees *a* result within milliseconds, even before Gemini is asked anything.

### Step 4 — Async LLM refinement pass

Immediately after Step 3, the UI shows an "AI scanning..." banner and fires `POST /api/process-document` with the same content. Server-side (`route.ts`):

- If the document had **imported annotations** and `GEMINI_API_KEY` is set: `auditAnnotationsWithLLM()` asks Gemini to review each existing suggestion and flag any that look wrong (a structured FP/missed-PII audit, not blind re-detection).
- Otherwise, if `GEMINI_API_KEY` is set: Gemini is **always** the primary detector for raw text (not a last resort — `needsLlmFallback()` only decides whether to also re-run *classification* through the LLM, not whether to call it for detection at all). `detectRedactionsWithLLM()` returns `{ text, type, confidence, isFalsePositiveRisk }` suggestions.
- If Gemini throws (quota, network, no key, malformed response) at any point, the route catches it and sets `llmFallbackReason`, but **does not fail the request** — it just returns whatever the regex layer already produced.

`document-processor.ts` then merges `regexSpans + llmSpans`, deduplicates overlaps (highest confidence wins), runs gap detection **again** on the merged set (since the LLM result may have changed what counts as "already covered"), and applies risk scores. The result replaces the Step 3 state seamlessly — no flicker, no reload, just a queue that gets more accurate.

If the fetch itself throws (network failure), `LLM_REFINEMENT_END` fires and the Step 3 keyword-only result simply stands as final. **The document is never unreviewable.**

### Step 5 — Review

Spans land in one of five `SpanStatus` values:

| Status | Meaning |
|---|---|
| `auto-trusted` | confidence ≥ 0.78 (`AUTO_TRUST_THRESHOLD`), hidden immediately, not in the queue |
| `needs-review` | confidence 0.50–0.78, or flagged `isFalsePositiveRisk`, or matched a known boilerplate pattern |
| `missed` | found only by the gap-detection pass — never in the original suggestions at all |
| `confirmed-redact` / `confirmed-reveal` | Sam's decision, set via `APPLY_CORRECTION` |

`reviewableSpans` = everything still `needs-review` or `missed`, sorted by `riskScore` descending (§4.4) — highest-stakes items surface first regardless of arrival order.

`entity-grouper.ts` then buckets these by `normalize(text)::type` so five occurrences of "Dr. Emily Park" become one card with a "× 5 instances" badge instead of five separate rows. Each group/item also carries a context snippet (`extractContext`, ~55-char radius trimmed to word boundaries) so Sam doesn't need to scroll into the document to judge sensitivity.

### Step 6 — Correction

Every action (`Keep`, `False Positive`, `Confirm Missed PII`, exemption-code tag) dispatches `APPLY_CORRECTION`, which:

- Flips the span's status (`confirmed-redact` or `confirmed-reveal`)
- Pushes an `AuditLogEntry` (`spanId`, `action`, `previousStatus → newStatus`, `note`, ISO `timestamp`) onto the front of `auditLog`

Batch correction (from a grouped card) is the same dispatch looped over every span ID in the group, behind a one-step confirmation dialog that restates the count before applying. `UNDO_LAST_CORRECTION` pops the most recent audit entry and reverts that one span's status — `Ctrl+Z` is wired to this directly.

### Step 7 — Theme switching (mid-review rescope)

`setDocumentType(newTheme)` doesn't just relabel the document — it re-runs detection. It calls `POST /api/reprocess-theme`, which calls `detectRedactionsWithLLM(rawText, newTheme)` with a theme-specific prompt, then filters the regex fallback through `theme-filter.ts` (e.g. Finance theme suppresses `DIAGNOSIS` spans entirely). The same Gemini-then-regex-fallback resilience pattern from Step 4 applies here too. The whole document re-renders in place with the new scope — no reload.

### Step 8 — Approval gate

`canApprove` is true only when `reviewableSpans.length === 0` — every `needs-review` and `missed` span has been resolved one way or another. A clean document with zero detected PII can approve immediately (zero reviewable items, vacuously true) — this was a deliberate fix so "nothing to redact" isn't blocked behind a phantom requirement.

### Step 9 — Export

`ExportButtons.tsx` produces two artifacts:

- **Redacted document (`.txt`)** — `applyRedactions(rawText, spans)` walks the text and replaces every span whose *final* status is `auto-trusted` or `confirmed-redact` with a block marker, leaving `confirmed-reveal` spans as plain text.
- **Audit report (`.json`)** — `buildAuditJSON(spans, auditLog, documentType)` serializes every span (type, confidence, risk score, final status) alongside the full chronological `auditLog` (who decided what, when, with what note/exemption code). This is the artifact that proves the review actually happened and *why* each call was made — not just that "Approve" was clicked.

---

## 4. Detection Layer Details

### 4.1 Regex/pattern detector (`pii-detector.ts`)

Runs unconditionally, with zero network dependency. Pattern set: dates, case numbers, financial IDs (SSN-shaped, policy-number-shaped), financial amounts (`$1,200.00` through abbreviated `$4.2M`/`£500K`), phone numbers, email, street addresses, organizations, diagnosis phrases (`Diagnosis: ...`, `diagnosed with ...`), and person names (`Dr./Mr./Mrs.` prefixed, or a generic two-capitalized-word heuristic). Two exclusion lists (`NAME_EXCLUSIONS`, `NON_NAME_WORDS`) suppress known false-positive shapes — document field labels ("Patient:", "Address:"), legal boilerplate ("the undersigned", "Exhibit A"), and common imperative-verb sentence starts ("Call John", "Send Sarah") that would otherwise look like two-word names.

### 4.2 Gap detection (`gap-detection.ts`)

A **separate, independently-tuned** pattern set, deliberately more aggressive than §4.1's primary patterns, run against whatever the primary detector (regex or LLM) already found. Anything it matches that *isn't already covered* gets `status: "missed"`, `riskScore` floored at 90+ (always near the top of the queue), and `confidence: 0` (it was never "suggested" — it's being surfaced specifically *because* it wasn't). This is the structural answer to "the tool missed a phone number" — it isn't a confidence-threshold tweak, it's a second pass with a different job.

### 4.3 LLM detector (`llm-client.ts`)

Gemini is called through a **4-model fallback chain** (`gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite → gemini-2.5-flash-lite`), each tried with one retry on transient/503 errors before falling through to the next. A 429 (quota) on any model skips immediately to the next. Only if **all four** are exhausted does the call throw — and even then, the caller (`route.ts`) catches it and degrades to regex-only rather than failing the request. This is what powers the "Local Pattern-Detection Mode" banner: it's the terminal state of a four-deep fallback chain, not a single point of failure.

### 4.4 Risk scoring (`risk-rules.ts`)

Each `PIIType` has a domain-specific weight (0–100) per `DocumentType` — e.g. `DIAGNOSIS` is weighted 100 under `medical` but only 20 under `finance`; `FINANCIAL_ID` is 100 under `finance` but 50 under `medical`. `hybrid` documents take the max weight across medical/legal/finance for each type, since a hybrid document (e.g. a personal injury demand letter) needs the most conservative scope. Final score = `domainWeight × 0.6 + (1 − confidence) × 100 × 0.4`, except gap-detected (`missed`) spans, which are floored at `max(90, domainWeight)` — a missed item is risky almost by definition, regardless of what a confidence score would have said.

---

## 5. Resilience Chain (what happens when things fail)

This is the actual fallback order, end to end, for a single document load:

```
Imported JSON annotations? ──► auditAnnotationsWithLLM()
                                       │ fails/no key
                                       ▼
                              suspicion-heuristics.ts
                          (regex-based plausibility check
                           on the imported suggestions)

Raw text, no annotations? ──► detectRedactionsWithLLM()
        │                            │ fails/no key
        │                            ▼
        │                   regexSpans (always already computed)
        ▼                            │
   merge + dedupe ◄───────────────────┘
        │
        ▼
   gap-detection (always runs, regardless of upstream outcome)
        │
        ▼
   risk scoring → reviewable queue
```

At no point does a Gemini failure produce an empty queue, a crash, or a blocked review. The worst case is "the regex layer's recall instead of the LLM's recall" — strictly worse coverage, never zero coverage.

---

## 6. Why this is structurally different from a single-pass tool

A tool built as "LLM flags → low confidence goes to review" has exactly one failure mode for everything: whatever the LLM didn't flag is gone, full stop, with no mechanism to even notice. LexRedact's pipeline has three independent chances to catch a given piece of PII (regex primary, LLM primary, gap-detection secondary) and one of those three (gap-detection) is specifically designed to run *after* the other two and catch what they jointly missed. That's the concrete mechanism behind "fixing the tool's mistakes" — the system is built to expect to be wrong twice before a human ever sees the document, not to trust a single detector and hope the confidence threshold was tuned correctly.
