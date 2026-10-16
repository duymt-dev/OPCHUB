# Standards Index

Rule cho coding agent. Tóm tắt bắt buộc ở `AGENTS.md` gốc repo; file dưới đây là chi tiết.

| Area | Standard | Description |
|------|----------|-------------|
| backend | [api-conventions](backend/api-conventions.md) | URL, response/list/error envelope, mã lỗi, phân trang, idempotency |
| backend | [auth-rbac](backend/auth-rbac.md) | JWT, guard, permission key, Chủ nhóm, paywall, mật khẩu/OTP |
| backend | [nestjs-modules](backend/nestjs-modules.md) | `apps/server` 3 entrypoint, cấu trúc module domain, ranh giới, outbox, state machine, transaction |
| backend | [queues-workers](backend/queues-workers.md) | BullMQ: tên queue, payload, idempotent job, retry, scheduler |
| database | [prisma-migrations](database/prisma-migrations.md) | Đặt tên bảng/cột, kiểu dữ liệu, migration SQL tay, seed |
| database | [query-indexing](database/query-indexing.md) | Index, deferred join, keyset, cấm N+1, cập nhật có điều kiện |
| frontend | [antd-ui](frontend/antd-ui.md) | Theme, AdminTable, form, paywall modal, rich text, responsive, a11y |
| frontend | [data-state](frontend/data-state.md) | Phân loại state, api-client + xử lý lỗi, TanStack Query, socket → cache, form |
| frontend | [nextjs-structure](frontend/nextjs-structure.md) | App Router, feature folder, server/client component, hiệu năng, env, i18n, SEO |
| frontend | [routing-auth](frontend/routing-auth.md) | Phiên đăng nhập, refresh, bảo vệ route, paywall gate, URL state |
| frontend | [ui-parity](frontend/ui-parity.md) | Dựng UI theo prototype: được/không được lấy gì, MSW, đo chênh ≤ 3%, thứ tự làm |
| global | [code-structure](global/code-structure.md) | Giới hạn dòng, ranh giới import, đặt tên, TypeScript, comment, lỗi, log |
| global | [domain-glossary](global/domain-glossary.md) | Thuật ngữ nghiệp vụ ↔ tên trong code, giá trị enum trạng thái |
| global | [git-workflow](global/git-workflow.md) | Nhánh, Conventional Commits, DONE + SHA, env |
| global | [tooling](global/tooling.md) | Phiên bản chốt, ESLint/boundaries/lefthook ép rule, CI, ADR |
| integrations | [adapters](integrations/adapters.md) | Interface adapter, fake provider, timeout/fallback, webhook raw |
| realtime | [socket-chat](realtime/socket-chat.md) | Socket.IO: auth, room, gửi tin, presence, reconnect, rate limit (S-01 → S-12) |
| security | [security](security/security.md) | Sanitize, upload, webhook HMAC, token cookie, CORS, PII, SQL raw |
| testing | [testing](testing/testing.md) | Vitest / integration / Playwright UAT / k6, test bắt buộc, vị trí file |
