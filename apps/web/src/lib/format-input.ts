// 입력 자동 포맷 유틸 — placeholder 슬롯 패턴(`null` = 숫자, 문자열 = 고정 구분자)에 맞춰
// 사용자가 입력한 숫자 사이에 구분자를 자동으로 삽입한다. 회원가입·기본정보 등 여러 폼에서 공유.

export const BIRTH_DATE_FORMAT: Array<string | null> = [
  null, null, null, null, '.', null, null, '.', null, null, '.',
];

export const PHONE_FORMAT: Array<string | null> = [
  null, null, null, '-', null, null, null, null, '-', null, null, null, null,
];

/**
 * 슬롯 패턴에 맞춰 input 문자열을 포맷한다.
 *   - 비숫자는 모두 제거 후 슬롯에 채움 (붙여넣기 호환)
 *   - 마지막 종결 구분자(예: YYYY.MM.DD. 의 끝 '.')도 자동 노출
 */
export function autoFormat(input: string, expected: Array<string | null>): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) return '';
  let result = '';
  let digitIdx = 0;
  for (const slot of expected) {
    if (slot === null) {
      if (digitIdx >= digits.length) break;
      result += digits[digitIdx];
      digitIdx++;
    } else {
      result += slot;
    }
  }
  return result;
}

/**
 * 자동 포맷 + 백스페이스 보정.
 *   - 사용자가 자동 추가된 구분자만 한 글자 지운 경우, 그 앞 숫자도 함께 제거해
 *     한 칸의 의미 있는 삭제가 되도록 한다.
 */
export function applyAutoFormat(
  input: string,
  prev: string,
  expected: Array<string | null>,
): string {
  let v = input;
  if (v === prev.slice(0, -1) && /[-.]/.test(prev.slice(-1))) {
    v = v.slice(0, -1);
  }
  return autoFormat(v, expected);
}
