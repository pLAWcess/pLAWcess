// HWP 업로드 검증 헬퍼 단독 검사.
// 실행: node --experimental-strip-types apps/api/scripts/verify-hwp-upload.ts   (Node 24)
import { validateHwpUpload, MAX_HWP_BYTES } from "../src/lib/hwp-upload.ts";

const CFBF = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const PDF = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\nrest of a pdf", "latin1");

// 정상 .hwp: CFBF 매직 + 'HWP Document File' 시그니처(+버전) + 패딩.
const validHwp = Buffer.concat([
  CFBF,
  Buffer.from("HWP Document File", "latin1"),
  Buffer.alloc(64), // 패딩
]);
// 정상 .hwpx: ZIP 매직으로 시작하는 임의 바이트.
const validHwpx = Buffer.concat([ZIP, Buffer.alloc(128)]);

function file(name: string, data: Buffer): File {
  return new File([data], name, { type: "" });
}

type Case = { name: string; input: unknown; expect: "ok" | number };

const cases: Case[] = [
  { name: "null", input: null, expect: 400 },
  { name: "문자열", input: "not a file", expect: 400 },
  { name: "빈 .hwp", input: file("x.hwp", Buffer.alloc(0)), expect: 400 },
  { name: "초과 크기 .hwp", input: file("big.hwp", Buffer.concat([validHwp, Buffer.alloc(MAX_HWP_BYTES)])), expect: 413 },
  { name: ".pdf 확장자", input: file("doc.pdf", PDF), expect: 415 },
  { name: ".hwp 확장자인데 PDF 내용", input: file("fake.hwp", PDF), expect: 415 },
  { name: ".hwp 확장자인데 CFBF 매직만 (시그니처 없음)", input: file("nosig.hwp", Buffer.concat([CFBF, Buffer.alloc(64)])), expect: 415 },
  { name: ".hwpx 확장자인데 ZIP 아님", input: file("fake.hwpx", PDF), expect: 415 },
  { name: "정상 .hwp", input: file("ok.hwp", validHwp), expect: "ok" },
  { name: "정상 .HWP (대문자 확장자)", input: file("OK.HWP", validHwp), expect: "ok" },
  { name: "정상 .hwpx", input: file("ok.hwpx", validHwpx), expect: "ok" },
];

let failed = 0;
for (const c of cases) {
  const r = await validateHwpUpload(c.input);
  const got = r.ok ? "ok" : r.status;
  const pass = got === c.expect;
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${c.name}  →  expected ${c.expect}, got ${got}${!r.ok ? ` ("${r.error}")` : ""}`);
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} cases passed.`);
