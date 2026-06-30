"use client";

import { AuditLogEntry } from "@/lib/types";
import { AuditLogItem } from "./AuditLogItem";

interface AuditSidebarProps {
  auditLog: AuditLogEntry[];
}

export function AuditSidebar({ auditLog }: AuditSidebarProps) {
  return (
    <aside className="w-[280px] xl:w-[300px] bg-[#eff4ff] border-l border-[#c7c4d7] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-[#c7c4d7]">
        <h3 className="text-base font-semibold text-[#0b1c30]">Audit Timeline</h3>
        <p className="text-[11px] text-[#464554] mt-0.5">
          {auditLog.length} action{auditLog.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {auditLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[#e5eeff] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[#777586] text-[24px]">
                history
              </span>
            </div>
            <h4 className="text-sm font-semibold text-[#0b1c30] mb-1">
              No Actions Yet
            </h4>
            <p className="text-xs text-[#464554]">
              Your review decisions will appear here in real-time as you triage items from the queue.
            </p>
          </div>
        ) : (
          <div className="ml-3 pl-4 border-l-2 border-[#c7c4d7] space-y-5">
            {/* System auto-tag entry (always shown first) */}
            <div className="relative timeline-item">
              <div className="absolute -left-[21px] top-1 w-[10px] h-[10px] rounded-full border-2 border-white bg-[#c7c4d7]" />
              <div className="flex justify-between items-start mb-0.5">
                <span className="flex items-center gap-1 text-xs font-semibold text-[#2a14b4]">
                  <span className="material-symbols-outlined text-[14px]">done_all</span>
                  System Auto-Tag
                </span>
                <span className="text-[10px] text-[#777586] font-mono">Initial</span>
              </div>
              <p className="text-xs text-[#464554]">
                Scan completed. Found 12 potential PII entities across the document.
              </p>
            </div>

            {/* User actions */}
            {auditLog.map((entry) => (
              <AuditLogItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
