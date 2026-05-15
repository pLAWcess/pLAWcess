// 멘티 신청 기간 가드: 활성 cycle 의 mentee_apply_end 가 지났으면 쓰기 요청을 403 으로 차단.
//
// 비교 단위는 날짜 (cycle_schedules.mentee_apply_end 가 @db.Date). 시간대는 한국 시각(KST, UTC+9)
// 기준으로 "오늘" 을 산정하므로 마감일 당일 23:59 (KST) 까지는 통과, 다음 날 00:00 (KST) 부터 차단.
//
// 가드 무효화 조건:
//   - 활성 cycle 이 없음 (admin 이 아직 활성 토글 안 함)
//   - 활성 cycle 의 mentee_apply_end 가 null (admin 이 마감일 미설정)
//
// 두 경우 모두 "정책 미설정" 으로 보고 통과시킨다. 이는 운영 초기 단계에서 cycle/일정을 만들기
// 전에 멘티가 정보를 채우는 시나리오를 막지 않기 위함이다.

import { NextResponse } from "next/server";
import { prisma } from "@plawcess/database";

/**
 * 마감되었으면 403 NextResponse, 아니면 null.
 *
 * 사용 예:
 *   const blocked = await checkMenteeApplicationDeadline();
 *   if (blocked) return blocked;
 */
export async function checkMenteeApplicationDeadline(): Promise<NextResponse | null> {
  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
    select: { mentee_apply_end: true },
  });

  if (!active || !active.mentee_apply_end) return null;

  // KST 기준 오늘 날짜 (YYYY-MM-DD). UTC 시간을 +9시간 오프셋한 뒤 ISO 날짜만 자른다.
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayIso = kstNow.toISOString().slice(0, 10);
  const endIso = active.mentee_apply_end.toISOString().slice(0, 10);

  if (todayIso > endIso) {
    return NextResponse.json(
      { error: "신청 기간이 마감되었습니다." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * 멘토 모집 기간 가드. KST 기준으로:
 *   - today < mentor_recruit_start          → 시작 전 차단
 *   - today >= matching_start               → 매칭 시작 시점부터 차단
 *
 * 마감 경계로 mentor_recruit_end 가 아니라 matching_start 를 쓰는 이유: 멘토 모집 종료 후에도
 * 멘티 신청 기간 동안 어드민 승인이 이뤄지므로, 매칭이 시작되기 전까지는 멘토 제출을 받아둔다.
 * matching_start 가 null 이면 mentor_recruit_end 로 fallback, 둘 다 null 이면 통과(정책 미설정).
 */
export async function checkMentorApplicationDeadline(): Promise<NextResponse | null> {
  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
    select: { mentor_recruit_start: true, mentor_recruit_end: true, matching_start: true },
  });

  if (!active) return null;

  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayIso = kstNow.toISOString().slice(0, 10);

  if (active.mentor_recruit_start) {
    const startIso = active.mentor_recruit_start.toISOString().slice(0, 10);
    if (todayIso < startIso) {
      return NextResponse.json(
        { error: "멘토 모집 기간이 아직 시작되지 않았습니다." },
        { status: 403 },
      );
    }
  }

  const closeBoundary = active.matching_start ?? active.mentor_recruit_end;
  if (closeBoundary) {
    const boundaryIso = closeBoundary.toISOString().slice(0, 10);
    // matching_start 기준은 "당일부터 차단" (>=), mentor_recruit_end fallback 은 "다음날부터 차단" (>)
    const closed = active.matching_start ? todayIso >= boundaryIso : todayIso > boundaryIso;
    if (closed) {
      return NextResponse.json(
        { error: "멘토 신청 기간이 마감되었습니다." },
        { status: 403 },
      );
    }
  }
  return null;
}
