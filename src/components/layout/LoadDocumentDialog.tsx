"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PRESETS = [
  {
    name: "Legal Settlement Demand",
    desc: "Personal injury demand letter with medical history and policy details.",
    type: "Hybrid",
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
  onLoad: (text: string) => void;
}

export function LoadDocumentDialog({ onLoad }: LoadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  const handlePresetSelect = (text: string) => {
    onLoad(text);
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      onLoad(customText);
      setCustomText("");
      setOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          onLoad(text);
          setOpen(false);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full mt-3 h-9 text-xs border border-dashed border-[#c7c4d7] hover:border-[#2a14b4] hover:bg-[#eff4ff] text-[#2a14b4] font-semibold flex items-center justify-center gap-1.5 transition-all rounded-lg cursor-pointer bg-white">
        <span className="material-symbols-outlined text-[16px]">upload_file</span>
        Load / Import Document
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-[#c7c4d7]">
        <DialogHeader className="pb-2 border-b border-[#c7c4d7]">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#0b1c30]">
            <span className="material-symbols-outlined text-[#2a14b4]">description</span>
            Load Document into Logic Engine
          </DialogTitle>
        </DialogHeader>

        {/* Presets */}
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-2.5">
              Select Preset Document
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset.text)}
                  className="border border-[#c7c4d7] hover:border-[#2a14b4] hover:bg-[#eff4ff] rounded-xl p-4 cursor-pointer transition-all shadow-sm hover:shadow group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#0b1c30] group-hover:text-[#2a14b4] truncate max-w-[120px]">
                        {preset.name}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#e3dfff] text-[#2a14b4] rounded uppercase">
                        {preset.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#464554] leading-relaxed line-clamp-3">
                      {preset.desc}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#2a14b4] font-semibold mt-3 inline-flex items-center gap-0.5 group-hover:underline">
                    Load preset
                    <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#c7c4d7]/60"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-[#777586] uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-[#c7c4d7]/60"></div>
          </div>

          {/* Upload and Paste */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-2">
                Upload Document File (.txt)
              </h3>
              <div className="border border-dashed border-[#c7c4d7] hover:border-[#2a14b4] hover:bg-[#f8f9ff] rounded-xl p-6 text-center cursor-pointer transition-all relative">
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="material-symbols-outlined text-[#777586] text-[32px] mb-2 block">
                  cloud_upload
                </span>
                <p className="text-sm font-semibold text-[#0b1c30]">
                  Click or drag file here to upload
                </p>
                <p className="text-xs text-[#777586] mt-1">Plain text (.txt) files only</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#464554] uppercase tracking-wider mb-2">
                Paste Custom Text
              </h3>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste your document content here to run PII redaction detection..."
                className="w-full border border-[#c7c4d7] rounded-xl p-3 h-36 resize-none focus:outline-none focus:ring-1 focus:ring-[#2a14b4] focus:border-[#2a14b4] bg-[#f8f9ff] text-sm text-[#0b1c30]"
              />
              <div className="flex justify-end mt-2">
                <Button
                  onClick={handleCustomSubmit}
                  disabled={!customText.trim()}
                  className="bg-[#2a14b4] hover:bg-[#372abf] text-white font-semibold text-xs py-2 px-4 shadow rounded-lg active:scale-95 transition-all"
                >
                  Analyze Text
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
