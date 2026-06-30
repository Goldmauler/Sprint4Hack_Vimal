import { PIIType, RedactionSpan, CorrectionAction } from "./types";

export interface SpanGroup {
  id: string;
  normalizedText: string;
  displayText: string;
  type: PIIType;
  spans: RedactionSpan[];
  maxRiskScore: number;
  allMissed: boolean;
  hasMixed: boolean; // group has both missed and needs-review spans
  contextSnippets: string[]; // surrounding text per span
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractContext(rawText: string, span: RedactionSpan, radius = 55): string {
  const before = rawText.slice(Math.max(0, span.startOffset - radius), span.startOffset);
  const after = rawText.slice(span.endOffset, Math.min(rawText.length, span.endOffset + radius));

  const trimBefore = before.replace(/^[^\s]*\s/, ""); // trim first partial word
  const trimAfter = after.replace(/\s[^\s]*$/, ""); // trim last partial word

  return (
    (before.length < radius ? "" : "…") +
    trimBefore +
    `«${span.text}»` +
    trimAfter +
    (after.length < radius ? "" : "…")
  );
}

export function groupReviewableSpans(
  spans: RedactionSpan[],
  rawText: string
): SpanGroup[] {
  const reviewable = spans.filter(
    (s) => s.status === "needs-review" || s.status === "missed"
  );

  const buckets = new Map<string, RedactionSpan[]>();

  for (const span of reviewable) {
    const key = `${normalize(span.text)}::${span.type}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(span);
  }

  const groups: SpanGroup[] = [];

  for (const [key, groupSpans] of buckets.entries()) {
    const allMissed = groupSpans.every((s) => s.status === "missed");
    const anyMissed = groupSpans.some((s) => s.status === "missed");

    groups.push({
      id: key,
      normalizedText: normalize(groupSpans[0].text),
      displayText: groupSpans[0].text,
      type: groupSpans[0].type,
      spans: groupSpans,
      maxRiskScore: Math.max(...groupSpans.map((s) => s.riskScore)),
      allMissed,
      hasMixed: anyMissed && !allMissed,
      contextSnippets: groupSpans.map((s) =>
        rawText ? extractContext(rawText, s) : `"${s.text}"`
      ),
    });
  }

  return groups.sort((a, b) => b.maxRiskScore - a.maxRiskScore);
}

export function batchAction(group: SpanGroup): {
  keepAction: CorrectionAction;
  rejectAction: CorrectionAction;
} {
  return {
    keepAction: group.allMissed ? "missed-pii" : "keep",
    rejectAction: "false-positive",
  };
}
