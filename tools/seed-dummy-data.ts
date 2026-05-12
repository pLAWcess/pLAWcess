// 더미 인물 시드 진입점.
// 입력 2개:
//   - 더미데이터.txt        : 인물별 헤더(학번/성별/전공/졸업/군상태/진로) + 활동 블록.  `## M..`=멘토, `## T..`=멘티
//   - 페르소나_60명.md      : 멘토는 소속 로스쿨, 멘티는 가군/나군/우선(원서 접수 학교 + 선호 학교)
// 두 파일을 ID로 합쳐 DB에 넣는다:
//   - 멘토(M)  → users(role=mentor) + mentor_records(+ lawschool_name) + applications(role=mentor)
//   - 멘티(T)  → users(role=mentee) + mentee_records(+ target_school_ga/na, preferred_group) + applications(role=mentee)
//
// 기본 동작: Gemini 분석 안 함 — 멘티의 AI 산출 필드(star_analysis 등)는 전부 null/false.
//            (멘토는 STAR 필드 자체가 스키마에 없음.)
// --analyze : 멘티별로 활동 전체에 대해 Gemini 배치 STAR 분석을 돌려 star_analysis 에 저장. 멘토에는 영향 없음.
//
// 사용법:
//   pnpm seed:dummy
//   pnpm seed:dummy -- --dry-run
//   pnpm seed:dummy -- --dry-run --dump-xlsx          # 파싱·합치기 결과를 xlsx로 덤프 (검증용)
//   pnpm seed:dummy -- --only M02,T13
//   pnpm seed:dummy -- --analyze
//   pnpm seed:dummy -- --analyze --force-reanalyze --only T13

import { config as dotenvConfig } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { ParsedPerson, ParseFailure } from "./seed/parser.js";
import { parseDummyData } from "./seed/parser.js";
import { parsePersonaFile, preferredGroup } from "./seed/persona.js";
import { buildSingleAnalysisHash } from "./seed/hash.js";
import { analyzeActivitiesBatch, type StarItem } from "./seed/gemini-batch.js";
import { writeDumpXlsx, type DumpMentor, type DumpMentee } from "./seed/dump-xlsx.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

// env는 prisma 초기화 이전에 로드.
dotenvConfig({ path: resolve(REPO_ROOT, "packages/database/.env") });
dotenvConfig({ path: resolve(REPO_ROOT, "apps/api/.env.local") });

const { prisma, Prisma } = await import("@plawcess/database");
type InputJsonValue = import("@plawcess/database").Prisma.InputJsonValue;

// ----------------------------------------------------------------
// CLI 인자
// ----------------------------------------------------------------

type CliArgs = {
  dataFile: string;
  personaFile: string;
  year: number | null;
  dryRun: boolean;
  only: Set<string> | null;
  analyze: boolean;
  forceReanalyze: boolean;
  dumpXlsxPath: string | null;
};

