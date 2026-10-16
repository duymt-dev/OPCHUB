# OPCHUB — Hướng dẫn cho coding agent

Đọc hết file này trước khi code. Rule chi tiết ở `coding-packs/standards/` (index: `coding-packs/standards/README.md`).
Global `~/.claude/CLAUDE.md` vẫn áp dụng; file này cụ thể hóa cho dự án. Khi hai bên khác nhau, lấy rule **chặt hơn**.

## Dự án

OPC Hub Community (opchub.community): nền tảng cộng đồng cho doanh nghiệp một người tại Việt Nam. Có nhóm theo 34 tỉnh/thành, chat nhóm realtime, sự kiện, dự án gọi vốn, nhà đầu tư. Thu phí thành viên 600.000đ/năm bằng chuyển khoản, đối soát tự động.

Nguồn sự thật, theo thứ tự ưu tiên khi mâu thuẫn:
1. `coding-packs/01-REQUIREMENTS-MATRIX.md`: REQ-ID, **Decisions Log** (D-xx), Open Questions (OQ-xx)
2. `coding-packs/00-PROJECT-CONTEXT.md`: Scan Report + **Vision** (kiến trúc, nguyên tắc scale S-01 → S-12)
3. Đặc tả `OPCHUB Thiết kế giải pháp cộng đồng/deploy/dac-ta.html` (OPCHUB-SRS-2.0): QT-xx, BR-xx, §8 máy trạng thái, §13 API
4. Prototype `.../deploy/index.html`: chỉ để tham chiếu layout, copy chữ, dữ liệu seed. **Không copy code.**

Không tự quyết nghiệp vụ. Gặp chỗ mơ hồ thì ghi vào báo cáo và hỏi, không đoán.

## Stack đã chốt (đổi phải có quyết định mới trong Decisions Log)

Monorepo pnpm + Turborepo · Next.js 14 App Router + Ant Design 5 + TanStack Query + next-intl · NestJS · Prisma + PostgreSQL 16 (+ PgBouncer) · Redis 7 · BullMQ · Socket.IO + redis-adapter · MinIO (S3 API) · auth tự viết (passport, JWT, argon2, TOTP) · Brevo SMTP · Zod dùng chung FE/BE · Vitest, Playwright, k6. Hạ tầng: 1 VPS cài native (systemd, Nginx), không Docker/K8s.

## Bản đồ repo

```
apps/portal      Next.js — User Portal
apps/admin       Next.js — Admin Dashboard
apps/api         NestJS REST  (src/modules/<domain>/)
apps/socket      NestJS Socket.IO gateway
apps/worker      NestJS BullMQ processors
packages/db           Prisma schema, migrations, seed, SQL truy vấn
packages/shared       zod schemas, enums, error codes, permission keys, queue/event names
packages/ui           AntD theme + component dùng chung
packages/integrations adapters: bank-webhook, tax-lookup, phone-otp, mail, storage, llm
infra/           nginx, systemd, backup, k6
coding-packs/    tài liệu vibecode (TIP, report) — không phải code
```

## Lệnh (sau khi scaffold)

```
pnpm install
pnpm dev                     # chạy mọi app
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @opchub/db migrate:dev     # tạo migration (--create-only rồi sửa SQL)
pnpm --filter @opchub/db seed
pnpm e2e                     # Playwright
```

## Luật cứng (vi phạm thì không được báo DONE)

1. **Kích thước file**: BE tối ưu 200–400 dòng, trần 600. FE tối ưu 150–250, trần 400. Page/screen chỉ là orchestrator; tách `components/`, `hooks/`, `types.ts`. → [global/code-structure](coding-packs/standards/global/code-structure.md)
2. **TypeScript strict, không `any`**, không `@ts-ignore`. Mọi dữ liệu từ ngoài vào (HTTP, socket, webhook, job, env) phải parse bằng zod schema đặt trong `packages/shared`.
3. **Phân quyền ở backend** bằng permission key (`m.edit`, `c.mod`, …), không check tên vai trò. Không tin dữ liệu client gửi lên. → [backend/auth-rbac](coding-packs/standards/backend/auth-rbac.md)
4. **DB**: không query trong vòng lặp. List phải có index đúng thứ tự "bằng trước, khoảng/sort sau". Bảng lớn phân trang bằng deferred join hoặc keyset. Chỉ select cột cần dùng. → [database/query-indexing](coding-packs/standards/database/query-indexing.md)
5. **Chat/realtime** tuân S-01 → S-12. Tuyệt đối không truy vấn DB cho từng người nhận. → [realtime/socket-chat](coding-packs/standards/realtime/socket-chat.md)
6. **Đổi trạng thái** (phí, nhóm, dự án, quan tâm đầu tư, …) chỉ đi qua hàm transition của domain đó, kiểm cặp from→to hợp lệ theo SRS §8, cập nhật có điều kiện (`WHERE status = <from>`).
7. **Tiền** là số nguyên VND, không float. **Thời gian** lưu `timestamptz` UTC, API trả ISO 8601, hiển thị `Asia/Ho_Chi_Minh`.
8. **Mọi thao tác Admin ghi `audit_log`**. Xuất dữ liệu cá nhân cũng ghi log.
9. **Dịch vụ ngoài chỉ gọi qua adapter** trong `packages/integrations`. Dev/test dùng fake provider.
10. **Không secret trong repo.** Biến môi trường mới phải thêm vào `.env.example` và zod env schema.
11. **Không `console.log`**, dùng logger (pino). Không log mật khẩu, OTP, token, nội dung CK đầy đủ.
12. **Test để ở file riêng**, không viết test dài trong file production. → [testing/testing](coding-packs/standards/testing/testing.md)
13. **Commit ngay khi xong và test pass.** Trước khi báo DONE: `git status --short` phải sạch, báo kèm **git commit SHA**. → [global/git-workflow](coding-packs/standards/global/git-workflow.md)

## Quy trình mỗi task (TIP)

1. Đọc TIP, các REQ-ID liên quan, standards được TIP trích dẫn.
2. Tạo nhánh `feature/TIP-xxx-<slug>` từ `main` mới nhất.
3. Code đúng phạm vi TIP. Thấy lỗi hoặc việc ngoài phạm vi thì ghi vào báo cáo, không tự sửa lan.
4. Thêm dependency mới phải ghi lý do trong báo cáo; ưu tiên thư viện đã có trong stack.
5. Chạy `pnpm lint && pnpm typecheck && pnpm test` (và e2e nếu TIP yêu cầu).
6. Commit (Conventional Commits), push, viết Completion Report vào `coding-packs/reports/TIP-xxx-completion.md`.
7. Báo `TIP-xxx-DONE <sha>`, kèm cách verify và những gì chưa làm.

## Thuật ngữ

Dùng đúng tên trong [global/domain-glossary](coding-packs/standards/global/domain-glossary.md). Không tự đặt tên khác cho cùng một khái niệm.
