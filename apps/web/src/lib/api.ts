const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  return { "Content-Type": "application/json" };
}

const LS_PREFIX = "plawcess:";
const USER_KEY = `${LS_PREFIX}user`;

export type AuthUser = { user_id: string; name: string; email: string; current_role: string };

export function saveUser(user: AuthUser) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch {}
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsKey(year: string) {
  const userId = getUser()?.user_id ?? "anonymous";
  return `${LS_PREFIX}quantitative:${userId}:${year}`;
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
    { headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("정량 데이터 조회 실패");
  const data = await res.json();
  writeLocalCache(year, data);
  return data;
}

export function getCachedQuantitative(year: string): QuantitativeData | null {
  return readLocalCache(year);
}

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

export async function patchQuantitative(
  year: string,
  body: Partial<QuantitativeData>
): Promise<QuantitativeData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/quantitative?year=${encodeURIComponent(year)}`,
    { method: "PATCH", headers: headers(), credentials: "include", body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error("정량 데이터 저장 실패");
  const data = await res.json();
  writeLocalCache(year, data);
  return data;
}
