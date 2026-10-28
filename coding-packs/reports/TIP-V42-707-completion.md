# TIP-V42-707 — Affiliate cho mọi thành viên, mã luôn hoạt động, cột `plan`, khôi phục, làm tròn đến đồng — completion

- Nhánh `feature/TIP-V42-707-affiliate-all`, xếp chồng trên `feature/TIP-V42-706-fund-resubmit` (PR 706 chưa merge).
- PR: base `feature/TIP-V42-706-fund-resubmit`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-706-fund-resubmit...feature/TIP-V42-707-affiliate-all
- REQ / D: REQ-602, REQ-613, D-94 3A, D-110 (thay AF-R01, AF-R07, "làm tròn xuống" của D-53 / D-70), BR-AFF-REV, §27.6.

## Commit

| SHA | Nội dung |
|---|---|
| `6bb7dbbb`, `d724d502` | TIP-V42-707 (+ sửa route khôi phục `/admin/affiliate/commissions/restore`) |
| `e4b44d67` | DB: enum `commission_plan`, `commissions.plan` NOT NULL + backfill (Gọi vốn theo `source`, phí thành viên theo `membership_fees.plan`), CHECK `plan` ↔ `source`, đại lý `paused` → `active`; shared: `plan` trong dòng hoa hồng / dòng giới thiệu, `plans` trong tóm tắt, `affiliateRestoreSchema`, `membership_fee.confirmed.plan`; MSW theo D-94 3A / D-110 |
| `1b976705` | Server: `ReferralPort.enroll` gọi trong transaction đăng ký (NĐT không); backfill mọi TV không phải NĐT; bỏ tạm dừng / void theo phí (mã hợp lệ bất kể phí đại lý); hoa hồng ghi `plan` theo gói thực trả; `POST /admin/affiliate/commissions/restore` (Đã hủy → Đã ghi nhận, audit `affiliate.commission_restore`, khoản đã chi trả vẫn khoá); `Math.round` + `round()` SQL khi đổi %; tóm tắt đếm theo gói; máy trạng thái bỏ `active ↔ paused`, `pending → void`; audit C4 cập nhật; int `affiliate-all` (4) |
| `1b2afbb8` | Admin: phụ đề thẻ doanh thu theo gói, menu trạng thái cho "Đã ghi nhận" từ "Đã hủy", mutation khôi phục + toast, MSW route khôi phục |
| `d768499e` | e2e: mã luôn hoạt động, TV chưa đóng phí có link, khôi phục khoản Đã hủy |
| `052ff917` | Dữ liệu demo AF0 (MSW + `seed:demo`) theo gói thực trả như prototype v4.2 `C0` (17 Gói DN, 33 Cá nhân, giá hiện hành); preview chính sách thêm mức Gói DN + Gói Gọi vốn (prototype `perT`) |
| `d5257667` | Portal: hero "240.000đ (Cá nhân) · 720.000đ (Doanh nghiệp) · 1.500.000đ (Gói Gọi vốn 10%)" 10 ngôn ngữ; nhãn tháng 600 như prototype |
| `3fa1eafa` | Admin: màn chính hiện phụ đề tách gói; chữ tab Chính sách + gợi ý tab Affiliate theo v4.2 (có % mặc định), thanh công cụ một dòng ở desktop |
| `44d2169d` | e2e: số tiền AF0 theo gói thực trả, gợi ý chính sách v4.2 |
| commit báo cáo | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| Đăng ký TV mới → đại lý active ngay khi kích hoạt; NĐT không | int `affiliate-all` (1), `referral-code` (REQ-303) | pass |
| Đại lý hết phí → khách dùng mã đăng ký được + gắn referral; hoa hồng ghi bình thường | int `referral-code` (AT-AF03, REQ-303), `pause` (2), `me-affiliate` (REQ-309); MSW portal / admin; e2e `affiliate-paused` (2) | pass |
| Khách đóng Gói DN lần đầu → `plan = business`, tiền = round(3.600.000 × % / 100) | int `affiliate-all` (2) | pass |
| Khôi phục Đã hủy → Đã ghi nhận + audit; khoản đã chi trả không đổi; lần hai `restored: 0`; id lạ 404 | int `affiliate-all` (3); e2e `affiliate-status-menu › D-110` | pass |
| Đổi % → làm tròn đến đồng (99.999 × 33% = 33.000) | int `affiliate-all` (4); unit `commission-amount` | pass |
| Thẻ doanh thu phụ đề "{n} Gói DN · {n} Gói Cá nhân · {n} Gói Gọi vốn" | unit `affiliate-stats`; parity D-84 | pass |

## Test (số thật, máy dev)

