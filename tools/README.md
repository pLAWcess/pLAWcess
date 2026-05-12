# tools

레포 운영용 일회성 스크립트 모음. 런타임 코드(`apps/*`, `packages/*`)와는 격리되어 있으며, DB 클라이언트만 `@plawcess/database` 워크스페이스 패키지를 통해 공유한다.

## 설치

이 디렉터리는 `pnpm-workspace.yaml`의 `tools` 패키지로 등록되어 있다. 처음 추가했거나 의존성을 갱신했으면:

```
pnpm install
```

(설치 전에는 에디터에 `@types/node`, `dotenv`, `@plawcess/database`, `exceljs` 미해결 에러가 뜬다 — 정상.)

## 스크립트

### seed-dummy-data.ts — 더미 인물(멘토 20 + 멘티 40) 일괄 시드

입력 2개:
- `tools/더미데이터.txt` — 인물별 헤더(학번/성별/전공/졸업/군상태/진로) + 활동 블록. `## M..` = 멘토, `## T..` = 멘티
- `tools/페르소나_60명.md` — 멘토는 **소속 로스쿨**, 멘티는 **가군 / 나군 / 우선**(원서 접수 학교 + 더 선호하는 학교)

두 파일을 ID로 합쳐 DB에 넣는다:
- **멘토(M)** → `users`(current_role=mentor) + `mentor_records`(`career_goal`, `qualitative_activities`, `lawschool_name`, `record_status="submitted"`) + `applications`(role=mentor, status="submitted")
- **멘티(T)** → `users`(current_role=mentee) + `mentee_records`(`career_goal`, `qualitative_activities`, `target_school_ga`/`target_school_na`, `preferred_group`, `record_status="submitted"`) + `applications`(role=mentee, status="submitted")

`career_goal` 변환 규칙(멘토·멘티 공통): `"검사"`→`"검사"`, `"판사"`/`"법관"`→`"판사"`, `"변호사"`→`"변호사"`, 그 외(입법연구원·헌법연구관·법무사무관 등)는 원문 그대로(= FE "기타" 자유입력값).

`preferred_group` 도출: 페르소나의 `우선` 학교가 `가군`과 같으면 `"가"`, `나군`과 같으면 `"나"`, 둘 다 아니면 `null`(경고).

활동(`구분/활동명/활동기간/주요내용`)은 멘토·멘티 모두 `{mentor,mentee}_records.qualitative_activities[]` 에 저장된다(`ActivityWithAttachments` 형태 + `category`). 정량 점수(GPA/LEET/어학)·자기소개서·기타 고민 등 데이터에 없는 필드는 전부 null.

#### AI 산출 필드 (멘토·멘티 공통)

기본 동작에서는 AI 산출 필드(`star_analysis`, `star_input_hashes`, `ai_keywords`, `ai_story_outline`, `ai_summary_hash`, `is_ai_analyzed`, `ai_analyzed_at`)를 전부 null/false 로 저장한다. `--analyze` 를 줄 때만 멘토·멘티 각각의 활동에 대해 Gemini 배치 STAR 분석(인물 1명 = 호출 1회)을 돌려 `star_analysis` / `star_input_hashes` 를 채운다. 키워드·자소서 흐름·통합분석 메타는 시드에서 만들지 않는다(대시보드/관리자 화면에서 별도로 돌릴 수 있음).

> 멘토 정성 분석 API는 아직 없다. 이 시드는 `mentor_records.qualitative_activities` / `star_analysis` 컬럼에 직접 쓴다.

#### 환경 변수

- `DATABASE_URL` — `packages/database/.env`에서 자동 로드
- `GEMINI_API_KEY` — `apps/api/.env.local`에서 자동 로드 (`--analyze` 일 때만 필요)

#### 사용법

