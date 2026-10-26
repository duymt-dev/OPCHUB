# TIP-V4-614: Admin › Báo cáo — xuất CSV theo mẫu B1 / B2 / B3 (tháng)

## HEADER
- TIP-ID: TIP-V4-614
- Project: OPCHUB
- Module: shared (permissions, api-domains/reports, export) · server (`reporting` + `export`) · admin (features/reports mới, shell nav) · db (migration quyền) · e2e
- Priority: P2 (REQ-516)
- Depends on: V4-606 (menu §27.3), V4-609 (Nhu cầu); xếp chồng V4-612 (PR #29 chưa merge)
- Estimated: M
- REQ / D: REQ-516 · D-78 · §27.9 T15 · blueprint §2.10
- **Files touched:**
  - `packages/shared/src/permissions.ts` (modify): menu `reports` + khoá `reports.view` (28 khoá / 13 menu), `DEFAULT_ADMIN_ROLE_PERMISSIONS` (admin, accountant); `permissions.spec.ts`.
  - `packages/shared/src/api-domains/reports.ts` (create): `REPORT_TEMPLATES = ['b1','b2','b3']`, `reportQuerySchema { template, month: 'YYYY-MM', groupId?, province?, region? }`, `reportPreviewSchema`, `reportExportResponseSchema`.
  - `packages/shared/src/api-domains/export.ts` (modify): `EXPORT_KINDS` + `report`; `exportParamsSchema` nhánh `{ kind: 'report', template, month, groupId?, province?, region? }`.
  - `packages/shared/src/api-domains/settings-admin.ts` (modify): `AUDIT_TAGS` + `report`.
  - `packages/shared/src/mock-data/domains/reports.ts` (create): tổng hợp từ kho mock cùng công thức.
  - `packages/db/prisma/migrations/20261026200000_v4_report_permissions/` (create): gán `reports.view` cho vai trò hệ thống `admin`, `accountant` (không đụng vai trò tự tạo).
  - `apps/server/src/modules/reporting/report-*.ts` (create): `report-metrics.repository.ts` (truy vấn tổng hợp theo lô), `report-templates.ts` (dựng dòng CSV đúng mẫu), `report-export.service.ts`, `reports.controller.ts`; `reporting.module.ts` (modify).
  - `apps/server/src/modules/export/export.service.ts` (modify, 3–5 dòng): `build()` gọi `ReportCsvBuilder` qua port (registry) cho `kind = 'report'`; `status()` trả đúng `kind`.
  - `apps/server/test/reporting/report-export.int.spec.ts` (create), contract + coverage + `coding-packs/plans/api-contract.md`, `test/gates/*` nếu đếm quyền.
  - `apps/admin/src/features/reports/**` (create): màn `/reports` (chọn mẫu, tháng, phạm vi, xem trước số liệu, "Xuất CSV"); `apps/admin/src/app/(admin)/reports/page.tsx`; `features/shell/nav.ts` (+ mục `reports`); `messages/vi/reports.json`, `messages/vi/common.json` (nav), `i18n/messages.ts`; MSW handler `mocks/handlers/reports.ts`; `packages/ui/src/icons/paths.ts` (+ icon `reports`, path prototype).
  - `e2e/behavior/reports.spec.ts` (create); cập nhật `admin-rbac.spec.ts` (13 mục sidebar), `admin-shell` nếu đếm mục.
- **Parallel-safe with:** sequential — dùng chung `permissions.ts`, `export.service.ts`, `nav.ts`.

## CONTEXT
- D-78: giữ Admin › Báo cáo. Admin tự tổng hợp và **xuất CSV theo mẫu B1/B2/B3** (`docs/spec/mau-bao-cao/`) theo nhóm/tỉnh/vùng. **Không** có vai trò cấp vùng/tỉnh nộp báo cáo, không cây mạng lưới.
- §27.9 T15: màn "Báo cáo" của prototype v4 (`aReports`, 9480–9520) dựng trên cây mạng lưới (Giám đốc Vùng / Trưởng tỉnh / khoán KPI) đã gỡ ở §24 và **không có menu** trong prototype v4 (`AG` không có `reports`).
  - → Không có màn prototype để đo parity. Màn mới dựng theo khung Admin chung (thẻ số liệu + thanh lọc + bảng), như các màn Admin v4.
- Mẫu CSV: UTF-8 BOM, mọi ô trong ngoặc kép, dòng `\n`, dòng trống giữa các khối. B1 4 cột, B2 5 cột, B3 7 cột.
- Blueprint §2.10: không bảng mới. Tổng hợp từ bảng sẵn có, xuất qua job `export` hiện có (audit_logs, link ký 1 giờ NA-14).

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) · [backend/auth-rbac](../standards/backend/auth-rbac.md)
- [database/query-indexing](../standards/database/query-indexing.md)
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md) · [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md)
- [testing/testing](../standards/testing/testing.md)

