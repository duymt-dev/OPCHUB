# k6 — kiểm tải SRS §14.2 (TIP-B66)

Kịch bản chỉ dùng module có sẵn của k6 (không npm). Mọi cấu hình qua `-e KEY=value`; không có secret trong repo.
Chạy trên **dev/staging** (`BANK_PROVIDER=fake`, OTP cố định, `RATE_LIMIT_DISABLED=true` vì toàn bộ tải đến từ một IP).
Production cấm `RATE_LIMIT_DISABLED` (env schema từ chối).

| Kịch bản              | File                             | Mục tiêu §14.2                                         |
| --------------------- | -------------------------------- | ------------------------------------------------------ |
| Đăng ký + OTP         | `register.js`                    | 200 người/phút, p95 < 800ms, 0 lỗi                     |
| Chat nhóm             | `socket-chat.js` (+ `tokens.js`) | 5.000 kết nối, 50 tin/giây, p95 < 500ms, không mất tin |
| Admin duyệt danh sách | `admin-sessions.js`              | 100 phiên, p95 < 400ms                                 |
| Thu phí cao điểm      | `bank-webhook.js`                | 1.000 CK/giờ, đối soát < 5 phút, không trùng kích hoạt |

## Chuẩn bị dữ liệu (dev)

```bash
pnpm --filter @opchub/db seed:demo                       # dữ liệu demo + TK admin (admin@opchub.community)
# Thành viên tải: 5.000 TK đã đóng phí, chia đều 10 nhóm (Q-B66-2), mã TV800001…
LOAD_USERS=5000 LOAD_GROUPS=c1,c2,c3,c4,c5,c6,c7,c8,c9,c10 LOAD_PASSWORD=<tự đặt> \
  pnpm --filter @opchub/db seed:load
```

`seed:load` / `seed:demo` chỉ chạy trên `opchub_dev` / `opchub_test` (kiểm tên DB trước khi kết nối); `seed:demo` xoá TK tải.

## Chạy

```bash
K6="k6"   # Windows: "/c/Program Files/k6/k6.exe"
$K6 run -e GROUP_ID=c1 -e DURATION=2m infra/k6/register.js
$K6 run -e ADMIN_EMAIL=admin@opchub.community -e ADMIN_PASSWORD=<mật khẩu> -e VUS=100 -e DURATION=2m \
  infra/k6/admin-sessions.js

# Chat: access token sống 15 phút → lấy token ngay trước khi chạy; 5.000 token vượt giới hạn dòng lệnh → file
$K6 run -q -e LOAD_USERS=5000 -e LOAD_PASSWORD=<như trên> infra/k6/tokens.js 2>&1 \
  | grep -o 'TOKENS=[^"]*' | sed 's/^TOKENS=//' > tokens.txt
$K6 run -e TOKENS_FILE=tokens.txt -e CONNS=5000 -e SENDERS=100 -e MSG_PER_SEC=50 -e RAMP=60s -e HOLD_SEC=120 \
  -e ROOM_IDS=c1-general,c2-general,…,c10-general \
  -e SOCKET_URLS=ws://127.0.0.1:4001,ws://127.0.0.1:4002 infra/k6/socket-chat.js

# Thu phí: mã TV của thành viên đang chờ phí; secret webhook lấy từ env server lúc chạy
$K6 run -e BANK_WEBHOOK_SECRET=<secret> -e MEMBER_CODES=TV800001,TV800002,… -e DURATION=3m infra/k6/bank-webhook.js
```

Ghi chú

- `socket-chat.js` nói thẳng giao thức Engine.IO v4 / Socket.IO v5 trên WebSocket (k6 không có client Socket.IO).
  `chat_ack_ms` = gửi → ack sau commit (S-12); `chat_deliver_ms` = `createdAt` của tin → lúc người nhận nhận `message.new`.
- Nhiều instance socket (`opchub-socket@1..n`, redis-adapter) = `SOCKET_URLS`, VU chia đều như nginx chia.
- `bank-webhook.js` gửi lặp ~10% giao dịch cùng id ngân hàng để kiểm idempotent. Kiểm sau khi chạy:
  `payment_transactions` không trùng `bank_txn_id`; mỗi giao dịch khớp sinh đúng một `membership_fee_periods`.

Kết quả đo trên máy dev: `coding-packs/reports/B66-k6.md`.
