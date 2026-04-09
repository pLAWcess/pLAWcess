const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// TODO: 인증 구현 후 세션 토큰 기반으로 교체
const TEMP_USER_ID = process.env.NEXT_PUBLIC_TEMP_USER_ID ?? "";

export type LeetSection = {
  verbal: { raw: number | null; standard: number | null; percentile: number | null };
  reasoning: { raw: number | null; standard: number | null; percentile: number | null };
};

export type GpaSection = {
  overall: number | null;
  major: number | null;
  converted: number | null;
};

export type LanguageSection = {
  toeic: number | null;
  toefl: number | null;
  teps: number | null;
};

export type QuantitativeData = {
  leet: LeetSection;
  gpa: GpaSection;
  language: LanguageSection;
};

function headers() {
  return {
    "Content-Type": "application/json",
    "x-user-id": TEMP_USER_ID,
  };
}

const LS_PREFIX = "plawcess:";

function lsKey(year: string) {
  return `${LS_PREFIX}quantitative:${TEMP_USER_ID}:${year}`;
}

function readLocalCache(year: string): QuantitativeData | null {
  try {
    const raw = localStorage.getItem(lsKey(year));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalCache(year: string, data: QuantitativeData) {
  try {
    localStorage.setItem(lsKey(year), JSON.stringify(data));
  } catch {}
}

async function fetchQuantitative(year: string): Promise<QuantitativeData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/quantitative?year=${encodeURIComponent(year)}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error("정량 데이터 조회 실패");
  const data = await res.json();
  writeLocalCache(year, data);
  return data;
}

export function getCachedQuantitative(year: string): QuantitativeData | null {
  return readLocalCache(year);
}

// TODO: 로그아웃 핸들러에서 호출
export function clearAllCache() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(LS_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}

export async function getQuantitative(year: string): Promise<QuantitativeData> {
  return fetchQuantitative(year);
}

export type GradeRow = {
  년도: string;
  학기: string;
  학수번호: string;
  과목명: string;
  이수구분: string;
  교양영역: string;
  과목유형: string;
  학점: string;
  점수: string;
  등급: string;
  평점: string;
  재수강년도: string;
  재수강학기: string;
  재수강과목: string;
  삭제구분: string;
};

export async function fetchGradesFromKupid(id: string, pw: string): Promise<GradeRow[]> {
  const res = await fetch(`${API_BASE}/api/grades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, pw }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "성적 불러오기 실패");
  }
  const data = await res.json();
  return data.rows as GradeRow[];
}

export async function patchQuantitative(
  year: string,
  body: Partial<QuantitativeData>
): Promise<QuantitativeData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/quantitative?year=${encodeURIComponent(year)}`,
    { method: "PATCH", headers: headers(), body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error("정량 데이터 저장 실패");
  const data = await res.json();
  writeLocalCache(year, data);
  return data;
}
