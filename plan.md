# Plan — Sam's Redaction Review (Sprintfour Hackathon, Problem 3)

## 1. Core Insight (the thing this app is actually arguing)

A false positive is annoying but safe. A missed PII is a breach, and it's the one
error type a fast-moving, over-trusting reviewer is structurally unlikely to catch —
because nothing is highlighted there to catch his eye. The whole design bet of this
app is: **don't just let Sam fix what's flagged — force the dangerous, invisible
errors into his field of view, and don't let him approve until he's touched every
one of them.** Everything below is in service of that one idea.

## 2. Tech Stack

- Next.js 15 (App Router), TypeScript
- Tailwind CSS + shadcn/ui (Button, Badge, Card, Popover, Dialog, Tooltip, Select)
- Local React state only — `useReducer`, no DB, no Supabase, no auth
- LLM classification layer is *structurally present* (clean prompt builder, typed
  response contract) but not wired to a live API key by default — keyword path is
  what actually runs in the demo, per the handout's "detection is a means to an
  end" guidance

## 3. Folder Structure

```
sam-redaction-review/
├── plan.md
├── package.json / tsconfig.json / tailwind.config.ts / next.config.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # mounts <ReviewWorkspace />
│   └── globals.css
├── components/
│   ├── ui/                         # shadcn primitives
│   ├── layout/
│   │   └── AppHeader.tsx           # title, progress ("4 of 6 reviewed"), Approve button
│   ├── document-type/
│   │   └── DocumentTypeBadge.tsx   # detected type + manual override <Select>
│   ├── document-viewer/
│   │   ├── DocumentViewer.tsx      # renders text with inline highlighted spans
│   │   └── SpanHighlight.tsx       # one highlighted span, click opens CorrectionPopover
│   ├── review-queue/
│   │   ├── ReviewQueue.tsx         # left sidebar, risk-sorted, only problematic items
│   │   └── ReviewQueueItem.tsx
│   ├── correction/
│   │   └── CorrectionPopover.tsx   # Keep / False Positive / Missed PII / note
│   ├── audit-log/
│   │   ├── AuditSidebar.tsx        # right sidebar, live log of corrections
│   │   └── AuditLogItem.tsx
│   └── final-output/
│       ├── FinalDocumentDialog.tsx # redacted preview + audit summary
│       └── ExportButtons.tsx       # .txt export, audit .json export
├── lib/
│   ├── types.ts
│   ├── mock-data.ts                # the document + the 12 seed spans
│   ├── constants.ts                # confidence thresholds, risk color tokens
│   ├── redaction-utils.ts          # apply spans -> final text, build audit JSON
│   └── detection/
│       ├── classify-document.ts    # keyword classifier + LLM fallback trigger
│       ├── llm-prompt.ts           # prompt template + typed response contract
│       ├── risk-rules.ts           # domain weight tables, risk score formula
│       └── gap-detection.ts        # finds PII the original suggestions missed
├── hooks/
│   └── useReviewState.ts           # single reducer: source of truth for the app
└── public/
```

## 4. Data Models (`lib/types.ts`)

```ts
export type DocumentType = "medical" | "legal" | "general" | "hybrid";

export type PIIType =
  | "PERSON" | "PHONE" | "DATE" | "CASE_NUMBER"
  | "FINANCIAL" | "FINANCIAL_ID" | "ORGANIZATION" | "DIAGNOSIS"
  | "ADDRESS" | "OTHER";

export type SpanStatus =
  | "auto-trusted"     // high confidence, not in the review queue
  | "needs-review"      // flagged: ambiguous / possible false positive
  | "missed"            // gap-detected, was never in the original suggestions
  | "confirmed-redact"   // Sam confirmed: keep hidden
  | "confirmed-reveal";  // Sam confirmed: false positive, unredact

export interface RedactionSpan {
  id: string;
  text: string;
  startOffset: number;
  endOffset: number;
  type: PIIType;
  confidence: number;          // 0–1, from the suggestion source
  riskScore: number;           // 0–100, computed by risk-rules.ts
  status: SpanStatus;
  isOriginalSuggestion: boolean; // false for gap-detected missed PII
  reviewerNote?: string;
}

export type CorrectionAction = "keep" | "false-positive" | "missed-pii" | "note-only";

export interface AuditLogEntry {
  id: string;
  spanId: string;
  spanText: string;
  action: CorrectionAction;
  previousStatus: SpanStatus;
  newStatus: SpanStatus;
  note?: string;
  timestamp: string; // ISO
}

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  method: "keyword" | "llm" | "manual-override";
  keywordScores?: { legal: number; medical: number };
}
```

