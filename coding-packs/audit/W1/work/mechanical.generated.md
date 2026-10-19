# AUDIT-W1 làn A — kết quả thô (sinh tự động bởi run-all.audit.ts)

## Kiểm 1: Outbox → consumer

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c1-outbox.audit.ts`

Đạt: **16** · Không đạt: **0**

- membership_fee.activated: consumer = apps/server/src/worker/processors/fee.processor.ts:26, apps/server/src/worker/processors/notification.processor.ts:22; phát tại = apps/server/src/modules/membership-fee/services/membership-fee.service.ts:90
- membership_fee.changed: consumer = apps/server/src/worker/processors/fee.processor.ts:27; phát tại = apps/server/src/modules/membership-fee/services/fee-scheduler.service.ts:23
- user.locked: consumer = apps/server/src/worker/processors/account.processor.ts:17; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:85
- user.session_revoked: consumer = apps/server/src/worker/processors/account.processor.ts:19; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:90, apps/server/src/modules/account/services/password-reset.service.ts:87
- user.role_changed: consumer = apps/server/src/worker/processors/account.processor.ts:20; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:135, apps/server/src/modules/settings/services/admin-accounts.service.ts:147
- user.unlocked: consumer = apps/server/src/worker/processors/account.processor.ts:18; phát tại = apps/server/src/modules/account/services/admin-users.service.ts:96
- mail.requested: consumer = apps/server/src/worker/processors/mail.processor.ts:25; phát tại = apps/server/src/modules/mail/mail.service.ts:20, apps/server/src/modules/mail/mail.service.ts:27
- group.join_requested: consumer = apps/server/src/worker/processors/community.processor.ts:14; phát tại = apps/server/src/modules/community/services/group.service.ts:54
- chat.mentioned: consumer = apps/server/src/worker/processors/notification.processor.ts:19; phát tại = apps/server/src/modules/chat/services/message.service.ts:141, apps/server/src/modules/chat/services/message.service.ts:151
- moderation.warned: consumer = apps/server/src/worker/processors/notification.processor.ts:21; phát tại = apps/server/src/modules/moderation/services/admin-moderation.service.ts:65
- group.request_decided: consumer = apps/server/src/worker/processors/notification.processor.ts:20; phát tại = apps/server/src/modules/community/services/join-request.service.ts:65
- event.registered: consumer = apps/server/src/worker/processors/notification.processor.ts:23, apps/server/src/worker/processors/notification.processor.ts:24; phát tại = apps/server/src/modules/event/services/event.service.ts:68
- campaign.send: consumer = apps/server/src/worker/processors/marketing.processor.ts:29; phát tại = apps/server/src/modules/marketing/services/campaign.service.ts:80, apps/server/src/modules/marketing/services/campaign.service.ts:101, apps/server/src/modules/marketing/services/campaign.service.ts:164
- export.requested: consumer = apps/server/src/worker/processors/export.processor.ts:18; phát tại = apps/server/src/modules/export/export.service.ts:54
- service_request.mentioned: consumer = apps/server/src/worker/processors/notification.processor.ts:25; phát tại = apps/server/src/modules/service/services/service-admin.service.ts:199
- investor.admin_replied: consumer = apps/server/src/worker/processors/investor.processor.ts:14; phát tại = apps/server/src/modules/investor/services/investor-admin.service.ts:152
- publish 'session.revoked' lên socket:user: apps/server/src/modules/account/services/user-lifecycle.handler.ts:25, apps/server/src/modules/account/services/user-lifecycle.handler.ts:30

## Kiểm 2: Link do server sinh → đích có thật

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c2-links.audit.ts`

Đạt: **19** · Không đạt: **0**