const DEFAULT_DUMP_PATH = resolve(__dirname, "seed-dump.xlsx"); // .gitignore: tools/*.xlsx

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    dataFile: resolve(__dirname, "더미데이터.txt"),
    personaFile: resolve(__dirname, "페르소나_60명.md"),
    year: null,
    dryRun: false,
    only: null,
    analyze: false,
    forceReanalyze: false,
    dumpXlsxPath: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") continue;
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--analyze") out.analyze = true;
    else if (a === "--force-reanalyze") out.forceReanalyze = true;
    else if (a === "--data-file") out.dataFile = resolve(argv[++i] ?? "");
    else if (a === "--persona-file") out.personaFile = resolve(argv[++i] ?? "");
    else if (a === "--dump-xlsx") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out.dumpXlsxPath = resolve(next);
        i++;
      } else {
        out.dumpXlsxPath = DEFAULT_DUMP_PATH;
      }
    } else if (a === "--year") {
      const v = Number.parseInt(argv[++i] ?? "", 10);
      if (!Number.isFinite(v)) throw new Error(`--year 값이 정수가 아닙니다: "${argv[i]}"`);
      out.year = v;
    } else if (a === "--only") {
      const list = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      out.only = new Set(list);
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`알 수 없는 인자: ${a}`);
    }
  }
  if (out.forceReanalyze && !out.analyze) {
    log("주의: --force-reanalyze 는 --analyze 와 함께일 때만 효과가 있습니다.");
  }
  return out;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(
    [
      "사용법: tsx tools/seed-dummy-data.ts [옵션]",
      "",
      "옵션:",
      "  --data-file <path>     더미데이터 파일 (기본: tools/더미데이터.txt)",
      "  --persona-file <path>  페르소나 파일 (기본: tools/페르소나_60명.md)",
      "  --year <YYYY>          process_year (기본: 활성 CycleSchedule)",
      "  --only M02,T13         지정한 ID만 처리",
      "  --dry-run              파싱·합치기만 하고 DB 쓰기를 하지 않음",
      "  --dump-xlsx [path]     결과를 xlsx로 덤프 (기본: tools/seed-dump.xlsx, .gitignore됨)",
      "  --analyze              멘티 활동에 Gemini 배치 STAR 분석을 수행 (기본: 하지 않음)",
      "  --force-reanalyze      (--analyze 와 함께) 캐시 무시하고 강제 재분석",
      "  -h, --help             도움말",
    ].join("\n")
  );
}

// ----------------------------------------------------------------
// 합치기 결과 타입 — xlsx 덤프와 동일 형태 (DumpMentor/DumpMentee 재사용)
// ----------------------------------------------------------------

type ResolvedMentor = DumpMentor;
type ResolvedMentee = DumpMentee;

// ----------------------------------------------------------------
// 메인
// ----------------------------------------------------------------

