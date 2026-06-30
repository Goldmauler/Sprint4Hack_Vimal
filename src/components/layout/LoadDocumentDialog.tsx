"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PRESETS = [
  {
    name: "Legal Settlement Demand",
    desc: "Personal injury demand letter with medical history and policy details.",
    type: "Hybrid",
    filename: "demand-letter.txt",
    text: `DEMAND LETTER

Re: Personal Injury Claim — John Mitchell v. Pacific Coast Insurance Group
Case No. CV-2024-08841

Dear Claims Adjuster,

I am writing on behalf of my client, John Mitchell, regarding the above-referenced personal injury claim arising from a motor vehicle accident that occurred on March 14, 2024, at the intersection of Harbor Boulevard and Westminster Avenue in Garden Grove, California.

LIABILITY

The facts of this case clearly establish that your insured was solely at fault for the collision. On the date in question, your insured ran a red light at a high rate of speed, striking my client's vehicle on the driver's side. The police report, a copy of which is attached hereto as Exhibit A, confirms that your insured was cited for running a red signal and reckless driving. The plaintiff maintains that liability is not in dispute.

INJURIES AND TREATMENT

As a direct and proximate result of the collision, my client sustained significant injuries, including a cervical strain, lumbar disc herniation at L4-L5, and a mild traumatic brain injury. Mr. Mitchell was transported by ambulance to Springfield General Hospital, where he was treated in the emergency department by Dr. Sarah Chen.

Following his discharge, Mr. Mitchell underwent an extensive course of treatment, including physical therapy three times per week for four months, epidural steroid injections, and neurological evaluations. His treating physician, Dr. Sarah Chen, has opined that Mr. Mitchell has reached maximum medical improvement but will likely require ongoing pain management and may be a candidate for surgical intervention in the future. The diagnosis of chronic post-traumatic cervical and lumbar radiculopathy has been confirmed by MRI imaging.

DAMAGES

The following is a summary of the damages incurred by the plaintiff to date:

Medical expenses (Springfield General Hospital, ER visit): $12,340.00
Physical therapy (48 sessions): $9,600.00
Epidural injections (3 procedures): $7,800.00
Neurological evaluations: $3,200.00
Prescription medications: $1,560.00
Future medical care (estimated): $11,250.00
Total medical damages: $45,750.00

In addition to the above medical expenses, my client has suffered significant pain and suffering, emotional distress, and loss of enjoyment of life. Mr. Mitchell was unable to work for approximately three months following the accident, resulting in lost wages of $15,200.00. He continues to experience daily pain and limitations in his activities.

DEMAND

Based upon the foregoing, and taking into account the clear liability of your insured, the severity of the injuries sustained, and the substantial medical expenses incurred, we hereby demand the sum of $150,000.00 to settle this claim in full. This demand is made pursuant to Policy No. AIG-4471-XJ.

Please note that this demand will remain open for thirty (30) days from the date of this letter. If we are unable to reach an amicable resolution within that time frame, the undersigned will have no alternative but to pursue all available legal remedies on behalf of the plaintiff, including the filing of a civil lawsuit.

I have also copied Mr. Mitchell's emergency contact, his brother Robert Mitchell, on this correspondence for the family's records. Should you need to reach our office directly, please call (555) 867-5309.

We look forward to your prompt response.

Sincerely,

Attorney at Law`,
  },
  {
    name: "Confidential NDA",
    desc: "Mutual non-disclosure agreement with SSN, emails, and address fields.",
    type: "Legal",
    filename: "nda.txt",
    text: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into on June 30, 2026, by and between:

Alice Vance, residing at 456 Oak Lane, Seattle, WA 98101 (SSN: 999-12-3456, email: alice.vance@example.com)
and
Bob Smith, residing at 789 Pine Road, Seattle, WA 98102 (SSN: 999-98-7654, email: bob.smith@example.com)

1. PURPOSE
The parties wish to explore a business relationship (the "Purpose"). In connection with the Purpose, each party may disclose to the other party certain proprietary and confidential information.

2. CONFIDENTIAL INFORMATION
"Confidential Information" means any information disclosed by a disclosing party to a receiving party that is marked as confidential or would reasonably be understood to be confidential.

3. CONTACT DETAILS
For emergency questions, please contact the coordinator at (555) 123-4567 or via brother Robert Mitchell.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`,
  },
  {
    name: "Patient Discharge Summary",
    desc: "Clinical summary containing patient details, diagnostics, and doctor's remarks.",
    type: "Medical",
    filename: "discharge-summary.txt",
    text: `SPRINGFIELD HOSPITAL GROUP
PATIENT DISCHARGE SUMMARY

Patient Name: John Mitchell
Date of Birth: October 12, 1985
Admitted: March 14, 2024
Discharged: March 16, 2024
Attending Physician: Dr. Sarah Chen
Emergency Contact: Robert Mitchell (brother), contact number: (555) 867-5309

DIAGNOSIS:
1. Mild traumatic brain injury (TBI) secondary to motor vehicle accident.
2. Acute lumbar spine strain.
3. Cervical radiculopathy.

SUMMARY OF CLINICAL COURSE:
The patient was admitted following a high-speed motor vehicle collision. Head CT was negative for acute intracranial pathology. Neurology consultation was completed by Dr. Sarah Chen. Lumbar spine MRI demonstrated a mild disc bulge at L4-L5. The patient was treated with intravenous analgesics and muscle relaxants.

DISCHARGE MEDICATIONS:
1. Ibuprofen 800mg PO TID PRN pain.
2. Cyclobenzaprine 10mg PO HS.

FOLLOW-UP CARE:
Patient is instructed to follow up with neurology in 7-10 days. Physical therapy is recommended 3 times per week. Should any warning signs arise, contact Springfield General Hospital ER directly.`,
  },
];

interface LoadDocumentDialogProps {
  onLoad: (text: string, filename?: string) => void;
  isProcessing?: boolean;
}

export function LoadDocumentDialog({ onLoad, isProcessing }: LoadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLoad = (text: string, filename?: string) => {
    setError(null);
    onLoad(text, filename);
    setOpen(false);
    setCustomText("");
  };

  const handlePresetSelect = (text: string, filename: string) => {
    handleLoad(text, filename);
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      handleLoad(customText, "custom-document.txt");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string" && text.trim()) {
        handleLoad(text, file.name);
      } else {
        setError("Could not read file content. Please upload a valid .txt or .json file.");
      }
    };
    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <button
        type="button"
        disabled={isProcessing}
        onClick={() => setOpen(true)}
        className="w-full mt-3 h-9 text-xs border border-dashed border-[#c7c4d7] hover:border-[#2a14b4] hover:bg-[#eff4ff] text-[#2a14b4] font-semibold flex items-center justify-center gap-1.5 transition-all rounded-lg cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[16px]">
          {isProcessing ? "hourglass_top" : "upload_file"}
        </span>
        {isProcessing ? "Analyzing..." : "Load / Import Document"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[92vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-[#c7c4d7] p-8">
        <DialogHeader className="pb-4 border-b border-[#c7c4d7]">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-[#0b1c30]">
            <span className="material-symbols-outlined text-[#2a14b4] text-[26px]">description</span>
            Load Document into Logic Engine
          </DialogTitle>
          <p className="text-sm text-[#464554] mt-2 leading-relaxed">
            Upload plain text, annotated JSON, or inline-marked documents. The engine classifies the theme first, then analyzes redactions and flags false positives and missed PII.
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-6">
          <div>
            <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-3">
              Select Preset Document
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset.text, preset.filename)}
                  className="text-left border border-[#c7c4d7] hover:border-[#2a14b4] hover:bg-[#eff4ff] rounded-xl p-5 cursor-pointer transition-all shadow-sm hover:shadow-md group flex flex-col justify-between w-full min-h-[140px]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-bold text-[#0b1c30] group-hover:text-[#2a14b4] leading-tight">
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#e3dfff] text-[#2a14b4] rounded uppercase shrink-0">
                        {preset.type}
                      </span>
                    </div>
                    <p className="text-xs text-[#464554] leading-relaxed">
                      {preset.desc}
                    </p>
                  </div>
                  <span className="text-xs text-[#2a14b4] font-semibold mt-4 inline-flex items-center gap-0.5 group-hover:underline">
                    Load preset
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#c7c4d7]/60"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-[#777586] uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-[#c7c4d7]/60"></div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-2">
                Upload Document (.txt or .json)
              </h3>
              <div className="border border-dashed border-[#c7c4d7] hover:border-[#2a14b4] hover:bg-[#f8f9ff] rounded-xl p-8 text-center cursor-pointer transition-all relative min-h-[140px] flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept=".txt,.json,text/plain,application/json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="material-symbols-outlined text-[#777586] text-[32px] mb-2 block">
                  cloud_upload
                </span>
                <p className="text-sm font-semibold text-[#0b1c30]">
                  Click or drag file here to upload
                </p>
                <p className="text-xs text-[#777586] mt-1">
                  Supports .txt, .json, {"{{PERSON:0.95}}Name{{/}}"}, or bracket markers like {"[[PERSON NAME] John Smith [name]]"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-2">
                Paste Custom Text
              </h3>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste your document content here to run theme classification, redaction analysis, and gap detection..."
                className="w-full border border-[#c7c4d7] rounded-xl p-4 h-40 resize-y focus:outline-none focus:ring-1 focus:ring-[#2a14b4] focus:border-[#2a14b4] bg-[#f8f9ff] text-sm text-[#0b1c30]"
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!customText.trim()}
                  className="bg-[#2a14b4] hover:bg-[#372abf] text-white font-semibold text-xs py-2 px-4 shadow rounded-lg active:scale-95 transition-all"
                >
                  Analyze Text
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-[#ba1a1a] bg-[#ffdad6] px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}