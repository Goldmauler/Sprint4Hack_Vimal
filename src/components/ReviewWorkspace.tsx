"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useReviewState } from "@/hooks/useReviewState";
import { AppHeader } from "@/components/layout/AppHeader";
import { ReviewQueue } from "@/components/review-queue/ReviewQueue";
import { DocumentViewer } from "@/components/document-viewer/DocumentViewer";
import { AuditSidebar } from "@/components/audit-log/AuditSidebar";
import { FinalDocumentDialog } from "@/components/final-output/FinalDocumentDialog";
import { CorrectionPanel } from "@/components/correction/CorrectionPanel";
import { CorrectionAction } from "@/lib/types";
import { SpanGroup } from "@/lib/entity-grouper";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

export function ReviewWorkspace() {
  const [mounted, setMounted] = useState(false);
  const {
    state,
    setDocumentType,
    applyCorrection,
    undoLastCorrection,
    approve,
    reset,
    loadDocument,
    reviewedCount,
    totalReviewable,
    canApprove,
    canUndo,
    reviewableSpans,
    hasDocument,
  } = useReviewState();

  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);
  const [showFinalDialog, setShowFinalDialog] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeSpan = useMemo(
    () => state.spans.find((s) => s.id === activeSpanId) ?? null,
    [state.spans, activeSpanId]
  );

  const handleSelectSpan = useCallback((spanId: string | null) => {
    setActiveSpanId(spanId);

    if (spanId) {
      setTimeout(() => {
        const el = document.querySelector(`[data-span-id="${spanId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, []);

  const handleCorrect = useCallback(
    (spanId: string, action: CorrectionAction, note?: string) => {
      applyCorrection(spanId, action, note);
      setActiveSpanId(null);
    },
    [applyCorrection]
  );

  const handleBatchCorrect = useCallback(
    (group: SpanGroup, action: CorrectionAction) => {
      for (const span of group.spans) {
        applyCorrection(span.id, action);
      }
      setActiveSpanId(null);
    },
    [applyCorrection]
  );

  const handleApprove = useCallback(() => {
    approve();
    setShowFinalDialog(true);
  }, [approve]);

  const handleLoadDocument = useCallback(
    (text: string, filename?: string) => {
      setActiveSpanId(null);
      setShowFinalDialog(false);
      loadDocument(text, filename);
    },
    [loadDocument]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      // Ctrl+Z / Cmd+Z — undo last correction
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && canUndo) {
        e.preventDefault();
        undoLastCorrection();
        return;
      }

      if (reviewableSpans.length === 0) return;

      if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.NEXT_ITEM) {
        e.preventDefault();
        const currentIdx = reviewableSpans.findIndex((s) => s.id === activeSpanId);
        const nextIdx = currentIdx < reviewableSpans.length - 1 ? currentIdx + 1 : 0;
        handleSelectSpan(reviewableSpans[nextIdx].id);
      }

      if (e.key === KEYBOARD_SHORTCUTS.PREV_ITEM) {
        e.preventDefault();
        const currentIdx = reviewableSpans.findIndex((s) => s.id === activeSpanId);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : reviewableSpans.length - 1;
        handleSelectSpan(reviewableSpans[prevIdx].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reviewableSpans, activeSpanId, handleSelectSpan]);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8f9ff]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[#e3dfff] flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="material-symbols-outlined text-[#2a14b4]">shield</span>
          </div>
          <p className="text-sm text-[#464554]">Loading review workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8f9ff]">
      <AppHeader
        reviewedCount={reviewedCount}
        totalReviewable={totalReviewable}
        canApprove={canApprove}
        canUndo={canUndo}
        classification={state.classification}
        onTypeChange={setDocumentType}
        onApprove={handleApprove}
        onUndo={undoLastCorrection}
        onReset={reset}
        isApproved={state.isApproved}
        isReprocessing={state.isLlmRefining}
      />

      <div className={`flex flex-1 pt-16 overflow-hidden ${activeSpan ? "pb-36" : ""}`}>
        <ReviewQueue
          spans={state.spans}
          rawText={state.rawText}
          activeSpanId={activeSpanId}
          onSelectSpan={handleSelectSpan}
          onCorrect={handleCorrect}
          onBatchCorrect={handleBatchCorrect}
          onLoadDocument={handleLoadDocument}
          isProcessing={state.isProcessing || state.isLlmRefining}
          hasDocument={hasDocument}
        />

        <DocumentViewer
          rawText={state.rawText}
          spans={state.spans}
          activeSpanId={activeSpanId}
          onSelectSpan={handleSelectSpan}
          documentTitle={state.documentTitle}
          isProcessing={state.isProcessing}
          isLlmRefining={state.isLlmRefining}
          processingMessage={state.processingMessage}
          classificationType={state.classification.type}
          llmFallbackReason={state.llmFallbackReason}
          usedLlm={state.usedLlm}
        />

        <AuditSidebar
          auditLog={state.auditLog}
          totalSpans={state.spans.length}
          reviewableCount={reviewableSpans.length}
          usedLlm={state.usedLlm}
        />
      </div>

      {activeSpan && (
          <CorrectionPanel
            span={activeSpan}
            onCorrect={handleCorrect}
            onClose={() => setActiveSpanId(null)}
          />
        )}

      <FinalDocumentDialog
        open={showFinalDialog}
        onOpenChange={setShowFinalDialog}
        rawText={state.rawText}
        spans={state.spans}
        auditLog={state.auditLog}
        documentType={state.documentType}
        documentTitle={state.documentTitle}
        filename={state.filename}
        onReset={reset}
      />
    </div>
  );
}