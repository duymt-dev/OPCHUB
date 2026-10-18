# TIP-V2-305: Số liệu thật thời gian thực, số đỏ chưa đọc, bỏ dữ liệu giả (NA-24, NA-25, NA-10, BUG-012/028/029)

## HEADER
- TIP-ID: TIP-V2-305 · Project: OPCHUB · Module: dashboard + reporting + chat(unread) + notification + socket + portal/{dashboard,shell,chat,auth} + admin/{overview,shell,auth} · Priority: P0 · Depends on: TIP-V2-203 (badge theo khoá mới `groups.action`/`projects.action`/`requests.view`…), TIP-V2-304 (room/chat-overview đổi role) · Estimated: XL (16h)
- **Files touched:**
  - Shared: `packages/shared/src/socket/events.ts` (modify — chỉ thêm server event `metrics.updated`, `unread.updated`; client event `metrics.subscribe` / `metrics.unsubscribe`) · `packages/shared/src/api-domains/dashboard.ts` (modify: `activities` ≤ 50, bỏ phần chỉ có ở bộ mô phỏng nếu không có nguồn thật — xem Rule 3) · `packages/shared/src/api-domains/chat.ts` hoặc `chat-room.ts` (modify: `GET /me/chat/unread` → `{ total, byGroup }`) · `packages/shared/src/api/auth.ts` (modify: `publicStatsSchema` thêm `online`, `newThisMonth`, `eventsPerYear`) · `packages/shared/src/api-domains/overview.ts` (modify: `membersDeltaPct`, `newThisMonth`, `range`) · `packages/shared/src/fixtures/auth-hero.ts` (modify: bỏ `authStats`, `DEFAULT_ONLINE` khỏi đường production)
  - Server: `apps/server/src/modules/dashboard/dashboard-live.service.ts` (modify: bỏ `dashboardLive` sim, TD-010) · `dashboard/live-feed.service.ts` (create: hoạt động ≤ 50 mục, Redis LIST) · `dashboard/metrics-publisher.service.ts` (create: đẩy 3 giây) · `dashboard/dashboard.module.ts`, `index.ts` (modify) · `apps/server/src/modules/reporting/overview.service.ts` (modify: delta thật, badge Redis) · `apps/server/src/modules/account/services/public-info.service.ts` (modify: stats thật) · `apps/server/src/modules/chat/services/unread.service.ts` (modify: tổng theo user) · `chat/services/chat-overview.service.ts` (modify) · `chat/controllers/me-chat.controller.ts` (modify: `GET /me/chat/unread`) · `chat/services/message.service.ts` + `persona-message.service.ts` (modify: hook ghi live-feed + phát `unread.updated` theo room socket, không theo người) · `apps/server/src/modules/notification/services/notification.service.ts` + `repositories/notification.repository.ts` (modify: giữ 50 gần nhất/người) · `apps/server/src/socket/gateways/chat.gateway.ts` (modify: `metrics.subscribe` vào room `metrics:portal` / `metrics:admin`) · `apps/server/src/socket/gateways/metrics.gateway.ts` (create nếu chat.gateway > 150 dòng) · `apps/server/src/socket/socket-app.module.ts` (modify)
  - Portal: `apps/portal/src/features/dashboard/hooks/use-dashboard-live.ts` (modify: nhận `metrics.updated`, dừng khi tab ẩn) · `dashboard/components/{dashboard-screen,activity-feed,live-hero,live-grid,country-list,side-panels,thread-list}.tsx` (modify) · `apps/portal/src/features/shell/nav.ts` (modify: bỏ `PORTAL_NAV_BADGES`) · `shell/components/portal-shell.tsx` (modify) · `shell/hooks/use-chat-badge.ts` (create) · `shell/hooks/use-notifications.ts` (modify: mở danh sách → đánh dấu đã đọc) · `apps/portal/src/features/chat/hooks/use-chat-data.ts`, `components/{group-rail,topic-list}.tsx` (modify: nhận `unread.updated`) · `apps/portal/src/features/auth/components/login-hero.tsx` (modify: `GET /public/stats`) · `apps/portal/messages/vi/{dashboard,auth}.json` (modify: bỏ số cứng)
  - Admin: `apps/admin/src/features/overview/{data.ts,hooks/use-overview.ts,components/{overview-screen,stat-cards,growth-chart}.tsx}` (modify: trục động, refetch 3 giây khi đang xem) · `apps/admin/src/features/shell/hooks/use-nav-badges.ts` (modify: 3 giây khi tab hiện) · `apps/admin/src/features/auth/components/login-hero.tsx` (modify) · `apps/admin/messages/vi/{overview,auth}.json` (modify) · `apps/admin/src/lib/socket.ts` (create, mẫu `apps/portal/src/lib/socket.ts`) nếu chọn đẩy socket cho Admin
  - Mock: `apps/portal/src/mocks/handlers/{shell,chat}.ts`, `apps/admin/src/mocks/handlers/{shell,auth}.ts`, `packages/shared/src/mock-data/domains/{dashboard,dashboard-seed,overview,chat-ops}.ts` (modify: số tính từ store MSW, không ngẫu nhiên)
  - Test: `apps/server/test/dashboard/dashboard.int.spec.ts`, `apps/server/test/reporting/overview.int.spec.ts`, `apps/server/test/chat/chat-rest.int.spec.ts`, `apps/server/test/socket/socket.int.spec.ts`, `apps/server/test/notification/notifications.int.spec.ts`, `apps/server/test/account/register.int.spec.ts` (public stats) (modify) · `e2e/behavior/{portal-shell,chat,a-01-login}.spec.ts` (modify) · `e2e/behavior/realtime-metrics.spec.ts` (create)
