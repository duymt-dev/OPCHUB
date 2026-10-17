# TIP-B60: FE chạy trên server thật (`NEXT_PUBLIC_API_MOCKING=off`)

## HEADER
- TIP-ID: TIP-B60 · Module: portal + admin (lib, auth, chat transport, shell, overview, uploads) · Priority: P0 · Depends on: B23, B30, B44 · Estimated: L (10h)
- **Files touched:**
  - `apps/{portal,admin}/next.config.ts` (modify: rewrite `/v1/*` → `API_PROXY_URL` khi đặt)
  - `apps/{portal,admin}/src/lib/env.ts` (modify: `NEXT_PUBLIC_SOCKET_URL`)
  - `apps/{portal,admin}/src/lib/api-client.ts` (modify: 401 → `POST /auth/refresh` một lần, thử lại)
  - `apps/{portal,admin}/src/lib/session.ts` (create: refresh + bootstrap phiên dùng chung)
  - `apps/{portal,admin}/src/features/auth/components/auth-gate.tsx` (modify: thử refresh trước khi chuyển /login)
  - `apps/portal/src/features/chat/socket-transport.ts` (create), `chat/transport.ts` (modify: chọn transport)
  - `apps/admin/src/features/shell/api.ts` (modify: `/admin/badges`), `admin/src/features/overview/**` (modify: `/admin/overview`)
  - `apps/{portal,admin}/.env.example` (modify)
  - test `*.spec.ts` cạnh nguồn
- **Parallel-safe with:** B64, B65 (không chung file). `sequential` với B61–B63 (cần B60).

## CONTEXT
- FE đang gọi `NEXT_PUBLIC_API_URL='/v1'` tương đối; MSW bật mặc định. Server: API `API_PORT`, socket `SOCKET_PORT`, refresh cookie `opchub_rt` path `/v1/auth`.
- Prod: Nginx gom `/v1` + `/socket.io` cùng origin (B64). Dev/e2e: Next rewrite `/v1` → API (cùng origin, cookie hoạt động), socket kết nối thẳng `NEXT_PUBLIC_SOCKET_URL` (token trong `auth`).

## APPLICABLE STANDARDS
- [frontend/data-state](../standards/frontend/data-state.md) · [frontend/routing-auth](../standards/frontend/routing-auth.md) · [realtime/socket-chat](../standards/realtime/socket-chat.md)

## SPECIFICATIONS
1. Không đổi hợp đồng: mọi response vẫn parse bằng zod như cũ.
2. `api()`: 401 (trừ chính `/auth/*`) → gọi refresh **một lần dùng chung** (single-flight) → có token mới thì thử lại request; refresh hỏng → `clear()` + ném lỗi gốc.
3. AuthGate: chưa có `me` → thử `POST /auth/refresh` (cookie) + `GET /me`; thành công giữ trang, thất bại mới `/login?next=`.
4. Chat: `NEXT_PUBLIC_API_MOCKING=off` → socket transport (`message.send/react/pin` emitWithAck, `room.join/leave`, `message.new` → `onMessage`), ack parse zod; MSW → giữ `restTransport`.
5. Admin: badge sidebar = `GET /admin/badges`; Tổng quan đọc `GET /admin/overview` (giữ giao diện, số cứng chỉ là fallback lúc tải).
6. Ảnh: giữ data URL (server nhận — Q-B30-1); presign để sau (ghi Q-B60-x).

## ACCEPTANCE CRITERIA
- Given MSW off + server chạy When đăng nhập TK demo Then vào `/dashboard`, F5 vẫn đăng nhập (refresh cookie).
- Given access token hết hạn When gọi API Then tự refresh, request thành công, không văng ra login.
- Given 2 tab cùng phòng When tab A gửi tin Then tab B nhận qua `message.new` không cần tải lại.

## CONSTRAINTS
- DO NOT: lưu token vào localStorage; gọi socket khi MSW bật; đổi schema shared.
- REUSE: `apiErrorSchema`, `chatMessageSchema`, `serverEvents/clientEvents` ở `packages/shared/src/socket`.

## ⚠️ BUILDER-CHECKLIST
- [ ] FE file ≤ 400 dòng (tối ưu 150–250), page chỉ orchestrator
- [ ] Không `any` / `@ts-ignore`; ack socket parse zod
- [ ] Unit test refresh single-flight + transport chọn đúng; `pnpm lint typecheck test` xanh, paste số thật
- [ ] Commit `git commit -- <paths>`, SHA trong báo cáo
