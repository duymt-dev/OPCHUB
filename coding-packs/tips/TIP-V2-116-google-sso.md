# TIP-V2-116: Đăng nhập Google SSO thật (Google + ChatGPT/Gemini/DeepSeek)

## HEADER
- TIP-ID: TIP-V2-116 · Project: OPCHUB · Module: account (SSO) + integrations + portal auth
- Depends on: None (nền `dev` @ `e734f523`) · Priority: P0 · Estimated: L (8–10h)
- Nhánh: `feature/login-sso` (worktree `D:\CODING\OPCHUB\wt-login-sso`), PR vào `dev`
- REQ / D / OQ: REQ-002, REQ-217, D-45, D-62, **D-64 (mới)**, OQ-04 (Google: đóng), TD-009 (một phần)
- **Files touched:**
  - `packages/integrations/src/sso/types.ts` (modify — interface mới có state/nonce/PKCE)
  - `packages/integrations/src/sso/fake.provider.ts` (modify — theo interface mới)
  - `packages/integrations/src/sso/google.provider.ts` (create)
  - `packages/integrations/src/sso/google.provider.spec.ts` (create)
  - `packages/integrations/src/sso/index.ts` (modify — export), `packages/integrations/package.json` (modify — `jose: catalog:`)
  - `apps/server/src/common/config/env.schema.ts`, `env.schema.spec.ts` (modify)
  - `apps/server/src/common/integrations/integrations.module.ts` (modify — chọn provider theo env)
  - `apps/server/src/modules/account/services/sso.service.ts` (modify)
  - `apps/server/src/modules/account/services/sso-state.service.ts` (create — state/nonce/PKCE trong Redis)
  - `apps/server/src/modules/account/controllers/sso.controller.ts` (modify)
  - `apps/server/src/modules/account/controllers/sso-cookie.ts` (create — cookie ràng buộc state)
  - `apps/server/src/modules/account/repositories/registration.repository.ts` (modify — `linkIdentity`)
  - `apps/server/src/modules/account/services/public-info.service.ts` (modify — `ssoProviders`)
  - `apps/server/src/modules/account/account.module.ts` (modify — 1 dòng provider)
  - `apps/server/test/account/sso.int.spec.ts` (modify)
  - `packages/shared/src/api/auth.ts` (modify — `publicSettingsSchema.ssoProviders`)
  - `apps/portal/src/features/auth/api.ts`, `hooks/use-sso.ts`, `components/sso-complete-screen.tsx`, `components/login-screen.tsx`, `components/register-screen.tsx` (modify)
  - `apps/portal/src/features/auth/hooks/use-sso-providers.ts` (create)
  - `apps/portal/src/mocks/handlers/sso.ts` (modify)
  - `apps/portal/messages/vi/auth.json` (modify — nếu cần chuỗi lỗi mới)
  - `apps/server/.env.example`, `infra/env/server.env.example`, `infra/GO-LIVE-CHECKLIST.md` (modify)
- **Parallel-safe with:** chạy một mình trên nhánh này. Sequential với mọi TIP đụng `env.schema.ts`, `account.module.ts`, `publicSettingsSchema`.

## CONTEXT
- Working directory: `D:\CODING\OPCHUB\wt-login-sso`
- Stack: NestJS server, Prisma/Postgres, Redis (`RedisService`), Next.js Portal, zod hợp đồng ở `@opchub/shared/api`, `jose 6.2.12` (đã có trong catalog, server đang dùng).
- Hiện trạng (đọc trước khi sửa):
  - `packages/integrations/src/sso/fake.provider.ts` — fake, `exchange(code)` nhận email trong `code` → **ai cũng đăng nhập được TK bất kỳ**.
  - `apps/server/src/common/integrations/integrations.module.ts` — `sso = () => new FakeSsoProvider()` (luôn fake).
  - `env.schema.ts:72` — `SSO_PROVIDER: z.enum(['fake'])`; production không chặn fake.
  - `sso.service.ts` — `state` sinh ra nhưng **không lưu, không kiểm**; redirect_uri = `/sso/callback/<provider>`.
  - `apps/portal/src/features/auth/hooks/use-sso.ts` — `VIA_GOOGLE = chatgpt/gemini/deepseek` chỉ đổi câu toast.
  - Nút SSO lấy từ fixture `ssoProviders` (6 nút), không theo cài đặt Admin.
