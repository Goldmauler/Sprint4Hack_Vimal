import { PIIType } from "./types";

export interface ParsedAnnotation {
  text: string;
  startOffset: number;
  endOffset: number;
  type: PIIType;
  confidence: number;
}

export interface ParsedDocument {
  title: string;
  rawText: string;
  annotations: ParsedAnnotation[];
  source: "plain" | "json" | "inline-markers" | "bracket-markers" | "redaction-blocks";
}

interface BracketMatch {
  index: number;
  length: number;
  type: PIIType;
  text: string;
  confidence: number;
}

const VALID_PII_TYPES: PIIType[] = [
  "PERSON", "PHONE", "DATE", "CASE_NUMBER", "FINANCIAL", "FINANCIAL_ID",
  "ORGANIZATION", "DIAGNOSIS", "ADDRESS", "OTHER",
];

const INLINE_MARKER_REGEX = /\{\{([A-Z_]+):([\d.]+)\}\}([\s\S]*?)\{\{\/\}\}/g;
const REDACTION_BLOCK_REGEX = /\[(?:REDACTED(?::\s*([A-Z_ ]+))?|█+)\]/g;

function isValidPIIType(type: string): type is PIIType {
  return VALID_PII_TYPES.includes(type as PIIType);
}

function normalizePIIType(type: string): PIIType {
  const normalized = type.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized.includes("PERSON") || normalized === "NAME") return "PERSON";
  if (normalized.includes("PHONE")) return "PHONE";
  if (normalized.includes("EMAIL")) return "OTHER";
  if (normalized.includes("DIAGNOSIS")) return "DIAGNOSIS";
  if (normalized.includes("ADDRESS")) return "ADDRESS";
  if (normalized.includes("ORGANIZATION") || normalized.includes("ORG")) return "ORGANIZATION";
  if (normalized === "NAME") return "PERSON";
  if (normalized === "CASE_NO" || normalized === "CASE") return "CASE_NUMBER";
  if (normalized === "FINANCIAL_ID" || normalized === "ID" || normalized === "SSN") return "FINANCIAL_ID";
  if (normalized === "ORG" || normalized === "ORGANISATION") return "ORGANIZATION";
  if (isValidPIIType(normalized)) return normalized;
  return "OTHER";
}

function extractTitle(text: string): string {
  const firstLine = text.split("\n").find((line) => line.trim().length > 0);
  if (!firstLine) return "Uploaded Document";
  const cleaned = firstLine.trim().replace(/^#+\s*/, "");
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
}

function parseBracketMarkers(content: string): ParsedDocument | null {
  if (!content.includes("[[")) return null;

  const matches: BracketMatch[] = [];
  const seen = new Set<string>();

  const patterns: Array<{ regex: RegExp; typeIdx: number; textIdx: number; conf: number }> = [
    {
      regex: /\[\[([A-Za-z][A-Za-z_ ]*?)\]\s*([^\[\]]+?)\s*\[([a-z]+)\]\]/g,
      typeIdx: 1,
      textIdx: 2,
      conf: 0.85,
    },
    {
      regex: /\[\[([A-Za-z][A-Za-z_ ]*?)\s+([^\[\]]+?)\s*\[([a-z]+)\]\]\]/g,
      typeIdx: 1,
      textIdx: 2,
      conf: 0.85,
    },
    {
      regex: /\[\[([A-Za-z][A-Za-z_ ]*?)\]\]\s*([A-Za-z0-9@.,()\-/\s]{2,80}?)(?=\s*(?:\[\[|\n|$))/g,
      typeIdx: 1,
      textIdx: 2,
      conf: 0.7,
    },
    {
      regex: /\[\[([A-Za-z][A-Za-z_ ]*?)\[([a-z]+)\]\]/g,
      typeIdx: 1,
      textIdx: 0,
      conf: 0.65,
    },
  ];

  for (const pat of patterns) {
    pat.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pat.regex.exec(content)) !== null) {
      const rawType = match[pat.typeIdx]?.trim() || "OTHER";
      let text = pat.textIdx > 0 ? match[pat.textIdx]?.trim() || "" : "";
      if (!text && pat.textIdx === 0) continue;

      const key = `${match.index}:${text}`;
      if (!text || seen.has(key)) continue;
      seen.add(key);

      matches.push({
        index: match.index,
        length: match[0].length,
        type: normalizePIIType(rawType.replace(/\s+/g, "_")),
        text,
        confidence: pat.conf,
      });
    }
  }

  if (matches.length === 0) return null;

  matches.sort((a, b) => a.index - b.index);

  let rawText = "";
  let cursor = 0;
  const annotations: ParsedAnnotation[] = [];

  for (const m of matches) {
    rawText += content.slice(cursor, m.index);
    const startOffset = rawText.length;
    rawText += m.text;
    annotations.push({
      text: m.text,
      startOffset,
      endOffset: startOffset + m.text.length,
      type: m.type,
      confidence: m.confidence,
    });
    cursor = m.index + m.length;
  }
  rawText += content.slice(cursor);

  return {
    title: extractTitle(rawText),
    rawText,
    annotations,
    source: "bracket-markers",
  };
}

function parseInlineMarkers(content: string): ParsedDocument | null {
  if (!content.includes("{{")) return null;

  const annotations: ParsedAnnotation[] = [];
  let rawText = "";
  let cursor = 0;
  let title = "Annotated Document";

  INLINE_MARKER_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  const parts: Array<{ index: number; end: number; type: PIIType; confidence: number; text: string }> = [];

  while ((match = INLINE_MARKER_REGEX.exec(content)) !== null) {
    parts.push({
      index: match.index,
      end: match.index + match[0].length,
      type: normalizePIIType(match[1]),
      confidence: Math.min(1, Math.max(0, parseFloat(match[2]) || 0.5)),
      text: match[3],
    });
  }

  if (parts.length === 0) return null;

  for (const part of parts) {
    const plainBefore = content.slice(cursor, part.index);
    rawText += plainBefore;
    const startOffset = rawText.length;
    rawText += part.text;
    annotations.push({
      text: part.text,
      startOffset,
      endOffset: startOffset + part.text.length,
      type: part.type,
      confidence: part.confidence,
    });
    cursor = part.end;
  }
  rawText += content.slice(cursor);

  if (!title || title === "Annotated Document") {
    title = extractTitle(rawText);
  }

  return { title, rawText, annotations, source: "inline-markers" };
}

function parseRedactionBlocks(content: string): ParsedDocument | null {
  REDACTION_BLOCK_REGEX.lastIndex = 0;
  if (!REDACTION_BLOCK_REGEX.test(content)) return null;

  const annotations: ParsedAnnotation[] = [];
  let rawText = "";
  let cursor = 0;
  let blockId = 0;

  REDACTION_BLOCK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = REDACTION_BLOCK_REGEX.exec(content)) !== null) {
    rawText += content.slice(cursor, match.index);
    const type = normalizePIIType(match[1] || "OTHER");
    const placeholder = `[REDACTED: ${type}]`;
    const startOffset = rawText.length;
    rawText += placeholder;
    annotations.push({
      text: placeholder,
      startOffset,
      endOffset: startOffset + placeholder.length,
      type,
      confidence: 0.75,
    });
    cursor = match.index + match[0].length;
    blockId++;
  }
  rawText += content.slice(cursor);

  return {
    title: extractTitle(rawText),
    rawText,
    annotations,
    source: "redaction-blocks",
  };
}

