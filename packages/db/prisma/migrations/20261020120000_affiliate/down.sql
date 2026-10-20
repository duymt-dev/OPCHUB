-- Rollback chỉ chạy có chủ đích trước khi phục hồi phiên bản ứng dụng cũ.
DROP TABLE "affiliate_clicks_daily", "commissions", "referrals", "affiliates", "affiliate_policy";
DROP TYPE "commission_status", "referral_status", "affiliate_status";
