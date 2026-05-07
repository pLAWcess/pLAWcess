# 사업 스케줄 동기화 — Design Spec

- **Date**: 2026-05-06
- **Owner**: BE
- **Status**: Approved (브레인스토밍 완료)

## 1. 배경 / 문제

`/admin/applications` 페이지의 "사업 스케줄" 섹션과 `/mentee/applications` 페이지의 신청 마감일 안내 문구는 모두 **하드코딩**되어 있다.

- `apps/web/src/app/admin/applications/page.tsx:8-16` — `SCHEDULE_BY_YEAR['2024']`에 5개 일정이 자유 텍스트(`"2024년 3월 1일 ~ 2024년 3월 31일"`)로 박혀있고, 편집 모드의 `<input>`은 저장 로직 없음. 연도 드롭다운은 `['2024','2025','2026']` 상수.
- `apps/web/src/app/mentee/applications/page.tsx:208-210` — `"2027학년도 pLAWcess는 2026년 7월 20일까지 입력된 정보를 기반으로 멘토-멘티 매칭이 이루어집니다."` 문구의 학년도와 마감일이 하드코딩.

목표: admin이 신청관리 페이지에서 사업 스케줄을 갱신하면, 멘티 신청 페이지의 마감일 안내가 자동으로 그 값을 반영한다.

## 2. 결정사항 (브레인스토밍 합의)

| 주제 | 결정 |
|---|---|
| 멘티 페이지에서 동적으로 바뀌는 범위 | 하단 안내 문구의 **학년도**(`process_year`)와 **마감일**(`mentee_apply_end`)만. 4단계 STEPS 옆에 기간을 추가 표시하는 안은 채택하지 않음 |
| 데이터 보관 | DB 영속화. 연도별 이력 유지 (덮어쓰기 X) |
| 멘티가 보는 "현재 연도" 결정 방식 | admin이 명시적으로 한 연도를 활성(active)으로 토글. cycle 전환을 admin이 통제 |
| 일정 항목 데이터 형식 | 자유 텍스트가 아니라 `start_date` / `end_date` (DATE) 구조화. admin UI는 날짜 피커 2개 |
| admin 가드 인프라 | 본 작업 범위에서 제외. 임시 인라인 가드만 적용 후 별도 이슈로 분리 |
| 마감일 지난 경우 신청서 제출 버튼 비활성화 | 본 작업 범위에서 제외. 별도 이슈로 분리 (추후 검토) |

## 3. 데이터 모델

신규 Prisma 모델 1개 (`packages/database/prisma/schema.prisma`):

```prisma
model CycleSchedule {
  process_year           Int      @id
  is_active              Boolean  @default(false)

  mentor_recruit_start   DateTime? @db.Date
  mentor_recruit_end     DateTime? @db.Date
  mentee_apply_start     DateTime? @db.Date
  mentee_apply_end       DateTime? @db.Date
  matching_start         DateTime? @db.Date
  matching_end           DateTime? @db.Date
  match_announce_date    DateTime? @db.Date
  admission_result_start DateTime? @db.Date
  admission_result_end   DateTime? @db.Date

  created_at             DateTime @default(now())
  updated_at             DateTime @updatedAt

  @@map("cycle_schedules")
}
```

설계 메모:
- `process_year`를 PK로. 연도당 1행
- 일정 5개 → 9개 컬럼(매칭 공지는 단일 날짜이므로 컬럼 1개, 나머지 4개는 시작/종료 2컬럼)으로 flat하게. 항목이 5개로 고정이라 별도 테이블 분리는 YAGNI
- 모든 날짜 필드 nullable. admin이 항목별로 부분 입력할 수 있게 허용. 멘티 페이지는 필요한 필드(`mentee_apply_end`)가 null이면 fallback 표시
- `is_active` 단일 보장은 PATCH 핸들러 내 트랜잭션에서 처리(앱 레벨). DB 부분 unique index는 사용하지 않음
- 마이그레이션은 신규 테이블 생성이라 비파괴적. 시드는 없음 (admin이 첫 연도부터 직접 입력)

## 4. API 엔드포인트

총 4개. admin 3개 + 공용 1개.

### 4.1 `GET /api/admin/cycle-schedules`

- 모든 연도 스케줄 반환 (admin 페이지 연도 드롭다운 + 데이터)
- 가드: `current_role === 'admin'` 아니면 403
- Response 200:
  ```json
  [
    {
      "process_year": 2027,
      "is_active": true,
      "mentor_recruit_start": "2026-03-01",
      "mentor_recruit_end": "2026-03-31",
      "mentee_apply_start": "2026-04-01",
      "mentee_apply_end": "2026-07-20",
      "matching_start": "2026-08-01",
      "matching_end": "2026-08-15",
      "match_announce_date": "2026-08-20",
      "admission_result_start": "2026-11-01",
      "admission_result_end": "2026-12-31"
    }
  ]
  ```
- 정렬: `process_year DESC`

### 4.2 `POST /api/admin/cycle-schedules`

- 새 연도 빈 행 생성
- Body: `{ "process_year": 2028 }`
- 가드: admin 전용
- Response 201: 생성된 행
- 이미 존재하면 409

### 4.3 `PATCH /api/admin/cycle-schedules/:year`

