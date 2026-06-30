"use client";

import { RedactionSpan, AuditLogEntry } from "@/lib/types";
import { applyRedactions, buildAuditJSON, downloadFile } from "@/lib/redaction-utils";

interface ExportButtonsProps {
  rawText: string;
  spans: RedactionSpan[];
  auditLog: AuditLogEntry[];
  documentType: string;
  exportFilename?: string;
}

export function ExportButtons({
  rawText,
  spans,
  auditLog,
  documentType,
  exportFilename = "redacted_document.txt",
}: ExportButtonsProps) {
  const auditFilename = exportFilename.replace(/\.[^.]+$/, "_audit.json");

  const handleDownloadRedacted = () => {
    const redactedText = applyRedactions(rawText, spans);
    downloadFile(redactedText, exportFilename, "text/plain");
  };

  const handleDownloadAudit = () => {
    const auditJSON = buildAuditJSON(spans, auditLog, documentType);
    downloadFile(JSON.stringify(auditJSON, null, 2), auditFilename, "application/json");
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleDownloadRedacted}
        className="w-full bg-[#2a14b4] hover:bg-[#372abf] text-white rounded-lg flex items-center gap-3 px-4 py-3.5 shadow-sm active:scale-[0.98] transition-all text-left"
      >
        <span className="material-symbols-outlined text-[22px] shrink-0">download</span>
        <span className="text-sm font-semibold leading-snug">
          Download Redacted Document (.txt)
        </span>
      </button>
      <button
        type="button"
        onClick={handleDownloadAudit}
        className="w-full border border-[#c7c4d7] bg-white hover:bg-[#e5eeff] text-[#0b1c30] rounded-lg flex items-center gap-3 px-4 py-3.5 active:scale-[0.98] transition-all text-left"
      >
        <span className="material-symbols-outlined text-[22px] shrink-0">summarize</span>
        <span className="text-sm font-semibold leading-snug">
          Download Full Audit Report (.json)
        </span>
      </button>
    </div>
  );
}