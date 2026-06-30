"use client";

import { AppShell } from "@/components/layout/AppShell";

const AUDIT_DATA = [
  { time: "10:42 AM", action: "System Auto-Tag", text: "Acme Corporation", decision: "Redacted", decisionColor: "bg-[#ffdad6] text-[#93000a]", dotColor: "bg-[#ba1a1a]", reason: "PII-ORG", user: "System", userIcon: "smart_toy", userBg: "" },
  { time: "10:38 AM", action: "User Approved", text: "John Doe", decision: "Redacted", decisionColor: "bg-[#ffdad6] text-[#93000a]", dotColor: "bg-[#ba1a1a]", reason: "PII-NAME", user: "Sarah Smith", userIcon: "", userBg: "bg-[#e3dfff]", userInitials: "SS" },
  { time: "10:15 AM", action: "User Modified", text: "Project Apollo", decision: "Kept", decisionColor: "bg-[#6cf8bb] text-[#002113]", dotColor: "bg-[#006c49]", reason: "Manual Override", user: "James Davis", userIcon: "", userBg: "bg-[#ffddb8]", userInitials: "JD" },
  { time: "09:55 AM", action: "System Auto-Tag", text: "555-0198", decision: "Redacted", decisionColor: "bg-[#ffdad6] text-[#93000a]", dotColor: "bg-[#ba1a1a]", reason: "PII-PHONE", user: "System", userIcon: "smart_toy", userBg: "" },
  { time: "09:48 AM", action: "User Approved", text: "Dr. Sarah Chen", decision: "Redacted", decisionColor: "bg-[#ffdad6] text-[#93000a]", dotColor: "bg-[#ba1a1a]", reason: "PII-NAME", user: "Sarah Smith", userIcon: "", userBg: "bg-[#e3dfff]", userInitials: "SS" },
  { time: "09:40 AM", action: "System Auto-Tag", text: "March 14, 2024", decision: "Redacted", decisionColor: "bg-[#ffdad6] text-[#93000a]", dotColor: "bg-[#ba1a1a]", reason: "PII-DATE", user: "System", userIcon: "smart_toy", userBg: "" },
  { time: "09:35 AM", action: "User Rejected", text: "the undersigned", decision: "Kept", decisionColor: "bg-[#6cf8bb] text-[#002113]", dotColor: "bg-[#006c49]", reason: "False Positive", user: "James Davis", userIcon: "", userBg: "bg-[#ffddb8]", userInitials: "JD" },
  { time: "09:30 AM", action: "System Auto-Tag", text: "Robert Mitchell", decision: "Redacted", decisionColor: "bg-[#ffdad6] text-[#93000a]", dotColor: "bg-[#ba1a1a]", reason: "PII-NAME", user: "System", userIcon: "smart_toy", userBg: "" },
];

const STATS = [
  { label: "Total Actions", value: "12,458", color: "text-[#0b1c30]" },
  { label: "Approved", value: "11,204", color: "text-[#006c49]" },
  { label: "Modified", value: "892", color: "text-[#744800]" },
  { label: "Rejected", value: "362", color: "text-[#ba1a1a]" },
];

export default function AuditLogPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-[1440px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Full Audit Log</h1>
            <p className="text-sm text-[#464554] mt-1">
              Review all systematic and manual redaction actions for compliance auditing.
            </p>
          </div>
          <button className="bg-[#2a14b4] hover:bg-[#372abf] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Full Audit
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-semibold text-[#464554] uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#c7c4d7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {["All", "Approved", "Modified", "Rejected"].map((filter, i) => (
              <button
                key={filter}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  i === 0
                    ? "bg-[#2a14b4] text-white"
                    : "border border-[#c7c4d7] text-[#464554] hover:bg-[#eff4ff]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777586] text-[18px]">
              filter_list
            </span>
            <input
              type="text"
              placeholder="Filter by user or code..."
              className="w-full pl-9 pr-4 py-2 bg-[#f8f9ff] border border-[#c7c4d7] rounded-lg text-sm focus:border-[#2a14b4] focus:ring-1 focus:ring-[#2a14b4] outline-none transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-[#c7c4d7] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eff4ff] border-b border-[#c7c4d7]">
                  <th className="p-4 text-[10px] font-semibold text-[#464554] uppercase tracking-wider whitespace-nowrap">Time</th>
                  <th className="p-4 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">Action</th>
                  <th className="p-4 text-[10px] font-semibold text-[#464554] uppercase tracking-wider w-1/5">Original Text</th>
                  <th className="p-4 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">Final Decision</th>
                  <th className="p-4 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">Reason/Code</th>
                  <th className="p-4 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">User</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c7c4d7]/50 text-sm">
                {AUDIT_DATA.map((row, i) => (
                  <tr key={i} className="hover:bg-[#f8f9ff] transition-colors group">
                    <td className="p-4 text-[#464554] whitespace-nowrap font-mono text-xs">{row.time}</td>
                    <td className="p-4 text-[#0b1c30] font-medium">{row.action}</td>
                    <td className="p-4">
                      <div className="font-mono text-xs bg-[#dce9ff] px-2 py-1 rounded inline-block truncate max-w-[200px]">
                        {row.text}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${row.decisionColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.dotColor}`}></span>
                        {row.decision}
                      </span>
                    </td>
                    <td className="p-4 text-[#464554]">{row.reason}</td>
                    <td className="p-4 text-[#464554]">
                      <div className="flex items-center gap-2">
                        {row.userIcon ? (
                          <span className="material-symbols-outlined text-[16px]">{row.userIcon}</span>
                        ) : (
                          <div className={`w-5 h-5 rounded-full ${row.userBg} flex items-center justify-center text-[9px] font-bold text-[#2a14b4]`}>
                            {row.userInitials}
                          </div>
                        )}
                        {row.user}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-[#777586] hover:text-[#2a14b4] transition-colors opacity-0 group-hover:opacity-100">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white border-t border-[#c7c4d7] p-4 flex items-center justify-between">
            <span className="text-sm text-[#464554]">Showing 1 to 8 of 12,458 entries</span>
            <div className="flex items-center gap-2">
              <button className="p-1 rounded hover:bg-[#dce9ff] text-[#464554] disabled:opacity-50" disabled>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded bg-[#e3dfff] text-[#2a14b4] text-xs font-semibold flex items-center justify-center">1</button>
              <button className="w-8 h-8 rounded hover:bg-[#dce9ff] text-[#464554] text-xs flex items-center justify-center">2</button>
              <button className="w-8 h-8 rounded hover:bg-[#dce9ff] text-[#464554] text-xs flex items-center justify-center">3</button>
              <span className="text-[#464554]">...</span>
              <button className="p-1 rounded hover:bg-[#dce9ff] text-[#464554]">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
