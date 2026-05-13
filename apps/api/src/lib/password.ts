// 비밀번호 복잡도 검증 — 회원가입·비번 변경·비번 재설정 라우트 3곳에서 호출.
// FE 의 apps/web/src/lib/password.ts 와 로직 동일 — 변경 시 양쪽 모두 수정.
//
// 규칙:
//   - 8자 이상 64자 이하
//   - ASCII printable 만 (\x20–\x7E)  → bcrypt 72바이트 한계 안쪽 + .length = byte 보장
//   - 영문(대소 무관) / 숫자 / 특수문자 중 2종 이상

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 64;
export const PASSWORD_REQUIRED_CLASSES = 2;

const ASCII_PRINTABLE = /^[\x20-\x7E]+$/;

const CHAR_CLASSES = [
  /[a-zA-Z]/, // 영문 (대·소 무관 — 한 클래스)
  /[0-9]/, // 숫자
  /[^a-zA-Z0-9]/, // 특수문자 (ASCII printable 가드 뒤라 영숫자 외 ASCII printable 만 들어옴)
];

export function validatePassword(password: unknown): PasswordValidationResult {
  if (typeof password !== "string") {
    return { ok: false, reason: "비밀번호 형식이 올바르지 않습니다." };
  }
  if (password.length < PASSWORD_MIN_LEN) {
    return { ok: false, reason: `비밀번호는 ${PASSWORD_MIN_LEN}자 이상이어야 합니다.` };
  }
  if (password.length > PASSWORD_MAX_LEN) {
    return { ok: false, reason: `비밀번호는 ${PASSWORD_MAX_LEN}자 이하여야 합니다.` };
  }
  if (!ASCII_PRINTABLE.test(password)) {
    return { ok: false, reason: "비밀번호는 영문/숫자/특수문자만 사용할 수 있습니다." };
  }
  const classCount = CHAR_CLASSES.filter((re) => re.test(password)).length;
  if (classCount < PASSWORD_REQUIRED_CLASSES) {
    return { ok: false, reason: "비밀번호는 영문/숫자/특수문자 중 2종 이상을 조합해야 합니다." };
  }
  return { ok: true };
}
