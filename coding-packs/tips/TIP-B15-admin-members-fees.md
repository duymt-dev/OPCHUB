# TIP-B15: Admin Thành viên + Admin Phí

## HEADER
- TIP-ID: TIP-B15 · Module: account (admin), membership-fee (admin) · Priority: P0 · Depends on: TIP-B14, TIP-B13 · Estimated: L (14h)
- **Files touched:**
  - `apps/server/src/modules/account/controllers/admin-users.controller.ts`, `services/admin-users.service.ts`,
    `repositories/admin-users.repository.ts`, `domain/admin-member.mapper.ts` (create)
  - `packages/db/prisma/sql/admin-users-page.sql` hoặc `$queryRaw` deferred join trong repository (create)
  - `apps/server/src/modules/membership-fee/controllers/admin-fees.controller.ts`, `services/admin-fees.service.ts`,
    `repositories/admin-fees.repository.ts` (create)
  - `apps/server/src/modules/account/ports.ts` (modify — `GroupMembershipWriter` cho gán nhóm BR-07, community hiện thực B20; trước đó ghi qua port tạm)
  - `apps/server/test/account/admin-users.int.spec.ts`, `test/membership-fee/admin-fees.int.spec.ts` (create)
- **Parallel-safe with:** none (cuối pha B2).

## CONTEXT
- Hợp đồng `adminMemberPageSchema`, `memberRoleUpdateSchema`, `bulkStatusSchema`, `bizVerificationDecisionSchema`, `userStatusUpdateSchema`,
  `assignGroupsSchema`, `userExportSchema` (202 job — export thật ở B43), `feeRowSchema` + `pageSchema`, `feeSummarySchema`, `feeBulkCollectSchema`,
  `feeBulkRemindSchema`, `feeExportSchema`. MSW `admin-members.ts`, `members.ts`, `fees.ts`. D-15, D-32, D-41, D-42, D-46.
- Quyền: `m.view` đọc, `m.edit` ghi, `s.role` đổi vai trò. Mọi thao tác ghi → `audit_logs` cùng transaction.

## SPECIFICATIONS
1. `GET /admin/users?type&q&page&size`: deferred join (`users_list`/`users_list_all`), `q` dùng `users_search`; `counts` (all/business/personal) không phụ thuộc `q`.
   Chỉ liệt kê `personal|business` (không investor), không `super_admin`.
2. Khoá/mở (đơn + hàng loạt): transition có điều kiện, `perm_version+1`, outbox `user.locked` / `user.session_revoked`; sau commit
   `AuthState.setLocked` + thu hồi refresh. D-15: dự án → hidden (B32 tiêu thụ outbox).
3. Đổi vai trò (`s.role`): không đổi `super_admin`, `perm_version+1`, outbox `user.role_changed`.
4. Xác minh DN: `pending → verified|rejected`.
5. Phí: `GET /admin/fees?status&q` (deferred join qua `membership_fees` + users), `summary` (đếm theo status + revenue `SUM(amount)` kỳ phí),
   `POST /admin/fees/:uid/collect|renew|remind`, `collect` cần `reason` (D-41) — hợp đồng hiện tại không có body → **Q-B15-1**: nhận `{reason}` optional,
   thiếu thì ghi "Thu tại văn phòng" mặc định? — **phương án an toàn: bắt buộc trong DB (CHECK) nên server dùng lý do mặc định "Admin ghi nhận đã thu" + audit**.
   `collect` bulk, `remind` (enqueue mail), `remind-all`, `export` (CSV inline như MSW cho tới B43).
6. `GET /admin/fees/transactions` (keyset, unmatched) + `POST …/:id/match {userId}` → kích hoạt thủ công `manual`.

## ACCEPTANCE CRITERIA
- Danh sách khớp `adminMemberPageSchema`; EXPLAIN Index Only Scan; moderator (`m.view`) xem được, khoá → 403.
- Khoá user → token cũ 401, đăng nhập → 403; audit có dòng `user.lock`.
- Admin đổi vai trò không có `s.role` → 403; super_admin đổi → 200 + audit.
- `collect` user pending → active, kỳ `manual` có lý do, audit `fee.collect`.
- Match giao dịch unmatched → user active, giao dịch `manual`.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC int test; EXPLAIN users/fees list; audit đủ dòng; gate xanh; commit; SHA
- [ ] Cổng B2: Portal + Admin MSW=off luồng đăng ký → trả phí → kích hoạt (kiểm bằng API int test end-to-end); contract test nhóm account/fee
