import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { hashAnalysisInput, buildSingleAnalysisHash } from "@/lib/hash";
import { collectFilesByActivity, processActivityAttachments, MAX_FILES_PER_ACTIVITY, MAX_TOTAL_BYTES_PER_REQUEST, type StoredAttachment } from "@/lib/attachments";
import { runSingleAnalysisInPlace } from "@/lib/qualitativeAnalysis";
import type { StarItem } from "@/lib/gemini";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

const CAREER_LABEL: Record<string, string> = {
  lawyer: "변호사",
  prosecutor: "검사",
  judge: "판사",
};
const CAREER_ENUM: Record<string, "lawyer" | "prosecutor" | "judge"> = {
  변호사: "lawyer",
  검사: "prosecutor",
  판사: "judge",
};

type ActivityForm = {
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
  attachments?: StoredAttachment[];
};

type StarAnalysisJson = {
  activities?: Array<{ activity_index: number; [k: string]: unknown }>;
  [k: string]: unknown;
};

const SELECT_FIELDS = {
  career_goal: true,
  qualitative_activities: true,
  star_analysis: true,
  ai_keywords: true,
  ai_story_outline: true,
  is_ai_analyzed: true,
  ai_analyzed_at: true,
  ai_summary_hash: true,
  star_input_hashes: true,
} as const;

type FullRecord = {
  career_goal: string | null;
  qualitative_activities: Prisma.JsonValue | null;
  star_analysis: Prisma.JsonValue | null;
  ai_keywords: Prisma.JsonValue | null;
  ai_story_outline: Prisma.JsonValue | null;
  is_ai_analyzed: boolean;
  ai_analyzed_at: Date | null;
  ai_summary_hash: string | null;
  star_input_hashes: Prisma.JsonValue | null;
} | null;

function computeActivitiesAnalyzed(
  activities: ActivityForm[],
  hashes: Record<string, string>
): boolean[] {
  return activities.map((a, i) => {
    const stored = hashes[String(i)];
    if (!stored) return false;
    const current = buildSingleAnalysisHash(a, i, a.attachments);
    return stored === current;
  });
}

function computeSummaryOutdated(
  activities: ActivityForm[],
  careerGoal: string | null,
  starAnalysis: StarAnalysisJson | null,
  storedHash: string | null
): boolean {
  if (!storedHash) return true;
  // 통합 분석 hash는 hashAnalysisInput을 직접 쓰던 기존 형태 유지
  const current = hashAnalysisInput({
    activities,
    career_goal: careerGoal,
    star_analysis: starAnalysis ?? { activities: [] },
  });
  return current !== storedHash;
}

function buildResponse(record: FullRecord, extras?: { inlineStar?: StarItem; inlineSkipped?: boolean }) {
  const activities = (record?.qualitative_activities ?? []) as ActivityForm[];
  const hashes = (record?.star_input_hashes ?? {}) as Record<string, string>;
  const starAnalysis = (record?.star_analysis ?? null) as StarAnalysisJson | null;

  return {
    careerGoal: record?.career_goal ? CAREER_LABEL[record.career_goal] ?? "" : "",
    activities,
    analysis: {
      isAnalyzed: record?.is_ai_analyzed ?? false,
      analyzedAt: record?.ai_analyzed_at?.toISOString() ?? null,
      starAnalysis,
      aiKeywords: (record?.ai_keywords ?? null) as Prisma.JsonValue,
      storyOutline: (record?.ai_story_outline ?? null) as Prisma.JsonValue,
      summaryOutdated: computeSummaryOutdated(
        activities,
        record?.career_goal ?? null,
        starAnalysis,
        record?.ai_summary_hash ?? null
      ),
      activitiesAnalyzed: computeActivitiesAnalyzed(activities, hashes),
    },
    inlineStar: extras?.inlineStar,
    inlineSkipped: extras?.inlineSkipped,
  };
}

// ----------------------------------------------------------------
// GET /api/mentee/qualitative?year=2026학년도
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(record));
}

// ----------------------------------------------------------------
// PATCH /api/mentee/qualitative?year=2026학년도
//
// 두 가지 Content-Type 지원:
//   - application/json
//       Body: { careerGoal?: string, activities?: ActivityForm[] }
//       단순 저장만. 분석 호출 없음.
//   - multipart/form-data
//       Field "payload": JSON.stringify({ careerGoal?, activities?, analyze_index? })
//       Field "files_${activityIndex}_${fileIndex}": File
//       활동별로 첨부 처리(문서 텍스트 추출, 이미지 base64 보존) → 활동 attachments 갱신.
//       analyze_index가 있으면 곧바로 단일 STAR 분석까지 실행해서 응답에 inlineStar 포함.
// ----------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const exists = await prisma.user.findUnique({ where: { user_id: userId }, select: { user_id: true } });
  if (!exists) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return handleMultipartPatch(req, userId, processYear);
  }
  return handleJsonPatch(req, userId, processYear);
}

