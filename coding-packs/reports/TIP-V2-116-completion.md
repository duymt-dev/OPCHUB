### COMPLETION REPORT — TIP-V2-116 (Google SSO thật)

**STATUS:** DONE — nhánh `feature/login-sso` (base `dev` @ `e734f523`). Chưa merge, chưa push.

**FILES CHANGED:**
- Created:
  - `packages/integrations/src/sso/google.provider.ts` — OIDC Google: code + PKCE S256, xác minh `id_token` (JWKS, iss, aud, exp, nonce), chỉ email đã xác minh; token endpoint không retry.
  - `packages/integrations/src/sso/google.provider.spec.ts` — 12 unit test (khoá RSA sinh trong test, không gọi mạng).
  - `apps/server/src/modules/account/services/sso-state.service.ts` — state/nonce/verifier trong Redis 10', `getdel` một lần.
  - `apps/server/src/modules/account/controllers/sso-cookie.ts` — cookie `opchub_sso` (httpOnly, lax, path `/v1/auth/sso`, 10').
  - `apps/server/test/factories/sso.factory.ts` — `ssoStart` / `ssoLogin` đi đúng luồng start → callback.
  - `apps/portal/src/features/auth/hooks/use-sso-providers.ts` — nút theo `/public/settings`.
- Modified:
  - `packages/integrations/src/sso/types.ts`, `fake.provider.ts`, `index.ts`, `package.json` (+`jose`), `pnpm-lock.yaml`.
  - `apps/server/src/common/config/env.schema.ts` (+spec) — `SSO_PROVIDER=fake|google`, `GOOGLE_CLIENT_ID/SECRET`; production cấm fake; google thiếu key → lỗi (không in giá trị).
  - `apps/server/src/common/integrations/integrations.module.ts` — chọn provider theo env.
  - `apps/server/src/modules/account/services/sso.service.ts` — `start` + `callback` kiểm state cookie (timing-safe) / Redis / luồng / nút còn bật; liên kết lưu theo luồng (`google`), TK có sẵn được gắn danh tính lần đầu; lỗi mạng provider → thông điệp chung.
  - `apps/server/src/modules/account/controllers/sso.controller.ts` — start đặt cookie + 302; callback nhận `state`, luôn xoá cookie.
  - `apps/server/src/modules/account/repositories/registration.repository.ts` — `linkIdentity` (upsert theo `(provider, subject)`).
  - `apps/server/src/modules/account/services/public-info.service.ts`, `packages/shared/src/api/auth.ts` — `publicSettings.ssoProviders`.
  - `apps/server/src/modules/account/account.module.ts` — đăng ký `SsoStateService`.
  - Portal: `api.ts`, `use-sso.ts`, `sso-complete-screen.tsx` (xử lý `?error=` / thiếu state, link về đăng nhập), `login-screen.tsx`, `register-screen.tsx`, `mocks/handlers/sso.ts`, `messages/vi/auth.json` (`sso.back`).
  - Test: `sso.int.spec.ts` (viết lại, 16 test), `register.int.spec.ts`, `admin-auth.int.spec.ts`, `referral-registration.int.spec.ts`, `contract/account-auth.int.spec.ts`, `test/setup/env.ts` (ghim `SSO_PROVIDER=fake`).
  - `apps/server/.env.example`, `infra/env/server.env.example` (`SSO_PROVIDER=google`), `infra/GO-LIVE-CHECKLIST.md` (L3-05).

**TEST RESULTS:** (chạy thật 21/10/2026)
- `@opchub/integrations` vitest: 37 passed, 2 skipped (6 files) — gồm 12 test Google mới.
- `@opchub/server` unit: 131 passed (33 files); audit spec 15 passed.
- `@opchub/server` int `sso.int.spec.ts`: **16/16 passed**; các file int đụng SSO (admin-auth, referral, contract account-auth, profile, register, settings-admin, coverage): 60/60 passed.
- `@opchub/server` int toàn bộ: 1183 passed, **8 failed** (bot ×5, chat-socket ×1, dashboard ×1, gate B5 ×1) — **lỗi sẵn có trên `dev`**: chạy cùng 5 file trên worktree `dev` @ `e734f523` cho kết quả y hệt (6 failed khi chạy riêng). Nguyên nhân bot: `app_settings.bot` trên DB test thiếu `requireReview` (dữ liệu DB test cũ, không thuộc TIP).
- typecheck: server, integrations, portal, admin, shared, ui sạch. eslint các file đã đụng: sạch.
- Portal unit: 163 passed (36 files).
- E2E MSW `auth-flows.spec.ts`: 12 passed, 2 failed — đều là "Đặt lại mật khẩu (QT-02)". Trên `dev` gốc test Admin cũng fail; test UAT-11 chập chờn (lần chạy riêng trên `dev` pass, trên nhánh fail 2/3 lần ở bước nhấn "Đăng nhập" sau khi đặt lại). TIP không đụng file nào của luồng đặt lại mật khẩu. **Kịch bản "SSO thành viên mới (D-45)" pass.**

**ACCEPTANCE CRITERIA:**
| AC | Kết quả | Test |
|---|---|---|
| 1 Env production/fake/key | PASS | `env.schema.spec.ts` › REQ-217 D-64 |
| 2 Start: 1 URI `/sso/callback/google` cho chatgpt, cookie httpOnly/lax/path | PASS | `sso.int` › bắt đầu |
| 3 Thiếu cookie / cookie khác / state giả / hết hạn / khác luồng → 401, không exchange | PASS | `sso.int` › state chống CSRF (5 test) |
| 4 Replay → 401, cookie bị xoá | PASS | `sso.int` › replay |
| 5 gemini → `google`; deepseek lần sau cùng TK, 1 liên kết | PASS | `sso.int` › REQ-002 D-64 |
| 6 TK có sẵn chưa liên kết → existing + cookie + 1 liên kết | PASS | `sso.int` › D-64 email đã có TK |
| 7 Ẩn FB/LinkedIn (provider chỉ Google), Admin tắt → ẩn + 403 | PASS | `sso.int` › provider chỉ hỗ trợ Google; D-33 D-64 |
| 8 Google adapter: hợp lệ / sai aud, iss, nonce / hết hạn / email chưa xác minh / khoá lạ / 400 / 500 | PASS | `google.provider.spec.ts` |
| 9 Hành vi cũ: khoá 403, quản trị 409, nút lạ 404, ssoToken một lần | PASS | `sso.int` |
| 10 Portal `?error=` → thất bại + link đăng nhập; MSW đủ 6 nút; e2e SSO | PASS (e2e SSO); `?error=` kiểm bằng đọc code + typecheck — chưa có test tự động riêng | `auth-flows.spec.ts` › SSO |

**ISSUES DISCOVERED:**
- 8 int test (bot/chat/dashboard/gate B5) fail trên `dev` gốc — trung bình — DB test thiếu `app_settings.bot.requireReview`; đề xuất chạy lại seed/migrate DB test hoặc TIP refine riêng.
- E2E "Đặt lại mật khẩu" (2 test) fail / chập chờn trên `dev` gốc — trung bình — cần TIP refine riêng.
- Chưa thử với Google thật trên trình duyệt (cần key trong `.env` local + redirect URI localhost) — **Chủ nhà nên thử tay trước khi merge**.

**DEVIATIONS FROM SPEC:**
- Lỗi mạng/5xx Google trả **500 `INTERNAL`** (thông điệp "Không kết nối được nhà cung cấp đăng nhập…") thay vì 503: hợp đồng `ErrorCode` chưa có mã 503; không thêm mã mới để tránh đổi hợp đồng FE.
- Thêm file ngoài danh sách: `test/factories/sso.factory.ts`, sửa `register.int.spec.ts`, `admin-auth.int.spec.ts`, `referral-registration.int.spec.ts`, `contract/account-auth.int.spec.ts`, `test/setup/env.ts` — bắt buộc vì callback giờ cần state hợp lệ.
- `packages/ui` không sửa (LoginPanel đã ẩn SSO khi rỗng; màn đăng ký ẩn bằng điều kiện).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP sau: `POST /me/sso/:provider` (liên kết từ hồ sơ) vẫn tạo identity giả `google:<email>` — chuyển sang OAuth thật (mode `link`), nếu không thì liên kết thủ công và liên kết thật có `subject` khác nhau.
- REQ-010 (TK có sẵn → xác thực mật khẩu/OTP trước khi liên kết) vẫn theo D-45; cần Chủ nhà chốt.
- Facebook/LinkedIn: thêm provider khi có app (interface đã hỗ trợ `flowOf`/`supports`).