- đạt — apps/server/src/common/integrations/integrations.module.ts:72 PORTAL_URL + path: `/v1/uploads` → api
- đạt — apps/server/src/modules/account/services/password-reset.service.ts:52 link đặt lại (portal): `/reset-password?token=${token}` → portal
- đạt — apps/server/src/modules/account/services/password-reset.service.ts:52 link đặt lại (admin): `/reset-password?token=${token}` → admin
- đạt — apps/server/src/modules/account/services/sso.service.ts:54 PORTAL_URL + path: `/sso/callback/${provider}` → portal
- đạt — apps/server/src/modules/investor/services/investor-notify.handler.ts:42 notification.link: `/projects/${row.project_id}` → portal
- đạt — apps/server/src/modules/investor/services/investor-notify.handler.ts:42 notification.link: `/projects` → portal
- đạt — apps/server/src/modules/mail/event-mail.handler.ts:41 PORTAL_URL + path: `/events/${p.eventId}` → portal
- đạt — apps/server/src/modules/mail/unsubscribe-token.ts:40 PORTAL_URL + path: `/unsubscribe?token=${this.sign(email)}` → portal
- đạt — apps/server/src/modules/mail/unsubscribe-token.ts:45 PORTAL_URL + path: `/v1/public/unsubscribe?token=${this.sign(email)}` → api
- đạt — apps/server/src/modules/marketing/services/campaign-sender.service.ts:43 PORTAL_URL + path: `/login` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:18 hàm dựng notification.link: `/chat/${groupId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:18 hàm dựng notification.link: `/chat/${groupId}/${slug}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:83 notification.link: `/chat/${p.groupId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:83 notification.link: `/community` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:117 notification.link: `/dashboard` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:142 notification.link: `/events/${p.eventId}` → portal
- đạt — apps/server/src/modules/notification/services/notification-events.handler.ts:155 notification.link: `/requests?code=${encodeURIComponent(p.code)}` → admin
- đạt — packages/shared/src/fixtures/prototype-seed.json:1695 mail chào mừng loginUrl: `/login` → portal
- đạt — packages/shared/src/fixtures/prototype-seed.json:1696 mail chào mừng guideUrl: `/huong-dan` → portal

## Kiểm 3: Giới hạn zod ≤ giới hạn body

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c3-body-limit.audit.ts`

Đạt: **73** · Không đạt: **0**

- Có cấu hình body tại apps/server/src/common/http/bootstrap-http.ts:18, apps/server/src/common/http/bootstrap-http.ts:19 — xem tay
- apps/server/src/modules/community/controllers/admin-groups.controller.ts:89 POST /v1/admin/groups/:id/members/export: schema `oneGroupExportSchema` không ở @opchub/shared — bỏ qua
- apps/server/src/modules/service/controllers/admin-service-requests.controller.ts:94 PATCH /v1/admin/service-requests/:code/assignee: schema `assignSchema` không ở @opchub/shared — bỏ qua
- Trường chuỗi/mảng trong body KHÔNG có .max (chỉ bị chặn bởi giới hạn body): 89 — bulkStatusSchema.userIds[], assignGroupsSchema.userIds[], assignGroupsSchema.groupIds[], userExportSchema.userIds[], loginRequestSchema.identifier, loginRequestSchema.password, updateProfileSchema.avatarUrl, emailChangeVerifySchema.code, forgotPasswordSchema.email, resetPasswordSchema.newPassword, changePasswordSchema.currentPassword, changePasswordSchema.newPassword, totpVerifySchema.code, registerPersonalSchema.fullName, registerPersonalSchema.phone.number, registerPersonalSchema.email, registerPersonalSchema.password, registerPersonalSchema.persona, registerPersonalSchema.groupIds[], registerBusinessSchema.taxCode, registerBusinessSchema.companyName, registerBusinessSchema.mainIndustry, registerBusinessSchema.otherIndustries[], registerBusinessSchema.size, registerBusinessSchema.country, registerBusinessSchema.representative, registerBusinessSchema.position, registerBusinessSchema.phone.number, registerBusinessSchema.email, registerBusinessSchema.password, registerBusinessSchema.groupIds[], otpVerifySchema.email, otpVerifySchema.code, otpResendSchema.email, ssoCompleteSchema.ssoToken, ssoCompleteSchema.phone.number, ssoCompleteSchema.groupIds[], personaUpsertSchema.groupIds[], personaUpsertSchema.color, scriptUpsertSchema.groupIds[], …

