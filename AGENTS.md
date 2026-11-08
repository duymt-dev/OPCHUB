# OPCHUB — Hướng dẫn cho coding agent

File này dùng chung cho mọi agent (Claude Code đọc qua `CLAUDE.md` → `@AGENTS.md`; agy/Antigravity, Codex, OpenCode đọc trực tiếp). Đọc hết trước khi code. Rule chi tiết ở `coding-packs/standards/` (index: `coding-packs/standards/README.md`).
Global `~/.claude/CLAUDE.md` vẫn áp dụng; file này cụ thể hóa cho dự án. Khi hai bên khác nhau, lấy rule **chặt hơn**.

## Dự án

OPC Hub Community (opchub.community): nền tảng cộng đồng cho doanh nghiệp một người tại Việt Nam. Có nhóm theo 34 tỉnh/thành, chat nhóm realtime, sự kiện, dự án gọi vốn, nhà đầu tư. Tài khoản mới **miễn phí 3 tháng**, sau đó thu phí theo gói (Cá nhân / Doanh nghiệp, giá do Admin cấu hình) và Gói Gọi vốn theo dự án; chuyển khoản VietQR, đối soát tự động theo nội dung `OPCHUB …` (D-94, D-104, D-123). Mạng lưới affiliate: mọi thành viên có link giới thiệu; Media Soft **chỉ chia doanh thu cho Giám đốc Vùng** (3 vùng, mỗi vùng đúng 1, affiliate tự thuộc vùng theo tỉnh), GĐ Vùng tự chi cho affiliate ngoài hệ thống (D-119 → D-122).

Nguồn sự thật, theo thứ tự ưu tiên khi mâu thuẫn:

1. `coding-packs/01-REQUIREMENTS-MATRIX.md`: REQ-ID, **Decisions Log** (D-xx; số lớn hơn thay số nhỏ hơn khi trái nhau — mới nhất **D-138**), Open Questions (OQ-xx). Đối chiếu đặc tả ↔ code: `coding-packs/audit/SPEC-V4.6-DELTA.md`
2. `docs/adr/`: quyết định kiến trúc
3. `coding-packs/00-PROJECT-CONTEXT.md`: Scan Report + **Vision** (kiến trúc, nguyên tắc scale S-01 → S-12)
4. Prototype `docs/spec/index.html` (v4.6): **thắng đặc tả khi lệch** về giao diện và hành vi (D-89, D-93). Nút prototype không bấm được vẫn làm đúng nghiệp vụ (D-95). Chỉ tham chiếu, **không copy code**.
5. Đặc tả `docs/spec/dac-ta.html` (v4.6): **§33 > §32 > §31 > §29 > §28 > §27 > §1–26** (§30 bị §31 thay) khi trái nhau. QT-xx, BR-xx, NA-xx, máy trạng thái, API đề xuất

Không tự quyết nghiệp vụ. Gặp chỗ mơ hồ thì ghi vào báo cáo và hỏi, không đoán. Thay đổi backend hoặc lớn chưa có D-xx → hỏi owner trước (D-93).

Dễ làm sai (đặc tả hoặc prototype ghi khác quyết định): hoa hồng affiliate chỉ để tham khảo, **không chi trực tiếp** (D-119), gia hạn năm 2 → năm tối đa có hoa hồng theo % gia hạn (D-131); Admin **không đổi tay** vùng của affiliate, vùng trống (cả miền chưa có GĐ Vùng) → 100% Media Soft (D-121), tỉnh chưa được tick vẫn tính cho GĐ Vùng của miền (D-129), affiliate nhiều nhóm tỉnh lấy nhóm tham gia sớm nhất (D-128); năm của khách tính từ giao dịch thực thu đầu tiên, gồm cả Gọi vốn (D-122, D-130); nội dung CK **`OPCHUB …`** dù §33.3 ghi `OPC …` (D-123); không có Trợ lý OPC Hub (D-92, D-124); **không Zalo** (D-125); Web Push thật chỉ qua dịch vụ đẩy của trình duyệt + VAPID, không dịch vụ trả phí (D-137).

## Stack (phiên bản chốt ở [global/tooling](coding-packs/standards/global/tooling.md))

Node 24 LTS · pnpm + Turborepo · TypeScript 6.0 · Next.js 16 + React 19 + Ant Design 6 + TanStack Query 5 + next-intl 4 · NestJS 11 · Prisma 7 + PostgreSQL 16 (+ PgBouncer) · Redis 7 · BullMQ · Socket.IO + redis-adapter · MinIO · zod 4 · Vitest, Playwright, k6. Hạ tầng: 1 VPS cài native (systemd, Nginx), không Docker/K8s.

