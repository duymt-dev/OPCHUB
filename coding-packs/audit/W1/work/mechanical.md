# AUDIT-W1 · Làn A — 6 kiểm cơ học (phân tích tĩnh, không DB)

Ngày chạy: 2026-10-18 · HEAD `70cfcbb` · Script ở `apps/server/test/audit/*.audit.ts` (không khớp include vitest: `src/**/*.spec.ts`, `test/**/*.int.spec.ts`; đã kiểm `vitest list`). Qua `tsc --noEmit` + `eslint` của apps/server.

Chạy cả 6 kiểm (in console + ghi bảng thô `coding-packs/audit/W1/work/mechanical.generated.md`):

```
packages/db/node_modules/.bin/tsx apps/server/test/audit/run-all.audit.ts
```

Mức: **S1** chặn go-live · **S2** sai nghiệp vụ · **S3** UX · **S4** nhỏ · **NỢ** nợ kỹ thuật. Mức là gợi ý.

| Kiểm | Đạt | Không đạt | S1 | S2 | S3 | S4 | NỢ |
|---|---|---|---|---|---|---|---|
| 1 Outbox → consumer | 11 | 3 | 0 | 2 | 1 | 0 | 0 |
| 2 Link server → đích | 9 | 4 | 1 | 0 | 3 | 0 | 0 |
| 3 zod ≤ giới hạn body | 68 | 11 | 0 | 10 | 1 | 0 | 0 |
| 4 Transition §8 | 22 | 11 | 0 | 1 | 2 | 2 | 6 |
| 5 Permission → guard | 131 | 16 | 0 | 0 | 2 | 10 | 4 |
| 6 Env → .env.example | 117 | 15 | 0 | 0 | 0 | 15 | 0 |

---

