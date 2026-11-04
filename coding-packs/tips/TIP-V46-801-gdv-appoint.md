# TIP-V46-801: GĐ Vùng — dữ liệu + bổ nhiệm / thu hồi, trạng thái phí "Miễn phí · GĐ Vùng"

## HEADER

- TIP-ID: TIP-V46-801
- Project: OPCHUB
- Module: regional-director (mới), membership-fee, shared (enum / quyền / zod / outbox / mock), mail, notification, Admin › Affiliate (tab Cấu hình GĐ Vùng), Admin › Phí, Admin › Marketing › Email tự động
- Priority: P0
- Depends on: none (đầu chuỗi GOAL-V4.6, nhánh tách từ `dev` `5c17ed0f`)
- Estimated: L
- REQ / D: REQ-616 · D-120, D-121, D-128, D-129 (+ D-89, D-93, D-95, D-118, V-11, V-16)
- **Files touched:**
  - DB
    - `packages/db/prisma/schema/regional-director.prisma` (create): `RegionalDirector`, `RegionalDirectorProvince`, `RegionalDirectorEvent`, enum `RegionalDirectorAction`
    - `packages/db/prisma/schema/membership-fee.prisma` (modify): thêm `regional_director` vào `MembershipFeeStatus`
    - `packages/db/prisma/schema/mail.prisma` (modify): thêm `regional_director` vào `MailKind`
    - `packages/db/prisma/schema/account.prisma` (modify): chỉ thêm quan hệ ngược `regionalDirector RegionalDirector?` vào `User`
    - `packages/db/prisma/migrations/20261104090000_v46_regional_directors/migration.sql` (create)
    - `packages/db/seed/demo/regional-directors.ts` (create), `packages/db/seed/demo/index.ts` (modify: 1 dòng import + 1 lời gọi), `packages/db/seed/demo/reset.ts` (modify: xoá 3 bảng mới), `packages/db/seed/demo/people.ts` (modify: thêm m9, m10)
  - Shared
    - `packages/shared/src/enums.ts` (modify): `MEMBERSHIP_FEE_STATUS` thêm `regional_director`
    - `packages/shared/src/membership/fee-access.ts` + `.spec.ts` (modify): `USABLE_FEE_STATUS` thêm `regional_director`; `OPEN_ENDED_FEE_STATUS`
    - `packages/shared/src/permissions.ts` + `permissions.spec.ts` (modify): khoá `affiliate.regional`
    - `packages/shared/src/api-domains/regional-directors.ts` (create), `api-domains/index.ts` (modify: 1 dòng export), `api-domains/fees-admin.ts` (modify: `feeSummarySchema.regional_director`)
    - `packages/shared/src/outbox/events.ts` (modify): `regional_director.appointed`, `regional_director.revoked`
    - `packages/shared/src/fixtures/prototype-seed.json` (modify): thêm `MEMBERS` m9, m10 đúng prototype v4.6
    - `packages/shared/src/mock-data/domains/regional-directors.ts` + `.spec.ts` (create), `mock-data/domains/admin.ts`, `mock-data/domains/fees-admin.ts`, `mock-data/domains/index.ts` (modify)
  - Server
    - `apps/server/src/modules/regional-director/` (create): `regional-director-core.module.ts`, `index.ts`, `controllers/admin-regional-directors.controller.ts`, `services/regional-director.service.ts`, `services/regional-director-read.service.ts`, `services/regional-director-events.handler.ts`, `repositories/regional-director.repository.ts`, `domain/regional-director.rules.ts` + `.spec.ts`
    - `apps/server/src/modules/membership-fee/services/regional-fee.service.ts` (create), `domain/membership-fee.state.ts` + `.spec.ts`, `repositories/membership-fee.repository.ts`, `services/membership-fee.service.ts`, `services/admin-fees.service.ts`, `membership-fee-core.module.ts`, `index.ts` (modify)
    - `apps/server/src/common/auth/fee-where.ts` (create): `usableFeeWhere(now)` (Prisma) + `usableFeeSql(alias, now)` (raw); `common/auth/index.ts` (modify: 1 dòng export)
    - Đổi sang helper trên: `modules/local-business/repositories/store-explore.repository.ts`, `modules/project/repositories/project.repository.ts`, `modules/project/repositories/project-feed.query.ts`, `modules/onboarding/repositories/onboarding.repository.ts`, `modules/account/repositories/admin-member-filter.sql.ts` (modify)
    - `apps/server/src/modules/mail/templates-regional.ts` (create), `mail/index.ts`, `mail/mail-priority.ts` (modify)
    - `apps/server/src/api/api-app.module.ts`, `apps/server/src/worker/worker-app.module.ts`, `apps/server/src/worker/processors/regional-director.processor.ts` (create) — đăng ký module + consumer outbox (chỉ thêm dòng)
  - Admin
    - `apps/admin/src/features/affiliate/model.ts` (modify: tab `gdv`, `gcfg`), `components/affiliate-tabs.tsx`, `components/affiliate-content.tsx` (modify)
    - `apps/admin/src/features/affiliate/regional/` (create): `api.ts`, `hooks/use-regional-directors.ts`, `hooks/use-regional-writes.ts`, `components/regional-config-panel.tsx`, `components/regional-slot-card.tsx`, `components/regional-province-picker.tsx`, `components/regional-bank-fields.tsx`, `components/regional-history.tsx`, `components/regional-list.tsx`, `components/regional.module.css`
    - `apps/admin/src/features/fees/types.ts`, `fees/model.ts`, `fees/components/fee-table.tsx`, `fees/components/fee-toolbar.tsx` (modify): tab + nhãn + màu "Miễn phí · GĐ Vùng"
    - `apps/admin/src/features/marketing/components/regional-mail-list.tsx` (create), `marketing/components/auto-panel.tsx` (modify: 1 dòng)
    - `apps/admin/src/mocks/handlers/regional-directors.ts` (create), `mocks/handlers/index.ts` (modify: 1 dòng)
    - `apps/admin/messages/vi/affiliate.json`, `fees.json`, `marketing.json` (chỉ thêm khoá)
  - Test
    - `apps/server/test/regional-director/{appoint,revoke,permissions,fee-gate}.int.spec.ts` (create), `apps/server/test/factories/regional-director.factory.ts` (create)
    - `apps/server/test/membership-fee/fee-reminders.int.spec.ts`, `reconcile-v42.int.spec.ts` (modify: thêm ca GĐ Vùng)
    - `e2e/behavior/admin-regional-directors.spec.ts` (create); `e2e/parity/scenarios/admin-regional.ts` (create), `e2e/parity/registry.ts` (modify)
    - Spec / e2e đang đếm 8 thành viên phải đổi theo seed mới (xem SPEC 13)
  - Tài liệu
    - `coding-packs/standards/global/domain-glossary.md` (thêm dòng), `coding-packs/reports/V4.6-progress.md` (create), `coding-packs/reports/ui-parity/{screens,questions}.md` (thêm dòng / mục V4.6), `coding-packs/reports/TIP-V46-801-completion.md` (create)
