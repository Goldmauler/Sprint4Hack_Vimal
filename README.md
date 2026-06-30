# LexRedact — Sam's Redaction Correction Tool

> **Sprintfour Hackathon · Problem Statement 3: Fixing the tool's mistakes**

A full-stack Next.js application that solves the real problem of correcting a PII redaction tool's mistakes — both false positives (harmless text wrongly hidden) and missed PII (sensitive text left visible) — for someone working quickly and imperfectly.

---

## The Problem

Sam is reviewing a tool's suggested redactions. The tool has hidden a few things that are not sensitive at all, and, worse, it has left a phone number and a name untouched. Sam is moving fast and trusts the tool a little too much. The mistakes that slip through are the ones he does not stop to look at.

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

Get a free key at [aistudio.google.com](https://aistudio.google.com). The app falls back to pattern-based detection when the key is absent or rate-limited.

---

## What Was Built

### Core Workflow

1. **Upload a document** — plain text, JSON with pre-annotated suggestions, inline markers `{{TYPE:conf}}`, or bracket markers `[[TYPE] text [label]]`
2. **AI classifies the document** (medical / legal / hybrid / finance / general) using Gemini, falling back to keyword scoring
3. **Gemini detects PII** — each item gets a confidence score and reason
4. **High-confidence items (≥78%)** are auto-redacted, shown as `████` blocks in the document
5. **Low-confidence items** are routed to the human review queue with context snippets
6. **Gap detection** scans for PII the tool missed entirely — these appear as red "Not Redacted" items at the top of the queue
7. **Sam reviews flagged items**, corrects mistakes, approves, and downloads the final document

---

## Novel Feature: Entity Grouping with Batch Correction

The core insight: Sam's failure mode isn't missing a single item — it's that when "John Mitchell" appears five times in a document and he marks one instance as a false positive, the other four silently slip through unreviewed.

**Entity Grouping** surfaces this directly:

- Spans with the same text and type are bucketed into a single group card in the review queue
- A **"× N instances"** badge shows immediately that this entity appears multiple times
- **Batch action buttons** — "Redact all 3" / "False positive — all 3" — let Sam decide once for all occurrences
- A **confirmation prompt** fires before any batch action: *"Confirm redacting all 5 instances of 'John Mitchell'?"* — he cannot accidentally confirm without seeing the count
- **"Review individually"** expands the group to show each occurrence with surrounding context

This directly addresses what makes mistakes slip through: the reviewer doesn't realize the same entity appears again elsewhere in the document.

### Supporting Features

| Feature | What it does |
|---|---|
| **Context snippets** | Every queue item shows `…injury of «John Mitchell», arising from…` — not just the bare text. Sam judges sensitivity from context without scrolling. |
| **Structured exemption codes** | Quick-tag buttons on the correction panel: "Common name / word", "Legal boilerplate", "Job title / role", "Organization (not PII)". Tags write machine-readable codes like `[FP-LEGAL-TERM]` into the audit log for compliance. |
| **"What slipped through" summary** | Final document dialog shows: missed PII you caught, false positives you unblocked, decisions logged with exemption codes — so Sam can prove his review was thorough. |
| **Undo last correction** | Ctrl+Z or the header Undo button reverts the last decision. Critical for someone working imperfectly. |
| **Gemini multi-model fallback** | Tries `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-2.5-flash-lite` in order. Handles quota exhaustion gracefully. |
| **Document type override** | Sam can override the detected type (Medical / Legal / Hybrid / Finance / General). Triggers a new Gemini scan scoped to that theme's redaction rules. |
| **Keyboard shortcuts** | K (keep), F (false positive), J (next), Ctrl+Z (undo), Esc (close) — fast reviewers never need the mouse. |

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── process-document/   ← POST: classify + detect PII with Gemini
│   │   └── reprocess-theme/    ← POST: re-run detection under a specific theme
│   └── page.tsx
├── components/
│   ├── ReviewWorkspace.tsx          ← Main layout orchestrator
│   ├── correction/
│   │   └── CorrectionPanel.tsx      ← Bottom panel: keep / FP / exemption codes
│   ├── document-viewer/
│   │   ├── DocumentViewer.tsx       ← Renders document with inline span highlights
│   │   └── SpanHighlight.tsx        ← Individual clickable PII block
│   ├── final-output/
│   │   └── FinalDocumentDialog.tsx  ← Export + "what slipped through" insight
│   ├── layout/
│   │   ├── AppHeader.tsx            ← Progress bar, type badge, undo, approve
│   │   └── LoadDocumentDialog.tsx   ← Upload / preset / paste
│   └── review-queue/
│       ├── ReviewQueue.tsx          ← Grouped / individual toggle
│       ├── GroupedReviewItem.tsx    ← Multi-instance entity card (novel feature)
│       └── ReviewQueueItem.tsx      ← Single span card with context snippet
├── hooks/
│   └── useReviewState.ts       ← All app state: reducer + async pipeline
└── lib/
    ├── entity-grouper.ts       ← Groups spans by entity for batch correction
    ├── document-parser.ts      ← Parses plain text, JSON, inline, bracket formats
    ├── document-processor.ts   ← Builds ProcessedDocument from parsed + LLM results
    ├── redaction-utils.ts      ← Applies redactions, builds audit JSON
    └── detection/
        ├── llm-client.ts           ← Gemini API with multi-model fallback
        ├── llm-prompt.ts           ← Classification + redaction + audit prompts
        ├── pii-detector.ts         ← Regex-based PII detection (offline fallback)
        ├── gap-detection.ts        ← Finds PII missed by original suggestions
        ├── classify-document.ts    ← Keyword-based document classification
        ├── risk-rules.ts           ← Domain-weighted risk scoring per PII type
        ├── suspicion-heuristics.ts ← Flags likely false positives
        └── theme-filter.ts         ← Filters spans to match redaction scope
```

### State Flow

```
User uploads document
  → parseUploadedContent()     — detect format, extract text + annotations
  → classifyDocument()         — keyword scoring (fast, no API)
  → LOAD_DOCUMENT_PROCESSED    — show initial results immediately (no waiting)
  → LLM_REFINEMENT_START       — show "AI scanning…" banner
  → POST /api/process-document
      → Gemini classifies document type (if keyword confidence is low)
      → Gemini detects PII with per-item confidence + isFalsePositiveRisk
      → detectGaps()           — scans full text for uncovered PII
      → applyRiskScores()      — domain-weighted risk score per span
  → LOAD_DOCUMENT_PROCESSED    — update with AI results
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
    { "text": "John Mitchell", "type": "PERSON",  "confidence": 0.95 },
    { "text": "the plaintiff", "type": "PERSON",  "confidence": 0.48 },
    { "text": "Exhibit A",    "type": "OTHER",    "confidence": 0.41 }
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

### Run the full edge-case test suite
```bash
node test-documents/run-tests.mjs
```

12 tests, all passing:

| Test | Covers |
|---|---|
| `01-ps3-core-scenario.json` | **Primary PS3 demo** — FP boilerplate + missed phone + missed name |
| `02-repeated-entity.txt` | Same entity 6×, entity grouping badge |
| `03-all-auto-trusted.txt` | Zero review queue, approve immediately |
| `04-all-needs-review.txt` | Heavy review queue, low-confidence everything |
| `05-clean-no-pii.txt` | No PII found, approve with 0 spans |
| `06-medical-missed-pii.json` | Missed phone + contact name in medical doc |
| `07-legal-fp-heavy.json` | 8 boilerplate false positives in legal doc |
| `08-inline-markers.txt` | `{{TYPE:conf}}` format parser |
| `09-bracket-markers.txt` | `[[TYPE] text [lbl]]` format parser |
| `10-long-document.txt` | 800+ words, 76 spans, zero overlaps |
| `11-finance-mixed.txt` | SSN, account numbers, names in finance doc |
| `12-overlapping-spans.json` | 13 overlapping suggestions → 12 clean spans |

### Run backend API tests
```bash
node scripts/test-backend.mjs
```

---

## Key Design Decisions

**Why auto-trust high-confidence items instead of asking about everything?**
Forcing Sam to confirm 40 obvious names and phone numbers causes alert fatigue — the exact condition that makes him miss real mistakes. Only items that genuinely need a call go in the queue.

**Why entity grouping as the core novel feature?**
PS3 specifically describes mistakes that "slip through because he does not stop to look at them." The multi-instance case is the primary mechanism for that: Sam reviews one "John Mitchell" instance, feels done, and moves on. Grouping makes the count unavoidable.

**Why Gemini as primary (not fallback) detection?**
Pattern matching catches phone numbers and SSNs reliably but misses context-dependent PII — "Claims Adjuster" is not a person, "Dr. Sarah Chen" at the start of a legal boilerplate sentence might or might not be PII depending on context. Gemini's per-item confidence and `isFalsePositiveRisk` flag give the review queue its signal.

**What was not built:**
- Multi-document batch processing (PS2)
- Trust/explainability UI (PS1)
- Database persistence
- PDF parsing (text extraction is out of scope)
- Real-time collaboration
