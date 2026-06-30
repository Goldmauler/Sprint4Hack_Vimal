import { NextRequest, NextResponse } from "next/server";
import { detectRedactionsWithLLM } from "@/lib/detection/llm-client";
import { getThemeScopeDescription } from "@/lib/detection/llm-prompt";
import {
  buildThemeProcessedDocument,
  llmSuggestionsToSpans,
} from "@/lib/document-processor";
import { parseUploadedContent } from "@/lib/document-parser";
import { detectAllPII } from "@/lib/detection/pii-detector";
import { filterSpansForTheme } from "@/lib/detection/theme-filter";
import { DocumentType } from "@/lib/types";

const VALID_THEMES: DocumentType[] = ["medical", "legal", "general", "hybrid", "finance"];

function regexFallbackSpans(text: string, theme: DocumentType) {
  const detected = detectAllPII(text, theme).filter((s) => s.isOriginalSuggestion);
  return filterSpansForTheme(detected, theme);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content : "";
    const filename = typeof body.filename === "string" ? body.filename : undefined;
    const theme = body.theme as DocumentType;

    if (!content.trim()) {
      return NextResponse.json({ error: "Document content is required" }, { status: 400 });
    }

    if (!VALID_THEMES.includes(theme)) {
      return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }

    const parsed = parseUploadedContent(content, filename);
    let llmSpans = llmSuggestionsToSpans(parsed.rawText, []);
    let usedLlm = false;
    let llmFallbackReason: string | undefined;
    const reasoning = getThemeScopeDescription(theme);

    if (process.env.GEMINI_API_KEY) {
      try {
        const llmRedactions = await detectRedactionsWithLLM(parsed.rawText, theme);
        llmSpans = llmSuggestionsToSpans(parsed.rawText, llmRedactions.suggestions);
        usedLlm = true;
      } catch (llmError) {
        const msg = llmError instanceof Error ? llmError.message : "LLM failed";
        console.error("Theme LLM reprocess failed, using regex fallback:", msg);
        llmSpans = regexFallbackSpans(parsed.rawText, theme);
        llmFallbackReason = `AI unavailable (${msg.slice(0, 80)}). Using theme-filtered regex detection.`;
      }
    } else {
      llmSpans = regexFallbackSpans(parsed.rawText, theme);
      llmFallbackReason = "No API key configured. Using theme-filtered regex detection.";
    }

    const processed = buildThemeProcessedDocument(parsed, theme, llmSpans, {
      usedLlm,
      reasoning,
      llmFallbackReason,
    });

    return NextResponse.json(processed);
  } catch (error) {
    console.error("reprocess-theme error:", error);
    return NextResponse.json({ error: "Failed to reprocess document for theme" }, { status: 500 });
  }
}