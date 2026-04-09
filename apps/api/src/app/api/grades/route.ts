import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const { id, pw } = await req.json();

  if (!id || !pw) {
    return NextResponse.json({ error: 'ID와 비밀번호를 입력해주세요.' }, { status: 400, headers: CORS });
  }

  const outputFile = join(tmpdir(), `grades_${Date.now()}.csv`);
  const scriptPath = join(process.cwd(), '../../tools/scrape_grades.py');

  type ScraperResult = { rows: Record<string, string>[] } | { error: string; status: number };

  const result = await new Promise<ScraperResult>((resolve) => {
    const proc = spawn('python3', [scriptPath, outputFile, '--id', id, '--pw', pw]);

    let stderr = '';
    let stdout = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });

    proc.on('close', (code) => {
      const combined = stdout + stderr;
      console.error('scrape_grades output:', combined);

      if (!existsSync(outputFile)) {
        // 원인 판별
        if (combined.includes('포털 로그인 실패') || combined.includes('LoginDeny')) {
          resolve({ error: 'ID 또는 비밀번호가 올바르지 않습니다.', status: 401 });
        } else if (combined.includes('python3') && code === null) {
          resolve({ error: 'python3가 설치되어 있지 않습니다.', status: 500 });
        } else if (combined.includes('playwright') || combined.includes('ModuleNotFoundError')) {
          resolve({ error: '서버에 필요한 라이브러리가 설치되어 있지 않습니다. (playwright / beautifulsoup4)', status: 500 });
        } else if (combined.includes('성적 테이블을 찾지 못')) {
          resolve({ error: '성적 테이블을 찾지 못했습니다. 잠시 후 다시 시도해주세요.', status: 502 });
        } else if (code !== 0) {
          resolve({ error: `스크래핑 실패 (종료코드 ${code}). 서버 로그를 확인하세요.`, status: 500 });
        } else {
          resolve({ error: '성적을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.', status: 502 });
        }
        return;
      }

      try {
        const csv = readFileSync(outputFile, 'utf-8');
        unlinkSync(outputFile);
        resolve({ rows: parseCSV(csv) });
      } catch {
        resolve({ error: 'CSV 파일 읽기 실패', status: 500 });
      }
    });

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        resolve({ error: 'python3를 찾을 수 없습니다. 서버에 Python 3이 설치되어 있는지 확인하세요.', status: 500 });
      } else {
        resolve({ error: `프로세스 실행 오류: ${err.message}`, status: 500 });
      }
    });
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers: CORS });
  }
  const { rows } = result;

  return NextResponse.json({ rows }, { headers: CORS });
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r/g, '').split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]));
  });
}
