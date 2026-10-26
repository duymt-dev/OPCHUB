# V4-P4 — Kiểm duyệt + Báo cáo — completion

- TIP của pha: V4-612, V4-614. Cả hai có completion + SHA + PR (xem `V4-progress.md`).
- PR xếp chồng, chưa merge: #29 (612) → #30 (614).
- HEAD đo pha: nhánh `feature/TIP-V4-614-report-export-b123`, SHA `b5d17301`.

## Chạy toàn bộ một lần (số thật, 26/10/2026)

| Bộ | Kết quả | Thời gian |
|---|---|---|
| `pnpm test:int` (turbo, concurrency 1) | server 141 file / **1386/1386**; db 16 file / **51/51**; 0 failed | ≈ 18 phút |
| `pnpm e2e` (Playwright `--project=behavior`, build MSW portal + admin, cổng 3020/3021) | 309 test: **305 passed · 0 failed (assertion) · 4 skipped** | 13,2 + 2,4 phút |

### e2e: hai lần chạy, ghi trung thực

1. **Lần 1** (`p4-e2e-run1.log`): 206 passed, 99 failed, 4 skipped.
   - Cả 99 lỗi đều xảy ra khi khởi động trình duyệt, trước khi vào test:
     - 96 lỗi `browserType.launch: Target page, context or browser has been closed`;
     - 3 lỗi `Target crashed`.
   - Không có lỗi assertion nào.
2. **Chẩn đoán**: chạy lại `--last-failed` khi máy rảnh vẫn ra 99 lỗi như cũ.
   - Log Chromium báo `Invalid file descriptor to ICU data received`.
   - Thư mục `ms-playwright/chromium_headless_shell-1248` chỉ còn `chrome-headless-shell.exe` + `vk_swiftshader.dll`. Đã mất `icudtl.dat`, `*.pak`, `locales`, … (thư mục đổi lúc 17:25, giữa lần chạy).
   - Nguyên nhân thuộc môi trường máy, không thuộc code.
3. **Khắc phục**: `npx playwright install chromium-headless-shell`, cùng bản 1.64.1 / build 1248, không đổi phiên bản.
4. **Lần 2** (`--last-failed`, 99 test vừa lỗi): **99 passed**, 0 failed.

Không dùng retries / fixme, không nới timeout hay assertion. 4 skip là `tax-lookup-dlpl.spec.ts` (stub DLPL theo cờ + `@live`), có từ trước V4.

## Lỗi lan và cách sửa

- Không có lỗi lan trong lần chạy toàn bộ.
- Những chỗ đếm thay đổi do V4-614 đã sửa ngay trong TIP, đều theo số mới hợp lệ, không nới:
  - sidebar Admin 12 → 13 mục: `admin-rbac`, `admin-shell`, `nav-model.spec`;
  - menu Kế toán thêm "Báo cáo": `permission-model.spec`;
  - seed demo 51 → 53 dòng quyền: `seed-demo.int.spec`;
  - contract coverage 234 → 237.

## Cổng kiểm pha P4 (02-TASK-GRAPH)

**1. §26.6 đủ 4 luật, có test integration — Đạt (V4-612)**

| Luật | Test integration |
|---|---|
| Tự ẩn | `test/moderation/violations*` |
| Khoá N ngày | `AccountLockService`, `setStatusTx` |
| Khôi phục | thu hồi vi phạm, mở khoá tự động khi < 2 |
| Tự mở | `AccountLockProcessor` quét 5 phút + kiểm khi login / refresh / TOTP |

- Tất cả nằm trong 1386/1386 ở trên.
- e2e `moderation.spec.ts` xanh.

**2. CSV B1/B2/B3 đúng cột mẫu — Đạt (V4-614)**

- Unit `templates.spec` so byte với `docs/spec/mau-bao-cao/*.csv`: B1 4 cột / 17 dòng, B2 5 cột, B3 7 cột.
- Int `reporting/report-export` (6 test) kiểm số liệu, khuôn, audit, 403 / 400 / 404.
- e2e `reports.spec.ts` (5 test) tải file thật: BOM, 17 dòng, tên không dấu.

**3. Cổng chung — Đạt**

- lint 0 lỗi, typecheck sạch, depcheck sạch.
- Unit: server 225 · shared 395 · portal 397 · admin 453 · ui 48 · integrations 86 (+2 skip).
- build: server, portal, admin (MSW).
- Migration chạy sạch trên `opchub_dev` + `opchub_test`:
  - `20261026150000_v4_moderation_violations`;
  - `20261026200000_v4_report_permissions`;
  - `20261026210000_v4_report_indexes`.

**4. Parity ≤ 3% cho mọi màn TIP đụng tới — Đạt, hoặc có DV chờ duyệt**

- V4-612:
  - Đạt: D-33 0,24 / 0,45, D-34 0,08 / 0,22, D-35 0,24 / 0,35, D-98 0,24 / 0,37, P-44.
  - DV-V4-612-1: P-45 / P-121 @390 ở mức 6,47%. Lỗi cuộn chat có từ trước V4-612, ghi Q-V4-612-3.
  - A-33 unreachable (DV-V4-612-2).
- V4-614:
  - D-99 unreachable (DV-V4-614-1): prototype v4 không có menu Báo cáo.
  - D-01 35,18 / 4,15%, trước TIP là 35,50 / 4,15% (DV-V4-614-2). Nội dung Tổng quan v4 sẽ đo lại ở V4-615.

**5. EXPLAIN ANALYZE**

- V4-612: 20k users / 60k vi phạm, ≤ 0,33 ms, dùng partial index.
- V4-614: 10k thành viên, totals 19,6 ms · perGroup 17,3 ms · perProvince 14,9 ms (trước index mới 166 ms). Chi tiết ở `TIP-V4-614-explain.txt`.

## Chờ owner

- Duyệt DV-V4-612-1..2, DV-V4-614-1..2.
- Q-V4-612-1..4, Q-V4-614-1..6.
- Merge chuỗi PR #17 → #30.