## Kiểm 4: Transition §8 → endpoint + test

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c4-transitions.audit.ts`

Đạt: **26** · Không đạt: **3**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | NỢ | `apps/server/src/modules/investor/repositories/investor-admin.repository.ts:146` | Quan tâm đầu tư: Đã gửi → Đang trao đổi — không có test int/contract cho cạnh hợp lệ |
| 2 | S2 | `apps/server/src/modules/investor/repositories/investor-admin.repository.ts` | Quan tâm đầu tư: Đang trao đổi → Đã kết nối — không thấy code transition |
| 3 | S3 | `apps/server/src/modules/bot/services/bot-thread.service.ts:99` | Hội thoại bot: Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted) — server chỉ có pending/posted, đăng tất cả dòng một lần khi Admin duyệt; không có trạng thái "Đang chạy", không job chạy theo runAt/delayMinutes |

| Máy | Cạnh | Code | Endpoint | Test hợp lệ | Test bị chặn |
|---|---|---|---|---|---|
| Tài khoản | Hoạt động → Đã khóa | apps/server/src/modules/account/repositories/admin-users.repository.ts:105 | PATCH /v1/admin/users/:id/status<br>POST /v1/admin/users/status<br>POST /v1/admin/reports/:id/action | apps/server/test/account/admin-users.int.spec.ts:69 | apps/server/test/account/admin-users.int.spec.ts:94 |
| Tài khoản | Đã khóa → Hoạt động | apps/server/src/modules/account/repositories/admin-users.repository.ts:101 | PATCH /v1/admin/users/:id/status<br>POST /v1/admin/users/status | apps/server/test/account/admin-users.int.spec.ts:69 | THIẾU |
| Phí | Chờ TT → Đang hiệu lực | apps/server/src/modules/membership-fee/services/membership-fee.service.ts:69 | POST /v1/webhooks/bank<br>POST /v1/admin/fees/:uid/:action<br>POST /v1/admin/fees/collect<br>POST /v1/admin/fees/transactions/:id/match | apps/server/test/membership-fee/reconcile.int.spec.ts:69 | apps/server/test/membership-fee/admin-fees.int.spec.ts:164 — TRANSITIONS: mọi trạng thái đều → active nên nhánh conflict của canTransition không bao giờ chạy |
| Phí | Đang hiệu lực → Sắp hết hạn | apps/server/src/modules/membership-fee/repositories/membership-fee.repository.ts:60 | job worker (fee.sweep) | apps/server/test/membership-fee/reconcile.int.spec.ts:151 | apps/server/test/membership-fee/reconcile.int.spec.ts:151 |
| Phí | Sắp hết hạn → Hết hạn | apps/server/src/modules/membership-fee/repositories/membership-fee.repository.ts:56 | job worker (fee.sweep) | apps/server/test/membership-fee/reconcile.int.spec.ts:151 | apps/server/test/membership-fee/reconcile.int.spec.ts:151 |
| Phí | Hết hạn → Gia hạn → Đang hiệu lực | apps/server/src/modules/membership-fee/domain/membership-fee.state.ts:9 | POST /v1/webhooks/bank<br>POST /v1/admin/fees/:uid/:action<br>POST /v1/admin/fees/collect | apps/server/test/membership-fee/admin-fees.int.spec.ts:64 | THIẾU — action 'renew' (FEE_ACTIONS) không có test nào gọi |
| Phí | Đang hiệu lực → Gia hạn (nối tiếp) | apps/server/src/modules/membership-fee/domain/membership-fee.state.ts:7 | POST /v1/webhooks/bank | apps/server/test/membership-fee/reconcile.int.spec.ts:89 | THIẾU |
| Yêu cầu vào nhóm | Chờ duyệt → Thành viên | apps/server/src/modules/community/repositories/join-request.repository.ts:59 | POST /v1/groups/:id/requests/:userId/:decision | apps/server/test/community/join-requests.int.spec.ts:58 | apps/server/test/community/join-requests.int.spec.ts:58 — bị chặn trả 404 (không phải 409) |
| Yêu cầu vào nhóm | Chờ duyệt → Từ chối | apps/server/src/modules/community/repositories/join-request.repository.ts:59 | POST /v1/groups/:id/requests/:userId/:decision | apps/server/test/community/join-requests.int.spec.ts:80 | THIẾU |
| Yêu cầu vào nhóm | Chờ duyệt → Hủy | apps/server/src/modules/community/services/group.service.ts:68 | DELETE /v1/groups/:id/join | apps/server/test/community/groups.int.spec.ts:79 | THIẾU |
| Dự án | Nháp → Chờ duyệt | apps/server/src/modules/project/services/project-write.service.ts:46 | POST /v1/projects<br>PATCH /v1/projects/:id | apps/server/test/project/projects.int.spec.ts:35 | apps/server/test/project/projects.int.spec.ts:75 |
| Dự án | Chờ duyệt → Đang hiển thị | apps/server/src/modules/project/domain/project-status.ts:9 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | apps/server/test/project/admin-projects.int.spec.ts:43 | apps/server/test/project/admin-projects.int.spec.ts:43 |
| Dự án | Đang hiển thị → Đã ẩn | apps/server/src/modules/project/domain/project-status.ts:12 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | apps/server/test/project/admin-projects.int.spec.ts:71 | THIẾU |
| Dự án | Đã ẩn → Đang hiển thị | apps/server/src/modules/project/domain/project-status.ts:13 | POST /v1/admin/projects/:id/review<br>POST /v1/admin/projects/bulk | apps/server/test/project/admin-projects.int.spec.ts:219 | THIẾU |
| Dự án | Chờ duyệt → Cần chỉnh sửa | apps/server/src/modules/project/domain/project-status.ts:10 | POST /v1/admin/projects/:id/review | apps/server/test/project/admin-projects.int.spec.ts:193 | THIẾU |
| Dự án | Cần chỉnh sửa → Chờ duyệt | apps/server/src/modules/project/domain/project-status.ts:22 | PATCH /v1/projects/:id | apps/server/test/project/admin-projects.int.spec.ts:190 | apps/server/test/project/projects.int.spec.ts:293 |
| Dự án | Chờ duyệt → Bị từ chối | apps/server/src/modules/project/domain/project-status.ts:11 | POST /v1/admin/projects/:id/review | apps/server/test/project/admin-projects.int.spec.ts:50 | apps/server/test/project/admin-projects.int.spec.ts:43 |
| Báo cáo tin | Mới → Đã xử lý (bỏ qua/ẩn/cảnh báo/khóa) | apps/server/src/modules/moderation/repositories/report.repository.ts:120 | POST /v1/admin/reports/:id/action | apps/server/test/moderation/moderation.int.spec.ts:101 | apps/server/test/moderation/moderation.int.spec.ts:101 |
| Đăng ký sự kiện | Đã đăng ký → Đã tham dự | apps/server/src/modules/event/repositories/event.repository.ts:211 | POST /v1/admin/events/:id/registrations/check-in | apps/server/test/event/admin-events.int.spec.ts:103 | apps/server/test/event/admin-events.int.spec.ts:151 — id đã huỷ bị bỏ qua (BUG-041, theo lô), không 409 |
| Đăng ký sự kiện | Đã đăng ký → Đã hủy | apps/server/src/modules/event/repositories/event.repository.ts:151 | DELETE /v1/events/:id/registration | apps/server/test/event/events.int.spec.ts:54 | apps/server/test/event/events.int.spec.ts:116 |
| Phiếu YC | Mới → Đang tư vấn | packages/shared/src/api-domains/services-admin.ts:24 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | apps/server/test/service/service.int.spec.ts:179 | apps/server/test/service/service.int.spec.ts:178 |
| Phiếu YC | Đang tư vấn → Đã báo giá | packages/shared/src/api-domains/services-admin.ts:25 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | apps/server/test/contract/service-request.int.spec.ts:135 | THIẾU |
| Phiếu YC | Đã báo giá → Thành công | packages/shared/src/api-domains/services-admin.ts:26 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | apps/server/test/service/service.int.spec.ts:232 | apps/server/test/service/service.int.spec.ts:234 |
| Phiếu YC | (Mới|Đang tư vấn|Đã báo giá) → Từ chối | packages/shared/src/api-domains/services-admin.ts:26 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | apps/server/test/service/service.int.spec.ts:229 | apps/server/test/service/service.int.spec.ts:235 |
| Phiếu YC | Từ chối → mở lại (Đang tư vấn) | packages/shared/src/api-domains/services-admin.ts:28 | POST /v1/admin/service-requests/:code/transition<br>PATCH /v1/admin/service-requests/:code | apps/server/test/service/service.int.spec.ts:230 | THIẾU |
| Quan tâm đầu tư | Đã gửi → Đang trao đổi | apps/server/src/modules/investor/repositories/investor-admin.repository.ts:146 | POST /v1/investor-thread/:key/messages<br>POST /v1/admin/investors/:key/comments | THIẾU | THIẾU |
| Quan tâm đầu tư | Đang trao đổi → Đã kết nối | THIẾU | PATCH /v1/admin/investors/:key/status | apps/server/test/investor/investors.int.spec.ts:166 | THIẾU — UPDATE KHÔNG điều kiện `WHERE status` (vi phạm luật 7): đặt được mọi trạng thái, cả lùi connected → sent |
| Hội thoại bot | Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted) | apps/server/src/modules/bot/services/bot-thread.service.ts:99 | POST /v1/admin/bot/threads/:id/approve | apps/server/test/bot/bot.int.spec.ts:75 | apps/server/test/bot/bot.int.spec.ts:75 — server chỉ có pending/posted, đăng tất cả dòng một lần khi Admin duyệt; không có trạng thái "Đang chạy", không job chạy theo runAt/delayMinutes |

- Cạnh không có test "bị chặn" (409/404): 12/28

## Kiểm 5: Permission key → guard

Lệnh: `packages/db/node_modules/.bin/tsx apps/server/test/audit/c5-permissions.audit.ts`

Đạt: **132** · Không đạt: **20**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S3 | `packages/shared/src/permissions.ts` | key `m.role` không có trong @RequirePermission nào và không nơi nào kiểm |
| 2 | S3 | `packages/shared/src/permissions.ts` | key `p.edit` không có trong @RequirePermission nào và không nơi nào kiểm |
| 3 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:56` | so tên vai trò: `if (res.me.systemRole === 'member') return t('login.errorWrongApp');` |
| 4 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:70` | so tên vai trò: `label: a.role === 'admin' ? t('login.demoAdmin') : t('login.demoUser'),` |
| 5 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:73` | so tên vai trò: `tag: a.role === 'admin' ? t('login.tagAdmin') : t('login.tagUser'),` |
| 6 | S4 | `apps/admin/src/features/auth/components/login-screen.tsx:74` | so tên vai trò: `tone: a.role === 'admin' ? ('violet' as const) : ('blue' as const),` |
| 7 | S4 | `apps/admin/src/features/settings/components/admins-tab.tsx:18` | so tên vai trò: `const owner = x.role === 'super_admin';` |
| 8 | S4 | `apps/admin/src/features/settings/hooks/use-admins.ts:51` | so tên vai trò: `if (a.role === 'super_admin') return;` |
| 9 | S4 | `apps/admin/src/lib/api-client.ts:53` | so tên vai trò: `if (useAuthStore.getState().me?.systemRole === 'member') {` |
| 10 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:60` | so tên vai trò: `if (res.me.systemRole !== 'member') return t('login.errorWrongApp');` |
| 11 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:74` | so tên vai trò: `label: a.role === 'admin' ? t('login.demoAdmin') : t('login.demoUser'),` |
| 12 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:77` | so tên vai trò: `tag: a.role === 'admin' ? t('login.tagAdmin') : t('login.tagUser'),` |
| 13 | S4 | `apps/portal/src/features/auth/components/login-screen.tsx:78` | so tên vai trò: `tone: a.role === 'admin' ? ('violet' as const) : ('blue' as const),` |
| 14 | NỢ | `apps/server/src/modules/account/services/password-reset.service.ts:71` | so tên vai trò: `return systemRole === 'member' ? this.env.PORTAL_URL : this.env.ADMIN_URL;` |
| 15 | NỢ | `apps/server/src/modules/account/services/sso.service.ts:75` | so tên vai trò: `if (user.systemRole !== 'member') throw forbidden(SSO_ADMIN_FORBIDDEN);` |
| 16 | NỢ | `apps/server/src/modules/investor/repositories/investor-comment.repository.ts:30` | so tên vai trò: `if (!r.author_name \|\| r.author_role !== 'member') return INVESTOR_ADMIN_NAME;` |
| 17 | NỢ | `apps/server/src/modules/service/services/service-admin.service.ts:28` | so tên vai trò: `const ADMIN_ROLES: SystemRole[] = ['super_admin', 'admin', 'moderator'];` |
| 18 | NỢ | `apps/server/src/modules/settings/services/admin-accounts.service.ts:59` | so tên vai trò: `role: u.systemRole === 'member' ? ('moderator' as const) : u.systemRole,` |
| 19 | NỢ | `apps/server/src/modules/settings/services/admin-accounts.service.ts:70` | so tên vai trò: `role: i.systemRole === 'admin' ? ('admin' as const) : ('moderator' as const),` |
| 20 | NỢ | `apps/server/src/modules/settings/services/admin-accounts.service.ts:138` | so tên vai trò: `if (target.systemRole === 'super_admin') {` |

- m.view: 13 route
- m.edit: 9 route
- c.create: 3 route
- c.room: 2 route
- c.mod: 22 route
- p.pub: 14 route
- e.edit: 3 route
- e.reg: 4 route
- n.edit: 23 route
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

Đạt: **126** · Không đạt: **16**

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | S4 | `apps/server/src/common/config/env.schema.ts:27` | server (prod): `RATE_LIMIT_DISABLED` có trong schema nhưng không có trong infra/env/server.env.example (mặc định false — đúng, chỉ là thiếu tài liệu) |
| 2 | S4 | `apps/server/src/common/config/env.schema.ts:48` | server (prod): `FAKE_MAIL_DIR` có trong schema nhưng không có trong infra/env/server.env.example |
| 3 | S4 | `apps/server/src/common/config/env.schema.ts:73` | server (prod): `STORAGE_PROVIDER` có trong schema nhưng không có trong infra/env/server.env.example (mặc định s3 — đúng cho production) |
| 4 | S4 | `apps/server/src/common/config/env.schema.ts:75` | server (prod): `LOCAL_STORAGE_DIR` có trong schema nhưng không có trong infra/env/server.env.example |
| 5 | S4 | `infra/env/server.env.example:75` | server (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 6 | S4 | `apps/portal/next.config.ts:12` | portal (dev): `NEXT_DIST_DIR` có trong schema nhưng không có trong apps/portal/.env.example |
| 7 | S4 | `apps/portal/src/lib/env.ts:10` | portal (prod): `NEXT_PUBLIC_SOCKET_URL` có trong schema nhưng không có trong infra/env/portal.env.example (trống = cùng origin) |
| 8 | S4 | `infra/env/portal.env.example:10` | portal (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 9 | S4 | `apps/admin/next.config.ts:12` | admin (dev): `NEXT_DIST_DIR` có trong schema nhưng không có trong apps/admin/.env.example |
| 10 | S4 | `infra/env/admin.env.example:12` | admin (prod): `SENTRY_DSN` có trong example nhưng không schema nào đọc (giữ chỗ Q-B65-1, chưa tích hợp) |
| 11 | S4 | `packages/db/seed/load.ts:15` | db (seed/migrate/test): `LOAD_USERS` có trong schema nhưng không có trong packages/db/.env.example |
| 12 | S4 | `packages/db/seed/load.ts:16` | db (seed/migrate/test): `LOAD_GROUPS` có trong schema nhưng không có trong packages/db/.env.example |
| 13 | S4 | `packages/db/seed/load.ts:20` | db (seed/migrate/test): `LOAD_PASSWORD` có trong schema nhưng không có trong packages/db/.env.example |
| 14 | S4 | `packages/db/.env.example:2` | db (seed/migrate/test): `DATABASE_URL` có trong example nhưng không schema nào đọc |
| 15 | S4 | `apps/server/test/setup/env.ts:11` | test int server đọc `TEST_DATABASE_URL` nhưng apps/server/.env.example không có |
| 16 | S4 | `apps/server/test/setup/env.ts:19` | test int server đọc `TEST_LOG_LEVEL` nhưng apps/server/.env.example không có |

- Root `.env.example` không tồn tại — mỗi app/package có file riêng (không tính là lỗi)
