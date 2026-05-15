import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { prisma } from "@plawcess/database";
import { signToken, makeAuthCookie } from "@/lib/auth";
import { verifySignupVerificationToken } from "@/lib/auth-tokens";
import { validatePassword } from "@/lib/password";
import { labelToDate } from "@/lib/labels";
import { validateCertFile, uploadCert } from "@/lib/enrollment-cert";
import { removeMany } from "@/lib/storage";

const LOGIN_ID_REGEX = /^[a-zA-Z0-9_]{4,30}$/;
const STUDENT_ID_REGEX = /^[a-zA-Z0-9]{4,20}$/;
const BIRTH_DATE_REGEX = /^\d{4}\.\d{2}\.\d{2}\.$/;
const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const name = (form.get("name") ?? "") as string;
  const loginId = (form.get("loginId") ?? "") as string;
  const email = (form.get("email") ?? "") as string;
  const password = (form.get("password") ?? "") as string;
  const studentId = (form.get("studentId") ?? "") as string;
  const birthDate = (form.get("birthDate") ?? "") as string;
  const phone = (form.get("phone") ?? "") as string;
  const signupVerificationToken = (form.get("signupVerificationToken") ?? "") as string;
  const enrollmentFileRaw = form.get("enrollmentFile");
  const enrollmentFile = enrollmentFileRaw instanceof File ? enrollmentFileRaw : null;

  if (!name || !loginId || !email || !password || !studentId || !birthDate || !signupVerificationToken) {
    return NextResponse.json(
      { error: "이름·아이디·이메일·비밀번호·학번·생년월일·이메일 인증 토큰은 필수입니다." },
      { status: 400 },
    );
  }
  if (!LOGIN_ID_REGEX.test(loginId)) {
    return NextResponse.json({ error: "아이디는 영문/숫자/언더스코어 4~30자여야 합니다." }, { status: 400 });
  }
  if (!STUDENT_ID_REGEX.test(studentId)) {
    return NextResponse.json({ error: "학번은 영문/숫자 4~20자여야 합니다." }, { status: 400 });
  }
  if (!BIRTH_DATE_REGEX.test(birthDate)) {
    return NextResponse.json({ error: "생년월일은 YYYY.MM.DD. 형식으로 입력해주세요." }, { status: 400 });
  }
  if (phone && !PHONE_REGEX.test(phone)) {
    return NextResponse.json({ error: "전화번호는 010-XXXX-XXXX 형식으로 입력해주세요." }, { status: 400 });
  }
  const birthDateParsed = labelToDate(birthDate);
  if (!birthDateParsed) {
    return NextResponse.json({ error: "유효하지 않은 생년월일입니다." }, { status: 400 });
  }
  const certError = validateCertFile(enrollmentFile);
  if (certError) {
    return NextResponse.json({ error: certError }, { status: 400 });
  }
  const pwResult = validatePassword(password);
  if (!pwResult.ok) {
    return NextResponse.json({ error: pwResult.reason }, { status: 400 });
  }

  // 이메일 인증 토큰 검증
  const payload = verifySignupVerificationToken(signupVerificationToken);
  if (!payload || payload.email !== email) {
    return NextResponse.json({ error: "이메일 인증이 만료되었거나 유효하지 않습니다." }, { status: 401 });
  }

  // 중복 재검 (race 방어). 학번은 동일인 중복가입 방지용 (#270).
  // 소프트 삭제된 계정은 새 user_id 로 가입 허용 (옛 데이터는 격리 상태로 남음).
  const [emailDup, loginIdDup, studentIdDup] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { login_id: loginId } }),
    prisma.user.findFirst({
      where: { student_id: studentId, is_deleted: false },
      select: { user_id: true },
    }),
  ]);
  if (emailDup) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }
  if (loginIdDup) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }
  if (studentIdDup) {
    return NextResponse.json({ error: "이미 가입된 학번입니다." }, { status: 409 });
  }

  // user_id 미리 생성 — Supabase Storage 경로에 포함시키기 위함.
  // 업로드 → DB 순서로 처리(Approach 1): DB 실패 시 storage 정리.
  const userId = randomUUID();

  let cert;
  try {
    cert = await uploadCert(userId, enrollmentFile!);
  } catch (err) {
    console.error("[signup] 재학증명서 업로드 실패", err);
    return NextResponse.json(
      { error: "재학증명서 업로드에 실패했습니다." },
      { status: 500 },
    );
  }

  const password_hash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        user_id: userId,
        name,
        login_id: loginId,
        email,
        password_hash,
        student_id: studentId,
        birth_date: birthDateParsed,
        phone: phone || null,
        current_role: "mentee",
        // 신규 가입은 미검증 상태로 시작한다. 관리자 검증 전까지는
        // 프로세스 신청·AI 정성 분석·합격 아카이브 등 제한 기능을 사용할 수 없다 (#289).
        account_status: "inactive",
        military_status: "not_applicable",
        enrollment_doc_path: cert.storagePath,
        enrollment_doc_filename: cert.filename,
        enrollment_doc_mime: cert.mime,
        enrollment_doc_size: cert.size,
        enrollment_doc_uploaded_at: cert.uploadedAt,
      },
      select: {
        user_id: true,
        name: true,
        login_id: true,
        email: true,
        student_id: true,
        current_role: true,
        account_status: true,
        military_status: true,
      },
    });
  } catch (err) {
    // 업로드 성공 후 DB 저장 실패 — 고아 객체 정리 (실패해도 사용자 흐름 막지 않음).
    await removeMany([cert.storagePath]).catch(() => {});
    throw err;
  }

  const token = signToken({ user_id: user.user_id, current_role: user.current_role, name: user.name, email: user.email, login_id: user.login_id });

  return NextResponse.json(
    { user },
    { status: 201, headers: { "Set-Cookie": makeAuthCookie(token) } },
  );
}
