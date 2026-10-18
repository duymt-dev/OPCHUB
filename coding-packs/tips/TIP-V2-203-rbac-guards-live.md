# TIP-V2-203: Guard server theo 25 khoá, chế độ chỉ xem phía server, quyền có hiệu lực ngay (§21, NA-28)

## HEADER
- TIP-ID: TIP-V2-203 · Project: OPCHUB · Module: common/auth + mọi controller `/admin` · Priority: P0 · Depends on: TIP-V2-202 · Estimated: L
- **Files touched:**
  - `apps/server/src/common/auth/guards.ts`, `decorators.ts`, `auth-state.service.ts` (modify: `PermissionGuard` đọc quyền theo `roleId` từ Redis `auth:admin_grants:<roleId>`; super admin = vai trò `key='super_admin'`; lỗi chỉ xem `VIEW_ONLY`)
  - `apps/server/src/common/errors/app-error.ts` (modify: thêm `VIEW_ONLY` → 403), `packages/shared/src/errors.ts` (modify)
  - `packages/shared/src/permissions.ts` (modify: xoá 14 khoá cũ `m.view…s.log`, `SystemRole`, `DEFAULT_ROLE_PERMISSIONS`, `hasPermission(role,…)`; thêm `can(grants, key)`, `viewKeyOf(key)`), `permissions.spec.ts`
  - Controller đổi decorator (modify): `modules/account/controllers/admin-users.controller.ts`, `modules/bot/bot.controller.ts`, `modules/community/controllers/admin-groups.controller.ts`, `modules/event/controllers/admin-events.controller.ts`, `modules/export/export.controller.ts`, `modules/investor/controllers/admin-investors.controller.ts`, `modules/mail/controllers/admin-mail.controller.ts`, `modules/marketing/controllers/campaigns.controller.ts`, `modules/membership-fee/controllers/{admin-fees,admin-fee-transactions}.controller.ts`, `modules/moderation/controllers/admin-moderation.controller.ts`, `modules/project/controllers/admin-projects.controller.ts`, `modules/reporting/overview.controller.ts`, `modules/service/controllers/admin-service-requests.controller.ts`, `modules/settings/controllers/{categories,settings,roles}.controller.ts`, `modules/admin-account/controllers/{admin-accounts,admin-roles}.controller.ts`
  - Service đọc quyền trong code (modify): `modules/community/services/group-access.service.ts`, `modules/chat/services/chat-access.service.ts`, `modules/reporting/overview.service.ts` (badges), `modules/service/services/service-admin.service.ts` (`staff()` theo `services.action` từ `admin_users`)
  - `modules/admin-account/services/admin-roles.service.ts`, `controllers/admin-roles.controller.ts` (modify: `DELETE /admin/admin-roles/:id`)
  - `modules/settings/services/role-permissions.service.ts`, `admin-accounts.service.ts`, `controllers/roles.controller.ts` (modify: route cũ `/admin/roles/permissions`, `/admin/admins*` trả 410 Gone; xoá ở 204 khi FE bỏ gọi)
  - `apps/server/src/socket/gateways/socket-auth.ts`, `user-events.subscriber.ts` (modify: phát `permissions.changed` tới room `admin-role:<roleId>` nếu phiên admin có socket — xem Câu hỏi)
  - `packages/shared/src/socket/events.ts` (modify: `permissions.changed`)
  - `apps/server/test/common/guard-matrix.controller.ts`, `guards.int.spec.ts` (modify), `apps/server/test/admin-account/rbac-matrix.int.spec.ts` (create), `apps/server/test/admin-account/admin-roles.int.spec.ts` (modify), các `apps/server/test/**/*.int.spec.ts` dùng `systemRole: 'admin'|'moderator'` (modify sang `createAdmin({ role })` của `factories/admin.factory.ts`)
  - `apps/server/test/audit/c5-permissions.audit.ts` (modify: đọc `ADMIN_PERMISSIONS`)
- **Parallel-safe with:** sequential, shares `common/auth/*`, `permissions.ts` với 202, 204
- **Phase / nhánh:** V2-P2, `feature/V2-P2-admin-rbac`

## CONTEXT
- Đọc: §21.1 RB-R04/R05/R07, §21.2, QT-RB-02 (§21.4), NA-28 (§8.30), AT-RB03, AT-RB05; BUG-035 (`m.role`, `p.edit` không route nào kiểm), TD-026 (khoá chết + so tên vai trò), D-52.
- Hiện trạng: `@RequirePermission('<14 khoá>')` trên 17 controller (bảng dưới). `PermissionGuard` gọi `hasPermission(user.systemRole, k, grants)`. `RolePermissionsService.put` tăng `perm_version` → token cũ 401 phải đăng nhập lại — trái NA-28 ("không cần đăng nhập lại").
- Mẫu test: `apps/server/test/common/guard-matrix.controller.ts`, `guards.int.spec.ts`.

