# TIP-B40: Cài đặt, lĩnh vực, phân quyền vai trò, tài khoản quản trị, nhật ký (D-20, D-33, D-42, D-44, D-46, BR-11)

## HEADER
- TIP-ID: TIP-B40 · Module: settings · Priority: P0 · Depends on: TIP-B07, TIP-B03 · Estimated: L (12h)
- **Files touched:**
  - `apps/server/src/modules/settings/**` (create: `controllers/{settings,categories,roles,admins,audit-logs}.controller.ts`, `services/{settings-admin,category-admin,role-permissions,admin-accounts,audit-log}.service.ts`, `repositories/*`, `settings-http.module.ts`; modify `app-settings.service.ts`, `settings-core.module.ts`, `index.ts`)
  - `apps/server/src/api/api-app.module.ts`, `apps/server/src/worker/worker-app.module.ts` (modify)
  - `apps/server/test/settings/*.int.spec.ts` (create)
- **Parallel-safe with:** `sequential, shares api-app.module.ts with TIP-B41..B46`.

## CONTEXT
- Hợp đồng `api-domains/settings-admin.ts`, `settings.ts` (categories, rolePermissions). MSW `apps/admin/src/mocks/handlers/{settings,admin-system}.ts`, mock `settings-config.ts`, `settings-log.ts`.
- FE hiển thị `<b>{actorName}</b> {summary}` → summary là cụm động từ viết thường đúng chuỗi e2e.

## SPECIFICATIONS
1. General / security / languages (`s.cfg`): đọc `app_settings` + tính `providers.userCount` (GROUP BY `auth_identities.provider`), `languages.progress` (hằng tiến độ bản dịch). PATCH merge, ghi + `invalidate`, audit (`settings.general`, `security.policy`, `sso.toggle`, `language.default|toggle`).
2. Lĩnh vực (`s.cfg`): API `scope`/`enabled` ↔ DB `scopes`/`hidden`; `projectCount` (projects sống) + `bizCount` (`business_profiles.main_field = name`) một query; trùng tên (citext) 409; đang dùng → 409 (BR-11), không → xoá mềm; sắp xếp đủ tập.
3. Phân quyền (`s.role`): đọc `role_permissions` (thiếu → mặc định); PUT upsert + `setGrants` Redis + `perm_version + 1` cho user các vai trò đổi (1 UPDATE … RETURNING) + Redis; nạp grants vào Redis lúc khởi động. Audit `roles.permissions` tag `permission`.
4. Tài khoản quản trị (`s.role`): user `system_role <> member` + lời mời chưa nhận/chưa thu hồi; mời 201 (409 email đã quản trị), thu hồi: lời mời → `revoked_at`; user → hạ `member` + bump `perm_version` + outbox `user.role_changed`; super_admin → 409.
5. Nhật ký (`s.log`): `{items}` 90 ngày, mới trước, tối đa 500, actor name/avatar join users (null → "Hệ thống").

## ACCEPTANCE CRITERIA
- Thêm "fintech" khi đã có "Fintech" → 409 "Lĩnh vực đã tồn tại"; xoá lĩnh vực có dự án → 409 BR-11.
- PUT phân quyền bỏ `m.view` của moderator → moderator gọi `/admin/users` 403 ngay (grants Redis), token cũ 401 (perm_version).
- Thu hồi super_admin → 409; mời → hiện "invited"; thu hồi lời mời → biến mất.

## ⚠️ BUILDER-CHECKLIST
- [ ] Audit cùng transaction; EXPLAIN nhật ký ≥10k; gate; commit; SHA
