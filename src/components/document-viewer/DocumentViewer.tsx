"use client";

import { useMemo } from "react";
import { RedactionSpan } from "@/lib/types";
import { SpanHighlight } from "./SpanHighlight";

interface DocumentViewerProps {
  rawText: string;
  spans: RedactionSpan[];
  activeSpanId: string | null;
  onSelectSpan: (spanId: string | null) => void;
  documentTitle?: string;
  isProcessing?: boolean;
  isLlmRefining?: boolean;
  processingMessage?: string;
  classificationType?: string;
  llmFallbackReason?: string;
  usedLlm?: boolean;
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
  onSelectSpan,
  documentTitle = "Document",
  isProcessing = false,
  isLlmRefining = false,
  processingMessage,
  classificationType,
  llmFallbackReason,
  usedLlm,
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

  if (isProcessing) {
    return (
      <section className="flex-1 overflow-y-auto bg-[#f8f9ff] p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-[#e3dfff] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="material-symbols-outlined text-[#2a14b4] text-[32px]">psychology</span>
          </div>
          <h3 className="text-sm font-semibold text-[#0b1c30] mb-1">Analyzing Document</h3>
          <p className="text-xs text-[#464554]">Classifying theme → checking redactions → detecting gaps...</p>
        </div>
      </section>
    );
  }

  if (!rawText.trim()) {
    return (
      <section className="flex-1 overflow-y-auto bg-[#f8f9ff] p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 rounded-full bg-[#e3dfff] flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[#2a14b4] text-[40px]">upload_file</span>
          </div>
          <h3 className="text-lg font-semibold text-[#0b1c30] mb-2">Upload a Document to Begin</h3>
          <p className="text-sm text-[#464554] leading-relaxed">
            Use <strong>Load / Import Document</strong> in the left sidebar to upload a{" "}
            <code className="text-xs bg-[#e5eeff] px-1 py-0.5 rounded">.txt</code> or{" "}
            <code className="text-xs bg-[#e5eeff] px-1 py-0.5 rounded">.json</code> file.
            The app will classify the theme, detect redactions, and flag missed PII for your review.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto bg-[#f8f9ff] p-4 lg:p-6">
      <div className="max-w-3xl mx-auto bg-white border border-[#c7c4d7] rounded-xl shadow-sm p-6 lg:p-10 min-h-full">
        {isLlmRefining && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#c3c0ff] bg-[#e3dfff] px-3 py-2 text-xs text-[#2a14b4]">
            <span className="material-symbols-outlined text-[16px] animate-pulse">psychology</span>
            <span>{processingMessage || "AI scanning for PII — low-confidence items will need your review..."}</span>
          </div>
        )}
        {!isLlmRefining && llmFallbackReason && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#c3c0ff]/60 bg-[#eff4ff] px-3 py-2 text-xs text-[#2a14b4]">
            <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5 text-[#2a14b4]">offline_bolt</span>
            <span>{llmFallbackReason}</span>
          </div>
        )}
        {!isLlmRefining && !llmFallbackReason && usedLlm && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#6cf8bb]/60 bg-[#f0fff8] px-3 py-2 text-xs text-[#004d30]">
            <span className="material-symbols-outlined text-[16px] text-[#006c49]">verified</span>
            <span>AI-assisted detection active — low-confidence items are queued for your review.</span>
          </div>
        )}
        <h1 className="text-lg font-bold text-center text-[#0b1c30] mb-2 tracking-tight uppercase">
          {documentTitle}
        </h1>
        {classificationType && (
          <p className="text-center text-[10px] text-[#777586] uppercase tracking-wider mb-6 pb-4 border-b border-[#c7c4d7]">
            Theme: {classificationType} · {spans.filter((s) => s.status === "needs-review" || s.status === "missed").length} suspicious · click any █ block to reveal or change
          </p>
        )}

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
