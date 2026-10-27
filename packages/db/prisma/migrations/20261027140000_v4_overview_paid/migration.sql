-- D-89 v4 Admin Tổng quan: "Thành viên đã kích hoạt phí" + số đóng phí trong tháng
-- (`WHERE status IN ('active','expiring') AND paid_at >= $start`) → partial index trên paid_at.
CREATE INDEX "membership_fees_paid_at" ON "membership_fees" ("paid_at")
  WHERE "status" IN ('active', 'expiring');
