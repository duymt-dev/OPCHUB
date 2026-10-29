# TIP-V42-708: Admin › Phí v4.2 (cột, 6 tab, 6 thẻ, doanh thu theo giá gói), Thành viên bỏ "Khởi đầu" + lọc phí 3 lựa chọn, tự nhắc khởi đầu lần mở Portal đầu ngày, FX-02 → 04

## HEADER
- TIP-ID: TIP-V42-708
- Project: OPCHUB
- Module: membership-fee (admin), account (admin members filter), onboarding, service (phiếu tư vấn); Admin fees / members; Portal onboarding / affiliate / shell; MSW
- Priority: P2
- Depends on: TIP-V42-707 (nhánh chưa merge → xếp chồng)
- Estimated: L
- REQ / D: REQ-608, REQ-609, D-100, D-101, D-107, D-115 (A1, A2, CH-01), §28.3, §29.4; SPEC-V4.2-DELTA P7 / P8 / P9; FULL-AUDIT :28, :73 → :76, :150 → :168
- **Files touched:**
  - DB: migration `v42_onboarding_auto_remind` — `onboarding_reminders.sent_by` NULL được (tự nhắc), cột `kind` (`admin` | `auto`), index `(user_id, sent_at DESC)` giữ
  - Shared: `api-domains/membership.ts` (`feeRowSchema.groups`), `api-domains/admin-members.ts` (bỏ `onboarding` khỏi query / row, `ADMIN_MEMBER_FEE_FILTERS = paid | trial | unpaid`),
    `api-domains/onboarding.ts` (thông điệp tự nhắc), mock-data `domains/{ops-admin, fees-admin, admin-members, onboarding}.ts`
  - Server: `membership-fee/repositories/admin-fees.repository.ts` (cột nhóm — 1 query theo lô id, doanh thu = Σ giá năm hiện hành theo gói của TV đang hiệu lực / sắp hết hạn,
    `needReminder` gồm trial), `services/admin-fees.service.ts`; `account/repositories/admin-member-filter.sql.ts` (bỏ `onboarding`, thêm `trial`);
    `onboarding/services/onboarding-auto-remind.service.ts` (create) + controller `POST /me/onboarding/auto-remind`; `service/services/service-request.service.ts` (FX-02)
  - Admin: `features/fees/{types.ts, model.ts, components/fee-stats.tsx, fee-toolbar.tsx, fee-table.tsx}`, `messages/vi/fees.json`;
    `features/members/**` (gỡ cột / lọc / nút Nhắc "Khởi đầu"), `messages/vi/members.json`
  - Portal: `features/onboarding` (gọi tự nhắc khi mở Portal), `messages/*/onboarding.json` (FX-04), `messages/*/affiliate.json` (`locked.*` v4.2),
    `features/shell/hooks/use-welcome-mail.ts` (FX-03), `features/services/model.ts` (FX-02)
  - Test: int `membership-fee/admin-fees-v42`, `onboarding/auto-remind`, `account/admin-members-filters`, `service/request-default`; MSW spec; e2e `admin-fees`,
    `admin-members-filters`, `onboarding`; parity D-07, D-18 → D-22 (D-19 kịch bản v4.2), D-96 / D-97 (lỗi thời → gỡ)
- **Parallel-safe with:** sequential — chồng trên 707.

## CONTEXT
- Prototype v4.2 Admin › Phí (`docs/spec/index.html` :3683 → 3720, logic :5478 → 5549): 6 thẻ "Tổng thành viên", "Đã đóng phí (còn hiệu lực)",
  "Đang miễn phí 3 tháng", "Hết hạn · cần nâng cấp", "Sắp hết hạn (30 ngày)", "Doanh thu phí năm" (= Σ `feeOf(type)` của TV active + soon);
  6 tab "Tất cả", "Đang hiệu lực", "Miễn phí 3 tháng", "Chờ thanh toán", "Sắp hết hạn", "Hết hạn"; cột "Tên thành viên", "Email thành viên",
  "Nhóm tham gia" (chip, "—"), "Loại", "Ngày ĐK", "Trạng thái phí", "Ngày thu", "Hiệu lực đến", thao tác; trial chỉ "Gửi nhắc".
- Admin › Thành viên v4.2 không có cột / lọc / nút "Khởi đầu" (6 bộ lọc). D-107: lọc "Phí thành viên" = Đã đóng phí · Miễn phí 3 tháng · Chưa đóng / Hết hạn.
- `_obAutoRemind` (:5082): thông báo `system` "Bạn còn {n} bước khởi đầu chưa hoàn tất" / "Còn thiếu: {bước}. Hoàn tất để kết nối hiệu quả hơn với cộng đồng.",
  link Dashboard, không email; D-115: lần mở Portal đầu tiên trong ngày, ≤ 1 lần / ngày / người.

