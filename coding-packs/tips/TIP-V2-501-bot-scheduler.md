# TIP-V2-501: Bot tự động 100% — scheduler theo lịch kịch bản, trạng thái "Đang chạy", đăng ngay (NA-08, D-50)

## HEADER
- TIP-ID: TIP-V2-501 · Project: OPCHUB · Module: bot + worker + integrations/llm · Priority: P0 · Depends on: TIP-V2-101 (outbox), TIP-V2-203 (khoá `bots.*`), TIP-V2-306 (NA-07 quét cả tin persona) · Estimated: L
- **Files touched:**
  - `packages/db/prisma/schema/bot.prisma` (modify: `BotThreadStatus` → `scheduled | running | done`; `BotThread` thêm `nextAt`, `cursor`, `personaQueue`; `BotScript` thêm `lastRunAt`; `Persona.activeHours` giữ chuỗi, parse ở domain)
  - `packages/db/prisma/migrations/<ts>_bot_auto/migration.sql` (create — **migration do agent chính tạo, `--create-only` + review SQL**: map `pending→scheduled`, `posted→done`; index `bot_threads (status, next_at) WHERE status IN ('scheduled','running')`)
  - `apps/server/src/modules/bot/bot-core.module.ts` (create: service dùng chung api + worker), `bot.module.ts`, `index.ts` (modify)
  - `apps/server/src/modules/bot/domain/{schedule,active-hours,bot-thread-status}.ts` (create, hàm thuần) + `*.spec.ts` cạnh file
  - `apps/server/src/modules/bot/services/bot-scheduler.service.ts`, `bot-runner.service.ts`, `bot-retention.service.ts` (create), `bot-thread.service.ts` (modify: bỏ approve/discard, `run` = xếp lịch chạy ngay), `bot-log.service.ts` (modify)
  - `apps/server/src/modules/bot/bot.controller.ts`, `bot.mapper.ts` (modify: bỏ `POST bot/threads/:id/approve`, `DELETE bot/threads/:id` → `POST bot/threads/:id/stop`)
  - `apps/server/src/worker/processors/bot.processor.ts` (create), `apps/server/src/worker/worker-app.module.ts`, `apps/server/src/worker/schedules.ts` (modify: chỉ thêm dòng `bot-tick` mỗi 10s)
  - `packages/shared/src/queues/queues.ts` (modify: `bot.tick`, `bot.postTurn { threadId, turn }`), `packages/shared/src/api-domains/{bot,bot-threads}.ts` (modify: status mới, bỏ `requireReview`)
  - `packages/integrations/src/llm/index.ts` (modify: `generateTurn(ctx)`), `apps/server/src/common/integrations/integrations.module.ts` (modify: token `LLM`, `FakeLlmProvider` ở dev/test; provider thật chưa bật)
  - `apps/server/src/modules/chat/services/persona-message.service.ts`, `apps/server/src/modules/chat/repositories/message.repository.ts` (modify: đăng **một** lượt, gọi hook `onSent` để NA-07 quét; trần 120 tin mô phỏng/phòng)
  - `apps/server/src/common/config/env.schema.ts`, `apps/server/.env.example` (modify: `BOT_LLM_PROVIDER=fake`)
  - `apps/admin/src/features/bots/{api.ts,types.ts,model.ts,model.spec.ts}`, `components/{thread-list,auto-panel,bots-screen}.tsx`, `apps/admin/messages/vi/bots.json`, `apps/admin/src/mocks/handlers/bots.ts`, `packages/shared/src/mock-data/domains/bot-ops.ts` (modify: nhãn "Chờ lịch / Đang chạy · lượt x/y / Hoàn tất", bỏ Duyệt/Bỏ, nút Dừng)
  - Test: `apps/server/test/bot/bot-scheduler.int.spec.ts` (create), `apps/server/test/bot/bot.int.spec.ts`, `apps/server/test/contract/bot.int.spec.ts`, `apps/server/test/gates/b5-admin-ops.int.spec.ts`, `e2e/behavior/admin-bots.spec.ts` (modify)
- **Parallel-safe with:** TIP-V2-401…404; `sequential, shares persona-message.service.ts / bot/* với TIP-V2-502`
- **Phase / nhánh:** V2-P5, `feature/V2-P5-bot-acceptance`

