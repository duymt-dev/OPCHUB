# TIP-V42-703 — Cấu hình bảng giá (price_configs + lịch sử + audit + cache) — completion

- Nhánh `feature/TIP-V42-703-price-config`, xếp chồng trên `feature/TIP-V42-702-trial-fee-gate` (PR 702 chưa merge).
- PR: base `feature/TIP-V42-702-trial-fee-gate`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-702-trial-fee-gate...feature/TIP-V42-703-price-config
- REQ / D: REQ-603, D-94 5A (CR-08), D-106, D-110, S-03, V-12, §27.2(5), §27.5b, §27.5c.

## Commit

| SHA | Nội dung |
|---|---|
| `c5c48513` | TIP-V42-703 |
| `ddd99a56` | DB `price_configs` (1 dòng, CHECK, giá mặc định §27.2) + `price_config_history` (chỉ thêm, trigger); shared `priceConfigSchema` + hàm giá (`planAmountOf`, `monthlyOf`, `discountPctOf`, `fundAmountOf`, `fundCommissionOf`), bỏ `MEMBERSHIP_PLANS` / `FUNDRAISING_PLAN` / `planAmount` / `fundraisingCommission`; kho giá MSW; seed dòng giá mặc định |
| `8de86485` | Server module `pricing` (cache Redis 300 s + epoch CAS, `GET/PUT /admin/price-config`, `GET /public/price-config`); đăng ký / kích hoạt / Gọi vốn (mới, gia hạn, thời hạn duyệt) / preview Affiliate đọc cấu hình; int `test/pricing` |
| `1297359e` | Admin tab "Cấu hình bảng giá" (prototype `stPrice`), gợi ý giá ở Chính sách Affiliate, MSW handler + spec |
| `a3259247` | Portal: Bảng giá, banner, Gói & thanh toán, Hướng dẫn bắt đầu, popup Gọi vốn, Hướng dẫn sử dụng, câu đồng ý tham gia nhóm đọc giá qua API (10 ngôn ngữ) |
| `e0a83766` | e2e `admin-price-config` (3), kịch bản parity D-100, sửa selector exact `admin-settings › SSO`, giá test từ fixtures |
| commit báo cáo | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| Sau migrate: giá mặc định §27.2; Portal đọc công khai `no-store` | int `test/pricing/price-config` › AC1 | pass |
| Lưu → version + 1, 1 dòng lịch sử, audit `pricing.update` diff before / after; Portal thấy giá mới ngay (cache bị xoá dù đã đọc trước); lịch sử không xoá được | int › AC2 | pass |
| Thiếu `settings.general` → 403; giá bán 0 / thời hạn 0 → 400 đúng câu prototype; version cũ → 409 | int › AC3 + MSW `price-config-handlers.spec` | pass |
| Đăng ký mới sau đổi giá → trial với giá mới; khoản chưa thu đổi theo giá; kỳ đã thu giữ nguyên | int › AC4 | pass |
| Gọi vốn mới `fund.p` mới; khoản đang chờ giữ giá + mã; duyệt → thời hạn `fund.mo` | int › AC5 | pass |
| Tab đúng vị trí (sau SMTP), xem trước giá tháng / % ưu đãi / cảnh báo, "Hủy thay đổi", chặn giá trống / thời hạn 0, lưu → toast + Nhật ký | e2e `behavior/admin-price-config` (3) | pass |
| Không còn hằng số giá ngoài fixtures / seed / migration / test | grep (xem dưới) | 0 |

## Test (số thật, máy dev)

- `pnpm lint`: 8 / 8 task (0 lỗi; 10 warning `<img>` cũ). `pnpm typecheck`: 8 / 8.
- `pnpm test` (unit): shared 64 file / 412 test, server 40 / 225, portal 60 / 385, admin 91 / 462, integrations 89 (+2 skip), ui 49 — xanh.
- `pnpm depcheck`: 0 vi phạm (sau khi tách kho giá MSW khỏi `store` để không tạo vòng import).
- `test:int`: server 151 file, 1436 / 1436 (702: 1421; file mới `test/pricing/price-config` 5 test); db 17 file, 54 / 54.
- `pnpm build` (MSW) portal + admin: thành công.
- e2e MSW behavior toàn bộ (build 703): **313 pass / 1 fail / 4 skip** (13,3 phút). Test fail duy nhất `admin-settings › SSO` do selector
  `getByRole('button', { name: 'Cấu hình' })` không exact khớp cả tab mới "Cấu hình bảng giá" → sửa thành `exact: true` (không nới
  assertion); chạy lại `admin-settings.spec.ts`: 11 / 11 pass. Số test tăng 311 → 314 (+3 bảng giá), không tụt.

