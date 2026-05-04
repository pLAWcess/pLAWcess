// apps/api/src/lib/labels.ts
// DB enum ↔ FE 한국어 라벨 변환.
// 기존 FE는 한국어 라벨로 통신해 왔으므로 변환은 BE에서 처리한다.

// ---------- gender ----------
export function genderToLabel(g: string | null | undefined): string {
  if (g === "male") return "남성";
  if (g === "female") return "여성";
  return "";
}
export function labelToGender(label: string): string | null {
  if (label === "남성") return "male";
  if (label === "여성") return "female";
  return null;
}

// ---------- academic_status ----------
const ACADEMIC_STATUS_TO_LABEL: Record<string, string> = {
  enrolled: "재학",
  on_leave: "휴학",
  completed: "수료",
  graduated: "졸업",
  expelled: "제적",
};
const LABEL_TO_ACADEMIC_STATUS: Record<string, string> = {
  재학: "enrolled",
  휴학: "on_leave",
  수료: "completed",
  "졸업 유예": "on_leave",
  졸업: "graduated",
};
export function statusToLabel(s: string | null | undefined): string {
  return s ? (ACADEMIC_STATUS_TO_LABEL[s] ?? "") : "";
}
export function labelToStatus(label: string): string | null {
  return LABEL_TO_ACADEMIC_STATUS[label] ?? null;
}

// ---------- military_status ----------
const MILITARY_TO_LABEL: Record<string, string> = {
  completed: "군필",
  not_completed: "미필",
  not_applicable: "해당없음",
};
const LABEL_TO_MILITARY: Record<string, string> = {
  군필: "completed",
  미필: "not_completed",
  해당없음: "not_applicable",
};
export function militaryToLabel(m: string | null | undefined): string {
  return m ? (MILITARY_TO_LABEL[m] ?? "") : "";
}
export function labelToMilitary(label: string): string | null {
  return LABEL_TO_MILITARY[label] ?? null;
}

// ---------- birth_date ↔ "YYYY.MM.DD." ----------
// 기존 FE 컨벤션 유지: 화면 입력은 "YYYY.MM.DD." (마침표 포함, 끝에 . 한 번 더)
export function dateToLabel(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10).replace(/-/g, ".") + ".";
}
export function labelToDate(label: string): Date | null {
  if (!label) return null;
  const cleaned = label.replace(/\.$/, "").replace(/\./g, "-");
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ---------- year Int → 표시 문자열 (입력은 호출 측에서 parseInt) ----------
export function yearToLabel(y: number | null | undefined): string {
  return y == null ? "" : y.toString();
}
