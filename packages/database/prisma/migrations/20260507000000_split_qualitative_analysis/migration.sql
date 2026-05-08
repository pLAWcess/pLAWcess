-- 정성 분석 분리: 단일 활동 STAR 캐시 / 통합 분석(키워드+자소서) 캐시 분리
-- ai_story_outline 은 미사용 필드라 데이터 보존 불필요

ALTER TABLE "mentee_records" DROP COLUMN "ai_story_outline";
ALTER TABLE "mentee_records" ADD COLUMN "ai_story_outline" JSONB;

ALTER TABLE "mentee_records" ADD COLUMN "ai_summary_hash" VARCHAR(64);
ALTER TABLE "mentee_records" ADD COLUMN "star_input_hashes" JSONB;

ALTER TABLE "mentee_records" DROP COLUMN "ai_input_hash";