- Patterns to follow:
  - Adapter: `packages/integrations/src/bank-webhook/sepay.provider.ts` + `fetchJson` (`packages/integrations/src/http.ts`), lỗi `IntegrationError`.
  - Chặn production: khối `parseEnv` trong `env.schema.ts` (giống `OTP_FIXED_CODE`, `FAKE_MAIL_DIR`).
  - Cookie: `session-cookie.ts` (`httpOnly`, `secure: env.REFRESH_COOKIE_SECURE`, `sameSite: 'lax'`, path hẹp).
  - Redis một lần dùng: `getdel` như `SsoService.complete`.

## TASK
Thay fake bằng OAuth 2.0 / OpenID Connect thật của Google (Authorization Code + PKCE, kiểm `state` + `nonce`, xác minh `id_token` bằng JWKS). Bốn nút Google, ChatGPT, Gemini, DeepSeek đều đi **một** luồng Google, cùng một redirect URI, và lưu liên kết là `google`. Production bắt buộc Google thật; fake chỉ còn cho dev/test. Facebook/LinkedIn chưa làm: ẩn khi provider là `google`.

## SPECIFICATIONS

### Quyết định (D-64)
| Điểm | Chốt |
|---|---|
| Redirect URI | **Một** URI: `${PORTAL_URL}/sso/callback/google` cho cả 4 nút. Nút được bấm lưu trong state (Redis). |
| Provider lưu DB | `auth_identities.provider = 'google'`, `subject = sub` của Google (không phải email). |
| Production | `NODE_ENV=production` mà `SSO_PROVIDER≠google` hoặc thiếu `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` → **server không khởi động**. |
| Facebook/LinkedIn | Chưa hỗ trợ khi `SSO_PROVIDER=google`: không hiện nút, route trả 404. |

### Env
1. `SSO_PROVIDER: z.enum(['fake','google']).default('fake')`, `GOOGLE_CLIENT_ID: z.string().optional()`, `GOOGLE_CLIENT_SECRET: z.string().optional()`.
2. Trong `parseEnv`:
   - `SSO_PROVIDER==='google'` mà thiếu một trong hai key → `Env không hợp lệ — GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET: bắt buộc khi SSO_PROVIDER=google`.
   - `NODE_ENV==='production' && SSO_PROVIDER!=='google'` → `Env không hợp lệ — SSO_PROVIDER: fake cấm dùng ở production`.
   - Thông báo lỗi **không** in giá trị secret (theo quy ước sẵn có).
3. `.env.example` (server + infra): thêm `GOOGLE_CLIENT_ID=`, `GOOGLE_CLIENT_SECRET=` (để trống), comment: redirect URI phải khai trên Google Console là `<PORTAL_URL>/sso/callback/google`.

### Adapter (`packages/integrations/src/sso`)
4. Interface mới:
   ```ts
   export interface SsoAuthorizeRequest { redirectUri: string; state: string; nonce: string; codeChallenge: string }
   export interface SsoExchangeRequest { code: string; redirectUri: string; codeVerifier: string; nonce: string }
   export interface SsoProvider {
     readonly name: string;
     /** Nút nào provider này phục vụ được (fake: cả 6; google: google/chatgpt/gemini/deepseek) */
     supports(button: SsoButton): boolean;
     /** Luồng thực của nút (`chatgpt` → `google`); là provider lưu DB và nằm trong redirect path */
     flowOf(button: SsoButton): SsoFlow;
     authorizeUrl(flow: SsoFlow, req: SsoAuthorizeRequest): string;
     exchange(flow: SsoFlow, req: SsoExchangeRequest): Promise<SsoIdentity | null>;
   }
   ```
   `SsoButton` = 6 id trong `SSO_IDS`; `SsoFlow` = `'google' | 'facebook' | 'linkedin'` (khai trong `types.ts`, không import từ `@opchub/shared` nếu package chưa phụ thuộc — dùng string literal union).
