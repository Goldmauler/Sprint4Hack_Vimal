"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { RedactionSpan, CorrectionAction } from "@/lib/types";
import { PII_TYPE_LABELS, KEYBOARD_SHORTCUTS } from "@/lib/constants";

interface CorrectionPopoverProps {
  span: RedactionSpan;
  onCorrect: (spanId: string, action: CorrectionAction, note?: string) => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CorrectionPopover({
  span,
  onCorrect,
  children,
  open,
  onOpenChange,
}: CorrectionPopoverProps) {
  const [note, setNote] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const controlledOpen = open !== undefined ? open : isOpen;
  const setControlledOpen = onOpenChange || setIsOpen;

  const handleAction = useCallback(
    (action: CorrectionAction) => {
      onCorrect(span.id, action, note || undefined);
      setNote("");
      setControlledOpen(false);
    },
    [span.id, note, onCorrect, setControlledOpen]
  );

  // Keyboard shortcuts when popover is open
  useEffect(() => {
    if (!controlledOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case KEYBOARD_SHORTCUTS.KEEP:
          e.preventDefault();
          handleAction(span.status === "missed" ? "missed-pii" : "keep");
          break;
        case KEYBOARD_SHORTCUTS.FALSE_POSITIVE:
          e.preventDefault();
          handleAction("false-positive");
          break;
        case "escape":
          e.preventDefault();
          setControlledOpen(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controlledOpen, handleAction, span.status, setControlledOpen]);

  const isReviewable = span.status === "needs-review" || span.status === "missed";
  if (!isReviewable) return <>{children}</>;

  return (
    <Popover open={controlledOpen} onOpenChange={setControlledOpen}>
      <PopoverTrigger nativeButton={false} render={<span className="inline" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 border border-[#c7c4d7] shadow-xl rounded-xl overflow-hidden"
        side="top"
        sideOffset={8}
        align="start"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#eff4ff] border-b border-[#c7c4d7]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#464554] uppercase tracking-wider">
                {PII_TYPE_LABELS[span.type]}
              </p>
              <p className="text-sm font-mono text-[#0b1c30] mt-0.5 truncate max-w-[200px]">
                &quot;{span.text}&quot;
              </p>
            </div>
            {span.status === "missed" && (
              <span className="px-2 py-0.5 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full uppercase">
                Missed
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#777586]">
            <span>Confidence: {span.confidence > 0 ? `${Math.round(span.confidence * 100)}%` : "N/A"}</span>
            <span>Risk: {span.riskScore}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => handleAction(span.status === "missed" ? "missed-pii" : "keep")}
              className="h-9 bg-[#006c49] hover:bg-[#005236] text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] mr-1">check</span>
              {span.status === "missed" ? "Redact" : "Keep Redacted"}
              <kbd className="ml-1.5 text-[10px] opacity-70 bg-white/20 px-1 rounded">K</kbd>
            </Button>
            <Button
              type="button"
              onClick={() => handleAction("false-positive")}
              variant="outline"
              className="h-9 border-[#c7c4d7] text-[#464554] hover:bg-[#ffdad6] hover:text-[#93000a] hover:border-[#ba1a1a] text-xs font-semibold rounded-lg transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] mr-1">close</span>
              False Positive
              <kbd className="ml-1.5 text-[10px] opacity-70 bg-black/5 px-1 rounded">F</kbd>
            </Button>
          </div>

          {/* Note input */}
          <div className="relative">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)..."
              className="w-full text-xs border border-[#c7c4d7] rounded-lg p-2 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#5148d7] focus:border-[#5148d7] bg-white placeholder:text-[#777586]"
            />
            {note && (
              <Button
                onClick={() => handleAction("note-only")}
                variant="ghost"
                size="sm"
                className="absolute bottom-1 right-1 h-6 text-[10px] text-[#2a14b4] hover:bg-[#e3dfff]"
              >
                Save Note Only
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
