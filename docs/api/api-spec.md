# pLAWcess API 스펙

> 본 문서는 BE/FE 공통 계약이다. BE 변경 시 동시 갱신 필수.

## 인증

모든 보호 엔드포인트는 `plawcess_token` HttpOnly 쿠키(JWT)로 인증한다.

**기본 막힘(deny by default)** — `/api` 아래 모든 라우트는 인증이 필요하다. 무인증 공개 라우트는 명시적으로 허용 목록에 등록되며, 그 목록은 `apps/api/scripts/verify-route-auth.ts` 의 `PUBLIC_PATHS` 가 단일 출처다 (이 스크립트가 "비공개 라우트는 쿠키 없이 호출 시 401" 을 검증한다).

- **무인증 공개**: `/api/health`, `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/find-id`, `/api/auth/reset-password`, `/api/auth/check-login-id`, `/api/auth/email/send-verification`, `/api/auth/email/verify-code`
- **인증 필요·역할 무관** (예: `/api/auth/me`, `/api/auth/change-password`, `/api/announcements*`, `/api/cycle-schedules/active` 등): 핸들러가 `requireAuth(req)` 호출
- `/api/mentee/*`: `mentee` 또는 `admin`
- `/api/mentor/*`: `mentor` 또는 `admin`
- `/api/admin/*`: `admin` — 핸들러가 `requireAdmin(req)` 호출

새 라우트를 추가할 때: 인증이 필요하면 핸들러 첫머리에서 `requireAuth`/`requireAdmin`(또는 멘티·멘토 역할 가드)를 호출하고, 무인증 공개라면 `verify-route-auth.ts` 의 `PUBLIC_PATHS` 에 경로를 추가한다.

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

## `/api/auth/login` — POST

**Body:** `{ loginId?: string, email?: string, password: string }` (loginId 우선, 없으면 email)

**Response 200:** `{ user: { user_id, name, login_id, email, current_role, account_status, military_status } }` + `Set-Cookie: plawcess_token`

