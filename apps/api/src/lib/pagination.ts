import { NextRequest, NextResponse } from "next/server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function parsePagination(req: NextRequest):
  | { page: number; limit: number; error?: undefined }
  | { error: NextResponse; page?: undefined; limit?: undefined } {
  const pageRaw = req.nextUrl.searchParams.get("page");
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const page = pageRaw ? parseInt(pageRaw, 10) : 1;
  const limit = limitRaw ? parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  if (!Number.isInteger(page) || page < 1) {
    return { error: NextResponse.json({ error: "page 가 올바르지 않습니다." }, { status: 400 }) };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return { error: NextResponse.json({ error: `limit 은 1~${MAX_LIMIT} 사이여야 합니다.` }, { status: 400 }) };
  }
  return { page, limit };
}
