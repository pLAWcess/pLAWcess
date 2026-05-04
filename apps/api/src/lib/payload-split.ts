// apps/api/src/lib/payload-split.ts
// 하이브리드 PATCH: 단일 엔드포인트로 들어온 본문을 User 필드와 Record 필드로 분리한다.
// FE는 평탄한 객체를 보내고, BE는 어느 테이블로 가는지를 캡슐화한다.

import {
  labelToGender, labelToStatus, labelToMilitary, labelToDate,
} from "./labels";

export const USER_FIELDS = new Set<string>([
  // 신상
  "birth_date", "gender", "military_status", "phone",
  // 학부
  "undergrad_school_name",
  "undergrad_first_major", "undergrad_second_major",
  "undergrad_entry_year", "undergrad_graduation_year",
  // 로스쿨
  "current_lawschool", "graduated_lawschool", "lawschool_grade",
]);

export const MENTEE_RECORD_FIELDS = new Set<string>([
  "academic_status",
  "target_school_ga", "target_school_na", "is_special_admission",
  "has_leet_experience", "leet_exam_years", "first_leet_year",
  "has_law_class", "law_class_subjects",
  "career_goal",
  // 정성/AI/기타는 정성 라우트에서 처리
]);

export const MENTOR_RECORD_FIELDS = new Set<string>([
  "academic_status",
  "has_law_class", "law_class_subjects",
  "is_special_admission",
  "personal_statement_summary",
  "strengths_weaknesses",
  "career_goal",
  "leet_exam_year",
]);

export type SplitResult = {
  userData: Record<string, unknown>;
  recordData: Record<string, unknown>;
};

/**
 * 평탄화된 페이로드(`{ field_name: value, ... }`)를 USER_FIELDS / recordFieldSet에 따라 분기.
 * 어느 집합에도 속하지 않는 키는 무시한다(스루풋 방어).
 */
export function splitPayload(
  payload: Record<string, unknown>,
  recordFieldSet: Set<string>,
): SplitResult {
  const userData: Record<string, unknown> = {};
  const recordData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (USER_FIELDS.has(key)) userData[key] = value;
    else if (recordFieldSet.has(key)) recordData[key] = value;
  }
  return { userData, recordData };
}

// ----------------------------------------------------------------
// 공용 personal-블록 평탄화
// ----------------------------------------------------------------
export type PersonalPatchInput = {
  birthDate?: string;
  gender?: string;
  militaryStatus?: string;
  major1?: string;
  major2?: string;
  admissionYear?: string;
  graduationYear?: string;
  academicStatus?: string;
};

/**
 * 멘티/멘토 공통 personal 블록을 DB 컬럼명+enum 값으로 평탄화.
 * 호출 측은 반환값에 role-specific 필드(admission / lawschool 등)를 spread해 추가한다.
 */
export function flattenPersonal(p: PersonalPatchInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.birthDate !== undefined) out.birth_date = labelToDate(p.birthDate);
  if (p.gender !== undefined) out.gender = labelToGender(p.gender);
  if (p.militaryStatus !== undefined) out.military_status = labelToMilitary(p.militaryStatus);
  if (p.major1 !== undefined) out.undergrad_first_major = p.major1;
  if (p.major2 !== undefined) out.undergrad_second_major = p.major2;
  if (p.admissionYear !== undefined) {
    const n = parseInt(p.admissionYear, 10);
    out.undergrad_entry_year = isNaN(n) ? null : n;
  }
  if (p.graduationYear !== undefined) {
    const n = parseInt(p.graduationYear, 10);
    out.undergrad_graduation_year = isNaN(n) ? null : n;
  }
  if (p.academicStatus !== undefined) out.academic_status = labelToStatus(p.academicStatus);
  return out;
}
