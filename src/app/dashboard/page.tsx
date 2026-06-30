"use client";

import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

const STATS = [
  { label: "TOTAL DOCUMENTS", value: "47", color: "text-[#0b1c30]", icon: "description" },
  { label: "PENDING REVIEW", value: "6", color: "text-[#744800]", icon: "pending_actions" },
  { label: "COMPLETED", value: "38", color: "text-[#006c49]", icon: "check_circle" },
  { label: "FLAGGED ITEMS", value: "23", color: "text-[#ba1a1a]", icon: "warning" },
];

const RECENT_DOCS = [
  {
    name: "NDA_Corp_V3.docx",
    type: "Legal Contract",
    status: "In Review",
    statusColor: "bg-[#ffddb8] text-[#553300]",
    risk: "Medium",
    date: "Jun 30, 2026",
  },
  {
    name: "Patient_Record_JM.pdf",
    type: "Medical Record",
    status: "Completed",
    statusColor: "bg-[#6cf8bb] text-[#002113]",
    risk: "High",
    date: "Jun 29, 2026",
  },
  {
    name: "Insurance_Claim_4471.docx",
    type: "Legal / Financial",
    status: "Completed",
    statusColor: "bg-[#6cf8bb] text-[#002113]",
    risk: "Low",
    date: "Jun 28, 2026",
  },
  {
    name: "Demand_Letter_Mitchell.txt",
    type: "Hybrid",
    status: "Active",
    statusColor: "bg-[#e3dfff] text-[#2a14b4]",
    risk: "High",
    date: "Jun 28, 2026",
  },
  {
    name: "Employment_Agreement.pdf",
    type: "Legal Contract",
    status: "Pending",
    statusColor: "bg-[#ffddb8] text-[#553300]",
    risk: "Medium",
    date: "Jun 27, 2026",
  },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-[1440px] mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Dashboard</h1>
            <p className="text-sm text-[#464554] mt-1">
              Overview of your redaction review activity and document pipeline.
            </p>
          </div>
          <Link
            href="/"
            className="bg-[#2a14b4] hover:bg-[#372abf] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Redaction Review
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-[#c7c4d7] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-[#464554] uppercase tracking-wider">
                  {stat.label}
                </p>
                <span className="material-symbols-outlined text-[20px] text-[#777586]">
                  {stat.icon}
                </span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Documents */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-[#c7c4d7] rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#c7c4d7] flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#0b1c30]">Recent Documents</h2>
                <Link href="/documents" className="text-xs text-[#2a14b4] font-semibold hover:underline">
                  View All →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#eff4ff] border-b border-[#c7c4d7]">
                      <th className="px-5 py-3 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">Document</th>
                      <th className="px-5 py-3 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">Type</th>
                      <th className="px-5 py-3 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">Risk</th>
                      <th className="px-5 py-3 text-[10px] font-semibold text-[#464554] uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c7c4d7]/50">
                    {RECENT_DOCS.map((doc, i) => (
                      <tr key={i} className="hover:bg-[#f8f9ff] transition-colors group cursor-pointer">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-[#777586]">description</span>
                            <span className="text-sm font-medium text-[#0b1c30]">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#464554]">{doc.type}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${doc.statusColor}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#464554]">{doc.risk}</td>
                        <td className="px-5 py-3.5 text-xs text-[#777586] font-mono">{doc.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-[#c7c4d7] rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-[#0b1c30] mb-4">Recent Activity</h2>
              <div className="space-y-4 ml-2 pl-4 border-l-2 border-[#c7c4d7]">
                {[
                  { action: "Completed review", doc: "Insurance_Claim_4471.docx", time: "2h ago", icon: "check_circle", iconColor: "text-[#006c49]" },
                  { action: "Flagged 3 missed PII", doc: "NDA_Corp_V3.docx", time: "4h ago", icon: "warning", iconColor: "text-[#ba1a1a]" },
                  { action: "Started review", doc: "Demand_Letter_Mitchell.txt", time: "5h ago", icon: "play_circle", iconColor: "text-[#2a14b4]" },
                  { action: "Exported audit report", doc: "Patient_Record_JM.pdf", time: "1d ago", icon: "download", iconColor: "text-[#5148d7]" },
                  { action: "Approved document", doc: "Settlement_Brief.pdf", time: "2d ago", icon: "verified", iconColor: "text-[#006c49]" },
                ].map((activity, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-[10px] h-[10px] rounded-full bg-[#c7c4d7] border-2 border-white" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[#0b1c30] flex items-center gap-1">
                          <span className={`material-symbols-outlined text-[14px] ${activity.iconColor}`}>{activity.icon}</span>
                          {activity.action}
                        </p>
                        <p className="text-[11px] text-[#464554] mt-0.5">{activity.doc}</p>
                      </div>
                      <span className="text-[10px] text-[#777586] font-mono whitespace-nowrap">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
