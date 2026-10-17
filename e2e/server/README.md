# e2e trên server thật (TIP-B62 / B63)

Chạy 115 test hành vi (`behavior/`) và parity (`parity/`) với `NEXT_PUBLIC_API_MOCKING=off`: Portal/Admin gọi API
NestJS thật trên DB `opchub_dev` (đã `seed:demo`), Redis db 1.

## 1. Server (api + socket + worker)

`apps/server/.env` (gitignored) cần thêm cho dev/e2e một máy:

```
RATE_LIMIT_DISABLED=true      # mọi request từ 127.0.0.1 → rate limit sẽ chặn e2e/k6 (server cấm ở production)
STORAGE_PROVIDER=local        # ảnh upload lưu đĩa, phục vụ qua /v1/uploads/* (không cần RustFS)
LOCAL_STORAGE_DIR=D:/opchub-local/uploads
PORTAL_URL=http://localhost:3100
CORS_ORIGINS=http://localhost:3100,http://localhost:3101,http://localhost:3000,http://localhost:3001
```

```bash
pnpm --filter @opchub/server build
pnpm --filter @opchub/server start:api     # :4000
pnpm --filter @opchub/server start:socket  # :4001
pnpm --filter @opchub/server start:worker
```

## 2. Build Portal/Admin chế độ server (thư mục `.next-server`, không đè bản MSW)

```bash
NEXT_DIST_DIR=.next-server NEXT_PUBLIC_API_MOCKING=off API_PROXY_URL=http://127.0.0.1:4000 \
  NEXT_PUBLIC_SOCKET_URL=http://localhost:4001 pnpm --filter @opchub/portal --filter @opchub/admin build
```

## 3. Chạy

```bash
cd e2e
pnpm e2e:server --project behavior          # globalSetup: kiểm /v1/health + seed:demo (reset dữ liệu demo)
PARITY_IDS='*' pnpm e2e:server --project parity
SKIP_SEED=1 pnpm e2e:server --project behavior -g "Chat"   # chạy lại một phần, không reset
```

Cổng: Portal 3100, Admin 3101 (`SERVER_PORTAL_PORT` / `SERVER_ADMIN_PORT`); test chạy tuần tự (`SERVER_WORKERS=1`)
vì dùng chung một DB. Đồng hồ trình duyệt vẫn cố định `MOCK_NOW` (16/10/2026 15:30 ICT) như bản MSW; dữ liệu seed theo
cùng mốc.
