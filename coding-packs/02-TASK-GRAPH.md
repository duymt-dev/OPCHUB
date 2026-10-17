# OPCHUB — Task Graph (Backend + tích hợp)

> Vibecode Kit v5.0 — BƯỚC 5 (TASK GRAPH). Cập nhật 17/10/2026 sau `/vibecode:blueprint`.
> FE (Portal + Admin) đã xong trên MSW ở pha G0 → G6 (`reports/G*-completion.md`). Đồ thị dưới là phần còn lại:
> **39 TIP backend + tích hợp + vận hành, 6 pha (B1 → B6), ~10 tuần** cho 1 agent chính + 3–4 agent song song.
> TIP file sinh bằng `/vibecode:tip TIP-Bxx` khi tới pha; tên file `tips/TIP-Bxx-<slug>.md`.

---

## PHA VÀ CỔNG KIỂM

| Pha | Nội dung | Cổng kiểm (mọi pha: lint, typecheck, test, depcheck, build xanh; commit + push; `reports/B<n>-completion.md`) |
|---|---|---|
| **B1** Nền tảng | Monorepo server, DB, Redis, outbox, audit, auth, guard | Integration test auth/guard/outbox trên Postgres + Redis thật; `pnpm --filter @opchub/server dev` chạy 3 process |
| **B2** Thành viên & phí | Đăng ký, OTP, SSO, hồ sơ, phí, đối soát, Admin Thành viên/Phí | Portal + Admin chạy với `NEXT_PUBLIC_API_MOCKING=off` cho luồng đăng ký → trả phí → kích hoạt; contract test nhóm account/fee |
| **B3** Cộng đồng & chat | Nhóm, yêu cầu vào nhóm, socket, chat, kiểm duyệt, thông báo | k6 1.000 socket / 10 tin/s xanh trên máy dev; behavior e2e chat chạy trên server thật |
| **B4** Nội dung | Sự kiện, dự án, nhà đầu tư, upload, dashboard | Contract test nhóm event/project/investor; EXPLAIN mọi list mới |
| **B5** Quản trị | Cài đặt, RBAC, mail, export, marketing, Tổng quan, bot + dịch vụ sau flag | Contract test toàn bộ `/admin/*`; audit có đủ dòng cho mọi thao tác ghi |
| **B6** Chuyển FE sang server thật + go-live | Bỏ MSW, e2e + parity trên server thật, k6 5.000, hạ tầng VPS | 115 behavior + 205 parity xanh với MSW tắt; k6 §14.2 đạt; deploy staging |

## DEPENDENCY GRAPH

```
B1  B01 scaffold-server ──┬── B02 db-schema-core ── B03 outbox-audit ──┐
                          ├── B04 common (config/log/redis/filter) ────┤
                          └── B05 shared-contract (socket/queues/err) ─┤
                                                                       ▼
                               B06 auth-core (JWT/refresh/argon2) ── B07 guards-rbac-paywall
                                         │
B2      ┌────────────────────────────────┼──────────────────────────────┐
        ▼                                ▼                              ▼
   B10 integrations-adapters      B11 register-otp-sso          B13 profile-me
        │                          │       │                          │
        ▼                          ▼       ▼                          │
   B12 password-totp ◄────────────┘   B14 membership-fee-reconcile ◄─┘
                                        │
                                        ▼
                                   B15 admin-members-fees
B3      B20 community-groups ── B21 group-requests-owner
             │
             ▼
        B22 socket-gateway ── B23 chat-messages ── B24 moderation-keywords
             │                      │
             ▼                      ▼
        B25 notifications ◄──── (mentions)
B4      B30 storage-upload ─┬─ B31 events
                            ├─ B32 projects-review ── B33 investors
                            └─ B34 dashboard-reporting
B5      B40 settings-rbac ── B41 mail-welcome-smtp ── B42 marketing
        B43 export-jobs        B44 admin-overview-stats
        B45 bot (flag) ◄── B23        B46 service-requests (flag)
B6      B60 fe-real-api-switch ── B61 contract-tests ── B62 e2e-on-server ── B63 parity-on-server
        B64 infra-vps-systemd-nginx ── B65 backup-observability ── B66 k6-load ── B67 staging-golive
```

