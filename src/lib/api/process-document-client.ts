import { ProcessedDocument } from "../document-processor";
import { DocumentType } from "../types";

export async function fetchProcessedDocument(
  content: string,
  filename?: string
): Promise<ProcessedDocument> {
  const response = await fetch("/api/process-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Processing failed (${response.status})`);
  }

  return response.json();
}

export async function fetchThemeReprocess(
  content: string,
  theme: DocumentType,
  filename?: string
): Promise<ProcessedDocument> {
  const response = await fetch("/api/reprocess-theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, theme, filename }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Theme reprocess failed (${response.status})`);
  }

  return response.json();
}