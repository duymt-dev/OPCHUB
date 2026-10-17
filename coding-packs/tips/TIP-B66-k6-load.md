# TIP-B66: k6 tải §14.2

## HEADER
- TIP-ID: TIP-B66 · Module: infra/k6 · Priority: P0 · Depends on: B23, B14, B64 · Estimated: M (8h)
- **Files touched (create):** `infra/k6/{register.js,socket-chat.js,admin-sessions.js,bank-webhook.js,lib.js}`, `infra/k6/README.md`, `coding-packs/reports/B66-k6.md` (số đo thật)
- **Parallel-safe with:** B60–B63 (viết script); chạy sau khi server dev chạy.

## SPECIFICATIONS
1. Kịch bản §14.2: đăng ký 200/phút; 5.000 socket + 50 tin/s; Admin 100 phiên; 1.000 chuyển khoản/giờ (webhook ký HMAC fake).
2. Ngưỡng `thresholds` theo §14.1 (p95). Máy dev: chạy được bao nhiêu ghi bấy nhiêu, ghi cấu hình máy.

## ⚠️ BUILDER-CHECKLIST
- [ ] Chạy thật trên dev, paste kết quả; commit + SHA
