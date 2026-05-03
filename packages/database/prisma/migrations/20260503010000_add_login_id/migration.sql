-- AlterTable: users.login_id 추가 (#120)
--   사용자가 로그인 폼에 직접 타이핑하는 ID. email과 별개.
--   기존 dummy 유저는 NULL 허용 (필요 시 수동 정리). 신규 가입자는 BE에서 필수 검증.
ALTER TABLE "users"
  ADD COLUMN "login_id" VARCHAR(50);

CREATE UNIQUE INDEX "users_login_id_key" ON "users"("login_id");