## TASK
- Thêm quyền `reports.view` và mục sidebar "Báo cáo" (nhóm DOANH THU & ĐỐI TÁC).
- Màn Admin › Báo cáo: chọn mẫu (B1 nhóm / B2 tỉnh / B3 vùng), tháng, phạm vi. Xem trước các chỉ số "Thực hiện". "Xuất CSV" tạo job export, có audit, tải file đúng khuôn mẫu.

## SPECIFICATIONS
### Kỳ báo cáo
- `month = YYYY-MM` theo giờ Việt Nam: `[01/MM 00:00 +07, 01/MM+1 00:00 +07)`. Mặc định là tháng trước. Không cho chọn tháng tương lai (400).

### Chỉ số "Thực hiện" (cột "Kế hoạch" và "Ghi chú" để trống; không có hệ kế hoạch — D-78)
Phạm vi:
- **B1** = một nhóm (`groupId`).
- **B2** = một tỉnh (`province`): mọi nhóm `groups.province = P`.
- **B3** = một vùng (`region` north/central/south): mọi tỉnh của vùng.
- Thành viên của phạm vi = thành viên đang ở trong các nhóm của phạm vi (`group_members.status = 'member'`), đếm **distinct**.

| Chỉ số | Nguồn |
|---|---|
| Thành viên mới (B1, B3) | `group_members.created_at` trong tháng, distinct user |
| Thành viên mới đóng phí (B2) | `membership_fee_periods` có `created_at` trong tháng, user thuộc phạm vi, distinct |
| Tổng thành viên (B1, B3) | thành viên của phạm vi tại cuối tháng (`created_at < end`, còn `member`) |
| Thành viên hoạt động / Tổng thành viên hoạt động | thành viên của phạm vi có phí còn hiệu lực trong tháng (`membership_fees.valid_until > start`, `paid_at < end`) |
| Số Coffee Chat / Sự kiện | `events` có `starts_at` trong tháng, `group_id` thuộc phạm vi, chưa `cancelled` |
| Số chủ đề thảo luận (B1) | `rooms` của nhóm (không phải phòng mặc định) tạo trong tháng |
| Sự kiện ngành (B1) | = số sự kiện của nhóm trong tháng |
| Doanh thu phí thành viên (đ) (B2) / Phí thành viên (B3) | `sum(membership_fee_periods.amount)` tạo trong tháng, user thuộc phạm vi |
| Hoa hồng affiliate phát sinh (đ) (B2) | `sum(commissions.amount)` `month_key = YYYY-MM`, `status <> cancelled`, người được giới thiệu thuộc phạm vi |
| Tổng doanh thu (đ) (B2) | phí thành viên + Gói Gọi vốn (`project_fundraisings` `paid_at` trong tháng, chủ thuộc phạm vi) |
| Hợp đồng G2B/B2B, Tài trợ sự kiện, Kết nối đối tác, Cơ hội hợp tác, Đề xuất đào tạo, Chương trình cho tổ chức, Đào tạo & Ươm mầm, Công cụ & Giải pháp số, Hợp tác & Dự án, Sự kiện & Tài trợ | **chưa có dữ liệu** → để trống (Q-V4-614-2) |

