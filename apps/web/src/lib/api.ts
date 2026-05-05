const API_BASE = "";

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

export type AuthUser = { user_id: string; name: string; login_id: string | null; email: string; current_role: string };

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

// ----------------------------------------------------------------
// Basic Info
// ----------------------------------------------------------------

export type BasicInfoPersonal = {
  name: string;
  affiliation: string;
  birthDate: string;
  gender: string;
  major1: string;
  major2: string;
  admissionYear: string;
  academicStatus: string;
  graduationYear: string;
};

export type BasicInfoAdmission = {
  // DB에 저장되는 필드: 가/나군 제1지망 학교, 특별전형 여부
  가: { first: string };
  나: { first: string };
  isSpecialAdmission: boolean;
};

export type BasicInfoData = {
  personal: BasicInfoPersonal;
  admission: BasicInfoAdmission;
};

export async function getBasicInfo(year: string): Promise<BasicInfoData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/basic-info?year=${encodeURIComponent(year)}`,
    { headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("기본정보 조회 실패");
  return res.json();
}

export async function patchBasicInfo(
  year: string,
  body: {
    personal?: Partial<Omit<BasicInfoPersonal, "name" | "affiliation">>;
    admission?: {
      가?: { first?: string };
      나?: { first?: string };
      isSpecialAdmission?: boolean;
    };
  }
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/mentee/basic-info?year=${encodeURIComponent(year)}`,
    { method: "PATCH", headers: headers(), credentials: "include", body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error("기본정보 저장 실패");
}

// ----------------------------------------------------------------
// Qualitative
// ----------------------------------------------------------------

export type ActivityCategory = '교내' | '대외' | '사회경험' | '자격·시험';

export type QualitativeActivity = {
  category?: ActivityCategory;
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
};

export type StarItem = {
  activity_index: number;
  activity_name: string;
  summary: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  keywords: string[];
};

export type QualitativeData = {
  careerGoal: "변호사" | "검사" | "판사" | "";
  activities: QualitativeActivity[];
  analysis: {
    isAnalyzed: boolean;
    analyzedAt: string | null;
    starAnalysis: { activities: StarItem[]; keywords?: string[] } | null;
    aiKeywords: string[] | null;
  };
};

export async function getQualitative(year: string): Promise<QualitativeData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative?year=${encodeURIComponent(year)}`,
    { headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("정성 데이터 조회 실패");
  return res.json();
}

export async function patchQualitative(
  year: string,
  body: { careerGoal?: string; activities?: QualitativeActivity[] }
): Promise<QualitativeData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative?year=${encodeURIComponent(year)}`,
    { method: "PATCH", headers: headers(), credentials: "include", body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error("정성 데이터 저장 실패");
  return res.json();
}

export async function analyzeQualitative(year: string): Promise<QualitativeData & { skipped: boolean }> {
  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative/analyze?year=${encodeURIComponent(year)}`,
    { method: "POST", headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("AI 분석 실패");
  return res.json();
}
