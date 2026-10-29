-- TIP-V42-702 (D-94 1A): trạng thái phí `trial` = miễn phí 3 tháng.
-- Tách migration: Postgres không cho dùng giá trị enum mới trong cùng transaction với ADD VALUE.
ALTER TYPE "membership_fee_status" ADD VALUE IF NOT EXISTS 'trial' BEFORE 'pending_payment';
