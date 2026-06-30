import { DocumentType } from "../types";
import {
  buildClassificationPrompt,
  buildRedactionPrompt,
  buildAnnotationAuditPrompt,
  extractJsonFromText,
  validateLLMResponse,
  validateLLMRedactionResponse,
  validateAnnotationAuditResponse,
  LLMClassificationResponse,
  LLMRedactionResponse,
  AnnotationAuditResponse,
} from "./llm-prompt";

// Models tried in order — if one is rate-limited we fall through to the next
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiModel(apiKey: string, model: string, prompt: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Two attempts per model (one retry on transient errors)
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });
    } catch (networkErr) {
      if (attempt === 0) { await sleep(1000); continue; }
      return null;
    }

    if (response.status === 429 || response.status === 503) {
      // Rate limited or overloaded — skip to next model
      if (attempt === 0 && response.status === 503) {
        await sleep(2000);
        continue;
      }
      return null;
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.output;

    if (typeof text !== "string") {
      throw new Error("Gemini returned an empty response");
    }

    return text;
  }

  return null;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  for (const model of GEMINI_MODELS) {
    const result = await callGeminiModel(apiKey, model, prompt);
    if (result !== null) return result;
  }

  throw new Error("All Gemini models are currently unavailable (quota exceeded). Using fallback detection.");
}

export async function classifyWithLLM(documentText: string): Promise<LLMClassificationResponse> {
  const rawText = await callGemini(buildClassificationPrompt(documentText));
  const parsed = extractJsonFromText(rawText);
  const validated = validateLLMResponse(parsed);

  if (!validated) {
    throw new Error("LLM returned invalid classification JSON");
  }

  return validated;
}

export async function auditAnnotationsWithLLM(
  documentText: string,
  annotations: Array<{ text: string; type: string }>,
  documentType: DocumentType
): Promise<AnnotationAuditResponse> {
  const rawText = await callGemini(
    buildAnnotationAuditPrompt(documentText, annotations, documentType)
  );
  const parsed = extractJsonFromText(rawText);
  const validated = validateAnnotationAuditResponse(parsed);

  if (!validated) {
    throw new Error("LLM returned invalid annotation audit JSON");
  }

  return validated;
}

export async function detectRedactionsWithLLM(
  documentText: string,
  documentType: DocumentType
): Promise<LLMRedactionResponse> {
  const rawText = await callGemini(buildRedactionPrompt(documentText, documentType));
  const parsed = extractJsonFromText(rawText);
  const validated = validateLLMRedactionResponse(parsed);

  if (!validated) {
    throw new Error("LLM returned invalid redaction JSON");
  }

  return validated;
}