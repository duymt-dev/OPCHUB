# AUDIT-W1 làn A — kết quả thô (sinh tự động bởi run-all.audit.ts)

## Kiểm 1: Outbox → consumer

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c1-outbox.audit.ts`

Đạt: **36** · Không đạt: **0**

- bot.messages_hidden: consumer = apps/server/src/worker/processors/bot.processor.ts:30; phát tại = apps/server/src/modules/bot/services/bot-hide.service.ts:31
- bot.emergency_stopped: consumer = apps/server/src/worker/processors/bot.processor.ts:31; phát tại = apps/server/src/modules/bot/services/bot-kill-switch.service.ts:50
- chat.member_sent: consumer = apps/server/src/worker/processors/bot.processor.ts:32, apps/server/src/worker/processors/onboarding.processor.ts:32; phát tại = apps/server/src/modules/chat/services/message.service.ts:172
- bot.turn_due: consumer = apps/server/src/worker/processors/bot.processor.ts:33; phát tại = apps/server/src/modules/bot/services/bot-admission.service.ts:56, apps/server/src/modules/bot/services/bot-admission.service.ts:110, apps/server/src/modules/bot/services/bot-auto-admission.service.ts:70, apps/server/src/modules/bot/services/bot-reply.service.ts:126, apps/server/src/modules/bot/services/bot-runner.service.ts:136
- bot.turn_posted: consumer = apps/server/src/worker/processors/bot-publication.processor.ts:18; phát tại = apps/server/src/modules/chat/services/persona-turn-writer.ts:74
- membership_fee.activated: consumer = apps/server/src/worker/processors/fee.processor.ts:26, apps/server/src/worker/processors/notification.processor.ts:26; phát tại = apps/server/src/modules/membership-fee/services/membership-fee.service.ts:129
- membership_fee.trial_started: consumer = apps/server/src/worker/processors/store.processor.ts:14; phát tại = apps/server/src/modules/membership-fee/services/fee-writer.service.ts:43
- membership_fee.changed: consumer = apps/server/src/worker/processors/fee.processor.ts:27, apps/server/src/worker/processors/onboarding.processor.ts:28; phát tại = apps/server/src/modules/membership-fee/services/fee-scheduler.service.ts:38
- membership_fee.confirmed: consumer = apps/server/src/worker/processors/affiliate.processor.ts:24, apps/server/src/worker/processors/notification.processor.ts:28, apps/server/src/worker/processors/onboarding.processor.ts:27, apps/server/src/worker/processors/store.processor.ts:15; phát tại = apps/server/src/modules/membership-fee/services/membership-fee.service.ts:137
- fundraising.paid: consumer = apps/server/src/worker/processors/notification.processor.ts:29, apps/server/src/worker/processors/notification.processor.ts:33; phát tại = apps/server/src/modules/project/services/fundraising-manual.service.ts:61, apps/server/src/modules/project/services/fundraising-review.service.ts:77
- fundraising.reviewed: consumer = apps/server/src/worker/processors/affiliate.processor.ts:25, apps/server/src/worker/processors/notification.processor.ts:34; phát tại = apps/server/src/modules/project/services/fundraising-review.service.ts:128
- fundraising.reminded: consumer = apps/server/src/worker/processors/notification.processor.ts:35; phát tại = apps/server/src/modules/project/services/fundraising-scheduler.service.ts:100
- store.published: consumer = apps/server/src/worker/processors/onboarding.processor.ts:31; phát tại = apps/server/src/modules/local-business/services/store-owner.service.ts:98
- affiliate.commission_recorded: consumer = apps/server/src/worker/processors/affiliate.processor.ts:26; phát tại = apps/server/src/modules/affiliate/services/affiliate-lifecycle.handler.ts:61, apps/server/src/modules/affiliate/services/fundraising-commission.handler.ts:40
- affiliate.commission_cancelled: consumer = apps/server/src/worker/processors/affiliate.processor.ts:27; phát tại = apps/server/src/modules/affiliate/services/commission-admin.service.ts:37
- affiliate.rate_changed: consumer = apps/server/src/worker/processors/affiliate.processor.ts:28; phát tại = apps/server/src/modules/affiliate/services/commission-admin.service.ts:84
- affiliate.payout_recorded: consumer = apps/server/src/worker/processors/affiliate.processor.ts:29; phát tại = apps/server/src/modules/affiliate/services/payout.service.ts:62
- membership_fee.reminded: consumer = apps/server/src/worker/processors/notification.processor.ts:30; phát tại = apps/server/src/modules/membership-fee/services/admin-fees.service.ts:218, apps/server/src/modules/membership-fee/services/fee-scheduler.service.ts:97
- user.locked: consumer = apps/server/src/worker/processors/account.processor.ts:17; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:112
- user.session_revoked: consumer = apps/server/src/worker/processors/account.processor.ts:19; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:117, apps/server/src/modules/account/services/password-reset.service.ts:91
- user.unlocked: consumer = apps/server/src/worker/processors/account.processor.ts:18; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:123
- mail.requested: consumer = apps/server/src/worker/processors/mail.processor.ts:25; phát tại = apps/server/src/modules/mail/mail.service.ts:20, apps/server/src/modules/mail/mail.service.ts:27
- group.joined: consumer = apps/server/src/worker/processors/notification.processor.ts:22, apps/server/src/worker/processors/onboarding.processor.ts:29; phát tại = apps/server/src/modules/community/services/group-join.service.ts:40, apps/server/src/modules/community/services/group.service.ts:55
- chat.mentioned: consumer = apps/server/src/worker/processors/notification.processor.ts:21; phát tại = apps/server/src/modules/chat/services/message.service.ts:175, apps/server/src/modules/chat/services/message.service.ts:185
- moderation.warned: consumer = apps/server/src/worker/processors/notification.processor.ts:25; phát tại = apps/server/src/modules/moderation/services/admin-moderation.service.ts:119, apps/server/src/modules/moderation/services/violation.service.ts:68
- group.members_assigned: consumer = apps/server/src/worker/processors/notification.processor.ts:23; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:195
- group.owner_changed: consumer = apps/server/src/worker/processors/notification.processor.ts:24; phát tại = apps/server/src/modules/community/services/group-admin.service.ts:164
- group.topic_created: consumer = apps/server/src/worker/processors/community.processor.ts:14; phát tại = apps/server/src/modules/community/services/group-admin.service.ts:178
- group.topic_changed: consumer = apps/server/src/worker/processors/community.processor.ts:15; phát tại = apps/server/src/modules/community/services/group-topics.service.ts:56, apps/server/src/modules/community/services/group-topics.service.ts:70
- event.registered: consumer = apps/server/src/worker/processors/notification.processor.ts:31, apps/server/src/worker/processors/notification.processor.ts:32, apps/server/src/worker/processors/onboarding.processor.ts:30; phát tại = apps/server/src/modules/event/services/event.service.ts:73
- onboarding.touched: consumer = apps/server/src/worker/processors/onboarding.processor.ts:26; phát tại = apps/server/src/modules/account/services/declaration.service.ts:79, apps/server/src/modules/account/services/declaration.service.ts:94, apps/server/src/modules/account/services/profile.service.ts:77, apps/server/src/modules/local-business/services/need-owner.service.ts:82, apps/server/src/modules/onboarding/services/onboarding.service.ts:43, apps/server/src/modules/project/services/project-write.service.ts:58
- onboarding.reminded: consumer = apps/server/src/worker/processors/onboarding.processor.ts:33; phát tại = apps/server/src/modules/onboarding/services/onboarding-remind.service.ts:92
- event.reminder_due: consumer = apps/server/src/worker/processors/event.processor.ts:26, apps/server/src/worker/processors/event.processor.ts:27; phát tại = apps/server/src/modules/event/services/event-scheduler.service.ts:23
- campaign.send: consumer = apps/server/src/worker/processors/marketing.processor.ts:28; phát tại = apps/server/src/modules/marketing/services/campaign.service.ts:80, apps/server/src/modules/marketing/services/campaign.service.ts:101, apps/server/src/modules/marketing/services/campaign.service.ts:164
- export.requested: consumer = apps/server/src/worker/processors/export.processor.ts:18; phát tại = apps/server/src/modules/export/export.service.ts:56
- service_request.mentioned: consumer = apps/server/src/worker/processors/notification.processor.ts:36; phát tại = apps/server/src/modules/service/services/service-admin.service.ts:126
- publish 'session.revoked' lên socket:user: apps/server/src/modules/account/services/user-lifecycle.handler.ts:24

## Kiểm 2: Link do server sinh → đích có thật

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c2-links.audit.ts`

