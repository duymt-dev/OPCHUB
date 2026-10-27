-- D-89 v4 Admin Gian hàng (AD-07): bảng theo thứ tự tạo như prototype `aAll`
-- (`WHERE status = $1 ORDER BY created_at, id` và "Tất cả" không lọc trạng thái).
CREATE INDEX "stores_status_created_at_id_idx" ON "stores"("status", "created_at", "id");
CREATE INDEX "stores_created_at_id_idx" ON "stores"("created_at", "id");