## SPECIFICATIONS
### Business Rules
1. **Phí — danh sách:** thêm `groups` (tên nhóm đang là thành viên) cho dòng — một truy vấn theo lô `user_id` của trang (không N+1). Tab "Miễn phí 3 tháng" lọc `trial`.
   Thao tác dòng: trial → chỉ "Gửi nhắc"; pending / expired → "Ghi nhận đã thu" + "Gửi nhắc"; active / expiring → "Gia hạn 12 tháng" (+ "Gửi nhắc" nếu expiring).
2. **Phí — thống kê (D-101):** 6 thẻ như prototype; doanh thu = Σ `planAmountOf(price_configs hiện hành, plan)` của TV `active` + `expiring` (không tổng kỳ phí lịch sử).
   "Gửi nhắc hàng loạt" gồm cả trial (prototype: mọi TV không active).
3. **Thành viên (D-100 / D-107):** gỡ cột "Khởi đầu", lọc "Khởi đầu", nút Nhắc + API Admin nhắc khởi đầu khỏi UI (endpoint giữ cho client cũ). Lọc phí thêm `trial`;
   "Đã đóng phí" chỉ phí thật (`active`, `expiring`); "Chưa đóng / Hết hạn" = còn lại trừ trial.
4. **Tự nhắc khởi đầu (D-100 / D-115):** `POST /me/onboarding/auto-remind` gọi khi Portal mở (sau khi có phiên). Thiếu bước (done < 8) và chưa có nhắc
   trong ngày VN hiện tại → ghi `onboarding_reminders` (`kind = 'auto'`, `sent_by NULL`) + thông báo trong app theo câu prototype, không email.
   Khóa tư vấn (advisory lock) theo user chống hai tab cùng lúc. Trả `{ reminded: boolean }`.
5. **FX-02:** phiếu tư vấn không chọn dịch vụ (hoặc dịch vụ đã tắt) → dịch vụ bật đầu tiên theo thứ tự hiển thị.
6. **FX-03:** đăng nhập / đổi tài khoản → đóng popup mail chào mừng của phiên trước (bỏ cache `welcome`).
7. **FX-04 + Affiliate locked (D-101):** bước Affiliate "Có link ngay khi đăng ký · nhận hoa hồng khi người được giới thiệu thanh toán gói";
   khung locked "Link giới thiệu của bạn đang được khởi tạo" + mô tả ba mức (10 ngôn ngữ).

### Validation
- `fee` lọc thành viên: `paid | trial | unpaid` (giá trị lạ bỏ qua). Auto-remind: body rỗng, cần phiên Portal.

### Error Handling
- Auto-remind lỗi không chặn Portal (fire-and-forget, log). Trial thu tay → 409 như cũ.

## ACCEPTANCE CRITERIA
- Given TV trial / active / expiring / expired / pending When GET /admin/fees/summary Then đếm đúng 6 thẻ, doanh thu = Σ giá năm theo gói của active + expiring (int).
- Given trang Phí When tải Then mỗi dòng có `groups` (1 query nhóm cho cả trang — EXPLAIN ≥ 10k) (int).
- Given lọc phí `trial` / `paid` / `unpaid` When GET /admin/members Then đúng tập (int).
- Given TV thiếu bước When mở Portal hai lần trong ngày Then một thông báo; ngày sau thêm một; đủ 8 bước Then không (int, e2e MSW).
- Given phiếu tư vấn không chọn dịch vụ When gửi Then dịch vụ bật đầu tiên (int).
- Given Admin › Phí / Thành viên When mở Then parity D-07, D-18 → D-22 ≤ 3% ở 1440 + 390.

## CONSTRAINTS
- DO NOT: hằng số giá; query trong vòng lặp; email cho tự nhắc; ẩn control prototype có.
- REUSE: `isFeeUsable` / `PAID_FEE_STATUS`, `PriceConfigService`, `planAmountOf`, `ONBOARDING_SHORT`, `OnboardingRemindService` (khóa + bảng).
- SKIP: bỏ hẳn endpoint Admin nhắc khởi đầu (giữ cho client cũ, không còn nút).

## ⚠️ BUILDER-CHECKLIST
- [ ] Migration `--create-only` rồi sửa SQL; áp `opchub_dev` + `opchub_test`
- [ ] Nhóm theo lô + EXPLAIN ≥ 10k; không N+1
- [ ] FE ≤ 400 dòng / file, hàm ≤ 80; không import nội bộ feature khác
- [ ] Parity D-07, D-18 → D-22 ở 1440 + 390; e2e không tụt
