import { ClassificationResult, DocumentType } from "../types";
import { LLM_CLASSIFICATION_THRESHOLD } from "../constants";

const LEGAL_KEYWORDS = [
  "plaintiff", "defendant", "case no", "exhibit", "settlement",
  "attorney", "policy", "demand", "liability", "lawsuit",
  "court", "jurisdiction", "statute", "counsel", "verdict",
  "non-disclosure", "confidential", "disclosing party", "governing law",
  "agreement", "witness whereof", "hereinafter",
];

const MEDICAL_KEYWORDS = [
  "patient", "diagnosis", "physician", "treatment", "prescribed",
  "hospital", "injury", "symptom", "medical", "therapy",
  "surgical", "radiculopathy", "herniation", "ambulance", "discharge",
];

const FINANCE_KEYWORDS = [
  "account", "balance", "routing", "transaction", "invoice", "payment",
  "credit card", "bank", "statement", "dividend", "portfolio", "investment",
  "tax", "revenue", "expense", "ledger", "wire transfer", "iban",
];

function countKeywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = lower.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

export function needsLlmFallback(
  classification: ClassificationResult,
  text?: string
): boolean {
  if (classification.method !== "keyword") return false;
  if (classification.confidence < LLM_CLASSIFICATION_THRESHOLD) return true;

  if (text && classification.confidence < 0.7) {
    const hasStrongPii =
      /\b\d{3}-\d{2}-\d{4}\b/.test(text) ||
      /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text) ||
      /\bCase\s+No\.?/i.test(text) ||
      /\b(?:SSN|Policy\s+No)/i.test(text);
    if (hasStrongPii) return true;
  }

  return false;
}

export function classifyDocument(text: string): ClassificationResult {
  const legalHits = countKeywordHits(text, LEGAL_KEYWORDS);
  const medicalHits = countKeywordHits(text, MEDICAL_KEYWORDS);
  const financeHits = countKeywordHits(text, FINANCE_KEYWORDS);
  const totalHits = legalHits + medicalHits + financeHits;

  if (totalHits < 3) {
    return {
      type: "general",
      confidence: 0.3,
      method: "keyword",
      keywordScores: { legal: legalHits, medical: medicalHits, finance: financeHits },
    };
  }

  const hits = [
    { type: "legal" as DocumentType, count: legalHits },
    { type: "medical" as DocumentType, count: medicalHits },
    { type: "finance" as DocumentType, count: financeHits },
  ].sort((a, b) => b.count - a.count);

  const top = hits[0];
  const second = hits[1];
  const ratio = top.count / Math.max(1, second.count);
  const minPair = Math.min(top.count, second.count);

  let type: DocumentType;
  let confidence: number;

  if (top.count >= 3 && second.count >= 3 && ratio < 1.8) {
    if (top.type === "legal" && second.type === "medical") {
      type = "hybrid";
    } else if (top.type === "finance" && (second.type === "legal" || second.type === "medical")) {
      type = "hybrid";
    } else {
      type = top.type;
    }
    confidence = Math.min(0.9, 0.5 + minPair * 0.05);
  } else if (ratio > 1.8) {
    type = top.type;
    confidence = Math.min(0.95, 0.6 + (ratio - 1.8) * 0.1);
  } else if (minPair >= 2 && (legalHits >= 2 && medicalHits >= 2)) {
    type = "hybrid";
    confidence = Math.min(0.85, 0.45 + minPair * 0.05);
  } else {
    type = top.count >= 2 ? top.type : "general";
    confidence = top.count >= 2 ? 0.5 : 0.4;
  }

  return {
    type,
    confidence,
    method: "keyword",
    keywordScores: { legal: legalHits, medical: medicalHits, finance: financeHits },
  };
}