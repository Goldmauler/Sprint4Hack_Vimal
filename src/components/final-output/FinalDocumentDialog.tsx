"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RedactionSpan, AuditLogEntry } from "@/lib/types";
import { applyRedactions } from "@/lib/redaction-utils";
import { ExportButtons } from "./ExportButtons";
import { useMemo } from "react";

interface FinalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawText: string;
  spans: RedactionSpan[];
  auditLog: AuditLogEntry[];
  documentType: string;
  documentTitle?: string;
  filename?: string;
  onReset: () => void;
}

export function FinalDocumentDialog({
  open,
  onOpenChange,
  rawText,
  spans,
  auditLog,
  documentType,
  documentTitle = "Document",
  filename,
  onReset,
}: FinalDocumentDialogProps) {
  const exportFilename = filename
    ? filename.replace(/\.[^.]+$/, "_REDACTED.txt")
    : `${documentTitle.replace(/\s+/g, "_")}_REDACTED.txt`;

  const redactedText = useMemo(
    () => applyRedactions(rawText, spans),
    [rawText, spans]
  );

  const stats = useMemo(() => {
    const autoTrusted = spans.filter((s) => s.status === "auto-trusted").length;
    const confirmedRedact = spans.filter((s) => s.status === "confirmed-redact").length;
    const confirmedReveal = spans.filter((s) => s.status === "confirmed-reveal").length;
    const totalRedacted = autoTrusted + confirmedRedact;

    // "What slipped through" — originally missed PII that was caught and fixed
    const originallyMissed = spans.filter((s) => !s.isOriginalSuggestion && s.status === "confirmed-redact").length;
    // False positives the tool would have wrongly hidden
    const falsePositivesCaught = confirmedReveal;
    // Corrections made with structured exemption codes
    const taggedDecisions = auditLog.filter((e) => e.note?.startsWith("[")).length;

    return { autoTrusted, confirmedRedact, confirmedReveal, totalRedacted, originallyMissed, falsePositivesCaught, taggedDecisions };
  }, [spans, auditLog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl h-[92vh] max-h-[920px] p-0 overflow-hidden flex flex-col bg-[#f8f9ff] border-[#c7c4d7]">
        <DialogHeader className="shrink-0 px-8 py-5 border-b border-[#c7c4d7] bg-white">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-[#0b1c30]">
            <div className="w-11 h-11 rounded-lg bg-[#006c49] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[24px]">
                verified
              </span>
            </div>
            Final Redacted Document
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-0">
          {/* Left sidebar */}
          <aside className="xl:border-r border-[#c7c4d7] overflow-y-auto p-6 space-y-5 bg-[#f8f9ff]">
            <div className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-[#0b1c30] mb-4">
                Document Summary
              </h3>
              <div className="space-y-0">
                {[
                  { label: "Total PII Spans", value: spans.length, color: "text-[#0b1c30]" },
                  { label: "Items Redacted", value: stats.totalRedacted, color: "text-[#006c49]" },
                  { label: "False Positives Removed", value: stats.confirmedReveal, color: "text-[#ba1a1a]" },
                  { label: "Audit Actions Logged", value: auditLog.length, color: "text-[#2a14b4]" },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={`flex justify-between items-center py-3 ${
                      i < arr.length - 1 ? "border-b border-[#c7c4d7]/50" : ""
                    }`}
                  >
                    <span className="text-sm text-[#464554] pr-4">{row.label}</span>
                    <span className={`text-base font-bold font-mono shrink-0 ${row.color}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* "What slipped through" insight card */}
            {(stats.originallyMissed > 0 || stats.falsePositivesCaught > 0 || stats.taggedDecisions > 0) && (
              <div className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#2a14b4]">insights</span>
                  What your review caught
                </h3>
                <div className="space-y-2">
                  {stats.originallyMissed > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-[#fff5f5] border border-[#ba1a1a]/20 px-3 py-2">
                      <span className="material-symbols-outlined text-[16px] text-[#ba1a1a] shrink-0 mt-0.5">warning</span>
                      <p className="text-xs text-[#93000a]">
                        <strong>{stats.originallyMissed} missed PII</strong> that the AI didn&apos;t flag — you caught and redacted {stats.originallyMissed === 1 ? "it" : "them"}.
                      </p>
                    </div>
                  )}
                  {stats.falsePositivesCaught > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-[#f0fff8] border border-[#006c49]/20 px-3 py-2">
                      <span className="material-symbols-outlined text-[16px] text-[#006c49] shrink-0 mt-0.5">check_circle</span>
                      <p className="text-xs text-[#004d30]">
                        <strong>{stats.falsePositivesCaught} false positive{stats.falsePositivesCaught !== 1 ? "s" : ""}</strong> the AI would have wrongly hidden — you unblocked {stats.falsePositivesCaught === 1 ? "it" : "them"}.
                      </p>
                    </div>
                  )}
                  {stats.taggedDecisions > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-[#eff4ff] border border-[#2a14b4]/20 px-3 py-2">
                      <span className="material-symbols-outlined text-[16px] text-[#2a14b4] shrink-0 mt-0.5">label</span>
                      <p className="text-xs text-[#1a0080]">
                        <strong>{stats.taggedDecisions} decision{stats.taggedDecisions !== 1 ? "s" : ""}</strong> logged with structured exemption codes for audit compliance.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-4">
                Export Actions
              </h3>
              <ExportButtons
                rawText={rawText}
                spans={spans}
                auditLog={auditLog}
                documentType={documentType}
                exportFilename={exportFilename}
              />
              <div className="mt-5 pt-4 border-t border-[#c7c4d7]/50">
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onReset();
                  }}
                  className="w-full text-[#2a14b4] text-sm font-medium hover:underline inline-flex items-center justify-center gap-1 py-2"
                >
                  Start New Review
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Document preview */}
          <section className="flex flex-col min-h-0 overflow-hidden bg-white">
            <div className="shrink-0 border-b border-[#c7c4d7] px-6 py-4 flex items-center gap-3 bg-[#f8f9ff]">
              <span className="material-symbols-outlined text-[#777586] text-[22px]">description</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#0b1c30] truncate">
                  {exportFilename}
                </h3>
                <p className="text-xs text-[#464554]">
                  Generated on{" "}
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 font-mono text-sm text-[#0b1c30] leading-relaxed whitespace-pre-wrap">
              {redactedText}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}