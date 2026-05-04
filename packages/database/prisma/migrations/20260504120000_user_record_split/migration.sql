-- AlterTable: users — 신상(시간 불변) 통합 (#118)
--   학부 컬럼 rename, 로스쿨 컬럼 신설, birth_year → birth_date, academic_status는 record로 이동
ALTER TABLE "users"
  DROP COLUMN "birth_year",
  DROP COLUMN "academic_status",
  DROP COLUMN "school_name",
  DROP COLUMN "first_major",
  DROP COLUMN "second_major",
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "undergrad_school_name" VARCHAR(100),
  ADD COLUMN "undergrad_first_major" VARCHAR(100),
  ADD COLUMN "undergrad_second_major" VARCHAR(100),
  ADD COLUMN "undergrad_entry_year" INTEGER,
  ADD COLUMN "undergrad_graduation_year" INTEGER,
  ADD COLUMN "current_lawschool" VARCHAR(100),
  ADD COLUMN "graduated_lawschool" VARCHAR(100),
  ADD COLUMN "lawschool_grade" INTEGER;

-- AlterTable: mentee_records — User로 이동된 컬럼 제거 + 학적 스냅샷 추가 (#118)
ALTER TABLE "mentee_records"
  DROP COLUMN "birth_date",
  DROP COLUMN "major",
  DROP COLUMN "graduation_year",
  DROP COLUMN "university_entry_year",
  ADD COLUMN "academic_status" "AcademicStatus";

-- AlterTable: mentor_records — User로 이동된 컬럼 제거 + 학적 스냅샷 추가 (#118)
ALTER TABLE "mentor_records"
  DROP COLUMN "current_lawschool",
  DROP COLUMN "graduated_lawschool",
  DROP COLUMN "graduation_year",
  ADD COLUMN "academic_status" "AcademicStatus";
