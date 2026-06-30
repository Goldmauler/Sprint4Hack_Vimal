import { DocumentType, RedactionSpan, PIIType } from "../types";

interface GapPattern {
  regex: RegExp;
  type: PIIType;
  captureGroup?: boolean;
  themes?: DocumentType[];
}

const GAP_PATTERNS: GapPattern[] = [
  // No leading \b so (555) 123-4567 is matched from the ( character
  { regex: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, type: "PHONE" },
  { regex: /\bDr\.?[ \t]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)\b/g, type: "PERSON", captureGroup: true, themes: ["medical", "hybrid", "general"] },
  {
    regex: /\b(?:brother|sister|mother|father|spouse|wife|husband|son|daughter)[ \t]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)\b/g,
    type: "PERSON",
    captureGroup: true,
  },
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, type: "FINANCIAL_ID", themes: ["finance", "general", "hybrid", "legal"] },
  { regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, type: "OTHER" },
  {
    regex: /\b(?:Patient[ \t]+Name|Date[ \t]+of[ \t]+Birth|DOB):[ \t]*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)*|\d{1,2}\/\d{1,2}\/\d{4})/g,
    type: "PERSON",
    captureGroup: true,
    themes: ["medical", "hybrid", "general"],
  },
  {
    regex: /\b(?:Mr|Mrs|Ms)\.?[ \t]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)\b/g,
    type: "PERSON",
    captureGroup: true,
  },
];

const GAP_NAME_EXCLUSIONS = new Set([
  "demand letter", "claims adjuster", "insurance group", "general hospital",
  "motor vehicle", "personal injury", "physical therapy", "emergency department",
  "amicable resolution", "legal remedies", "attorney at law",
]);

const COMMON_WORDS = new Set([
  "can", "be", "reached", "at", "an", "our", "the", "and", "for", "his", "her",
]);

function isOverlapping(
  start: number,
  end: number,
  existingSpans: RedactionSpan[]
): boolean {
  return existingSpans.some(
    (span) => start < span.endOffset && end > span.startOffset
  );
}

function patternAppliesToTheme(pattern: GapPattern, docType: DocumentType): boolean {
  if (!pattern.themes) return true;
  if (docType === "hybrid" || docType === "general") return true;
  return pattern.themes.includes(docType);
}

export function detectGaps(
  text: string,
  existingSpans: RedactionSpan[],
  docType: DocumentType = "general"
): RedactionSpan[] {
  const detectedSpans: RedactionSpan[] = [];

  for (const pattern of GAP_PATTERNS) {
    if (!patternAppliesToTheme(pattern, docType)) continue;

    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      const matchedText = pattern.captureGroup && match[1] ? match[1] : match[0];
      const startOffset = pattern.captureGroup && match[1]
        ? match.index + match[0].indexOf(match[1])
        : match.index;
      const endOffset = startOffset + matchedText.length;

      const lower = matchedText.toLowerCase();
      if (GAP_NAME_EXCLUSIONS.has(lower)) continue;
      if (COMMON_WORDS.has(lower)) continue;
      if (matchedText.split(/\s+/).some((w) => COMMON_WORDS.has(w.toLowerCase()))) continue;

      if (isOverlapping(startOffset, endOffset, [...existingSpans, ...detectedSpans])) {
        continue;
      }

      detectedSpans.push({
        id: `gap-${startOffset}-${endOffset}-${pattern.type}`,
        text: matchedText,
        startOffset,
        endOffset,
        type: pattern.type,
        confidence: 0,
        riskScore: 95,
        status: "missed",
        isOriginalSuggestion: false,
      });
    }
  }

  return detectedSpans;
}