# V4-P2 — Tiền + khai báo — completion

- TIP của pha: V4-602, V4-607, V4-610. Cả ba đủ completion + SHA + PR (xem `V4-progress.md`).
- PR xếp chồng, chưa merge: #22 (base #21) → #23 → #24.
- HEAD đo pha: nhánh `feature/TIP-V4-610-fundraising-plan`, SHA `c941a27b`.

## Chạy toàn bộ một lần (số thật, 24/10/2026)

| Bộ | Kết quả | Thời gian |
|---|---|---|
| `pnpm test:int` (turbo, concurrency 1) | db 11 file / 38 test passed; server 133 file / 1282 test passed; 0 failed | 14 phút 15 s |
| `pnpm e2e` (Playwright `--project=behavior`, build MSW, seed lại trước khi chạy) | 289 passed · 4 skipped · 0 failed | 13,0 phút |

- So với P1 (283 passed): thêm `fundraising.spec.ts` (2), ca khai báo V4-607 và ca V4-602. Không ca nào bị bỏ.
- 4 skip là `tax-lookup-dlpl.spec.ts` (stub DLPL theo cờ + `@live`), có từ trước V4.
- Không dùng retries, fixme, hay nới timeout/assertion.

## Cổng kiểm pha P2 (02-TASK-GRAPH)

**1. Đối soát kỳ cũ 600.000 và kỳ gói mới đều khớp — Đạt**
- Test int membership-fee (reconcile kỳ cũ D-69 + gói Cá nhân/DN D-68) xanh trong lần chạy toàn bộ.
- Mã TV và GV đi chung một adapter `extractPaymentCode`, mỗi giao dịch chỉ nhận đúng một mã.

**2. Hoa hồng = % × phí thực trả — Đạt (V4-602)**
- `commissions.list_amount` = phí kỳ thực trả.
- Grep `600000` trong `apps/*/src`, `packages/*/src` (trừ migration/test) = 0. Các kết quả còn lại chỉ là `3_600_000` (ms một giờ).

**3. Gọi vốn: mua → duyệt → hoa hồng 10% → hết hạn — Đạt (V4-610)**
- `test/project/fundraising.int.spec.ts`:
  - mã GV;
  - đối soát thiếu hoặc đủ tiền;
  - duyệt → active 6 tháng + audit + tab;
  - từ chối;
  - hoa hồng D-70 không trùng.
- `fundraising-scheduler.int.spec.ts`: nhắc T-14 và hết hạn.
- e2e `fundraising.spec.ts` chạy đủ luồng Portal → Admin.

**4. Migration chạy sạch trên DB native — Đạt**
- 3 migration P2 (`v4_commission_*`, `v4_declaration`, `v4_fundraising`) đã `migrate deploy` trên `opchub_test` và `opchub_dev`.
- Test migration xanh (38 test db).

**5. Parity ≤ 3% các màn TIP đụng tới — Đạt, hoặc có DV**
- Các DV: DV-V4-602-1..3, DV-V4-607-1..2, DV-V4-610-1..4.
- P-69 → P-72 ở trạng thái `unreachable` do lỗi lồng thẻ của prototype (Q-V4-610-6).
- Không dùng mask, không nới ngưỡng.

## Lỗi lan

Không có. test:int và e2e behavior chạy toàn bộ đều 0 failed.

## Mang sang P3

- Giá gia hạn Gói Gọi vốn: Q-V4-610-3, chờ owner.
- Màn auth v4: DV-V4-607-1, xử lý ở V4-615.
- P-104 @390: DV-V4-610-4.

Native HOLD: đã seed lại demo trên `opchub_dev` trước khi chạy e2e (`seed` + `seed:demo`).
