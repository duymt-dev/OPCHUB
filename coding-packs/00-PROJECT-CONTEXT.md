# OPCHUB — Project Context (Scan Report)

> Vibecode Kit v5.0 — BƯỚC 1 (SCAN)
> Coding workspace: `D:\CODING\OPCHUB\CODING`
> Scanned: **2026-10-30** trên `dev` `cb29030d` (sau PR #72 — gói đặc tả v4.6)
> Scan type: **Brownfield + spec-driven delta** (code đã chạy hết v4.2; quét để đón v4.6)
> Cập nhật **04/11/2026**: đồng bộ D-118 → D-127 (RRI 30/10/2026) và `plans/GOAL-V4.6.md` (V46-801 → 812). Vision cập nhật v4.6 ở cuối file.

---

## SCAN REPORT

### Workspace inventory

```
apps/portal   Next.js — User Portal      478 file · ~30k LoC
apps/admin    Next.js — Admin Dashboard  631 file · ~39k LoC
apps/server   NestJS — api / socket / worker  598 file · ~41k LoC
packages/     shared · db (26 file schema, 80 model, 54 enum, 86 migration) · ui · integrations · config
e2e/          Playwright 91 spec (audit, behavior, parity, llm)
docs/spec/    gói v4.6: dac-ta.html (§1–33), index.html (prototype), README, assets, mau-bao-cao, PDF
docs/adr/     ADR · coding-packs/  TIP, audit, report, standards, product
```

[SoT: `docs/spec/README.md` v4.6 · 29/10/2026; `coding-packs/audit/SPEC-V4.6-DELTA.md`]

### TECH_STACK (chốt — `standards/global/tooling.md`)

| Layer | Phiên bản (pnpm catalog) |
|---|---|
| Runtime / build | Node 24 LTS · pnpm 12.11 · Turborepo 2.11 · TypeScript 6.0.3 |
| Frontend | Next.js 16.4 · React 19.3 · Ant Design 6.6 · TanStack Query 5.104 · next-intl 4.14 · Tiptap 3.32 |
| Backend | NestJS 11.2 (express, websockets, socket.io, bullmq, throttler) · nestjs-zod 5.5 · zod 4.6 |
| Data | Prisma 7 (schema nhiều file) · PostgreSQL 16 + PgBouncer · Redis 7 · BullMQ · MinIO |
| Test | Vitest 5 · Testing Library · Playwright · k6 |
| Hạ tầng | 1 VPS native (systemd `opchub-api@`, `opchub-socket@`, `opchub-worker`, Nginx) |

### EXISTING_MODULES

**Server `apps/server/src/modules/` (25):** account · admin-account · affiliate · bot · chat · community · dashboard · event · export · investor · llm-config · local-business · mail · marketing · membership-fee · moderation · notification · onboarding · pricing · project · reporting · service · settings · system · uploads.

**Worker processors (21):** account-lock · account · affiliate · bot-publication · bot · community · event · export · fee · fundraising · housekeeping · html-backfill · mail · marketing · media-backfill · moderation · notification · onboarding · outbox-relay · stats · store.

**Controllers:** `auth`, `auth/sso`, `me/*` (affiliate, chat, declaration, membership, onboarding, welcome-mail), `groups`, `events`, `members`, `notifications`, `uploads`, `dashboard`, `public/*` (affiliate, price-config, unsubscribe), `webhooks/bank`, `admin/*` (accounts, roles, affiliate + policy, bot + bulk-scripts / conversation-types / replies / schedule, categories, events, exports, fees, groups, investors, needs, price-config, projects, reports, settings + llm, stores, users).

**Portal routes:** dashboard · community · chat · events · projects (+ mine, [id]) · stores (+ mine, [id]) · needs (+ mine) · services · affiliate · profile · membership/pay · public: login, register, forgot/reset-password, sso/callback, `r/[code]`, huong-dan, unsubscribe.

**Admin routes:** overview · members · fees (+ transactions) · groups (+ chat) · bots · events · projects · investors · stores · needs · requests · affiliate · marketing · reports · settings · public: login, first-password, two-factor, forgot/reset-password.

**Integrations (`packages/integrations`):** bank-webhook (SePay + fake, HMAC, parse nội dung `OPCHUB …`) · llm (local + fake) · mail (Brevo, SMTP, fake) · sso (Google, fake) · storage (S3, local, fake) · tax-lookup (chuỗi esgoo → dlpl → vietqr, fake).

### Database schema

80 model / 54 enum chia theo domain trong `packages/db/prisma/schema/*.prisma`. Nhóm chính: User / AuthIdentity / BusinessProfile / RefreshToken · AdminUser / AdminRole / AdminRolePermission / AuditLog · MembershipFee (`trial | pending_payment | active | expiring | expired`) / MembershipFeePeriod / PaymentTransaction / FeeReminder · PriceConfig (+ History) · Affiliate / AffiliatePolicy / Referral / Commission (`plan`, `listAmount`, `amount`, `status`) / AffiliateClickDaily · Group / GroupMember / Room / Message / RoomReadCursor / PinnedMessage / MessageReaction / MessageFlag · Moderation* / Report · Event / EventRegistration · Project / ProjectFundraising / ProjectFunding / ProjectComment… · InvestorInterest / InvestorSummary · Store / StoreItem / StoreDailyView / StoreFavorite · Need · Service / ServiceRequest · Persona / BotScript / BotThread / BotReplyRun / BotBulk* / BotRotationCursor · Campaign / MailLog / MailSuppression · Notification · Onboarding* · OutboxEvent · ExportJob · StatsDaily · LlmConfig · AppSetting / SmtpConfig.

**Chưa có cho v4.6:** bảng GĐ Vùng (vùng, tỉnh phụ trách, tài khoản nhận, lịch sử bổ nhiệm), sổ chia sẻ GĐ Vùng + kỳ chi, trạng thái phí `Miễn phí · GĐ Vùng`, cấu hình nhắc gia hạn / kênh, slug + SEO trang công khai gian hàng, nhiều nhà cung cấp AI + phân bổ + ngân sách, cấu hình PWA / thông báo đẩy + subscription.

### PATTERNS_DETECTED

- **Một app NestJS, ba process** (api / socket / worker) dùng chung `modules/<domain>`; ranh giới import ép bằng `pnpm depcheck` + ESLint boundaries. [`standards/backend/nestjs-modules.md`]
- **Outbox** trong cùng transaction cho hiệu ứng phụ (thanh toán, khóa, duyệt) → `outbox-relay.processor`.
- **Transition có điều kiện** `WHERE status = <from>` cho mọi máy trạng thái.
- **Permission key** (56 key trong `packages/shared/src/permissions.ts`), không check tên vai trò.
- **zod ở biên** cho HTTP / socket / webhook / job / env (`packages/shared`).
- **Adapter + fake provider** cho mọi dịch vụ ngoài.
- **Trial 90 ngày → paywall** (D-94), **giá cấu hình** (`PriceConfig`, D-94 / D-116), **đối soát `OPCHUB …`** số tiền đúng bằng giá gói (D-104).
- **Affiliate**: mã cho mọi TV (D-94-3), hoa hồng % × số tiền gói thực trả, lưu `plan` (D-70, D-110).
- **FE**: feature folder, screen = orchestrator, TanStack Query + socket → cache, AntD theme chung `packages/ui`, i18n `messages/vi/*.json`, MSW cho parity.
- **Parity prototype ≤ 3%** ở 1440 + 390 (`standards/frontend/ui-parity.md`, D-89).

### REUSABLE_COMPONENTS (cho v4.6)

| Cần cho v4.6 | Có sẵn để dùng lại |
|---|---|
| Nhắc gia hạn 30 / 7 / 1 (BR-471 → 474) | `FeeReminder` (mỗi mốc ≤ 1 lần / kỳ, NA-04, D-57) + `fee.processor` + `mail` |
| Đối soát ngân hàng (BR-481 → 484) | `bank-webhook` adapter (HMAC, SePay), `webhooks/bank`, màn `admin/fees/transactions`, khớp tay (D-113) |
| Nhật ký thao tác Admin (BR-485, 486) | `AuditLog` + `audit-log-tab.tsx` (90 ngày, D-75) + `export` |
| Nhà cung cấp AI (P13) | `llm-config` module + `LlmConfig` + `settings/llm-tab.tsx` + adapter `llm` |
| Tự mở khóa (BR-465) | `User.lockedUntil` + `account-lock.processor` |
| GĐ Vùng / chia sẻ | `Affiliate`, `Commission`, `AffiliatePolicy`, `Referral` (cookie link `/r/[code]`), 34 tỉnh + vùng trong seed |
| Tìm kiếm chung (BR-491) | Topbar có ô tìm (`602e7c5e`, chỉ FE) |
| Email bổ nhiệm / thu hồi (EM-GDV1/2) | `mail` + `MailLog` + màn Marketing › Email |

### GAPS_DETECTED (v4.6 so với code — chi tiết `audit/SPEC-V4.6-DELTA.md`)

1. **GĐ Vùng** (§31.4, §32, P5 → P9, P16, P17): chưa có gì — bảng, quyền, API `/admin/gdv`, tab "Vùng của tôi", trạng thái phí miễn phí GĐ Vùng.
2. **Mô hình chia sẻ §31** đổi hẳn hoa hồng affiliate hiện hành; xung đột D-70 / D-110 / §29. → **D-119**: chỉ chi cho GĐ Vùng, hoa hồng affiliate chỉ tham khảo.
3. **Cú pháp CK** `OPC <SĐT> <GÓI>` (§33.3) ≠ `OPCHUB …` (D-104, §28.1). → **D-123**: giữ `OPCHUB …`.
4. **Nhắc gia hạn cấu hình được** (mốc / kênh / gửi tay / cột Lần gửi) và **kênh Zalo ZNS** — chưa có adapter. → **D-125**: không làm Zalo, ẩn kênh.
5. **Trang công khai `/g/<slug>`** + SEO — chưa có route công khai cho gian hàng.
6. **Tìm kiếm chung** server-side, **gợi ý nhu cầu** chấm điểm (BR-478 → 480), **chuyển đổi theo vùng** (BR-475 → 477).
7. **PWA + Web Push** — chưa có manifest / service worker / subscription. → **D-125**: chỉ màn cấu hình lưu được.
8. **AI nhiều nhà cung cấp** + dự phòng + ngân sách + ẩn PII; dòng "Trợ lý OPC Hub" trái D-92. → **D-124**: ẩn dòng Trợ lý.
9. Đặc tả tự mâu thuẫn: GDV-R06 "tối thiểu 1 GĐ Vùng / vùng" vs prototype "mỗi vùng 1 GĐ Vùng". → **D-120**: đúng 1 / vùng.

### CODE_HEALTH

| Metric | Value |
|---|---|
| TypeScript strict | Có; `any` = 0 ngoài code sinh của Prisma |
| ESLint | Có (`max-lines`, boundaries); lefthook pre-commit (prettier) + commitlint |
| Tests | 543 file `*.spec.ts(x)` + 91 e2e Playwright |
| `console.*` | 0 |
| TODO / FIXME | 2 |
| File vượt trần | 0 file tay; `packages/shared/src/fixtures/stores-seed.ts` 608 dòng (fixture dữ liệu) — 1 trường hợp cần xem lại |
| Parity | Kết quả màn P1 → P17 của v4.6 hết hiệu lực, chờ đo lại |

### ESTIMATED_SIZE (phần v4.6 còn phải làm)

Đã chia thành 12 TIP V46-801 → 812 (`02-TASK-GRAPH.md` › V4.6, thứ tự D-126). Ước lượng ban đầu:

| Hạng mục | Ước lượng |
|---|---|
| GĐ Vùng + chia sẻ + chi trả (P5 → P9, P16, P17) | 2–3 TIP lớn · ~5 bảng mới · ~10 endpoint · 3 màn Admin + 1 tab Portal |
| Nhắc gia hạn (P11; Zalo bỏ theo D-125) | 1 TIP |
| Đối soát ngân hàng màn cấu hình (P12) | 1 TIP vừa (`OPCHUB`, D-123) |
| Trang công khai `/g/` (P4) | 1 TIP lớn (route công khai, SEO) |
| Tìm kiếm chung + gợi ý nhu cầu + chuyển đổi vùng (P2, P3, P10) | 2 TIP vừa |
| AI nhiều nhà cung cấp (P13) | 1 TIP vừa |
| Màn Ứng dụng & thông báo (P14, chỉ cấu hình, D-125) | gộp vào TIP AI (V46-811) |
| Copy, nhãn, nhật ký, BR-461/463/465 (P1, P15, nhóm 1) | 1 TIP nhỏ |

---

## Auto-Answered Requirements (for RRI — skip these)

- Stack, hạ tầng, cấu trúc repo, luật cứng — `AGENTS.md`, `standards/` (chốt, không hỏi lại).
- Nghiệp vụ v4 → v4.2 đã chốt D-89 → D-117 (trial, giá cấu hình, đối soát `OPCHUB`, affiliate mọi TV, gian hàng, bot, File chia sẻ…).
- Nguyên tắc nguồn: prototype thắng khi lệch (D-89, D-93); nút không bấm được vẫn làm đúng nghiệp vụ (D-95); test dùng stub (D-103).
- Tỷ lệ chia sẻ mặc định §31.1 (50 / 40 / 30 / 20, công thức, 3 thông số cấu hình) — rõ trong đặc tả, chỉ hỏi phần xung đột.
- Quy tắc §32 GDV-R01 → R08, QT-32, máy trạng thái §32.3, AT-GDV01 → 07 — rõ, trừ R06.
- BR-461 → 495, TC-461 → 494 — rõ về hành vi; còn câu hỏi phạm vi / tích hợp.

## Questions for RRI → **đã chốt** D-118 → D-127 (RRI 30/10/2026); câu gốc Q-V4.6-1 → 7 ở `audit/SPEC-V4.6-DELTA.md` §4

1. Mô hình chia sẻ §31 thay hoa hồng affiliate — số dư hoa hồng cũ, migration. → **D-119**: theo §31, chỉ chi cho GĐ Vùng; chưa go-live nên không chuyển số dư, seed sinh lại.
2. Mỗi vùng đúng 1 hay tối thiểu 1 GĐ Vùng. → **D-120**: đúng 1 / vùng, 3 ô cố định.
3. Cú pháp CK `OPC <SĐT> <GÓI>` hay giữ `OPCHUB …`. → **D-123**: giữ `OPCHUB …`.
4. Dòng "Trợ lý OPC Hub" ở phân bổ AI (D-92). → **D-124**: ẩn.
5. Cổng đối soát / Zalo ZNS / Web Push: adapter + fake trước hay chờ hợp đồng. → **D-125**: không Zalo, Web Push chỉ màn cấu hình, đối soát dùng adapter hiện có.
6. Phạm vi + thứ tự TIP các mục lớn. → **D-126** (= V46-801 → 812).
7. Mốc "năm của khách" cho TK đã đóng phí trước v4.6. → **D-122**: từ giao dịch thực thu đầu tiên, backfill.

Thêm: gán affiliate theo tỉnh, Admin không đổi tay, vùng trống → 100% Media Soft (**D-121**); thay đổi nhỏ theo prototype (**D-127**).

## Constraints

- Luật cứng `AGENTS.md` 1 → 14 + global `~/.claude/CLAUDE.md` (trần dòng, PostgreSQL index / deferred join, commit + SHA).
- Git flow: code trên `dev` / `feature/*` từ `dev`; `dev → main` chỉ qua PR do owner merge.
- Thay đổi backend / lớn chưa có D-xx → hỏi owner (D-93). v4.6 **đã chốt D-118 → D-127** (30/10/2026); việc ngoài các D này vẫn phải hỏi.
- Tiền số nguyên VND; chia sẻ GĐ Vùng làm tròn đến đồng (D-119, theo D-110); tỷ lệ chỉ đọc từ Chính sách, không hằng số trong code.
- Dịch vụ ngoài chỉ qua adapter trong `packages/integrations` + fake provider; env mới vào `.env.example` + zod schema. v4.6 **không làm** Zalo ZNS, Web Push thật (D-125).
- Mọi thao tác Admin (bổ nhiệm / thu hồi / chi trả / đổi cấu hình) ghi `audit_logs`; hiệu ứng tiền qua outbox.

## Risks / Tech Debt

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| §31 đổi mô hình tiền affiliate đang chạy | Cao | Đã chốt D-119: chưa go-live, không chuyển số dư; vẫn cần test kỹ backfill năm của khách (D-122) |
| ~~Đổi cú pháp CK~~ | — | Hết rủi ro: giữ `OPCHUB …` (D-123) |
| GĐ Vùng miễn phí ảnh hưởng paywall + trial + nhắc phí | Trung bình | Máy trạng thái phí thêm trạng thái; kiểm hồi quy D-94 |
| Zalo ZNS / Web Push cần duyệt mẫu, hợp đồng (VM-461 → 463) | Thấp | Để sau (D-125): ẩn Zalo, Web Push chỉ màn cấu hình |
| Trang `/g/` công khai lộ dữ liệu gian hàng | Trung bình | Chỉ trường công khai, tôn trọng bật/tắt Google (noindex) |
| Parity v4.6 chưa đo | Thấp | Đo lại sau khi dựng các màn |
| `stores-seed.ts` 608 dòng | Thấp | Fixture; tách khi đụng tới |

---

*[SoT: `docs/spec/dac-ta.html` v4.6 (§33 > §32 > §31 > §29 > §28 > §27 > §1–26); `docs/spec/index.html` v4.6; code `dev` `cb29030d`]*

---
---

# VISION DOCUMENT

> Vibecode Kit v5.0 — BƯỚC 3 (VISION)
> Date: 2026-10-16
> Inputs: Scan Report (trên), `01-REQUIREMENTS-MATRIX.md` (D-01 → D-25), phỏng vấn Chủ nhà về quy mô (5.000 online)
> Cập nhật: 27/10/2026 (v4.2), **04/11/2026 (v4.6, D-118 → D-127)** — kiến trúc, stack, quy trình triển khai không đổi

## 1. Project Type

**Pattern B (SaaS multi-user, có subscription) + Pattern C (Admin dashboard)** — cộng thêm lõi realtime (chat) và tích hợp đối soát thanh toán.

```
PUBLIC   : Đăng nhập · Đăng ký (Cá nhân / DN / Nhà đầu tư) · OTP · Quên MK · Điều khoản
PORTAL   : Dashboard · Cộng đồng · Chat nhóm · Sự kiện · Dự án OPC · Hồ sơ · Thông báo
           + Popup Gói dịch vụ (paywall bắt buộc)
ADMIN    : Tổng quan · Thành viên · Phí · Nhóm (+Kiểm duyệt) · Sự kiện · Dự án · Nhà đầu tư · Cài đặt
           · Bot · Yêu cầu dịch vụ · Gian hàng / Nhu cầu · Affiliate (+ GĐ Vùng, v4.6) · Báo cáo
PORTAL+  : Gian hàng · Nhu cầu · Affiliate (+ "Vùng của tôi" cho GĐ Vùng, v4.6) · Bảng giá
PUBLIC+  : Trang công khai gian hàng /g/<slug> (v4.6, SSR + SEO)
```

## 2. Tech Stack (chốt)

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Dùng chung zod schema / types FE–BE |
| Portal, Admin | 2 app **Next.js 16 App Router** + React 19 + Ant Design 6 + TanStack Query + next-intl (vi) | Bản stable 10/2026 (SRS ghi Next 14 đã cũ); tách bundle + quyền |
| Server | **NestJS 11**: một app `apps/server`, 3 entrypoint api / socket / worker | Dùng chung module nghiệp vụ, chạy 3 process riêng (ADR-0001) |
| Realtime | **Socket.IO** + `@socket.io/redis-adapter`, process riêng | Scale độc lập với REST |
| Worker | NestJS standalone + **BullMQ** | mail · reconcile · scheduler · export · (bot) |
| DB | **PostgreSQL 16** + PgBouncer (transaction mode) + `unaccent`, `pg_trgm`, `citext` | Thay OpenSearch |
| ORM | **Prisma**; index nâng cao bằng SQL migration tay; list Admin dùng TypedSQL/`$queryRaw` deferred join | D-02 + CLAUDE.md |
| Cache / presence / rate-limit / queue | **Redis 7** | |
| File | **MinIO** (S3 API), presigned upload | D-09 |
| Auth | Tự viết: passport (Google/FB/LinkedIn), JWT 15' + refresh 7d xoay vòng, argon2, TOTP admin | D-01 |
| Email | nodemailer → Brevo SMTP, template React Email | |
| Tích hợp | Adapter `BankWebhookProvider` (SePay trước), `TaxLookupProvider` (ESGOO → VietQR), `PhoneOtpProvider` (Zalo ZNS, sau) | |
| Vận hành | **1 VPS cài native**: Nginx + certbot, systemd, Cloudflare free phía trước; pino log, Sentry; backup pg_dump + WAL offsite | D-03, D-12 |

## 3. Architecture Vision

### 3.1 Logical

```
                         Cloudflare (DNS, TLS, cache tĩnh/ảnh)
                                      │
                               Nginx (1 VPS)
        ┌──────────────┬──────────────┼───────────────┬──────────────────┐
   portal.*        admin.*        api.*/v1         api.*/socket       files.* (MinIO)
  Next.js ×1-2    Next.js ×1     NestJS REST ×N   Socket.IO ×N        presigned GET/PUT
        │              │              │                 │
        └──── TanStack Query ─────────┤                 │
                                      ▼                 ▼
                         ┌──────────────────────────────────────┐
                         │  NestJS modular monolith (shared lib) │
                         │  account · membership · community ·   │
                         │  chat · moderation · event · project ·│
                         │  investor · notification · mail ·     │
                         │  settings/rbac · audit · export       │
                         │  (bot · service-request: flag)        │
                         └───────┬───────────────┬──────────────┘
                                 │               │ enqueue
                    PgBouncer ── PostgreSQL     Redis ── BullMQ ── worker ×1-2
                                                 │ pub/sub          ├ mail → Brevo
                                                 └ socket adapter   ├ reconcile ← SePay webhook / poll
                                                                    ├ scheduler (phí hết hạn, KPI)
                                                                    ├ export → MinIO
                                                                    └ bot → LLM qua adapter (cấu hình Admin, D-99)
```

### 3.2 Tiến trình trên VPS (systemd)

| Unit | Số instance (5.000 online, 8 vCPU) | Ghi chú |
|---|---|---|
| `opchub-portal@` | 2 | Next.js `next start` |
| `opchub-admin` | 1 | |
| `opchub-api@` | 2 | `apps/server` main-api, stateless |
| `opchub-socket@` | 2–3 | `apps/server` main-socket, WebSocket-only transport → không cần sticky session |
| `opchub-worker` | 1 | `apps/server` main-worker, concurrency theo queue |
| postgresql, pgbouncer, redis, minio, nginx | 1 | |

Beta chạy 4 vCPU / 8GB, mỗi loại 1 instance; nâng máy = tăng số instance, **không đổi code**.

### 3.3 Repo layout

Xem bản đồ repo chuẩn trong `CLAUDE.md` (gốc repo). Tóm tắt: `apps/portal`, `apps/admin`, `apps/server` (main-api / main-socket / main-worker + `modules/<domain>` dùng chung), `packages/{shared,db,ui,integrations,config}`, `infra/`, `docs/spec`, `docs/adr`. Hiệu ứng phụ quan trọng qua outbox.

## 4. Scale Design Principles (bắt buộc — mục tiêu 5.000 online)

| # | Nguyên tắc | Cách làm |
|---|---|---|
| S-01 | Presence không fan-out từng sự kiện | Chỉ phát **số** online mỗi phòng, gom 5s; danh sách online tải theo trang khi mở panel |
| S-02 | Gửi tin: 1 ghi DB, 0 truy vấn/người nhận | Quyền phòng kiểm ở `room.join`, cache trong socket; `message.send` → insert → `io.to(room).emit` |
| S-03 | Paywall không truy vấn mỗi request | `membershipStatus` + `validUntil` trong JWT claim + Redis; đổi trạng thái → bump version, đẩy `membership.updated`. **v4.2:** trạng thái `trial` (90 ngày) qua cổng như `active` (BR-TRIAL-05, một hàm dùng chung); job hết hạn trial / phí cũng bump version. Giá đọc từ Cấu hình bảng giá có cache Redis, Admin lưu → xoá cache (D-94 5A). **v4.6:** "Miễn phí · GĐ Vùng" cũng qua cổng trong `isFeeUsable`; bổ nhiệm / thu hồi bump version như mọi transition phí (D-120) |
| S-04 | Thông báo không nhân theo số thành viên | Chỉ tạo notification cho @mention, reply, sự kiện cá nhân; tin chưa đọc dùng `room_read_cursor(user_id, room_id, last_message_id)` |
| S-05 | Đếm chưa đọc rẻ | Counter Redis theo (user, room), rebuild từ cursor khi miss |
| S-06 | Reconnect storm an toàn | Client backoff ngẫu nhiên; sync bằng `after=lastMessageId` limit 100; restart từng instance một |
| S-07 | DB connection có trần | PgBouncer; Prisma `connection_limit` nhỏ mỗi process; mọi list có index "bằng trước, khoảng sau" + deferred join |
| S-08 | Request path nhẹ | Kiểm từ khóa in-memory (Aho-Corasick) **trước khi INSERT / phát tin** — trúng thì lưu sẵn trạng thái ẩn, không phát nguyên văn (D-77, D-117 B4); upload thẳng MinIO, tải file chat qua URL ký ngắn hạn sau khi kiểm thành viên nhóm (D-98, B6); email/export/đối soát qua queue |
| S-09 | REST và socket tách process | Export/report chậm không ảnh hưởng chat |
| S-10 | KPI tính trước | Scheduler cập nhật `stats_daily`; Admin Tổng quan đọc bảng tổng hợp |
| S-11 | Bot đi chung đường gửi tin, có rate-limit | Không bypass S-02 / S-08. **v4.2 (D-112):** luồng "Trả lời từng tin" giãn cách theo giây (mặc định 5 s ≈ 12 tin/phút/nhóm) — trần cứng **≤ 12 tin/phút/nhóm và ≤ 60 tin/phút toàn hệ thống** cho mọi tin bot; gọi LLM trong worker, không trong socket; quét 20 s một lượt, xử lý từng nhóm |
| S-12 | Không mất tin khi restart | Ack `message.send` chỉ sau khi commit DB; client giữ hàng đợi gửi tạm, gửi lại kèm `clientMsgId` (idempotent) |

Nghiệm thu quy mô: k6 — 5.000 socket, 50 tin/giây, p95 < 500ms, không mất tin; API p95 < 300ms (SRS §15.2).

## 5. Luồng then chốt

**Gửi tin nhắn**
```
client ─message.send{roomId, clientMsgId, body}→ socket
  → kiểm cache quyền phòng + membership (S-02, S-03)
  → keyword match in-memory → nếu khớp: enqueue report
  → INSERT message (unique clientMsgId) → ack{id}
  → io.to(room).emit message.new   (Redis adapter phân phối sang instance khác)
  → mentions → notification (S-04)
```

**Vòng đời phí (v4.2 — D-94, D-96, D-104 → D-106, D-113, D-116)**
```
Đăng ký + OTP → user + fee {status: trial, valid_until: +90 ngày} (cùng transaction)
  → outbox: tạo mã affiliate (D-94 3A), gian hàng Nháp nếu DN (D-97/D-114), mail chào mừng
Ngày 83, ngày 90 → nhắc hết miễn phí (thông báo + email, D-113)
Hết hạn → trạng thái expired → Bảng giá bắt buộc (chỉ Đăng xuất); dữ liệu giữ, gian hàng / dự án / nhu cầu ẩn (D-109)
Portal → GET /me/membership → giá từ Cấu hình bảng giá → server sinh chuỗi VietQR EMVCo (số tiền + nội dung)
SePay → POST /webhooks/bank (HMAC) → INSERT payment_txn ON CONFLICT DO NOTHING
  → reconcile job (§28.1): bắt buộc tiền tố OPCHUB, tách theo khoảng trắng
     "OPCHUB TVxxxxxx 0xxxxxxxxx"         + đúng bằng giá gói      → kỳ 12 tháng (nối tiếp valid_until) → active
     "OPCHUB TVxxxxxx 0xxxxxxxxx GVxxxxxx" + đúng giá / giá gia hạn → khoản Gọi vốn → chờ Admin thẩm định
     sai nội dung / thiếu / thừa tiền     → hàng "Cần đối soát thủ công" (Admin khớp tay phí hoặc Gọi vốn, audit)
  → outbox: membership.updated, hoa hồng (plan snapshot, làm tròn đến đồng, chỉ tham khảo từ v4.6), email biên nhận
poll job 2' → lấy GD từ API nhà cung cấp → cùng đường insert (idempotent)
```

**GĐ Vùng + chia sẻ doanh thu (v4.6 — D-119 → D-122, §31, §32)**
```
Admin bổ nhiệm (permission key riêng, audit) — 3 vùng cố định, mỗi vùng đúng 1, mỗi TV 1 vùng, mỗi tỉnh 1 vùng
  → fee: <trạng thái hiện tại> → "Miễn phí · GĐ Vùng" (transition, nhớ hạn phí trước bổ nhiệm) + outbox: EM-GDV1, membership.updated
Admin thu hồi → hạn phí cũ còn → dùng tiếp (kể cả trial); hết → pending_payment (BR-462) + outbox: EM-GDV2
Phí / Gọi vốn của khách đối soát xong (khách đăng ký qua link affiliate, lần giới thiệu đầu, cookie 30 ngày)
  → outbox → ghi sổ chia sẻ: vùng = theo tỉnh của affiliate (Admin không đổi tay, D-121)
     năm của khách y tính từ giao dịch thực thu đầu tiên (D-122)
     phần GĐ Vùng = max(tối thiểu, năm1 − giảm × (y − 1)) — 3 thông số từ Chính sách, làm tròn đến đồng
     vùng trống / giao dịch trước ngày bổ nhiệm → 100% Media Soft; trial / 0đ / huỷ → không ghi
Cuối tháng → kỳ chi từng GĐ Vùng → Admin "Chi trả" (idempotent, audit) → lịch sử chi trả
Affiliate: hoa hồng % vẫn tính để GĐ Vùng tham khảo; Media Soft không chi trực tiếp
```
## 6. MVP Scope

### IN (go-live beta = GĐ1 + GĐ2)

| Domain | Màn hình | Priority |
|---|---|---|
| Xác thực | Login, SSO, ĐK cá nhân / DN (tra MST) / Nhà đầu tư, OTP email, quên MK, đổi MK | P0 |
| Phí | Miễn phí 3 tháng (trial), Bảng giá bắt buộc khi hết hạn, VietQR động, đối soát §28.1, Admin Phí (tab Miễn phí 3 tháng) + Cấu hình bảng giá + hàng đợi GD không khớp, email biên nhận | P0 |
| Cộng đồng | Portal Cộng đồng; Admin Nhóm, Admin Thành viên (khóa, gán nhóm, xuất) | P0 |
| Chat | Chat nhóm (phòng, reply, reaction, @, ghim), báo cáo; Admin Kiểm duyệt | P0 |
| Sự kiện | Portal Sự kiện; Admin Sự kiện + danh sách ĐK | P0 |
| Dự án & NĐT | Khám phá, Dự án của tôi, đăng hiện ngay + Admin hậu kiểm (D-108), Gói Gọi vốn 1 dự án / khoản; Admin Dự án, Admin Nhà đầu tư | P0 |
| Nền | Dashboard Portal, thông báo, Cài đặt (danh mục, RBAC 14 quyền, email chào mừng, SMTP, TK QT + 2FA, nhật ký), audit | P0 |
| Chung | Hỗ trợ qua email, Điều khoản (nội dung tĩnh), lưu đồng ý | P0 |
| Admin Tổng quan (KPI) | | P1 |
| v4.2 (D-93 → D-117) | Affiliate cho mọi TV; trình tạo gian hàng 5 bước + media; File chia sẻ nhóm; Bot lịch + trả lời từng tin + AI tạo hàng loạt (AI cấu hình Admin); tự nhắc khởi đầu; sửa lỗi B1 → B6 (REQ-601 → 615) | P0–P2 |
| v4.6 (D-118 → D-127) | GĐ Vùng + sổ chia sẻ + chi trả + Vùng của tôi; nhắc gia hạn 30 / 7 / 1; đối soát ngân hàng; sửa nhóm 1; nhật ký + CSV; chuyển đổi theo vùng; tìm kiếm chung; gợi ý nhu cầu; trang `/g/<slug>`; AI nhiều nhà cung cấp; màn Ứng dụng & thông báo (REQ-616 → 630) | P0–P3 |

### OUT

| Hạng mục | Khi nào |
|---|---|
| ~~Bot tương tác~~ | Đã vào phạm vi (D-50, D-99): tự động 100%, LLM qua adapter |
| ~~Dịch vụ tư vấn~~ | Đã vào phạm vi (D-51, D-72) |
| Gọi vốn nhiều dự án / 1 lần CK | Không làm (D-94 4B) |
| Trợ lý OPC Hub | Đã gỡ (D-92) |
| Xác thực SĐT (Zalo ZNS) | Sau beta |
| Kênh Zalo ở Nhắc gia hạn, gửi Web Push thật | Để sau (D-125) |
| Chi trả hoa hồng trực tiếp cho affiliate; Admin đổi tay vùng của affiliate | Không làm (D-119, D-121) |
| Hóa đơn điện tử, hoàn tiền tự động, gói tháng | Khi chốt thanh toán |
| Ngôn ngữ ngoài tiếng Việt | Khi mở ASEAN |
| HA / nhiều VPS / read replica / K8s | Khi vượt ~5.000 online |
| Prometheus/Grafana | Sau go-live |

## 7. Style

- Ant Design 6, phẳng, theo prototype v4.6 (D-89, D-118): primary `#1677FF`, nền `#F5F5F5`, chữ `#14171F`; font hệ thống + Noto Sans.
- Admin: sidebar 1 cấp, thu gọn được; bảng → thẻ dưới 768px. Portal: responsive 360px+.
- Logo `assets/opchub-logo.png`.

## 8. Key Decisions

| # | Quyết định | Lý do |
|---|---|---|
| V-01 | Socket là process riêng, WebSocket-only | Scale độc lập, không cần sticky session |
| V-02 | PgBouncer + Prisma connection_limit nhỏ | Trần kết nối Postgres khi nhiều instance |
| V-03 | Membership trong JWT + Redis | Paywall không tốn query mỗi request |
| V-04 | Read cursor thay notification theo tin | Không nhân dữ liệu theo số thành viên |
| V-05 | `clientMsgId` idempotent | Không trùng / không mất tin khi reconnect |
| V-06 | Payment txn insert idempotent, reconcile tách job | Webhook + poll dùng chung đường |
| V-07 | Adapter cho bank / MST / phone OTP / mail | Nhà cung cấp chưa chốt hoặc sẽ đổi |
| V-08 | Bot + Dịch vụ sau feature flag | Giảm phạm vi và rủi ro pháp lý go-live |
| V-09 | Cloudflare free phía trước VPS | Giảm băng thông ảnh/tĩnh, che IP |
| V-10 | 1 VPS, nâng dọc (4→8→16 vCPU) rồi tách DB ra máy thứ 2 | Chi phí thấp, code không đổi |
| V-11 | Trial là một trạng thái phí, không phải cờ riêng; mọi cổng quyền qua một hàm dùng chung (v4.2) | BR-TRIAL-05; một chỗ sửa cho JWT, socket, upload, explore |
| V-12 | Giá trong bảng `price_config` có lịch sử + audit, đọc qua cache; không còn hằng số giá trong code | CR-08; đổi giá không cần deploy |
| V-13 | VietQR sinh ở server (EMVCo), không gọi dịch vụ ngoài | §27.5c; không phụ thuộc bên thứ ba khi thanh toán |
| V-14 | Cấu hình LLM (endpoint, model, key mã hoá AES-GCM) trong DB như SMTP, adapter đọc lúc chạy; test dùng stub HTTP cục bộ | D-99, D-103, luật 11 |
| V-15 | File chat / media gian hàng: presigned PUT, GET qua URL ký ngắn hạn sau kiểm quyền; chặn file thực thi theo đuôi + MIME + magic bytes | D-98, D-117 B5, B6 |
| V-16 | "Miễn phí · GĐ Vùng" là một trạng thái phí, đi qua `isFeeUsable` như trial (không cờ riêng, không `status IN (...)` rải rác) | D-120, V-11 |
| V-17 | Sổ chia sẻ GĐ Vùng ghi qua outbox khi đối soát; tỷ lệ chỉ đọc từ Chính sách; chi trả idempotent + audit | D-119, D-122, luật 8, 10 |
| V-18 | Vùng của affiliate suy ra từ tỉnh nhóm cộng đồng, không có thao tác gán tay | D-121 |

## 9. Quality Gate — `/vibecode:vision`

- [x] Project type classified — Pattern B + C (+ realtime)
- [x] Tech stack proposed with rationale
- [x] Architecture vision (ASCII: logical, process, repo)
- [x] MVP scope IN / OUT tables
- [x] Key decisions table
- [x] Appended to `00-PROJECT-CONTEXT.md`
- [x] **27/10/2026 cập nhật v4.2**: luồng phí (trial → VietQR → đối soát §28.1), S-03 / S-08 / S-11, MVP IN / OUT, V-11 → V-15. Kiến trúc, stack, quy trình triển khai không đổi
- [x] **04/11/2026 cập nhật v4.6**: luồng GĐ Vùng + chia sẻ, S-03, màn mới, MVP IN / OUT, V-16 → V-18, AntD 6. Kiến trúc, stack, quy trình triển khai không đổi
- ⚠️ Con số 5.000 online / 8 vCPU là ước tính, phải chứng minh bằng k6 trước khi mở rộng khỏi beta
- ⚠️ OQ-13 (chủ nhóm ban đầu) và toàn bộ thanh toán (OQ-06) đang chạy theo default
