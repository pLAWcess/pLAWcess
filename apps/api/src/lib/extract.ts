import { createHash } from "crypto";

// PDF / 이미지(JPG / PNG)는 Gemini에 raw로 그대로 전송하므로 추출하지 않는다.
// DOCX만 mammoth로 텍스트를 뽑아 Gemini prompt에 인라인으로 포함시킨다.
// 추출된 텍스트는 DB에 저장되지 않고 메모리에서만 사용된다.
// 무거운 추출 라이브러리(mammoth)는 dynamic import로 lazy load — Vercel cold start 안정성.

export type DocumentKind = "pdf" | "docx";
export type ImageKind = "jpg" | "png";
export type AttachmentKind = DocumentKind | ImageKind;

// DOCX 추출 텍스트에만 적용되는 한도.
export const MAX_TEXT_PER_FILE = 15_000;
export const MAX_TEXT_PER_ACTIVITY = 30_000;
export const MIN_USEFUL_TEXT = 20;

export const MIME_TO_KIND: Record<string, AttachmentKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

export function sha256Hex(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// ----------------------------------------------------------------
// 추출기 — DOCX만. PDF / 이미지는 raw로 그대로 사용.
// ----------------------------------------------------------------

async function extractDocx(buffer: Uint8Array): Promise<string> {
  const { default: mammoth } = await import("mammoth");
  const buf = Buffer.from(buffer);
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value ?? "";
}

// ----------------------------------------------------------------
// 정규화 — DOCX 추출 텍스트 전용
// ----------------------------------------------------------------

function stripControlChars(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function normalizeWhitespace(s: string): string {
  return s
    .replace(/[﻿​‌‍⁠]/g, "")
    .replace(/ /g, " ")
    .replace(/\r\n?/g, "\n");
}

function compactSpacing(s: string): string {
  const lines = s.split("\n").map((l) => l.replace(/[ \t]+/g, " ").replace(/[ \t]+$/g, ""));
  const compacted: string[] = [];
  let blank = 0;
  for (const l of lines) {
    if (l.trim() === "") {
      blank += 1;
      if (blank <= 1) compacted.push("");
    } else {
      blank = 0;
      compacted.push(l);
    }
  }
  return compacted.join("\n").trim();
}

export type NormalizeResult = { text: string; truncated: boolean; charCount: number };

export function normalizeExtracted(raw: string): NormalizeResult {
  const step1 = stripControlChars(normalizeWhitespace(raw ?? ""));
  const step2 = compactSpacing(step1);

  if (step2.length <= MAX_TEXT_PER_FILE) {
    return { text: step2, truncated: false, charCount: step2.length };
  }
  const trimmed = step2.slice(0, MAX_TEXT_PER_FILE);
  const marker = `\n… (이하 생략 — 원문 ${step2.length.toLocaleString("ko-KR")}자 중 ${MAX_TEXT_PER_FILE.toLocaleString("ko-KR")}자만 분석에 사용)`;
  return { text: trimmed + marker, truncated: true, charCount: step2.length };
}

// ----------------------------------------------------------------
// 통합 dispatch — File → kind 분기 + 메모리 raw 보존 + (DOCX만) 추출 텍스트
// raw bytes는 Storage 업로드와 Gemini 전송 양쪽으로 흐른다.
// ----------------------------------------------------------------

export type RawPdf = {
  type: "document";
  kind: "pdf";
  filename: string;
  size: number;
  mimeType: "application/pdf";
  contentHash: string;
  raw: Uint8Array;
};

export type RawDocx = {
  type: "document";
  kind: "docx";
  filename: string;
  size: number;
  mimeType: string;
  contentHash: string;
  raw: Uint8Array;
  extractedText: string; // 정규화된 텍스트 (메모리만, DB 저장 X)
  textCharCount: number;
  truncated: boolean;
  empty: boolean;
};

export type RawImage = {
  type: "image";
  kind: ImageKind;
  filename: string;
  size: number;
  mimeType: string;
  contentHash: string;
  raw: Uint8Array;
};

export type DispatchResult = RawPdf | RawDocx | RawImage;

export async function dispatchByMime(file: File): Promise<DispatchResult> {
  const mime = file.type;
  const kind = MIME_TO_KIND[mime];
  if (!kind) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${file.name} (${mime || "MIME 미상"})`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const contentHash = sha256Hex(bytes);

  if (kind === "jpg" || kind === "png") {
    return {
      type: "image",
      kind,
      filename: file.name,
      size: file.size,
      mimeType: kind === "jpg" ? "image/jpeg" : "image/png",
      contentHash,
      raw: bytes,
    };
  }

  if (kind === "pdf") {
    return {
      type: "document",
      kind: "pdf",
      filename: file.name,
      size: file.size,
      mimeType: "application/pdf",
      contentHash,
      raw: bytes,
    };
  }

  // DOCX — 텍스트 추출 + 정규화 (메모리만, DB에는 저장 안 됨)
  let raw: string;
  try {
    raw = await extractDocx(bytes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`첨부 파일에서 텍스트를 추출하지 못했습니다: ${file.name} — ${msg}`);
  }

  const normalized = normalizeExtracted(raw);
  const empty = normalized.text.trim().length < MIN_USEFUL_TEXT;

  return {
    type: "document",
    kind: "docx",
    filename: file.name,
    size: file.size,
    mimeType: mime,
    contentHash,
    raw: bytes,
    extractedText: empty ? "" : normalized.text,
    textCharCount: normalized.charCount,
    truncated: normalized.truncated,
    empty,
  };
}
