import { NextRequest, NextResponse } from "next/server";
import { classifyDocument, needsLlmFallback } from "@/lib/detection/classify-document";
import {
  auditAnnotationsWithLLM,
  classifyWithLLM,
  detectRedactionsWithLLM,
} from "@/lib/detection/llm-client";
import {
  buildProcessedDocument,
  llmSuggestionsToSpans,
} from "@/lib/document-processor";
import { parseUploadedContent } from "@/lib/document-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content : "";
    const filename = typeof body.filename === "string" ? body.filename : undefined;

    if (!content.trim()) {
      return NextResponse.json({ error: "Document content is required" }, { status: 400 });
    }

    const parsed = parseUploadedContent(content, filename);
    let classification = classifyDocument(parsed.rawText);
    let llmSpans: ReturnType<typeof llmSuggestionsToSpans> = [];
    let usedLlm = false;
    let llmFallbackReason: string | undefined;
    let annotationAudits: Awaited<ReturnType<typeof auditAnnotationsWithLLM>>["reviews"] | undefined;

    const hasImportedAnnotations = parsed.annotations.length > 0;

    if (hasImportedAnnotations && process.env.GEMINI_API_KEY) {
      try {
        const audit = await auditAnnotationsWithLLM(
          parsed.rawText,
          parsed.annotations.map((a) => ({ text: a.text, type: a.type })),
          classification.type
        );
        annotationAudits = audit.reviews;
        usedLlm = true;
      } catch (auditError) {
        const msg = auditError instanceof Error ? auditError.message : "Audit failed";
        console.error("Annotation audit failed:", msg);
        llmFallbackReason = `AI review unavailable (${msg.slice(0, 80)}). All redactions queued for manual review.`;
      }
    }

    // Always use Gemini for PII detection when the API key is present.
    // Only upgrade classification via LLM if keyword confidence is low.
    if (!hasImportedAnnotations && process.env.GEMINI_API_KEY) {
      try {
        if (needsLlmFallback(classification, parsed.rawText)) {
          const llmClass = await classifyWithLLM(parsed.rawText);
          classification = {
            type: llmClass.type,
            confidence: llmClass.confidence,
            method: "llm",
            reasoning: llmClass.reasoning,
            keywordScores: classification.keywordScores,
          };
        }

        const llmRedactions = await detectRedactionsWithLLM(
          parsed.rawText,
          classification.type
        );
        llmSpans = llmSuggestionsToSpans(
          parsed.rawText,
          llmRedactions.suggestions
        );
        usedLlm = true;
      } catch (llmError) {
        const msg = llmError instanceof Error ? llmError.message : "LLM failed";
        console.error("Gemini unavailable, using keyword + regex detection:", msg);
        llmFallbackReason = `AI detection unavailable — using pattern-based detection. Low-confidence items are still queued for your review.`;
      }
    }

    const processed = buildProcessedDocument(parsed, classification, {
      llmSpans,
      usedLlm,
      llmFallbackReason,
      annotationAudits,
    });

    return NextResponse.json(processed);
  } catch (error) {
    console.error("process-document error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}