## TIP SUMMARY TABLE

| TIP | Tên | Depends on | Priority | Est. h | Tuần | REQ / quyết định |
|-----|-----|-----------|----------|-------:|-----:|---|
| B01 | `apps/server` NestJS 11, 3 entrypoint, turbo task, env zod | — | P0 | 6 | 1 | ADR-0001 |
| B02 | `packages/db`: Prisma 7 schema theo domain (core: account, fee, community, system), migration đầu + extension, seed bắt buộc | B01 | P0 | 10 | 1 | data-model §1–3, §14 |
| B03 | Outbox (bảng, `OutboxService.add(tx)`, relay worker SKIP LOCKED) + `AuditService` (insert-only, REVOKE) | B02 | P0 | 6 | 1 | ADR-0005, luật 8, 10 |
| B04 | `common/`: config, pino + requestId, Prisma/Redis provider, exception filter → envelope lỗi, throttler Redis, helmet/CORS | B01 | P0 | 6 | 1 | api-conventions, security |
| B05 | `packages/shared`: `socket/` (event + zod), `queues/` (tên + payload), bổ sung `errors.ts`; `nestjs-zod` pipe | B01 | P0 | 4 | 1 | socket-chat, queues-workers |
| B06 | Auth core: argon2id, JWT 15', refresh xoay vòng + family revoke, `/auth/login|logout|refresh`, khoá 5 lần (D-44) | B02, B04 | P0 | 10 | 2 | REQ-001…, D-34, D-44 |
| B07 | Guards: JwtAuth → AccountStatus → MembershipFee (claim + Redis, S-03) → Permission (D-20/46) → GroupRole; decorator; test ma trận | B06 | P0 | 8 | 2 | auth-rbac, D-14, D-43 |
| B10 | `packages/integrations`: mail (smtp + fake/Mailpit), bank-webhook (sepay + fake + `/dev/bank/simulate`), tax-lookup (esgoo → vietqr + fake), storage (s3/MinIO), llm (fake) | B01 | P0 | 10 | 2 | adapters, D-07, D-17 |
| B11 | Đăng ký cá nhân/DN (tra MST D-40), OTP Redis, kích hoạt + mail chào mừng qua outbox (D-47), SSO + `/auth/sso/complete` (D-45), `/public/settings`, `/public/stats` | B07, B10 | P0 | 14 | 3 | BR-01, BR-06, D-30, D-38, D-45 |
| B12 | Quên/đặt lại mật khẩu, đổi mật khẩu, thu hồi phiên khác, TOTP admin (D-27) | B06, B10 | P0 | 8 | 3 | D-10, D-27 |
| B13 | `/me` GET/PATCH, hồ sơ DN, `/members/suggest`, `/me/sso/:provider` | B07 | P0 | 6 | 3 | REQ hồ sơ |
| B14 | Phí: `/me/membership`, transfer-confirm (Idempotency-Key), `/webhooks/bank` HMAC, reconcile job + poll 2', scheduler expiring/expired, `membership.updated` | B07, B10, B03 | P0 | 14 | 3–4 | BR-03…05, D-31, D-41 |
| B15 | Admin Thành viên (deferred join, counts, khoá/mở + thu hồi phiên, gán nhóm BR-07, xác minh DN, role qua s.role) + Admin Phí (summary, collect có lý do, nhắc, GD không khớp) | B14, B13 | P0 | 14 | 4 | REQ-045, D-32, D-41, D-42 |
| B20 | Nhóm: `/groups` lọc/tìm/sắp xếp, join/leave, Admin Nhóm CRUD, member-counts | B07 | P0 | 10 | 4 | REQ-044, BR-06 |
| B21 | Yêu cầu vào nhóm: chủ nhóm duyệt/từ chối (D-43), `member.request`, Admin `/admin/groups/requests` | B20, B03 | P0 | 6 | 5 | QT-28…30 |
| B22 | Socket process: handshake JWT, `user:{id}`, `room.join` cache quyền, presence Redis gom 5s, `session.revoked`, redis-adapter | B07, B05 | P0 | 12 | 5 | S-01, S-02, S-06 |
| B23 | Chat: `message.send` (idempotent, ack sau commit), react/pin/reply, REST lịch sử keyset + `after=`, read cursor + counter Redis, rooms/members/files/pins, `/me/chat` | B22, B20 | P0 | 16 | 5–6 | S-02, S-04, S-05, S-12 |
| B24 | Kiểm duyệt: báo cáo tin, từ khoá Aho-Corasick reload pub/sub, Admin reports + action (ẩn/cảnh báo/khoá qua outbox), xem chat chỉ đọc (D-26) | B23 | P0 | 10 | 6 | S-08, D-26 |
| B25 | Thông báo: tạo theo S-04, `/notifications` keyset, đánh dấu đọc, `notification.new` | B22 | P0 | 6 | 6 | S-04 |
| B30 | Upload: `/uploads/presign` (MIME/5MB/key ngẫu nhiên), kiểm `head`, gắn avatar/cover/logo/persona (Q-G*-2/3) | B10 | P0 | 6 | 6 | security upload |
| B31 | Sự kiện Portal + Admin: CRUD, đăng ký/huỷ (khoá chỗ), check-in, xuất, `registrationOpen` (Q-G5a-5), mail thay đổi | B30, B03 | P0 | 10 | 7 | REQ sự kiện |
| B32 | Dự án: CRUD (sanitize HTML), state machine D-18, bình luận/like/resolve, follow, share, repo-access, Admin duyệt/bulk/featured/counts | B30, B03 | P0 | 16 | 7 | BR-08, D-18, D-19 |
| B33 | Nhà đầu tư: interest (BR-09, Idempotency-Key), thread, Admin list gom người + transition + ghi chú + xuất | B32 | P0 | 10 | 8 | BR-09, D-14 |
| B34 | Dashboard Portal `/dashboard/live` + `/projects/stats` từ `stats_daily`/Redis | B23, B32 | P1 | 6 | 8 | S-10 |
| B40 | Cài đặt: general, security (D-33/D-44), languages, categories (BR-11), role permissions (s.role + bump permVersion), admin invite/revoke, audit log | B07, B03 | P0 | 12 | 8 | D-20, D-33, D-42, D-46 |
| B41 | Mail: template chào mừng (D-47) GET/PUT/test, SMTP (key AES-GCM, verify/test), worker `mail` + `mail_logs`, `/me/welcome-mail` | B10, B40 | P0 | 8 | 8 | D-13, D-47 |
| B42 | Marketing: campaigns CRUD, estimate, send qua outbox 202, templates, mail log + resend | B41 | P1 | 8 | 9 | D-33, Q-G6b-* |
| B43 | Export jobs: queue `export` → CSV MinIO → `/admin/exports/:id` presigned GET, audit (users, fees, groups, events, investors, requests) | B10, B03 | P0 | 6 | 9 | luật 10, Q-G4a-6 |
| B44 | Admin Tổng quan `/admin/overview` + scheduler `stats_daily`; badge sidebar counts | B15, B32 | P1 | 6 | 9 | S-10 |
| B45 | Bot (flag): personas, scripts, run → thread `pending`, approve → đăng qua đường chat với `persona_id` (D-48), rate limit nhóm (S-11), log/activity | B23 | P2 | 12 | 10 | D-04, D-48, BR-10 |
| B46 | Dịch vụ (flag): services, `/service-requests` (Idempotency-Key), Admin list/summary/transition/assignee/comments + mention notification | B25 | P2 | 10 | 10 | D-21, Q-G5c-4 |
| B60 | FE: `NEXT_PUBLIC_API_MOCKING=off` chạy được — api-client refresh 401, socket transport thay `restTransport`, upload MinIO thật, bỏ số cứng Tổng quan | B23, B30, B44 | P0 | 10 | 9 | data-state, routing-auth |
| B61 | Contract test: gọi từng endpoint của `plans/api-contract.md` trên server, parse bằng zod schema FE | B60 | P0 | 8 | 10 | api-contract |
| B62 | `seed:demo` từ mock-data + 115 behavior e2e chạy trên server thật | B61 | P0 | 8 | 10 | testing |
| B63 | Parity 205 dòng chạy trên server thật (MSW tắt) — không tụt so với G6 | B62 | P0 | 4 | 10 | ui-parity |
| B64 | `infra/`: Nginx, systemd units (portal@, admin, api@, socket@, worker), PgBouncer, MinIO, Redis, deploy script | B01 | P0 | 8 | 9 | ADR-0004, Vision §3.2 |
| B65 | Backup pg_dump + WAL offsite, Sentry, healthcheck, log rotate, cảnh báo SLO §14.1 | B64 | P0 | 6 | 10 | NFR |
| B66 | k6: đăng ký 200/phút, 5.000 socket 50 tin/s, Admin 100 phiên, 1.000 CK/giờ | B23, B14, B64 | P0 | 8 | 10 | §14.2 |
| B67 | Staging + checklist go-live (UAT-01 → UAT-31 trên staging) | B63, B65, B66 | P0 | 6 | 10 | §15 |

