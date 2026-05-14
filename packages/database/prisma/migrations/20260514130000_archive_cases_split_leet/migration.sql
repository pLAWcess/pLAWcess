-- 합격 아카이브 LEET 컬럼 분리 (#261)
-- 표준점수 합계만 받던 것을 언어이해/추리논증 각각으로 분리.

ALTER TABLE "archive_cases" ADD COLUMN "leet_verbal_standard"    DECIMAL(5,2);
ALTER TABLE "archive_cases" ADD COLUMN "leet_reasoning_standard" DECIMAL(5,2);
