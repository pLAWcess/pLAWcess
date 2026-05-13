import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

type ParticipationItem = { year: number; role: "mentee" | "mentor" };

function formatBirthDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}.`;
}

async function buildUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      name: true,
      birth_date: true,
      gender: true,
      military_status: true,
      phone: true,
      email: true,
      student_id: true,
      undergrad_first_major: true,
      undergrad_second_major: true,
      undergrad_school_name: true,
      undergrad_entry_year: true,
      undergrad_graduation_year: true,
      account_status: true,
      current_role: true,
      is_deleted: true,
    },
  });
  if (!user || user.is_deleted) return null;

  // 가장 최근 mentor record 1건 (academic_status, lawschool_*)
  const mentorRecord = await prisma.mentorRecord.findFirst({
    where: { user_id: userId },
    orderBy: { process_year: "desc" },
    select: {
      academic_status: true,
      lawschool_name: true,
      lawschool_grade: true,
    },
  });
  // 가장 최근 mentee record 1건 (academic_status fallback)
  const menteeRecord = await prisma.menteeRecord.findFirst({
    where: { user_id: userId },
    orderBy: { process_year: "desc" },
    select: { academic_status: true },
  });
  const academicStatus = mentorRecord?.academic_status ?? menteeRecord?.academic_status ?? null;

  const apps = await prisma.application.findMany({
    where: { user_id: userId, application_status: { not: "draft" } },
    orderBy: { process_year: "desc" },
    select: { process_year: true, role: true },
  });
  const participation: ParticipationItem[] = apps.map((a) => ({
    year: a.process_year,
    role: a.role,
  }));

  return {
    userId: user.user_id,
    name: user.name,
    birthYear: user.birth_date?.getUTCFullYear() ?? null,
    birthDate: formatBirthDate(user.birth_date ?? null),
    gender: user.gender,
    militaryStatus: user.military_status,
    phone: user.phone ?? "",
    email: user.email,
    studentId: user.student_id ?? "",
    firstMajor: user.undergrad_first_major ?? "",
    secondMajor: user.undergrad_second_major ?? "",
    schoolName: user.undergrad_school_name ?? "",
    admissionYear: user.undergrad_entry_year ?? null,
    graduationYear: user.undergrad_graduation_year ?? null,
    academicStatus,
    accountStatus: user.account_status,
    currentRole: user.current_role,
    currentLawschool: mentorRecord?.lawschool_name ?? null,
    cohort: mentorRecord?.lawschool_grade ?? null,
    participation,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const { userId } = await params;
  const detail = await buildUserDetail(userId);
  if (!detail) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(detail);
}

type PatchBody = {
  name?: string;
  birthYear?: number | null;
  birthDate?: string | null;                      // YYYY.MM.DD. 형식
  gender?: string | null;
  militaryStatus?: string | null;
  email?: string;
  phone?: string;
  studentId?: string;
  firstMajor?: string;
  secondMajor?: string;
  schoolName?: string;
  admissionYear?: number | null;
  graduationYear?: number | null;
  // 다음 3개는 가장 최근 MentorRecord/MenteeRecord 에 저장 (current_role 기준)
  academicStatus?: string | null;
  currentLawschool?: string | null;
  cohort?: number | null;
  accountStatus?: string;
  currentRole?: string;
};

const VALID_GENDER = new Set(["male", "female", "other"]);
const VALID_MILITARY = new Set(["completed", "not_completed", "not_applicable"]);
const VALID_ACADEMIC = new Set(["enrolled", "on_leave", "completed", "graduated", "expelled"]);
const VALID_ACCOUNT_STATUS = new Set(["active", "inactive", "blocked"]);
const VALID_CURRENT_ROLE = new Set(["none", "mentee", "mentor", "admin"]);

const BIRTH_DATE_RE = /^(\d{4})\.(\d{2})\.(\d{2})\.$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId 가 필요합니다." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  // birthYear → birth_date 변환에 기존 month/day 보존이 필요하므로 현재 row 조회.
  // current_role 은 academicStatus/currentLawschool/cohort 를 어느 record 에 저장할지 결정용.
  const existing = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { birth_date: true, current_role: true, is_deleted: true },
  });
  if (!existing || existing.is_deleted) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }

  const data: Prisma.UserUpdateInput = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "name 형식이 올바르지 않습니다." }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (body.phone !== undefined) {
    if (typeof body.phone !== "string") {
      return NextResponse.json({ error: "phone 형식이 올바르지 않습니다." }, { status: 400 });
    }
    data.phone = body.phone.trim() || null;
  }
  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !EMAIL_RE.test(body.email.trim())) {
      return NextResponse.json({ error: "email 형식이 올바르지 않습니다." }, { status: 400 });
    }
    data.email = body.email.trim();
  }
  if (body.studentId !== undefined) {
    if (typeof body.studentId !== "string") {
      return NextResponse.json({ error: "studentId 형식이 올바르지 않습니다." }, { status: 400 });
    }
    data.student_id = body.studentId.trim() || null;
  }
  if (body.firstMajor !== undefined) {
    if (typeof body.firstMajor !== "string") {
      return NextResponse.json({ error: "firstMajor 형식이 올바르지 않습니다." }, { status: 400 });
    }
    data.undergrad_first_major = body.firstMajor.trim() || null;
  }
  if (body.secondMajor !== undefined) {
    if (typeof body.secondMajor !== "string") {
      return NextResponse.json({ error: "secondMajor 형식이 올바르지 않습니다." }, { status: 400 });
    }
    data.undergrad_second_major = body.secondMajor.trim() || null;
  }
  if (body.schoolName !== undefined) {
    if (typeof body.schoolName !== "string") {
      return NextResponse.json({ error: "schoolName 형식이 올바르지 않습니다." }, { status: 400 });
    }
    data.undergrad_school_name = body.schoolName.trim() || null;
  }
  if (body.gender !== undefined) {
    if (body.gender !== null && (typeof body.gender !== "string" || !VALID_GENDER.has(body.gender))) {
      return NextResponse.json({ error: "gender 는 male|female|other 또는 null 이어야 합니다." }, { status: 400 });
    }
    data.gender = body.gender as Prisma.UserUpdateInput["gender"];
  }
  if (body.accountStatus !== undefined) {
    if (typeof body.accountStatus !== "string" || !VALID_ACCOUNT_STATUS.has(body.accountStatus)) {
      return NextResponse.json(
        { error: "accountStatus 는 active|inactive|blocked 이어야 합니다." },
        { status: 400 },
      );
    }
    data.account_status = body.accountStatus as Prisma.UserUpdateInput["account_status"];
  }
  if (body.currentRole !== undefined) {
    if (typeof body.currentRole !== "string" || !VALID_CURRENT_ROLE.has(body.currentRole)) {
      return NextResponse.json(
        { error: "currentRole 는 none|mentee|mentor|admin 이어야 합니다." },
        { status: 400 },
      );
    }
    data.current_role = body.currentRole as Prisma.UserUpdateInput["current_role"];
  }
  if (body.militaryStatus !== undefined) {
    if (body.militaryStatus !== null && (typeof body.militaryStatus !== "string" || !VALID_MILITARY.has(body.militaryStatus))) {
      return NextResponse.json({ error: "militaryStatus 는 completed|not_completed|not_applicable 또는 null 이어야 합니다." }, { status: 400 });
    }
    data.military_status = body.militaryStatus as Prisma.UserUpdateInput["military_status"];
  }
  if (body.admissionYear !== undefined) {
    if (body.admissionYear === null) {
      data.undergrad_entry_year = null;
    } else if (typeof body.admissionYear === "number" && Number.isInteger(body.admissionYear) && body.admissionYear >= 1900 && body.admissionYear <= 2100) {
      data.undergrad_entry_year = body.admissionYear;
    } else {
      return NextResponse.json({ error: "admissionYear 는 1900~2100 정수 또는 null 이어야 합니다." }, { status: 400 });
    }
  }
  if (body.graduationYear !== undefined) {
    if (body.graduationYear === null) {
      data.undergrad_graduation_year = null;
    } else if (typeof body.graduationYear === "number" && Number.isInteger(body.graduationYear) && body.graduationYear >= 1900 && body.graduationYear <= 2100) {
      data.undergrad_graduation_year = body.graduationYear;
    } else {
      return NextResponse.json({ error: "graduationYear 는 1900~2100 정수 또는 null 이어야 합니다." }, { status: 400 });
    }
  }
  if (body.birthDate !== undefined) {
    if (body.birthDate === null || body.birthDate === "") {
      data.birth_date = null;
    } else if (typeof body.birthDate === "string") {
      const m = BIRTH_DATE_RE.exec(body.birthDate);
      if (!m) {
        return NextResponse.json({ error: "birthDate 는 YYYY.MM.DD. 형식이어야 합니다." }, { status: 400 });
      }
      const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
      if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) {
        return NextResponse.json({ error: "birthDate 의 연/월/일 범위가 올바르지 않습니다." }, { status: 400 });
      }
      data.birth_date = new Date(Date.UTC(y, mo - 1, d));
    } else {
      return NextResponse.json({ error: "birthDate 형식이 올바르지 않습니다." }, { status: 400 });
    }
  }
  if (body.birthYear !== undefined) {
    if (body.birthYear === null) {
      data.birth_date = null;
    } else if (
      typeof body.birthYear === "number" &&
      Number.isInteger(body.birthYear) &&
      body.birthYear >= 1900 &&
      body.birthYear <= 2100
    ) {
      const month = existing.birth_date ? existing.birth_date.getUTCMonth() : 0;
      const day = existing.birth_date ? existing.birth_date.getUTCDate() : 1;
      data.birth_date = new Date(Date.UTC(body.birthYear, month, day));
    } else {
      return NextResponse.json(
        { error: "birthYear 는 1900~2100 정수 또는 null 이어야 합니다." },
        { status: 400 },
      );
    }
  }

  if (Object.keys(data).length > 0) {
    try {
      await prisma.user.update({ where: { user_id: userId }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
        }
        if (e.code === "P2002") {
          // email unique 충돌 케이스
          return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
        }
      }
      throw e;
    }
  }

  // academicStatus / currentLawschool / cohort 는 가장 최근 MentorRecord 또는 MenteeRecord 에 저장.
  // current_role 기준으로 어느 record 를 업데이트할지 결정.
  // record 가 없으면 silent skip — 신청서가 없는 회원은 후속 신청 시 입력될 값.
  const hasAcademic = body.academicStatus !== undefined;
  const hasLawschool = body.currentLawschool !== undefined;
  const hasCohort = body.cohort !== undefined;

  if (hasAcademic) {
    if (body.academicStatus !== null && (typeof body.academicStatus !== "string" || !VALID_ACADEMIC.has(body.academicStatus))) {
      return NextResponse.json({ error: "academicStatus 가 올바르지 않습니다." }, { status: 400 });
    }
  }
  if (hasCohort) {
    if (body.cohort !== null && (typeof body.cohort !== "number" || !Number.isInteger(body.cohort) || body.cohort < 1 || body.cohort > 50)) {
      return NextResponse.json({ error: "cohort 는 1~50 정수 또는 null 이어야 합니다." }, { status: 400 });
    }
  }
  if (hasLawschool) {
    if (body.currentLawschool !== null && typeof body.currentLawschool !== "string") {
      return NextResponse.json({ error: "currentLawschool 형식이 올바르지 않습니다." }, { status: 400 });
    }
  }

  if (hasAcademic || hasLawschool || hasCohort) {
    const role = existing.current_role;
    if (role === "mentor") {
      const latest = await prisma.mentorRecord.findFirst({
        where: { user_id: userId },
        orderBy: { process_year: "desc" },
        select: { record_id: true },
      });
      if (latest) {
        const mData: Prisma.MentorRecordUpdateInput = {};
        if (hasAcademic) mData.academic_status = body.academicStatus as Prisma.MentorRecordUpdateInput["academic_status"];
        if (hasLawschool) mData.lawschool_name = body.currentLawschool && body.currentLawschool.trim() ? body.currentLawschool.trim() : null;
        if (hasCohort) mData.lawschool_grade = body.cohort ?? null;
        await prisma.mentorRecord.update({ where: { record_id: latest.record_id }, data: mData });
      }
    } else if (role === "mentee" && hasAcademic) {
      const latest = await prisma.menteeRecord.findFirst({
        where: { user_id: userId },
        orderBy: { process_year: "desc" },
        select: { record_id: true },
      });
      if (latest) {
        await prisma.menteeRecord.update({
          where: { record_id: latest.record_id },
          data: { academic_status: body.academicStatus as Prisma.MenteeRecordUpdateInput["academic_status"] },
        });
      }
    }
  }

  const detail = await buildUserDetail(userId);
  if (!detail) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(detail);
}