// ----------------------------------------------------------------
// JSON PATCH — 기존 동작 (텍스트만 저장)
// ----------------------------------------------------------------
async function handleJsonPatch(req: NextRequest, userId: string, processYear: number) {
  let body: { careerGoal?: string; activities?: ActivityForm[]; reorderMapping?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.careerGoal !== undefined) {
    updateData.career_goal = body.careerGoal ? CAREER_ENUM[body.careerGoal] ?? null : null;
  }
  if (body.activities !== undefined) {
    updateData.qualitative_activities = body.activities;
  }

  // reorderMapping이 있으면 star_analysis와 star_input_hashes 재매핑
  if (body.reorderMapping && body.reorderMapping.length > 0) {
    const mapping = body.reorderMapping; // mapping[newIdx] = oldIdx
    // oldIdx -> newIdx 역방향 맵
    const reverseMap = new Map<number, number>();
    mapping.forEach((oldIdx, newIdx) => reverseMap.set(oldIdx, newIdx));

    const existingRecord = await prisma.menteeRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      select: { star_analysis: true, star_input_hashes: true },
    });

    if (existingRecord) {
      const oldStar = existingRecord.star_analysis as StarAnalysisJson | null;
      if (oldStar?.activities && Array.isArray(oldStar.activities)) {
        const remapped = oldStar.activities.map((s) => ({
          ...s,
          activity_index: reverseMap.has(s.activity_index)
            ? reverseMap.get(s.activity_index)!
            : s.activity_index,
        }));
        updateData.star_analysis = { ...oldStar, activities: remapped };
      }

      const oldHashes = (existingRecord.star_input_hashes ?? {}) as Record<string, string>;
      const newHashes: Record<string, string> = {};
      for (const [k, v] of Object.entries(oldHashes)) {
        const oldIdx = parseInt(k, 10);
        if (Number.isNaN(oldIdx)) continue;
        const newIdx = reverseMap.get(oldIdx);
        if (newIdx !== undefined) newHashes[String(newIdx)] = v;
      }
      updateData.star_input_hashes = newHashes;
    }
  }

  const record = await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    create: { user_id: userId, process_year: processYear, ...updateData },
    update: updateData,
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(record));
}

// ----------------------------------------------------------------
// Multipart PATCH — 첨부 파일 처리 + 인라인 분석
// ----------------------------------------------------------------
async function handleMultipartPatch(req: NextRequest, userId: string, processYear: number) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "multipart 요청을 해석하지 못했습니다." }, { status: 400 });
  }

  const payloadRaw = form.get("payload");
  if (typeof payloadRaw !== "string") {
    return NextResponse.json({ error: "payload 필드가 필요합니다." }, { status: 400 });
  }

  let payload: { careerGoal?: string; activities?: ActivityForm[]; analyze_index?: number };
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return NextResponse.json({ error: "payload JSON 파싱 실패." }, { status: 400 });
  }

  const baseActivities: ActivityForm[] = Array.isArray(payload.activities) ? payload.activities : [];
  const filesByIdx = collectFilesByActivity(form);

  // 한 요청 본문 사전 가드 — Vercel body limit(4.5MB) 안에 들어가도록.
  // Vercel 게이트웨이가 차단하기 전에 자체 차단해 친절한 에러 반환.
  // 활동당 합계 한도는 없다. 4MB를 넘는 신규 첨부는 프론트가 직렬 PATCH로 청크 분할해서 보낸다.
  for (const [idx, files] of filesByIdx.entries()) {
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_TOTAL_BYTES_PER_REQUEST) {
      const limitMb = MAX_TOTAL_BYTES_PER_REQUEST / 1024 / 1024;
      return NextResponse.json(
        {
          error: `한 요청 본문 한도(${limitMb}MB)를 초과합니다 — 활동 ${idx + 1}의 이번 배치 합계 ${(total / 1024 / 1024).toFixed(1)}MB. 파일을 더 작게 나누거나 일부를 제거해주세요.`,
        },
        { status: 413 }
      );
    }
  }

  const allErrors: string[] = [];
  const mergedActivities: ActivityForm[] = [];
  // analyze_index 활동의 새 이미지(메모리만 거치는 base64)를 따로 모은다
  let imagesForAnalyze: { filename: string; mimeType: string; base64: string }[] = [];

  for (let i = 0; i < baseActivities.length; i++) {
    const a = baseActivities[i];
    const newFiles = filesByIdx.get(i) ?? [];
    if (newFiles.length === 0) {
      mergedActivities.push(a);
      continue;
    }

    const existing = (a.attachments ?? []).slice();
    const totalAfter = existing.length + newFiles.length;
    if (totalAfter > MAX_FILES_PER_ACTIVITY) {
      allErrors.push(
        `활동 ${i + 1}: 첨부는 활동당 최대 ${MAX_FILES_PER_ACTIVITY}개입니다 (기존 ${existing.length}, 신규 ${newFiles.length}).`
      );
    }

    const { result, errors } = await processActivityAttachments(newFiles);
    for (const e of errors) allErrors.push(`활동 ${i + 1}: ${e}`);

    const merged: StoredAttachment[] = [...existing, ...result.stored].slice(0, MAX_FILES_PER_ACTIVITY);
    mergedActivities.push({ ...a, attachments: merged });

    if (payload.analyze_index === i) {
      imagesForAnalyze = result.images;
    }
  }

  const updateData: Record<string, unknown> = {
    qualitative_activities: mergedActivities,
  };
  if (payload.careerGoal !== undefined) {
    updateData.career_goal = payload.careerGoal ? CAREER_ENUM[payload.careerGoal] ?? null : null;
  }

  await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    create: { user_id: userId, process_year: processYear, ...updateData },
    update: updateData,
  });

  // 인라인 분석
  let inlineStar: StarItem | undefined;
  let inlineSkipped: boolean | undefined;
  if (
    typeof payload.analyze_index === "number" &&
    payload.analyze_index >= 0 &&
    payload.analyze_index < mergedActivities.length
  ) {
    try {
      const r = await runSingleAnalysisInPlace({
        userId,
        processYear,
        index: payload.analyze_index,
        images: imagesForAnalyze,
      });
      if (r.kind === "hit") {
        inlineStar = r.star;
        inlineSkipped = true;
      } else if (r.kind === "computed") {
        inlineStar = r.star;
        inlineSkipped = false;
      }
    } catch (err) {
      console.error("[qualitative PATCH multipart] 인라인 분석 실패", err);
      // 저장은 이미 끝났으니 분석 실패만 알린다 (활동은 저장된 상태)
      const updated = await prisma.menteeRecord.findUnique({
        where: { user_id_process_year: { user_id: userId, process_year: processYear } },
        select: SELECT_FIELDS,
      });
      return NextResponse.json(
        {
          ...buildResponse(updated),
          inlineError: "AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.",
          attachmentErrors: allErrors,
        },
        { status: 200 }
      );
    }
  }

  const updated = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  return NextResponse.json({
    ...buildResponse(updated, { inlineStar, inlineSkipped }),
    attachmentErrors: allErrors.length > 0 ? allErrors : undefined,
  });
}

