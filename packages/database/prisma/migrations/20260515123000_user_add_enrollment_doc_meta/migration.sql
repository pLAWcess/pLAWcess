-- User 에 재학증명서 메타 컬럼 추가 (#268)
-- 회원가입 시 Supabase Storage 의 pLAWcess 버킷에 업로드된 cert 의 메타 정보를 보관.
-- 기존 가입자는 backfill 없이 NULL 유지. BE 핸들러가 신규 가입에서 required 검증.

ALTER TABLE "users" ADD COLUMN "enrollment_doc_path"        VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "enrollment_doc_filename"    VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "enrollment_doc_mime"        VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "enrollment_doc_size"        INTEGER;
ALTER TABLE "users" ADD COLUMN "enrollment_doc_uploaded_at" TIMESTAMPTZ(6);
