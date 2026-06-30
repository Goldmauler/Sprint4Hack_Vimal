// LLM prompt template and typed response contract
// Structurally present but not wired to a live API key by default

export interface LLMClassificationResponse {
  type: "medical" | "legal" | "general" | "hybrid";
  confidence: number;
  reasoning: string;
}

export function buildClassificationPrompt(documentText: string): string {
  return `You are a document classification assistant specialized in identifying document types for PII redaction purposes.

Analyze the following document and classify it as one of:
- "medical" — primarily contains medical/healthcare information
- "legal" — primarily contains legal/judicial information
- "hybrid" — contains significant elements of both medical and legal domains
- "general" — does not clearly fall into medical or legal categories

Respond with a JSON object in exactly this format:
{
  "type": "medical" | "legal" | "general" | "hybrid",
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation of classification>"
}

Document:
---
${documentText.substring(0, 2000)}
---

Respond with ONLY the JSON object, no additional text.`;
}

export function validateLLMResponse(raw: unknown): LLMClassificationResponse | null {
  if (typeof raw !== "object" || raw === null) return null;

  const obj = raw as Record<string, unknown>;

  if (
    !["medical", "legal", "general", "hybrid"].includes(obj.type as string) ||
    typeof obj.confidence !== "number" ||
    obj.confidence < 0 ||
    obj.confidence > 1 ||
    typeof obj.reasoning !== "string"
  ) {
    return null;
  }

  return obj as unknown as LLMClassificationResponse;
}
