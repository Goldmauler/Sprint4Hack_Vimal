"use client";

import { Button } from "@/components/ui/button";
import { RedactionSpan, AuditLogEntry } from "@/lib/types";
import { applyRedactions, buildAuditJSON, downloadFile } from "@/lib/redaction-utils";

interface ExportButtonsProps {
  rawText: string;
  spans: RedactionSpan[];
  auditLog: AuditLogEntry[];
  documentType: string;
}

export function ExportButtons({ rawText, spans, auditLog, documentType }: ExportButtonsProps) {
  const handleDownloadRedacted = () => {
    const redactedText = applyRedactions(rawText, spans);
    downloadFile(redactedText, "redacted_document.txt", "text/plain");
  };

  const handleDownloadAudit = () => {
    const auditJSON = buildAuditJSON(spans, auditLog, documentType);
    downloadFile(JSON.stringify(auditJSON, null, 2), "audit_report.json", "application/json");
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={handleDownloadRedacted}
        className="w-full bg-[#2a14b4] hover:bg-[#372abf] text-white py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">download</span>
        Download Redacted Document (.txt)
      </Button>
      <Button
        onClick={handleDownloadAudit}
        variant="outline"
        className="w-full border-[#c7c4d7] text-[#0b1c30] py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#e5eeff] active:scale-[0.98] transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">summarize</span>
        Download Full Audit Report (.json)
      </Button>
    </div>
  );
}