**Rate limit (#179)** — brute-force / credential stuffing 방어. `identifier`(입력한 loginId/email 을 소문자·trim 정규화) 와 클라이언트 IP 두 축으로 최근 15분 *실패* 횟수를 센다:
- `identifier` 당 15분에 5회 실패 → 이후 그 identifier 의 요청은 `429`
- IP 당 15분에 30회 실패 → 이후 그 IP 의 요청은 `429`
- 한도 초과 응답: `429 { error: "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요." }` + `Retry-After` 헤더(초)
- 레이트 리미터(`login_attempts` 테이블) 장애 시 fail-open(로그인 허용).

**Errors:**
- 400: 요청 형식 / 아이디·비밀번호 누락
- 401: 아이디 또는 비밀번호 불일치 (계정 존재 여부 비노출 — 동일 메시지)
- 403: `account_status === "blocked"`
- 429: rate limit 초과 (위 참조)

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

## `/api/auth/email/send-verification` — POST (#83·#84)

회원가입·비밀번호재설정용 6자리 코드 메일 발송.

**Body (purpose 별 분기):**
```ts
| { purpose: "signup"; email: string }
| { purpose: "reset_password"; name: string; loginId: string; email: string }   // #84
```

**처리:**
- `signup`: User.email 중복 시 409 (가입 시점 enumeration 허용)
- `reset_password`: 이름·아이디·이메일 셋 다 일치 시 발송. 불일치도 200 동일 응답(enumeration 방어), 메일 미발송
- Rate limit: 동일 (email, purpose) 60초 쿨다운, 시간당 5회 → 위반 시 429
- Resend 발송 후 `EmailVerification` INSERT (`expires_at = now+5분`)

**Response 200:** `{ sent: true, expiresAt: ISO_string }`

**Errors:**
- 400: 요청 형식 오류 / purpose 미지원
- 409: 이미 사용 중인 이메일 (signup 만)
- 429: 쿨다운/한도 초과
- 502: 메일 발송 실패

---

## `/api/auth/email/verify-code` — POST (#83·#84)

코드 검증 + 후속 토큰 발급.

**Body:** `{ email, purpose: "signup" | "reset_password", code }`

**처리:**
- (email, purpose) 가장 최근 미consumed·미만료 행 조회
- `attempts++` → 5회 초과 시 잠금
- `bcrypt.compare` 실패 시 400
- 성공 시 `consumed_at = now`

**Response 200:**
- `signup` → `{ ok: true, signupVerificationToken: <JWT>, expiresAt }` — payload `{ email }`, audience `email-verification:signup`, 10분
- `reset_password` → `{ ok: true, resetToken: <JWT>, expiresAt }` + `password_reset_tokens` INSERT(user_id 매핑). JWT payload `{ token_id, raw }`, audience `password-reset`, 10분

**Errors:**
- 400: 코드 만료 / 시도 초과 / 코드 불일치 / purpose 미지원
- 404: 사용자 부재 (reset_password 도중 user 삭제 등)

---

## `/api/auth/signup` — POST (수정, #83)

기존 가입 라우트에 학번·이메일 인증 토큰 수용 추가.

**Body:** `{ name, loginId, email, password, studentId, signupVerificationToken }`

- `signupVerificationToken` JWT 검증: audience `email-verification:signup`, `payload.email === body.email` 일치, 만료 미경과
- `studentId` 검증: 영문/숫자 4~20자
- 기존 검증(loginId 형식, password 길이, email/loginId 중복)은 그대로

**Response 201:** `{ user: { user_id, name, login_id, email, student_id, current_role, military_status } }` + 세션 쿠키.

**Errors:**
- 400: 형식 오류 / 학번 형식
- 401: 이메일 인증 토큰 만료/위조
- 409: email/loginId 중복

---

## `/api/auth/find-id` — POST (#84)

이름+학번 일치 시 마스킹된 이메일 응답 + 메일로 아이디 발송.

**Body:** `{ name, studentId }`

**처리:**
- IP rate limit: 시간당 10회
- User where { name, student_id, is_deleted: false } 일치 단일 행

**이메일 마스킹 규칙:**
- 로컬파트 1~2자: 첫 1자 + `***`
- 로컬파트 3자 이상: 첫 2자 + `***`

**Response 200:** `{ maskedEmail: "ho***@gmail.com" }`

**Errors:**
- 400: 요청 형식
- 404: 일치하는 회원 없음
- 429: IP 한도 초과
- 502: 메일 발송 실패

---

## `/api/auth/reset-password` — POST (#84)

`reset_token` 검증 후 비밀번호 변경.

**Body:** `{ resetToken, newPassword }`

**처리:**
- JWT 검증 → `token_id` 추출
- `password_reset_tokens` 조회: 미consumed, 미만료
- `bcrypt.compare(raw, token_hash)`
- `newPassword.length ≥ 8`
- 트랜잭션: `User.password_hash` 갱신 + 이 token consumed + 같은 user 의 다른 미사용 reset token 일괄 무효화

**Response 200:** `{ success: true }`

**Errors:**
- 400: 형식/비밀번호 길이
- 401: 토큰 만료/사용됨/위조

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
    "가": { "school": "string", "isSpecial": false },
    "나": { "school": "string", "isSpecial": false }
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
    "가": { "school": "string", "isSpecial": false },
    "나": { "school": "string", "isSpecial": false }
  }
}
```

`admission.{가|나}.school` 빈 문자열은 DB 컬럼이 NULL로 저장된다. `isSpecial` 미지정 시 기본값 `false` 유지.

**PATCH Response 200:** `{ "success": true }`

내부 동작: BE는 본문을 평탄화 → `splitPayload`로 User/Record 필드 분기 → `prisma.$transaction`으로 atomic update + upsert. FE는 어느 필드가 어느 테이블에 가는지 알 필요 없음.

---

## `/api/mentor/basic-info` — GET / PATCH

멘토 기본정보. `User`(신상) + `MentorRecord`(학적 스냅샷 + 소속 로스쿨·기수) 합성.

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
    "lawschool": "string",
    "lawschoolGrade": 2024
  }
}
```

