# TIP-V4-608: Gian hàng địa phương — tự tạo khi DN đóng phí, khám phá + lọc §25.2, chi tiết 1 trang, Gian hàng của tôi, Admin ẩn/hiện

## HEADER
- TIP-ID: TIP-V4-608
- Project: OPCHUB
- Module: local-business (server, mới) · membership-fee (consumer sự kiện) · db · shared · portal (stores, shell) · admin (stores, shell)
- Priority: P0 (REQ-510)
- Depends on:
  - V4-601: phí DN.
  - V4-606: menu và quyền `stores.*`.
  - V4-607: `business_profiles.province`.
  - Xếp chồng sau V4-610 (PR #24 chưa merge).
- Estimated: XL
- REQ / D: REQ-510 · D-74, D-75, D-80, D-84 · OQ-12 · §25.1, §25.2, §25.4 · §26 UT-08/UT-09/AT-07 · §27.1, §27.5, §27.6 UP-03/UP-08/AD-07 · F01/F04 · T08
- **Files touched:**
  - `packages/db/prisma/schema/local-business.prisma` (create): enum `StoreStatus`, `StoreAudience`, `StoreItemKind`; model `Store`, `StoreItem`.
  - `packages/db/prisma/schema/account.prisma` (modify): quan hệ `User.store`.
  - `packages/db/prisma/migrations/20261024200000_v4_local_stores/` (create).
  - `packages/db/test/migration-stores.int.spec.ts` (create).
  - `packages/db/seed/catalog.ts` (modify): danh mục v4 scope `project`. Chỉ thêm dòng, giữ danh mục cũ.
  - `packages/db/seed/demo/stores.ts` (create): 17 gian hàng prototype; chủ x2…x17 là TK DN demo.
  - `packages/shared/src/api-domains/stores.ts` (create), `index.ts`, `uploads.ts` (thêm kind `store-cover`, `store-item`).
  - `packages/shared/src/outbox/events.ts` (thêm `store.published`).
  - `packages/shared/src/mock-data/domains/stores*.ts` (create).
  - `packages/shared/src/fixtures/stores-seed.ts` (create).
  - `apps/server/src/modules/local-business/**` (create):
    - `domain/store-status.ts`, `store.mapper.ts`;
    - `repositories/store*.repository.ts`;
    - `services/store-*.service.ts`, `store-auto-create.handler.ts`;
    - `controllers/store*.controller.ts`;
    - module, `index.ts`.
  - `apps/server/src/api/api-app.module.ts`, `apps/server/src/worker/{worker-app.module.ts, processors/fee.processor.ts or store.processor.ts}` (modify).
  - `apps/server/test/local-business/*.int.spec.ts` (create), `test/contract/*` + `coverage.int.spec.ts`, `coding-packs/plans/api-contract.md`.
  - `apps/portal/src/features/stores/**` (create).
  - `apps/portal/src/app/(portal)/stores/{page,mine/page,[id]/page}.tsx` (create).
  - `apps/portal/src/features/shell/nav.ts`, `messages/*/common.json` (nav), `messages/*/stores.json` (create, 10 ngôn ngữ), MSW handlers.
  - `apps/admin/src/features/stores/**` (create), `apps/admin/src/app/(admin)/stores/page.tsx` (create), admin `nav.ts`, `messages/vi/{common,stores}.json`, MSW handlers.
  - `e2e/behavior/stores.spec.ts` (create), `e2e/parity/scenarios/portal-stores.ts`, `admin-stores.ts` (create) + registry.
- **Parallel-safe with:** sequential — dùng chung `api-contract.md`, `coverage.int.spec.ts`, `events.ts`, nav với V4-609.

## CONTEXT
- §27.6 UP-08: "Khám phá theo danh mục ngành, đối tượng, tỉnh, sản phẩm/dịch vụ; trang chi tiết 1 trang; liên hệ Email/Zalo/Gọi. Hiển thị ngay, Admin chỉ ẩn khi vi phạm."
- AD-07: "Danh sách, ẩn khi vi phạm, thống kê. Không duyệt trước."
- UP-03: "Đối soát tự động → kích hoạt 12 tháng, tạo gian hàng (DN)…"
- D-75: chỉ TK Doanh nghiệp đã đóng phí có gian hàng; Cá nhân chỉ xem.
- D-84: DN đóng phí trước v4 có gian hàng ở lần đóng phí kế tiếp; không tạo hàng loạt.
- Prototype v4:
  - Portal `pStore` (index.html 1915–2213): Khám phá / Gian hàng của tôi / chi tiết.
  - Admin `aStores` (3953–3990).
  - JS `storePage` (4861–5089), seed 17 gian hàng (4867–4884).
- Blueprint §2.6 (model, index), §3 (endpoint).
- Hiện trạng: chưa có code gian hàng. Quyền `stores.view` / `stores.action` đã có (V4-606). Menu chưa có mục.

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): module mới, outbox, consumer idempotent.
- [backend/auth-rbac](../standards/backend/auth-rbac.md): `stores.view` / `stores.action`.
- [database/query-indexing](../standards/database/query-indexing.md): keyset + deferred join, facet `GROUP BY`.
- [database/prisma-migrations](../standards/database/prisma-migrations.md).
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md), [frontend/data-state](../standards/frontend/data-state.md), [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/ui-parity](../standards/frontend/ui-parity.md).
- [testing/testing](../standards/testing/testing.md).

