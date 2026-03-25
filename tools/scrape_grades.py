"""
고려대 InfoDepot 성적확정자료 크롤러
포털 SSO 로그인 후 성적 테이블을 CSV로 저장한다.

사용법:
    python3 scrape_grades.py [출력파일.csv] [--id 아이디] [--pw 비밀번호]

    # .env 기본값 사용
    python3 scrape_grades.py

    # 파일명 지정
    python3 scrape_grades.py 친구성적.csv

    # 다른 계정으로 저장
    python3 scrape_grades.py 친구성적.csv --id friend123 --pw pass456
"""

import argparse
import csv
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

# CLI 인자 파싱 (--id / --pw 가 없으면 .env 값 사용)
_parser = argparse.ArgumentParser(add_help=False)
_parser.add_argument("output", nargs="?", default=None)
_parser.add_argument("--id", dest="portal_id", default=None)
_parser.add_argument("--pw", dest="portal_pw", default=None)
_args, _ = _parser.parse_known_args()

PORTAL_ID = _args.portal_id or os.getenv("KU_PORTAL_ID", "")
PORTAL_PW = _args.portal_pw or os.getenv("KU_PORTAL_PW", "")

PORTAL_URL = "https://portal.korea.ac.kr"
INFODEPOT_BASE = "https://infodepot.korea.ac.kr"
INFODEPOT_GRADE_PATH = "/grade/SearchGradeAll.jsp"  # 전체성적조회 (compId=84, menuCd=280)
INFODEPOT_GRADE_URL = f"{INFODEPOT_BASE}{INFODEPOT_GRADE_PATH}"

COLUMNS = [
    "년도", "학기", "학수번호", "과목명", "이수구분",
    "교양영역", "과목유형", "학점", "점수", "등급",
    "평점", "재수강년도", "재수강학기", "재수강과목", "삭제구분",
]


def login_portal(page) -> bool:
    """포털 로그인. 성공 여부 반환."""
    page.goto(PORTAL_URL, wait_until="networkidle", timeout=20000)
    page.fill("#oneid", PORTAL_ID)
    page.fill("#_pw", PORTAL_PW)
    with page.expect_navigation(wait_until="networkidle", timeout=20000):
        page.click("#loginsubmit")

    if "LoginDeny" in page.url:
        print("포털 로그인 실패 — ID/PW를 확인하세요")
        return False
    print(f"포털 로그인 성공 ({page.url})")
    return True


def fetch_grade_rows(page, context) -> list[dict]:
    """infodepot SSO 세션 수립 후 성적 페이지에서 행 데이터를 추출한다.
    monitor_grw.py 의 moveComponent 패턴 그대로 사용."""

    # 1. moveComponent로 infodepot SSO 세션 수립 (grw 패턴과 동일)
    print("infodepot SSO 세션 수립 중...")
    try:
        page.evaluate(
            "moveComponent("
            f"'{INFODEPOT_BASE}', '3', "
            f"'{INFODEPOT_GRADE_PATH}', '84', '280', 'S'"
            ")"
        )
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f"moveComponent 실패 (무시하고 계속): {e}")

    # 2. 같은 context의 새 탭으로 infodepot 직접 접근
    infodepot_page = context.new_page()
    print(f"infodepot 페이지 로딩: {INFODEPOT_GRADE_URL}")
    infodepot_page.goto(INFODEPOT_GRADE_URL, wait_until="networkidle", timeout=30000)
    print(f"현재 URL: {infodepot_page.url}")

    # 3. 메인 프레임에서 추출 시도
    rows = _extract_from_page(infodepot_page)
    if rows:
        return rows

    # 4. iframe 안 탐색 (portal_layout이 iframe 구조일 때)
    for frame in infodepot_page.frames:
        if frame == infodepot_page.main_frame:
            continue
        print(f"  iframe 탐색: {frame.url}")
        frame_rows = _extract_from_frame(frame)
        if frame_rows:
            print(f"  → {len(frame_rows)}행 발견")
            return frame_rows

    print("성적 테이블을 찾지 못했습니다.")
    return []


def _extract_from_page(page) -> list[dict]:
    try:
        page.wait_for_selector("table", timeout=8000)
    except Exception:
        return []
    html = page.content()
    return _parse_grade_table(html)


def _extract_from_frame(frame) -> list[dict]:
    try:
        html = frame.content()
        return _parse_grade_table(html)
    except Exception:
        return []


def _parse_grade_table(html: str) -> list[dict]:
    """HTML에서 성적 테이블 행을 파싱한다."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")

    # 헤더로 성적 테이블 찾기
    target_table = None
    for table in soup.find_all("table"):
        header_text = table.get_text()
        if "학수번호" in header_text and "과목명" in header_text and "학점" in header_text:
            target_table = table
            break

    if not target_table:
        return []

    rows = []
    # 헤더 행 스킵 (th 또는 첫 tr)
    data_rows = target_table.find_all("tr")
    for tr in data_rows:
        cells = tr.find_all(["td", "th"])
        # th만 있는 헤더 행 스킵
        if all(c.name == "th" for c in cells):
            continue
        texts = [c.get_text(separator=" ", strip=True) for c in cells]
        if not any(texts):
            continue
        # 열 수 맞추기 (부족하면 빈 문자열로 채움)
        while len(texts) < len(COLUMNS):
            texts.append("")
        row = dict(zip(COLUMNS, texts[: len(COLUMNS)]))
        # 최소 데이터 검증: 학수번호가 비어있으면 스킵 (헤더 또는 빈 행)
        if not row.get("학수번호") and not row.get("과목명"):
            continue
        rows.append(row)

    return rows


def save_csv(rows: list[dict], output_path: Path) -> None:
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"저장 완료: {output_path} ({len(rows)}행)")


def main() -> None:
    if not PORTAL_ID or not PORTAL_PW:
        print("오류: .env에 KU_PORTAL_ID / KU_PORTAL_PW 설정이 필요합니다.")
        sys.exit(1)

    output_file = Path(
        _args.output if _args.output
        else f"grades_{datetime.now().strftime('%Y%m%d')}.csv"
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            if not login_portal(page):
                sys.exit(1)

            rows = fetch_grade_rows(page, context)

            if not rows:
                print(
                    "\n[힌트] 자동 파싱 실패 시 headless=False로 변경해 직접 확인하세요.\n"
                    "       scrape_grades.py 상단의 headless=True → headless=False"
                )
                sys.exit(1)

            save_csv(rows, output_file)

        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    main()
