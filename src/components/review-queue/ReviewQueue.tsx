import { RedactionSpan, CorrectionAction } from "@/lib/types";
import { ReviewQueueItem } from "./ReviewQueueItem";
import { LoadDocumentDialog } from "../layout/LoadDocumentDialog";

interface ReviewQueueProps {
  spans: RedactionSpan[];
  activeSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
  onCorrect: (spanId: string, action: CorrectionAction, note?: string) => void;
  onLoadDocument: (text: string) => void;
}

export function ReviewQueue({
  spans,
  activeSpanId,
  onSelectSpan,
  onCorrect,
  onLoadDocument,
}: ReviewQueueProps) {
  const reviewableSpans = spans
    .filter((s) => s.status === "needs-review" || s.status === "missed")
    .sort((a, b) => b.riskScore - a.riskScore);

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

        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#0b1c30]">Review Queue</h3>
          <span className="bg-[#d3e4fe] text-[#464554] px-2 py-0.5 rounded text-xs font-semibold">
            {reviewableSpans.length} Pending
          </span>
        </div>

        <LoadDocumentDialog onLoad={onLoadDocument} />
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {reviewableSpans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-full bg-[#6cf8bb]/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#006c49] text-[32px]">
                check_circle
              </span>
            </div>
            <h4 className="text-sm font-semibold text-[#0b1c30] mb-1">
              All Items Reviewed
            </h4>
            <p className="text-xs text-[#464554]">
              Every flagged item has been reviewed. You can now approve and generate the final document.
            </p>
          </div>
        ) : (
          reviewableSpans.map((span) => (
            <ReviewQueueItem
              key={span.id}
              span={span}
              isActive={activeSpanId === span.id}
              onSelect={onSelectSpan}
              onCorrect={onCorrect}
            />
          ))
        )}
      </div>

      {/* Keyboard shortcuts legend */}
      <div className="p-3 border-t border-[#c7c4d7] bg-[#e5eeff]">
        <p className="text-[10px] text-[#777586] font-semibold uppercase tracking-wider mb-1.5">
          Keyboard Shortcuts
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#464554]">
          <span><kbd className="bg-white px-1 py-0.5 rounded border border-[#c7c4d7] font-mono mr-0.5">K</kbd> Keep</span>
          <span><kbd className="bg-white px-1 py-0.5 rounded border border-[#c7c4d7] font-mono mr-0.5">F</kbd> False Pos.</span>
          <span><kbd className="bg-white px-1 py-0.5 rounded border border-[#c7c4d7] font-mono mr-0.5">Esc</kbd> Close</span>
        </div>
      </div>
    </aside>
  );
}
