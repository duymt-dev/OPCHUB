# Vibecode Kit v5.0 — OPCHUB Builder Handoff (Backend)

> Dán file này vào Claude Code **đầu mỗi phiên build**, sau đó dán TIP của phiên (`tips/TIP-<id>-*.md`).
> **Hiện hành (04/11/2026): v4.6** — goal [plans/GOAL-V4.6.md](plans/GOAL-V4.6.md) (12 TIP V46-801 → 812), quyết định D-118 → D-131,
> REQ-616 → 630, đối chiếu đặc tả ↔ code [audit/SPEC-V4.6-DELTA.md](audit/SPEC-V4.6-DELTA.md). Khi file này trái `AGENTS.md` hoặc GOAL, lấy `AGENTS.md` / GOAL.
> Blueprint gốc 17/10/2026. Phụ lục bắt buộc: [plans/api-contract.md](plans/api-contract.md) (193 endpoint + socket),
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
        audit/  export/  reporting/  bot/  service-request/ (FEATURE_SERVICES)
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
- Feature flag: chỉ còn `FEATURE_SERVICES` (env server, mặc định bật) — tắt thì module không đăng ký route (404). **Bot không còn flag env**
  (owner amendment 22/10/2026): luôn đăng ký, kiểm bằng permission key + cài đặt `bot.enabled` / tắt khẩn cấp có audit.
- OpenAPI từ zod tại `/v1/docs` (dev/staging).

### Product Mission

Nền tảng cộng đồng cho người làm OPC (doanh nghiệp một người) tại Việt Nam: nhóm theo **34 tỉnh/thành** có chat realtime,
sự kiện, sàn dự án OPC có gọi vốn + kênh nhà đầu tư, đăng ký tư vấn dịch vụ. Người dùng: thành viên cá nhân, doanh nghiệp (MST),
nhà đầu tư (miễn phí, D-14), chủ nhóm, ban quản trị. TK mới **miễn phí 3 tháng**, sau đó Gói Cá nhân / Doanh nghiệp theo giá Admin cấu hình (mặc định 1.200.000đ / 3.600.000đ/năm), Gói Gọi vốn 15.000.000đ/dự án/6 tháng; VietQR + đối soát tự động (D-94, D-104). (`product/mission.md`)

### Roadmap Priorities

Go-live = GĐ1 + GĐ2 + Bot + Dịch vụ + Affiliate (D-51), cộng phạm vi v4 (D-74), v4.2 (D16) và **v4.6 (D17)**: GĐ Vùng + chia sẻ
doanh thu §31, nhắc gia hạn, đối soát ngân hàng, tìm kiếm chung, gợi ý nhu cầu, trang công khai gian hàng, nhà cung cấp AI nhiều bên.
Ngoài phạm vi: thanh toán thẻ/ví, app native, HA nhiều máy, **Zalo ZNS và gửi Web Push thật** (D-125), chi trả trực tiếp cho affiliate (D-119).
Beta nhóm nhỏ trước (D-23). (`product/roadmap.md`, Vision §6)

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
| ~~D-18~~ → D-108 | ~~Sửa dự án → `pending_review`~~ Dự án hiện ngay, Admin hậu kiểm, sửa không duyệt lại |
| D-26 | Admin không vào Portal; "Xem chat" = endpoint đọc tin chỉ đọc cho `c.room`/`c.mod` |
| D-30, D-45 | Sau OTP/SSO vào thẳng `/community`; SSO email mới → form bổ sung, không OTP |
| D-40 | DN dùng ngay; huy hiệu "Đã xác minh" tự gắn khi tra MST khớp, không khớp → `pending` Admin duyệt |
| ~~D-41~~ → D-104, D-123 | ~~Đối soát chỉ theo Mã TV~~ Tiền tố `OPCHUB`, số tiền đúng bằng giá gói; thu tay vẫn bắt buộc lý do |
| ~~D-42, D-46~~ → D-52 | Đổi vai trò quản trị chỉ ở Cài đặt, xác nhận + audit; permission key `<menu>.view` / `<menu>.action` (`packages/shared/src/permissions.ts`) |
| D-43 | Chủ nhóm theo `group_members.group_role`; điều phối viên hệ thống kiểm duyệt mọi nhóm (phần duyệt vào nhóm bỏ theo D-71) |
| D-44 | Sai 5 lần → khoá 15' theo TK + IP; TK bị khoá → 403 có thông báo |
| ~~D-48~~ → D-50, D-99 | Bot **tự động, không duyệt**; tin persona không lộ `isSimulated` / vai trò bot ra Portal, không gắn nhãn |

