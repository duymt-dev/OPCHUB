# TIP-V4-614 — Admin › Báo cáo B1 / B2 / B3 — completion

- Nhánh: `feature/TIP-V4-614-report-export-b123`, xếp chồng trên `feature/TIP-V4-612-moderation-violations` (PR #29 chưa merge)
- PR: [#30](https://github.com/duymt-dev/OPCHUB/pull/30) (base `feature/TIP-V4-612-moderation-violations`)
- Commit:
  - `89494aba` TIP
  - `db3120c0` shared (khuôn CSV, quyền `reports.view`, schema API, mock) + db (migration quyền, index báo cáo, test seed 53 dòng quyền)
  - `45f782ca` server: `ReportMetricsRepository`, `ReportExportService`, `ReportsController`, registry `ExportBuilders`, int + contract
  - `85e440ce` Admin UI `/reports` + MSW + icon `reports`
  - `97cc2ad5` e2e + parity D-01 + D-99 unreachable + DV/Q + EXPLAIN
- REQ / D: REQ-516 · D-78 · §27.9 T15

## Đã làm

- **Quyền**: menu `reports` + khoá `reports.view` (28 khoá / 13 menu). Mặc định Quản trị viên + Kế toán.
  - Migration `20261026200000_v4_report_permissions` gán quyền cho vai trò hệ thống, `ON CONFLICT DO NOTHING`, không đụng vai trò tự tạo.
- **Khuôn CSV** (`@opchub/shared/reports`, dùng chung worker + MSW):
  - BOM, mọi ô trong ngoặc kép, dòng `\n`, dòng rỗng giữa khối.
  - B1 4 cột / 17 dòng, B2 5 cột, B3 7 cột.
  - Unit test so **byte** với `docs/spec/mau-bao-cao/*.csv` khi chưa có số liệu.
- **Số liệu** (`report-metrics.repository.ts`), chỉ đọc, không bảng mới:
  - Thành viên phạm vi = `group_members.status = 'member'`, đếm distinct.
  - Phí theo `membership_fee_periods.created_at`; hoa hồng theo `commissions.month_key` (≠ `cancelled`).
  - Gói Gọi vốn theo `project_fundraisings.paid_at`; sự kiện theo `starts_at`; chủ đề = phòng không mặc định tạo trong tháng.
  - Tin nhắn B2 = tin thành viên (không mô phỏng, chưa xoá).
  - Mỗi chỉ số một truy vấn cho cả phạm vi. `perGroup` / `perProvince` gom một lượt, không lặp theo tỉnh / nhóm.
- **API**:
  - `GET /admin/reports/scopes`, `GET /admin/reports/preview`, `POST /admin/reports/export` (202).
  - Tháng tương lai hoặc sai định dạng → 400; phạm vi không có nhóm → 404.
  - Xuất: `export_jobs(kind=report)` + outbox `export.requested` + audit `report.export` (tag `report`, "xuất B2 tháng 10/2026 · Hà Nội") cùng transaction.
  - `GET /admin/exports/:id` nhận thêm `reports.view`. Link ký 1 giờ, tên tải `Bao-cao-B1-2026-09-OPC-Ha-Noi.csv`.
  - Module export gọi builder qua registry `ExportBuilders` (đăng ký ở `onModuleInit`), không phụ thuộc ngược vào reporting.
- **Index** (`20261026210000_v4_report_indexes`):
  - `membership_fee_periods (created_at) INCLUDE (user_id, amount)`;
  - `group_members (group_id, created_at) INCLUDE (user_id) WHERE status = 'member'`.
- **Admin `/reports`**:
  - Segmented "B1 · Nhóm ngành / B2 · Tỉnh / B3 · Vùng"; tháng (12 tháng gần nhất, mặc định tháng trước); phạm vi theo mẫu (có tìm).
  - 4 thẻ số liệu; bảng chỉ số đầy đủ (ô chưa có nguồn hiện "—" + tooltip).
  - Bảng Nhóm ngành (B2); bảng KPI theo tỉnh + Tổng vùng (B3).
  - "Xuất CSV" dùng `useExportJob` (thêm tham số tên file), toast "Đã xuất {file}".
  - Mục sidebar cuối nhóm DOANH THU & ĐỐI TÁC. Không có quyền → ẩn mục, URL ra màn 403.
- **MSW**: số liệu tất định từ kho nhóm mock; job `report` → CSV cùng khuôn; link tải mang tên file.

## Câu hỏi đã chọn phương án an toàn

Q-V4-614-1..6 ở `ui-parity/questions.md`:

- Q-1: không có màn prototype, dựng theo khung Admin chung.
- Q-2: chỉ số chưa có nguồn để trống, không bịa.
- Q-3: giữ dòng "Hạn nộp".
- Q-4: B3 chỉ báo cáo theo tháng.
- Q-5: Coffee Chat = Sự kiện ngành.
- Q-6: phí tính cho mỗi tỉnh mà thành viên tham gia.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi |
| typecheck | sạch (toàn repo) |
| unit | server 225 · shared 395 · portal 397 · admin 453 · ui 48 · integrations 86 (+2 skip) |
| depcheck | sạch |
| build | server; admin (MSW, `NEXT_PUBLIC_PORTAL_URL=http://localhost:3020`) |
| test:int phạm vi | reporting, export, contract (coverage **237**), gates, common (outbox-consumers, sync-export-audit, guards), moderation: **36 file / 106/106** |
| db | toàn bộ **51/51** (seed demo: 53 dòng quyền = 26 + 7 + 12 + 8) |
| e2e behavior | reports 5/5, admin-rbac, admin-shell, a-01-login: **24/24** (lần đầu 22/24: 2 test chọn mục AntD Select qua listbox ẩn — sửa bộ chọn theo danh sách thả xuống đang hiện, không nới assertion/timeout) |

Acceptance:

- **B1** (int):
  - 3 thành viên vào nhóm trong tháng + 2 sự kiện trong kỳ (một lúc 23:30 31/03 giờ VN), sự kiện 00:30 01/04 bị loại.
  - CSV 17 dòng; "Thành viên mới" = 3, "Sự kiện ngành" = 2, đúng "Tên nhóm ngành" và "Trưởng nhóm".
  - Audit + outbox cùng transaction; tên file tải đúng.
- **B2** (int):
  - Phí 1.200.000 + 3.600.000 = **4800000**; khối C một dòng / nhóm.
  - Trưởng đại diện / Giám đốc Vùng trống.
  - Phí của tỉnh khác không bị tính.
- **B3** (int + MSW unit): mỗi tỉnh một dòng; Tổng vùng = tổng các dòng; Top 3 theo doanh thu.
- **403 / 400 / 404**:
  - Thiếu `reports.view` → 403 (int + MSW + e2e Giảng viên).
  - Tháng tương lai, `2001-13`, thiếu phạm vi, vùng sai → 400.
  - Nhóm không tồn tại → 404, không tạo job.
- **Route kiểm duyệt** `GET /admin/reports` vẫn 200.

## EXPLAIN ANALYZE (`TIP-V4-614-explain.txt`)

- Dữ liệu dựng trong transaction rồi rollback trên `opchub_test`: 34 nhóm thêm, 10.000 thành viên, 12.000 `group_members`, 8.000 kỳ phí, 30.000 tin.
- Phạm vi B3 có 49 nhóm.

| Truy vấn | Trước index | Sau index |
|---|---|---|
| totals | 22,4 ms | 19,6 ms — kỳ phí: Bitmap Index Scan `membership_fee_periods_created_report` |
| perGroup | 17,6 ms | 17,3 ms — `group_members_group_id_status_group_role_idx`, `messages_room_id_created_at_id_idx` |
| perProvince | 166 ms | 14,9 ms — `group_members_report` + kỳ phí theo tháng; viết lại `GROUP BY` một lượt thay `DISTINCT` + window |

- Seq Scan còn lại ở bảng nhỏ (`groups`, `rooms`, `events`, `membership_fees`, `commissions`, `project_fundraisings`), dưới 100 dòng trên DB test.
- `group_members` ở totals: phạm vi gồm 49/68 nhóm (≈ 85% bảng), planner chọn quét là hợp lý.

## Parity

- D-99 Admin › Báo cáo: **unreachable** (DV-V4-614-1). Prototype v4 không có menu (`AG` không có `reports`, §27.9 T15); `aReports` thuộc cây mạng lưới đã gỡ.
- D-01 (shell, thêm mục sidebar) đo lại tại `85e440ce`: **35,18 / 4,15%** (trước 35,50 / 4,15%, DV-V4-606 nội dung Tổng quan) → DV-V4-614-2. Không mask thêm, không nới ngưỡng.

## Chưa làm / ngoài phạm vi

- Kế hoạch tháng, nộp / duyệt báo cáo, vai trò vùng / tỉnh (D-78).
- Báo cáo quý (Q-V4-614-4).
- Chỉ số chưa có nguồn: hợp đồng, tài trợ, đối tác, đào tạo, nguồn doanh thu khác.
- Test:int và e2e toàn bộ chạy ở cuối pha P4 (`V4-P4-completion.md`).
