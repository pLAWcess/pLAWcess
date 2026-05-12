// 더미 멘티 시드 진입점.
// 더미데이터.txt 를 파싱해 users + mentee_records + applications 행을 만든다.
//
// 기본 동작: Gemini 분석은 하지 않는다. AI 산출 필드(star_analysis / star_input_hashes /
//            ai_keywords / ai_story_outline / ai_summary_hash / is_ai_analyzed / ai_analyzed_at)는
//            전부 null/false 로 저장한다.
// --analyze : 멘티별로 활동 전체에 대해 Gemini 배치 STAR 분석(멘티 1명 = 호출 1회)을 돌려
//             star_analysis / star_input_hashes 에 저장한다. (키워드·자소서 흐름은 여전히 안 만듦)
//
// 사용법:
//   pnpm seed:mentees
//   pnpm seed:mentees -- --dry-run
//   pnpm seed:mentees -- --dry-run --dump-xlsx          # 파싱 결과를 xlsx로 덤프 (검증용)
//   pnpm seed:mentees -- --only M02,T13
//   pnpm seed:mentees -- --analyze
//   pnpm seed:mentees -- --analyze --force-reanalyze --only M02

import { config as dotenvConfig } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { ParsedMentee, ParseFailure } from "./seed/parser.js";
import { parseDummyData, isPresetCareerGoal } from "./seed/parser.js";
import { buildSingleAnalysisHash } from "./seed/hash.js";
import {
  analyzeActivitiesBatch,
  type StarItem,
} from "./seed/gemini-batch.js";
import { writeDumpXlsx } from "./seed/dump-xlsx.js";

// env는 prisma 초기화 이전에 로드해야 한다.
// 1) packages/database/.env  → DATABASE_URL
// 2) apps/api/.env.local     → GEMINI_API_KEY (등 API 전용)
// 우선순위는 process.env(셸 export) > 먼저 로드된 파일.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

dotenvConfig({ path: resolve(REPO_ROOT, "packages/database/.env") });
dotenvConfig({ path: resolve(REPO_ROOT, "apps/api/.env.local") });

// 동적 import — dotenv 후에 로드해야 PrismaPg 가 DATABASE_URL 를 본다.
const { prisma, Prisma } = await import("@plawcess/database");
type InputJsonValue = import("@plawcess/database").Prisma.InputJsonValue;

// ----------------------------------------------------------------
// CLI 인자
// ----------------------------------------------------------------

type CliArgs = {
  file: string; // 입력 파일
  year: number | null; // null이면 활성 CycleSchedule
  dryRun: boolean;
  only: Set<string> | null; // null이면 전체
  analyze: boolean; // true면 Gemini 배치 STAR 분석 수행
  forceReanalyze: boolean; // --analyze 와 함께일 때만 의미: 캐시 무시
  dumpXlsxPath: string | null; // null이면 덤프 안 함. 값이 있으면 그 경로에 xlsx 저장.
};

const DEFAULT_DUMP_PATH_REL = "tools/seed-dump.xlsx"; // .gitignore 에 tools/*.xlsx 등록됨

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    file: resolve(REPO_ROOT, "더미데이터.txt"),
    year: null,
    dryRun: false,
    only: null,
    analyze: false,
    forceReanalyze: false,
    dumpXlsxPath: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // 루트 → tools 필터 두 단계 pnpm 스크립트를 거치면서 "--" 가 그대로 넘어올 수 있음 → 무시.
    if (a === "--") continue;
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--analyze") out.analyze = true;
    else if (a === "--force-reanalyze") out.forceReanalyze = true;
    else if (a === "--file") out.file = resolve(argv[++i] ?? "");
    else if (a === "--dump-xlsx") {
      // 다음 토큰이 옵션이 아니면 경로로 취급, 아니면 기본 경로.
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out.dumpXlsxPath = resolve(next);
        i++;
      } else {
        out.dumpXlsxPath = resolve(REPO_ROOT, DEFAULT_DUMP_PATH_REL);
      }
    } else if (a === "--year") {
      const v = Number.parseInt(argv[++i] ?? "", 10);
      if (!Number.isFinite(v)) {
        throw new Error(`--year 값이 정수가 아닙니다: "${argv[i]}"`);
      }
      out.year = v;
    } else if (a === "--only") {
      const list = (argv[++i] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      out.only = new Set(list);
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`알 수 없는 인자: ${a}`);
    }
  }
  if (out.forceReanalyze && !out.analyze) {
    // 단독으로 주면 무시되는 게 헷갈리니 명시적으로 알린다.
    log("주의: --force-reanalyze 는 --analyze 와 함께일 때만 효과가 있습니다.");
  }
  return out;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(
    [
      "사용법: tsx tools/seed-dummy-mentees.ts [옵션]",
      "",
      "옵션:",
      "  --file <path>        더미데이터 파일 경로 (기본: 레포 루트의 더미데이터.txt)",
      "  --year <YYYY>        process_year (기본: 활성 CycleSchedule)",
      "  --only M02,T13       지정한 ID만 처리",
      "  --dry-run            파싱만 하고 DB 쓰기를 하지 않음",
      "  --dump-xlsx [path]   파싱 결과(DB에 들어갈 값)를 xlsx로 덤프 (기본 경로: tools/seed-dump.xlsx, .gitignore됨)",
      "  --analyze            Gemini 배치 STAR 분석을 수행하고 star_analysis 에 저장 (기본: 하지 않음)",
      "  --force-reanalyze    (--analyze 와 함께) 캐시 무시하고 강제 재분석",
      "  -h, --help           도움말",
    ].join("\n")
  );
}