### Quyết định v4.6 (30/10/2026) — HIỆN HÀNH, thắng mọi bảng bên dưới khi trái nhau

Nguồn: `docs/spec/` v4.6 (§33 > §32 > §31 > §29 > §28 > §27 > §1–26; §30 bị §31 thay), prototype v4.6 thắng đặc tả (D-89, D-93, D-118),
nút no-op vẫn làm nghiệp vụ (D-95). Đối chiếu: `audit/SPEC-V4.6-DELTA.md`. Câu hỏi đội đặc tả (không chặn code): OQ-22, OQ-23.

| D-xx | Ảnh hưởng server / FE |
|---|---|
| D-119 | Chia sẻ doanh thu §31: Media Soft **chỉ chi cho GĐ Vùng**; phần GĐ Vùng năm y = `max(tối thiểu, năm1 − giảm × (y − 1))`, mặc định 50 / 10 / 20 → 50 / 40 / 30 / 20%, **3 thông số đọc từ Chính sách** (không hằng số trong code). Áp cho Cá nhân, DN, Gọi vốn; chỉ phí thực thu đã đối soát của TV đăng ký qua link affiliate (cookie 30 ngày, lần giới thiệu đầu); trial / 0đ / huỷ không tính; làm tròn đến đồng. Hoa hồng affiliate **vẫn tính %** để tham khảo, **bỏ chi trả trực tiếp**. Chưa go-live → không chuyển số dư; seed / MSW sinh lại |
| D-120 | GĐ Vùng: **3 vùng cố định** (Bắc / Trung & Tây Nguyên / Nam), **mỗi vùng đúng 1**, mỗi TV 1 vùng, mỗi tỉnh 1 vùng; chỉ TV đã đăng ký, không bị khoá. Trạng thái phí mới **"Miễn phí · GĐ Vùng"** qua `isFeeUsable` (V-11), paywall + nhắc phí bỏ qua; thu hồi → hạn phí trước bổ nhiệm còn thì dùng tiếp (kể cả trial), hết → `pending_payment` (BR-462). EM-GDV1/2 không mật khẩu; permission key riêng (Super Admin, Quản trị viên có mặc định); audit; phần đã ghi nhận trước thu hồi vẫn chi (GDV-R05) |
| D-121 | Affiliate thuộc GĐ Vùng **tự theo tỉnh** nhóm cộng đồng; **Admin không đổi tay**; vùng trống → **100% Media Soft**; bổ nhiệm mới chỉ tính giao dịch từ ngày bổ nhiệm, không truy thu |
| D-122 | Năm của khách tính từ **giao dịch thực thu đầu tiên** (mọi loại gói); năm 1 = 12 tháng từ ngày đó; backfill từ khoản đầu đã đối soát |
| D-123 | Nội dung CK **giữ `OPCHUB …`** (D-104, D-105) dù §33.3 ghi `OPC <SĐT> <GÓI>`; màn Đối soát ngân hàng hiển thị cú pháp `OPCHUB` |
| D-124 | Nhà cung cấp AI: **ẩn dòng "Trợ lý OPC Hub (widget)"** (giữ D-92) |
| D-125 | **Không Zalo ZNS** (ẩn kênh Zalo ở Nhắc gia hạn); **PWA / Web Push**: chỉ màn cấu hình lưu được, không gửi đẩy thật; cổng đối soát dùng adapter `bank-webhook` hiện có |
| D-126 | Thứ tự: GĐ Vùng + chia sẻ + Vùng của tôi → Nhắc gia hạn + Đối soát ngân hàng → Nhóm 1 + chuyển đổi vùng + nhật ký / CSV + copy → Tìm kiếm + gợi ý nhu cầu → `/g/` → AI → PWA (= V46-801 → 812) |
| D-127 | Theo prototype: copy đăng nhập / chào; BR-461 đếm đã đọc chỉ khi đổi phòng / có tin mới; BR-463 không tạo hoa hồng 0đ, ẩn khoản 0đ cũ; BR-465 tự mở khoá lúc đăng nhập + job; BR-495 nhãn affiliate gọn |
| D-128 | Affiliate nhiều nhóm tỉnh → tỉnh của **nhóm tham gia sớm nhất còn là thành viên** (nhóm ngành lấy tỉnh nhóm cha); vùng chụp vào từng khoản lúc đối soát, không tính lại khoản cũ; không còn nhóm → 100% Media Soft |
| D-129 | Tỉnh chưa được tick → tính cho **GĐ Vùng của miền**; tỉnh phụ trách chỉ hiển thị, không quyết định tiền; "vùng trống → Media Soft" chỉ khi cả miền chưa có GĐ Vùng |
| D-130 | Năm của khách tính từ giao dịch thực thu đầu tiên **gồm cả Gọi vốn**; backfill lấy khoản đã đối soát sớm nhất của cả phí và Gọi vốn |
| D-131 | Hoa hồng affiliate theo năm của khách: năm 1 = % hiện hành, năm 2 → `renewalMaxYear` = `renewalRate`, sau đó không ghi khoản; snapshot `commissions.customer_year`; vẫn chỉ tham khảo (D-119) |

