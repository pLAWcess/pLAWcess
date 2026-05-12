-- 멘토도 멘티처럼 활동별 정성 분석(STAR)을 저장할 수 있도록 mentor_records 에
-- 정성·AI 필드를 추가한다. MenteeRecord 의 정성·AI 블록과 동일한 구조.
-- (personal_statement_summary / strengths_weaknesses / career_goal / is_special_admission /
--  leet_* / gpa / law_class_* 는 기존 컬럼 그대로 유지 — 스키마 파일의 필드 순서만 정리됨.)

ALTER TABLE "mentor_records" ADD COLUMN "qualitative_activities" JSONB;
ALTER TABLE "mentor_records" ADD COLUMN "core_keywords" VARCHAR(500);

ALTER TABLE "mentor_records" ADD COLUMN "star_analysis" JSONB;
ALTER TABLE "mentor_records" ADD COLUMN "ai_story_outline" JSONB;
ALTER TABLE "mentor_records" ADD COLUMN "ai_keywords" JSONB;
ALTER TABLE "mentor_records" ADD COLUMN "is_ai_analyzed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "mentor_records" ADD COLUMN "ai_analyzed_at" TIMESTAMP(3);
ALTER TABLE "mentor_records" ADD COLUMN "ai_summary_hash" VARCHAR(64);
ALTER TABLE "mentor_records" ADD COLUMN "star_input_hashes" JSONB;
