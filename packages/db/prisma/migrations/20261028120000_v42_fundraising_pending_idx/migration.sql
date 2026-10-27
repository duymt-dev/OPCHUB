-- TIP-V42-704 (D-113 F3): ô chọn khoản Gói Gọi vốn chờ thanh toán khi kế toán khớp tay.
-- Partial index: chỉ khoản `pending_payment` (tập nhỏ, đổi trạng thái là rời index), sort mới → cũ.
CREATE INDEX "project_fundraisings_pending_created"
  ON "project_fundraisings" ("created_at" DESC) WHERE "status" = 'pending_payment';