- **Parallel-safe with:** sequential — đầu chuỗi GOAL-V4.6. Chia file với V46-802 (`modules/regional-director/**`, `features/affiliate/regional/**`, `regional-director.prisma`), V46-803 (`features/affiliate/**`), V46-805 (`membership-fee/**`, `fee-reminder`), V46-807 (`admin-fees`, nhật ký).

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-801-gdv-appoint` tách từ `dev`.
- Stack: `AGENTS.md` › Stack, `standards/global/tooling.md`.
- Đặc tả: `docs/spec/dac-ta.html` §31.4, **§32** (GDV-R01 → R08, QT-32, máy trạng thái §32.3, phân quyền §32.4, EM-GDV1/2 §32.5, AT-GDV01 → 07).
- Delta: `coding-packs/audit/SPEC-V4.6-DELTA.md` P6 (phần Cấu hình), P9, P16, P17.
- Prototype `docs/spec/index.html` v4.6 (thắng đặc tả về giao diện):
  - Cấu hình GĐ Vùng: dòng 4390 → 4434 (markup), logic `gcfg` dòng 5985 → 5994; `RG` (3 vùng, nhãn "Miền Trung & Tây Nguyên"), `PROVINCES` dòng 5189.
  - Tab Affiliate: `tabs` dòng 5984 (`com`, `aff`, `gdv`, `gcfg`, `cfg`).
  - Phí: `fst` / `FS` dòng 5755 → 5756 (nhãn + màu `#722ED1 / #F9F0FF / #D3ADF7`), `feTabs` dòng 5814 (thứ tự tab).
  - Thu hồi: `_revokeFeeT` dòng 6554; `_isGdv` mặc định `m3`, `m9`, `m10` dòng 6556.
  - Marketing › Email tự động: khối "Email hệ thống · GĐ Vùng" dòng 3668 → 3672.
  - Quyền: `ADM_PERMS[23]` "Bổ nhiệm / thu hồi GĐ Vùng (miễn phí thành viên)"; `ADM_DEF` Quản trị viên có, Kế toán / Giảng viên / Biên tập không.
- Đọc trước:
  - `packages/shared/src/membership/fee-access.ts` (V-11, một tập trạng thái)
  - `apps/server/src/modules/membership-fee/domain/membership-fee.state.ts`, `repositories/membership-fee.repository.ts` (`lockForUpdate`, `activate` có `version`), `services/fee-scheduler.service.ts`, `services/fee-events.handler.ts` (Redis `auth:fee` + `membership.updated`)
  - `apps/server/src/modules/affiliate/controllers/admin-affiliates.controller.ts` (mẫu `@RequireAdmin`, `respond`, `ZodBody`)
  - `apps/server/src/common/audit/audit.service.ts`, `common/outbox`
  - `apps/admin/src/features/affiliate/components/{affiliate-tabs,affiliate-content}.tsx`, `features/fees/{model,types}.ts`
  - Migration mẫu thêm quyền: `packages/db/prisma/migrations/20261026200000_v4_report_permissions/migration.sql`
