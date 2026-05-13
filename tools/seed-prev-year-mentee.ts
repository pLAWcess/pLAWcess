// 캐리오버 테스트용 일회용 시드.
//
// 사용법:
//   pnpm tsx tools/seed-prev-year-mentee.ts --email=<로그인 이메일> [--year=2025]
//
// 동작:
//   - 해당 사용자에게 process_year=YEAR 인 MenteeRecord 가 없으면 생성, 있으면 활동만 덮어씀.
//   - qualitative_activities 에 샘플 활동 3개를 넣고, 통합 분석 결과는 비워둠.
//     (캐리오버 모달에서 활동 자체가 끌어와지는지만 확인하면 충분)

import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(here, "../.env") });
dotenvConfig({ path: resolve(here, "../apps/api/.env") });

const { prisma, Prisma } = await import("@plawcess/database");

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const email = arg("email");
const year = parseInt(arg("year") ?? "2025", 10);

if (!email) {
  console.error("사용법: pnpm tsx tools/seed-prev-year-mentee.ts --email=<이메일> [--year=2025]");
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email }, select: { user_id: true, name: true } });
if (!user) {
  console.error(`이메일 ${email} 사용자를 찾을 수 없습니다.`);
  process.exit(1);
}

const sampleActivities = [
  {
    category: "교내",
    name: "샘플 학회 활동",
    organization: "샘플 학회",
    startDate: "2024-03-01",
    endDate: "2024-12-31",
    ongoing: false,
    content: "캐리오버 테스트용 더미 활동 1",
  },
  {
    category: "대외",
    name: "샘플 봉사 활동",
    organization: "샘플 기관",
    startDate: "2024-06-01",
    endDate: "2024-08-31",
    ongoing: false,
    content: "캐리오버 테스트용 더미 활동 2",
  },
  {
    category: "사회경험",
    name: "샘플 인턴십",
    organization: "샘플 회사",
    startDate: "2024-09-01",
    endDate: "2024-11-30",
    ongoing: false,
    content: "캐리오버 테스트용 더미 활동 3",
  },
];

await prisma.menteeRecord.upsert({
  where: { user_id_process_year: { user_id: user.user_id, process_year: year } },
  create: {
    user_id: user.user_id,
    process_year: year,
    qualitative_activities: sampleActivities as unknown as Prisma.InputJsonValue,
  },
  update: {
    qualitative_activities: sampleActivities as unknown as Prisma.InputJsonValue,
  },
});

console.log(`✅ ${user.name} (${email}) — process_year=${year} MenteeRecord 에 샘플 활동 ${sampleActivities.length}개 시드 완료.`);
await prisma.$disconnect();
