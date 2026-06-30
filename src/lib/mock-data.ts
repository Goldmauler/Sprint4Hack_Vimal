import { RedactionSpan } from "./types";

// ~550-word personal-injury demand letter — naturally hybrid
// (legal frame + medical content)
export const MOCK_DOCUMENT_TEXT = `DEMAND LETTER

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

Attorney at Law
Enclosures: Exhibit A (Police Report), Exhibit B (Medical Records), Exhibit C (Billing Statements)`;

// 12 seed spans with carefully designed offsets
export const MOCK_SPANS: RedactionSpan[] = [
  // ── AUTO-TRUSTED (5 spans) ──────────────────────────────────
  {
    id: "span-1",
    text: "John Mitchell",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("John Mitchell"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("John Mitchell") + "John Mitchell".length,
    type: "PERSON",
    confidence: 0.95,
    riskScore: 0,    // computed by risk-rules
    status: "auto-trusted",
    isOriginalSuggestion: true,
  },
  {
    id: "span-2",
    text: "CV-2024-08841",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("CV-2024-08841"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("CV-2024-08841") + "CV-2024-08841".length,
    type: "CASE_NUMBER",
    confidence: 0.91,
    riskScore: 0,
    status: "auto-trusted",
    isOriginalSuggestion: true,
  },
  {
    id: "span-3",
    text: "AIG-4471-XJ",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("AIG-4471-XJ"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("AIG-4471-XJ") + "AIG-4471-XJ".length,
    type: "FINANCIAL_ID",
    confidence: 0.93,
    riskScore: 0,
    status: "auto-trusted",
    isOriginalSuggestion: true,
  },
  {
    id: "span-4",
    text: "$45,750.00",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("$45,750.00"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("$45,750.00") + "$45,750.00".length,
    type: "FINANCIAL",
    confidence: 0.88,
    riskScore: 0,
    status: "auto-trusted",
    isOriginalSuggestion: true,
  },
  {
    id: "span-5",
    text: "March 14, 2024",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("March 14, 2024"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("March 14, 2024") + "March 14, 2024".length,
    type: "DATE",
    confidence: 0.79,
    riskScore: 0,
    status: "auto-trusted",
    isOriginalSuggestion: true,
  },

  // ── NEEDS-REVIEW (4 spans) ──────────────────────────────────
  {
    id: "span-6",
    text: "Springfield General Hospital",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("Springfield General Hospital"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("Springfield General Hospital") + "Springfield General Hospital".length,
    type: "ORGANIZATION",
    confidence: 0.62,
    riskScore: 0,
    status: "needs-review",
    isOriginalSuggestion: true,
  },
  {
    id: "span-7",
    text: "the undersigned",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("the undersigned"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("the undersigned") + "the undersigned".length,
    type: "OTHER",
    confidence: 0.55,
    riskScore: 0,
    status: "needs-review",
    isOriginalSuggestion: true,
  },
  {
    id: "span-8",
    text: "Exhibit C",
    startOffset: MOCK_DOCUMENT_TEXT.lastIndexOf("Exhibit C"),
    endOffset: MOCK_DOCUMENT_TEXT.lastIndexOf("Exhibit C") + "Exhibit C".length,
    type: "OTHER",
    confidence: 0.51,
    riskScore: 0,
    status: "needs-review",
    isOriginalSuggestion: true,
  },
  {
    id: "span-9",
    text: "the plaintiff",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("the plaintiff"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("the plaintiff") + "the plaintiff".length,
    type: "OTHER",
    confidence: 0.48,
    riskScore: 0,
    status: "needs-review",
    isOriginalSuggestion: true,
  },

  // ── MISSED / GAP-DETECTED (3 spans) ────────────────────────
  {
    id: "span-10",
    text: "Dr. Sarah Chen",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("Dr. Sarah Chen"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("Dr. Sarah Chen") + "Dr. Sarah Chen".length,
    type: "PERSON",
    confidence: 0,
    riskScore: 0,
    status: "missed",
    isOriginalSuggestion: false,
  },
  {
    id: "span-11",
    text: "(555) 867-5309",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("(555) 867-5309"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("(555) 867-5309") + "(555) 867-5309".length,
    type: "PHONE",
    confidence: 0,
    riskScore: 0,
    status: "missed",
    isOriginalSuggestion: false,
  },
  {
    id: "span-12",
    text: "Robert Mitchell",
    startOffset: MOCK_DOCUMENT_TEXT.indexOf("Robert Mitchell"),
    endOffset: MOCK_DOCUMENT_TEXT.indexOf("Robert Mitchell") + "Robert Mitchell".length,
    type: "PERSON",
    confidence: 0,
    riskScore: 0,
    status: "missed",
    isOriginalSuggestion: false,
  },
];