## 5. Mock Data Plan

**Document**: a ~550-word personal-injury demand letter — naturally hybrid
(legal frame: case number, parties, settlement demand, insurance policy / medical
content: treating physician, diagnosis, injury date), which is exactly what's
needed to exercise the hybrid classifier path.

**12 seed spans**, deliberately split into three buckets:

| # | Span | Type | Confidence | Bucket | Why it's in the queue (or not) |
|---|---|---|---|---|---|
| 1 | "John Mitchell" (claimant) | PERSON | 0.95 | auto-trusted | correct, high confidence — no review needed |
| 2 | "Case No. CV-2024-08841" | CASE_NUMBER | 0.91 | auto-trusted | correct, high confidence |
| 3 | "Policy No. AIG-4471-XJ" | FINANCIAL_ID | 0.93 | auto-trusted | correct, high confidence |
| 4 | "$45,750.00" | FINANCIAL | 0.88 | auto-trusted | correct, high confidence |
| 5 | "March 14, 2024" (injury date) | DATE | 0.79 | auto-trusted | correct, high confidence |
| 6 | "Springfield General Hospital" | ORGANIZATION | 0.62 | **needs-review** | borderline — correctly redacted, but Sam should consciously confirm it, not just trust it |
| 7 | "the undersigned" | OTHER | 0.55 | **needs-review → false positive** | boilerplate legal phrase, wrongly redacted |
| 8 | "Exhibit C" | OTHER | 0.51 | **needs-review → false positive** | document reference, not PII |
| 9 | "the plaintiff" | OTHER | 0.48 | **needs-review → false positive** | generic legal role, not an identifier |
| 10 | "Dr. Sarah Chen" (treating physician) | PERSON | — | **missed (gap-detected)** | never suggested, left fully visible — high risk |
| 11 | "(555) 867-5309" | PHONE | — | **missed (gap-detected)** | never suggested, left fully visible — high risk |
| 12 | "Robert Mitchell" (claimant's next of kin, mentioned once in passing) | PERSON | — | **missed (gap-detected)** | second name in the doc, easy to skim past — high risk |

This gives 5 spans the reviewer never has to think about, 4 genuine false
positives/borderline calls, and 3 genuinely dangerous misses — a realistic mix,
not a contrived one.

## 6. Detection Logic

### 6.1 Keyword classification (`classify-document.ts`)
Count hits against two keyword sets:
- legal: `plaintiff, defendant, case no, exhibit, settlement, attorney, policy, demand, liability`
- medical: `patient, diagnosis, physician, treatment, prescribed, hospital, injury, symptom`

Rules:
- one side dominates (ratio > ~1.8x) → that type, `method: "keyword"`
- both sides clear a minimum hit threshold and are within ~1.8x of each other →
  `"hybrid"`
- both sides low/sparse → `"general"`
- total signal too weak to be confident either way → **trigger the LLM fallback**

### 6.2 LLM fallback (`llm-prompt.ts`)
Only called when keyword confidence is low. Prompt returns strict JSON:
`{ "type": "...", "confidence": 0-1, "reasoning": "..." }`. Typed and validated
before use; never blocks the UI (keyword result renders instantly, LLM result — if
used — can refine it after).

### 6.3 Domain risk rules (`risk-rules.ts`)
Per-type weight table, taken as the max across applicable domains for hybrid docs
(err toward caution, never toward leniency):

| Type | Medical weight | Legal weight |
|---|---|---|
| PERSON | high | high |
| DATE | high (HIPAA-style identifier) | medium |
| DIAGNOSIS | very high | n/a |
| ORGANIZATION | medium | medium |
| CASE_NUMBER | n/a | high |
| FINANCIAL | low | high |
| PHONE | high | high |

`riskScore = f(confidenceGap, domainWeight, isGapDetected)` — gap-detected
(missed) spans get a flat high-risk floor regardless of type, since an undetected
identifier is categorically worse than a low-confidence redaction.

### 6.4 Gap detection (`gap-detection.ts`)
Re-scans the raw document text for PII-shaped patterns (name-like capitalized
sequences near "Dr."/relational cues, phone-number regex, etc.) that fall
**outside** every existing span's offset range. Anything found becomes a `missed`
status span and is injected into the review queue — this is the mechanism that
makes Dr. Chen's name, the phone number, and Robert Mitchell visible at all.

## 7. UI / UX Flow

1. **Load** — document and spans are mock data, so classification and risk
   scoring run synchronously on mount. No loading state for this — it's instant
   by construction, matching the "everything after load should feel instant"
   requirement.
2. **Workspace** — three columns: `ReviewQueue` (left, risk-sorted, only the 6
   problematic spans) · `DocumentViewer` (center, auto-trusted spans shown as
   muted/plain redaction blocks, flagged + missed spans shown in a strong color)
   · `AuditSidebar` (right, fills up live as Sam acts).
3. **Correcting** — clicking a queue item or an in-document highlight opens
   `CorrectionPopover`: three buttons (`Keep`, `False Positive`, `Missed PII`) plus
   an optional note. Keyboard shortcuts (`K` / `F` / `M`) so Sam never has to reach
   for the mouse — directly serves the "minimize clicks" requirement.
4. **Live feedback** — the moment Sam acts, the item disappears from the queue and
   appears in the audit log; header progress counter updates (`4 of 6 reviewed`).
5. **Guardrail** — "Approve & Generate Final Document" stays disabled, with a
   tooltip explaining why, until the review queue is empty. This is the
   deliberate design choice that blocks the exact failure mode in the prompt: Sam
   glancing and hitting "approve all."
6. **Final output** — `FinalDocumentDialog` shows the clean redacted text (auto-
   trusted + confirmed-redact spans hidden, confirmed-reveal spans restored,
   confirmed missed-PII spans newly hidden) plus two exports: redacted `.txt` and
   a full audit `.json`.

## 8. State Management

Single `useReviewState` reducer, one source of truth:

```
state = { spans, auditLog, documentType, classificationMethod, isApproved }
actions = SET_DOCUMENT_TYPE | APPLY_CORRECTION | APPROVE | RESET
```

`SET_DOCUMENT_TYPE` (manual override) re-runs risk scoring against the new
domain's weight table immediately — no reload, no fetch, just a recompute.

## 9. Key Design Decisions

- **Missed PII lives in the same queue as false positives**, not a separate tab —
  one inbox, one triage motion, matching how reviewers actually work fast.
- **Approve is hard-blocked on an empty queue.** Costs a small amount of speed;
  buys back the one failure mode the entire problem statement is about. Worth it.
- **Auto-trusted spans are muted, not hidden.** Full transparency (show
  everything loudly) would recreate the alert-fatigue problem; hiding them
  entirely would recreate the "tool I can't interrogate" problem. Muted-but-
  visible is the deliberate middle point.
- **No live LLM call by default.** Detection is explicitly a means to an end per
  the handout — the build hours go into the correction experience, not into
  detector accuracy.

## 10. Explicitly NOT Building (and why)

- No persistence, auth, or multi-user — single-session prototype only
- No real PDF/OCR ingestion — plain-text mock document
- No fine-tuned PII model — keyword/regex + an LLM-prompt scaffold is enough to
  make the *review experience* realistic, which is the actual point
- No undo/redo stack beyond the audit log — the log itself is the record
- No multi-document batch handling — that's Maya's problem (Problem 2), not Sam's

## 11. Build Phases (≈8 hrs)

| Phase | Time | Deliverable |
|---|---|---|
| 0 | 30m | Scaffold: `create-next-app`, shadcn install, folder skeleton |
| 1 | 45m | `types.ts` + `mock-data.ts` (real document + 12 spans) |
| 2 | 60m | `classify-document.ts`, `risk-rules.ts`, `gap-detection.ts` |
| 3 | 30m | `useReviewState` wired to mock data + detection on mount |
| 4 | 60m | `DocumentViewer` + `SpanHighlight` |
| 5 | 75m | `ReviewQueue` + `CorrectionPopover` + keyboard shortcuts |
| 6 | 30m | `AuditSidebar` |
| 7 | 45m | Approve flow + `FinalDocumentDialog` + exports |
| 8 | 30m | `DocumentTypeBadge` + manual override |
| 9 | 45m | Polish: color tokens, empty states, copy, responsiveness |
| 10 | 45m | README, half-page writeup draft, demo recording |

## 12. Pre-Demo Checklist

- [ ] All 12 spans render at correct text offsets, no overlap bugs
- [ ] Manual document-type override re-scores risk instantly, no reload
- [ ] Review queue shows exactly the 6 flagged/missed items, sorted risk-desc
- [ ] Keyboard shortcuts work while a popover is focused
- [ ] Approve button disabled with explanatory tooltip until queue is empty
- [ ] Final document text is correct for all five status outcomes (auto-trusted,
      confirmed-redact, confirmed-reveal, gap-detected-now-redacted)
- [ ] Audit JSON export is valid and human-readable
- [ ] `npm run dev` runs clean, no console errors