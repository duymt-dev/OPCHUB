-- TIP-V4-604 (D-72, REQ-508): Nhà đầu tư = danh sách + xuất.
-- Bỏ trạng thái kết nối (sent / in_discussion / connected) và luồng trao đổi NĐT ↔ OPC Hub.
-- Giữ investor_interests (tên, SĐT, đơn vị, dự án, số tiền) và investor_summaries (danh sách Admin).

-- Sự kiện phản hồi NĐT chưa gửi: không còn consumer (M1) → đóng lại, không xoá dấu vết
UPDATE outbox_events SET dispatched_at = now(), locked_until = NULL,
  last_error = 'D-72: luồng trao đổi nhà đầu tư đã bỏ'
WHERE type = 'investor.admin_replied' AND dispatched_at IS NULL;

DROP INDEX IF EXISTS "investor_interests_status_created_at_idx";
ALTER TABLE "investor_interests" DROP COLUMN "status";
ALTER TABLE "investor_summaries" DROP COLUMN "status";
DROP TABLE "investor_comments";
DROP TYPE "investor_interest_status";
