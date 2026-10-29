# TIP-V42-704 — Đối soát §28.1 + nội dung CK Gọi vốn + khớp tay Gọi vốn + email biên nhận — completion

- Nhánh `feature/TIP-V42-704-reconcile`, xếp chồng trên `feature/TIP-V42-703-price-config` (PR 703 chưa merge).
- PR: base `feature/TIP-V42-703-price-config`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-703-price-config...feature/TIP-V42-704-reconcile
- REQ / D: REQ-610, D-104 (thay D-41), D-105, D-113 (F3 khớp tay Gọi vốn, F4 email biên nhận), D-116, §28.1 BR-PAY-REF, FX-05.

## Commit

| SHA | Nội dung |
|---|---|
| `5f9b274f` | TIP-V42-704 |
| `9ba73a73` | Parser §28.1 `parsePaymentContent` (token `OPCHUB` đứng riêng, Mã TV, SĐT tuỳ chọn, một mã GV); `transferContentOf` / `localPhone` (shared); `manualMatchSchema` union phí / Gọi vốn, `fundraisingHint`, danh sách khoản chờ thanh toán; MailKind `receipt`; partial index `project_fundraisings_pending_created` |
| `7db2395c` | Server: phí + Gọi vốn chỉ tự khớp khi **đúng bằng** số tiền (lý do thiếu / thừa); nội dung CK Gọi vốn `OPCHUB {TV chủ} {SĐT} GV…`; khớp tay Gọi vốn (audit + outbox cùng transaction, 404 / 409); `GET /admin/fees/fundraisings/pending`; mail biên nhận phí / Gọi vốn (chống gửi trùng); int mới + sửa int cũ theo §28.1; EXPLAIN |
| `6b1bf8f4` | Admin: hộp Khớp tay chọn "Phí thành viên / Gói Gọi vốn" (mặc định Gọi vốn khi nội dung có mã GV), ô chọn khoản chờ thanh toán, cột gợi ý Mã TV / GV, nhãn loại thư "Biên nhận thanh toán"; MSW đồng bộ |
| `c7c223f1` | Portal: dòng "Cấu trúc: OPCHUB [Mã thành viên] [SĐT] GV[Mã dự án]" ở popup Gọi vốn (10 ngôn ngữ), mã tham chiếu Gọi vốn ở Gói & thanh toán |
| `72121213` | e2e: nội dung CK Gọi vốn mới + dòng "Cấu trúc", kịch bản khớp tay Gọi vốn, `payFee` chuyển đúng số tiền gói |
| commit báo cáo | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| `OPCHUB TV… 09…` (cả chữ thường) đúng giá → `active` + kỳ + mail biên nhận | int `reconcile` (D-104 chữ thường), `mail/receipt-mail` › phí | pass |
| Thiếu / thừa tiền, không có OPCHUB, dính liền → `unmatched` đúng lý do, phí không đổi | int `plans` (D-104 + D-116), `reconcile` (dính liền / thừa tiền), unit `content.spec` (40) | pass |
| `OPCHUB TV(chủ) 09… GV…` đúng giá → `pending_review` + mail biên nhận Gọi vốn; thừa tiền → unmatched | int `fundraising`, `reconcile-v42` › thừa tiền, `receipt-mail` › Gọi vốn | pass |
| Khớp tay vào khoản Gọi vốn chờ thanh toán → `pending_review`, audit `fundraising.match_transaction`, 1 outbox `fundraising.paid`; lần 2 → 409; mã lạ → 404; thiếu lý do → 400; moderator → 403 | int `reconcile-v42` (5), MSW `fee-handlers.spec`, e2e `fundraising › D-113 F3` | pass |
| Relay gọi lại → không gửi trùng mail biên nhận | int `receipt-mail` (2) | pass |
| Popup Gọi vốn hiện `OPCHUB TV… 09… GV…` + dòng "Cấu trúc" | e2e `fundraising` (3) | pass |
| Nội dung cũ `OPCHUB GVxxxxxx` (thiếu Mã TV) → hàng đợi tay, có gợi ý mã GV (Q-V42-704-3) | int `reconcile-v42` | pass |

## Test (số thật, máy dev)

- `pnpm lint`: 8 / 8 task. `pnpm typecheck`: 8 / 8. `pnpm depcheck`: 0 vi phạm (882 module).
- `pnpm test` (unit): shared 65 file / 414, server 40 / 225, portal 60 / 385, admin 91 / 463, integrations 103 (+2 skip), ui 49 — **1639**, xanh
  (703: 1622).
