import { chromium as playwrightChromium } from 'playwright-core';

const PORTAL_URL = 'https://portal.korea.ac.kr';
const INFODEPOT_BASE = 'https://infodepot.korea.ac.kr';
const INFODEPOT_GRADE_PATH = '/grade/SearchGradeAll.jsp';

export type GradeRow = Record<string, string>;

const COLUMNS = ['년도', '학기', '학수번호', '과목명', '이수구분', '교양영역', '과목유형', '학점', '점수', '등급', '평점', '재수강년도', '재수강학기', '재수강과목', '삭제구분'];

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
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  // 로컬 개발: 시스템 Chrome 사용
  const { existsSync } = await import('fs');
  const executablePath = LOCAL_CHROME_PATHS.find(p => existsSync(p));
  return playwrightChromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}

function parseGradeTable(html: string): GradeRow[] {
  // 간단한 HTML 테이블 파서 (cheerio 없이)
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  for (const tableHtml of tableMatch) {
    if (!tableHtml.includes('학수번호') || !tableHtml.includes('과목명') || !tableHtml.includes('학점')) continue;

    const rows: GradeRow[] = [];
    const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    for (const tr of trMatches) {
      // th만 있는 헤더 행 스킵
      if (/<th/i.test(tr) && !/<td/i.test(tr)) continue;
      const cellMatches = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) ?? [];
      const texts = cellMatches.map(cell =>
        cell.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
      );
      if (texts.length === 0 || texts.every(t => !t)) continue;
      while (texts.length < COLUMNS.length) texts.push('');
      const row = Object.fromEntries(COLUMNS.map((col, i) => [col, texts[i] ?? '']));
      if (!row['학수번호'] && !row['과목명']) continue;
      rows.push(row);
    }
    if (rows.length > 0) return rows;
  }
  return [];
}

export async function scrapeGrades(id: string, pw: string): Promise<GradeRow[] | null> {
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
    } catch {
      // moveComponent 없어도 계속 시도
    }

    // 3. 새 탭으로 성적 페이지 접근
    const gradePage = await context.newPage();
    await gradePage.goto(`${INFODEPOT_BASE}${INFODEPOT_GRADE_PATH}`, { waitUntil: 'networkidle', timeout: 30000 });

    // 4. 메인 페이지에서 파싱 시도
    let rows = parseGradeTable(await gradePage.content());
    if (rows.length > 0) return rows;

    // 5. iframe 탐색
    for (const frame of gradePage.frames()) {
      if (frame === gradePage.mainFrame()) continue;
      try {
        rows = parseGradeTable(await frame.content());
        if (rows.length > 0) return rows;
      } catch { /* 접근 불가 iframe 무시 */ }
    }

    return [];
  } finally {
    await browser.close();
  }
}