### Khuôn CSV (giữ nguyên thứ tự dòng, số cột, nhãn của mẫu)
- **B1** (4 cột):
  - "Tỉnh/Thành" = tỉnh của nhóm; "Tháng/Năm" = `MM/YYYY`; "Tên nhóm ngành" = tên nhóm; "Trưởng nhóm" = chủ nhóm (`group_role = owner`).
  - Khối chỉ số: cột "Thực hiện" điền số.
- **B2** (5 cột):
  - "Tỉnh/Thành", "Tháng/Năm"; "Trưởng đại diện" / "Giám đốc Vùng" để trống (D-78: không vai trò cấp tỉnh/vùng).
  - Khối B: "Thực hiện" + "% đạt" để trống (không kế hoạch).
  - Khối C "NHÓM NGÀNH": **một dòng / nhóm** của tỉnh (Trưởng nhóm, Thành viên, Hoạt động trong tháng = số tin nhắn thành viên gửi trong tháng). Không có nhóm thì giữ 3 dòng trống như mẫu.
  - D–G: giữ nguyên, để trống.
- **B3** (7 cột):
  - "Vùng" = Miền Bắc / Trung / Nam; "Kỳ báo cáo" = `MM/YYYY`; "Giám đốc Vùng" để trống.
  - "BẢNG KPI THEO TỈNH": một dòng / tỉnh có nhóm (Thành viên mới, Tổng thành viên, Sự kiện, Hợp đồng = '', Doanh thu (đ) = phí thành viên, % đạt KPI = '') + dòng "Tổng vùng" cộng dồn.
  - "DOANH THU THEO NGUỒN": "Phí thành viên" Thực hiện = tổng phí; các nguồn khác để trống.
  - "Top 3 tỉnh" = 3 tỉnh doanh thu cao nhất (tên, cách nhau "; ").
  - "Tỉnh cần hỗ trợ" và "Đề xuất Trung tâm" để trống.
- Dòng "Hạn nộp …" của mẫu: **giữ nguyên** để đúng khuôn (Q-V4-614-3).
- Tiền: số nguyên VND, không định dạng (Excel tự hiểu). Dòng trống giữa khối = một dòng chỉ có ô rỗng đúng số cột (như mẫu).

### API
| Method | Path | Quyền | |
|---|---|---|---|
| GET | `/admin/reports/scopes` | `reports.view` | `{ groups: [{id,name,province}], provinces: [{name, region}], regions }` (nhóm chưa xoá) |
| GET | `/admin/reports/preview?template&month&groupId\|province\|region` | `reports.view` | `{ template, month, scope: {label}, metrics: [{key,label,value: number\|null}], rows?: [...] }` (B2: nhóm; B3: tỉnh) |
| POST | `/admin/reports/export` | `reports.view` | body như query → 202 `{ jobId, status: 'queued' }`; cùng transaction: `export_jobs(kind='report')` + outbox `export.requested` + audit `report.export` (tag `report`, summary "xuất B2 tháng 10/2026 · Hà Nội") |
| GET | `/admin/exports/:id` | (sẵn có) | thêm `reports.view` vào danh sách khoá được hỏi trạng thái (`ACTION_KEYS ∪ reports.view`) |

- Phạm vi không tồn tại (nhóm xoá, tỉnh không có nhóm, vùng sai) → 404 / 400.
- Tên file tải: `Bao-cao-B2-2026-10-Ha-Noi.csv` (không dấu).
- **Route**: `GET /admin/reports` đã dùng cho kiểm duyệt (ca báo cáo vi phạm). Màn mới dùng `/admin/reports/scopes|preview|export`, đều là đường tĩnh khai báo trước `reports/:id/action`. Không đổi hợp đồng kiểm duyệt.

### Admin UI (`/reports`)
- Tiêu đề "Báo cáo", phụ đề "Tổng hợp số liệu tháng và xuất CSV theo mẫu B1 / B2 / B3".
- Thanh lọc:
  - segmented "B1 · Nhóm ngành" / "B2 · Tỉnh" / "B3 · Vùng";
  - select Tháng (12 tháng gần nhất, mặc định tháng trước);
  - select phạm vi đổi theo mẫu: Nhóm / Tỉnh / Vùng;
  - nút "Xuất CSV".
