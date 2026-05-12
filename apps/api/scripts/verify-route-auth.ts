// 전 라우트 미인증 401 테스트.
//
// apps/api 에는 글로벌 미들웨어가 없으므로, /api 아래 모든 라우트는 핸들러 첫머리에서
// requireAuth / requireAdmin / 멘티·멘토 역할 가드를 호출해야 한다. 무인증 공개
// 라우트는 아래 PUBLIC_PATHS 에 명시적으로 등록한다 — "기본 막힘(deny by default)".
//
// 이 스크립트는 src/app/api 의 모든 route.ts 를 열거하고, export 된 각 HTTP 메서드에
// 대해 쿠키 없이 요청을 보내 — PUBLIC_PATHS 가 아니면 401 이어야 하고, PUBLIC_PATHS 면
// 401 이 아니어야 한다 — 를 검증한다. 하나라도 어긋나면 실패(exit 1).
//
// 실행:
//   터미널 1:  pnpm --filter api dev          # http://localhost:3001
//   터미널 2:  node --experimental-strip-types apps/api/scripts/verify-route-auth.ts
//   (대상 변경: BASE_URL=http://... node --experimental-strip-types ...)
//
// 새 라우트를 추가할 때:
//   - 인증 필요  → 핸들러에서 requireAuth/requireAdmin 등을 호출 (이 테스트가 401 확인)
//   - 무인증 공개 → 아래 PUBLIC_PATHS 에 경로 추가
import { readdir, readFile } from "node:fs/promises";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DIR = join(__dirname, "..", "src", "app", "api");
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

// 세션 쿠키가 필요 없는 공개 라우트 (정확한 경로). 동적 세그먼트를 가진 공개 라우트는
// 현재 없으므로 모두 리터럴 경로다.
const PUBLIC_PATHS = new Set<string>([
  "/api/health",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/find-id",
  "/api/auth/reset-password",
  "/api/auth/check-login-id",
  "/api/auth/email/send-verification",
  "/api/auth/email/verify-code",
]);

const HTTP_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

// 동적 세그먼트([id], [...slug])를 더미값으로 치환 — 가드가 param 파싱 전에 401 을
// 반환하므로 더미값으로 충분하다.
function toUrlPath(routeFileAbs: string): string {
  const rel = relative(API_DIR, dirname(routeFileAbs)).split(sep).join("/");
  const segments = rel.length === 0 ? [] : rel.split("/");
  const subst = segments.map((s) =>
    /^\[\.\.\..+\]$/.test(s) ? "__test__/__test__" : /^\[.+\]$/.test(s) ? "__test__" : s,
  );
  return "/api" + (subst.length ? "/" + subst.join("/") : "");
}

function exportedMethods(src: string): HttpMethod[] {
  const found = new Set<HttpMethod>();
  for (const m of HTTP_METHODS) {
    const fnRe = new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`);
    const constRe = new RegExp(`export\\s+const\\s+${m}\\s*[:=]`);
    if (fnRe.test(src) || constRe.test(src)) found.add(m);
  }
  return [...found];
}

async function findRouteFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findRouteFiles(full)));
    else if (e.name === "route.ts" || e.name === "route.tsx") out.push(full);
  }
  return out;
}

type Check = { path: string; method: HttpMethod; isPublic: boolean };

async function main() {
  const routeFiles = (await findRouteFiles(API_DIR)).sort();
  if (routeFiles.length === 0) {
    console.error(`route.ts 를 찾지 못했습니다: ${API_DIR}`);
    process.exit(1);
  }

  const checks: Check[] = [];
  const seenPaths = new Set<string>();
  for (const f of routeFiles) {
    const path = toUrlPath(f);
    seenPaths.add(path);
    const methods = exportedMethods(await readFile(f, "utf8"));
    if (methods.length === 0) {
      console.warn(`경고: export 된 HTTP 메서드를 찾지 못함 — ${relative(API_DIR, f)}`);
      continue;
    }
    for (const method of methods) checks.push({ path, method, isPublic: PUBLIC_PATHS.has(path) });
  }

  // PUBLIC_PATHS 일관성 — stale 항목 검출
  let staleFail = false;
  for (const p of PUBLIC_PATHS) {
    if (!seenPaths.has(p)) {
      console.error(`FAIL  PUBLIC_PATHS 에 있으나 대응하는 route 파일이 없음: ${p}`);
      staleFail = true;
    }
  }

  // 서버 도달 확인
  try {
    await fetch(`${BASE_URL}/api/health`, { method: "GET" });
  } catch (e) {
    console.error(`서버에 연결할 수 없습니다: ${BASE_URL} — pnpm --filter api dev 로 띄웠는지 확인하세요.`);
    console.error(String(e));
    process.exit(1);
  }

  let pass = 0;
  let fail = 0;
  for (const c of checks) {
    let status: number | string;
    try {
      const res = await fetch(`${BASE_URL}${c.path}`, { method: c.method, redirect: "manual" });
      status = res.status;
    } catch (e) {
      status = `ERR(${e instanceof Error ? e.message : String(e)})`;
    }
    const ok =
      typeof status === "number" && (c.isPublic ? status !== 401 : status === 401);
    if (ok) pass++;
    else fail++;
    const tag = c.isPublic ? "[public]" : "[guarded]";
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${c.method.padEnd(6)} ${c.path}  ${tag}  → ${status}` +
        (ok ? "" : c.isPublic ? "  (expected ≠ 401)" : "  (expected 401)"),
    );
  }

  console.log(`\n${pass} passed, ${fail} failed, ${checks.length} checks across ${routeFiles.length} route files.`);
  if (fail > 0 || staleFail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