## APPLICABLE STANDARDS
[auth-rbac](../standards/backend/auth-rbac.md) · [api-conventions](../standards/backend/api-conventions.md) · [socket-chat](../standards/realtime/socket-chat.md) · [testing](../standards/testing/testing.md)

## TASK
Đổi mọi guard và chỗ kiểm quyền phía server sang 25 khoá theo vai trò của TK quản trị, phân biệt thiếu quyền Xem (403 `FORBIDDEN`) với có Xem mà thiếu Thao tác (403 `VIEW_ONLY`), áp ma trận mới ngay cho phiên đang mở, chặn xoá vai trò còn TK giữ, và phủ test ma trận quyền cho mọi route `/admin`.

## SPECIFICATIONS
### Bảng ánh xạ route → khoá (bắt buộc đúng; GET = `.view`, ghi = khoá thao tác)
| Controller | Đọc | Ghi |
|---|---|---|
| `reporting/overview` (`/admin/overview`, `/admin/badges`) | `overview.view` (badges: có ≥ 1 khoá bất kỳ, đếm theo khoá menu) | — |
| `account/admin-users` | `members.view` | status, verification, assign-groups, export → `members.action`; `PATCH :id/role` → **xoá route** (RB-R01, BUG-035) |
| `membership-fee/admin-fees`, `admin-fee-transactions` | `fees.view` | collect, remind*, `:uid/:action`, match, export → `fees.action` |
| `community/admin-groups` | `groups.view` | tạo/sửa/xoá nhóm, members/export → `groups.action` |
| `moderation/admin-moderation` | `groups.view` | `reports/:id/action`, keywords → `groups.moderate` |
| `bot/bot.controller` | `bots.view` | persona, script, run, settings → `bots.action` |
| `event/admin-events` | `events.view` | tạo/sửa/xoá, check-in, export → `events.action` |
| `project/admin-projects` | `projects.view` | review, bulk, featured, delete → `projects.action` |
| `investor/admin-investors` | `investors.view` | status, comments, export → `investors.action` |
| `service/admin-service-requests` | `services.view` | transition, patch, assignee, comments, catalog CRUD, export → `services.action` |
| `settings/settings`, `categories` | `settings.general` | `settings.general` |
| `mail/admin-mail` (welcome, smtp) | `settings.mail` | `settings.mail` |
| `marketing/campaigns` | `settings.mail` (xem Câu hỏi) | `settings.mail` |
| `admin-account/*` | `settings.admins` | `settings.admins` |
| `/admin/audit-logs` | `settings.log` | — |
| `export/export.controller` (`GET /admin/exports/:id`) | người tạo job (đã kiểm `requestedBy`) + bất kỳ khoá `*.action` | — |
| Chat chỉ đọc (`GET /groups/:id/rooms`, `/rooms/:id/messages`, ghim) realm admin | `groups.view`; ghim → `groups.moderate` | |
| Duyệt yêu cầu vào nhóm realm admin (`join-requests`) | — | `groups.action` |
| Affiliate (TIP-V2-402) | `affiliate.view` | `affiliate.action`; chi trả `affiliate.payout` |

### Business Rules
1. Decorator mới `@RequireAdmin(key)`: guard tính `grants = Redis auth:admin_grants:<roleId>` (thiếu cache → nạp DB một lần rồi ghi Redis — chấp nhận 1 query khi cache trống, không theo từng request). Vai trò `super_admin` → luôn qua (RB-R05).
2. Thiếu khoá: nếu khoá là thao tác **và** có `viewKeyOf(key)` → 403 `VIEW_ONLY` "Vai trò {roleName} chỉ có quyền xem mục này" (RB-R07, câu đúng prototype); ngược lại 403 `FORBIDDEN`.
3. **NA-28**: lưu ma trận / đổi vai trò TK → ghi Redis ngay; request kế tiếp của phiên đang mở áp quyền mới, **không** 401, không cần đăng nhập lại. Bỏ bump `perm_version` trong luồng phân quyền (giữ cho khoá/đổi MK). Nếu phiên admin có socket: phát `permissions.changed` để FE refetch `/admin/me` (204 dùng).
4. Bỏ hết so tên vai trò ở server (luật 4): `service-admin.service.ts` `ADMIN_ROLES`, `admin-member.mapper.ts managedRole`, `overview.service.ts`/`dashboard-live.service.ts` đếm `systemRole: 'member'` (sau 202 `users` chỉ còn thành viên → bỏ điều kiện), `admin-users.repository.ts` `system_role <> 'super_admin'`, `export.repository.ts`.
5. **Xoá vai trò** (RB-R04, AT-RB05): `DELETE /admin/admin-roles/:id` — vai trò hệ thống → 409 "Không xoá được vai trò hệ thống"; còn TK (chưa xoá) giữ → 409 "Vai trò đang có N tài khoản, hãy đổi vai trò các tài khoản trước"; dùng `DELETE … WHERE id=$1 AND NOT is_system AND NOT EXISTS (SELECT 1 FROM admin_users WHERE role_id=$1 AND deleted_at IS NULL)`. Audit `roles.delete`.
6. Super Admin TK không đổi được vai trò; không ai gán vai trò Super Admin qua API (RB-R04).

