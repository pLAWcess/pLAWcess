-- CreateEnum: 병역여부 (#91)
CREATE TYPE "MilitaryStatus" AS ENUM ('completed', 'not_completed', 'not_applicable');

-- CreateEnum: 희망 진로 (#100)
CREATE TYPE "CareerGoal" AS ENUM ('lawyer', 'prosecutor', 'judge');

-- AlterTable: users에 병역여부 컬럼 추가 (#91)
ALTER TABLE "users"
  ADD COLUMN "military_status" "MilitaryStatus";

-- AlterTable: mentee_records에 희망 진로 컬럼 추가 (#100)
--   FE 정성 데이터 대시보드의 변호사/검사/판사 선택값을 저장
ALTER TABLE "mentee_records"
  ADD COLUMN "career_goal" "CareerGoal";
