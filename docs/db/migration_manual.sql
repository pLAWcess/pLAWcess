-- ================================================================
-- pLAWcess — migration.sql 수동 추가 SQL
-- ================================================================
-- 사용 방법:
--   npx prisma migrate dev --name init 실행 후
--   생성된 prisma/migrations/XXXXXX_init/migration.sql 파일
--   맨 아래에 아래 내용을 붙여넣으세요.
--   이후 prisma migrate deploy 시 자동으로 함께 실행됩니다.
-- ================================================================


-- [1] applications
--     role에 따라 올바른 record_id 컬럼만 채워지도록 강제
--     mentee 신청 → mentee_record_id NOT NULL, mentor_record_id NULL
--     mentor 신청 → mentor_record_id NOT NULL, mentee_record_id NULL
ALTER TABLE applications
  ADD CONSTRAINT check_record_by_role CHECK (
    (role = 'mentee' AND mentee_record_id IS NOT NULL AND mentor_record_id IS NULL)
    OR
    (role = 'mentor' AND mentor_record_id IS NOT NULL AND mentee_record_id IS NULL)
  );


-- [2] match_results
--     취소(cancelled)된 매칭을 제외하고,
--     같은 멘티 신청 건에 대해 활성 매칭이 하나만 존재하도록 강제
--     (Partial Unique Index — PostgreSQL 전용)
CREATE UNIQUE INDEX uq_active_mentee_match
  ON match_results (mentee_application_id)
  WHERE match_status != 'cancelled';
