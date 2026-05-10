-- 가/나 1지망 컬럼 → 접미어 제거 (1지망 데이터 보존)
ALTER TABLE "mentee_records" RENAME COLUMN "target_school_ga_first" TO "target_school_ga";
ALTER TABLE "mentee_records" RENAME COLUMN "is_special_ga_first"    TO "is_special_ga";
ALTER TABLE "mentee_records" RENAME COLUMN "target_school_na_first" TO "target_school_na";
ALTER TABLE "mentee_records" RENAME COLUMN "is_special_na_first"    TO "is_special_na";

-- 가/나 2지망 컬럼 영구 제거 (데이터 손실 의도적)
ALTER TABLE "mentee_records" DROP COLUMN "target_school_ga_second";
ALTER TABLE "mentee_records" DROP COLUMN "is_special_ga_second";
ALTER TABLE "mentee_records" DROP COLUMN "target_school_na_second";
ALTER TABLE "mentee_records" DROP COLUMN "is_special_na_second";
