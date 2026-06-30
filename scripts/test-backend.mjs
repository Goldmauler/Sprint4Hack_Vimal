const BASE = process.env.API_BASE || "http://localhost:3000";

const DOCS = {
  memo: "MEMO\n\nPlease review the attached summary. Contact Maria Lopez at (555) 123-4567 before Friday.\nAccount reference: AC-99821. Payment of $4,200.00 is pending.",
  nda: `MUTUAL NON-DISCLOSURE AGREEMENT

This Agreement is entered into on June 30, 2026, by and between:
Alice Vance, residing at 456 Oak Lane, Seattle, WA 98101 (SSN: 999-12-3456, email: alice.vance@example.com)
and Bob Smith (SSN: 999-98-7654, email: bob.smith@example.com)

The parties wish to explore a business relationship. Confidential Information shall not be disclosed.
Contact coordinator at (555) 123-4567.`,
  medical: `PATIENT DISCHARGE SUMMARY
Patient Name: John Mitchell
Date of Birth: October 12, 1985
Attending Physician: Dr. Sarah Chen
Diagnosis: Acute appendicitis with secondary infection
Emergency Contact: Robert Mitchell, (555) 867-5309`,
  finance: `BANK STATEMENT - June 2026
Account Holder: Jane Doe
Account No: 4829103756
Routing: 021000021
Balance: $12,450.00
Transaction: Wire transfer $3,200.00 to ACME Corp on 06/15/2026`,
  hybrid: `DEMAND LETTER
Re: John Mitchell v. Pacific Coast Insurance
Case No. CV-2024-08841
Dr. Sarah Chen treated patient at Springfield General Hospital.
Diagnosis: lumbar disc herniation. Total damages: $45,750.00
Policy No. AIG-4471-XJ. the plaintiff maintains liability is clear.
the undersigned demands settlement. Exhibit C attached.
Robert Mitchell (555) 867-5309`,
};

const THEMES = ["general", "medical", "legal", "hybrid", "finance"];

function validateSpans(data) {
  const errors = [];
  for (const span of data.spans) {
    const slice = data.rawText.slice(span.startOffset, span.endOffset);
    if (slice !== span.text) {
      errors.push(`offset mismatch: "${span.text}" got "${slice}"`);
    }
    if (span.startOffset >= span.endOffset) errors.push(`invalid range for ${span.id}`);
  }
  for (let i = 0; i < data.spans.length; i++) {
    for (let j = i + 1; j < data.spans.length; j++) {
      const a = data.spans[i];
      const b = data.spans[j];
      if (a.startOffset < b.endOffset && a.endOffset > b.startOffset) {
        errors.push(`overlap: ${a.text} / ${b.text}`);
      }
    }
  }
  return errors;
}

async function post(path, body) {
  const start = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - start;
  let json;
  try {
    json = await res.json();
  } catch {
    json = { error: "invalid json" };
  }
  return { status: res.status, ms, json };
}

const results = [];

async function runTest(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, pass: true, ...detail });
    console.log(`PASS  ${name}`, detail.summary || "");
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
    console.log(`FAIL  ${name}: ${e.message}`);
  }
}

console.log(`Testing ${BASE}\n`);

for (const [docName, content] of Object.entries(DOCS)) {
  await runTest(`process-document / ${docName}`, async () => {
    const { status, ms, json } = await post("/api/process-document", { content, filename: `${docName}.txt` });
    if (status !== 200) throw new Error(`HTTP ${status}: ${json.error}`);
    const spanErrors = validateSpans(json);
    if (spanErrors.length) throw new Error(spanErrors.join("; "));
    return {
      summary: `${json.spans.length} spans, type=${json.classification.type}, usedLlm=${json.usedLlm}, ${ms}ms`,
      spans: json.spans.length,
      type: json.classification.type,
      usedLlm: json.usedLlm,
    };
  });
}

const themeResults = {};
for (const theme of THEMES) {
  await runTest(`reprocess-theme / ${theme}`, async () => {
    const { status, ms, json } = await post("/api/reprocess-theme", {
      content: DOCS.hybrid,
      filename: "hybrid.txt",
      theme,
    });
    if (status !== 200) throw new Error(`HTTP ${status}: ${json.error}`);
    const spanErrors = validateSpans(json);
    if (spanErrors.length) throw new Error(spanErrors.join("; "));
    const boilerplate = json.spans.filter((s) =>
      /plaintiff|undersigned|exhibit/i.test(s.text)
    ).length;
    themeResults[theme] = { spans: json.spans.length, boilerplate, usedLlm: json.usedLlm, method: json.classification.method };
    return {
      summary: `${json.spans.length} spans, boilerplate=${boilerplate}, usedLlm=${json.usedLlm}, method=${json.classification.method}, ${ms}ms`,
    };
  });
}

await runTest("theme differentiation (medical fewer boilerplate than legal)", async () => {
  const med = themeResults.medical?.boilerplate ?? 99;
  const legal = themeResults.legal?.boilerplate ?? 0;
  if (med > legal) {
    throw new Error(`medical boilerplate (${med}) > legal (${legal})`);
  }
  return { summary: `medical=${med}, legal=${legal}` };
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);