import { ClassificationResult, DocumentType, RedactionSpan, SpanStatus } from "./types";
import { classifyDocument } from "./detection/classify-document";
import { detectAllPII } from "./detection/pii-detector";
import { detectGaps } from "./detection/gap-detection";
import { applyRiskScores } from "./detection/risk-rules";
import { parseUploadedContent, ParsedDocument } from "./document-parser";
import { AUTO_TRUST_THRESHOLD } from "./constants";
import { AnnotationAuditItem, LLMRedactionSuggestion } from "./detection/llm-prompt";
import { filterSpansForTheme } from "./detection/theme-filter";
import { isSuspiciousRedaction } from "./detection/suspicion-heuristics";

export interface ProcessedDocument {
  title: string;
  rawText: string;
  spans: RedactionSpan[];
  classification: ClassificationResult;
  reviewableSpanIds: string[];
  usedLlm: boolean;
  llmFallbackReason?: string;
  stats: {
    totalSpans: number;
    autoTrusted: number;
    needsReview: number;
    missed: number;
    fromAnnotations: number;
    fromDetection: number;
    fromLlm: number;
  };
}

function findAuditForAnnotation(
  text: string,
  audits?: AnnotationAuditItem[]
): AnnotationAuditItem | undefined {
  if (!audits?.length) return undefined;
  const exact = audits.find((a) => a.text === text);
  if (exact) return exact;
  return audits.find(
    (a) => text.includes(a.text) || a.text.includes(text)
  );
}

export function annotationsToSpans(
  parsed: ParsedDocument,
  audits?: AnnotationAuditItem[]
): RedactionSpan[] {
  return parsed.annotations.map((ann, index) => {
    const audit = findAuditForAnnotation(ann.text, audits);
    const confidence = audit?.confidence ?? ann.confidence;
    const suspicion = isSuspiciousRedaction(ann.text, ann.type, confidence, audit);

    return {
      id: `annot-${index}-${ann.type}`,
      text: ann.text,
      startOffset: ann.startOffset,
      endOffset: ann.endOffset,
      type: ann.type,
      confidence,
      riskScore: 0,
      status: suspicion.suspicious ? "needs-review" : "auto-trusted",
      isOriginalSuggestion: true,
      reviewReason: suspicion.suspicious ? suspicion.reason : undefined,
    };
  });
}

function findAllOccurrences(text: string, search: string): number[] {
  const indices: number[] = [];
  let pos = 0;
  while ((pos = text.indexOf(search, pos)) !== -1) {
    indices.push(pos);
    pos += Math.max(1, search.length);
  }
  return indices;
}

function llmSuggestionsToSpans(
  text: string,
  suggestions: LLMRedactionSuggestion[]
): RedactionSpan[] {
  const spans: RedactionSpan[] = [];
  const usedOffsets = new Set<string>();

  for (let i = 0; i < suggestions.length; i++) {
    const sug = suggestions[i];
    const indices = findAllOccurrences(text, sug.text);

    for (const idx of indices) {
      const key = `${idx}-${idx + sug.text.length}`;
      if (usedOffsets.has(key)) continue;
      usedOffsets.add(key);

      let status: SpanStatus = "auto-trusted";
      if (sug.isFalsePositiveRisk || sug.confidence < AUTO_TRUST_THRESHOLD) {
        status = "needs-review";
      }

      spans.push({
        id: `llm-${idx}-${sug.type}-${i}`,
        text: sug.text,
        startOffset: idx,
        endOffset: idx + sug.text.length,
        type: sug.type,
        confidence: sug.confidence,
        riskScore: 0,
        status,
        isOriginalSuggestion: true,
      });
    }
  }

  return spans;
}

function mergeNonOverlapping(spans: RedactionSpan[]): RedactionSpan[] {
  const sorted = [...spans].sort((a, b) => a.startOffset - b.startOffset);
  const result: RedactionSpan[] = [];

  for (const span of sorted) {
    const overlaps = result.some(
      (s) => span.startOffset < s.endOffset && span.endOffset > s.startOffset
    );
    if (!overlaps) result.push(span);
  }
  return result;
}

