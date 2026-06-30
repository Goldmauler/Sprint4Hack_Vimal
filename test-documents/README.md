# Test Documents — PS3 Edge Case Coverage

Upload any of these files via "Load / Import Document" in the app.

| File | Format | What it tests |
|------|--------|---------------|
| `01-ps3-core-scenario.json` | JSON (pre-annotated) | **PRIMARY DEMO** — FP + missed PII, the exact PS3 scenario |
| `02-repeated-entity.txt` | Plain text | Batch correction — same name appears 6× |
| `03-all-auto-trusted.txt` | Plain text | Zero review queue (all high-confidence) |
| `04-all-needs-review.txt` | Plain text | Heavy queue — all ambiguous items |
| `05-clean-no-pii.txt` | Plain text | No PII found — approve with 0 spans |
| `06-medical-missed-pii.json` | JSON (pre-annotated) | Missed phone + DOB in medical doc |
| `07-legal-fp-heavy.json` | JSON (pre-annotated) | Over-redacted legal boilerplate |
| `08-inline-markers.txt` | Inline markers `{{TYPE:conf}}` | Parser format test |
| `09-bracket-markers.txt` | Bracket markers `[[TYPE] text [lbl]]` | Parser format test |
| `10-long-document.txt` | Plain text | Stress test — 800+ words, 20+ PII items |
| `11-finance-mixed.txt` | Plain text | Finance doc — account numbers, SSN, names |
| `12-overlapping-spans.json` | JSON (pre-annotated) | Deduplication — overlapping suggestions |
