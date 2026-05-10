# [FE] Admin 페이지 API 적용 (#176)

**Title 후보:** `feat(FE): admin 페이지 4종 — mock 제거, BE API 연결`
**Labels:** `frontend`, `enhancement`
**관련 BE PR:** (BE PR 머지 후 채울 것 — 브랜치 `176-be-admin-api-만들어죠`)
**Spec:** `docs/superpowers/specs/2026-05-10-admin-api-design.md`
**API 계약:** `docs/api/api-spec.md`

## 요약

Admin 4개 화면(회원관리·신청관리·매칭관리·공지사항)과 멘티/멘토 공지사항 화면의 mock 데이터를 BE 응답으로 교체. 새로 추가된 Announcement 테이블을 사용한 공지 CRUD 도 wiring 한다.

## 공통 응답 규약

### 1) 응답 케이스 — 모두 카멜케이스

`user_id`/`student_id` 같은 snake_case 필드는 응답에 없다. 전부 `userId`, `studentId` 등 카멜케이스로 변환되어 옴. FE mock 의 `user_id` 필드명은 `userId` 로 일괄 교체 필요.

### 2) 페이지네이션 래퍼 — 배열형 응답은 모두 래핑

배열을 반환하는 API는 다음 형태로 응답:

```json
{
  "data": [ ... ],
  "totalCount": 137,
  "page": 1,
  "limit": 50
}
```

- Query 파라미터: `?page=1&limit=50` (기본값). `limit` 상한 200, 1 미만/초과 시 400.
- 적용 대상: `users`, `applications`, `admin announcements`, `public announcements`.
- **미적용**: `eligible` (단일 객체 응답).

기존 FE 의 클라이언트 페이지네이션(메모리에서 자르기)은 **서버 페이지네이션으로 교체**해야 한다. `totalCount` 로 `totalPages = Math.ceil(totalCount / limit)` 계산, `?page=` 로 이동.

### 3) 인증

- `/api/admin/*` — admin 만 접근. 비로그인 401, 비-admin 403.
- `/api/announcements`, `/api/announcements/:id` — 로그인된 모든 유저(멘티/멘토/admin). 비로그인 401.

---

## 1. GET /api/admin/users (회원관리)

  Query: `?role=mentee|mentor` (필수), `?page`, `?limit`

  WHERE: `users.is_deleted = false AND current_role = $role`

  SELECT:
  - 공통: `userId, name, studentId, phone, accountStatus`
  - 멘티: + `firstMajor, secondMajor` (학부 제1전공·제2전공)
  - 멘토: + 가장 최근 MentorRecord 의 `lawSchool, cohort` (사용자별 `process_year DESC LIMIT 1`)

  정렬: `name ASC`

  응답 (멘티 예시):
  ```json
  {
    "data": [
      {
        "userId": "uuid",
        "name": "김민준",
        "studentId": "2020123456",
        "firstMajor": "법학과",
        "secondMajor": null,
        "phone": "010-1234-5678",
        "accountStatus": "active"
      }
    ],
    "totalCount": 12,
    "page": 1,
    "limit": 50
  }
  ```

  응답 (멘토 예시):
  ```json
  {
    "data": [
      {
        "userId": "uuid",
        "name": "최수진",
        "studentId": "2018456789",
        "lawSchool": "서울대학교 로스쿨",
        "cohort": 7,
        "phone": "010-4567-8901",
        "accountStatus": "active"
      }
    ],
    "totalCount": 7,
    "page": 1,
    "limit": 50
  }
  ```

  에러:
  - 400 (role 누락/오류, page/limit 범위 위반)
  - 401 (비로그인) / 403 (비-admin)

---