## Parity (MSW, ngưỡng 3%, prototype v4.2)

| Màn | 1440 | 390 | Ghi chú |
|---|---|---|---|
| D-100 Cài đặt · Cấu hình bảng giá (mới) | 0,09% | 0,01% | 390 trước sửa 11,96% (prototype ép lưới `minmax(170px…)` 2 cột ở màn hẹp) |
| P-79 Bảng giá (giá từ API) | 0,00% (1366: 0,31%) | 0,00% | |
| P-80 Form tư vấn | 0,01% | 0,05% | |
| D-66 / D-71 / D-75 Cài đặt (thêm tab) | đạt | đạt | |
| D-56 Dự án | đạt | đạt | |

Tổng `results.md`: 430 / 444 ảnh đạt; các màn chưa đạt là màn đã ghi ở Q-V42-702-1 → 4 (705 / 708 / 714), không đổi bởi 703.

## EXPLAIN (`coding-packs/reports/explain/V42-703-price-config.{sql,txt}`, +12k phí trong transaction rồi ROLLBACK)

- Đọc giá: Index Scan `price_configs_pkey`, 0,028 ms (chỉ chạy khi trượt cache Redis 300 s).
- Lưu giá → cập nhật khoản kế tiếp: một câu UPDATE, Seq Scan `membership_fees` 13,4k dòng 920 ms — chạy **một lần mỗi lần Admin lưu bảng giá**
  (không phải đường đọc / danh sách), cần đổi gần như mọi dòng nên index không giúp; không phải query trong vòng lặp.

## Grep hằng số giá

`grep -rnE "1_200_000|3_600_000|15_000_000|7_500_000|1200000|3600000|15000000|7500000|200_000|500_000" apps/*/src packages/shared/src`
(trừ `*.spec.*`, `fixtures/price-defaults.ts`, test) chỉ còn `7 * 3_600_000` (lệch múi giờ VN, không phải giá).
`LEGACY_ANNUAL_FEE` (600.000) chỉ còn cho kỳ lịch sử / dữ liệu demo và số dựng màn Báo cáo MSW (prototype `FEE=600000`).

## Soát luật cứng

1. File trong trần (lớn nhất trong phạm vi: repository 92, service 96, tab Admin 89 dòng). 2. Không `any`; mọi body / response qua zod shared.
3. depcheck sạch; `usePrices` đặt ở `src/lib` để feature không import chéo. 4. `@RequireAdmin('settings.general')` (permission key).
5. Đọc theo PK; không query trong vòng lặp. 6. Không đụng chat. 7. Không máy trạng thái mới; ghi giá khoá `FOR UPDATE` + kiểm `version`.
8. Không hiệu ứng phụ ngoài transaction (giá + lịch sử + khoản kế tiếp + audit cùng một transaction; xoá cache sau commit).
9. Tiền VND nguyên (CHECK DB + zod `int`). 10. Audit `pricing.update` (tag `pricing` mới, nhãn "Bảng giá"). 11. Không dịch vụ ngoài.
12. Không env mới. 13. Test ở file riêng. 14. Commit theo đường dẫn.

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token).
- Migration 703 đã áp `opchub_dev` + `opchub_test`; seed bắt buộc tạo dòng giá khi thiếu, không ghi đè giá Admin đã sửa.
- Quyết định mơ hồ ghi `ui-parity/questions.md` Q-V42-703-1 → 4 (khoản chưa thu theo giá mới; lịch sử qua Nhật ký; % Gọi vốn giữ ở
  chính sách Affiliate; tên bảng).
- Đối soát "đúng bằng giá" (D-104) ở V42-704; VietQR (705); doanh thu Admin › Phí theo gói (708).