type SeedSummary = {
  mentorsWritten: number;
  menteesWritten: number;
  analyzed: number;
  analyzeCached: number;
  failed: string[];
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // 1) 두 파일 파싱
  const parsed = parseDummyData(readFileSync(args.dataFile, "utf-8"));
  const persona = parsePersonaFile(readFileSync(args.personaFile, "utf-8"));

  // 멘티 필터
  const persons = args.only ? parsed.ok.filter((p) => args.only!.has(p.id)) : parsed.ok;

  // 2) 합치기 + 합치기 경고 수집
  const mergeFailures: ParseFailure[] = [];
  const mentors: ResolvedMentor[] = [];
  const mentees: ResolvedMentee[] = [];

  for (const p of persons) {
    if (p.kind === "mentor") {
      const px = persona.mentors.get(p.id);
      if (!px) {
        mergeFailures.push({ id: p.id, reason: "페르소나_60명.md 멘토 표에 해당 라벨이 없음 → lawschool_name=null" });
      }
      mentors.push({ person: p, lawschool: px?.lawschool ?? null });
    } else {
      const px = persona.mentees.get(p.id);
      if (!px) {
        mergeFailures.push({ id: p.id, reason: "페르소나_60명.md 멘티 표에 해당 라벨이 없음 → 가군/나군/우선=null" });
        mentees.push({ person: p, targetGa: null, targetNa: null, preferred: null, preferredGroup: null });
      } else {
        const pg = preferredGroup(px);
        if (px.preferred && pg === null) {
          mergeFailures.push({
            id: p.id,
            reason: `우선("${px.preferred}")이 가군("${px.targetGa}")·나군("${px.targetNa}") 어느 쪽도 아님 → preferred_group=null`,
          });
        }
        mentees.push({
          person: p,
          targetGa: px.targetGa,
          targetNa: px.targetNa,
          preferred: px.preferred || null,
          preferredGroup: pg,
        });
      }
    }
  }

  // 페르소나 표에만 있고 더미데이터.txt 에는 없는 라벨 (예: M01)
  const haveIds = new Set(persons.map((p) => p.id));
  if (!args.only) {
    for (const label of persona.mentors.keys()) {
      if (!haveIds.has(label)) {
        mergeFailures.push({ id: label, reason: "페르소나 멘토 표에는 있으나 더미데이터.txt 에 본문이 없음 → 시드 제외" });
      }
    }
    for (const label of persona.mentees.keys()) {
      if (!haveIds.has(label)) {
        mergeFailures.push({ id: label, reason: "페르소나 멘티 표에는 있으나 더미데이터.txt 에 본문이 없음 → 시드 제외" });
      }
    }
  }

  const allFailures = [...parsed.failures, ...persona.failures.map(toParseFailure), ...mergeFailures];

  // 3) 리포트
  printSectionHeader("파싱·합치기 단계");
  if (parsed.failures.length === 0) log("더미데이터.txt 파싱 실패: 없음");
  else printFailureTable("더미데이터.txt 파싱 실패", parsed.failures);
  if (persona.failures.length === 0) log("페르소나_60명.md 파싱 실패: 없음");
  else printFailureTable("페르소나_60명.md 파싱 실패", persona.failures.map(toParseFailure));
  if (mergeFailures.length === 0) log("합치기 경고: 없음");
  else printFailureTable("합치기 경고", mergeFailures);

  log(
    `파싱 성공: 멘토 ${parsed.ok.filter((p) => p.kind === "mentor").length}명 / 멘티 ${parsed.ok.filter((p) => p.kind === "mentee").length}명` +
      ` — 처리 대상: 멘토 ${mentors.length}명 / 멘티 ${mentees.length}명`
  );

  // 4) xlsx 덤프 (dry-run 여부 무관)
  if (args.dumpXlsxPath) {
    await writeDumpXlsx({
      outPath: args.dumpXlsxPath,
      mentors,
      mentees,
      failures: allFailures,
      processYearLabel: args.year != null ? String(args.year) : "(활성 CycleSchedule — 런타임 결정)",
    });
    log(`xlsx 덤프 저장: ${args.dumpXlsxPath}`);
  }

  if (args.dryRun) {
    log("dry-run 모드: DB 쓰기를 건너뜁니다.");
    return;
  }

  // 5) process_year
  const processYear = await resolveProcessYear(args.year);
  log(`process_year = ${processYear}`);

  if (args.analyze && !process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY 환경변수가 없어 --analyze 를 진행할 수 없습니다. (.env.local 확인 또는 --analyze 없이 실행)");
  }
  if (!args.analyze) log("Gemini 분석 비활성 (기본값) — 멘티 AI 산출 필드는 모두 null/false 로 저장합니다.");

  // 6) 시딩
  const summary: SeedSummary = { mentorsWritten: 0, menteesWritten: 0, analyzed: 0, analyzeCached: 0, failed: [] };

  for (const r of mentors) {
    try {
      await seedMentor(r, processYear, args, summary);
    } catch (err) {
      summary.failed.push(r.person.id);
      log(`[${r.person.id}] 멘토 처리 실패: ${formatError(err)}`);
    }
  }
  for (const r of mentees) {
    try {
      await seedMentee(r, processYear, args, summary);
    } catch (err) {
      summary.failed.push(r.person.id);
      log(`[${r.person.id}] 멘티 처리 실패: ${formatError(err)}`);
    }
  }

  // 7) 요약
  log("");
  log("==== 시드 요약 ====");
  log(`멘토 DB 반영 : ${summary.mentorsWritten}`);
  log(`멘티 DB 반영 : ${summary.menteesWritten}`);
  if (args.analyze) {
    log(`분석 신규    : ${summary.analyzed}`);
    log(`분석 캐시    : ${summary.analyzeCached}`);
  } else {
    log(`분석         : 건너뜀 (--analyze 미지정)`);
  }
  log(`실패         : ${summary.failed.length}${summary.failed.length ? " (" + summary.failed.join(", ") + ")" : ""}`);

  await prisma.$disconnect();
  process.exit(summary.failed.length > 0 ? 2 : 0);
}

