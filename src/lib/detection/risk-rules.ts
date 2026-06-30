import { DocumentType, PIIType, RedactionSpan } from "../types";

// Domain weight tables (0-100 scale)
const DOMAIN_WEIGHTS: Record<string, Partial<Record<PIIType, number>>> = {
  medical: {
    PERSON: 90,
    DATE: 85,
    DIAGNOSIS: 100,
    ORGANIZATION: 60,
    PHONE: 85,
    ADDRESS: 75,
    FINANCIAL: 40,
    FINANCIAL_ID: 50,
    CASE_NUMBER: 30,
    OTHER: 30,
  },
  legal: {
    PERSON: 90,
    DATE: 60,
    DIAGNOSIS: 40,
    ORGANIZATION: 60,
    PHONE: 85,
    ADDRESS: 70,
    FINANCIAL: 80,
    FINANCIAL_ID: 85,
    CASE_NUMBER: 80,
    OTHER: 25,
  },
  general: {
    PERSON: 75,
    DATE: 50,
    DIAGNOSIS: 70,
    ORGANIZATION: 50,
    PHONE: 80,
    ADDRESS: 65,
    FINANCIAL: 60,
    FINANCIAL_ID: 65,
    CASE_NUMBER: 55,
    OTHER: 20,
  },
};

function getDomainWeight(piiType: PIIType, docType: DocumentType): number {
  if (docType === "hybrid") {
    // Take max across applicable domains — err toward caution
    const medWeight = DOMAIN_WEIGHTS.medical[piiType] ?? 30;
    const legalWeight = DOMAIN_WEIGHTS.legal[piiType] ?? 30;
    return Math.max(medWeight, legalWeight);
  }
  return DOMAIN_WEIGHTS[docType]?.[piiType] ?? DOMAIN_WEIGHTS.general[piiType] ?? 30;
}

export function computeRiskScore(span: RedactionSpan, docType: DocumentType): number {
  // Gap-detected (missed) spans always get a high-risk floor
  if (span.status === "missed" || !span.isOriginalSuggestion) {
    return Math.max(90, getDomainWeight(span.type, docType));
  }

  const domainWeight = getDomainWeight(span.type, docType);
  const confidenceGap = 1 - span.confidence; // lower confidence → higher gap → more risk

  // Risk formula: weighted combination of domain importance and uncertainty
  const baseRisk = domainWeight * 0.6 + confidenceGap * 100 * 0.4;

  // Clamp to 0-100
  return Math.round(Math.min(100, Math.max(0, baseRisk)));
}

export function applyRiskScores(spans: RedactionSpan[], docType: DocumentType): RedactionSpan[] {
  return spans.map((span) => ({
    ...span,
    riskScore: computeRiskScore(span, docType),
  }));
}
