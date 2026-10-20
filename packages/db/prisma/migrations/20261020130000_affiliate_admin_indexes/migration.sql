-- TIP-V2-402: chỉ thêm index, không đổi dữ liệu/schema entity. Prisma không mô tả
-- đầy đủ INCLUDE/partial/expression/trigram; review SQL này trước migrate deploy.
CREATE INDEX affiliates_created_idx ON affiliates (created_at DESC,id DESC) INCLUDE (user_id,status);
CREATE INDEX affiliates_code_search_idx ON affiliates USING gin (code gin_trgm_ops);
CREATE INDEX referrals_affiliate_created_idx ON referrals (affiliate_id,created_at DESC,id DESC)
  INCLUDE (referred_user_id,month_key);
CREATE INDEX commissions_affiliate_created_idx ON commissions (affiliate_id,created_at DESC,id DESC)
  INCLUDE (referred_user_id,month_key);
CREATE INDEX commissions_affiliate_status_month_idx ON commissions (affiliate_id,status,month_key)
  INCLUDE (list_amount,amount);
CREATE INDEX commissions_valid_summary_idx ON commissions (status,month_key)
  INCLUDE (list_amount,amount) WHERE status IN ('recorded','paid');
-- Receipt là snapshot bất biến của lần chi trả; seek theo affiliate + tháng + payoutId.
CREATE INDEX commissions_payout_receipt_idx ON commissions
  (affiliate_id,month_key,(paid_bank_snapshot->>'payoutId')) INCLUDE (amount)
  WHERE status='paid';
