# TIP-V42-707: Affiliate cho mọi thành viên từ khi đăng ký, mã luôn hoạt động, cột `plan`, khôi phục Đã hủy, làm tròn đến đồng, doanh thu tách gói

## HEADER
- TIP-ID: TIP-V42-707
- Project: OPCHUB
- Module: affiliate (server), account (cổng đăng ký), membership-fee (payload outbox), Admin / Portal affiliate, MSW
- Priority: P0
- Depends on: TIP-V42-706 (nhánh chưa merge → xếp chồng)
- Estimated: L
- REQ / D: REQ-602, REQ-613, D-94 3A, D-110 (thay AF-R01 "đóng phí mới thành đại lý", AF-R07 "đại lý hết hạn → tạm dừng", D-53 / D-70 "làm tròn xuống"),
  BR-AFF-REV, §27.6
- **Files touched:**
  - DB: migration `v42_affiliate_all` — enum `commission_plan` (`personal`, `business`, `fundraising`), cột `commissions.plan` NOT NULL + backfill
    (membership: `membership_fees.plan` hiện tại của người được giới thiệu; fundraising → `fundraising`), mọi đại lý `paused` → `active`;
    `affiliate.prisma`
  - Shared: `outbox/events.ts` (`membership_fee.confirmed.plan`), `api-domains/affiliate-admin.ts` (`plan` trong dòng hoa hồng, `revenueByPlan`
    trong tóm tắt, `affiliateRestoreSchema`), `api-domains/affiliate.ts` (dòng giới thiệu `plan` theo khoản), mock-data `domains/affiliate*.ts`
  - Server affiliate: `domain/commission-amount.ts` (Math.round), `domain/affiliate.state.ts` (`cancelled → recorded`),
    `services/affiliate-lifecycle.handler.ts` (bỏ tạm dừng theo phí, ghi `plan`), `services/affiliate-backfill.service.ts` (mọi TV không phải NĐT),
    `services/referral-code.service.ts` (không chặn theo phí), `services/me-affiliate.service.ts`, `services/affiliate-admin.service.ts`,
    `services/commission-admin.service.ts` (`restore`), `services/fundraising-commission.handler.ts`, repositories (`affiliate-write`, `commission`,
    `commission-admin`, `me-affiliate.query`), controller `admin-affiliate-commissions.controller.ts` (`POST commissions/restore`),
    cổng đăng ký (`account/ports.ts` `ReferralPort.enroll`, `register.service.ts` gọi trong cùng transaction)
  - Server membership-fee: `membership-fee.service.ts` (payload `plan`), `paid-members.query.ts` → mọi TV
  - Admin: `features/affiliate/{components/commission-status-menu.tsx, affiliate-stats.tsx, commission-table-columns.tsx, hooks/use-affiliate-writes.ts,
    api.ts}`, `messages/vi/affiliate.json`, MSW handlers
  - Portal: `features/affiliate` (bỏ trạng thái `paused` / `locked` cho TV; gói theo khoản), MSW đăng ký (mã không còn bị tạm dừng)
  - Test: int affiliate (lifecycle, backfill, pause → đổi thành "mã luôn hoạt động", referral-code, me-affiliate, commission-plan, admin-commissions,
    restore mới), unit (commission-amount, state), MSW spec, e2e `behavior/affiliate-*.spec.ts`
- **Parallel-safe with:** sequential — chồng trên 706.

## CONTEXT
- Hiện tại: đại lý tạo ở consumer `membership_fee.confirmed` (AF-R01), tạm dừng khi phí hết hạn (AF-R07), mã tạm dừng bị từ chối khi đăng ký
  (AT-AF05), hoa hồng `Math.floor`, khoản Đã hủy là trạng thái cuối, nhãn gói cố định "Phí thành viên 12 tháng", thẻ doanh thu không tách gói.
