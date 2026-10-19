-- TIP-V2-306 (NA-13, NA-26): hàng đợi dọn ảnh bị thay + mail xác nhận phiếu dịch vụ (NA-22)

-- Ảnh cũ bị thay (avatar, bìa, logo, persona…) — job 02:00 xoá object sau ân hạn 24h
CREATE TABLE "storage_gc" (
  "key"         TEXT NOT NULL,
  "reason"      TEXT NOT NULL,
  "enqueued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "storage_gc_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "storage_gc_enqueued_at_idx" ON "storage_gc" ("enqueued_at");

-- NA-08/NA-13: giữ 120 tin mô phỏng mới nhất mỗi phòng — partial index cho window theo phòng
CREATE INDEX "messages_simulated_room_idx" ON "messages" ("room_id", "created_at" DESC, "id" DESC)
  WHERE "is_simulated" AND "deleted_at" IS NULL;

-- NA-14: file xuất hết hạn đã dọn (file_key NULL) — job chỉ quét dòng còn file
CREATE INDEX "export_jobs_expired_file_idx" ON "export_jobs" ("expires_at")
  WHERE "status" = 'done' AND "file_key" IS NOT NULL;

ALTER TYPE "mail_kind" ADD VALUE 'service';