- Mẫu cần theo: module domain đủ lớp (`controllers / services / repositories / domain / *-core.module.ts / index.ts`), như `modules/affiliate`.

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): module mới, gọi membership-fee qua `index.ts`, transition có điều kiện, outbox cùng transaction
- [backend/auth-rbac](../standards/backend/auth-rbac.md): khoá `affiliate.regional`, chỉ xem, paywall qua `isFeeUsable`
- [backend/api-conventions](../standards/backend/api-conventions.md): `/v1/admin/gdv`, envelope lỗi, mã 403 / 404 / 409 / 422
- [backend/queues-workers](../standards/backend/queues-workers.md): consumer outbox idempotent (mail + thông báo)
- [database/prisma-migrations](../standards/database/prisma-migrations.md) · [database/query-indexing](../standards/database/query-indexing.md): bảng mới, `--create-only`, index lịch sử, tìm ứng viên
- [security/security](../standards/security/security.md): STK chỉ hiện cho người có quyền xem, không log STK
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md) · [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Dựng domain **GĐ Vùng** gồm 3 ô cố định Bắc / Trung & Tây Nguyên / Nam, mỗi ô có thành viên phụ trách, tỉnh phụ trách, tài khoản nhận chia sẻ và lịch sử bổ nhiệm / thu hồi. Admin có quyền thì bổ nhiệm, đổi người hoặc thu hồi; Kế toán chỉ được xem.
Thêm trạng thái phí **"Miễn phí · GĐ Vùng"**. Trạng thái này đi qua cổng quyền dùng chung `isFeeUsable` và được bỏ qua ở paywall, nhắc phí, quét hết hạn. Khi thu hồi, thành viên trở về hạn phí cũ.
Gửi EM-GDV1/2 và thông báo trong app; ghi audit. Dựng Admin › Affiliate › tab **Cấu hình GĐ Vùng**, thêm tab và nhãn ở Admin › Phí, khối email ở Marketing › Email tự động.
Sổ chia sẻ, Chi trả, tab "GĐ Vùng" đầy đủ, Portal "Vùng của tôi" **không** thuộc TIP này (802, 804).

## SPECIFICATIONS

### Dữ liệu

1. **`regional_directors`**: đúng 3 dòng, migration chèn sẵn, khoá `region Region @id` (`north | central | south`, dùng lại enum `Region` của `community.prisma`). Các cột:
   - `user_id` nullable `@unique` (mỗi TV 1 vùng)
   - `appointed_at`, `appointed_by` (id TK quản trị)
   - `prev_fee_status MembershipFeeStatus?`, `prev_valid_until timestamptz?`: trạng thái và hạn phí trước bổ nhiệm (BR-462)
   - `bank_name`, `bank_no`, `bank_holder` nullable
   - `version int`, `updated_at`

   Không có thao tác xoá dòng (GDV-R06, D-120). "Thu hồi" đặt `user_id = NULL`.
2. **`regional_director_provinces`** `(province text PRIMARY KEY, region Region FK → regional_directors)`: mỗi tỉnh tối đa 1 vùng. Tỉnh phải thuộc đúng miền của ô, đối chiếu `groups.region` của nhóm tỉnh (`kind = 'province'`). Migration tick sẵn mọi tỉnh của mỗi miền từ `groups` (như prototype `onReg`).
   **D-129: danh sách này chỉ để hiển thị, không quyết định tiền.**
3. **`regional_director_events`**: dòng chỉ thêm, gồm `id uuid(7)`, `region`, `user_id`, `user_name` (chụp lúc ghi), `action RegionalDirectorAction (appoint | revoke)`, `actor_id`, `actor_role` (tên vai trò hiển thị, chụp lúc ghi), `created_at`. Index `(created_at DESC)`.
4. Migration `20261104090000_v46_regional_directors`:
   - `ALTER TYPE membership_fee_status ADD VALUE 'regional_director'`, `ALTER TYPE mail_kind ADD VALUE 'regional_director'`
   - Tạo 3 bảng, chèn 3 ô, tick tỉnh theo `groups`
   - Cấp `affiliate.regional` cho vai trò hệ thống `admin` (`INSERT … ON CONFLICT DO NOTHING`)
   - `ALTER TYPE … ADD VALUE` không chạy chung transaction với lệnh dùng giá trị mới: dùng giá trị mới ở migration riêng, hoặc không dùng trong cùng file.

### Trạng thái phí (V-11, V-16)

5. `MEMBERSHIP_FEE_STATUS` thêm `regional_director`.
   - `USABLE_FEE_STATUS` thêm `regional_director`. `PAID_FEE_STATUS` **không** thêm (D-107: không phải phí thật).
   - Thêm `OPEN_ENDED_FEE_STATUS = ['regional_director']`: trạng thái không hết hạn theo ngày. Khi đổi sang trạng thái này thì `membership_fees.valid_until = NULL`.
   - `effectiveFeeStatus` giữ nguyên `regional_director` (đã đúng vì `validUntil` null).
6. `membership-fee.state.ts`:
   - Mọi trạng thái → `regional_director`.
   - `regional_director` → `trial | active | expiring | pending_payment`, chỉ qua thu hồi.
   - Thêm hàm thuần `statusAfterRevoke(prevStatus, prevValidUntil, now)`:
     - `prevValidUntil > now` và `prevStatus = trial` → `trial`
     - `prevValidUntil > now`, trạng thái khác → `statusByValidUntil` (`active` / `expiring`)
     - Ngược lại → `pending_payment`, `valid_until = NULL`
   - Khớp §32.3, BR-462, D-120, prototype `_revokeFeeT`.
7. `RegionalFeeService` mới trong membership-fee, export qua `index.ts`, nhận `tx` từ caller:
   - `enter(tx, userId, now) → { prevStatus, prevValidUntil }`: `lockForUpdate`, kiểm `canTransition`, `UPDATE … WHERE version = $v` (0 dòng → 409), outbox `membership_fee.changed`.
   - `leave(tx, userId, prev, now)`: tương tự, trạng thái theo SPEC 6.
8. Hàm truy vấn phải coi `regional_director` (hạn NULL) là đã kích hoạt. Tạo `common/auth/fee-where.ts`:
   - `usableFeeWhere(now)`: `OR [{ status ∈ USABLE − OPEN_ENDED, validUntil > now }, { status ∈ OPEN_ENDED }]`
   - `usableFeeSql(alias, now)` cho raw SQL

   Đổi 4 chỗ đang dùng `validUntil > now` sang helper này: `store-explore.repository.ts:34`, `project.repository.ts:35`, `project-feed.query.ts:19–20`, `onboarding.repository.ts:30`. **Không** tự viết `status IN (...)` mới (GOAL CẤM).
9. Không đổi để vẫn bỏ qua GĐ Vùng, chỉ thêm test chứng minh:
   - `sweepStatuses`: `valid_until IS NULL` không khớp.
   - Ứng viên nhắc phí `fee-reminder.repository.ts:35`: danh sách trạng thái không có `regional_director`.
   - `admin-fees.repository.ts:118`: tương tự.
10. Đóng phí khi đang là GĐ Vùng:
    - Đối soát tự động (`reconcile.service.ts` → `MembershipFeeService.activate`): `canTransition(regional_director, 'active') = false` → giao dịch vào hàng "Cần đối soát thủ công", lý do **"Thành viên đang Miễn phí · GĐ Vùng"**.
    - Admin "Ghi nhận đã thu" / "Gia hạn 12 tháng": 409 cùng câu.
    - Phương án an toàn, ghi Q-V46-801-1.
11. Admin › Phí, server `admin-fees.service.ts`:
    - `STATUS_LABEL.regional_director = 'Miễn phí · GĐ Vùng'` (CSV)
    - `summary` đếm thêm `regional_director`. `feeSummarySchema` thêm `regional_director: z.number().int().default(0)` (tương thích ngược)
    - Gửi nhắc tay / hàng loạt bỏ qua GĐ Vùng (GDV-R03)
12. Lọc Thành viên (`admin-member-filter.sql.ts`): "Chưa đóng / Hết hạn" **loại** GĐ Vùng (không phải chưa đóng); "Đã đóng phí" và "Miễn phí 3 tháng" giữ nguyên. Ghi Q-V46-801-2.

### Bổ nhiệm / thu hồi (§32, AT-GDV01 → 07)

13. **Seed demo theo prototype v4.6**:
    - Thêm `MEMBERS` m9 (Lê Minh Hải, `hai.lm@mediasoft.vn`) và m10 (Phạm Thu Hà, `ha.pt@mediasoft.vn`), lấy đủ trường từ `docs/spec/index.html` (`{id:'m9'…}`, `{id:'m10'…}`), mật khẩu demo `User@2026` theo §32.6.
    - Gán Bắc = m3 (`bao.tran@solobooks.vn`), Trung & Tây Nguyên = m9, Nam = m10; tick đủ tỉnh; STK theo prototype (`Vietcombank`, `0011 00<id>0 4567`, chủ TK in hoa không dấu); phí của 3 người = `regional_director`, `prev_*` là phí seed hiện có.
    - Spec, e2e, parity đang đếm 8 thành viên đổi theo dữ liệu mới, không tắt test. Đã biết: `e2e/behavior/admin-members*.spec.ts`, `admin-fees.spec.ts`, `affiliate-customers-responsive.spec.ts`, `apps/admin/src/mocks/{admin-groups,fee-handlers,onboarding-handlers}.spec.ts`; grep thêm `8 thành viên`, `toHaveLength(8)`.
14. API `/v1/admin/gdv`, zod ở `packages/shared/src/api-domains/regional-directors.ts`. Khoá `region` dùng `north | central | south`.

    | Method | Path | Quyền | Nội dung |
    |---|---|---|---|
    | GET | `/admin/gdv` | `affiliate.view` | 3 ô (vùng, nhãn, thành viên `{id, fullName, email}` hoặc null, tỉnh đã tick, số affiliate trong vùng, STK), số tỉnh chưa tick, `canManage`, 50 sự kiện lịch sử mới nhất |
    | GET | `/admin/gdv/candidates?q=&region=` | `affiliate.regional` | ≤ 20 thành viên: `status = active` (không bị khoá), chưa xoá, không phải nhà đầu tư (Q-V46-801-3), chưa là GĐ Vùng vùng khác (thành viên của chính ô được giữ). Tìm tên / email không dấu bằng `immutable_unaccent … ILIKE` như `admin-member-filter.sql.ts` |
    | POST | `/admin/gdv` | `affiliate.regional` | `{ region, userId }`: bổ nhiệm vào ô; ô đang có người → thu hồi người cũ rồi bổ nhiệm, cùng 1 transaction (prototype `onMem`) |
    | PATCH | `/admin/gdv/:region` | `affiliate.regional` | `{ provinces?: string[], bank?: { bankName, bankNo, bankHolder } }`: lưu tỉnh tick (thay cả danh sách) và STK; ghi audit |
    | DELETE | `/admin/gdv/:region` | `affiliate.regional` | Thu hồi, ô thành trống |

    Số affiliate trong vùng: đếm affiliate có nhóm tỉnh tham gia sớm nhất còn hiệu lực thuộc miền (D-128), **một** query gom theo miền, không N+1. Đếm trên toàn miền, không chỉ tỉnh đã tick (D-129).
15. Luật khi bổ nhiệm, kiểm ở service trong transaction (khoá dòng ô `FOR UPDATE` + `version`):
    - Thành viên không tồn tại / đã xoá → 404.
    - Bị khoá → 422 "Tài khoản … đang bị khóa – không thể bổ nhiệm." (AT-GDV06).
    - Đang là GĐ Vùng vùng khác → 409 "… đang là GĐ Vùng … – mỗi thành viên chỉ phụ trách 1 vùng. Thu hồi ở vùng cũ trước." (AT-GDV05).
    - Đổi người cùng ô: thu hồi người cũ trước (SPEC 16), rồi bổ nhiệm người mới.
    - Ghi `regional_directors` (`user_id`, `appointed_at`, `appointed_by`, `prev_*` từ `RegionalFeeService.enter`) và `regional_director_events` (`appoint`).
    - `AuditService.log` (`action: 'regional_director.appoint'`, `diff: { region, userId }`).
    - Outbox `regional_director.appointed` `{ region, userId, provinces }`.
16. Thu hồi (DELETE, hoặc đổi người):
    - `RegionalFeeService.leave` với `prev_*` → trạng thái theo SPEC 6, xoá `prev_*`, `user_id = NULL`.
    - Ghi event `revoke` + audit `regional_director.revoke`.
    - Outbox `regional_director.revoked` `{ region, userId, feeStatus, validUntil }`.
    - Thu hồi ô đã trống → 409. Không xoá hay sửa dữ liệu chia sẻ (GDV-R05, sổ ở 802).
17. PATCH tỉnh / STK:
    - Tỉnh không tồn tại, hoặc không thuộc miền của ô → 422.
    - Tỉnh đang thuộc ô khác → không thể xảy ra vì mỗi miền 1 ô; vẫn kiểm, trả 409.
    - STK: `bankHolder` in hoa không dấu (dùng lại rule zod `bankHolder` ở `api-domains/affiliate.ts`); `bankNo` 6–20 chữ số, cho phép khoảng trắng.
    - Không log số TK ra pino.
18. Khoá quyền `affiliate.regional`, nhãn **"Bổ nhiệm / thu hồi GĐ Vùng (miễn phí thành viên)"**, menu `affiliate`, đặt cuối `ADMIN_PERMISSIONS` (đúng vị trí `ADM_PERMS[23]`).
    - `DEFAULT_ADMIN_ROLE_PERMISSIONS.admin` tự có (filter hiện tại). `accountant`, `lecturer`, `editor` không có.
    - Super Admin luôn có.
    - Cập nhật chú thích số khoá (28 → 29).
19. Consumer outbox, `RegionalDirectorProcessor` trong worker, idempotent theo `outbox_events.id`:
    - `appointed`:
      - Mail `kind = regional_director` EM-GDV1: tiêu đề `[OPC Hub] Bạn được bổ nhiệm GĐ Vùng {vùng} · miễn phí thành viên`; nội dung gồm vùng, danh sách tỉnh, quyền lợi miễn phí thành viên, nút Đăng nhập `PORTAL_URL/login`, link tài liệu hướng dẫn `PORTAL_URL/huong-dan`. **Không mật khẩu** (GDV-R02, D-47).
      - Thông báo `type: 'system'`: tiêu đề "Bạn được bổ nhiệm làm GĐ Vùng {vùng}", nội dung "Miễn phí thành viên trong thời gian làm GĐ Vùng. Xem tab Vùng của tôi trong Mạng lưới Affiliate.", link `/affiliate`.
    - `revoked`:
      - EM-GDV2 `[OPC Hub] Kết thúc vai trò GĐ Vùng {vùng} · vui lòng đóng phí thành viên`: thời điểm thu hồi (giờ VN), yêu cầu đóng phí hoặc "Phí thành viên cũ còn hiệu lực đến dd/mm/yyyy", "chia sẻ đã ghi nhận vẫn được chi".
      - Thông báo "Kết thúc vai trò GĐ Vùng {vùng}", nội dung theo `_revokeFeeT`.
    - `membership_fee.changed` từ SPEC 7 đi qua `FeeEventsHandler` có sẵn (Redis `auth:fee` + `membership.updated`). Đang đăng nhập → popup thanh toán hiện ngay khi không còn phí (AT-GDV02), không cần đăng nhập lại.
20. Mail template ở `templates-regional.ts` dùng `layout` có sẵn; `mail-priority.ts` thêm `regional_director` cùng mức `receipt`.

### Admin UI (prototype v4.6 thắng)

21. Admin › Affiliate:
    - Thanh tab theo prototype `Hoa hồng · Affiliate · GĐ Vùng (3) · Cấu hình GĐ Vùng · Chính sách`. `?tab=gdv|gcfg` trong `affiliateParamsSchema`.
    - Tab **GĐ Vùng** ở TIP này chỉ dựng `regional-list.tsx`: 3 dòng tên / vùng / số tỉnh / số affiliate từ `GET /admin/gdv`. Khoản ghi nhận, "Phải chi cuối tháng", Chi trả, lịch sử chi trả thuộc 802; không dựng số giả.
22. Tab **Cấu hình GĐ Vùng** (`regional-config-panel.tsx`), đúng bố cục prototype dòng 4390 → 4434:
    - Tiêu đề "Cấu hình Giám đốc Vùng" + câu mô tả; nút **+ Bổ nhiệm GĐ Vùng** (chỉ khi `canManage`): cuộn tới ô trống đầu tiên và mở ô chọn thành viên; đủ 3 ô → toast "Đã đủ 3 vùng Bắc – Trung – Nam. Mỗi vùng chỉ 1 GĐ Vùng; muốn đổi người hãy thu hồi và bổ nhiệm lại."
    - 3 thẻ "Khi bổ nhiệm / Khi thu hồi / Phạm vi"; dải cam chỉ xem `Vai trò {tên} chỉ được xem. Cần quyền “Bổ nhiệm / thu hồi GĐ Vùng” trong Cài đặt › Vai trò & phân quyền.`
    - Dải cảnh báo tỉnh chưa tick: "N tỉnh chưa có GĐ Vùng phụ trách · trưởng nhóm ở các tỉnh này tự gán theo miền" hoặc "Tất cả 34 tỉnh/thành đã có GĐ Vùng phụ trách".
    - Mỗi ô (`regional-slot-card.tsx`):
      - avatar chữ cái cuối tên, tên, nhãn vùng màu (Bắc `#1677FF/#E6F4FF`, Trung `#D46B08/#FFF7E6`, Nam `#389E0D/#F6FFED`), email, nút **Thu hồi**
      - "Tỉnh phụ trách N tỉnh", "Mạng lưới N affiliate"
      - "Thành viên phụ trách": select tìm qua `/candidates`, dòng gợi ý xanh / cam như prototype
      - "Vùng": chỉ hiển thị, D-120 ô cố định; đổi vùng = thu hồi + bổ nhiệm ô khác; ghi Q-V46-801-4
      - Chọn tỉnh dạng chip (`regional-province-picker.tsx`, bấm chọn / bỏ, lưu qua PATCH)
      - "Tài khoản nhận chia sẻ" Ngân hàng / Số tài khoản / Chủ tài khoản (`regional-bank-fields.tsx`, lưu khi blur hoặc nút Lưu theo antd-ui)
    - Đổi thành viên và Thu hồi luôn qua `Modal.confirm` (D-32); toast kết quả theo câu prototype (`Đã bổ nhiệm … · miễn phí thành viên · đã gửi email thông báo tới …`, `Đã thu hồi … – trở lại thành viên thường, phải đóng phí thành viên`).
    - Lỗi 409 / 422 hiện đúng câu server.
    - Không có quyền: ẩn **+ Bổ nhiệm** và **Thu hồi**, khoá select / chip / ô STK (AT-GDV03). Server vẫn chặn 403 (RB-R07).
    - "Lịch sử bổ nhiệm / thu hồi" (`regional-history.tsx`): thời gian `HH:mm dd/MM/yyyy` giờ VN, hành động (Bổ nhiệm xanh `#389E0D` / Thu hồi đỏ `#CF1322`), thành viên · vùng, "bởi {vai trò}".
23. Admin › Phí:
    - Thêm tab **Miễn phí · GĐ Vùng** (`?status=gdv`) sau "Miễn phí 3 tháng", đúng `feTabs`.
    - Nhãn + màu tím `#722ED1/#F9F0FF/#D3ADF7`.
    - Dòng GĐ Vùng **không** có Ghi nhận đã thu / Gia hạn / Gửi nhắc (GDV-R03; prototype `canRemind` hiện nút là sai so với đặc tả, ghi Q-V46-801-5).
    - Hạn hiển thị "—".
24. Admin › Marketing › Email tự động: khối "Email hệ thống · GĐ Vùng" (`regional-mail-list.tsx`) với 2 dòng EM-GDV1 / EM-GDV2 (mã, tên, khi gửi, tiêu đề mẫu, "Đang bật"), chỉ đọc như prototype dòng 3668 → 3672.
25. Cài đặt › Vai trò & phân quyền: ma trận tự có dòng quyền mới từ `ADMIN_PERMISSIONS`; kiểm cột Quản trị viên có tick, Kế toán không.
26. MSW:
    - `mock-data/domains/regional-directors.ts` giữ cùng luật SPEC 15 → 17 (dùng chung hàm thuần trong `mock-data`, không import server).
    - Handler admin `/admin/gdv*` có `admin-guard` theo khoá.
    - `fees-admin` / `admin` trả `regional_director` cho m3 / m9 / m10.
    - Thu hồi trả trạng thái theo `statusAfterRevoke` (đặt bản thuần trong `packages/shared/src/membership/`, server và MSW dùng chung; nếu vậy thêm file `packages/shared/src/membership/regional-revoke.ts` + `.spec.ts` vào Files touched và ghi completion report).

### Validation

- `region`: `z.enum(['north','central','south'])`. `userId`: chuỗi không rỗng. `provinces`: mảng duy nhất, ≤ 34 phần tử, mỗi phần tử ∈ `fixtures.provinces`.
- `q` ứng viên: trim, ≤ 100 ký tự; rỗng → 20 thành viên theo `member_code ASC` (D-90).

### Error Handling

| Trường hợp | HTTP / code | Câu |
|---|---|---|
| Thiếu `affiliate.regional` khi ghi | 403 `VIEW_ONLY` (đã có `affiliate.view`) / 403 `FORBIDDEN` | "Vai trò … không có quyền bổ nhiệm / thu hồi GĐ Vùng" |
| Thành viên không tồn tại / đã xoá / là nhà đầu tư | 404 / 422 | "Không tìm thấy thành viên" / "Nhà đầu tư không làm GĐ Vùng" |
| TV bị khoá | 422 `VALIDATION_ERROR` | SPEC 15 |
| TV đã là GĐ Vùng vùng khác | 409 `CONFLICT` | SPEC 15 |
| Thu hồi ô trống | 409 | "Vùng này chưa có GĐ Vùng" |
| Hai Admin cùng sửa một ô | 409 | "GĐ Vùng vừa được cập nhật bởi thao tác khác" (version) |
| Tỉnh sai miền / không tồn tại | 422 + `fields.provinces` | "Tỉnh … không thuộc {vùng}" |
| Phí đang `regional_director` khi đối soát / thu tay | unmatched / 409 | SPEC 10 |

## ACCEPTANCE CRITERIA

- **AT-GDV01**: Given m6 đang `pending_payment` (hoặc `trial`, `expired`) When Admin POST `/admin/gdv {region:'south', userId:m6}` Then
  - `membership_fees.status = regional_director`, `valid_until NULL`, `version` +1, `prev_*` lưu đúng
  - Redis `auth:fee` + `membership.updated` phát
  - Guard REST / socket / upload cho qua; tab Phí "Miễn phí · GĐ Vùng"
  - Mail EM-GDV1 vào `mail_logs` không chứa mật khẩu; thông báo `system` được tạo

  Test: int `appoint.int.spec.ts` › `AT-GDV01 appoints and frees fee`; e2e `admin-regional-directors.spec.ts` › `AT-GDV01`.
- **AT-GDV02**:
  - Given GĐ Vùng có `prev_valid_until < now` When DELETE `/admin/gdv/:region` Then phí `pending_payment`, `valid_until NULL`; `isFeeUsable` false → route Portal trả `402 MEMBERSHIP_REQUIRED`; socket `membership.updated` phát (int `revoke.int.spec.ts` › `AT-GDV02 no remaining fee`).
  - Given `prev_status = trial`, `prev_valid_until = now + 20 ngày` Then trial cũ, hạn cũ.
  - Given `prev_status = active`, còn 10 ngày Then `expiring`.

  Unit `membership-fee.state.spec.ts` › `statusAfterRevoke` cover cả 4 nhánh.
- **AT-GDV03**: Given Kế toán (`affiliate.view`, không `affiliate.regional`) When mở tab Cấu hình GĐ Vùng Then không có + Bổ nhiệm / Thu hồi, select khoá, có dải "chỉ xem"; When gọi POST / PATCH / DELETE Then 403, DB không đổi, không có audit.
  Test: int `permissions.int.spec.ts` cho đủ 3 route × (Kế toán, Giảng viên, Biên tập, Quản trị viên, Super Admin); e2e `AT-GDV03`.
- **AT-GDV04 (phần 801)**: Given GĐ Vùng bị thu hồi Then không dòng nào ngoài `regional_directors`, `regional_director_events`, `membership_fees`, `audit_logs`, `outbox_events`, `mail_logs`, `notifications` bị xoá hay sửa (int `revoke.int.spec.ts` › `AT-GDV04 revoke touches nothing else`). Phần sổ chia sẻ: test ở 802.
- **AT-GDV05**: Given m3 là GĐ Vùng Bắc When bổ nhiệm m3 vào Nam Then 409 đúng câu, không đổi gì; ứng viên ô Nam không có m3 (int + e2e `AT-GDV05`).
- **AT-GDV06**: Given TV `status = locked` Then không có trong `/candidates`; POST trực tiếp → 422, không lưu (int + e2e `AT-GDV06`).
- **AT-GDV07**: Given bổ nhiệm, đổi người, thu hồi Then:
  - `regional_director_events` có đúng thứ tự (đổi người = `revoke` cũ + `appoint` mới)
  - `audit_logs` có actor, vai trò, region, userId
  - Lịch sử trên màn hiện thời gian giờ VN, hành động, thành viên · vùng, "bởi {vai trò}"

  Test: int `appoint.int.spec.ts` › `AT-GDV07 history and audit`; e2e `AT-GDV07`.
- **Mỗi vùng 1 / mỗi TV 1 / mỗi tỉnh 1**: hai POST song song vào cùng ô hoặc cùng thành viên → đúng 1 thành công, 1 nhận 409. PATCH tỉnh sai miền → 422 (int `appoint.int.spec.ts` › `concurrency` + `province rules`).
- **Cổng phí**: Given GĐ Vùng (hạn NULL) Then:
  - `sweepStatuses` không đổi trạng thái
  - Job nhắc phí không gửi; "Gửi nhắc hàng loạt" bỏ qua
  - Gian hàng / dự án vẫn hiện ở Khám phá; onboarding coi là đã kích hoạt
  - Lọc "Chưa đóng / Hết hạn" không chứa GĐ Vùng
  - Webhook CK đúng nội dung → unmatched với lý do SPEC 10; Admin thu tay → 409

  Test: int `fee-gate.int.spec.ts`, mỗi ý một `it`; `fee-reminders.int.spec.ts`, `reconcile-v42.int.spec.ts` thêm ca.
- **Seed**: `pnpm --filter @opchub/db seed` chạy 2 lần liên tiếp không lỗi; có 3 GĐ Vùng m3 / m9 / m10 với 34 tỉnh tick; MSW cùng dữ liệu.
- **Parity ≤ 3% (1440 + 390)**, mỗi màn có test hành vi riêng:
  - `D-120-GCFG` Cấu hình GĐ Vùng (Super Admin)
  - `D-120-GCFG-RO` Kế toán chỉ xem
  - `D-120-GDV` tab GĐ Vùng: chỉ đo khi 802 xong; ở 801 ghi `pending 802` trong `screens.md`, không tính PASS
  - `D-18-GDV` Phí tab Miễn phí · GĐ Vùng
  - `D-78-GDV` Marketing › Email tự động khối GĐ Vùng
  - `D-69` Vai trò & phân quyền (đo lại)
  - `D-84`, `D-84-AFF`, `D-84-POL` (đo lại vì thanh tab đổi)
  - Màn Thành viên / Phí có số đếm đổi do m9, m10 (đo lại)
- **EXPLAIN (ANALYZE, BUFFERS)** trên ≥ 10k users: `/candidates` (tìm + loại khoá / nhà đầu tư), đếm affiliate theo miền, lịch sử 50 dòng. Không Seq Scan bảng `users` / `group_members` lớn. Dán vào completion report.

## CONSTRAINTS

- DO NOT:
  - viết `status IN (...)` / `status = 'active'` mới ngoài `fee-access.ts` + `fee-where.ts` (V-11)
  - check tên vai trò (luật 4: chỉ `affiliate.regional`)
  - cho Admin gán tay affiliate vào GĐ Vùng (D-121)
  - xoá ô vùng
  - gửi mật khẩu trong mail
  - query trong vòng lặp (đếm affiliate, ứng viên)
  - hằng số giá / tỷ lệ chia sẻ (không thuộc TIP này)
  - đổi hợp đồng zod cũ theo kiểu phá FE (chỉ thêm trường, có default)
  - `any`, `@ts-ignore`, `console.*`
  - nới parity, mask, retries, tăng timeout, `onServer` làm yếu assertion (D-63)
- REUSE:
  - `MembershipFeeRepository.lockForUpdate`, `canTransition`, `statusByValidUntil`, `FeeEventsHandler`
  - `AuditService`, `OutboxService`, `MailService.request`, `NotificationService.notify`, `layout` (email)
  - `immutable_unaccent` + `containsPattern`
  - rule zod `bankHolder` của affiliate
  - `@RequireAdmin`, `respond`, `ZodBody / ZodParams / ZodQuery`
  - `@opchub/ui` (Tag, Modal confirm, toast), `admin-guard` MSW
- SKIP (TIP sau):
  - sổ chia sẻ, năm của khách, kỳ chi, Chi trả, cột khoản ghi nhận của tab GĐ Vùng (802)
  - Chính sách §31, bỏ chi trả affiliate, cột "Thuộc vùng (theo tỉnh)" (803)
  - Portal banner + "Vùng của tôi" (804)
  - Cài đặt Nhắc gia hạn (805)
  - Nhật ký Admin xuất CSV (807)
  - Khoá TK đang là GĐ Vùng có tự thu hồi không: ghi Q-V46-801-6, không làm

## Câu hỏi ghi sẵn (`reports/ui-parity/questions.md` › V4.6, chọn phương án an toàn, không chặn)

- **Q-V46-801-1**: CK phí khi đang GĐ Vùng → đối soát tay (không tự cộng hạn).
- **Q-V46-801-2**: Lọc Thành viên "Chưa đóng / Hết hạn" loại GĐ Vùng.
- **Q-V46-801-3**: Nhà đầu tư không được bổ nhiệm.
- **Q-V46-801-4**: Ô "Vùng" chỉ hiển thị (prototype cho đổi vùng của ô; D-120 ô cố định).
- **Q-V46-801-5**: Không hiện "Gửi nhắc" ở dòng GĐ Vùng (prototype `canRemind` trái GDV-R03).
- **Q-V46-801-6**: Khoá TK đang là GĐ Vùng không tự thu hồi; Admin thu hồi tay.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-801-gdv-appoint`; chỉ sửa file trong **Files touched** (thêm file ngoài danh sách → ghi lý do trong completion report)
- [ ] Migration `--create-only` rồi sửa SQL; `migrate deploy` sạch trên `opchub_dev` + `opchub_test`; `prisma generate`
- [ ] Mỗi AC ở trên có test tên đúng, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` (MSW) không tụt số test so với `dev`; e2e server cho `admin-regional-directors.spec.ts`
- [ ] Parity ≤ 3% cả 1440 + 390 cho mọi màn ở AC Parity; `screens.md` thêm dòng; không mask / nới ngưỡng
- [ ] EXPLAIN 3 query mới, không Seq Scan bảng lớn
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **(3)** đổi trạng thái phí chỉ qua `membership-fee.state` + `UPDATE … WHERE version`, 0 dòng → 409; bổ nhiệm / thu hồi + đổi phí + audit + outbox **một transaction**
  - **(4)** mọi ghi `/admin/gdv*` ghi `audit_logs`
  - **(V-11 / V-16)** "Miễn phí · GĐ Vùng" chỉ qua `isFeeUsable` / `usableFeeWhere`
- [ ] File ≤ trần (BE 600, FE 400; screen chỉ orchestrator); không `any`, `@ts-ignore`, `console.*`
- [ ] Glossary thêm: GĐ Vùng (`RegionalDirector`, `regional_directors`), ô vùng, tỉnh phụ trách, `regional_director` (Miễn phí · GĐ Vùng), quyền `affiliate.regional`
- [ ] Ghi Q-V46-801-1 → 6 vào `questions.md`; tạo `reports/V4.6-progress.md` (dòng #1)
- [ ] Sau khi đo: `pnpm --filter @opchub/db seed` trả dữ liệu demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước, `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`; completion report có **git commit SHA**, PR, số test thật, % parity từng màn, EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu có test chưa chạy; ghi trung thực phần chưa chạy được

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority, depends, estimate, REQ / D)
- [x] Context: working dir, stack, file đọc trước, dòng prototype, mẫu module
- [x] Task 2–3 câu, rõ phạm vi + phần SKIP
- [x] Business rules đánh số (SPEC 1 → 26), validation, bảng lỗi
- [x] AC Given / When / Then có tên test, phủ AT-GDV01 → 07 (AT-GDV04 phần sổ để 802)
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 802 / 803 / 805 / 807 (chỉ chạy một TIP một lúc theo GOAL)
- [x] BUILDER-CHECKLIST có 3 luật BUILDER-HANDOFF liên quan (transition có điều kiện, audit Admin, V-11)
- ⚠️ Gap:
  - Thêm m9 / m10 vào seed làm đổi số đếm ở nhiều test và ảnh parity cũ. Đây là đúng prototype v4.6 nhưng phạm vi sửa test rộng; builder phải liệt kê từng file đổi.
  - Tab "GĐ Vùng" chỉ có danh sách 3 dòng tới khi 802 dựng sổ, nên `D-120-GDV` chưa đo ở 801.
  - Nếu `ALTER TYPE … ADD VALUE` buộc tách migration thì có thêm thư mục migration thứ hai; ghi vào completion report.