5. `GoogleSsoProvider({ clientId, clientSecret, fetchImpl?, jwks? })`:
   - `authorizeUrl` → `https://accounts.google.com/o/oauth2/v2/auth` với `client_id, redirect_uri, response_type=code, scope="openid email profile", state, nonce, code_challenge, code_challenge_method=S256, prompt=select_account`.
   - `exchange` → POST `https://oauth2.googleapis.com/token` (form-urlencoded: `code, client_id, client_secret, redirect_uri, grant_type=authorization_code, code_verifier`) qua `fetchJson` với **`retries: 0`** (code chỉ dùng một lần). Lỗi 4xx (`invalid_grant`) → trả `null`; lỗi mạng/5xx → ném `IntegrationError` (retryable).
   - Xác minh `id_token` bằng `jose.jwtVerify` + `createRemoteJWKSet('https://www.googleapis.com/oauth2/v3/certs')` (tạo một lần, tái dùng): `issuer` ∈ {`https://accounts.google.com`, `accounts.google.com`}, `audience = clientId`, kiểm `exp` (jose tự làm), `payload.nonce === req.nonce`.
   - `email_verified !== true` hoặc thiếu `email` → `null`.
   - Trả `{ subject: payload.sub, email, fullName: payload.name ?? email.split('@')[0] }`.
   - `supports`: chỉ `google|chatgpt|gemini|deepseek`; `flowOf` → luôn `'google'`.
6. `FakeSsoProvider` theo interface mới: `supports` mọi nút; `flowOf` = `chatgpt/gemini/deepseek → google`, còn lại giữ nguyên; `authorizeUrl` trả `redirectUri?code=mock&state=<state>`; `exchange` giữ hành vi cũ (code dạng email → email đó), bỏ qua nonce/verifier. Comment rõ: **chỉ dev/test, env chặn ở production**.

### Server
7. `integrations.module.ts`: `sso(env)` → `SSO_PROVIDER==='google'` ? `new GoogleSsoProvider({...})` : `new FakeSsoProvider()`; inject `[ENV]`; log một dòng `logger.log` tên provider (không log key).
8. `SsoStateService` (file mới, ≤ 80 dòng):
   - `create(button, flow)` → sinh `state` (32 byte base64url), `nonce` (16 byte), `codeVerifier` (32 byte base64url), `codeChallenge = base64url(sha256(verifier))`; lưu Redis `sso:state:<state>` = `{button, flow, nonce, codeVerifier}` TTL **600s**; trả cả bộ.
   - `consume(state)` → `getdel`, parse zod; không có / hỏng → `null`.
9. `SsoService`:
   - `start(button)`: `enabled(button)` (giữ D-33 bật/tắt từng nút) + `provider.supports(button)` sai → 404 `Không hỗ trợ nhà cung cấp này`. `flow = provider.flowOf(button)`, tạo state, trả `{ url, state }`.
   - redirect URI = `${PORTAL_URL}/sso/callback/${flow}` (Google: luôn `/sso/callback/google`).
   - `callback(flowParam, code, state, cookieState, client)`:
     a. `cookieState` thiếu hoặc khác `state` (so `timingSafeEqual` trên buffer cùng độ dài) → 401 `Phiên đăng nhập liên kết không hợp lệ, vui lòng thử lại`.
     b. `consume(state)` null, hoặc `stored.flow !== flowParam` → cùng 401.
     c. Nút trong state phải **vẫn đang bật** (`enabled(stored.button)`), nếu Admin tắt giữa chừng → 403 như hiện tại.
     d. `exchange(flow, {code, redirectUri, codeVerifier, nonce})`; null → 401 hiện có.
     e. Giữ nguyên: chặn email TK quản trị (D-62), TK khoá → 403, TK mới → `ssoToken` 15'.
     f. Danh tính lưu `provider = flow` (Google → `'google'`), `subject = who.subject`.
     g. **TK đã có, tìm theo email mà chưa có liên kết** → `registrations.linkIdentity(userId, flow, subject, email)` (upsert theo `(provider, subject)`, không tạo trùng) rồi mở phiên. Lần sau tìm theo `findByIdentity` trước.
   - `complete` không đổi logic; identity dùng `flow`.
10. `sso-cookie.ts`: `SSO_STATE_COOKIE = { name: 'opchub_sso', path: '/v1/auth/sso' }`; `setSsoStateCookie(res, env, state)` (`httpOnly`, `secure: env.REFRESH_COOKIE_SECURE`, `sameSite: 'lax'`, `maxAge: 600_000`), `readSsoStateCookie(req)`, `clearSsoStateCookie(res, env)`.
11. `SsoController`:
    - `GET :provider` (start): đặt cookie state rồi 302 tới `url`. Không dùng `@Redirect()` nữa nếu cần ghi cookie — dùng `@Res()` + `res.redirect(302, url)`.
    - `GET :provider/callback?code=&state=`: query `{ code: string 1..2000, state: string 1..200 }`; luôn `clearSsoStateCookie` (kể cả khi lỗi — dùng `try/finally`).
    - `POST complete` không đổi.
