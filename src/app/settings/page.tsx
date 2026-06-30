"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-[1440px] mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#0b1c30] tracking-tight">Settings</h1>
          <p className="text-sm text-[#464554] mt-1">
            Configure your redaction review preferences, detection rules, and workspace settings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Navigation */}
          <nav className="lg:col-span-3">
            <div className="bg-white border border-[#c7c4d7] rounded-xl shadow-sm overflow-hidden">
              {[
                { label: "General", icon: "settings", active: true },
                { label: "Detection Rules", icon: "rule", active: false },
                { label: "Privacy & Compliance", icon: "security", active: false },
                { label: "Notifications", icon: "notifications", active: false },
                { label: "Team & Permissions", icon: "group", active: false },
                { label: "API Keys", icon: "key", active: false },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-[#c7c4d7]/50 last:border-b-0 ${
                    item.active
                      ? "bg-[#e3dfff] text-[#2a14b4] font-semibold"
                      : "text-[#464554] hover:bg-[#f8f9ff]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Settings Content */}
          <div className="lg:col-span-9 space-y-6">
            {/* General Settings */}
            <div className="bg-white border border-[#c7c4d7] rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#0b1c30] mb-4">General Settings</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-[#0b1c30] mb-1.5 block">Workspace Name</label>
                  <input
                    type="text"
                    defaultValue="Legal Review Alpha"
                    className="w-full px-3 py-2 border border-[#c7c4d7] rounded-lg text-sm focus:border-[#2a14b4] focus:ring-1 focus:ring-[#2a14b4] outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0b1c30] mb-1.5 block">Default Document Type</label>
                  <select className="w-full px-3 py-2 border border-[#c7c4d7] rounded-lg text-sm focus:border-[#2a14b4] focus:ring-1 focus:ring-[#2a14b4] outline-none bg-white">
                    <option>Auto-Detect</option>
                    <option>Legal</option>
                    <option>Medical</option>
                    <option>Hybrid</option>
                    <option>General</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0b1c30] mb-1.5 block">Auto-Trust Confidence Threshold</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="50"
                      max="99"
                      defaultValue="85"
                      className="flex-1 accent-[#2a14b4]"
                    />
                    <span className="text-sm font-mono text-[#0b1c30] bg-[#e5eeff] px-2 py-1 rounded border border-[#c7c4d7] w-14 text-center">85%</span>
                  </div>
                  <p className="text-xs text-[#777586] mt-1">
                    Spans above this confidence will be auto-trusted and not shown in the review queue.
                  </p>
                </div>
              </div>
            </div>

            {/* Detection Rules */}
            <div className="bg-white border border-[#c7c4d7] rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#0b1c30] mb-4">Detection Rules</h2>
              <div className="space-y-4">
                {[
                  { label: "Enable Gap Detection", desc: "Scan for PII patterns missed by the initial suggestion engine", checked: true },
                  { label: "LLM Fallback Classification", desc: "Use LLM when keyword classifier confidence is low", checked: false },
                  { label: "Require Reviewer Notes", desc: "Force reviewers to add a note for every false positive decision", checked: false },
                  { label: "Block Approve on Unreviewed Items", desc: "Prevent approval until all flagged items have been reviewed", checked: true },
                ].map((rule) => (
                  <div key={rule.label} className="flex items-start justify-between py-3 border-b border-[#c7c4d7]/50 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-[#0b1c30]">{rule.label}</p>
                      <p className="text-xs text-[#777586] mt-0.5">{rule.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input type="checkbox" defaultChecked={rule.checked} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[#c7c4d7] peer-focus:ring-2 peer-focus:ring-[#5148d7] rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#2a14b4] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end gap-3">
              <button className="px-5 py-2 rounded-lg border border-[#c7c4d7] text-sm text-[#464554] hover:bg-[#e5eeff] transition-colors">
                Cancel
              </button>
              <button className="px-5 py-2 rounded-lg bg-[#2a14b4] hover:bg-[#372abf] text-white text-sm font-semibold transition-colors shadow-sm">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
