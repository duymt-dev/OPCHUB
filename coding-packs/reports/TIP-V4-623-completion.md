# TIP-V4-623 — Affiliate + các màn 3–5% còn lại theo prototype v4 (D-89) — completion

- Nhánh `feature/TIP-V4-623-affiliate-rest`, xếp chồng trên `feature/TIP-V4-622-settings-bots-events` (chưa merge).
- PR: base `feature/TIP-V4-622-settings-bots-events`. **Chưa tạo được** vì `gh` chưa đăng nhập. Nhánh đã push; payload REST soạn sẵn ở `.v4tmp/pr/623.json` (ngoài repo).
- Commit:
  - `7d8e72af` Thành viên: thanh lọc v4 7 ô (Nhóm, Vai trò, Phí, Trạng thái, Hồ sơ, Ngày đăng ký, Khởi đầu), lọc ở server + MSW, có test int + e2e;
  - `276a499f` Gian hàng Admin theo thứ tự tạo (migration `20261027160000_v4_admin_stores_created`, seed, MSW, test int);
  - `8bcf79bc` Portal form tư vấn: khoảng cách khối Liên hệ / Nhu cầu;
  - `3276be3e` Affiliate: bảng khách hàng 390 line-height tự nhiên, số TK nhóm 4 chữ số, ngày chi trả d/m/yyyy;
  - `4aa1a2b6` Đổi mật khẩu lần đầu: hộp thoại nổi trên màn đăng nhập (form phía sau `inert`), route `/first-password` giữ phiên hạn chế SEC-R01;
  - commit báo cáo này — SHA ở `git log`.
- REQ / D: D-89, REQ-312, SEC-R01, AT-SEC01, Q-V4-611-6 (đã làm); giữ Q-B62-18, D-31, D-47, D-71, D-56, AF-R01, SRS §20.6.

## Parity (MSW, ngưỡng 3%, không mask thêm) — toàn bộ một lượt

`playwright --project=parity` toàn bộ: **413 pass / 31 fail / 76 skip** (11,1 phút). 3 màn fail khi chạy chung đã đo lại riêng và đều đạt: P-30 @390 0,54%, D-35 @390 0,24%, D-74 @1440 0,70%.

| Màn | 1440 | 390 | Trước TIP |
|---|---|---|---|
| D-83 Đổi mật khẩu lần đầu | **1,78%** | — | 12,14% |
| D-85-CUS Khách hàng đại lý | 1,71% | **5,50%** (Q-V4-623-3) | 10,91% @390 |
| D-08 / D-09 / D-17 Thành viên | 2,83 / 0,99 / 0,45% | 2,71 / 2,62 / 1,14% | đến 17,78% @390 |
| D-93 / D-94 / D-95 Gian hàng | 0,28 / 0,02 / 0,07% | 2,87 / 0,02 / 0,09% | > 3% |
| P-79 → P-83 Tư vấn | 0,02 – 0,56% | 0,00 – 0,50% | > 3% |
| D-07, D-10 → D-14, D-82, D-89, D-96, D-97 | 1,46 – 3,73% | 0,93 – 5,33% | chỉ lệch thứ tự dòng (Q-B62-18, Q-V4-623-1) |
| D-84-AFF / D-84-POL | 24,12 / 2,01% | 29,36 / 13,48% | AF-R01 / §20.6 |
| P-104 / P-105 / P-40 / P-05 | 0,63 / 3,64 / 1,45 / 4,52% | 15,94 / 0,82 / 4,31 / 4,71% | D-31 / Q-V4-623-2 / D-71+D-56 / D-47 |

Màn còn > 3% (30 ảnh của lượt đo toàn bộ, trừ 3 ảnh do chạy chồng): tất cả có lý do ghi trong `deviations.md` (mục V4-623 và các mục V4-622 / V4-620).

## Test (số thật)

- `pnpm turbo run lint typecheck test` (shared, admin, ui, server, db, portal): 17 / 17 task thành công.
- `pnpm depcheck`: 0 vi phạm (860 module, 3875 phụ thuộc).
- Unit Affiliate Admin: 26 file / 121 test pass.
- Int `apps/server test:int`:
  - `test/account test/local-business test/stores`: 13 file / 100 test pass;
  - `test/affiliate test/gates test/contract`: 49 file / 112 test pass.
- e2e behavior MSW (Thành viên, RBAC, Gian hàng, Affiliate, phí, tư vấn): 85 test. Lần đầu 84 pass, 1 fail ở `affiliate-cross-app`: assertion chờ "BIDV · 715917091871" nhưng Admin nay nhóm số TK. Đã sửa assertion thành "7159 1709 1871" (đúng hiển thị mới, không nới); chạy lại pass.
- Build MSW Admin + Portal: thành công.
- Toàn bộ `test:int`, toàn bộ e2e MSW, e2e:server: để TIP-V4-624.

## Chưa làm / ghi chú

- PR 617 → 623 chưa tạo (gh chưa đăng nhập). Owner chạy `GH_TOKEN=<token> bash /d/CODING/OPCHUB/.v4tmp/pr/create-prs.sh`.
- Migration `20261027160000_v4_admin_stores_created` chưa áp vào `opchub_dev` (HOLD); áp ở TIP-V4-624.
- Chờ owner:
  - Q-V4-623-1: thứ tự dòng Thành viên;
  - Q-V4-623-2: tim / lượt xem / Nổi bật gian hàng;
  - Q-V4-623-3: tiêu đề chồng chữ;
  - Q-V4-622-2 / -3: D-50, D-47.