v4.6 thay ở các bảng bên dưới: D-94 3A / D-110 phần **chi trả hoa hồng** → D-119 (hoa hồng chỉ tham khảo); hoa hồng Gọi vốn 10% (D-70, §29) → D-119;
nhắc phí T-30 / T-7 / T-0 / T+3 (D-57) → mốc 30 / 7 / 1 ngày cấu hình được (REQ-620).

### Quyết định v4.2 (27/10/2026) — còn hiệu lực trừ chỗ v4.6 thay

Nguồn: `docs/spec/` v4.2 (§29 > §28 > §27), prototype thắng đặc tả (D-93), nút no-op vẫn làm nghiệp vụ (D-95).
Rà soát + bằng chứng file:dòng: `audit/SPEC-V4.2-FULL-AUDIT.md`. Vision cập nhật: `00-PROJECT-CONTEXT.md` §5, S-03 / S-08 / S-11, V-11 → V-15.

| D-xx | Ảnh hưởng server / FE |
|---|---|
| D-94 1A, 2A | `MembershipFeeStatus` thêm `trial` (90 ngày, đủ quyền theo gói). **Mọi cổng quyền dùng một hàm** (JWT claim, socket, upload, explore, onboarding) — BR-TRIAL-05, V-11. TK cũ chưa đóng phí → trial từ `created_at`, quá 90 ngày → `expired` |
| D-94 3A, D-110 | Đại lý tạo **khi đăng ký** (mọi TV, trừ investor), mã **luôn hoạt động** (bỏ tạm dừng theo phí); hoa hồng chỉ khi trả phí thật; cột `plan` snapshot; khôi phục Đã hủy; làm tròn đến đồng |
| D-94 5A | Bảng `price_config` (lịch sử + audit, cache Redis) thay mọi hằng số giá (`plans.ts`, `FUNDRAISING_PLAN`) ở server + FE; tab Cài đặt "Cấu hình bảng giá" (`settings.general`) |
| D-94 4B, D-105, D-106 | Gọi vốn **1 dự án / khoản**; nội dung `OPCHUB [TV] [SĐT] GV[mã]`; gia hạn giá `fund.r` chỉ khi đã hết hạn |
| D-96 | VietQR EMVCo sinh ở server (V-13); ảnh lỗi → QR tĩnh |
| D-104 | Đối soát §28.1: bắt buộc tiền tố `OPCHUB`, **đúng bằng** giá gói; sai / thiếu / thừa → hàng đối soát tay (thay D-41) |
| D-107 | Lọc phí Admin: Đã đóng (phí thật) · Miễn phí 3 tháng · Chưa đóng / Hết hạn; thẻ "Phí" chỉ phí thật |
| D-108, D-109 | Dự án **hiện ngay** khi chủ đã kích hoạt, Admin hậu kiểm, sửa không duyệt lại (thay D-18); chủ hết hạn → dự án rời Khám phá |
| D-97, D-114 | Trình tạo gian hàng 5 bước + media; gian hàng tự tạo = Nháp (cả khi trial); migration Nháp cho DN chưa có (thay D-84); gian hàng đang hiện giữ nguyên; chỉ DN (D-75) |
| D-98, D-117 B5/B6 | File chia sẻ theo nhóm; 20 MB; chặn file thực thi (đuôi + MIME + magic bytes); GET qua URL ký ngắn hạn (V-15) |
| D-99, D-112 | Bot: lịch, trả lời từng tin (giây, ≤ 12 tin/phút/nhóm, ≤ 60/phút toàn hệ thống), AI tạo hàng loạt; LLM cấu hình trong Admin, mã hoá như SMTP (ADR-0008); không nhãn |
| D-100, D-115 | Bỏ cột / lọc / nút Nhắc Khởi đầu; tự nhắc lần mở Portal đầu tiên trong ngày, không email |
| D-111 | Chủ đề chat: đổi tên + xoá mềm, "Chung" khoá |
| D-113 | Email biên nhận; khớp tay khoản Gọi vốn; từ chối → bổ sung → duyệt lại; nhắc T-7 / T-0 trước hết trial |
| D-116 | Huỷ khoản chờ 600.000đ cũ; hết trial trả giá cấu hình |
| D-117 | Sửa B1 → B6 (xem audit) — làm trước |

