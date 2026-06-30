"use client";

import { useReducer, useCallback, useMemo, useRef, type Dispatch } from "react";
import {
  ReviewState,
  ReviewAction,
  CorrectionAction,
  SpanStatus,
  DocumentType,
} from "../lib/types";
import { buildProcessedDocument, ProcessedDocument } from "../lib/document-processor";
import { parseUploadedContent } from "../lib/document-parser";
import { classifyDocument } from "../lib/detection/classify-document";
import { fetchProcessedDocument, fetchThemeReprocess } from "../lib/api/process-document-client";

const IDLE_STATE: ReviewState = {
  rawText: "",
  documentContent: "",
  spans: [],
  auditLog: [],
  documentType: "general",
  classification: { type: "general", confidence: 0, method: "keyword" },
  isApproved: false,
  documentTitle: "",
  filename: undefined,
  reviewableSpanIds: [],
  isProcessing: false,
  isLlmRefining: false,
  usedLlm: false,
  processingMessage: undefined,
  llmFallbackReason: undefined,
};

function processedToReviewState(
  processed: ProcessedDocument,
  content: string,
  filename?: string
): ReviewState {
  return {
    rawText: processed.rawText,
    documentContent: content,
    spans: processed.spans,
    auditLog: [],
    documentType: processed.classification.type,
    classification: processed.classification,
    isApproved: false,
    documentTitle: processed.title,
    filename,
    reviewableSpanIds: processed.reviewableSpanIds,
    isProcessing: false,
    isLlmRefining: false,
    usedLlm: processed.usedLlm,
    processingMessage: undefined,
    llmFallbackReason: processed.llmFallbackReason,
  };
}

function getNewStatus(action: CorrectionAction, currentStatus: SpanStatus): SpanStatus {
  switch (action) {
    case "keep":
    case "missed-pii":
      return "confirmed-redact";
    case "false-positive":
      return "confirmed-reveal";
    case "note-only":
      return currentStatus;
    default:
      return currentStatus;
  }
}

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case "SET_DOCUMENT_TYPE": {
      return {
        ...state,
        documentType: action.payload,
        classification: {
          ...state.classification,
          type: action.payload,
          method: "manual-override",
        },
      };
    }

    case "APPLY_CORRECTION": {
      const { spanId, action: correctionAction, note } = action.payload;
      const spanIndex = state.spans.findIndex((s) => s.id === spanId);
      if (spanIndex === -1) return state;

      const span = state.spans[spanIndex];
      const newStatus = getNewStatus(correctionAction, span.status);

      const updatedSpan = {
        ...span,
        status: newStatus,
        reviewerNote: note || span.reviewerNote,
      };

      const newSpans = [...state.spans];
      newSpans[spanIndex] = updatedSpan;

      const auditEntry = {
        id: `audit-${Date.now()}-${spanId}`,
        spanId: span.id,
        spanText: span.text,
        piiType: span.type,
        action: correctionAction,
        previousStatus: span.status,
        newStatus,
        note,
        timestamp: new Date().toISOString(),
      };

      return {
        ...state,
        spans: newSpans,
        auditLog: [auditEntry, ...state.auditLog],
      };
    }

    case "UNDO_LAST_CORRECTION": {
      if (state.auditLog.length === 0) return state;

      const lastEntry = state.auditLog[0]; // newest first
      const spanIdx = state.spans.findIndex((s) => s.id === lastEntry.spanId);
      if (spanIdx === -1) return state;

      const revertedSpans = [...state.spans];
      revertedSpans[spanIdx] = {
        ...revertedSpans[spanIdx],
        status: lastEntry.previousStatus,
        reviewerNote: undefined,
      };

      return {
        ...state,
        spans: revertedSpans,
        auditLog: state.auditLog.slice(1),
      };
    }

    case "APPROVE": {
      return { ...state, isApproved: true };
    }

    case "RESET": {
      return { ...IDLE_STATE };
    }

    case "LOAD_DOCUMENT_START": {
      return {
        ...state,
        isProcessing: true,
        isLlmRefining: false,
        usedLlm: false,
        processingMessage: "Parsing document...",
        filename: action.payload.filename,
        isApproved: false,
        auditLog: [],
        llmFallbackReason: undefined,
      };
    }

    case "LOAD_DOCUMENT_PROCESSED": {
      return processedToReviewState(
        action.payload.processed,
        action.payload.content,
        action.payload.filename
      );
    }

    case "LLM_REFINEMENT_START": {
      return {
        ...state,
        isProcessing: false,
        isLlmRefining: true,
        processingMessage:
          action.payload?.message ?? "Low keyword confidence — refining with AI...",
      };
    }

    case "LLM_REFINEMENT_END": {
      return {
        ...state,
        isLlmRefining: false,
        processingMessage: undefined,
      };
    }

    default:
      return state;
  }
}

