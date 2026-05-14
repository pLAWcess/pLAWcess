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

// 정량 데이터 엔드포인트도 멘티/멘토 동일 형태 — role 로 베이스 경로만 다름.
export async function getQuantitative(role: 'mentee' | 'mentor', year: string): Promise<QuantitativeData> {
  const res = await fetch(
    `${API_BASE}/api/${role}/quantitative?year=${encodeURIComponent(year)}`,
    { headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("정량 데이터 조회 실패");
  return res.json();
}

export async function patchQuantitative(
  role: 'mentee' | 'mentor',
  year: string,
  body: Partial<QuantitativeData>
): Promise<QuantitativeData> {
  const res = await fetch(
    `${API_BASE}/api/${role}/quantitative?year=${encodeURIComponent(year)}`,
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
  is_schedule_visible: boolean;
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
      kind: 'pdf' | 'docx';
      filename: string;
      size: number;
      mimeType: string;
      contentHash: string;
      storagePath: string;
    }
  | {
      type: 'image';
      kind: 'jpg' | 'png';
      filename: string;
      size: number;
      mimeType: string;
      contentHash: string;
      storagePath: string;
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
  careerGoal: string;
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

// 정성 데이터 엔드포인트는 멘티/멘토가 동일 형태 — role 로 베이스 경로만 다름.
export type QualRole = 'mentee' | 'mentor';
const qualBase = (role: QualRole) => `${API_BASE}/api/${role}/qualitative`;

export async function getQualitative(role: QualRole, year: string): Promise<QualitativeData> {
  const res = await fetch(
    `${qualBase(role)}?year=${encodeURIComponent(year)}`,
    { headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("정성 데이터 조회 실패");
  return res.json();
}

export async function patchQualitative(
  role: QualRole,
  year: string,
  body: { careerGoal?: string; activities?: QualitativeActivity[]; reorderMapping?: number[] }
): Promise<QualitativeData> {
  const res = await fetch(
    `${qualBase(role)}?year=${encodeURIComponent(year)}`,
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
  role: QualRole,
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
    `${qualBase(role)}?year=${encodeURIComponent(year)}`,
    { method: "PATCH", credentials: "include", body: form }
  );
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error("업로드 용량이 너무 큽니다.\n첨부 파일 합계를 4MB 이하로 줄여주세요.");
    }
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error ?? `정성 데이터 저장 실패 (HTTP ${res.status})`);
  }
  return res.json();
}

export async function analyzeQualitativeActivity(
  role: QualRole,
  year: string,
  index: number
): Promise<SingleAnalyzeResponse> {
  const res = await fetch(
    `${qualBase(role)}/analyze/${index}?year=${encodeURIComponent(year)}`,
    { method: "POST", headers: headers(), credentials: "include" }
  );
  if (!res.ok) throw new Error("AI 분석 실패");
  return res.json();
}

// 통합 분석(키워드+자소서 흐름) — 멘티 전용. (멘토 정성에는 통합 분석 엔드포인트가 없음)
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

// ----------------------------------------------------------------
// 정성 이전 연도 캐리오버 (멘티·멘토 공용)
// 출처(source) 는 항상 MenteeRecord. 도착(target) 만 role 에 따라 분기:
//   - mentee 페이지 → MenteeRecord
//   - mentor 페이지 → MentorRecord (멘토가 과거 멘티 시절 활동을 끌어옴)
// spec: docs/superpowers/specs/2026-05-14-mentee-qualitative-carryover-design.md
// ----------------------------------------------------------------
export type PreviousYearSummary = {
  processYear: number;
  activityCount: number;
  hasAiAnalysis: boolean;
};

export async function listPreviousQualitativeYears(
  currentYear: string,
): Promise<PreviousYearSummary[]> {
  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative/previous-years?year=${encodeURIComponent(currentYear)}`,
    { headers: headers(), credentials: "include" },
  );
  if (!res.ok) throw new Error("이전 연도 목록을 불러오지 못했습니다.");
  const body = await res.json();
  return body.years as PreviousYearSummary[];
}

export type PreviousActivitiesResponse = {
  processYear: number;
  activities: QualitativeActivity[];
  starAnalyzedIndices: number[];
};

export async function getPreviousQualitativeActivities(
  year: number,
): Promise<PreviousActivitiesResponse> {
  const res = await fetch(
    `${API_BASE}/api/mentee/qualitative/previous-activities?year=${year}`,
    { headers: headers(), credentials: "include" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "이전 활동을 불러오지 못했습니다.");
  }
  return res.json();
}

export async function importPreviousQualitativeActivities(params: {
  role: QualRole;
  currentYear: string;
  fromYear: number;
  activityIndices: number[];
}): Promise<{ importedCount: number; currentActivityCount: number }> {
  const res = await fetch(
    `${API_BASE}/api/${params.role}/qualitative/import-activities?year=${encodeURIComponent(params.currentYear)}`,
    {
      method: "POST",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify({
        fromYear: params.fromYear,
        activityIndices: params.activityIndices,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "가져오기 실패");
  }
  return res.json();
}

export async function deleteQualitativeActivity(role: QualRole, year: string, index: number): Promise<QualitativeData> {
  const res = await fetch(
    `${qualBase(role)}?year=${encodeURIComponent(year)}&index=${index}`,
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
  accountStatus: AdminAccountStatus;
};

export type AdminMentorRow = {
  userId: string;
  name: string;
  studentId: string;
  lawSchool: string | null;
  cohort: number | null;
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
  cohort: number | null;
  status: ApplicationStatusLabel;
  memo: string | null;
  submittedAt: string | null;
};

export type AdminAdminRow = {
  userId: string;
  name: string;
  studentId: string;
  email: string;
  accountStatus: AdminAccountStatus;
};

export type EligibleMentee = {
  applicationId: string;
  userId: string;
  name: string;
  studentId: string;
  major: string;
  firstPreferenceSchool: string | null;
  secondPreferenceSchool: string | null;
  accountStatus: AdminAccountStatus;
};

export type EligibleMentor = {
  applicationId: string;
  userId: string;
  name: string;
  studentId: string;
  undergradMajor: string;
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
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: string;
};

export type AdminAnnouncementRow = AnnouncementRow & {
  isPublished: boolean;
  deletedAt: string | null;
};

async function jsonOrError<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }
  return res.json();
}

// 회원관리 ----------------------------------------------------------

export type AdminUsersQuery = {
  page?: number;
  limit?: number;
  q?: string;
  status?: AdminAccountStatus;
};

export async function getAdminUsers(
  role: "mentee",
  options?: AdminUsersQuery,
): Promise<Paged<AdminMenteeRow>>;
export async function getAdminUsers(
  role: "mentor",
  options?: AdminUsersQuery,
): Promise<Paged<AdminMentorRow>>;
export async function getAdminUsers(
  role: "admin",
  options?: AdminUsersQuery,
): Promise<Paged<AdminAdminRow>>;
export async function getAdminUsers(
  role: "mentee" | "mentor" | "admin",
  options: AdminUsersQuery = {},
): Promise<Paged<AdminMenteeRow> | Paged<AdminMentorRow> | Paged<AdminAdminRow>> {
  const params = new URLSearchParams({ role });
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.q) params.set("q", options.q);
  if (options.status) params.set("status", options.status);
  const res = await fetch(
    `${API_BASE}/api/admin/users?${params.toString()}`,
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
export type AdminUserMilitaryStatus = "completed" | "not_completed" | "not_applicable";
export type AdminUserCurrentRole = "none" | "mentee" | "mentor" | "admin";

export type AdminUserParticipation = { year: number; role: "mentee" | "mentor" };

export type AdminUserDetail = {
  userId: string;
  name: string;
  birthYear: number | null;
  birthDate: string;                         // YYYY.MM.DD. (멘토 본인 화면 통일용)
  gender: AdminUserGender | null;
  militaryStatus: AdminUserMilitaryStatus | null;
  phone: string;
  email: string;
  studentId: string;
  firstMajor: string;
  secondMajor: string;
  schoolName: string;
  admissionYear: number | null;
  graduationYear: number | null;
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
  birthDate?: string | null;                          // YYYY.MM.DD. (멘토 카드 편집용)
  gender?: AdminUserGender | null;
  militaryStatus?: AdminUserMilitaryStatus | null;    // 멘토 카드 편집용
  email?: string;                                     // 어드민 권한 — unique 충돌 시 백엔드 에러
  phone?: string;
  studentId?: string;
  firstMajor?: string;
  secondMajor?: string;
  schoolName?: string;
  admissionYear?: number | null;                      // 멘토 카드 편집용
  graduationYear?: number | null;                     // 멘토 카드 편집용
  // 다음 4개는 가장 최근 MentorRecord/MenteeRecord 에 저장 (currentRole 기준)
  academicStatus?: AdminUserAcademicStatus | null;
  currentLawschool?: string | null;                   // 멘토 record 의 lawschool_name
  cohort?: number | null;                             // 멘토 record 의 lawschool_grade
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

// AI 매칭 ----------------------------------------------------------

export type MatchPoolMode = "shortlist" | "fullpool" | "fullpool_after_extra_request_miss";

export type MatchSuggestionCandidate = {
  rank: number;
  mentorApplicationId: string;
  mentorUserId: string;
  mentorName: string;
  mentorLawSchool: string | null;
  mentorMajor: string | null;
  score: number;
  reason: string;
  satisfiesExtraRequest: boolean | null;
  poolMode: MatchPoolMode;
};

export type MenteeSuggestionGroup = {
  menteeApplicationId: string;
  menteeUserId: string;
  menteeName: string;
  menteeMajor: string | null;
  firstPreferenceSchool: string | null;
  secondPreferenceSchool: string | null;
  poolMode: MatchPoolMode;
  candidates: MatchSuggestionCandidate[];
};

export type GetSuggestionsResponse = {
  year: number;
  items: MenteeSuggestionGroup[];
};

export type RunMatchingResponse = {
  year: number;
  processed: number;
  skipped: { menteeApplicationId: string; reason: string }[];
  // true 면 streaming done 라인 없이 watchdog fallback 으로 끝난 케이스 — processed/skipped
  // 는 신뢰할 수 없으니 호출측이 getMatchingSuggestions 로 실제 결과를 재확인해야 한다.
  fellBackToFetch?: boolean;
};

// NDJSON streaming 응답의 라인 타입.
export type MatchingStreamEvent =
  | { type: "start"; year: number; total: number; mentorCount: number; concurrency: number }
  | {
      type: "progress";
      status: "ok" | "skipped";
      menteeApplicationId: string;
      menteeName: string;
      completed: number;
      total: number;
      reason?: string;
    }
  | { type: "done"; year: number; processed: number; skipped: { menteeApplicationId: string; reason: string }[] }
  | { type: "error"; message: string };

/**
 * AI 매칭 실행 — 백엔드가 NDJSON streaming 으로 응답. 멘티가 많아 응답 시간이 길어도
 * 첫 라인이 즉시 와서 proxy 헤더 timeout 을 회피한다.
 *
 * onEvent 콜백으로 매 라인을 받을 수 있고, 최종 done 라인의 내용을 RunMatchingResponse 로 resolve.
 */
export async function runMatching(
  year?: number,
  onEvent?: (e: MatchingStreamEvent) => void,
): Promise<RunMatchingResponse> {
  const qs = year !== undefined ? `?year=${year}` : "";
  // AbortController — 모든 mentee progress 가 도착했는데 done 라인이 지연되는 경우
  // (Next.js rewrites · undici 가 꼬리 청크를 묶어둘 때) 짧게 대기 후 강제 종료.
  const ac = new AbortController();
  const res = await fetch(`${API_BASE}/api/admin/matchings/run${qs}`, {
    method: "POST",
    headers: headers(),
    credentials: "include",
    signal: ac.signal,
  });

  if (!res.ok) {
    // 인증 실패 등은 JSON 응답으로 떨어짐 — 기존 패턴 그대로.
    return jsonOrError(res, "AI 매칭 실행 실패");
  }
  if (!res.body) throw new Error("AI 매칭 응답 본문이 비어있어요.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: RunMatchingResponse | undefined;
  let lastError: string | undefined;
  let lastYear: number | undefined;
  let anyProgressArrived = false;

  // tail: completed 가 total-1 이상까지 왔는데 done/EOS 가 안 올 때 짧게 대기 후 abort.
  //       마지막 progress 라인이 proxy 에 묶이는 35/36 stall 을 빠르게 복구.
  // idle: 어떤 chunk 도 안 오는 진짜 stall 일 때 abort. Gemini 호출이 가끔 10~15초씩
  //       걸려 4 lane 이 동시에 느릴 수 있으므로 60초로 넉넉히 잡는다 — 너무 짧으면
  //       정상 진행 중에도 fire 되어 부분 결과로 끝난다.
  const TAIL_WATCHDOG_MS = 3000;
  const IDLE_WATCHDOG_MS = 60000;
  let tailWatchdog: ReturnType<typeof setTimeout> | null = null;
  let idleWatchdog: ReturnType<typeof setTimeout> | null = null;

  // ac.abort() 만으로는 reader.read() 가 즉시 풀리지 않는 케이스가 있어 cancel() 도 함께.
  // level: 'info' = 정상 fallback 경로 (dev proxy 가 done 라인을 매번 버퍼링하는 등),
  //        'warn' = 비정상 정체 (실제 통신 stall) — 운영자가 봐야 할 신호.
  const forceTerminate = (reason: string, level: "info" | "warn") => {
    (level === "warn" ? console.warn : console.info)(`[runMatching] ${reason}`);
    try { ac.abort(); } catch { /* ignore */ }
    try { reader.cancel(reason).catch(() => {}); } catch { /* ignore */ }
  };

  const armTailWatchdog = () => {
    if (tailWatchdog) return;
    tailWatchdog = setTimeout(
      () => forceTerminate("tail fallback: 마지막 progress 후 done 미수신 — 정상 경로", "info"),
      TAIL_WATCHDOG_MS,
    );
  };
  const resetIdleWatchdog = () => {
    if (idleWatchdog) clearTimeout(idleWatchdog);
    idleWatchdog = setTimeout(
      () => forceTerminate("idle watchdog: chunk 미수신 — 통신 stall 의심", "warn"),
      IDLE_WATCHDOG_MS,
    );
  };

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event: MatchingStreamEvent;
    try {
      event = JSON.parse(trimmed) as MatchingStreamEvent;
    } catch {
      return;
    }
    onEvent?.(event);
    if (event.type === "start") {
      lastYear = event.year;
    } else if (event.type === "progress") {
      anyProgressArrived = true;
      // total-1 까지만 와도 곧 끝났을 거라 보고 tail watchdog 을 arm. 마지막 progress
      // 라인이 proxy 에 묶이는 35/36 stall 을 빠르게 복구한다.
      if (event.total > 0 && event.completed >= event.total - 1) {
        armTailWatchdog();
      }
    } else if (event.type === "done") {
      done = { year: event.year, processed: event.processed, skipped: event.skipped };
      lastYear = event.year;
    } else if (event.type === "error") {
      lastError = event.message;
    }
  };

  resetIdleWatchdog();
  try {
    while (true) {
      // reader.read() 가 reject 되는 경로:
      //   - forceTerminate (watchdog) 가 cancel/abort 를 호출
      //   - done 도착 후 우리가 직접 cancel 호출
      // 둘 다 progress 가 한 번이라도 왔다면 정상 탈출로 간주.
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (readErr) {
        if (!anyProgressArrived) throw readErr;
        break;
      }
      if (chunk.done) break;
      resetIdleWatchdog();
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
      // done 라인이 왔으면 stream close 까지 기다리지 않고 즉시 탈출. proxy 가 EOS
      // forward 를 지연시키는 케이스에서 reader.read() hang 을 우회한다.
      if (done) {
        reader.cancel("done-received").catch(() => { /* ignore */ });
        break;
      }
    }
    if (buffer.length > 0) handleLine(buffer);
  } finally {
    if (tailWatchdog) clearTimeout(tailWatchdog);
    if (idleWatchdog) clearTimeout(idleWatchdog);
  }

  if (lastError) throw new Error(lastError);
  if (done) return done;
  // done 이 안 왔지만 progress 는 왔다 — 서버가 작업을 진행/완료한 상태로 간주.
  // 호출측의 getMatchingSuggestions 로 실제 결과를 확인한다.
  if (anyProgressArrived) {
    return {
      year: lastYear ?? new Date().getFullYear(),
      processed: 0,
      skipped: [],
      fellBackToFetch: true,
    };
  }
  throw new Error("AI 매칭 완료 응답을 받지 못했어요.");
}

export async function getMatchingSuggestions(year?: number): Promise<GetSuggestionsResponse> {
  const qs = year !== undefined ? `?year=${year}` : "";
  const res = await fetch(`${API_BASE}/api/admin/matchings/suggestions${qs}`, {
    headers: headers(),
    credentials: "include",
  });
  return jsonOrError(res, "매칭 결과 조회 실패");
}

// 매칭 저장/확정 ---------------------------------------------------

export type MatchClientStatus = "editing" | "confirmed" | "rejected";

export type SaveMatchingRow = {
  menteeApplicationId: string;
  mentorApplicationId: string;
  aiScore: number;
  aiReason: string;
  status: MatchClientStatus;
};

export type SaveMatchingMode = "draft" | "confirm";

export type SaveMatchingResponse = {
  mode: SaveMatchingMode;
  year: number;
  saved: number;
  finalized: number;
};

export async function saveMatchings(
  mode: SaveMatchingMode,
  rows: SaveMatchingRow[],
  year?: number,
): Promise<SaveMatchingResponse> {
  const qs = year !== undefined ? `?year=${year}` : "";
  const res = await fetch(`${API_BASE}/api/admin/matchings/save${qs}`, {
    method: "POST",
    headers: headers(),
    credentials: "include",
    body: JSON.stringify({ mode, rows }),
  });
  return jsonOrError(res, mode === "confirm" ? "매칭 확정 실패" : "임시저장 실패");
}

export type MatchingResultRow = {
  menteeApplicationId: string;
  mentorApplicationId: string;
  status: MatchClientStatus;
  isFinalized: boolean;
};

export type GetMatchingResultsResponse = {
  year: number;
  items: MatchingResultRow[];
  anyFinalized: boolean;
};

export async function getMatchingResults(year?: number): Promise<GetMatchingResultsResponse> {
  const qs = year !== undefined ? `?year=${year}` : "";
  const res = await fetch(`${API_BASE}/api/admin/matchings/results${qs}`, {
    headers: headers(),
    credentials: "include",
  });
  return jsonOrError(res, "매칭 저장 상태 조회 실패");
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
  body: { title: string; body: string; isPublished?: boolean },
): Promise<AdminAnnouncementRow> {
  const res = await fetch(`${API_BASE}/api/admin/announcements`, {
    method: "POST", headers: headers(), credentials: "include",
    body: JSON.stringify(body),
  });
  return jsonOrError(res, "공지사항 작성 실패");
}

export async function updateAnnouncement(
  id: string,
  body: { title?: string; body?: string; isPublished?: boolean; isPinned?: boolean; restore?: true },
): Promise<AdminAnnouncementRow> {
  const res = await fetch(`${API_BASE}/api/admin/announcements/${id}`, {
    method: "PATCH", headers: headers(), credentials: "include",
    body: JSON.stringify(body),
  });
  return jsonOrError(res, "공지사항 수정 실패");
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

export async function hardDeleteAnnouncement(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/announcements/${id}?permanent=true`, {
    method: "DELETE", headers: headers(), credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "공지사항 영구삭제 실패");
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

// ----------------------------------------------------------------
// Personal Statement (멘티)
// ----------------------------------------------------------------

export type Question = {
  id: string;
  order: number;
  prompt: string;
  charLimit: number | null;
};

export type TextAnswer = {
  questionId: string;
  text: string;
};

export type PersonalStatementGroupInfo = {
  school: string | null;
  hwp: string | null;
  questions: Question[] | null;
  textAnswers: TextAnswer[] | null;
  templateExists: boolean;
};
export type PersonalStatementData = {
  ga: PersonalStatementGroupInfo;
  na: PersonalStatementGroupInfo;
};

export async function getPersonalStatement(year: string): Promise<PersonalStatementData> {
  const res = await fetch(
    `${API_BASE}/api/mentee/personal-statement?year=${encodeURIComponent(year)}`,
    { credentials: "include" },
  );
  return jsonOrError(res, "자기소개서 조회 실패");
}

export async function uploadPersonalStatement(
  year: string,
  group: "ga" | "na",
  file: File,
): Promise<void> {
  const body = new FormData();
  body.append("hwp", file);
  const res = await fetch(
    `${API_BASE}/api/mentee/personal-statement?year=${encodeURIComponent(year)}&group=${group}`,
    { method: "PATCH", credentials: "include", body },
  );
  await jsonOrError(res, "자기소개서 저장 실패");
}

// HWP 개인 편집본 초기화 → 학교 양식으로 되돌린 그룹 정보 반환
export async function resetPersonalStatementHwp(
  year: string,
  group: "ga" | "na",
): Promise<PersonalStatementGroupInfo> {
  const res = await fetch(
    `${API_BASE}/api/mentee/personal-statement?year=${encodeURIComponent(year)}&group=${group}`,
    { method: "DELETE", credentials: "include" },
  );
  return jsonOrError(res, "자기소개서 초기화 실패");
}

export async function saveTextAnswers(
  year: string,
  group: "ga" | "na",
  answers: TextAnswer[],
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/mentee/personal-statement/text?year=${encodeURIComponent(year)}&group=${group}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    },
  );
  await jsonOrError(res, "자기소개서 텍스트 저장 실패");
}

// ----------------------------------------------------------------
// Personal Statement 양식 관리 (어드민)
// ----------------------------------------------------------------

export type SchoolTemplate = {
  school_name: string;
  uploaded_at: string;
  updated_at: string;
  questions?: Question[] | null;
};

export type SchoolTemplateDetail = {
  school_name: string;
  hwp: string | null;
  questions: Question[] | null;
  updated_at: string;
};

export async function getSchoolTemplates(
  year: string,
): Promise<{ templates: SchoolTemplate[] }> {
  const res = await fetch(
    `${API_BASE}/api/admin/personal-statements?year=${encodeURIComponent(year)}`,
    { credentials: "include" },
  );
  return jsonOrError(res, "자기소개서 양식 목록 조회 실패");
}

export async function getSchoolTemplateDetail(
  year: string,
  school: string,
): Promise<SchoolTemplateDetail> {
  const res = await fetch(
    `${API_BASE}/api/admin/personal-statements?year=${encodeURIComponent(year)}&school=${encodeURIComponent(school)}`,
    { credentials: "include" },
  );
  return jsonOrError(res, "자기소개서 양식 조회 실패");
}

export async function uploadSchoolTemplate(
  year: string,
  school: string,
  file: File,
): Promise<void> {
  const body = new FormData();
  body.append("hwp", file);
  const res = await fetch(
    `${API_BASE}/api/admin/personal-statements?year=${encodeURIComponent(year)}&school=${encodeURIComponent(school)}`,
    { method: "PATCH", credentials: "include", body },
  );
  await jsonOrError(res, "자기소개서 양식 저장 실패");
}

export async function updateSchoolQuestions(
  year: string,
  school: string,
  questions: Question[],
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/admin/personal-statements?year=${encodeURIComponent(year)}&school=${encodeURIComponent(school)}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    },
  );
  await jsonOrError(res, "문항 저장 실패");
}

