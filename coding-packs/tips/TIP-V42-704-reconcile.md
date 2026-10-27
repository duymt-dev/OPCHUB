# TIP-V42-704: Đối soát §28.1 + nội dung CK Gọi vốn + khớp tay Gọi vốn + email biên nhận

## HEADER
- TIP-ID: TIP-V42-704
- Project: OPCHUB
- Module: integrations/bank-webhook, membership-fee (reconcile, khớp tay), project (Gọi vốn), mail, Admin fees, Portal fundraising / profile, MSW
- Priority: P0
- Depends on: TIP-V42-703 (nhánh chưa merge → xếp chồng)
- Estimated: L
- REQ / D: REQ-610, D-104 (thay D-41), D-105, D-113 (email biên nhận + khớp tay Gọi vốn), D-116, §28.1 BR-PAY-REF, FX-05, F1 → F4 (FULL-AUDIT :46 → 49)
- **Files touched:**
  - Integrations: `packages/integrations/src/bank-webhook/content.ts` + `.spec.ts` (parser §28.1)
  - DB: `packages/db/prisma/schema/mail.prisma` (MailKind `receipt`), migration `20261028110000_v42_receipt_mail_kind` (create)
  - Shared: `api-domains/fees-admin.ts` (`manualMatchSchema` union fee / fundraising, `fundraisingHint`, danh sách khoản Gọi vốn chờ thanh toán), mock-data `domains/{fees-admin,fundraising}.ts`
  - Server: `membership-fee/services/{reconcile,membership-fee,fee-transactions}.service.ts`, `membership-fee/ports.ts` (`payManual`, `pending`), `membership-fee/controllers/admin-fee-transactions.controller.ts`, `project/services/{fundraising,fundraising-review}.service.ts`, `mail/templates-receipt.ts` (create), `mail/receipt-mail.handler.ts` (create), `mail/mail-priority.ts`, `mail/index.ts`, `worker/processors/notification.processor.ts`
  - Admin: `features/fees/{api.ts,hooks/use-fee-transactions.ts,components/match-dialog.tsx,components/fundraising-picker.tsx (create),components/txn-table.tsx}`, `messages/vi/fees.json`, `mocks/handlers/fees.ts`
  - Portal: `features/profile/components/billing-tab.tsx` (+ `billing.ts` nội dung CK Gọi vốn từ API), `features/fundraising/components/fundraising-popup.tsx` (dòng "Cấu trúc"), `messages/*/projects.json`
  - Test: `apps/server/test/membership-fee/reconcile-v42.int.spec.ts` (create), `test/mail/receipt-mail.int.spec.ts` (create), cập nhật `reconcile`, `plans`, `fundraising`, `admin-fees` int spec; e2e `behavior/{fundraising,admin-fees}.spec.ts`, `e2e/server/api.ts`
- **Parallel-safe with:** sequential — chồng trên 703; 705 đụng cùng `fundraising.service.ts` / popup Gọi vốn.

## CONTEXT
- Đặc tả §28.1 (BR-PAY-REF) "thay thế mọi mô tả cũ trái nghĩa": phí `OPCHUB [Mã TV] [SĐT]`, Gọi vốn `OPCHUB [Mã TV] [SĐT] GV[mã]`; sơ đồ: không tiền tố OPCHUB / không khớp Mã TV / sai số tiền → "Chờ đối soát thủ công".
- Prototype v4.2: hộp phí "Cấu trúc nội dung: OPCHUB [Mã thành viên] [Số điện thoại]", popup Gọi vốn "Cấu trúc: OPCHUB [Mã thành viên] [SĐT] GV[Mã dự án]"; không có màn khớp tay (D-113 F3 định nghĩa).
- Code hiện có: `extractPaymentCode` tìm mã ở bất kỳ đâu; phí nhận chuyển dư (`<`), Gọi vốn nhận chuyển dư; khớp tay chỉ cho phí; chưa có mail biên nhận.

## APPLICABLE STANDARDS
- [integrations/adapters](../standards/integrations/adapters.md) — parser thuần trong adapter
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) — cổng project ↔ membership-fee, outbox, audit cùng transaction
- [backend/auth-rbac](../standards/backend/auth-rbac.md) — khớp tay `fees.action`
- [testing/testing](../standards/testing/testing.md)

