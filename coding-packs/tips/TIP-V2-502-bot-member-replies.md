# TIP-V2-502: Persona tự phản hồi thành viên thật, công tắc khẩn cấp + ẩn tin bot, hội thoại bot trên Dashboard (QT-07, UAT-14/15, LK-11)

## HEADER
- TIP-ID: TIP-V2-502 · Project: OPCHUB · Module: bot + chat + dashboard · Priority: P0 · Depends on: TIP-V2-501, TIP-V2-305 (Dashboard bỏ số giả, BUG-012) · Estimated: L
- **Files touched:**
  - `apps/server/src/modules/bot/services/bot-reply.service.ts` (create: nghe tin thành viên, chọn persona, xếp lượt phản hồi), `services/bot-kill-switch.service.ts` (create: tắt khẩn cấp + ẩn tin bot), `domain/reply-pick.ts` + `reply-pick.spec.ts` (create)
  - `apps/server/src/modules/bot/bot-core.module.ts`, `bot.controller.ts`, `services/bot-thread.service.ts` (modify: endpoint `POST /admin/bot/emergency-stop`, `POST /admin/bot/hide-messages`; hội thoại `kind: 'script' | 'auto' | 'reply'`)
  - `apps/server/src/modules/chat/services/message.service.ts` (modify 1–2 dòng: hook `onSent` truyền thêm `groupId`, `replyToPersonaId`), `chat/index.ts` (export nếu cần)
  - `apps/server/src/modules/chat/repositories/message.repository.ts` (modify: `hideSimulated(groupIds?)` một câu `UPDATE … SET hidden_at` + publish `message.updated`/`room.reload`)
  - `apps/server/src/worker/processors/bot.processor.ts` (modify: job `bot.reply { messageId }`), `packages/shared/src/queues/queues.ts` (modify)
  - `packages/db/prisma/schema/bot.prisma` (modify: `BotThread.triggerMessageId String?` UNIQUE — một phản hồi cho một tin thành viên), migration `<ts>_bot_reply` (**do agent chính tạo, `--create-only` + review SQL**)
  - `apps/server/src/modules/dashboard/dashboard-live.service.ts` (modify: `threads` lấy từ tin persona thật gần nhất trong phòng Chung — hội thoại bot + phản hồi, ≤ 50 mục), `packages/shared/src/api-domains/dashboard.ts` (modify nếu thiếu trường)
  - `packages/shared/src/api-domains/bot.ts` (modify: schema emergency/hide), `apps/admin/src/features/bots/{api.ts,types.ts}`, `components/{auto-panel,bots-screen}.tsx`, `hooks/use-bot-actions.ts`, `components/emergency-bar.tsx` (create), `apps/admin/messages/vi/bots.json`, `apps/admin/src/mocks/handlers/bots.ts`, `packages/shared/src/mock-data/domains/bot-ops.ts` (modify)
  - Test: `apps/server/test/bot/bot-reply.int.spec.ts` (create), `apps/server/test/dashboard/dashboard.int.spec.ts`, `apps/server/test/contract/bot.int.spec.ts` (modify), `e2e/behavior/bot-live.spec.ts` (create), `e2e/behavior/admin-bots.spec.ts` (modify)
- **Parallel-safe with:** sequential sau 501 (chung `bot/*`, `persona-message.service.ts`); shares `dashboard-live.service.ts` với TIP-V2-305 (phải merge 305 trước)
- **Phase / nhánh:** V2-P5, `feature/V2-P5-bot-acceptance`

## CONTEXT
- Đọc: QT-07 bước 6 ("Trả lời → bot chọn persona trong nhóm, trong giờ để phản hồi"), UAT-14, UAT-15 (phần "hiện ở Dashboard"), LK-11 / REQ-411, NA-08, D-50 (đăng ngay, qua NA-07), D-48 (danh tính persona), D-51 (flag = công tắc khẩn cấp), REQ-141 ("giữ nút tắt khẩn cấp + ẩn tin bot"); BUG-008 (server không đọc `replyToMembers`, `autoGenerate`); TEST-GAPS REQ-141 (không test tắt khẩn cấp, ẩn tin bot).
- Prototype ver2: tuỳ chọn "Tự sinh kịch bản từ chủ đề" (`autoGenerate`), "Tự trả lời thành viên thật — Persona trong nhóm phản hồi khi thành viên nhắn tin" (`replyToMembers`), "Gắn nhãn Thành viên mô phỏng" (chỉ Dashboard, mặc định tắt); Dashboard khối "Thảo luận mới".
- Hiện trạng: `MessageService.onSent` (hook sau commit, KeywordFilterService dùng); `PersonaMessageService` (501 đã đổi sang đăng từng lượt); `dashboard-live.service.ts` trả `threads` từ mock (305 thay số liệu, 502 thay `threads`).

