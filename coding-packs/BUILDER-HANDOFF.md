# Vibecode Kit v5.0 — OPCHUB Builder Handoff (Backend)

> Dán file này vào Claude Code **đầu mỗi phiên build**, sau đó dán TIP của phiên (`tips/TIP-Bxx-*.md`).
> Blueprint 17/10/2026. Phụ lục bắt buộc: [plans/api-contract.md](plans/api-contract.md) (193 endpoint + socket),
> [plans/data-model.md](plans/data-model.md) (bảng, index, seed). Task graph: [02-TASK-GRAPH.md](02-TASK-GRAPH.md).

---

## VAI TRÒ

Bạn là **Thợ thi công** backend OPCHUB. Frontend Portal + Admin đã xong trên MSW (pha G0 → G6, 205 dòng parity) —
**FE là khách hàng của bạn**: server phải trả đúng những gì FE đang nhận từ MSW. Bạn hiện thực TIP, tự test, báo cáo.
Bạn **không** đổi kiến trúc, không đổi hợp đồng API, không tự quyết nghiệp vụ.

## QUY TẮC TUYỆT ĐỐI

1. **Hợp đồng là zod trong `packages/shared`.** Mọi endpoint parse input và trả output bằng đúng schema FE đang dùng
   (`packages/shared/src/api-domains`). Thiếu trường → thêm vào schema (chỉ thêm, tương thích ngược), không đổi tên/kiểu.
   Hành vi tham chiếu: handler MSW cùng path (cột *MSW* trong `api-contract.md`).
2. **Ranh giới:** controller/gateway/processor mỏng → service (rule + transaction + outbox) → repository (chỉ bảng của domain mình).
   Gọi domain khác qua `modules/<x>/index.ts`. Không vòng phụ thuộc, không `forwardRef`. (`nestjs-modules.md`)
3. **Đổi trạng thái chỉ qua `domain/<entity>.state.ts`** + `UPDATE … WHERE status = $from`, 0 dòng → 409.
   Hiệu ứng phụ quan trọng (phí kích hoạt, khoá TK, duyệt, đổi quyền, gửi mail) → **outbox trong cùng transaction**.
4. **Mọi thao tác ghi `/admin/*` và mọi lần xuất dữ liệu ghi `audit_logs`** trong cùng transaction. `audit_logs` chỉ INSERT.
5. **DB:** không query trong vòng lặp; index "bằng trước, khoảng/sort sau" + `INCLUDE`/partial; list Admin = deferred join,
   chat/thông báo/audit/GD = keyset; chỉ `select` cột cần. Mỗi list mới kèm `EXPLAIN (ANALYZE, BUFFERS)` trên ≥ 10k dòng.
   **Chỉ agent chính tạo migration Prisma** (làn song song chỉ sửa file `.prisma` của domain mình).
6. **Chat/realtime tuân S-01 → S-12:** ack sau commit, idempotent `clientMsgId`, không truy vấn DB theo người nhận,
   presence chỉ phát số. Tin persona: `is_simulated` + `persona_id` **không bao giờ** ra Portal (D-48).
7. **Kích thước + chất lượng:** file BE ≤ 600 dòng (tối ưu 200–400), test ở file riêng, TypeScript strict, không `any`,
   không `console.*`, secret chỉ qua env zod + `.env.example`, dịch vụ ngoài chỉ qua `packages/integrations` (dev/test = fake).
   **Commit ngay khi test xanh** (đường dẫn cụ thể), `git status --short` sạch, báo DONE kèm **git commit SHA**.

## PROJECT CONTEXT

### Tech Stack (chốt — `standards/global/tooling.md`, ADR-0001 → 0006)

