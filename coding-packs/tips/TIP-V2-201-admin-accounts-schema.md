# TIP-V2-201: Bảng tài khoản quản trị, 25 khoá quyền, seed 5 vai trò (D-52, §21.1–21.5)

## HEADER
- TIP-ID: TIP-V2-201 · Project: OPCHUB · Module: admin-account (mới) + db + shared · Priority: P0 · Depends on: TIP-V2-115 (cuối P1) · Estimated: L
- **Files touched:**
  - `packages/db/prisma/schema/admin.prisma` (create): `AdminRole`, `AdminRolePermission`, `AdminUser`, `AdminRefreshToken`
  - `packages/db/prisma/schema/notification.prisma`, `packages/db/prisma/schema/account.prisma` (modify: bỏ relation `Notification.user` → bỏ FK `notifications.user_id`, người nhận có thể là TK quản trị)
  - `packages/db/prisma/migrations/<ts>_admin_accounts/migration.sql` (create — **migration do agent chính tạo, `--create-only` + review SQL**)
  - `packages/shared/src/permissions.ts`, `packages/shared/src/permissions.spec.ts` (modify: thêm 25 khoá, giữ khoá cũ tới TIP-V2-204)
  - `packages/shared/src/api-domains/admin-rbac.ts` (create), `packages/shared/src/api-domains/index.ts` (modify: thêm 1 dòng export)
  - `packages/db/seed/catalog.ts`, `packages/db/seed/required.ts` (modify: seed 5 vai trò + ma trận §21.2 + Super Admin trong `admin_users`)
  - `packages/db/seed/demo/admin.ts` (create: 6 TK quản trị theo prototype ver2), `packages/db/seed/demo/index.ts`, `packages/db/seed/demo/reset.ts` (modify)
  - `apps/server/src/modules/admin-account/` (create): `admin-account.module.ts`, `index.ts`, `controllers/{admin-accounts,admin-roles}.controller.ts`, `services/{admin-accounts,admin-roles,role-grants}.service.ts`, `repositories/{admin-user,admin-role}.repository.ts`
  - `apps/server/src/common/auth/auth-state.service.ts` (modify: cache quyền theo vai trò `auth:admin_grants:<roleId>`)
  - `apps/server/src/modules/account/ports.ts`, `apps/server/src/modules/account/services/member-directory.service.ts`, `apps/server/src/modules/account/repositories/registration.repository.ts` (modify: cổng `ADMIN_EMAIL_PORT` + `emailTaken`)
  - `apps/server/src/modules/mail/templates.ts` (modify: `adminLoginMail`)
  - `apps/server/src/api/api-app.module.ts`, `apps/server/src/worker/worker-app.module.ts` (modify: chỉ thêm dòng import module)
  - `apps/server/test/admin-account/{admin-accounts,admin-roles}.int.spec.ts` (create), `packages/db/test/seed-demo.int.spec.ts` (modify)
- **Parallel-safe with:** sequential (P2 tuần tự 201 → 202 → 203 → 204); shares `permissions.ts` với 202–204
- **Phase / nhánh:** V2-P2, `feature/V2-P2-admin-rbac`

## CONTEXT
- Đọc: `dacta-v3` §21.1 (RB-R02, R04, R05), §21.2 (ma trận), §21.3 QT-RB-01, §21.5 dữ liệu, §21.6 AT-RB01; Decisions D-52, D-49 (thay D-20/D-42/D-46).
- Prototype ver2 `docs/spec/index.html`: `ADM_ROLES0`, `ADM_PERMS` (25 dòng, thứ tự chuẩn), `ADM_DEF` (ma trận mặc định), `stAdmins` (6 TK mẫu), form "Tạo tài khoản quản trị" (họ tên, SĐT, email, vai trò, mật khẩu tạm) và mail "URL đăng nhập / Tên đăng nhập / Mật khẩu tạm".
- Code hiện tại: TK quản trị = `users.system_role ≠ member` (`modules/settings/services/admin-accounts.service.ts`, lời mời `admin_invites`); ma trận 14 khoá ở `role_permissions` (`role-permissions.service.ts`). TIP này **chỉ thêm**, không xoá đường cũ (dọn ở TIP-V2-204).
- Mẫu code: `modules/settings/services/role-permissions.service.ts` (upsert ma trận + Redis), `modules/account/ports.ts` (mẫu port `FEE_READER`).

