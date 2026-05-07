-- Backfill #131: 기존 사용자 military_status NULL → not_applicable
--   가입 시 기본값 정책에 맞춰 기존 데이터도 일관되게 정리
UPDATE "users"
  SET "military_status" = 'not_applicable'
  WHERE "military_status" IS NULL;
