"use client";

import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

export default function ArchivesPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-[1440px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Archives</h1>
            <p className="text-sm text-[#464554] mt-1">
              View and download previously redacted documents and audit reports.
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Document Summary + Actions (Left) */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white border border-[#c7c4d7] rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#0b1c30]">Document Summary</h2>
                <span className="bg-[#dce9ff] text-[#464554] px-2 py-0.5 rounded text-xs font-semibold border border-[#c7c4d7]">
                  Legal Contract
                </span>
              </div>
              <div className="space-y-0">
                {[
                  { label: "Total Issues Found", value: "12", color: "text-[#0b1c30]" },
                  { label: "Corrections Made", value: "5", color: "text-[#006c49]" },
                  { label: "Items Approved", value: "7", color: "text-[#2a14b4]" },
                  { label: "Redaction Confidence", value: "99.8%", color: "text-[#0b1c30]" },
                ].map((item, i, arr) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between py-3 ${
                      i < arr.length - 1 ? "border-b border-[#c7c4d7]/50" : ""
                    }`}
                  >
                    <span className="text-sm text-[#464554]">{item.label}</span>
                    <span className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#c7c4d7] rounded-xl p-6 shadow-sm">
              <h3 className="text-[10px] font-semibold text-[#464554] uppercase tracking-wider mb-3">
                Export Actions
              </h3>
              <div className="flex flex-col gap-3">
                <button className="w-full bg-[#2a14b4] hover:bg-[#372abf] text-white py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium shadow-sm active:scale-[0.98] transition-all">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  Download Redacted Document (.txt)
                </button>
                <button className="w-full bg-white border border-[#c7c4d7] text-[#0b1c30] py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#e5eeff] active:scale-[0.98] transition-all">
                  <span className="material-symbols-outlined text-[20px]">summarize</span>
                  Download Full Audit Report (.json)
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-[#c7c4d7]/50 text-center">
                <Link href="/" className="text-[#2a14b4] text-sm font-medium hover:underline inline-flex items-center gap-1">
                  Start New Review
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Document Preview (Right) */}
          <section className="lg:col-span-8">
            <div className="bg-white border border-[#c7c4d7] rounded-xl shadow-sm flex flex-col min-h-[700px]">
              {/* Preview Header */}
              <div className="border-b border-[#c7c4d7] p-4 flex items-center justify-between bg-[#f8f9ff] rounded-t-xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#777586]">description</span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0b1c30]">NDA_Corp_V3_FINAL_REDACTED.txt</h3>
                    <p className="text-[10px] text-[#464554]">Generated on Oct 24, 2023 at 14:32</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 text-[#777586] hover:bg-[#e5eeff] rounded transition-colors" title="Zoom Out">
                    <span className="material-symbols-outlined text-[20px]">zoom_out</span>
                  </button>
                  <button className="p-2 text-[#777586] hover:bg-[#e5eeff] rounded transition-colors" title="Zoom In">
                    <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                  </button>
                </div>
              </div>

              {/* Redacted Document Content */}
              <div className="p-8 font-mono text-xs text-[#0b1c30] leading-relaxed whitespace-pre-wrap max-w-[800px] mx-auto bg-white" style={{ minHeight: "600px" }}>
{`CONFIDENTIALITY AGREEMENT

This Confidentiality Agreement (the "Agreement") is entered into as of `}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[██████████]</span>{` (the "Effective Date"), by and between:

`}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[██████████████████████]</span>{`, a corporation organized under the laws of `}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[████████]</span>{`, having its principal place of business at `}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[██████████████████████████████████████]</span>{` ("Disclosing Party"),

and

LexRedact Systems Inc., a corporation organized under the laws of Delaware, having its principal place of business at 123 Tech Blvd, San Francisco, CA ("Receiving Party").

1. DEFINITION OF CONFIDENTIAL INFORMATION
For purposes of this Agreement, "Confidential Information" shall include all information or material that has or could have commercial value or other utility in the business in which Disclosing Party is engaged.

2. EXCLUSIONS FROM CONFIDENTIAL INFORMATION
Receiving Party's obligations under this Agreement do not extend to information that is: (a) publicly known at the time of disclosure or subsequently becomes publicly known through no fault of the Receiving Party.

3. OBLIGATIONS OF RECEIVING PARTY
Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party.

Point of Contact for Disclosing Party:
Name: `}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[████████████]</span>{`
Email: `}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[███████████████████]</span>{`
Phone: `}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[█████████████]</span>{`
SSN/Tax ID: `}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[███████████]</span>{`

4. TIME PERIODS
The nondisclosure provisions of this Agreement shall survive the termination of this Agreement.

IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the Effective Date.

DISCLOSING PARTY:
By: ___________________________
Title: `}<span className="bg-[#0b1c30] text-[#0b1c30] rounded-sm px-1 select-none">[████████████]</span>{`

RECEIVING PARTY:
By: ___________________________
Title: Chief Security Officer`}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