// ----------------------------------------------------------------
// Mentor Process Dashboard (#232)
// ----------------------------------------------------------------

export type ProcessStatus = "inactive" | "waiting" | "active";

export type MatchedMentee = {
  matchId: string;
  name: string;
  targetSchoolGa: string | null;
  admissionTypeGa: string | null;
  targetSchoolNa: string | null;
  admissionTypeNa: string | null;
  personalStatementStatus: "not_submitted" | "submitted" | "hidden";
};

export type MentorProcessStatus = {
  status: ProcessStatus;
  processYear: number | null;
  matchAnnounceDate: string | null;
  matchedMentees: MatchedMentee[] | null;
};

export type HistoryMentee = {
  matchId: string;
  name: string;
  targetSchoolGa: string | null;
  admissionTypeGa: string | null;
  targetSchoolNa: string | null;
  admissionTypeNa: string | null;
  phone: string | null;
};

export type MentorHistory = {
  history: Array<{
    processYear: number;
    mentees: HistoryMentee[];
  }>;
};

export async function getMentorProcessStatus(): Promise<MentorProcessStatus> {
  const res = await fetch(`${API_BASE}/api/mentor/process-status`, {
    headers: headers(),
    credentials: "include",
  });
  return jsonOrError(res, "프로세스 상태 조회 실패");
}

