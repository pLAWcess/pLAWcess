import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

type UserRow = {
  user_id: string;
  name: string;
  birth_date: Date | null;
  gender: string | null;
  phone: string | null;
  email: string;
  student_id: string | null;
  undergrad_first_major: string | null;
  undergrad_second_major: string | null;
  undergrad_school_name: string | null;
  account_status: string;
  current_role: string;
};

type ParticipationItem = { year: number; role: "mentee" | "mentor" };

async function buildUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      name: true,
      birth_date: true,
      gender: true,
      phone: true,
      email: true,
      student_id: true,
      undergrad_first_major: true,
      undergrad_second_major: true,
      undergrad_school_name: true,
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
    gender: user.gender,
    phone: user.phone ?? "",
    email: user.email,
    studentId: user.student_id ?? "",
    firstMajor: user.undergrad_first_major ?? "",
    secondMajor: user.undergrad_second_major ?? "",
    schoolName: user.undergrad_school_name ?? "",
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
  gender?: string | null;
  phone?: string;
  studentId?: string;
  firstMajor?: string;
  secondMajor?: string;
  schoolName?: string;
  accountStatus?: string;
  currentRole?: string;
};

const VALID_GENDER = new Set(["male", "female", "other"]);
const VALID_ACCOUNT_STATUS = new Set(["active", "inactive", "blocked"]);
const VALID_CURRENT_ROLE = new Set(["none", "mentee", "mentor", "admin"]);

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

  // birthYear → birth_date 변환에 기존 month/day 보존이 필요하므로 현재 row 조회
  const existing = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { birth_date: true, is_deleted: true },
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
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
      }
      throw e;
    }
  }

  const detail = await buildUserDetail(userId);
  if (!detail) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(detail);
}
