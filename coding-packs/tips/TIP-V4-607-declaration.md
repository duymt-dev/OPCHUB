# TIP-V4-607: Câu xác nhận đăng ký (D-87) + popup Khai báo sau đăng nhập → Bảng giá

## HEADER
- TIP-ID: TIP-V4-607
- Project: OPCHUB
- Module: account (server) · auth + declaration (portal) · db · shared · mock
- Priority: P0 (REQ-504) / P1 (REQ-503)
- Depends on: V4-601. Xếp chồng sau V4-602 (PR #22 chưa merge)
- Estimated: L
- REQ / D: REQ-503, REQ-504 · D-87 · D-66 (MST) · D-74 · §27.1, §27.6.1 UP-01/UP-02, §27.7 F01, §27.9 T10
- **Files touched:**
  - `packages/db/prisma/schema/account.prisma` (modify): `User.declaredAt`, `User.opcIntent String[]`; `BusinessProfile.province String?`
  - `packages/db/prisma/migrations/20261024090000_v4_declaration/` (create) + `packages/db/test/migration-declaration.int.spec.ts` (create)
  - `packages/db/seed/{required,demo/account,demo/affiliate-scenario,load}.ts` (modify): người dùng seed đã khai báo
  - `packages/shared/src/api/{me,declaration}.ts` (+ index), `packages/shared/src/mock-data/**` (me + PUT declaration)
  - `apps/server/src/modules/account/**`: `controllers/declaration.controller.ts`, `services/declaration.service.ts`, `repositories/declaration.repository.ts` (create); `me.mapper`, `user.repository` SESSION_SELECT, module (modify)
  - `apps/server/test/account/declaration.int.spec.ts` (create), contract table + coverage
  - `apps/portal/src/features/declaration/**` (create): popup Cá nhân / Doanh nghiệp, hooks, api
  - `apps/portal/src/features/shell/components/portal-shell.tsx` (1 dòng: gate khai báo trước PaywallGate)
  - `apps/portal/messages/*/{auth,declaration}.json`, `apps/portal/src/i18n/messages.ts`
  - `apps/portal/src/mocks/handlers/**` (declaration)
  - `e2e/behavior/declaration.spec.ts` (create), `e2e/parity/scenarios/portal-declaration.ts` (create), specs đăng ký bị đổi câu xác nhận
- **Parallel-safe with:** sequential, xếp chồng sau V4-602 (cùng `api-contract.md`, `coverage.int.spec.ts`, `account.prisma` với V4-612).

## CONTEXT
- §27.1 / UP-01: câu xác nhận "Tôi xác nhận là người đại diện hợp pháp và đồng ý với Điều khoản sử dụng của OPC Hub" — D-87 dùng chung cho Cá nhân + DN (đặt trong i18n).
- §27.1 / UP-02 / F01: sau đăng nhập khai báo (Cá nhân: bạn là ai, OPC muốn tham gia; DN: thông tin DN, MST tự điền) → popup Bảng giá. Popup khai báo không đóng được, chỉ "Đăng xuất".
- Prototype v4: `Popup · Thông tin cá nhân` (stepper ✓ Tài khoản / 2 Thông tin tham gia / 3 Phí thành viên; "Bạn là" 6 vai trò; "OPC bạn muốn tham gia *" chọn tỉnh nhiều; "Lưu & tiếp tục →"), `Popup · Khai báo doanh nghiệp` (MST + Tra cứu, tên DN, ngành tự từ MST, Quy mô 4 mức, Tỉnh/thành ĐKKD, OPC tham gia). Lưu xong mở Bảng giá.
- Blueprint 2.8: `users.declared_at` null → Portal mở popup khai báo trước Bảng giá; `PUT /v1/me/declaration`.
- Hiện trạng: form đăng ký đã thu vai trò + nhóm (Cá nhân) và MST + DN + nhóm (DN) — prototype v4 chuyển các ô này sang popup.

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md), [backend/auth-rbac](../standards/backend/auth-rbac.md)
- [database/prisma-migrations](../standards/database/prisma-migrations.md)
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md), [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md)

## TASK
Đổi câu xác nhận đăng ký theo D-87. Thêm khai báo sau đăng nhập: cờ `declaredAt`, API `PUT /v1/me/declaration`, popup Cá nhân / DN trên Portal hiện trước popup Bảng giá khi chưa khai báo; lưu xong mở Bảng giá.