## SPECIFICATIONS
### Business Rules
1. **Parser §28.1 (D-104):** nội dung chuẩn hoá chữ hoa, tách theo khoảng trắng. Tìm token `OPCHUB` đứng riêng (ngân hàng có thể chèn mã giao dịch **trước** — Q-V42-704-1); không có → lý do "Nội dung không bắt đầu bằng OPCHUB". Token ngay sau: `TV` + 6 số → Mã TV; thiếu → "Không tìm thấy Mã TV trong nội dung". Token SĐT tuỳ chọn (không đối chiếu — Q-V42-704-2). Token `GV` + 6 số (tuỳ chọn) → khoản Gọi vốn. Dính liền (`OPCHUBTV…`), gạch nối, nhiều mã → không tự khớp.
2. **Phí thành viên (D-104):** `amount` phải **đúng bằng** `membership_fees.amount` (giá gói hiện hành — 703 đồng bộ theo Cấu hình bảng giá). Thiếu → "Số tiền nhỏ hơn phí thành viên"; thừa → "Số tiền lớn hơn phí thành viên". Khớp tay (kế toán) không kiểm số tiền (QĐ-01) — giữ.
3. **Gọi vốn (D-105):** có GV → ưu tiên GV, Mã TV phải là chủ khoản (đã có từ 701); số tiền **đúng bằng** `project_fundraisings.amount`: "Số tiền nhỏ hơn Gói Gọi vốn" / "Số tiền lớn hơn Gói Gọi vốn". Nội dung CK do server phát: `OPCHUB {Mã TV chủ} {SĐT 10 số} GV{mã}` (bỏ SĐT nếu chủ chưa có SĐT). Khoản cũ phát trước 704 (nội dung `OPCHUB GVxxxxxx`) → thiếu Mã TV → vào hàng đợi tay (an toàn, Q-V42-704-3).
4. **Khớp tay Gọi vốn (D-113 F3):** `POST /admin/fees/transactions/:id/match` nhận `{ kind: 'fee', userId, reason }` hoặc `{ kind: 'fundraising', fundraisingId, reason }`. Gọi vốn: khoản phải `pending_payment` → `pending_review` (cập nhật có điều kiện), gắn giao dịch, outbox `fundraising.paid`, audit `fundraising.match_transaction` (tag `project`), cùng transaction. Không kiểm số tiền (như khớp tay phí). `GET /admin/fees/fundraisings/pending?q=` liệt kê khoản chờ thanh toán (mã GV, dự án, chủ, số tiền) cho ô chọn; hàng giao dịch có `fundraisingHint` (mã GV đọc được).
5. **Email biên nhận (D-113 F4):** MailKind `receipt` (ưu tiên 3). `membership_fee.confirmed` → mail "Biên nhận phí thành viên OPC Hub" (số tiền kỳ, gói, hiệu lực đến). `fundraising.paid` → mail "Biên nhận Gói Gọi vốn OPC Hub" (dự án, mã GV, số tiền, "chờ Admin thẩm định"). Relay gọi lại không gửi trùng (khoá `mail_logs` theo to + kind + subject chứa mã kỳ / mã GV).
6. **D-116:** khoản chờ 600.000 trước v4 không còn (702 đã chuyển); test cũ "600.000 vẫn kích hoạt" thay bằng "khác giá hiện hành → đối soát tay".

### Validation
- `manualMatchSchema` discriminated union; `reason` 1 → 500 ký tự; `fundraisingId` chuỗi khác rỗng.

### Error Handling
- Khớp tay: giao dịch đã xử lý → 409; khoản Gọi vốn không còn chờ thanh toán → 409 "Gói Gọi vốn không còn chờ thanh toán"; không có → 404.

## ACCEPTANCE CRITERIA
- Given `OPCHUB TV… 09…` đúng giá When webhook Then `active` + kỳ + mail biên nhận (int).
- Given thiếu / thừa tiền, không có OPCHUB, dính liền When webhook Then `unmatched` đúng lý do, phí không đổi (int + unit parser).
- Given `OPCHUB TV(chủ) 09… GV…` đúng giá When webhook Then khoản `pending_review` + mail biên nhận Gọi vốn; thừa tiền → unmatched (int).
- Given giao dịch unmatched When Admin khớp tay vào khoản Gọi vốn chờ thanh toán Then `pending_review`, audit, outbox; lần 2 → 409 (int + e2e MSW).
- Given relay chạy lại When `membership_fee.confirmed` / `fundraising.paid` Then không gửi trùng mail (int).
- Popup Gọi vốn hiện nội dung `OPCHUB TV… 09… GV…` + dòng "Cấu trúc" (e2e MSW); parity P-104 / P-105 không tụt.

## CONSTRAINTS
- DO NOT: nhận chuyển dư / thiếu tự động; kiểm số tiền ở khớp tay; gửi mail trong transaction nghiệp vụ ngoài outbox.
- REUSE: `MemberDirectory`, `localPhone`, `MailService.request`, `AuditService`, `OutboxService`.
- SKIP: VietQR (705), gia hạn / từ chối → bổ sung Gọi vốn (706), nhiều dự án / khoản (D-94 4B).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng Files touched; mỗi AC có test, ghi số thật
- [ ] Luật 7 (khớp tay Gọi vốn `WHERE status = 'pending_payment'`), luật 8 (outbox), luật 10 (audit khớp tay)
- [ ] Không hằng số giá; số tiền so với khoản đã chốt theo Cấu hình bảng giá