### Quyết định v4 (SRS-4.0, 23/10/2026) — thiết kế chi tiết ở `plans/V4-BLUEPRINT.md` (bị v4.2 thay ở D-18, D-41, D-68/69 phần giá, D-70 phần làm tròn, D-82, D-84, D-88)

| D-xx | Ảnh hưởng server |
|---|---|
| D-67 | Nguồn sự thật = `docs/spec/dac-ta.html` SRS-4.0, §27 > §1–26; mâu thuẫn → hỏi owner |
| D-68, D-69 | Giá gói chỉ đọc từ `packages/shared/src/membership/plans.ts`; `MembershipFee.plan` theo `account_type` khi tạo kỳ; kỳ cũ/đang chờ giữ `amount` |
| D-70 | Hoa hồng = floor(% × phí thực trả); Gọi vốn 10% khi Admin duyệt, unique `(source, sourceId)` |
| D-71 | Không còn join request: đã đóng phí → `member` ngay + outbox `group.joined` |
| D-72 | Không có `InvestorInterestStatus`, `InvestorComment`, `ServiceRequestStatus`, assignee; danh mục dịch vụ CRUD |
| D-73 | Không đăng ký schedule `campaigns-due`; code marketing giữ nguyên |
| D-75, D-84 | `Store` tự tạo (draft) bởi handler `membership.activated` khi TK DN; không backfill; chỉ chủ gian hàng đăng nhu cầu |
| D-77, D-83 | Vi phạm đếm trong 90 ngày, chưa khôi phục; ≥ 2 → khoá `locked_until` N ngày (1/3/7/14/30, mặc định 7), job tự mở |
| D-81 | Ngân hàng vẫn fake provider; Gọi vốn dùng mã `GV`+6 số qua cùng adapter |
| D-85, D-88 | 8 bước onboarding tính từ dữ liệu thật; bảng `onboarding_progress` cho cột Admin; Nhắc ≤ 1 lần/ngày/thành viên |
| D-86 | Test nghiệm thu theo §27; ca §26 mâu thuẫn bỏ |

## EXECUTION ORDER

### V4.6 (hiện hành — `plans/GOAL-V4.6.md`, đồ thị ở `02-TASK-GRAPH.md` › V4.6)

Tuần tự **một TIP một lúc**, TIP viết ngay trước khi code bước đó (`/vibecode:tip`), nhánh xếp chồng, PR vào `dev`, không tự merge.

