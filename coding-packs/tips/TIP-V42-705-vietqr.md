# TIP-V42-705: VietQR EMVCo sinh ở server (phí + Gọi vốn) + popup Gọi vốn 2 cột (1 dự án / khoản)

## HEADER
- TIP-ID: TIP-V42-705
- Project: OPCHUB
- Module: payment-qr (server), membership-fee, project (Gọi vốn), Portal membership / fundraising / projects, MSW
- Priority: P1
- Depends on: TIP-V42-704 (nhánh chưa merge → xếp chồng)
- Estimated: M
- REQ / D: REQ-604, D-96, D-94 4B, D-105, UI-PAY-01 → 04, §27.5c
- **Files touched:**
  - Shared: `packages/shared/src/membership/vietqr.ts` (create, + `.spec.ts`): chuỗi EMVCo VietQR (TLV + CRC-16/CCITT-FALSE), thuần, không phụ thuộc
    ngoài; `api-domains/membership.ts` (`bankAccountSchema.bin`, `myMembershipSchema.qr`), `api-domains/fundraising.ts` (`fundraisingPaymentSchema.qr`),
    mock-data `domains/{ops-admin,fundraising,extras}.ts`
  - Server: `common/config/env.schema.ts` (`BANK_BIN` mặc định 970436), `.env.example`, `membership-fee/services/membership-fee.service.ts`,
    `project/services/fundraising.service.ts` (`qr` trong response); không module mới (hàm thuần ở shared)
  - Portal: `features/membership/components/{pay-details.tsx,pay-qr.tsx (create),pay-modal.module.css}`,
    `features/fundraising/components/{fundraising-popup.tsx,fundraising-pay.tsx (create),project-pick.tsx,fundraising.module.css}`,
    `features/fundraising/hooks/use-fundraising-pay.ts`, `features/projects/components/fundraising-host.tsx`,
    `messages/*/{membership,projects}.json` (vẽ QR bằng `QRCode` của antd 6, `type="svg"` — không thêm dependency)
  - Test: `apps/server/test/membership-fee/vietqr.int.spec.ts` (create), MSW spec, e2e `behavior/{fundraising,membership}.spec.ts`,
    parity kịch bản P-103 / P-104 (popup v4.2), P-84 / P-85
- **Parallel-safe with:** sequential — chồng trên 704 (cùng `fundraising.service.ts`, popup Gọi vốn); 706 đụng lại `fundraising.service.ts`.

## CONTEXT
- Prototype v4.2: popup phí `payOpen` (QR 220×220 có khung "Đang tải mã QR…", nhãn VietQR, "Mã QR đã điền sẵn {tiền} và nội dung {ref}");
  popup Gọi vốn `fg` 880px 2 cột: (1) chọn dự án (thẻ chọn) + "Đã chọn N dự án" + tổng tiền + lưu ý; (2) "2. Chuyển khoản": QR 200×200 + VietQR,
  bảng Ngân hàng / STK / Chủ TK / Số tiền / Nội dung (Sao chép), dòng "Cấu trúc"; chân "Quay lại" + "Tôi đã chuyển khoản"; nút × góc.
  Prototype dùng `img.vietqr.io` (dịch vụ ngoài) — đặc tả §27.5c "Đề xuất: sinh chuỗi QR phía máy chủ"; D-96 chốt QR động sinh ở server, lỗi → ảnh tĩnh.
- D-94 4B: **1 dự án / khoản** → thẻ chọn dự án là chọn một (radio), không "Chọn / bỏ chọn tất cả", không nội dung `GV10-11-12`.
- Hiện có: ảnh tĩnh `/vcb-qr.png` ở popup phí; popup Gọi vốn 1 cột không QR (v4).

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md) — ≤ 3% ở 1440 + 390
- [frontend/antd-ui](../standards/frontend/antd-ui.md) — không thêm thư viện UI; dùng `QRCode` của antd 6
- [integrations/adapters](../standards/integrations/adapters.md) — không gọi dịch vụ ngoài
- [testing/testing](../standards/testing/testing.md)

