-- TIP-V2-302 (NR-R02, REQ-013): lưu vết đồng ý chính sách phí không hoàn lại
ALTER TYPE "consent_kind" ADD VALUE IF NOT EXISTS 'fee_policy';
