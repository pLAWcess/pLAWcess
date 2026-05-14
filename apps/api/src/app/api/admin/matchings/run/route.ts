// POST /api/admin/matchings/run — AI 매칭 일괄 실행 (NDJSON streaming 응답).
//
// 응답 형식: application/x-ndjson — 한 줄마다 JSON 객체. type 으로 라인 종류 구분.
//   {"type":"start", year, total, mentorCount}
//   {"type":"progress", status:"ok"|"skipped", menteeApplicationId, menteeName, completed, total, elapsedMs, reason?}
//   {"type":"done", year, processed, skipped: [{menteeApplicationId, reason}]}
//   {"type":"error", message}   ← 치명적 오류 (전체 중단)
//
// streaming 인 이유:
//   기존에 단일 JSON 응답으로 모든 멘티 처리가 끝난 뒤 반환했더니, web→api proxy
//   (Next.js rewrites · Node undici fetch) 의 헤더 타임아웃(1분)에 걸려 클라이언트가
//   ECONNRESET 끊겼다. streaming 으로 라우트 진입 직후 첫 라인을 emit 하면 헤더가
//   즉시 가서 proxy 가 끊지 않고, 진행률도 실시간으로 받을 수 있다.

import { NextRequest } from "next/server";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";
import { resolveProcessYear } from "@/lib/active-cycle";
import {
  annotateMentors,
  buildShortlist,
  hasExtraRequest,
  pickPreferenceSchools,
  type MenteeForMatching,
  type MentorForMatching,
} from "@/lib/matchingShortlist";
import { runMenteeMatching } from "@/lib/matchingGemini";

export const maxDuration = 300;

// Gemini 동시 호출 워커 수. 5분(maxDuration) 안에 회당 ~5초 가정 시 멘티 ~120명까지 안전.
const MATCHING_CONCURRENCY = 4;

// 외부 의존성 없는 bounded concurrency 워커.
// items 를 worker 함수로 처리하되 동시에 `concurrency` 개만 실행. 결과는 입력 순서 보장.
async function runBounded<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, idx: number) => Promise<R>,
  onComplete?: (item: T, result: R, idx: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      const res = await worker(items[i], i);
      results[i] = res;
      onComplete?.(items[i], res, i);
    }
  });
  await Promise.all(lanes);
  return results;
}

type SkipReason = { menteeApplicationId: string; reason: string };

type SuggestionRow = {
  process_year: number;
  mentee_application_id: string;
  mentor_application_id: string;
  rank: number;
  ai_score: number;
  ai_reason: string;
  satisfies_extra_request: boolean | null;
  pool_mode: string;
  created_by: string | null;
};

type PerMentee =
  | { kind: "ok"; rows: SuggestionRow[] }
  | { kind: "skipped"; menteeApplicationId: string; reason: string };