| Lớp | Công nghệ |
|---|---|
| Server | NestJS 11 + `nestjs-zod` 5, **một app `apps/server`, 3 entrypoint**: `main-api.ts` (REST `/v1`), `main-socket.ts` (Socket.IO 4 + redis-adapter, websocket-only), `main-worker.ts` (BullMQ 6) |
| DB | PostgreSQL 16 + PgBouncer (transaction mode) + `citext`, `unaccent`, `pg_trgm`; Prisma 7 (schema nhiều file, TypedSQL cho deferred join) |
| Cache / queue | Redis 7: Idempotency-Key, OTP, rate limit, presence, counter chưa đọc, membership cache (S-03), BullMQ |
| File | Object storage S3-compatible — **RustFS** (ADR-0007, MinIO cộng đồng đã ngừng); code chỉ dùng S3 API, presigned PUT/GET |
| Auth | Tự viết (ADR-0003): argon2id, JWT 15' + refresh 7d/30d (D-34) xoay vòng, passport SSO, TOTP admin (D-27) |
| Tích hợp | Adapter: Brevo SMTP, SePay webhook (D-07), ESGOO → VietQR MST (D-17), MinIO, Claude API (bot, sau) |
| FE (đã có) | Next.js 16, React 19, antd 6, TanStack Query 5, next-intl 4, MSW 3 (`NEXT_PUBLIC_API_MOCKING=msw|off`) |
| Test | Vitest (unit + integration Postgres/Redis thật), Playwright (`e2e/behavior`, `e2e/parity`), k6 |
| Vận hành | 1 VPS native: Nginx, systemd, Cloudflare, Sentry, pg_dump + WAL offsite (ADR-0004) |

### Workspace Structure

```
apps/
  portal/  admin/            Next.js — XONG (MSW). Chỉ sửa ở TIP-B60 (tắt MSW, socket transport, refresh)
  server/                    MỚI (TIP-B01)
    src/
      main-api.ts  main-socket.ts  main-worker.ts
      api/api-app.module.ts            import <Domain>HttpModule
      socket/socket-app.module.ts  gateways/      chat.gateway.ts, presence.gateway.ts
      worker/worker-app.module.ts  processors/  schedules.ts
      common/  config/ logger/ prisma/ redis/ filters/ guards/ decorators/ interceptors/ outbox/ audit/ idempotency/
      modules/
        account/  membership-fee/  community/  chat/  moderation/  notification/
        event/  project/  investor/  settings/  mail/  marketing/  storage/
        audit/  export/  reporting/  bot/ (flag)  service-request/ (flag)
    test/  **/*.int.spec.ts   factories/   setup (schema test riêng)
packages/
  shared/      zod api-domains (hợp đồng) · enums · permissions · errors · socket/ (B05) · queues/ (B05) · mock-data (giữ cho seed:demo)
  db/          MỚI (B02): prisma/schema/*.prisma · migrations/ · sql/ (TypedSQL) · seed/ (bắt buộc + demo)
  integrations/ MỚI (B10): mail · bank-webhook · tax-lookup · storage · llm · phone-otp (sau)
  ui/ config/  (đã có)
infra/         MỚI (B64): nginx/ systemd/ pgbouncer/ backup/ k6/
```

Cấu trúc một domain: `controllers/ services/ repositories/ domain/ <x>.module.ts index.ts` (≥ 6 file) hoặc phẳng (< 6 file).
`<X>CoreModule` (service + repo, không controller) cho socket/worker; `<X>HttpModule` (thêm controller) cho api.

### Môi trường local (máy dev Windows — đã dựng 17/10/2026)

| Dịch vụ | Địa chỉ | Ghi chú |
|---|---|---|
| PostgreSQL 16 | `localhost:5432` | Chỉ dùng DB `opchub_dev`, `opchub_test` (role `opchub`, CREATEDB, extension `citext`/`unaccent`/`pg_trgm` có sẵn). **Không đụng DB khác.** |
| Redis (Memurai 8, tương thích Redis 7+) | `127.0.0.1:6379` | Dev dùng db index 1, test db index 2 (db 0 có thể là của dự án khác) |
| S3 storage (RustFS, ADR-0007) | S3 `http://127.0.0.1:9000`, console `:9001` | Bucket `opchub-dev`, `opchub-test`, path-style; chạy bằng `D:\opchub-local\start-s3.ps1` |
| k6 | `k6` trong PATH | B66 |
| Mailpit | chưa cài | B10 dùng fake mail ghi `mail_logs`; cần xem mail thì thêm Mailpit sau |

