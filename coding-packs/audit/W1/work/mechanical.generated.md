# AUDIT-W1 làn A — kết quả thô (sinh tự động bởi run-all.audit.ts)

## Kiểm 1: Outbox → consumer

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c1-outbox.audit.ts`

Đạt: **11** · Không đạt: **3**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S2 | `packages/shared/src/outbox/events.ts:18 (phát: apps/server/src/modules/account/services/admin-users.service.ts:84)` | `user.locked` không có consumer — D-15: khoá TK phải ẩn dự án + chuyển nhóm làm chủ về Admin — không có handler nào làm việc này |
| 2 | S2 | `packages/shared/src/outbox/events.ts:19 (phát: apps/server/src/modules/account/services/admin-users.service.ts:89, apps/server/src/modules/account/services/password-reset.service.ts:77)` | `user.session_revoked` không có consumer — không ai publish `session.revoked` lên kênh socket:user → socket đang mở của TK bị khoá/đổi mật khẩu KHÔNG bị ngắt (handshake chỉ kiểm lúc kết nối) |
| 3 | S3 | `packages/shared/src/outbox/events.ts:23 (phát: apps/server/src/modules/account/services/admin-users.service.ts:128, apps/server/src/modules/settings/services/admin-accounts.service.ts:147)` | `user.role_changed` không có consumer — đổi/thu hồi vai trò không ngắt phiên realtime (comment admin-accounts.service hứa "ngắt phiên realtime") |

- membership_fee.activated: consumer = apps/server/src/worker/processors/fee.processor.ts:26, apps/server/src/worker/processors/notification.processor.ts:22; phát tại = apps/server/src/modules/membership-fee/services/membership-fee.service.ts:87
- membership_fee.changed: consumer = apps/server/src/worker/processors/fee.processor.ts:27; phát tại = apps/server/src/modules/membership-fee/services/fee-scheduler.service.ts:23
- user.locked: consumer = KHÔNG CÓ; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:84
- user.session_revoked: consumer = KHÔNG CÓ; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:89, apps/server/src/modules/account/services/password-reset.service.ts:77
- user.role_changed: consumer = KHÔNG CÓ; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:128, apps/server/src/modules/settings/services/admin-accounts.service.ts:147
- mail.requested: consumer = apps/server/src/worker/processors/mail.processor.ts:23; phát tại = apps/server/src/modules/mail/mail.service.ts:19, apps/server/src/modules/mail/mail.service.ts:26
- group.join_requested: consumer = apps/server/src/worker/processors/community.processor.ts:14; phát tại = apps/server/src/modules/community/services/group.service.ts:55
- chat.mentioned: consumer = apps/server/src/worker/processors/notification.processor.ts:19; phát tại = apps/server/src/modules/chat/services/message.service.ts:125, apps/server/src/modules/chat/services/message.service.ts:135
- moderation.warned: consumer = apps/server/src/worker/processors/notification.processor.ts:21; phát tại = apps/server/src/modules/moderation/services/admin-moderation.service.ts:65
- group.request_decided: consumer = apps/server/src/worker/processors/notification.processor.ts:20; phát tại = apps/server/src/modules/community/services/join-request.service.ts:65
- event.registered: consumer = apps/server/src/worker/processors/notification.processor.ts:23, apps/server/src/worker/processors/notification.processor.ts:24; phát tại = apps/server/src/modules/event/services/event.service.ts:55
- campaign.send: consumer = apps/server/src/worker/processors/marketing.processor.ts:24; phát tại = apps/server/src/modules/marketing/services/campaign.service.ts:80, apps/server/src/modules/marketing/services/campaign.service.ts:101, apps/server/src/modules/marketing/services/campaign.service.ts:129
- export.requested: consumer = apps/server/src/worker/processors/export.processor.ts:18; phát tại = apps/server/src/modules/export/export.service.ts:51
- service_request.mentioned: consumer = apps/server/src/worker/processors/notification.processor.ts:25; phát tại = apps/server/src/modules/service/services/service-admin.service.ts:199
- publish 'session.revoked' lên socket:user: KHÔNG CÓ (subscriber chờ sự kiện không bao giờ tới)
- apps/server/src/common/outbox/outbox-relay.service.ts:73: relay đánh dấu dispatched cho loại chưa có handler → khi thêm consumer sau, sự kiện cũ KHÔNG được xử lý lại

## Kiểm 2: Link do server sinh → đích có thật

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c2-links.audit.ts`