## TASK
Dựng domain Gian hàng địa phương:
- Hệ thống tự tạo gian hàng khi TK Doanh nghiệp đóng phí (bản nháp lấy từ hồ sơ DN).
- Chủ gian hàng sửa thông tin, sản phẩm/dịch vụ, rồi Xuất bản. Gian hàng hiển thị ngay, không duyệt.
- Thành viên khám phá có lọc theo §25.2 và xem chi tiết 1 trang có liên hệ Email / Zalo / Gọi.
- Admin xem danh sách + KPI, ẩn / hiện (hàng loạt) gian hàng vi phạm.

## SPECIFICATIONS
### Business Rules
1. **Ai có gian hàng (D-75)**
   - Chỉ `accountType = business`. Mỗi TK một gian hàng (`owner_id` UQ, OQ-12).
   - Cá nhân và TK chưa đóng phí chỉ xem. Tab "Gian hàng của tôi" hiện paywall theo copy prototype (Q-V4-608-1).
2. **Tự tạo (UP-03, D-84)**
   - Consumer `membership_fee.confirmed`, idempotent: TK là business và chưa có Store → tạo Store.
     - `status = draft`.
     - `name = companyName`, hoặc `fullName` nếu thiếu.
     - `field = ''` (người dùng chọn từ danh mục).
     - `province = business_profiles.province`, hoặc `users.city` nếu thiếu.
     - `audience = business`.
     - Email, phone lấy từ TK.
   - Không migration tạo hàng loạt.
   - Draft cần chủ bấm Xuất bản (blueprint; Q-V4-608-2). Banner "Gian hàng được tạo tự động…" như prototype.
3. **Trạng thái (`domain/store-status.ts`, cập nhật có điều kiện `WHERE status = from`)**
   - `publish: draft → published`; `unpublish: published → draft` (chủ gian hàng).
   - `hide: draft|published → hidden` (Admin, ghi `hidden_prev`).
   - `show: hidden → hidden_prev` (Admin; prototype ẩn được cả nháp; khi hiện lại thì trả về trạng thái trước: Q-V4-608-3).
   - Chủ sửa được khi hidden nhưng không xuất bản được (toast "Gian hàng đang bị Admin ẩn, vui lòng liên hệ quản trị viên").
