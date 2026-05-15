// apps/api/src/app/api/mentor/mentees/[matchId]/personal-statement/[group]/route.ts
//
// GET — 매칭된 멘티의 가/나군 자기소개서(.hwp / .hwpx) 다운로드.
// 권한: 로그인 멘토 본인이 mentor_application 의 user 여야 하고, 매칭이 finalized 이며,
//       멘티의 share_statement 가 true 여야 한다.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

type Group = "ga" | "na";

const CFBF_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function detectExt(bytes: Buffer): "hwp" | "hwpx" {
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(ZIP_MAGIC)) return "hwpx";
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(CFBF_MAGIC)) return "hwp";
  // 시그니처 미스매치인 레거시 데이터 — 확장자만 hwp 로 fallback.
  return "hwp";
}

function buildFilename(school: string | null, group: Group, ext: "hwp" | "hwpx"): string {
  const groupLabel = group === "ga" ? "가군" : "나군";
  const base = school?.trim() ? `${school.trim()}_${groupLabel}_자기소개서` : `자기소개서_${groupLabel}`;
  return `${base}.${ext}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; group: string }> },
) {
  const userId = getTokenFromCookie(req)?.user_id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { matchId, group: groupRaw } = await params;
  if (groupRaw !== "ga" && groupRaw !== "na") {
    return NextResponse.json({ error: "group 은 ga 또는 na 여야 합니다." }, { status: 400 });
  }
  const group = groupRaw as Group;

  const match = await prisma.matchResult.findUnique({
    where: { match_id: matchId },
    select: {
      is_finalized: true,
      mentor_application: { select: { user_id: true } },
      mentee_application: {
        select: {
          mentee_record: {
            select: {
              share_statement: true,
              target_school_ga: true,
              target_school_na: true,
              personal_statement_hwp_ga: true,
              personal_statement_hwp_na: true,
            },
          },
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "매칭 정보를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!match.is_finalized || match.mentor_application.user_id !== userId) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const record = match.mentee_application.mentee_record;
  if (!record || !record.share_statement) {
    return NextResponse.json({ error: "멘티가 자기소개서를 비공개로 설정했습니다." }, { status: 403 });
  }

  const raw =
    group === "ga" ? record.personal_statement_hwp_ga : record.personal_statement_hwp_na;
  if (!raw) {
    return NextResponse.json({ error: "첨부된 자기소개서 파일이 없습니다." }, { status: 404 });
  }

  const bytes = Buffer.from(raw);
  const ext = detectExt(bytes);
  const school = group === "ga" ? record.target_school_ga : record.target_school_na;
  const filename = buildFilename(school, group, ext);

  // 한글 파일명은 RFC 5987 filename* 로 인코딩. 호환성 위해 ASCII filename 도 함께 제공.
  const asciiFallback = `mentee_statement_${group}.${ext}`;
  const encoded = encodeURIComponent(filename);

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/x-hwp",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
    },
  });
}
