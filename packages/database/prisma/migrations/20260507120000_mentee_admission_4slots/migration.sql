-- AlterTable: mentee_records — #137 희망 로스쿨 4슬롯 + 슬롯별 특별전형 boolean
-- 기존 target_school_ga/na/is_special_admission 단일 슬롯 → 가/나 × 1·2지망 4슬롯 + 슬롯별 is_special

ALTER TABLE "mentee_records"
    DROP COLUMN "target_school_ga",
    DROP COLUMN "target_school_na",
    DROP COLUMN "is_special_admission",
    ADD COLUMN "target_school_ga_first" VARCHAR(100),
    ADD COLUMN "is_special_ga_first" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "target_school_ga_second" VARCHAR(100),
    ADD COLUMN "is_special_ga_second" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "target_school_na_first" VARCHAR(100),
    ADD COLUMN "is_special_na_first" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "target_school_na_second" VARCHAR(100),
    ADD COLUMN "is_special_na_second" BOOLEAN NOT NULL DEFAULT false;
