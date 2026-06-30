"use client";

import { RedactionSpan, CorrectionAction } from "@/lib/types";
import { CorrectionPopover } from "@/components/correction/CorrectionPopover";
import { PII_TYPE_LABELS } from "@/lib/constants";

interface SpanHighlightProps {
  span: RedactionSpan;
  onCorrect: (spanId: string, action: CorrectionAction, note?: string) => void;
  isActive: boolean;
  onSelect: (spanId: string) => void;
}

function getSpanStyles(span: RedactionSpan) {
  const isReviewable = span.status === "needs-review" || span.status === "missed";

  if (span.status === "missed") {
    return {
      bg: "rgba(186, 26, 26, 0.18)",
      border: "2px solid #ba1a1a",
      tagBg: "#ba1a1a",
      tagText: "#ffffff",
      cursor: "pointer",
    };
  }

  if (span.status === "needs-review") {
    return {
      bg: "rgba(255, 183, 89, 0.18)",
      border: "2px solid #ffb759",
      tagBg: span.riskScore >= 60 ? "#ffb759" : "#ffb95f",
      tagText: "#2a1700",
      cursor: "pointer",
    };
  }

  if (span.status === "confirmed-redact") {
    return {
      bg: "rgba(108, 248, 187, 0.15)",
      border: "2px solid #6cf8bb",
      tagBg: "#6cf8bb",
      tagText: "#002113",
      cursor: "default",
    };
  }

  if (span.status === "confirmed-reveal") {
    return {
      bg: "transparent",
      border: "2px dashed #c7c4d7",
      tagBg: "#c7c4d7",
      tagText: "#464554",
      cursor: "default",
    };
  }

  // auto-trusted — muted
  return {
    bg: "rgba(199, 196, 215, 0.15)",
    border: "1px solid #c7c4d7",
    tagBg: "#c7c4d7",
    tagText: "#464554",
    cursor: "default",
  };
}

function getTagLabel(span: RedactionSpan): string {
  if (span.status === "missed") return "MISSED";
  if (span.status === "confirmed-reveal") return "✓ KEPT";
  if (span.status === "confirmed-redact") return "✓ REDACT";
  return PII_TYPE_LABELS[span.type]?.toUpperCase() || "PII";
}

export function SpanHighlight({
  span,
  onCorrect,
  isActive,
  onSelect,
}: SpanHighlightProps) {
  const styles = getSpanStyles(span);
  const isReviewable = span.status === "needs-review" || span.status === "missed";
  const tagLabel = getTagLabel(span);

  const highlightElement = (
    <span
      className={`inline-flex items-baseline gap-0 rounded-sm transition-all duration-200 ${
        isActive ? "ring-2 ring-[#5148d7] ring-offset-1 scale-[1.02]" : ""
      } ${isReviewable ? "hover:scale-[1.02] hover:shadow-md" : ""}`}
      style={{
        backgroundColor: styles.bg,
        border: styles.border,
        cursor: styles.cursor,
        padding: "1px 4px",
        margin: "0 2px",
        borderRadius: "3px",
      }}
      onClick={() => isReviewable && onSelect(span.id)}
      data-span-id={span.id}
    >
      {/* Inline tag label */}
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
      <span className="inline">{span.text}</span>
    </span>
  );

  if (isReviewable) {
    return (
      <CorrectionPopover
        span={span}
        onCorrect={onCorrect}
        open={isActive}
        onOpenChange={(open) => {
          if (open) onSelect(span.id);
          else onSelect("");
        }}
      >
        {highlightElement}
      </CorrectionPopover>
    );
  }

  return highlightElement;
}
