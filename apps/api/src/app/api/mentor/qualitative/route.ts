// 멘토 정성 데이터 — 멘티(/api/mentee/qualitative)와 동일 로직, 대상 테이블만 mentor_records.
// (통합 분석 summary 엔드포인트는 멘토엔 없음. ai_keywords/ai_story_outline 은 항상 null로 응답.)
import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import { hashAnalysisInput, buildSingleAnalysisHash } from "@/lib/hash";
import {
  collectFilesByActivity,
  emptyGeminiPayload,
  processActivityAttachments,
  MAX_FILES_PER_ACTIVITY,
  MAX_TOTAL_BYTES_PER_REQUEST,
  type GeminiPayload,
  type StoredAttachment,
} from "@/lib/attachments";
import { removeMany } from "@/lib/storage";
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
    careerGoal: record?.career_goal ?? "",
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
// GET /api/mentor/qualitative?year=YYYY
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const record = await prisma.mentorRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(record));
}

// ----------------------------------------------------------------
// PATCH /api/mentor/qualitative?year=YYYY
//   - application/json      : { careerGoal?, activities?, reorderMapping? } — 텍스트만 저장
//   - multipart/form-data   : payload + files_${i}_${j} — 첨부 처리 + analyze_index 인라인 STAR
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

async function handleJsonPatch(req: NextRequest, userId: string, processYear: number) {
  let body: { careerGoal?: string; activities?: ActivityForm[]; reorderMapping?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.careerGoal !== undefined) {
    updateData.career_goal = body.careerGoal || null;
  }
  if (body.activities !== undefined) {
    updateData.qualitative_activities = body.activities;
  }

  if (body.reorderMapping && body.reorderMapping.length > 0) {
    const mapping = body.reorderMapping; // mapping[newIdx] = oldIdx
    const reverseMap = new Map<number, number>();
    mapping.forEach((oldIdx, newIdx) => reverseMap.set(oldIdx, newIdx));

    const existingRecord = await prisma.mentorRecord.findUnique({
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

  const record = await prisma.mentorRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    create: { user_id: userId, process_year: processYear, ...updateData },
    update: updateData,
    select: SELECT_FIELDS,
  });

  return NextResponse.json(buildResponse(record));
}

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

  const existingRecord = await prisma.mentorRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: { qualitative_activities: true },
  });
  const oldActivities = (existingRecord?.qualitative_activities ?? []) as ActivityForm[];

  // 보안 정규화: 클라이언트가 보낸 attachments는 contentHash만 신뢰. 정식 메타는 DB에서 매칭.
  const oldAttByHash = new Map<string, StoredAttachment>();
  for (const a of oldActivities) {
    for (const att of a.attachments ?? []) {
      if (att?.contentHash && att?.storagePath) {
        oldAttByHash.set(att.contentHash, att);
      }
    }
  }

  const allErrors: string[] = [];
  const mergedActivities: ActivityForm[] = [];
  let geminiForAnalyze: GeminiPayload = emptyGeminiPayload();

  for (let i = 0; i < baseActivities.length; i++) {
    const a = baseActivities[i];
    const newFiles = filesByIdx.get(i) ?? [];

    const clientHashes = (a.attachments ?? [])
      .map((att) => att?.contentHash)
      .filter((h): h is string => typeof h === "string" && h.length > 0);
    const kept: StoredAttachment[] = [];
    const seen = new Set<string>();
    for (const hash of clientHashes) {
      if (seen.has(hash)) continue;
      const row = oldAttByHash.get(hash);
      if (!row) {
        allErrors.push(`활동 ${i + 1}: 알 수 없는 첨부(contentHash=${hash.slice(0, 8)}…)는 무시되었습니다.`);
        continue;
      }
      kept.push(row);
      seen.add(hash);
    }

    if (newFiles.length === 0) {
      mergedActivities.push({ ...a, attachments: kept });
      continue;
    }

    const totalAfter = kept.length + newFiles.length;
    if (totalAfter > MAX_FILES_PER_ACTIVITY) {
      allErrors.push(
        `활동 ${i + 1}: 첨부는 활동당 최대 ${MAX_FILES_PER_ACTIVITY}개입니다 (기존 ${kept.length}, 신규 ${newFiles.length}).`
      );
    }

    const { result, errors } = await processActivityAttachments(newFiles, { userId, processYear });
    for (const e of errors) allErrors.push(`활동 ${i + 1}: ${e}`);

    const merged: StoredAttachment[] = [...kept, ...result.stored].slice(0, MAX_FILES_PER_ACTIVITY);
    mergedActivities.push({ ...a, attachments: merged });

    if (payload.analyze_index === i) {
      geminiForAnalyze = result.gemini;
    }
  }

  const updateData: Record<string, unknown> = {
    qualitative_activities: mergedActivities,
  };
  if (payload.careerGoal !== undefined) {
    updateData.career_goal = payload.careerGoal || null;
  }

  await prisma.mentorRecord.upsert({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    create: { user_id: userId, process_year: processYear, ...updateData },
    update: updateData,
  });

  // DB 저장 성공 후 Storage diff 정리
  const newHashes = new Set<string>();
  for (const a of mergedActivities) {
    for (const att of a.attachments ?? []) newHashes.add(att.contentHash);
  }
  const toDelete: string[] = [];
  for (const [hash, att] of oldAttByHash.entries()) {
    if (!newHashes.has(hash)) toDelete.push(att.storagePath);
  }
  if (toDelete.length > 0) await removeMany(toDelete);

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
        recordKind: "mentor",
        inMemoryGemini: geminiForAnalyze,
      });
      if (r.kind === "hit") {
        inlineStar = r.star;
        inlineSkipped = true;
      } else if (r.kind === "computed") {
        inlineStar = r.star;
        inlineSkipped = false;
      }
    } catch (err) {
      console.error("[mentor qualitative PATCH multipart] 인라인 분석 실패", err);
      const updated = await prisma.mentorRecord.findUnique({
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

  const updated = await prisma.mentorRecord.findUnique({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    select: SELECT_FIELDS,
  });

  return NextResponse.json({
    ...buildResponse(updated, { inlineStar, inlineSkipped }),
    attachmentErrors: allErrors.length > 0 ? allErrors : undefined,
  });
}

// ----------------------------------------------------------------
// DELETE /api/mentor/qualitative?year=YYYY&index=N
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

  const record = await prisma.mentorRecord.findUnique({
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

  const removedAttachments = activities[index].attachments ?? [];
  const remainingHashes = new Set<string>();
  for (const a of newActivities) {
    for (const att of a.attachments ?? []) remainingHashes.add(att.contentHash);
  }
  const storagePathsToDelete = removedAttachments
    .filter((att) => att.storagePath && !remainingHashes.has(att.contentHash))
    .map((att) => att.storagePath);

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

  const oldHashes = (record.star_input_hashes ?? {}) as Record<string, string>;
  const newHashes: Record<string, string> = {};
  for (const [k, v] of Object.entries(oldHashes)) {
    const i = parseInt(k, 10);
    if (Number.isNaN(i) || i === index) continue;
    const newKey = i > index ? String(i - 1) : String(i);
    newHashes[newKey] = v;
  }

  const updated = await prisma.mentorRecord.update({
    where: { user_id_process_year: { user_id: userId, process_year: processYear } },
    data: {
      qualitative_activities: newActivities as unknown as Prisma.InputJsonValue,
      star_analysis: (newStar ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      star_input_hashes: newHashes as unknown as Prisma.InputJsonValue,
      ai_summary_hash: null,
    },
    select: SELECT_FIELDS,
  });

  if (storagePathsToDelete.length > 0) await removeMany(storagePathsToDelete);

  return NextResponse.json(buildResponse(updated));
}
