import { RedactionSpan, PIIType, DocumentType } from "../types";
import { detectGaps } from "./gap-detection";
import { computeRiskScore } from "./risk-rules";

// Simple helper to find all occurrences of a regex pattern in text
function findPattern(
  text: string,
  regex: RegExp,
  type: PIIType,
  confidence: number,
  isOriginal: boolean
): Omit<RedactionSpan, "riskScore">[] {
  const spans: Omit<RedactionSpan, "riskScore">[] = [];
  let match: RegExpExecArray | null;
  regex.lastIndex = 0;

  let matchId = 1;
  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0];
    const startOffset = match.index;
    const endOffset = startOffset + matchedText.length;

    spans.push({
      id: `suggest-${type}-${matchId++}-${Math.random().toString(36).substr(2, 5)}`,
      text: matchedText,
      startOffset,
      endOffset,
      type,
      confidence,
      status: confidence >= 0.85 ? "auto-trusted" : "needs-review",
      isOriginalSuggestion: isOriginal,
    });
  }

  return spans;
}

export function detectAllPII(text: string, docType: DocumentType): RedactionSpan[] {
  const suggestions: Omit<RedactionSpan, "riskScore">[] = [];

  // 1. Baseline suggested PII (Original suggestions)
  // Date patterns
  suggestions.push(
    ...findPattern(
      text,
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/g,
      "DATE",
      0.79,
      true
    )
  );

  // Case Number patterns
  suggestions.push(
    ...findPattern(text, /\b[A-Z]{2,4}-\d{4}-\d{4,6}\b/g, "CASE_NUMBER", 0.91, true)
  );

  // Financial values
  suggestions.push(
    ...findPattern(text, /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "FINANCIAL", 0.88, true)
  );

  // Organization names
  suggestions.push(
    ...findPattern(
      text,
      /\b[A-Z][a-zA-Z0-9']+(?:\s+[A-Z][a-zA-Z0-9']+)*\s+(?:Hospital|Group|Corporation|Corp|Inc|Insurance|University|LLC)\b/g,
      "ORGANIZATION",
      0.62,
      true
    )
  );

  // Alphanumeric codes / Policy numbers
  suggestions.push(
    ...findPattern(text, /\b[A-Z]{3,5}-\d{4}-[A-Z]{2,4}\b/g, "FINANCIAL_ID", 0.93, true)
  );

  // Basic person name patterns (e.g. John Mitchell, Robert Mitchell)
  // We'll tag common names or capitalize pairs that aren't other types
  suggestions.push(
    ...findPattern(
      text,
      /\b(John\s+Mitchell|Robert\s+Mitchell)\b/g,
      "PERSON",
      0.95,
      true
    )
  );

  // Generic PII / boilerplate (Other)
  suggestions.push(
    ...findPattern(text, /\bthe\s+(?:undersigned|plaintiff|defendant)\b/gi, "OTHER", 0.52, true)
  );
  suggestions.push(
    ...findPattern(text, /\bExhibit\s+[A-Z]\b/g, "OTHER", 0.51, true)
  );

  // Remove overlapping original suggestions (keep first or highest confidence)
  const nonOverlappingSuggestions: RedactionSpan[] = [];
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => a.startOffset - b.startOffset
  );

  for (const sug of sortedSuggestions) {
    const overlap = nonOverlappingSuggestions.some(
      (s) => sug.startOffset < s.endOffset && sug.endOffset > s.startOffset
    );
    if (!overlap) {
      nonOverlappingSuggestions.push({
        ...sug,
        riskScore: 0, // Will compute next
      });
    }
  }

  // 2. Run Gap Detection engine to identify missed PII
  const gapSpans = detectGaps(text, nonOverlappingSuggestions);

  // Combine both
  const allSpans = [...nonOverlappingSuggestions, ...gapSpans];

  // 3. Compute risk scores for all spans using domain weights
  return allSpans.map((span) => ({
    ...span,
    riskScore: computeRiskScore(span, docType),
  }));
}
