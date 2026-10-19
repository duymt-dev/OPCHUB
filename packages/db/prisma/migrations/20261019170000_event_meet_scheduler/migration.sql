-- TIP-V2-303 (EV-R01 → R05, NA-23, D-59): link Meet riêng, scheduler 15 phút
ALTER TABLE "events"
  ADD COLUMN "meet_url" TEXT,
  ADD COLUMN "closed_at" TIMESTAMPTZ(6),
  ADD COLUMN "reminded_at" TIMESTAMPTZ(6);

ALTER TABLE "events" ADD CONSTRAINT "events_meet_url_https"
  CHECK ("meet_url" IS NULL OR ("meet_url" ~ '^https://\S+$' AND length("meet_url") <= 500));

-- Sự kiện online cũ ghi link vào `place` → chuyển sang `meet_url`, `place` về "Online"
UPDATE "events" SET "meet_url" = "place", "place" = 'Online'
WHERE "mode" = 'online' AND "place" ~ '^https://\S+$' AND length("place") <= 500;

-- Scheduler: đóng đăng ký (đang mở) + khối "Sắp diễn ra" (bằng trước, khoảng sau)
CREATE INDEX "events_open_starts" ON "events" ("starts_at") WHERE "registration_open";
-- Scheduler: nhắc 24h chưa phát
CREATE INDEX "events_remind_due" ON "events" ("starts_at") WHERE "reminded_at" IS NULL;
