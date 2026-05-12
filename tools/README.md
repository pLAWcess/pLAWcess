# tools

레포 운영용 일회성 스크립트 모음. 런타임 코드(`apps/*`, `packages/*`)와는 격리되어 있으며, DB 클라이언트만 `@plawcess/database` 워크스페이스 패키지를 통해 공유한다.

## 설치

이 디렉터리는 `pnpm-workspace.yaml`의 `tools` 패키지로 등록되어 있다. 처음 추가했거나 의존성을 갱신했으면:

```
pnpm install
```

(설치 전에는 에디터에 `@types/node`, `dotenv`, `@plawcess/database` 미해결 에러가 뜬다 — 정상.)

## 스크립트

### seed-dummy-mentees.ts — 더미 멘티 일괄 시드

`더미데이터.txt`(레포 루트)를 파싱해 `users` + `mentee_records` + `applications` 행을 만든다. 멘티 M02~M20 + T01~T40 (총 59명)을 대상으로 한다.

- `record_status = "submitted"`, `Application` 도 함께 `submitted` 로 생성
- `career_goal` 은 헤더의 진로 텍스트를 FE 규칙대로 변환: `"검사"` 포함→`"검사"`, `"판사"`/`"법관"` 포함→`"판사"`, `"변호사"` 포함→`"변호사"`, 그 외(입법연구원·헌법연구관·법무사무관 등)는 원문 그대로 저장(= FE "기타" 자유입력값)
- 정량 점수(GPA/LEET/어학)·자기소개서·희망 학교·기타 고민 필드는 전부 null
- **AI 산출 필드는 기본적으로 비운다** — `star_analysis`, `star_input_hashes`, `ai_keywords`, `ai_story_outline`, `ai_summary_hash`, `is_ai_analyzed`, `ai_analyzed_at` 모두 null/false. `--analyze` 를 줄 때만 STAR 분석을 채운다.

#### 환경 변수

- `DATABASE_URL` — `packages/database/.env`에서 자동 로드
- `GEMINI_API_KEY` — `apps/api/.env.local`에서 자동 로드 (`--analyze` 일 때만 필요)

#### 사용법

```
# 기본: 파싱 → users/mentee_records/applications upsert. Gemini 분석 안 함.
pnpm seed:mentees

# 파싱만 (DB 쓰기 안 함)
pnpm seed:mentees -- --dry-run

# 파싱 결과를 xlsx로 덤프해서 DB에 들어갈 값을 눈으로 검증 (dry-run과 같이 쓰면 DB도 안 건드림)
pnpm seed:mentees -- --dry-run --dump-xlsx
pnpm seed:mentees -- --dry-run --dump-xlsx 경로/파일.xlsx   # 경로 직접 지정

# 일부 멘티만
pnpm seed:mentees -- --only M02,T13

# Gemini 배치 STAR 분석까지 수행 (멘티 1명 = 호출 1회)
pnpm seed:mentees -- --analyze

# 캐시 무시하고 강제 재분석
pnpm seed:mentees -- --analyze --force-reanalyze

# process_year 강제 지정 (기본은 활성 CycleSchedule)
pnpm seed:mentees -- --year 2026
```

`--` 뒤의 인자는 pnpm을 거쳐 스크립트로 전달된다. 직접 실행하려면 `tsx tools/seed-dummy-mentees.ts ...`.

#### `--dump-xlsx [path]` — 파싱 결과 검증용 덤프

DB에 쓰기 전에 추출된 값을 엑셀로 훑어보고 싶을 때. 기본 출력 경로는 `tools/seed-dump.xlsx`(`.gitignore`에 `tools/*.xlsx` 등록되어 있어 커밋·유출 안 됨). 시트:

- **멘티** — 멘티 1명 = 1행: ID / email / login_id / 성별 / 군상태 / 입학·졸업년도 / 제1·2전공 / 학적상태 / `career_goal`(원문·저장값) / `process_year` / `record_status` / `current_step` / 활동수. enum 값과 한국어 라벨을 둘 다 보여줌.
- **활동** — 활동 1개 = 1행: 멘티ID / index / 구분 / 활동명 / 기관 / 시작·종료(YYYY.MM) / 진행중 / 본문길이 / 본문(전문, wrap).
- **파싱실패** — 파싱 단계에서 떨어진 항목 (있을 때만): ID / 사유 / 스니펫.

`--only` 필터를 같이 주면 그 멘티들만 덤프된다 (= 실제로 쓰일 대상과 일치). `process_year`는 `--year`를 안 주면 "(활성 CycleSchedule — 런타임 결정)"로 표기 (dry-run은 DB를 안 보므로).

#### `--analyze` 동작

- 멘티별로 활동 전체를 한 번의 Gemini 호출로 STAR 분석 → `star_analysis.activities[]`, `star_input_hashes` 저장
- 키워드 추출(`ai_keywords`)·자소서 흐름(`ai_story_outline`)·통합분석 메타(`ai_summary_hash` 등)는 **여전히 만들지 않는다** — 매칭 알고리즘에 불필요. 대시보드에서 멘티 본인이 별도로 돌릴 수 있다.
- 시드 단계에서는 매 실행마다 `update` 가 AI 필드를 일단 비우므로, `--analyze` 없이 재실행하면 기존 분석 결과도 지워진다(의도된 동작).

#### 멱등성

모든 쓰기는 upsert 기반이라 재실행 안전. `--analyze` 와 함께 재실행할 때, 활동 hash(`tools/seed/hash.ts`)가 직전 결과와 모두 일치하면 Gemini 호출을 스킵한다(`--force-reanalyze`로 무력화). 단, `--analyze` 없는 재실행이 한 번이라도 끼면 AI 필드가 비워지므로 그다음 `--analyze` 는 캐시 miss가 된다.

#### 종료 코드

- `0` — 모든 멘티 성공
- `2` — 일부 멘티 실패 (DB upsert/Gemini 호출 등)
- `1` — 스크립트 자체 중단 (env 누락, 파일 없음, 활성 CycleSchedule 없음 등)

#### 본가와 동기화해야 할 코드

- `tools/seed/gemini-batch.ts` 시스템 프롬프트 본문은 `apps/api/src/lib/gemini.ts`의 `SINGLE_SYSTEM_INSTRUCTION` 본문을 옮겨온 것이다. 본가 프롬프트가 갱신되면 여기도 손으로 맞춰야 한다.
- `tools/seed/hash.ts`의 활동 hash 정규화는 `apps/api/src/lib/hash.ts`의 `buildSingleAnalysisHash` 형식을 따른다. 본가가 바뀌면 형식 호환이 깨질 수 있다.