// ----------------------------------------------------------------
// 메인
// ----------------------------------------------------------------

type SeedSummary = {
  written: number; // upsert로 반영된 멘티 수
  analyzed: number; // Gemini 분석 새로 돈 멘티 수
  analyzeCached: number; // 분석 캐시 적중으로 스킵된 멘티 수
  failed: string[]; // 단계 어디서든 실패한 ID
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // 1) 파일 읽기 + 파싱
  const raw = readFileSync(args.file, "utf-8");
  const parsed = parseDummyData(raw);

  // 멘티 필터 (career_goal 은 파서가 이미 m.careerGoal 에 채워둠)
  const targets = args.only
    ? parsed.ok.filter((m) => args.only!.has(m.id))
    : parsed.ok;

  const customCareers = targets.filter(
    (m) => m.careerGoal !== null && !isPresetCareerGoal(m.careerGoal)
  );

  // 파싱 실패 표 출력
  printFailuresHeader();
  if (parsed.failures.length === 0) {
    log("파싱 단계 실패: 없음");
  } else {
    printFailureTable("파싱 실패", parsed.failures);
  }
  if (customCareers.length > 0) {
    log(
      `진로 프리셋(변호사/검사/판사) 미해당 → 원문 그대로 저장: ${customCareers.length}건`
    );
    for (const m of customCareers) {
      log(`  - ${m.id}: "${m.careerGoal}"`);
    }
  }

  log(
    `파싱 성공: ${parsed.ok.length}명 / 처리 대상: ${targets.length}명 / 파싱 실패: ${parsed.failures.length}건`
  );

  // xlsx 덤프 (dry-run 여부와 무관 — 요청 시 항상 생성)
  if (args.dumpXlsxPath) {
    await writeDumpXlsx({
      outPath: args.dumpXlsxPath,
      mentees: targets,
      failures: parsed.failures,
      processYearLabel:
        args.year != null ? String(args.year) : "(활성 CycleSchedule — 런타임 결정)",
    });
    log(`xlsx 덤프 저장: ${args.dumpXlsxPath}`);
  }

  if (args.dryRun) {
    log("dry-run 모드: DB 쓰기를 건너뜁니다.");
    return;
  }

  // 2) process_year 해결
  const processYear = await resolveProcessYear(args.year);
  log(`process_year = ${processYear}`);

  // 3) 분석을 돌릴 거라면 GEMINI_API_KEY 필요
  if (args.analyze && !process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY 환경변수가 없어 --analyze 를 진행할 수 없습니다. " +
        "(.env.local 확인 또는 --analyze 없이 실행)"
    );
  }
  if (!args.analyze) {
    log("Gemini 분석 비활성 (기본값) — AI 산출 필드는 모두 null/false 로 저장합니다.");
  }

  // 4) 멘티별 처리
  const summary: SeedSummary = {
    written: 0,
    analyzed: 0,
    analyzeCached: 0,
    failed: [],
  };

  for (const mentee of targets) {
    try {
      await seedOne(mentee, processYear, args, summary);
    } catch (err) {
      summary.failed.push(mentee.id);
      log(`[${mentee.id}] 처리 실패: ${formatError(err)}`);
    }
  }

  // 5) 종료 요약
  log("");
  log("==== 시드 요약 ====");
  log(`처리 대상  : ${targets.length}`);
  log(`DB 반영    : ${summary.written}`);
  if (args.analyze) {
    log(`분석 신규  : ${summary.analyzed}`);
    log(`분석 캐시  : ${summary.analyzeCached}`);
  } else {
    log(`분석       : 건너뜀 (--analyze 미지정)`);
  }
  log(
    `실패       : ${summary.failed.length}${summary.failed.length ? " (" + summary.failed.join(", ") + ")" : ""}`
  );

  await prisma.$disconnect();
  process.exit(summary.failed.length > 0 ? 2 : 0);
}

