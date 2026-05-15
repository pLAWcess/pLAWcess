// apps/api/src/lib/extract-statement-text.ts
//
// 학교 자기소개서 양식 파일에서 본문 텍스트(또는 Gemini 입력용 페이로드)를 만든다.
// 결과는 두 갈래:
//   - kind: "text" — HWP/HWPX. 본문 텍스트를 prompt 인라인으로 넣는다.
//   - kind: "pdf"  — PDF. Gemini 멀티모달에 inlineData(application/pdf, base64) 그대로 전달.
//
// HWP 5.x: cfb 로 OLE 파싱 → BodyText/Section* 스트림 추출 → 압축이면 zlib raw inflate
//   → UTF-16LE 청크에서 한글/영문/숫자/구두점만 골라 정리.
//   완벽한 레코드 파서가 아닌 휴리스틱이지만 양식의 문항 텍스트 추출 정도엔 충분하다.
//
// HWPX: ZIP → Contents/section*.xml 의 <hp:t>/<hp:run>/<hp:p> 등 텍스트 노드만 모은다.
//   네임스페이스 prefix 가 변할 수 있어 태그명 정규식으로 처리.

import * as cfb from "cfb";
import JSZip from "jszip";
import { inflateRawSync } from "zlib";

export type ExtractedPayload =
  | { kind: "text"; text: string; sourceLabel: string }
  | { kind: "pdf"; base64: string; sourceLabel: string };

export type SupportedFileKind = "hwp" | "hwpx" | "pdf";

const HWP_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

export function detectKindByMagic(bytes: Buffer): SupportedFileKind | null {
  if (bytes.length >= 5 && bytes.subarray(0, 5).equals(PDF_MAGIC)) return "pdf";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(HWP_MAGIC)) return "hwp";
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(ZIP_MAGIC)) return "hwpx";
  return null;
}

export function detectKindByName(filename: string): SupportedFileKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".hwpx")) return "hwpx";
  if (lower.endsWith(".hwp")) return "hwp";
  return null;
}

// ----------------------------------------------------------------
// HWP 5.x
// ----------------------------------------------------------------

function isFileHeaderCompressed(headerBytes: Uint8Array): boolean {
  // FileHeader 256바이트 중 offset 36 의 4바이트 properties (LE).
  // bit 0 = compressed, bit 1 = encrypted (지원 안 함), 등.
  if (headerBytes.length < 40) return false;
  const props =
    headerBytes[36] |
    (headerBytes[37] << 8) |
    (headerBytes[38] << 16) |
    (headerBytes[39] << 24);
  return (props & 0x01) === 0x01;
}

function normalizeText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

// HWP 5.x BodyText/Section# 스트림은 4바이트 레코드 헤더 + body 의 시퀀스다.
//   header (LE u32) = (tag:10 bits) | (level:10 bits) | (size:12 bits)
//   size == 0xFFF (4095) 이면 다음 4바이트(LE u32)가 실제 size.
// 본문 텍스트는 HWPTAG_PARA_TEXT (= HWPTAG_BEGIN(0x010) + 51 = 0x043) 레코드의 body 에만 들어 있다.
// 다른 레코드(스타일, 라인 세그, 컨트롤 등)를 통째로 디코드하면 메타바이트가 한자처럼 보이는 잡음이 된다.
const HWPTAG_PARA_TEXT = 0x043;

// PARA_TEXT body 안의 인라인 컨트롤 캐릭터. 코드포인트가 0x01~0x1F 사이이고
// 아래 목록에 들어있으면 자신 포함 8 wchar (16 bytes) 의 인라인 데이터를 동반한다.
// — 따라서 해당 컨트롤을 만나면 추가 7 wchar (14 bytes) 를 건너뛴다.
const INLINE_EXTENDED_CONTROL = new Set<number>([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0b, 0x0c, 0x0e, 0x0f, 0x10, 0x11, 0x12,
  0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x1c, 0x1d, 0x1e, 0x1f,
]);

function decodeParaText(body: Buffer): string {
  const out: string[] = [];
  let i = 0;
  while (i + 1 < body.length) {
    const code = body[i] | (body[i + 1] << 8);
    i += 2;

    // 줄바꿈류
    if (code === 0x000a || code === 0x000d) {
      out.push("\n");
      continue;
    }
    // 컨트롤 캐릭터
    if (code < 0x20) {
      if (INLINE_EXTENDED_CONTROL.has(code)) {
        // 추가 7 wchar (14 bytes) 를 동반하므로 건너뛴다.
        i += 14;
      }
      // 0x00 등 기타 컨트롤은 그냥 무시
      continue;
    }
    // 그 외는 그대로 문자
    out.push(String.fromCharCode(code));
  }
  return out.join("");
}

