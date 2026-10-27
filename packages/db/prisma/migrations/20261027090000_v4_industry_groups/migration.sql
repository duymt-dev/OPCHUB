-- TIP-V4-619 (D-89, prototype v4): Cộng đồng 90 nhóm = 34 nhóm tỉnh + 56 nhóm ngành.
CREATE TYPE "group_kind" AS ENUM ('province', 'industry');

ALTER TABLE "groups"
  ADD COLUMN "kind" "group_kind" NOT NULL DEFAULT 'province',
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "parent_id" TEXT;

-- Nhóm ngành luôn có ngành + nhóm tỉnh cha; nhóm tỉnh thì không
ALTER TABLE "groups" ADD CONSTRAINT "groups_kind_shape" CHECK (
  ("kind" = 'province' AND "industry" IS NULL AND "parent_id" IS NULL)
  OR ("kind" = 'industry' AND "industry" IS NOT NULL AND "parent_id" IS NOT NULL)
);

-- Mỗi tỉnh một nhóm TỈNH (nhóm ngành cùng tỉnh được phép)
DROP INDEX IF EXISTS "groups_province_live";
CREATE UNIQUE INDEX "groups_province_live" ON "groups" ("province")
  WHERE "kind" = 'province' AND "deleted_at" IS NULL;
-- Một nhóm ngành / tỉnh / ngành
CREATE UNIQUE INDEX "groups_industry_live" ON "groups" ("parent_id", "industry")
  WHERE "kind" = 'industry' AND "deleted_at" IS NULL;
