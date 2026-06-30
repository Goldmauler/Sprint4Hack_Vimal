import { PIIType, SpanStatus } from "./types";

// Confidence thresholds
export const AUTO_TRUST_THRESHOLD = 0.85;
export const NEEDS_REVIEW_THRESHOLD = 0.50;

// Risk score thresholds
export const HIGH_RISK_FLOOR = 80;
export const MEDIUM_RISK_FLOOR = 50;

// Colors for risk levels
export const RISK_COLORS = {
  high: {
    bg: "rgba(186, 26, 26, 0.15)",
    border: "#ba1a1a",
    text: "#93000a",
    tag: "#ba1a1a",
    tagText: "#ffffff",
  },
  medium: {
    bg: "rgba(255, 183, 89, 0.15)",
    border: "#ffb759",
    text: "#553300",
    tag: "#ffb759",
    tagText: "#2a1700",
  },
  low: {
    bg: "rgba(108, 248, 187, 0.15)",
    border: "#6cf8bb",
    text: "#002113",
    tag: "#6cf8bb",
    tagText: "#002113",
  },
  muted: {
    bg: "rgba(199, 196, 215, 0.2)",
    border: "#c7c4d7",
    text: "#464554",
    tag: "#c7c4d7",
    tagText: "#464554",
  },
} as const;

// Status to display mapping
export const STATUS_LABELS: Record<SpanStatus, string> = {
  "auto-trusted": "Auto-Trusted",
  "needs-review": "Needs Review",
  "missed": "Missed PII",
  "confirmed-redact": "Confirmed Redact",
  "confirmed-reveal": "False Positive",
};

// PII type icons (Material Symbols)
export const PII_TYPE_ICONS: Record<PIIType, string> = {
  PERSON: "person",
  PHONE: "phone",
  DATE: "calendar_today",
  CASE_NUMBER: "gavel",
  FINANCIAL: "payments",
  FINANCIAL_ID: "credit_card",
  ORGANIZATION: "business",
  DIAGNOSIS: "medical_information",
  ADDRESS: "location_on",
  OTHER: "help_outline",
};

// PII type labels
export const PII_TYPE_LABELS: Record<PIIType, string> = {
  PERSON: "Person Name",
  PHONE: "Phone Number",
  DATE: "Date",
  CASE_NUMBER: "Case Number",
  FINANCIAL: "Financial",
  FINANCIAL_ID: "Financial ID",
  ORGANIZATION: "Organization",
  DIAGNOSIS: "Diagnosis",
  ADDRESS: "Address",
  OTHER: "Other",
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  KEEP: "k",
  FALSE_POSITIVE: "f",
  MISSED_PII: "m",
  NEXT_ITEM: "j",
  PREV_ITEM: "ArrowUp",
} as const;
