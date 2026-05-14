// 회원가입 재학증명서 처리 — Supabase Storage 업로드 + 메타 추출.
// 자소서 첨부(attachments.ts) 와 정책·흐름이 달라 별도 모듈로 격리.
//
// 정책:
// - 파일 1개, PDF/JPG/PNG, 최대 4MB
// - 경로: enrollment-certs/{userId}/{contentHash}.{ext}  (qualitative 와 구분)
// - 텍스트 추출 없음, Gemini 전송 없음 (저장만)

import { createHash } from "node:crypto";

import { uploadIfAbsent } from "./storage";

export const CERT_MAX_BYTES = 4 * 1024 * 1024;

export const CERT_MIME_TO_EXT: Record<string, "pdf" | "jpg" | "png"> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export type ProcessedCert = {
  storagePath: string;
  filename: string;
  mime: string;
  size: number;
  uploadedAt: Date;
};

// ----------------------------------------------------------------
// 검증 — 위반 시 한국어 사유, 통과 시 null
// ----------------------------------------------------------------
export function validateCertFile(file: File | null | undefined): string | null {
  if (!file) return "재학증명서를 첨부해주세요.";
  if (file.size === 0) return "재학증명서 파일이 비어 있습니다.";
  if (file.size > CERT_MAX_BYTES) {
    return `재학증명서는 ${CERT_MAX_BYTES / 1024 / 1024}MB 이하만 가능합니다.`;
  }
  if (!CERT_MIME_TO_EXT[file.type]) {
    return "재학증명서는 PDF/JPG/PNG 파일만 업로드 가능합니다.";
  }
  return null;
}

// ----------------------------------------------------------------
// 저장 경로 — Supabase Storage 의 pLAWcess 버킷 기준 상대 경로
// ----------------------------------------------------------------
export function buildCertPath(userId: string, contentHash: string, ext: string): string {
  return `enrollment-certs/${userId}/${contentHash}.${ext}`;
}

// ----------------------------------------------------------------
// 업로드 — bytes 읽기 → SHA-256 → uploadIfAbsent → 메타 반환
// 호출 측은 prisma.user.create 실패 시 removeMany([storagePath]) 로 정리해야 한다.
// ----------------------------------------------------------------
export async function uploadCert(userId: string, file: File): Promise<ProcessedCert> {
  const ext = CERT_MIME_TO_EXT[file.type];
  if (!ext) {
    // validateCertFile 을 호출 측이 먼저 거쳤다면 도달 불가, defense-in-depth
    throw new Error("지원하지 않는 재학증명서 형식입니다.");
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(buf).digest("hex");
  const storagePath = buildCertPath(userId, contentHash, ext);

  await uploadIfAbsent(storagePath, buf, file.type);

  return {
    storagePath,
    filename: file.name,
    mime: file.type,
    size: file.size,
    uploadedAt: new Date(),
  };
}