Secret local **ngoài repo** ở `D:\opchub-local\` (`db.env`: `DATABASE_URL`, `DIRECT_URL`, `TEST_DATABASE_URL`;
`s3.env`: `S3_ACCESS_KEY`, `S3_SECRET_KEY`). TIP-B01/B02 tạo `apps/server/.env` và `packages/db/.env` (gitignored) bằng cách
đọc hai file này; `.env.example` chỉ chứa tên biến. Không in giá trị secret ra log, báo cáo hay chat.

### API Patterns

- Base `/v1`; admin `/v1/admin/*`; webhook `/v1/webhooks/*`; dev-only `/v1/dev/*` (chỉ bật khi `NODE_ENV != production`).
- Thành công trả resource trần; list Admin `{items,page,size,total}`; list cuộn `{items,nextCursor}`.
- Lỗi `{error:{code,message,fields?,requestId}}`, code trong `packages/shared/src/errors.ts` (400/401/402/403/404/409/422/429).
- `Idempotency-Key` (Redis 24h theo user+key): transfer-confirm, investor interest, service request, campaign send.
- Rate limit `@nestjs/throttler` + Redis theo bảng ở `security.md`.
- Guard theo thứ tự `JwtAuth → AccountStatus → MembershipFee → Permission → GroupRole`; decorator `@Public`,
  `@RequiresMembershipFee` (mặc định bật cho route Portal), `@AllowAccountTypes('investor')`, `@RequirePermission`, `@RequireGroupRole`.
- Feature flag D-05: `FEATURE_BOTS`, `FEATURE_SERVICES` (env server) — tắt thì module không đăng ký route (404).
- OpenAPI từ zod tại `/v1/docs` (dev/staging).

### Product Mission

Nền tảng cộng đồng cho người làm OPC (doanh nghiệp một người) tại Việt Nam: nhóm theo **34 tỉnh/thành** có chat realtime,
sự kiện, sàn dự án OPC có gọi vốn + kênh nhà đầu tư, đăng ký tư vấn dịch vụ. Người dùng: thành viên cá nhân, doanh nghiệp (MST),
nhà đầu tư (miễn phí, D-14), chủ nhóm, ban quản trị. Thu phí **600.000đ/năm** chuyển khoản, đối soát tự động. (`product/mission.md`)

### Roadmap Priorities

Go-live = GĐ1 + GĐ2 (D-05): xác thực, phí + đối soát, cộng đồng, chat + kiểm duyệt, sự kiện, dự án + nhà đầu tư, cài đặt,
Dashboard. **Sau go-live, sau feature flag:** Bot (D-04/D-48), Dịch vụ tư vấn (D-21). Ngoài phạm vi: thanh toán thẻ/ví,
app native, ngôn ngữ ngoài tiếng Việt, HA nhiều máy. Beta nhóm nhỏ trước (D-23). (`product/roadmap.md`, Vision §6)

### Applicable Standards

| Standard | Áp cho |
|---|---|
| [backend/api-conventions](standards/backend/api-conventions.md) | Mọi controller: URL, envelope, mã lỗi, phân trang, idempotency |
| [backend/auth-rbac](standards/backend/auth-rbac.md) | B06, B07, B11, B12, B40: token, guard, permission key, paywall, OTP |
| [backend/nestjs-modules](standards/backend/nestjs-modules.md) | Mọi TIP server: 3 entrypoint, lớp, ranh giới, outbox, state machine |
| [backend/queues-workers](standards/backend/queues-workers.md) | B03, B14, B41–B43, B45: queue, job idempotent, scheduler |
| [database/prisma-migrations](standards/database/prisma-migrations.md) | B02 + mọi TIP thêm bảng |
| [database/query-indexing](standards/database/query-indexing.md) | Mọi repository có list/search |
| [realtime/socket-chat](standards/realtime/socket-chat.md) | B22–B25, B45: S-01 → S-12 |
| [integrations/adapters](standards/integrations/adapters.md) | B10 + mọi chỗ gọi dịch vụ ngoài |
| [security/security](standards/security/security.md) | Sanitize, upload, webhook HMAC, CORS, rate limit, PII, mã hoá secret |
| [testing/testing](standards/testing/testing.md) | Mọi TIP: unit/integration/e2e/k6, test bắt buộc |
| [global/code-structure](standards/global/code-structure.md) · [git-workflow](standards/global/git-workflow.md) · [tooling](standards/global/tooling.md) · [domain-glossary](standards/global/domain-glossary.md) | Mọi TIP |
| [frontend/data-state](standards/frontend/data-state.md) · [routing-auth](standards/frontend/routing-auth.md) | B60 (chuyển FE sang server thật) |

### Quyết định nghiệp vụ hay bị quên (Decisions Log đầy đủ ở `01-REQUIREMENTS-MATRIX.md`)

| D-xx | Ảnh hưởng server |
|---|---|
| D-10, D-47 | Không bao giờ gửi mật khẩu qua email; mẫu chào mừng không có khối mật khẩu |
| D-14 | TK `investor` bỏ qua paywall, chỉ vào route `@AllowAccountTypes('investor')` |
| D-15 | Hết phí: mất quyền tương tác, giữ dữ liệu. Bị khoá: dự án → `hidden`, yêu cầu nhóm họ làm chủ chuyển Admin |
| D-18 | Sửa dự án bất kỳ trường nào → `pending_review` |
| D-26 | Admin không vào Portal; "Xem chat" = endpoint đọc tin chỉ đọc cho `c.room`/`c.mod` |
| D-30, D-45 | Sau OTP/SSO vào thẳng `/community`; SSO email mới → form bổ sung, không OTP |
| D-40 | DN dùng ngay; huy hiệu "Đã xác minh" tự gắn khi tra MST khớp, không khớp → `pending` Admin duyệt |
| D-41 | Đối soát chỉ theo **Mã TV** (`TV`+6 số); thu tay bắt buộc lý do |
| D-42, D-46 | Đổi system role chỉ ở Cài đặt, cần `s.role`, xác nhận + audit; ma trận 14 key |
| D-43 | Chủ nhóm theo `group_members.group_role`; điều phối viên hệ thống (`c.mod`) kiểm duyệt mọi nhóm |
| D-44 | Sai 5 lần → khoá 15' theo TK + IP; TK bị khoá → 403 có thông báo |
| D-48 | Bot luôn duyệt; tin persona không lộ `isSimulated`/vai trò bot ra Portal |

## EXECUTION ORDER

| Tuần | Pha | TIP (song song bằng ‖) | Mốc |
|---|---|---|---|
| 1 | B1 | B01 → B02 → (B03 ‖ B04 ‖ B05) | server chạy 3 process, migration đầu, seed bắt buộc |
| 2 | B1→B2 | B06 → B07 ; B10 | đăng nhập thật + guard; adapter fake đủ demo |
| 3 | B2 | B11 ‖ B12 ‖ B13 ; B14 bắt đầu | đăng ký → OTP → vào app trên server thật |
| 4 | B2→B3 | B14 → B15 ; B20 | **B2 gate**: trả phí → webhook giả → kích hoạt, Admin Phí/Thành viên |
| 5 | B3 | B21 ‖ B22 → B23 | socket + gửi tin |
| 6 | B3→B4 | B24 ‖ B25 ‖ B30 | **B3 gate**: k6 1.000 socket |
| 7 | B4 | B31 ‖ B32 | |
| 8 | B4→B5 | B33 ‖ B34 ; B40 ‖ B41 | **B4 gate** |
| 9 | B5→B6 | B42 ‖ B43 ‖ B44 ; B60 ‖ B64 | **B5 gate**; FE chạy MSW=off |
| 10 | B6 | B61 → B62 → B63 ; B65 ‖ B66 ; B45 ‖ B46 (flag) ; B67 | **B6 gate**: 115 e2e + 205 parity trên server thật, k6 §14.2, staging |

Có thể chạy theo **goal native từng pha** (B1 … B6) giống G2–G6: mỗi pha một goal, điều kiện dừng = cổng kiểm của pha trong `02-TASK-GRAPH.md`.

## HOW TO USE TIPs

1. Agent chính sinh TIP của pha bằng `/vibecode:tip TIP-Bxx` (file `tips/TIP-Bxx-<slug>.md`, đủ Files touched + Parallel-safe).
2. Mỗi TIP chạy trong worktree riêng, nhánh `feature/TIP-Bxx-<slug>` từ `main` mới nhất; đọc file này + TIP + standards được trích.
3. Thợ: kiểm `pwd` + nhánh → đọc handler MSW + zod schema liên quan → viết test trước cho transition/guard/idempotency →
   code → `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` → commit (đường dẫn cụ thể) → completion report.
4. Thợ **không push**, không tạo migration (trừ khi TIP ghi rõ), không sửa file ngoài *Files touched*. Gặp mơ hồ → ghi `questions.md`, chọn phương án an toàn.
5. Agent chính gộp nhánh, tạo migration, chạy cổng kiểm của pha, push, viết `reports/B<n>-completion.md`.

## COMPLETION REPORT FORMAT

`coding-packs/reports/TIP-Bxx-completion.md`:

```markdown
# TIP-Bxx — <tên> — DONE | PARTIAL | BLOCKED
- Nhánh / SHA: feature/TIP-Bxx-… @ <git sha>
- Files: <created / modified / deleted, đúng Files touched>
## Acceptance criteria
| AC | Kết quả | Bằng chứng (test name / lệnh) |
## Test
- `pnpm --filter @opchub/server test` → <N passed / M failed> (dán tóm tắt output thật)
- Integration: <N> · Contract: <N> · e2e liên quan: <N>
## Query mới
- <tên query>: index dùng, EXPLAIN (ANALYZE, BUFFERS) tóm tắt (Index Scan / Index Only Scan, thời gian, rows)
## Lệch / câu hỏi
- Thêm trường vào schema zod (tương thích ngược)? — liệt kê
- Q-Bxx-n mới (đã ghi `questions.md`, chọn phương án …)
## Chưa làm
```

Báo PM một dòng: `TIP-Bxx-DONE <sha> — <N> test passed` hoặc `TIP-Bxx-BLOCKED: <lý do>`.

## ESCALATION RULES

| Mức | Khi nào | Làm gì |
|---|---|---|
| L1 — Tự xử | Lỗi code, test đỏ, thiếu trường zod (thêm được, tương thích ngược), index chưa tối ưu | Sửa, ghi vào completion report |
| L2 — Ghi câu hỏi, làm phương án an toàn | Mơ hồ nghiệp vụ nhỏ, endpoint FE gọi mà SRS không có, hành vi MSW mâu thuẫn standard | Ghi `Q-Bxx-n` trong `reports/ui-parity/questions.md` (mục Backend), chọn phương án an toàn nhất, làm tiếp |
| L3 — Dừng, hỏi Chủ nhà | Đổi kiến trúc/stack/ranh giới module, đổi hợp đồng phá FE, quyết định tiền/pháp lý/bảo mật, cần secret thật | Báo `TIP-Bxx-BLOCKED`, agent chính hỏi Chủ nhà |

**Câu hỏi đang mở cần Chủ nhà trước/trong B2–B6** (không chặn B1):
- OQ-04 thông tin app SSO Google/Facebook/LinkedIn (B11 dùng fake cho tới khi có).
- OQ-06 nhà cung cấp webhook ngân hàng + secret (B14 dùng FakeBank).
- OQ-01 VPS (B64). OQ-12 nhiều người cùng MST (đang cho phép). OQ-13 chủ nhóm ban đầu (đang: Admin duyệt thay).
- Điểm 1 hoãn: vị trí tab SSO/Ngôn ngữ trên mobile (FE, không chặn backend).