function extractHwpText(bytes: Buffer): string {
  // cfb는 ArrayBuffer / Uint8Array 모두 받는다.
  const container = cfb.read(bytes, { type: "buffer" });

  let header: Uint8Array | null = null;
  const sectionStreams: Uint8Array[] = [];

  for (const entry of container.FileIndex) {
    if (!entry || !entry.name) continue;
    const fullName = entry.name;
    if (fullName === "FileHeader" && entry.content) {
      header = toUint8(entry.content);
    } else if (
      fullName.startsWith("Section") &&
      entry.content &&
      entry.type === 2 // stream
    ) {
      sectionStreams.push(toUint8(entry.content));
    }
  }

  if (sectionStreams.length === 0) return "";

  const compressed = header ? isFileHeaderCompressed(header) : true;

  const chunks: string[] = [];
  for (const stream of sectionStreams) {
    let raw: Buffer;
    if (compressed) {
      try {
        raw = inflateRawSync(Buffer.from(stream));
      } catch {
        // 압축 추정이 틀렸을 수도 있으므로 raw 로도 한 번 시도
        raw = Buffer.from(stream);
      }
    } else {
      raw = Buffer.from(stream);
    }

    let i = 0;
    while (i + 4 <= raw.length) {
      const headerWord = raw.readUInt32LE(i);
      const tag = headerWord & 0x3ff;
      let size = (headerWord >> 20) & 0xfff;
      i += 4;
      if (size === 0xfff) {
        if (i + 4 > raw.length) break;
        size = raw.readUInt32LE(i);
        i += 4;
      }
      if (size < 0 || i + size > raw.length) break;

      if (tag === HWPTAG_PARA_TEXT) {
        const body = raw.subarray(i, i + size);
        const text = decodeParaText(body);
        if (text.length > 0) chunks.push(text);
      }
      i += size;
    }
  }
  return normalizeText(chunks.join("\n"));
}

function toUint8(content: unknown): Uint8Array {
  if (content instanceof Uint8Array) return content;
  if (Array.isArray(content)) return Uint8Array.from(content as number[]);
  if (Buffer.isBuffer(content)) return new Uint8Array(content);
  throw new Error("cfb 스트림 컨텐츠를 읽을 수 없습니다.");
}

// ----------------------------------------------------------------
// HWPX
// ----------------------------------------------------------------

async function extractHwpxText(bytes: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const sectionFiles = Object.keys(zip.files)
    .filter((p) => /Contents\/section\d+\.xml$/i.test(p))
    .sort();
  if (sectionFiles.length === 0) {
    // 일부 hwpx 는 대소문자/경로가 다를 수 있어 fallback.
    const xmls = Object.keys(zip.files).filter((p) => p.toLowerCase().endsWith(".xml"));
    sectionFiles.push(...xmls);
  }

  const chunks: string[] = [];
  for (const path of sectionFiles) {
    const file = zip.files[path];
    if (!file || file.dir) continue;
    const xml = await file.async("string");
    chunks.push(stripXmlToText(xml));
  }
  return normalizeText(chunks.join("\n"));
}

function stripXmlToText(xml: string): string {
  // XML 엔티티 디코드 후, 모든 태그를 공백으로 치환.
  // 단락 단위 줄바꿈 힌트가 될 만한 태그는 \n 으로.
  const decoded = xml
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return decoded
    .replace(/<[^:>\s]*:p\b[^>]*>/g, "\n")
    .replace(/<[^:>\s]*:lineBreak\b[^>]*\/?>/g, "\n")
    .replace(/<[^>]+>/g, " ");
}

// ----------------------------------------------------------------
// 진입점
// ----------------------------------------------------------------

export async function extractStatementPayload(
  filename: string,
  bytes: Buffer,
): Promise<ExtractedPayload> {
  const kind = detectKindByMagic(bytes) ?? detectKindByName(filename);
  if (!kind) {
    throw new ExtractError("UNSUPPORTED", "지원하지 않는 파일 형식입니다 (.hwp / .hwpx / .pdf 만 가능).");
  }

  if (kind === "pdf") {
    return { kind: "pdf", base64: bytes.toString("base64"), sourceLabel: filename };
  }

  let text = "";
  if (kind === "hwp") {
    try {
      text = extractHwpText(bytes);
    } catch (e) {
      throw new ExtractError(
        "HWP_EXTRACT_FAILED",
        "이 .hwp 파일에서 텍스트를 추출하지 못했어요. PDF로 변환 후 재시도해주세요.",
        e instanceof Error ? e : undefined,
      );
    }
  } else {
    try {
      text = await extractHwpxText(bytes);
    } catch (e) {
      throw new ExtractError(
        "HWPX_EXTRACT_FAILED",
        "이 .hwpx 파일에서 텍스트를 추출하지 못했어요. PDF로 변환 후 재시도해주세요.",
        e instanceof Error ? e : undefined,
      );
    }
  }

  if (text.length < 20) {
    throw new ExtractError(
      "EMPTY_TEXT",
      "파일에서 의미 있는 텍스트를 찾지 못했어요. PDF로 변환 후 재시도해주세요.",
    );
  }
  // LLM 프롬프트가 너무 커지지 않게 제한 (양식은 보통 수천 자 안쪽).
  const truncated = text.length > 30_000 ? text.slice(0, 30_000) : text;
  return { kind: "text", text: truncated, sourceLabel: filename };
}

export class ExtractError extends Error {
  readonly code: string;
  constructor(code: string, message: string, cause?: Error) {
    super(message);
    this.code = code;
    if (cause) this.cause = cause;
  }
}
