-- D-89 (P-105): lượt xem, "Nổi bật" do Admin gắn, tim yêu thích gian hàng (prototype v4 `st.list`)
ALTER TABLE "stores" ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "stores" ADD COLUMN "featured_at" TIMESTAMPTZ(6);
ALTER TABLE "stores" ADD COLUMN "legal_form" TEXT NOT NULL DEFAULT '';

CREATE TABLE "store_favorites" (
    "store_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_favorites_pkey" PRIMARY KEY ("user_id","store_id")
);

CREATE INDEX "store_favorites_store_id_idx" ON "store_favorites"("store_id");

ALTER TABLE "store_favorites" ADD CONSTRAINT "store_favorites_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_favorites" ADD CONSTRAINT "store_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