4. **Xuất bản cần đủ:** tên, giới thiệu ≥ 40 ký tự, ≥ 1 sản phẩm/dịch vụ. Server kiểm, trả 400 kèm copy prototype.
5. **Khám phá:** chỉ `published` của chủ còn hạn phí.
   - Hết hạn phí → không hiện ở Khám phá. Chủ vẫn sửa được nhưng không xuất bản được tới khi đóng phí (Q-V4-608-4).
   - Lọc:
     - `kind` (product / service: gian hàng có ≥ 1 item loại đó);
     - `audience[]`, `field[]`, `province[]` (chọn nhiều);
     - `q` (tên / slogan / giới thiệu / tên item, ILIKE);
     - `sort` = `newest` | `name` | `items`.
   - Facet đếm theo từng nhóm: một truy vấn `GROUP BY`, cache Redis 60 s.
   - Phân trang keyset `(updated_at, id)`, 12 / trang, deferred join.
6. **Chi tiết 1 trang:** hero (tên, slogan, lĩnh vực, tỉnh, website), Giới thiệu, Sản phẩm & Dịch vụ, Thông tin liên hệ có 3 nút Email / Zalo / Gọi (REQ-510, Q-V4-608-5).
   - Bản nháp hoặc bị ẩn chỉ chủ xem, có banner "Bản xem trước…". Người khác nhận 404.
7. **Gian hàng của tôi:** form theo prototype (Tên, Slogan, Đối tượng, Ngành nghề = select danh mục v4, Tỉnh/thành = select 34 tỉnh, Giới thiệu, Ảnh bìa upload `store-cover`, Hotline, Email, Website, Địa chỉ).
   - Sản phẩm / dịch vụ: thêm, sửa, xoá, sắp xếp. Mỗi item có loại, tên, giá (số nguyên VND, trống = "Liên hệ báo giá"), mô tả, ảnh `store-item`. Tối đa 50 item.
   - Cột "Mức độ hoàn thiện" 5 mục như prototype.
   - Bỏ khối dashboard số liệu giả (lượt xem, khách quan tâm, lịch hẹn, biểu đồ). Không có nguồn dữ liệu nên không bịa (Q-V4-608-6).
8. **Admin › Gian hàng (`stores.view`)**
   - 4 KPI: Tổng / Đang hiển thị / Bản nháp / Admin đã ẩn.
   - Tìm theo tên / ngành / tỉnh. Chip trạng thái có số đếm.
   - Bảng 10 dòng / trang, các cột: chọn · Gian hàng · Ngành nghề · Tỉnh/thành · SP/DV · Cập nhật · Trạng thái · Thao tác.
   - Modal chi tiết.
   - Ẩn / Hiển thị đơn lẻ và hàng loạt cần `stores.action`.
     - Body `{ ids[], reason? }`: lý do tuỳ chọn, prototype không có ô nhập (Q-V4-608-3).
     - Mỗi gian hàng ghi một `audit_logs`; outbox `store.hidden` không cần, chỉ audit.
   - Toast "Đã ẩn N gian hàng" / "Đã hiển thị N gian hàng".
9. **Sự kiện:** `store.published` (outbox) khi chủ xuất bản, dùng cho onboarding V4-611. Consumer worker hiện chỉ log ghi nhận (gate outbox-consumers).
10. **Menu**
    - Portal: "Gian hàng địa phương" `/stores`, mở nhóm KẾT NỐI KINH DOANH. V4-609 thêm Nhu cầu phía trên.
    - Admin: nhóm "Gian hàng & Nhu cầu" có mục con "Gian hàng" `/stores`, cần `stores.view`.
11. **Ngoài phạm vi:**
    - Khối "Đang cần" / badge "Đang tìm đối tác" (V4-609).
    - "Quan tâm" (tim), sắp xếp "Xem nhiều", badge "Nổi bật": không có nguồn, ẩn.
    - Hồ sơ năng lực, Đội ngũ, Chứng nhận, Reels (dữ liệu mở rộng prototype `EX`).
    - Mẫu `equip`. Q-V4-608-6.

### Validation / Error Handling
- Body PUT `/me/store`: zod `storeUpsertSchema`.
  - Tên 2–120, slogan ≤ 160, giới thiệu ≤ 4000.
  - Field phải thuộc danh mục scope `project`. Province thuộc 34 tỉnh.
  - Email / URL / phone hợp lệ. Items ≤ 50, giá ≥ 0 nguyên.
