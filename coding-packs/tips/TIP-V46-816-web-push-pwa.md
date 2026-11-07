# TIP-V46-816: Web Push + PWA thật (B1, D-137)

## HEADER

- TIP-ID: TIP-V46-816
- Project: OPCHUB
- Module: notification (đẩy theo thiết bị), integrations (adapter `push`), settings (Ứng dụng & thông báo), worker (queue `push`), Portal (manifest, service worker, bật thông báo, công tắc theo loại), Admin (đăng ký thiết bị để gửi thử)
- Priority: P2
- Depends on: V46-815 (đã merge, `dev` = `ad4c5434`)
- Estimated: L
- REQ / D:
  - **D-137** (B1: Web Push qua dịch vụ đẩy của trình duyệt, VAPID, `web-push`, `push_subscriptions`, manifest + service worker, công tắc theo TV, test bằng máy chủ đẩy giả). Thay phần "PWA / Web Push để sau" của **D-125**.
  - REQ-629, BR-492, BR-493, VM-463
  - D-103 (không gọi dịch vụ thật trong test), D-52 (bảng `notifications` dùng chung TV + TK quản trị)
  - Câu hỏi mở: **Q-V46-816-1 → 6** (cuối file)
- **Files touched:**
  - **Tài liệu kiến trúc**
    - `docs/adr/0010-web-push.md` (create)
    - `docs/adr/README.md` (modify: thêm dòng 0009, 0010)
  - **DB**
    - `packages/db/prisma/schema/notification.prisma` (modify: model `PushSubscription`, `PushPreference`)
    - `packages/db/prisma/migrations/20261116090000_v46_web_push/{migration,down}.sql` (create)
  - **Shared**
    - `packages/shared/src/api-domains/push.ts` (create): `pushSubscribeSchema` (endpoint https, `keys.p256dh`, `keys.auth`, `userAgent?`), `pushPreferencesSchema` (`Record<AppPushKind, boolean>`), `pushPublicConfigSchema` (`{ enabled, vapidPublicKey }`), `pushPayloadSchema` (`{ title, body, link, tag }`)
    - `packages/shared/src/api-domains/index.ts` (modify: 1 dòng)
    - `packages/shared/src/queues/queues.ts` (modify: `QUEUES.push`, `jobs.push.send: { notificationIds: string[] }`)
    - `packages/shared/src/api-domains/app-notify.ts` (modify chỉ nếu cần kiểu `AppPushKind` export)
    - `packages/shared/src/mock-data/domains/push.ts` (create) + `mock-data/domains/index.ts` (modify)
  - **Integrations**
    - `packages/integrations/src/push/{types,fake.provider,webpush.provider,index}.ts` (create), `fake.provider.spec.ts`, `webpush.provider.spec.ts` (create)
    - `packages/integrations/src/index.ts` (modify)
    - `packages/integrations/package.json`, `pnpm-workspace.yaml` (catalog), `pnpm-lock.yaml` (modify: `web-push` + `@types/web-push`; ghi lý do dependency)
  - **Server**
    - `apps/server/src/common/config/env.schema.ts` (modify: `PUSH_PROVIDER` fake | webpush, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; bắt buộc ở production khi `webpush`)
    - `apps/server/.env.example` (modify)
    - `apps/server/src/common/integrations/integrations.module.ts` (modify: token `PUSH` + factory)
    - `apps/server/src/common/queue/queue.service.ts` (modify: `DEFAULT_OPTS.push`)
    - `apps/server/src/modules/notification/repositories/push-subscription.repository.ts` (create)
    - `apps/server/src/modules/notification/services/push-subscription.service.ts` (create: đăng ký / hủy / tùy chọn)
    - `apps/server/src/modules/notification/services/push-dispatch.service.ts` (create: lọc theo cấu hình Admin + tùy chọn TV, gửi, xóa endpoint 404 / 410)
    - `apps/server/src/modules/notification/domain/push-kind.ts` (create: ánh xạ thông báo → loại đẩy)
    - `apps/server/src/modules/notification/domain/push-payload.ts` + `push-payload.spec.ts` (create: cắt + lọc nội dung đẩy)
    - `apps/server/src/modules/notification/services/notification.service.ts` (modify: sau `createMany`, xếp job `push.send` cho các dòng có loại đẩy)
    - `apps/server/src/modules/notification/controllers/push.controller.ts` (create)
    - `apps/server/src/modules/notification/notification-core.module.ts`, `notification-http.module.ts`, `index.ts` (modify)
    - `apps/server/src/worker/processors/push.processor.ts` (create)
    - `apps/server/src/worker/worker-app.module.ts` (modify)
    - `apps/server/src/modules/notification/services/notification-events.handler.ts` (modify: gắn loại đẩy cho thông báo nhắc tên / trả lời, gia hạn, sự kiện)
    - `apps/server/src/modules/settings/services/app-notify.service.ts` (modify: gửi thử có loại đẩy `test`)
    - `apps/server/src/modules/system/housekeeping.service.ts` (modify: bước xóa đăng ký không dùng > 90 ngày)
  - **Portal**
    - `apps/portal/src/app/manifest.ts` (create)
    - `apps/portal/public/icons/{icon-192,icon-512,icon-maskable-512}.png` (create, từ logo hiện có)
    - `apps/portal/public/sw.js` (create: chỉ `push` + `notificationclick`, không cache ngoại tuyến)
    - `apps/portal/src/app/layout.tsx` (modify: `metadata.manifest`, `appleWebApp`, theme color)
    - `apps/portal/src/features/push/` (create): `push-api.ts`, `hooks/use-push-subscription.ts`, `hooks/use-push-preferences.ts`, `components/push-enable-button.tsx`, `components/push-preferences.tsx`, `register-sw.ts`
    - `apps/portal/src/features/profile/components/profile-screen.tsx`, `types.ts` (modify: tab "Thông báo")
    - `apps/portal/src/mocks/handlers/push.ts` (create), `mocks/handlers/index.ts` (modify)
    - `apps/portal/messages/*/profile.json` (modify: khóa mới cho 10 ngôn ngữ, D-65; ngôn ngữ ngoài `vi` để chữ tiếng Việt nếu chưa có bản dịch, ghi completion)
  - **Admin**
    - `apps/admin/public/sw.js` (create, scope `/admin/`)
    - `apps/admin/src/features/settings/components/app-notify-device.tsx` (create: "Bật thông báo trên thiết bị này")
    - `apps/admin/src/features/settings/components/app-notify-tab.tsx` (modify: chèn khối trên)
    - `apps/admin/src/features/settings/app-notify-api.ts` (modify)
    - `apps/admin/src/mocks/handlers/app-notify.ts` (modify)
    - `apps/admin/messages/vi/settings.json` (modify)
  - **Hạ tầng (chỉ file cấu hình, không chạy trên VPS)**
    - `infra/nginx/app.opchub.community.conf`, `infra/nginx/opchub.conf` (modify: `Cache-Control: no-cache` cho `/sw.js`, `/admin/sw.js`, `/manifest.webmanifest`)
  - **Test**
    - `apps/server/test/notification/push-subscriptions.int.spec.ts`, `push-dispatch.int.spec.ts` (create)
    - `apps/server/test/settings/app-notify.int.spec.ts` (modify: thay ca "không outbox / không queue" ở L88-107 bằng ca gửi thử đẩy)
    - `apps/server/src/common/config/env.schema.spec.ts` hoặc `bot-env.spec.ts` (modify: ca env push)
    - `apps/portal/src/features/push/**/*.spec.tsx`, `apps/admin/src/features/settings/components/app-notify-device.spec.tsx` (create)
    - `e2e/server/push-stub.ts` (create: máy chủ đẩy giả ghi lại POST), `e2e/playwright.server.config.ts` (modify: webServer stub)
    - `e2e/behavior/web-push.spec.ts` (create), `e2e/behavior/app-notify.spec.ts` (modify)
  - **Báo cáo**
    - `coding-packs/reports/TIP-V46-816-completion.md` (create), `TIP-V46-816-query-plans.md` (create)
    - `coding-packs/reports/V4.6-progress.md` (dòng #16), `coding-packs/plans/V4.6-DEBT.md` (B1), `coding-packs/reports/ui-parity/questions.md`
    - `coding-packs/standards/global/domain-glossary.md` ("Thông báo đẩy", "Đăng ký thiết bị")
- **Parallel-safe with:** sequential. TIP cuối đợt trả nợ. Dùng chung `notification`, `settings`, `worker-app.module.ts`, `integrations.module.ts`, `env.schema.ts`, `.env.example` với các TIP trước (đã merge).

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-816-web-push-pwa` tách từ `dev` `ad4c5434`.
- **DB / dịch vụ:** dùng DB riêng đã được owner duyệt (int `opchub_v46_801_test` + Redis 6381 DB2; native `opchub_v46_812_dev` + Redis 6381 DB3, API 4310). Hỏi owner trước khi migrate / seed / chạy e2e server. Khi chạy Playwright nhớ `SKIP_SEED=1` hoặc dùng wrapper trỏ DB riêng, để fixture không seed vào `opchub_dev` native (sự cố đã gặp ở 815). Không đụng Postgres native / Redis 6379, không tắt HOLD.
- Migration mới nhất: `20261115090000_v46_regional_mail_kinds`.
- **Cấu hình có sẵn (TIP-811):**
  - `app_settings.app = { pwa, push: { msg, need, renew, event, store } }` (mặc định `store: false`)
  - Schema `packages/shared/src/api-domains/app-notify.ts` (`APP_PUSH_KINDS`)
  - Service `settings/services/app-notify.service.ts`: `patch` khóa dòng + audit `settings.app`; `test()` ghi audit `settings.app_test` rồi `notify()` thông báo trong app "Thông báo thử từ OPC Hub" cho chính Admin
  - Route `admin/settings/app` (`settings.general`); Admin tab `app-notify-tab.tsx`
  - Int test `app-notify.int.spec.ts:88-107` đang **khẳng định không có outbox / queue** khi gửi thử. Ca này phải đổi theo D-137 (5).
- **Thông báo:**
  - `NotificationService.notify(items)` (`notification.service.ts:100`): `createMany` → giữ 50 / người → phát socket `notification.new` tới phòng `user:{id}`. Đây là **một điểm móc duy nhất** cho đẩy.
  - `NotifyItem = { id?, userId, type, title, body, link }`; `type` ∈ `mention | event | group | verify | membership | invest | affiliate | system`. Không có trường "loại đẩy".
  - Thông báo được tạo trong consumer outbox (`notification.processor.ts`, `event.processor.ts`) và vài handler khác.
- **5 loại đẩy so với nơi đang tạo thông báo:**

  | Loại | Hiện có thông báo trong app? | Nguồn |
  |---|---|---|
  | msg | **Có**: nhắc tên / trả lời | `chat/message.service.ts:173-192` → outbox `chat.mentioned` → `notification-events.handler.ts:42-76` (`type: 'mention'`) |
  | renew | **Có** | `renewal-delivery.service.ts:43-50` + `admin-fees.service.ts:214-221` → `membership_fee.reminded` → handler `:172-182` (`type: 'membership'`) |
  | event | **Có, chỉ trước 24 giờ** | `event-scheduler.service.ts` (`events-sweep` 15 phút, `REMIND_BEFORE_MS = 24h`) → `event.reminder_due` → handler `:212-233`. **Chưa có mốc 1 giờ** |
  | need | **Không** | `need-match.service.ts` chỉ tính khi đọc (cache 60 giây). B14 (để sau) |
  | store | **Không** | Có bảng `store_daily_views`; chưa có job tổng hợp / thông báo |

- **Hạ tầng queue:**
  - `QUEUES` (`packages/shared/src/queues/queues.ts`): payload chỉ chứa id.
  - Mẫu processor: `mail.processor.ts:24-43`. Đăng ký ở `worker-app.module.ts`.
  - `queue.service.ts` ghi chú: chỉ xếp job từ handler outbox / scheduler. `notify()` luôn chạy trong consumer outbox / handler, nên xếp job đẩy ở đó là đúng chỗ.
- **Mẫu adapter:**
  - `packages/integrations/src/mail/` (`types`, `fake.provider`, `smtp`, `brevo`)
  - Factory `integrations.module.ts:35-59`, chọn theo env, có fake
  - Env có guard production (`env.schema.ts:134-158`)
- **Portal:**
  - Chưa có manifest / icon PWA / service worker push.
  - **Ở chế độ MSW**, `instrumentation-client.ts:8-13` đăng ký `mockServiceWorker.js` scope `/`. Service worker đẩy thật **chỉ đăng ký khi `NEXT_PUBLIC_API_MOCKING === 'off'`**, nếu không sẽ tranh scope với MSW.
  - Chưa có bảng / chỗ lưu tùy chọn thông báo theo TV. Hồ sơ có tab ở `features/profile/types.ts:4` (`PROFILE_TABS`).
  - Không CSP; Nginx `Permissions-Policy` không chặn `notifications`.
- **Admin:**
  - Chạy dưới basePath `/admin`; TK quản trị nằm bảng `admin_users` khác bảng TV.
  - Thông báo trong app của Admin dùng chung bảng `notifications` (D-52), nên đăng ký đẩy cũng phải phân biệt realm.
- **e2e:**
  - Mẫu stub `e2e/server/dlpl-stub.ts` (webServer). Quyền thông báo: `context.grantPermissions(['notifications'])` (mẫu `membership.spec.ts:20`).
  - Endpoint đăng ký do trình duyệt cấp; trong test, gọi API đăng ký với endpoint trỏ về stub, không dùng endpoint thật của trình duyệt.

## APPLICABLE STANDARDS

- [integrations/adapters](../standards/integrations/adapters.md): dịch vụ đẩy chỉ qua adapter `packages/integrations/src/push`; dev / test dùng fake; không gọi thật trong test (D-103).
- [security/security](../standards/security/security.md):
  - VAPID private key chỉ ở env VPS, không commit, không log
  - endpoint / khóa thiết bị là dữ liệu nhạy cảm: không log, không trả lại cho client khác
  - nội dung đẩy không chứa dữ liệu cá nhân nhạy cảm
- [backend/queues-workers](../standards/backend/queues-workers.md): queue `push`, payload chỉ id, idempotent, giới hạn thử lại.
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) · [backend/api-conventions](../standards/backend/api-conventions.md) · [backend/auth-rbac](../standards/backend/auth-rbac.md)
- [database/prisma-migrations](../standards/database/prisma-migrations.md) · [database/query-indexing](../standards/database/query-indexing.md)
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md) · [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/git-workflow](../standards/global/git-workflow.md)

## TASK

Làm Web Push + PWA thật cho OPC Hub qua **dịch vụ đẩy sẵn có của trình duyệt**:

- **Server:** ký VAPID bằng `web-push`, gửi qua queue `push`.
- **Portal:**
  - cài lên màn hình chính bằng manifest
  - service worker hiển thị thông báo
  - nút "Bật thông báo"
  - công tắc từng loại thông báo trong hồ sơ
- **Admin:** "Gửi thông báo thử" đẩy tới thiết bị của chính Admin.
- **Phạm vi đẩy:** chỉ đẩy cho các thông báo trong app **đã có** (nhắc tên / trả lời, nhắc gia hạn, sự kiện trước 24 giờ), theo công tắc Admin và công tắc TV.

## SPECIFICATIONS

### Dữ liệu

1. **`push_subscriptions`:**
   - Cột:
     - `id uuid7`, `realm` (`member | admin`), `user_id` (text, không FK, D-52)
     - `endpoint text UNIQUE`, `p256dh text`, `auth text`, `user_agent text?`
     - `created_at`, `last_success_at?`, `failure_count int default 0`
   - Index `(realm, user_id)`.
   - Đăng ký lại cùng `endpoint` → cập nhật chủ sở hữu + khóa (upsert theo `endpoint`). Mỗi người tối đa 10 thiết bị: thêm cái thứ 11 thì xóa cái cũ nhất.
2. **`push_preferences`:**
   - Cột: `realm`, `user_id` (PK kép), `kinds jsonb` (`Record<AppPushKind, boolean>`), `updated_at`.
   - Không có dòng = theo mặc định Admin (mọi loại Admin đang bật đều bật).
3. Migration có `down.sql`. Không đổi bảng `notifications`.

### Adapter

4. `PushProvider { name; send(subscription, payload, { ttl, urgency }): Promise<{ ok } | { gone } | { retry } > }`.
   - **`WebPushProvider`** dùng `web-push`, `setVapidDetails(subject, public, private)`.
     - 201 / 2xx → `ok`
     - 404 / 410 → `gone`
     - 429 / 5xx / lỗi mạng → `retry` (`IntegrationError` retryable)
     - 400 / 413 → lỗi không thử lại
   - **`FakePushProvider`** ghi vào bộ nhớ. Tùy chọn gửi HTTP tới URL stub khi endpoint là `http://127.0.0.1`, để e2e xem được payload.
   - Không log endpoint đầy đủ / khóa.
5. **Env:**
   - `PUSH_PROVIDER` (mặc định `fake`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` hoặc `https:`)
   - Production + `webpush` mà thiếu khóa → env lỗi khi khởi động. Production + `fake` → cấm (như `SSO_PROVIDER`).
   - `.env.example` chỉ có tên biến + chú thích "owner tự tạo bằng `npx web-push generate-vapid-keys`".

### API

6. Mỗi realm một bộ (cùng controller, `@AllowRealm('member', 'admin')`, chủ sở hữu lấy từ phiên):
   - `GET /v1/push/config` → `{ enabled, vapidPublicKey }`. `enabled = app_settings.app.pwa && PUSH_PROVIDER đã cấu hình`. Public key lấy từ env server, không dùng biến `NEXT_PUBLIC_`.
   - `POST /v1/push/subscriptions` body `pushSubscribeSchema` → 201.
     - `pwa` tắt → 409 "Ứng dụng & thông báo đang tắt".
     - Endpoint không phải `https://` → 400. Ngoại lệ: `http://127.0.0.1` chỉ khi `NODE_ENV !== 'production'`.
   - `DELETE /v1/push/subscriptions` body `{ endpoint }`: chỉ xóa của chính mình.
   - `GET` / `PUT /v1/push/preferences` → `pushPreferencesSchema` (chỉ realm `member`; Admin dùng mặc định).
   - Không cần audit (thao tác của chính người dùng, không phải thao tác Admin).

### Gửi đẩy

7. `notify()`: sau `createMany`, với các dòng có `push` (loại đẩy):
   - xếp **một** job `push.send` mang `notificationIds` (≤ 500 / job, theo lô)
   - `jobId` ổn định theo id thông báo, để retry outbox không đẩy trùng
8. Ánh xạ loại đẩy **do nơi gọi khai báo**, qua trường mới `push?: AppPushKind | 'test'` trong `NotifyItem`; không suy từ `type`. Gắn ở:
   - `chat.mentioned` → `msg`
   - `membership_fee.reminded` → `renew` (chỉ thông báo nhắc gia hạn, không gắn cho thông báo kích hoạt phí)
   - `event.reminder_due` → `event`
   - gửi thử Admin → `test`

   **Không** gắn cho thông báo khác.
9. Processor `push.send`:
   - đọc thông báo theo id
   - lọc:
     - `app_settings.app.pwa` bật
     - `push[kind]` Admin bật (`test` bỏ qua công tắc loại)
     - tùy chọn TV cho loại đó bật (realm `member`)
   - đọc đăng ký của người nhận theo lô (1 truy vấn `WHERE (realm, user_id) IN …`, không vòng lặp truy vấn)
   - gửi song song có giới hạn (10)
   - `gone` → xóa đăng ký
   - `retry` → ném lỗi để BullMQ thử lại (`attempts 5`, backoff mũ). Mỗi thiết bị đã gửi thành công được đánh dấu `last_success_at` và bỏ qua ở lần thử lại.
   - quá `failure_count ≥ 20` → xóa
10. **Payload:**
    - `{ title, body, link, tag: notificationId }`
    - `title` / `body` lấy từ thông báo nhưng **cắt** (title ≤ 60, body ≤ 120)
    - **lọc dữ liệu nhạy cảm** bằng `maskPii` (811), che SĐT / email / số TK; số tiền dạng `\d{1,3}(\.\d{3})+ ?(đ|₫|VND)` thay "[số tiền]"
    - `link` là đường dẫn tương đối trong Portal / Admin
    - `ttl` 24 giờ, `urgency: 'normal'` (`test`: `high`)
11. Housekeeping: xóa đăng ký không có `last_success_at` lẫn `created_at` trong 90 ngày, theo lô.

### Portal

12. **`app/manifest.ts`:**
    - `name` "OPC Hub", `short_name` "OPC Hub", `start_url` `/dashboard`, `display: 'standalone'`, `lang: 'vi'`
    - `theme_color` / `background_color` theo theme
    - icon 192 / 512 / maskable từ logo hiện có

    `layout.tsx` thêm `appleWebApp` (iOS). Khi `pwa` tắt, manifest vẫn phục vụ được (tĩnh), nhưng nút bật thông báo ẩn (Q-V46-816-4).
13. **`public/sw.js`:**
    - `push` → `showNotification(title, { body, icon, badge, tag, data: { link } })`
    - `notificationclick` → focus tab có sẵn hoặc `clients.openWindow(link)`
    - **Không** cache ngoại tuyến, không fetch handler
    - Đăng ký chỉ khi `NEXT_PUBLIC_API_MOCKING === 'off'`, scope `/`
14. **Tab "Thông báo" trong Hồ sơ:**
    - Nút "Bật thông báo trên thiết bị này": `Notification.requestPermission()` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → `POST` subscriptions.
    - Trạng thái theo quyền trình duyệt / đăng ký: "Đang bật trên thiết bị này" / "Đã chặn trong trình duyệt" / "Trình duyệt không hỗ trợ". Trên iOS chưa cài thì hiện "Thêm OPC Hub vào màn hình chính để nhận thông báo".
    - "Tắt trên thiết bị này" → `unsubscribe` + `DELETE`.
    - 5 công tắc loại (chữ như Admin `settings.json` app.*). Loại Admin đang tắt → công tắc mờ + "Quản trị đã tắt loại này". `need` / `store` hiện mờ "Sắp có" (Q-V46-816-1).
    - `config.enabled = false` → ẩn cả tab.
15. Chữ giao diện tiếng Việt. Khóa thêm vào 10 bộ `messages/*` (D-65); bản dịch ngoài `vi` dùng tiếng Việt tạm, ghi completion.

### Admin

16. Tab Ứng dụng & thông báo thêm khối "Thiết bị này":
    - nút "Bật thông báo trên thiết bị này" (`/admin/sw.js`, scope `/admin/`, realm `admin`)
    - trạng thái như Portal
17. "Gửi thông báo thử" giữ hành vi cũ: audit + thông báo trong app. Thêm đẩy tới các thiết bị realm `admin` của chính Admin (D-137 (5)).
    - Toast thêm: "Đã gửi tới {n} thiết bị", hoặc "Chưa có thiết bị nào bật thông báo" khi n = 0.
    - n đếm số đăng ký tại lúc gửi, không chờ kết quả đẩy.

### Validation

- `pushSubscribeSchema`: `endpoint` URL ≤ 2048; `keys.p256dh` / `keys.auth` base64url ≤ 200; `userAgent` ≤ 300; strict.
- `pushPreferencesSchema`: đủ 5 khóa boolean, strict.
- Payload ≤ 3 KB sau mã hóa (giới hạn dịch vụ đẩy là 4 KB).

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| `pwa` tắt khi đăng ký | 409; Portal ẩn nút |
| Trình duyệt từ chối quyền | Không gọi API; hiện "Đã chặn trong trình duyệt" |
| Endpoint trả 404 / 410 | Xóa đăng ký, không lỗi job |
| 429 / 5xx / mạng | Thử lại (5 lần, backoff mũ), thiết bị đã thành công không gửi lại |
| Thiếu VAPID ở production | Server không khởi động (env lỗi) |
| `PUSH_PROVIDER` chưa cấu hình ở dev | `config.enabled = false`; job bỏ qua, log `debug` |
| Người nhận không có thiết bị | Job xong, không lỗi; thông báo trong app vẫn có |
| Đăng ký endpoint của người khác | Upsert chuyển chủ sở hữu sang người vừa đăng ký (thiết bị đổi TK) |

## ACCEPTANCE CRITERIA

- **Đăng ký:** Given TV đăng nhập, `pwa` bật When `POST /push/subscriptions` Then 201, có dòng realm `member`. Đăng ký lại cùng endpoint thì không tạo dòng mới. Thiết bị thứ 11 thay cái cũ nhất. `pwa` tắt → 409. Test: int `push-subscriptions.int.spec.ts` › `subscribe upsert cap and pwa off`.
- **Gửi theo loại:** Given TV có 2 thiết bị (endpoint trỏ stub), Admin bật `msg` When có người nhắc tên TV Then stub nhận đúng 2 POST, payload có `title` / `body` đã cắt và lọc, `tag` = id thông báo, `link` tới phòng. Admin tắt `msg`, hoặc TV tắt `msg` → 0 POST nhưng thông báo trong app vẫn có. Test: int `push-dispatch.int.spec.ts` › `mention push respects admin and member switches`.
- **Gia hạn / sự kiện:** `membership_fee.reminded` → đẩy `renew`; `event.reminder_due` → đẩy `event`. Thông báo kích hoạt phí / đăng ký sự kiện **không** đẩy. Test: int `› renew and event kinds only`.
- **Dọn đăng ký chết:** Given stub trả 410 cho 1 endpoint Then đăng ký đó bị xóa, endpoint còn lại vẫn nhận. Stub trả 503 một lần → job thử lại, thiết bị đã thành công không nhận lần 2. Test: int `› gone removed and retry once`.
- **Không trùng:** cùng sự kiện outbox giao 2 lần → mỗi thiết bị nhận 1 lần. Test: int `› outbox replay pushes once`.
- **Bảo mật nội dung:** thông báo chứa SĐT / email / số tiền → payload đã che. Test: unit `push-payload.spec.ts`.
- **Gửi thử Admin:** Given Admin có 1 thiết bị realm `admin` When "Gửi thông báo thử" Then audit `settings.app_test`, thông báo trong app có, stub nhận 1 POST `urgency high`, toast "Đã gửi tới 1 thiết bị". Không thiết bị → "Chưa có thiết bị nào bật thông báo". Test: int `app-notify.int.spec.ts` (ca cũ L88-107 thay bằng ca này); e2e `app-notify.spec.ts`.
- **Env:** production + `webpush` thiếu VAPID → `parseEnv` lỗi; production + `fake` → lỗi. Test: unit env.
- **Portal:** Given server mode, quyền `notifications` đã cấp When bấm "Bật thông báo trên thiết bị này" Then trạng thái "Đang bật trên thiết bị này". Tắt loại `event` → `PUT /push/preferences` lưu, F5 giữ. Manifest `/manifest.webmanifest` hợp lệ (name, icons, start_url). Test: unit `push-enable-button.spec.tsx`, `push-preferences.spec.tsx`; e2e `web-push.spec.ts` (server; MSW: tab hiển thị đúng, không đăng ký SW thật).
- **Không tranh SW ở MSW:** e2e MSW toàn bộ không tụt; `mockServiceWorker.js` vẫn điều khiển trang.
- **Query:** EXPLAIN đọc đăng ký theo lô `(realm, user_id) IN (…)` dùng index → `TIP-V46-816-query-plans.md`.
- **Không hồi quy:** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build` xanh; `pnpm e2e` MSW không tụt; e2e server cho `app-notify`, `web-push`, chat mention, renewal.

## CONSTRAINTS

- DO NOT:
  - dùng dịch vụ đẩy trả phí / SDK bên thứ ba (OneSignal, Firebase SDK…)
  - commit / log VAPID private key, endpoint, khóa thiết bị
  - gửi đẩy thật trong test
  - đẩy nội dung có SĐT / email / số tiền / số TK
  - đẩy mà không có thông báo trong app tương ứng
  - cache ngoại tuyến / fetch handler trong `sw.js`; đăng ký SW thật ở chế độ MSW
  - tạo nguồn thông báo mới cho `need`, `store`, sự kiện trước 1 giờ (Q-V46-816-1, Q-V46-816-2)
  - Zalo (D-125)
  - truy vấn trong vòng lặp; `select *`
  - `any`, `@ts-ignore`, `console.*`
  - chạy gì trên VPS; sửa `.env` thật; tự merge PR
- REUSE:
  - mẫu adapter `packages/integrations/src/mail/*` + factory `integrations.module.ts`
  - mẫu processor `mail.processor.ts`, `WorkerFactory`, `QueueService`
  - `NotificationService.notify`, `AppSettingsService.app()`
  - `maskPii` (811)
  - mẫu stub `e2e/server/dlpl-stub.ts`
  - mẫu housekeeping xóa theo lô
- SKIP:
  - nguồn thông báo `need` (B14), `store` (tổng hợp hằng ngày), sự kiện trước 1 giờ (Q-V46-816-1, 2)
  - đẩy cho thông báo khác ngoài 3 loại + gửi thử
  - PWA ngoại tuyến
  - tùy chọn loại đẩy cho Admin
  - thống kê tỷ lệ nhận

## Câu hỏi chờ owner chốt (builder dùng mặc định nếu chưa có trả lời, ghi `questions.md` › TIP-V46-816)

- **Q-V46-816-1 Loại "Nhu cầu phù hợp" và "Lượt xem & liên hệ gian hàng".** Hai loại này hiện chưa có thông báo trong app nào để đẩy theo.
  - **Mặc định:** chưa đẩy. Công tắc Admin vẫn lưu được; ở Portal hai loại hiện mờ kèm chữ "Sắp có".
  - Làm nguồn thông báo cho hai loại này là việc riêng, đã ghi trong nợ B14.
- **Q-V46-816-2 Nhắc sự kiện "trước 1 giờ".** Hiện chỉ có mốc trước 24 giờ.
  - **Mặc định:** chỉ đẩy mốc 24 giờ đang có. Mốc 1 giờ cần thêm cột và job mới, để sau.
  - Phương án khác: làm luôn mốc 1 giờ trong TIP này.
- **Q-V46-816-3 Chỗ thành viên tắt từng loại thông báo.**
  - **Mặc định:** thêm tab mới "Thông báo" trong Hồ sơ.
- **Q-V46-816-4 Khi Admin tắt "Cho phép cài ứng dụng" (PWA).**
  - **Mặc định:** ẩn tab Thông báo, từ chối đăng ký mới và ngừng gửi đẩy. Các đăng ký cũ giữ lại; bật lại thì gửi tiếp.
- **Q-V46-816-5 Admin bật thông báo ở đâu để nhận gửi thử.**
  - **Mặc định:** ngay trong tab Ứng dụng & thông báo của Admin, khối "Thiết bị này", tách riêng với thiết bị của tài khoản thành viên.
- **Q-V46-816-6 Mỗi người tối đa bao nhiêu thiết bị.**
  - **Mặc định:** 10. Thêm thiết bị thứ 11 thì thiết bị cũ nhất bị thay.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-816-web-push-pwa`; chỉ sửa file trong **Files touched**.
- [ ] Hỏi owner DB đích trước khi migrate / seed / e2e server. Playwright luôn `SKIP_SEED=1` hoặc wrapper DB riêng. Không tắt HOLD.
- [ ] Viết ADR-0010 trước khi code (dịch vụ ngoài mới + service worker); ghi lý do dependency `web-push`.
- [ ] Baseline `dev` (gate + e2e MSW) trước khi sửa.
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật. Chép tóm tắt output: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`, `pnpm e2e`, e2e server.
- [ ] EXPLAIN truy vấn đăng ký → `TIP-V46-816-query-plans.md`.
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 11 / D-103:** đẩy chỉ qua adapter; test dùng fake / stub, không gửi thật
  - **Luật 12:** env mới có trong `.env.example` + zod env; không secret trong repo / log
  - **Luật 5:** đọc đăng ký theo lô, không truy vấn trong vòng lặp
  - **D-137 (4):** nội dung đẩy ngắn, đã che dữ liệu nhạy cảm; luôn có thông báo trong app
  - **Luật 13:** test ở file riêng
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`.
- [ ] Ghi Q-V46-816-1 → 6 vào `questions.md`. Cập nhật `V4.6-progress.md` dòng #16, `V4.6-DEBT.md` B1, glossary.
- [ ] Ghi vào completion việc owner phải làm khi lên production:
  - tạo VAPID key (`npx web-push generate-vapid-keys`)
  - đặt `PUSH_PROVIDER=webpush` + 3 biến VAPID trong env VPS
  - cho VPS gọi HTTPS ra `fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.push.apple.com`
  - cập nhật Nginx (`no-cache` cho `sw.js` / manifest)
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`). `git status --short` sạch; push; PR `base: dev`; không tự merge. Completion có **git commit SHA**.
- [ ] KHÔNG báo DONE nếu còn gate đỏ.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched mức file theo lớp (ADR, DB, shared, adapter, server, Portal, Admin, hạ tầng, test)
- [x] Context:
  - cấu hình 811, điểm móc `notify()`, bảng 5 loại so với nguồn thông báo thật
  - tranh scope SW với MSW, Admin basePath / realm, test cũ L88-107 phải đổi
- [x] SPEC 1 → 17; validation; bảng lỗi
- [x] AC Given / When / Then có tên test; ca không trùng, dọn đăng ký chết, bảo mật nội dung
- [x] Constraints DO NOT / REUSE / SKIP; trích luật 5 / 11 / 12 / 13, D-103, D-137
- [x] Parallel: sequential, TIP cuối đợt trả nợ
- ⚠️ Gap:
  - D-137 ghi "5 loại đẩy" nhưng 2 loại (`need`, `store`) và mốc 1 giờ chưa có nguồn thông báo. TIP mặc định chỉ đẩy 3 loại đang có (Q-V46-816-1, 2); cần owner xác nhận.
  - Gửi đẩy thật tới trình duyệt chỉ kiểm được bằng tay sau khi owner có VAPID key; test tự động dùng stub.
  - iOS chỉ nhận khi đã thêm vào màn hình chính (16.4+); không có thiết bị iOS để kiểm tự động.
