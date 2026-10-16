# G0 + G1 — Nền parity + Auth (hoàn thành 16/10/2026)

## Đã làm

| Bước | Nội dung | Commit |
|---|---|---|
| G0.1–2 | Kịch bản parity theo khu vực (`e2e/parity/scenarios/{auth,portal-*,admin-*}.ts`), chọn màn bằng `PARITY_IDS` (glob), chạy song song, `results.json` gộp khi chạy một phần; prototype ổn định (đồng hồ dừng, `Math.random` cố định, chụp toast lúc đang hiện, hỗ trợ mask) | e53db19 |
| G0.3 | Proto-only đủ 205 chuỗi: A-* 54 đạt + 6 bỏ qua; P-*/D-* 324 đạt + 14 bỏ qua (`unreachable` có lý do); `screens.md` sửa theo kết quả (mục "Sửa sau proto-only") | dc87ec1 |
| G0.4 | MSW cho các domain SRS §13 (`@opchub/shared/api-domains`, `mock-domains`) + auth/đăng ký/OTP/MST/SSO + TK chưa đóng phí `do.haiyen@opchub.vn / User@2026` (D-28) | 3af002c, 1bec2c4 |
| G0.5 | `packages/ui`: Drawer, Modal, Tabs, FilterChips, Pagination, BulkBar | 260bee7 |
| G1.6 | Auth: đăng ký DN (tra MST) / cá nhân, OTP, quên mật khẩu, bảng ngôn ngữ (cookie `NEXT_LOCALE`), SSO + form bổ sung (D-45), toast đăng xuất; admin dùng chung khung + `/forgot-password` | 13bf68f, d169c98, 86c41f1 |
| G1.7 | `e2e/behavior/auth-flows.spec.ts`: đăng ký cá nhân + OTP, đăng ký DN + MST, đổi mã quốc gia, đăng ký tạm đóng, quên mật khẩu, đổi ngôn ngữ, SSO mới | b12a4a4 |
| Báo cáo | results A-xx, DV-08 → DV-15, Q-22 → Q-25 | 18e228d |

## Kiểm

- `pnpm install`, `lint`, `typecheck`, `test` (91 unit: ui 20, shared 21, portal 25, admin 25), `depcheck`, `build`: xanh.
- `PARITY_IDS='A-*,D-01' pnpm parity`: 56/56 ảnh ≤ 3% (cao nhất A-21@390 2,45%), 6 bỏ qua (A-11, A-24, A-30 — xem DV-09 → DV-11, đã có test hành vi cho A-11/A-24). D-01 0,00%.
- `pnpm e2e` (behavior): 14/14.

## Chưa làm / lưu ý

- Ngôn ngữ ngoài vi chỉ phủ chuỗi màn đăng nhập mà prototype có (Q-24).
- Mật khẩu đăng ký chưa kiểm ở client (Q-25); khóa đăng nhập (D-44) mới có phần hiển thị, logic ở backend.
- Bảng chi tiết: `coding-packs/reports/ui-parity/results.md`.