function dedupeSpans(spans: RedactionSpan[]): RedactionSpan[] {
  const sorted = [...spans].sort((a, b) => {
    if (a.startOffset !== b.startOffset) return a.startOffset - b.startOffset;
    return b.confidence - a.confidence;
  });
  const result: RedactionSpan[] = [];

  for (const span of sorted) {
    const overlapIndex = result.findIndex(
      (s) => span.startOffset < s.endOffset && span.endOffset > s.startOffset
    );
    if (overlapIndex === -1) {
      result.push(span);
    } else if (span.confidence > result[overlapIndex].confidence) {
      result[overlapIndex] = span;
    }
  }
  return result;
}

function buildStats(
  allSpans: RedactionSpan[],
  parsed: ParsedDocument,
  originalSpans: RedactionSpan[],
  fromLlm: number
) {
  return {
    totalSpans: allSpans.length,
    autoTrusted: allSpans.filter((s) => s.status === "auto-trusted").length,
    needsReview: allSpans.filter((s) => s.status === "needs-review").length,
    missed: allSpans.filter((s) => s.status === "missed").length,
    fromAnnotations: parsed.annotations.length,
    fromDetection: originalSpans.length,
    fromLlm,
  };
}

export function buildProcessedDocument(
  parsed: ParsedDocument,
  classification: ClassificationResult,
  options?: {
    llmSpans?: RedactionSpan[];
    usedLlm?: boolean;
    forceDetection?: boolean;
    llmFallbackReason?: string;
    annotationAudits?: AnnotationAuditItem[];
  }
): ProcessedDocument {
  let originalSpans: RedactionSpan[];
  let fromLlm = 0;

  if (parsed.annotations.length > 0 && !options?.forceDetection) {
    originalSpans = annotationsToSpans(parsed, options?.annotationAudits);
  } else {
    const regexSpans = detectAllPII(parsed.rawText, classification.type).filter(
      (s) => s.isOriginalSuggestion
    );
    const llmSpans = options?.llmSpans ?? [];
    fromLlm = llmSpans.length;
    const merged = dedupeSpans(mergeNonOverlapping([...regexSpans, ...llmSpans]));
    originalSpans = options?.forceDetection
      ? filterSpansForTheme(merged, classification.type)
      : merged;
  }

  originalSpans = dedupeSpans(mergeNonOverlapping(originalSpans));

  const gapSpans = detectGaps(parsed.rawText, originalSpans, classification.type);

  const allSpans = applyRiskScores(
    [...originalSpans, ...gapSpans],
    classification.type
  );

  const reviewableSpanIds = allSpans
    .filter((s) => s.status === "needs-review" || s.status === "missed")
    .map((s) => s.id);

  return {
    title: parsed.title,
    rawText: parsed.rawText,
    spans: allSpans,
    classification,
    reviewableSpanIds,
    usedLlm: options?.usedLlm ?? false,
    llmFallbackReason: options?.llmFallbackReason,
    stats: buildStats(allSpans, parsed, originalSpans, fromLlm),
  };
}

export function buildThemeProcessedDocument(
  parsed: ParsedDocument,
  theme: DocumentType,
  llmSpans: RedactionSpan[],
  options: { usedLlm: boolean; reasoning?: string; llmFallbackReason?: string }
): ProcessedDocument {
  const classification: ClassificationResult = {
    type: theme,
    confidence: options.usedLlm ? 1 : 0.85,
    method: options.usedLlm ? "llm" : "keyword",
    reasoning: options.reasoning ?? `Redaction scoped to ${theme} theme`,
  };

  return buildProcessedDocument(parsed, classification, {
    llmSpans,
    usedLlm: options.usedLlm,
    forceDetection: true,
    llmFallbackReason: options.llmFallbackReason,
  });
}

export function processDocument(content: string, filename?: string): ProcessedDocument {
  const parsed = parseUploadedContent(content, filename);
  const classification = classifyDocument(parsed.rawText);
  return buildProcessedDocument(parsed, classification);
}

export { llmSuggestionsToSpans };