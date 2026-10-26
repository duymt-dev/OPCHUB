# TIP-V4-604 — Nhà đầu tư = danh sách + xuất (D-72) — completion

- Nhánh: `feature/TIP-V4-604-investor-list` (xếp chồng trên `feature/TIP-V4-603-group-join-instant`, PR #19 chưa merge)
- PR: [#20](https://github.com/duymt-dev/OPCHUB/pull/20) (base `feature/TIP-V4-603-group-join-instant`)
- Commit:
  - `b21485bb` TIP
  - `4b6854fa` db + shared
  - `9fa942fc` server + bảng hợp đồng
  - `3a3a91d5` Portal + Admin
  - `4b1a63b6` e2e + parity + EXPLAIN
- REQ / D: REQ-508 · D-72 (thay QT-10, NA-11, NA-22, §22.4) · §27.1, AD-08b, UP-11, F05

## Đã làm

- **DB**
  - Migration `20261023160000_v4_investor_list`:
    - Đóng sự kiện `investor.admin_replied` chưa phát (`dispatched_at = now()`, `last_error` ghi lý do D-72). Từ nay không còn consumer (M1).
    - Bỏ index `(status, created_at)`, cột `status` của `investor_interests` và `investor_summaries`, bảng `investor_comments`, enum `investor_interest_status`.
  - Quan tâm và tổng hợp giữ nguyên tiền và số lần.
  - Đã `migrate deploy` trên `opchub_test` và `opchub_dev`.
  - Seed demo bỏ bình luận mẫu và trạng thái.
- **Shared**: bỏ `INVESTOR_INTEREST_STATUS`, các schema status/comment/thread, `INVESTOR_STEPS`/transition, sự kiện `investor.admin_replied`, `myInterest.threadKey`. Mock bỏ trạng thái và trao đổi; cầu cookie chỉ còn chở quan tâm.
- **Server**
  - Bỏ 5 route: `PATCH /admin/investors/:key/status`, `GET|POST /admin/investors/:key/comments`, `GET /me/investor-thread`, `POST /investor-thread/:key/messages`.
  - Bỏ `InvestorNotifyHandler`, `InvestorProcessor` (worker) và `InvestorCommentRepository`.
  - Còn lại: `POST /projects/:id/interest` (Idempotency-Key, BR-09), `GET /projects/:id/interests`, Admin list / summary / detail / export. Export vẫn ghi audit.
  - Bảng hợp đồng: 213 → 208 endpoint.
- **Admin**
  - Bảng không còn nhãn trạng thái và số bình luận.
  - Drawer chỉ hiển thị (hồ sơ, dự án đã quan tâm) và nút "Sao chép số". Không còn bước trạng thái, "Gọi điện", trao đổi.
  - Mobile theo prototype v4: ô thống kê 2 cột, ẩn hàng tiêu đề bảng.
  - Bỏ i18n không dùng.
- **Portal**: tab dự án bỏ "Trao đổi với OPC Hub". Vẫn giữ nút "Quan tâm đầu tư" và danh sách "Nhà đầu tư quan tâm" của chủ dự án. Bỏ i18n ở 10 ngôn ngữ.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 8/8 task, 0 lỗi (portal 6, admin 5 cảnh báo có từ trước) |
| typecheck | 8/8 |
| unit | shared 378 · server 228 · portal 319 · admin 453 · ui 48 · integrations 77 (+2 skip) |
| depcheck | sạch (777 module) |
| build (MSW) | 3/3 |
| test:int server | 1285/1286 lần đầu. Hỏng: `investors.int.spec` còn đòi `status: 'sent'`. Đã sửa; chạy lại investor + contract + coverage + gates b4 + outbox-consumers: 11/11 |
| db int | 29/29 (gồm `migration-investor-list.int.spec.ts` 3/3) |
| e2e behavior (MSW) | 285 passed · 4 skipped · 0 failed (12,6 phút) |

Lần chạy đầu của test:int và e2e bị dừng ở giới hạn 10 phút chạy nền. Đã chạy lại với giới hạn 1 giờ; số trên là của lần chạy lại.

Test hành vi mới:
- `e2e/behavior/admin-investors.spec.ts`: drawer chỉ hiển thị, không có trạng thái / "Gọi điện" / trao đổi, "Sao chép số" → toast.
- `apps/server/test/investor/investors.int.spec.ts`: route cũ → 404; DB không còn cột, bảng, enum.
- Mock spec của admin và portal: không còn handler cho route đã bỏ.
- UAT-20 viết lại: NĐT có ở danh sách Admin, route trao đổi trả 404.

## EXPLAIN (≥ 10k dòng)

Chạy trên `opchub_test` với 13,5k tổng hợp và 135k quan tâm, ROLLBACK sau khi đo. File: `coding-packs/reports/explain/V4-604-investors.{sql,txt}`.

| Truy vấn | Plan | Thời gian |
|---|---|---|
| Trang NĐT lọc `kind=fund` | Index Scan `investor_summaries_last_at_investor_key_idx` + `users_pkey` | 0,10 ms |
| Tab Tất cả, trang 5 | Index Scan `last_at` | 0,31 ms |
| Mục quan tâm của trang | Bitmap Index `(investor_key, created_at)` | 0,26 ms |
| Quan tâm của 1 dự án | Bitmap Index `(project_id, user_id)` | 4,4 ms |
| Đếm tổng | Hash Join (Seq Scan 2 bảng) | 6,2 ms |

Đếm tổng thiết kế như trước V4, không đổi trong TIP này.

## Parity (prototype v4, không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| D-58 Nhà đầu tư | 0,44% | 0,16% | đạt |
| D-59 Nhà đầu tư · Quỹ | 0,44% | 0,16% | đạt |
| D-60 Drawer | 0,66% | 1,29% | đạt |
| P-69 Khối gọi vốn | 32,17% | 16,72% | DV-V4-604-1 |
| P-70 / P-71 / P-72 | không đo được | | DV-V4-604-2 |

- Prototype v4 chuyển khối Gọi vốn sang tab "Gọi vốn đầu tư", thuộc V4-610 (02-TASK-GRAPH).
- Bước chờ dải "★ DỰ ÁN NỔI BẬT TUẦN" (v4 đã bỏ) đổi sang chờ "Đăng dự án của bạn".
- P-70…72 vẫn hết giờ vì kịch bản chờ nút ở cột phải. Viết lại ở V4-610.

## Soát luật cứng 1–14

- File ≤ trần.
- Không `any`.
- Ranh giới module sạch (depcheck).
- Quyền theo key (`investors.*` giữ nguyên).
- Không query trong vòng lặp; list dùng keyset/index.
- Không đổi trạng thái (bỏ hẳn).
- Outbox: không sự kiện nào thiếu consumer; migration đóng sự kiện mồ côi.
- Tiền là số nguyên.
- Xuất dữ liệu ghi audit.
- Không secret, không `console`.
- Test ở file riêng.
- Commit theo đường dẫn; `git status --short` sạch.

## Chưa làm / câu hỏi

- Q-V4-604-1: prototype v4 vẫn còn "Trao đổi với nhà đầu tư" / "Trao đổi với OPC Hub". Làm theo D-72, bỏ cả hai.
- Q-V4-604-2: bỏ `myInterest.threadKey`.
- Q-V4-604-3: goal phiên mới thu hẹp test mỗi TIP, nhưng `GOAL-V4.md` mục 3 chưa sửa. Đề nghị owner cập nhật file.
- `e2e/scripts/api-contract.mjs` (sinh bảng từ SRS cũ) còn route thread / duyệt nhóm. Giữ nguyên như V4-603; bảng thật là `api-contract.md`.
