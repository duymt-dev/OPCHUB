# TIP-V42-705 — VietQR EMVCo sinh ở server + popup Gọi vốn 2 cột (1 dự án / khoản) — completion

- Nhánh `feature/TIP-V42-705-vietqr`, xếp chồng trên `feature/TIP-V42-704-reconcile` (PR 704 chưa merge).
- PR: base `feature/TIP-V42-704-reconcile`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-704-reconcile...feature/TIP-V42-705-vietqr
- REQ / D: REQ-604, D-96, D-94 4B, D-105, UI-PAY-01 → 04, §27.5c.

## Commit

| SHA | Nội dung |
|---|---|
| `9c1447a2` | TIP-V42-705 |
| `142932fd` | Shared `vietQrPayload` (TLV EMVCo + CRC-16/CCITT-FALSE, `qrPurpose` bỏ dấu / ASCII / ≤ 99), `qr` trong `myMembershipSchema` + `fundraisingPaymentSchema`, MSW `mockQr`; server env `BANK_BIN` (mặc định 970436, `.env.example` + zod), `bankTransferOf` dùng chung cho `GET /me/membership` và `POST /projects/:id/fundraising`; int `vietqr` |
| `f944b25e` | `packages/ui` `PayQr`: thẻ VietQR (bố cục compact2: chữ VIETQR, khung mã, napas 247 / Vietcombank, tên TK in hoa không dấu / STK / số tiền) vẽ từ chuỗi bằng antd `QRCode` SVG mức sửa lỗi **H** + logo chữ V khoét giữa như ảnh mẫu; khung "Đang tải mã QR…" (UI-PAY-02); lỗi → `/vcb-qr.png`. Toast `z-index` 50 như prototype (Q-V42-705-3) |
| `faa8abd5` | Portal: popup phí dùng `PayQr` 220 + nhãn VietQR + "Mã QR đã điền sẵn {tiền} và nội dung {ref}"; popup Gọi vốn dựng lại theo v4.2 (880px, 2 cột tự xếp 1 cột ở màn hẹp, × góc, "Quay lại" + "Tôi đã chuyển khoản"), thẻ chọn **một** dự án (radio, D-94 4B), "Đã chọn N dự án" + tổng, lưu ý, cột "2. Chuyển khoản" QR 200 + bảng ngân hàng + dòng "Cấu trúc"; danh sách chọn theo BR-GV-01; 10 ngôn ngữ |
| commit e2e / báo cáo | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| 1.200.000đ + `OPCHUB TV000001 0912345678` → 38 / 53 / 54 / 58 / 62 đúng, CRC hợp lệ (vector "123456789" → `29B1`) | unit `shared/membership/vietqr.spec` (3) | pass |
| `GET /me/membership` → `qr` mã hoá số tiền gói + nội dung; Gọi vốn `fund.p` tương tự | int `membership-fee/vietqr` (2) | pass |
| Popup phí: QR SVG trong khung 220, "Số tiền: 3.600.000 VND", "Mã QR đã điền sẵn…" | e2e `membership`, unit `ui/pay-qr.spec` (3) | pass |
| Bảng giá → Gói Gọi vốn: 2 cột, radio chọn dự án → QR + `OPCHUB TV… 09… GV…`, "Quay lại" / × đóng; chưa có dự án → trạng thái trống; bấm CK khi chưa chọn → toast | e2e `fundraising` (3), `projects` | pass |
| Chuỗi QR server = chuỗi prototype (cùng TK / tiền / nội dung) | Giải mã ảnh P-84 / P-85 hai bên: trùng từng ký tự, CRC `6A43` | khớp |
| Parity P-84 / P-85 / P-103 / P-104 ≤ 3% ở 1440 + 390 | xem bảng dưới | pass |

## Test (số thật, máy dev)

- `pnpm lint`: 8 / 8 task. `pnpm typecheck`: 8 / 8. `pnpm depcheck`: 0 vi phạm (885 module).
- `pnpm test` (unit): shared 66 file / 417, server 40 / 225, portal 60 / 385, admin 91 / 463, integrations 103 (+2 skip), ui 13 / 52 — **1645**, xanh (704: 1639).
- `test:int`: server **154 file, 1452 / 1452** (+`vietqr` 2), db 17 / 54 — tổng **1506** (704: 1504).
- `pnpm build` (MSW) portal + admin: thành công.
- e2e MSW behavior toàn bộ (build 705): **315 pass / 0 fail / 4 skip** (13,0 phút; 704: 315 / 0 / 4 — không giảm).

## Parity (MSW, ngưỡng 3%, prototype v4.2, cổng 4811)

| Màn | 1440 | 390 | Ghi chú |
|---|---|---|---|
| P-84 Thông tin chuyển khoản | 0,51% | 1,85% | trước 705: 0,80 / 3,13% (ảnh QR tĩnh) |
| P-85 Chuyển khoản · đã sao chép | 0,51% | 1,84% | toast nằm dưới mask như prototype |
| P-103 Popup Gói Gọi vốn · chọn dự án | 1,61% | 2,91% | còn lại: link "Chọn / bỏ chọn tất cả" (DV D-96) + mẫu điểm QR (mã GV khác, Q-V42-705-4) |
| P-104 Popup Gói Gọi vốn · sau khi gửi dự án | 1,30% | 2,45% | |
| D-92 Admin › chip Gọi vốn chờ duyệt | 0,00% | 0,00% | kịch bản thêm bước chọn dự án ở phía prototype v4.2 (Q-V42-704-6) |

Kịch bản parity: P-103 / P-104 / D-92 chọn dự án bằng ô tích ở phía prototype (app chọn sẵn dự án đầu); không mask, không nới ngưỡng.
Ảnh QR phía prototype tải từ `img.vietqr.io` như bản mẫu; phía app vẽ tại chỗ — không thay ảnh cố định ở bộ chụp.

## Soát luật cứng

1. File trong trần (lớn nhất trong phạm vi: `fundraising-popup.tsx` 135, `pay-qr.tsx` 122, `fundraising-pay.tsx` 96); hàm ≤ 80 dòng (lint).
2. Không `any`; `qr` qua zod shared.
3. depcheck sạch; `PayQr` ở `packages/ui` (membership + fundraising cùng dùng, không import chéo feature).
5. Không query mới (chuỗi QR tính từ khoản đã chốt).
9. Tiền VND nguyên (54 không có phần thập phân). 11. **Không gọi dịch vụ ngoài** (QR sinh ở server, vẽ SVG tại chỗ).
12. Env mới `BANK_BIN` có trong `.env.example` + zod env. 13. Test ở file riêng. 14. Commit theo đường dẫn.
- Không hằng số giá mới: số tiền QR = `membership_fees.amount` / `project_fundraisings.amount`.
- TIP nêu `bankAccountSchema.bin`: không cần — BIN chỉ dùng ở server khi sinh chuỗi, client không hiển thị.

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token).
- `ui-parity/questions.md` Q-V42-705-1 → 4: popup chọn nhiều dự án v4.2 → radio một dự án (DV D-96); QR vẽ tại chỗ thay `img.vietqr.io`;
  toast dưới hộp thoại như prototype (owner có thể muốn ngược lại); mã GV khác prototype làm mẫu điểm QR khác.
- Gia hạn `fund.r` chỉ khi hết hạn, từ chối → bổ sung (706).