Đạt: **26** · Không đạt: **0**

- đạt — apps/server/src/common/integrations/integrations.module.ts:93 PORTAL_URL + path: `/v1/uploads` → api
- đạt — apps/server/src/modules/account/services/sso.service.ts:80 PORTAL_URL + path: `/sso/callback/${flow}` → portal
- đạt — apps/server/src/modules/affiliate/services/affiliate-admin-notify.handler.ts:23 notification.link: `/affiliate` → portal
- đạt — apps/server/src/modules/affiliate/services/affiliate-admin-notify.handler.ts:37 notification.link: `/affiliate` → portal
- đạt — apps/server/src/modules/affiliate/services/affiliate-admin-notify.handler.ts:54 notification.link: `/affiliate` → portal
- đạt — apps/server/src/modules/mail/event-mail.handler.ts:43 PORTAL_URL + path: `/events/${p.eventId}` → portal
- đạt — apps/server/src/modules/mail/event-mail.handler.ts:83 PORTAL_URL + path: `/events/${p.eventId}` → portal
- đạt — apps/server/src/modules/mail/unsubscribe-token.ts:40 PORTAL_URL + path: `/unsubscribe?token=${this.sign(email)}` → portal
- đạt — apps/server/src/modules/mail/unsubscribe-token.ts:45 PORTAL_URL + path: `/v1/public/unsubscribe?token=${this.sign(email)}` → api
- đạt — apps/server/src/modules/marketing/services/campaign-sender.service.ts:43 PORTAL_URL + path: `/login` → portal
- đạt — apps/server/src/modules/notification/services/fundraising-notify.handler.ts:6 hàm dựng notification.link: `/projects/${encodeURIComponent(projectId)}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:27 hàm dựng notification.link: `/chat/${groupId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:27 hàm dựng notification.link: `/chat/${groupId}/${slug}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:91 notification.link: `/chat/${p.groupId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:113 notification.link: `/chat/${groupId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:134 notification.link: `/chat/${p.groupId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:166 notification.link: `/dashboard` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:179 notification.link: `/membership/pay` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:206 notification.link: `/events/${p.eventId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:230 notification.link: `/events/${p.eventId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:243 notification.link: `/requests?code=${encodeURIComponent(p.code)}` → admin
- đạt — apps/server/src/modules/onboarding/services/onboarding-auto-remind.service.ts:58 notification.link: `/dashboard` → portal
- đạt — apps/server/src/modules/onboarding/services/onboarding-remind.service.ts:108 PORTAL_URL + path: `/dashboard` → portal
- đạt — apps/server/src/modules/onboarding/services/onboarding-remind.service.ts:116 notification.link: `/dashboard` → portal
- đạt — packages/shared/src/fixtures/prototype-seed.json:1911 mail chào mừng loginUrl: `/login` → portal
- đạt — packages/shared/src/fixtures/prototype-seed.json:1912 mail chào mừng guideUrl: `/huong-dan` → portal

## Kiểm 3: Giới hạn zod ≤ giới hạn body

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c3-body-limit.audit.ts`

Đạt: **100** · Không đạt: **0**

- Có cấu hình body tại apps/server/src/common/http/bootstrap-http.ts:18, apps/server/src/common/http/bootstrap-http.ts:19 — xem tay
- apps/server/src/modules/community/controllers/admin-groups.controller.ts:85 POST /v1/admin/groups/:id/members/export: schema `oneGroupExportSchema` không ở @opchub/shared — bỏ qua
- apps/server/src/modules/pricing/controllers/admin-price-config.controller.ts:25 PUT /v1/admin/price-config: schema `priceConfigSaveSchema` không ở @opchub/shared — bỏ qua
- Trường chuỗi/mảng trong body KHÔNG có .max (chỉ bị chặn bởi giới hạn body): 110 — bulkStatusSchema.userIds[], assignGroupsSchema.userIds[], assignGroupsSchema.groupIds[], userExportSchema.userIds[], loginRequestSchema.identifier, loginRequestSchema.password, declarationSchema.accountType, declarationSchema.groupIds[], declarationSchema.taxCode, updateProfileSchema.avatarUrl, emailChangeVerifySchema.code, forgotPasswordSchema.email, resetPasswordSchema.newPassword, changePasswordSchema.currentPassword, changePasswordSchema.newPassword, totpVerifySchema.code, registerPersonalSchema.fullName, registerPersonalSchema.phone.number, registerPersonalSchema.email, registerPersonalSchema.password, registerPersonalSchema.groupIds[], registerBusinessSchema.taxCode, registerBusinessSchema.otherIndustries[], registerBusinessSchema.size, registerBusinessSchema.country, registerBusinessSchema.phone.number, registerBusinessSchema.email, registerBusinessSchema.password, registerBusinessSchema.groupIds[], otpVerifySchema.email, otpVerifySchema.code, otpResendSchema.email, ssoCompleteSchema.ssoToken, ssoCompleteSchema.phone.number, ssoCompleteSchema.groupIds[], adminAccountCreateSchema.phone, adminAccountCreateSchema.roleId, adminAccountRoleSchema.roleId, adminTwoFactorEnableSchema.code, affiliatePayoutRequestSchema.monthKey, …

## Kiểm 4: Transition §8 + Affiliate §20 → endpoint/worker + test

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c4-transitions.audit.ts`

Đạt: **25** · Không đạt: **3**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S2 | `apps/server/src/modules/bot/services/bot-thread.service.ts` | Hội thoại bot: Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted) — không thấy code transition |
| 2 | S2 | `—` | Hội thoại bot: Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted) — không endpoint nào gọi |
| 3 | NỢ | `—` | Hội thoại bot: Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted) — không có test int/contract cho cạnh hợp lệ |

| Máy | Cạnh | Code | Endpoint | Test hợp lệ | Test bị chặn |
|---|---|---|---|---|---|
| Tài khoản | Hoạt động → Đã khóa | apps/server/src/modules/account/repositories/admin-users.repository.ts:122 | PATCH /v1/admin/users/:id/status<br>POST /v1/admin/users/status<br>POST /v1/admin/reports/:id/action | apps/server/test/account/admin-users.int.spec.ts:71 | apps/server/test/account/admin-users.int.spec.ts:96 |
| Tài khoản | Đã khóa → Hoạt động | apps/server/src/modules/account/repositories/admin-users.repository.ts:108 | PATCH /v1/admin/users/:id/status<br>POST /v1/admin/users/status | apps/server/test/account/admin-users.int.spec.ts:71 | THIẾU |
| Phí | Chờ TT → Đang hiệu lực | apps/server/src/modules/membership-fee/services/membership-fee.service.ts:92 | POST /v1/webhooks/bank<br>POST /v1/admin/fees/:uid/:action<br>POST /v1/admin/fees/collect<br>POST /v1/admin/fees/transactions/:id/match | apps/server/test/membership-fee/reconcile.int.spec.ts:71 | apps/server/test/membership-fee/admin-fees.int.spec.ts:164 — TRANSITIONS: mọi trạng thái đều → active nên nhánh conflict của canTransition không bao giờ chạy |
| Phí | Đang hiệu lực → Sắp hết hạn | apps/server/src/modules/membership-fee/repositories/membership-fee.repository.ts:87 | job worker (fee.sweep) | apps/server/test/membership-fee/reconcile.int.spec.ts:183 | apps/server/test/membership-fee/reconcile.int.spec.ts:183 |
| Phí | Sắp hết hạn → Hết hạn | apps/server/src/modules/membership-fee/repositories/membership-fee.repository.ts:83 | job worker (fee.sweep) | apps/server/test/membership-fee/reconcile.int.spec.ts:183 | apps/server/test/membership-fee/reconcile.int.spec.ts:183 |
| Phí | Hết hạn → Gia hạn → Đang hiệu lực | apps/server/src/modules/membership-fee/domain/membership-fee.state.ts:11 | POST /v1/webhooks/bank<br>POST /v1/admin/fees/:uid/:action<br>POST /v1/admin/fees/collect | apps/server/test/membership-fee/admin-fees.int.spec.ts:64 | THIẾU — action 'renew' (FEE_ACTIONS) không có test nào gọi |
| Phí | Đang hiệu lực → Gia hạn (nối tiếp) | apps/server/src/modules/membership-fee/domain/membership-fee.state.ts:9 | POST /v1/webhooks/bank | apps/server/test/membership-fee/reconcile.int.spec.ts:91 | THIẾU |
| Thành viên nhóm | Chưa tham gia / Đã rời → Thành viên | apps/server/src/modules/community/repositories/group.repository.ts:119 | POST /v1/groups/:id/join | apps/server/test/community/groups.int.spec.ts:89 | apps/server/test/community/groups.int.spec.ts:89 |
| Thành viên nhóm | Thành viên → Đã rời | apps/server/src/modules/community/services/group.service.ts:66 | DELETE /v1/groups/:id/join | apps/server/test/community/groups.int.spec.ts:89 | THIẾU |
| Dự án | Nháp → Đang hiển thị (D-108, TIP-V42-711 — thay "Nháp → Chờ duyệt") | apps/server/src/modules/project/services/project-write.service.ts:53 | POST /v1/projects<br>PATCH /v1/projects/:id | apps/server/test/project/projects.int.spec.ts:40 | apps/server/test/project/projects.int.spec.ts:81 |
| Dự án | Chờ duyệt → Đang hiển thị | apps/server/src/modules/project/domain/project-status.ts:9 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | apps/server/test/project/admin-projects.int.spec.ts:50 | apps/server/test/project/admin-projects.int.spec.ts:50 |
| Dự án | Đang hiển thị → Đã ẩn | apps/server/src/modules/project/domain/project-status.ts:12 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | apps/server/test/project/admin-projects.int.spec.ts:78 | THIẾU |
| Dự án | Đã ẩn → Đang hiển thị | apps/server/src/modules/project/domain/project-status.ts:13 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | apps/server/test/project/admin-projects.int.spec.ts:144 | THIẾU |
| Dự án | Chờ duyệt → Cần chỉnh sửa | apps/server/src/modules/project/domain/project-status.ts:10 | POST /v1/admin/projects/:id/review | apps/server/test/project/admin-projects.int.spec.ts:138 | THIẾU |
| Dự án | Cần chỉnh sửa → Đang hiển thị (D-108, TIP-V42-711 — thay "→ Chờ duyệt") | apps/server/src/modules/project/domain/project-status.ts:40 | PATCH /v1/projects/:id | apps/server/src/modules/project/domain/project-status.spec.ts:13 | apps/server/test/project/projects.int.spec.ts:353 |
| Dự án | Chờ duyệt → Bị từ chối | apps/server/src/modules/project/domain/project-status.ts:11 | POST /v1/admin/projects/:id/review | apps/server/test/project/admin-projects.int.spec.ts:57 | apps/server/test/project/admin-projects.int.spec.ts:50 |
| Báo cáo tin | Mới → Đã xử lý (bỏ qua/ẩn/cảnh báo/khóa) | apps/server/src/modules/moderation/repositories/report.repository.ts:124 | POST /v1/admin/reports/:id/action | apps/server/test/moderation/moderation.int.spec.ts:129 | THIẾU |
| Đăng ký sự kiện | Đã đăng ký → Đã tham dự | apps/server/src/modules/event/repositories/event.repository.ts:217 | POST /v1/admin/events/:id/registrations/check-in | apps/server/test/event/admin-events.int.spec.ts:103 | apps/server/test/event/admin-events.int.spec.ts:151 — id đã huỷ bị bỏ qua (BUG-041, theo lô), không 409 |
| Đăng ký sự kiện | Đã đăng ký → Đã hủy | apps/server/src/modules/event/repositories/event.repository.ts:157 | DELETE /v1/events/:id/registration | apps/server/test/event/events.int.spec.ts:54 | apps/server/test/event/events.int.spec.ts:116 |
| Hội thoại bot | Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted) | THIẾU | POST /v1/admin/bot/threads/:id/approve (KHÔNG THẤY) | THIẾU | THIẾU — server chỉ có pending/posted, đăng tất cả dòng một lần khi Admin duyệt; không có trạng thái "Đang chạy", không job chạy theo runAt/delayMinutes |
| Affiliate | D-94 3A chưa có đại lý → tự tạo (đăng ký / phí / backfill) | apps/server/src/modules/affiliate/services/affiliate-lifecycle.handler.ts:30<br>apps/server/src/modules/affiliate/services/affiliate-allocation.service.ts:21 | outbox membership_fee.confirmed: apps/server/src/worker/processors/affiliate.processor.ts:24 | apps/server/test/affiliate/lifecycle.int.spec.ts:37 | apps/server/test/affiliate/lifecycle.int.spec.ts:101 |
| Affiliate | AF-R05 pending referral → converted | apps/server/src/modules/affiliate/services/affiliate-lifecycle.handler.ts:50<br>apps/server/src/modules/affiliate/repositories/commission.repository.ts:50<br>apps/server/src/modules/affiliate/repositories/commission.repository.ts:52 | outbox membership_fee.confirmed: apps/server/src/worker/processors/affiliate.processor.ts:24 | apps/server/test/affiliate/commission.int.spec.ts:24 | apps/server/test/affiliate/referral-terminal.int.spec.ts:33 |
| Affiliate | AF-R09 recorded commission → paid | apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts:67<br>apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts:72<br>apps/server/src/modules/affiliate/services/payout.service.ts:44 | POST /v1/admin/affiliates/:id/payouts | apps/server/test/affiliate/payout.int.spec.ts:64 | apps/server/test/affiliate/payout.int.spec.ts:161 |
| Affiliate | AF-R10 recorded commission → cancelled | apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts:32<br>apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts:35 | POST /v1/admin/affiliate/commissions/cancel | apps/server/test/affiliate/admin-commissions.int.spec.ts:104 | apps/server/test/affiliate/admin-commissions.int.spec.ts:104 |
| Affiliate | D-110 cancelled commission → recorded (khôi phục) | apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts:40<br>apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts:43 | POST /v1/admin/affiliate/commissions/restore | apps/server/test/affiliate/affiliate-all.int.spec.ts:79 | apps/server/test/affiliate/affiliate-all.int.spec.ts:79 |
| Affiliate | AF-R08 đổi %: chỉ recorded; paid/cancelled bất biến (invariant) | apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts:54<br>apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts:55 | PATCH /v1/admin/affiliates/:id<br>PUT /v1/admin/affiliates/rate | apps/server/test/affiliate/admin-commissions.int.spec.ts:33 | apps/server/test/affiliate/admin-commissions.int.spec.ts:33 |

