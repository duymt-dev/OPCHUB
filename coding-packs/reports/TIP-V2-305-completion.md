# TIP-V2-305: Số liệu thật thời gian thực, số đỏ chưa đọc, bỏ dữ liệu giả (completion)

> V2-P3, nhánh `feature/V2-P3-business-v2`. §8.26 NA-24 · §8.27 NA-25 · §8.12 NA-10 · REQ-224, REQ-225, REQ-210 ·
> BUG-012, BUG-028, BUG-029 · CR-15 · TD-010. Không có migration (index thông báo `(user_id, created_at DESC, id DESC)` đã có).
> V2Q mới: V2Q-155 → V2Q-158.

## Đã làm
- **TD-010 / BUG-012**: `GET /dashboard/live` không còn bộ mô phỏng prototype. Số đếm + hoạt động trực tiếp từ bộ đếm Redis
  (`LiveCountersService`: tin hôm nay theo ngày VN, ZSET 60 giây cho tin / lượt tham gia phút qua, LIST `dashboard:feed`
  `LPUSH`+`LTRIM 0 49`). Khối danh sách (thành viên hoạt động gần nhất, quốc gia/tỉnh theo `users.country/city`, tin mới,
  thảo luận 24h có trả lời, phiên trong ngày = sự kiện hôm nay) mỗi khối 1 query, cache 60 giây; chưa có dữ liệu → rỗng,
  FE hiện "Chưa có dữ liệu". Feed chỉ lưu tên, avatar, loại, đích, thời điểm (không lưu nội dung tin). Nguồn ghi: gửi tin
  (người + persona), tham gia nhóm mở, đăng ký sự kiện, đăng nhập thành viên.
- Lint `no-restricted-imports` chặn `@opchub/shared/mock-domains` trong `apps/server/src`; mẫu Email marketing (nội dung
  tĩnh prototype) chuyển sang `@opchub/shared/fixtures` (`mailTemplates`).
- **NA-24 đẩy 3 giây**: socket `metrics.subscribe/unsubscribe {scope}` → room `metrics:{scope}` (scope admin cần
  `overview.view`, thành viên → FORBIDDEN). Ticker ở process socket, khoá Redis `SET NX PX` để một instance phát, mỗi
  nhịp chỉ đọc Redis (không query DB). Portal Dashboard subscribe khi tab hiện, ẩn tab / rời màn → unsubscribe; MSW
  (không socket) làm mới REST 3 giây khi tab hiện. Admin Tổng quan + số đỏ sidebar làm mới 3 giây khi tab hiện (V2Q-157).
- **NA-25 / BUG-028**: `GET /me/chat/unread` → `{total, byGroup, byRoom}` (1 query phòng + 1 lần `UnreadService.counts`).
  Gửi tin → 1 PUBLISH `unread.bump {roomId, groupId, senderId}` vào room `group:{id}` (socket `groups.watch` kiểm thành
  viên 1 query); client tự +1 nếu không phải tin của mình và không đang mở chủ đề đó. Menu "Chat nhóm" = `total` (bỏ
  badge cứng 18), rail nhóm = `byGroup`, danh sách chủ đề = `byRoom` — một cache dùng chung `lib/chat-unread.ts` (shell
  không import feature chat). Mở chủ đề → trừ ngay + `POST /rooms/:id/read`.
- **BUG-029 / CR-15**: `GET /public/stats` thêm `online`, `newThisMonth`, `eventsPerYear` (cache 60s). Login hero Portal +
  Admin đọc API, chưa có dữ liệu hiện "—". Tổng quan Admin: `range` đầu tháng → hôm nay (VN), `membersDeltaPct`,
  `newThisMonth`, `communitiesNew` thật; trục biểu đồ tính theo dữ liệu (làm tròn bậc). Portal Dashboard: khoảng ngày theo
  thời điểm chụp số liệu.
- **NA-10**: sau mỗi lô thông báo xoá bản ngoài 50 gần nhất của người vừa nhận (1 câu `unnest` + `LATERAL … OFFSET 50`);
  mở chuông → đã đọc hết (V2Q-155).
- MSW: số chưa đọc tăng cho người nhận khi có tin, hoạt động trực tiếp + tin hôm nay tăng theo thao tác trong phiên,
  `public/stats` tính từ store (không ngẫu nhiên). Route chỉ MSW `POST /__mock/projects/submit` cho e2e badge Admin.

## Test
- Int: `dashboard.int.spec.ts` viết lại (REQ-224 BUG-012 không mô phỏng; tin vừa gửi vào feed + đếm; feed ≤ 50 sau 60
  sự kiện; đăng nhập vào feed); `chat-rest` REQ-225 total/byGroup/byRoom + tin của mình không tính, S-04 1 PUBLISH
  `unread.bump`; `socket.int` REQ-224 subscribe nhận đẩy 3 giây / unsubscribe dừng, test âm scope admin, REQ-225
  `groups.watch` + bump; `overview.int` BUG-029 delta/newThisMonth/range; `notifications.int` REQ-210 giữ 50;
  `register.int` CR-15 public stats + cache.
- Unit: admin `data.spec` (trục, khoảng ngày), portal dashboard `model.spec` (monthRange), shared `chat.spec` (chatUnread,
  publicStats).
- e2e mới `realtime-metrics.spec.ts`: REQ-225 số đỏ Chat tăng khi người khác nhắn, mở Hỏi đáp trừ đúng; REQ-224 badge
  Dự án Admin tăng khi có dự án chờ duyệt; BUG-029 Tổng quan theo API. `portal-shell`: bỏ kỳ vọng dữ liệu mô phỏng,
  REQ-224 tin vừa gửi hiện ở Hoạt động trực tiếp ≤ 3 giây, REQ-210 mở chuông → đã đọc. `a-01-login`: BUG-029 số liệu từ
  API (Portal + Admin).

## Cổng kiểm
| Lệnh | Kết quả |
|---|---|
| lint / typecheck | 8/8 · 8/8 (chỉ cảnh báo `<img>` có sẵn) |
| depcheck | no violations (580 modules) |
| Int server (`opchub_test`) | 77 file, **1038/1038** |
| Unit server / shared / admin / portal / ui / integrations | 98 / 90 / 157 / 115 / 37 / 25 |
| e2e behavior MSW | **177/177** (sửa 2 ca của chính TIP: đọc số chủ đề qua `data-unread`; ô thành viên theo `data-member` vì số liệu làm mới 3 giây đổi thứ tự — lặp 4 lần 32/32) |
| e2e behavior server (`opchub_dev`, stack 4020/3280/3282) | **177/177** (14,2 phút) |

## Chưa làm / chuyển sau
- k6 socket 1k (§15.2) chưa đo lại ở TIP này — hạ tầng đo ở TIP-V2-307/pha 5.
- Parity Dashboard (số liệu động) — TIP-V2-307 ghi deviation.
- Ma trận §12: thiếu "Sự kiện thay đổi" (V2Q-148, đã ghi ở 303).
