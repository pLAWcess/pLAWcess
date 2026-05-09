-- CreateEnum
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('signup', 'reset_password');

-- CreateTable
CREATE TABLE "email_verifications" (
    "verification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(100) NOT NULL,
    "purpose" "EmailVerificationPurpose" NOT NULL,
    "code_hash" VARCHAR(100) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("verification_id")
);

-- CreateIndex
CREATE INDEX "email_verifications_email_purpose_created_at_idx" ON "email_verifications"("email", "purpose", "created_at");