### Validation / Error
- `VIEW_ONLY` thêm vào `ERROR_CODES` và `HTTP_STATUS` (403); FE (204) bắt mã này để toast.

## ACCEPTANCE CRITERIA
- Given TK Giảng viên (ma trận mặc định), When `PATCH /admin/users/:id/status` hoặc `POST /admin/users/export`, Then 403 `VIEW_ONLY` "Vai trò Giảng viên chỉ có quyền xem mục này"; `GET /admin/users` 200 (AT-RB03, RB-R07).
- Given Giảng viên, When `GET /admin/fees`, Then 403 `FORBIDDEN` (không có quyền xem) (RB-R06 phía server).
- Given Kế toán, Then đúng các route §21.2 cho phép: overview/members/fees/services xem, fees thao tác, affiliate, audit-logs; còn lại 403 (AT-RB02 phía server).
- Given phiên Giảng viên đang mở, When Super Admin bỏ `members.view` của Giảng viên, Then lần gọi `GET /admin/users` kế tiếp **cùng token** → 403, không 401 (NA-28, REQ-228).
- Given vai trò tự tạo còn 1 TK, When xoá, Then 409; đổi TK sang vai trò khác rồi xoá → 200 (AT-RB05).
- Given `pnpm --filter … audit c5`, Then không còn khoá chết, mọi route `/admin/**` có `@RequireAdmin` (BUG-035, TD-026).

## TESTS BẮT BUỘC
- `apps/server/test/admin-account/rbac-matrix.int.spec.ts`: sinh bảng từ `ADMIN_PERMISSIONS` × mọi route `/v1/admin/**` (đọc metadata Nest qua `DiscoveryService`, không liệt kê tay) × 5 vai trò mặc định: kỳ vọng 2xx/`VIEW_ONLY`/`FORBIDDEN` theo §21.2. Tên test `REQ-325 <method> <path> × <vai trò>`. Thêm `AT-RB03 Giảng viên khoá/xuất thành viên → VIEW_ONLY`.
- `apps/server/test/common/guards.int.spec.ts`: `REQ-228 đổi ma trận áp ngay cùng token`, `REQ-327 thiếu thao tác có xem → VIEW_ONLY`, `REQ-325 super admin luôn qua`.
- `apps/server/test/admin-account/admin-roles.int.spec.ts`: `AT-RB05 xoá vai trò đang dùng 409`, `REQ-324 xoá vai trò hệ thống 409`.
- `apps/server/test/socket/socket.int.spec.ts`: `REQ-228 permissions.changed tới phiên admin đang mở` (nếu chọn phương án socket).
- Unit `packages/shared/src/permissions.spec.ts`: `viewKeyOf`, `can`.

## CONSTRAINTS
- DO NOT: so tên vai trò ở bất kỳ đâu; query DB mỗi request trong guard; nới lỏng test có sẵn (sửa factory, không xoá assertion — D-63).
- DO NOT đổi FE (204) ngoài việc giữ build xanh: nếu FE còn import khoá cũ, để lại alias tạm `LEGACY_*` trong `permissions.ts` và ghi report, 204 xoá.
- REUSE: `META`, `Reflector`, `AuthStateService`; `DiscoveryService` của Nest cho test ma trận.
- SKIP: ẩn menu/dải chỉ xem (204).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 4 (permission key), luật 3 (depcheck), luật 13 (test file riêng, tên chứa REQ/AT).
- [ ] S-03: guard chỉ đọc claim + Redis.
- [ ] Mỗi route `/admin` có đúng 1 khoá theo bảng; `c5-permissions.audit.ts` xanh.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck`; e2e msw + server không đỏ thêm (MSW handler kiểm quyền cũ ở `apps/admin/src/mocks/handlers/settings.ts` cập nhật ở 204).
- [ ] `git commit -- <paths>`, `git status --short` sạch, `TIP-V2-203-DONE <sha>`, report `coding-packs/reports/TIP-V2-203-completion.md`.