| # | TIP | Nội dung | Mốc |
|---|---|---|---|
| 1 | V46-801 | GĐ Vùng — dữ liệu + bổ nhiệm / thu hồi, trạng thái phí "Miễn phí · GĐ Vùng" | |
| 2 | V46-802 | Sổ chia sẻ Media Soft ↔ GĐ Vùng, năm của khách, kỳ chi, Chi trả | |
| 3 | V46-803 | Admin › Affiliate: Chính sách §31, Hoa hồng chỉ tham khảo, cột vùng | |
| 4 | V46-804 | Portal › Affiliate › Vùng của tôi + banner, nhãn gọn | **M1** |
| 5 | V46-805 | Nhắc gia hạn 30 / 7 / 1 (Email + Thông báo) | |
| 6 | V46-806 | Cài đặt › Đối soát ngân hàng | |
| 7 | V46-807 | Nhóm 1 (BR-461 / 463 / 465) + nhật ký / CSV + chuyển đổi vùng + copy | **M2** |
| 8 | V46-808 | Tìm kiếm chung topbar | |
| 9 | V46-809 | Gợi ý nhu cầu phù hợp gian hàng | |
| 10 | V46-810 | Trang công khai `/g/<slug>` | |
| 11 | V46-811 | Nhà cung cấp AI nhiều bên + màn Ứng dụng & thông báo | |
| 12 | V46-812 | Parity v4.6 + nghiệm thu AT-GDV01 → 07, TC-461 → 494 | **M3** |

Tiến độ: `reports/V4.6-progress.md`; mốc `reports/V4.6-M<n>-completion.md`.

### V4.2 (27/10/2026, đã xong — V42-701 → 714, `reports/V4.2-progress.md`)

1. Sửa lỗi B1 → B6 (D-117)
2. Trial + cổng quyền dùng chung + Cấu hình bảng giá (D-94 1A/2A/5A, D-107, D-116) — các phần sau phụ thuộc
3. Đối soát §28.1 + VietQR + Gọi vốn (D-96, D-104 → D-106, D-113)
4. Affiliate (D-94 3A, D-110)
5. Khởi đầu + Admin (D-100, D-101, D-115)
6. Chat: chủ đề + File chia sẻ (D-98, D-111)
7. Gian hàng + dự án (D-97, D-108, D-109, D-114)
8. Bot (D-99, D-112)

### V4 (23/10/2026, đã xong)

| Tuần | Pha | TIP (song song bằng ‖) | Mốc |
|---|---|---|---|
| 1 | V4-P1 | 601 ‖ 603 ‖ 604 ‖ 605 ‖ 606 | giá 3 gói một nguồn; các quy trình bị gỡ hết đường code |
| 2 | V4-P2/P3 | 602 ‖ 607 ‖ 608 ‖ 613 | hoa hồng theo phí thực trả; khai báo sau đăng nhập; gian hàng |
| 3 | V4-P2/P3/P4 | 609 ‖ 610 ‖ 612 | nhu cầu; Gói Gọi vốn; kiểm duyệt §26.6 |
| 4 | V4-P3/P4 | 611 ‖ 614 | onboarding 8 bước; báo cáo B1/B2/B3 |
| 5 | V4-P5 | 615 → 616 | parity v4 + nghiệm thu §27 trên server dev |

Mỗi TIP: nhánh `feature/TIP-V4-6xx-<slug>` từ `dev` mới nhất → PR vào `dev`, không tự merge (git flow 21/10/2026).

### Lịch sử B1 → B6

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
| 10 | B6 | B61 → B62 → B63 ; B65 ‖ B66 ; B45 ‖ B46 (flag) ; B67 | **B6 gate**: 115 e2e + 205 parity trên server thật, k6 §15.2, staging |

Có thể chạy theo **goal native từng pha** (B1 … B6) giống G2–G6: mỗi pha một goal, điều kiện dừng = cổng kiểm của pha trong `02-TASK-GRAPH.md`.

## HOW TO USE TIPs

