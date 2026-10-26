# TIP-V4-602 — Hoa hồng Affiliate theo phí gói thực đóng (D-70) — completion

- Nhánh: `feature/TIP-V4-602-commission-actual-fee` (xếp chồng trên `feature/TIP-V4-605-service-tickets`, PR #21 chưa merge)
- PR: [#22](https://github.com/duymt-dev/OPCHUB/pull/22) (base `feature/TIP-V4-605-service-tickets`)
- Commit:
  - `80203fa6` TIP
  - `ba756729` db + shared
  - `b372390f` server + bảng hợp đồng
  - `e7570cf5` Admin + Portal
  - `955fabc0` e2e + parity
- REQ / D: REQ-502 · D-70 (thay cơ sở 600.000 của D-53) · D-69 · §27.1, AD-06, AD-10, F05

## Đã làm

- **DB**
  - Migration `20261023200000_v4_commission_actual_fee`: enum `commission_source`, `commissions.source` (mặc định `membership`), `affiliate_policy.fundraising_rate` mặc định 10 + CHECK 1–50.
  - Test migration `packages/db/test/migration-commission-source.int.spec.ts` (schema `mig_v4_602`): hoa hồng cũ giữ số tiền, nguồn = membership; chính sách giữ % mặc định, thêm % Gọi vốn 10; CHECK chặn 51.
  - Đã `migrate deploy` trên `opchub_test` + `opchub_dev`; seed lại demo.
- **Shared**: `LEGACY_ANNUAL_FEE` (D-69) — hằng 600.000 duy nhất còn lại trong mã chạy; `fundraisingCommission(rate)`. Policy schema thêm `fundraisingRate`; bỏ schema preview. Mock: hoa hồng = % × `fee.amount`; dòng chờ thanh toán `feeAmount` = 0; kịch bản demo kỳ lịch sử dùng `LEGACY_ANNUAL_FEE`.
- **Server**
  - `membership_fee.confirmed.listAmount` = phí gói của kỳ vừa đóng (`membership_fees.amount`: 1.200.000 / 3.600.000; kỳ cũ 600.000). Chuyển dư / khớp tay thiếu không đổi hoa hồng (Q-V4-602-4).
  - Bỏ `GET /admin/affiliate/policy/preview` + `domain/policy-preview.ts` (hợp đồng 204 → 203, Q-V4-602-2).
  - GET/PUT chính sách có `fundraisingRate`, PUT ghi audit như cũ.
  - `me-affiliate`: `perAmount` = % × Gói Cá nhân (Q-V4-602-3); lịch sử `COALESCE(list_amount, 0)`.
  - Ghi hoa hồng Gọi vốn thực tế để V4-610 (Q-V4-602-1).
- **Admin**
  - Tab Chính sách theo v4: gợi ý "Áp dụng trên phí năm: Gói Cá nhân 1.200.000đ · Gói Doanh nghiệp 3.600.000đ"; ô chỉ đọc "Hoa hồng Gói Gọi vốn (%)" = 10, "= 1.500.000đ / Gói Gọi vốn 15.000.000đ · ghi nhận khi Admin duyệt". Bỏ ví dụ theo % và hook/handler preview.
  - Đầu trang "Mạng lưới Affiliate" + khoảng ngày (component chung cho danh sách và chi tiết; breadcrumb vẫn "Affiliate").
  - Mobile theo v4: thống kê 2 cột, danh sách thẻ không còn hàng tiêu đề, bảng khách hàng lưới 2 cột.
- **Portal**: tiêu đề theo tên menu (10 ngôn ngữ); mobile theo v4: hero 18/16px, thống kê 2 cột, bỏ thẻ tiêu đề danh sách, thẻ chi trả chủ TK + ngân hàng cùng hàng.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (portal 6, admin 5 cảnh báo có từ trước) |
| typecheck | 8/8 |
| unit | shared 378 · server 224 · portal 319 · admin 429 · ui 48 · integrations 77 (+2 skip) |
| depcheck | sạch |
| build (MSW) | 3/3 |
| test:int server (affiliate, membership-fee, contract, common, gates, rbac) | 59 file / 189 test passed. Trước đó affiliate + contract + membership-fee 86/86 |
| db int | migration-commission-source + affiliate-demo + schema + seed-demo 21/21 |
| e2e behavior (24 spec affiliate + membership + smoke đăng nhập/menu) | 78/79 lần 1 (`affiliate-status-menu` 360px: hộp thoại Hủy hoa hồng không hiện), chạy riêng 2/2, chạy lại cả bộ 79/79 không đổi mã. Ghi nhận chập chờn, theo dõi ở e2e toàn bộ cuối P2 |

Sửa test theo D-70 (không nới assertion — số mới là hành vi mới):
- `commission-plan.int.spec.ts` (mới): DN 3.600.000 × 20% = 720.000; Cá nhân 1.200.000 × 23% = 276.000; kỳ cũ 600.000 → 120.000; chuyển dư 1.500.000 → 240.000; % Gọi vốn 10 sửa được + audit; route preview → 404.
- Mock/e2e: 25% × 1.200.000 = 300.000 (trước 150.000); hero 20% → 240.000đ; tab Chính sách kiểm gợi ý giá + ô Gọi vốn, không còn "thành viên 600.000đ".
- Dữ liệu demo lịch sử (kỳ trước V4) giữ 600.000 / 120.000 — đúng D-69.

EXPLAIN: không thêm danh sách / truy vấn mới (chỉ đổi giá trị ghi), không đo lại.

## Parity (prototype v4, không mask, không nới ngưỡng)

34/38 khung đạt ≤ 3%.

| Màn | 1440 | 390 | |
|---|---|---|---|
| P-97 Portal · Affiliate | 1,27% | 1,05% | đạt |
| P-98 Lịch sử nhận tiền | 1,31% | 1,20% | đạt |
| D-84 Admin · Affiliate | 1,68% | 2,89% | đạt |
| D-84-COM-* (8 trạng thái) | 0,84–1,92% | 0,98–2,41% | đạt |
| D-84-AFF-BULK / -Q / -EMPTY | 1,03–1,43% | 1,26–2,26% | đạt |
| D-84-AFF | 24,40% | 29,42% | DV-V4-602-1 (= DV-P4-558-1, 62 đại lý thật) |
| D-84-POL Chính sách | 2,41% | 13,61% | 390: DV-V4-602-2 (ô Điều khoản bắt buộc) |
| D-85 / D-85-RATE | 1,23 / 1,24% | 2,36 / 2,34% | đạt |
| D-85-CUS Khách hàng | 2,07% | 11,03% | 390: DV-V4-602-3 (prototype chồng chữ tiêu đề) |

Ngay sau khi đổi prototype v4, nhiều khung 390 tụt (P-97 19%, P-98 22%, D-84 6%…). Nguyên nhân là quy tắc mobile mới của v4 (≤ 1023px): lưới `minmax(200px)` thành 2 cột, ẩn hàng tiêu đề danh sách thẻ, hero 18/16px; cùng tiêu đề "Mạng lưới Affiliate" + khoảng ngày. Đã port các quy tắc này, không mask.

## Soát luật cứng 1–14

- File ≤ trần; không `any`; depcheck sạch.
- Quyền theo key (`affiliate.view`, `affiliate.action`).
- Tiền số nguyên, làm tròn xuống; outbox `membership_fee.confirmed` cùng transaction kỳ phí.
- Đổi chính sách ghi audit; không secret, không `console`; test ở file riêng.
- Commit theo đường dẫn; `git status --short` sạch.

## Chưa làm / câu hỏi

- Q-V4-602-1: ghi hoa hồng Gọi vốn khi Admin duyệt → V4-610 (cột `source` + `fundraising_rate` đã có).
- Q-V4-602-2: bỏ route ví dụ hoa hồng theo %.
- Q-V4-602-3: hero Portal hứa mức Gói Cá nhân — chờ owner chốt.
- Q-V4-602-4: cơ sở hoa hồng = phí gói của kỳ, không phải số tiền chuyển.
- Cổng P1 grep `600000`: đã đạt (chỉ còn `LEGACY_ANNUAL_FEE`).
