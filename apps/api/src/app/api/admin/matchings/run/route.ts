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

// 스트림 종료 전 패딩 + 휴식. web→api proxy (Next.js rewrites · undici) 가 꼬리 chunk 를
// 묶어서 client 까지 forward 못하는 케이스를 막기 위한 belt-and-suspenders.
// 클라이언트의 handleLine 은 빈 줄을 skip 하므로 파싱에 영향 없음.
async function flushAndClose(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  isClosed: () => boolean,
) {
  // 큰 enqueue 한 번 보다 작은 enqueue 여러 번이 각각 다른 TCP write 로 빠질 확률이 높다.
  for (let i = 0; i < 8 && !isClosed(); i++) {
    try {
      controller.enqueue(encoder.encode("\n".repeat(2048)));
    } catch {
      break;
    }
    await new Promise<void>((r) => setTimeout(r, 100));
  }
  // 마지막 chunk 들이 실제 socket 으로 빠져나갈 시간 — 이게 없으면 같은 tick 안에서
  // enqueue → close 가 일어나 EOS 가 데이터보다 먼저 client 에 도달하는 경우가 있다.
  await new Promise<void>((r) => setTimeout(r, 1500));
  try {
    controller.close();
  } catch {
    /* already closed */
  }
}

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
      // 각 progress 라인을 별개 청크로 즉시 flush 시키기 위한 이벤트 루프 양보.
      // 동기적으로 4개 lane 의 onComplete 가 연속 enqueue 되면 Node 가 같은 chunk 로
      // 묶어 내보내는 경우가 있어, 마지막 묶음이 web→api proxy 의 tail buffer 에 걸린다.
      await new Promise<void>((r) => setImmediate(r));
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
  | { kind: "ok"; menteeApplicationId: string }
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
      // closed 플래그는 두 가지 race 를 막는다:
      //   1) 클라이언트 중도 이탈 후 진행 중 lane 의 onComplete 가 writeLine 을 호출
      //   2) finally 단계에서 패딩/close 이후 추가 enqueue
      let closed = false;
      const writeLine = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          closed = true;
        }
      };
      const onAbort = () => { closed = true; };
      req.signal.addEventListener("abort", onAbort, { once: true });

      try {
        await runMatching({ year, adminUserId, writeLine });
      } catch (e) {
        const message = e instanceof Error ? e.message : "매칭 실행 중 알 수 없는 오류가 발생했어요.";
        console.error("[matchings/run] unhandled error:", e);
        writeLine({ type: "error", message });
      } finally {
        req.signal.removeEventListener("abort", onAbort);
        await flushAndClose(controller, encoder, () => closed);
        closed = true;
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
            star_analysis: true,
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
            career_goal: true,
            star_analysis: true,
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
      starAnalysis: rec.star_analysis,
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
      careerGoal: rec.career_goal,
      starAnalysis: rec.star_analysis,
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

  // 기존 추천을 먼저 비운다. (예전엔 마지막에 deleteMany+createMany 트랜잭션을 했는데,
  // 모든 멘티 처리 후 한꺼번에 DB 쓰기 → writeLine 사이에 다초 단위 정적 구간이 생겨
  // proxy/undici 가 마지막 progress·done 청크를 묶어두는 버퍼링 증상이 있었다.
  // 사전 삭제 + 멘티별 즉시 insert 로 바꿔 스트림 흐름을 끊지 않는다.)
  await prisma.matchSuggestion.deleteMany({ where: { process_year: year } });

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
        await prisma.matchSuggestion.createMany({ data: rows });
        return { kind: "ok", menteeApplicationId: mentee.applicationId };
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

  const skipped: SkipReason[] = [];
  let processed = 0;
  for (const r of perMentee) {
    if (r.kind === "ok") processed += 1;
    else skipped.push({ menteeApplicationId: r.menteeApplicationId, reason: r.reason });
  }

  writeLine({ type: "done", year, processed, skipped });
}
