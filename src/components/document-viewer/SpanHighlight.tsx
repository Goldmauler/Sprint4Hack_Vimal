"use client";

import { RedactionSpan } from "@/lib/types";
import { PII_TYPE_LABELS } from "@/lib/constants";

interface SpanHighlightProps {
  span: RedactionSpan;
  isActive: boolean;
  onSelect: (spanId: string | null) => void;
}

const REDACT_LABELS: Record<string, string> = {
  PERSON: "NAME",
  PHONE: "PHONE",
  DATE: "DATE",
  CASE_NUMBER: "CASE",
  FINANCIAL: "FIN",
  FINANCIAL_ID: "ID",
  ORGANIZATION: "ORG",
  DIAGNOSIS: "MED",
  ADDRESS: "ADDR",
  OTHER: "PII",
};

function getSpanStyles(span: RedactionSpan) {
  if (span.status === "missed") {
    return {
      bg: "rgba(186, 26, 26, 0.18)",
      border: "2px solid #ba1a1a",
      tagBg: "#ba1a1a",
      tagText: "#ffffff",
    };
  }

  if (span.status === "needs-review") {
    return {
      bg: "rgba(255, 183, 89, 0.18)",
      border: "2px solid #ffb759",
      tagBg: span.riskScore >= 60 ? "#ffb759" : "#ffb95f",
      tagText: "#2a1700",
    };
  }

  if (span.status === "confirmed-redact") {
    return {
      bg: "rgba(108, 248, 187, 0.15)",
      border: "2px solid #6cf8bb",
      tagBg: "#6cf8bb",
      tagText: "#002113",
    };
  }

  if (span.status === "confirmed-reveal") {
    return {
      bg: "transparent",
      border: "2px dashed #c7c4d7",
      tagBg: "#c7c4d7",
      tagText: "#464554",
    };
  }

  return {
    bg: "rgba(199, 196, 215, 0.2)",
    border: "1px solid #c7c4d7",
    tagBg: "#777586",
    tagText: "#ffffff",
  };
}

function getTagLabel(span: RedactionSpan): string {
  if (span.status === "missed") return "MISSED";
  if (span.status === "confirmed-reveal") return "VISIBLE";
  if (span.status === "confirmed-redact") return "REDACTED";
  if (span.status === "needs-review") return "REVIEW";
  return REDACT_LABELS[span.type] || "PII";
}

function isRedactedInView(span: RedactionSpan): boolean {
  return span.status === "auto-trusted" || span.status === "confirmed-redact";
}

export function SpanHighlight({ span, isActive, onSelect }: SpanHighlightProps) {
  const styles = getSpanStyles(span);
  const tagLabel = getTagLabel(span);
  const showRedacted = isRedactedInView(span);

  return (
    <span
      role="button"
      tabIndex={0}
      title={showRedacted ? "Click to reveal or change" : "Click to review"}
      className={`inline-flex items-baseline gap-0 rounded-sm transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md ${
        isActive ? "ring-2 ring-[#5148d7] ring-offset-1 scale-[1.02]" : ""
      }`}
      style={{
        backgroundColor: styles.bg,
        border: styles.border,
        padding: "1px 4px",
        margin: "0 2px",
        borderRadius: "3px",
      }}
      onClick={() => onSelect(span.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(span.id);
        }
      }}
      data-span-id={span.id}
    >
      <span
        className="inline-block text-[8px] font-bold uppercase tracking-wider rounded-sm mr-1 shrink-0 leading-none"
        style={{
          backgroundColor: styles.tagBg,
          color: styles.tagText,
          padding: "2px 4px",
          verticalAlign: "middle",
          borderRadius: "2px",
        }}
      >
        {tagLabel}
      </span>
      {showRedacted ? (
        <span className="inline font-mono text-[11px] text-[#777586] tracking-tight">
          ████████
        </span>
      ) : (
        <span className="inline">{span.text}</span>
      )}
    </span>
  );
}