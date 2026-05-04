# pLAWcess API 스펙

> 본 문서는 BE/FE 공통 계약이다. BE 변경 시 동시 갱신 필수.

## 인증

모든 보호 엔드포인트는 `plawcess_token` HttpOnly 쿠키(JWT)로 인증한다.
- `/api/auth/*`, `/api/health`: 공개
- `/api/mentee/*`: `mentee` 또는 `admin`
- `/api/mentor/*`: `mentor` 또는 `admin`
- `/api/admin/*`: `admin`

## 라벨 변환 컨벤션

응답에서 enum 필드는 한국어 라벨로 변환되어 전달된다 (FE 표시용 직접 사용 가능).

| 필드 | DB 값 | 라벨 |
|---|---|---|
| `gender` | `male` / `female` | "남성" / "여성" |
| `academicStatus` | `enrolled` / `on_leave` / `graduated` / `completed` / `expelled` | "재학" / "휴학" / "졸업" / "수료" / "제적" |
| `militaryStatus` | `completed` / `not_completed` / `not_applicable` | "군필" / "미필" / "해당없음" |

> 예외: `/api/auth/me`는 raw enum 값을 그대로 노출한다 (FE가 다른 컨텍스트와 일관성 위해 직접 변환).

날짜 필드(`birthDate`)는 `"YYYY.MM.DD."` 형식 문자열 (끝에 마침표 포함).
연도 필드(`admissionYear`, `graduationYear`)는 4자리 숫자 문자열.

---

## `/api/auth/me` — GET

현재 사용자의 신상 + 계정 정보 조회.

**Response 200:**
```json
{
  "user": {
    "user_id": "uuid",
    "login_id": "string",
    "name": "string",
    "email": "string",
    "current_role": "none|mentee|mentor|admin",
    "account_status": "active|inactive|blocked",
    "birth_date": "2000-01-15",
    "gender": "male|female|null",
    "military_status": "completed|not_completed|not_applicable|null",
    "undergrad_school_name": "string|null",
    "undergrad_first_major": "string|null",
    "undergrad_second_major": "string|null",
    "undergrad_entry_year": 2019,
    "undergrad_graduation_year": null,
    "current_lawschool": "string|null",
    "graduated_lawschool": "string|null",
    "lawschool_grade": null
  }
}
```

---

## `/api/mentee/basic-info` — GET / PATCH

멘티 기본정보. `User`(신상) + `MenteeRecord`(사이클 학적·희망학교) 합성.

**Query:** `?year=2026` (없으면 현재 연도)

**GET Response 200:**
```json
{
  "personal": {
    "name": "string",
    "affiliation": "string",
    "birthDate": "2000.01.15.",
    "gender": "남성",
    "militaryStatus": "군필",
    "major1": "string",
    "major2": "string",
    "admissionYear": "2019",
    "graduationYear": "",
    "academicStatus": "재학"
  },
  "admission": {
    "가": { "first": "string" },
    "나": { "first": "string" },
    "isSpecialAdmission": false
  }
}
```

**PATCH Body** (모든 필드 선택적):
```json
{
  "personal": {
    "birthDate": "2000.01.15.",
    "gender": "남성",
    "militaryStatus": "군필",
    "major1": "string",
    "major2": "string",
    "admissionYear": "2019",
    "graduationYear": "2024",
    "academicStatus": "재학"
  },
  "admission": {
    "가": { "first": "string" },
    "나": { "first": "string" },
    "isSpecialAdmission": false
  }
}
```

**PATCH Response 200:** `{ "success": true }`

내부 동작: BE는 본문을 평탄화 → `splitPayload`로 User/Record 필드 분기 → `prisma.$transaction`으로 atomic update + upsert. FE는 어느 필드가 어느 테이블에 가는지 알 필요 없음.

---

## `/api/mentor/basic-info` — GET / PATCH

멘토 기본정보. `User`(신상 + 로스쿨) + `MentorRecord`(학적 스냅샷) 합성.

**Query:** `?year=2026`

**GET Response 200:**
```json
{
  "personal": {
    "name": "string",
    "affiliation": "string",
    "birthDate": "2000.01.15.",
    "gender": "남성",
    "militaryStatus": "군필",
    "major1": "string",
    "major2": "string",
    "admissionYear": "2019",
    "graduationYear": "2024",
    "academicStatus": "재학",
    "currentLawschool": "string",
    "graduatedLawschool": "",
    "lawschoolGrade": 17
  }
}
```

**PATCH Body** (모든 필드 선택적):
```json
{
  "personal": {
    "currentLawschool": "string",
    "graduatedLawschool": "string",
    "lawschoolGrade": 17,
    "academicStatus": "재학"
  }
}
```

**PATCH Response 200:** `{ "success": true }`

---

## `/api/mentee/quantitative` — GET / PATCH

(본 리팩토링 영향 없음 — 별도 문서화는 추후 작업)

## `/api/mentee/grades` — POST

(본 리팩토링 영향 없음 — KUPID 성적 크롤링)
