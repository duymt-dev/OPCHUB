# GOAL — team fe-parity

> PM sở hữu file này. Coder chỉ đọc.

## Mục tiêu

Dựng frontend `apps/portal` + `apps/admin` giống prototype `docs/spec/index.html`, đo bằng ảnh chụp: **mỗi trạng thái chênh ≤ 3% pixel** ở 1440×900 và 390×844. Chưa có backend: dữ liệu qua MSW theo hợp đồng API SRS §13.

Rule: `AGENTS.md` + `coding-packs/standards/frontend/*`, đặc biệt [ui-parity](../standards/frontend/ui-parity.md).

## Phạm vi

- Auth: đăng nhập, SSO (nút), chọn loại TK, ĐK cá nhân, ĐK DN (tra MST giả lập), OTP, quên MK.
- Portal: dashboard, cộng đồng, chat nhóm, sự kiện, dự án OPC, hồ sơ, thông báo, popup gói dịch vụ + hộp chuyển khoản + form tư vấn.
- Admin: tổng quan, thành viên, phí, nhóm (+ kiểm duyệt), bot, nội dung & sự kiện, dự án, nhà đầu tư, dịch vụ, cài đặt (mọi tab).
- Mọi modal, drawer, popover, trạng thái rỗng/lỗi/đang tải, mobile.

Không làm: backend thật, đăng nhập thật, socket thật (giả lập bằng MSW/timer).

## Làn việc

| Làn | Coder | Việc |
|---|---|---|
| L0 Nền | PM + CODER-1 | Scaffold monorepo theo `AGENTS.md`, `packages/config`, `packages/ui` (theme + AppShell + AdminTable + StatusTag + PaywallModal + RichEditor + SafeHtml + UploadImage + EmptyState), `packages/shared/fixtures` (chép seed từ prototype), MSW, harness parity Playwright, `screens.md` |
| L1 Auth + Portal | CODER-1 | A-xx, P-xx |
| L2 Admin | CODER-2 | D-xx |

L1 và L2 chỉ bắt đầu sau khi L0 merge vào nhánh team. File dùng chung (`packages/ui/src/index.ts`, `packages/shared/fixtures/index.ts`, `messages/vi/common.json`) chỉ thêm dòng, giữ `.wire-lock`.

## Ma trận nghiệm thu

| # | Hạng mục | Đạt khi | Bằng chứng |
|---|---|---|---|
| G1 | Danh mục màn hình | `screens.md` liệt kê đủ mọi trạng thái của prototype, PM duyệt | file + PM verdict |
| G2 | Parity | 100% dòng `screens.md` ≤ 3% ở cả 2 viewport, hoặc có deviation được duyệt | `results.md` + ảnh diff |
| G3 | Hành vi | Test `e2e/behavior` cho lọc/tìm/phân trang/chọn tất cả/modal/paywall/chuyển tab đều xanh | log Playwright |
| G4 | Chất lượng | `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck && pnpm build` xanh; không file vượt trần dòng | log CI local |
| G5 | Git | Nhánh team sạch, mỗi màn một commit, báo DONE kèm SHA | `git log` |

## Đang chờ

(PM ghi câu hỏi mở và quyết định ở đây.)
