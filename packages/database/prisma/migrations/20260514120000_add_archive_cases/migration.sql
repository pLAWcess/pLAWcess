-- 합격 아카이브 (#261)
-- 멘토가 본인의 합격 케이스를 후배에게 익명으로 공유하는 카드.
-- 한 멘토가 가/나군 모두 등록 가능하므로 (user, year, school) unique.

-- CreateTable
CREATE TABLE "archive_cases" (
    "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
    "user_id"         UUID         NOT NULL,
    "process_year"    INTEGER      NOT NULL,
    "major"           VARCHAR(100),
    "admitted_school" VARCHAR(100) NOT NULL,
    "leet_score"      DECIMAL(5,2),
    "gpa"             DECIMAL(3,2),
    "keywords"        JSONB,
    "story_summary"   TEXT,
    "mentor_message"  TEXT,
    "is_published"    BOOLEAN      NOT NULL DEFAULT false,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archive_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "archive_cases_user_id_process_year_admitted_school_key"
    ON "archive_cases"("user_id", "process_year", "admitted_school");

-- CreateIndex
CREATE INDEX "archive_cases_is_published_process_year_idx"
    ON "archive_cases"("is_published", "process_year");

-- AddForeignKey
ALTER TABLE "archive_cases"
    ADD CONSTRAINT "archive_cases_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