- `test:int` server: **153 file, 1450 / 1450** (703: 151 / 1436; +`reconcile-v42` 5, `receipt-mail` 2, thêm ca thừa tiền / dính liền).
  db 17 file, 54 / 54 (tổng int 1504; 703: 1490). Migration mới áp `opchub_dev` + `opchub_test`.
- `pnpm build` (MSW) portal + admin: thành công.
- e2e MSW behavior toàn bộ (build 704): **315 pass / 0 fail / 4 skip** (13,1 phút; 703: 314 → +1 kịch bản khớp tay Gọi vốn).

## Parity (MSW, ngưỡng 3%, prototype v4.2)

| Màn | 1440 | 390 | Ghi chú |
|---|---|---|---|
| D-18 Admin › Phí thành viên | 15,13% | 20,08% | Không đổi so với trước 704 (prototype v4.2 đổi 6 tab → V42-708, Q-V42-702-1) |
| P-103 / P-104 popup Gọi vốn, D-92 chip Gọi vốn, D-19 tab Chờ thanh toán | — | — | Kịch bản v4 không tới được màn trên prototype v4.2 (hỏng ở bước chụp prototype) → đo lại ở 705 (popup dựng lại theo v4.2) / 708 (tab Phí) — Q-V42-704-6 |
| Admin › Giao dịch cần đối soát (hộp Khớp tay) | — | — | Không có trong prototype (BUG-014); theo khuôn màn Phí thành viên |

Prototype phục vụ ở cổng 4811 (cổng 4800 mặc định đang bị một tiến trình ngoài phiên giữ, không nhận kết nối — không đụng).

## EXPLAIN (`coding-packs/reports/explain/V42-704-fundraising-pending.{sql,txt}`, +12k khoản Gọi vốn trong transaction rồi ROLLBACK)

- Ô trống (20 khoản chờ thanh toán mới nhất): Index Scan partial `project_fundraisings_pending_created` (dừng sau 20 dòng) + PK `projects` / `users`,
  **0,28 ms**.
- Tìm theo chuỗi (ILIKE `%…%` trên mã GV / tên dự án / Mã TV): đọc hết tập chờ thanh toán qua partial index (2.000 / 12.000 dòng) rồi hash join,
  **14,3 ms**. Chỉ Admin dùng, ô có debounce 300 ms, tập chờ thanh toán nhỏ (mỗi dự án tối đa một khoản đang chờ — UQ `project_fundraisings_open`);
  chưa cần trigram.

## Soát luật cứng

1. File trong trần (lớn nhất trong phạm vi: `fundraising.ts` mock 310, `match-dialog.tsx` 130, `fundraising-manual.service.ts` 105).
2. Không `any`; body / query / response qua zod shared (`manualMatchSchema`, `pendingFundraising*Schema`).
3. depcheck sạch; membership-fee gọi project qua cổng `FUNDRAISING_PAYMENT_PORT` (không import chéo).
4. `@RequireAdmin('fees.action')` cho khớp tay + danh sách khoản chờ.
5. Danh sách chờ: một query, partial index, LIMIT 20; không query trong vòng lặp.
7. Khớp tay Gọi vốn qua `repo.step('pay')` (`WHERE status = 'pending_payment'`); giao dịch qua `markMatched` có điều kiện.
8. `fundraising.paid` (outbox) + audit + đổi trạng thái giao dịch trong cùng transaction; mail biên nhận là consumer outbox.
9. Tiền VND nguyên. 10. Audit `fundraising.match_transaction` (tag `project`) có lý do + mã GV. 11. Không dịch vụ ngoài mới.
12. Không env mới. 13. Test ở file riêng. 14. Commit theo đường dẫn.
- Không hằng số giá mới: số tiền so với khoản đã chốt (`membership_fees.amount`, `project_fundraisings.amount`).

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token).
- Quyết định mơ hồ ghi `ui-parity/questions.md` Q-V42-704-1 → 5 (tiền tố ngân hàng; SĐT không đối chiếu; khoản Gọi vốn cũ thiếu Mã TV →
  khớp tay; nội dung mail biên nhận tự soạn; mã tham chiếu ở Gói & thanh toán).
- VietQR EMVCo + bố cục 2 cột popup Gọi vốn (705); gia hạn / từ chối → bổ sung (706); nhiều dự án / khoản (D-94 4B) chưa làm.
