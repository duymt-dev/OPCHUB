-- TIP-V2-114 (BUG-036, NA-05): dừng chiến dịch, huỷ nhận thư chiến dịch, ưu tiên + hạn mức thư.
-- ADD VALUE không dùng được trong cùng transaction với câu dùng giá trị mới → backfill không dùng 'cancelled'.
ALTER TYPE "campaign_status" ADD VALUE 'cancelled';
ALTER TYPE "mail_status" ADD VALUE 'cancelled';

ALTER TABLE "campaigns" ADD COLUMN "cancelled_at" TIMESTAMPTZ(6), ADD COLUMN "cancelled_by" TEXT;

ALTER TABLE "mail_logs" ADD COLUMN "next_attempt_at" TIMESTAMPTZ(6),
  ADD COLUMN "priority" SMALLINT NOT NULL DEFAULT 5;

-- Backfill ưu tiên theo kind: OTP/đặt lại MK = 1; giao dịch = 3; thử = 4; chiến dịch giữ 5
UPDATE "mail_logs" SET "priority" = CASE
  WHEN "kind" IN ('otp', 'password_reset') THEN 1
  WHEN "kind" IN ('welcome', 'fee_reminder', 'event') THEN 3
  WHEN "kind" = 'test' THEN 4
  ELSE 5 END
WHERE "kind" <> 'campaign';

CREATE TABLE "mail_suppressions" (
    "email" CITEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'unsubscribe',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mail_suppressions_pkey" PRIMARY KEY ("email")
);

-- Nhật ký thư Admin (TIP-V2-114 luật 8): mọi kind/trạng thái, keyset (created_at DESC, id).
-- Viết tay (giữ index partial `mail_logs_sent_visible` cũ); Prisma diff sẽ đòi DROP — bỏ qua như các index tay khác.
CREATE INDEX "mail_logs_log_keyset" ON "mail_logs" ("created_at" DESC, "id");
