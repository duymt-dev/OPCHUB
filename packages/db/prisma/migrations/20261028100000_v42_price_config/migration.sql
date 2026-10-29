-- TIP-V42-703 (D-94 5A, CR-08, REQ-603): Cấu hình bảng giá thay hằng số giá trong code.
CREATE TABLE "price_configs" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "per_list" INTEGER NOT NULL,
    "per_year" INTEGER NOT NULL,
    "biz_list" INTEGER NOT NULL,
    "biz_year" INTEGER NOT NULL,
    "fund_price" INTEGER NOT NULL,
    "fund_renew" INTEGER NOT NULL,
    "fund_months" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_config_history" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "per_list" INTEGER NOT NULL,
    "per_year" INTEGER NOT NULL,
    "biz_list" INTEGER NOT NULL,
    "biz_year" INTEGER NOT NULL,
    "fund_price" INTEGER NOT NULL,
    "fund_renew" INTEGER NOT NULL,
    "fund_months" INTEGER NOT NULL,
    "changed_by" TEXT,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_config_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "price_config_history_changed_at_idx" ON "price_config_history"("changed_at" DESC);

-- Một dòng duy nhất; giá bán > 0, niêm yết ≥ 0, thời hạn Gọi vốn 1–60 tháng (prototype prcV)
ALTER TABLE "price_configs" ADD CONSTRAINT "price_configs_single_row" CHECK ("id" = 1);
ALTER TABLE "price_configs" ADD CONSTRAINT "price_configs_amount_check" CHECK (
  "per_list" >= 0 AND "biz_list" >= 0 AND "per_year" > 0 AND "biz_year" > 0
  AND "fund_price" > 0 AND "fund_renew" > 0 AND "fund_months" BETWEEN 1 AND 60);

-- Giá mặc định §27.2 / prototype v4.2 `_prc(s)` (GOAL: giá mặc định chỉ ở migration / seed / test)
INSERT INTO "price_configs"
  ("id", "per_list", "per_year", "biz_list", "biz_year", "fund_price", "fund_renew", "fund_months")
VALUES (1, 200000, 1200000, 500000, 3600000, 15000000, 7500000, 6)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "price_config_history"
  ("id", "version", "per_list", "per_year", "biz_list", "biz_year", "fund_price", "fund_renew",
   "fund_months")
SELECT gen_random_uuid()::text, "version", "per_list", "per_year", "biz_list", "biz_year",
       "fund_price", "fund_renew", "fund_months"
FROM "price_configs" WHERE "id" = 1;

-- Lịch sử chỉ thêm, không sửa / xoá (như audit_logs)
CREATE OR REPLACE FUNCTION "price_config_history_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'price_config_history chỉ được thêm';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "price_config_history_no_update"
  BEFORE UPDATE OR DELETE ON "price_config_history"
  FOR EACH ROW EXECUTE FUNCTION "price_config_history_immutable"();
