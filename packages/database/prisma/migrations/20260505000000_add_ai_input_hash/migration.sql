-- AlterTable: mentee_records — 정성 분석 입력 해시 (동일 입력 재분석 차단)
ALTER TABLE "mentee_records"
  ADD COLUMN "ai_input_hash" VARCHAR(64);