export async function getMentorHistory(): Promise<MentorHistory> {
  const res = await fetch(`${API_BASE}/api/mentor/history`, {
    headers: headers(),
    credentials: "include",
  });
  return jsonOrError(res, "참여 이력 조회 실패");
}

export type MenteeDetailResponse = {
  matchId: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
    birthDate: string | null;
    gender: "male" | "female" | "other" | null;
    militaryStatus: "completed" | "not_completed" | "not_applicable" | null;
    studentId: string | null;
    undergradSchool: string | null;
    firstMajor: string | null;
    secondMajor: string | null;
    entryYear: number | null;
    graduationYear: number | null;
    academicStatus: "enrolled" | "on_leave" | "graduated" | "completed" | "expelled" | null;
  };
  admission: {
    targetSchoolGa: string | null;
    isSpecialGa: boolean;
    targetSchoolNa: string | null;
    isSpecialNa: boolean;
    preferredGroup: string | null;
  };
  // #233 공개 설정 — 비공개 영역은 아래 객체들이 null 로 떨어진다.
  share: {
    basicInfo: boolean;
    quantitative: boolean;
    qualitative: boolean;
    statement: boolean;
    requests: boolean;
  };
  quantitative: {
    leet: {
      total: number | null;
      verbal: { raw: number | null; standard: number | null; percentile: number | null };
      reasoning: { raw: number | null; standard: number | null; percentile: number | null };
    };
    gpa: { overall: number | null; major: number | null; converted: number | null };
    language: { toeic: number | null; toefl: number | null; teps: number | null };
  } | null;
  qualitative: {
    careerGoal: string | null;
    coreKeywords: string | null;
    activities: unknown;
  } | null;
  personalStatement: {
    ga: { hasHwp: boolean; textAnswers: unknown };
    na: { hasHwp: boolean; textAnswers: unknown };
  } | null;
  requests: {
    strengthsWeaknesses: string | null;
    desiredMentor: string | null;
    specialNotes: string | null;
    extraRequest: string | null;
  } | null;
};

