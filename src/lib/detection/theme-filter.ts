import { DocumentType, PIIType, RedactionSpan } from "../types";

const THEME_TYPES: Record<DocumentType, Set<PIIType> | null> = {
  general: null,
  hybrid: null,
  medical: new Set(["PERSON", "PHONE", "DATE", "DIAGNOSIS", "ORGANIZATION", "ADDRESS", "OTHER"]),
  legal: new Set(["PERSON", "PHONE", "DATE", "CASE_NUMBER", "FINANCIAL", "FINANCIAL_ID", "ORGANIZATION", "ADDRESS", "OTHER"]),
  finance: new Set(["PERSON", "PHONE", "DATE", "FINANCIAL", "FINANCIAL_ID", "ORGANIZATION", "ADDRESS", "OTHER"]),
};

const LEGAL_BOILERPLATE = /\b(?:the\s+)?(?:plaintiff|defendant|undersigned)\b/i;
const EXHIBIT_REF = /\bexhibit\s+[a-z0-9]+\b/i;

export function filterSpansForTheme(spans: RedactionSpan[], theme: DocumentType): RedactionSpan[] {
  const allowed = THEME_TYPES[theme];
  if (!allowed) return spans;

  return spans.filter((span) => {
    if (!allowed.has(span.type)) return false;

    if (theme === "medical") {
      if (span.type === "CASE_NUMBER") return false;
      if (LEGAL_BOILERPLATE.test(span.text) || EXHIBIT_REF.test(span.text)) return false;
    }

    if (theme === "legal" && span.type === "DIAGNOSIS") return false;
    if (theme === "finance" && (span.type === "DIAGNOSIS" || span.type === "CASE_NUMBER")) return false;

    return true;
  });
}