// ----------------------------------------------------------------
// User upsert (공통) — kind 에 따라 current_role 만 다름
// ----------------------------------------------------------------

async function upsertDummyUser(p: ParsedPerson) {
  const email = `${p.id.toLowerCase()}@dummy.plawcess.local`;
  const loginId = `dummy_${p.id.toLowerCase()}`;

  const common = {
    login_id: loginId,
    name: p.id,
    gender: p.gender,
    military_status: p.militaryStatus,
    undergrad_school_name: "고려대학교",
    undergrad_first_major: p.firstMajor,
    undergrad_second_major: p.secondMajor,
    undergrad_entry_year: p.entryYear,
    undergrad_graduation_year: p.graduationYear,
    current_role: p.kind, // "mentor" | "mentee" — CurrentRole enum 값과 일치
  };

  return prisma.user.upsert({
    where: { email },
    create: { email, account_status: "active", ...common },
    update: { ...common },
  });
}

// ----------------------------------------------------------------
// 공통: 활동 → qualitative_activities[] / --analyze 시 비울 AI 필드
// ----------------------------------------------------------------

function qualitativeActivitiesOf(p: ParsedPerson): unknown[] {
  return p.activities.map((a) => ({
    name: a.name,
    organization: a.organization,
    startDate: a.startDate,
    endDate: a.endDate,
    ongoing: a.ongoing,
    content: a.content,
    attachments: [] as unknown[],
    category: a.category, // 더미 출처 표시 — 본가 코드는 known 필드만 읽음
  }));
}

// --analyze 가 아니면 AI 산출 필드를 SQL NULL 로 비운다. --analyze 면 기존 값을 보존(캐시 hit 판정용).
function clearedAiFieldsForUpdate(analyze: boolean) {
  return analyze
    ? {}
    : {
        star_analysis: Prisma.DbNull,
        star_input_hashes: Prisma.DbNull,
        ai_keywords: Prisma.DbNull,
        ai_story_outline: Prisma.DbNull,
        ai_summary_hash: null,
        is_ai_analyzed: false,
        ai_analyzed_at: null,
      };
}

// 활동 hash 계산 + (필요시) Gemini 배치 호출. 캐시 hit 이면 { cached: true }, 활동 0개면 { empty: true }.
type StarComputeResult =
  | { kind: "computed"; stars: StarItem[]; newHashes: Record<string, string> }
  | { kind: "cached" }
  | { kind: "empty" };

async function computeStar(opts: {
  personId: string;
  activities: ParsedPerson["activities"];
  careerGoal: string | null;
  forceReanalyze: boolean;
  existing: { star_input_hashes: unknown; star_analysis: unknown } | null;
}): Promise<StarComputeResult> {
  if (opts.activities.length === 0) return { kind: "empty" };

  const newHashes: Record<string, string> = {};
  for (let i = 0; i < opts.activities.length; i++) {
    newHashes[String(i)] = buildSingleAnalysisHash(opts.activities[i], i);
  }

  if (!opts.forceReanalyze && opts.existing) {
    const oldHashes = (opts.existing.star_input_hashes ?? {}) as Record<string, string>;
    const oldStar = (opts.existing.star_analysis ?? null) as { activities?: StarItem[] } | null;
    const allMatch =
      Object.keys(newHashes).every((k) => oldHashes[k] === newHashes[k]) &&
      Array.isArray(oldStar?.activities) &&
      oldStar!.activities!.length === opts.activities.length;
    if (allMatch) return { kind: "cached" };
  }

  log(`[${opts.personId}] Gemini 배치 분석 시작 (활동 ${opts.activities.length}개)`);
  const stars = await analyzeActivitiesBatch(
    opts.activities.map((a) => ({
      name: a.name,
      organization: a.organization,
      startDate: a.startDate,
      endDate: a.endDate,
      ongoing: a.ongoing,
      content: a.content,
    })),
    opts.careerGoal
  );
  return { kind: "computed", stars, newHashes };
}