12. `PublicInfoService.settings()` thêm `ssoProviders: SsoId[]` = nút Admin đang bật **và** `provider.supports(id)`, theo thứ tự `SSO_IDS`. `publicSettingsSchema` thêm `ssoProviders: z.array(z.enum(SSO_IDS))`.

### Portal
13. `use-sso-providers.ts`: dùng `usePublicSettings()` (đã có) → lọc fixture `ssoProviders` theo `data.ssoProviders`; khi chưa có data → mảng rỗng (không nhấp nháy nút bị tắt).
14. `login-screen.tsx`, `register-screen.tsx`: thay `ssoProviders.map(...)` bằng hook trên. Danh sách rỗng → `SsoSection` không hiện (kiểm `login-extras.tsx`; nếu đang render vạch "hoặc" khi rỗng thì ẩn bằng điều kiện ở màn hình, **không** sửa `packages/ui` trừ khi bắt buộc — nếu phải sửa, ghi vào DEVIATIONS).
15. `use-sso.ts`: giữ toast `ssoViaGoogle`; nhánh server thật vẫn `window.location.assign(\`${NEXT_PUBLIC_API_URL}/auth/sso/${id}\`)`. Nhánh MSW: `router.push(\`/sso/callback/${flow}?code=mock&state=mock\`)` với `flow = VIA_GOOGLE.has(id) || id==='google' ? 'google' : id`.
16. `sso-complete-screen.tsx`: đọc `state` và `error` từ query. Có `error` (VD `access_denied` khi người dùng huỷ) hoặc thiếu `code`/`state` → `EmptyState` `t('sso.failed')` + nút/link về `/login`. Gọi `ssoCallback(provider, code, state)`.
17. `api.ts`: `ssoCallback(provider, code, state)` gắn `&state=`.
18. MSW `handlers/sso.ts`: `/public/settings` trả thêm `ssoProviders: SSO_IDS` (đủ 6 như hiện tại để không vỡ parity); callback bỏ qua `state`.

### Validation & Error Handling
- Mọi lỗi từ Google không lộ chi tiết ra client; log server `logger.warn({ provider: 'google', reason })` — **không** log `code`, `id_token`, `client_secret`, `codeVerifier`.
- `IntegrationError` retryable (Google sập) → 503 qua filter hiện có; nếu filter chưa map `IntegrationError`, bắt trong `SsoService.callback` và ném `AppError` 503 thông điệp `Không kết nối được Google, vui lòng thử lại`.
- Rate limit giữ nguyên (`callback` 20/phút, `complete` 10/phút); thêm `@Throttle({ default: { limit: 20, ttl: 60_000 } })` cho `start`.

## ACCEPTANCE CRITERIA
1. **Env:** Given `NODE_ENV=production, SSO_PROVIDER=fake` When `parseEnv` Then ném lỗi có `SSO_PROVIDER`. Given `SSO_PROVIDER=google` thiếu `GOOGLE_CLIENT_SECRET` Then ném lỗi nêu tên biến, không chứa giá trị `GOOGLE_CLIENT_ID`. Given production + google + đủ key Then parse OK.
2. **Start:** Given nút `chatgpt` bật When `GET /auth/sso/chatgpt` Then 302, `Location` có `redirect_uri` path `/sso/callback/google`, có `state`, `nonce`, `code_challenge_method=S256` (với provider google; với fake: `?code=mock&state=`), và `Set-Cookie: opchub_sso=<state>; HttpOnly; Path=/v1/auth/sso`.
3. **State:** Given không có cookie / cookie khác `state` / `state` đã dùng / `state` hết hạn When callback Then 401 và **không** gọi `exchange`.
4. **Replay:** Given callback thành công với state S When gọi lại với S + cùng cookie Then 401.
5. **Liên kết:** Given TK mới đăng ký qua nút `gemini` When `complete` Then `auth_identities` có đúng 1 dòng `provider='google'`. Given cùng TK Google bấm nút `deepseek` lần sau Then `existing`, cùng user, vẫn 1 dòng.
6. **TK có sẵn:** Given user email `a@x.com` chưa liên kết When SSO Google trả email đó Then `existing` + cookie refresh + tạo 1 dòng identity `google`.
7. **Ẩn Facebook/LinkedIn:** Given `SSO_PROVIDER=google` When `GET /public/settings` Then `ssoProviders` không có `facebook`, `linkedin`; `GET /auth/sso/facebook` → 404. Given Admin tắt `gemini` Then `ssoProviders` không có `gemini`.
8. **Google adapter (unit, `fetchImpl` + JWKS giả ký bằng khoá sinh trong test qua `jose.generateKeyPair`):** id_token hợp lệ → identity `subject=sub`; sai `aud` / sai `iss` / sai `nonce` / hết hạn / `email_verified=false` → `null`; token endpoint 400 → `null`; 500 → `IntegrationError` retryable; body POST có `code_verifier` và `redirect_uri` đúng.
9. **Giữ hành vi cũ:** TK khoá → 403; email TK quản trị → 409 `SSO_ADMIN_FORBIDDEN`; nút lạ → 404; `complete` token dùng một lần → 401 lần 2.
10. **Portal:** Given `/sso/callback/google?error=access_denied` Then hiện `sso.failed` + đường về `/login`, không gọi API. Màn login (MSW) vẫn đủ 6 nút; e2e `auth-flows.spec.ts` › "SSO thành viên mới" xanh trên MSW.

