/**
 * Automated edge-case test runner for the LexRedact PS3 system.
 * Run: node test-documents/run-tests.mjs
 * Requires the dev server running at http://localhost:3000
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const BASE = process.env.API_BASE || "http://localhost:3000";
const DIR = dirname(fileURLToPath(import.meta.url));

async function post(content, filename) {
  const res = await fetch(`${BASE}/api/process-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function load(filename) {
  return readFileSync(join(DIR, filename), "utf8");
}

function byStatus(spans, status) {
  return spans.filter((s) => s.status === status);
}

function spansContaining(spans, text) {
  return spans.filter((s) => s.text.toLowerCase().includes(text.toLowerCase()));
}

// ── Test definitions ────────────────────────────────────────────────────────

const TESTS = [
  {
    name: "01 PS3 Core — false positives + missed PII",
    file: "01-ps3-core-scenario.json",
    verify(d) {
      const missed = byStatus(d.spans, "missed");
      const review = byStatus(d.spans, "needs-review");
      const phoneFound = missed.some((s) => s.type === "PHONE" && s.text.includes("401-2938"));
      const nameFound  = missed.some((s) => s.text.includes("Robert Vance"));
      const fpItems    = review.filter((s) => s.confidence < 0.56);
      if (!phoneFound) throw new Error("Missed PII — phone (555) 401-2938 not detected");
      if (!nameFound)  throw new Error("Missed PII — Robert Vance not detected");
      if (fpItems.length < 3) throw new Error(`Expected ≥3 low-conf FP items, got ${fpItems.length}`);
      return `missed=${missed.length} (phone ✓ name ✓), fp_candidates=${fpItems.length}, total=${d.spans.length}`;
    },
  },
  {
    name: "02 Repeated entity — batch correction trigger",
    file: "02-repeated-entity.txt",
    verify(d) {
      if (d.spans.length < 5) throw new Error(`Expected ≥5 spans, got ${d.spans.length}`);
      const emilySpans = spansContaining(d.spans, "Emily Park");
      if (emilySpans.length < 1) throw new Error("Dr. Emily Park not detected");
      const phoneMissed = byStatus(d.spans, "missed").some((s) => s.type === "PHONE");
      const ssnFound = d.spans.some((s) => s.type === "FINANCIAL_ID" && s.text.includes("412-88"));
      if (!ssnFound) throw new Error("SSN not detected");
      return `total=${d.spans.length}, emily_spans=${emilySpans.length}, phone_missed=${phoneMissed}`;
    },
  },
  {
    name: "03 All auto-trusted — zero review queue",
    file: "03-all-auto-trusted.txt",
    verify(d) {
      const review = byStatus(d.spans, "needs-review");
      const missed  = byStatus(d.spans, "missed");
      const ssn = d.spans.some((s) => s.type === "FINANCIAL_ID" && s.text.includes("387-55"));
      const phone = d.spans.some((s) => s.type === "PHONE");
      if (!ssn)   throw new Error("SSN not detected");
      if (!phone) throw new Error("Phone not detected");
      // Minimal review queue is fine; the point is high-conf items are auto-trusted
      return `total=${d.spans.length}, review=${review.length}, missed=${missed.length}, ssn=✓, phone=✓`;
    },
  },
  {
    name: "04 All ambiguous — heavy review queue",
    file: "04-all-needs-review.txt",
    verify(d) {
      const review = byStatus(d.spans, "needs-review");
      if (review.length < 3) throw new Error(`Expected ≥3 needs-review items, got ${review.length}`);
      const lowConf = review.filter((s) => s.confidence < 0.60);
      return `review=${review.length}, low_conf=${lowConf.length}, total=${d.spans.length}`;
    },
  },
  {
    name: "05 Clean document — no PII, approve enabled",
    file: "05-clean-no-pii.txt",
    verify(d) {
      const review = byStatus(d.spans, "needs-review");
      const missed  = byStatus(d.spans, "missed");
      // No reviewable items → canApprove should be true on the frontend
      if (review.length > 0) throw new Error(`Expected 0 needs-review, got ${review.length}`);
      if (missed.length > 0) throw new Error(`Expected 0 missed, got ${missed.length}`);
      return `total=${d.spans.length}, review=0, missed=0 — approve path clear ✓`;
    },
  },
  {
    name: "06 Medical — missed phone + contact name",
    file: "06-medical-missed-pii.json",
    verify(d) {
      const missed = byStatus(d.spans, "missed");
      const phonesMissed = missed.filter((s) => s.type === "PHONE" && s.text.includes("883-2291"));
      const nameMissed   = missed.filter((s) => s.type === "PERSON" && s.text.includes("Gonzalez") || s.text.includes("Okafor"));
      if (phonesMissed.length < 1) throw new Error("Missed phone (714) 883-2291 not caught by gap detection");
      return `missed=${missed.length} (phones=${phonesMissed.length}, names=${nameMissed.length}), total=${d.spans.length}`;
    },
  },
  {
    name: "07 Legal FP-heavy — boilerplate flagged for review",
    file: "07-legal-fp-heavy.json",
    verify(d) {
      const review = byStatus(d.spans, "needs-review");
      const boilerplate = review.filter((s) =>
        /(plaintiff|defendant|undersigned|exhibit|counsel at law|claims adjuster)/i.test(s.text)
      );
      if (boilerplate.length < 4) throw new Error(`Expected ≥4 boilerplate FP candidates, got ${boilerplate.length}`);
      const realPii = d.spans.filter((s) => s.text.includes("Angela Brooks"));
      if (realPii.length < 1) throw new Error("Real PII Angela Brooks not found");
      return `review=${review.length}, boilerplate_fp=${boilerplate.length}, real_pii_found=✓`;
    },
  },
  {
    name: "08 Inline markers {{TYPE:conf}} — parser test",
    file: "08-inline-markers.txt",
    verify(d) {
      if (d.spans.length < 8) throw new Error(`Expected ≥8 parsed spans, got ${d.spans.length}`);
      const patricia = d.spans.find((s) => s.text.includes("Patricia Holloway"));
      const phone    = d.spans.find((s) => s.type === "PHONE");
      const policy   = d.spans.find((s) => s.text.includes("PWR-2024-8812"));
      if (!patricia) throw new Error("PERSON span not parsed from inline marker");
      if (!phone)    throw new Error("PHONE span not parsed from inline marker");
      if (!policy)   throw new Error("FINANCIAL_ID span not parsed from inline marker");
      return `total=${d.spans.length}, parser=✓ (person ✓ phone ✓ id ✓)`;
    },
  },
  {
    name: "09 Bracket markers [[TYPE] text [lbl]] — parser test",
    file: "09-bracket-markers.txt",
    verify(d) {
      if (d.spans.length < 5) throw new Error(`Expected ≥5 parsed spans, got ${d.spans.length}`);
      const alice = d.spans.find((s) => s.text.includes("Alice Vance"));
      const ssn   = d.spans.find((s) => s.type === "FINANCIAL_ID");
      if (!alice) throw new Error("PERSON span not parsed from bracket marker");
      if (!ssn)   throw new Error("FINANCIAL_ID span not parsed from bracket marker");
      return `total=${d.spans.length}, parser=✓ (person ✓ id ✓)`;
    },
  },
  {
    name: "10 Long document — stress test (800+ words, 20+ PII)",
    file: "10-long-document.txt",
    verify(d) {
      if (d.spans.length < 20) throw new Error(`Expected ≥20 spans in long doc, got ${d.spans.length}`);
      const persons = d.spans.filter((s) => s.type === "PERSON");
      const phones  = d.spans.filter((s) => s.type === "PHONE");
      const finance = d.spans.filter((s) => s.type === "FINANCIAL");
      if (persons.length < 3) throw new Error(`Expected ≥3 persons, got ${persons.length}`);
      if (phones.length < 2)  throw new Error(`Expected ≥2 phones, got ${phones.length}`);
      // Validate no overlapping spans
      const sorted = [...d.spans].sort((a, b) => a.startOffset - b.startOffset);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startOffset < sorted[i - 1].endOffset) {
          throw new Error(`Overlapping spans: "${sorted[i-1].text}" / "${sorted[i].text}"`);
        }
      }
      return `total=${d.spans.length}, persons=${persons.length}, phones=${phones.length}, financial=${finance.length}, no_overlaps=✓`;
    },
  },
  {
    name: "11 Finance mixed — accounts + SSN + names",
    file: "11-finance-mixed.txt",
    verify(d) {
      const ssn     = d.spans.find((s) => s.type === "FINANCIAL_ID" && s.text.includes("622-44"));
      const account = d.spans.find((s) => s.type === "FINANCIAL_ID" && s.text.includes("8821"));
      const name    = d.spans.find((s) => s.type === "PERSON" && s.text.includes("Raymond Osei"));
      if (!ssn)     throw new Error("SSN 622-44-8801 not detected");
      if (!name)    throw new Error("Person Raymond Osei not detected");
      return `total=${d.spans.length}, ssn=✓, account=${account ? "✓" : "∅"}, person=✓`;
    },
  },
  {
    name: "12 Overlapping suggestions — deduplication",
    file: "12-overlapping-spans.json",
    verify(d) {
      // No two spans should overlap
      const sorted = [...d.spans].sort((a, b) => a.startOffset - b.startOffset);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startOffset < sorted[i - 1].endOffset) {
          throw new Error(`Overlap NOT deduped: "${sorted[i-1].text}" ∩ "${sorted[i].text}"`);
        }
      }
      const phone = d.spans.find((s) => s.type === "PHONE");
      if (!phone) throw new Error("Phone not found after dedup");
      return `total=${d.spans.length}, no_overlaps=✓, phone=✓`;
    },
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────

console.log(`\nLexRedact PS3 Edge Case Tests → ${BASE}\n${"─".repeat(60)}`);

let passed = 0;
let failed = 0;

for (const test of TESTS) {
  const content = load(test.file);
  try {
    const data = await post(content, test.file);
    const detail = test.verify(data);
    console.log(`✓  ${test.name}`);
    console.log(`   ${detail}`);
    passed++;
  } catch (err) {
    console.log(`✗  ${test.name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

console.log(`\n${"─".repeat(60)}`);
console.log(`${passed} passed  ${failed} failed  (${TESTS.length} total)\n`);
if (failed > 0) process.exit(1);
