import { DocumentType, PIIType } from "../types";

export interface LLMClassificationResponse {
  type: DocumentType;
  confidence: number;
  reasoning: string;
}

export interface LLMRedactionSuggestion {
  text: string;
  type: PIIType;
  confidence: number;
  isFalsePositiveRisk?: boolean;
  reason?: string;
}

export interface LLMRedactionResponse {
  suggestions: LLMRedactionSuggestion[];
}

const VALID_TYPES: DocumentType[] = ["medical", "legal", "general", "hybrid", "finance"];
const VALID_PII: PIIType[] = [
  "PERSON", "PHONE", "DATE", "CASE_NUMBER", "FINANCIAL", "FINANCIAL_ID",
  "ORGANIZATION", "DIAGNOSIS", "ADDRESS", "OTHER",
];

const THEME_SCOPE: Record<DocumentType, string> = {
  general:
    "Redact ALL personally identifying and sensitive information: names, phones, emails, addresses, dates tied to individuals, financial amounts, account/policy/case numbers, diagnoses, and organizations that identify parties.",
  medical:
    "Redact ONLY protected health information (PHI): patient names, treating physicians, diagnoses, injury dates, medical facility names, medical record references, phone numbers, and addresses tied to care. Do NOT flag legal boilerplate (plaintiff, defendant, exhibit references, the undersigned) unless they contain actual identifiers.",
  legal:
    "Redact ONLY legal/judicial identifiers: party names, case numbers, policy numbers, settlement amounts, attorney contact info, court dates, and insurance identifiers. Do NOT flag medical diagnoses or clinical details unless they identify a specific person in a legal filing.",
  hybrid:
    "Redact BOTH medical PHI and legal identifiers: names, case numbers, diagnoses, treating physicians, hospitals, policy numbers, financial damages, phones, and addresses. Flag legal boilerplate (the plaintiff, Exhibit A, the undersigned) as false-positive risks.",
  finance:
    "Redact ONLY financial identifiers: account numbers, routing numbers, SSN/tax IDs, credit card numbers, transaction amounts, invoice numbers, bank names tied to accounts, and policy numbers. Names and phones only when directly tied to a financial account.",
};

export function getThemeScopeDescription(theme: DocumentType): string {
  return THEME_SCOPE[theme];
}

export function buildClassificationPrompt(documentText: string): string {
  return `You are a document classification assistant specialized in identifying document types for PII redaction purposes.

Analyze the following document and classify it as one of:
- "medical" — primarily contains medical/healthcare information
- "legal" — primarily contains legal/judicial information
- "hybrid" — contains significant elements of both medical and legal domains
- "finance" — primarily financial statements, transactions, tax, or banking documents
- "general" — does not clearly fall into the above categories

Respond with a JSON object in exactly this format:
{
  "type": "medical" | "legal" | "general" | "hybrid" | "finance",
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation of classification>"
}

Document:
---
${documentText.substring(0, 4000)}
---

Respond with ONLY the JSON object, no additional text.`;
}

export function buildRedactionPrompt(documentText: string, documentType: DocumentType): string {
  const scope = THEME_SCOPE[documentType];
  return `You are a PII redaction expert reviewing a document under the "${documentType}" redaction theme.

REDACTION SCOPE FOR THIS THEME:
${scope}

Identify every piece of sensitive information that should be redacted UNDER THIS THEME ONLY.
Also flag likely false positives (boilerplate phrases wrongly marked as PII).

For each item return:
- text: exact substring from the document (must appear verbatim)
- type: one of PERSON, PHONE, DATE, CASE_NUMBER, FINANCIAL, FINANCIAL_ID, ORGANIZATION, DIAGNOSIS, ADDRESS, OTHER
- confidence: 0-1 how certain this needs redaction under the ${documentType} theme
- isFalsePositiveRisk: true if this looks like a false positive for this theme
- reason: brief explanation referencing the theme scope

Respond with JSON only:
{
  "suggestions": [
    { "text": "...", "type": "PERSON", "confidence": 0.95, "isFalsePositiveRisk": false, "reason": "..." }
  ]
}

Document:
---
${documentText.substring(0, 6000)}
---`;
}

