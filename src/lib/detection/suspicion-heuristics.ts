import { PIIType } from "../types";
import { AnnotationAuditItem } from "./llm-prompt";
import { AUTO_TRUST_THRESHOLD } from "../constants";

const FACILITY_PATTERN =
  /\b(?:hospital|medical center|regional|department|facility|clinic|group|internal medicine|health system|admission summary|discharge summary)\b/i;

const BOILERPLATE_PATTERN =
  /\b(?:the plaintiff|the defendant|the undersigned|exhibit\s+[a-z0-9]+|attorney at law|dear sir|claims adjuster)\b/i;

export function isSuspiciousRedaction(
  text: string,
  type: PIIType,
  confidence: number,
  audit?: AnnotationAuditItem
): { suspicious: boolean; reason?: string } {
  if (audit?.isFalsePositiveRisk || (audit && audit.shouldRedact === false)) {
    return {
      suspicious: true,
      reason: audit.reason || "AI flagged this as a likely false positive.",
    };
  }

  if (confidence < AUTO_TRUST_THRESHOLD) {
    return {
      suspicious: true,
      reason: "Low confidence — is this redaction correct?",
    };
  }

  const lower = text.toLowerCase();

  if (type === "PERSON" && FACILITY_PATTERN.test(lower)) {
    return {
      suspicious: true,
      reason: "Looks like a facility or department, not a person — should this stay redacted?",
    };
  }

  if (type === "PERSON" && text.split(/\s+/).length > 4) {
    return {
      suspicious: true,
      reason: "This may not be a person name — should this stay redacted?",
    };
  }

  if (BOILERPLATE_PATTERN.test(lower)) {
    return {
      suspicious: true,
      reason: "Looks like legal boilerplate, not PII — should this stay redacted?",
    };
  }

  if (type === "DATE" && !/\d/.test(text)) {
    return {
      suspicious: true,
      reason: "Doesn't look like a date — should this stay redacted?",
    };
  }

  return { suspicious: false };
}