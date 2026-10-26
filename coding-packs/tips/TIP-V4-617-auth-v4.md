# TIP-V4-617: Auth theo prototype v4 (A-01 → A-32) — D-89

## HEADER
- TIP-ID: TIP-V4-617
- Project: OPCHUB
- Module: `packages/ui/src/auth` (khung + form Auth dùng chung) · Portal / Admin `features/auth` · shared SSO · e2e
- Priority: P1 (goal V4-UI, TIP đầu)
- Depends on: dev sau V4-616 (`79e96b28`)
- Estimated: L
- REQ / D: D-89 (thay D-64 phần nút SSO), Q-V4-615-1, DV-V4-615-1, DV-V4-607-1
- **Files touched:**
  - `packages/ui/src/auth/{auth-layout,auth-hero,auth-header,login-panel,login-extras,forgot-panel,language-switch,language-menu}.tsx` + `*.module.css` (modify): khung ảnh nền toàn trang, thẻ form kính mờ, cột trái v4, chân trang cờ.
  - `packages/ui/src/auth/register/*` (modify): thẻ chọn loại, khối "Đổi loại", nhịp ô form theo v4.
  - `packages/ui/src/auth/types.ts` (modify): props hero v4 (giá trị, chân trang).
  - `apps/portal/public/auth/login-bg-v11.png`, `apps/admin/public/auth/login-bg-v11.png` (create): ảnh nền chép từ `docs/spec/assets` (asset, không phải code).
  - `apps/{portal,admin}/src/features/auth/components/{auth-frame,login-hero,login-screen,…}.tsx` (modify).
  - `apps/{portal,admin}/messages/*/auth.json` (modify): câu chữ v4.
  - `packages/shared/src/api-domains/settings-admin.ts`, `packages/shared/src/fixtures/prototype-seed.json` (modify): SSO chỉ Google (D-89).
  - Server: `SSO_IDS` dùng chung → provider ngoài Google bị bỏ khỏi `/public/settings` (modify nếu cần) + migration tắt provider cũ.
  - `e2e/parity/scenarios/auth.ts` (modify): bỏ nhánh "app khác prototype" khi app đã theo v4.
  - `e2e/behavior/{a-01-login,auth-flows,…}.spec.ts` (modify): assert theo v4.
  - `coding-packs/reports/ui-parity/{results.*,deviations.md,questions.md}`, `coding-packs/reports/TIP-V4-617-completion.md`.
- **Parallel-safe with:** sequential — đầu chuỗi V4-617 → 624.

## CONTEXT
- Prototype v4 (`docs/spec/index.html` dòng 102–297, khối `AUTH`): nền ảnh `assets/login-bg-v11.png` phủ toàn trang, cột trái chữ trắng (huy hiệu "CỘNG ĐỒNG DOANH NGHIỆP MỘT NGƯỜI · QUỐC TẾ", tiêu đề 2 dòng, 4 giá trị có icon tròn trắng), thẻ form bên phải `rgba(255,255,255,.6)` + blur, ô cao 50px không nhãn, nút "Đăng nhập →", SSO chỉ Google 1 cột, "Chưa có tài khoản? Đăng ký tham gia"; chân trang: 13 cờ + EU, khẩu hiệu, ©, Điều khoản | Chính sách.
- ≤1023px: `authL` / `authR` full width, giá trị 2 cột.
- Hiện tại A-xx lệch 75–92% (DV-V4-615-1).

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md) — ≤3% ở 1440 + 390; theme token / CSS Modules, không chép inline style.
- [frontend/antd-ui](../standards/frontend/antd-ui.md), [global/code-structure](../standards/global/code-structure.md) (FE ≤ 400 dòng).
- [testing/testing](../standards/testing/testing.md).

## TASK
Dựng lại toàn bộ màn Auth (đăng nhập, đăng ký chọn loại / DN / cá nhân, OTP, quên mật khẩu, ngôn ngữ) cho Portal và Admin theo prototype v4, SSO chỉ Google, rồi đo parity A-xx ≤ 3% cả hai khung.

## SPECIFICATIONS
### Business Rules
1. Nghiệp vụ đăng ký / đăng nhập / OTP / khóa / mã giới thiệu giữ nguyên (D-xx cũ) — chỉ đổi giao diện.
2. SSO: chỉ Google (D-89). Provider khác bị bỏ khỏi danh sách hiển thị và Cài đặt.
3. Ô đăng nhập nhận "email hoặc số điện thoại" như prototype (placeholder); server đã hỗ trợ (`identifier`).

### Error Handling
- Lỗi đăng nhập hiện khối đỏ như prototype (`lgErr`), giữ nội dung lỗi server.

## ACCEPTANCE CRITERIA
- Given prototype v4 và app tại HEAD, When chạy `PARITY_IDS='A-*'`, Then mọi A-xx đo được ≤ 3% ở 1440 + 390.
- Given trang đăng nhập, Then chỉ có nút SSO Google; behavior `a-01-login`, `auth-flows` xanh.
- Given đăng ký DN / cá nhân / OTP / quên mật khẩu, Then hành vi cũ giữ (registration-acceptance, business-registration-acceptance, affiliate-portal xanh).

## CONSTRAINTS
- DO NOT: nới ngưỡng, mask, sửa prototype; copy code JS / inline style hàng loạt.
- REUSE: `AuthLayout`, `LoginPanel`, form đăng ký có sẵn — sửa trình bày, không viết lại logic.

## ⚠️ BUILDER-CHECKLIST
- [ ] A-xx ≤ 3% cả 1440 + 390 (ghi số thật từng màn), DV-V4-615-1 / DV-V4-607-1 ghi "đã sửa".
- [ ] lint + typecheck + unit + depcheck + build; int auth / settings nếu sửa server; e2e auth domain xanh.
- [ ] File FE ≤ 400 dòng; không `any`.
- [ ] Commit theo đường dẫn, PR base dev, completion + SHA.
