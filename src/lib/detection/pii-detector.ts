import { RedactionSpan, PIIType, DocumentType } from "../types";
import { computeRiskScore } from "./risk-rules";
import { AUTO_TRUST_THRESHOLD } from "../constants";

// Boilerplate / legal terms that are commonly wrongly redacted (false positives)
const FALSE_POSITIVE_PATTERNS: Array<{ regex: RegExp; confidence: number }> = [
  { regex: /\bthe\s+(?:undersigned|plaintiff|defendant)\b/gi, confidence: 0.48 },
  { regex: /\bExhibit\s+[A-Z]\b/g, confidence: 0.51 },
  { regex: /\b(?:Attorney|Counsel)\s+at\s+Law\b/gi, confidence: 0.45 },
  { regex: /\b(?:Dear|Sincerely|Respectfully)\b/g, confidence: 0.40 },
  { regex: /\b(?:Claims?\s+Adjuster|Dear\s+Sir|Dear\s+Madam)\b/gi, confidence: 0.42 },
];

// Words that look like names but aren't PII
const NAME_EXCLUSIONS = new Set([
  "demand letter", "mutual non", "discharge summary", "total medical",
  "physical therapy", "emergency contact", "follow up", "date birth",
  "pacific coast", "garden grove", "harbor boulevard", "westminster avenue",
  "springfield hospital", "springfield general", "insurance group",
  "motor vehicle", "personal injury", "maximum medical", "lost wages",
  "internal team", "all staff", "this agreement", "disclosing party",
  "receiving party", "admission date", "patient name", "mutual non-disclosure",
]);

const NON_NAME_WORDS = new Set([
  "team", "staff", "agreement", "party", "date", "law", "records", "summary",
  "letter", "memo", "section", "article", "clause", "purpose", "contact",
  "discharge", "admission", "physician", "attending", "emergency", "follow",
  "total", "medical", "legal", "financial", "account", "balance", "payment",
  // Document field labels (commonly appear before colons as headers)
  "doctor", "patient", "diagnosis", "address", "phone", "email", "subject",
  "re", "from", "to", "cc", "bcc", "date", "signed", "witness", "notary",
  "hospital", "clinic", "center", "department", "division", "office", "unit",
  "january", "february", "march", "april", "june", "july", "august",
  "september", "october", "november", "december", "monday", "tuesday",
  "wednesday", "thursday", "friday", "saturday", "sunday",
  // Address component words — should never be part of a person name
  "street", "avenue", "boulevard", "drive", "road", "lane", "way", "court",
  "place", "circle", "trail", "highway", "parkway", "terrace", "square",
]);

interface PatternDef {
  regex: RegExp;
  type: PIIType;
  confidence: number;
  useCaptureGroup?: boolean;
}

const DETECTION_PATTERNS: PatternDef[] = [
  // Dates
  {
    regex: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
    type: "DATE",
    confidence: 0.82,
  },
  {
    regex: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    type: "DATE",
    confidence: 0.75,
  },
  // Case numbers
  {
    regex: /\b(?:Case\s+No\.?\s*)?[A-Z]{2,4}-\d{4}-\d{4,6}\b/gi,
    type: "CASE_NUMBER",
    confidence: 0.91,
  },
  // Policy / financial IDs
  {
    regex: /\b(?:Policy\s+No\.?\s*)?[A-Z]{2,5}-\d{4}-[A-Z0-9]{2,6}\b/gi,
    type: "FINANCIAL_ID",
    confidence: 0.93,
  },
  {
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    type: "FINANCIAL_ID",
    confidence: 0.95,
  },
  // Financial amounts
  {
    regex: /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g,
    type: "FINANCIAL",
    confidence: 0.88,
  },
  // Phone numbers
  {
    regex: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    type: "PHONE",
    confidence: 0.92,
  },
  // Email
  {
    regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    type: "OTHER",
    confidence: 0.94,
  },
  // Addresses (street pattern)
  {
    regex: /\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Boulevard|Blvd|Drive|Dr|Way)\b/g,
    type: "ADDRESS",
    confidence: 0.78,
  },
  // Organizations
  {
    regex: /\b[A-Z][a-zA-Z0-9']+(?:\s+[A-Z][a-zA-Z0-9']+)*\s+(?:Hospital|Group|Corporation|Corp|Inc|Insurance|University|LLC|LLP|Associates)\b/g,
    type: "ORGANIZATION",
    confidence: 0.62,
  },
  // Diagnosis / medical terms — capture only within a single line (no \n)
  {
    regex: /\bDiagnosis:?[ \t]*([A-Za-z][^\n]{4,60})/g,
    type: "DIAGNOSIS",
    confidence: 0.75,
    useCaptureGroup: true,
  },
  {
    regex: /\b(?:diagnosis of|diagnosed with|suffering from)[ \t]+(?:of[ \t]+)?([a-z][^\n]{5,40})/gi,
    type: "DIAGNOSIS",
    confidence: 0.70,
    useCaptureGroup: true,
  },
  // Person names — Dr. prefix (only match within a single line)
  {
    regex: /\bDr\.?[ \t]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)\b/g,
    type: "PERSON",
    confidence: 0.90,
    useCaptureGroup: true,
  },
  {
    regex: /\b(?:Mr|Mrs|Ms|Miss)\.?[ \t]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)\b/g,
    type: "PERSON",
    confidence: 0.88,
    useCaptureGroup: true,
  },
  // General two-word name — must be on the same line ([ \t]+ not \s+ to avoid crossing newlines)
  {
    regex: /\b([A-Z][a-z]{2,15})[ \t]+([A-Z][a-z]{2,15})\b/g,
    type: "PERSON",
    confidence: 0.85,
    useCaptureGroup: false,
  },
];

