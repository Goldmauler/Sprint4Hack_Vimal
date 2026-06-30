# LexRedact — Sam's Redaction Correction Tool

> **Sprintfour Hackathon · Problem Statement 3: Fixing the tool's mistakes**

A full-stack Next.js application built for the exact scenario where a PII redaction tool gets it wrong — hiding harmless boilerplate while leaving a real phone number and a real name untouched — and the reviewer moving fast doesn't catch either mistake.

---

## Live Demo

**[https://sprint4hack-vimal.onrender.com](https://sprint4hack-vimal.onrender.com)**

> The app is deployed on Render's free tier — if it shows a loading spinner on first open, wait 20–30 seconds for the cold start. It will be fully functional once loaded.

---

## Demo Video

**[Watch the full walkthrough on Google Drive](https://drive.google.com/drive/folders/1RK90YvfZXxjfcZCPq44vH_fAT3s5TIxb?usp=sharing)**

> **Note on the video:** The recording was made during local development where the Gemini API quota was hit mid-session (free tier: 50 requests/day). You may see the amber "AI detection unavailable" fallback banner in some parts of the video — this is the graceful degradation working as intended, not a bug. The **live deployed app** at the link above has a fresh API key and runs full Gemini detection end-to-end. For the clearest demonstration of AI-assisted detection, use the live deployment.

The video covers:
- Loading the PS3 core scenario (false positives + missed PII in a single document)
- The entity grouping feature catching a name that appears 9 times
- Batch correction with confirmation guard
- Exemption code quick-tags and audit trail
- The "What your review caught" end-of-review summary

---

## The Problem

Sam is reviewing a tool's suggested redactions. The tool has hidden a few things that are not sensitive at all, and, worse, it has left a phone number and a name untouched. Sam is moving fast and trusts the tool a little too much. The mistakes that slip through are the ones he does not stop to look at.

The standard solution — show Sam every flagged item one at a time — misses the actual failure mode. Sam doesn't miss items because there are too many to click. He misses them because he makes one decision and assumes it applies everywhere. When "John Mitchell" appears five times and he confirms one instance, four slip through without a second thought.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Requires a Gemini API key** — create `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at [aistudio.google.com](https://aistudio.google.com). The app degrades gracefully to regex-based detection when the key is absent or rate-limited, with a clear UI banner explaining the fallback.

---

## What Makes This Different

Most submissions to PS3 will build the same thing: an LLM flags items at varying confidence levels, low-confidence ones go into a review queue, human clicks through them. That is the obvious interpretation of "human in the loop."

LexRedact is built around a different question: **not whether Sam sees each item, but whether he understands he is seeing all of it.**

### Novel Feature 1 — Entity Grouping with Batch Correction

When "John Mitchell" appears five times in a document, five separate queue items is the wrong UI. Sam reviews the first one, feels done, and moves on. This is the mechanism behind the PS3 failure mode — not inattention, not carelessness, but a reasonable assumption that happens to be wrong.

Entity Grouping makes the count impossible to miss:

- All spans sharing the same text and PII type are bucketed into **one group card**
- A **"× N instances"** badge surfaces immediately — Sam cannot see the card without seeing the count
- **"Redact all N"** and **"False positive — all N"** apply the decision across every occurrence in one click
- A **confirmation dialog** fires first: *"Redact all 5 instances of 'John Mitchell'?"* — the number is shown again so Sam cannot accidentally confirm without registering it
- **"Review individually"** expands the group to show each occurrence with the surrounding sentence, so he can check them if needed

This is directly inspired by Philterd/Arbiter's structured review workflow, adapted to the specific failure mode described in PS3.

### Novel Feature 2 — Context Snippets Per Queue Item

Standard review queues show the redacted text: `"John Mitchell"`. That tells Sam what is hidden but not whether it matters in this sentence.

Every item in LexRedact shows the surrounding text:

```
…arising from the injury of «John Mitchell», who was transported…
```

Sam can judge whether the text is genuinely sensitive without scrolling to find it in the document. This is taken directly from the EMR HITL paper (2023) on reducing cognitive load for expert reviewers correcting medical free text. The key insight from that paper: reviewers make better decisions when they see context, not just the isolated span.

### Novel Feature 3 — Structured Exemption Codes

When Sam marks something as a false positive, the audit log just records "false positive." That is not useful for compliance review or model retraining.

LexRedact adds one-tap structured tags at the correction step:

| Code | Label |
|---|---|
| `FP-COMMON-NAME` | Common name / word |
| `FP-LEGAL-TERM` | Legal boilerplate |
| `FP-JOB-TITLE` | Job title / role |
| `FP-ORG-NAME` | Organisation (not PII) |
| `FP-GENERIC` | Not sensitive in context |
| `MP-CONTEXT` | PII by context |
| `MP-PHONE` | Phone / contact |
| `MP-NAME` | Person name |
| `MP-ID` | ID / account number |

Tags write machine-readable codes into the audit JSON: `[FP-LEGAL-TERM] Legal boilerplate`. Every decision is now queryable — you can pull all `FP-LEGAL-TERM` overrides to improve the model's training data, or show a compliance auditor exactly why each item was unredacted. Taken from Philterd/Arbiter's exemption code system used in regulated legal and medical workflows.

### Novel Feature 4 — "What Your Review Caught" Summary

The final document dialog shows a post-review breakdown:

- **Missed PII you caught** — items the AI didn't flag that gap detection found and you confirmed
- **False positives you unblocked** — items the AI would have wrongly hidden that you corrected
- **Decisions logged with exemption codes** — structured audit entries for compliance

This makes Sam's review legible and defensible. Not just "document approved" but "your review caught 2 pieces of PII the AI missed and removed 5 false positives the AI would have hidden." Directly addresses the PS3 requirement that Sam be able to work quickly and imperfectly while still producing a trustworthy output.

---

## How LexRedact Compares

| Capability | Standard HITL tool | LexRedact |
|---|---|---|
| PII detection | Flags items, assigns confidence | Gemini primary detection + regex gap-scan for missed PII |
| Review queue | One item at a time | Grouped by entity — shows "× N instances" |
| Multi-instance handling | Reviewer decides each separately | Batch action with confirmation guard |
| Context per item | Bare redacted text | Surrounding sentence with span highlighted |
| False positive logging | Binary yes/no | Structured exemption codes (machine-readable) |
| End-of-review feedback | None | "What your review caught" — missed PII + FP count |
| Undo | Usually absent | Ctrl+Z reverts last correction |
| AI failure handling | Error or crash | 4-model fallback chain + amber UI banner |
| Document type handling | Single detection mode | 5 themes (medical/legal/hybrid/finance/general), switchable mid-review |

---

## Core Workflow

1. **Upload** — plain text, JSON with pre-annotated suggestions, inline `{{TYPE:conf}}` markers, or bracket `[[TYPE] text [label]]` markers
2. **Classify** — Gemini identifies document type; keyword scoring as immediate fallback
3. **Detect** — Gemini finds PII per item with confidence score and false-positive risk flag
4. **Auto-redact** — items ≥ 78% confidence are hidden immediately as `████` blocks; Sam never sees them in the queue
5. **Gap scan** — a second pass finds PII the original suggestions missed; these appear as red "Not Redacted" items at the top of the queue
6. **Review** — grouped entity cards, context snippets, exemption codes, keyboard shortcuts
7. **Approve** — "Approve & Generate" unlocks only when every flagged item has a decision
8. **Export** — redacted text download + full audit JSON with every decision, timestamp, and exemption code

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── process-document/        ← POST: classify + Gemini detect + gap scan
│   │   └── reprocess-theme/         ← POST: re-detect under a specific theme
│   └── page.tsx
├── components/
│   ├── ReviewWorkspace.tsx           ← Orchestrator: wires state to all panels
│   ├── correction/
│   │   └── CorrectionPanel.tsx       ← Keep / FP / exemption code quick-tags
│   ├── document-viewer/
│   │   ├── DocumentViewer.tsx        ← Inline span highlights + AI status banner
│   │   └── SpanHighlight.tsx         ← Clickable PII block (colour by status)
│   ├── final-output/
│   │   └── FinalDocumentDialog.tsx   ← Export + "What your review caught"
│   ├── layout/
│   │   ├── AppHeader.tsx             ← Progress bar, type badge, Undo, Approve
│   │   └── LoadDocumentDialog.tsx    ← Upload / preset documents / paste text
│   └── review-queue/
│       ├── ReviewQueue.tsx           ← Grouped ↔ Individual view toggle
│       ├── GroupedReviewItem.tsx     ← Entity group card with batch actions
│       └── ReviewQueueItem.tsx       ← Single span card with context snippet
├── hooks/
│   └── useReviewState.ts            ← Reducer + async pipeline + undo stack
└── lib/
    ├── entity-grouper.ts            ← Groups spans, extracts context snippets
    ├── document-parser.ts           ← Plain text / JSON / inline / bracket formats
    ├── document-processor.ts        ← Builds ProcessedDocument from LLM + regex
    ├── redaction-utils.ts           ← Applies redactions, exports audit JSON
    └── detection/
        ├── llm-client.ts            ← Gemini with 4-model fallback chain
        ├── llm-prompt.ts            ← Classification / redaction / audit prompts
        ├── pii-detector.ts          ← Regex fallback detection
        ├── gap-detection.ts         ← Scans for PII missed by suggestions
        ├── classify-document.ts     ← Keyword-based document classification
        ├── risk-rules.ts            ← Domain-weighted risk score per PII type
        ├── suspicion-heuristics.ts  ← Flags likely false positives
        └── theme-filter.ts          ← Scopes spans to document theme
```

### State Flow

```
User uploads document
  → parseUploadedContent()       detect format, extract text + annotations
  → classifyDocument()           keyword scoring, no API call, instant
  → LOAD_DOCUMENT_PROCESSED      show initial results immediately
  → LLM_REFINEMENT_START         "AI scanning…" banner in document viewer
  → POST /api/process-document
      → classifyWithLLM()        only if keyword confidence < threshold
      → detectRedactionsWithLLM() Gemini per-item confidence + FP risk flag
      → detectGaps()             second pass for missed PII
      → applyRiskScores()        domain-weighted risk per span
  → LOAD_DOCUMENT_PROCESSED      update with AI results
  → groupReviewableSpans()       entity grouping runs client-side on render
```

---

## Document Formats

### Plain text
```
Patient Name: Alice Johnson
Phone: (555) 234-5678
Diagnosis: Type 2 Diabetes
```

### JSON with tool suggestions
```json
{
  "title": "Demand Letter",
  "text": "John Mitchell was injured...",
  "suggestions": [
    { "text": "John Mitchell", "type": "PERSON", "confidence": 0.95 },
    { "text": "the plaintiff", "type": "PERSON", "confidence": 0.48 },
    { "text": "Exhibit A",    "type": "OTHER",   "confidence": 0.41 }
  ]
}
```

### Inline markers
```
Patient: {{PERSON:0.97}}Alice Johnson{{/}}, DOB: {{DATE:0.72}}Nov 4, 1981{{/}}
```

### Bracket markers
```
[[PERSON NAME] Alice Vance [name]] at [[ADDRESS] 456 Oak Lane [address]]
```

---

## Testing

### Full edge-case test suite
```bash
node test-documents/run-tests.mjs
```

12 tests, all passing:

| File | What it tests |
|---|---|
| `01-ps3-core-scenario.json` | **Primary PS3 demo** — FP boilerplate + missed phone + missed name in one document |
| `02-repeated-entity.txt` | Same entity appears 9× — entity grouping "× N" badge |
| `03-all-auto-trusted.txt` | Zero review queue — approve immediately |
| `04-all-needs-review.txt` | Heavy queue — all ambiguous items, keyboard nav stress test |
| `05-clean-no-pii.txt` | No PII at all — approve with 0 spans |
| `06-medical-missed-pii.json` | Tool missed phone × 2 + contact name × 2 in medical doc |
| `07-legal-fp-heavy.json` | 8 boilerplate false positives in a settlement agreement |
| `08-inline-markers.txt` | `{{TYPE:conf}}` format — confidence routing from markers |
| `09-bracket-markers.txt` | `[[TYPE] text [lbl]]` format — bracket parser |
| `10-long-document.txt` | 800+ words, 76 spans, zero overlapping offsets |
| `11-finance-mixed.txt` | SSN, account numbers, names in a bank statement |
| `12-overlapping-spans.json` | 13 overlapping suggestions deduped to 12 clean spans |

### Backend API tests
```bash
node scripts/test-backend.mjs
```

---

## Design Decisions

**Why auto-trust high-confidence items?**
Asking Sam to confirm every obvious SSN and phone number causes alert fatigue — the precise condition that makes him stop looking. The threshold (78% confidence) is calibrated so only genuinely ambiguous items reach the queue.

**Why entity grouping as the primary novel feature?**
The PS3 problem statement says "mistakes slip through because he does not stop to look at them." The multi-instance case is the primary mechanism: one decision made, eight remaining instances invisible. Grouping makes the count the first thing Sam sees, not an afterthought.

**Why context snippets?**
"John Mitchell" in isolation tells Sam nothing about whether it needs redacting. "…arising from the injury of «John Mitchell», who was transported…" tells him everything. The decision becomes obvious rather than a gamble.

**Why Gemini as primary, not fallback?**
Regex catches well-formatted PII reliably. It does not catch context-dependent PII — "the plaintiff" is not a person, "Claims Adjuster" is not a name, whether a date needs redacting depends on what it is attached to. Gemini's `isFalsePositiveRisk` flag and per-item reasoning are what make the review queue signal-to-noise ratio high enough to be useful.

**Why structured exemption codes?**
Binary "keep / false positive" audit logs are not useful for anything downstream. Machine-readable codes like `[FP-LEGAL-TERM]` are queryable, trainable, and auditable. They also make Sam articulate why he is making a decision, which reduces careless clicking.

**What was not built:**
- Multi-document batch processing (that is PS2)
- Trust and explainability UI (that is PS1)
- Database persistence (session state only, by design)
- PDF text extraction (out of scope)
- Real-time collaboration
