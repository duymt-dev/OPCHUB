# TIP-V4-605 — Yêu cầu dịch vụ = phiếu ghi nhận (D-72) — completion

- Nhánh: `feature/TIP-V4-605-service-tickets` (xếp chồng trên `feature/TIP-V4-604-investor-list`, PR #20 chưa merge)
- PR: [#21](https://github.com/duymt-dev/OPCHUB/pull/21) (base `feature/TIP-V4-604-investor-list`)
- Commit:
  - `c81cc62a` TIP
  - `43104e3c` db + shared
  - `b8df9c30` server + bảng hợp đồng
  - `de8d5227` Admin + Portal
  - `a32add38` e2e + parity
- REQ / D: REQ-222, REQ-408 · D-72 (bỏ quy trình 5 bước Phiếu YC) · D-60 · §27.1

## Đã làm

- **DB**
  - Migration `20261023180000_v4_service_tickets`: bỏ index `(status, created_at)`, cột `status`, `assignee` của `service_requests`, enum `service_request_status`. Phiếu, ghi chú nội bộ, mention giữ nguyên.
  - Test migration `packages/db/test/migration-service-tickets.int.spec.ts` (schema `mig_v4_605`): dữ liệu phiếu + ghi chú còn nguyên sau migration; không còn cột/enum.
  - Đã `migrate deploy` trên `opchub_test` và `opchub_dev`; seed lại demo.
  - Danh mục dịch vụ: fixture `prototype-seed.json` thay SVC_SEED bằng 15 mục của prototype v4 (tắt: tools, match, mkt, export, data).
- **Shared**: bỏ `SERVICE_REQUEST_STATUS(ES)`, status/assignee khỏi schema phiếu, query, update; bỏ summary/transition/assign khỏi mock. Mock badge = `unnotedServiceRequestCount()`.
- **Server**
  - Bỏ 4 route: `GET /admin/service-requests/summary`, `POST /admin/service-requests/:code/transition`, `PATCH /admin/service-requests/:code`, `PATCH /admin/service-requests/:code/assignee`. Bỏ `ServiceRequestPatchService`.
  - Giữ `GET /admin/service-requests/staff`, nghĩa mới: người gắn tên được (Q-V4-605-1).
  - CSV xuất bỏ cột Trạng thái / Phụ trách; xuất vẫn ghi audit.
  - Badge "Dịch vụ" ở Tổng quan = số phiếu chưa có ghi chú nội bộ (Q-V4-605-2).
  - Bảng hợp đồng: 208 → 204 endpoint.
- **Admin**: danh sách không thống kê, chip trạng thái, cột Phụ trách; drawer chỉ thông tin + ghi chú nội bộ gắn tên. Tab "Danh mục chương trình & dịch vụ" + mô tả v4. Bỏ i18n không dùng.
- **Portal**: màn đã gửi hiện cố định "Đã gửi" (10 ngôn ngữ), bỏ nhãn trạng thái.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (portal 6, admin 5 cảnh báo có từ trước) |
| typecheck | 8/8 |
| unit | shared 378 · server 228 · portal 319 · admin 452 · ui 48 · integrations 77 |
| depcheck | sạch (776 module) |
| build (MSW) | 3/3 |
| test:int server (service, contract, gates, outbox-consumers, sanitize, sync-export-audit, rbac-matrix, reporting) | 745/748 lần đầu → sửa 3 assertion cũ → 15/15. Sau đổi danh mục: service + contract + b5 + reporting 66/67 (REQ-222 bình luận hỏng 1 lần), chạy lại riêng 14/14 và cả bộ 67/67 — không đổi code; ghi nhận là chập chờn, theo dõi ở test:int toàn bộ cuối P1 |
| db int | seed-demo + migration-service-tickets 10/10 |
| e2e behavior (domain + smoke) | admin-requests, services, popup-v4, membership, a-01-login, admin-shell, portal-shell: 36/37 → sửa số nút "Đăng ký" 6 → 10 (danh mục v4) → popup-v4 + services 10/10 |

Test hành vi mới/sửa:
- `e2e/behavior/admin-requests.spec.ts`: không radio/trạng thái/Phụ trách; drawer không nút quy trình, không chọn phụ trách; ghi chú gắn tên; danh mục 15 → 14 sau xoá.
- `e2e/behavior/popup-v4.spec.ts`: AT-LK05 đi qua "Đào tạo & Ươm mầm OPC" (Q-V4-605-4); 10 dịch vụ đang bật.
- `apps/server/test/service/service.int.spec.ts`: route cũ → 404 ×4; tìm; CSV; audit xuất; badge giảm sau ghi chú; DB không còn cột/enum.
- UAT-22/23: transition → 404; JSON Admin không có `"status"`.

EXPLAIN: TIP không thêm danh sách mới (danh sách phiếu chỉ bỏ lọc trạng thái), không đo lại.

## Parity (prototype v4, không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| D-61 Dịch vụ · yêu cầu | 0,43% | 0,14% | đạt |
| D-62 Dịch vụ · trống | 0,45% | 0,39% | đạt |
| D-63 Drawer YC-1005 | 1,08% | 1,97% | đạt |
| D-64 Yêu cầu · từ chối | không đo (`unreachable`) | | DV-V4-605-1 |
| D-65 Dịch vụ · danh mục | 0,34% | 0,29% | đạt |
| P-79 Popup Gói dịch vụ | 0,51% (1366: 0,98%) | 0,51% | đạt |
| P-80 Form tư vấn · cá nhân | 2,72% | 2,53% | đạt |
| P-81 Form tư vấn · doanh nghiệp | 3,88% | 4,13% | DV-V4-605-2 (= DV-V4-601-1) |
| P-82 Form tư vấn · báo thiếu | 12,23% | 16,43% | DV-V4-605-2 (= DV-V4-601-2) |
| P-83 Đã gửi yêu cầu tư vấn | 0,48% | 0,51% | đạt |

## Soát luật cứng 1–14

- File ≤ trần; không `any`; depcheck sạch.
- Quyền theo key (`services.view`, `services.action`).
- Không query trong vòng lặp; badge là 1 `count`.
- Không còn đổi trạng thái phiếu (bỏ hẳn theo D-72).
- Outbox: `service_request.mentioned` còn consumer (M1).
- Xuất CSV ghi audit; không secret, không `console`; test ở file riêng.
- Commit theo đường dẫn; `git status --short` sạch.

## Chưa làm / câu hỏi

- Q-V4-605-1: giữ route staff làm nguồn "Gắn tên:".
- Q-V4-605-2: badge = phiếu chưa có ghi chú nội bộ — chờ owner chốt.
- Q-V4-605-3: chưa thêm `Service.audience` (V4-613 nếu cần).
- Q-V4-605-4: v4 tắt "Công cụ & Giải pháp số"; AT-LK05 chạy với dịch vụ đang bật.
- REQ-222 bình luận int test hỏng 1 lần rồi qua — theo dõi ở lần chạy toàn bộ cuối P1.
