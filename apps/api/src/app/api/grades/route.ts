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

  const rows = await new Promise<Record<string, string>[] | null>((resolve) => {
    const proc = spawn('python3', [scriptPath, outputFile, '--id', id, '--pw', pw]);

    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0 || !existsSync(outputFile)) {
        console.error('scrape_grades stderr:', stderr);
        resolve(null);
        return;
      }
      try {
        const csv = readFileSync(outputFile, 'utf-8');
        unlinkSync(outputFile);
        resolve(parseCSV(csv));
      } catch {
        resolve(null);
      }
    });
  });

  if (!rows) {
    return NextResponse.json(
      { error: '로그인에 실패했거나 성적을 불러올 수 없습니다.' },
      { status: 401, headers: CORS },
    );
  }

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