Đổi stack hoặc nâng major version phải có ADR mới.

## Bản đồ repo

```
apps/
  portal/            Next.js — User Portal
  admin/             Next.js — Admin Dashboard
  server/            NestJS — MỘT app, BA điểm khởi động, dùng chung module nghiệp vụ
    src/
      main-api.ts      REST           → systemd opchub-api@
      main-socket.ts   Socket.IO      → systemd opchub-socket@
      main-worker.ts   BullMQ worker  → systemd opchub-worker
      modules/<domain>/   nghiệp vụ, dùng chung cho cả 3 process
      api/  socket/  worker/   phần riêng từng process (bootstrap, gateway, processor)
      common/          guard, filter, interceptor, logger, config
packages/
  shared/            zod schema, enum, error code, permission key, tên queue/event
  db/                Prisma schema (nhiều file theo domain), migration, seed, TypedSQL
  ui/                theme AntD + component dùng chung
  integrations/      adapter: bank-webhook, tax-lookup, phone-otp, mail, storage, llm
  config/            eslint, tsconfig, prettier dùng chung
infra/               nginx, systemd, backup, k6
docs/spec/           đặc tả + prototype (chỉ đọc)
docs/adr/            Architecture Decision Records
coding-packs/        tài liệu vibecode (TIP, report) — không phải code
```

## Lệnh

```
pnpm install
pnpm dev                                  # mọi app
pnpm lint && pnpm typecheck && pnpm test  # bắt buộc trước khi commit
pnpm depcheck                             # kiểm ranh giới import
pnpm --filter @opchub/db migrate:dev      # --create-only rồi sửa SQL
pnpm --filter @opchub/db seed
pnpm e2e                                  # Playwright
```

## Luật cứng (vi phạm thì không được báo DONE)

1. **Kích thước file**: BE tối ưu 200–400 dòng, trần 600. FE tối ưu 150–250, trần 400. Page/screen chỉ là orchestrator. ESLint `max-lines` chặn tự động. → [global/code-structure](coding-packs/standards/global/code-structure.md)
2. **TypeScript strict, không `any`**, không `@ts-ignore`. Dữ liệu từ ngoài vào (HTTP, socket, webhook, job, env) phải parse bằng zod schema trong `packages/shared`.
3. **Ranh giới**: không import chéo giữa app; module nghiệp vụ chỉ nằm ở `apps/server/src/modules`; feature FE không import nội bộ feature khác. `pnpm depcheck` chặn tự động.
4. **Phân quyền ở backend** bằng permission key (`m.edit`, `c.mod`, …), không check tên vai trò. → [backend/auth-rbac](coding-packs/standards/backend/auth-rbac.md)
5. **DB**: không query trong vòng lặp; index "bằng trước, khoảng/sort sau"; deferred join hoặc keyset khi phân trang; chỉ select cột cần. → [database/query-indexing](coding-packs/standards/database/query-indexing.md)
6. **Chat/realtime** tuân S-01 → S-12; không truy vấn DB cho từng người nhận. → [realtime/socket-chat](coding-packs/standards/realtime/socket-chat.md)
7. **Đổi trạng thái** chỉ qua hàm transition của domain, cập nhật có điều kiện (`WHERE status = <from>`).
8. **Hiệu ứng phụ quan trọng** (thanh toán, khóa tài khoản, duyệt) đi qua **outbox** trong cùng transaction. → [backend/nestjs-modules](coding-packs/standards/backend/nestjs-modules.md)
9. **Tiền** là số nguyên VND. **Thời gian** lưu `timestamptz` UTC, hiển thị `Asia/Ho_Chi_Minh`.
10. **Mọi thao tác Admin ghi `audit_logs`**, kể cả xuất dữ liệu cá nhân.
11. **Dịch vụ ngoài chỉ qua adapter** trong `packages/integrations`; dev/test dùng fake provider.
12. **Không secret trong repo**; biến env mới phải có trong `.env.example` + zod env schema. Không `console.*`, dùng logger.
13. **Test ở file riêng.** → [testing/testing](coding-packs/standards/testing/testing.md)
14. **Commit ngay khi xong và test pass**; `git status --short` sạch; báo DONE kèm **git commit SHA**. → [global/git-workflow](coding-packs/standards/global/git-workflow.md)

## Frontend: đọc thêm trước khi làm màn hình

[nextjs-structure](coding-packs/standards/frontend/nextjs-structure.md) · [routing-auth](coding-packs/standards/frontend/routing-auth.md) · [data-state](coding-packs/standards/frontend/data-state.md) · [antd-ui](coding-packs/standards/frontend/antd-ui.md) · **[ui-parity](coding-packs/standards/frontend/ui-parity.md)** (bắt buộc khi dựng UI theo prototype; từ D-134 parity pixel là số đo tham khảo + owner duyệt ảnh, không chặn DONE, nhưng lệch giao diện thật vẫn phải sửa)