## APPLICABLE STANDARDS
[auth-rbac](../standards/backend/auth-rbac.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [prisma-migrations](../standards/database/prisma-migrations.md) · [query-indexing](../standards/database/query-indexing.md) · [security](../standards/security/security.md) · [testing](../standards/testing/testing.md)

## TASK
Tạo mô hình dữ liệu TK quản trị tách khỏi `users` (§21.5), danh mục 25 khoá quyền dùng chung FE/BE, seed 5 vai trò hệ thống với ma trận §21.2, chuyển dữ liệu TK quản trị hiện có sang bảng mới, và API backend cho tab "Tài khoản quản trị" (tạo, liệt kê) + "Vai trò & phân quyền" (liệt kê, tạo/sửa vai trò, lưu ma trận).

## SPECIFICATIONS
### Business Rules
1. **25 khoá** (RB-R05), thứ tự = `ADM_PERMS` prototype, export `ADMIN_PERMISSIONS`, `AdminPermissionKey`, `ADMIN_MENUS` (11 menu → khoá):
   `overview.view` · `members.view` `members.action` · `fees.view` `fees.action` · `groups.view` `groups.action` `groups.moderate` · `bots.view` `bots.action` · `events.view` `events.action` · `projects.view` `projects.action` · `investors.view` `investors.action` · `services.view` `services.action` · `affiliate.view` `affiliate.action` `affiliate.payout` · `settings.general` `settings.mail` `settings.admins` `settings.log`. Mỗi khoá kèm nhãn tiếng Việt đúng cột "Quyền" §21.2. Khoá `*.view` là quyền Xem của menu; khoá khác cùng tiền tố là quyền Thao tác (dùng ở 203/204).
2. **5 vai trò hệ thống** (RB-R04, `is_system=true`, có `key` cố định `super_admin|admin|lecturer|accountant|editor`): Super Admin (không lưu dòng quyền, luôn đủ 25), Quản trị viên, Giảng viên, Kế toán, Biên tập nội dung — ma trận đúng §21.2 (`DEFAULT_ADMIN_ROLE_PERMISSIONS`; Quản trị viên **không** có `affiliate.payout`, `settings.admins`; chỉ Super Admin có `settings.admins`).
3. **Vai trò tự tạo**: tên (unique, citext, 2–60), mô tả ≤ 200; `is_system=false`, `key=null`. Sửa tên/mô tả vai trò hệ thống bị chặn (409). Xoá vai trò làm ở 203.
4. **Tạo TK quản trị** (RB-R02, QT-RB-01): họ tên, SĐT (E.164, tuỳ chọn), email nội bộ, vai trò (không được chọn Super Admin), mật khẩu tạm ≥ 8 ký tự. `must_change_pwd=true`, `status=active`, `created_by` = người tạo. Email trùng TK quản trị khác → 409 "Email đã thuộc tài khoản quản trị khác"; trùng thành viên (`users`, chưa xoá) → 409 "Email đã là tài khoản thành viên, vui lòng dùng email nội bộ riêng" (AT-RB01). Kiểm thành viên qua `MemberDirectory.emailTaken` (export sẵn từ `modules/account`), không query chéo bảng.
5. Ngược lại: đăng ký thành viên / SSO tạo TK với email đã là TK quản trị → 409 "Email đã được sử dụng" (qua `ADMIN_EMAIL_PORT` khai báo ở `account/ports.ts`, `admin-account` cung cấp — không import vòng).
6. Tạo TK xong: outbox `mail.requested` mail `adminLoginMail` (URL Admin, email, mật khẩu tạm, câu "Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên" — theo ver2, xem Câu hỏi); audit `admin_account.create` tag `permission` cùng transaction (luật 8, 10).
7. **Lưu ma trận** (NA-28): `PUT /admin/admin-roles/permissions` body `{ [roleId]: AdminPermissionKey[] }` cho mọi vai trò trừ Super Admin; có roleId Super Admin → 409 "Không thể chỉnh quyền Super Admin". Ghi `admin_role_permissions` (xoá + chèn theo lô, 1 transaction), audit `roles.permissions`, sau commit ghi Redis `auth:admin_grants:<roleId>` (RoleGrantsService) — **không** tăng perm_version (quyền áp ngay, không cần đăng nhập lại). Nạp cache lúc khởi động (`onApplicationBootstrap`).
8. Guard tạm thời: các route mới dùng `@RequirePermission('s.role')` (chỉ super_admin như hiện tại); 203 đổi sang `settings.admins`.

### API (thêm vào `api-domains/admin-rbac.ts`)
- `GET /admin/admin-accounts` → `{ items: AdminAccountRow[] }` (id, name, email, phone, roleId, roleName, isSuperAdmin, twoFactor, status `active|locked`, online, lastLoginAt, createdAt). Không phân trang (≤ 200 dòng).
- `POST /admin/admin-accounts` (201) `adminAccountCreateSchema`.
- `GET /admin/admin-roles` → `{ items: [{ id, key, name, description, isSystem, accountCount, permissions }] }`; `POST /admin/admin-roles` (201); `PATCH /admin/admin-roles/:id`; `PUT /admin/admin-roles/permissions`.

### Data / Migration (migration do agent chính tạo, `--create-only` + review SQL)
- `admin_roles(id uuid7, key text UNIQUE NULL, name citext UNIQUE, description, is_system bool, created_at, updated_at)`.
- `admin_role_permissions(role_id FK CASCADE, permission_key text, PRIMARY KEY(role_id, permission_key))`.
- `admin_users(id text PK, name, email citext UNIQUE, phone text NULL, role_id text NULL FK ON DELETE SET NULL + `CHECK (role_id IS NOT NULL OR deleted_at IS NOT NULL)`, password_hash, must_change_pwd bool, totp_secret_enc bytea NULL, status admin_user_status(active,locked), perm_version int default 1, last_login_at, created_by text NULL, deleted_at, created_at, updated_at)`; index `(role_id) WHERE deleted_at IS NULL`.
- `admin_refresh_tokens` cùng cấu trúc `refresh_tokens` nhưng FK `admin_users` (dùng ở 202); index `(admin_user_id, revoked_at)`, `(family_id)`, `(expires_at)`.
- Bỏ FK `notifications_user_id_fkey` (giữ index keyset hiện có).
- SQL dữ liệu: chèn 5 vai trò + quyền mặc định; **sao chép** `users` có `system_role <> 'member' AND deleted_at IS NULL` sang `admin_users` **giữ nguyên id**, hash, TOTP, `must_change_password`; ánh xạ `super_admin→Super Admin`, `admin→Quản trị viên`, `moderator→Giảng viên`. Chưa xoá/ẩn dòng `users` (202 làm khi đổi đăng nhập).

### Seed
- `required.ts`: upsert 5 vai trò + quyền (không ghi đè ma trận đã sửa), Super Admin `admin@opchub.community` trong `admin_users` (mật khẩu `SEED_SUPER_ADMIN_PASSWORD`, `must_change_pwd=false`).
- `demo/admin.ts`: 6 TK đúng `stAdmins` ver2 (trang.pham — Quản trị viên, yen.do — Giảng viên 2FA tắt, quan.vu — Giảng viên, mai.hoang — Kế toán, hang.ngo — Biên tập), mật khẩu demo như Admin, `must_change_pwd=false`; `reset.ts` xoá TK demo trước khi tạo lại.

## ACCEPTANCE CRITERIA
- Given email `an.nguyen@mediasoft.vn` là thành viên, When Super Admin tạo TK quản trị bằng email đó, Then 409 kèm lỗi trường `email` "…dùng email nội bộ riêng" (AT-RB01, RB-R02).
- Given tạo TK hợp lệ, Then `admin_users` có `must_change_pwd=true`, có 1 `mail_logs` loại admin login, 1 `audit_logs` `admin_account.create` (RB-R02, RB-R08).
- Given seed mới, Then `GET /admin/admin-roles` trả 5 vai trò, quyền khớp §21.2 từng ô (25 × 4) và Super Admin `permissions` = 25 khoá (RB-R04, RB-R05).
- Given PUT ma trận có roleId Super Admin, Then 409, DB không đổi (NA-28 bước 2).
- Given PUT ma trận bỏ `members.view` của Giảng viên, Then Redis `auth:admin_grants:<lecturerId>` không còn khoá đó ngay sau response (NA-28).
- Given thành viên đăng ký bằng email TK quản trị, Then 409 "Email đã được sử dụng" (RB-R03).

## TESTS BẮT BUỘC
- `packages/shared/src/permissions.spec.ts`: `REQ-325 25 khoá, đúng 11 menu, mỗi menu có .view`; `REQ-324 ma trận mặc định khớp §21.2`.
- `apps/server/test/admin-account/admin-accounts.int.spec.ts`: `AT-RB01 email thành viên bị từ chối`, `REQ-322 email trùng TK quản trị 409`, `REQ-322 MK tạm < 8 ký tự 400`, `REQ-322 tạo TK gửi mail + audit cùng transaction`, `REQ-322 không cho chọn vai trò Super Admin`, `RB-R03 đăng ký thành viên bằng email quản trị 409`.
- `apps/server/test/admin-account/admin-roles.int.spec.ts`: `REQ-324 5 vai trò hệ thống, không sửa tên vai trò hệ thống`, `REQ-324 tạo vai trò tự tạo, tên trùng 409`, `REQ-228 PUT ma trận ghi Redis ngay`, `REQ-228 chạm Super Admin 409`, test âm: thiếu `s.role` → 403.
- `packages/db/test/seed-demo.int.spec.ts`: seed có 6 TK quản trị, 5 vai trò, migration sao chép giữ id.

## CONSTRAINTS
- DO NOT: xoá `role_permissions`, `admin_invites`, `users.system_role`, endpoint `/admin/roles/permissions`, `/admin/admins` (FE còn dùng tới 204). Không đổi đăng nhập (202). Không đổi guard route cũ (203).
- DO NOT gửi mật khẩu tạm qua log/console; chỉ trong nội dung mail.
- REUSE: `PasswordService.hash` (export từ `modules/account`), `AuditService`, `OutboxService`, `MailService.request`, `PresenceService` (cột online).
- SKIP: khoá/mở, đổi vai trò, thu hồi TK (202); xoá vai trò (203); FE (204).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 2: body parse bằng zod trong `packages/shared`; không `any`.
- [ ] Luật 5: không query trong vòng lặp (ma trận ghi theo lô `unnest`), index theo "bằng trước".
- [ ] Luật 8, 10: audit + outbox mail cùng transaction.
- [ ] File BE ≤ 400 dòng; `admin-account` chỉ import domain khác qua `index.ts` (`pnpm depcheck`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck`; e2e msw + server không đỏ thêm.
- [ ] `git commit -- <paths>` (không `git add -A`), `git status --short` sạch, báo `TIP-V2-201-DONE <sha>`, viết `coding-packs/reports/TIP-V2-201-completion.md`.
