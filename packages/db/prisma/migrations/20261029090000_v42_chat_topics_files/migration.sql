-- TIP-V42-709 (D-111): Admin xoá mềm chủ đề chat — tin giữ nguyên, phòng ẩn khỏi Portal.
ALTER TABLE "rooms" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "rooms" ADD COLUMN "deleted_by" TEXT;

-- Phòng mặc định "Chung" không xoá được (D-111, NA-09)
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_default_not_deleted_check"
  CHECK (NOT ("is_default" AND "deleted_at" IS NOT NULL));

-- D-98 tab "File chia sẻ" theo nhóm: keyset (created_at, id) chỉ trên tin file / ảnh còn hiển thị.
-- Partial → nhỏ, Index Scan theo từng phòng của nhóm (room_id = ANY) + Merge Append theo thứ tự.
CREATE INDEX "messages_files_room_created_at_id_idx"
  ON "messages" ("room_id", "created_at" DESC, "id" DESC)
  WHERE "kind" IN ('file', 'image') AND "hidden_at" IS NULL AND "deleted_at" IS NULL;
