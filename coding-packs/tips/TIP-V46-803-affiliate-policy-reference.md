# TIP-V46-803: Admin › Affiliate — Chính sách §31, Hoa hồng chỉ tham khảo, bỏ chi trả trực tiếp, "Thuộc vùng (theo tỉnh)"

## HEADER

- TIP-ID: TIP-V46-803
- Project: OPCHUB
- Module: affiliate (Admin UI + API admin), reporting/regional (projection đọc vùng), shared contract affiliate
- Priority: P0
- Depends on: TIP-V46-802 (đã merge, PR #80, `dev` `3429b7a7`)
- Estimated: L
- REQ / D: REQ-619, REQ-312 · D-119, D-121, D-128, D-129 (+ D-110 làm tròn, D-91 (2) nút "Sửa điều khoản", D-89 / D-93 prototype thắng)
- **Files touched:**
  - Shared
    - `packages/shared/src/api-domains/affiliate-admin.ts` (modify):
      - `affiliateSummarySchema`: thêm `regionalTotal` (phần GĐ Vùng cùng phạm vi tháng), `netRevenue` đổi nghĩa = `revenue − regionalTotal`
      - `affiliateCommissionRowSchema`: thêm `customerYear: int ≥ 1`
      - `affiliateAdminListRowSchema`: thêm `region: { region, provinceName, directorName } | null`
      - `affiliateMonthRowSchema`: bỏ `payable` khỏi UI (giữ trường cho tương thích, xem SPEC 12)
    - `packages/shared/src/mock-data/domains/affiliate.ts`, `mock-data/domains/affiliate-policy.ts` (modify): sinh lại theo trường mới; bỏ dữ liệu "đã chi trả trực tiếp" mới (giữ khoản `paid` cũ làm lịch sử)
  - Server
    - `apps/server/src/modules/reporting/regional/earliest-group.sql.ts` (modify): thêm biến thể trả `province_name` (cùng thứ tự D-128, không định nghĩa lại luật)
    - `apps/server/src/modules/reporting/regional/regional-projection.repository.ts` (modify): `affiliateRegions(userIds[])` một query (lateral), trả `{ userId, region, provinceName }`
    - `apps/server/src/modules/reporting/regional/regional-share-projection.repository.ts` (modify): `directorTotal(month?)` tổng `director_amount` (không tính `region IS NULL`)
    - `apps/server/src/modules/affiliate/repositories/commission-admin.repository.ts` (modify): summary bỏ `netRevenue = revenue − totalCommission`
    - `apps/server/src/modules/affiliate/repositories/commission-admin.query.ts` (modify): `customerYear` = năm của khách tại `created_at` khoản (JOIN `customer_years`, dùng `customerYearOf` ở service, không SQL tính năm)
    - `apps/server/src/modules/affiliate/services/commission-admin.service.ts` (modify): ghép `regionalTotal`, `netRevenue`
    - `apps/server/src/modules/affiliate/services/affiliate-admin.service.ts`, `services/affiliate-list-presentation.ts` (modify): ghép `region` cho trang (1 query cho cả trang, không N+1); tên GĐ Vùng lấy từ `RegionalDirectorReadService.slots()` (đã export)
    - `apps/server/src/modules/affiliate/controllers/admin-affiliates.controller.ts` (modify): **gỡ** `POST /admin/affiliates/:id/payouts`
    - `apps/server/src/modules/affiliate/services/payout.service.ts` (delete), `affiliate-core.module.ts` (modify: bỏ provider)
    - Nếu gỡ event `affiliate.payout_recorded` (SPEC 9): `packages/shared/src/outbox/events.ts`, `apps/server/src/modules/affiliate/services/affiliate-admin-notify.handler.ts` (bỏ `payout`), `apps/server/src/worker/processors/affiliate.processor.ts` (bỏ đăng ký) (modify)
    - `apps/server/src/modules/affiliate/affiliate-core.module.ts` (modify): import `RegionalProjectionModule` (đã dùng ở regional-director, cùng chiều)
  - Admin
    - `apps/admin/src/features/affiliate/components/`:
      - `policy-form.tsx`, `policy-fields.tsx`, `policy-rules.tsx` (modify), `policy-layout.module.css` (modify)
      - `policy-year-table.tsx`, `policy-plan-table.tsx` (create): bảng "Năm của khách" và "Phần GĐ Vùng theo từng gói" (hàm thuần `regionalPercent` / `regionalMinYear` / `regionalAmount` từ `@opchub/shared`)
      - `commission-reference-banner.tsx` (create), `commission-table.tsx`, `commission-table-columns.tsx` (modify)
      - `affiliate-table-columns.tsx` (modify: cột "Thuộc vùng (theo tỉnh)"), `affiliate-region-cell.tsx` (create)
      - `affiliate-stats.tsx`, `affiliate-tabs.tsx` (modify: nhãn + `netRevenue` mới)
      - `payout-months-table.tsx`, `payout-months-table-columns.tsx` (modify: bỏ nút, nhãn "GĐ Vùng chi")
      - `payout-dialog.tsx`, `payout-accessibility.spec.tsx` (delete)
    - `apps/admin/src/features/affiliate/regional/components/regional-policy-fields.tsx` (modify: đổi nhãn theo prototype, đặt vào khối mới)
    - `apps/admin/src/features/affiliate/hooks/use-affiliate-writes.ts`, `hooks/use-affiliate-access.ts`, `api.ts` (modify: bỏ `payout`)
    - `apps/admin/src/mocks/handlers/affiliate-write.ts` (modify: bỏ handler payouts), `mocks/handlers/affiliate.ts`, `affiliate-demo.ts` (modify: trường mới)
    - `apps/admin/messages/vi/affiliate.json` (modify: thêm khoá mới; sửa `net`, `policy.ruleText`; xoá `payout*`, `toast.paid`, `policy.rate`, `policy.fundraising*` khi không còn dùng)
  - Seed
    - `packages/db/seed/demo/affiliate.ts`, `affiliate-scenario.ts`, `affiliate-payout-scenario.ts` (modify): không sinh khoản "đã chi trả trực tiếp" mới sau ngày cắt; giữ fixture cũ cho lịch sử (xem SPEC 13)
  - Test
    - `packages/shared/src/api-domains/affiliate-admin.spec.ts`, `apps/admin/src/mocks/affiliate-handlers.spec.ts` (modify)
    - `apps/server/test/affiliate/payout.int.spec.ts` (modify → khẳng định route đã gỡ: 404), `summary-paid.int.spec.ts`, `admin-commissions.int.spec.ts`, `list-presentation.int.spec.ts` (modify)
    - `apps/server/test/affiliate/region-column.int.spec.ts` (create)
    - `apps/admin/src/features/affiliate/components/{policy-form,affiliate-stats,action-dialogs}.spec.tsx`, `hooks/use-affiliate-writes.spec.tsx` (modify), `components/policy-year-table.spec.tsx`, `commission-reference-banner.spec.tsx`, `affiliate-region-cell.spec.tsx` (create)
    - `e2e/behavior/affiliate-payout.spec.ts` (modify → "không còn nút chi trả, hiện GĐ Vùng chi"), `affiliate-ui-debt-policy.spec.ts`, `affiliate-policy-responsive.spec.ts`, `admin-affiliate.spec.ts`, `affiliate-renewal.spec.ts` (modify nhãn), `e2e/behavior/admin-affiliate-reference.spec.ts` (create)
    - `e2e/parity/scenarios/admin-affiliate.ts`, `admin-affiliate-states.ts` (modify chỉ khi cần đổi bước UI; không nới ngưỡng)
  - Tài liệu
    - `coding-packs/standards/global/domain-glossary.md` (thêm dòng)
    - `coding-packs/reports/V4.6-progress.md` (dòng #3)
    - `coding-packs/reports/ui-parity/{screens,questions}.md` (dòng / mục V4.6)
    - `coding-packs/reports/TIP-V46-803-completion.md` (create)
- **Parallel-safe with:** sequential.
  - Chia `features/affiliate/**`, `api-domains/affiliate*`, `modules/affiliate/**`, `messages/vi/affiliate.json` với V46-802 (đã merge) và V46-804 (Portal "Vùng của tôi" đọc cùng projection).
  - Chia `modules/affiliate/**` (BR-463 hoa hồng 0đ) với V46-807 → 807 chạy sau 803.
  - Chia `reporting/regional/**` với V46-804.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-803-affiliate-policy-reference` tách từ `dev` `3429b7a7`.
- **DB:** 801 / 802 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). TIP này **không có migration**; builder vẫn hỏi owner DB đích trước khi chạy int / e2e server / seed. Không reset DB native.
- Delta `coding-packs/audit/SPEC-V4.6-DELTA.md`:
  - **P7** Chính sách: bảng "Quy tắc chia sẻ Media Soft ↔ GĐ Vùng", phần GĐV theo từng gói năm 1 → từ năm 4; thay % hoa hồng affiliate (D-70, D-110)
  - **P8** Hoa hồng: cột "Thuộc vùng (theo tỉnh)" ("Do vùng quản lý"), "Xem đối soát", "GĐ Vùng chi"; **bỏ nút chi trả trực tiếp**
- Đặc tả `docs/spec/dac-ta.html` **§31** (CS-11 → CS-15), §32 GDV-R07 (affiliate tự thuộc vùng theo tỉnh, Admin không đổi).
- Prototype `docs/spec/index.html` v4.6 (`affPage`, dòng ~4345 → 4535; logic dòng ~5849 → 6002):
  - Header tab: `Doanh thu Media Soft giữ lại (sau phần GĐ Vùng)` + `net = rev − gdv.sum`
  - Chính sách (tìm `afA.cfg.gMin`): tiêu đề "Quy tắc chia sẻ doanh thu thực thu · Media Soft ↔ GĐ Vùng", phụ đề "Media Soft chỉ chia sẻ với GĐ Vùng · chỉ tính thành viên qua link affiliate · GĐ Vùng tự phân chia cho trưởng nhóm & affiliate cấp dưới"; 3 ô; bảng năm (`yrs`), bảng gói (`pk`), cookie, chú thích, khối quy tắc, "Lưu chính sách"
  - Hoa hồng: banner xanh "Hoa hồng affiliate do GĐ Vùng tự chi trả …"; cột Tỷ lệ `_yrL` ("Năm 1" / "Năm y · gia hạn" / "Năm y · hết chia sẻ")
  - Đại lý: dòng 4500, cột "Thuộc vùng (theo tỉnh)", `vMode:'Do vùng quản lý'`, "Xem đối soát"
  - Chi tiết đại lý (4515 → 4535): bảng tháng Tháng / Khách / Hoa hồng / Trạng thái / Ngày chi trả + cột cuối "GĐ Vùng chi", "Sửa (Admin)" giữ
- Đọc trước:
  - `apps/admin/src/features/affiliate/components/{policy-form,policy-fields,policy-rules,affiliate-stats,affiliate-tabs,affiliate-table-columns,commission-table-columns,payout-months-table-columns}.tsx`
  - `apps/admin/src/features/affiliate/regional/components/regional-policy-fields.tsx` (802)
  - `packages/shared/src/membership/regional-share.ts` (`regionalPercent`, `regionalMinYear`, `regionalAmount`, `customerYearOf`)
  - `apps/server/src/modules/reporting/regional/{earliest-group.sql,regional-projection.repository,regional-share-projection.repository}.ts`
  - `apps/server/src/modules/affiliate/{controllers/admin-affiliates.controller,services/payout.service,repositories/commission-admin.repository,services/affiliate-list-presentation}.ts`
  - `apps/server/src/modules/regional-director/services/regional-share-read.service.ts` (KPI tab GĐ Vùng, để `regionalTotal` khớp số)

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): affiliate đọc vùng qua `reporting/regional` (projection được duyệt), không import nội bộ `regional-director`; không vòng phụ thuộc (regional-director đã import affiliate → affiliate **không** import regional-director; tên GĐ Vùng lấy qua projection)
- [backend/api-conventions](../standards/backend/api-conventions.md) · [backend/auth-rbac](../standards/backend/auth-rbac.md): xem `affiliate.view`, sửa chính sách `affiliate.action`
- [database/query-indexing](../standards/database/query-indexing.md): vùng cả trang 1 query (lateral, index `(user_id, status, created_at, group_id)` có sẵn), không N+1
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md) · [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Đổi **Admin › Affiliate** từ mô hình "Media Soft chi hoa hồng cho từng đại lý" sang §31 (D-119):

- **Chính sách**: dựng lại theo prototype — khối "Quy tắc chia sẻ doanh thu thực thu · Media Soft ↔ GĐ Vùng" (3 ô), bảng năm của khách, bảng phần GĐ Vùng theo từng gói (năm 1 → từ năm 4), thời gian ghi nhận link, chú thích, khối quy tắc mới, "Lưu chính sách". Bỏ ô % hoa hồng mặc định và % Gọi vốn khỏi màn này.
- **Hoa hồng**: chỉ để tham khảo / đối soát — banner, cột Tỷ lệ kèm năm của khách; vẫn hủy / khôi phục được.
- **Bỏ chi trả trực tiếp**: gỡ nút + hộp thoại + route `POST /admin/affiliates/:id/payouts`; bảng tháng ở chi tiết đại lý hiện "GĐ Vùng chi".
- **Đại lý**: cột "Thuộc vùng (theo tỉnh)" chỉ hiển thị (D-121, D-128).
- **Header / thẻ**: "Doanh thu Media Soft giữ lại (sau phần GĐ Vùng)" = doanh thu − phần GĐ Vùng.

## SPECIFICATIONS

### Chính sách (P7, prototype thắng)

1. Thứ tự khối (1440 và 390 theo prototype):
   1. Tiêu đề "Quy tắc chia sẻ doanh thu thực thu · Media Soft ↔ GĐ Vùng" + phụ đề (nguyên văn prototype)
   2. 3 ô: "GĐ Vùng năm 1", "Giảm mỗi năm từ năm 2", "Mức duy trì tối thiểu (chi phí vận hành)" (đổi nhãn khoá `policy.regionalFirstYear/Step/Min`; giữ validator `min ≤ năm 1` của 802)
   3. Bảng "Năm của khách / Media Soft / GĐ Vùng / Tỷ lệ MS / GĐV"
   4. Bảng "Phần GĐ Vùng theo từng gói"
   5. "Thời gian ghi nhận link (ngày)" + gợi ý (khoá `policy.cookie`, `cookieHint` có sẵn)
   6. Chú thích "Áp dụng trên phí năm thực thu · 3 tháng miễn phí không phát sinh chia sẻ · năm của khách tính từ ngày thanh toán phí đầu tiên · …" (nguyên văn prototype)
   7. Khối quy tắc mới (`policy.ruleText` viết lại theo prototype, tham số `{ms1}`, `{g1}`)
   8. Nút "Sửa điều khoản" (giữ D-91 (2)) và "Lưu chính sách"
2. Bảng năm tính **ở client từ giá trị đang nhập** (`Form.useWatch`), dùng `regionalPercent` / `regionalMinYear` của `@opchub/shared` — không công thức thứ hai:
   - `nf = max(2, regionalMinYear(policy))` (năm đầu chạm mức tối thiểu) — khớp prototype `max(2, ceil((g1 − min) / max(1, step)) + 1)` khi `step > 0`; unit so 5 bộ số với công thức prototype (50/10/20, 60/15/25, 20/10/20, 100/30/0, 30/7/20)
   - **`step = 0` và `min < năm 1`** (`regionalMinYear` = `null`): prototype sinh 30 dòng và dòng cuối sai % (chia cho `max(1, 0)`); app hiện **một dòng** "Từ năm 1 trở đi" = năm 1 (đúng `regionalPercent`, khoản sổ thực tế). Ghi **Q-V46-803-5**
   - Dòng y = 1 … nf − 1: "Năm y · khách mới" (y = 1, phụ "Đăng ký & trả phí lần đầu") / "Năm y · gia hạn" (phụ "Giảm {step}% so với năm trước"); cột MS = `100 − g`, GĐV = `g`, Tỷ lệ = `MS / GĐV`
   - Dòng cuối "Từ năm {nf} trở đi", phụ "Giữ {min}% cho GĐ Vùng để duy trì chi phí vận hành nhân lực"
   - Giá trị không hợp lệ (min > năm 1, ô trống) → bảng hiện "—", không ném lỗi
3. Bảng gói: 3 dòng Gói Cá nhân (`/ năm`), Gói Doanh nghiệp (`/ năm`), Gói Gọi vốn (`/ dự án`); giá lấy `usePrices()` (D-94, **không** hằng số giá); cột Năm 1, Năm 2, Năm 3, Từ năm 4: số GĐ Vùng (`regionalAmount`) + dòng phụ "MS {phần còn lại}". Giá chưa tải → "—".
4. Bỏ khỏi UI Chính sách: ô "Tỷ lệ hoa hồng mặc định (%)", khối "Hoa hồng Gói Gọi vốn (%)", `policy.rateHint`. **Giữ trong schema / API / DB** `defaultRate`, `fundraisingRate`, `cookieDays`, `terms` (hoa hồng vẫn tính để tham khảo, D-119). PUT chính sách vẫn gửi đủ trường: lấy `defaultRate` / `fundraisingRate` từ giá trị đã tải (hidden `Form.Item`), không ghi đè thành mặc định. Ghi **Q-V46-803-1** (Admin sửa % mặc định ở đâu).
5. Audit `affiliate.policy_update` giữ nguyên (diff chỉ chứa trường đổi).

### Hoa hồng chỉ tham khảo (P8)

6. Banner info đầu tab Hoa hồng, nguyên văn prototype: "Hoa hồng affiliate do GĐ Vùng tự chi trả từ phần chia sẻ của vùng. Media Soft không chi trực tiếp cho affiliate, chỉ chi cho GĐ Vùng ở tab GĐ Vùng. Số liệu ở đây dùng để GĐ Vùng đối soát."
7. Cột "Tỷ lệ": `{rate}% · Năm {y}` khi y = 1 hiện "Năm 1"; y ≥ 2 hiện "Năm y · gia hạn". `customerYear` do server tính bằng `customerYearOf(customer_years.first_paid_at, commissions.created_at)`; khách chưa có `customer_years` → 1. **Không** tự đổi % theo năm (prototype `_yrR` r23 / maxY không có D-xx; giữ % đã ghi ở khoản) → ghi **Q-V46-803-2**.
8. Bộ lọc Tất cả / Đã ghi nhận / Đã chi trả / Đã hủy, hủy / khôi phục, xuất CSV: giữ. Trạng thái "Đã chi trả" còn lại chỉ là lịch sử trước D-119.

### Bỏ chi trả trực tiếp (D-119)

9. Server: gỡ route `POST /v1/admin/affiliates/:id/payouts` (→ 404 như route không tồn tại), xoá `PayoutService` và provider. Không đổi dữ liệu `commissions.status = 'paid'` cũ, `paid_bank_snapshot` cũ.
   - Outbox `affiliate.payout_recorded`: không còn nơi phát; giữ khai báo event nếu consumer / test M1 yêu cầu, ngược lại gỡ cùng consumer — builder kiểm `packages/shared/src/outbox/events.ts` + test M1 rồi chọn, ghi completion.
   - Permission `affiliate.payout` **giữ** (802 dùng cho chi trả GĐ Vùng). Đổi `label` thành "Chi trả GĐ Vùng" trong `permissions.ts` → **không** (file ngoài phạm vi; ghi Q-V46-803-3).
10. Admin: xoá `payout-dialog.tsx`, mutation `payout`, `api` payouts, handler MSW payouts. Bảng tháng chi tiết đại lý: cột cuối thay nút "Chi trả" bằng chữ xám "GĐ Vùng chi" cho mọi dòng có khoản; tháng không có khoản → "—".
11. Portal (`me-affiliate`) **không** thuộc TIP này (804).
12. `affiliateMonthRowSchema.payable` giữ trong contract (Portal / 804 có thể dùng), UI Admin không đọc.
13. Seed / MSW: không sinh mới khoản `paid` (chi trả trực tiếp). Fixture lịch sử trước D-119 giữ nguyên để test "Đã chi trả" còn chạy. D-119 "chưa go-live → seed sinh lại": nếu builder thấy khoản `paid` demo làm lệch parity so prototype (prototype vẫn có "Đã chi trả") → **giữ**, không xoá.

### Thuộc vùng (theo tỉnh) (D-121, D-128, D-129)

14. Cột mới ở tab Đại lý sau cột đại lý, tiêu đề "Thuộc vùng (theo tỉnh)", 2 dòng:
    - Dòng 1: `{tên GĐ Vùng | "Chưa có GĐ Vùng"} · {Miền Bắc | Miền Trung | Miền Nam}`
    - Dòng 2 (xám): `{tỉnh} · Do vùng quản lý`
    - Không thuộc nhóm tỉnh nào → "—" + dòng phụ "Chưa thuộc vùng · 100% Media Soft"
15. Vùng = `earliestRegionalGroup` của 802 (nhóm tham gia sớm nhất còn là thành viên; nhóm ngành → tỉnh của nhóm cha). Tỉnh tick của GĐ Vùng **không** quyết định (D-129). **Không** có control đổi vùng (D-121).
16. Server ghép vùng cho **cả trang** bằng một query (`= ANY($ids)` + lateral), tên GĐ Vùng lấy theo `region` từ projection (một query nhỏ cho 3 ô). Không query theo từng dòng.
17. Chi tiết đại lý: không thêm vùng (prototype không có) — SKIP.

### Header và thẻ (prototype)

18. `affiliate-tabs.tsx` header: nhãn "Doanh thu Media Soft giữ lại (sau phần GĐ Vùng)", số `netRevenue`.
19. `netRevenue = revenue − regionalTotal`; `regionalTotal = Σ regional_shares.director_amount` (mọi trạng thái, `region IS NOT NULL`) cùng phạm vi tháng (`month_key = month` nếu có). `revenue` giữ như hiện tại (Σ `list_amount` khoản hoa hồng `recorded|paid`) → ghi **Q-V46-803-4** (prototype lấy rev từ khoản affiliate; sổ 802 lấy từ phí thực thu — hai nguồn có thể lệch khi khoản hoa hồng bị hủy).
20. 4 thẻ giữ khoá và gợi ý hiện tại (prototype giữ "Hoa hồng phải trả" / "Đã chi trả"); chỉ sửa chữ nếu prototype khác nguyên văn.

### Validation

- Chính sách: 3 ô 0–100 số nguyên, `min ≤ năm 1`, năm 1 ≥ 1 (802); cookie 1–365. Server zod giữ nguyên.
- `customerYear` int ≥ 1; `region` nullable trong contract.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| Gọi `POST /admin/affiliates/:id/payouts` | 404 |
| Giá gói chưa tải | bảng gói hiện "—" |
| Ô chính sách không hợp lệ | bảng năm "—", nút Lưu chặn bởi validator |
| Đại lý không có nhóm tỉnh | cột vùng "—" + "Chưa thuộc vùng · 100% Media Soft" |
| Miền chưa có GĐ Vùng | "Chưa có GĐ Vùng · Miền …" |
| Lỗi tải projection vùng | API trả lỗi chung (không trả danh sách thiếu cột) |

## ACCEPTANCE CRITERIA

- **Bảng năm** Given 50 / 10 / 20 Then 4 dòng: Năm 1 50/50 · Năm 2 60/40 · Năm 3 70/30 · Từ năm 4 trở đi 80/20. Given 60 / 15 / 25 Then Năm 1 60, Năm 2 45, Năm 3 30, Từ năm 4 25. Given 20 / 10 / 20 Then "Năm 1" 20 + "Từ năm 2 trở đi" 20. Given 50 / 0 / 20 Then một dòng "Từ năm 1 trở đi" 50/50 (Q-V46-803-5) (unit `policy-year-table.spec.tsx` › `rows match prototype nf`, `zero step single row`).
- **Bảng gói** Given giá Cá nhân 1.200.000, DN 3.600.000, Gọi vốn 15.000.000 và 50 / 10 / 20 Then Cá nhân: 600.000 / 480.000 / 360.000 / 240.000, dòng MS 600.000 / 720.000 / 840.000 / 960.000; đổi giá ở Cấu hình bảng giá → bảng đổi theo (unit `policy-plan-table` › `uses configured prices`; e2e `admin-affiliate-reference` › `policy tables`).
- **Không còn ô %** Given mở Chính sách Then không có "Tỷ lệ hoa hồng mặc định (%)", "Hoa hồng Gói Gọi vốn (%)". When Lưu Then PUT gửi `defaultRate` / `fundraisingRate` bằng giá trị đã tải; audit chỉ diff trường đổi (unit `policy-form.spec.tsx` › `keeps hidden rates`; int `policy.int.spec.ts`).
- **Banner + Tỷ lệ** Given khách năm 1 và khoản của khách năm 2 Then cột hiện "20% · Năm 1" và "20% · Năm 2 · gia hạn"; banner nguyên văn (int `admin-commissions.int.spec.ts` › `customer year`; e2e `admin-affiliate-reference` › `commission reference`).
- **Bỏ chi trả** Given Kế toán (có `affiliate.payout`) mở chi tiết đại lý có khoản tháng trước Then không có nút "Chi trả", cột cuối "GĐ Vùng chi"; `POST /v1/admin/affiliates/:id/payouts` → 404; khoản `paid` cũ vẫn hiện "Đã chi trả" (int `payout.int.spec.ts` › `route removed`; e2e `affiliate-payout.spec.ts`).
- **Thuộc vùng** Given đại lý ở nhóm Đà Nẵng (ngày 1) và Hà Nội (ngày 5), GĐ Vùng Trung "Trần B" Then "Trần B · Miền Trung" / "Đà Nẵng · Do vùng quản lý". Given chỉ ở nhóm ngành con Cần Thơ, ô Nam trống Then "Chưa có GĐ Vùng · Miền Nam" / "Cần Thơ · Do vùng quản lý". Given không nhóm Then "—". Given GĐ Vùng Bắc bỏ tick Lào Cai, đại lý ở Lào Cai Then vẫn GĐ Vùng Bắc (int `region-column.int.spec.ts`).
- **Không N+1** Given trang 20 đại lý Then số query đọc vùng = 1 (+ 1 cho ô GĐ Vùng), kiểm bằng spy Prisma `$queryRaw` (int `region-column` › `single query per page`).
- **Header** Given revenue 10.000.000, sổ GĐ Vùng 3.000.000 (+ 1.000.000 dòng `region NULL`) Then header "Doanh thu Media Soft giữ lại (sau phần GĐ Vùng)" 7.000.000; lọc tháng → cùng phạm vi tháng (int `summary-paid.int.spec.ts` › `net after regional`; unit `affiliate-stats.spec.tsx`).
- **Không gán tay** Given Admin ở tab Đại lý / chi tiết Then không có control chọn vùng (e2e `admin-affiliate-reference` › `region read only`).
- **MSW = server** Given cùng fixture Then contract parse cả MSW và server (unit `affiliate-handlers.spec.ts`, `affiliate-admin.spec.ts`).
- **Parity ≤ 3% (1440 + 390)**: `D-84` (Hoa hồng mặc định), `D-84-AFF`, `D-84-AFF-Q`, `D-84-POL`, `D-85`, `D-85-CUS`; các trạng thái `D-84-COM-*` không tụt so với `dev`. Không mask / nới; màn không đạt ghi số đo và lý do.

## CONSTRAINTS

- DO NOT:
  - chi trả trực tiếp affiliate dưới bất kỳ dạng nào (nút, route, job) (D-119)
  - control đổi vùng / gán GĐ Vùng cho affiliate (D-121); dùng tỉnh tick để tính vùng (D-129)
  - hằng số giá gói, 50 / 10 / 20, 20%, 10% trong code chạy (chỉ seed / test / migration cũ)
  - công thức % thứ hai ở FE (dùng `regionalPercent` / `regionalMinYear` / `regionalAmount`)
  - đổi % hoa hồng theo năm (r23 / maxY) — chờ Q-V46-803-2
  - sửa `commissions` cũ, xoá khoản `paid` lịch sử
  - affiliate import `modules/regional-director` (vòng phụ thuộc); đọc bảng khác ngoài `reporting/regional`
  - query trong vòng lặp; select `*`
  - `any`, `@ts-ignore`, `console.*`; nới parity / mask / timeout
  - sửa `packages/shared/src/permissions.ts`, Portal affiliate (804)
- REUSE:
  - `RegionalPolicyFields` (802), `regionalPercent`, `regionalMinYear`, `regionalAmount`, `customerYearOf`
  - `earliestRegionalGroup`, `RegionalProjectionRepository`, `RegionalShareProjectionRepository`
  - `usePrices`, `affiliateMoney`, `REGIONAL_LABELS`, `@opchub/ui` Alert / Table
  - `PolicyTerms` (nút "Sửa điều khoản")
- SKIP:
  - Portal "Vùng của tôi", banner GĐ Vùng (804)
  - BR-463 ẩn khoản hoa hồng 0đ (807)
  - Vùng ở chi tiết đại lý; CSV cột vùng (807 nếu cần)
  - Tab GĐ Vùng / Cấu hình GĐ Vùng (801 / 802), parity `D-120-*`

## Câu hỏi ghi sẵn (`reports/ui-parity/questions.md` › V4.6, chọn phương án an toàn, không chặn)

- **Q-V46-803-1**: Prototype v4.6 bỏ ô "% hoa hồng mặc định" và "% Gọi vốn" khỏi Chính sách nhưng tab Đại lý vẫn ghi "hoa hồng mặc định 20%". Chọn: ẩn khỏi UI, giữ giá trị DB, % từng đại lý vẫn sửa ở chi tiết ("Sửa (Admin)"). Owner muốn chỗ sửa % mặc định thì mở TIP sau.
- **Q-V46-803-2**: Prototype có r23 = 10% (năm 2–3 gia hạn) và maxY = 3 ("hết chia sẻ" từ năm 4) cho hoa hồng affiliate, không có D-xx và code hiện không ghi hoa hồng gia hạn. Chọn: chỉ hiện nhãn năm, giữ % đã ghi.
- **Q-V46-803-3**: Nhãn quyền `affiliate.payout` "Chi trả hoa hồng" nay dùng cho chi trả GĐ Vùng. Đề xuất đổi "Chi trả GĐ Vùng" ở TIP sau (file `permissions.ts` ngoài phạm vi).
- **Q-V46-803-5**: Bước giảm 0% với mức tối thiểu < năm 1: prototype tính `nf` bằng chia cho `max(1, 0)` → 30 dòng, dòng cuối hiện mức tối thiểu dù sổ vẫn ghi % năm 1. Chọn: một dòng "Từ năm 1 trở đi" = % năm 1, đúng tiền thật.
- **Q-V46-803-4**: "Doanh thu Media Soft giữ lại" = doanh thu khoản affiliate (recorded + paid) − phần GĐ Vùng của sổ 802. Hai nguồn lệch khi Admin hủy khoản hoa hồng (sổ GĐ Vùng không đảo). Chọn theo prototype, ghi lệch.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-803-affiliate-policy-reference`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi chạy int / e2e server / seed (CONTEXT)
- [ ] Đo baseline `dev` trước (e2e MSW 341 pass / 9 fail theo 802; int; parity D-84*) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `admin-affiliate-reference.spec.ts`, `affiliate-payout.spec.ts`
- [ ] Parity ≤ 3% cả 1440 + 390: D-84, D-84-AFF, D-84-AFF-Q, D-84-POL, D-85, D-85-CUS; `screens.md` cập nhật; không mask / nới
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **D-119**: không còn đường chi trả trực tiếp affiliate (UI, API, MSW); hoa hồng vẫn tính để tham khảo
  - **D-121 / D-128 / D-129**: vùng tự theo nhóm tỉnh sớm nhất, chỉ hiển thị, không gán tay, tỉnh tick không quyết định
  - **Luật 5**: vùng cả trang 1 query, không N+1; **luật 10**: lưu chính sách vẫn ghi `audit_logs`
  - **Luật 3**: affiliate chỉ đọc projection `reporting/regional`, `pnpm depcheck` sạch, không vòng phụ thuộc
- [ ] Không hằng số giá / tỷ lệ trong code chạy; tiền số nguyên VND, làm tròn `Math.round` (D-110)
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] Glossary: "Doanh thu Media Soft giữ lại", "Thuộc vùng (theo tỉnh)", "GĐ Vùng chi"
- [ ] Ghi Q-V46-803-1 → 5; cập nhật `V4.6-progress.md` dòng #3
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity từng màn, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ; ghi trung thực PARTIAL như 801 / 802

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority, depends 802, estimate L, REQ / D)
- [x] Context: DB đích, delta P7 / P8, § đặc tả, dòng prototype, file đọc trước
- [x] Task rõ phạm vi + SKIP sang 804 / 807
- [x] Business rules đánh số 1 → 20, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: bảng năm, bảng gói, ẩn ô %, banner + năm, bỏ chi trả, vùng (D-128 / D-129 / vùng trống / không nhóm), không N+1, header, không gán tay, MSW = server, parity
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 804 / 807
- [x] BUILDER-CHECKLIST trích luật D-119 / D-121 / D-128 / D-129, luật 3 / 5 / 10
- ⚠️ Gap:
  - Q-V46-803-1 → 5 là phương án an toàn tự chọn, cần owner xác nhận khi review (nhất là Q-2 hoa hồng gia hạn và Q-4 cách tính "giữ lại").
  - Gỡ event `affiliate.payout_recorded` phụ thuộc test M1 (mọi event có consumer) — builder quyết theo code, ghi completion.
  - `dev` còn gate đỏ từ 801 / 802 (e2e 9 fail baseline, int persona-turn, parity D-120-*): đo baseline trước.