Đạt: **9** · Không đạt: **4**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S1 | `apps/server/src/modules/account/services/password-reset.service.ts:51` | PORTAL_URL + path: `/reset-password?token=${token}` → portal: không có page/route khớp — mail quên mật khẩu dẫn tới 404, người dùng không đặt lại được mật khẩu (POST /v1/auth/password/reset có nhưng không có màn gọi) |
| 2 | S3 | `apps/server/src/modules/notification/services/notification-events.handler.ts:116` | notification.link: `/membership` → portal: không có page/route khớp — Portal chỉ có /membership/pay |
| 3 | S3 | `apps/server/src/modules/notification/services/notification-events.handler.ts:154` | notification.link: `/requests?code=${encodeURIComponent(p.code)}` → admin: trang /requests có nhưng Admin không đọc `?code=` (không mở phiếu) và hook thông báo Admin không điều hướng; mở ở Portal thì 404 |
| 4 | S3 | `packages/shared/src/fixtures/prototype-seed.json:1696` | mail chào mừng guideUrl: `/huong-dan` → portal: không có page/route khớp |

- đạt — apps/server/src/common/integrations/integrations.module.ts:70 PORTAL_URL + path: `/v1/uploads` → api
- đạt — apps/server/src/modules/account/services/sso.service.ts:52 PORTAL_URL + path: `/sso/callback` → portal
- đạt — apps/server/src/modules/mail/event-mail.handler.ts:41 PORTAL_URL + path: `/events/${p.eventId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:18 hàm dựng notification.link: `/chat/${groupId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:18 hàm dựng notification.link: `/chat/${groupId}/${slug}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:83 notification.link: `/chat/${p.groupId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:83 notification.link: `/community` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:141 notification.link: `/events/${p.eventId}` → portal
- đạt — packages/shared/src/fixtures/prototype-seed.json:1695 mail chào mừng loginUrl: `/login` → portal
- apps/admin/src/features/shell/hooks/use-notifications.ts: Admin mở thông báo chỉ đánh dấu đã đọc, không điều hướng → mọi notification.link nhận ở Admin là link chết
- apps/admin/src/features/auth/api.ts: Admin dùng chung /auth/password/forgot → link mail cũng trỏ PORTAL_URL/reset-password (Portal từ chối đăng nhập TK quản trị)
- sso.service.ts redirectUri = PORTAL_URL/sso/callback (không mang provider); màn callback cần `?provider=` — chỉ FakeSsoProvider tự gắn. Provider thật sẽ không gắn tham số này (xem Câu hỏi)

## Kiểm 3: Giới hạn zod ≤ giới hạn body

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c3-body-limit.audit.ts`

Đạt: **68** · Không đạt: **11**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S2 | `apps/server/src/modules/bot/bot.controller.ts:52` | POST /v1/admin/personas `personaUpsertSchema`: zod cho tới ≈6.7MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: avatarUrl ≈6.7MB |
| 2 | S2 | `apps/server/src/modules/bot/bot.controller.ts:62` | PATCH /v1/admin/personas/:id `personaUpsertSchema`: zod cho tới ≈6.7MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: avatarUrl ≈6.7MB |
| 3 | S2 | `apps/server/src/modules/community/controllers/admin-groups.controller.ts:113` | POST /v1/admin/groups `groupAdminUpsertSchema`: zod cho tới ≈1.9MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: coverUrl ≈1.9MB |
| 4 | S2 | `apps/server/src/modules/community/controllers/admin-groups.controller.ts:124` | PATCH /v1/admin/groups/:id `groupAdminUpsertSchema`: zod cho tới ≈1.9MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: coverUrl ≈1.9MB |
| 5 | S2 | `apps/server/src/modules/event/controllers/admin-events.controller.ts:48` | POST /v1/admin/events `adminEventUpsertSchema`: zod cho tới ≈1.9MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: coverUrl ≈1.9MB |
| 6 | S2 | `apps/server/src/modules/event/controllers/admin-events.controller.ts:59` | PATCH /v1/admin/events/:id `adminEventUpsertSchema`: zod cho tới ≈1.9MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: coverUrl ≈1.9MB |
| 7 | S3 | `apps/server/src/modules/marketing/controllers/campaigns.controller.ts:63` | POST /v1/admin/campaigns `campaignCreateSchema`: zod cho tới ≈105kB > body-parser 100kB (nginx 1.0MB cho qua) — trường lớn: body ≈98kB |
| 8 | S2 | `apps/server/src/modules/project/controllers/projects.controller.ts:64` | POST /v1/projects `projectSaveSchema`: zod cho tới ≈40.1MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: team[].avatarUrl (data URL qua ImageRefService ≤ 2000000 ký tự × 20) ≈38.1MB, coverUrl (data URL qua ImageRefService ≤ 2000000 ký tự) ≈1.9MB, description ≈20kB |
| 9 | S2 | `apps/server/src/modules/project/controllers/projects.controller.ts:73` | PATCH /v1/projects/:id `projectSaveSchema`: zod cho tới ≈40.1MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: team[].avatarUrl (data URL qua ImageRefService ≤ 2000000 ký tự × 20) ≈38.1MB, coverUrl (data URL qua ImageRefService ≤ 2000000 ký tự) ≈1.9MB, description ≈20kB |
| 10 | S2 | `apps/server/src/modules/settings/controllers/settings.controller.ts:38` | PATCH /v1/admin/settings/general `generalSettingsPatchSchema`: zod cho tới ≈2.7MB > body-parser 100kB và > nginx 1.0MB (infra/nginx/snippets/opchub-backend.conf:5) — trường lớn: logoUrl ≈2.7MB |
| 11 | S2 | `apps/server/src/common/filters/http-exception.filter.ts:44` | lỗi body-parser (PayloadTooLargeError 413, cả JSON hỏng 400 `entity.parse.failed`) không phải HttpException → rơi về 500 INTERNAL + log error |

- main-api.ts / bootstrap-http.ts không cấu hình giới hạn body → Express body-parser JSON mặc định 100kb (rawBody: true không đổi giới hạn)
- apps/server/src/modules/community/controllers/admin-groups.controller.ts:89 POST /v1/admin/groups/:id/members/export: schema `oneGroupExportSchema` không ở @opchub/shared — bỏ qua
- apps/server/src/modules/membership-fee/controllers/dev-bank.controller.ts:30 POST /v1/dev/bank/simulate: schema `fakeBankBodySchema` không ở @opchub/shared — bỏ qua
- apps/server/src/modules/service/controllers/admin-service-requests.controller.ts:94 PATCH /v1/admin/service-requests/:code/assignee: schema `assignSchema` không ở @opchub/shared — bỏ qua
- Trường chuỗi/mảng trong body KHÔNG có .max (chỉ bị chặn bởi giới hạn body): 102 — bulkStatusSchema.userIds[], assignGroupsSchema.userIds[], assignGroupsSchema.groupIds[], userExportSchema.userIds[], loginRequestSchema.identifier, loginRequestSchema.password, updateProfileSchema.email, updateProfileSchema.avatarUrl, forgotPasswordSchema.email, resetPasswordSchema.newPassword, changePasswordSchema.currentPassword, changePasswordSchema.newPassword, totpVerifySchema.code, registerPersonalSchema.fullName, registerPersonalSchema.phone.number, registerPersonalSchema.email, registerPersonalSchema.password, registerPersonalSchema.persona, registerPersonalSchema.groupIds[], registerBusinessSchema.taxCode, registerBusinessSchema.companyName, registerBusinessSchema.mainIndustry, registerBusinessSchema.otherIndustries[], registerBusinessSchema.size, registerBusinessSchema.country, registerBusinessSchema.representative, registerBusinessSchema.position, registerBusinessSchema.phone.number, registerBusinessSchema.email, registerBusinessSchema.password, registerBusinessSchema.groupIds[], otpVerifySchema.email, otpVerifySchema.code, otpResendSchema.email, ssoCompleteSchema.ssoToken, ssoCompleteSchema.phone.number, ssoCompleteSchema.groupIds[], personaUpsertSchema.groupIds[], personaUpsertSchema.color, scriptUpsertSchema.groupIds[], …
- FE gửi ảnh dạng data URL: apps/admin/src/features/bots/components/persona-photo.tsx:32
- FE gửi ảnh dạng data URL: apps/admin/src/features/events/components/event-form.tsx:23
- FE gửi ảnh dạng data URL: apps/admin/src/features/groups/components/group-form.tsx:22
- FE gửi ảnh dạng data URL: apps/admin/src/features/settings/components/logo-picker.tsx:30
- FE gửi ảnh dạng data URL: apps/portal/src/features/projects/components/read-image.ts:10

## Kiểm 4: Transition §8 → endpoint + test

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c4-transitions.audit.ts`

Đạt: **22** · Không đạt: **11**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | NỢ | `apps/server/src/modules/project/domain/project-status.ts:13` | Dự án: Đã ẩn → Đang hiển thị — không có test int/contract cho cạnh hợp lệ |
| 2 | NỢ | `apps/server/src/modules/project/domain/project-status.ts:10` | Dự án: Chờ duyệt → Cần chỉnh sửa — không có test int/contract cho cạnh hợp lệ |
| 3 | NỢ | `apps/server/src/modules/project/domain/project-status.ts:19` | Dự án: Cần chỉnh sửa → Chờ duyệt — không có test int/contract cho cạnh hợp lệ |
| 4 | NỢ | `packages/shared/src/api-domains/services-admin.ts:26` | Phiếu YC: Đã báo giá → Thành công — không có test int/contract cho cạnh hợp lệ |
| 5 | NỢ | `packages/shared/src/api-domains/services-admin.ts:26` | Phiếu YC: (Mới\|Đang tư vấn\|Đã báo giá) → Từ chối — không có test int/contract cho cạnh hợp lệ |
| 6 | NỢ | `packages/shared/src/api-domains/services-admin.ts:28` | Phiếu YC: Từ chối → mở lại (Đang tư vấn) — không có test int/contract cho cạnh hợp lệ |
| 7 | S2 | `apps/server/src/modules/investor/repositories/investor-admin.repository.ts:110` | Quan tâm đầu tư: Đang trao đổi → Đã kết nối — UPDATE KHÔNG điều kiện `WHERE status` (vi phạm luật 7): đặt được mọi trạng thái, cả lùi connected → sent |
| 8 | S3 | `apps/server/src/modules/bot/services/bot-thread.service.ts:99` | Hội thoại bot: Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted) — server chỉ có pending/posted, đăng tất cả dòng một lần khi Admin duyệt; không có trạng thái "Đang chạy", không job chạy theo runAt/delayMinutes |
| 9 | S3 | `apps/server/src/modules/project/domain/project-status.ts:22` | OWNER_EDITABLE gồm 'rejected' và 'published': chủ dự án lưu lại → Bị từ chối → Chờ duyệt/Nháp, Đang hiển thị → Nháp (lưu nháp) — §8 không có cạnh này |
| 10 | S4 | `apps/server/src/modules/event/repositories/event.repository.ts:114` | Đã hủy → Đã đăng ký (đăng ký lại) và Đã tham dự → Đã đăng ký (bỏ check-in) — ngoài §8 |
| 11 | S4 | `packages/shared/src/api-domains/services-admin.ts:27` | Phiếu YC thêm trạng thái 'done' (Hoàn thành) sau 'won' — §8 dừng ở Thành công |

| Máy | Cạnh | Code | Endpoint | Test hợp lệ | Test bị chặn |
|---|---|---|---|---|---|
| Tài khoản | Hoạt động → Đã khóa | apps/server/src/modules/account/repositories/admin-users.repository.ts:105 | PATCH /v1/admin/users/:id/status<br>POST /v1/admin/users/status<br>POST /v1/admin/reports/:id/action | apps/server/test/account/admin-users.int.spec.ts:69 | apps/server/test/account/admin-users.int.spec.ts:94 |
| Tài khoản | Đã khóa → Hoạt động | apps/server/src/modules/account/repositories/admin-users.repository.ts:101 | PATCH /v1/admin/users/:id/status<br>POST /v1/admin/users/status | apps/server/test/account/admin-users.int.spec.ts:69 | THIẾU |
| Phí | Chờ TT → Đang hiệu lực | apps/server/src/modules/membership-fee/services/membership-fee.service.ts:67 | POST /v1/webhooks/bank<br>POST /v1/admin/fees/:uid/:action<br>POST /v1/admin/fees/collect<br>POST /v1/admin/fees/transactions/:id/match | apps/server/test/membership-fee/reconcile.int.spec.ts:69 | apps/server/test/membership-fee/admin-fees.int.spec.ts:102 — TRANSITIONS: mọi trạng thái đều → active nên nhánh conflict của canTransition không bao giờ chạy |
| Phí | Đang hiệu lực → Sắp hết hạn | apps/server/src/modules/membership-fee/repositories/membership-fee.repository.ts:60 | job worker (fee.sweep) | apps/server/test/membership-fee/reconcile.int.spec.ts:151 | apps/server/test/membership-fee/reconcile.int.spec.ts:151 |
| Phí | Sắp hết hạn → Hết hạn | apps/server/src/modules/membership-fee/repositories/membership-fee.repository.ts:56 | job worker (fee.sweep) | apps/server/test/membership-fee/reconcile.int.spec.ts:151 | apps/server/test/membership-fee/reconcile.int.spec.ts:151 |
| Phí | Hết hạn → Gia hạn → Đang hiệu lực | apps/server/src/modules/membership-fee/domain/membership-fee.state.ts:9 | POST /v1/webhooks/bank<br>POST /v1/admin/fees/:uid/:action<br>POST /v1/admin/fees/collect | apps/server/test/membership-fee/admin-fees.int.spec.ts:64 | THIẾU — action 'renew' (FEE_ACTIONS) không có test nào gọi |
| Phí | Đang hiệu lực → Gia hạn (nối tiếp) | apps/server/src/modules/membership-fee/domain/membership-fee.state.ts:7 | POST /v1/webhooks/bank | apps/server/test/membership-fee/reconcile.int.spec.ts:89 | THIẾU |
| Yêu cầu vào nhóm | Chờ duyệt → Thành viên | apps/server/src/modules/community/repositories/join-request.repository.ts:59 | POST /v1/groups/:id/requests/:userId/:decision | apps/server/test/community/join-requests.int.spec.ts:58 | apps/server/test/community/join-requests.int.spec.ts:58 — bị chặn trả 404 (không phải 409) |
| Yêu cầu vào nhóm | Chờ duyệt → Từ chối | apps/server/src/modules/community/repositories/join-request.repository.ts:59 | POST /v1/groups/:id/requests/:userId/:decision | apps/server/test/community/join-requests.int.spec.ts:80 | THIẾU |
| Yêu cầu vào nhóm | Chờ duyệt → Hủy | apps/server/src/modules/community/services/group.service.ts:69 | DELETE /v1/groups/:id/join | apps/server/test/community/groups.int.spec.ts:75 | THIẾU |
| Dự án | Nháp → Chờ duyệt | apps/server/src/modules/project/services/project-write.service.ts:105 | POST /v1/projects<br>PATCH /v1/projects/:id | apps/server/test/project/projects.int.spec.ts:35 | apps/server/test/project/projects.int.spec.ts:64 |
| Dự án | Chờ duyệt → Đang hiển thị | apps/server/src/modules/project/domain/project-status.ts:9 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | apps/server/test/project/admin-projects.int.spec.ts:43 | apps/server/test/project/admin-projects.int.spec.ts:43 |
| Dự án | Đang hiển thị → Đã ẩn | apps/server/src/modules/project/domain/project-status.ts:12 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | apps/server/test/project/admin-projects.int.spec.ts:71 | THIẾU |
| Dự án | Đã ẩn → Đang hiển thị | apps/server/src/modules/project/domain/project-status.ts:13 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | THIẾU | THIẾU |
| Dự án | Chờ duyệt → Cần chỉnh sửa | apps/server/src/modules/project/domain/project-status.ts:10 | POST /v1/admin/projects/:id/review | THIẾU | THIẾU |
| Dự án | Cần chỉnh sửa → Chờ duyệt | apps/server/src/modules/project/domain/project-status.ts:19 | PATCH /v1/projects/:id | THIẾU | THIẾU |
| Dự án | Chờ duyệt → Bị từ chối | apps/server/src/modules/project/domain/project-status.ts:11 | POST /v1/admin/projects/:id/review | apps/server/test/project/admin-projects.int.spec.ts:50 | apps/server/test/project/admin-projects.int.spec.ts:43 |
| Báo cáo tin | Mới → Đã xử lý (bỏ qua/ẩn/cảnh báo/khóa) | apps/server/src/modules/moderation/repositories/report.repository.ts:120 | POST /v1/admin/reports/:id/action | apps/server/test/moderation/moderation.int.spec.ts:101 | apps/server/test/moderation/moderation.int.spec.ts:101 |
| Đăng ký sự kiện | Đã đăng ký → Đã tham dự | apps/server/src/modules/event/repositories/event.repository.ts:179 | POST /v1/admin/events/:id/registrations/check-in | apps/server/test/event/admin-events.int.spec.ts:103 | THIẾU — id đã huỷ bị bỏ qua im lặng (đếm), không 409 |
| Đăng ký sự kiện | Đã đăng ký → Đã hủy | apps/server/src/modules/event/repositories/event.repository.ts:121 | DELETE /v1/events/:id/registration | apps/server/test/event/events.int.spec.ts:46 | apps/server/test/event/events.int.spec.ts:46 |
| Phiếu YC | Mới → Đang tư vấn | packages/shared/src/api-domains/services-admin.ts:24 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | apps/server/test/service/service.int.spec.ts:92 | apps/server/test/service/service.int.spec.ts:91 |
| Phiếu YC | Đang tư vấn → Đã báo giá | packages/shared/src/api-domains/services-admin.ts:25 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | apps/server/test/contract/service-request.int.spec.ts:123 | THIẾU |
| Phiếu YC | Đã báo giá → Thành công | packages/shared/src/api-domains/services-admin.ts:26 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | THIẾU | THIẾU |
| Phiếu YC | (Mới|Đang tư vấn|Đã báo giá) → Từ chối | packages/shared/src/api-domains/services-admin.ts:26 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | THIẾU | THIẾU |
| Phiếu YC | Từ chối → mở lại (Đang tư vấn) | packages/shared/src/api-domains/services-admin.ts:28 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | THIẾU | THIẾU |
| Quan tâm đầu tư | Đã gửi → Đang trao đổi | apps/server/src/modules/investor/repositories/investor-admin.repository.ts:117 | POST /v1/investor-thread/:key/messages<br>POST /v1/admin/investors/:key/comments | apps/server/test/investor/investors.int.spec.ts:93 | THIẾU |
| Quan tâm đầu tư | Đang trao đổi → Đã kết nối | apps/server/src/modules/investor/repositories/investor-admin.repository.ts:110 | PATCH /v1/admin/investors/:key/status | apps/server/test/investor/investors.int.spec.ts:164 | THIẾU — UPDATE KHÔNG điều kiện `WHERE status` (vi phạm luật 7): đặt được mọi trạng thái, cả lùi connected → sent |
| Hội thoại bot | Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted) | apps/server/src/modules/bot/services/bot-thread.service.ts:99 | POST /v1/admin/bot/threads/:id/approve | apps/server/test/bot/bot.int.spec.ts:75 | apps/server/test/bot/bot.int.spec.ts:75 — server chỉ có pending/posted, đăng tất cả dòng một lần khi Admin duyệt; không có trạng thái "Đang chạy", không job chạy theo runAt/delayMinutes |