**Tổng ~334 giờ.** Ước tính cho agent; đo lại sau B1 rồi chỉnh.

## PARALLELIZATION OPPORTUNITIES

| Pha | Chạy song song (worktree riêng, mỗi agent một thư mục `modules/<domain>`) | Tuần tự bắt buộc |
|---|---|---|
| B1 | B03 ‖ B04 ‖ B05 (sau B02/B01) | B01 → B02; B06 → B07 |
| B2 | B10 ‖ B13 ; rồi B11 ‖ B12 | B14 sau B10 + B03; B15 cuối pha |
| B3 | B20 ‖ B22 ; B24 ‖ B25 | B21 sau B20; B23 sau B22 + B20 |
| B4 | B31 ‖ B32 ‖ B34 (sau B30) | B33 sau B32 |
| B5 | B40 ‖ B43 ‖ B45 ‖ B46 ; B41 → B42 ; B44 | — |
| B6 | B64 ‖ B60 ; B65 ‖ B61 | B62 → B63 → B67; B66 sau B64 |

File dùng chung (chỉ thêm dòng, như G2–G6): `apps/server/src/api/api-app.module.ts`, `socket-app.module.ts`, `worker-app.module.ts`,
`packages/db/prisma/schema/*.prisma` (mỗi domain một file → ít đụng), `packages/shared/src/{socket,queues}/index.ts`, `worker/schedules.ts`.
Migration Prisma: **chỉ agent chính tạo migration** sau khi gộp schema của các làn (tránh hai migration xung đột thứ tự).

## TEAM ALLOCATION

| Vai | Ai | Việc |
|---|---|---|
| Chủ nhà | Bạn | Chốt OQ còn mở (xem `BUILDER-HANDOFF.md` → Escalation), cấp secret (SSO, SePay, Brevo, VPS) |
| Agent chính (Chủ thầu + thợ tích hợp) | Claude Code phiên chính | Sinh TIP, chia làn, tạo migration, gộp, cổng kiểm, completion report |
| Làn A | subagent worktree | account / auth / settings (B06, B11–B13, B40) |
| Làn B | subagent worktree | membership-fee / integrations / export / mail (B10, B14, B41–B43) |
| Làn C | subagent worktree | community / chat / socket / moderation / notification (B20–B25, B45) |
| Làn D | subagent worktree | event / project / investor / reporting / service-request (B31–B34, B44, B46) |