- Thẻ số liệu: 4 thẻ đầu của mẫu (giá trị "Thực hiện"); bảng chỉ số đầy đủ (Chỉ số | Thực hiện). Ô không có dữ liệu hiện "—" kèm tooltip "Chưa có dữ liệu trên hệ thống".
- B2 / B3 có bảng con (Nhóm ngành / KPI theo tỉnh).
- Xuất: dùng `useExportJob` sẵn có (hỏi 1,5 giây, ≤ 60 giây), toast "Đã xuất {file}" / lỗi.
- Không có quyền → mục ẩn khỏi sidebar, URL trả màn 403 sẵn có.

## ACCEPTANCE CRITERIA
- Given nhóm G ở Hà Nội có 3 thành viên vào nhóm trong tháng 10/2026 và 2 sự kiện của G, When xuất B1 tháng 2026-10, Then CSV có đúng 17 dòng và 4 cột như mẫu; "Thành viên mới" = 3, "Sự kiện ngành" = 2, "Tên nhóm ngành" = tên G.
- Given tỉnh Hà Nội có 2 nhóm và phí 1.200.000 + 3.600.000 tạo trong tháng, When xuất B2, Then "Doanh thu phí thành viên (đ)" = 4800000; khối C có 2 dòng nhóm; Trưởng đại diện / Giám đốc Vùng trống.
- Given vùng Miền Bắc, When xuất B3, Then mỗi tỉnh có nhóm một dòng + "Tổng vùng" = tổng các dòng; "Top 3 tỉnh" theo doanh thu.
- Given Admin thiếu `reports.view`, Then API 403 và mục sidebar ẩn; khi có quyền thì audit `report.export` cùng transaction; file tải qua link ký và có audit `export.download`.
- Given tháng tương lai hoặc `month` sai định dạng → 400; nhóm không tồn tại → 404.
- Given 10k thành viên / 34 nhóm, Then preview B3 chạy một truy vấn tổng hợp / chỉ số (không lặp theo tỉnh), EXPLAIN không Seq Scan bảng lớn ngoài phạm vi tháng.

## PARITY
- Không có màn prototype được bật (§27.9 T15: "Báo cáo" không có menu; markup `aReports` thuộc cây mạng lưới đã gỡ) → **D-99 Admin › Báo cáo: `unreachable`** (ghi DV, Q-V4-614-1).
- Hành vi kiểm ở e2e `reports.spec.ts`. Sidebar Admin thêm mục:
  - đo lại shell `D-01` (Tổng quan) 1440 + 390;
  - DV nếu lệch vì có thêm một mục mà prototype không có.

## CONSTRAINTS
- DO NOT:
  - tạo bảng kế hoạch / vai trò vùng-tỉnh (D-78);
  - query trong vòng lặp tỉnh/nhóm (gom `GROUP BY province` / `group_id`);
  - đổi route kiểm duyệt `/admin/reports`, `/admin/reports/:id/action`;
  - bịa số cho chỉ số chưa có nguồn.
- REUSE: `ExportService` (job, link ký, purge), `useExportJob`/`downloadUrl`, `AuditService`, `regionOf`/`provinces` fixtures, `toCsv`/`csvCell` (BOM, ngoặc kép).
- SKIP: nộp báo cáo, duyệt, kế hoạch tháng, quý (B3 "tháng / quý": chỉ tháng — Q-V4-614-4).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`; migration quyền deploy `opchub_dev` + `opchub_test`, chạy lại an toàn.
- [ ] Unit: `report-templates` (khuôn từng mẫu: số dòng, số cột, nhãn khớp file mẫu đọc từ `docs/spec/mau-bao-cao`), permissions 28 khoá.
- [ ] Int: preview + export B1/B2/B3 với dữ liệu dựng, 403 / 400 / 404, audit cùng transaction, job → CSV trong storage đúng nội dung; contract coverage.
- [ ] EXPLAIN các truy vấn tổng hợp trên ≥ 10k thành viên.
- [ ] e2e `reports.spec.ts` + admin-rbac / admin-shell / a-01-login; D-01 đo lại.
- [ ] Commit theo đường dẫn, `git status --short` sạch, báo DONE kèm SHA.