// star_analysis update 시 함께 비우는 통합분석 메타 (시드는 키워드·자소서 흐름을 안 만듦).
const STAR_UPDATE_CLEARED_META = {
  ai_keywords: Prisma.DbNull,
  ai_story_outline: Prisma.DbNull,
  ai_summary_hash: null,
  is_ai_analyzed: false,
  ai_analyzed_at: null,
} as const;

// ----------------------------------------------------------------
// 멘토 시딩 — users(role=mentor) + mentor_records + applications(role=mentor)
// ----------------------------------------------------------------

async function seedMentor(r: ResolvedMentor, processYear: number, args: CliArgs, summary: SeedSummary): Promise<void> {
  const p = r.person;
  const user = await upsertDummyUser(p);

  const baseRecord = {
    career_goal: p.careerGoal,
    qualitative_activities: qualitativeActivitiesOf(p) as unknown as InputJsonValue,
    lawschool_name: r.lawschool, // 페르소나의 "로스쿨" — 소속 로스쿨
    is_special_admission: false,
    record_status: "submitted" as const,
  };

  const record = await prisma.mentorRecord.upsert({
    where: { user_id_process_year: { user_id: user.user_id, process_year: processYear } },
    create: { user_id: user.user_id, process_year: processYear, ...baseRecord },
    update: { ...baseRecord, ...clearedAiFieldsForUpdate(args.analyze) },
  });

  const now = new Date();
  await prisma.application.upsert({
    where: { user_id_process_year_role: { user_id: user.user_id, process_year: processYear, role: "mentor" } },
    create: {
      user_id: user.user_id,
      process_year: processYear,
      role: "mentor",
      application_status: "submitted",
      mentor_record_id: record.record_id,
      submitted_at: now,
    },
    update: { application_status: "submitted", mentor_record_id: record.record_id, submitted_at: now },
  });

  summary.mentorsWritten++;
  log(`[${p.id}] 멘토 User/MentorRecord/Application 반영 (로스쿨=${r.lawschool ?? "null"}, career_goal=${p.careerGoal ?? "null"}, 활동 ${p.activities.length}개)`);

  // ----- Gemini 배치 STAR 분석 (opt-in) -----
  if (!args.analyze) return;
  const existing = await prisma.mentorRecord.findUnique({
    where: { record_id: record.record_id },
    select: { star_input_hashes: true, star_analysis: true },
  });
  const cr = await computeStar({
    personId: p.id,
    activities: p.activities,
    careerGoal: p.careerGoal,
    forceReanalyze: args.forceReanalyze,
    existing,
  });
  if (cr.kind === "empty") {
    log(`[${p.id}] 활동 0개 — 분석 스킵`);
  } else if (cr.kind === "cached") {
    summary.analyzeCached++;
    log(`[${p.id}] 모든 활동 hash 일치 — Gemini 호출 스킵`);
  } else {
    await prisma.mentorRecord.update({
      where: { record_id: record.record_id },
      data: {
        star_analysis: { activities: cr.stars } as unknown as InputJsonValue,
        star_input_hashes: cr.newHashes as unknown as InputJsonValue,
        ...STAR_UPDATE_CLEARED_META,
      },
    });
    summary.analyzed++;
    log(`[${p.id}] STAR 분석 결과 저장 완료 (멘토)`);
  }
}

// ----------------------------------------------------------------
// 멘티 시딩 — users(role=mentee) + mentee_records + applications(role=mentee)
// ----------------------------------------------------------------

