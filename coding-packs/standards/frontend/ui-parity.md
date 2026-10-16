# UI parity với prototype

Áp dụng khi dựng màn hình theo `docs/spec/index.html`. Chuẩn UI duy nhất là prototype đang chạy trong trình duyệt.

## Prototype là gì

- `docs/spec/index.html` = khối template `<x-dc>` (markup + inline style) + một script `data-dc-script` chứa state, i18n, seed data (`PROVINCES`, `CAT_SEED`, `REG_ROLES`, `PROJECTS`, `MEMBERS`, `EVENTS`, `SVC_SEED`, …).
- `docs/spec/support.js` chỉ là runtime render template (tải React 18 từ unpkg). **Không port, không import.**
- Prototype tự vẽ phần tử giống Ant Design bằng inline style; code mới dùng **Ant Design 6 thật** và chỉnh theme token cho khớp.
- Không có URL theo màn hình; trạng thái nằm trong state (`screen`, `pTab`, `aTab`, `pjTab`…). Muốn tới một màn phải bấm theo chuỗi thao tác.
- Chạy local: `npx serve docs/spec -l 4800` (cần internet cho React CDN, Google Fonts, ảnh mẫu).
- Tài khoản demo: user `an.nguyen@mediasoft.vn / User@2026`, admin `admin@opchub.community / Admin@2026`.

## Được lấy từ prototype

- Layout, thứ tự phần tử, khoảng cách, màu, cỡ chữ, bo góc, bóng đổ, icon, câu chữ.
- Dữ liệu seed: chép sang `packages/shared/fixtures/` (TypeScript có type), dùng cho mock API và seed DB sau này.
- Hành vi: lọc, tìm, phân trang, chọn tất cả, modal/drawer, popup paywall không đóng được, toast, trạng thái rỗng.

## Không được làm

- Copy code JS của prototype, dùng `support.js`, nhúng template `x-dc`.
- Chép inline style hàng loạt. Giá trị style phải thành theme token AntD (`packages/ui/theme`) hoặc CSS Modules.
- Tự "cải tiến" giao diện. Lệch có chủ đích phải ghi vào `coding-packs/reports/ui-parity/deviations.md` và chờ duyệt.

## Mock dữ liệu khi chưa có backend

- Dùng **MSW** (`apps/*/src/mocks/`), handler theo đúng hợp đồng API SRS §13 + [api-conventions](../backend/api-conventions.md).
- UI gọi API qua `api-client` như thật; bỏ MSW là chạy với backend thật, không sửa component.
- Hành vi giả lập (OTP, đối soát chuyển khoản, chủ nhóm duyệt sau 8 giây…) làm trong handler MSW, không viết vào component.

## Đo "giống hệt"

### Danh mục màn hình
`coding-packs/reports/ui-parity/screens.md` — mỗi dòng một trạng thái:

| ID | Khu vực | Màn / trạng thái | Chuỗi thao tác trên prototype | Route app mới | Viewport |
|---|---|---|---|---|---|
| A-01 | Auth | Đăng nhập | mở trang | `/login` | 1440, 390 |
| P-07 | Portal | Popup gói dịch vụ bắt buộc | đăng nhập TK chưa phí | `/dashboard` | 1440, 390 |

Gồm cả modal, drawer, tab con, trạng thái rỗng/lỗi, menu mở, form báo lỗi.

### Chụp và so

- Playwright project `parity` (`e2e/parity/*.spec.ts`): với mỗi dòng, thực hiện chuỗi thao tác trên prototype (port 4800) và trên app mới, chụp cùng viewport.
- Ổn định ảnh trước khi chụp:
  - chặn ảnh ngoài (Unsplash, randomuser.me, Google Maps) bằng `page.route` trả ảnh cố định giống nhau ở hai bên;
  - cố định giờ (`page.clock.setFixedTime('2026-10-16T09:00:00+07:00')`), tắt animation/transition, ẩn caret;
  - chờ font tải xong (`document.fonts.ready`).
- So bằng `pixelmatch` (threshold 0.1). **Đạt khi số pixel khác ≤ 3% tổng pixel**.
- Kết quả ghi `coding-packs/reports/ui-parity/results.md`: ID | viewport | % chênh | trạng thái | SHA. Ảnh diff lưu `coding-packs/reports/ui-parity/diffs/` (chỉ commit ảnh của dòng chưa đạt hoặc có deviation).

### Hành vi
Mỗi hành vi tương tác có test Playwright riêng trong `e2e/behavior/` chạy trên app mới, đặt tên theo ID màn hình hoặc mã UAT.

## Thứ tự làm

1. Nền: monorepo, `packages/ui` theme khớp prototype, `AppShell` Portal + Admin, MSW, fixtures, harness parity.
2. Auth (A-xx) → Portal (P-xx) → Admin (D-xx).
3. Mỗi màn: code → chạy parity → sửa tới khi ≤ 3% → test hành vi → commit → màn tiếp.