function findPattern(
  text: string,
  regex: RegExp,
  type: PIIType,
  confidence: number,
  captureGroup = false
): Omit<RedactionSpan, "riskScore" | "status" | "isOriginalSuggestion">[] {
  const spans: Omit<RedactionSpan, "riskScore" | "status" | "isOriginalSuggestion">[] = [];
  let match: RegExpExecArray | null;
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchedText = captureGroup && match[1] ? match[1] : match[0];
    const startOffset = captureGroup && match[1]
      ? match.index + match[0].indexOf(match[1])
      : match.index;
    const endOffset = startOffset + matchedText.length;

    const lower = matchedText.toLowerCase();
    if (NAME_EXCLUSIONS.has(lower)) continue;

    if (type === "PERSON") {
      const words = matchedText.split(/\s+/);
      if (words.some((w) => NON_NAME_WORDS.has(w.toLowerCase()))) continue;
      if (words[0] && ["this", "all", "internal", "dear", "the", "disclosing", "receiving", "mutual"].includes(words[0].toLowerCase())) continue;
    }

    spans.push({
      id: `suggest-${type}-${startOffset}-${endOffset}`,
      text: matchedText,
      startOffset,
      endOffset,
      type,
      confidence,
    });
  }

  return spans;
}

function getSpanStatus(confidence: number, type: PIIType, text: string): RedactionSpan["status"] {
  const lower = text.toLowerCase();

  // Known false positive patterns always need review
  for (const fp of FALSE_POSITIVE_PATTERNS) {
    fp.regex.lastIndex = 0;
    if (fp.regex.test(lower)) return "needs-review";
  }

  if (confidence >= AUTO_TRUST_THRESHOLD) return "auto-trusted";
  if (confidence >= 0.50) return "needs-review";

  // Very low confidence on OTHER type is likely false positive
  if (type === "OTHER" && confidence < 0.55) return "needs-review";

  return confidence >= AUTO_TRUST_THRESHOLD ? "auto-trusted" : "needs-review";
}

export function detectAllPII(text: string, docType: DocumentType): RedactionSpan[] {
  const suggestions: RedactionSpan[] = [];

  // Run structured pattern detection
  for (const pattern of DETECTION_PATTERNS) {
    const useCapture = pattern.useCaptureGroup ?? false;
    const found = findPattern(text, pattern.regex, pattern.type, pattern.confidence, useCapture);
    for (const span of found) {
      suggestions.push({
        ...span,
        status: getSpanStatus(span.confidence, span.type, span.text),
        isOriginalSuggestion: true,
        riskScore: 0,
      });
    }
  }

  // Explicit false-positive boilerplate detection
  for (const fp of FALSE_POSITIVE_PATTERNS) {
    const found = findPattern(text, fp.regex, "OTHER", fp.confidence);
    for (const span of found) {
      suggestions.push({
        ...span,
        status: "needs-review",
        isOriginalSuggestion: true,
        riskScore: 0,
      });
    }
  }

  // Deduplicate overlapping suggestions (keep highest confidence)
  const sorted = [...suggestions].sort((a, b) => {
    if (a.startOffset !== b.startOffset) return a.startOffset - b.startOffset;
    return b.confidence - a.confidence;
  });

  const nonOverlapping: RedactionSpan[] = [];
  for (const sug of sorted) {
    const overlapIdx = nonOverlapping.findIndex(
      (s) => sug.startOffset < s.endOffset && sug.endOffset > s.startOffset
    );
    if (overlapIdx === -1) {
      nonOverlapping.push({ ...sug, riskScore: 0 });
    } else if (sug.confidence > nonOverlapping[overlapIdx].confidence) {
      nonOverlapping[overlapIdx] = { ...sug, riskScore: 0 };
    }
  }

  return nonOverlapping.map((span) => ({
    ...span,
    riskScore: computeRiskScore(span, docType),
  }));
}