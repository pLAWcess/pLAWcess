// 어드민 — 멘토 계정 생성/목록 (#262)
//
// - POST: 회원가입 흐름을 거치지 않고 어드민이 직접 멘토 계정을 만든다.
//   학번/생년월일/재학증명서 등 회원가입에 강제되던 필드는 받지 않으며
//   email 은 현재 폼에 항목이 없으므로 placeholder 로 자동 생성한다 (login_id 기반).
//   currentLawschool 이 제공되고 활성 cycle 이 있으면 mentor_record 의
//   lawschool_name 도 함께 채워 곧장 매칭 풀에 노출되도록 한다.
//
// - GET: current_role=mentor 인 활성 계정 목록. 최신 mentor_record 의
//   lawschool_name 을 합성해 카드 표시용 데이터로 내려준다.
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@plawcess/database";
import { requireAdmin } from "@/lib/admin-guard";

const LOGIN_ID_REGEX = /^[a-zA-Z0-9_]{4,30}$/;
const STUDENT_ID_REGEX = /^[a-zA-Z0-9]{4,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 50;
const SCHOOL_NAME_MAX = 100;
// 어드민이 발급하는 임시 비밀번호는 일반 회원가입의 복잡도 규칙을 적용하지 않는다.
// (멘토가 첫 로그인 시 본인 규칙에 맞게 재설정하는 흐름) bcrypt 의 72바이트 한계와
// ASCII printable 만 가드.
const TEMP_PASSWORD_MAX = 72;
const ASCII_PRINTABLE = /^[\x20-\x7E]+$/;

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function placeholderEmail(loginId: string): string {
  // 어드민이 만든 멘토 계정은 실제 이메일이 없으므로 충돌 안 나는 도메인을 사용한다.
  // 멘토 본인이 추후 설정 페이지에서 변경하면 됨.
  return `${loginId.toLowerCase()}@mentor.plawcess.local`;
}

type MentorListRow = {
  userId: string;
  name: string;
  loginId: string | null;
  email: string;
  lawschoolName: string | null;
  createdAt: string;
};

export async function GET(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const users = await prisma.user.findMany({
    where: { current_role: "mentor", is_deleted: false },
    orderBy: { created_at: "desc" },
    select: {
      user_id: true,
      name: true,
      login_id: true,
      email: true,
      created_at: true,
      mentor_records: {
        orderBy: { process_year: "desc" },
        take: 1,
        select: { lawschool_name: true },
      },
    },
  });

  const mentors: MentorListRow[] = users.map((u) => ({
    userId: u.user_id,
    name: u.name,
    loginId: u.login_id,
    email: u.email,
    lawschoolName: u.mentor_records[0]?.lawschool_name ?? null,
    createdAt: u.created_at.toISOString(),
  }));

  return NextResponse.json({ mentors });
}

export async function POST(req: NextRequest) {
  const guard = requireAdmin(req);
  if (guard.error) return guard.error;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const loginId = typeof body.loginId === "string" ? body.loginId.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const emailInput = trimOrNull(body.email);
  const studentId = trimOrNull(body.studentId);
  const undergradFirstMajor = trimOrNull(body.undergradFirstMajor);
  const currentLawschool = trimOrNull(body.currentLawschool);
  const lawschoolGrade = intOrNull(body.lawschoolGrade);

  if (!name || !loginId || !password) {
    return NextResponse.json(
      { error: "이름·아이디·비밀번호는 필수입니다." },
      { status: 400 },
    );
  }
  if (name.length > NAME_MAX) {
    return NextResponse.json({ error: `이름은 ${NAME_MAX}자 이하여야 합니다.` }, { status: 400 });
  }
  if (!LOGIN_ID_REGEX.test(loginId)) {
    return NextResponse.json(
      { error: "아이디는 영문/숫자/언더스코어 4~30자여야 합니다." },
      { status: 400 },
    );
  }
  if (currentLawschool && currentLawschool.length > SCHOOL_NAME_MAX) {
    return NextResponse.json(
      { error: `소속 로스쿨은 ${SCHOOL_NAME_MAX}자 이하여야 합니다.` },
      { status: 400 },
    );
  }
  if (password.length === 0 || password.length > TEMP_PASSWORD_MAX) {
    return NextResponse.json(
      { error: `임시 비밀번호는 1~${TEMP_PASSWORD_MAX}자여야 합니다.` },
      { status: 400 },
    );
  }
  if (!ASCII_PRINTABLE.test(password)) {
    return NextResponse.json(
      { error: "임시 비밀번호는 ASCII 인쇄 가능 문자만 사용할 수 있습니다." },
      { status: 400 },
    );
  }
  if (emailInput && !EMAIL_REGEX.test(emailInput)) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (studentId && !STUDENT_ID_REGEX.test(studentId)) {
    return NextResponse.json(
      { error: "학번은 영문/숫자 4~20자여야 합니다." },
      { status: 400 },
    );
  }

  const email = emailInput ?? placeholderEmail(loginId);

  const [loginIdDup, emailDup, studentIdDup] = await Promise.all([
    prisma.user.findUnique({ where: { login_id: loginId } }),
    prisma.user.findUnique({ where: { email } }),
    studentId
      ? prisma.user.findFirst({
          where: { student_id: studentId, is_deleted: false },
          select: { user_id: true },
        })
      : Promise.resolve(null),
  ]);
  if (loginIdDup) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }
  if (emailDup) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }
  if (studentIdDup) {
    return NextResponse.json({ error: "이미 가입된 학번입니다." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // 로스쿨 정보(소속 또는 기수)가 하나라도 있으면 활성 cycle 의 mentor_record 를 미리 만든다.
  const hasLawschoolInfo = !!(currentLawschool || lawschoolGrade !== null);
  const activeCycle = hasLawschoolInfo
    ? await prisma.cycleSchedule.findFirst({
        where: { is_active: true },
        select: { process_year: true },
      })
    : null;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          login_id: loginId,
          email,
          password_hash: passwordHash,
          current_role: "mentor",
          student_id: studentId,
          undergrad_first_major: undergradFirstMajor,
        },
        select: {
          user_id: true,
          name: true,
          login_id: true,
          email: true,
          current_role: true,
          created_at: true,
        },
      });
      if (hasLawschoolInfo && activeCycle) {
        await tx.mentorRecord.create({
          data: {
            user_id: created.user_id,
            process_year: activeCycle.process_year,
            lawschool_name: currentLawschool,
            lawschool_grade: lawschoolGrade,
          },
        });
      }
      return created;
    });

    return NextResponse.json(
      {
        mentor: {
          userId: user.user_id,
          name: user.name,
          loginId: user.login_id,
          email: user.email,
          lawschoolName: currentLawschool,
          createdAt: user.created_at.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "중복된 계정 정보입니다." },
        { status: 409 },
      );
    }
    throw e;
  }
}
