import { RedactionSpan, AuditLogEntry } from "./types";

/**
 * Apply redaction spans to raw text to produce the final redacted document.
 * - auto-trusted + confirmed-redact spans → replaced with [████████]
 * - confirmed-reveal (false positive) spans → left as-is
 * - missed + confirmed-redact spans → replaced with [████████]
 */
export function applyRedactions(rawText: string, spans: RedactionSpan[]): string {
  // Sort spans by startOffset descending so we can replace from end to start
  const sortedSpans = [...spans].sort((a, b) => b.startOffset - a.startOffset);

  let result = rawText;

  for (const span of sortedSpans) {
    const shouldRedact =
      span.status === "auto-trusted" ||
      span.status === "confirmed-redact";

    if (shouldRedact) {
      const redactedBlock = `[${getRedactionLabel(span.type)}]`;
      result =
        result.substring(0, span.startOffset) +
        redactedBlock +
        result.substring(span.endOffset);
    }
    // "confirmed-reveal" → leave text as-is (false positive)
    // "needs-review" or "missed" without resolution → leave as-is (shouldn't happen if guardrail works)
  }

  return result;
}

function getRedactionLabel(type: string): string {
  const labels: Record<string, string> = {
    PERSON: "REDACTED: NAME",
    PHONE: "REDACTED: PHONE",
    DATE: "REDACTED: DATE",
    CASE_NUMBER: "REDACTED: CASE_NO",
    FINANCIAL: "REDACTED: FINANCIAL",
    FINANCIAL_ID: "REDACTED: ID",
    ORGANIZATION: "REDACTED: ORG",
    DIAGNOSIS: "REDACTED: MEDICAL",
    ADDRESS: "REDACTED: ADDRESS",
    OTHER: "REDACTED",
  };
  return labels[type] || "REDACTED";
}

/**
 * Build a structured audit JSON for export
 */
export function buildAuditJSON(
  spans: RedactionSpan[],
  auditLog: AuditLogEntry[],
  documentType: string
) {
  return {
    metadata: {
      exportDate: new Date().toISOString(),
      documentType,
      totalSpans: spans.length,
      autoTrusted: spans.filter((s) => s.status === "auto-trusted").length,
      confirmedRedact: spans.filter((s) => s.status === "confirmed-redact").length,
      confirmedReveal: spans.filter((s) => s.status === "confirmed-reveal").length,
      missedDetected: spans.filter((s) => !s.isOriginalSuggestion).length,
    },
    spans: spans.map((s) => ({
      id: s.id,
      text: s.text,
      type: s.type,
      confidence: s.confidence,
      riskScore: s.riskScore,
      status: s.status,
      isOriginalSuggestion: s.isOriginalSuggestion,
      reviewerNote: s.reviewerNote,
    })),
    auditLog: auditLog.map((entry) => ({
      ...entry,
    })),
  };
}

/**
 * Download text content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
