# TIP-V42-706 — Gọi vốn: gia hạn `fund.r` chỉ khi hết hạn; bị từ chối → bổ sung → duyệt lại — completion

- Nhánh `feature/TIP-V42-706-fund-resubmit`, xếp chồng trên `feature/TIP-V42-705-vietqr` (PR 705 chưa merge).
- PR: base `feature/TIP-V42-705-vietqr`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-705-vietqr...feature/TIP-V42-706-fund-resubmit
- REQ / D: REQ-611, D-106, D-113 (F6), §27.5b, BR-GV-01.

## Commit

| SHA | Nội dung |
|---|---|
| `dd6e27d7` | TIP-V42-706 |
| `286716f0` | Server: bước `resubmit: rejected → pending_review` (cập nhật có điều kiện), `POST /me/fundraisings/:id/resubmit` (chủ khoản, Idempotency-Key; 404 / 409), mở thanh toán dự án có khoản bị từ chối → 409 (không mở khoản thu mới), `reviewNote` trong `Fundraising`, id thông báo thẩm định theo từng lần; MSW: D-106 (còn hạn kể cả ≤ 14 ngày → 409, như server), từ chối chặn mua lại, `resubmitMockFundraising`, Admin lưu ghi chú, cầu cookie theo số lần đổi (`rev`); int `fundraising-resubmit` |
| `3537942a` | Portal: Dự án của tôi — khung "Gói Gọi vốn bị từ chối" (lý do nếu có, "Sửa dự án để bổ sung hồ sơ rồi gửi duyệt lại — không thu phí lần hai.", nút "Gửi duyệt lại Gọi vốn" → toast); popup Gọi vốn bỏ dự án bị từ chối khỏi danh sách chọn, gửi dự án có gọi vốn đang bị từ chối không mở popup thanh toán; 10 ngôn ngữ; MSW spec |
| `c01fa2af` | e2e: Admin từ chối → chủ dự án gửi lại (Idempotency-Key) → Admin thấy lại "Gọi vốn · chờ duyệt" + Duyệt gọi vốn |
| commit báo cáo | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| Bị từ chối → gửi lại: chờ thẩm định, cùng mã GV + số tiền + giao dịch + `paidAt`, không khoản mới; lần nữa 409 | int `fundraising-resubmit` (1) | pass |
| Bị từ chối → mở thanh toán dự án đó 409, không tạo khoản; `/me/fundraisings` có `reviewNote` | int `fundraising-resubmit` (2) | pass |
| Người khác 404; thiếu Idempotency-Key 400 | int `fundraising-resubmit` (3) | pass |
| Gửi lại → từ chối lần hai → chủ nhận thông báo thứ hai; gửi lại → duyệt → `active` còn hạn | int `fundraising-resubmit` (4) | pass |
| MSW: từ chối → mua lại 409, gửi lại → chờ duyệt cùng mã; D-106 còn ≤ 14 ngày → 409 | unit `portal/mocks/fundraising-handlers.spec` (+2) | pass |
| Admin từ chối → chủ "Gửi duyệt lại Gọi vốn" → Admin thấy lại chờ duyệt | e2e `fundraising › D-113 F6` | pass |
| D-106 server (còn hạn → 409, hết hạn → `fund.r`) | int `fundraising-v42-fixes › B2` (đã có từ 701) | pass |

## Test (số thật, máy dev)

- `pnpm lint`: 8 / 8 task. `pnpm typecheck`: 8 / 8. `pnpm depcheck`: 0 vi phạm (886 module).
- `pnpm test` (unit): shared 417, server 225, portal 387, admin 463, integrations 103 (+2 skip), ui 52 — **1647**, xanh (705: 1645).
- `test:int`: server **155 file, 1456 / 1456** (+`fundraising-resubmit` 4), db 17 / 54 — tổng **1510** (705: 1506).
- `pnpm build` (MSW) portal + admin: thành công.
- e2e MSW behavior toàn bộ (build 706): **316 pass / 0 fail / 4 skip** (13,1 phút; 705: 315 → +1 kịch bản gửi duyệt lại).

## Parity (MSW, ngưỡng 3%, prototype v4.2)

| Màn | 1440 | 390 | Ghi chú |
|---|---|---|---|
| P-60 Dự án của tôi | 0,01% | 0,05% | khung bị từ chối chỉ hiện khi có khoản bị từ chối (dữ liệu mẫu không có) |
| P-103 / P-104 popup Gọi vốn | 1,61 / 1,30% | 2,91 / 2,45% | không đổi so với 705 |

Prototype v4.2 không có nút gửi lại (chỉ thông báo "Admin sẽ liên hệ để hoàn tất hồ sơ") — nút thêm theo D-113 F6 (D-95: nghiệp vụ không có nút prototype vẫn làm).

## Soát luật cứng

1. File trong trần (`fundraising.service.ts` 127, `mock fundraising.ts` 343, `fund-rejected.tsx` 34, `mine-screen.tsx` 135).
2. Không `any`; response qua `fundraisingSchema`.
3. depcheck sạch; Dự án của tôi dùng `FundRejected` qua public API `@/features/fundraising`.
5. Không query trong vòng lặp; `latest` 1 query / dự án (idx `project_id, status`).
7. Gửi lại qua `repo.step('resubmit')` — `WHERE status = 'rejected'`.
8. Không đổi luồng tiền: không thu lần hai, hoa hồng vẫn ghi ở consumer `fundraising.reviewed` khi duyệt (UQ `commissions.fundraising_id` chống ghi trùng).
14. Commit theo đường dẫn.

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token).
- Gửi lại không bắt buộc đã sửa dự án (đặc tả: "chủ dự án bổ sung hồ sơ" — không nêu điều kiện kiểm); Admin xem hồ sơ khi thẩm định lại. Ghi Q-V42-706-1.
- Admin từ chối Gọi vốn vẫn làm ngay, không hỏi lý do (như prototype `_fundDecide`); ô ghi chú API đã có nhưng UI Admin chưa nhập — Q-V42-706-2.