- TK không phải business → 403 "Chỉ tài khoản Doanh nghiệp có gian hàng". Chưa đóng phí → `MEMBERSHIP_REQUIRED` (guard sẵn có).
- `/me/store` khi chưa có Store (DN đóng phí trước v4) → 404. FE hiện "Gian hàng sẽ được tạo ở lần đóng phí kế tiếp" (D-84).
- Admin hide/show id không tồn tại → bỏ qua, trả `{ changed }`.

## ACCEPTANCE CRITERIA
- Given TK DN chưa có gian hàng, When webhook phí xác nhận, Then có 1 Store `draft` lấy từ hồ sơ DN. Chạy lại sự kiện → vẫn 1. TK Cá nhân → không tạo.
- Given Store draft thiếu giới thiệu, When Xuất bản, Then 400 "Cần tên, giới thiệu (≥ 40 ký tự) và ít nhất 1 sản phẩm / dịch vụ để xuất bản".
- Given đủ điều kiện, When Xuất bản, Then `published` ngay, hiện ở Khám phá, outbox `store.published`.
- Given Khám phá, When chọn ô danh mục / Sản phẩm / Đối tượng / Tỉnh, Then danh sách và "{n} kết quả" cập nhật theo facet. "Đặt lại" xoá hết lọc. Không khớp → "Không tìm thấy giải pháp phù hợp."
- Given chi tiết gian hàng, Then có Email / Zalo / Gọi. Bản nháp người khác mở → 404.
- Given Admin có `stores.action`, When chọn 2 gian hàng → Ẩn, Then cả 2 `hidden`, biến mất ở Khám phá, có 2 audit. Hiển thị lại → về trạng thái trước. Không có quyền → 403.
- Given TK Cá nhân, When mở "Gian hàng của tôi", Then thấy paywall/không có gian hàng; Khám phá xem được.

## CONSTRAINTS
- DO NOT:
  - Dữ liệu giả ở dashboard gian hàng.
  - Tạo gian hàng hàng loạt cho DN cũ (D-84).
  - Check tên vai trò.
  - Query trong vòng lặp.
  - Hằng số giá mới.
- REUSE:
  - `uploads` (MinIO), guard phí, `AuditService`, outbox.
  - Danh sách 34 tỉnh (`packages/shared` provinces), `Category` scope `project`.
  - Pattern `investor` admin list, `projects` explore.
- SKIP: như Business Rules 11.

## PARITY (bảng "V4 — PARITY UI")

| Màn | Trạng thái |
|---|---|
| P-105 Gian hàng · Khám phá | mặc định |
| P-106 Khám phá · lọc ô danh mục | |
| P-107 Khám phá · rỗng | |
| P-108 Chi tiết gian hàng | |
| P-109 Gian hàng của tôi · form sửa | |
| P-110 Gian hàng của tôi · paywall | TK chưa đóng phí |
| D-93 Admin › Gian hàng | |
| D-94 Modal chi tiết gian hàng | |

Mỗi màn đo 1440 + 390 và có test hành vi `e2e/behavior/stores.spec.ts`.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`. File BE ≤ 600, FE ≤ 400 dòng. Không `any`.
- [ ] Chuyển trạng thái chỉ qua `store-status.ts` + `WHERE status = from` (luật 7). Admin ẩn/hiện ghi audit cùng transaction (luật 10).
- [ ] Consumer tự tạo idempotent. Không tạo hàng loạt (D-84). Event mới có consumer (gate outbox-consumers). Hợp đồng API cập nhật.
- [ ] Index `(status, province, field, updated_at desc)`, `(status, updated_at desc)`, `(store_id, sort)`. Keyset + deferred join. EXPLAIN trên ≥ 10k dòng.
- [ ] lint + typecheck + unit + depcheck + build; test:int local-business + membership-fee + contract + gates; e2e stores + smoke; parity ≤ 3%.
