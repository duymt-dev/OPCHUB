-- TIP-V4-605 (D-72): yêu cầu dịch vụ = phiếu + ghi chú nội bộ @nhắc.
-- Bỏ quy trình 5 bước (trạng thái), người phụ trách, index lọc theo trạng thái. Phiếu và ghi chú giữ nguyên.
DROP INDEX IF EXISTS "service_requests_status_created_at_idx";
ALTER TABLE "service_requests" DROP COLUMN "status";
ALTER TABLE "service_requests" DROP COLUMN "assignee";
DROP TYPE "service_request_status";