`lawschool` (소속 로스쿨) 와 `lawschoolGrade` (기수, 입학년도 정수)는 cycle별 `MentorRecord`에 저장됨.

**PATCH Body** (모든 필드 선택적):
```json
{
  "personal": {
    "lawschool": "string",
    "lawschoolGrade": 2024,
    "academicStatus": "재학"
  }
}
```

**PATCH Response 200:** `{ "success": true }`

---

## `/api/mentee/applications/submit` — POST (#135)

멘티 신청서 제출 — `MenteeRecord.record_status` 를 `draft` → `submitted` 로 전환하고 `Application` 행을 생성한다.

**Query:** `?year=2026`

**Body:** 없음

**Response 200:**
```json
{
  "success": true,
  "application_id": "uuid",
  "submitted_at": "2026-05-08T06:12:01.549Z"
}
```

**Errors:**
- 401: 로그인 안 됨
- 403: 신청 기간 마감 — `{ "error": "신청 기간이 마감되었습니다." }`. 활성 cycle 의 `mentee_apply_end` 가 한국 시간 기준 어제 이전이면 발생. 활성 cycle 없거나 `mentee_apply_end` null 이면 통과
- 404: `MenteeRecord` 부재 — `{ "error": "신청서를 찾을 수 없습니다. 먼저 기본정보를 작성해주세요." }`
- 409: 이미 제출됨 — `{ "error": "이미 제출된 신청서입니다." }`. `record_status === "submitted"` 또는 `Application` unique 제약(`[user_id, process_year, role]`) 위반 시

내부 동작: `prisma.$transaction` 으로 (a) `MenteeRecord.record_status = "submitted"` 갱신 + (b) `Application` 행 생성(`role: "mentee"`, `application_status: "submitted"`, `submitted_at: NOW()`).

---

## `/api/mentee/quantitative` — GET / PATCH

(본 리팩토링 영향 없음 — 별도 문서화는 추후 작업)

## `/api/mentee/grades` — POST

(본 리팩토링 영향 없음 — KUPID 성적 크롤링)

---

## 사업 스케줄 (#104)

### `GET /api/admin/cycle-schedules`

연도별 사업 스케줄 전체 목록.

- 권한: admin (`current_role === 'admin'`)
- Response 200:
  ```json
  [
    {
      "process_year": 2027,
      "is_active": true,
      "mentor_recruit_start": "2026-03-01T00:00:00.000Z",
      "mentor_recruit_end": "2026-03-31T00:00:00.000Z",
      "mentee_apply_start": "2026-04-01T00:00:00.000Z",
      "mentee_apply_end": "2026-07-20T00:00:00.000Z",
      "matching_start": "2026-08-01T00:00:00.000Z",
      "matching_end": "2026-08-15T00:00:00.000Z",
      "match_announce_date": "2026-08-20T00:00:00.000Z",
      "admission_result_start": "2026-11-01T00:00:00.000Z",
      "admission_result_end": "2026-12-31T00:00:00.000Z",
      "created_at": "2026-05-06T...",
      "updated_at": "2026-05-06T..."
    }
  ]
  ```
- 정렬: `process_year DESC`
- 401: 로그인 안 됨 / 403: admin 아님

### `POST /api/admin/cycle-schedules`

새 연도 스케줄 빈 행 생성.

- 권한: admin
- Body: `{ "process_year": 2028 }`
- Response 201: 생성된 행
- 400: process_year 누락 또는 범위 외 (2000~2100)
- 409: 이미 존재하는 연도

### `PATCH /api/admin/cycle-schedules/:year`

특정 연도 수정 또는 활성화.

