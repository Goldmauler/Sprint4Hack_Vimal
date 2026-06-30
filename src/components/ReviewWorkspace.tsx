"use client";

import { useState, useCallback } from "react";
import { useReviewState } from "@/hooks/useReviewState";
import { AppHeader } from "@/components/layout/AppHeader";
import { ReviewQueue } from "@/components/review-queue/ReviewQueue";
import { DocumentViewer } from "@/components/document-viewer/DocumentViewer";
import { AuditSidebar } from "@/components/audit-log/AuditSidebar";
import { FinalDocumentDialog } from "@/components/final-output/FinalDocumentDialog";
import { CorrectionAction } from "@/lib/types";

export function ReviewWorkspace() {
  const {
    state,
    setDocumentType,
    applyCorrection,
    approve,
    reset,
    loadDocument,
    reviewedCount,
    totalReviewable,
    canApprove,
  } = useReviewState();

  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);
  const [showFinalDialog, setShowFinalDialog] = useState(false);

  const handleSelectSpan = useCallback((spanId: string) => {
    setActiveSpanId((prev) => (prev === spanId ? null : spanId));

    // Scroll to span in document
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

  const handleApprove = useCallback(() => {
    approve();
    setShowFinalDialog(true);
  }, [approve]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8f9ff]">
      <AppHeader
        reviewedCount={reviewedCount}
        totalReviewable={totalReviewable}
        canApprove={canApprove}
        classification={state.classification}
        onTypeChange={setDocumentType}
        onApprove={handleApprove}
        onReset={reset}
        isApproved={state.isApproved}
      />

      {/* Main 3-column layout */}
      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Left: Review Queue */}
        <ReviewQueue
          spans={state.spans}
          activeSpanId={activeSpanId}
          onSelectSpan={handleSelectSpan}
          onCorrect={handleCorrect}
          onLoadDocument={loadDocument}
        />

        {/* Center: Document Viewer */}
        <DocumentViewer
          rawText={state.rawText}
          spans={state.spans}
          activeSpanId={activeSpanId}
          onCorrect={handleCorrect}
          onSelectSpan={handleSelectSpan}
        />

        {/* Right: Audit Timeline */}
        <AuditSidebar auditLog={state.auditLog} />
      </div>

      {/* Final Document Dialog */}
      <FinalDocumentDialog
        open={showFinalDialog}
        onOpenChange={setShowFinalDialog}
        rawText={state.rawText}
        spans={state.spans}
        auditLog={state.auditLog}
        documentType={state.documentType}
        onReset={reset}
      />
    </div>
  );
}