## CONTEXT
- Đọc: NA-08 (§8.10), lịch tác vụ §8.2 ("Theo kịch bản (10 s – 5 phút)"), §9 "Hội thoại bot: Chờ lịch → Đang chạy (theo giãn cách) → Hoàn tất", QT-07 (bước 3–5), UAT-15, LK-11; D-50 (thay D-04/D-48 phần duyệt), D-51 (flag `FEATURE_BOTS` chỉ còn công tắc khẩn cấp), BUG-008 (phần lịch), M4 #2 (thiếu trạng thái "Đang chạy"), TD-024, TD-034 (không test tick worker bot).
- Prototype ver2: form kịch bản "Giãn cách giữa lượt (phút)", "Lịch chạy (để trống = chạy thủ công)"; persona "Tần suất (tin/ngày)", "Khung giờ hoạt động"; `simStatus` "Đang chạy: “{topic}” · lượt i/n" / "Đang chờ hội thoại kế tiếp…" / "Đã tạm dừng"; tuỳ chọn "Duyệt trước khi đăng (khi tắt tự động)" — tự động luôn đăng ngay.
- Hiện trạng: `bot-thread.service.ts` run → `pending`, approve đăng cả hội thoại một lần (D-04 cũ). `QUEUES.bot` + job `tick`/`postThread` khai báo nhưng không processor. `PersonaMessageService.post` đăng cả lô, không qua hook NA-07. `FakeLlmProvider` có, chưa nối DI.
- Mẫu: `worker/processors/stats.processor.ts` (WorkerFactory), `schedules.ts`, `modules/marketing` (job tự xếp job kế).

## APPLICABLE STANDARDS
[queues-workers](../standards/backend/queues-workers.md) · [socket-chat](../standards/realtime/socket-chat.md) (S-11, S-12) · [adapters](../standards/integrations/adapters.md) · [query-indexing](../standards/database/query-indexing.md) · [testing](../standards/testing/testing.md)

## TASK
Cho bot chạy tự động theo lịch kịch bản: worker tick chọn kịch bản đến hạn, tạo hội thoại "Chờ lịch", đăng từng lượt theo giãn cách 30 s – 5' ("Đang chạy"), xong thì "Hoàn tất"; tin đăng ngay không duyệt, vẫn qua lọc NA-07; tôn trọng khung giờ persona, công tắc tự động/kịch bản, trần 120 tin mô phỏng/phòng và 30 hội thoại.

