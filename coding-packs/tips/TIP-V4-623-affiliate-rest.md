# TIP-V4-623: Affiliate + các màn 3–5% còn lại theo prototype v4 — D-89

## HEADER
- TIP-ID: TIP-V4-623
- Project: OPCHUB
- Module: Admin `features/{members,stores,affiliate,auth}` · Portal `features/consult` · `packages/shared` (schema lọc Thành viên, MSW) · `packages/db` (index + seed Gian hàng) · server `modules/account`, `modules/local-business` · e2e
- Priority: P1 (goal V4-UI, sau TIP-V4-622)
- Depends on: TIP-V4-622 (nhánh `feature/TIP-V4-622-settings-bots-events` chưa merge → xếp chồng)
- Estimated: L
- REQ / D: D-89, REQ-312, SEC-R01, AT-SEC01, Q-V4-611-6, Q-B62-18, D-31, D-47, D-50
- **Files touched:**
  - Thành viên (lọc v4): `packages/shared/src/api-domains/admin-members.ts`, `mock-data/domains/admin-members.ts` (+ spec); server `account/repositories/{admin-member-filter.sql.ts (create),admin-users.repository.ts}`, `account/services/admin-users.service.ts`, controller; `test/account/admin-users-filters.int.spec.ts` (create); Admin `features/members/{types.ts,api.ts,hooks/*,components/member-filters.tsx (create),components/onboarding-filter.tsx (delete),members-screen.tsx}`, `messages/vi/members.json`; `mocks/handlers/{admin-members,members}.ts`; `e2e/behavior/admin-members-filters.spec.ts` (create).
  - Gian hàng Admin theo thứ tự tạo: `packages/db/prisma/schema/local-business.prisma`, `migrations/20261027160000_v4_admin_stores_created/migration.sql` (create), `seed/demo/stores.ts`; server `store.repository.ts`, `stores.int.spec.ts`; MSW `stores.ts`.
  - Portal tư vấn: `features/consult/components/{form-fields,consult-sections}.tsx`, `consult-form.module.css`; `e2e/parity/scenarios/portal-account.ts`.
  - Affiliate: `features/affiliate/{format.ts,components/{customer-layout.module.css,customer-payout-history.tsx,affiliate-identity.tsx,agent-identity.tsx}}` + spec; `e2e/behavior/{admin-affiliate,affiliate-agent-period}.spec.ts`.
  - Đổi mật khẩu lần đầu: `features/auth/components/{first-password-screen.tsx,first-password.module.css (create),login-labels.ts (create),login-screen.tsx}`; `e2e/behavior/admin-rbac.spec.ts`.
  - Báo cáo: `coding-packs/reports/ui-parity/{results.*,deviations.md,questions.md}`, `coding-packs/reports/TIP-V4-623-completion.md`.
- **Parallel-safe with:** sequential — chuỗi V4-617 → 624.

## CONTEXT
- Prototype `docs/spec/index.html`: `_mfVals` (7 ô lọc Thành viên), `aStores` (`aAll` theo thứ tự tạo), `afA.det.tabCus` (lưới khách hàng ≤ 1023px), `cpOpen` (hộp đổi mật khẩu lần đầu nổi trên màn đăng nhập), form tư vấn.
- Bảng > 3% trước TIP (results.md sau V4-622): D-07 → D-17, D-82, D-83, D-84-AFF, D-84-POL, D-85-CUS, D-89, D-96, D-97, P-40, P-79 → P-83, P-104, P-105.

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md), [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/data-state](../standards/frontend/data-state.md)
- [database/query-indexing](../standards/database/query-indexing.md) — lọc bằng `EXISTS` trên khoá / index sẵn có; index Gian hàng "bằng trước, sort sau" `(status, created_at, id)`.
- [backend/auth-rbac](../standards/backend/auth-rbac.md) — phiên hạn chế SEC-R01 giữ nguyên route `/first-password`.
- [testing/testing](../standards/testing/testing.md)

## TASK
Đưa các màn Admin Thành viên (thanh lọc 7 ô), Gian hàng (thứ tự tạo), Affiliate (bảng khách hàng 390, số TK, ngày chi trả), Đổi mật khẩu lần đầu (hộp thoại trên màn đăng nhập) và form tư vấn Portal về prototype v4; giữ nghiệp vụ tiền (D-31), bảo mật (SEC-R01) và dữ liệu thật (AF-R01).

## SPECIFICATIONS
### Business Rules
1. Lọc Thành viên: Nhóm, Vai trò khi đăng ký, Phí (đã đóng = phí active / expiring), Trạng thái, Hồ sơ (chưa khai báo hoặc DN thiếu MST), Ngày đăng ký (7 / 30 / 90 / 365), Khởi đầu; kết hợp AND; ghi URL; "N kết quả" + "Xóa lọc (n)".
2. Thứ tự Thành viên giữ `created_at DESC` (Q-B62-18).
3. Bảng Gian hàng Admin theo thứ tự tạo (`created_at, id`).
4. Số TK hiển thị nhóm 4 chữ số; dữ liệu lưu không đổi.
5. Đổi mật khẩu lần đầu: hộp thoại `role=dialog`, form đăng nhập phía sau `inert` (không thao tác được).

### Validation / Error Handling
- Query lọc parse bằng `adminMemberQuerySchema`; giá trị rác → bỏ bộ lọc đó (`.catch(undefined)`), không 400.

## ACCEPTANCE CRITERIA
- Given CSDL test When `GET /admin/users?group=…&fee=paid&status=locked` Then trả đúng tập (int `admin-users-filters`).
- Given Admin MSW When chọn Vai trò "Chuyên gia" Then URL `role=expert`, "1 kết quả"; "Xóa lọc (2)" về 8.
- Given TK tạm đăng nhập When vào `/first-password` Then thấy hộp thoại, form đăng nhập phía sau không nhận focus.
- Parity các màn trên ≤ 3% cả 2 khung, trừ DV có D-xx / dữ liệu thật ghi trong deviations.md.

## CONSTRAINTS
- DO NOT: làm giả dữ liệu đại lý / bỏ ô Điều khoản chương trình (§20.6) / đổi mã CK (D-31) / mask thêm / nới ngưỡng.
- REUSE: `Pagination`, `LoginPanel`, `AdminTable` của `@opchub/ui`.
- SKIP: đo toàn bộ + nghiệm thu (→ TIP-V4-624).

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng `Files touched`
- [x] AC pass (int `test/account`, `stores`; e2e Thành viên / Affiliate / RBAC; parity)
- [x] Truy vấn mới dùng `EXISTS` + index sẵn có; migration mới không sửa migration cũ
- [x] Phân quyền giữ permission key; phiên hạn chế SEC-R01 không đổi
