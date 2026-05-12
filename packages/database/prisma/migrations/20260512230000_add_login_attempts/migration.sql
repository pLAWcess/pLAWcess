-- 로그인 brute-force / credential stuffing 방어용 시도 기록 (#179).
-- /api/auth/login 이 (identifier, IP)별 최근 15분 실패 횟수를 세서 한도 초과 시 429.

-- CreateTable
CREATE TABLE "login_attempts" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(64) NOT NULL,
    "success"    BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_identifier_created_at_idx" ON "login_attempts"("identifier", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_address_created_at_idx" ON "login_attempts"("ip_address", "created_at");
