// apps/api/src/app/api/mentee/share-settings/route.ts
// #233 — 멘티가 멘토에게 공개할 영역을 설정/조회한다.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

type ShareSettings = {
  basicInfo: boolean;
  quantitative: boolean;
  qualitative: boolean;
  statement: boolean;
  requests: boolean;
};

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

// 매칭 발표일이 지났으면 수정 금지 (멘토가 이미 보고 있을 수 있음).
async function isLocked(processYear: number): Promise<boolean> {
  const cycle = await prisma.cycleSchedule.findUnique({
    where: { process_year: processYear },
    select: { match_announce_date: true },
  });
  const announceDate = cycle?.match_announce_date;
  if (!announceDate) return false;
  return new Date().getTime() >= announceDate.getTime();
}

// ----------------------------------------------------------------
// GET /api/mentee/share-settings?year=2026
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const processYear = getProcessYear(req);

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: {
      share_basic_info: true,
      share_quantitative: true,
      share_qualitative: true,
      share_statement: true,
      share_requests: true,
    },
  });

  // 신청 기록 없으면 default(전부 공개) 로 응답
  const settings: ShareSettings = record
    ? {
        basicInfo: record.share_basic_info,
        quantitative: record.share_quantitative,
        qualitative: record.share_qualitative,
        statement: record.share_statement,
        requests: record.share_requests,
      }
    : {
        basicInfo: true,
        quantitative: true,
        qualitative: true,
        statement: true,
        requests: true,
      };

  const locked = await isLocked(processYear);
  return NextResponse.json({ settings, locked });
}

// ----------------------------------------------------------------
// PATCH /api/mentee/share-settings?year=2026
// Body: { settings: Partial<ShareSettings> }
// ----------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const processYear = getProcessYear(req);

  if (await isLocked(processYear)) {
    return NextResponse.json(
      { error: "매칭 발표 이후에는 공개 설정을 수정할 수 없습니다." },
      { status: 403 },
    );
  }

  let body: { settings?: Partial<ShareSettings> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }
  const s = body.settings ?? {};

  const data: Record<string, boolean> = {};
  if (typeof s.basicInfo === "boolean") data.share_basic_info = s.basicInfo;
  if (typeof s.quantitative === "boolean") data.share_quantitative = s.quantitative;
  if (typeof s.qualitative === "boolean") data.share_qualitative = s.qualitative;
  if (typeof s.statement === "boolean") data.share_statement = s.statement;
  if (typeof s.requests === "boolean") data.share_requests = s.requests;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 });
  }

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: { record_id: true },
  });
  if (!record) {
    return NextResponse.json({ error: "신청 기록을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.menteeRecord.update({
    where: { record_id: record.record_id },
    data,
    select: {
      share_basic_info: true,
      share_quantitative: true,
      share_qualitative: true,
      share_statement: true,
      share_requests: true,
    },
  });

  return NextResponse.json({
    settings: {
      basicInfo: updated.share_basic_info,
      quantitative: updated.share_quantitative,
      qualitative: updated.share_qualitative,
      statement: updated.share_statement,
      requests: updated.share_requests,
    } satisfies ShareSettings,
  });
}