// ----------------------------------------------------------------
// 멘티 1명 시딩
// ----------------------------------------------------------------

async function seedOne(
  m: ParsedMentee,
  processYear: number,
  args: CliArgs,
  summary: SeedSummary
): Promise<void> {
  const careerGoal = m.careerGoal; // 파서가 변환해둔 값 (변호사/검사/판사 또는 원문/null)

  // ----- User upsert -----
  const email = `${m.id.toLowerCase()}@dummy.plawcess.local`;
  const loginId = `dummy_${m.id.toLowerCase()}`;

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      login_id: loginId,
      name: m.id, // 더미 이름은 식별자 그대로 — 추후 관리자가 변경 가능
      gender: m.gender,
      military_status: m.militaryStatus,
      undergrad_school_name: "고려대학교",
      undergrad_first_major: m.firstMajor,
      undergrad_second_major: m.secondMajor,
      undergrad_entry_year: m.entryYear,
      undergrad_graduation_year: m.graduationYear,
      account_status: "active",
      current_role: "mentee",
    },
    update: {
      // 키 외 필드는 재실행 시 최신 파싱 결과로 동기화
      login_id: loginId,
      name: m.id,
      gender: m.gender,
      military_status: m.militaryStatus,
      undergrad_first_major: m.firstMajor,
      undergrad_second_major: m.secondMajor,
      undergrad_entry_year: m.entryYear,
      undergrad_graduation_year: m.graduationYear,
      current_role: "mentee",
    },
  });

  // ----- MenteeRecord upsert -----
  const qualitativeActivities = m.activities.map((a) => ({
    name: a.name,
    organization: a.organization,
    startDate: a.startDate,
    endDate: a.endDate,
    ongoing: a.ongoing,
    content: a.content,
    attachments: [] as unknown[],
    // dummy data 출처 표시 — 본가 코드는 known 필드만 읽으므로 무해
    category: a.category,
  }));

  // AI 산출 필드 정리.
  // - 기본(--analyze 없음): 항상 SQL NULL 로 비운다. (사용자 요구: AI 답변 데이터는 null이 기본)
  // - --analyze: 기존 분석 결과를 보존한다(캐시 hit 판정용). 아래에서 hash 비교 후 갱신.
  // Json? 컬럼을 SQL NULL 로 비우려면 Prisma.DbNull (create 기본값과 동일 상태).
  const clearedAiFieldsForUpdate = args.analyze
    ? {} // --analyze 면 update 단계에서 AI 필드 손대지 않음
    : {
        star_analysis: Prisma.DbNull,
        star_input_hashes: Prisma.DbNull,
        ai_keywords: Prisma.DbNull,
        ai_story_outline: Prisma.DbNull,
        ai_summary_hash: null,
        is_ai_analyzed: false,
        ai_analyzed_at: null,
      };

  const record = await prisma.menteeRecord.upsert({
    where: {
      user_id_process_year: {
        user_id: user.user_id,
        process_year: processYear,
      },
    },
    create: {
      user_id: user.user_id,
      process_year: processYear,
      academic_status: m.academicStatus,
      career_goal: careerGoal,
      qualitative_activities: qualitativeActivities as unknown as InputJsonValue,
      record_status: "submitted",
      current_step: 4,
      ai_summary_hash: null,
      is_ai_analyzed: false,
      ai_analyzed_at: null,
    },
    update: {
      academic_status: m.academicStatus,
      career_goal: careerGoal,
      qualitative_activities: qualitativeActivities as unknown as InputJsonValue,
      record_status: "submitted",
      current_step: 4,
      ...clearedAiFieldsForUpdate,
    },
  });

  // ----- Application upsert -----
  const now = new Date();
  await prisma.application.upsert({
    where: {
      user_id_process_year_role: {
        user_id: user.user_id,
        process_year: processYear,
        role: "mentee",
      },
    },
    create: {
      user_id: user.user_id,
      process_year: processYear,
      role: "mentee",
      application_status: "submitted",
      mentee_record_id: record.record_id,
      submitted_at: now,
    },
    update: {
      application_status: "submitted",
      mentee_record_id: record.record_id,
      submitted_at: now,
    },
  });

  summary.written++;
  log(
    `[${m.id}] User/Record/Application 반영 완료 (활동 ${m.activities.length}개, career_goal=${careerGoal ?? "null"})`
  );

  // ----- Gemini 배치 분석 (opt-in) -----
  if (!args.analyze) return;
  if (m.activities.length === 0) {
    log(`[${m.id}] 활동 0개 — 분석 스킵`);
    return;
  }

  // 캐시 적중 여부 판정 — --analyze 면 upsert 가 기존 AI 필드를 보존하므로
  // 재실행 시 같은 입력이면 hash 가 일치해 Gemini 호출을 스킵할 수 있다.
  const newHashes: Record<string, string> = {};
  for (let i = 0; i < m.activities.length; i++) {
    newHashes[String(i)] = buildSingleAnalysisHash(m.activities[i], i);
  }

  if (!args.forceReanalyze) {
    const existing = await prisma.menteeRecord.findUnique({
      where: { record_id: record.record_id },
      select: { star_input_hashes: true, star_analysis: true },
    });
    const oldHashes = (existing?.star_input_hashes ?? {}) as Record<string, string>;
    const oldStar = (existing?.star_analysis ?? null) as {
      activities?: StarItem[];
    } | null;
    const allMatch =
      Object.keys(newHashes).length > 0 &&
      Object.keys(newHashes).every((k) => oldHashes[k] === newHashes[k]) &&
      Array.isArray(oldStar?.activities) &&
      oldStar!.activities!.length === m.activities.length;
    if (allMatch) {
      summary.analyzeCached++;
      log(`[${m.id}] 모든 활동 hash 일치 — Gemini 호출 스킵`);
      return;
    }
  }

  log(`[${m.id}] Gemini 배치 분석 시작 (활동 ${m.activities.length}개)`);
  const stars = await analyzeActivitiesBatch(
    m.activities.map((a) => ({
      name: a.name,
      organization: a.organization,
      startDate: a.startDate,
      endDate: a.endDate,
      ongoing: a.ongoing,
      content: a.content,
    })),
    careerGoal
  );

  await prisma.menteeRecord.update({
    where: { record_id: record.record_id },
    data: {
      star_analysis: { activities: stars } as unknown as InputJsonValue,
      star_input_hashes: newHashes as unknown as InputJsonValue,
      // 키워드/자소서 흐름·통합분석 메타는 시드에서 만들지 않으므로 비운 채 둔다.
      ai_keywords: Prisma.DbNull,
      ai_story_outline: Prisma.DbNull,
      ai_summary_hash: null,
      is_ai_analyzed: false,
      ai_analyzed_at: null,
    },
  });
  summary.analyzed++;
  log(`[${m.id}] STAR 분석 결과 저장 완료`);
}

