"use client";

import { RedactionSpan, CorrectionAction } from "@/lib/types";
import { PII_TYPE_LABELS, PII_TYPE_ICONS } from "@/lib/constants";

interface ReviewQueueItemProps {
  span: RedactionSpan;
  isActive: boolean;
  onSelect: (spanId: string) => void;
  onCorrect: (spanId: string, action: CorrectionAction, note?: string) => void;
}

function getRiskColor(riskScore: number) {
  if (riskScore >= 80) return { strip: "#ba1a1a", badge: "bg-[#ba1a1a] text-white", icon: "text-[#ba1a1a]" };
  if (riskScore >= 50) return { strip: "#ffb759", badge: "bg-[#744800] text-[#ffb759]", icon: "text-[#744800]" };
  return { strip: "#6cf8bb", badge: "bg-[#006c49] text-[#6cf8bb]", icon: "text-[#006c49]" };
}

export function ReviewQueueItem({ span, isActive, onSelect, onCorrect }: ReviewQueueItemProps) {
  const colors = getRiskColor(span.riskScore);

  return (
    <div
      className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer flex justify-between items-start group ${
        isActive
          ? "border-[#5148d7] ring-2 ring-[#5148d7]/20 scale-[1.01]"
          : "border-[#c7c4d7] hover:border-[#777586]"
      }`}
      style={{ borderLeft: `4px solid ${colors.strip}` }}
      onClick={() => onSelect(span.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`material-symbols-outlined text-[18px] ${colors.icon}`}>
            {span.status === "missed" ? "warning" : PII_TYPE_ICONS[span.type]}
          </span>
          <span className="text-sm font-semibold text-[#0b1c30] truncate">
            {PII_TYPE_LABELS[span.type]}
          </span>
          {span.status === "missed" && (
            <span className="text-[9px] font-bold text-white bg-[#ba1a1a] px-1.5 py-0.5 rounded-full uppercase">
              Missed
            </span>
          )}
        </div>
        <p className="text-sm text-[#464554] italic truncate font-mono">
          &quot;{span.text}&quot;
        </p>
      </div>

      <div className="flex flex-col items-end ml-3 shrink-0">
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${colors.badge}`}
        >
          {span.confidence > 0 ? `${Math.round(span.confidence * 100)}%` : "N/A"}
        </span>
        <div className="mt-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCorrect(span.id, span.status === "missed" ? "missed-pii" : "keep");
            }}
            className="p-1.5 text-[#006c49] hover:bg-[#6cf8bb]/30 rounded-lg transition-colors border border-[#c7c4d7]"
            title="Keep Redacted (K)"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCorrect(span.id, "false-positive");
            }}
            className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors border border-[#c7c4d7]"
            title="False Positive (F)"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
