"use client";

import { useReducer, useCallback, useMemo } from "react";
import {
  ReviewState,
  ReviewAction,
  RedactionSpan,
  AuditLogEntry,
  CorrectionAction,
  SpanStatus,
} from "../lib/types";
import { MOCK_DOCUMENT_TEXT } from "../lib/mock-data";
import { classifyDocument } from "../lib/detection/classify-document";
import { applyRiskScores } from "../lib/detection/risk-rules";
import { detectAllPII } from "../lib/detection/pii-detector";

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
      const newSpans = applyRiskScores(state.spans, action.payload);
      return {
        ...state,
        documentType: action.payload,
        classification: {
          ...state.classification,
          type: action.payload,
          method: "manual-override",
        },
        spans: newSpans,
      };
    }

    case "APPLY_CORRECTION": {
      const { spanId, action: correctionAction, note } = action.payload;
      const spanIndex = state.spans.findIndex((s) => s.id === spanId);
      if (spanIndex === -1) return state;

      const span = state.spans[spanIndex];
      const newStatus = getNewStatus(correctionAction, span.status);

      const updatedSpan: RedactionSpan = {
        ...span,
        status: newStatus,
        reviewerNote: note || span.reviewerNote,
      };

      const newSpans = [...state.spans];
      newSpans[spanIndex] = updatedSpan;

      const auditEntry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    case "APPROVE": {
      return {
        ...state,
        isApproved: true,
      };
    }

    case "RESET": {
      return createInitialState();
    }

    case "LOAD_DOCUMENT": {
      const text = action.payload;
      const classification = classifyDocument(text);
      const spans = detectAllPII(text, classification.type);

      return {
        rawText: text,
        spans,
        auditLog: [],
        documentType: classification.type,
        classification,
        isApproved: false,
      };
    }

    default:
      return state;
  }
}

function createInitialState(): ReviewState {
  const classification = classifyDocument(MOCK_DOCUMENT_TEXT);
  const spans = detectAllPII(MOCK_DOCUMENT_TEXT, classification.type);

  return {
    rawText: MOCK_DOCUMENT_TEXT,
    spans,
    auditLog: [],
    documentType: classification.type,
    classification,
    isApproved: false,
  };
}

export function useReviewState() {
  const [state, dispatch] = useReducer(reviewReducer, null, createInitialState);

  const setDocumentType = useCallback(
    (type: ReviewState["documentType"]) => {
      dispatch({ type: "SET_DOCUMENT_TYPE", payload: type });
    },
    []
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

  const approve = useCallback(() => {
    dispatch({ type: "APPROVE" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const loadDocument = useCallback((text: string) => {
    dispatch({ type: "LOAD_DOCUMENT", payload: text });
  }, []);

  // Derived state
  const reviewableSpans = useMemo(
    () =>
      state.spans
        .filter((s) => s.status === "needs-review" || s.status === "missed")
        .sort((a, b) => b.riskScore - a.riskScore),
    [state.spans]
  );

  // How many total items originally needed review
  const totalReviewable = useMemo(() => {
    // Count all items in the spans array that started as "needs-review" or "missed" (which is matches that aren't auto-trusted initially)
    // To know their initial state, we look at their status OR if they are resolved (confirmed-redact/confirmed-reveal)
    return state.spans.filter(
      (s) =>
        s.status === "needs-review" ||
        s.status === "missed" ||
        s.status === "confirmed-redact" ||
        s.status === "confirmed-reveal"
    ).filter(
      (s) => !s.id.startsWith("suggest-") || s.status !== "auto-trusted"
    ).length;
  }, [state.spans]);

  // How many of those reviewable items have been resolved (confirmed)
  const reviewedCount = useMemo(() => {
    return state.spans.filter(
      (s) => s.status === "confirmed-redact" || s.status === "confirmed-reveal"
    ).length;
  }, [state.spans]);

  const canApprove = reviewableSpans.length === 0;

  return {
    state,
    setDocumentType,
    applyCorrection,
    approve,
    reset,
    loadDocument,
    reviewableSpans,
    reviewedCount,
    totalReviewable,
    canApprove,
  };
}
