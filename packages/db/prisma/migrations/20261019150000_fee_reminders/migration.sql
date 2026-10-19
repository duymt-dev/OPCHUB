-- TIP-V2-301 (NA-04, D-57): nhắc phí T-30 / T-7 / T-0 / T+3, mỗi mốc ≤ 1 lần cho mỗi kỳ
CREATE TABLE "fee_reminders" (
    "user_id" TEXT NOT NULL,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "milestone" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_reminders_pkey" PRIMARY KEY ("user_id","valid_until","milestone"),
    CONSTRAINT "fee_reminders_milestone_check" CHECK ("milestone" IN ('T-30', 'T-7', 'T-0', 'T+3'))
);

ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ứng viên nhắc: valid_until trong [now − 10 ngày, now + 31 ngày], gồm cả `expired`
CREATE INDEX "membership_fees_remind" ON "membership_fees" ("valid_until")
  WHERE "status" IN ('active', 'expiring', 'expired');
