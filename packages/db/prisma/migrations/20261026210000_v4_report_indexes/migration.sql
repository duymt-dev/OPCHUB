-- TIP-V4-614 (D-78): Báo cáo B1/B2/B3 tổng hợp theo tháng — "bằng trước, khoảng sau" + covering.
-- Kỳ phí tạo trong tháng (doanh thu phí, thành viên mới đóng phí): khoảng `created_at`, lấy user + tiền.
CREATE INDEX IF NOT EXISTS "membership_fee_periods_created_report"
  ON "membership_fee_periods" ("created_at") INCLUDE ("user_id", "amount");
-- Thành viên của phạm vi tại cuối tháng / vào trong tháng: `group_id = ANY` rồi khoảng `created_at`.
CREATE INDEX IF NOT EXISTS "group_members_report"
  ON "group_members" ("group_id", "created_at") INCLUDE ("user_id") WHERE "status" = 'member';
