# TIP-B42: Marketing — chiến dịch, ước tính, gửi qua outbox, nhật ký thư (Q-G6b-*)

## HEADER
- TIP-ID: TIP-B42 · Module: marketing · Priority: P1 · Depends on: TIP-B41 · Estimated: M (8h)
- **Files touched:**
  - `apps/server/src/modules/marketing/**` (create)
  - `packages/shared/src/outbox/events.ts`, `apps/server/src/worker/processors/marketing.processor.ts`, `worker/worker-app.module.ts`, `worker/schedules.ts` (modify/create)
  - `apps/server/test/marketing/*.int.spec.ts` (create)
- **Parallel-safe with:** `sequential, shares api-app.module.ts, outbox/events.ts`.

## SPECIFICATIONS
1. `n.edit`. Summary, list (mới trước), templates (hằng prototype), estimate (all/business/personal: COUNT users active member; groups: tổng `groups.member_count` — Q-B42-1).
2. Tạo: draft 201 / schedule 201 / send 202 (`sending`, chốt recipients, outbox `campaign.send`); body sanitize; audienceLabel dựng ở server. `POST /:id/send` draft|scheduled → sending (UPDATE có điều kiện, 409 "Chiến dịch đã gửi hoặc đang gửi"). DELETE (409 khi sending).
3. Worker `campaign.send`: lấy người nhận theo lô (keyset id), `mail_logs` kind `campaign` qua `MailService.requestMany`, xong → `sent`. Scheduler 1 phút: `scheduled` đến hạn → gửi.
4. `GET /admin/mail/log` (kind welcome|campaign, sent) keyset/offset trên partial index; name = users.full_name theo email. Resend 202: dựng lại nội dung (welcome: template; campaign: body) → `MailService.request`.
5. Audit tag `content` (`campaign.draft|schedule|send|delete`, `mail.resend`).

## ACCEPTANCE CRITERIA
- Gửi chiến dịch 2 lần → lần 2 409; xoá khi đang gửi → 409.
- Worker gửi xong → `status=sent`, `mail_logs` đủ số người nhận.

## ⚠️ BUILDER-CHECKLIST
- [ ] Không query trong vòng lặp người nhận (lô); gate; commit; SHA
