-- V4-609 Nhu cầu địa phương (REQ-511, UP-09, AD-07): chủ gian hàng đăng, hiện ngay; Admin ẩn / hiện.

-- CreateEnum
CREATE TYPE "need_type" AS ENUM ('buy', 'sell', 'partner', 'service', 'solution', 'staff', 'space', 'capital', 'other');

-- CreateEnum
CREATE TYPE "need_status" AS ENUM ('open', 'closed', 'hidden');

-- CreateEnum
CREATE TYPE "need_scope" AS ENUM ('province', 'region', 'nation');

-- CreateEnum
CREATE TYPE "need_channel" AS ENUM ('zalo', 'call', 'email');

-- CreateTable
CREATE TABLE "needs" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "type" "need_type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "field_custom" BOOLEAN NOT NULL DEFAULT false,
    "quantity" TEXT NOT NULL DEFAULT '',
    "budget_min" BIGINT,
    "budget_max" BIGINT,
    "province" TEXT NOT NULL,
    "ward" TEXT NOT NULL DEFAULT '',
    "due_at" TIMESTAMPTZ(6),
    "scope" "need_scope" NOT NULL DEFAULT 'province',
    "cooperation" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "standards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "doc_url" TEXT NOT NULL DEFAULT '',
    "contact_name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "channel" "need_channel" NOT NULL DEFAULT 'zalo',
    "status" "need_status" NOT NULL DEFAULT 'open',
    "hidden_prev" "need_status",
    "hidden_reason" TEXT,
    "hidden_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "needs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "needs_status_updated_at_id_idx" ON "needs"("status", "updated_at" DESC, "id");

-- CreateIndex
CREATE INDEX "needs_status_province_field_updated_at_idx" ON "needs"("status", "province", "field", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "needs_owner_id_created_at_idx" ON "needs"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "needs_store_id_status_idx" ON "needs"("store_id", "status");

-- AddForeignKey
ALTER TABLE "needs" ADD CONSTRAINT "needs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "needs" ADD CONSTRAINT "needs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ràng buộc nghiệp vụ (TIP-V4-609)
ALTER TABLE "needs" ADD CONSTRAINT "needs_budget_check"
  CHECK ((budget_min IS NULL OR budget_min >= 0) AND (budget_max IS NULL OR budget_max >= 0)
    AND (budget_min IS NULL OR budget_max IS NULL OR budget_min < budget_max));
ALTER TABLE "needs" ADD CONSTRAINT "needs_hidden_prev_check"
  CHECK ((status = 'hidden') = (hidden_prev IS NOT NULL) AND hidden_prev IS DISTINCT FROM 'hidden');
ALTER TABLE "needs" ADD CONSTRAINT "needs_contact_check" CHECK (phone <> '' OR email <> '');
