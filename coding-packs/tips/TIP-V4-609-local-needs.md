# TIP-V4-609: Nhu cầu địa phương — đăng / đóng / mở lại / xoá, gợi ý gian hàng, Admin ẩn / hiện

## HEADER
- TIP-ID: TIP-V4-609
- Project: OPCHUB
- Module: local-business (server, mở rộng) · db · shared · portal (needs, stores, shell) · admin (needs, shell)
- Priority: P0 (REQ-511)
- Depends on: V4-608 (Gian hàng; xếp chồng, PR #25 chưa merge)
- Estimated: L
- REQ / D: REQ-511 · D-74, D-75, D-80 · §25.2 · §27.5 · §27.6 UP-09 / AD-07
- **Files touched:**
  - `packages/db/prisma/schema/local-business.prisma` (modify): enum `NeedType`, `NeedStatus`, `NeedScope`, `NeedChannel`; model `Need`; quan hệ `Store.needs`, `User.needs`.
  - `packages/db/prisma/schema/account.prisma` (modify): quan hệ `User.needs`.
  - `packages/db/prisma/migrations/20261024230000_v4_local_needs/` (create).
  - `packages/db/test/migration-needs.int.spec.ts` (create).
  - `packages/db/seed/demo/needs.ts` (create), `seed/demo/index.ts` (modify).
  - `packages/shared/src/api-domains/needs.ts` (create), `api-domains/stores.ts` (modify: `openNeeds` ở chi tiết, `seeking` ở thẻ), `index.ts`.
  - `packages/shared/src/fixtures/needs-seed.ts` (create), `fixtures/index.ts`.
  - `packages/shared/src/mock-data/domains/needs.ts` (create), `stores.ts` (modify), `index.ts`.
  - `apps/server/src/modules/local-business/**`:
    - create: `domain/need-status.ts`, `domain/need.mapper.ts`, `repositories/need*.repository.ts`, `services/need-*.service.ts`, `controllers/need*.controller.ts`;
    - modify: `local-business.module.ts`, `store.mapper.ts`, `store-explore.repository.ts` (khối "Đang cần", cờ `seeking`).
  - `apps/server/test/local-business/needs.int.spec.ts` (create), `test/contract/local-business.int.spec.ts`, `coverage.int.spec.ts`, `coding-packs/plans/api-contract.md`.
  - `apps/portal/src/features/needs/**` (create), `app/(portal)/needs/page.tsx` (create), `features/stores/**` (khối "Đang cần", badge), shell `nav.ts`, `messages/*/{common,needs,stores}.json`, MSW `handlers/needs.ts`.
  - `apps/admin/src/features/needs/**` (create), `app/(admin)/needs/page.tsx` (create), admin `nav.ts`, `messages/vi/{common,needs}.json`, MSW `handlers/admin-needs.ts`.
  - `e2e/behavior/needs.spec.ts` (create); `portal-shell`, `admin-shell`, `admin-rbac` (thêm mục menu); `e2e/parity/scenarios/{portal-needs,admin-needs}.ts` (create) + registry.
- **Parallel-safe with:** sequential — dùng chung `local-business.prisma`, `api-contract.md`, nav, `stores.ts` với V4-608.

## CONTEXT
- UP-09: "Đăng nhu cầu: cần mua, cần đầu ra, cần đối tác, cần dịch vụ…; ngành cần tìm (chọn "Khác" → nhập); gợi ý gian hàng phù hợp. Hiển thị ngay; chỉ tài khoản có gian hàng được đăng."
- AD-07: "Gian hàng & Nhu cầu (2 mục con) — Danh sách, ẩn khi vi phạm, thống kê. Không duyệt trước."
- D-75: chỉ chủ gian hàng (TK DN đã đóng phí) đăng Nhu cầu; Cá nhân chỉ xem.
- Prototype v4:
  - Portal `pNeeds` (index.html 2216–2346). Tab Tất cả / Nhu cầu của tôi, form đăng 5 phần.
  - Admin `aNeeds` (3993–4024).
  - JS `storePage`: seed 11 nhu cầu (4988–4992); trang (4994–5033).
  - "Đang cần" ở chi tiết gian hàng (2144); badge "Đang tìm đối tác" ở thẻ (4907).
- Quyền Admin dùng `stores.view` / `stores.action` (menu `stores` = "Gian hàng & Nhu cầu", prototype `canMenu('lneeds') → 'stores'`).

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md)
- [backend/auth-rbac](../standards/backend/auth-rbac.md)
- [database/query-indexing](../standards/database/query-indexing.md)
- [database/prisma-migrations](../standards/database/prisma-migrations.md)
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md)
- [frontend/data-state](../standards/frontend/data-state.md)
- [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md)

## TASK
Dựng Nhu cầu địa phương:
- Chủ gian hàng đăng nhu cầu, hiển thị ngay, không duyệt.
- Thành viên xem danh sách có lọc loại / tỉnh / ngành / tìm kiếm. Mỗi nhu cầu có gợi ý số gian hàng cùng ngành (ưu tiên cùng tỉnh).
- Chủ đóng / mở lại / xoá nhu cầu của mình.
- Admin xem KPI, ẩn / hiện (hàng loạt) khi vi phạm.