- **Parallel-safe with:** 301, 302, 303, 306. `sequential, shares chat/services/* with TIP-V2-304 (làm sau 304)`; `socket/events.ts`, `notification-events.handler.ts` chỉ thêm dòng.
- **Phase / nhánh:** V2-P3, `feature/V2-P3-v2-features`

## CONTEXT
- Đặc tả: §8.26 NA-24 (chu kỳ 3 giây khi đang mở Dashboard/Tổng quan, tab ẩn tạm dừng; số đỏ sidebar = dự án chờ duyệt, phiếu YC mới, tin cần kiểm duyệt; hoạt động ≤ 50 mục), §8.27 NA-25 (`read_cursor(user, topic, last_read_at)`, tin của mình không tính, mở chủ đề thì đánh dấu đã đọc), §8.12 NA-10 (giữ 50 thông báo gần nhất/người, đã đọc khi mở danh sách hoặc bấm), §15 SLO. REQ-224, REQ-225, REQ-210. BUG-012, BUG-028, BUG-029. CR-15, CR-23, CR-24; TD-010, TD-012, TD-013.
- Hiện trạng:
  - `DashboardLiveService` trộn số thật (nhóm, thành viên, online, tin hôm nay, lượt sự kiện) với `dashboardLive()` mô phỏng (activities, countries, sessions, threads, members). Cache 10 giây, FE chỉ `useQuery` không refetch.
  - `PORTAL_NAV_BADGES = { chat: 18 }`.
  - `UnreadService` đã có seq Redis + `room_read_cursors` (S-04/S-05) và `GET /me/chat` có `unread` theo nhóm/phòng; chưa có tổng cho menu, chưa đẩy realtime.
  - `GET /public/stats` đã có `{members, communities}` (cache 60s) nhưng `login-hero.tsx` (Portal + Admin) vẫn đọc `authStats`/`DEFAULT_ONLINE` fixtures. Tổng quan Admin có "+12%", "+452", `dateRange` cứng, `growth-chart.tsx` `AXIS` cứng.
  - `GET /admin/badges` có `{reports, projects, requests}` nhưng chỉ refetch khi có mutation.
  - Thông báo: không cắt 50; mở danh sách không đánh dấu đã đọc.
- Mẫu: `PresenceService` (đếm Redis, gom 5 giây S-01), `RoomEventsPublisher`/`UserEventsPublisher`, `apps/portal/src/lib/socket.ts`, `UnreadService.rebuild`.

## APPLICABLE STANDARDS
[socket-chat](../standards/realtime/socket-chat.md) (S-01, S-04, S-05, S-10) · [query-indexing](../standards/database/query-indexing.md) · [data-state](../standards/frontend/data-state.md) · [ui-parity](../standards/frontend/ui-parity.md) (giả lập chỉ trong MSW) · [testing](../standards/testing/testing.md)

## TASK
Thay toàn bộ số liệu giả ở Dashboard Portal, Tổng quan Admin và màn đăng nhập bằng số thật. Đẩy cập nhật 3 giây khi đang xem và dừng khi tab ẩn. Số đỏ Chat nhóm ở menu, nhóm, chủ đề lấy từ bộ đếm chưa đọc thật và cập nhật realtime. Hoàn thiện NA-10 (giữ 50 thông báo, đã đọc khi mở danh sách).

