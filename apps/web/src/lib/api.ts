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

const USER_KEY = "plawcess:user";

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

export function clearUser() {
  try { localStorage.removeItem(USER_KEY); } catch {}
}

export async function getQuantitative(year: string): Promise<QuantitativeData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/quantitative?year=${encodeURIComponent(year)}`,
    { headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("정량 데이터 조회 실패");
  return res.json();
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
  return res.json();
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
  militaryStatus: string;
};

// 가/나군 단일 슬롯, 슬롯별 학교 + 특별전형 boolean
export type AdmissionSlot = { school: string; isSpecial: boolean };
export type BasicInfoAdmission = {
  가: AdmissionSlot;
  나: AdmissionSlot;
  preferredGroup: '가' | '나' | null;
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

type AdmissionSlotPatch = { school?: string; isSpecial?: boolean };

export async function patchBasicInfo(
  year: string,
  body: {
    personal?: Partial<Omit<BasicInfoPersonal, "name" | "affiliation">>;
    admission?: {
      가?: AdmissionSlotPatch;
      나?: AdmissionSlotPatch;
      preferredGroup?: '가' | '나' | null;
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
// Mentor Basic Info
// ----------------------------------------------------------------

export type MentorBasicInfoPersonal = BasicInfoPersonal & {
  lawschool: string;             // 소속 로스쿨 (MentorRecord)
  lawschoolGrade: number | null; // 기수 (MentorRecord)
};

export type MentorBasicInfoData = {
  personal: MentorBasicInfoPersonal;
};

export async function getMentorBasicInfo(year: string): Promise<MentorBasicInfoData> {
  const res = await fetch(
    `${API_BASE}/api/mentor/basic-info?year=${encodeURIComponent(year)}`,
    { headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("멘토 기본정보 조회 실패");
  return res.json();
}

export async function patchMentorBasicInfo(
  year: string,
  body: {
    personal?: Partial<Omit<MentorBasicInfoPersonal, "name">>;
  }
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/mentor/basic-info?year=${encodeURIComponent(year)}`,
    { method: "PATCH", headers: headers(), credentials: "include", body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error("멘토 기본정보 저장 실패");
}

// ----------------------------------------------------------------
// Cycle Schedule
// ----------------------------------------------------------------

export type CycleSchedule = {
  process_year: number;
  is_active: boolean;
  mentor_recruit_start: string | null;
  mentor_recruit_end: string | null;
  mentee_apply_start: string | null;
  mentee_apply_end: string | null;
  matching_start: string | null;
  matching_end: string | null;
  match_announce_date: string | null;
  admission_result_start: string | null;
  admission_result_end: string | null;
};

export async function getCycleSchedules(): Promise<CycleSchedule[]> {
  const res = await fetch(`${API_BASE}/api/admin/cycle-schedules`, {
    headers: headers(), credentials: "include",
  });
  if (!res.ok) throw new Error("스케줄 조회 실패");
  return res.json();
}

