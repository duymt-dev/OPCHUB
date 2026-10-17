# TIP-B20: Nhóm cộng đồng (Portal + Admin Nhóm)

## HEADER
- TIP-ID: TIP-B20 · Module: community · Priority: P0 · Depends on: TIP-B07, TIP-B11 · Estimated: L (10h)
- **Files touched:**
  - `apps/server/src/modules/community/domain/{region.ts,group.mapper.ts}` (create) + `*.spec.ts`
  - `apps/server/src/modules/community/repositories/{group.repository.ts,group-admin.repository.ts}` (create)
  - `apps/server/src/modules/community/services/{group.service.ts,group-admin.service.ts}` (create)
  - `apps/server/src/modules/community/controllers/{groups.controller.ts,admin-groups.controller.ts}` (create)
  - `apps/server/src/modules/community/{community-core.module.ts,index.ts}` (modify — thêm `CommunityHttpModule`, chuyển 3 service cũ vào `services/`)
  - `apps/server/src/api/api-app.module.ts` (modify — 1 dòng import)
  - `packages/shared/src/api-domains/group-admin.ts` (modify nếu thiếu schema request/response cần parse)
  - `apps/server/test/community/{groups,admin-groups}.int.spec.ts`, `test/factories/group.factory.ts` (create)
- **Parallel-safe with:** TIP-B22 (khác thư mục). `sequential, shares api-app.module.ts with TIP-B21/B23/B24/B25` (chỉ thêm dòng).

## CONTEXT
- Hợp đồng: `groupItemSchema`, `joinGroupSchema`, `joinResultSchema`, `groupDetailSchema`, `groupAdminUpsertSchema`,
  `groupMembersQuerySchema`, `groupMemberListSchema`, `groupMembersExportSchema`. MSW `portal/community.ts`, `admin/admin-groups.ts`,
  mock ops `ops-community.ts`, `group-admin.ts`. Inventory B3 §1–2, e2e `community.spec.ts`, `admin-groups.spec.ts`.
- Migration `c4f419f`: UQ partial `province`/`slug` khi `deleted_at IS NULL`, `weekly_active`, `rooms.description`.

## APPLICABLE STANDARDS
backend/nestjs-modules · backend/auth-rbac · database/query-indexing · api/response-format · testing/testing

## SPECIFICATIONS
1. `GET /groups?region&q&page&size(12)`: chỉ nhóm chưa xoá; `region` là chuỗi hiển thị (`Miền Bắc|Miền Trung|Miền Nam|Khác`) ↔ enum DB;
   `q` ILIKE tên hoặc tỉnh (`containsPattern`); `myStatus` = LEFT JOIN `group_members` của caller (1 query, không loop). Thứ tự ổn định theo `created_at, id` (seed c1..c34).
2. `POST /groups/:id/join {intro?}` → 201: đã `member|pending` → 409 "Bạn đã tham gia hoặc đang chờ duyệt"; `approval` thiếu intro → 409
   "Nhóm này cần lời giới thiệu để duyệt"; `approval` → `pending` + outbox `group.join_requested` (B21 đẩy `member.request`); `open` → `member` +
   `member_count+1` cùng transaction. Ghi lại hàng cũ (`rejected|cancelled|left`) bằng upsert có điều kiện.
3. `DELETE /groups/:id/join`: không `member|pending` → 404 "Bạn chưa tham gia nhóm"; `pending→cancelled`, `member→left` (`WHERE status=<from>`), member thì `member_count-1`. Chủ nhóm rời → 409 "Chủ nhóm không thể rời nhóm" (Q-B20-1).
4. Admin (`c.create` ghi, `m.view` đọc): `GET /admin/groups` (size mặc định 10), `GET /admin/groups/:id` (ownerId/moderatorIds từ `group_role`, `roomKeys`/`extraRooms` từ rooms),
   `POST` 201 (trùng tên → 409 "Tên nhóm đã tồn tại", trùng tỉnh → 409 "Đã có nhóm cho <tỉnh>", tạo phòng `general` "Chung" + phòng theo `roomKeys` + `extraRooms`,
   owner/moderator thành `member` với `group_role`), `PATCH`, `DELETE` (xoá mềm), `member-counts`, `members?groupIds&status`, `members/export` 202. Mọi ghi → audit cùng transaction.

## ACCEPTANCE CRITERIA
- Given seed 34 nhóm When `GET /groups?size=100` Then total 34, `Miền Trung` 11, `myStatus` đúng cho người đã tham gia.
- Given nhóm open When join Then 201 `member`, `member_count+1`; leave → `left`, `member_count-1`.
- Given nhóm approval When join không intro Then 409; có intro → `pending`; huỷ → `cancelled`; join lại được.
- Given admin xoá mềm nhóm Hà Nội When tạo lại Hà Nội Then 201 (UQ partial).
- Given member không quyền When gọi `/admin/groups` Then 403.

## CONSTRAINTS
- DO NOT: query trong vòng lặp (gán owner/mod/phòng dùng `createMany`); kiểm tên vai trò; xoá cứng nhóm.
- REUSE: `containsPattern`, `AuditService.log`, `OutboxService.add`, `pageQuerySchema`, `GroupAssignService` (B15).
- SKIP: duyệt yêu cầu (B21), chat (B23), xuất file thật (B43 — trả job id như B15).

## ⚠️ BUILDER-CHECKLIST
- [ ] AC int test từng cái; EXPLAIN `/groups` + admin list; audit đủ; gate xanh; commit `-- <paths>`; SHA
- [ ] Rule: permission key (`c.create`, `m.view`); transition có điều kiện; side effect qua outbox
