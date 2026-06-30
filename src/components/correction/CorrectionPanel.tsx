"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RedactionSpan, CorrectionAction } from "@/lib/types";
import { PII_TYPE_LABELS, KEYBOARD_SHORTCUTS } from "@/lib/constants";

interface CorrectionPanelProps {
  span: RedactionSpan;
  onCorrect: (spanId: string, action: CorrectionAction, note?: string) => void;
  onClose: () => void;
}

export function CorrectionPanel({ span, onCorrect, onClose }: CorrectionPanelProps) {
  const [note, setNote] = useState("");

  const isSuspicious = span.status === "needs-review" || span.status === "missed";
  const isAutoRedacted = span.status === "auto-trusted";

  const handleAction = useCallback(
    (action: CorrectionAction) => {
      onCorrect(span.id, action, note || undefined);
      setNote("");
      onClose();
    },
    [span.id, note, onCorrect, onClose]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case KEYBOARD_SHORTCUTS.KEEP:
          e.preventDefault();
          if (isSuspicious) {
            handleAction(span.status === "missed" ? "missed-pii" : "keep");
          } else if (isAutoRedacted) {
            onClose();
          }
          break;
        case KEYBOARD_SHORTCUTS.FALSE_POSITIVE:
          e.preventDefault();
          handleAction("false-positive");
          break;
        case KEYBOARD_SHORTCUTS.MISSED_PII:
          if (span.status === "missed") {
            e.preventDefault();
            handleAction("missed-pii");
          }
          break;
        case "escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction, span.status, isSuspicious, isAutoRedacted, onClose]);

  const confidencePct = span.confidence > 0 ? Math.round(span.confidence * 100) : null;
  const isMissed = span.status === "missed";
  const isLowConfidence = span.confidence > 0 && span.confidence < 0.78;

  // Structured exemption quick-tags (Arbiter-inspired)
  const FALSE_POSITIVE_TAGS = [
    { code: "FP-COMMON-NAME", label: "Common name / word" },
    { code: "FP-LEGAL-TERM",  label: "Legal boilerplate" },
    { code: "FP-JOB-TITLE",   label: "Job title / role" },
    { code: "FP-ORG-NAME",    label: "Organization (not PII)" },
    { code: "FP-GENERIC",     label: "Not sensitive in context" },
  ];
  const MISSED_PII_TAGS = [
    { code: "MP-CONTEXT",  label: "PII by context" },
    { code: "MP-PHONE",    label: "Phone / contact" },
    { code: "MP-NAME",     label: "Person name" },
    { code: "MP-ID",       label: "ID / account number" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#c7c4d7] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {isMissed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full uppercase">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  Missed PII — not redacted
                </span>
              )}
              {!isMissed && isLowConfidence && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ffb759] text-[#2a1700] text-[10px] font-bold rounded-full uppercase">
                  <span className="material-symbols-outlined text-[12px]">help</span>
                  Low confidence — needs your call
                </span>
              )}
              <p className="text-xs font-semibold text-[#464554] uppercase tracking-wider">
                {isSuspicious
                  ? `${PII_TYPE_LABELS[span.type]} — should this stay hidden?`
                  : isAutoRedacted
                    ? `Auto-redacted · ${PII_TYPE_LABELS[span.type]}`
                    : `Review · ${PII_TYPE_LABELS[span.type]}`}
              </p>
            </div>

            {/* The text being reviewed */}
            <p className="text-sm font-mono text-[#0b1c30] bg-[#f0f4ff] rounded px-2 py-1 inline-block max-w-full truncate">
              &quot;{span.text}&quot;
            </p>

            {/* AI reason why this needs review */}
            {span.reviewReason && (
              <p className="text-xs text-[#553300] mt-1.5 bg-[#fff8ee] border border-[#ffb759]/40 rounded px-2 py-1">
                <span className="font-semibold">AI says: </span>{span.reviewReason}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#777586]">
              {confidencePct !== null && (
                <span className={confidencePct < 78 ? "text-[#e07b00] font-semibold" : ""}>
                  AI confidence: {confidencePct}%{confidencePct < 78 ? " ⚠" : ""}
                </span>
              )}
              <span>Risk score: {span.riskScore}/100</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[#e5eeff] rounded-lg text-[#464554] shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Structured exemption code quick-tags */}
        {isSuspicious && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-[#777586] uppercase tracking-wider mb-1">
              Quick reason tag (optional)
            </p>
            <div className="flex flex-wrap gap-1">
              {(isMissed ? MISSED_PII_TAGS : FALSE_POSITIVE_TAGS).map((tag) => {
                const active = note === `[${tag.code}] ${tag.label}`;
                return (
                  <button
                    key={tag.code}
                    type="button"
                    onClick={() =>
                      setNote(active ? "" : `[${tag.code}] ${tag.label}`)
                    }
                    className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                      active
                        ? "bg-[#2a14b4] text-white border-[#2a14b4]"
                        : "bg-white text-[#464554] border-[#c7c4d7] hover:border-[#2a14b4] hover:text-[#2a14b4]"
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note or tag above to log your reasoning..."
            className="w-full text-xs border border-[#c7c4d7] rounded-lg p-2 h-10 resize-none focus:outline-none focus:ring-1 focus:ring-[#5148d7] focus:border-[#5148d7] bg-[#f8f9ff] placeholder:text-[#777586]"
          />
          {isSuspicious ? (
            <>
              <Button
                type="button"
                onClick={() => handleAction(isMissed ? "missed-pii" : "keep")}
                className="h-10 bg-[#006c49] hover:bg-[#005236] text-white text-xs font-semibold rounded-lg px-4 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] mr-1">lock</span>
                {isMissed ? "Redact this" : "Yes, keep redacted"}
                <kbd className="ml-1.5 text-[10px] opacity-70 bg-white/20 px-1 rounded">K</kbd>
              </Button>
              <Button
                type="button"
                onClick={() => handleAction("false-positive")}
                variant="outline"
                className="h-10 border-[#c7c4d7] text-[#464554] hover:bg-[#ffdad6] hover:text-[#93000a] hover:border-[#ba1a1a] text-xs font-semibold rounded-lg px-4 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] mr-1">visibility</span>
                {isMissed ? "Leave visible" : "No, show text"}
                <kbd className="ml-1.5 text-[10px] opacity-70 bg-black/5 px-1 rounded">F</kbd>
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => handleAction("false-positive")}
                variant="outline"
                className="h-10 border-[#c7c4d7] text-[#464554] hover:bg-[#ffdad6] hover:text-[#93000a] hover:border-[#ba1a1a] text-xs font-semibold rounded-lg px-4 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] mr-1">visibility</span>
                False positive — reveal
                <kbd className="ml-1.5 text-[10px] opacity-70 bg-black/5 px-1 rounded">F</kbd>
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="h-10 bg-[#4338ca] hover:bg-[#372abf] text-white text-xs font-semibold rounded-lg px-4 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] mr-1">lock</span>
                Keep redacted
                <kbd className="ml-1.5 text-[10px] opacity-70 bg-white/20 px-1 rounded">K</kbd>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}