## SPECIFICATIONS
### Business Rules
1. `me.needsDeclaration = declaredAt == null && accountType ∈ {personal, business}` (NĐT không khai báo, D-14).
2. Migration backfill: mọi user hiện có `declared_at = created_at` (đã khai báo khi đăng ký cũ) — không bắt người cũ khai báo lại. `opc_intent` backfill từ nhóm đang tham gia (tối đa theo thứ tự tham gia).
3. Tài khoản tạo từ nay: đăng ký hiện vẫn thu vai trò / nhóm (Cá nhân) và MST / DN / nhóm (DN) → các ô này đã có ⇒ `declared_at` = now khi tạo TK **chỉ khi đủ dữ liệu khai báo**; Q-V4-607-1: việc bỏ các ô khỏi form đăng ký (theo prototype v4) để owner chốt — TIP này không phá form đăng ký đang chạy.
   → Phương án an toàn: TK mới tạo với `declared_at = NULL` ⇒ popup khai báo hiện, điền sẵn dữ liệu đã nhập lúc đăng ký (persona, nhóm; DN: MST, tên, ngành, quy mô) để người dùng xác nhận "Lưu & tiếp tục →".
4. `PUT /v1/me/declaration`:
   - Cá nhân `{ persona, groupIds[≥1] }` → `registration_role`, `opc_intent`, tham gia nhóm (`requestJoin`, idempotent), `declared_at = now()`.
   - DN `{ taxCode, companyName, mainIndustry, size, province, groupIds[≥1] }` → upsert `business_profiles` (MST tra D-66, lưu `lookup_raw`/verification như đăng ký), `province`, `opc_intent`, nhóm, `declared_at`.
   - Một transaction; gọi lại sau khi đã khai báo → cập nhật (không lỗi). NĐT → 403.
   - Trả `me` mới.
5. Portal: khi `needsDeclaration` → popup khai báo (không có nút đóng, Esc/backdrop không đóng; có "Đăng xuất"). PaywallGate không hiện popup Bảng giá khi đang khai báo. Lưu xong → `me` mới → Bảng giá hiện (TK chưa đóng phí). Toast "Đã lưu thông tin · tiếp tục thanh toán phí thành viên" / "Đã lưu thông tin doanh nghiệp · tiếp tục thanh toán phí thành viên".
6. Câu xác nhận (D-87): `agreePer` = `agreeBiz` = "Tôi xác nhận là người đại diện hợp pháp và đồng ý với Điều khoản sử dụng của OPC Hub." — NR-R02 (không hoàn lại) vẫn hiển thị ở hộp thanh toán (không đổi).

### Validation (đúng thông điệp prototype)
- Cá nhân: "Vui lòng chọn bạn là ai", "Vui lòng chọn OPC bạn muốn tham gia".
- DN: "Vui lòng nhập mã số thuế", "Mã số thuế gồm 10 hoặc 13 chữ số", "Vui lòng bấm Tra cứu mã số thuế", "Vui lòng nhập tên doanh nghiệp", "Vui lòng nhập ngành nghề kinh doanh", "Vui lòng chọn tỉnh/thành đăng ký kinh doanh trong danh sách", "Vui lòng chọn OPC bạn muốn tham gia".

### Error Handling
- MST đã thuộc DN khác → 409 tại ô `taxCode`. Tra cứu lỗi không chặn (D-40) — cho nhập tay.

## ACCEPTANCE CRITERIA
- Given TK Cá nhân mới (chưa khai báo, chưa đóng phí) When đăng nhập Then popup "Hoàn tất thông tin tham gia" hiện, không có Bảng giá; Esc không đóng.
- Given chọn "Kỹ sư" + OPC Hà Nội When "Lưu & tiếp tục →" Then lưu, vào nhóm Hà Nội, popup Bảng giá hiện; F5 không hiện lại popup khai báo.
- Given TK DN mới When khai báo MST tra cứu thấy + tỉnh + OPC Then lưu hồ sơ DN, popup Bảng giá hiện (T10).
- Given bỏ trống Then báo đúng thông điệp tại ô, không gọi API.
- Given user cũ (trước migration) Then không thấy popup khai báo.
- Given form đăng ký Then câu xác nhận D-87 giống nhau ở Cá nhân và DN.

## CONSTRAINTS
- DO NOT: cho đóng popup khai báo khi chưa lưu; bắt user cũ khai báo lại; phá form đăng ký hiện có (Q-V4-607-1).
- REUSE: `useTaxLookup`, `RolePicker`, `GroupPicker`/OPC picker hiện có, `requestJoin`, tra MST server (`biz.raw`).
- SKIP: bỏ ô khỏi form đăng ký (chờ owner), onboarding bước 2 (V4-611 đọc `declaredAt`).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng Files touched
- [ ] Một transaction cho khai báo; quyền: chỉ chủ TK (member), NĐT 403
- [ ] Integration Postgres thật: khai báo Cá nhân, DN (MST trùng 409), backfill migration
- [ ] lint/typecheck/unit/depcheck/build + test:int module + gác cổng + e2e domain — số thật
- [ ] Parity popup Khai báo Cá nhân / DN + đăng ký (câu xác nhận) ≤ 3% (1440 + 390) hoặc DV
- [ ] Commit theo đường dẫn, `git status --short` sạch, báo SHA
