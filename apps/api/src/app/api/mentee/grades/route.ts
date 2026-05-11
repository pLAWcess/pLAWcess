import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getTokenFromCookie } from "@/lib/auth";

const ID_PATTERN = /^[A-Za-z0-9._@-]{1,32}$/;
const PW_MAX_LEN = 128;
const RATE_LIMIT_WINDOW_MS = 60_000;

const lastCallByUser = new Map<string, number>();

function validateCredentials(id: unknown, pw: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof id !== "string" || typeof pw !== "string") {
    return { ok: false, error: "ID와 비밀번호를 입력해주세요." };
  }
  if (!ID_PATTERN.test(id)) {
    return { ok: false, error: "ID 형식이 올바르지 않습니다." };
  }
  if (pw.length < 1 || pw.length > PW_MAX_LEN) {
    return { ok: false, error: "비밀번호 길이가 올바르지 않습니다." };
  }
  // 제어문자 차단
  if (/[\x00-\x1f]/.test(pw)) {
    return { ok: false, error: "비밀번호에 허용되지 않은 문자가 포함되어 있습니다." };
  }
  // argparse 옵션 인젝션 차단 (`--`-prefix)
  if (id.startsWith("--") || pw.startsWith("--")) {
    return { ok: false, error: "허용되지 않은 형식입니다." };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const token = getTokenFromCookie(req);
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const now = Date.now();
  const last = lastCallByUser.get(token.user_id) ?? 0;
  if (now - last < RATE_LIMIT_WINDOW_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: `잠시 후 다시 시도해주세요. (${retryAfter}초)` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  lastCallByUser.set(token.user_id, now);

  let body: { id?: unknown; pw?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const validation = validateCredentials(body.id, body.pw);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const id = body.id as string;
  const pw = body.pw as string;

  const outputFile = join(tmpdir(), `grades_${Date.now()}.csv`);
  const scriptPath = join(process.cwd(), "../../tools/scrape_grades.py");

  const rows = await new Promise<Record<string, string>[] | null>((resolve) => {
    const proc = spawn("python3", [scriptPath, outputFile, "--id", id, "--pw", pw]);

    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      if (code !== 0 || !existsSync(outputFile)) {
        console.error("scrape_grades stderr:", stderr);
        resolve(null);
        return;
      }
      try {
        const csv = readFileSync(outputFile, "utf-8");
        unlinkSync(outputFile);
        resolve(parseCSV(csv));
      } catch {
        resolve(null);
      }
    });
  });

  if (!rows) {
    return NextResponse.json(
      { error: "로그인에 실패했거나 성적을 불러올 수 없습니다." },
      { status: 401 },
    );
  }

  return NextResponse.json({ rows });
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? "").trim()]));
  });
}
