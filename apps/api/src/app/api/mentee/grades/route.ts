import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth";
import { scrapeGrades } from "@/lib/scrapeGrades";

export const maxDuration = 300; // Vercel Pro: 최대 300초

const ID_PATTERN = /^[A-Za-z0-9._@-]{1,32}$/;
const PW_MAX_LEN = 128;
const RATE_LIMIT_WINDOW_MS = 60_000;

const lastCallByUser = new Map<string, number>();

function validateCredentials(id: unknown, pw: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof id !== "string" || typeof pw !== "string") {
    return { ok: false, error: "ID와 비밀번호를 입력해주세요." };
  }
  if (!ID_PATTERN.test(id)) {
    return { ok: false, error: "ID 형식이 올바르지 않습니다." };
  }
  if (pw.length < 1 || pw.length > PW_MAX_LEN) {
    return { ok: false, error: "비밀번호 길이가 올바르지 않습니다." };
  }
  if (/[\x00-\x1f]/.test(pw)) {
    return { ok: false, error: "비밀번호에 허용되지 않은 문자가 포함되어 있습니다." };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const token = getTokenFromCookie(req);
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const now = Date.now();
  const last = lastCallByUser.get(token.user_id) ?? 0;
  if (now - last < RATE_LIMIT_WINDOW_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: `잠시 후 다시 시도해주세요. (${retryAfter}초)` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  lastCallByUser.set(token.user_id, now);

  let body: { id?: unknown; pw?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const validation = validateCredentials(body.id, body.pw);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await scrapeGrades(body.id as string, body.pw as string);
    if (result === null) {
      return NextResponse.json(
        { error: "로그인에 실패했습니다. ID/PW를 확인해주세요." },
        { status: 401 },
      );
    }
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "성적을 불러올 수 없습니다.", debug: result.debugText, summary: result.summary },
        { status: 422 },
      );
    }
    return NextResponse.json({ rows: result.rows, summary: result.summary, debug: result.debugText });
  } catch (e) {
    console.error("scrapeGrades error:", e);
    return NextResponse.json(
      { error: "성적 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
