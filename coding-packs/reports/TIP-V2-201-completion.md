# TIP-V2-201: Tài khoản quản trị, 25 khoá quyền, seed 5 vai trò (completion)

> V2-P2, nhánh `feature/V2-P2-admin-rbac`. D-52 · §21.1–21.6 · RB-R02/R03/R04/R05 · NA-28 · AT-RB01.
> Migration `20261019080000_admin_accounts` do agent chính tạo + áp (`7a50f53`); TIP này KHÔNG sửa
> schema/migration. V2Q mới: V2Q-112 → V2Q-116.
> Commit: `9e1f8bd` (shared), `48115c1` (seed), `39516f1` (server module + test) + commit báo cáo này.

## Đã làm
- **`packages/shared`**: `ADMIN_PERMISSIONS` (25 khoá, thứ tự `ADM_PERMS`, nhãn cột "Quyền" §21.2),
  `AdminPermissionKey`, `ADMIN_PERMISSION_KEYS`, `ADMIN_MENUS` (11 menu), `ADMIN_SYSTEM_ROLES`,
  `DEFAULT_ADMIN_ROLE_PERMISSIONS` (admin 23, lecturer 7, accountant 9, editor 8),
  `effectiveAdminGrants` (Super Admin = 25). Khoá cũ (`m.view`…) giữ tới TIP-V2-204.
  `api-domains/admin-rbac.ts`: `adminAccountRowSchema`, `adminAccountCreateSchema` (SĐT E.164 tuỳ
  chọn, MK tạm ≥ 8), `adminRoleSchema`, `adminRoleCreate/PatchSchema`, `adminRoleMatrixSchema`,
  `ADMIN_RBAC_ERRORS`.
- **Seed**: `required.ts` upsert 5 vai trò theo `key` — chỉ ghi quyền khi vai trò mới tạo (không ghi
  đè ma trận đã sửa); Super Admin `admin@opchub.community` vào `admin_users` cùng id `admin`,
  `must_change_pwd=false`. `demo/admin.ts`: đặt lại tên/mô tả + ma trận §21.2 của vai trò hệ thống,
  6 TK theo `stAdmins` ver2 (mật khẩu Admin demo, `must_change_pwd=false`). `reset.ts` xoá TK quản
  trị trừ `admin`, vai trò tự tạo, phiên Admin của `admin`.
- **`apps/server/src/modules/admin-account`** (mới): `AdminAccountCoreModule` (global: repo,
  `RoleGrantsService`, `ADMIN_EMAIL_PORT`) + `AdminAccountHttpModule` (api).
  - `GET/POST /admin/admin-accounts`: thứ tự kiểm vai trò (không Super Admin → 400 `roleId`) →
    email trùng TK quản trị (409 `email`) → email thành viên qua `MemberDirectory.emailTaken`
    (409 `email`, AT-RB01). Tạo TK + `adminLoginMail` (outbox `mail.requested`) + audit
    `admin_account.create` tag `permission` trong 1 transaction. Mật khẩu tạm chỉ có trong thân thư.
  - `GET/POST /admin/admin-roles`, `PATCH /admin/admin-roles/:id` (vai trò hệ thống → 409),
    `PUT /admin/admin-roles/permissions` (có Super Admin → 409, DB không đổi; xoá + chèn `unnest`
    1 transaction; audit `roles.permissions`; sau commit ghi Redis `auth:admin_grants:<roleId>`,
    không tăng perm_version). Nạp cache lúc `onApplicationBootstrap`.
  - Guard tạm `@RequirePermission('s.role')` (TIP-V2-203 đổi sang `settings.admins`).
- **account**: `ADMIN_EMAIL_PORT` ở `ports.ts`; `RegistrationRepository.taken` coi email TK quản trị
  là đã dùng → đăng ký / SSO tạo TK trả 409 "Email đã được sử dụng cho tài khoản khác" (RB-R03).
  `MemberDirectory.emailTaken`.
- **common/auth**: `AuthStateService.adminGrants/setAdminGrants` (pipeline).
- **mail**: `adminLoginMail` (URL đăng nhập / Tên đăng nhập / Mật khẩu tạm + câu nhắc đổi mật khẩu).
- `notifications.user_id` bỏ FK: rà code server — không chỗ nào dùng relation `User.notifications` /
  `Notification.user` → không phải sửa.

## Kết quả kiểm (19/10/2026)
- `pnpm lint` 8/8 task (0 error; warning `<img>` có sẵn) · `pnpm typecheck` 8/8 · `pnpm depcheck`
  0 vi phạm (589 module).
- `pnpm test`: shared 87, server 92, portal 113, admin 141, ui 35, integrations 25 (+2 skip) — 0 fail.
- int server toàn bộ (`vitest run --project int`): **72 file / 357 test pass**
  (mới: `admin-accounts.int.spec.ts` 7, `admin-roles.int.spec.ts` 5).
- `packages/db` int (`schema` + `seed-demo`): 2 file / 13 test pass.
- e2e: không chạy — TIP không đụng FE/MSW; spec liên quan Admin cần stack build lại có module mới
  (agent chính chạy sau khi build lại).

## Acceptance criteria
| AC | Kết quả |
|---|---|
| AT-RB01 email thành viên → 409 field `email` "…dùng email nội bộ riêng" | ĐẠT (`AT-RB01 email thành viên bị từ chối`) |
| Tạo TK: `must_change_pwd=true`, 1 mail_logs, 1 audit `admin_account.create` | ĐẠT (`REQ-322 tạo TK gửi mail + audit cùng transaction`; kind mail = `password_reset`, V2Q-113) |
| `GET /admin/admin-roles` 5 vai trò, ma trận §21.2 từng ô, Super Admin 25 khoá | ĐẠT (`REQ-324 5 vai trò hệ thống…` + `permissions.spec` REQ-324) |
| PUT ma trận có Super Admin → 409, DB không đổi | ĐẠT (`REQ-228 chạm Super Admin 409`) |
| PUT bỏ `members.view` Giảng viên → Redis không còn khoá ngay sau response | ĐẠT (`REQ-228 PUT ma trận ghi Redis ngay`) |
| Đăng ký thành viên bằng email quản trị → 409 | ĐẠT (`RB-R03 …`; thông điệp chung đã có, V2Q-116) |

## Chưa làm / cần agent chính
- Build lại stack e2e server (api/worker có module mới) rồi chạy e2e Admin liên quan.
- Đổi email hồ sơ thành viên sang email TK quản trị chưa chặn (V2Q-116) — đề xuất gộp TIP-V2-202.
- Không cần migration bổ sung.

## Cách verify
```
pnpm --filter @opchub/shared exec vitest run src/permissions.spec.ts
cd apps/server && pnpm exec vitest run --project int test/admin-account
cd packages/db && node --env-file=.env node_modules/vitest/vitest.mjs run test/seed-demo.int.spec.ts
```