```
# 기본: 두 파일 파싱·합치기 → users/mentor_records/mentee_records/applications upsert. Gemini 분석 안 함.
pnpm seed:dummy

# 파싱·합치기만 (DB 쓰기 안 함)
pnpm seed:dummy -- --dry-run

# 결과를 xlsx로 덤프해 DB에 들어갈 값을 눈으로 검증 (dry-run과 같이 쓰면 DB도 안 건드림)
pnpm seed:dummy -- --dry-run --dump-xlsx
pnpm seed:dummy -- --dry-run --dump-xlsx 경로/파일.xlsx

# 일부 인물만
pnpm seed:dummy -- --only M02,T13

# 멘토·멘티 활동에 Gemini 배치 STAR 분석까지 수행
pnpm seed:dummy -- --analyze

# 캐시 무시하고 강제 재분석
pnpm seed:dummy -- --analyze --force-reanalyze

# process_year 강제 지정 (기본은 활성 CycleSchedule)
pnpm seed:dummy -- --year 2026

# 입력 파일 경로 변경
pnpm seed:dummy -- --data-file path/to/더미데이터.txt --persona-file path/to/페르소나.md
```

`--` 뒤의 인자는 pnpm을 거쳐 스크립트로 전달된다. 직접 실행하려면 `tsx tools/seed-dummy-data.ts ...`.

#### `--dump-xlsx [path]` — 검증용 덤프

기본 출력 경로는 `tools/seed-dump.xlsx`(`.gitignore`의 `tools/*.xlsx` 로 커밋·유출 방지). 경로를 직접 줄 땐 cwd(=`tools/`) 기준이므로 `seed-dump.xlsx` 처럼 파일명만 주거나 절대경로를 쓴다. 시트:
- **멘토** — 멘토 1명 = 1행: ID / email / login_id / current_role / 성별 / 군상태 / 입학·졸업년도 / 제1·2전공 / 학부학적 / `career_goal`(원문·저장값) / `lawschool_name`(소속 로스쿨) / `process_year` / `record_status` / 활동수
- **멘티** — 멘티 1명 = 1행: (멘토 컬럼들) + `target_school_ga`(가군) / `target_school_na`(나군) / 우선(원본) / `preferred_group` / `current_step`
- **활동** — 멘토·멘티 모두 1활동 = 1행: 인물ID / 구분(멘토/멘티) / index / 활동구분 / 활동명 / 기관 / 시작·종료(YYYY.MM) / 진행중 / 본문길이 / 본문(전문, wrap)
- **파싱실패** — 더미데이터/페르소나 파싱 + 합치기 단계 경고 (있을 때만)

enum 값과 한국어 라벨을 둘 다 보여줌. `process_year`는 `--year` 미지정 시 placeholder 텍스트(dry-run은 DB를 안 봄). `--only` 필터를 같이 주면 그 인물들만 덤프.

#### 멱등성

모든 쓰기는 upsert 기반(키: `users.email`, `mentor_records`/`mentee_records` 의 `[user_id, process_year]`, `applications` 의 `[user_id, process_year, role]`)이라 재실행 안전. `--analyze` 와 함께 재실행할 때 활동 hash(`tools/seed/hash.ts`)가 직전 결과와 모두 일치하면 Gemini 호출 스킵(`--force-reanalyze`로 무력화).

> 주의: 어떤 더미의 역할(M↔T)을 바꾸는 경우 — 새 ID로 다시 시드하면 새 row가 생기고 기존 반대-역할 row는 그대로 남는다. 역할 전환은 수동 정리가 필요하다.

#### 종료 코드

- `0` — 모든 인물 성공
- `2` — 일부 인물 실패 (DB upsert/Gemini 호출 등)
- `1` — 스크립트 자체 중단 (env 누락, 파일 없음, 활성 CycleSchedule 없음 등)

#### 본가와 동기화해야 할 코드

- `tools/seed/gemini-batch.ts` 시스템 프롬프트 본문은 `apps/api/src/lib/gemini.ts`의 `SINGLE_SYSTEM_INSTRUCTION` 본문을 옮겨온 것이다. 본가 프롬프트가 갱신되면 여기도 손으로 맞춰야 한다.
- `tools/seed/hash.ts`의 활동 hash 정규화는 `apps/api/src/lib/hash.ts`의 `buildSingleAnalysisHash` 형식을 따른다. 본가가 바뀌면 형식 호환이 깨질 수 있다.