- Cạnh không có test "bị chặn" (409/404): 9/20
- Affiliate §20: 6 additional checks; implementation, trigger and positive/blocked native anchors mandatory (not included in the legacy blocked-edge summary).

## Kiểm 5: Permission key → guard

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c5-permissions.audit.ts`

Đạt: **190** · Không đạt: **0**

- overview.view: 1 route
- members.view: 1 route
- members.action: 6 route
- fees.view: 3 route
- fees.action: 7 route
- groups.view: 8 route
- groups.action: 7 route
- groups.moderate: 4 route
- bots.view: 6 route
- bots.action: 11 route
- events.view: 3 route
- events.action: 5 route
- projects.view: 3 route
- projects.action: 5 route
- investors.view: 3 route
- investors.action: 1 route
- services.view: 4 route
- services.action: 5 route
- affiliate.view: 7 route
- affiliate.action: 7 route
- affiliate.payout: 1 route
- settings.general: 14 route
- settings.mail: 19 route
- settings.admins: 10 route
- settings.log: 1 route
- stores.view: 3 route
- stores.action: 5 route
- reports.view: 3 route
- POST /v1/admin/auth/login: route phiên Admin, không cần khoá
- POST /v1/admin/auth/totp/verify: route phiên Admin, không cần khoá
- POST /v1/admin/auth/refresh: route phiên Admin, không cần khoá
- POST /v1/admin/auth/logout: route phiên Admin, không cần khoá
- GET /v1/admin/auth/me: route phiên Admin, không cần khoá
- POST /v1/admin/auth/first-password: route phiên Admin, không cần khoá
- POST /v1/admin/auth/2fa/setup: route phiên Admin, không cần khoá
- POST /v1/admin/auth/2fa/enable: route phiên Admin, không cần khoá
- Bảo vệ vai trò Super Admin (RB-R04, theo admin_roles.key): apps/server/src/modules/admin-account/services/admin-accounts.service.ts:29, apps/server/src/modules/admin-account/services/admin-accounts.service.ts:83, apps/server/src/modules/admin-account/services/admin-roles.service.ts:135, apps/server/src/modules/admin-account/services/admin-security.service.ts:80, apps/server/src/modules/admin-account/services/admin-security.service.ts:131, apps/server/src/modules/admin-account/services/admin-session.service.ts:64

## Kiểm 6: Env zod → .env.example

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c6-env.audit.ts`

