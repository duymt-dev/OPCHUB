# TIP-B02: `packages/db` — Prisma 7 schema core, migration đầu, seed bắt buộc

## HEADER
- TIP-ID: TIP-B02
- Project: OPCHUB
- Module: db
- Priority: P0
- Depends on: TIP-B01
- Estimated: L (10h)
- **Files touched:**
  - `packages/db/package.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `prisma.config.ts`, `.env.example` (create)
  - `packages/db/prisma/schema/_base.prisma`, `account.prisma`, `membership-fee.prisma`, `community.prisma`, `settings.prisma`, `system.prisma` (create)
  - `packages/db/prisma/migrations/<ts>_init/migration.sql` + `down.sql` (create)
  - `packages/db/src/index.ts`, `src/client.ts` (create); `src/generated/**` (sinh, gitignored)
  - `packages/db/seed/index.ts`, `seed/provinces.ts`, `seed/roles.ts`, `seed/settings.ts`, `seed/super-admin.ts`, `seed/categories.ts` (create)
  - `packages/db/test/schema.int.spec.ts` (create)
  - `pnpm-workspace.yaml` (modify — catalog prisma), `.gitignore` (modify — `packages/db/src/generated/`)
- **Parallel-safe with:** TIP-B04, TIP-B05 (khác file). Sequential, shares `pnpm-workspace.yaml` with TIP-B01/B04/B06.

## CONTEXT
- Prisma **7.10.1** + `@prisma/adapter-pg` (Prisma 7 bắt buộc driver adapter), generator `prisma-client` output `src/generated`.
- DB local: `opchub_dev`, `opchub_test` (role `opchub`, extension có sẵn). URL ở `D:\opchub-local\db.env` → `packages/db/.env` (gitignored).
- Key files: `coding-packs/plans/data-model.md` §1, §2, §3, §10, §14 + Seed; `packages/shared/src/enums.ts`, `permissions.ts`;
  `packages/shared/src/fixtures/prototype-seed.json` (34 tỉnh, nhóm, danh mục).

## APPLICABLE STANDARDS
- [database/prisma-migrations](../standards/database/prisma-migrations.md) — schema nhiều file, `--create-only`, `down.sql`, seed upsert
- [database/query-indexing](../standards/database/query-indexing.md) — index bằng trước/khoảng sau, INCLUDE, partial, expression
- [global/domain-glossary](../standards/global/domain-glossary.md) — enum

## TASK
Dựng `@opchub/db`: schema Prisma theo domain cho các bảng **core** (account, membership-fee, community: groups + group_members + rooms,
settings: categories/role_permissions/app_settings/smtp_configs/admin_invites, system: audit_logs/outbox_events/stats_daily/export_jobs),
migration đầu viết tay phần index đặc biệt, `createPrismaClient()` dùng chung, seed bắt buộc idempotent. Domain còn lại (chat messages,
event, project…) do TIP pha sau thêm file `.prisma` riêng.

## SPECIFICATIONS
### Business Rules
1. Quy ước data-model "Quy ước chung": `id uuid` `@default(uuid(7))`, `created_at/updated_at timestamptz(6)`, `@@map` snake_case số nhiều.
2. Enum Postgres đúng giá trị `packages/shared/src/enums.ts` (+ `system_role`, `fee_period_source`, `payment_match_status`, …).
3. Migration `init` (tạo bằng `--create-only` rồi sửa tay) thêm: `CREATE EXTENSION IF NOT EXISTS citext, unaccent, pg_trgm`;
   hàm `immutable_unaccent(text)` IMMUTABLE; sequence `member_code_seq`;
   `users_list (account_type, created_at DESC) INCLUDE (full_name, email, status) WHERE deleted_at IS NULL`;
   `users_search GIN ((immutable_unaccent(full_name) || ' ' || email::text) gin_trgm_ops)`;
   `membership_fees_due (valid_until) WHERE status IN ('active','expiring')`;
   `payment_tx_unmatched (received_at DESC) WHERE match_status='unmatched'`;
   `group_members_pending (group_id, created_at DESC) WHERE status='pending'`;
   `groups_search GIN (immutable_unaccent(name) gin_trgm_ops)`;
   `outbox_pending (id) WHERE dispatched_at IS NULL`;
   audit_logs insert-only: trigger `BEFORE UPDATE OR DELETE` raise exception (role local là owner nên REVOKE không đủ; production thêm REVOKE ở B64).
4. `down.sql` đảo ngược đầy đủ.
5. `createPrismaClient(url)` trả `PrismaClient` dùng `PrismaPg`; export type `Prisma`, `PrismaClient`, enum.
6. Seed bắt buộc (upsert, chạy 2 lần không đổi): 34 nhóm tỉnh (slug `c1…c34`, region, phòng `general` — bảng `rooms` tối thiểu ở B02,
   cột chat đầy đủ ở B23), danh mục lĩnh vực, `role_permissions` = `DEFAULT_ROLE_PERMISSIONS`, `app_settings` (general, security, languages,
   welcome_mail không `showPassword`), Super Admin `admin@opchub.community` (mật khẩu từ env `SEED_SUPER_ADMIN_PASSWORD`, argon2id).
7. Scripts: `generate`, `migrate:dev`, `migrate:deploy`, `migrate:test` (deploy vào `TEST_DATABASE_URL`), `seed`, `typecheck`, `lint`, `test:int`.

### Validation
- Seed parse dữ liệu nguồn bằng zod trước khi ghi.

### Error Handling
- Seed lỗi → exit 1, không nuốt lỗi.

## ACCEPTANCE CRITERIA
- Given DB `opchub_test` trống When `migrate:test` Then áp dụng không lỗi và `\d users` có index `users_list` với INCLUDE.
- Given đã seed When chạy seed lần 2 Then số dòng groups=34, role_permissions=3 không đổi (int test).
- Given một dòng audit_logs When `UPDATE`/`DELETE` Then lỗi (int test).
- Given `membership_fees` When chèn status ngoài enum Then lỗi.
- `EXPLAIN` truy vấn deferred join users (10k dòng sinh bằng `generate_series`) dùng `users_list` — ghi vào completion report.

## CONSTRAINTS
- DO NOT: `Float/Decimal` cho tiền; sửa migration đã áp dụng; một file schema khổng lồ; seed demo ở đây (B62).
- REUSE: enum/permission của `@opchub/shared`; dữ liệu tỉnh từ `prototype-seed.json`.
- SKIP: bảng chat/event/project/investor/notification/mail/bot (TIP pha sau).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng *Files touched*
- [ ] Mỗi AC có bằng chứng; EXPLAIN dán vào report
- [ ] `pnpm --filter @opchub/db lint typecheck test:int` xanh
- [ ] Rule HANDOFF 5: index bằng trước/khoảng sau + INCLUDE/partial; chỉ agent chính tạo migration
- [ ] Rule HANDOFF 4: audit_logs chỉ INSERT (trigger chặn)
- [ ] Không secret trong repo; commit đường dẫn cụ thể, git sạch, SHA
