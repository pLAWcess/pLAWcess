-- CreateTable
CREATE TABLE "announcements" (
    "announcement_id"    UUID NOT NULL DEFAULT gen_random_uuid(),
    "title"              VARCHAR(100) NOT NULL,
    "body"               TEXT NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateIndex
CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at");

-- AddForeignKey
ALTER TABLE "announcements"
    ADD CONSTRAINT "announcements_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
