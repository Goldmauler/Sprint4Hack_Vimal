import { RedactionSpan, PIIType } from "../types";

interface GapPattern {
  regex: RegExp;
  type: PIIType;
}

const GAP_PATTERNS: GapPattern[] = [
  // Phone numbers
  {
    regex: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    type: "PHONE",
  },
  // Names after "Dr." or "Dr "
  {
    regex: /Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    type: "PERSON",
  },
  // Names near relational cues
  {
    regex: /(?:brother|sister|mother|father|spouse|wife|husband|son|daughter|contact)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    type: "PERSON",
  },
  // SSN patterns
  {
    regex: /\d{3}-\d{2}-\d{4}/g,
    type: "FINANCIAL_ID",
  },
  // Email patterns
  {
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    type: "OTHER",
  },
];

function isOverlapping(
  start: number,
  end: number,
  existingSpans: RedactionSpan[]
): boolean {
  return existingSpans.some(
    (span) => start < span.endOffset && end > span.startOffset
  );
}

export function detectGaps(
  text: string,
  existingSpans: RedactionSpan[]
): RedactionSpan[] {
  const detectedSpans: RedactionSpan[] = [];
  let gapId = 100; // Start IDs high to avoid collision

  for (const pattern of GAP_PATTERNS) {
    // Reset regex lastIndex
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      const matchedText = match[1] || match[0]; // Use capture group if present
      const startOffset = match[1]
        ? text.indexOf(matchedText, match.index)
        : match.index;
      const endOffset = startOffset + matchedText.length;

      // Skip if overlapping with existing spans
      if (isOverlapping(startOffset, endOffset, [...existingSpans, ...detectedSpans])) {
        continue;
      }

      detectedSpans.push({
        id: `gap-${gapId++}`,
        text: matchedText,
        startOffset,
        endOffset,
        type: pattern.type,
        confidence: 0,
        riskScore: 95, // High risk floor for missed items
        status: "missed",
        isOriginalSuggestion: false,
      });
    }
  }

  return detectedSpans;
}
