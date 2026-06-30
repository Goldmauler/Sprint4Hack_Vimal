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
  onReset: () => void;
}

export function FinalDocumentDialog({
  open,
  onOpenChange,
  rawText,
  spans,
  auditLog,
  documentType,
  onReset,
}: FinalDocumentDialogProps) {
  const redactedText = useMemo(
    () => applyRedactions(rawText, spans),
    [rawText, spans]
  );

  const stats = useMemo(() => {
    const autoTrusted = spans.filter((s) => s.status === "auto-trusted").length;
    const confirmedRedact = spans.filter((s) => s.status === "confirmed-redact").length;
    const confirmedReveal = spans.filter((s) => s.status === "confirmed-reveal").length;
    const totalRedacted = autoTrusted + confirmedRedact;
    return { autoTrusted, confirmedRedact, confirmedReveal, totalRedacted };
  }, [spans]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-[#f8f9ff] border-[#c7c4d7]">
        <DialogHeader className="pb-4 border-b border-[#c7c4d7]">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-[#0b1c30]">
            <div className="w-10 h-10 rounded-lg bg-[#006c49] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[22px]">
                verified
              </span>
            </div>
            Final Redacted Document
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          {/* Summary sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            {/* Stats card */}
            <div className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-[#0b1c30] mb-3">
                Document Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#c7c4d7]/50">
                  <span className="text-sm text-[#464554]">Total Issues Found</span>
                  <span className="text-sm font-bold font-mono text-[#0b1c30]">{spans.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#c7c4d7]/50">
                  <span className="text-sm text-[#464554]">Items Redacted</span>
                  <span className="text-sm font-bold font-mono text-[#006c49]">{stats.totalRedacted}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#c7c4d7]/50">
                  <span className="text-sm text-[#464554]">False Positives Removed</span>
                  <span className="text-sm font-bold font-mono text-[#ba1a1a]">{stats.confirmedReveal}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-[#464554]">Audit Actions</span>
                  <span className="text-sm font-bold font-mono text-[#2a14b4]">{auditLog.length}</span>
                </div>
              </div>
            </div>

            {/* Export buttons */}
            <div className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-3">
                Export Actions
              </h3>
              <ExportButtons
                rawText={rawText}
                spans={spans}
                auditLog={auditLog}
                documentType={documentType}
              />
              <div className="mt-4 pt-4 border-t border-[#c7c4d7]/50 text-center">
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onReset();
                  }}
                  className="text-[#2a14b4] text-sm font-medium hover:underline inline-flex items-center gap-1"
                >
                  Start New Review
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Document preview */}
          <section className="lg:col-span-8 overflow-hidden flex flex-col">
            <div className="bg-white border border-[#c7c4d7] rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
              {/* Preview header */}
              <div className="border-b border-[#c7c4d7] p-4 flex items-center justify-between bg-[#f8f9ff] rounded-t-xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#777586]">description</span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0b1c30]">
                      Demand_Letter_FINAL_REDACTED.txt
                    </h3>
                    <p className="text-[10px] text-[#464554]">
                      Generated on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Redacted document content */}
              <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-[#0b1c30] leading-relaxed whitespace-pre-wrap bg-white">
                {redactedText}
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
