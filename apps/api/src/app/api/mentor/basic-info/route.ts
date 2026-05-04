// apps/api/src/app/api/mentor/basic-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";
import {
  genderToLabel, labelToGender,
  statusToLabel, labelToStatus,
  militaryToLabel, labelToMilitary,
  dateToLabel, labelToDate,
  yearToLabel,
} from "@/lib/labels";
import { splitPayload, MENTOR_RECORD_FIELDS } from "@/lib/payload-split";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

// ----------------------------------------------------------------
// GET /api/mentor/basic-info?year=2026
// 응답: User(신상 + 로스쿨) + MentorRecord(학적 스냅샷) 합성
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
        current_lawschool: true,
        graduated_lawschool: true,
        lawschool_grade: true,
      },
    }),
    prisma.mentorRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      select: { academic_status: true },
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
      currentLawschool: user.current_lawschool ?? "",
      graduatedLawschool: user.graduated_lawschool ?? "",
      lawschoolGrade: user.lawschool_grade ?? null,
    },
  });
}

// ----------------------------------------------------------------
// PATCH /api/mentor/basic-info?year=2026
// Body: { personal?: {...} }   ← 멘토는 admission(가/나군) 대신 lawschool 필드를 갖는다.
// 내부: 평탄화 → splitPayload → User.update + MentorRecord.upsert
// ----------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const processYear = getProcessYear(req);

  let body: {
    personal?: {
      birthDate?: string;
      gender?: string;
      militaryStatus?: string;
      major1?: string;
      major2?: string;
      admissionYear?: string;
      academicStatus?: string;
      graduationYear?: string;
      currentLawschool?: string;
      graduatedLawschool?: string;
      lawschoolGrade?: number | null;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const flat: Record<string, unknown> = {};
  if (body.personal) {
    const p = body.personal;
    if (p.birthDate !== undefined) flat.birth_date = labelToDate(p.birthDate);
    if (p.gender !== undefined) flat.gender = labelToGender(p.gender);
    if (p.militaryStatus !== undefined) flat.military_status = labelToMilitary(p.militaryStatus);
    if (p.major1 !== undefined) flat.undergrad_first_major = p.major1;
    if (p.major2 !== undefined) flat.undergrad_second_major = p.major2;
    if (p.admissionYear !== undefined) {
      const n = parseInt(p.admissionYear, 10);
      flat.undergrad_entry_year = isNaN(n) ? null : n;
    }
    if (p.graduationYear !== undefined) {
      const n = parseInt(p.graduationYear, 10);
      flat.undergrad_graduation_year = isNaN(n) ? null : n;
    }
    if (p.academicStatus !== undefined) flat.academic_status = labelToStatus(p.academicStatus);
    if (p.currentLawschool !== undefined) flat.current_lawschool = p.currentLawschool || null;
    if (p.graduatedLawschool !== undefined) flat.graduated_lawschool = p.graduatedLawschool || null;
    if (p.lawschoolGrade !== undefined) flat.lawschool_grade = p.lawschoolGrade;
  }

  const { userData, recordData } = splitPayload(flat, MENTOR_RECORD_FIELDS);

  const exists = await prisma.user.findUnique({ where: { user_id: userId }, select: { user_id: true } });
  if (!exists) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const ops = [];
  if (Object.keys(userData).length > 0) {
    ops.push(prisma.user.update({ where: { user_id: userId }, data: userData }));
  }
  if (Object.keys(recordData).length > 0) {
    ops.push(
      prisma.mentorRecord.upsert({
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
