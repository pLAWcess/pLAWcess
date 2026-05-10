import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import {
  genderToLabel,
  statusToLabel,
  militaryToLabel,
  dateToLabel,
  yearToLabel,
} from "@/lib/labels";
import { splitPayload, MENTEE_RECORD_FIELDS, flattenPersonal, PersonalPatchInput } from "@/lib/payload-split";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

type AdmissionSlotInput = { school?: string; isSpecial?: boolean };
type AdmissionInput = { 가?: AdmissionSlotInput; 나?: AdmissionSlotInput; preferredGroup?: '가' | '나' | null };

// ----------------------------------------------------------------
// GET /api/mentee/basic-info?year=2026학년도
// 응답: User(신상) + MenteeRecord(사이클 학적·희망학교) 합성
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  const [user, record] = await Promise.all([
    prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        name: true,
        birth_date: true,
        gender: true,
        military_status: true,
        undergrad_school_name: true,
        undergrad_first_major: true,
        undergrad_second_major: true,
        undergrad_entry_year: true,
        undergrad_graduation_year: true,
      },
    }),
    prisma.menteeRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      select: {
        academic_status: true,
        target_school_ga: true,
        is_special_ga: true,
        target_school_na: true,
        is_special_na: true,
        preferred_group: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    personal: {
      name: user.name,
      affiliation: user.undergrad_school_name ?? "",
      birthDate: dateToLabel(user.birth_date),
      gender: genderToLabel(user.gender),
      militaryStatus: militaryToLabel(user.military_status),
      major1: user.undergrad_first_major ?? "",
      major2: user.undergrad_second_major ?? "",
      admissionYear: yearToLabel(user.undergrad_entry_year),
      graduationYear: yearToLabel(user.undergrad_graduation_year),
      academicStatus: statusToLabel(record?.academic_status),
    },
    admission: {
      가: { school: record?.target_school_ga ?? "", isSpecial: record?.is_special_ga ?? false },
      나: { school: record?.target_school_na ?? "", isSpecial: record?.is_special_na ?? false },
      preferredGroup: (record?.preferred_group as '가' | '나' | null) ?? null,
    },
  });
}

// ----------------------------------------------------------------
// PATCH /api/mentee/basic-info?year=2026학년도
// Body: { personal?: {...}, admission?: { 가?: { school?, isSpecial? }, 나?: { school?, isSpecial? } } }
// 내부: 평탄화 → splitPayload → User.update + MenteeRecord.upsert (트랜잭션)
// ----------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  let body: {
    personal?: PersonalPatchInput;
    admission?: AdmissionInput;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  // 1) 중첩 본문 → 평탄화 + DB 컬럼명 + 라벨 변환
  const flat: Record<string, unknown> = body.personal ? flattenPersonal(body.personal) : {};
  if (body.admission) {
    const groups: Array<{ key: "가" | "나"; col: "ga" | "na" }> = [
      { key: "가", col: "ga" },
      { key: "나", col: "na" },
    ];
    for (const { key, col } of groups) {
      const slot = body.admission[key];
      if (!slot) continue;
      if (slot.school !== undefined) {
        flat[`target_school_${col}`] = slot.school || null;
      }
      if (slot.isSpecial !== undefined) {
        flat[`is_special_${col}`] = slot.isSpecial;
      }
    }
    if (body.admission.preferredGroup !== undefined) {
      flat.preferred_group = body.admission.preferredGroup ?? null;
    }
  }

  // 2) User / MenteeRecord 분기
  const { userData, recordData } = splitPayload(flat, MENTEE_RECORD_FIELDS);

  // 3) 사용자 존재 확인
  const exists = await prisma.user.findUnique({ where: { user_id: userId }, select: { user_id: true } });
  if (!exists) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  // 4) 트랜잭션으로 두 테이블 동시 반영
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (Object.keys(userData).length > 0) {
    ops.push(prisma.user.update({ where: { user_id: userId }, data: userData }));
  }
  if (Object.keys(recordData).length > 0) {
    ops.push(
      prisma.menteeRecord.upsert({
        where: { user_id_process_year: { user_id: userId, process_year: processYear } },
        create: { user_id: userId, process_year: processYear, ...recordData },
        update: recordData,
      }),
    );
  }
  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  return NextResponse.json({ success: true });
}
