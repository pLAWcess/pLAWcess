// 비밀번호 복잡도 검증 standalone — #243.
// 실행: node --experimental-strip-types apps/api/scripts/verify-password.ts
//
// validatePassword 의 규칙별 분기를 12 케이스로 점검.

import { validatePassword } from "../src/lib/password.ts";

type Case = { input: unknown; expect: "ok" | "reject"; label: string };

const cases: Case[] = [
  { input: "", expect: "reject", label: "빈 문자열 (길이)" },
  { input: "abc", expect: "reject", label: "3자 (길이)" },
  { input: "abc1234", expect: "reject", label: "7자, 영+숫 2종이지만 길이 미달" },
  { input: "a".repeat(65), expect: "reject", label: "65자 (길이 초과)" },
  { input: "abcdefgh", expect: "reject", label: "8자, 영문만 1종" },
  { input: "12345678", expect: "reject", label: "8자, 숫자만 1종" },
  { input: "!@#$%^&*", expect: "reject", label: "8자, 특수만 1종" },
  { input: "abcd1234", expect: "ok", label: "8자, 영+숫 2종" },
  { input: "abc!@#$%", expect: "ok", label: "8자, 영+특 2종" },
  { input: "123!@#$%", expect: "ok", label: "8자, 숫+특 2종" },
  { input: "Abc1!Xyz", expect: "ok", label: "8자, 영(대·소)+숫+특 3종" },
  { input: "가나다1234abcd", expect: "reject", label: "한글 포함 (charset)" },
  { input: "abc1😀xyz1", expect: "reject", label: "이모지 포함 (charset)" },
  { input: null, expect: "reject", label: "null (형식)" },
];

let failed = 0;
for (const c of cases) {
  const result = validatePassword(c.input);
  const got: "ok" | "reject" = result.ok ? "ok" : "reject";
  const pass = got === c.expect;
  const detail = result.ok ? "" : `  → "${result.reason}"`;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${c.label}  →  expected ${c.expect}, got ${got}${detail}`,
  );
  if (!pass) failed++;
}

console.log("");
if (failed === 0) {
  console.log(`All ${cases.length} cases passed.`);
  process.exit(0);
} else {
  console.error(`${failed} of ${cases.length} cases failed.`);
  process.exit(1);
}
