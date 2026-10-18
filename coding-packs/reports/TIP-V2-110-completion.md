# TIP-V2-110: Validate phiếu tư vấn theo đối tượng ở server (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. QT-11, LK-08 (REQ-408), UAT-21, BUG-019. Không migration.
> V2Q mới: V2Q-74, V2Q-75, V2Q-76.
> Commit: `8d5390f` (shared + server + int), `2dfe3cc` (portal + MSW spec + e2e behavior), `35b948c` (parity P-83),
> `74cae02` (audit UAT-22/23 payload) + commit báo cáo này.

## Đã làm
- **Shared** `api-domains/services.ts`:
  - `SERVICE_DETAIL_LABELS` (job, field, bizSt, orgType, size, pos, web, when, budget → đúng chuỗi đang lưu),
    `normalizeServiceDetails` (bỏ khoá ngoài nhãn chuẩn + giá trị rỗng), `SERVICE_REQUEST_ERRORS` (khớp
    `services.json › error.*`), `SERVICE_PHONE_RE`, `serviceNoteText`.
  - `createServiceRequestSchema` + `superRefine`: chung `fullName ≥ 2`, SĐT regex, email, `address`, `note` có chữ;
    DN: `organization`, `taxCode` khớp `TAX_CODE_RE` (`@opchub/shared/api`), `details.orgType|size|pos`; cá nhân
    `details.job`. Path lỗi: `organization` | `taxCode` | `details.orgType` | `details.size` | `details.pos` |
    `details.job` | `address` | `note`. Thứ tự issue như form (V2Q-74). Lỗi đi qua filter sẵn có → 400
    `VALIDATION_ERROR` + `fields`.
- **Server** `service-request.service.ts`: lưu `details = normalizeServiceDetails(body.details)` (không tin nhãn tự do).
  Máy trạng thái / mã `YC-<seq>` / `new` giữ nguyên (LK-08).
- **MSW** `mock-data/domains/ops-admin.ts`: handler đã `parseBody(createServiceRequestSchema)` nên trả 400 như server;
  `createServiceRequest` chuẩn hoá `details` như server.
- **Portal**: `model.ts` `firstError` thứ tự name → phone → email → org → orgType → tax → size → pos → job → addr → note
  (dùng `TAX_CODE_RE`, `SERVICE_PHONE_RE`, `serviceNoteText` shared); `toRequest` lấy nhãn từ `SERVICE_DETAIL_LABELS`.
  `consult-sections.tsx`: hàng "Mã số thuế / Quy mô" thêm `required` (hàng "Họ và tên / Chức vụ" đã có `*`).
  `services.json`: chỉ thêm `error.tax`, `error.size`, `error.pos`. `types.ts` không đổi (`ConsultError` ở `model.ts`).
- **Test cũ cập nhật payload** cho luật mới (không nới assertion): `contract/service-request.int.spec.ts`,
  `common/sanitize.int.spec.ts`, `gates/b5-admin-ops.int.spec.ts`, `e2e/audit/{uat-interaction,forms}.audit.ts`
  (UAT-22/23), parity P-83 điền quy mô + chức vụ.

## Test (số thật)
- `pnpm lint` 8/8 task thành công; `pnpm typecheck` 8/8; `pnpm depcheck`: "no dependency violations found (551 modules)".
  e2e `tsc --noEmit` sạch; eslint `behavior/services.spec.ts`, `parity/scenarios/portal-account.ts` sạch.
  (`e2e/audit/*.audit.ts` có 9 lỗi eslint **có sẵn ở HEAD**, không nằm trong `pnpm lint`, TIP không thêm lỗi mới.)
- Unit: server 76/76, shared 76/76, ui 25/25, integrations 25 + 2 skip, admin 128/128,
  portal **96/97** — 1 FAIL **có sẵn trước TIP** (xác nhận bằng `git stash` ở HEAD `dac4ebf`):
  `domain-handlers.spec.ts › IV-R02 REQ-372 chủ dự án không có luồng NĐT…` (luồng NĐT của TIP-V2-107, ngoài phạm vi).
  Mới: `model.spec.ts` `QT-11 UAT-21 thứ tự kiểm DN: org → orgType → tax → size → pos`,
  `REQ-408 gửi DN: nhãn chuẩn SERVICE_DETAIL_LABELS…`; `domain-handlers.spec.ts`
  `REQ-408 gửi phiếu YC dịch vụ hợp lệ → … details bỏ khoá lạ`, `UAT-21 BUG-019 MSW phiếu DN thiếu MST → 400 taxCode`.
- Int (opchub_test): 4 file liên quan 23/23. Toàn bộ **288/290** (67 file) — 2 FAIL **có sẵn ở HEAD** (đã chạy lại
  trên HEAD sạch, cùng kết quả, do môi trường): `account/profile.int.spec.ts › uploads/presign` (publicUrl qua 3220
  thay vì URL ký), `common/error-envelope.int.spec.ts › vượt giới hạn → 429` (200).
  Mới trong `service/service.int.spec.ts`: `UAT-21 BUG-019 phiếu DN thiếu {tên DN, MST, MST 9 số, loại hình, quy mô,
  chức vụ} → 400, không tạo phiếu (QT-11)` (6 ca, kiểm `fields[0]` = path + message, đếm phiếu không đổi),
  `UAT-21 phiếu cá nhân thiếu nghề nghiệp / tỉnh / nhu cầu → 400`,
  `REQ-408 LK-08 phiếu DN hợp lệ → 201 YC new, details chuẩn hoá bỏ khoá lạ` (kiểm cả Admin list thấy `new` + details).
- e2e MSW (build riêng `.next-110`, Portal 3310 / Admin 3311 / proto 4810; đã xoá thư mục build sau khi chạy):
  `services.spec.ts` + `admin-requests.spec.ts` 11/11. Toàn bộ behavior **127 passed, 1 failed** —
  `events.spec.ts › lọc chip + tìm ghi vào URL` lỗi khi chạy song song, chạy lại `--repeat-each=2` 20/20 → flaky,
  không liên quan. Mới: `UAT-21 QT-11 form DN thiếu MST bị chặn, không gọi API` (kiểm 0 request POST, toast MST cả
  khi trống và 9 số), `REQ-408 LK-08 Tư vấn → tạo phiếu DN đủ trường` (đọc response 201: `new`, business, MST,
  details 3 nhãn; popup hiện mã). Không nhánh `onServer`.
- Parity P-79 → P-83: **không đo được** — prototype SRS-3.6 không còn popup cũ ("Chương trình & dịch vụ khác"), P-79
  cũng fail ở HEAD trước TIP (V2Q-76, thuộc TIP-V2-302). Không commit file kết quả parity.

## e2e server: CHƯA chạy
Agent chính đang chạy e2e server (api 4000, Next 3220/3222 là bản build trước TIP). Builder không dừng/khởi động
tiến trình không do mình tạo. **Cần agent chính**: rebuild + restart api; rebuild `.next-server-v2` Portal; chạy
`pnpm e2e:server --project behavior services admin-requests` và audit `uat-interaction` (UAT-21 → kỳ vọng 400 cả 2 ca,
UAT-22/23 payload đã đủ trường). Seed demo `an.nguyen` có MST `0101234567`, tên công ty → spec dùng chung được.

## Ngoài phạm vi / ghi chú
- Lỗi tại ô (TIP-V2-106), popup V4 + parity P-79→83 (TIP-V2-302).
- Portal test IV-R02 fail sẵn (TIP-V2-107) và 2 int môi trường: chưa sửa, báo agent chính.
