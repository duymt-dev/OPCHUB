# B1 — Nền tảng backend (TIP-B01 → B07) — DONE

- Nhánh: `main` (agent chính làm tuần tự, không mở làn song song ở pha này)
- SHA cuối của code pha: `b3ddcaa` (báo cáo này commit sau, SHA ghi ở commit message)
- Ngày: 17/10/2026

## TIP

| TIP | Nội dung | Commit |
|---|---|---|
| B01 | `apps/server` NestJS 11, 3 entrypoint (`main-api`, `main-socket`, `main-worker`), env zod một chỗ, build tsdown (giữ decorator metadata), depcheck ranh giới server | `35857ce` |
| B02 | `packages/db` Prisma 7 schema theo domain (account, membership-fee, community, settings, system), migration `init` + `users_list_covering_id`, seed bắt buộc idempotent | `85b3144` |
| B03 | `OutboxService.add(tx)`, relay `FOR UPDATE SKIP LOCKED` mỗi giây trong worker, `AuditService` chỉ INSERT | `11e025f` |
| B04 | `common/`: pino + request id + redact, PrismaService, RedisService (prefix `opchub:`), `AppError` + filter envelope, `@ZodBody/@ZodQuery/@ZodParams`, throttler Redis, helmet/CORS/cookie | `b67d83e` |
| B05 | `@opchub/shared/socket` (event + zod payload + ack), `/queues`, `/outbox` | `deb1702` |
| B06 | Đăng nhập email/SĐT, access JWT 15', refresh xoay vòng + thu hồi chuỗi khi dùng lại, D-34, D-44, BR-02, `GET /me`, logout | `b4b13d1` |
| B07 | 5 guard toàn cục theo thứ tự (JwtAuth → AccountStatus → MembershipFee → Permission → GroupRole) + decorator; ma trận test | guard trong `b4b13d1`, test `655b407` |

## Cổng kiểm B1

| Mục | Kết quả |
|---|---|
| `pnpm lint` | 7/7 task xanh |
| `pnpm typecheck` | 7/7 task xanh (sau `b3ddcaa`: bỏ `e2e/scripts/` gitignored khỏi typecheck) |
| `pnpm test` (unit) | 5/5 task xanh; server 20 test, shared 73 test |
| `pnpm --filter @opchub/server test:int` | **35/35** trên Postgres `opchub_test` + Redis db 2 (envelope 5, outbox 5, audit 4, auth 10, guard 11) |
| `pnpm --filter @opchub/db test:int` | **6/6** (seed idempotent, phòng general, audit chặn UPDATE/DELETE, enum, CHECK thu tay, index covering) |
| `pnpm depcheck` | 0 vi phạm (FE+packages 1004 module; server 121 module) |
| `pnpm build` | 3/3 task xanh |
| `pnpm --filter @opchub/server dev` | 3 process khởi động; `GET /v1/health` 200; `POST /v1/auth/login` Super Admin seed → 200 trên `opchub_dev` |

## EXPLAIN (12.000 users, `opchub_test`, đã VACUUM ANALYZE) — `reports/explain/B02-users-list.txt`

| Query | Plan | Thời gian |
|---|---|---|
| Admin Thành viên: deferred join `account_type=business`, OFFSET 3000 | **Index Only Scan** `users_list`, Heap Fetches 0 → PK lookup 10 dòng | 0.61 ms |
| Deferred join mọi loại, OFFSET 3000 | **Index Only Scan** `users_list_all`, Heap Fetches 0 | 0.49 ms |
| Tìm không dấu `immutable_unaccent(full_name) \|\| ' ' \|\| email` ILIKE | Bitmap Index Scan `users_search` (GIN trigram) | 2.5 ms |

Lần đo đầu: `users_list` thiếu `id` trong INCLUDE → planner chọn Seq Scan. Đã sửa bằng migration mới
`20261017033500_users_list_covering_id` (không sửa migration đã áp dụng).

## Soát CODING RULE 1–15

| # | Kết quả |
|---|---|
| 1 Kích thước | File lớn nhất BE: `test/common/guards.int.spec.ts` 153 dòng; nguồn lớn nhất `common/auth/guards.ts` 130. ESLint `max-lines` 600 xanh |
| 2 Không dồn code | Mỗi file một trách nhiệm; account / membership-fee tách module |
| 3 Test file riêng | `*.spec.ts` cạnh nguồn, `test/**/*.int.spec.ts` |
| 4 TS strict | Không `any`/`@ts-ignore`/non-null; mọi input (HTTP body, env, JWT claim, Redis cache, outbox payload, seed) parse zod |
| 5 Ranh giới | `membership-fee → account/index.ts` (cổng `FeeReader`), `common` không import `modules` (rule depcruise mới); không `forwardRef` |
| 6 Permission key | `PermissionGuard` dùng `hasPermission`; ma trận quyền từ Redis/DB, không so tên vai trò |
| 7 Postgres | Index bằng trước/sort sau + INCLUDE + partial (`users_list`, `membership_fees_due`, `payment_tx_unmatched`, `group_members_pending`, `outbox_pending`), expression GIN; refresh token thu hồi theo `WHERE revoked_at IS NULL`; relay cập nhật `id = ANY(...)`, không query trong vòng lặp |
| 8 Transition | Refresh token thu hồi có điều kiện (0 dòng → 401). Các state machine nghiệp vụ bắt đầu từ B11 |
| 9 Outbox | `OutboxService.add(tx)` cùng transaction; test rollback |
| 10 Tiền/thời gian | `amount Int`, mọi cột thời gian `timestamptz(6)` |
| 11 Audit | `AuditService` chỉ INSERT + trigger chặn UPDATE/DELETE/TRUNCATE |
| 12 Adapter | Chưa gọi dịch vụ ngoài (B10) |
| 13 Secret/env | `.env` gitignored, `.env.example` đủ tên biến; `JWT_SECRET` ≥ 32; logger redact authorization/cookie/password/token |
| 14 Chat | Hợp đồng socket `message.new` bỏ `isSimulated` (test) |
| 15 Git | Commit từng TIP với đường dẫn cụ thể; `git status --short` sạch; push `main` |

## Lệch / câu hỏi

- **Q-B02-1** (đã ghi `questions.md`): khoá chính kiểu `text` (UUID v7 cho bản ghi mới, seed giữ id prototype `c1`, `m1`, `p1`…)
  vì e2e và URL FE dùng id prototype. Hợp đồng zod là `z.string()` nên FE không đổi.
- Cookie refresh path `/v1/auth` (không phải `/v1/auth/refresh`) để logout đọc được cookie; vẫn `HttpOnly; SameSite=Lax`, `Secure` theo env.
- Audit insert-only bằng trigger (role local là owner nên REVOKE không có tác dụng); production thêm REVOKE ở B64.
- Thêm `tsx` làm dev dependency của `@opchub/db` để chạy seed TypeScript; thêm `@nest-lab/throttler-storage-redis` (storage Redis cho throttler, peer NestJS 11).

## Chưa làm (thuộc pha sau)

- TOTP admin (B12), SSO (B11), `GET /me` đầy đủ `profileSchema` (B13).
- `GroupRolePort` thật (B20); socket handshake dùng `AccessTokenService` (B22).
