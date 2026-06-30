import { useState } from "react";
import { RedactionSpan, CorrectionAction } from "@/lib/types";
import { GroupedReviewItem } from "./GroupedReviewItem";
import { ReviewQueueItem } from "./ReviewQueueItem";
import { LoadDocumentDialog } from "../layout/LoadDocumentDialog";
import { groupReviewableSpans, SpanGroup } from "@/lib/entity-grouper";

interface ReviewQueueProps {
  spans: RedactionSpan[];
  rawText: string;
  activeSpanId: string | null;
  onSelectSpan: (spanId: string | null) => void;
  onCorrect: (spanId: string, action: CorrectionAction, note?: string) => void;
  onBatchCorrect: (group: SpanGroup, action: CorrectionAction) => void;
  onLoadDocument: (text: string, filename?: string) => void;
  isProcessing?: boolean;
  hasDocument?: boolean;
}

export function ReviewQueue({
  spans,
  rawText,
  activeSpanId,
  onSelectSpan,
  onCorrect,
  onBatchCorrect,
  onLoadDocument,
  isProcessing,
  hasDocument = false,
}: ReviewQueueProps) {
  const [grouped, setGrouped] = useState(true);

  const reviewableSpans = spans
    .filter((s) => s.status === "needs-review" || s.status === "missed")
    .sort((a, b) => b.riskScore - a.riskScore);

  const groups = groupReviewableSpans(spans, rawText);
  const multiInstanceGroups = groups.filter((g) => g.spans.length > 1).length;

  return (
    <aside className="w-[300px] xl:w-[320px] bg-[#eff4ff] border-r border-[#c7c4d7] flex flex-col overflow-hidden shrink-0">
      {/* Sidebar header */}
      <div className="p-4 border-b border-[#c7c4d7]">
        <div className="flex items-center gap-2 mb-3 p-2">
          <div className="w-9 h-9 rounded-full bg-[#4338ca] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#c1beff] text-[18px]">gavel</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#0b1c30]">Compliance Team</h2>
            <p className="text-[11px] text-[#464554]">Legal Review Unit</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-[#0b1c30]">Review Queue</h3>
          <span className="bg-[#d3e4fe] text-[#464554] px-2 py-0.5 rounded text-xs font-semibold">
            {reviewableSpans.length} Pending
          </span>
        </div>

        {/* Group toggle */}
        {hasDocument && reviewableSpans.length > 0 && (
          <div className="flex items-center gap-1 mb-2 bg-white border border-[#c7c4d7] rounded-lg p-0.5">
            <button
              onClick={() => setGrouped(true)}
              className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1 rounded-md transition-all ${
                grouped ? "bg-[#4338ca] text-white shadow-sm" : "text-[#464554] hover:bg-[#f0f4ff]"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">layers</span>
              Grouped
              {multiInstanceGroups > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${grouped ? "bg-white/30 text-white" : "bg-[#e3dfff] text-[#2a14b4]"}`}>
                  {multiInstanceGroups}×
                </span>
              )}
            </button>
            <button
              onClick={() => setGrouped(false)}
              className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1 rounded-md transition-all ${
                !grouped ? "bg-[#4338ca] text-white shadow-sm" : "text-[#464554] hover:bg-[#f0f4ff]"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">list</span>
              Individual
            </button>
          </div>
        )}

        {/* Multi-instance hint */}
        {grouped && multiInstanceGroups > 0 && hasDocument && (
          <p className="text-[10px] text-[#2a14b4] bg-[#e3dfff] rounded-lg px-2 py-1.5 leading-snug">
            <span className="font-bold">{multiInstanceGroups} entit{multiInstanceGroups === 1 ? "y" : "ies"}</span> appear multiple times.
            Batch-correct them all at once — or expand to review each instance.
          </p>
        )}

        <LoadDocumentDialog onLoad={onLoadDocument} isProcessing={isProcessing} />
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!hasDocument ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-14 h-14 rounded-full bg-[#e3dfff] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[#2a14b4] text-[28px]">folder_open</span>
            </div>
            <h4 className="text-sm font-semibold text-[#0b1c30] mb-1">No Document Loaded</h4>
            <p className="text-xs text-[#464554]">
              Upload a .txt or .json file to start reviewing redaction suggestions.
            </p>
          </div>
        ) : reviewableSpans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-full bg-[#6cf8bb]/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#006c49] text-[32px]">check_circle</span>
            </div>
            <h4 className="text-sm font-semibold text-[#0b1c30] mb-1">All Items Reviewed</h4>
            <p className="text-xs text-[#464554]">
              Every flagged item has been reviewed. You can now approve and generate the final document.
            </p>
          </div>
        ) : grouped ? (
          groups.map((group) => (
            <GroupedReviewItem
              key={group.id}
              group={group}
              activeSpanId={activeSpanId}
              onSelectSpan={onSelectSpan}
              onBatchCorrect={onBatchCorrect}
            />
          ))
        ) : (
          reviewableSpans.map((span) => (
            <ReviewQueueItem
              key={span.id}
              span={span}
              rawText={rawText}
              isActive={activeSpanId === span.id}
              onSelect={onSelectSpan}
              onCorrect={onCorrect}
            />
          ))
        )}
      </div>

      {/* Keyboard shortcuts */}
      <div className="p-3 border-t border-[#c7c4d7] bg-[#e5eeff]">
        <p className="text-[10px] text-[#777586] font-semibold uppercase tracking-wider mb-1.5">
          Keyboard Shortcuts
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#464554]">
          <span><kbd className="bg-white px-1 py-0.5 rounded border border-[#c7c4d7] font-mono mr-0.5">K</kbd> Keep</span>
          <span><kbd className="bg-white px-1 py-0.5 rounded border border-[#c7c4d7] font-mono mr-0.5">F</kbd> False Pos.</span>
          <span><kbd className="bg-white px-1 py-0.5 rounded border border-[#c7c4d7] font-mono mr-0.5">J</kbd> Next</span>
          <span><kbd className="bg-white px-1 py-0.5 rounded border border-[#c7c4d7] font-mono mr-0.5">Esc</kbd> Close</span>
          <span><kbd className="bg-white px-1 py-0.5 rounded border border-[#c7c4d7] font-mono mr-0.5">Ctrl+Z</kbd> Undo</span>
        </div>
      </div>
    </aside>
  );
}
