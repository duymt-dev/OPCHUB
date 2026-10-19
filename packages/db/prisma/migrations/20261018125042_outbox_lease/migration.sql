-- TIP-V2-101: lease cho relay outbox (handler chạy ngoài transaction, backoff khi lỗi).
-- Prisma diff muốn DROP các index viết tay (business_profiles_main_field, events_upcoming,
-- message_flags_user) vì schema không mô tả được — bỏ, giữ nguyên index.
ALTER TABLE "outbox_events" ADD COLUMN "locked_until" TIMESTAMPTZ(6);