export async function createCycleSchedule(process_year: number): Promise<CycleSchedule> {
  const res = await fetch(`${API_BASE}/api/admin/cycle-schedules`, {
    method: "POST", headers: headers(), credentials: "include",
    body: JSON.stringify({ process_year }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "연도 생성 실패");
  }
  return res.json();
}

export async function patchCycleSchedule(
  year: number,
  body: Partial<Omit<CycleSchedule, "process_year">>
): Promise<CycleSchedule> {
  const res = await fetch(`${API_BASE}/api/admin/cycle-schedules/${year}`, {
    method: "PATCH", headers: headers(), credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("스케줄 저장 실패");
  return res.json();
}

export async function deleteCycleSchedule(year: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/cycle-schedules/${year}`, {
    method: "DELETE", headers: headers(), credentials: "include",
  });
  if (!res.ok) throw new Error("연도 삭제 실패");
}

export async function getActiveCycleSchedule(): Promise<CycleSchedule | null> {
  const res = await fetch(`${API_BASE}/api/cycle-schedules/active`, {
    headers: headers(), credentials: "include",
  });
  if (!res.ok) throw new Error("활성 스케줄 조회 실패");
  return res.json();
}

export type SubmitApplicationResult = {
  success: true;
  application_id: string;
  submitted_at: string | null;
};

export async function submitMenteeApplication(year: string): Promise<SubmitApplicationResult> {
  const res = await fetch(
    `${API_BASE}/api/mentee/applications/submit?year=${encodeURIComponent(year)}`,
    { method: "POST", headers: headers(), credentials: "include" }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "신청서 제출 실패");
  }
  return res.json();
}

// ----------------------------------------------------------------
// Concerns (기타 고민)
// ----------------------------------------------------------------

export type ConcernData = {
  strengthsWeaknesses: string;
  desiredMentor: string;
  specialNotes: string;
  extraRequest: string;
};

export async function getConcerns(year: string): Promise<ConcernData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/concerns?year=${encodeURIComponent(year)}`,
    { headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("기타 고민 조회 실패");
  return res.json();
}

export async function patchConcern(
  year: string,
  body: Partial<ConcernData>
): Promise<ConcernData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/concerns?year=${encodeURIComponent(year)}`,
    { method: "PATCH", headers: headers(), credentials: "include", body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error("기타 고민 저장 실패");
  return res.json();
}

// ----------------------------------------------------------------
// Qualitative
// ----------------------------------------------------------------

export type ActivityCategory = '교내' | '대외' | '사회경험' | '자격·시험';

export type Attachment =
  | {
      type: 'document';
      kind: 'pdf' | 'docx' | 'pptx';
      filename: string;
      size: number;
      contentHash: string;
      extractedText: string;
      textCharCount: number;
      truncated: boolean;
    }
  | {
      type: 'image';
      kind: 'jpg' | 'png';
      filename: string;
      size: number;
      mimeType: string;
      contentHash: string;
    };

export type QualitativeActivity = {
  category?: ActivityCategory;
  name: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  content: string;
  attachments?: Attachment[];
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

export type KeywordCount = {
  keyword: string;
  count: number;
  sources?: string[];
};

export type StoryOutline = {
  intro: string;
  body: { label: string; text: string }[];
  conclusion: string;
};

export type QualitativeData = {
  careerGoal: "변호사" | "검사" | "판사" | "";
  activities: QualitativeActivity[];
  analysis: {
    isAnalyzed: boolean;
    analyzedAt: string | null;
    starAnalysis: { activities: StarItem[]; keywords?: KeywordCount[] } | null;
    aiKeywords: KeywordCount[] | null;
    storyOutline: StoryOutline | null;
    summaryOutdated: boolean;
    activitiesAnalyzed: boolean[];
  };
};

export type SingleAnalyzeResponse = {
  skipped: boolean;
  star: StarItem;
  data: QualitativeData;
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
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error ?? `정성 데이터 저장 실패 (HTTP ${res.status})`);
  }
  return res.json();
}

// ----------------------------------------------------------------
// 첨부 파일 + 활동 저장 + 인라인 단일 분석을 한 번에 수행하는 multipart PATCH.
// ----------------------------------------------------------------
export type PatchQualitativeMultipartResponse = QualitativeData & {
  inlineStar?: StarItem;
  inlineSkipped?: boolean;
  inlineError?: string;
  attachmentErrors?: string[];
};

export async function patchQualitativeMultipart(
  year: string,
  body: { careerGoal?: string; activities: QualitativeActivity[]; analyzeIndex?: number },
  filesByActivityIndex: Map<number, File[]>
): Promise<PatchQualitativeMultipartResponse> {
  const form = new FormData();
  form.append(
    "payload",
    JSON.stringify({
      careerGoal: body.careerGoal,
      activities: body.activities,
      analyze_index: body.analyzeIndex,
    })
  );
  for (const [idx, files] of filesByActivityIndex.entries()) {
    files.forEach((file, i) => {
      form.append(`files_${idx}_${i}`, file, file.name);
    });
  }

  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative?year=${encodeURIComponent(year)}`,
    { method: "PATCH", credentials: "include", body: form }
  );
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error("업로드 용량이 너무 큽니다. 첨부 파일 합계를 4MB 이하로 줄여주세요.");
    }
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error ?? `정성 데이터 저장 실패 (HTTP ${res.status})`);
  }
  return res.json();
}

