# TIP-V2-303: Sự kiện — Google Meet, "Sắp diễn ra", panel chi tiết, check-in, scheduler 15' (EV-R01→R05, NA-23)

## HEADER
- TIP-ID: TIP-V2-303 · Project: OPCHUB · Module: event + mail + notification + worker + portal/events + admin/events · Priority: P0 · Depends on: TIP-V2-101 (outbox), TIP-V2-102 (ảnh bìa qua storage), TIP-V2-203 (khoá `events.view` / `events.action`) · Estimated: L (14h)
- **Files touched:**
  - DB: `packages/db/prisma/schema/event.prisma` (modify: `Event.meetUrl`, `Event.closedAt?`, `Event.remindedAt?`, `EventRegistration.reminderSentAt?` nếu cần) · migration `<ts>_event_meet_scheduler` (**agent chính tạo, `--create-only` + review SQL**, partial index cho scheduler) · `packages/db/seed/demo/event.ts` (modify: meetUrl cho sự kiện online)
  - Shared: `packages/shared/src/api-domains/events.ts` (modify: `meetUrl` nullable trong `eventItemSchema`, chỉ trả khi `registeredByMe`) · `event-admin.ts` (modify: `meetUrl` https trong upsert/adminEvent, `checkedIn`, `adminUpcomingSchema`) · `packages/shared/src/outbox/events.ts` (modify: thêm `event.reminder_due`, `event.registration_reopened`?) · `packages/shared/src/queues/queues.ts` (modify: `scheduler.eventsSweep`)
  - Server: `apps/server/src/modules/event/domain/event.mapper.ts` (modify) · `domain/event-sweep.ts` + `.spec.ts` (create) · `repositories/event.repository.ts` (modify) · `repositories/event-sweep.repository.ts` (create) · `services/event.service.ts` (modify: huỷ trả chỗ + mở lại) · `services/event-admin.service.ts` (modify: meetUrl, upcoming) · `services/event-registrants.service.ts` (modify: `checkedIn x/y`) · `services/event-scheduler.service.ts` (create) · `controllers/admin-events.controller.ts` (modify: `GET /admin/events/upcoming`) · `event-core.module.ts` + `index.ts` (modify)
  - `apps/server/src/modules/mail/templates-event.ts` (modify: link Meet / địa chỉ + bản đồ, mẫu nhắc 24h) · `event-mail.handler.ts` (modify: `reminder`) · `apps/server/src/modules/notification/services/notification-events.handler.ts` (modify: kèm link phòng họp, nhắc 24h)
  - Worker: `apps/server/src/worker/schedules.ts` (modify: `events-sweep` mỗi 15') · `apps/server/src/worker/processors/event.processor.ts` (create) · `apps/server/src/worker/worker-app.module.ts` (modify: `EventCoreModule` + `EventProcessor`) · `notification.processor.ts` (modify: register `event.reminder_due`)
  - Admin FE: `apps/admin/src/features/events/components/{events-screen,event-form-fields,registrants-drawer,event-grid,event-table}.tsx` (modify) · `components/upcoming-block.tsx`, `components/event-detail-drawer.tsx`, `components/meet-field.tsx` (create) · `hooks/use-upcoming.ts` (create) · `api.ts`, `model.ts`, `model.spec.ts`, `types.ts` (modify) · `apps/admin/messages/vi/events.json` (modify) · `apps/admin/src/mocks/handlers/admin-events.ts` + `packages/shared/src/mock-data/domains/event-admin.ts` (modify)
  - Portal FE: `apps/portal/src/features/events/components/{event-detail-modal,event-parts,event-card}.tsx` (modify) · `components/meet-box.tsx` (create) · `model.ts` + `model.spec.ts` (modify) · `apps/portal/messages/vi/events.json` (modify) · `apps/portal/src/mocks/handlers/content.ts` + `packages/shared/src/mock-data/domains/event-notify.ts` (modify)
  - Test: `apps/server/test/event/{events,admin-events}.int.spec.ts` (modify) · `apps/server/test/event/event-scheduler.int.spec.ts` (create) · `e2e/behavior/{events,admin-events}.spec.ts` (modify)
- **Parallel-safe with:** 301, 302, 304, 306. `shares schedules.ts, queues.ts, outbox/events.ts, worker-app.module.ts, notification-events.handler.ts with 301/305/306` → chỉ thêm dòng, giữ `.wire-lock`.
- **Phase / nhánh:** V2-P3, `feature/V2-P3-v2-features`

## CONTEXT
- Đặc tả: §22.1 EV-R01→R05 + luồng EV-01, §8.25 NA-23, §8.2 (quét 15'), §12 "Sự kiện thay đổi", §22.6 AT-EV01/AT-EV02, UAT-16, §23.3 LK-05. REQ-341→345, REQ-223, REQ-405. D-59. BUG-041 (cạnh `cancelled → registered`, `attended → registered`: PM chốt ở TIP-V2-113, ở đây giữ nguyên cạnh hiện có).
- Prototype: form "Link Google Meet (hiển thị trong chi tiết sự kiện)" + nút "Tạo link Meet"; khối Admin "Sắp diễn ra · Hôm nay/Ngày mai/Còn N ngày", nút "Mở Google Meet", "Xem chi tiết & danh sách", cột "Tiếp theo" (3 sự kiện, `up.slice(1,4)`); drawer chi tiết có "Sao chép" / "Vào phòng họp", danh sách đăng ký, "Check-in tất cả", "Đã check-in x/y", "✓ Đã check-in". Portal: "Link phòng họp Google Meet hiển thị sau khi bạn đăng ký tham gia."; thông báo "Đã đăng ký: <tên>" body "Link phòng họp: meet.google.com/… · nhắc trước khi bắt đầu · <ngày giờ>".
- Hiện trạng: `events.place` dùng chung cho cả địa điểm và link online, trả cho mọi người xem; check-in một / tất cả đã có (`POST /admin/events/:id/registrations/check-in`, `registrants-drawer.tsx`); không có khối Sắp diễn ra, không có job 15'; mail xác nhận không có link; huỷ đăng ký đã trả chỗ (`bumpRegistered -1`) nhưng không mở lại khi Admin đóng tự động.
- Mẫu: `EventService.register` (khoá `FOR UPDATE`), `EventMailHandler.registered` (chống trùng 1 giờ), `FeeProcessor` (đăng ký lịch + handler).

## APPLICABLE STANDARDS
[queues-workers](../standards/backend/queues-workers.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [query-indexing](../standards/database/query-indexing.md) · [security](../standards/security/security.md) (không lộ link với người chưa đăng ký) · [antd-ui](../standards/frontend/antd-ui.md) · [ui-parity](../standards/frontend/ui-parity.md) · [testing](../standards/testing/testing.md)

## TASK
Thêm trường `meetUrl` riêng cho sự kiện, chỉ trả cho người đã đăng ký và gửi kèm trong mail/thông báo xác nhận. Admin có khối "Sắp diễn ra" + cột "Tiếp theo" và panel chi tiết (sao chép/mở link, danh sách, check-in x/y). Thêm scheduler 15 phút: nhắc 24h, tự đóng đăng ký khi hết chỗ hoặc tới giờ, chuyển Đã diễn ra.

## SPECIFICATIONS
### Business Rules
1. **EV-R01 / D-59**: `meetUrl` nullable, zod `^https://\S+$` (≤ 500). Áp cho Online và cả Offline có phát trực tuyến. Nút "Tạo link Meet" mở `https://meet.google.com/new` ở tab mới (`window.open(..., 'noopener')`). Admin dán link về ô. Không gọi Google API, không sinh mã giả như prototype (ghi DV). Sự kiện Online đang có `place` là URL thì migration chép sang `meet_url`, `place` giữ "Online".
2. **EV-R04 / AT-EV01**: `GET /events` và chi tiết trả `meetUrl` chỉ khi `registeredByMe` (status registered|attended), còn lại `null`. MSW làm giống hệt. Portal: chưa đăng ký thì hiện câu ghi chú prototype; đã đăng ký thì hiện link rút gọn + "Sao chép" + nút "Vào phòng họp".
3. **AT-EV02**: mail xác nhận (`eventRegisteredMail`) và thông báo `Đã đăng ký: <tên>` kèm link phòng họp (online) hoặc địa chỉ + link bản đồ (offline), body thông báo theo copy prototype.
4. **EV-R02**: `GET /admin/events/upcoming` (`events.view`) → `{ next, more[3] }`. Lấy sự kiện `registration_open` (chưa đóng) có `starts_at ≥ đầu ngày VN hôm nay`, xếp `starts_at`. `inDays` tính theo ngày VN (Hôm nay / Ngày mai / Còn N ngày). Một query dùng index `(starts_at)` sẵn có (`events_upcoming`). Khối nằm đầu màn Nội dung & Sự kiện, có "Mở Google Meet" (ẩn nếu không có link) và "Xem chi tiết & danh sách".
5. **EV-R03**: bấm ảnh hoặc tên sự kiện (lưới, bảng, khối Sắp diễn ra) mở drawer Chi tiết: thông tin, link Meet (sao chép → toast "Đã sao chép link Meet", mở), danh sách đăng ký, check-in. Drawer có URL `?event=<id>` (data-state). Drawer danh sách đăng ký hiện có gộp vào panel này.
6. **EV-R05**: giữ API check-in. Response bổ sung `checkedIn`, `total` (không tính cancelled). Header "Đã check-in x/y". Nút từng dòng "Check-in" / "✓ Đã check-in". "Check-in tất cả" chỉ gửi người chưa check-in. Trạng thái `registered → attended` có điều kiện (đã có). Quyền: `events.action`.
7. **NA-23 scheduler** (`events-sweep`, `every: 900_000`), `EventSchedulerService.sweep(now)` một transaction mỗi bước, không lặp query theo sự kiện:
   - a. **Đóng đăng ký**: `UPDATE events SET registration_open=false, closed_at=now WHERE registration_open AND closed_at IS NULL AND (registered_count >= seats OR starts_at <= now) RETURNING id`. Chỉ đóng tự động; Admin đóng tay giữ nguyên `closed_at` NULL để phân biệt.
   - b. **Nhắc 24h**: sự kiện `starts_at BETWEEN now AND now+24h AND reminded_at IS NULL` → set `reminded_at` (UPDATE … RETURNING) + outbox `event.reminder_due { eventId }`. Consumer: 1 query lấy người `registered` → `MailService.requestMany` (mẫu nhắc kèm link/địa chỉ) + `NotificationService.notify` theo lô.
   - c. **Đã diễn ra**: sự kiện qua `ends_at` (hoặc `starts_at + 2h` nếu thiếu) thì ẩn khỏi "Sắp tới" Portal và khối Sắp diễn ra (lọc theo thời gian ở query, không cần cột trạng thái mới; ghi câu hỏi nếu PM muốn trạng thái riêng).
8. **Huỷ trả chỗ** (NA-23): huỷ đăng ký → `registered_count − 1` (đã có). Nếu sự kiện bị **đóng tự động vì hết chỗ** (`closed_at` có, `starts_at > now`) thì mở lại `registration_open=true, closed_at=NULL` trong cùng transaction.
9. **LK-05 / REQ-405**: Admin thấy đăng ký mới trong danh sách; check-in → Đã tham dự; Portal Hồ sơ hiện "Đã check-in" (đã có trong `profile`).
10. Mọi thao tác Admin (tạo/sửa meetUrl, check-in) ghi audit như hiện tại.

### Data / Migration
- `events.meet_url text NULL CHECK (meet_url ~ '^https://')`, `closed_at timestamptz NULL`, `reminded_at timestamptz NULL`. Partial index `events (starts_at) WHERE registration_open` và `events (starts_at) WHERE reminded_at IS NULL` (bằng trước, khoảng sau). Data migration chép link từ `place` (online, `place ~ '^https?://'`). Migration do agent chính tạo, `--create-only` + review SQL.

### Error Handling
- meetUrl sai định dạng → 400 tại ô "Link Google Meet phải bắt đầu bằng https://". Đăng ký khi đã đóng → 409 hiện có.

## ACCEPTANCE CRITERIA
- Given TV chưa đăng ký mở chi tiết sự kiện online, Then không thấy link Meet (API `meetUrl: null`), thấy ghi chú "Link phòng họp Google Meet hiển thị sau khi bạn đăng ký tham gia." (AT-EV01, REQ-344).
- Given TV bấm Đăng ký, Then thấy link + "Vào phòng họp"; thông báo và mail xác nhận có `meet.google.com/…` (AT-EV02, UAT-16, REQ-344).
- Given Admin nhập `http://…` → lỗi tại ô; `https://meet.google.com/abc-defg-hij` → lưu được; bấm "Tạo link Meet" → mở tab `meet.google.com/new` (EV-R01, REQ-341).
- Given 4 sự kiện tương lai, Then khối Sắp diễn ra hiện sự kiện gần nhất + "Còn N ngày", cột Tiếp theo 3 sự kiện; sự kiện đã đóng không xuất hiện (EV-R02, REQ-342).
- Given 3 người đăng ký, Admin check-in 1 → "Đã check-in 1/3"; "Check-in tất cả" → "3/3", trạng thái Đã tham dự (EV-R05, LK-05, REQ-345, REQ-405).
- Given sự kiện còn 23h, When sweep chạy 2 lần, Then mỗi người đăng ký nhận đúng 1 mail + 1 thông báo nhắc (NA-23, REQ-223).
- Given sự kiện hết chỗ, When sweep, Then đóng đăng ký; một người huỷ trước giờ → mở lại, người khác đăng ký được (NA-23).
- Given sự kiện tới giờ bắt đầu, Then đóng đăng ký; qua giờ kết thúc → không còn ở "Sắp tới" (NA-23).

## TESTS BẮT BUỘC
- Unit `apps/server/src/modules/event/domain/event-sweep.spec.ts`: `REQ-223 cửa sổ nhắc 24h`, `REQ-342 inDays theo ngày VN`. `apps/admin/src/features/events/model.spec.ts`: `REQ-342 next + 3 tiếp theo`, `REQ-345 đếm x/y`. `apps/portal/src/features/events/model.spec.ts`: `REQ-344 ẩn link khi chưa đăng ký`.
- Int `events.int.spec.ts`: `AT-EV01 REQ-344 meetUrl null khi chưa đăng ký`, `AT-EV02 REQ-344 mail + thông báo kèm link`. `admin-events.int.spec.ts`: `REQ-341 meetUrl https, http → 400`, `REQ-342 upcoming`, `REQ-345 check-in x/y`, test âm `REQ-345 người chỉ có events.view check-in → 403`. `event-scheduler.int.spec.ts`: `REQ-223 nhắc 24h một lần`, `REQ-223 đóng khi hết chỗ / tới giờ`, `REQ-223 huỷ mở lại chỗ`, `REQ-223 Admin đóng tay không tự mở`.
- e2e `e2e/behavior/events.spec.ts`: `AT-EV01`, `AT-EV02`. `admin-events.spec.ts`: `REQ-342 khối Sắp diễn ra`, `REQ-343 panel chi tiết sao chép link`, `REQ-345 Đã check-in x/y`, `REQ-341 Tạo link Meet mở tab mới`. Chạy msw + server, không có nhánh `onServer` làm yếu assertion (D-63).

## CONSTRAINTS
- DO NOT: trả `meetUrl` cho người chưa đăng ký ở bất kỳ endpoint/MSW nào; gọi Google API; query theo từng sự kiện trong vòng lặp scheduler; gửi mail ngoài outbox.
- REUSE: `EventRepository.lock/bumpRegistered`, `EventMailHandler`, `MailService.requestMany`, `NotificationService.notify`, `vnTime/vnDayLabel` (`domain/vn-time.ts`), `registrants-drawer.tsx` (gộp, không viết lại).
- SKIP: chốt cạnh trạng thái BUG-041 (TIP-V2-113); ảnh bìa storage (TIP-V2-102); baseline parity (TIP-V2-307).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 7 (đóng/mở đăng ký, check-in là UPDATE có điều kiện), luật 8 (nhắc qua outbox), luật 9 (UTC lưu, VN hiển thị/tính ngày), luật 1 (FE ≤ 250 dòng; `events-screen.tsx` chỉ orchestrator).
- [ ] File dùng chung chỉ thêm dòng (`schedules.ts`, `queues.ts`, `outbox/events.ts`, `worker-app.module.ts`, `messages/vi/*.json`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + `pnpm test:int` + `pnpm e2e` msw và server.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-303-DONE <sha> — <N> test passed`, viết `coding-packs/reports/TIP-V2-303-completion.md`.
