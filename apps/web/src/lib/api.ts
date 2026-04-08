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

function lsKey(year: string) {
  return `quantitative:${TEMP_USER_ID}:${year}`;
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

// TODO: 로그아웃 핸들러에서 호출 — clearQuantitativeCache(userId)
export function clearQuantitativeCache(userId: string) {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`quantitative:${userId}:`))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}

export async function getQuantitative(year: string): Promise<QuantitativeData> {
  return fetchQuantitative(year);
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