export function validateLLMResponse(raw: unknown): LLMClassificationResponse | null {
  if (typeof raw !== "object" || raw === null) return null;

  const obj = raw as Record<string, unknown>;

  if (
    !VALID_TYPES.includes(obj.type as DocumentType) ||
    typeof obj.confidence !== "number" ||
    obj.confidence < 0 ||
    obj.confidence > 1 ||
    typeof obj.reasoning !== "string"
  ) {
    return null;
  }

  return {
    type: obj.type as DocumentType,
    confidence: obj.confidence,
    reasoning: obj.reasoning,
  };
}

function normalizePIIType(type: string): PIIType {
  const upper = type.trim().toUpperCase().replace(/\s+/g, "_");
  if (upper === "NAME") return "PERSON";
  if (VALID_PII.includes(upper as PIIType)) return upper as PIIType;
  return "OTHER";
}

export function validateLLMRedactionResponse(raw: unknown): LLMRedactionResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.suggestions)) return null;

  const suggestions: LLMRedactionSuggestion[] = [];

  for (const item of obj.suggestions) {
    if (typeof item !== "object" || item === null) continue;
    const s = item as Record<string, unknown>;
    if (typeof s.text !== "string" || !s.text.trim()) continue;

    const confidence =
      typeof s.confidence === "number" ? Math.min(1, Math.max(0, s.confidence)) : 0.7;

    suggestions.push({
      text: s.text,
      type: normalizePIIType(String(s.type || "OTHER")),
      confidence,
      isFalsePositiveRisk: Boolean(s.isFalsePositiveRisk),
      reason: typeof s.reason === "string" ? s.reason : undefined,
    });
  }

  return { suggestions };
}

export interface AnnotationAuditItem {
  text: string;
  shouldRedact: boolean;
  isFalsePositiveRisk: boolean;
  confidence: number;
  reason: string;
}

export interface AnnotationAuditResponse {
  reviews: AnnotationAuditItem[];
}

export function buildAnnotationAuditPrompt(
  documentText: string,
  annotations: Array<{ text: string; type: string }>,
  documentType: DocumentType
): string {
  const list = annotations
    .map((a, i) => `${i + 1}. [${a.type}] "${a.text}"`)
    .join("\n");

  return `You are a redaction quality checker on a ${documentType} document.

Most redactions are correct and should stay hidden automatically. Your job is to flag ONLY suspicious or likely WRONG redactions that need human confirmation.

ONLY include items in "reviews" that are suspicious (false positives, wrong type, facility labeled as person, boilerplate, section headers, etc.).

Do NOT include clearly correct PII (real patient names, DOB, phone, email, MRN, physician names).

For each SUSPICIOUS item only:
- text: exact text from the list
- shouldRedact: false if it should NOT be redacted
- isFalsePositiveRisk: true
- confidence: 0-1
- reason: one sentence question for the reviewer, e.g. "This looks like a hospital name, not a person — should this stay redacted?"

Redaction scope: ${THEME_SCOPE[documentType]}

Document:
---
${documentText.substring(0, 5000)}
---

All suggested redactions:
${list}

Respond with JSON only. If none are suspicious, return {"reviews": []}:
{
  "reviews": [
    { "text": "...", "shouldRedact": false, "isFalsePositiveRisk": true, "confidence": 0.85, "reason": "..." }
  ]
}`;
}

export function validateAnnotationAuditResponse(raw: unknown): AnnotationAuditResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.reviews)) return null;

  const reviews: AnnotationAuditItem[] = [];
  for (const item of obj.reviews) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.text !== "string" || !r.text.trim()) continue;
    reviews.push({
      text: r.text.trim(),
      shouldRedact: Boolean(r.shouldRedact),
      isFalsePositiveRisk: Boolean(r.isFalsePositiveRisk),
      confidence:
        typeof r.confidence === "number" ? Math.min(1, Math.max(0, r.confidence)) : 0.7,
      reason: typeof r.reason === "string" ? r.reason : "Please confirm whether this should stay redacted.",
    });
  }

  return { reviews };
}

export function extractJsonFromText(text: string): unknown | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}