export async function analyzeQualitativeActivity(
  year: string,
  index: number
): Promise<SingleAnalyzeResponse> {
  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative/analyze/${index}?year=${encodeURIComponent(year)}`,
    { method: "POST", headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("AI 분석 실패");
  return res.json();
}

export async function summarizeQualitative(
  year: string
): Promise<QualitativeData & { skipped: boolean }> {
  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative/summary?year=${encodeURIComponent(year)}`,
    { method: "POST", headers: headers(), credentials: "include" }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "AI 통합 분석 실패");
  }
  return res.json();
}

export async function deleteQualitativeActivity(year: string, index: number): Promise<QualitativeData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative?year=${encodeURIComponent(year)}&index=${index}`,
    { method: "DELETE", headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("활동 삭제 실패");
  return res.json();
}

// ----------------------------------------------------------------
// #176 Admin API
// ----------------------------------------------------------------

export type Paged<T> = {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
};

export type AdminAccountStatus = "active" | "inactive" | "blocked";
export type ApplicationStatusLabel = "pending" | "approved" | "rejected" | "revision";

export type AdminMenteeRow = {
  userId: string;
  name: string;
  studentId: string;
  firstMajor: string | null;
  secondMajor: string | null;
  phone: string;
  accountStatus: AdminAccountStatus;
};

export type AdminMentorRow = {
  userId: string;
  name: string;
  studentId: string;
  lawSchool: string | null;
  cohort: number | null;
  phone: string;
  accountStatus: AdminAccountStatus;
};

export type AdminMenteeApplicationRow = {
  applicationId: string;
  name: string;
  studentId: string;
  major: string;
  status: ApplicationStatusLabel;
  memo: string | null;
  submittedAt: string | null;
};

export type AdminMentorApplicationRow = {
  applicationId: string;
  name: string;
  studentId: string;
  school: string | null;
  status: ApplicationStatusLabel;
  memo: string | null;
  submittedAt: string | null;
};

export type EligibleMentee = {
  applicationId: string;
  userId: string;
  name: string;
  studentId: string;
  major: string;
  accountStatus: AdminAccountStatus;
};

export type EligibleMentor = {
  applicationId: string;
  userId: string;
  name: string;
  studentId: string;
  lawSchool: string | null;
  accountStatus: AdminAccountStatus;
};

export type EligiblePool = {
  year: number;
  mentees: EligibleMentee[];
  mentors: EligibleMentor[];
};

export type AnnouncementRow = {
  announcementId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: string;
};

export type AdminAnnouncementRow = AnnouncementRow & {
  isPublished: boolean;
  deletedAt: string | null;
};

function buildPaging(page?: number, limit?: number): string {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));
  const s = params.toString();
  return s ? `&${s}` : "";
}

async function jsonOrError<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

// 회원관리 ----------------------------------------------------------

export async function getAdminUsers(
  role: "mentee",
  page?: number, limit?: number,
): Promise<Paged<AdminMenteeRow>>;
export async function getAdminUsers(
  role: "mentor",
  page?: number, limit?: number,
): Promise<Paged<AdminMentorRow>>;
export async function getAdminUsers(
  role: "mentee" | "mentor",
  page?: number, limit?: number,
): Promise<Paged<AdminMenteeRow> | Paged<AdminMentorRow>> {
  const res = await fetch(
    `${API_BASE}/api/admin/users?role=${role}${buildPaging(page, limit)}`,
    { headers: headers(), credentials: "include" },
  );
  return jsonOrError(res, "회원 목록 조회 실패");
}

// 신청관리 ----------------------------------------------------------

export async function getAdminApplications(
  role: "mentee",
  options?: { year?: number; page?: number; limit?: number },
): Promise<Paged<AdminMenteeApplicationRow>>;
export async function getAdminApplications(
  role: "mentor",
  options?: { year?: number; page?: number; limit?: number },
): Promise<Paged<AdminMentorApplicationRow>>;
export async function getAdminApplications(
  role: "mentee" | "mentor",
  options?: { year?: number; page?: number; limit?: number },
): Promise<Paged<AdminMenteeApplicationRow> | Paged<AdminMentorApplicationRow>> {
  const params = new URLSearchParams({ role });
  if (options?.year !== undefined) params.set("year", String(options.year));
  if (options?.page !== undefined) params.set("page", String(options.page));
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  const res = await fetch(
    `${API_BASE}/api/admin/applications?${params.toString()}`,
    { headers: headers(), credentials: "include" },
  );
  return jsonOrError(res, "신청 목록 조회 실패");
}

export async function patchAdminApplication(
  id: string,
  body: { status?: ApplicationStatusLabel; memo?: string },
): Promise<AdminMenteeApplicationRow | AdminMentorApplicationRow> {
  const res = await fetch(`${API_BASE}/api/admin/applications/${id}`, {
    method: "PATCH", headers: headers(), credentials: "include",
    body: JSON.stringify(body),
  });
  return jsonOrError(res, "신청 수정 실패");
}

// 회원 상세 -------------------------------------------------------

export type AdminUserGender = "male" | "female" | "other";
export type AdminUserAcademicStatus = "enrolled" | "on_leave" | "completed" | "graduated" | "expelled";
export type AdminUserCurrentRole = "none" | "mentee" | "mentor" | "admin";

export type AdminUserParticipation = { year: number; role: "mentee" | "mentor" };

export type AdminUserDetail = {
  userId: string;
  name: string;
  birthYear: number | null;
  gender: AdminUserGender | null;
  phone: string;
  email: string;
  studentId: string;
  firstMajor: string;
  secondMajor: string;
  schoolName: string;
  academicStatus: AdminUserAcademicStatus | null;
  accountStatus: AdminAccountStatus;
  currentRole: AdminUserCurrentRole;
  currentLawschool: string | null;
  cohort: number | null;
  participation: AdminUserParticipation[];
};

export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    headers: headers(), credentials: "include",
  });
  return jsonOrError(res, "회원 상세 조회 실패");
}

export type PatchAdminUserBody = {
  name?: string;
  birthYear?: number | null;
  gender?: AdminUserGender | null;
  phone?: string;
  studentId?: string;
  firstMajor?: string;
  secondMajor?: string;
  schoolName?: string;
  accountStatus?: AdminAccountStatus;
  currentRole?: AdminUserCurrentRole;
};

export async function patchAdminUser(
  userId: string,
  body: PatchAdminUserBody,
): Promise<AdminUserDetail> {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    method: "PATCH", headers: headers(), credentials: "include",
    body: JSON.stringify(body),
  });
  return jsonOrError(res, "회원 정보 저장 실패");
}

// 매칭 적격 풀 ------------------------------------------------------

export async function getEligibleMatchingPool(year?: number): Promise<EligiblePool> {
  const qs = year !== undefined ? `?year=${year}` : "";
  const res = await fetch(
    `${API_BASE}/api/admin/matchings/eligible${qs}`,
    { headers: headers(), credentials: "include" },
  );
  return jsonOrError(res, "매칭 적격 풀 조회 실패");
}

// 공지사항 (admin) -------------------------------------------------

export async function listAdminAnnouncements(
  page?: number, limit?: number,
): Promise<Paged<AdminAnnouncementRow>> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/api/admin/announcements${qs ? `?${qs}` : ""}`,
    { headers: headers(), credentials: "include" },
  );
  return jsonOrError(res, "공지사항 목록 조회 실패");
}

export async function createAnnouncement(
  body: { title: string; body: string },
): Promise<AnnouncementRow> {
  const res = await fetch(`${API_BASE}/api/admin/announcements`, {
    method: "POST", headers: headers(), credentials: "include",
    body: JSON.stringify(body),
  });
  return jsonOrError(res, "공지사항 작성 실패");
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/announcements/${id}`, {
    method: "DELETE", headers: headers(), credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "공지사항 삭제 실패");
  }
}

// 공지사항 (공개) ---------------------------------------------------

export async function listAnnouncements(
  page?: number, limit?: number,
): Promise<Paged<AnnouncementRow>> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/api/announcements${qs ? `?${qs}` : ""}`,
    { headers: headers(), credentials: "include" },
  );
  return jsonOrError(res, "공지사항 목록 조회 실패");
}

export async function getAnnouncement(id: string): Promise<AnnouncementRow> {
  const res = await fetch(`${API_BASE}/api/announcements/${id}`, {
    headers: headers(), credentials: "include",
  });
  return jsonOrError(res, "공지사항 조회 실패");
}