## SPECIFICATIONS
### Business Rules
1. **Ai đăng (D-75):** TK `business`, đã đóng phí (guard sẵn có), đã có gian hàng.
   - Không phải DN → 403 "Chỉ tài khoản Doanh nghiệp có gian hàng".
   - Chưa có gian hàng → 409 "Nhu cầu được đăng gắn với gian hàng của bạn" (D-84: có ở lần đóng phí kế tiếp).
2. **Loại** (prototype NT): `buy` Cần mua · `sell` Cần đầu ra · `partner` Cần đối tác · `service` Cần dịch vụ · `solution` Cần giải pháp · `staff` Cần nhân sự · `space` Cần mặt bằng / kho · `capital` Cần vốn · `other` Nhu cầu khác.
3. **Form** (prototype 5 phần):
   - Thông tin:
     - loại;
     - tiêu đề 4–160;
     - ngành: danh mục v4 scope `project`, hoặc "Khác" kèm ô nhập ≤ 80 (`fieldCustom = true`);
     - mô tả 20–2000.
   - Quy mô & ngân sách:
     - số lượng / đơn vị là chữ tự do, ghép `quantity` ≤ 80;
     - ngân sách `budgetMin` / `budgetMax` là số nguyên VND ≥ 0, `min < max`;
     - hoặc "Thỏa thuận".
   - Khu vực & thời hạn:
     - tỉnh là select 34 tỉnh, mặc định tỉnh gian hàng;
     - phường / xã ≤ 80;
     - hạn cần (ngày, tuỳ chọn), lưu `due_at` timestamptz 00:00 giờ VN;
     - phạm vi `province | region | nation`.
   - Hình thức hợp tác và tiêu chuẩn: chọn nhiều trong danh sách cố định của prototype. Link tài liệu ≤ 300.
   - Liên hệ:
     - người liên hệ;
     - SĐT, email: cần ít nhất một;
     - kênh ưu tiên `zalo | call | email`.
4. **Trạng thái** (`domain/need-status.ts`, cập nhật có điều kiện):
   - Chủ: `close` open → closed; `reopen` closed → open (làm mới `updated_at`).
   - Admin: `hide` open|closed → hidden (nhớ `hidden_prev`); `show` hidden → `hidden_prev`.
   - Prototype "Hiển thị" luôn về "Đang mở". Chọn nhớ trạng thái trước như Gian hàng (Q-V4-609-1).
   - Xoá: chủ xoá open / closed. Nhu cầu bị ẩn không xoá được, trả 409 "Liên hệ Admin để mở lại" (Q-V4-609-2).
5. **Danh sách công khai:** `open`, của gian hàng `published` có chủ còn hạn phí.
   - Lọc:
     - `type`, `province`, `field`: một giá trị, như select prototype;
     - `q`: ILIKE trên tiêu đề / mô tả / ngành / tỉnh / phường / tên gian hàng.
   - Sắp `updated_at desc, id desc`, 24 / trang, deferred join.
   - Facet: số đếm theo loại, danh sách tỉnh và ngành đang có. Một `GROUP BY`, cache Redis 60 s, xoá khi đổi.
6. **Gợi ý:**
   - Với mỗi nhu cầu trong trang: đếm gian hàng hiển thị cùng `field`, trừ gian hàng của người đăng.
   - Nếu có gian hàng cùng tỉnh: "{k} gian hàng {ngành} cùng tỉnh". Nếu không: "{k} gian hàng {ngành} toàn quốc".
   - Một truy vấn `GROUP BY field, province` cho cả trang, không truy vấn trong vòng lặp.
   - Bấm gợi ý → Khám phá gian hàng lọc ngành (+ tỉnh nếu cùng tỉnh).
7. **Liên hệ:** Zalo / Gọi điện / Email theo SĐT / email của nhu cầu, cùng helper link như Gian hàng. Không có trang chi tiết nhu cầu (prototype không có).
8. **Gian hàng (V4-608):**
   - Chi tiết thêm khối "Đang cần" (nhu cầu `open` của gian hàng, tối đa 6), có link "Xem Nhu cầu địa phương →".
   - Thẻ Khám phá thêm badge "Đang tìm đối tác" khi gian hàng có nhu cầu đang mở.
9. **Admin › Nhu cầu (`stores.view`):**
   - 4 KPI: Tổng nhu cầu / Đang mở / Đã đóng / Admin đã ẩn.
   - Tìm theo tiêu đề / ngành / tỉnh / gian hàng. Chip trạng thái có số đếm. Ghi chú "Nhu cầu hiển thị ngay khi thành viên đăng; Admin chỉ ẩn khi vi phạm."
   - Bảng 10 / trang: chọn · Nhu cầu · Loại · Gian hàng · Khu vực · Ngày đăng · Trạng thái · Thao tác.
   - Ẩn / Hiển thị đơn lẻ và hàng loạt cần `stores.action`. Mỗi nhu cầu ghi 1 `audit_logs` (action `need.hide|show`, tag `moderation`).
   - Toast "Đã ẩn N nhu cầu" / "Đã hiển thị N nhu cầu".
