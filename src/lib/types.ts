import type { ProcessedDocument } from "./document-processor";

export type DocumentType = "medical" | "legal" | "general" | "hybrid" | "finance";

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
  reviewReason?: string;
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
  keywordScores?: { legal: number; medical: number; finance?: number };
  reasoning?: string;
}

export interface ReviewState {
  rawText: string;
  documentContent: string;
  spans: RedactionSpan[];
  auditLog: AuditLogEntry[];
  documentType: DocumentType;
  classification: ClassificationResult;
  isApproved: boolean;
  documentTitle: string;
  filename?: string;
  reviewableSpanIds: string[];
  isProcessing: boolean;
  isLlmRefining: boolean;
  usedLlm: boolean;
  processingMessage?: string;
  llmFallbackReason?: string;
}

export type ReviewAction =
  | { type: "SET_DOCUMENT_TYPE"; payload: DocumentType }
  | { type: "APPLY_CORRECTION"; payload: { spanId: string; action: CorrectionAction; note?: string } }
  | { type: "UNDO_LAST_CORRECTION" }
  | { type: "APPROVE" }
  | { type: "RESET" }
  | { type: "LOAD_DOCUMENT_START"; payload: { filename?: string } }
  | { type: "LOAD_DOCUMENT_PROCESSED"; payload: { processed: ProcessedDocument; content: string; filename?: string } }
  | { type: "LLM_REFINEMENT_START"; payload?: { message?: string } }
  | { type: "LLM_REFINEMENT_END" };
