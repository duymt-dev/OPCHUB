# TIP-B41: Mail chào mừng + SMTP + worker gửi (D-13, D-47)

## HEADER
- TIP-ID: TIP-B41 · Module: mail · Priority: P0 · Depends on: TIP-B40 · Estimated: M (8h)
- **Files touched:**
  - `apps/server/src/modules/mail/**` (create: `controllers/admin-mail.controller.ts`, `services/{smtp-config,mail-admin}.service.ts`, `smtp-transport.ts`; modify `mail-sender.service.ts`, `mail.module.ts`, `index.ts`)
  - `packages/shared/src/outbox/events.ts` (modify — chỉ thêm dòng nếu cần)
  - `apps/server/src/modules/notification/**` hoặc `mail` consumer `event.registered` (modify)
  - `apps/server/test/mail/admin-mail.int.spec.ts` (create)
- **Parallel-safe with:** `sequential, shares api-app.module.ts`.

## SPECIFICATIONS
1. `GET/PUT /admin/mail/welcome` (`s.cfg`): đọc/ghi `app_settings.welcome_mail` + invalidate + audit `mail.welcome.update`. `POST …/welcome/test {to}` → 202 `mailJob`, ghi `mail_logs` kind `test` qua `MailService.request` (outbox), audit.
2. `GET/PUT /admin/smtp`: không bao giờ trả key; `key` mới → `SecretBox.seal` → `key_enc`; `hasKey`. Audit `smtp.update` (luật 10 — mock không có).
3. `POST /admin/smtp/verify`: `MAIL_PROVIDER=fake` → không gọi mạng, ok khi có key (gửi kèm hoặc đã lưu); `smtp` → `provider.verify()`. Thông điệp đúng chuỗi MSW. Audit `smtp.verify`.
4. `POST /admin/smtp/test {to}`: chưa có key → `{ok:false,"Chưa cấu hình API key SMTP"}`; có → ghi mail test qua outbox → `{ok:true,"Đã gửi thư thử tới {to}"}`.
5. Worker gửi: dùng cấu hình `smtp_configs` (giải mã key) khi `MAIL_PROVIDER=smtp` + `enabled` + có key; giới hạn `daily_limit`/ngày VN (Redis counter) — vượt → hoãn (job retry sau nửa đêm).
6. Consumer `event.registered` → mail xác nhận (kind `event`).

## ACCEPTANCE CRITERIA
- PUT smtp có key → GET `hasKey:true`, DB `key_enc` không chứa key rõ.
- Verify fake + key → ok "Xác thực thành công với smtp-relay.brevo.com:465".

## ⚠️ BUILDER-CHECKLIST
- [ ] Không gọi mạng trong test; không in key ra log; gate; commit; SHA
