import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        text = result.text;
      } finally {
        await parser.destroy();
      }
    } else if (
      name.endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload .pdf, .docx, .txt, or .json." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No extractable text found in this file. If it's a scanned PDF, it has no selectable text layer." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, filename: file.name });
  } catch (error) {
    console.error("extract-file error:", error);
    const msg = error instanceof Error ? error.message : "Failed to extract text";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