export async function POST(req: NextRequest) {
  // 인증·연도 해석은 streaming 시작 전. 실패하면 일반 JSON 응답 (401/403/400).
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;
  const adminUserId = guard.payload.user_id;

  const yr = await resolveProcessYear(req);
  if (yr.error) return yr.error;
  const year = yr.year;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 클라이언트가 중도 이탈(페이지 새로고침, fetch abort 등)하면 controller 가 닫힌다.
      // 그 뒤에도 진행 중이던 lane 의 onComplete 가 writeLine 을 호출하면 ERR_INVALID_STATE
      // 가 throw 되므로, closed 플래그로 enqueue 를 silent 하게 skip 한다.
      let closed = false;
      const writeLine = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          closed = true;
        }
      };
      // 클라이언트 abort 신호 감지 — 새 progress 라인 emit 을 즉시 멈춘다.
      const onAbort = () => {
        closed = true;
      };
      req.signal.addEventListener("abort", onAbort, { once: true });

      try {
        await runMatching({ year, adminUserId, writeLine });
      } catch (e) {
        const message = e instanceof Error ? e.message : "매칭 실행 중 알 수 없는 오류가 발생했어요.";
        console.error("[matchings/run] unhandled error:", e);
        writeLine({ type: "error", message });
      } finally {
        req.signal.removeEventListener("abort", onAbort);
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      // proxy 가 응답 body 를 buffering 하지 않도록 (nginx, undici 등).
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

type RunArgs = {
  year: number;
  adminUserId: string;
  writeLine: (obj: unknown) => void;
};

async function runMatching({ year, adminUserId, writeLine }: RunArgs) {
  const [menteeApps, mentorApps] = await prisma.$transaction([
    prisma.application.findMany({
      where: { role: "mentee", process_year: year, application_status: "approved" },
      orderBy: { user: { name: "asc" } },
      select: {
        application_id: true,
        user: { select: { user_id: true, name: true, undergrad_first_major: true } },
        mentee_record: {
          select: {
            target_school_ga: true,
            target_school_na: true,
            preferred_group: true,
            extra_request: true,
            desired_mentor: true,
            core_keywords: true,
            career_goal: true,
            ai_keywords: true,
            ai_story_outline: true,
            star_analysis: true,
            story_summary: true,
          },
        },
      },
    }),
    prisma.application.findMany({
      where: { role: "mentor", process_year: year, application_status: "approved" },
      orderBy: { user: { name: "asc" } },
      select: {
        application_id: true,
        user: { select: { user_id: true, name: true, undergrad_first_major: true } },
        mentor_record: {
          select: {
            lawschool_name: true,
            core_keywords: true,
            career_goal: true,
            ai_keywords: true,
            ai_story_outline: true,
            star_analysis: true,
            personal_statement_summary: true,
          },
        },
      },
    }),
  ]);

  const mentees: MenteeForMatching[] = menteeApps.flatMap((r) => {
    const rec = r.mentee_record;
    if (!rec) return [];
    const { first, second } = pickPreferenceSchools(
      rec.preferred_group,
      rec.target_school_ga,
      rec.target_school_na,
    );
    return [{
      applicationId: r.application_id,
      userId: r.user.user_id,
      name: r.user.name,
      firstPreferenceSchool: first,
      secondPreferenceSchool: second,
      preferredGroup: rec.preferred_group,
      undergradMajor: r.user.undergrad_first_major,
      extraRequest: rec.extra_request,
      desiredMentor: rec.desired_mentor,
      coreKeywords: rec.core_keywords,
      careerGoal: rec.career_goal,
      aiKeywords: rec.ai_keywords,
      aiStoryOutline: rec.ai_story_outline,
      starAnalysis: rec.star_analysis,
      storySummary: rec.story_summary,
    }];
  });

  const mentors: MentorForMatching[] = mentorApps.flatMap((r) => {
    const rec = r.mentor_record;
    if (!rec) return [];
    return [{
      applicationId: r.application_id,
      userId: r.user.user_id,
      name: r.user.name,
      lawSchool: rec.lawschool_name,
      undergradMajor: r.user.undergrad_first_major,
      coreKeywords: rec.core_keywords,
      careerGoal: rec.career_goal,
      aiKeywords: rec.ai_keywords,
      aiStoryOutline: rec.ai_story_outline,
      starAnalysis: rec.star_analysis,
      personalStatementSummary: rec.personal_statement_summary,
    }];
  });

  // 첫 라인 — 헤더를 즉시 send 시켜 proxy 헤더 timeout 회피.
  writeLine({
    type: "start",
    year,
    total: mentees.length,
    mentorCount: mentors.length,
    concurrency: MATCHING_CONCURRENCY,
  });

  if (mentees.length === 0) {
    await prisma.matchSuggestion.deleteMany({ where: { process_year: year } });
    writeLine({ type: "done", year, processed: 0, skipped: [] });
    return;
  }
  if (mentors.length === 0) {
    await prisma.matchSuggestion.deleteMany({ where: { process_year: year } });
    writeLine({
      type: "done",
      year,
      processed: 0,
      skipped: mentees.map((m) => ({ menteeApplicationId: m.applicationId, reason: "NO_MENTOR_POOL" })),
    });
    return;
  }

  let completedCount = 0;

  const perMentee = await runBounded<typeof mentees[number], PerMentee>(
    mentees,
    MATCHING_CONCURRENCY,
    async (mentee) => {
      const fullPool = annotateMentors(mentee, mentors);
      const shortlist = buildShortlist(mentee, mentors);
      try {
        const { output, poolMode } = await runMenteeMatching(mentee, shortlist, fullPool);
        if (output.candidates.length === 0) {
          return { kind: "skipped", menteeApplicationId: mentee.applicationId, reason: "NO_VALID_CANDIDATES" };
        }
        const usesExtraRequest = hasExtraRequest(mentee);
        const rows = output.candidates.map<SuggestionRow>((c, i) => ({
          process_year: year,
          mentee_application_id: mentee.applicationId,
          mentor_application_id: c.mentor_application_id,
          rank: i + 1,
          ai_score: c.score,
          ai_reason: c.reason,
          satisfies_extra_request: usesExtraRequest ? c.satisfies_extra_request : null,
          pool_mode: poolMode,
          created_by: adminUserId,
        }));
        return { kind: "ok", rows };
      } catch (e) {
        const reason = e instanceof Error ? e.message : "UNKNOWN_ERROR";
        return { kind: "skipped", menteeApplicationId: mentee.applicationId, reason };
      }
    },
    (mentee, result) => {
      // 멘티 한 명 끝날 때마다 진행 라인 emit. JS 단일 스레드이므로 completedCount race 없음.
      completedCount += 1;
      writeLine({
        type: "progress",
        status: result.kind,
        menteeApplicationId: mentee.applicationId,
        menteeName: mentee.name,
        completed: completedCount,
        total: mentees.length,
        reason: result.kind === "skipped" ? result.reason : undefined,
      });
    },
  );

  const rows: SuggestionRow[] = [];
  const skipped: SkipReason[] = [];
  for (const r of perMentee) {
    if (r.kind === "ok") rows.push(...r.rows);
    else skipped.push({ menteeApplicationId: r.menteeApplicationId, reason: r.reason });
  }

  // 트랜잭션: 해당 사이클의 기존 추천을 통째로 교체.
  await prisma.$transaction([
    prisma.matchSuggestion.deleteMany({ where: { process_year: year } }),
    prisma.matchSuggestion.createMany({ data: rows }),
  ]);

  const processed = rows.filter((r) => r.rank === 1).length;
  writeLine({ type: "done", year, processed, skipped });
}