- 권한: admin
- Body (모두 optional, 명시한 필드만 수정. `null`은 명시적 비우기):
  ```json
  {
    "mentor_recruit_start": "2026-03-01",
    "mentor_recruit_end": "2026-03-31",
    "mentee_apply_start": "2026-04-01",
    "mentee_apply_end": "2026-07-20",
    "matching_start": "2026-08-01",
    "matching_end": "2026-08-15",
    "match_announce_date": "2026-08-20",
    "admission_result_start": "2026-11-01",
    "admission_result_end": "2026-12-31",
    "is_active": true
  }
  ```
- `is_active: true` 포함 시 트랜잭션으로 다른 모든 연도 자동 비활성화 후 해당 연도만 활성화
- Response 200: 갱신된 행
- 400: 잘못된 날짜 형식 / 잘못된 연도 형식
- 404: 해당 연도가 존재하지 않음

### `GET /api/cycle-schedules/active`

현재 활성 cycle 1개 반환. 멘티/멘토/admin 누구나 호출 가능.

- 권한: 로그인 사용자 (JWT)
- Response 200:
  - 활성 cycle 있음: 단일 행 객체
  - 활성 cycle 없음: `null`
- 401: 로그인 안 됨


## #176 Admin 페이지 API

### 공통 페이지네이션 래퍼

배열형 응답은 모두 `{ data, totalCount, page, limit }` 형태. Query 파라미터 `?page=1&limit=50` (기본). `limit` 상한 200.

### `GET /api/admin/users`

회원관리 — 멘티/멘토 회원 목록.

- 권한: admin
- Query: `role=mentee|mentor` (필수), `page`, `limit`
- Response 200: 페이지네이션 래퍼. `data` 항목은 멘티/멘토 역할에 따라 다름.
  - 멘티: `{ userId, name, studentId, firstMajor, secondMajor, phone, accountStatus }`
  - 멘토: `{ userId, name, studentId, lawSchool, cohort, phone, accountStatus }` — 가장 최근 MentorRecord 기준.
- 400: role 누락/오류, page/limit 오류

### `GET /api/admin/applications`

신청관리 — 멘티/멘토 신청 목록.

- 권한: admin
- Query: `role=mentee|mentor` (필수), `year=YYYY` (옵션, 기본 활성 cycle), `page`, `limit`
- Response 200: 페이지네이션 래퍼. `data` 항목:
  - 공통: `{ applicationId, name, studentId, status, memo, submittedAt }`
  - 멘티: `+ major`, 멘토: `+ school`
- `status` 라벨 매핑: `submitted→pending` / `approved→approved` / `rejected→rejected` / `revision_requested→revision`
- 400: role 누락/오류, year 형식, 활성 cycle 없음

### `GET /api/admin/matchings/eligible`

매칭관리 — `application_status='approved'` 멘티+멘토 풀.

- 권한: admin
- Query: `year=YYYY` (옵션, 기본 활성 cycle)
- Response 200 (페이지네이션 미적용):
  ```json
  {
    "year": 2026,
    "mentees": [{ "applicationId", "userId", "name", "studentId", "major", "accountStatus" }],
    "mentors": [{ "applicationId", "userId", "name", "studentId", "lawSchool", "accountStatus" }]
  }
  ```
- 400: 활성 cycle 없고 year 미지정

### `POST /api/admin/announcements`

- 권한: admin
- Body: `{ title: string (1~100자), body: string (1자 이상) }`
- Response 201: `{ announcementId, title, body, createdAt, author }`
- 400: 검증 실패

### `GET /api/admin/announcements`

- 권한: admin
- Query: `page`, `limit`
- Response 200: 페이지네이션 래퍼. `data` 항목 = POST 응답 형태.

### `DELETE /api/admin/announcements/:id`

- 권한: admin
- Response 200: `{ "success": true }`
- 404: 없는 id

### `GET /api/announcements`

- 권한: 로그인 필수 (멘티/멘토/admin)
- Query: `page`, `limit`
- Response 200: 페이지네이션 래퍼. `data` 항목 = POST 응답 형태.
- 401: 비로그인

### `GET /api/announcements/:id`

- 권한: 로그인 필수
- Response 200: `{ announcementId, title, body, createdAt, author }`
- 401, 404
