-- ============================================================
-- 멘토 대시보드 상태 전환용 토글 SQL
-- 한 줄씩 실행하고 브라우저 새로고침으로 확인
-- ============================================================

-- ① active (운영 중) — 멘토링 운영 중 + 매칭 멘티 2명 + 사이클 일정 카드
UPDATE cycle_schedules
SET is_active = TRUE,
    match_announce_date = CURRENT_DATE - INTERVAL '1 day',
    updated_at = NOW()
WHERE process_year = 2026;

-- ② waiting (매칭 대기) — 매칭 대기 중 메시지 + 사이클 일정 카드 (멘티 섹션 없음)
UPDATE cycle_schedules
SET is_active = TRUE,
    match_announce_date = CURRENT_DATE + INTERVAL '30 days',
    updated_at = NOW()
WHERE process_year = 2026;

-- ③ inactive (비운영) — 비운영 메시지만 표시 (멘티/일정 모두 숨김)
UPDATE cycle_schedules
SET is_active = FALSE,
    updated_at = NOW()
WHERE process_year = 2026;