- 특정 연도 수정 또는 활성화
- Body (모두 optional):
  ```json
  {
    "mentor_recruit_start": "2026-03-01",
    "mentor_recruit_end": "2026-03-31",
    "mentee_apply_start": "...",
    "mentee_apply_end": "...",
    "matching_start": "...",
    "matching_end": "...",
    "match_announce_date": "...",
    "admission_result_start": "...",
    "admission_result_end": "...",
    "is_active": true
  }
  ```
- 가드: admin 전용
- `is_active: true` 포함 시 트랜잭션으로 (a) 다른 모든 연도 `is_active=false` (b) 해당 연도 `is_active=true`. `is_active: false`는 단순히 그 연도만 비활성화 (활성 cycle 부재 상태 허용)
- Response 200: 갱신된 행
- 존재하지 않는 `:year`이면 404
- 잘못된 날짜 형식은 400

### 4.4 `GET /api/cycle-schedules/active`

- `is_active=true`인 단일 cycle 반환
- 가드: 로그인 사용자(JWT 검증). 멘티/멘토/admin 모두 가능
- Response 200:
  - 활성 cycle 있으면: `{ "process_year": ..., "mentor_recruit_start": ..., ..., "admission_result_end": ... }` (전체 필드)
  - 없으면: `null`
- 멘티 페이지는 응답에서 `process_year`와 `mentee_apply_end`만 사용. 다른 필드는 향후 확장(STEPS 옆 기간 표시 등) 시 재사용 가능하도록 함께 노출

## 5. Admin 라우트 임시 가드

각 admin 라우트 핸들러 시작 부분에 인라인 체크:

```ts
const payload = getTokenFromCookie(req);
if (!payload || payload.current_role !== 'admin') {
  return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
}
```

`requireAdmin` 헬퍼 추출이나 admin 미들웨어 패턴 정립은 **별도 이슈**(섹션 8 참고)에서 처리.

## 6. UI 변경 (FE 핸드오프 — 본 PR에 포함하지 않음)

### 6.1 `apps/web/src/app/admin/applications/page.tsx`

- 하드코딩 `SCHEDULE_BY_YEAR` / `YEARS` 제거 → `GET /api/admin/cycle-schedules` 페치로 교체
- 편집 모드: `<input type="text">` → `<input type="date">` 2개 (시작/종료). 매칭 공지는 1개. null 허용
- "수정" → "완료" 클릭 시 현재 연도 변경분을 `PATCH /api/admin/cycle-schedules/:year`로 저장
- 연도 옆에 **"이 연도를 멘티에게 노출"** 토글 추가 — 켜면 `PATCH { is_active: true }`. 활성 연도에는 "● 활성" 뱃지
- "+ 새 연도 추가" UI — `POST /api/admin/cycle-schedules { process_year }` 후 그 연도로 전환 + 자동 편집모드 진입

### 6.2 `apps/web/src/app/mentee/applications/page.tsx`

- 페이지 마운트 시 `GET /api/cycle-schedules/active` 페치
- 208–210행 안내문 두 곳 동적 주입:
  - `2027학년도` → `${process_year}학년도`
  - `2026년 7월 20일` → `mentee_apply_end`을 `"yyyy년 m월 d일"`로 포맷
- Fallback: 응답 `null`이거나 `mentee_apply_end` null이면 "현재 진행 중인 pLAWcess 사업의 신청 기간이 아직 등록되지 않았습니다." 같은 안내. 정확한 문구·디자인은 FE 판단

## 7. 검증 / 테스트 (BE)

- POST 같은 연도 두 번 → 409
- PATCH 존재하지 않는 연도 → 404
- PATCH `is_active: true` → 트랜잭션으로 다른 연도 모두 false 처리, 해당 연도만 true
- PATCH 후 `GET /api/cycle-schedules/active` → 즉시 반영
- 비-admin 토큰으로 admin 라우트 호출 → 403
- 토큰 없이 admin 라우트 → 403
- 활성 cycle 없을 때 `GET /api/cycle-schedules/active` → 200 + `null`

## 8. 별도 이슈로 분리

### 8.1 admin 권한 가드 인프라 (BE)

**필요성**: `apps/api`에 admin 라우트 디렉토리도, role 체크 헬퍼도 부재(`auth.ts`는 토큰 검증까지만 제공). 본 작업에서는 인라인 가드로 우회했으나 이후 admin 라우트가 늘어나면 일관성·테스트·감사 모두 어려워짐.

**작업 항목**:
- `requireAdmin(req)` 헬퍼 또는 동급 추상화를 `apps/api/src/lib/auth.ts`에 추가
- 본 작업에서 도입한 인라인 가드를 헬퍼로 마이그레이션
- admin 계정 등록 흐름 정의: 회원가입은 `current_role: 'mentee'` 고정이므로 admin 승격 절차 필요 (DB 직접 UPDATE? 별도 CLI 스크립트? 부트스트랩?)
- 권한 위반 시 표준 에러 응답 형식

### 8.2 신청서 제출 버튼 — 마감일 지난 경우 비활성화 (FE)

본 작업의 직접 후속. `mentee_apply_end < 오늘`이면 제출 버튼 비활성화 + "신청 기간이 종료되었습니다" 안내. 본 작업에서는 마감일 **표시**까지만.

## 9. 범위 외 (YAGNI)

- DELETE 라우트 — 연도별 이력은 보관하기로 결정
- 활성 cycle 전용 토글 라우트 — PATCH `is_active`로 충분
- 단일 활성 보장 DB 부분 unique index — 앱 레벨 트랜잭션으로 충분
- 멘티 STEPS 옆 기간 표시 — 본 작업에서는 하단 안내 문구만 동기화