// ----------------------------------------------------------------
// DELETE /api/mentee/qualitative?year=2026학년도&index=N
// 활동 배열에서 해당 index 제거 + STAR 분석에서도 제거하고 후속 인덱스 -1 시프트
// star_input_hashes 도 동일하게 시프트
// ai_summary_hash 무효화 (통합 분석 outdated)
// ----------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const indexParam = req.nextUrl.searchParams.get("index");
  if (indexParam == null) {
    return NextResponse.json({ error: "index 파라미터가 필요합니다." }, { status: 400 });
  }
  const index = parseInt(indexParam, 10);
  if (Number.isNaN(index) || index < 0) {
    return NextResponse.json({ error: "index가 올바르지 않습니다." }, { status: 400 });
  }

  const record = await prisma.menteeRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  if (!record) {
    return NextResponse.json({ error: "정성 데이터가 없습니다." }, { status: 404 });
  }

  const activities = (record.qualitative_activities ?? []) as ActivityForm[];
  if (index >= activities.length) {
    return NextResponse.json({ error: "해당 인덱스의 활동이 없습니다." }, { status: 404 });
  }

  const newActivities = activities.filter((_, i) => i !== index);

  // STAR 분석에서도 해당 활동 제거하고 인덱스 시프트
  const oldStar = record.star_analysis as StarAnalysisJson | null;
  let newStar: StarAnalysisJson | null = null;
  if (oldStar?.activities && Array.isArray(oldStar.activities)) {
    const filtered = oldStar.activities
      .filter((s) => s.activity_index !== index)
      .map((s) => ({
        ...s,
        activity_index: s.activity_index > index ? s.activity_index - 1 : s.activity_index,
      }));
    newStar = { ...oldStar, activities: filtered };
  }

  // star_input_hashes 시프트
  const oldHashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const newHashes: Record<string, string> = {};
  for (const [k, v] of Object.entries(oldHashes)) {
    const i = parseInt(k, 10);
    if (Number.isNaN(i) || i === index) continue;
    const newKey = i > index ? String(i - 1) : String(i);
    newHashes[newKey] = v;
  }

  const updated = await prisma.menteeRecord.update({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    data: {
      qualitative_activities: newActivities as unknown as Prisma.InputJsonValue,
      star_analysis: (newStar ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      star_input_hashes: newHashes as unknown as Prisma.InputJsonValue,
      ai_summary_hash: null,
    },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(updated));
}
