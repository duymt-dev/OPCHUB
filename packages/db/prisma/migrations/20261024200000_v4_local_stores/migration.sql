-- V4-608 (REQ-510, D-75, D-84): Gian hàng địa phương — stores + store_items
-- CreateEnum
CREATE TYPE "store_status" AS ENUM ('draft', 'published', 'hidden');

-- CreateEnum
CREATE TYPE "store_audience" AS ENUM ('student', 'personal', 'organization', 'business');

-- CreateEnum
CREATE TYPE "store_item_kind" AS ENUM ('product', 'service');

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slogan" TEXT NOT NULL DEFAULT '',
    "field" TEXT NOT NULL DEFAULT '',
    "province" TEXT NOT NULL DEFAULT '',
    "audience" "store_audience" NOT NULL DEFAULT 'business',
    "cover_url" TEXT,
    "intro" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "status" "store_status" NOT NULL DEFAULT 'draft',
    "hidden_prev" "store_status",
    "hidden_reason" TEXT,
    "hidden_by" TEXT,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "has_product" BOOLEAN NOT NULL DEFAULT false,
    "has_service" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_items" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "kind" "store_item_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_owner_id_key" ON "stores"("owner_id");

-- CreateIndex
CREATE INDEX "stores_status_province_field_updated_at_idx" ON "stores"("status", "province", "field", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "stores_status_updated_at_id_idx" ON "stores"("status", "updated_at" DESC, "id");

-- CreateIndex
CREATE INDEX "store_items_store_id_sort_idx" ON "store_items"("store_id", "sort");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_items" ADD CONSTRAINT "store_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- V4-608: ràng buộc dữ liệu (luật 7, 9)
ALTER TABLE "stores" ADD CONSTRAINT "stores_hidden_prev_check"
  CHECK ((status = 'hidden') = (hidden_prev IS NOT NULL) AND hidden_prev IS DISTINCT FROM 'hidden');
ALTER TABLE "stores" ADD CONSTRAINT "stores_item_count_check" CHECK (item_count >= 0);
ALTER TABLE "store_items" ADD CONSTRAINT "store_items_price_check" CHECK (price IS NULL OR price >= 0);
-- D-84: không tạo gian hàng hàng loạt cho DN đã đóng phí trước v4 (tự tạo ở lần đóng phí kế tiếp)