// ----------------------------------------------------------------
// 보조
// ----------------------------------------------------------------

async function resolveProcessYear(forced: number | null): Promise<number> {
  if (forced != null) return forced;
  const active = await prisma.cycleSchedule.findFirst({
    where: { is_active: true },
    select: { process_year: true },
  });
  if (!active) {
    throw new Error(
      "활성 CycleSchedule이 없습니다. --year <YYYY> 로 명시하거나 admin에서 활성화하세요."
    );
  }
  if (active.process_year !== 2026) {
    log(
      `경고: 활성 CycleSchedule의 process_year=${active.process_year} (사용자가 알린 2026과 다름). 그대로 진행.`
    );
  }
  return active.process_year;
}

function printFailuresHeader(): void {
  log("");
  log("==== 파싱 단계 ====");
}

function printFailureTable(title: string, failures: ParseFailure[]): void {
  log(`[${title}] ${failures.length}건`);
  for (const f of failures) {
    log(`  - ${f.id}: ${f.reason}`);
    if (f.snippet) log(`      ↳ ${truncate(f.snippet, 200)}`);
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "…";
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function log(msg: string): void {
  // 통일된 형태로 stdout에 찍는다. console.log를 한 곳에 모아 향후 파일 로깅으로 바꾸기 쉽게.
  // eslint-disable-next-line no-console
  console.log(msg);
}

// ----------------------------------------------------------------
// Entry
// ----------------------------------------------------------------

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("시드 스크립트 실패:", err);
  prisma.$disconnect().finally(() => process.exit(1));
});
