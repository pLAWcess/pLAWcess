-- AI 멘토-멘티 매칭 후보 (멘티당 rank=1,2,3) 저장 테이블.
-- MatchResult 는 admin 이 최종 확정한 1건 전용으로 유지하고,
-- 매번의 AI 추천 결과는 여기에 분리해 process_year row 를 통째로 갈아끼운다.

-- CreateTable
CREATE TABLE "match_suggestions" (
    "suggestion_id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
    "process_year"            INTEGER      NOT NULL,
    "mentee_application_id"   UUID         NOT NULL,
    "mentor_application_id"   UUID         NOT NULL,
    "rank"                    SMALLINT     NOT NULL,
    "ai_score"                DECIMAL(5,2) NOT NULL,
    "ai_reason"               TEXT         NOT NULL,
    "satisfies_extra_request" BOOLEAN,
    "pool_mode"               VARCHAR(40)  NOT NULL,
    "created_by"              UUID,
    "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"              TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_suggestions_pkey" PRIMARY KEY ("suggestion_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_suggestions_mentee_application_id_rank_key"
    ON "match_suggestions"("mentee_application_id", "rank");

-- CreateIndex
CREATE INDEX "match_suggestions_process_year_idx"
    ON "match_suggestions"("process_year");

-- AddForeignKey
ALTER TABLE "match_suggestions"
    ADD CONSTRAINT "match_suggestions_mentee_application_id_fkey"
    FOREIGN KEY ("mentee_application_id") REFERENCES "applications"("application_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestions"
    ADD CONSTRAINT "match_suggestions_mentor_application_id_fkey"
    FOREIGN KEY ("mentor_application_id") REFERENCES "applications"("application_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestions"
    ADD CONSTRAINT "match_suggestions_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("user_id")
    ON DELETE SET NULL ON UPDATE CASCADE;
