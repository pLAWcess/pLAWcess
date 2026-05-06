-- CreateTable: cycle_schedules — #104 사업 스케줄
CREATE TABLE "cycle_schedules" (
    "process_year" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "mentor_recruit_start" DATE,
    "mentor_recruit_end" DATE,
    "mentee_apply_start" DATE,
    "mentee_apply_end" DATE,
    "matching_start" DATE,
    "matching_end" DATE,
    "match_announce_date" DATE,
    "admission_result_start" DATE,
    "admission_result_end" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_schedules_pkey" PRIMARY KEY ("process_year")
);