## CONSTRAINTS
- DO NOT: log/commit giá trị `GOOGLE_CLIENT_SECRET`; đưa secret vào biến `NEXT_PUBLIC_*`; dùng `passport` (thêm phụ thuộc, khác pattern adapter — ghi chú: thay đề xuất `passport-google-oauth20` ở matrix dòng 40); đổi schema DB / migration; sửa luồng `complete`, đăng ký OTP, `POST/DELETE /me/sso/:provider` (xem ghi chú cuối).
- REUSE: `fetchJson`, `IntegrationError`, `RedisService`, `AppSettingsService.security()`, `usePublicSettings`, `startSession`, `register.activate`.
- File cap: server ≤ 400 dòng/file, FE ≤ 250; `sso.service.ts` phải còn < 200 dòng (logic state tách sang `sso-state.service.ts`).
- Không viết test dài inline trong file production.

## GHI CHÚ CHO CHỦ NHÀ (cấu hình Google Console)
- OAuth client loại **Web application**. Authorized redirect URIs, mỗi môi trường một dòng:
  - `http://localhost:3000/sso/callback/google` (dev — Portal chạy với `API_PROXY_URL` để `/v1` cùng origin, cookie state mới gửi được)
  - `https://opchub.community/sso/callback/google` (production)
- Điền `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` vào `apps/server/.env` (local) / `server.env` (VPS), `SSO_PROVIDER=google`. **Không** dán secret vào chat, issue, commit.
- OAuth consent screen ở chế độ "Testing" chỉ cho tài khoản test đăng nhập — cần "In production" trước go-live.

## FOLLOW-UP (ngoài phạm vi, ghi vào báo cáo)
- `POST /me/sso/:provider` (liên kết từ hồ sơ) vẫn tạo identity giả `google:<email>` không qua OAuth — cần TIP riêng chuyển sang luồng OAuth (mode `link`).
- REQ-010 (TK đã có → xác thực mật khẩu/OTP trước khi liên kết) hiện vẫn theo D-45 (đăng nhập luôn vì Google đã xác minh email).
- Facebook, LinkedIn: adapter riêng khi có app.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`; file nào thêm ngoài danh sách → ghi DEVIATIONS
- [ ] AC 1–10 có test; ghi PASS/FAIL từng AC trong completion report
- [ ] Chạy thật, paste output: `pnpm --filter @opchub/integrations test`, `pnpm --filter @opchub/server test`, `pnpm --filter @opchub/server test:int -- sso`, `pnpm -r typecheck`, `pnpm -r lint`, e2e MSW `auth-flows.spec.ts`
- [ ] HANDOFF rule 2: controller mỏng → service → repository (identity upsert ở repository)
- [ ] security.md: cookie `httpOnly` + path hẹp + `sameSite=lax`; so state timing-safe; không log secret/code/token
- [ ] Adapter: domain chỉ phụ thuộc interface `SsoProvider` qua token `SSO`
- [ ] Viết `coding-packs/reports/TIP-V2-116-completion.md`; cập nhật dòng V2-116 trong `02-TASK-GRAPH.md`
- [ ] `git status --short` sạch, commit, báo DONE kèm Git SHA