## Kiểm 1 — Outbox → consumer

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c1-outbox.audit.ts`

Cách kiểm: lấy 14 khoá trong `packages/shared/src/outbox/events.ts`, tìm `relay.register('<type>')` (consumer, `apps/server/src/worker/processors/*`) và `outbox.add|addMany(tx, '<type>')` (nơi phát).

Đạt **11** · Không đạt **3**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S2 | `packages/shared/src/outbox/events.ts:18`; phát tại `apps/server/src/modules/account/services/admin-users.service.ts:84` | `user.locked` không có consumer. **Đã xác nhận**: theo D-15, khoá tài khoản phải ẩn dự án và chuyển nhóm làm chủ về Admin, nhưng không handler nào làm. Trong `modules/project` và `modules/community` cũng không chỗ nào lọc chủ đã bị khoá. Áp cho mọi đường khoá: khoá đơn, khoá hàng loạt, khoá qua kiểm duyệt `POST /admin/reports/:id/action` với action=lock. |
| 2 | S2 | `events.ts:19`; phát tại `admin-users.service.ts:89`, `password-reset.service.ts:77` | `user.session_revoked` không có consumer, và cũng không chỗ nào `publish(…, 'session.revoked')` lên kênh `socket:user`. `user-events.subscriber.ts:41` chỉ ngắt socket khi nhận sự kiện này, nên socket đang mở của TK bị khoá hoặc vừa đổi mật khẩu vẫn còn sống. `socket-auth.ts` chỉ kiểm khoá và perm_version lúc handshake, còn `message.gateway.ts` không kiểm lại. TK đã khoá vẫn gửi được tin qua socket cho tới khi tự ngắt kết nối. |
| 3 | S3 | `events.ts:23`; phát tại `admin-users.service.ts:128`, `settings/services/admin-accounts.service.ts:147` | `user.role_changed` không có consumer. Khi đổi hoặc thu hồi vai trò, phiên realtime không bị ngắt, dù comment ở admin-accounts.service ghi là sẽ "ngắt phiên realtime". |

Ghi chú thêm (không tính lỗi):
- `outbox-relay.service.ts:73`: loại sự kiện chưa có handler bị **đánh dấu dispatched** rồi bỏ qua. Vì vậy các sự kiện `user.*` ghi từ trước tới nay sẽ không được xử lý lại khi sau này thêm consumer.
- 11 loại còn lại có consumer: `membership_fee.activated` (fee + notification), `membership_fee.changed`, `mail.requested`, `group.join_requested`, `chat.mentioned`, `moderation.warned`, `group.request_decided`, `event.registered` (thông báo + mail), `campaign.send`, `export.requested`, `service_request.mentioned`.

---

## Kiểm 2 — Link do server sinh → đích có thật

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c2-links.audit.ts`

Cách kiểm: gom `${env.PORTAL_URL}/…`, `link:` của thông báo, hàm dựng `roomLink`, `loginUrl/guideUrl` trong seed mail chào mừng. So khớp với page Next ở `apps/{portal,admin}/src/app/**` (bỏ qua route group `(x)`, `[id]` khớp một đoạn, `[[...x]]` khớp 0 đoạn trở lên) và với route REST GET của server (đã cộng prefix `/v1`).

Đạt **9** · Không đạt **4**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S1 | `apps/server/src/modules/account/services/password-reset.service.ts:51` | Link mail quên mật khẩu là `PORTAL_URL/reset-password?token=…`, nhưng Portal không có trang này nên mở ra 404. API `POST /v1/auth/password/reset` có sẵn mà không màn nào gọi, nên người dùng không thể đặt lại mật khẩu. Admin cũng dùng chung `/auth/password/forgot` (`apps/admin/src/features/auth/api.ts`), nên link Admin nhận cũng trỏ về Portal. **Đã xác nhận.** |
| 2 | S3 | `apps/server/src/modules/notification/services/notification-events.handler.ts:116` | Thông báo phí đã kích hoạt có `link: '/membership'`, nhưng Portal chỉ có `/membership/pay`, nên ra 404 (`openInPlace` cũng không nhận path này). |
| 3 | S3 | `notification-events.handler.ts:154` | Thông báo @nhắc trong phiếu YC có `link: /requests?code=…`, dành cho màn Admin. Trang Admin `/requests` có tồn tại, nhưng hook thông báo của Admin không điều hướng (`apps/admin/src/features/shell/hooks/use-notifications.ts`) và feature requests không đọc `?code=`. Nếu người nhận mở ở Portal thì 404. |
| 4 | S3 | `packages/shared/src/fixtures/prototype-seed.json:1696` | Mail chào mừng có `guideUrl = https://opchub.community/huong-dan`, nhưng Portal không có trang `/huong-dan`. Giá trị lấy từ seed, Admin sửa được. |

Đạt: `/sso/callback`, `/events/:id` (mail và thông báo), `/chat/:g`, `/chat/:g/:room`, `/community`, `/login`, `PORTAL_URL/v1/uploads/*` (route GET `uploads/*key`).

Ghi chú thêm:
- Ở Admin, mở thông báo chỉ đánh dấu đã đọc, không điều hướng, nên mọi `notification.link` mà nhân sự nhận ở Admin đều là link chết (ảnh hưởng mục 3).
- SSO: `redirectUri = PORTAL_URL/sso/callback` không có tham số `provider`. Màn `sso-complete-screen.tsx` lại đọc `?provider=` và chỉ gọi API khi có tham số này. Hiện chỉ `FakeSsoProvider` tự gắn vào (xem Câu hỏi 2).
- Presign và S3: `S3_PUBLIC_URL` / `S3_ENDPOINT` là cấu hình hạ tầng (`s3.opchub.community` trong nginx), nên không kiểm tĩnh.

---

## Kiểm 3 — Giới hạn zod ≤ giới hạn body

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c3-body-limit.audit.ts`

Cách kiểm: với mỗi route có `@ZodBody(<schema>)`, chuyển schema sang JSON Schema (`z.toJSONSchema`) và ước lượng kích thước JSON tối đa mà zod cho qua (maxLength, maxItems, cộng dồn). Riêng trường ảnh của `projectSaveSchema` thì cộng thêm giới hạn 2.000.000 ký tự data URL của `ImageRefService`. Kết quả đem so với:
- body-parser JSON của Express trong Nest: `main-api.ts` và `bootstrap-http.ts` **không cấu hình**, nên dùng mặc định **100kb**;
- nginx `infra/nginx/snippets/opchub-backend.conf`: mức server **1m** áp cho mọi `/v1/*`, riêng `= /v1/webhooks/bank` 64k, `= /v1/auth/login` 16k, `~ ^/v1/auth/(register|otp)/` 64k. `s3.opchub.community` là 10m.

Đạt **68** · Không đạt **11**

| # | Mức | Vị trí | Endpoint · schema | zod cho tới | Vượt |
|---|---|---|---|---|---|
| 1 | S2 | `apps/server/src/modules/bot/bot.controller.ts:52` | POST /v1/admin/personas · `personaUpsertSchema.avatarUrl` max 7.000.000 | ≈6.7MB | 100kB body-parser, 1MB nginx |
| 2 | S2 | `bot.controller.ts:62` | PATCH /v1/admin/personas/:id · như trên | ≈6.7MB | như trên |
| 3 | S2 | `apps/server/src/modules/community/controllers/admin-groups.controller.ts:113` | POST /v1/admin/groups · `groupAdminUpsertSchema.coverUrl` max 2.000.000 | ≈1.9MB | như trên |
| 4 | S2 | `admin-groups.controller.ts:124` | PATCH /v1/admin/groups/:id · như trên | ≈1.9MB | như trên |
| 5 | S2 | `apps/server/src/modules/event/controllers/admin-events.controller.ts:48` | POST /v1/admin/events · `adminEventUpsertSchema.coverUrl` max 2.000.000 (**đã biết**: ảnh bìa ra 500) | ≈1.9MB | như trên |
| 6 | S2 | `admin-events.controller.ts:59` | PATCH /v1/admin/events/:id · như trên | ≈1.9MB | như trên |
| 7 | S2 | `apps/server/src/modules/project/controllers/projects.controller.ts:64` | POST /v1/projects · `projectSaveSchema.coverUrl` và `team[≤20].avatarUrl` (zod không có max, ImageRefService nhận data URL tới 2.000.000 ký tự) | ≈40MB lý thuyết; chỉ 1 ảnh bìa ~75kB là đã vượt | như trên |
| 8 | S2 | `projects.controller.ts:73` | PATCH /v1/projects/:id · như trên | như trên | như trên |
| 9 | S2 | `apps/server/src/modules/settings/controllers/settings.controller.ts:38` | PATCH /v1/admin/settings/general · `generalSettingsPatchSchema.logoUrl` max 2.800.000 | ≈2.7MB | như trên |
| 10 | S3 | `apps/server/src/modules/marketing/controllers/campaigns.controller.ts:63` | POST /v1/admin/campaigns · `campaignCreateSchema.body` max 100.000 | ≈105kB | 100kB body-parser (nginx cho qua) |
| 11 | S2 | `apps/server/src/common/filters/http-exception.filter.ts:44` | Lỗi của body-parser (`PayloadTooLargeError` 413 `entity.too.large`, và cả JSON hỏng 400 `entity.parse.failed`) không phải `HttpException`, nên rơi về `500 INTERNAL "Lỗi hệ thống"` kèm log error. **Đã xác nhận.** | — | — |

Ghi chú:
- FE gửi ảnh dạng data URL tại: `apps/admin/src/features/bots/components/persona-photo.tsx:32`, `events/components/event-form.tsx:23`, `groups/components/group-form.tsx:22`, `settings/components/logo-picker.tsx:30`, `apps/portal/src/features/projects/components/read-image.ts:10`. Base64 phình khoảng 4/3, nên ảnh gốc khoảng 75kB đã vượt 100kB, và khoảng 750kB thì vượt luôn 1MB của nginx (nginx trả 413 dạng HTML, không theo envelope).
- 102 trường chuỗi/mảng trong body **không có `.max`**, chỉ bị chặn bởi giới hạn body (danh sách đầy đủ ở `mechanical.generated.md`). Ví dụ: `bulkStatusSchema.userIds[]`, `assignGroupsSchema.*[]`, `userExportSchema.userIds[]`, `loginRequestSchema.password`, `registerBusinessSchema.otherIndustries[]`.
- Bỏ qua 3 schema khai báo cục bộ trong controller (`oneGroupExportSchema`, `fakeBankBodySchema`, `assignSchema`), đều nhỏ.

---

## Kiểm 4 — Transition §8 → endpoint + test

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c4-transitions.audit.ts`

Cách kiểm: mỗi cạnh §8 khai báo các mỏ neo (regex code transition, endpoint, test hợp lệ, test bị chặn). Script xác minh mỏ neo còn tồn tại và in `file:line`; mỏ neo không khớp thì ghi THIẾU. Endpoint được đối chiếu với route controller thật.

Đạt **22/28 cạnh** (đủ code, endpoint và test hợp lệ) · Không đạt **11**

### Bảng cạnh → code → endpoint → test

| Máy | Cạnh | Code | Endpoint | Test hợp lệ | Test bị chặn |
|---|---|---|---|---|---|
| Tài khoản | Hoạt động → Đã khóa | `account/repositories/admin-users.repository.ts:105` (`AND status = from`) | PATCH /admin/users/:id/status · POST /admin/users/status · POST /admin/reports/:id/action | `test/account/admin-users.int.spec.ts:69` | `admin-users.int.spec.ts:94` (409) |
| Tài khoản | Đã khóa → Hoạt động | `admin-users.repository.ts:101` | như trên (trừ reports) | `admin-users.int.spec.ts:69` | THIẾU |
| Phí | Chờ TT → Đang hiệu lực | `membership-fee/services/membership-fee.service.ts:67` + khoá version | POST /webhooks/bank · POST /admin/fees/:uid/:action · /admin/fees/collect · /admin/fees/transactions/:id/match | `test/membership-fee/reconcile.int.spec.ts:69` | `admin-fees.int.spec.ts:102` (khớp lần 2 → 409) |
| Phí | Đang hiệu lực → Sắp hết hạn | `membership-fee.repository.ts:60` (`WHERE status = 'active'`) | job worker `fee.sweep` | `reconcile.int.spec.ts:151` | `reconcile.int.spec.ts:151` (idempotent) |
| Phí | Sắp hết hạn → Hết hạn | `membership-fee.repository.ts:56` | job worker | `reconcile.int.spec.ts:151` | như trên |
| Phí | Hết hạn → Gia hạn → Đang hiệu lực | `membership-fee/domain/membership-fee.state.ts:9` | webhook · /admin/fees/:uid/{collect,renew} | `admin-fees.int.spec.ts:64` (collect hàng loạt user expired) | THIẾU; action `renew` không test nào gọi |
| Phí | Đang hiệu lực → Gia hạn nối tiếp | `membership-fee.state.ts:7` | webhook | `reconcile.int.spec.ts:89` | THIẾU |
| YC vào nhóm | Chờ duyệt → Thành viên | `community/repositories/join-request.repository.ts:59` (`gm.status = 'pending'`) | POST /groups/:id/requests/:userId/approve | `test/community/join-requests.int.spec.ts:58` | `:58` (lần 2 → **404**, không phải 409) |
| YC vào nhóm | Chờ duyệt → Từ chối | `join-request.repository.ts:59` | …/reject | `join-requests.int.spec.ts:80` | THIẾU |
| YC vào nhóm | Chờ duyệt → Hủy | `community/services/group.service.ts:69` | DELETE /groups/:id/join | `test/community/groups.int.spec.ts:75` | THIẾU |
| Dự án | Nháp → Chờ duyệt | `project/services/project-write.service.ts:105` | POST /projects · PATCH /projects/:id | `test/project/projects.int.spec.ts:35` | `projects.int.spec.ts:64` (Đã ẩn → 409) |
| Dự án | Chờ duyệt → Đang hiển thị | `project/domain/project-status.ts:9` | POST /admin/projects/:id/review · /bulk | `test/project/admin-projects.int.spec.ts:43` | `:43` (409) |
| Dự án | Đang hiển thị → Đã ẩn | `project-status.ts:12` | review · bulk | `admin-projects.int.spec.ts:71` | THIẾU |
| Dự án | Đã ẩn → Đang hiển thị | `project-status.ts:13` | review (`republish`) · bulk | **THIẾU** | THIẾU |
| Dự án | Chờ duyệt → Cần chỉnh sửa | `project-status.ts:10` | review (`request_changes`) | **THIẾU** | THIẾU |
| Dự án | Cần chỉnh sửa → Chờ duyệt | `project-status.ts:19` (OWNER_EDITABLE) | PATCH /projects/:id | **THIẾU** | THIẾU |
| Dự án | Chờ duyệt → Bị từ chối | `project-status.ts:11` | review | `admin-projects.int.spec.ts:50` | `:43` (thiếu ghi chú → 400) |
| Báo cáo tin | Mới → Đã xử lý (4 action) | `moderation/repositories/report.repository.ts:120` | POST /admin/reports/:id/action | `test/moderation/moderation.int.spec.ts:101`, `:121` (warn/lock) | `:101` (409) |
| ĐK sự kiện | Đã đăng ký → Đã tham dự | `event/repositories/event.repository.ts:179` | POST /admin/events/:id/registrations/check-in | `test/event/admin-events.int.spec.ts:103` | THIẾU (id đã hủy bị bỏ qua im lặng) |
| ĐK sự kiện | Đã đăng ký → Đã hủy | `event.repository.ts:121` | DELETE /events/:id/registration | `test/event/events.int.spec.ts:46` | `:46` (409) |
| Phiếu YC | Mới → Đang tư vấn | `packages/shared/src/api-domains/services-admin.ts:24` + `service-admin.service.ts` (`WHERE status = from`) | POST /admin/service-requests/:code/transition · PATCH /admin/service-requests/:code | `test/service/service.int.spec.ts:92` | `:91` (sai luồng 409), `:95` (from cũ 409) |
| Phiếu YC | Đang tư vấn → Đã báo giá | `services-admin.ts:25` | như trên | `test/contract/service-request.int.spec.ts:123` | THIẾU |
| Phiếu YC | Đã báo giá → Thành công | `services-admin.ts:26` | như trên | **THIẾU** | THIẾU |
| Phiếu YC | * → Từ chối | `services-admin.ts:24-26` | như trên | **THIẾU** | THIẾU |
| Phiếu YC | Từ chối → mở lại | `services-admin.ts:28` | như trên | **THIẾU** | THIẾU |
| Quan tâm ĐT | Đã gửi → Đang trao đổi | `investor/repositories/investor-admin.repository.ts:117`, `interest.repository.ts` advance | POST /investor-thread/:key/messages · POST /admin/investors/:key/comments | `test/investor/investors.int.spec.ts:93` | THIẾU |
| Quan tâm ĐT | Đang trao đổi → Đã kết nối | `investor-admin.repository.ts:110` | PATCH /admin/investors/:key/status | `investors.int.spec.ts:164` | THIẾU |
| Hội thoại bot | Chờ lịch → Đang chạy → Hoàn tất (server: `pending → posted`) | `bot/services/bot-thread.service.ts:99` | POST /admin/bot/threads/:id/approve | `test/bot/bot.int.spec.ts:75` | `:75` (duyệt lại 409) |

16/28 cạnh không có test cho nhánh bị chặn (409/404).

### Mục không đạt

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S2 | `apps/server/src/modules/investor/repositories/investor-admin.repository.ts:110` | `setStatus` cập nhật `updateMany({ where: { investorKey }, data: { status } })` mà **không có điều kiện `WHERE status = from`**, trái luật 7. Admin đặt được trạng thái bất kỳ, kể cả lùi từ Đã kết nối về Đã gửi, và không có hàm transition domain. |
| 2 | S3 | `apps/server/src/modules/bot/services/bot-thread.service.ts:99` | Server chỉ có 2 trạng thái `pending`/`posted` (`BotThreadStatus`). Mọi dòng được đăng một lần khi Admin duyệt. Không có trạng thái "Đang chạy" và không job nào chạy theo `runAt`/`delayMinutes`, dù hai trường này được lưu (`bot-catalog.service.ts:138`) mà không ai đọc. |
| 3 | S3 | `apps/server/src/modules/project/domain/project-status.ts:22` | `OWNER_EDITABLE` gồm cả `rejected` và `published`. Chủ dự án lưu lại sẽ tạo cạnh Bị từ chối → Chờ duyệt/Nháp và Đang hiển thị → Nháp, là các cạnh không có trong §8. Có thể chủ ý theo D-18, xem Câu hỏi 4. |
| 4 | S4 | `apps/server/src/modules/event/repositories/event.repository.ts:114` | Có thêm các cạnh ngoài §8: Đã hủy → Đã đăng ký (đăng ký lại) và Đã tham dự → Đã đăng ký (bỏ check-in). |
| 5 | S4 | `packages/shared/src/api-domains/services-admin.ts:27` | Phiếu YC có thêm trạng thái `done` (Hoàn thành) sau `won`, còn §8 dừng ở Thành công. |
| 6 | NỢ | `project-status.ts:13` | Đã ẩn → Đang hiển thị (`republish`): không test hợp lệ. |
| 7 | NỢ | `project-status.ts:10` | Chờ duyệt → Cần chỉnh sửa (`request_changes`): không test. |
| 8 | NỢ | `project-status.ts:19` | Cần chỉnh sửa → Chờ duyệt (chủ dự án gửi lại): không test. |
| 9 | NỢ | `services-admin.ts:26` | Phiếu YC Đã báo giá → Thành công: không test. |
| 10 | NỢ | `services-admin.ts:24-26` | Phiếu YC → Từ chối: không test. |
| 11 | NỢ | `services-admin.ts:28` | Phiếu YC Từ chối → mở lại: không test. |

Ghi chú: trong `membership-fee.state.ts`, mọi trạng thái đều được phép chuyển sang `active`, nên nhánh `conflict` của `canTransition(cur.status, 'active')` (`membership-fee.service.ts:67`) không bao giờ chạy. Bảo vệ thật đến từ khoá dòng cộng `version`.

---

## Kiểm 5 — Permission key → guard

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c5-permissions.audit.ts`

Cách kiểm: lấy 14 key từ `ALL_PERMISSIONS` (`packages/shared/src/permissions.ts`) và đếm số lần xuất hiện trong `@RequirePermission` (method hoặc class) của 44 controller. Mọi route `/v1/admin/**` phải có permission. Đồng thời tìm các chỗ so tên vai trò.

Đạt **131** (12/14 key được dùng; 119/119 route `/v1/admin/**` có guard hoặc kiểm trong service — 118 decorator + badges) · Không đạt **16**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S3 | `packages/shared/src/permissions.ts:3` | Key `m.role` không route và không service nào kiểm. Đổi vai trò dùng `s.role` (`admin-users.controller.ts:87`, D-42). Ở màn Phân quyền, Admin bật hay tắt `m.role` đều không có tác dụng. |
| 2 | S3 | `permissions.ts:5` | Key `p.edit` không route và không service nào kiểm. Mọi route `/admin/projects` và `/admin/investors` đều dùng `p.pub`, nên tách quyền sửa và duyệt dự án không có tác dụng. |
| 3 | NỢ | `apps/server/src/modules/service/services/service-admin.service.ts:28` | Danh sách cứng `ADMIN_ROLES = ['super_admin','admin','moderator']` dùng để lọc nhân sự. Kết quả vẫn đi qua `hasPermission(r,'n.edit')`, nhưng danh sách vai trò bị cứng hoá. |
| 4 | NỢ | `apps/server/src/modules/settings/services/admin-accounts.service.ts:59` | `u.systemRole === 'member'` (ánh xạ hiển thị). |
| 5 | NỢ | `admin-accounts.service.ts:70` | `i.systemRole === 'admin'` (ánh xạ lời mời). |
| 6 | NỢ | `admin-accounts.service.ts:138` | `target.systemRole === 'super_admin'` (bảo vệ chủ hệ thống, không phải kiểm quyền). |
| 7 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:52` | `systemRole === 'member'`: chặn TK thành viên vào Admin bằng tên vai trò, đúng ra nên dựa vào "có ít nhất một quyền". |
| 8 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:56` | `systemRole !== 'member'`: Portal từ chối mọi TK quản trị, kể cả moderator. |
| 9 | S4 | `apps/admin/src/features/settings/components/admins-tab.tsx:18` | `role === 'super_admin'` (hiển thị). |
| 10 | S4 | `apps/admin/src/features/settings/hooks/use-admins.ts:51` | `role === 'super_admin'` (chặn thao tác ở FE). |
| 11–16 | S4 | `apps/{admin,portal}/src/features/auth/components/login-screen.tsx` (admin :66, :69, :70; portal :70, :73, :74) | `a.role === 'admin'` cho nhãn, màu của hộp TK demo (chỉ hiển thị). |

Ghi chú:
- Route admin không decorator: `GET /v1/admin/badges` (`apps/server/src/modules/reporting/overview.controller.ts:30`). Service tự kiểm "có ít nhất một quyền" (`overview.service.ts:59`), nên **tính đạt**.
- `GET /v1/groups/:id/requests` và `POST /v1/groups/:id/requests/:userId/:decision` (`join-requests.controller.ts:22,30`) không có decorator; quyền "chủ nhóm hoặc `c.mod`" được kiểm trong `GroupAccessService.canManage`.
- `@RequireGroupRole` cùng `GroupRoleGuard` có tồn tại nhưng **0 route dùng**.
- Phân bố key: m.view 13, m.edit 9, c.create 3, c.room 2, c.mod 22, p.pub 14, e.edit 3, e.reg 4, n.edit 22, s.cfg 19, s.role 6, s.log 1.
- `PermissionGuard` (`apps/server/src/common/auth/guards.ts:107`) chỉ kiểm key, đúng luật 4. Lọc `system_role <> 'super_admin'` trong SQL (`admin-users.repository.ts`, `export.repository.ts`) là bảo vệ dữ liệu, không phải phân quyền.

---

## Kiểm 6 — Env zod → .env.example

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c6-env.audit.ts`

Cách kiểm: đọc tên khoá từ các schema `apps/server/src/common/config/env.schema.ts`, `apps/{portal,admin}/src/lib/env.ts`, `apps/{portal,admin}/next.config.ts`, `packages/db/seed/{index,demo,load}.ts`, `packages/db/test/env.ts`, `prisma.config.ts`. So **hai chiều** với `apps/*/.env.example`, `packages/db/.env.example` và `infra/env/{server,portal,admin}.env.example`. `infra/env/{backup,health}.env.example` thì so với biến mà `pg-backup.sh` và `healthcheck.sh` dùng. Chỉ đọc tên khoá, không đọc `.env` thật.

Đạt **117** · Không đạt **15** (đều S4)

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S4 | `apps/server/src/common/config/env.schema.ts:27` | `RATE_LIMIT_DISABLED` thiếu trong `infra/env/server.env.example`. Mặc định false là đúng; parseEnv cũng chặn ở production. |
| 2 | S4 | `env.schema.ts:63` | `STORAGE_PROVIDER` thiếu trong infra server example (mặc định `s3`, đúng cho production). |
| 3 | S4 | `env.schema.ts:65` | `LOCAL_STORAGE_DIR` thiếu trong infra server example (chỉ dùng ở dev). |
| 4 | S4 | `infra/env/server.env.example:68` | `SENTRY_DSN` không schema nào đọc (giữ chỗ cho Q-B65-1). |
| 5 | S4 | `infra/env/portal.env.example:10` | `SENTRY_DSN` như trên. |
| 6 | S4 | `infra/env/admin.env.example:12` | `SENTRY_DSN` như trên. |
| 7 | S4 | `apps/portal/src/lib/env.ts:10` | `NEXT_PUBLIC_SOCKET_URL` thiếu trong `infra/env/portal.env.example`. Để trống nghĩa là cùng origin, đúng với nginx. |
| 8 | S4 | `apps/portal/next.config.ts:12` | `NEXT_DIST_DIR` thiếu trong `apps/portal/.env.example` (chỉ build e2e). |
| 9 | S4 | `apps/admin/next.config.ts:12` | `NEXT_DIST_DIR` thiếu trong `apps/admin/.env.example`. |
| 10 | S4 | `packages/db/seed/load.ts:15` | `LOAD_USERS` thiếu trong `packages/db/.env.example` (seed k6). |
| 11 | S4 | `load.ts:16` | `LOAD_GROUPS` thiếu như trên. |
| 12 | S4 | `load.ts:20` | `LOAD_PASSWORD` thiếu như trên (bắt buộc khi chạy `seed:load`). |
| 13 | S4 | `packages/db/.env.example:2` | `DATABASE_URL` không schema nào trong `packages/db` đọc (seed và migrate dùng `DIRECT_URL`). |
| 14 | S4 | `apps/server/test/setup/env.ts:11` | Test int của server đọc `TEST_DATABASE_URL` từ `apps/server/.env`, nhưng `apps/server/.env.example` không có khoá này. |
| 15 | S4 | `apps/server/test/setup/env.ts:19` | `TEST_LOG_LEVEL` như trên. |

Ghi chú:
- Không có `.env.example` ở root; mỗi app và package có file riêng.
- Các khoá đặt ngoài example, không tính lỗi: `API_PORT` và `SOCKET_PORT` (systemd `Environment=`), `DIRECT_URL` trong server.env (deploy.sh dùng cho migrate).
- Production `NEXT_PUBLIC_API_MOCKING=off` và `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=off` trong infra example, đúng.

---

## Câu hỏi

1. **D-15 phạm vi**: "nhóm làm chủ chuyển về Admin" là chuyển `group_role = owner` sang TK Admin nào: super_admin, người khoá, hay chỉ bỏ owner? Khi mở khoá thì dự án và nhóm có khôi phục không? Câu trả lời quyết định consumer `user.locked` cần làm gì.
2. **SSO thật**: provider thật (Google, …) chỉ trả `code` và `state` về `redirect_uri`. Hiện `redirectUri` không mang provider, còn màn callback cần `?provider=`. Nên chờ OQ-04 hay coi là lỗi ngay? Hiện chỉ fake chạy được.
3. **Link thông báo cho nhân sự**: thông báo @nhắc phiếu YC (`/requests?code=`) có chủ ý chỉ đánh dấu đã đọc ở Admin không (theo comment D-04, D-29), hay cần deep-link?
4. **OWNER_EDITABLE**: chủ dự án sửa dự án `published` hoặc `rejected` sẽ chuyển về `pending_review`/`draft`. D-18 ("sửa trường nào cũng duyệt lại") có bao gồm `rejected → pending_review` không? §8 ghi "Bị từ chối" là trạng thái cuối.
5. **Bot "Đang chạy"**: GĐ3 sau feature flag (D-05). Server chỉ có `pending/posted` và đăng hết các dòng trong một lần. Có cần bám §8 (chạy theo giãn cách) trước khi bật flag không?
6. **Quyền `m.role` và `p.edit`**: hai key nằm trong `PERMISSION_GROUPS` (D-20) nhưng không chỗ nào kiểm. Nên bỏ khỏi danh mục, hay gán cho route nào (vd sửa dự án ở Admin)?
7. **Đổi mật khẩu và phiên socket**: `user.session_revoked` (reason `password_changed`) cũng không có consumer. Nếu yêu cầu là "đăng xuất mọi thiết bị khi đổi mật khẩu" thì socket hiện vẫn sống; cần xác nhận mức.
8. **Mức kiểm 3**: lỗi ảnh lớn ở 9 endpoint xếp S2 (thao tác Admin hoặc chủ dự án thất bại, báo 500). Nếu luồng tạo sự kiện, nhóm, dự án có ảnh bìa là luồng go-live bắt buộc thì nên nâng lên S1.
