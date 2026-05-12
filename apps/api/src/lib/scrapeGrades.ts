import { chromium as playwrightChromium } from 'playwright-core';
import type { Page, Frame } from 'playwright-core';

const PORTAL_URL = 'https://portal.korea.ac.kr';
const INFODEPOT_BASE = 'https://infodepot.korea.ac.kr';
const INFODEPOT_GRADE_PATH = '/grade/SearchGradeAll.jsp';
const REAL_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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
        if (tds.length < Math.floor(headers.length / 2)) continue;
        const texts = tds.map(c => norm(c.textContent));
        if (codeIdx >= 0 && !texts[codeIdx]) continue;
        const obj: GradeRow = {};
        headers.forEach((h, i) => { obj[h] = texts[i] ?? ''; });
        rows.push(obj);
      }
    }
  }

  const summary: Record<string, string> = {};
  const KEYWORDS = ['평점', '학점', '백분율', '증명', '평균', '취득', '신청'];
  for (const table of tables) {
    for (const tr of Array.from(table.querySelectorAll('tr'))) {
      const cells = Array.from(tr.querySelectorAll('th, td')).map(c => norm(c.textContent));
      for (let i = 0; i < cells.length - 1; i++) {
        const label = cells[i];
        const next = cells[i + 1];
        if (!label || !next) continue;
        if (KEYWORDS.some(k => label.includes(k)) && /^[\d.]+$/.test(next)) summary[label] = next;
      }
    }
  }
  const bodyText = norm(document.body?.textContent);
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

  return { rows, summary };
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

async function bodySnippet(target: Page | Frame, max = 1500): Promise<string> {
  try {
    const t: string = await target.evaluate(() => document.body?.innerText ?? '');
    return t.replace(/\s+/g, ' ').trim().slice(0, max);
  } catch (e) {
    return `[snippet error: ${e}]`;
  }
}

export async function scrapeGrades(id: string, pw: string): Promise<ScrapeResult | null> {
  const browser = await getBrowser();
  const diag: string[] = [];
  try {
    const context = await browser.newContext({ userAgent: REAL_UA, locale: 'ko-KR' });
    const page = await context.newPage();

    // 1. 포털 로그인
    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
    diag.push(`[1] portal: ${page.url()}`);
    await page.fill('#oneid', id);
    await page.fill('#_pw', pw);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {}),
      page.click('#loginsubmit'),
    ]);
    await page.waitForTimeout(2000);
    diag.push(`[2] after login: ${page.url()}`);
    diag.push(`[2-text] ${await bodySnippet(page, 500)}`);
    if (page.url().includes('LoginDeny')) {
      console.log('[scrapeGrades]', diag.join('\n'));
      return null;
    }

    // 2. moveComponent로 infodepot SSO 세션 수립
    try {
      await page.evaluate(
        `moveComponent('${INFODEPOT_BASE}', '3', '${INFODEPOT_GRADE_PATH}', '84', '280', 'S')`
      );
      diag.push('[3] moveComponent ok');
    } catch (e) {
      diag.push(`[3] moveComponent failed: ${e}`);
    }
    await page.waitForTimeout(2500);

    // 3. 새 탭으로 성적 페이지 접근
    const gradePage = await context.newPage();
    try {
      await gradePage.goto(`${INFODEPOT_BASE}${INFODEPOT_GRADE_PATH}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      diag.push(`[4] grade goto failed: ${e}`);
    }
    await gradePage.waitForTimeout(1500);
    diag.push(`[4] grade page: ${gradePage.url()}`);
    try { await gradePage.waitForSelector('table', { timeout: 8000 }); diag.push('[4] table appeared'); }
    catch { diag.push('[4] no table within 8s'); }
    diag.push(`[4-frames] ${gradePage.frames().map(f => f.url()).join(' | ')}`);
    diag.push(`[4-text] ${await bodySnippet(gradePage, 1800)}`);

    // 4. 메인 프레임 + iframe 전부 시도해서 가장 많은 데이터 가진 것 선택
    let best: ScrapeResult | null = null;
    const candidates: (Page | Frame)[] = [gradePage, ...gradePage.frames().filter(f => f !== gradePage.mainFrame())];
    for (const c of candidates) {
      const r = await tryExtract(c);
      diag.push(`[5] candidate (${'url' in c ? c.url() : '?'}) → rows=${r?.rows.length ?? 0}, summaryKeys=${r ? Object.keys(r.summary).length : 0}`);
      if (r && (!best || r.rows.length > best.rows.length || Object.keys(r.summary).length > Object.keys(best.summary).length)) {
        best = r;
      }
    }

    const debugText = diag.join('\n');
    console.log('[scrapeGrades]', debugText);
    return best ? { ...best, debugText } : { rows: [], summary: {}, debugText };
  } catch (e) {
    diag.push(`[ERR] ${e}`);
    const debugText = diag.join('\n');
    console.log('[scrapeGrades]', debugText);
    return { rows: [], summary: {}, debugText };
  } finally {
    await browser.close();
  }
}
