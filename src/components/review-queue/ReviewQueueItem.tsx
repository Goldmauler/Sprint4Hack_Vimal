"use client";

import { RedactionSpan, CorrectionAction } from "@/lib/types";
import { PII_TYPE_LABELS, PII_TYPE_ICONS } from "@/lib/constants";

interface ReviewQueueItemProps {
  span: RedactionSpan;
  rawText?: string;
  isActive: boolean;
  onSelect: (spanId: string | null) => void;
  onCorrect: (spanId: string, action: CorrectionAction, note?: string) => void;
}

function extractContext(rawText: string, span: RedactionSpan, radius = 50): string {
  const before = rawText.slice(Math.max(0, span.startOffset - radius), span.startOffset);
  const after = rawText.slice(span.endOffset, Math.min(rawText.length, span.endOffset + radius));
  const trimBefore = before.replace(/^[^\s]*\s/, "");
  const trimAfter = after.replace(/\s[^\s]*$/, "");
  return (
    (before.length < radius ? "" : "…") +
    trimBefore +
    `«${span.text}»` +
    trimAfter +
    (after.length < radius ? "" : "…")
  );
}

function getRiskColor(riskScore: number) {
  if (riskScore >= 80) return { strip: "#ba1a1a", badge: "bg-[#ba1a1a] text-white", icon: "text-[#ba1a1a]" };
  if (riskScore >= 50) return { strip: "#ffb759", badge: "bg-[#744800] text-[#ffb759]", icon: "text-[#744800]" };
  return { strip: "#6cf8bb", badge: "bg-[#006c49] text-[#6cf8bb]", icon: "text-[#006c49]" };
}

export function ReviewQueueItem({ span, rawText, isActive, onSelect, onCorrect }: ReviewQueueItemProps) {
  const colors = getRiskColor(span.riskScore);
  const isMissed = span.status === "missed";
  const isLowConf = span.confidence > 0 && span.confidence < 0.78;
  const confidencePct = span.confidence > 0 ? Math.round(span.confidence * 100) : null;
  const context = rawText ? extractContext(rawText, span) : null;

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
        {/* Type + badges */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className={`material-symbols-outlined text-[16px] shrink-0 ${colors.icon}`}>
            {isMissed ? "warning" : PII_TYPE_ICONS[span.type]}
          </span>
          <span className="text-sm font-semibold text-[#0b1c30]">
            {PII_TYPE_LABELS[span.type]}
          </span>
          {isMissed && (
            <span className="text-[9px] font-bold text-white bg-[#ba1a1a] px-1.5 py-0.5 rounded-full uppercase shrink-0">
              Not Redacted
            </span>
          )}
          {isLowConf && !isMissed && (
            <span className="text-[9px] font-bold text-[#2a1700] bg-[#ffb759] px-1.5 py-0.5 rounded-full uppercase shrink-0">
              Low Confidence
            </span>
          )}
        </div>

        {/* Context snippet (surrounding text) */}
        {context ? (
          <p className="text-[11px] text-[#464554] font-mono bg-[#f8f9ff] rounded px-1.5 py-1 line-clamp-2 leading-snug">
            {context}
          </p>
        ) : (
          <p className="text-xs text-[#464554] italic truncate font-mono bg-[#f8f9ff] rounded px-1.5 py-0.5">
            &quot;{span.text}&quot;
          </p>
        )}

        {/* AI reasoning */}
        {span.reviewReason && (
          <p className="text-[10px] text-[#744800] mt-1 line-clamp-2 leading-snug">{span.reviewReason}</p>
        )}

        {/* Confidence reading */}
        {confidencePct !== null && (
          <p className={`text-[10px] mt-0.5 font-mono ${isLowConf ? "text-[#e07b00] font-semibold" : "text-[#777586]"}`}>
            AI confidence: {confidencePct}%
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-col items-end ml-3 shrink-0 gap-1">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${colors.badge}`}
        >
          Risk {span.riskScore}
        </span>
        <div className={`flex gap-1 mt-1 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCorrect(span.id, isMissed ? "missed-pii" : "keep");
            }}
            className="p-1.5 text-[#006c49] hover:bg-[#6cf8bb]/30 rounded-lg transition-colors border border-[#c7c4d7]"
            title={isMissed ? "Redact this (K)" : "Keep Redacted (K)"}
          >
            <span className="material-symbols-outlined text-[16px]">{isMissed ? "lock" : "check"}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCorrect(span.id, "false-positive");
            }}
            className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors border border-[#c7c4d7]"
            title={isMissed ? "Leave visible (F)" : "False Positive (F)"}
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
          </button>
        </div>
      </div>
    </div>
  );
}
