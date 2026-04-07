-- AlterTable: mentee_records에 정량 상세 필드 추가
ALTER TABLE "mentee_records"
  ADD COLUMN "gpa_major"                 DECIMAL(3,2),
  ADD COLUMN "gpa_converted"             DECIMAL(5,2),
  ADD COLUMN "leet_verbal_raw"           INTEGER,
  ADD COLUMN "leet_verbal_standard"      INTEGER,
  ADD COLUMN "leet_verbal_percentile"    DECIMAL(5,2),
  ADD COLUMN "leet_reasoning_raw"        INTEGER,
  ADD COLUMN "leet_reasoning_standard"   INTEGER,
  ADD COLUMN "leet_reasoning_percentile" DECIMAL(5,2),
  ADD COLUMN "toeic_score"               INTEGER,
  ADD COLUMN "toefl_score"               INTEGER,
  ADD COLUMN "teps_score"                INTEGER;
