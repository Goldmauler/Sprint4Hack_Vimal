"use client";

import { useState } from "react";
import { CorrectionAction } from "@/lib/types";
import { SpanGroup, batchAction } from "@/lib/entity-grouper";
import { PII_TYPE_LABELS, PII_TYPE_ICONS } from "@/lib/constants";

interface GroupedReviewItemProps {
  group: SpanGroup;
  activeSpanId: string | null;
  onSelectSpan: (spanId: string | null) => void;
  onBatchCorrect: (group: SpanGroup, action: CorrectionAction) => void;
}

function getRiskColor(score: number) {
  if (score >= 80) return { strip: "#ba1a1a", badge: "bg-[#ba1a1a] text-white" };
  if (score >= 50) return { strip: "#ffb759", badge: "bg-[#744800] text-[#ffb759]" };
  return { strip: "#6cf8bb", badge: "bg-[#006c49] text-[#6cf8bb]" };
}

export function GroupedReviewItem({
  group,
  activeSpanId,
  onSelectSpan,
  onBatchCorrect,
}: GroupedReviewItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState<"keep" | "reveal" | null>(null);

  const colors = getRiskColor(group.maxRiskScore);
  const { keepAction, rejectAction } = batchAction(group);
  const isMultiple = group.spans.length > 1;
  const anyActive = group.spans.some((s) => s.id === activeSpanId);

  function handleBatchKeep() {
    if (isMultiple && confirming !== "keep") {
      setConfirming("keep");
      return;
    }
    onBatchCorrect(group, keepAction);
    setConfirming(null);
  }

  function handleBatchReveal() {
    if (isMultiple && confirming !== "reveal") {
      setConfirming("reveal");
      return;
    }
    onBatchCorrect(group, rejectAction);
    setConfirming(null);
  }

  return (
    <div
      className={`bg-white border rounded-xl shadow-sm transition-all ${
        anyActive
          ? "border-[#5148d7] ring-2 ring-[#5148d7]/20"
          : "border-[#c7c4d7] hover:border-[#777586] hover:shadow-md"
      }`}
      style={{ borderLeft: `4px solid ${colors.strip}` }}
    >
      {/* Header row */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {/* Type + badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="material-symbols-outlined text-[15px] text-[#464554]">
                {group.allMissed ? "warning" : PII_TYPE_ICONS[group.type]}
              </span>
              <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wide">
                {PII_TYPE_LABELS[group.type]}
              </span>

              {/* Multi-instance badge — the novel feature indicator */}
              {isMultiple && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#e3dfff] text-[#2a14b4] text-[10px] font-bold rounded-full">
                  <span className="material-symbols-outlined text-[11px]">layers</span>
                  {group.spans.length} instances
                </span>
              )}

              {group.allMissed && (
                <span className="px-1.5 py-0.5 bg-[#ba1a1a] text-white text-[9px] font-bold rounded-full uppercase">
                  Not Redacted
                </span>
              )}
              {group.hasMixed && (
                <span className="px-1.5 py-0.5 bg-[#744800] text-[#ffb759] text-[9px] font-bold rounded-full uppercase">
                  Mixed
                </span>
              )}
            </div>

            {/* Entity text */}
            <p className="text-sm font-mono font-semibold text-[#0b1c30] bg-[#f0f4ff] rounded px-1.5 py-0.5 inline-block max-w-full truncate">
              &quot;{group.displayText}&quot;
            </p>

            {/* Risk score */}
            <span className={`ml-2 px-2 py-0.5 rounded text-[9px] font-bold ${colors.badge}`}>
              Risk {group.maxRiskScore}
            </span>
          </div>
        </div>

        {/* First context snippet (always visible) */}
        {group.contextSnippets[0] && (
          <p className="text-[11px] text-[#464554] leading-snug bg-[#f8f9ff] rounded px-2 py-1.5 font-mono mb-2 line-clamp-2">
            {group.contextSnippets[0]}
          </p>
        )}

        {/* Confirmation prompts */}
        {confirming === "keep" && (
          <div className="mb-2 rounded-lg border border-[#006c49] bg-[#f0fff8] px-3 py-2 text-xs text-[#004d30]">
            <p className="font-semibold mb-1.5">
              Redact all {group.spans.length} instances of &quot;{group.displayText}&quot;?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBatchKeep}
                className="px-3 py-1 bg-[#006c49] text-white rounded text-xs font-bold hover:bg-[#005236]"
              >
                Yes, redact all {group.spans.length}
              </button>
              <button
                onClick={() => { setConfirming(null); onSelectSpan(group.spans[0].id); setExpanded(true); }}
                className="px-3 py-1 border border-[#c7c4d7] text-[#464554] rounded text-xs hover:bg-[#f0f4ff]"
              >
                Review individually
              </button>
              <button onClick={() => setConfirming(null)} className="px-2 py-1 text-[#777586] text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}

        {confirming === "reveal" && (
          <div className="mb-2 rounded-lg border border-[#ba1a1a] bg-[#fff5f5] px-3 py-2 text-xs text-[#93000a]">
            <p className="font-semibold mb-1.5">
              Mark all {group.spans.length} instances of &quot;{group.displayText}&quot; as false positive?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBatchReveal}
                className="px-3 py-1 bg-[#ba1a1a] text-white rounded text-xs font-bold hover:bg-[#93000a]"
              >
                Yes, reveal all {group.spans.length}
              </button>
              <button
                onClick={() => { setConfirming(null); onSelectSpan(group.spans[0].id); setExpanded(true); }}
                className="px-3 py-1 border border-[#c7c4d7] text-[#464554] rounded text-xs hover:bg-[#f0f4ff]"
              >
                Review individually
              </button>
              <button onClick={() => setConfirming(null)} className="px-2 py-1 text-[#777586] text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action row (hidden while confirming) */}
        {!confirming && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBatchKeep}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#006c49] hover:bg-[#005236] text-white rounded-lg text-[11px] font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">lock</span>
              {isMultiple ? `Redact all ${group.spans.length}` : (group.allMissed ? "Redact" : "Keep redacted")}
            </button>
            <button
              onClick={handleBatchReveal}
              className="flex items-center gap-1 px-3 py-1.5 border border-[#c7c4d7] hover:bg-[#ffdad6] hover:text-[#93000a] hover:border-[#ba1a1a] text-[#464554] rounded-lg text-[11px] font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">visibility</span>
              {isMultiple ? `False positive — all ${group.spans.length}` : "False positive"}
            </button>
            {isMultiple && (
              <button
                onClick={() => { setExpanded(!expanded); setConfirming(null); }}
                className="flex items-center gap-0.5 px-2 py-1.5 text-[#2a14b4] text-[11px] font-semibold hover:underline"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {expanded ? "expand_less" : "expand_more"}
                </span>
                {expanded ? "Collapse" : "Review individually"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded: individual instances */}
      {expanded && isMultiple && (
        <div className="border-t border-[#e5eeff] bg-[#f8f9ff] rounded-b-xl px-3 py-2 space-y-2">
          <p className="text-[10px] font-semibold text-[#777586] uppercase tracking-wider mb-1">
            Individual instances — click to jump in document
          </p>
          {group.spans.map((span, idx) => (
            <div
              key={span.id}
              onClick={() => onSelectSpan(span.id)}
              className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                activeSpanId === span.id
                  ? "border-[#5148d7] bg-[#e3dfff]"
                  : "border-[#c7c4d7] bg-white hover:border-[#5148d7] hover:bg-[#eff4ff]"
              }`}
            >
              <span className="text-[10px] font-mono text-[#777586] shrink-0 mt-0.5">#{idx + 1}</span>
              <p className="text-[11px] text-[#464554] font-mono leading-snug line-clamp-2 flex-1">
                {group.contextSnippets[idx]}
              </p>
              <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                span.status === "missed" ? "bg-[#ba1a1a] text-white" : "bg-[#ffb759] text-[#2a1700]"
              }`}>
                {span.status === "missed" ? "Missed" : "Review"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