## SPECIFICATIONS
### Business Rules
1. **Chuỗi EMVCo (D-96):** Payload Format "01", Point of Initiation "12" (động, có số tiền), Merchant Account 38 (GUID `A000000727`,
   tổ chức thụ hưởng BIN + STK, dịch vụ `QRIBFTTA`), tiền tệ 53 = "704", số tiền 54 (VND nguyên), quốc gia 58 = "VN", nội dung 62.08,
   CRC 63 (CRC-16/CCITT-FALSE, 4 ký tự hoa). Nội dung bỏ dấu, chỉ ASCII in được, ≤ 99 ký tự (`OPCHUB TV… 09… GV…` vốn ASCII).
2. Server trả `qr` (chuỗi EMVCo) trong `GET /me/membership` và `POST /projects/:id/fundraising`, số tiền = số phải trả (phí: `membership_fees.amount`;
   Gọi vốn: `project_fundraisings.amount`), nội dung = `transferContent`. Không gọi dịch vụ ngoài. BIN từ env `BANK_BIN` (mặc định 970436 Vietcombank).
3. Portal vẽ QR từ chuỗi (SVG, không mạng). Khung cố định (phí 220, Gọi vốn 200); chưa có chuỗi → biểu tượng QR + "Đang tải mã QR…" (UI-PAY-02);
   không có chuỗi / lỗi vẽ → ảnh tĩnh `/vcb-qr.png` (D-96 dự phòng).
4. **Popup Gọi vốn 2 cột (UI-PAY-01, D-94 4B):** tiêu đề "Thanh toán Gói Gọi vốn · {giá} / dự án / {tháng} tháng"; chế độ Bảng giá: "1. Chọn dự án"
   thẻ chọn một (tên, lĩnh vực, giá — "· gia hạn" khi đã từng gọi vốn hết hạn), ghi chú "Chỉ hiện dự án đã bật…"; chế độ sau đăng dự án: phụ đề
   "Dự án {tên} · phần Gọi vốn hiển thị…". "Đã chọn N dự án" + số tiền; lưu ý "Không thu phí thành công…". Cột 2 trống → khung "Chọn ít nhất 1 dự án…".
   Chân: "Quay lại" (UI-PAY-04) + "Tôi đã chuyển khoản"; × góc. Màn hẹp tự xếp 1 cột.
5. Popup phí: QR động + dòng "Mã QR đã điền sẵn {tiền} và nội dung {ref}" (FULL-AUDIT D-96).
6. Dự án hiện trong danh sách chọn: đã bật "Cần gọi vốn đầu tư" (`funding`), không nháp, không có khoản chờ thẩm định / đang gọi vốn (BR-GV-01).

### Validation
- `qr` là chuỗi `^000201…6304[0-9A-F]{4}$`; zod `z.string()` (server sinh, client chỉ vẽ).

### Error Handling
- Chưa có khoản (lỗi tạo) → cột 2 hiện thông điệp lỗi server như hiện tại; QR không vẽ được → ảnh tĩnh.

## ACCEPTANCE CRITERIA
- Given cấu hình mặc định When sinh QR cho 1.200.000đ + `OPCHUB TV000001 0912345678` Then chuỗi có 38/53/54/58/62 đúng và CRC hợp lệ (unit, vector tính tay).
- Given TK trial When `GET /me/membership` Then `qr` mã hoá đúng số tiền gói + nội dung (int); Gọi vốn tương tự với `fund.p` / `fund.r`.
- Given popup phí When mở Then QR SVG hiện trong khung 220, có dòng "Mã QR đã điền sẵn…" (e2e MSW).
- Given Bảng giá → Gói Gọi vốn When mở Then bố cục 2 cột, chọn thẻ dự án → QR + nội dung `OPCHUB TV… GV…`, "Quay lại" đóng (e2e MSW).
- Parity P-84 / P-85 / P-103 / P-104 ≤ 3% ở 1440 + 390 trên prototype v4.2 (ảnh QR ngoài được thay bằng ảnh cố định giống nhau ở hai bên như ảnh ngoài khác).

## CONSTRAINTS
- DO NOT: gọi `img.vietqr.io` / dịch vụ ngoài; nhiều dự án một khoản; hằng số giá.
- REUSE: `transferContentOf`, `FEE_BANK` mock, `usePrices`.
- SKIP: gia hạn chỉ khi hết hạn / từ chối → bổ sung (706).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng Files touched; mỗi AC có test, ghi số thật
- [ ] Không dịch vụ ngoài (luật 11); env mới có trong `.env.example` + zod (luật 12)
- [ ] FE ≤ 400 dòng / file, page chỉ orchestrator; parity ≤ 3% các màn trên
