import { prisma, Prisma } from "@plawcess/database";

type ActivityForm = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
  category?: string;
  attachments?: unknown[];
};

type StarItem = { activity_index: number; [k: string]: unknown };

type StarAnalysisJson = {
  activities?: StarItem[];
  [k: string]: unknown;
};

export type ImportActivitiesResult =
  | { ok: true; importedCount: number; currentActivityCount: number }
  | { ok: false; status: number; error: string };

// 작년(fromYear) MenteeRecord 의 활동 + 관련 AI 분석 결과를
// 올해(toYear) MenteeRecord 에 append/덮어쓰기 한다.
//
// 정책 (spec: docs/superpowers/specs/2026-05-14-mentee-qualitative-carryover-design.md):
//   - qualitative_activities: 선택된 활동만 끝에 append (인덱스 재할당)
//   - star_analysis.activities[]: 가져온 활동의 STAR 결과를 새 인덱스로 재매핑해 append
//   - star_input_hashes: 작년 hash 를 새 인덱스 키로 머지 (같은 내용이면 재분석 스킵)
//   - 통합 분석 5개 필드(ai_keywords, ai_story_outline, ai_summary_hash,
//     is_ai_analyzed, ai_analyzed_at) 는 작년 값으로 덮어씀.
//     멘티가 import 후 활동을 추가/수정하면 기존 invalidation 로직이
//     ai_summary_hash 변경을 감지해서 is_ai_analyzed=false 로 떨어뜨린다.
export async function importQualitativeActivities(params: {
  userId: string;
  toYear: number;
  fromYear: number;
  activityIndices: number[];
}): Promise<ImportActivitiesResult> {
  const { userId, toYear, fromYear } = params;

  if (fromYear === toYear) {
    return { ok: false, status: 400, error: "같은 연도에서는 가져올 수 없습니다." };
  }

  const sortedUniqueIndices = Array.from(new Set(params.activityIndices))
    .filter((n) => Number.isInteger(n) && n >= 0)
    .sort((a, b) => a - b);
  if (sortedUniqueIndices.length === 0) {
    return { ok: false, status: 400, error: "가져올 활동을 선택해주세요." };
  }

  return prisma.$transaction(async (tx) => {
    const source = await tx.menteeRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: fromYear } },
      select: {
        qualitative_activities: true,
        star_analysis: true,
        star_input_hashes: true,
        ai_keywords: true,
        ai_story_outline: true,
        ai_summary_hash: true,
        is_ai_analyzed: true,
        ai_analyzed_at: true,
      },
    });

    if (!source) {
      return { ok: false, status: 404, error: "해당 연도의 기록이 없습니다." } as const;
    }

    const sourceActivities = (source.qualitative_activities ?? []) as ActivityForm[];
    if (!Array.isArray(sourceActivities) || sourceActivities.length === 0) {
      return { ok: false, status: 400, error: "가져올 활동이 없습니다." } as const;
    }

    const validIndices = sortedUniqueIndices.filter((i) => i < sourceActivities.length);
    if (validIndices.length === 0) {
      return {
        ok: false,
        status: 400,
        error: "선택한 활동 인덱스가 작년 기록 범위를 벗어났습니다.",
      } as const;
    }

    let target = await tx.menteeRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: toYear } },
      select: {
        record_status: true,
        qualitative_activities: true,
        star_analysis: true,
        star_input_hashes: true,
      },
    });

    if (target?.record_status === "submitted") {
      return {
        ok: false,
        status: 403,
        error: "이미 제출된 신청서에는 가져올 수 없습니다.",
      } as const;
    }

    if (!target) {
      await tx.menteeRecord.create({
        data: { user_id: userId, process_year: toYear },
      });
      target = await tx.menteeRecord.findUnique({
        where: { user_id_process_year: { user_id: userId, process_year: toYear } },
        select: {
          record_status: true,
          qualitative_activities: true,
          star_analysis: true,
          star_input_hashes: true,
        },
      });
    }

    const targetActivitiesRaw = target?.qualitative_activities ?? [];
    const targetActivities = (Array.isArray(targetActivitiesRaw) ? targetActivitiesRaw : []) as ActivityForm[];
    const baseLen = targetActivities.length;

    const importedActivities = validIndices.map((i) => sourceActivities[i]);
    const newActivities = [...targetActivities, ...importedActivities];

    const oldToNewIndex = new Map<number, number>();
    validIndices.forEach((oldIdx, k) => oldToNewIndex.set(oldIdx, baseLen + k));

    const sourceStar = (source.star_analysis ?? null) as StarAnalysisJson | null;
    const targetStar = (target?.star_analysis ?? null) as StarAnalysisJson | null;

    const sourceStarItems = Array.isArray(sourceStar?.activities) ? sourceStar!.activities : [];
    const importedStarItems: StarItem[] = [];
    for (const item of sourceStarItems) {
      const newIdx = oldToNewIndex.get(item.activity_index);
      if (newIdx === undefined) continue;
      importedStarItems.push({ ...item, activity_index: newIdx });
    }

    const targetStarItems = Array.isArray(targetStar?.activities) ? targetStar!.activities : [];
    const mergedStarItems = [...targetStarItems, ...importedStarItems];

    // 작년 star_analysis 메타(상위 필드: keywords 등)를 보존하면서 activities 만 머지
    const mergedStarAnalysis: StarAnalysisJson = {
      ...(sourceStar ?? {}),
      activities: mergedStarItems,
    };

    const sourceHashes = (source.star_input_hashes ?? {}) as Record<string, string>;
    const targetHashes = (target?.star_input_hashes ?? {}) as Record<string, string>;
    const mergedHashes: Record<string, string> = { ...targetHashes };
    for (const [oldKey, hash] of Object.entries(sourceHashes)) {
      const oldIdx = parseInt(oldKey, 10);
      if (Number.isNaN(oldIdx)) continue;
      const newIdx = oldToNewIndex.get(oldIdx);
      if (newIdx === undefined) continue;
      mergedHashes[String(newIdx)] = hash;
    }

    await tx.menteeRecord.update({
      where: { user_id_process_year: { user_id: userId, process_year: toYear } },
      data: {
        qualitative_activities: newActivities as unknown as Prisma.InputJsonValue,
        star_analysis: mergedStarAnalysis as unknown as Prisma.InputJsonValue,
        star_input_hashes: mergedHashes as unknown as Prisma.InputJsonValue,
        ai_keywords: (source.ai_keywords ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ai_story_outline: (source.ai_story_outline ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ai_summary_hash: source.ai_summary_hash,
        is_ai_analyzed: source.is_ai_analyzed,
        ai_analyzed_at: source.ai_analyzed_at,
      },
    });

    return {
      ok: true,
      importedCount: validIndices.length,
      currentActivityCount: newActivities.length,
    } as const;
  });
}