async function seedMentee(
  r: ResolvedMentee,
  processYear: number,
  args: CliArgs,
  summary: SeedSummary
): Promise<void> {
  const p = r.person;
  const user = await upsertDummyUser(p);

  const baseRecord = {
    academic_status: p.academicStatus,
    career_goal: p.careerGoal,
    qualitative_activities: qualitativeActivitiesOf(p) as unknown as InputJsonValue,
    target_school_ga: r.targetGa,
    is_special_ga: false,
    target_school_na: r.targetNa,
    is_special_na: false,
    preferred_group: r.preferredGroup, // "가" | "나" | null
    record_status: "submitted" as const,
    current_step: 4,
  };

  const record = await prisma.menteeRecord.upsert({
    where: { user_id_process_year: { user_id: user.user_id, process_year: processYear } },
    create: { user_id: user.user_id, process_year: processYear, ...baseRecord },
    update: { ...baseRecord, ...clearedAiFieldsForUpdate(args.analyze) },
  });

  const now = new Date();
  await prisma.application.upsert({
    where: { user_id_process_year_role: { user_id: user.user_id, process_year: processYear, role: "mentee" } },
    create: {
      user_id: user.user_id,
      process_year: processYear,
      role: "mentee",
      application_status: "submitted",
      mentee_record_id: record.record_id,
      submitted_at: now,
    },
    update: { application_status: "submitted", mentee_record_id: record.record_id, submitted_at: now },
  });

  summary.menteesWritten++;
  log(
    `[${p.id}] 멘티 User/MenteeRecord/Application 반영 (가군=${r.targetGa ?? "null"}, 나군=${r.targetNa ?? "null"}, 우선군=${r.preferredGroup ?? "null"}, career_goal=${p.careerGoal ?? "null"}, 활동 ${p.activities.length}개)`
  );

  // ----- Gemini 배치 STAR 분석 (opt-in) -----
  if (!args.analyze) return;
  const existing = await prisma.menteeRecord.findUnique({
    where: { record_id: record.record_id },
    select: { star_input_hashes: true, star_analysis: true },
  });
  const cr = await computeStar({
    personId: p.id,
    activities: p.activities,
    careerGoal: p.careerGoal,
    forceReanalyze: args.forceReanalyze,
    existing,
  });
  if (cr.kind === "empty") {
    log(`[${p.id}] 활동 0개 — 분석 스킵`);
  } else if (cr.kind === "cached") {
    summary.analyzeCached++;
    log(`[${p.id}] 모든 활동 hash 일치 — Gemini 호출 스킵`);
  } else {
    await prisma.menteeRecord.update({
      where: { record_id: record.record_id },
      data: {
        star_analysis: { activities: cr.stars } as unknown as InputJsonValue,
        star_input_hashes: cr.newHashes as unknown as InputJsonValue,
        ...STAR_UPDATE_CLEARED_META,
      },
    });
    summary.analyzed++;
    log(`[${p.id}] STAR 분석 결과 저장 완료 (멘티)`);
  }
}

// ----------------------------------------------------------------
// 보조
// ----------------------------------------------------------------

async function resolveProcessYear(forced: number | null): Promise<number> {
  if (forced != null) return forced;
  const active = await prisma.cycleSchedule.findFirst({ where: { is_active: true }, select: { process_year: true } });
  if (!active) {
    throw new Error("활성 CycleSchedule이 없습니다. --year <YYYY> 로 명시하거나 admin에서 활성화하세요.");
  }
  if (active.process_year !== 2026) {
    log(`경고: 활성 CycleSchedule의 process_year=${active.process_year} (사용자가 알린 2026과 다름). 그대로 진행.`);
  }
  return active.process_year;
}

function toParseFailure(f: { context: string; reason: string; snippet?: string }): ParseFailure {
  return { id: f.context, reason: f.reason, snippet: f.snippet };
}

function printSectionHeader(title: string): void {
  log("");
  log(`==== ${title} ====`);
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
  return err instanceof Error ? err.message : String(err);
}

function log(msg: string): void {
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