async function runDocumentPipeline(
  content: string,
  filename: string | undefined,
  dispatch: Dispatch<ReviewAction>,
  requestId: number,
  loadRequestIdRef: { current: number }
) {
  dispatch({ type: "LOAD_DOCUMENT_START", payload: { filename } });

  try {
    const parsed = parseUploadedContent(content, filename);
    const classification = classifyDocument(parsed.rawText);
    const keywordProcessed = buildProcessedDocument(parsed, classification);

    if (loadRequestIdRef.current !== requestId) return;

    dispatch({
      type: "LOAD_DOCUMENT_PROCESSED",
      payload: { processed: keywordProcessed, content, filename },
    });

    const hasImportedAnnotations = parsed.annotations.length > 0;
    // Always use Gemini for best detection results on all document types.
    // For annotated docs, LLM audits existing suggestions.
    // For plain text, LLM detects PII directly (more accurate than regex alone).

    dispatch({
      type: "LLM_REFINEMENT_START",
      payload: {
        message: hasImportedAnnotations
          ? "AI checking for suspicious redactions..."
          : "AI scanning for PII — low-confidence detections will need your review...",
      },
    });

    try {
      const llmProcessed = await fetchProcessedDocument(content, filename);
      if (loadRequestIdRef.current !== requestId) return;

      dispatch({
        type: "LOAD_DOCUMENT_PROCESSED",
        payload: { processed: llmProcessed, content, filename },
      });
    } catch (llmError) {
      console.error("LLM fallback failed:", llmError);
      if (loadRequestIdRef.current === requestId) {
        dispatch({ type: "LLM_REFINEMENT_END" });
      }
    }
  } catch (error) {
    console.error("Document processing failed:", error);
    if (loadRequestIdRef.current !== requestId) return;

    dispatch({
      type: "LOAD_DOCUMENT_PROCESSED",
      payload: {
        processed: {
          title: filename || "Document",
          rawText: content,
          spans: [],
          classification: { type: "general", confidence: 0, method: "keyword" },
          reviewableSpanIds: [],
          usedLlm: false,
          stats: {
            totalSpans: 0,
            autoTrusted: 0,
            needsReview: 0,
            missed: 0,
            fromAnnotations: 0,
            fromDetection: 0,
            fromLlm: 0,
          },
        },
        content,
        filename,
      },
    });
  }
}

export function useReviewState() {
  const [state, dispatch] = useReducer(reviewReducer, IDLE_STATE);
  const loadRequestIdRef = useRef(0);
  const themeRequestIdRef = useRef(0);

  const setDocumentType = useCallback(
    async (type: DocumentType) => {
      if (!state.documentContent || type === state.documentType) return;

      const requestId = ++themeRequestIdRef.current;
      ++loadRequestIdRef.current;

      dispatch({ type: "SET_DOCUMENT_TYPE", payload: type });
      dispatch({
        type: "LLM_REFINEMENT_START",
        payload: { message: `Re-scanning with AI for ${type} redaction scope...` },
      });

      try {
        const processed = await fetchThemeReprocess(
          state.documentContent,
          type,
          state.filename
        );
        if (themeRequestIdRef.current !== requestId) return;

        dispatch({
          type: "LOAD_DOCUMENT_PROCESSED",
          payload: {
            processed,
            content: state.documentContent,
            filename: state.filename,
          },
        });
      } catch (error) {
        console.error("Theme reprocess failed:", error);
        if (themeRequestIdRef.current === requestId) {
          dispatch({ type: "LLM_REFINEMENT_END" });
        }
      }
    },
    [state.documentContent, state.documentType, state.filename]
  );

  const applyCorrection = useCallback(
    (spanId: string, action: CorrectionAction, note?: string) => {
      dispatch({
        type: "APPLY_CORRECTION",
        payload: { spanId, action, note },
      });
    },
    []
  );

  const undoLastCorrection = useCallback(() => {
    dispatch({ type: "UNDO_LAST_CORRECTION" });
  }, []);

  const approve = useCallback(() => {
    dispatch({ type: "APPROVE" });
  }, []);

  const reset = useCallback(() => {
    ++loadRequestIdRef.current;
    dispatch({ type: "RESET" });
  }, []);

  const loadDocument = useCallback((content: string, filename?: string) => {
    const requestId = ++loadRequestIdRef.current;
    themeRequestIdRef.current = requestId;
    void runDocumentPipeline(content, filename, dispatch, requestId, loadRequestIdRef);
  }, []);

  const reviewableSpans = useMemo(
    () =>
      state.spans
        .filter((s) => s.status === "needs-review" || s.status === "missed")
        .sort((a, b) => b.riskScore - a.riskScore),
    [state.spans]
  );

  const totalReviewable = state.reviewableSpanIds.length;
  const hasDocument = state.documentContent.length > 0;

  const reviewedCount = useMemo(() => {
    const reviewableSet = new Set(state.reviewableSpanIds);
    return state.spans.filter(
      (s) =>
        reviewableSet.has(s.id) &&
        (s.status === "confirmed-redact" || s.status === "confirmed-reveal")
    ).length;
  }, [state.spans, state.reviewableSpanIds]);

  // Allow approval even when no spans were detected (clean document with no PII).
  const canApprove =
    hasDocument &&
    reviewableSpans.length === 0 &&
    !state.isProcessing &&
    !state.isLlmRefining;

  const canUndo = state.auditLog.length > 0 && !state.isApproved;

  return {
    state,
    hasDocument,
    setDocumentType,
    applyCorrection,
    undoLastCorrection,
    approve,
    reset,
    loadDocument,
    reviewableSpans,
    reviewedCount,
    totalReviewable,
    canApprove,
    canUndo,
  };
}