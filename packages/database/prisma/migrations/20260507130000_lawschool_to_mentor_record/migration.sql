-- AlterTable: users — #137 로스쿨 정보 User → MentorRecord 로 이동 (졸업/현재 구분 폐기)
ALTER TABLE "users"
    DROP COLUMN "current_lawschool",
    DROP COLUMN "graduated_lawschool",
    DROP COLUMN "lawschool_grade";

-- AlterTable: mentor_records — #137 멘토 본인 로스쿨 단일 슬롯
ALTER TABLE "mentor_records"
    ADD COLUMN "lawschool_name" VARCHAR(100),
    ADD COLUMN "lawschool_grade" INTEGER;