1. Sinh TIP **ngay trước khi code bước đó** bằng `/vibecode:tip` (file `tips/TIP-<id>-<slug>.md`, khung mẫu `TIP-V42-701-bugs-b1-b6.md`:
   HEADER đủ Files touched + Parallel-safe, CONTEXT trích P# `SPEC-V4.6-DELTA`, ACCEPTANCE Given / When / Then, BUILDER-CHECKLIST). Commit TIP trong nhánh TIP.
2. Nhánh `feature/TIP-<id>-<slug>` từ **`dev`** mới nhất (hoặc xếp chồng lên nhánh TIP trước theo GOAL) — **không tách từ `main`**;
   đọc `AGENTS.md` + file này + TIP + standards được trích.
3. Thợ: kiểm `pwd` + nhánh → đọc handler MSW + zod schema liên quan → viết test trước cho transition/guard/idempotency →
   code → `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build` (+ e2e, parity theo TIP) →
   commit (đường dẫn cụ thể, cấm `git add -A`) → completion report.
4. Migration: `--create-only` rồi sửa SQL, mỗi TIP một thư mục migration, `migrate deploy` trên `opchub_dev` + `opchub_test`.
   Không sửa file ngoài *Files touched*. Gặp mơ hồ → ghi `reports/ui-parity/questions.md` (mục V4.6, `Q-V46-8xx-n`), chọn phương án an toàn theo D-xx gần nhất.
5. Push nhánh, mở PR vào `dev` (hoặc base = nhánh TIP trước nếu xếp chồng); **không tự merge**, không auto-merge, không push `main`.
   Cập nhật `reports/V4.6-progress.md`.

## COMPLETION REPORT FORMAT

`coding-packs/reports/TIP-<id>-completion.md`:

```markdown
# TIP-<id> — <tên> — DONE | PARTIAL | BLOCKED
- Nhánh / SHA / PR: feature/TIP-<id>-… @ <git commit sha> · PR #<n>
- Files: <created / modified / deleted, đúng Files touched>
## Acceptance criteria
| AC | Kết quả | Bằng chứng (test name / lệnh) |
## Test
- `pnpm --filter @opchub/server test` → <N passed / M failed> (dán tóm tắt output thật)
- Integration: <N> · Contract: <N> · e2e liên quan: <N>
## Parity
- <màn>: <% @1440> / <% @390> (≤ 3%)
## Query mới
- <tên query>: index dùng, EXPLAIN (ANALYZE, BUFFERS) tóm tắt (Index Scan / Index Only Scan, thời gian, rows)
## Lệch / câu hỏi
- Thêm trường vào schema zod (tương thích ngược)? — liệt kê
- Q-Bxx-n mới (đã ghi `questions.md`, chọn phương án …)
## Soát luật cứng 1–14 (`AGENTS.md`)
## Chưa làm
```

Báo PM một dòng: `TIP-<id>-DONE <git sha> — <N> test passed` hoặc `TIP-<id>-BLOCKED: <lý do>`.

## ESCALATION RULES

| Mức | Khi nào | Làm gì |
|---|---|---|
| L1 — Tự xử | Lỗi code, test đỏ, thiếu trường zod (thêm được, tương thích ngược), index chưa tối ưu | Sửa, ghi vào completion report |
| L2 — Ghi câu hỏi, làm phương án an toàn | Mơ hồ nghiệp vụ nhỏ, endpoint FE gọi mà SRS không có, hành vi MSW mâu thuẫn standard | Ghi `Q-<id>-n` trong `reports/ui-parity/questions.md` (mục V4.6), chọn phương án an toàn nhất, làm tiếp |
| L3 — Dừng, hỏi Chủ nhà | Đổi kiến trúc/stack/ranh giới module, đổi hợp đồng phá FE, quyết định tiền/pháp lý/bảo mật, cần secret thật | Báo `TIP-<id>-BLOCKED`, agent chính hỏi Chủ nhà. V4.6: tiền / pháp lý / bảo mật **chưa có D-xx** (ngoài D-118 → D-127) cũng là L3 |

**Câu hỏi còn mở (không chặn v4.6)** — đầy đủ ở `01-REQUIREMENTS-MATRIX.md` › OPEN QUESTIONS:
- OQ-22 endpoint / key "Media Soft cấp · tương thích OpenAI" cho Nhà cung cấp AI — Admin tự nhập; test dùng stub (D-103).
- OQ-23 đội đặc tả sửa §33.3 (`OPC …` → `OPCHUB …`), CS-13 (đổi tay GĐ Vùng), dòng Trợ lý ở phân bổ AI — code theo D-121 / D-123 / D-124.
- OQ-17 kênh đối soát thật (fake provider, D-81); OQ-11 Zalo ZNS (để sau, D-125); OQ-01 VPS.