interface JsonDocumentPayload {
  title?: string;
  text?: string;
  content?: string;
  document?: string;
  suggestions?: Array<{
    text?: string;
    start?: number;
    startOffset?: number;
    end?: number;
    endOffset?: number;
    type?: string;
    confidence?: number;
  }>;
  annotations?: Array<{
    text?: string;
    start?: number;
    startOffset?: number;
    end?: number;
    endOffset?: number;
    type?: string;
    confidence?: number;
  }>;
  spans?: Array<{
    text?: string;
    start?: number;
    startOffset?: number;
    end?: number;
    endOffset?: number;
    type?: string;
    confidence?: number;
  }>;
}

function parseJsonDocument(content: string): ParsedDocument | null {
  try {
    const data = JSON.parse(content) as JsonDocumentPayload;
    const rawText = data.text || data.content || data.document;
    if (!rawText || typeof rawText !== "string") return null;

    const rawSuggestions = data.suggestions || data.annotations || data.spans || [];
    const annotations: ParsedAnnotation[] = [];

    for (const item of rawSuggestions) {
      if (!item.text && item.startOffset === undefined && item.start === undefined) continue;

      let startOffset = item.startOffset ?? item.start ?? 0;
      let endOffset = item.endOffset ?? item.end;
      const text = item.text || rawText.slice(startOffset, endOffset);

      if (endOffset === undefined) {
        endOffset = startOffset + text.length;
      }
      if (!item.text && item.startOffset === undefined && item.start !== undefined) {
        startOffset = rawText.indexOf(text, item.start);
        if (startOffset === -1) startOffset = item.start;
        endOffset = startOffset + text.length;
      } else if (item.text && item.startOffset === undefined && item.start === undefined) {
        startOffset = rawText.indexOf(text);
        if (startOffset === -1) continue;
        endOffset = startOffset + text.length;
      }

      annotations.push({
        text,
        startOffset,
        endOffset,
        type: normalizePIIType(item.type || "OTHER"),
        confidence: Math.min(1, Math.max(0, item.confidence ?? 0.7)),
      });
    }

    return {
      title: data.title || extractTitle(rawText),
      rawText,
      annotations,
      source: "json",
    };
  } catch {
    return null;
  }
}

export function parseUploadedContent(content: string, filename?: string): ParsedDocument {
  const trimmed = content.trim();
  const isJson = filename?.endsWith(".json") || trimmed.startsWith("{");

  if (isJson) {
    const jsonDoc = parseJsonDocument(trimmed);
    if (jsonDoc) return jsonDoc;
  }

  const bracketDoc = parseBracketMarkers(content);
  if (bracketDoc) return bracketDoc;

  const inlineDoc = parseInlineMarkers(content);
  if (inlineDoc) return inlineDoc;

  const blockDoc = parseRedactionBlocks(content);
  if (blockDoc) return blockDoc;

  return {
    title: extractTitle(content),
    rawText: content,
    annotations: [],
    source: "plain",
  };
}