## Làm việc theo team (avenger-assemble)

- Coder chỉ đọc file GOAL/RRI-GOAL/handoff của PM, không sửa, không commit chúng.
- Kiểm `pwd` + nhánh trước mỗi việc. Commit từng bước, liệt kê đường dẫn cụ thể (`git commit -- <paths>`), cấm `git add -A`.
- Port, DB, Redis đọc từ biến `TEAM_*` đã nạp sẵn, không gõ số tay.
- File dùng chung (`packages/ui/index.ts`, routes, `messages/vi/*.json`) chỉ thêm dòng, giữ khoá `.wire-lock` khi nối.
- Báo PM: `CODER-<i>-DONE: <việc> — <sha> — <N> test passed` hoặc `CODER-<i>-BLOCKED: <lý do>`. Không bịa số.

## Quy trình mỗi task (TIP)

Goal hiện hành: **TIP-V46-817 Vận hành AI** (D-138) — B3 nhật ký gọi AI + B4 AI cho Soạn nội dung / Kiểm duyệt + B5 ngân sách / model theo chức năng, danh sách ở [`coding-packs/plans/V4.6-DEBT.md`](coding-packs/plans/V4.6-DEBT.md); các mục B khác vẫn để sau. Tiến độ ở `coding-packs/reports/V4.6-progress.md` (dòng #17 trở đi).
Goal trước: **trả nợ V4.6** (D-137, TIP-V46-813 → 816) **đã xong** (08/11/2026, release PR #99 lên `main`).
Goal trước nữa: [`coding-packs/plans/GOAL-V4.6.md`](coding-packs/plans/GOAL-V4.6.md) — 12 TIP V46-801 → V46-812, **đã xong** (06/11/2026, release PR #93 lên `main`).

### Git flow

- `dev` là nhánh phát triển. Chỉ code trên `dev`
  hoặc nhánh `feature/*` tách từ `dev`; không tách feature mới từ `main`.
- Tích hợp feature về `dev`, không tích hợp thẳng vào `main`.
- Đưa `dev` lên `main` **bắt buộc tạo Pull Request** (`base: main`, `head: dev`).
  Owner review và tự merge; agent không tự merge PR, bật auto-merge, merge local
  vào `main` hoặc push trực tiếp `main`, trừ khi owner đổi chỉ đạo rõ ràng.
- Quy tắc này thắng mọi chỉ dẫn tự merge/push `main` trong goal, TIP hoặc handoff.

### Viết TIP

Viết đến đâu làm đến đấy: tới bước nào mới viết TIP bước đó, ngay trước khi code, dựa trên code `dev` lúc ấy. Claude Code dùng `/vibecode:tip`; agent khác (Codex, agy…) tự viết `coding-packs/tips/TIP-<id>-<slug>.md` theo khung TIP mẫu [`TIP-V42-701-bugs-b1-b6.md`](coding-packs/tips/TIP-V42-701-bugs-b1-b6.md): **HEADER** (TIP-ID, Module, Priority, Depends on, REQ / D, **Files touched** từng file create/modify, **Parallel-safe with**) · **CONTEXT** (mục P# trong `SPEC-V4.6-DELTA.md`, đoạn § đặc tả, chỗ prototype) · **APPLICABLE STANDARDS** · **TASK** · **SPECIFICATIONS** (đánh số, trích D-xx) · **ACCEPTANCE CRITERIA** (Given / When / Then, ghi tên test) · **CONSTRAINTS** (DO NOT / SKIP) · **BUILDER-CHECKLIST**. Commit TIP trong chính nhánh TIP.

### Các bước

1. Đọc TIP, REQ-ID liên quan, standards được TIP trích dẫn.
2. Tạo nhánh `feature/TIP-xxx-<slug>` từ `dev` mới nhất.
3. Code đúng phạm vi TIP. Thấy lỗi hoặc việc ngoài phạm vi thì ghi báo cáo, không tự sửa lan.
4. Thêm dependency mới phải ghi lý do; ưu tiên thư viện đã có trong stack.
5. Chạy `pnpm lint && pnpm typecheck && pnpm test` (+ e2e nếu TIP yêu cầu).
6. Commit (Conventional Commits), push, viết `coding-packs/reports/TIP-xxx-completion.md`.
7. Báo `TIP-xxx-DONE <sha>`, kèm cách verify và những gì chưa làm.

## Thuật ngữ

Dùng đúng tên trong [global/domain-glossary](coding-packs/standards/global/domain-glossary.md).
