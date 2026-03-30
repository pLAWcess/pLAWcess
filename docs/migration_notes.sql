-- ================================================
-- pLAWcess — 검토 사항 반영 내용 요약
-- (실제 실행 파일 아님 — 참고용 노트)
-- ================================================

-- 1. ENUM 타입 정의 (Prisma가 자동 생성하지만 참고용)
-- Prisma migrate 실행 시 아래 타입들이 PostgreSQL에 자동 생성됨
--
-- CREATE TYPE "Gender"             AS ENUM ('male', 'female');
-- CREATE TYPE "AcademicStatus"     AS ENUM ('enrolled', 'on_leave', 'graduated', 'completed', 'expelled');
-- CREATE TYPE "AccountStatus"      AS ENUM ('active', 'inactive', 'blocked');
-- CREATE TYPE "CurrentRole"        AS ENUM ('none', 'mentee', 'mentor', 'admin');  ← admin 추가
-- CREATE TYPE "ApplicationRole"    AS ENUM ('mentee', 'mentor');
-- CREATE TYPE "ApplicationStatus"  AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'revision_requested');  ← draft 추가
-- CREATE TYPE "MatchStatus"        AS ENUM ('suggested', 'draft', 'finalized', 'cancelled');


-- 2. mentee_records / mentor_records 에 record_status 컬럼 추가
--    (임시저장 draft ↔ 제출완료 submitted 구분)
--
-- ALTER TABLE mentee_records ADD COLUMN record_status "ApplicationStatus" NOT NULL DEFAULT 'draft';
-- ALTER TABLE mentee_records ADD COLUMN submitted_at TIMESTAMP;
-- ALTER TABLE mentor_records ADD COLUMN record_status "ApplicationStatus" NOT NULL DEFAULT 'draft';
-- ALTER TABLE mentor_records ADD COLUMN submitted_at TIMESTAMP;


-- 3. current_role에 admin 추가
--    (원래 none/mentee/mentor만 있었음)
--    → Prisma enum CurrentRole에 admin 포함으로 해결


-- 4. applications 테이블 — role별 레코드 참조 무결성
--    Prisma에서 CHECK 제약조건을 직접 지원하지 않으므로
--    migrate 후 아래 SQL을 수동으로 실행하거나
--    Prisma migration 파일에 직접 추가할 것
--
-- ALTER TABLE applications
--   ADD CONSTRAINT check_record_by_role CHECK (
--     (role = 'mentee' AND mentee_record_id IS NOT NULL AND mentor_record_id IS NULL)
--     OR
--     (role = 'mentor' AND mentor_record_id IS NOT NULL AND mentee_record_id IS NULL)
--   );


-- 5. match_results 중복 방지
--    같은 멘티가 같은 연도에 활성 매칭(미취소)을 하나만 갖도록
--    Partial Unique Index 사용 (PostgreSQL 전용 기능)
--
-- CREATE UNIQUE INDEX uq_active_mentee_match
--   ON match_results (mentee_application_id)
--   WHERE match_status != 'cancelled';


-- 6. users.major 중복 제거 결정
--    users.first_major  → 회원 기본 정보 (가입 시 입력)
--    mentee_records.major → 신청 당시 전공 (연도마다 달라질 수 있음)
--    → 두 컬럼 모두 유지하되, source of truth를 명확히 할 것
--    → 회원관리 화면: users.first_major 사용
--    → 매칭 알고리즘: mentee_records.major 사용


-- ================================================
-- 개발 시작 전 실행 순서
-- ================================================
--
-- 1. .env 파일에 DATABASE_URL 설정
--    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
--
-- 2. Prisma 초기 마이그레이션 실행
--    npx prisma migrate dev --name init
--
-- 3. CHECK 제약조건 수동 추가 (위 4번 SQL 실행)
--    → Supabase 대시보드 SQL Editor 또는 psql에서 직접 실행
--
-- 4. Partial Unique Index 추가 (위 5번 SQL 실행)
--
-- 5. Seed 데이터 삽입
--    npx prisma db seed
