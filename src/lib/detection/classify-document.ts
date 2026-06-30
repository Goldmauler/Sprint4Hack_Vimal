import { ClassificationResult, DocumentType } from "../types";

const LEGAL_KEYWORDS = [
  "plaintiff", "defendant", "case no", "exhibit", "settlement",
  "attorney", "policy", "demand", "liability", "lawsuit",
  "court", "jurisdiction", "statute", "counsel", "verdict",
];

const MEDICAL_KEYWORDS = [
  "patient", "diagnosis", "physician", "treatment", "prescribed",
  "hospital", "injury", "symptom", "medical", "therapy",
  "surgical", "radiculopathy", "herniation", "ambulance", "discharge",
];

function countKeywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = lower.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

export function classifyDocument(text: string): ClassificationResult {
  const legalHits = countKeywordHits(text, LEGAL_KEYWORDS);
  const medicalHits = countKeywordHits(text, MEDICAL_KEYWORDS);
  const totalHits = legalHits + medicalHits;

  // If too few signals, mark as general
  if (totalHits < 3) {
    return {
      type: "general",
      confidence: 0.3,
      method: "keyword",
      keywordScores: { legal: legalHits, medical: medicalHits },
    };
  }

  const ratio = Math.max(legalHits, medicalHits) / Math.max(1, Math.min(legalHits, medicalHits));
  const minHits = Math.min(legalHits, medicalHits);

  let type: DocumentType;
  let confidence: number;

  if (ratio > 1.8) {
    // One side dominates
    type = legalHits > medicalHits ? "legal" : "medical";
    confidence = Math.min(0.95, 0.6 + (ratio - 1.8) * 0.1);
  } else if (minHits >= 3) {
    // Both sides have reasonable signals and are close
    type = "hybrid";
    confidence = Math.min(0.9, 0.5 + (minHits * 0.05));
  } else {
    type = "general";
    confidence = 0.4;
  }

  return {
    type,
    confidence,
    method: "keyword",
    keywordScores: { legal: legalHits, medical: medicalHits },
  };
}
