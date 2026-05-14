-- 합격 아카이브 2전공 컬럼 추가 (#261)
-- 카드에서 "{1전공} · {2전공}" 형태로 멘토 학부 전공을 함께 보여주기 위함.

ALTER TABLE "archive_cases" ADD COLUMN "second_major" VARCHAR(100);