## SPECIFICATIONS
### Business Rules
1. **NA-24 kênh đẩy**: client Portal/Admin đang ở Dashboard/Tổng quan và `document.visibilityState === 'visible'` gửi `metrics.subscribe { scope: 'portal'|'admin' }`, rời màn hoặc tab ẩn thì `metrics.unsubscribe`. Server join room `metrics:<scope>`. Một ticker trong process socket (khoá Redis `SET NX PX 3000` để chỉ 1 instance phát) mỗi 3 giây đọc bộ đếm Redis rồi `io.to('metrics:<scope>').emit('metrics.updated', snapshot)`, **không** query DB mỗi tick. Admin chỉ nhận scope admin khi có quyền xem Tổng quan. MSW/không socket: fallback `refetchInterval: 3000` với cùng điều kiện tab hiện.
2. **Bộ đếm** (S-10, Redis): `online` (PresenceService), `messagesToday` (INCR theo ngày VN khi gửi tin, TTL 2 ngày), `messagesLastMinute` / `joinsLastMinute` (cửa sổ trượt ZSET 60s), `eventJoins` (`registered_count` sự kiện sắp tới, cập nhật khi đăng ký/huỷ), tổng thành viên/nhóm (cache 60s từ DB). Snapshot đầy đủ dùng `GET /dashboard/live` (REST) cho lần tải đầu.
3. **Hoạt động trực tiếp** (≤ 50): Redis LIST `live:feed` (`LPUSH` + `LTRIM 0 49`) ghi từ: gửi tin (người thật + persona), tham gia nhóm, đăng ký sự kiện, đăng nhập. Chỉ lưu tên hiển thị, avatar, loại, đích, thời điểm; không lưu nội dung tin nhắn riêng. Các khối chưa có nguồn thật (quốc gia ASEAN, phiên đang diễn ra, thảo luận nổi bật): dựng từ dữ liệu thật nếu có (country theo `users.country` GROUP BY, cache 60s; thảo luận = tin mới nhất có trả lời trong 24h), không có thì trả mảng rỗng và FE hiện trạng thái rỗng. **Cấm** import `@opchub/shared/mock-domains` hoặc `fixtures` trong `apps/server/src` và code production FE (lint rule `no-restricted-imports`).
4. **Số đỏ sidebar Admin** (NA-24): `GET /admin/badges` giữ hợp đồng, đọc theo quyền (khoá mới của 203). FE refetch 3 giây khi tab hiện (hoặc nhận `metrics.updated.badges` theo quyền). Ba số: tin cần kiểm duyệt (`reports.status='open'`), dự án chờ duyệt, phiếu YC mới.
5. **NA-25 chưa đọc**: giữ mô hình seq Redis + `room_read_cursors` (S-05). Bổ sung:
   - `GET /me/chat/unread` → `{ total, byGroup: {groupId: n}, byRoom }` (một lời gọi `UnreadService.counts` cho mọi phòng đã tham gia).
   - Khi có tin mới, server phát `unread.bump { roomId, groupId }` vào **room socket nhóm** (một emit cho cả phòng, không theo từng người, S-02/S-04). Client tự +1 nếu không phải tin của mình và không đang mở chủ đề đó.
   - Mở chủ đề → `POST /rooms/:id/read` (đã có) → client trừ số.
   - Menu "Chat nhóm" = `total`. Rail nhóm = `byGroup`. Danh sách chủ đề = `byRoom`.
   - Tin của mình không tính (đã đúng ở rebuild). @nhắc tên vẫn tạo thông báo NA-10 (đã có).
6. **BUG-029 / CR-15**: `GET /public/stats` (Public, cache 60s) trả `{ members, communities, online, newThisMonth, eventsPerYear }` (eventsPerYear = số sự kiện có `starts_at` trong 12 tháng gần nhất). Login hero Portal và Admin đọc API này. Lúc SSR/chưa có dữ liệu thì hiện "—" (không số giả). Tổng quan Admin: delta % thành viên tháng này so tháng trước và số TV mới tháng này tính từ `stats_daily`/đếm. `dateRange` = 1 → hôm nay theo giờ VN. Trục biểu đồ tính từ max dữ liệu (làm tròn bậc).
7. **NA-10**: sau mỗi `createMany` thông báo, xoá bản ghi cũ ngoài 50 gần nhất của các user vừa nhận (1 câu `DELETE … WHERE id IN (SELECT … ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) > 50)` giới hạn `user_id = ANY($1)`). Mở popover chuông → `POST /notifications/read` (all) như "đã đọc khi mở danh sách". Rà ma trận §12 so với handler hiện có; dòng nào thiếu thì ghi report (nhắc phí → 301, sự kiện thay đổi → 303).
8. MSW: số liệu tính từ store mock và tăng theo thao tác trong phiên. Không `Math.random` trong component (ui-parity).