export async function getMatchedMenteeDetail(matchId: string): Promise<MenteeDetailResponse> {
  const res = await fetch(`${API_BASE}/api/mentor/mentees/${encodeURIComponent(matchId)}`, {
    headers: headers(),
    credentials: "include",
  });
  return jsonOrError(res, "멘티 정보 조회 실패");
}

// ----------------------------------------------------------------
// Mentee Share Settings (#233)
// ----------------------------------------------------------------

export type ShareSettings = {
  basicInfo: boolean;
  quantitative: boolean;
  qualitative: boolean;
  statement: boolean;
  requests: boolean;
};

export type ShareSettingsResponse = {
  settings: ShareSettings;
};

export async function getShareSettings(year: string): Promise<ShareSettingsResponse> {
  const res = await fetch(
    `${API_BASE}/api/mentee/share-settings?year=${encodeURIComponent(year)}`,
    { headers: headers(), credentials: "include" },
  );
  return jsonOrError(res, "공개 설정 조회 실패");
}

export async function patchShareSettings(
  year: string,
  settings: Partial<ShareSettings>,
): Promise<{ settings: ShareSettings }> {
  const res = await fetch(
    `${API_BASE}/api/mentee/share-settings?year=${encodeURIComponent(year)}`,
    {
      method: "PATCH",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify({ settings }),
    },
  );
  return jsonOrError(res, "공개 설정 저장 실패");
}

export async function submitMenteeApplicationWithShare(
  year: string,
  share: ShareSettings,
): Promise<SubmitApplicationResult> {
  const res = await fetch(
    `${API_BASE}/api/mentee/applications/submit?year=${encodeURIComponent(year)}`,
    {
      method: "POST",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify({ share }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "신청서 제출 실패");
  }
  return res.json();
}
