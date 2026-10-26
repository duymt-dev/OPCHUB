# TIP-V4-621 — Admin Tổng quan "Luồng hệ thống" theo prototype v4 (D-89) — completion

- Nhánh `feature/TIP-V4-621-overview-flow`, xếp chồng trên `feature/TIP-V4-620-projects-v4` (chưa merge).
- PR: base `feature/TIP-V4-620-projects-v4` — **chưa tạo được**: `gh` chưa đăng nhập. Nhánh đã push; cần owner chạy `gh auth login` (hoặc tạo PR trên web).
- Commit:
  - `8ce626a6` API `GET /admin/overview` thêm `flow`, `paid`, `events.upcoming` (repository mới, index `membership_fees_paid_at`, test int);
  - `edaca419` Admin: khối Luồng hệ thống, 4 thẻ số v4, biểu đồ theo thành viên đã kích hoạt phí, lưới 2 cột ở 390; e2e; parity;
  - commit báo cáo này — SHA ở `git log`.
- REQ / D: D-89, Q-V4-615-4 (đã làm); DV-V4-615-6 (đã sửa); giữ DV-V2-307-4 (mask biểu đồ số thật), S-03.

## Đã làm

1. **API**: `flow` = { phí hiệu lực / tổng thành viên, gian hàng published / hidden / draft, nhu cầu open / closed, dự án chờ / hiển thị, số nhóm } — `count` / `groupBy status` mỗi bảng, chạy song song; `paid` = { đang hiệu lực, đóng phí từ đầu tháng VN, % }; `events` thêm `upcoming` (value = tổng sự kiện). Cache 60 giây như cũ.
2. **Admin**: "Luồng hệ thống — Số liệu trực tiếp từ các module" (5 thẻ là link, nhãn Hoàn tất / Cần làm), thẻ số Thành viên · Cộng đồng · Thành viên mới (Tháng MM/YYYY) · Sự kiện (n sắp diễn ra), biểu đồ "4.218 · +12% · +452 thành viên tháng này" lấy từ `paid`.
3. **MSW**: số prototype v4 (20.000 / 120 / 2.165 / 12·4 / 4.218·452); Luồng hệ thống đếm từ CSDL giả (phí, gian hàng, nhu cầu, dự án, 90 nhóm).

## Parity (MSW, ngưỡng 3%, mask biểu đồ cũ, không mask thêm)

| Màn | 1440 | 390 |
|---|---|---|
| D-01 Tổng quan | 0,16% | 0,31% |
| D-02 menu người dùng | 0,16% | 0,31% |
| D-03 Hồ sơ cá nhân (không đổi màn) | 1,86% | 1,21% |
| D-04 thông báo | 1,12% | 1,53% |
| D-05 sidebar thu gọn | 1,96% | — |
| D-06 drawer điều hướng | — | 0,06% |
| D-81 xem thử vai trò Kế toán | 0,16% | 0,31% |

## Test (số thật)

- `pnpm turbo run lint typecheck test` (server, shared, portal, admin, ui, db): 17 / 17 task thành công.
- `pnpm depcheck`: 0 vi phạm (858 module, 3868 phụ thuộc). `prisma validate`: hợp lệ.
- Build MSW Admin: thành công.
- Int `apps/server test:int test/reporting test/contract test/gates`: 30 file / 70 test pass (có test mới D-89 Luồng hệ thống). `packages/db test:int`: 16 file / 51 test pass (migration mới áp vào `opchub_test`).
- e2e behavior MSW `admin-overview` (mới), `realtime-metrics`, `a-01-login`, `admin-rbac`, `admin-shell`: 24 / 24 pass.
- Parity `D-01,D-02,D-03,D-04,D-05,D-06,D-81`: 12 / 12 đạt.
- Toàn bộ `test:int`, toàn bộ e2e MSW, e2e:server: để TIP-V4-624.

## Chưa làm / ghi chú

- PR chưa tạo (gh chưa đăng nhập).
- Migration `20261027140000_v4_overview_paid` chưa áp vào `opchub_dev` (HOLD) — áp ở TIP-V4-624.
- "1 / 8" prototype vs "6 / 8" MSW — số thật từ dữ liệu phí (Q-V4-621-1). Nghĩa số 4.218 của biểu đồ chờ owner xác nhận (Q-V4-621-2).
