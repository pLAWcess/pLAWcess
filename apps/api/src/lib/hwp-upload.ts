// 한글 문서(.hwp / .hwpx) 업로드 검증 — personal-statement 라우트(멘티·admin) 공용.
//
// 막는 것:
//   1) 과도한 크기 — arrayBuffer()로 통째 메모리에 올리기 전, size 헤더로 1차 거름.
//   2) 허용 외 확장자 — .hwp / .hwpx 만.
//   3) 내용 위장 — PDF/exe 등을 .hwp 로 rename 한 경우. 매직넘버 + .hwp 는 시그니처까지.
//
// ▼ 한도 변경 지점: 유료 요금제 도입 시 여기만 바꾸면 됨.
//   환경변수 HWP_MAX_BYTES 로 배포별 오버라이드도 가능. 단 Vercel serverless 의
//   요청 본문 한계(~4.5MB)를 함께 검토할 것 — 그 이상은 별도 업로드 경로가 필요하다.
export const MAX_HWP_BYTES = Number(process.env.HWP_MAX_BYTES) || 4 * 1024 * 1024;

// .hwp 5.x = OLE 복합문서(CFBF). 파일 시작 8바이트가 고정 시그니처.
const CFBF_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
// .hwpx = ZIP 기반(OPC). 파일 시작 4바이트 "PK\x03\x04".
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
// .hwp 의 FileHeader 스트림은 비압축이라 이 ASCII 문자열이 파일 바이트 어딘가에 그대로 존재한다.
const HWP_SIGNATURE = Buffer.from("HWP Document File", "latin1");

export type HwpValidationResult =
  // bytes 는 Buffer<ArrayBuffer> — Prisma 의 Bytes 컬럼이 요구하는 Uint8Array<ArrayBuffer> 와 호환되도록.
  | { ok: true; bytes: Buffer<ArrayBuffer>; filename: string; size: number }
  | { ok: false; status: 400 | 413 | 415; error: string };

function maxMb(): string {
  return (MAX_HWP_BYTES / 1024 / 1024).toFixed(1);
}

export async function validateHwpUpload(file: unknown): Promise<HwpValidationResult> {
  if (!file || !(file instanceof Blob)) {
    return { ok: false, status: 400, error: "hwp 파일이 없습니다." };
  }

  const filename = file instanceof File ? file.name : "upload.hwp";
  const lower = filename.toLowerCase();
  const isHwpx = lower.endsWith(".hwpx");
  const isHwp = !isHwpx && lower.endsWith(".hwp");
  if (!isHwp && !isHwpx) {
    return { ok: false, status: 415, error: ".hwp 또는 .hwpx 파일만 업로드할 수 있습니다." };
  }

  // 1차 거름 — 헤더상 크기로 빠르게 거절 (큰 파일을 메모리에 올리기 전).
  if (typeof file.size === "number") {
    if (file.size === 0) return { ok: false, status: 400, error: "빈 파일입니다." };
    if (file.size > MAX_HWP_BYTES) {
      return { ok: false, status: 413, error: `파일이 너무 큽니다. 최대 ${maxMb()}MB.` };
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // 2차 — 실측 길이로 재확인 (size 헤더를 못 믿는 경우 대비).
  if (bytes.length === 0) return { ok: false, status: 400, error: "빈 파일입니다." };
  if (bytes.length > MAX_HWP_BYTES) {
    return { ok: false, status: 413, error: `파일이 너무 큽니다. 최대 ${maxMb()}MB.` };
  }

  if (isHwpx) {
    if (!bytes.subarray(0, 4).equals(ZIP_MAGIC)) {
      return { ok: false, status: 415, error: "올바른 HWPX 파일이 아닙니다." };
    }
  } else {
    if (!bytes.subarray(0, 8).equals(CFBF_MAGIC) || !bytes.includes(HWP_SIGNATURE)) {
      return { ok: false, status: 415, error: "올바른 HWP 파일이 아닙니다." };
    }
  }

  return { ok: true, bytes, filename, size: bytes.length };
}