// 모달 본문 렌더용 — 지정 연도의 활동 + STAR 분석된 인덱스 목록을 반환
export async function listActivitiesForYear(params: {
  userId: string;
  year: number;
}): Promise<{
  processYear: number;
  activities: ActivityForm[];
  starAnalyzedIndices: number[];
} | null> {
  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: params.userId, process_year: params.year } },
    select: { qualitative_activities: true, star_analysis: true },
  });
  if (!record) return null;

  const activities = (record.qualitative_activities ?? []) as ActivityForm[];
  const star = (record.star_analysis ?? null) as StarAnalysisJson | null;
  const items = Array.isArray(star?.activities) ? star!.activities : [];
  const starAnalyzedIndices = items
    .map((it) => it.activity_index)
    .filter((i): i is number => Number.isInteger(i));

  return {
    processYear: params.year,
    activities: Array.isArray(activities) ? activities : [],
    starAnalyzedIndices,
  };
}

// 진입점 노출 판단용 — 본인의 다른 연도 MenteeRecord 요약
export async function listPreviousYears(params: {
  userId: string;
  excludeYear: number;
}): Promise<Array<{ processYear: number; activityCount: number; hasAiAnalysis: boolean }>> {
  const records = await prisma.menteeRecord.findMany({
    where: { user_id: params.userId, process_year: { not: params.excludeYear } },
    select: {
      process_year: true,
      qualitative_activities: true,
      is_ai_analyzed: true,
    },
    orderBy: { process_year: "desc" },
  });

  return records.map((r) => {
    const acts = (r.qualitative_activities ?? []) as unknown[];
    const count = Array.isArray(acts) ? acts.length : 0;
    return {
      processYear: r.process_year,
      activityCount: count,
      hasAiAnalysis: r.is_ai_analyzed,
    };
  });
}
