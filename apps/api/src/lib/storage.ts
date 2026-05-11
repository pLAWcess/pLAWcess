// Supabase Storage 래퍼 — 첨부 원본 파일의 영속 저장소.
// service role key를 사용하므로 server-only. apps/web에서 import 금지.
//
// 무료 티어 egress(5GB/월)를 아끼는 핵심 원칙:
// - PATCH 흐름에서는 메모리에 들고 있는 raw를 Gemini와 Storage 양쪽으로 분기 → 다운로드 0회.
// - 같은 contentHash는 dedup해 한 번만 업로드(upsert:false + 409 무시).
// - 활동 삭제 시에도 다른 활동이 같은 contentHash를 참조 중이면 보존, 미참조 객체만 정리.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "pLAWcess";

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL / SUPABASE_SECRET_KEY 환경변수가 설정되지 않았습니다."
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// 확장자는 dispatchByMime에서 결정 — pdf/docx/jpg/png 중 하나.
export function buildAttachmentPath(
  userId: string,
  processYear: number,
  contentHash: string,
  ext: string
): string {
  return `${userId}/${processYear}/${contentHash}.${ext}`;
}

// contentHash 기반 dedup 업로드.
// 같은 path가 이미 있으면(=같은 파일 재업로드) 409(Duplicate)를 무시한다.
export async function uploadIfAbsent(
  path: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  const { error } = await getClient()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (!error) return;
  // supabase-js의 error.message는 "The resource already exists" / "Duplicate"
  // 등 변동이 있어 statusCode 기반 매칭이 안전.
  const status = (error as { statusCode?: string | number }).statusCode;
  const msg = error.message ?? "";
  const isDuplicate =
    String(status) === "409" || /already exists|duplicate/i.test(msg);
  if (!isDuplicate) throw error;
}

export async function downloadBytes(path: string): Promise<Uint8Array> {
  const { data, error } = await getClient().storage.from(BUCKET).download(path);
  if (error || !data) {
    throw error ?? new Error(`Storage 객체를 가져오지 못했습니다: ${path}`);
  }
  return new Uint8Array(await data.arrayBuffer());
}

// 여러 객체를 한 번에 삭제. 빈 배열은 noop.
// 일부가 이미 없어도 에러 없이 진행(다른 활동이 먼저 정리한 경우 등).
export async function removeMany(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await getClient().storage.from(BUCKET).remove(paths);
  if (error) {
    // 정리 실패가 사용자 흐름을 막진 않도록 log만 남기고 진행.
    console.error("[storage.removeMany] 일부 객체 정리 실패", error, paths);
  }
}

// 확장자 추출 — mimeType이 우선, 없으면 kind에서 유도.
export function extFromKind(kind: "pdf" | "docx" | "jpg" | "png"): string {
  return kind;
}
