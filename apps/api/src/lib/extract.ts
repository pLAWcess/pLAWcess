import { createHash } from "crypto";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { parseOffice, type OfficeContentNode, type SlideMetadata } from "officeparser";

export type DocumentKind = "pdf" | "docx" | "pptx";
export type ImageKind = "jpg" | "png";
export type AttachmentKind = DocumentKind | ImageKind;

export const MAX_TEXT_PER_FILE = 15_000;
export const MAX_TEXT_PER_ACTIVITY = 30_000;
export const MIN_USEFUL_TEXT = 20;

export const MIME_TO_KIND: Record<string, AttachmentKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

export function isDocumentKind(kind: AttachmentKind): kind is DocumentKind {
  return kind === "pdf" || kind === "docx" || kind === "pptx";
}

export function sha256Hex(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// ----------------------------------------------------------------
// 추출기들 — 각 포맷에서 raw text를 뽑는다. 정규화는 normalizeExtracted에서.
// ----------------------------------------------------------------

async function extractPdf(buffer: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    // PageTextResult { num, text } 배열 → 페이지 경계를 LF 두 줄로 보존
    return result.pages.map((p) => p.text).join("\n\n");
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractDocx(buffer: Uint8Array): Promise<string> {
  // mammoth는 Buffer를 기대 — Uint8Array를 Buffer로 감싸 전달
  const buf = Buffer.from(buffer);
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value ?? "";
}

async function extractPptx(buffer: Uint8Array): Promise<string> {
  const buf = Buffer.from(buffer);
  const ast = await parseOffice(buf);
  // Top-level content node 중 SlideMetadata 보유 노드를 슬라이드 단위로 헤더 부여
  const parts: string[] = [];
  let fallback = false;
  for (const node of ast.content as OfficeContentNode[]) {
    const meta = node.metadata as Partial<SlideMetadata> | undefined;
    if (meta && typeof meta.slideNumber === "number") {
      const text = node.text?.trim() ?? "";
      if (text) parts.push(`## 슬라이드 ${meta.slideNumber}\n${text}`);
    } else {
      fallback = true;
    }
  }
  if (parts.length > 0) return parts.join("\n\n");
  // 슬라이드 메타가 안 잡히면 전체 toText로 fallback
  if (fallback || ast.content.length === 0) return ast.toText();
  return "";
}

// ----------------------------------------------------------------
// 정규화 — plan의 텍스트 추출 전처리 7단계
// ----------------------------------------------------------------

function stripControlChars(s: string): string {
  // 0x00–0x08, 0x0B, 0x0C, 0x0E–0x1F 제거. 0x09(TAB)/0x0A(LF) 유지
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function normalizeWhitespace(s: string): string {
  return s
    // BOM, zero-width
    .replace(/[﻿​‌‍⁠]/g, "")
    // NBSP → 일반 공백
    .replace(/ /g, " ")
    // CRLF/CR → LF
    .replace(/\r\n?/g, "\n");
}

function compactSpacing(s: string): string {
  // 라인 단위 처리: trim + 다중 공백/탭 → 단일 공백
  const lines = s.split("\n").map((l) => l.replace(/[ \t]+/g, " ").replace(/[ \t]+$/g, ""));
  // 3개 이상 연속 공행 → 2개
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

function removeTrivialPageNoise(s: string, source: "pdf" | "docx" | "pptx"): string {
  if (source !== "pdf" && source !== "pptx") return s;
  const lines = s.split("\n");

  // 1) 단독 라인 페이지 번호 / "Page N of M" 제거
  const cleaned = lines.filter((l) => {
    const t = l.trim();
    if (/^\d{1,4}$/.test(t)) return false;
    if (/^page\s+\d+(\s*of\s*\d+)?$/i.test(t)) return false;
    if (/^-\s*\d{1,4}\s*-$/.test(t)) return false; // "- 12 -"
    return true;
  });

  // 2) 짧은(≤80자) 라인이 전체에서 50% 이상 등장하면 머리말/꼬리말로 보고 제거 (PDF에 한해 적용)
  if (source === "pdf" && cleaned.length >= 6) {
    const counts = new Map<string, number>();
    for (const l of cleaned) {
      const t = l.trim();
      if (t.length === 0 || t.length > 80) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    // 비공백 라인 총수 대비 비율
    const total = cleaned.filter((l) => l.trim().length > 0).length;
    const noise = new Set<string>();
    for (const [text, n] of counts.entries()) {
      if (n >= 3 && n / total >= 0.5) noise.add(text);
    }
    if (noise.size > 0) {
      return cleaned.filter((l) => !noise.has(l.trim())).join("\n");
    }
  }

  return cleaned.join("\n");
}

export type NormalizeResult = { text: string; truncated: boolean; charCount: number };

export function normalizeExtracted(
  raw: string,
  source: "pdf" | "docx" | "pptx"
): NormalizeResult {
  const step1 = stripControlChars(normalizeWhitespace(raw ?? ""));
  const step2 = compactSpacing(step1);
  const step3 = removeTrivialPageNoise(step2, source);
  const step4 = compactSpacing(step3); // 노이즈 제거로 생긴 빈 줄 다시 정리

  if (step4.length <= MAX_TEXT_PER_FILE) {
    return { text: step4, truncated: false, charCount: step4.length };
  }
  const trimmed = step4.slice(0, MAX_TEXT_PER_FILE);
  const marker = `\n… (이하 생략 — 원문 ${step4.length.toLocaleString("ko-KR")}자 중 ${MAX_TEXT_PER_FILE.toLocaleString("ko-KR")}자만 분석에 사용)`;
  return { text: trimmed + marker, truncated: true, charCount: step4.length };
}

// ----------------------------------------------------------------
// 통합 dispatch — File을 받아 kind 분기 + 추출 + 정규화 + hash까지
// ----------------------------------------------------------------

export type DocumentExtractResult = {
  type: "document";
  kind: DocumentKind;
  filename: string;
  size: number;
  contentHash: string;
  extractedText: string;
  textCharCount: number;
  truncated: boolean;
  empty: boolean; // 정규화 후 의미있는 텍스트가 없으면 true
};

export type ImageExtractResult = {
  type: "image";
  kind: ImageKind;
  filename: string;
  size: number;
  mimeType: string;
  contentHash: string;
  base64: string; // 메모리에서만 사용. DB에는 저장하지 않음.
};

export type ExtractResult = DocumentExtractResult | ImageExtractResult;

export async function dispatchByMime(file: File): Promise<ExtractResult> {
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
      base64: Buffer.from(bytes).toString("base64"),
    };
  }

  // 문서: 추출 + 정규화
  let raw: string;
  try {
    if (kind === "pdf") raw = await extractPdf(bytes);
    else if (kind === "docx") raw = await extractDocx(bytes);
    else raw = await extractPptx(bytes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`첨부 파일에서 텍스트를 추출하지 못했습니다: ${file.name} — ${msg}`);
  }

  const normalized = normalizeExtracted(raw, kind);
  const empty = normalized.text.trim().length < MIN_USEFUL_TEXT;

  return {
    type: "document",
    kind,
    filename: file.name,
    size: file.size,
    contentHash,
    extractedText: empty ? "" : normalized.text,
    textCharCount: normalized.charCount,
    truncated: normalized.truncated,
    empty,
  };
}
