export type DocumentType = "medical" | "legal" | "general" | "hybrid";

export type PIIType =
  | "PERSON"
  | "PHONE"
  | "DATE"
  | "CASE_NUMBER"
  | "FINANCIAL"
  | "FINANCIAL_ID"
  | "ORGANIZATION"
  | "DIAGNOSIS"
  | "ADDRESS"
  | "OTHER";

export type SpanStatus =
  | "auto-trusted"      // high confidence, not in the review queue
  | "needs-review"      // flagged: ambiguous / possible false positive
  | "missed"            // gap-detected, was never in the original suggestions
  | "confirmed-redact"  // Sam confirmed: keep hidden
  | "confirmed-reveal"; // Sam confirmed: false positive, unredact

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
  piiType: PIIType;
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

export interface ReviewState {
  rawText: string;
  spans: RedactionSpan[];
  auditLog: AuditLogEntry[];
  documentType: DocumentType;
  classification: ClassificationResult;
  isApproved: boolean;
}

export type ReviewAction =
  | { type: "SET_DOCUMENT_TYPE"; payload: DocumentType }
  | { type: "APPLY_CORRECTION"; payload: { spanId: string; action: CorrectionAction; note?: string } }
  | { type: "APPROVE" }
  | { type: "RESET" }
  | { type: "LOAD_DOCUMENT"; payload: string };