## 2. GET /api/admin/applications (신청관리)

  Query: `?role=mentee|mentor` (필수), `?year=YYYY` (옵션, 기본 활성 cycle), `?page`, `?limit`

  WHERE:
  ```
  applications.role = $role
  AND applications.process_year = $year
  AND applications.application_status IN
      ('submitted','approved','rejected','revision_requested')
  ```
  (즉 `draft` 임시저장은 제외)

  SELECT:
  - 공통: `applicationId, name, studentId, status, memo, submittedAt`
  - 멘티: + `major` (User.undergrad_first_major)
  - 멘토: + `school` (가장 최근 MentorRecord.lawschool_name)

  상태 라벨 매핑 (BE enum → FE 표시):
  | DB enum | FE label |
  |---|---|
  | `submitted` | `pending` |
  | `approved` | `approved` |
  | `rejected` | `rejected` |
  | `revision_requested` | `revision` |

  관리자 메모는 같은 application 의 가장 최근 1건만 단일 string 으로 (`memo`). 없으면 `null`.

  정렬: `submitted_at DESC`

  응답 (멘티 예시):
  ```json
  {
    "data": [
      {
        "applicationId": "uuid",
        "name": "김민준",
        "studentId": "2020123456",
        "major": "법학과",
        "status": "approved",
        "memo": "서류 확인 완료",
        "submittedAt": "2026-04-10T03:21:00.000Z"
      }
    ],
    "totalCount": 24,
    "page": 1,
    "limit": 50
  }
  ```

  응답 (멘토 예시): `major` 대신 `school: "서울대학교 로스쿨"`.

  에러:
  - 400 (role 누락/오류, year 형식, 활성 cycle 없고 year 미지정, page/limit 범위)
  - 401 / 403

---

## 3. GET /api/admin/matchings/eligible (매칭 적격 풀)

  Query: `?year=YYYY` (옵션, 기본 활성 cycle)

  역할: AI 매칭 알고리즘의 **입력 후보군**. `application_status='approved'` 인 멘티+멘토 양쪽을 한 번에 반환. 이미 매칭됐는지 여부는 거르지 않음(재배정 시나리오 허용).

  WHERE:
  - mentees: `role='mentee' AND application_status='approved' AND process_year=$year`
  - mentors: 위 + `role='mentor'`

  정렬: 둘 다 `name ASC`

  응답 (페이지네이션 미적용 — 단일 객체):
  ```json
  {
    "year": 2026,
    "mentees": [
      {
        "applicationId": "uuid",
        "userId": "uuid",
        "name": "김민준",
        "studentId": "2020123456",
        "major": "법학과",
        "accountStatus": "active"
      }
    ],
    "mentors": [
      {
        "applicationId": "uuid",
        "userId": "uuid",
        "name": "최수진",
        "studentId": "2018456789",
        "lawSchool": "서울대학교 로스쿨",
        "accountStatus": "active"
      }
    ]
  }
  ```

  에러:
  - 400 (활성 cycle 없고 year 미지정)
  - 401 / 403

---

## 4. POST /api/admin/announcements (공지 작성)

  Body:
  ```json
  { "title": "string (1~100자)", "body": "string (1자 이상)" }
  ```

  처리:
  - title/body 양쪽 trim 후 길이 검증
  - `created_by_user_id` 는 admin 세션 payload 에서 자동 채움

  응답 201:
  ```json
  {
    "announcementId": "uuid",
    "title": "...",
    "body": "...",
    "createdAt": "2026-05-11T01:23:45.000Z",
    "author": "관리자 이름"
  }
  ```

  에러:
  - 400 (title 길이/누락, body 누락, JSON 파싱 실패)
  - 401 / 403

---

## 5. GET /api/admin/announcements (관리자 공지 목록)

  Query: `?page`, `?limit`

  정렬: `created_at DESC`

  응답:
  ```json
  {
    "data": [
      {
        "announcementId": "uuid",
        "title": "2026학년도 멘토 모집 안내",
        "body": "본문 ...",
        "createdAt": "2026-04-10T00:00:00.000Z",
        "author": "관리자 이름"
      }
    ],
    "totalCount": 8,
    "page": 1,
    "limit": 50
  }
  ```

  에러:
  - 400 (page/limit 범위)
  - 401 / 403

---

## 6. DELETE /api/admin/announcements/:id (공지 삭제)

  URL 파라미터: `:id` = `announcementId`(uuid)

  처리: hard delete (복구 불가)

  응답 200:
  ```json
  { "success": true }
  ```

  에러:
  - 404 (없는 id)
  - 401 / 403

---

## 7. GET /api/announcements (공개 목록)

  대상: 로그인된 멘티/멘토/admin 모두.

  Query: `?page`, `?limit`

  정렬·응답 형태: 5번(관리자 목록)과 **동일**.

  응답:
  ```json
  {
    "data": [
      {
        "announcementId": "uuid",
        "title": "...",
        "body": "...",
        "createdAt": "...",
        "author": "관리자 이름"
      }
    ],
    "totalCount": 8,
    "page": 1,
    "limit": 50
  }
  ```

  에러:
  - 401 (비로그인)
  - 400 (page/limit 범위)

---