- Cạnh không có test "bị chặn" (409/404): 16/28

## Kiểm 5: Permission key → guard

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c5-permissions.audit.ts`

Đạt: **131** · Không đạt: **16**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S3 | `packages/shared/src/permissions.ts` | key `m.role` không có trong @RequirePermission nào và không nơi nào kiểm |
| 2 | S3 | `packages/shared/src/permissions.ts` | key `p.edit` không có trong @RequirePermission nào và không nơi nào kiểm |
| 3 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:52` | so tên vai trò: `if (res.me.systemRole === 'member') return t('login.errorWrongApp');` |
| 4 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:66` | so tên vai trò: `label: a.role === 'admin' ? t('login.demoAdmin') : t('login.demoUser'),` |
| 5 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:69` | so tên vai trò: `tag: a.role === 'admin' ? t('login.tagAdmin') : t('login.tagUser'),` |
| 6 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:70` | so tên vai trò: `tone: a.role === 'admin' ? ('violet' as const) : ('blue' as const),` |
| 7 | S4 | `apps/admin/src/features/settings/components/admins-tab.tsx:18` | so tên vai trò: `const owner = x.role === 'super_admin';` |
| 8 | S4 | `apps/admin/src/features/settings/hooks/use-admins.ts:51` | so tên vai trò: `if (a.role === 'super_admin') return;` |
| 9 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:56` | so tên vai trò: `if (res.me.systemRole !== 'member') return t('login.errorWrongApp');` |
| 10 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:70` | so tên vai trò: `label: a.role === 'admin' ? t('login.demoAdmin') : t('login.demoUser'),` |
| 11 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:73` | so tên vai trò: `tag: a.role === 'admin' ? t('login.tagAdmin') : t('login.tagUser'),` |
| 12 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:74` | so tên vai trò: `tone: a.role === 'admin' ? ('violet' as const) : ('blue' as const),` |
| 13 | NỢ | `apps/server/src/modules/service/services/service-admin.service.ts:28` | so tên vai trò: `const ADMIN_ROLES: SystemRole[] = ['super_admin', 'admin', 'moderator'];` |
| 14 | NỢ | `apps/server/src/modules/settings/services/admin-accounts.service.ts:59` | so tên vai trò: `role: u.systemRole === 'member' ? ('moderator' as const) : u.systemRole,` |
| 15 | NỢ | `apps/server/src/modules/settings/services/admin-accounts.service.ts:70` | so tên vai trò: `role: i.systemRole === 'admin' ? ('admin' as const) : ('moderator' as const),` |
| 16 | NỢ | `apps/server/src/modules/settings/services/admin-accounts.service.ts:138` | so tên vai trò: `if (target.systemRole === 'super_admin') {` |

- m.view: 13 route
- m.edit: 9 route
- c.create: 3 route
- c.room: 2 route
- c.mod: 22 route
- p.pub: 14 route
- e.edit: 3 route
- e.reg: 4 route
- n.edit: 22 route
- s.cfg: 19 route
- s.role: 6 route
- s.log: 1 route
- apps/server/src/modules/reporting/overview.controller.ts:30 GET /v1/admin/badges: không decorator nhưng service kiểm "có ít nhất 1 quyền" (apps/server/src/modules/reporting/overview.service.ts:59)
- apps/server/src/modules/community/controllers/join-requests.controller.ts:22 GET /v1/groups/:id/requests: không decorator — quyền (chủ nhóm hoặc c.mod) kiểm trong service (GroupAccessService.canManage)
- apps/server/src/modules/community/controllers/join-requests.controller.ts:30 POST /v1/groups/:id/requests/:userId/:decision: không decorator — quyền (chủ nhóm hoặc c.mod) kiểm trong service (GroupAccessService.canManage)
- @RequireGroupRole dùng ở 0 route (decorator + GroupRoleGuard tồn tại nhưng không dùng)
- Lọc super_admin trong SQL (bảo vệ chủ hệ thống, không phải kiểm quyền): apps/server/src/modules/account/repositories/admin-users.repository.ts:61, apps/server/src/modules/account/repositories/admin-users.repository.ts:88, apps/server/src/modules/account/repositories/admin-users.repository.ts:106, apps/server/src/modules/account/repositories/admin-users.repository.ts:115, apps/server/src/modules/export/export.repository.ts:51

## Kiểm 6: Env zod → .env.example

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c6-env.audit.ts`

Đạt: **117** · Không đạt: **15**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S4 | `apps/server/src/common/config/env.schema.ts:27` | server (prod): `RATE_LIMIT_DISABLED` có trong schema nhưng không có trong infra/env/server.env.example (mặc định false — đúng, chỉ là thiếu tài liệu) |
| 2 | S4 | `apps/server/src/common/config/env.schema.ts:63` | server (prod): `STORAGE_PROVIDER` có trong schema nhưng không có trong infra/env/server.env.example (mặc định s3 — đúng cho production) |
| 3 | S4 | `apps/server/src/common/config/env.schema.ts:65` | server (prod): `LOCAL_STORAGE_DIR` có trong schema nhưng không có trong infra/env/server.env.example |
| 4 | S4 | `infra/env/server.env.example:68` | server (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 5 | S4 | `apps/portal/next.config.ts:12` | portal (dev): `NEXT_DIST_DIR` có trong schema nhưng không có trong apps/portal/.env.example |
| 6 | S4 | `apps/portal/src/lib/env.ts:10` | portal (prod): `NEXT_PUBLIC_SOCKET_URL` có trong schema nhưng không có trong infra/env/portal.env.example (trống = cùng origin) |
| 7 | S4 | `infra/env/portal.env.example:10` | portal (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 8 | S4 | `apps/admin/next.config.ts:12` | admin (dev): `NEXT_DIST_DIR` có trong schema nhưng không có trong apps/admin/.env.example |
| 9 | S4 | `infra/env/admin.env.example:12` | admin (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 10 | S4 | `packages/db/seed/load.ts:15` | db (seed/migrate/test): `LOAD_USERS` có trong schema nhưng không có trong packages/db/.env.example |
| 11 | S4 | `packages/db/seed/load.ts:16` | db (seed/migrate/test): `LOAD_GROUPS` có trong schema nhưng không có trong packages/db/.env.example |
| 12 | S4 | `packages/db/seed/load.ts:20` | db (seed/migrate/test): `LOAD_PASSWORD` có trong schema nhưng không có trong packages/db/.env.example |
| 13 | S4 | `packages/db/.env.example:2` | db (seed/migrate/test): `DATABASE_URL` có trong example nhưng không schema nào đọc |
| 14 | S4 | `apps/server/test/setup/env.ts:11` | test int server đọc `TEST_DATABASE_URL` nhưng apps/server/.env.example không có |
| 15 | S4 | `apps/server/test/setup/env.ts:19` | test int server đọc `TEST_LOG_LEVEL` nhưng apps/server/.env.example không có |

- Root `.env.example` không tồn tại — mỗi app/package có file riêng (không tính là lỗi)