- `pnpm lint` / `pnpm typecheck`: 8 / 8 task. `pnpm depcheck`: 0 vi phạm (887 module).
- Unit: shared 418, server 225, portal 387, admin 463, integrations 103 (+2 skip), ui 52 — **1648** (706: 1647).
- `test:int`: server **156 file, 1464 / 1464** (+`affiliate-all` 4, các file affiliate cập nhật theo D-94 3A / D-110), db 17 / 54 — tổng **1518** (706: 1510).
- Audit C4 (`c4-transitions.audit.ts`): Affiliate 6 / 6 đạt (có cạnh mới `cancelled → recorded`); 4 lỗi còn lại là Hội thoại bot (có từ trước, thuộc TIP-V42-713).
- `pnpm build` (MSW) portal + admin: thành công.
- e2e MSW behavior toàn bộ (bản build cuối): **317 pass / 0 fail / 4 skip** (13,4 phút; 706: 316 → +1 kịch bản khôi phục).

## EXPLAIN (≥ 10k dòng)

Không có truy vấn danh sách mới; `paid-members.query` (backfill) đổi điều kiện. EXPLAIN ANALYZE trên 10.000 kỳ phí (int `backfill-plan`):
`Index Scan using membership_fees_pkey` (Index Cond `user_id > cursor`, 500 dòng) + `Index Scan using users_pkey` (lọc NĐT / xoá mềm, loops 500),
không Seq Scan; 7,0 ms. Danh sách hoa hồng Admin chỉ thêm cột `c.plan` sau deferred join theo PK (`admin-plan`: Index Only Scan
`commissions_created_at_id_idx` / `commissions_status_created_at_id_idx`, 1,6 – 2,0 ms).

## Parity (MSW, ngưỡng 3%, prototype v4.2)

| Màn | 1440 | 390 |
|---|---|---|
| P-97 Portal · Affiliate | 0,79% | 0,65% |
| P-98 Portal · Lịch sử nhận tiền | 0,86% | 0,92% |
| D-84 Admin · Affiliate (Hoa hồng) | 1,34% | 2,82% |
| D-84-POL Chính sách | 1,19% | 2,45% |
| D-84-AFF-Q / -BULK / -EMPTY | 1,08 / 1,12 / 0,72% | 2,08 / 2,01 / 1,06% |
| D-84-COM-BULK / -PAID / -CANCELLED / -CANCELLED-MENU / -EMPTY | 1,20 / 1,47 / 0,51 / 0,55 / 0,41% | 0,88 / 1,26 / 1,87 / 2,15 / 0,91% |
| D-84-AFF Đại lý mặc định | **5,58%** | **5,88%** |

D-84-AFF: owner đã chấp nhận ngoại lệ ở D-91 (1) — app 64 đại lý (D-94 3A: mọi TV, gồm 51 khách AF0 có tài khoản thật) so với 13 của prototype,
thứ tự trang 1 khác. Trước 707 là 24,12 / 29,36% (đo trên v4); giảm nhờ dữ liệu demo theo gói. Ghi Q-V42-707-3.

Màn Portal Affiliate đổi theo prototype v4.2 (trước 707 đo trên v4 nên không thấy): hero ba mức hoa hồng, khoản theo gói DN / Cá nhân.

## Soát luật cứng

1. File trong trần (`affiliate-lifecycle.handler.ts` 63, `use-affiliate-writes.ts` 97 — tách `use-commission-status-writes.ts`, mock `affiliate.ts` 309).
2. Không `any`; payload `membership_fee.confirmed.plan` parse zod (mặc định `personal` cho sự kiện cũ).
3. depcheck sạch; account ↔ affiliate qua cổng `ReferralPort.enroll` (không phụ thuộc vòng).
5. Không query trong vòng lặp: backfill keyset 500 / lô; khôi phục 1 UPDATE `= ANY(ids)`.
7. Khôi phục qua `canCommission('cancelled', 'recorded')` + `WHERE status = 'cancelled'`.
9. Tiền số nguyên VND, `Math.round` / `round()::integer`.
10. Audit `affiliate.commission_restore`.
14. Commit theo đường dẫn.

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token).
- Q-V42-707-1: backfill `plan` cho khoản cũ dùng gói **hiện tại** của người được giới thiệu (dữ liệu cũ không lưu gói theo kỳ).
- Q-V42-707-2: dữ liệu demo AF0 đổi sang gói thực trả theo prototype v4.2 (trước là phí cũ 600.000, D-69) — số trên màn demo đổi.
- Q-V42-707-3: D-84-AFF vẫn > 3% (ngoại lệ D-91).
- Portal giữ nhánh hiển thị `paused` / `locked` cho client cũ; server không còn trả `paused`, `locked` chỉ khi không có đại lý (NĐT).
- Dữ liệu dev: đã chạy lại `seed` + `seed:demo` sau khi đổi kịch bản AF0.