10. **Menu:**
    - Portal: "Nhu cầu địa phương" `/needs`, đứng trước "Gian hàng địa phương".
    - Admin: "Nhu cầu địa phương" `/needs` đứng trước "Gian hàng" (`stores.view`).
11. **Ngoài phạm vi:**
    - Thẻ "Nhu cầu phù hợp" ở Dashboard và bước onboarding (V4-611 tính từ bảng `needs`, D-85).
    - Tin "Nhu cầu" ở bảng tin; sửa nhu cầu (prototype không có).

### Validation / Error Handling
- Body POST `/me/needs`: zod `needCreateSchema`. Lỗi trả 400 kèm ô theo copy prototype:
  - "Nhập tiêu đề nhu cầu"
  - "Chọn ngành cần tìm"
  - "Nhập ngành bạn cần tìm"
  - "Mô tả chi tiết tối thiểu 20 ký tự"
  - "Nhập số điện thoại hoặc email liên hệ"
  - "Ngân sách “từ” phải nhỏ hơn “đến”"
- Server kiểm thêm: ngành thuộc danh mục (trừ "Khác"); tỉnh thuộc 34 tỉnh.
- PATCH / DELETE nhu cầu của người khác → 404. Chuyển sai trạng thái → 409.

## ACCEPTANCE CRITERIA
- Given chủ gian hàng đã đóng phí, When đăng nhu cầu đủ trường, Then nhu cầu `open` hiện ngay ở danh sách, toast "Đã đăng nhu cầu — hiển thị ngay, không cần duyệt", chuyển tab "Nhu cầu của tôi".
- Given TK Cá nhân, When mở "Nhu cầu của tôi" hoặc POST, Then thấy khối "Đóng phí thành viên để đăng nhu cầu" / 403. Danh sách vẫn xem được.
- Given danh sách, When chọn chip "Cần mua" / tỉnh / ngành / tìm, Then số "{n} nhu cầu đang mở" và thẻ cập nhật. Không khớp → "Chưa có nhu cầu phù hợp bộ lọc."
- Given nhu cầu ngành X tỉnh Y, Then thẻ có "Gợi ý: k gian hàng X cùng tỉnh →". Bấm → Khám phá lọc X + Y.
- Given chủ đóng nhu cầu, Then rời danh sách công khai. Mở lại → quay lại, `updated_at` mới.
- Given Admin có `stores.action`, When ẩn 2 nhu cầu, Then cả 2 `hidden`, rời danh sách, 2 audit. Hiển thị → về trạng thái trước. Không có quyền → 403.
- Given gian hàng có nhu cầu đang mở, Then chi tiết có "Đang cần" và thẻ Khám phá có "Đang tìm đối tác".

## CONSTRAINTS
- DO NOT:
  - Check tên vai trò.
  - Query trong vòng lặp.
  - Dữ liệu giả ở Dashboard.
  - Hằng số giá mới.
  - Duyệt trước khi hiển thị.
- REUSE:
  - Guard phí, `AuditService`.
  - `STORE_FIELDS` / provinces.
  - Helper liên hệ của `features/stores`.
  - Visible-store filter (`store-explore.repository`).

## PARITY (bảng "V4 — PARITY UI")

| Màn | Trạng thái |
|---|---|
| P-111 Nhu cầu · tất cả | mặc định |
| P-112 Nhu cầu · lọc chip "Cần mua" | |
| P-113 Nhu cầu · rỗng | tìm không khớp |
| P-114 Đăng nhu cầu · form | |
| P-115 Nhu cầu của tôi | sau khi đăng |
| P-116 Nhu cầu của tôi · chưa đóng phí | TK chưa đóng phí |
| P-108 Chi tiết gian hàng (đo lại, có "Đang cần") | |
| D-95 Admin › Nhu cầu | |

Mỗi màn đo 1440 + 390, có test hành vi `e2e/behavior/needs.spec.ts`.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`. BE ≤ 600, FE ≤ 400 dòng. Không `any`.
- [ ] Chuyển trạng thái chỉ qua `need-status.ts` + `WHERE status = from` (luật 7). Admin ghi audit (luật 10).
- [ ] Index `(status, updated_at desc, id)`, `(status, province, field, updated_at desc)`, `(owner_id, created_at desc)`, `(store_id, status)`. Deferred join. EXPLAIN trên ≥ 10k dòng.
- [ ] Gợi ý = 1 truy vấn `GROUP BY`; facet cache 60 s.
- [ ] lint + typecheck + unit + depcheck + build; test:int local-business + contract + gates + migration; e2e needs + stores + smoke; parity ≤ 3%.
