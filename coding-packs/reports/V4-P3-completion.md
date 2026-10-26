# V4-P3 — Domain mới — completion

- TIP của pha: V4-608, V4-609, V4-613, V4-611. Cả bốn đủ completion + SHA + PR (xem `V4-progress.md`).
- PR xếp chồng, chưa merge: #25 (608) → #26 (609) → #27 (613) → #28 (611).
- HEAD đo pha: nhánh `feature/TIP-V4-611-onboarding-8-steps`, SHA `730b3a13`. Lỗi lan sửa ở `17ef8ac5`, trên nhánh kế `feature/TIP-V4-612-moderation-violations`.

## Chạy toàn bộ một lần (số thật, 26/10/2026)

| Bộ | Kết quả | Thời gian |
|---|---|---|
| `pnpm test:int` (turbo, concurrency 1) | server 138 file / **1348/1348**; db 16 file / 49 + 2 (migration V4-612) = **51/51**; 0 failed | ≈ 15 phút |
| `pnpm e2e` (Playwright `--project=behavior`, build MSW, seed lại trước) | 302 test: **297 passed · 1 failed · 4 skipped** | 13,1 phút |

- Admin chạy ở cổng 3011 (`ADMIN_PORT=3011`) vì cổng 3001 đang bị sidecar của dự án khác chiếm. Không tắt tiến trình đó.
- 4 skip là `tax-lookup-dlpl.spec.ts` (stub DLPL theo cờ + `@live`), có từ trước V4.
- Không dùng retries, fixme, hay nới timeout/assertion.

## Lỗi lan và cách sửa

- `mobile-acceptance.spec.ts:42` UAT-31 Admin Members @390 mong 8 ô / thẻ, nhưng nhận 9 ô. Nguyên nhân là cột "Khởi đầu" (D-76, V4-611) thêm một ô hợp lệ vào mỗi dòng.
- Sửa ở `17ef8ac5`: kỳ vọng thành 9 ô, ghi rõ danh sách ô. Các assertion khác giữ nguyên: ô nằm trong thẻ, thẻ xuống dòng, ≤ 390px, chọn được, quay lại grid ở 1440.
- Chạy lại `mobile-acceptance` + `admin-members`: đạt (nằm trong 43/43 của V4-612).

## Cổng kiểm pha P3 (02-TASK-GRAPH)

**1. Gian hàng tự tạo khi DN đóng phí — Đạt (V4-608)**
- Chi tiết test ở `TIP-V4-608-completion.md`. Các test đó nằm trong lần chạy toàn bộ test:int ở trên, đều xanh.
- e2e `stores.spec.ts` xanh trong lần chạy toàn bộ.

**2. Nhu cầu + gợi ý — Đạt (V4-609)**
- Chi tiết ở `TIP-V4-609-completion.md`.
- test:int toàn bộ xanh; e2e `needs.spec.ts` xanh.

**3. Onboarding 8 bước tính từ dữ liệu thật, cột x/8 không N+1 — Đạt (V4-611)**
- Snapshot lô một truy vấn, EXPLAIN 20k: 0,13–2,22 ms.
- int `onboarding` (5 test) + e2e `onboarding.spec.ts`.

**4. Parity ≤ 3% các màn Gian hàng / Nhu cầu / Khởi đầu / Trợ lý — Đạt, hoặc có DV chờ duyệt**
- Màn đạt:
  - Gian hàng: 11/14.
  - Nhu cầu: 7/7.
  - Khởi đầu: P-119 0,00 / 0,35.
  - Trợ lý: P-99 0,60, DRAWER 2,82, P-14 2,74.
- `unreachable` (lý do ở từng completion): P-110, P-116, P-117/118, P-120.
- Có DV chờ duyệt:
  - DV-V4-608-1..3;
  - DV-V4-611-1..4: D-96/97 3,69 / 5,43% (thứ tự dòng); D-07→D-17 @390 (6 ô lọc chưa làm, Q-V4-611-6); P-01 (giữ khối LIVE, Q-V4-611-1).
- Không mask, không nới ngưỡng.

**5. Migration chạy sạch trên DB native — Đạt**
- Migration P3 (`v4_local_stores`, `v4_local_needs`, `v4_onboarding`) đã `migrate deploy` trên `opchub_test` và `opchub_dev`.
- db int 51/51.

## Mang sang P4

- Owner duyệt DV-V4-608 / 611 và Q-V4-608 / 609 / 611 / 613.
- 6 ô lọc Admin › Thành viên (Q-V4-611-6).
- Nhóm ngành + dải NQ86 (Q-V4-603-4) vẫn chưa có D-xx.

Native HOLD: đã seed lại demo trên `opchub_dev` trước khi chạy e2e. Giữ nguyên dữ liệu và tiến trình dev.
