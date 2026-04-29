import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plawcess/database";
import { getTokenFromCookie } from "@/lib/auth";

function getUserId(req: NextRequest): string | null {
  return getTokenFromCookie(req)?.user_id ?? null;
}

function getProcessYear(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("year");
  if (!raw) return new Date().getFullYear();
  const match = raw.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

// DB enum ↔ 한국어 레이블 변환
function genderToLabel(g: string | null): string {
  if (g === "male") return "남성";
  if (g === "female") return "여성";
  return "";
}

function labelToGender(label: string): string | null {
  if (label === "남성") return "male";
  if (label === "여성") return "female";
  return null;
}

const ACADEMIC_STATUS_MAP: Record<string, string> = {
  enrolled: "재학",
  on_leave: "휴학",
  completed: "수료",
  graduated: "졸업",
  expelled: "제적",
};
const LABEL_TO_STATUS: Record<string, string> = {
  재학: "enrolled",
  휴학: "on_leave",
  수료: "completed",
  "졸업 유예": "on_leave",
  졸업: "graduated",
};

function statusToLabel(s: string | null): string {
  return s ? (ACADEMIC_STATUS_MAP[s] ?? "") : "";
}

function labelToStatus(label: string): string | null {
  return LABEL_TO_STATUS[label] ?? null;
}

// ----------------------------------------------------------------
// GET /api/mentee/basic-info?year=2026학년도
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
        school_name: true,
        gender: true,
        first_major: true,
        second_major: true,
        academic_status: true,
      },
    }),
    prisma.menteeRecord.findUnique({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      select: {
        birth_date: true,
        university_entry_year: true,
        graduation_year: true,
        target_school_ga: true,
        target_school_na: true,
        is_special_admission: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  // birth_date → "YYYY.MM.DD." 형식
  const birthDate = record?.birth_date
    ? record.birth_date.toISOString().slice(0, 10).replace(/-/g, ".") + "."
    : "";

  return NextResponse.json({
    personal: {
      name: user.name,
      affiliation: user.school_name ?? "",
      birthDate,
      gender: genderToLabel(user.gender),
      major1: user.first_major ?? "",
      major2: user.second_major ?? "",
      admissionYear: record?.university_entry_year?.toString() ?? "",
      academicStatus: statusToLabel(user.academic_status),
      graduationYear: record?.graduation_year?.toString() ?? "",
    },
    admission: {
      // DB에는 가/나군 제1지망 학교만 저장됨. 제2지망·전형 타입은 DB 미지원.
      가: { first: record?.target_school_ga ?? "" },
      나: { first: record?.target_school_na ?? "" },
      isSpecialAdmission: record?.is_special_admission ?? false,
    },
  });
}

// ----------------------------------------------------------------
// PATCH /api/mentee/basic-info?year=2026학년도
// Body: { personal?, admission? }
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
      major1?: string;
      major2?: string;
      admissionYear?: string;
      academicStatus?: string;
      graduationYear?: string;
    };
    admission?: {
      가?: { first?: string };
      나?: { first?: string };
      isSpecialAdmission?: boolean;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { user_id: userId } });
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  // User 테이블 업데이트 (gender, major, academic_status)
  const userUpdate: Record<string, unknown> = {};
  if (body.personal) {
    const { gender, major1, major2, academicStatus } = body.personal;
    if (gender !== undefined) userUpdate.gender = labelToGender(gender);
    if (major1 !== undefined) userUpdate.first_major = major1;
    if (major2 !== undefined) userUpdate.second_major = major2;
    if (academicStatus !== undefined) userUpdate.academic_status = labelToStatus(academicStatus);
  }
  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { user_id: userId }, data: userUpdate });
  }

  // MenteeRecord 업데이트 (birth_date, university_entry_year, graduation_year, target_school)
  const recordUpdate: Record<string, unknown> = {};
  if (body.personal) {
    const { birthDate, admissionYear, graduationYear } = body.personal;
    if (birthDate !== undefined) {
      // "YYYY.MM.DD." → Date (비어있으면 null)
      const cleaned = birthDate.replace(/\.$/, "").replace(/\./g, "-");
      const parsed = new Date(cleaned);
      recordUpdate.birth_date = !isNaN(parsed.getTime()) ? parsed : null;
    }
    if (admissionYear !== undefined) {
      const year = parseInt(admissionYear);
      recordUpdate.university_entry_year = isNaN(year) ? null : year;
    }
    if (graduationYear !== undefined) {
      const year = parseInt(graduationYear);
      recordUpdate.graduation_year = isNaN(year) ? null : year;
    }
  }
  if (body.admission) {
    const { 가: ga, 나: na, isSpecialAdmission } = body.admission;
    if (ga?.first !== undefined) recordUpdate.target_school_ga = ga.first || null;
    if (na?.first !== undefined) recordUpdate.target_school_na = na.first || null;
    if (isSpecialAdmission !== undefined) recordUpdate.is_special_admission = isSpecialAdmission;
  }

  if (Object.keys(recordUpdate).length > 0) {
    await prisma.menteeRecord.upsert({
      where: { user_id_process_year: { user_id: userId, process_year: processYear } },
      create: { user_id: userId, process_year: processYear, ...recordUpdate },
      update: recordUpdate,
    });
  }

  return NextResponse.json({ success: true });
}
