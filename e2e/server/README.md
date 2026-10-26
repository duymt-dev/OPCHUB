# e2e trên server thật (TIP-B62 / B63)

Chạy 115 test hành vi (`behavior/`) và parity (`parity/`) với `NEXT_PUBLIC_API_MOCKING=off`: Portal/Admin gọi API
NestJS thật trên DB `opchub_dev` (đã `seed:demo`), Redis db 1.

## 1. Server (api + socket + worker)

`apps/server/.env` (gitignored) cần thêm cho dev/e2e một máy:

```
RATE_LIMIT_DISABLED=true      # mọi request từ 127.0.0.1 → rate limit sẽ chặn e2e/k6 (server cấm ở production)
STORAGE_PROVIDER=local        # ảnh upload lưu đĩa, phục vụ qua /v1/uploads/* (không cần RustFS)
LOCAL_STORAGE_DIR=D:/opchub-local/uploads
PORTAL_URL=http://localhost:3200
ADMIN_URL=http://localhost:3201  # BUG-001: link đặt lại mật khẩu của TK quản trị
FAKE_MAIL_DIR=D:/opchub-local/mailbox  # TD-035: FakeMail ghi thư ra đĩa (server cấm ở production)
CORS_ORIGINS=http://localhost:3200,http://localhost:3201,http://localhost:3000,http://localhost:3001
```

Tra MST qua DLPL (TIP-V2-118, D-65): API dev trỏ về stub `e2e/server/dlpl-stub.ts` (Playwright tự chạy ở cổng
`DLPL_STUB_PORT`, mặc định 4810). Key dưới đây là chuỗi giả cho stub, không phải secret:

```
TAX_LOOKUP_PROVIDER=dlpl
DLPL_BASE_URL=http://127.0.0.1:4810/v1
DLPL_API_KEY=e2e-stub-key-000000000000
```

Lượt `@live` (ngoài CI, tốn 1 lượt DLPL): API chạy `TAX_LOOKUP_PROVIDER=chain` với `DLPL_API_KEY` thật trong `.env`
(gitignored), rồi `E2E_TAX_LIVE=1 pnpm e2e:server --project behavior -g @live`. Hạn mức: `GET /v1/me` (không tính lượt).

```bash
pnpm --filter @opchub/server build
pnpm --filter @opchub/server start:api     # :4000
pnpm --filter @opchub/server start:socket  # :4001
pnpm --filter @opchub/server start:worker
```

## 2. Build Portal/Admin chế độ server (thư mục `.next-server`, không đè bản MSW)

```bash
NEXT_DIST_DIR=.next-server NEXT_PUBLIC_API_MOCKING=off API_PROXY_URL=http://127.0.0.1:4000 \
  NEXT_PUBLIC_SOCKET_URL=http://localhost:4001 \
  pnpm --filter @opchub/portal --filter @opchub/admin build
```

## 3. Chạy

Test đi theo link trong mail (đặt lại mật khẩu, TD-035) đọc thư từ cùng thư mục với worker:
`FAKE_MAIL_DIR=D:/opchub-local/mailbox` phải có trong env khi chạy Playwright (`e2e/server/mailbox.ts`).

```bash
cd e2e
pnpm e2e:server --project behavior          # globalSetup: kiểm /v1/health + seed:demo (reset dữ liệu demo)
PARITY_IDS='*' pnpm e2e:server --project parity
SKIP_SEED=1 pnpm e2e:server --project behavior -g "Chat"   # chạy lại một phần, không reset
```

Cổng: Portal 3200, Admin 3201 (`SERVER_PORTAL_PORT` / `SERVER_ADMIN_PORT`); test chạy tuần tự (`SERVER_WORKERS=1`)
vì dùng chung một DB. Đồng hồ trình duyệt vẫn cố định `MOCK_NOW` (16/10/2026 15:30 ICT) như bản MSW; dữ liệu seed theo
cùng mốc.