## APPLICABLE STANDARDS
[socket-chat](../standards/realtime/socket-chat.md) (S-04, S-11, S-12) · [queues-workers](../standards/backend/queues-workers.md) · [adapters](../standards/integrations/adapters.md) · [data-state](../standards/frontend/data-state.md) · [testing](../standards/testing/testing.md)

## TASK
Khi thành viên thật nhắn trong phòng Chung của nhóm, một persona đang bật, gán nhóm đó và trong khung giờ tự phản hồi sau giãn cách; thêm công tắc khẩn cấp dừng mọi hoạt động bot và nút ẩn toàn bộ tin bot; Dashboard Portal hiển thị hội thoại bot thật.

## SPECIFICATIONS
### Business Rules
1. **Kích hoạt** (QT-07 bước 6, UAT-14): hook `onSent` của tin **thành viên** (sender ≠ null, `is_simulated=false`) trong phòng mặc định của nhóm → enqueue `bot.reply { messageId }` (jobId `bot-reply-{messageId}`), không chặn đường gửi tin (S-08). Điều kiện xử lý: `FEATURE_BOTS`, `bot.enabled`, `bot.replyToMembers` đều bật.
2. **Chọn persona** (`reply-pick.ts`, hàm thuần, truyền `now` + `random`): persona `enabled`, `groupIds` chứa nhóm, trong `activeHours` giờ VN, chưa vượt `postsPerDay`; ưu tiên persona đã nói trong 10 tin gần nhất của phòng hoặc được trả lời trực tiếp (`replyToId` trỏ tin persona). Không có ai hợp lệ → bỏ, ghi `bot_activity` "Không có persona trong giờ để phản hồi".
3. **Chống spam**: mỗi phòng tối đa 1 phản hồi đang chờ; mỗi tin thành viên tối đa 1 phản hồi (`triggerMessageId` UNIQUE); cooldown phòng 2' giữa hai phản hồi (Redis). Không phản hồi tin của chính persona (tránh vòng lặp).
4. **Đăng**: tạo `bot_threads` `kind='reply'`, `scheduled`, `nextAt = now + [30 s, 5']` (cùng hàm giãn cách 501); lượt sinh bằng `LlmProvider.generateTurn({ topic: tin thành viên, persona, history })` (FakeLlm ở dev/test), `replyToId` = tin thành viên, đăng ngay không duyệt, qua NA-07 (D-50). Áp trần 120 tin mô phỏng / 30 hội thoại của 501.
5. **Công tắc khẩn cấp** (REQ-141, D-51): `POST /admin/bot/emergency-stop` (khoá `bots.action`) → `bot.enabled=false`, mọi hội thoại `scheduled|running` → `done` (UPDATE có điều kiện), xoá job bot đang chờ trong queue, audit `bot.emergency_stop` cùng transaction. Bật lại bằng công tắc "Chế độ tự động" như thường.
6. **Ẩn tin bot** (REQ-141): `POST /admin/bot/hide-messages { groupIds?: string[] }` → `hidden_at = now()` cho mọi tin `is_simulated=true` chưa ẩn (theo nhóm nếu có), một câu SQL; phát sự kiện để phòng đang mở tải lại (dùng `message.updated` cho từng tin nếu ≤ 200, ngược lại sự kiện `room.reload` — thêm vào `serverEvents` nếu chưa có); audit `bot.hide_messages`. Tin ẩn không hiện ở Portal, Dashboard; Admin xem chat vẫn thấy nhãn đã ẩn.
7. **Dashboard** (UAT-15, LK-11): `threads` = tối đa 50 mục mới nhất gồm tin mở đầu hội thoại bot (`kind` script/auto) + phản hồi đầu tiên (`reply`), lấy từ `messages` phòng mặc định (is_simulated, chưa ẩn) — một query keyset có index `messages (room_id, created_at DESC) WHERE is_simulated`; tên/màu persona như thành viên (không nhãn bot trừ khi `simLabel` bật — xem Câu hỏi). Cache 10 s hiện có giữ nguyên.
8. Portal: không đổi UI chat (tin persona đến qua `message.new` như tin người).

