"use client";

import { AuditLogEntry } from "@/lib/types";
import { PII_TYPE_LABELS } from "@/lib/constants";

interface AuditLogItemProps {
  entry: AuditLogEntry;
}

function getActionIcon(action: string) {
  switch (action) {
    case "keep":
    case "missed-pii":
      return { icon: "check_circle", color: "text-[#006c49]", bg: "bg-[#6cf8bb]" };
    case "false-positive":
      return { icon: "cancel", color: "text-[#ba1a1a]", bg: "bg-[#ffdad6]" };
    case "note-only":
      return { icon: "edit_note", color: "text-[#5148d7]", bg: "bg-[#e3dfff]" };
    default:
      return { icon: "info", color: "text-[#464554]", bg: "bg-[#e5eeff]" };
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case "keep":
      return "Confirmed Redaction";
    case "missed-pii":
      return "Missed PII → Redacted";
    case "false-positive":
      return "Marked False Positive";
    case "note-only":
      return "Note Added";
    default:
      return action;
  }
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function AuditLogItem({ entry }: AuditLogItemProps) {
  const { icon, color, bg } = getActionIcon(entry.action);

  return (
    <div className="relative timeline-item">
      {/* Timeline node */}
      <div className={`absolute -left-[21px] top-1 w-[10px] h-[10px] rounded-full border-2 border-white ${bg}`} />

      <div className="flex justify-between items-start mb-0.5">
        <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
          <span className="material-symbols-outlined text-[14px]">{icon}</span>
          {getActionLabel(entry.action)}
        </span>
        <span className="text-[10px] text-[#777586] font-mono whitespace-nowrap">
          {formatTimestamp(entry.timestamp)}
        </span>
      </div>
      <p className="text-xs text-[#464554]">
        <span className="font-mono bg-[#f8f9ff] px-1 py-0.5 border border-[#c7c4d7] rounded text-[10px]">
          {PII_TYPE_LABELS[entry.piiType]}
        </span>
        <span className="mx-1">—</span>
        <span className="italic">&quot;{entry.spanText}&quot;</span>
      </p>
      {entry.note && (
        <p className="text-[10px] text-[#777586] mt-0.5 italic">
          Note: {entry.note}
        </p>
      )}
    </div>
  );
}
