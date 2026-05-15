// apps/api/src/app/api/admin/personal-statements/parse/route.ts
//
// POST — 학교 자기소개서 양식(.hwp / .hwpx / .pdf)을 업로드 받아 문항 목록을 Gemini 로 추출.
// 파일은 저장하지 않고 추출 결과만 반환한다. 저장은 기존 PUT 라우트(questions) 가 담당.
//
// query: school (필수)
// body : multipart/form-data, "file" 필드에 업로드 파일

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  detectKindByMagic,
  detectKindByName,
  extractStatementPayload,
  ExtractError,
} from "@/lib/extract-statement-text";
import { parseStatementQuestions } from "@/lib/parse-statement-questions";

// PDF 멀티모달 + Gemini 호출이 길어질 수 있어 default 타임아웃을 넉넉히.
export const maxDuration = 120;
export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const school = req.nextUrl.searchParams.get("school");
  if (!school) {
    return NextResponse.json({ error: "school 파라미터가 필요합니다." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "요청 본문이 multipart/form-data 가 아닙니다." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file 필드가 비어 있습니다." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "빈 파일입니다." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다. 최대 ${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB.` },
      { status: 413 },
    );
  }

  const filename = file instanceof File ? file.name : "upload";
  const bytes = Buffer.from(await file.arrayBuffer());
  console.log(
    "[parse-route] file=%s size=%d school=%s",
    filename,
    bytes.length,
    school,
  );

  const kind = detectKindByMagic(bytes) ?? detectKindByName(filename);
  if (!kind) {
    return NextResponse.json(
      { error: ".hwp / .hwpx / .pdf 파일만 업로드할 수 있습니다." },
      { status: 415 },
    );
  }
  console.log("[parse-route] detected kind=%s", kind);

  let payload;
  try {
    payload = await extractStatementPayload(filename, bytes);
  } catch (e) {
    if (e instanceof ExtractError) {
      console.warn("[parse-route] ExtractError code=%s message=%s", e.code, e.message);
      return NextResponse.json({ error: e.message, code: e.code }, { status: 422 });
    }
    console.error("[parse-route] extract crashed:", e);
    throw e;
  }

  let questions;
  try {
    questions = await parseStatementQuestions(payload);
  } catch (e) {
    console.error("[parse-route] gemini call failed:", e);
    const message = e instanceof Error ? e.message : "문항 추출에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  console.log("[parse-route] success: %d questions", questions.length);
  return NextResponse.json({ school, questions });
}