## 8. GET /api/announcements/:id (공개 상세)

  URL 파라미터: `:id` = `announcementId`(uuid)

  응답 200 (단일 객체):
  ```json
  {
    "announcementId": "uuid",
    "title": "...",
    "body": "...",
    "createdAt": "...",
    "author": "관리자 이름"
  }
  ```

  에러:
  - 401 (비로그인)
  - 404 (없는 id)

---

## FE 작업 체크리스트

화면별 mock 제거 + 위 API 와 wiring:

### `/admin/users` (회원관리)
- [ ] mock `MENTEES`, `MENTORS` 배열 제거
- [ ] `?role` 파라미터 + 페이지네이션 wiring (서버 페이지로 교체)
- [ ] mock `user_id` 필드명을 `userId` 로 변경
- [ ] 멘티 `college` 필드 → `firstMajor`, `major` → `secondMajor` 로 명확화
- [ ] 멘토 `cohort` 표시 시 응답이 number → 한국어 `${cohort}기` 포맷팅

### `/admin/applications` (신청관리)
- [ ] mock `MENTEE_APPLICATIONS`, `MENTOR_APPLICATIONS` 제거
- [ ] `?role` + `?year` + 페이지네이션 wiring
- [ ] `submittedAt` 표시 추가(원하면)
- [ ] 신청 상태 BE 라벨(`pending|approved|rejected|revision`) 그대로 사용

### `/admin/matchings` (매칭관리)
- [ ] mock `APPROVED_MENTEES`, `APPROVED_MENTORS` 제거
- [ ] `GET /api/admin/matchings/eligible?year=` 한 번 호출 → `.mentees`, `.mentors` 두 테이블에 분배
- [ ] 페이지네이션 없음(단일 풀)

### `/admin/announcements/create` (공지 작성·삭제)
- [ ] mock `MOCK_ANNOUNCEMENTS` 제거
- [ ] 페이지 진입 시 `GET /api/admin/announcements` 로 리스트 로드
- [ ] 폼 제출 → `POST /api/admin/announcements`, 응답을 리스트 prepend
- [ ] 삭제 → `DELETE /api/admin/announcements/:id`, 200 OK 후 클라이언트에서 제거
- [ ] 404 응답 발생 시 alert 후 리스트 새로고침

### `/announcements`, `/mentee/announcements`, `/mentor/announcements` (공개 목록)
- [ ] 공통 컴포넌트 `components/announcements/AnnouncementList.tsx` 의 `MOCK_ANNOUNCEMENTS` import 제거
- [ ] `GET /api/announcements` 응답으로 교체 (3개 진입 경로 모두 같은 데이터)
- [ ] basePath 별로 detail 링크 그대로 유지

### `/{role}/announcements/[id]` (공개 상세)
- [ ] mock 데이터 import 제거
- [ ] `GET /api/announcements/:id` 호출, 404 처리
- [ ] 본문 줄바꿈 보존 (`white-space: pre-wrap`)

### lib/api.ts (또는 fetch 헬퍼)
- [ ] 위 8개 엔드포인트 type 정의 + fetch 함수 추가
- [ ] 페이지네이션 응답 공통 타입:
  ```ts
  type Paged<T> = { data: T[]; totalCount: number; page: number; limit: number };
  ```

## 참고 — 응답 type 초안 (TypeScript)

```ts
export type AccountStatus = 'active' | 'inactive' | 'blocked';
export type ApplicationStatusLabel = 'pending' | 'approved' | 'rejected' | 'revision';

export type MenteeRow = {
  userId: string;
  name: string;
  studentId: string;
  firstMajor: string | null;
  secondMajor: string | null;
  phone: string;
  accountStatus: AccountStatus;
};

export type MentorRow = {
  userId: string;
  name: string;
  studentId: string;
  lawSchool: string | null;
  cohort: number | null;
  phone: string;
  accountStatus: AccountStatus;
};

export type ApplicationRow = {
  applicationId: string;
  name: string;
  studentId: string;
  status: ApplicationStatusLabel;
  memo: string | null;
  submittedAt: string | null;
} & ({ major: string } | { school: string | null });

export type EligiblePool = {
  year: number;
  mentees: Array<{
    applicationId: string;
    userId: string;
    name: string;
    studentId: string;
    major: string;
    accountStatus: AccountStatus;
  }>;
  mentors: Array<{
    applicationId: string;
    userId: string;
    name: string;
    studentId: string;
    lawSchool: string | null;
    accountStatus: AccountStatus;
  }>;
};

export type AnnouncementRow = {
  announcementId: string;
  title: string;
  body: string;
  createdAt: string;
  author: string;
};

export type Paged<T> = {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
};
```
