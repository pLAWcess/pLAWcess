// 비밀번호 복잡도 검증 — 회원가입·비번 변경·비번 재설정 폼에서 호출.
// BE 의 apps/api/src/lib/password.ts 와 로직 동일 — 변경 시 양쪽 모두 수정.
// (apps/web 과 apps/api 가 다른 워크스페이스라 import 불가 → 의도적 복제.)
//
// 규칙:
//   - 8자 이상 64자 이하
//   - ASCII printable 만 (\x20–\x7E)
//   - 영문(대소 무관) / 숫자 / 특수문자 중 2종 이상

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 64;
export const PASSWORD_REQUIRED_CLASSES = 2;

const ASCII_PRINTABLE = /^[\x20-\x7E]+$/;

const CHAR_CLASSES = [
  /[a-zA-Z]/,
  /[0-9]/,
  /[^a-zA-Z0-9]/,
];

export function validatePassword(password: unknown): PasswordValidationResult {
  if (typeof password !== 'string') {
    return { ok: false, reason: '비밀번호 형식이 올바르지 않습니다.' };
  }
  if (password.length < PASSWORD_MIN_LEN) {
    return { ok: false, reason: `비밀번호는 ${PASSWORD_MIN_LEN}자 이상이어야 합니다.` };
  }
  if (password.length > PASSWORD_MAX_LEN) {
    return { ok: false, reason: `비밀번호는 ${PASSWORD_MAX_LEN}자 이하여야 합니다.` };
  }
  if (!ASCII_PRINTABLE.test(password)) {
    return { ok: false, reason: '비밀번호는 영문/숫자/특수문자만 사용할 수 있습니다.' };
  }
  const classCount = CHAR_CLASSES.filter((re) => re.test(password)).length;
  if (classCount < PASSWORD_REQUIRED_CLASSES) {
    return { ok: false, reason: '비밀번호는 영문/숫자/특수문자 중 2종 이상을 조합해야 합니다.' };
  }
  return { ok: true };
}

// FE 의 실시간 체크리스트 UI 용 — 각 규칙별 충족 여부와 현재 값.
// charset 위반 시 classes 카운트는 0 으로 게이트해 UX 일관성 유지(영문/숫자/특수만 셈).
export type PasswordHints = {
  length: { ok: boolean; current: number; min: number; max: number };
  charset: { ok: boolean };
  classes: { ok: boolean; current: number; required: number };
};

export function getPasswordHints(password: string): PasswordHints {
  const len = password.length;
  const length = { ok: len >= PASSWORD_MIN_LEN && len <= PASSWORD_MAX_LEN, current: len, min: PASSWORD_MIN_LEN, max: PASSWORD_MAX_LEN };
  const charset = { ok: len > 0 && ASCII_PRINTABLE.test(password) };
  const classCount = charset.ok ? CHAR_CLASSES.filter((re) => re.test(password)).length : 0;
  const classes = { ok: classCount >= PASSWORD_REQUIRED_CLASSES, current: classCount, required: PASSWORD_REQUIRED_CLASSES };
  return { length, charset, classes };
}
