# TIP-B07: Guards — JwtAuth → AccountStatus → MembershipFee → Permission → GroupRole

## HEADER
- TIP-ID: TIP-B07
- Project: OPCHUB
- Module: server/common/auth
- Priority: P0
- Depends on: TIP-B06
- Estimated: M (8h)
- **Files touched:**
  - `apps/server/src/common/auth/decorators.ts` (create — `@Public`, `@RequiresMembershipFee`, `@SkipMembershipFee`, `@AllowAccountTypes`, `@RequirePermission`, `@RequireGroupRole`, `@CurrentUser`)
  - `apps/server/src/common/auth/jwt-auth.guard.ts`, `account-status.guard.ts`, `membership-fee.guard.ts`, `permission.guard.ts`, `group-role.guard.ts` (create)
  - `apps/server/src/common/auth/auth-state.service.ts` (create — Redis permVersion/locked/membership cache S-03, role grants cache)
  - `apps/server/src/common/auth/access-token.ts` (create — verify JWT, zod claim), `common/auth/auth.module.ts`, `index.ts` (create)
  - `apps/server/src/common/auth/group-role.port.ts` (create — interface tra `group_role`, community hiện thực ở B20)
  - `apps/server/src/common/auth/*.spec.ts` (create)
  - `apps/server/src/api/api-app.module.ts` (modify — `APP_GUARD` theo thứ tự)
  - `apps/server/src/api/health.controller.ts` (modify — `@Public`)
  - `apps/server/src/modules/account/services/token.service.ts` (modify — dùng `access-token.ts`)
  - `apps/server/test/common/guards.int.spec.ts`, `test/common/guard-matrix.controller.ts` (create — controller chỉ đăng ký trong test)
- **Parallel-safe with:** none trong B1 (cuối pha).

## CONTEXT
- `standards/backend/auth-rbac.md` (thứ tự guard, decorator, permission key), D-14 investor, D-20/D-46 ma trận quyền, D-43 chủ nhóm.
- Permission grants: bảng `role_permissions` (cache Redis `perm:grants`, bust khi Cài đặt đổi ở B40); `super_admin` có mọi quyền.
- S-03: `MembershipFeeGuard` không query DB — đọc claim; Redis `fee:{userId}` (set khi phí đổi, B14) ghi đè claim nếu có.

## APPLICABLE STANDARDS
- [backend/auth-rbac](../standards/backend/auth-rbac.md) · [backend/api-conventions](../standards/backend/api-conventions.md) · [testing/testing](../standards/testing/testing.md) · [realtime/socket-chat](../standards/realtime/socket-chat.md) (S-03)

## TASK
Năm guard toàn cục chạy theo thứ tự cố định, cấu hình bằng decorator. Mặc định: route cần đăng nhập + phí (route Portal). Route `/admin/*`
dùng `@RequirePermission` và bỏ paywall. Kiểm thu hồi phiên bằng `permVersion` Redis. Có test ma trận đầy đủ.

## SPECIFICATIONS
### Business Rules
1. `JwtAuthGuard`: `@Public` bỏ qua; thiếu/sai/hết hạn token → 401. Gắn `req.user` (claim đã parse zod).
2. `AccountStatusGuard`: Redis `user:locked:{id}` hoặc `perm_version:{id}` > claim → 401 `UNAUTHORIZED` (phiên bị thu hồi, client refresh/đăng xuất);
   locked → 403.
3. `MembershipFeeGuard`: áp khi route **không** có `@SkipMembershipFee` và không phải `@RequirePermission` route. Status từ Redis `fee:{id}` hoặc claim;
   `active|expiring` → qua; investor → chỉ qua nếu route có `@AllowAccountTypes('investor')`, nếu không 403; còn lại → 402 `MEMBERSHIP_REQUIRED`.
4. `PermissionGuard`: `@RequirePermission(...keys)` → mọi key thuộc grants của `systemRole` (super_admin luôn qua) → nếu không 403. **Không** so tên vai trò ngoài `hasPermission`.
5. `GroupRoleGuard`: `@RequireGroupRole('owner')` → `GroupRolePort.roleOf(groupId từ params.id, userId)`; không đủ → 404 (không lộ nhóm).
6. Port mặc định (trước B20) trả `null` → 404; B20 cung cấp hiện thực.

### Validation
- Claim parse bằng zod `accessClaimsSchema`.

### Error Handling
- Theo api-conventions; message tiếng Việt ngắn.

## ACCEPTANCE CRITERIA (test ma trận `guards.int.spec.ts`)
- Không token → 401; token hết hạn → 401; route `@Public` → 200.
- Member phí `pending_payment` vào route Portal → 402; `active` → 200; route `@SkipMembershipFee` → 200.
- Investor vào route thường → 403; route `@AllowAccountTypes('investor')` → 200.
- Moderator vào `@RequirePermission('m.edit')` → 403; admin → 200; super_admin vào `s.role` → 200; admin vào `s.role` → 403.
- Redis `perm_version` tăng sau khi phát token → 401.
- `@RequireGroupRole('owner')` khi port trả `member` → 404; `owner` → 200.

## CONSTRAINTS
- DO NOT: query DB trong MembershipFeeGuard; `if (role === 'admin')`; vòng phụ thuộc common ↔ modules.
- REUSE: `hasPermission`, `DEFAULT_ROLE_PERMISSIONS` (fallback khi chưa có bảng), `RedisService`.
- SKIP: socket handshake guard (B22 dùng lại `access-token.ts`).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng *Files touched*; ma trận AC đủ trong int test
- [ ] Rule AGENTS 4: phân quyền bằng permission key
- [ ] Rule S-03: paywall không truy vấn DB
- [ ] lint/typecheck/test/test:int/depcheck xanh; commit; SHA
- [ ] Cổng kiểm B1: 3 process chạy, int test auth/guard/outbox xanh → `reports/B1-completion.md`
