-- TIP-V42-710 (D-97, D-114): trình tạo gian hàng 5 bước + media; gian hàng tự tạo ở Nháp.
-- Media lưu cùng hàng `stores` (đọc / ghi trọn một lần như PUT /me/store, trần S5 nhỏ).
ALTER TABLE "stores" ADD COLUMN "ward" TEXT NOT NULL DEFAULT '';
ALTER TABLE "stores" ADD COLUMN "logo_url" TEXT;
ALTER TABLE "stores" ADD COLUMN "logos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "stores" ADD COLUMN "covers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "stores" ADD COLUMN "hidden_covers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "stores" ADD COLUMN "vision" TEXT NOT NULL DEFAULT '';
ALTER TABLE "stores" ADD COLUMN "mission" TEXT NOT NULL DEFAULT '';
ALTER TABLE "stores" ADD COLUMN "gallery" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "stores" ADD COLUMN "videos" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "stores" ADD COLUMN "team" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "stores" ADD COLUMN "certs" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "stores" ADD COLUMN "docs" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "stores" ADD COLUMN "phones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "stores" ADD COLUMN "emails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "stores" ADD COLUMN "addresses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "stores" ADD COLUMN "socials" JSONB NOT NULL DEFAULT '{}';
-- Mọi URL object storage của gian hàng (logo, bìa, ảnh, video, đội ngũ, chứng nhận, tài liệu) —
-- dọn rác media hỏi "còn dùng không" bằng một toán tử && trên GIN thay vì mở từng jsonb
ALTER TABLE "stores" ADD COLUMN "media_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- Tạo tự động (đăng ký / đóng phí / migration) — Portal mở thẳng trình tạo khi còn trống (prototype `wzOn`)
ALTER TABLE "stores" ADD COLUMN "auto_created" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "stores_media_urls_idx" ON "stores" USING GIN ("media_urls");

-- D-114 S6: dashboard "Lượt xem gian hàng" 7 ngày theo ngày (Asia/Ho_Chi_Minh) — PK (store_id, day)
CREATE TABLE "store_daily_views" (
    "store_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "store_daily_views_pkey" PRIMARY KEY ("store_id", "day")
);
ALTER TABLE "store_daily_views" ADD CONSTRAINT "store_daily_views_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- D-114 S3 (thay D-84): mọi TK Doanh nghiệp đang trial / còn phí chưa có gian hàng → gian hàng Nháp từ hồ sơ DN.
-- Gian hàng đang có giữ nguyên; chạy lại không tạo thêm (UQ owner_id).
INSERT INTO "stores" ("id", "owner_id", "name", "province", "phone", "email", "website", "address",
                      "status", "audience", "auto_created", "updated_at")
SELECT gen_random_uuid()::text, u."id",
       LEFT(COALESCE(NULLIF(bp."company_name", ''), u."full_name"), 120),
       COALESCE(NULLIF(bp."province", ''), u."city"),
       COALESCE(u."phone", ''), u."email", COALESCE(bp."website", ''), COALESCE(bp."address", ''),
       'draft', 'business', true, now()
FROM "users" u
JOIN "membership_fees" f ON f."user_id" = u."id"
LEFT JOIN "business_profiles" bp ON bp."user_id" = u."id"
WHERE u."account_type" = 'business'
  AND u."deleted_at" IS NULL
  AND f."status" IN ('trial', 'active', 'expiring')
  AND NOT EXISTS (SELECT 1 FROM "stores" s WHERE s."owner_id" = u."id")
ON CONFLICT ("owner_id") DO NOTHING;
