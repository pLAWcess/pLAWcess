-- ============================================================
-- 멘토 프로세스 대시보드 (#232) 테스트 시드
-- ============================================================
-- 시나리오:
--   - 활성 사이클 2026 (match_announce_date 어제 → status = active)
--   - 과거 사이클 2025 (비활성, 이전 참여 이력용)
--   - 멘토 1명 (login_id: test.mentor / password: test1234)
--   - 2026 매칭 멘티 2명 (대시보드 "매칭 멘티" 섹션)
--   - 2025 매칭 멘티 2명 (대시보드 "이전 참여 이력" 섹션)
--
-- 모두 ON CONFLICT 로 idempotent — 반복 실행 가능.
-- Prisma @updatedAt 은 ORM 레벨이라 raw SQL 에서는 NOW() 명시 필요.
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. CycleSchedule
-- ----------------------------------------------------------------
INSERT INTO cycle_schedules (
  process_year, is_active, is_schedule_visible,
  match_announce_date,
  created_at, updated_at
) VALUES
  (2026, TRUE,  TRUE, CURRENT_DATE - INTERVAL '1 day', NOW(), NOW()),
  (2025, FALSE, TRUE, DATE '2025-09-01',               NOW(), NOW())
ON CONFLICT (process_year) DO UPDATE SET
  is_active           = EXCLUDED.is_active,
  is_schedule_visible = EXCLUDED.is_schedule_visible,
  match_announce_date = EXCLUDED.match_announce_date,
  updated_at          = NOW();

-- ----------------------------------------------------------------
-- 2. Users
-- ----------------------------------------------------------------
-- 비밀번호 hash 는 모두 "test1234" (bcrypt cost 12)
INSERT INTO users (
  user_id, login_id, name, email, phone, password_hash,
  account_status, "current_role", is_deleted,
  created_at, updated_at
) VALUES
  -- 멘토
  ('11111111-1111-1111-1111-111111111111', 'test.mentor',  '테스트멘토',   'mentor@test.local', '010-0000-0001',
   '$2b$12$QbLU3aTQcTKKi0fqCrA6LOOry5VD4zoHH.5Me6Ys.Jmnj0vCc0kqm',
   'active', 'mentor', FALSE, NOW(), NOW()),
  -- 2026 매칭 멘티
  ('22222222-2222-2222-2222-222222222222', 'test.mentee.1', '김자전', 'mentee1@test.local', '010-1111-1111',
   '$2b$12$QbLU3aTQcTKKi0fqCrA6LOOry5VD4zoHH.5Me6Ys.Jmnj0vCc0kqm',
   'active', 'mentee', FALSE, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'test.mentee.2', '이지원', 'mentee2@test.local', '010-2222-2222',
   '$2b$12$QbLU3aTQcTKKi0fqCrA6LOOry5VD4zoHH.5Me6Ys.Jmnj0vCc0kqm',
   'active', 'mentee', FALSE, NOW(), NOW()),
  -- 2025 과거 매칭 멘티
  ('44444444-4444-4444-4444-444444444444', 'test.mentee.3', '박합격', 'mentee3@test.local', '010-3333-3333',
   '$2b$12$QbLU3aTQcTKKi0fqCrA6LOOry5VD4zoHH.5Me6Ys.Jmnj0vCc0kqm',
   'active', 'mentee', FALSE, NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'test.mentee.4', '최재학', 'mentee4@test.local', '010-4444-4444',
   '$2b$12$QbLU3aTQcTKKi0fqCrA6LOOry5VD4zoHH.5Me6Ys.Jmnj0vCc0kqm',
   'active', 'mentee', FALSE, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  login_id        = EXCLUDED.login_id,
  name            = EXCLUDED.name,
  email           = EXCLUDED.email,
  phone           = EXCLUDED.phone,
  password_hash   = EXCLUDED.password_hash,
  "current_role"  = EXCLUDED."current_role",
  is_deleted      = FALSE,
  updated_at      = NOW();

-- ----------------------------------------------------------------
-- 3. MentorRecord — 2025, 2026
-- ----------------------------------------------------------------
INSERT INTO mentor_records (
  record_id, user_id, process_year, record_status,
  lawschool_name, lawschool_grade,
  created_at, updated_at
) VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 2026,
   'submitted', '고려대학교 법학전문대학원', 17, NOW(), NOW()),
  ('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 2025,
   'submitted', '고려대학교 법학전문대학원', 16, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year')
ON CONFLICT (user_id, process_year) DO UPDATE SET
  record_status   = EXCLUDED.record_status,
  lawschool_name  = EXCLUDED.lawschool_name,
  lawschool_grade = EXCLUDED.lawschool_grade,
  updated_at      = NOW();

-- ----------------------------------------------------------------
-- 4. MenteeRecord — 2026 (현재 매칭), 2025 (과거 이력)
-- ----------------------------------------------------------------
INSERT INTO mentee_records (
  record_id, user_id, process_year, record_status,
  target_school_ga, is_special_ga,
  target_school_na, is_special_na,
  created_at, updated_at
) VALUES
  -- 2026 현재
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 2026,
   'submitted', '고려대학교', FALSE, '연세대학교', FALSE, NOW(), NOW()),
  ('b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 2026,
   'submitted', '서울대학교', TRUE,  NULL,           FALSE, NOW(), NOW()),
  -- 2025 과거
  ('b4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 2025,
   'submitted', '고려대학교', FALSE, '연세대학교',   TRUE,
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
  ('b5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 2025,
   'submitted', '한양대학교', FALSE, '이화여자대학교', FALSE,
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year')
ON CONFLICT (user_id, process_year) DO UPDATE SET
  record_status    = EXCLUDED.record_status,
  target_school_ga = EXCLUDED.target_school_ga,
  is_special_ga    = EXCLUDED.is_special_ga,
  target_school_na = EXCLUDED.target_school_na,
  is_special_na    = EXCLUDED.is_special_na,
  updated_at       = NOW();

-- ----------------------------------------------------------------
-- 5. Application — 멘토 2개 (2025/2026), 멘티 4개
-- ----------------------------------------------------------------
INSERT INTO applications (
  application_id, user_id, process_year, role, application_status,
  mentee_record_id, mentor_record_id, submitted_at, approved_at,
  created_at, updated_at
) VALUES
  -- 멘토 본인 applications
  ('c1111111-1111-1111-1111-111111111126', '11111111-1111-1111-1111-111111111111', 2026,
   'mentor', 'approved', NULL, 'a1111111-1111-1111-1111-111111111111',
   NOW(), NOW(), NOW(), NOW()),
  ('c1111111-1111-1111-1111-111111111125', '11111111-1111-1111-1111-111111111111', 2025,
   'mentor', 'approved', NULL, 'a1111111-1111-1111-1111-111111111112',
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year',
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
  -- 2026 멘티 applications
  ('c2222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222222', 2026,
   'mentee', 'approved', 'b2222222-2222-2222-2222-222222222222', NULL,
   NOW(), NOW(), NOW(), NOW()),
  ('c3333333-3333-3333-3333-333333333326', '33333333-3333-3333-3333-333333333333', 2026,
   'mentee', 'approved', 'b3333333-3333-3333-3333-333333333333', NULL,
   NOW(), NOW(), NOW(), NOW()),
  -- 2025 멘티 applications
  ('c4444444-4444-4444-4444-444444444425', '44444444-4444-4444-4444-444444444444', 2025,
   'mentee', 'approved', 'b4444444-4444-4444-4444-444444444444', NULL,
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year',
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
  ('c5555555-5555-5555-5555-555555555525', '55555555-5555-5555-5555-555555555555', 2025,
   'mentee', 'approved', 'b5555555-5555-5555-5555-555555555555', NULL,
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year',
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year')
ON CONFLICT (user_id, process_year, role) DO UPDATE SET
  application_status = EXCLUDED.application_status,
  mentee_record_id   = EXCLUDED.mentee_record_id,
  mentor_record_id   = EXCLUDED.mentor_record_id,
  submitted_at       = EXCLUDED.submitted_at,
  approved_at        = EXCLUDED.approved_at,
  updated_at         = NOW();

-- ----------------------------------------------------------------
-- 6. MatchResult — 2026 매칭 2건, 2025 매칭 2건 (모두 finalized)
-- ----------------------------------------------------------------
-- 멱등 보장을 위해 테스트 멘토의 모든 매칭을 먼저 삭제 후 재삽입
DELETE FROM match_results
WHERE mentor_application_id IN (
  'c1111111-1111-1111-1111-111111111126',
  'c1111111-1111-1111-1111-111111111125'
);

INSERT INTO match_results (
  match_id, process_year, mentee_application_id, mentor_application_id,
  match_status, is_finalized,
  created_at, updated_at
) VALUES
  -- 2026
  ('d2222222-2222-2222-2222-222222222226', 2026,
   'c2222222-2222-2222-2222-222222222226', 'c1111111-1111-1111-1111-111111111126',
   'finalized', TRUE, NOW(), NOW()),
  ('d3333333-3333-3333-3333-333333333326', 2026,
   'c3333333-3333-3333-3333-333333333326', 'c1111111-1111-1111-1111-111111111126',
   'finalized', TRUE, NOW(), NOW()),
  -- 2025
  ('d4444444-4444-4444-4444-444444444425', 2025,
   'c4444444-4444-4444-4444-444444444425', 'c1111111-1111-1111-1111-111111111125',
   'finalized', TRUE,
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
  ('d5555555-5555-5555-5555-555555555525', 2025,
   'c5555555-5555-5555-5555-555555555525', 'c1111111-1111-1111-1111-111111111125',
   'finalized', TRUE,
   NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year');

COMMIT;

-- ============================================================
-- 로그인 정보
--   login_id: test.mentor
--   password: test1234
-- ============================================================
