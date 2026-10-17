-- B42: con trỏ gửi chiến dịch theo lô (idempotent khi worker chạy lại)
ALTER TABLE "campaigns" ADD COLUMN "send_cursor" TEXT;