Đạt: **154** · Không đạt: **20**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S4 | `apps/server/src/common/config/env.schema.ts:71` | server (dev): `BREVO_API_KEY` có trong schema nhưng không có trong apps/server/.env.example |
| 2 | S4 | `apps/server/src/common/config/env.schema.ts:72` | server (dev): `EMAIL_PROVIDER` có trong schema nhưng không có trong apps/server/.env.example |
| 3 | S4 | `apps/server/src/common/config/env.schema.ts:73` | server (dev): `EMAIL_FROM` có trong schema nhưng không có trong apps/server/.env.example |
| 4 | S4 | `apps/server/src/common/config/env.schema.ts:74` | server (dev): `EMAIL_FROM_NAME` có trong schema nhưng không có trong apps/server/.env.example |
| 5 | S4 | `apps/server/src/common/config/env.schema.ts:75` | server (dev): `EMAIL_API_KEY` có trong schema nhưng không có trong apps/server/.env.example |
| 6 | S4 | `apps/server/src/common/config/env.schema.ts:50` | server (prod): `BOT_LLM_PROVIDER` có trong schema nhưng không có trong infra/env/server.env.example |
| 7 | S4 | `apps/server/src/common/config/env.schema.ts:51` | server (prod): `LLM_LOCAL_BASE` có trong schema nhưng không có trong infra/env/server.env.example |
| 8 | S4 | `apps/server/src/common/config/env.schema.ts:52` | server (prod): `LLM_LOCAL_KEY` có trong schema nhưng không có trong infra/env/server.env.example |
| 9 | S4 | `apps/server/src/common/config/env.schema.ts:53` | server (prod): `LLM_LOCAL_MODELS` có trong schema nhưng không có trong infra/env/server.env.example |
| 10 | S4 | `apps/server/src/common/config/env.schema.ts:55` | server (prod): `LLM_LOCAL_MAX_REQUESTS` có trong schema nhưng không có trong infra/env/server.env.example |
| 11 | S4 | `apps/server/src/common/config/env.schema.ts:56` | server (prod): `LLM_LOCAL_MAX_TOKENS` có trong schema nhưng không có trong infra/env/server.env.example |
| 12 | S4 | `apps/server/src/common/config/env.schema.ts:57` | server (prod): `LLM_LOCAL_TIMEOUT_MS` có trong schema nhưng không có trong infra/env/server.env.example |
| 13 | S4 | `apps/server/src/common/config/env.schema.ts:71` | server (prod): `BREVO_API_KEY` có trong schema nhưng không có trong infra/env/server.env.example |
| 14 | S4 | `apps/server/src/common/config/env.schema.ts:82` | server (prod): `BANK_BIN` có trong schema nhưng không có trong infra/env/server.env.example |
| 15 | S4 | `infra/env/server.env.example:87` | server (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 16 | S4 | `infra/env/portal.env.example:10` | portal (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 17 | S4 | `apps/admin/next.config.ts:13` | admin (dev): `BASE_PATH` có trong schema nhưng không có trong apps/admin/.env.example |
| 18 | S4 | `infra/env/admin.env.example:10` | admin (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 19 | S4 | `packages/db/.env.example:3` | db (seed/migrate/test): `DATABASE_URL` có trong example nhưng không schema nào đọc |
| 20 | S4 | `apps/server/test/setup/env.ts:37` | test int server đọc `FEATURE_BOTS` nhưng apps/server/.env.example không có |

- Root `.env.example` không tồn tại — mỗi app/package có file riêng (không tính là lỗi)