- Prototype v4.2 (`afv`): thẻ "Doanh thu từ affiliate" phụ đề "{n} Gói DN · {n} Gói Cá nhân · {n} Gói Gọi vốn"; dòng hoa hồng `plan` =
  "Gói Doanh nghiệp 12 tháng" / "Gói Cá nhân 12 tháng" / "Gói Gọi vốn · 6 tháng"; `com = amount × rate / 100` (không làm tròn xuống).

## SPECIFICATIONS
### Business Rules
1. **Mọi TV là đại lý từ khi đăng ký (D-94 3A):** tạo dòng `affiliates` (mã theo tên, % mặc định) trong transaction kích hoạt tài khoản (trừ NĐT).
   Worker backfill khi khởi động: mọi TV không phải NĐT, chưa xoá, chưa có đại lý (keyset 500, không N+1).
2. **Mã luôn hoạt động (D-110):** không chuyển `paused` theo phí; migration đưa `paused` → `active`. Mã hợp lệ khi đăng ký bất kể phí của đại lý.
   Chỉ Admin hủy từng khoản hoa hồng (vi phạm) — giữ.
3. **Hoa hồng chỉ khi trả phí thật (BR-AFF-REV):** trial không sinh (giữ — sự kiện `membership_fee.confirmed` chỉ phát khi có kỳ phí). Lần đóng
   phí đầu (`isFirst`) → khoản theo **gói thực trả** (`plan` của khoản phí lúc xác nhận).
4. **Cột `plan`** (snapshot) mỗi khoản: `personal` / `business` / `fundraising`. Backfill: fundraising theo `source`; membership theo
   `membership_fees.plan` của người được giới thiệu (gói hiện tại — dữ liệu cũ không lưu gói theo kỳ). Portal / Admin hiện nhãn đúng gói.
5. **Làm tròn đến đồng (D-110):** `Math.round(list × rate / 100)` — cả tính lại khi đổi % (`round(...)` trong SQL).
6. **Khôi phục (D-110):** `POST /admin/affiliates/commissions/restore { ids }` — `cancelled → recorded`, xoá `cancel_*`; khoản đã chi trả vẫn khoá;
   audit `affiliate.commission_restore` (luật 10). Menu trạng thái Admin cho phép "Đã ghi nhận" từ "Đã hủy" (như prototype `opts`).
7. **Thẻ doanh thu (BR-AFF-REV):** "Doanh thu từ affiliate" phụ đề "{n} Gói DN · {n} Gói Cá nhân · {n} Gói Gọi vốn" (khoản hợp lệ).

### Validation
- `ids` 1–100 chuỗi (như hủy).

### Error Handling
- Khôi phục id không tồn tại → 404; không ở Đã hủy → bỏ qua (trả `restored: 0`).

## ACCEPTANCE CRITERIA
- Given đăng ký TV mới When kích hoạt Then có đại lý active ngay (int); NĐT không.
- Given đại lý có phí hết hạn When khách dùng mã Then đăng ký được + gắn referral (int, MSW).
- Given khách đóng Gói DN When xác nhận lần đầu Then khoản `plan = business`, tiền = round(3.600.000 × % / 100) (int).
- Given khoản Đã hủy When Admin khôi phục Then Đã ghi nhận + audit; khoản đã chi trả không đổi (int, e2e MSW).
- Given đổi % đại lý When tính lại Then làm tròn đến đồng (int).
- Given Admin › Affiliate When mở Then thẻ doanh thu có phụ đề tách gói (e2e MSW / parity D-84).

## CONSTRAINTS
- DO NOT: hằng số giá; tạo đại lý cho NĐT; query trong vòng lặp; sửa khoản đã chi trả.
- REUSE: `AffiliateAllocationService.ensure`, `ReferralRegistry`, `isFeeUsable`.
- SKIP: chi trả theo gói; gộp `plan` vào báo cáo CSV ngoài cột mới.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đổi trạng thái qua `COMMISSION_TRANSITIONS` + `WHERE status = from` (luật 7); audit khôi phục (luật 10)
- [ ] Migration có backfill + EXPLAIN nếu thêm truy vấn danh sách mới
- [ ] Không phụ thuộc vòng account ↔ affiliate (cổng `ReferralPort`)
