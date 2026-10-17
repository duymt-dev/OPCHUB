-- B44: job weekly_active / thống kê quét tin nhắn theo cửa sổ thời gian toàn bảng.
-- messages chỉ INSERT theo thời gian → BRIN rất nhỏ, gần như không tốn khi ghi (hot path chat).
CREATE INDEX "messages_created_brin" ON "messages" USING BRIN ("created_at") WITH (pages_per_range = 32);
