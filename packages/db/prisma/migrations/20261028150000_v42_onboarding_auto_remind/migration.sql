-- TIP-V42-708 (D-100, D-115): tự nhắc khởi đầu khi mở Portal lần đầu trong ngày — không có Admin gửi.

CREATE TYPE "onboarding_reminder_kind" AS ENUM ('admin', 'auto');
ALTER TABLE "onboarding_reminders" ADD COLUMN "kind" "onboarding_reminder_kind" NOT NULL DEFAULT 'admin';
ALTER TABLE "onboarding_reminders" ALTER COLUMN "sent_by" DROP NOT NULL;
-- Nhắc của Admin luôn có người gửi; tự nhắc không có
ALTER TABLE "onboarding_reminders" ADD CONSTRAINT "onboarding_reminders_kind_sender_check"
  CHECK (("kind" = 'admin') = ("sent_by" IS NOT NULL));