### Data / Migration
- Không bảng mới. Nếu EXPLAIN cắt 50 thông báo không dùng index `(user_id, created_at DESC, id DESC)` thì báo agent chính.

### Error Handling
- Redis mất key thì tính lại (rebuild). Socket rớt thì client fallback polling 3 giây.

## ACCEPTANCE CRITERIA
- Given server thật, When TV mở Dashboard, Then không có tên trong bộ mô phỏng prototype (VD "Somchai Prasert"); hoạt động trực tiếp ≤ 50 mục, gồm tin vừa gửi ở phòng khác trong ≤ 3 giây (NA-24, BUG-012, REQ-224).
- Given tab Dashboard ẩn, Then không nhận `metrics.updated` (không subscribe); hiện lại thì cập nhật tiếp (NA-24).
- Given Admin có quyền dự án mở Tổng quan, When TV gửi dự án mới, Then số đỏ menu Dự án tăng trong ≤ 3 giây không cần thao tác (NA-24, REQ-224).
- Given TV ở Dashboard, When người khác gửi 2 tin vào chủ đề Hỏi đáp nhóm c1, Then menu Chat nhóm +2, nhóm c1 +2, chủ đề Hỏi đáp +2; TV tự gửi tin không tăng; mở Hỏi đáp → về 0 (NA-25, BUG-028, REQ-225).
- Given màn đăng nhập (Portal, Admin), Then số thành viên/cộng đồng/đang trực tuyến bằng `GET /public/stats`; Tổng quan Admin không còn "+12%", "+452", "01/10/2026 – 15/10/2026" cứng (BUG-029, CR-15).
- Given user có 55 thông báo, Then còn 50 mới nhất; mở chuông → `unread = 0` (NA-10, REQ-210).

## TESTS BẮT BUỘC
- Int `dashboard.int.spec.ts`: `REQ-224 BUG-012 không còn dữ liệu mô phỏng`, `REQ-224 feed ≤ 50 sau 60 sự kiện`. `overview.int.spec.ts`: `BUG-029 delta và newThisMonth thật`, `REQ-224 badges theo quyền` (cập nhật khoá). `chat-rest.int.spec.ts`: `REQ-225 /me/chat/unread total byGroup byRoom`, `REQ-225 tin của mình không tính`. `socket.int.spec.ts`: `REQ-224 metrics.subscribe nhận metrics.updated mỗi 3 giây, unsubscribe thì dừng`, `REQ-225 unread.bump phát một lần vào room nhóm`, test âm `REQ-224 thành viên subscribe scope admin bị từ chối`. `notifications.int.spec.ts`: `REQ-210 giữ 50 gần nhất`. `register.int.spec.ts` (hoặc file public): `CR-15 public/stats thật + cache 60s`.
- e2e `e2e/behavior/realtime-metrics.spec.ts` (server; msw dùng polling): `REQ-225 số đỏ menu Chat tăng khi người khác nhắn, về 0 khi mở chủ đề`, `REQ-224 badge Admin tăng khi có dự án chờ duyệt`. `portal-shell.spec.ts`: bỏ kỳ vọng badge 18, `REQ-210 mở chuông → đã đọc`. `a-01-login.spec.ts`: `BUG-029 số liệu từ API`. Không có nhánh `onServer` làm yếu assertion (D-63).

## CONSTRAINTS
- DO NOT: query DB mỗi tick 3 giây; phát sự kiện theo từng người nhận khi có tin (S-02, S-04); giữ bất kỳ import `mock-domains`/`fixtures` nào trong code production; poll khi tab ẩn.
- REUSE: `UnreadService`, `PresenceService`, `RoomEventsPublisher`, `getSocket()`, `StatsDailyService`, `notification.repository.createMany`.
- SKIP: bot sinh hoạt động (TIP-V2-501/502, chỉ cần đi qua hook gửi tin chung); parity baseline Dashboard (TIP-V2-307 ghi DV vì số liệu động).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 6 (S-01→S-12), luật 5 (không query trong vòng lặp), luật 2 (payload socket parse zod `packages/shared/socket`), luật 3 (feature FE không import chéo; badge chat ở shell qua API, không import `features/chat`).
- [ ] File dùng chung chỉ thêm dòng (`socket/events.ts`, `messages/vi/*.json`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + `pnpm test:int` + `pnpm e2e` msw và server; k6 socket 1k vẫn đạt §15.2 (ghi số đo).
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-305-DONE <sha> — <N> test passed`, viết `coding-packs/reports/TIP-V2-305-completion.md`.
