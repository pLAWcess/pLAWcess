import { chromium as playwrightChromium } from 'playwright-core';
import type { Page, Frame } from 'playwright-core';

const PORTAL_URL = 'https://portal.korea.ac.kr';
const INFODEPOT_BASE = 'https://infodepot.korea.ac.kr';
const INFODEPOT_GRADE_PATH = '/grade/SearchGradeAll.jsp';

export type GradeRow = Record<string, string>;
export type ScrapeResult = {
  rows: GradeRow[];
  summary: Record<string, string>;
  debugText?: string;
};

const LOCAL_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];

async function getBrowser() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const { existsSync } = await import('fs');
  const executablePath = LOCAL_CHROME_PATHS.find(p => existsSync(p));
  return playwrightChromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}

// 브라우저 컨텍스트에서 실행 — 성적 테이블 + 요약값(평점평균 등) 추출
function extractGradeData(): ScrapeResult {
  const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

  // --- 1. 성적 테이블 ---
  const tables = Array.from(document.querySelectorAll('table'));
  const gradeTable = tables.find(t =>
    (t.textContent ?? '').includes('학수번호') &&
    (t.textContent ?? '').includes('과목명') &&
    (t.textContent ?? '').includes('학점'),
  );

  const rows: GradeRow[] = [];
  if (gradeTable) {
    const allRows = Array.from(gradeTable.querySelectorAll('tr'));
    let headers: string[] = [];
    for (const row of allRows) {
      const ths = Array.from(row.querySelectorAll('th'));
      if (ths.length >= 8) { headers = ths.map(c => norm(c.textContent)); break; }
    }
    if (headers.length === 0) {
      for (const row of allRows) {
        const tds = Array.from(row.querySelectorAll('td'));
        if (tds.length >= 8) { headers = tds.map(c => norm(c.textContent)); break; }
      }
    }
    if (headers.length > 0) {
      const codeIdx = headers.findIndex(h => h.includes('학수번호'));
      for (const row of allRows) {
        const tds = Array.from(row.querySelectorAll('td'));
        if (tds.length < Math.floor(headers.length / 2)) continue; // 섹션헤더 행 스킵
        const texts = tds.map(c => norm(c.textContent));
        if (codeIdx >= 0 && !texts[codeIdx]) continue;
        const obj: GradeRow = {};
        headers.forEach((h, i) => { obj[h] = texts[i] ?? ''; });
        rows.push(obj);
      }
    }
  }

  // --- 2. 요약값: "평점/학점/백분율/증명" 라벨 + 옆 셀 숫자 ---
  const summary: Record<string, string> = {};
  const KEYWORDS = ['평점', '학점', '백분율', '증명', '평균', '취득', '신청'];
  for (const table of tables) {
    for (const tr of Array.from(table.querySelectorAll('tr'))) {
      const cells = Array.from(tr.querySelectorAll('th, td')).map(c => norm(c.textContent));
      for (let i = 0; i < cells.length - 1; i++) {
        const label = cells[i];
        const next = cells[i + 1];
        if (!label || !next) continue;
        if (KEYWORDS.some(k => label.includes(k)) && /^[\d.]+$/.test(next)) {
          summary[label] = next;
        }
      }
    }
  }
  // 본문 텍스트에서도 "라벨: 숫자" / "라벨 숫자" 패턴 추출 (테이블이 아닐 경우 대비)
  const bodyText = norm(document.body.textContent);
  const patterns = [
    /평점평균[^\d]{0,10}([\d]\.[\d]{1,3})/g,
    /백분율[^\d]{0,10}([\d]{1,3}\.[\d]{1,3})/g,
    /증명[^\d]{0,15}([\d]\.[\d]{1,3})/g,
    /전공[^\d]{0,10}평점[^\d]{0,10}([\d]\.[\d]{1,3})/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(bodyText)) !== null) {
      const key = m[0].replace(m[1], '').trim() || `pattern_${Object.keys(summary).length}`;
      if (!summary[key]) summary[key] = m[1];
    }
  }

  return { rows, summary, debugText: bodyText.slice(0, 2000) };
}

async function tryExtract(target: Page | Frame): Promise<ScrapeResult | null> {
  try {
    const result = await target.evaluate(extractGradeData);
    if (result.rows.length > 0 || Object.keys(result.summary).length > 0) return result;
    return null;
  } catch {
    return null;
  }
}

export async function scrapeGrades(id: string, pw: string): Promise<ScrapeResult | null> {
  const browser = await getBrowser();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. 포털 로그인
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await page.fill('#oneid', id);
    await page.fill('#_pw', pw);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
      page.click('#loginsubmit'),
    ]);
    if (page.url().includes('LoginDeny')) return null;

    // 2. moveComponent로 infodepot SSO 세션 수립
    try {
      await page.evaluate(
        `moveComponent('${INFODEPOT_BASE}', '3', '${INFODEPOT_GRADE_PATH}', '84', '280', 'S')`
      );
      await page.waitForTimeout(2000);
    } catch { /* 없으면 직접 접근 */ }

    // 3. 새 탭으로 성적 페이지 접근
    const gradePage = await context.newPage();
    await gradePage.goto(`${INFODEPOT_BASE}${INFODEPOT_GRADE_PATH}`, { waitUntil: 'networkidle', timeout: 30000 });
    try { await gradePage.waitForSelector('table', { timeout: 8000 }); } catch { /* 없을 수도 */ }

    // 4. 메인 프레임 + iframe 전부 시도해서 가장 많은 데이터 가진 것 선택
    let best: ScrapeResult | null = null;
    const candidates: (Page | Frame)[] = [gradePage, ...gradePage.frames().filter(f => f !== gradePage.mainFrame())];
    for (const c of candidates) {
      const r = await tryExtract(c);
      if (r && (!best || r.rows.length > best.rows.length || Object.keys(r.summary).length > Object.keys(best.summary).length)) {
        best = r;
      }
    }
    return best ?? { rows: [], summary: {} };
  } finally {
    await browser.close();
  }
}
