# TIP-B45: Bot (flag FEATURE_BOTS) — D-04, D-48, S-11, BR-10

## HEADER
- TIP-ID: TIP-B45 · Module: bot · Priority: P2 · Depends on: TIP-B23 · Estimated: L (12h)
- **Files touched:**
  - `apps/server/src/modules/bot/**` (create)
  - `apps/server/src/modules/chat/services/persona-message.service.ts`, `chat/repositories/message.repository.ts`, `chat/index.ts` (create/modify: đường đăng tin persona)
  - `apps/server/src/common/config/env.schema.ts`, `.env.example` (modify: `FEATURE_BOTS`, `FEATURE_SERVICES`)
  - `apps/server/src/api/api-app.module.ts` (modify: đăng ký có điều kiện)
  - `apps/server/test/bot/*.int.spec.ts` (create)
- **Parallel-safe with:** `sequential`.

## SPECIFICATIONS
1. Flag tắt → module không đăng ký → 404. Quyền `c.mod`.
2. Personas / scripts CRUD (id `ps<n>` / `sc<n>` từ sequence — e2e khớp `ps\d+`), audit tag `moderation`.
3. Run → thread `pending` (202, D-04 luôn duyệt); approve: UPDATE `pending → posted` có điều kiện (409), đăng từng dòng vào phòng `general` các nhóm qua `PersonaMessageService` (sender NULL, `persona_id`, `is_simulated=true`, idempotent `client_msg_id = bot-{thread}-{i}`, rate limit theo nhóm S-11), phát `message.new` DTO Portal (không `isSimulated`), ghi `bot_activity`. Discard: xoá khi pending.
4. Settings `app_settings.bot`; activity 40 dòng mới nhất + `todayCount` (tổng tin hôm nay VN).
5. Xoá kịch bản → xoá thread của nó (FK cascade).

## ⚠️ BUILDER-CHECKLIST
- [ ] Portal không thấy `isSimulated`; gate; commit; SHA