## SPECIFICATIONS
### Business Rules
1. **Tick** (`bot-tick`, 10 s, BullMQ job scheduler, một lịch dù nhiều worker): chỉ chạy khi `bot.enabled=true` (công tắc "Chế độ tự động") và `FEATURE_BOTS=true` (công tắc khẩn cấp D-51). Mỗi tick: (a) kịch bản `enabled` có `runAt ≤ now` và chưa có hội thoại `scheduled|running` → tạo hội thoại `scheduled` (ảnh chụp `lines`, `groupIds`), đặt `lastRunAt`; kịch bản không có `runAt` chỉ chạy bằng nút "Chạy ngay". (b) `autoGenerate=true` và không có hội thoại đang chạy trong nhóm → xen kẽ hội thoại tự sinh từ `bot.topics` (FakeLlm sinh lượt) — `isAuto=true`.
2. **Chạy lượt**: hội thoại `scheduled|running` có `nextAt ≤ now` → job `postTurn { threadId, turn }` (jobId `bot-{threadId}-{turn}` idempotent). Đăng một lượt qua `PersonaMessageService` (clientMsgId `bot-{threadId}-{turn}`, S-12), chuyển `scheduled→running` ở lượt đầu, đặt `nextAt = now + giãn cách` với giãn cách ngẫu nhiên trong [30 s, 5'] và không nhỏ hơn `delayMinutes` của kịch bản nếu < 5' (xem Câu hỏi). Lượt cuối → `running→done`. Mọi chuyển trạng thái qua `bot-thread-status.ts` + `UPDATE … WHERE status=<from>` (luật 7).
3. **Khung giờ** (NA-08, QT-07 bước 5): persona lượt hiện tại ngoài `activeHours` (giờ VN) hoặc `enabled=false` hoặc không gán nhóm đích → **bỏ lượt**, ghi `bot_activity` "Bỏ lượt … ngoài khung giờ", sang lượt kế (không dừng cả hội thoại). Kịch bản bị tắt giữa chừng → hội thoại dừng ở trạng thái hiện tại (không đăng tiếp), tiếp tục khi bật lại. `bot.enabled=false` → tick không làm gì ("Đã tạm dừng").
4. **Lọc NA-07** (D-50): mỗi tin persona đi qua hook `MessageService.onSent` như tin người (KeywordFilterService tạo ca kiểm duyệt `auto`); không chặn đăng.
5. **Trần** (D-50): sau khi đăng, giữ tối đa **120 tin mô phỏng** gần nhất mỗi phòng — tin cũ hơn đặt `deleted_at` (một câu `UPDATE … WHERE id IN (SELECT … OFFSET 120)`, index `messages (room_id, created_at DESC) WHERE is_simulated`); tối đa **30 hội thoại** `bot_threads` — vượt thì xoá hội thoại `done` cũ nhất. Tần suất persona: không quá `postsPerDay` tin/ngày VN (đếm Redis), vượt → bỏ lượt như (3). Giữ giới hạn S-11 30 tin/phút/nhóm hiện có.
6. **Danh tính** (D-48 giữ): tin `is_simulated=true`, Portal DTO không có `isSimulated`, không nhãn bot.
7. **LLM adapter**: `LlmProvider.generateTurn({ topic, persona, history })`; dev/test luôn `FakeLlmProvider` (deterministic). Lượt kịch bản có `body` sẵn thì dùng `body`; chỉ hội thoại tự sinh gọi LLM.
8. **Admin**: "Chạy ngay" = tạo hội thoại `scheduled` `nextAt=now` (202); "Dừng" hội thoại đang chạy = `running|scheduled → done` (audit `bot_thread.stop`); bỏ Duyệt/Bỏ và tuỳ chọn `requireReview` (D-50). Danh sách hội thoại: trạng thái + `turn/total`. `bot_activity` ghi mỗi lượt đăng (cộng `todayCount`).

### Error Handling
- Job lỗi (LLM, rate limit) → retry BullMQ 3 lần backoff, không đăng trùng (clientMsgId). Persona bị xoá giữa chừng → bỏ lượt.

## ACCEPTANCE CRITERIA
- Given kịch bản bật, `runAt` = now − 1', bot bật, persona trong giờ, When worker tick, Then tạo 1 hội thoại `scheduled`, lượt 1 đăng ngay vào phòng Chung các nhóm đích (không cần duyệt), trạng thái `running`, lượt 2 đăng sau 30 s – 5' (fake timer), lượt cuối → `done` (UAT-15, NA-08, §9, D-50).
- Given persona lượt 2 ngoài khung giờ, Then lượt 2 bị bỏ, có dòng `bot_activity`, lượt 3 vẫn chạy (QT-07 bước 5).
- Given `bot.enabled=false` hoặc kịch bản tắt, Then tick không tạo/đăng gì (NA-08 "Tạm dừng").
- Given phòng có 120 tin mô phỏng, When đăng tin thứ 121, Then còn đúng 120 tin mô phỏng hiển thị; tin người thật không bị đụng (D-50).
- Given 30 hội thoại, When tạo hội thoại mới, Then còn 30 (xoá `done` cũ nhất) (D-50).
- Given tin persona chứa từ khoá nhạy cảm, Then có ca kiểm duyệt `auto` (NA-07, D-50).
- Given tick chạy hai lần song song cùng thời điểm, Then không đăng trùng lượt (S-12).

## TESTS BẮT BUỘC
- Unit `apps/server/src/modules/bot/domain/*.spec.ts`: `REQ-208 giãn cách trong [30s, 5']`, `REQ-208 activeHours "8:00 – 22:00" theo giờ VN`, `REQ-208 chuyển trạng thái scheduled→running→done, chặn done→running`.
- `apps/server/test/bot/bot-scheduler.int.spec.ts` (truyền `now`, không giờ thật): `UAT-15 tick tạo hội thoại theo lịch và đăng theo giãn cách`, `REQ-208 đăng ngay không duyệt (D-50)`, `REQ-208 bỏ lượt ngoài khung giờ`, `REQ-208 tạm dừng khi tắt tự động / tắt kịch bản`, `REQ-208 trần 120 tin mô phỏng/phòng`, `REQ-208 trần 30 hội thoại`, `REQ-207 tin persona qua lọc NA-07`, `REQ-208 job chạy 2 lần không đăng trùng`, `BUG-008 worker có processor bot.tick`.
- `apps/server/test/contract/bot.int.spec.ts`, `bot.int.spec.ts`, `gates/b5-admin-ops.int.spec.ts`: bỏ ca duyệt, thêm `POST bot/threads/:id/stop`; test âm thiếu `bots.action` → 403 `VIEW_ONLY`.
- `e2e/behavior/admin-bots.spec.ts` (msw + server): "Chạy ngay → Đang chạy · lượt 1/n", không còn nút Duyệt.

## CONSTRAINTS
- DO NOT: gọi LLM thật ở dev/test; query trong vòng lặp người nhận (S-04); đăng cả hội thoại một lần; hiển thị nhãn bot ở Portal.
- DO NOT trả lời thành viên thật (TIP-V2-502).
- REUSE: `PersonaMessageService`, `MessageRepository.insertPersona`, `KeywordFilterService` qua hook, `WorkerFactory`, `QueueService`, `BotCatalogService.log`.
- SKIP: Dashboard hiển thị hội thoại bot (502).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 7: transition qua hàm domain + `WHERE status=<from>`; luật 11: LLM chỉ qua adapter, FakeLlm ở dev/test; luật 12: env mới vào `.env.example` + zod.
- [ ] Luật 5: dọn 120 tin / 30 hội thoại bằng 1 câu SQL, có index; không query trong vòng lặp.
- [ ] File BE ≤ 400 dòng; worker dùng `BotCoreModule` (không import controller).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck`; e2e msw + server.
- [ ] `git commit -- <paths>`, `git status --short` sạch, `TIP-V2-501-DONE <sha>`, report `coding-packs/reports/TIP-V2-501-completion.md`.
