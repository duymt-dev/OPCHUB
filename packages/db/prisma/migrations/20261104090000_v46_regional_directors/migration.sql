-- CreateEnum
CREATE TYPE "regional_director_action" AS ENUM ('appoint', 'revoke');

-- AlterEnum
ALTER TYPE "mail_kind" ADD VALUE 'regional_director';

-- AlterEnum
ALTER TYPE "membership_fee_status" ADD VALUE 'regional_director';

-- CreateTable
CREATE TABLE "regional_directors" (
    "region" "region" NOT NULL,
    "user_id" TEXT,
    "appointed_at" TIMESTAMPTZ(6),
    "appointed_by" TEXT,
    "prev_fee_status" "membership_fee_status",
    "prev_valid_until" TIMESTAMPTZ(6),
    "bank_name" TEXT,
    "bank_no" TEXT,
    "bank_holder" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "regional_directors_pkey" PRIMARY KEY ("region")
);

-- CreateTable
CREATE TABLE "regional_director_provinces" (
    "province" TEXT NOT NULL,
    "region" "region" NOT NULL,

    CONSTRAINT "regional_director_provinces_pkey" PRIMARY KEY ("province")
);

-- CreateTable
CREATE TABLE "regional_director_events" (
    "id" TEXT NOT NULL,
    "region" "region" NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "action" "regional_director_action" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regional_director_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regional_directors_user_id_key" ON "regional_directors"("user_id");

-- CreateIndex
CREATE INDEX "regional_director_provinces_region_idx" ON "regional_director_provinces"("region");

-- CreateIndex
CREATE INDEX "regional_director_events_created_at_id_idx" ON "regional_director_events"("created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "regional_directors" ADD CONSTRAINT "regional_directors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_director_provinces" ADD CONSTRAINT "regional_director_provinces_region_fkey" FOREIGN KEY ("region") REFERENCES "regional_directors"("region") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_director_events" ADD CONSTRAINT "regional_director_events_region_fkey" FOREIGN KEY ("region") REFERENCES "regional_directors"("region") ON DELETE RESTRICT ON UPDATE CASCADE;

-- D-120: permanent slots. No use of newly added enum values in this migration.
INSERT INTO regional_directors (region, updated_at)
VALUES ('north', now()), ('central', now()), ('south', now());
INSERT INTO regional_director_provinces (province, region)
SELECT province, region FROM groups WHERE kind = 'province' AND deleted_at IS NULL
ON CONFLICT DO NOTHING;
INSERT INTO admin_role_permissions (role_id, permission_key)
SELECT id, 'affiliate.regional' FROM admin_roles WHERE key = 'admin'
ON CONFLICT DO NOTHING;

-- Candidate page: equality/partial predicates before member-code ordering.
CREATE INDEX users_regional_candidates ON users (member_code, id)
INCLUDE (full_name, email) WHERE status = 'active'
  AND account_type <> 'investor' AND deleted_at IS NULL;
