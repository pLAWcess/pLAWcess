// POST /api/admin/matchings/save?year=YYYY — 매칭 결과 저장.
//
// mode='draft'  : 임시저장. 행마다의 admin 의도(editing/confirmed/rejected) 를 기록하되 is_finalized=false.
// mode='confirm': 매칭 확정. 모든 행이 'confirmed' 또는 'rejected' 이어야 진행 가능. confirmed 행은
//                 is_finalized=true 로 저장 → 멘토 페이지에서 멘티가 노출된다.
//
// 어느 모드든 해당 process_year 의 기존 MatchResult 를 통째로 교체.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { resolveProcessYear } from "@/lib/active-cycle";

type SaveMode = "draft" | "confirm";
type ClientStatus = "editing" | "confirmed" | "rejected";

type SaveRow = {
  menteeApplicationId: string;
  mentorApplicationId: string;
  aiScore: number;
  aiReason: string;
  status: ClientStatus;
};

type SaveBody = {
  mode: SaveMode;
  rows: SaveRow[];
};

function isValidBody(b: unknown): b is SaveBody {
  if (!b || typeof b !== "object") return false;
  const x = b as Record<string, unknown>;
  if (x.mode !== "draft" && x.mode !== "confirm") return false;
  if (!Array.isArray(x.rows)) return false;
  return x.rows.every((r) => {
    if (!r || typeof r !== "object") return false;
    const row = r as Record<string, unknown>;
    return (
      typeof row.menteeApplicationId === "string" &&
      typeof row.mentorApplicationId === "string" &&
      typeof row.aiScore === "number" &&
      typeof row.aiReason === "string" &&
      (row.status === "editing" || row.status === "confirmed" || row.status === "rejected")
    );
  });
}

// 클라이언트 의도 → DB 컬럼. is_finalized 는 confirm 모드의 confirmed 행에서만 true.
function mapRow(row: SaveRow, mode: SaveMode) {
  // match_status 는 admin 의도(intent) 를 그대로 round-trip 시키기 위해 사용:
  //   editing   → 'draft'      (아직 검토 중)
  //   confirmed → 'finalized'  (이 멘토로 확정하기로 마음먹음)
  //   rejected  → 'cancelled'  (이 매칭은 안 쓸 것)
  // is_finalized 는 매칭이 실제로 시스템상 lock-in 되었는지를 가리킨다 (의도와 별개).
  const statusMap: Record<ClientStatus, "draft" | "finalized" | "cancelled"> = {
    editing: "draft",
    confirmed: "finalized",
    rejected: "cancelled",
  };
  const isFinalized = mode === "confirm" && row.status === "confirmed";
  return {
    match_status: statusMap[row.status],
    is_finalized: isFinalized,
  };
}

export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;
  const adminUserId = guard.payload.user_id;

  const yr = await resolveProcessYear(req);
  if (yr.error) return yr.error;
  const year = yr.year;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON 이 아닙니다." }, { status: 400 });
  }
  if (!isValidBody(body)) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  // confirm 모드는 모든 행이 명시적으로 confirmed/rejected 여야 진행. editing 이 남아있으면 막는다.
  if (body.mode === "confirm") {
    const editingCount = body.rows.filter((r) => r.status === "editing").length;
    if (editingCount > 0) {
      return NextResponse.json(
        {
          error: `${editingCount}명이 아직 '수정중' 상태입니다. 확정하려면 모든 행을 '확정' 또는 '거절' 로 표시해 주세요.`,
          editingCount,
        },
        { status: 400 },
      );
    }
  }

  // 동일 멘티가 중복으로 들어왔는지 점검 (클라이언트 버그 방지).
  const seen = new Set<string>();
  for (const r of body.rows) {
    if (seen.has(r.menteeApplicationId)) {
      return NextResponse.json(
        { error: `중복된 멘티 application_id 가 포함되어 있습니다.` },
        { status: 400 },
      );
    }
    seen.add(r.menteeApplicationId);
  }

  // 트랜잭션: 해당 사이클의 기존 결과를 통째로 교체.
  const dataRows = body.rows.map((r) => {
    const mapped = mapRow(r, body.mode);
    return {
      process_year: year,
      mentee_application_id: r.menteeApplicationId,
      mentor_application_id: r.mentorApplicationId,
      ai_score: r.aiScore,
      ai_reason: r.aiReason,
      match_status: mapped.match_status,
      is_finalized: mapped.is_finalized,
      created_by: adminUserId,
    };
  });

  await prisma.$transaction([
    prisma.matchResult.deleteMany({ where: { process_year: year } }),
    prisma.matchResult.createMany({ data: dataRows }),
  ]);

  const finalizedCount = dataRows.filter((r) => r.is_finalized).length;
  return NextResponse.json({
    mode: body.mode,
    year,
    saved: dataRows.length,
    finalized: finalizedCount,
  });
}
