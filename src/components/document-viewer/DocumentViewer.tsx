"use client";

import { useMemo } from "react";
import { RedactionSpan, CorrectionAction } from "@/lib/types";
import { SpanHighlight } from "./SpanHighlight";

interface DocumentViewerProps {
  rawText: string;
  spans: RedactionSpan[];
  activeSpanId: string | null;
  onCorrect: (spanId: string, action: CorrectionAction, note?: string) => void;
  onSelectSpan: (spanId: string) => void;
}

interface TextSegment {
  type: "text" | "span";
  content: string;
  span?: RedactionSpan;
}

export function DocumentViewer({
  rawText,
  spans,
  activeSpanId,
  onCorrect,
  onSelectSpan,
}: DocumentViewerProps) {
  // Build segments array: interleave plain text with span highlights
  const segments: TextSegment[] = useMemo(() => {
    const sortedSpans = [...spans].sort((a, b) => a.startOffset - b.startOffset);
    const segs: TextSegment[] = [];
    let lastEnd = 0;

    for (const span of sortedSpans) {
      // Plain text before this span
      if (span.startOffset > lastEnd) {
        segs.push({
          type: "text",
          content: rawText.slice(lastEnd, span.startOffset),
        });
      }

      // The span itself
      segs.push({
        type: "span",
        content: span.text,
        span,
      });

      lastEnd = span.endOffset;
    }

    // Remaining text after last span
    if (lastEnd < rawText.length) {
      segs.push({
        type: "text",
        content: rawText.slice(lastEnd),
      });
    }

    return segs;
  }, [rawText, spans]);

  return (
    <section className="flex-1 overflow-y-auto bg-[#f8f9ff] p-4 lg:p-6">
      <div className="max-w-3xl mx-auto bg-white border border-[#c7c4d7] rounded-xl shadow-sm p-6 lg:p-10 min-h-full">
        {/* Document title */}
        <h1 className="text-lg font-bold text-center text-[#0b1c30] mb-6 pb-4 border-b border-[#c7c4d7] tracking-tight">
          PERSONAL INJURY DEMAND LETTER
        </h1>

        {/* Document body with highlighted spans */}
        <div className="text-[15px] leading-[1.85] text-[#0b1c30] whitespace-pre-wrap font-['Inter'] text-justify">
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return <span key={i}>{seg.content}</span>;
            }

            if (seg.span) {
              return (
                <SpanHighlight
                  key={seg.span.id}
                  span={seg.span}
                  onCorrect={onCorrect}
                  isActive={activeSpanId === seg.span.id}
                  onSelect={onSelectSpan}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
    </section>
  );
}
