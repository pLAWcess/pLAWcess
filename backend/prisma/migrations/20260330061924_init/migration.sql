-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "AcademicStatus" AS ENUM ('enrolled', 'on_leave', 'graduated', 'completed', 'expelled');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'inactive', 'blocked');

-- CreateEnum
CREATE TYPE "CurrentRole" AS ENUM ('none', 'mentee', 'mentor', 'admin');

-- CreateEnum
CREATE TYPE "ApplicationRole" AS ENUM ('mentee', 'mentor');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'revision_requested');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('suggested', 'draft', 'finalized', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "birth_year" INTEGER,
    "gender" "Gender",
    "phone" VARCHAR(20),
    "email" VARCHAR(100) NOT NULL,
    "student_id" VARCHAR(20),
    "first_major" VARCHAR(100),
    "second_major" VARCHAR(100),
    "school_name" VARCHAR(100),
    "academic_status" "AcademicStatus",
    "account_status" "AccountStatus" NOT NULL DEFAULT 'active',
    "current_role" "CurrentRole" NOT NULL DEFAULT 'none',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "mentee_records" (
    "record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "process_year" INTEGER NOT NULL,
    "birth_date" DATE,
    "major" VARCHAR(100),
    "graduation_year" INTEGER,
    "university_entry_year" INTEGER,
    "first_leet_year" INTEGER,
    "has_leet_experience" BOOLEAN NOT NULL DEFAULT false,
    "leet_exam_years" JSONB,
    "has_law_class" BOOLEAN NOT NULL DEFAULT false,
    "law_class_subjects" JSONB,
    "gpa" DECIMAL(3,2),
    "leet_score" DECIMAL(5,2),
    "language_score" VARCHAR(50),
    "target_school_ga" VARCHAR(100),
    "target_school_na" VARCHAR(100),
    "is_special_admission" BOOLEAN NOT NULL DEFAULT false,
    "qualitative_activities" JSONB,
    "core_keywords" VARCHAR(500),
    "story_summary" TEXT,
    "star_analysis" JSONB,
    "ai_story_outline" TEXT,
    "ai_keywords" JSONB,
    "is_ai_analyzed" BOOLEAN NOT NULL DEFAULT false,
    "ai_analyzed_at" TIMESTAMP(3),
    "strengths_weaknesses" TEXT,
    "desired_mentor" TEXT,
    "record_status" "ApplicationStatus" NOT NULL DEFAULT 'draft',
    "current_step" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentee_records_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "mentor_records" (
    "record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "process_year" INTEGER NOT NULL,
    "current_lawschool" VARCHAR(100),
    "graduated_lawschool" VARCHAR(100),
    "leet_score" DECIMAL(5,2),
    "gpa" DECIMAL(3,2),
    "graduation_year" INTEGER,
    "leet_exam_year" INTEGER,
    "has_law_class" BOOLEAN NOT NULL DEFAULT false,
    "law_class_subjects" JSONB,
    "personal_statement_summary" TEXT,
    "strengths_weaknesses" TEXT,
    "career_goal" TEXT,
    "is_special_admission" BOOLEAN NOT NULL DEFAULT false,
    "record_status" "ApplicationStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_records_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "mentor_applied_schools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "record_id" UUID NOT NULL,
    "school_name" VARCHAR(100) NOT NULL,
    "group_type" VARCHAR(10) NOT NULL,
    "is_admitted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mentor_applied_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "record_id" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,

    CONSTRAINT "mentor_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "application_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "process_year" INTEGER NOT NULL,
    "role" "ApplicationRole" NOT NULL,
    "application_status" "ApplicationStatus" NOT NULL DEFAULT 'submitted',
    "mentee_record_id" UUID,
    "mentor_record_id" UUID,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "revision_requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("application_id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "match_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "process_year" INTEGER NOT NULL,
    "mentee_application_id" UUID NOT NULL,
    "mentor_application_id" UUID NOT NULL,
    "ai_score" DECIMAL(5,2),
    "ai_reason" TEXT,
    "match_status" "MatchStatus" NOT NULL DEFAULT 'suggested',
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "admin_memos" (
    "memo_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "memo_content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_memos_pkey" PRIMARY KEY ("memo_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mentee_records_user_id_process_year_key" ON "mentee_records"("user_id", "process_year");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_records_user_id_process_year_key" ON "mentor_records"("user_id", "process_year");

-- CreateIndex
CREATE UNIQUE INDEX "applications_mentee_record_id_key" ON "applications"("mentee_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_mentor_record_id_key" ON "applications"("mentor_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_process_year_role_key" ON "applications"("user_id", "process_year", "role");

-- AddForeignKey
ALTER TABLE "mentee_records" ADD CONSTRAINT "mentee_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_records" ADD CONSTRAINT "mentor_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_applied_schools" ADD CONSTRAINT "mentor_applied_schools_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "mentor_records"("record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_fields" ADD CONSTRAINT "mentor_fields_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "mentor_records"("record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_mentee_record_id_fkey" FOREIGN KEY ("mentee_record_id") REFERENCES "mentee_records"("record_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_mentor_record_id_fkey" FOREIGN KEY ("mentor_record_id") REFERENCES "mentor_records"("record_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_mentee_application_id_fkey" FOREIGN KEY ("mentee_application_id") REFERENCES "applications"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_mentor_application_id_fkey" FOREIGN KEY ("mentor_application_id") REFERENCES "applications"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_memos" ADD CONSTRAINT "admin_memos_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_memos" ADD CONSTRAINT "admin_memos_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