## ACCEPTANCE CRITERIA
- Given `replyToMembers=true`, persona P gán nhóm c1, trong giờ, When thành viên gửi tin ở `c1-general`, Then trong 30 s – 5' (fake timer) có đúng 1 tin của P trả lời tin đó (UAT-14, QT-07, BUG-008).
- Given `replyToMembers=false` hoặc persona ngoài giờ/không gán nhóm, Then không có phản hồi; ngoài giờ có dòng nhật ký (UAT-14 âm).
- Given 3 tin thành viên liên tiếp trong 2', Then chỉ 1 phản hồi (cooldown) (chống spam).
- Given bot đang chạy hội thoại, When Admin bấm "Tắt khẩn cấp", Then không đăng thêm lượt nào, hội thoại → Hoàn tất, có audit (REQ-141).
- Given phòng có tin bot, When "Ẩn tin bot", Then Portal không còn thấy tin bot, tin người giữ nguyên (REQ-141).
- Given hội thoại bot vừa đăng, When mở Dashboard Portal, Then khối "Thảo luận mới" có hội thoại đó với tên persona (UAT-15, LK-11).
- Given thiếu `bots.action`, When gọi emergency-stop/hide, Then 403 `VIEW_ONLY` (RB-R07).

## TESTS BẮT BUỘC
- Unit `apps/server/src/modules/bot/domain/reply-pick.spec.ts`: `UAT-14 chọn persona trong nhóm, trong giờ`, `UAT-14 không chọn persona ngoài giờ / tắt / hết postsPerDay`.
- `apps/server/test/bot/bot-reply.int.spec.ts`: `UAT-14 thành viên nhắn → persona phản hồi`, `REQ-411 replyToMembers tắt thì không phản hồi`, `REQ-411 mỗi tin tối đa 1 phản hồi, job chạy 2 lần không trùng`, `REQ-207 phản hồi qua lọc NA-07`, `REQ-141 tắt khẩn cấp dừng hội thoại + audit`, `REQ-141 ẩn tin bot`, test âm quyền.
- `apps/server/test/dashboard/dashboard.int.spec.ts`: `UAT-15 Dashboard hiện hội thoại bot thật, không có isSimulated`.
- `e2e/behavior/bot-live.spec.ts` (msw + server, không nhánh `onServer` làm yếu assertion): `UAT-14 thành viên nhắn trong nhóm → persona phản hồi` (server: worker chạy, chờ có hạn), `UAT-15 hội thoại bot hiện ở Dashboard`, `REQ-141 tắt khẩn cấp + ẩn tin bot từ Admin`.

## CONSTRAINTS
- DO NOT: query DB theo từng người nhận (S-04); chạy LLM thật ở dev/test; lộ `isSimulated` ra Portal (D-48); chặn đường gửi tin của thành viên chờ bot.
- DO NOT sửa logic lịch kịch bản (501) ngoài việc dùng lại hàm giãn cách/trần.
- REUSE: `MessageService.onSent`, `PersonaMessageService`, `QueueService`, hàm domain của 501, `RoomEventsPublisher`.
- SKIP: nhãn "Thành viên mô phỏng" phía Portal chat (D-48 không hiện).

## ⚠️ BUILDER-CHECKLIST
- [ ] S-04, S-08, S-11, S-12; luật 5 (một câu SQL cho ẩn tin / Dashboard), luật 7 (transition có điều kiện), luật 10 (audit tắt khẩn cấp/ẩn tin), luật 11 (LLM qua adapter).
- [ ] File BE ≤ 400, FE ≤ 250 dòng; `messages/vi/bots.json` chỉ thêm khoá.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck`; e2e msw + server.
- [ ] `git commit -- <paths>`, `git status --short` sạch, `TIP-V2-502-DONE <sha>`, report `coding-packs/reports/TIP-V2-502-completion.md`.
