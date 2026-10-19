# TIP-V2-303: Sự kiện — link Google Meet, khối Sắp diễn ra, check-in, scheduler 15' (completion)

> V2-P3, nhánh `feature/V2-P3-business-v2`. §22.1 EV-R01 → R05 · §8.25 NA-23 · §22.6 AT-EV01/AT-EV02 · LK-05 ·
> REQ-223, REQ-341 → 345, REQ-405 · UAT-16 · D-59.
> Migration `20261019170000_event_meet_scheduler` (agent chính tạo, áp `opchub_dev` + `opchub_test`).
> V2Q mới: V2Q-143 → V2Q-148.

## Đã làm
- **DB**: `events.meet_url` (CHECK `https://`), `closed_at` (đóng tự động), `reminded_at` (đã nhắc 24h). Chuyển
  link online cũ trong `place` sang `meet_url`. Index một phần `events_open_starts (starts_at) WHERE
  registration_open`, `events_remind_due (starts_at) WHERE reminded_at IS NULL`.
- **EV-R01 / EV-R04**: Admin nhập link Meet (cả Online lẫn Offline có phát) — sai định dạng báo tại ô; "Tạo link
  Meet" mở `https://meet.google.com/new` ở tab mới (không tích hợp API Google). `GET /events` chỉ trả `meetUrl`
  cho người đã đăng ký (`registeredByMe`), còn lại `null`; MSW giống hệt.
- **Portal**: chi tiết sự kiện có hộp "Phòng họp trực tuyến (Google Meet)" (link rút gọn, Sao chép, Vào phòng họp)
  khi đã đăng ký; chưa đăng ký hiện ghi chú prototype. Đăng ký xong tải lại danh sách để hiện link ngay.
- **AT-EV02**: mail xác nhận + thông báo "Đã đăng ký" kèm "Link phòng họp: meet.google.com/…" (hoặc địa chỉ +
  "Xem bản đồ" cho offline).
- **EV-R02 / REQ-342**: `GET /admin/events/upcoming` (`events.view`) → sự kiện gần nhất đang mở đăng ký + tối đa 3
  "Tiếp theo", nhãn Hôm nay / Ngày mai / Còn N ngày theo lịch VN. Admin: khối "Sắp diễn ra" (ảnh, link Meet + Sao
  chép, Mở Google Meet, Xem chi tiết & danh sách) như prototype `aeNext`.
- **EV-R03 / REQ-343**: drawer đổi tên "Chi tiết sự kiện", có hộp "Link họp trực tuyến (Google Meet)" Sao chép /
  Mở Meet.
- **EV-R05 / REQ-345**: check-in trả `{items, checkedIn, total}`; drawer hiện "Đã check-in x/y".
- **NA-23 / REQ-223**: job `scheduler.eventsSweep` mỗi 15 phút (`EventProcessor` ở worker): (a) đóng đăng ký khi hết
  chỗ hoặc tới giờ bắt đầu (`closed_at`), huỷ trả chỗ trước giờ bắt đầu thì mở lại — Admin đóng tay
  (`closed_at` null) không bị mở; (b) nhắc 24h: đánh dấu `reminded_at` + outbox `event.reminder_due` cùng
  transaction → mail "Nhắc lịch" (lô `requestMany`, chống trùng khi relay gọi lại) + thông báo "Sắp diễn ra"
  (1 lô). Đổi giờ bắt đầu → xoá `reminded_at` để nhắc lại theo giờ mới.
- Seed demo: `meetUrl` cho 5 sự kiện theo hash link của prototype (`prototypeMeetUrl`).

## Test
- Unit: `event-sweep.spec.ts` (REQ-223 cửa sổ nhắc, REQ-342 ngày VN); Admin `model.spec.ts` (REQ-341 link Meet,
  REQ-342 nhãn ngày); Portal `model.spec.ts`; shared `event-admin.spec.ts` (AT-EV01/REQ-344, REQ-342).
- Int mới `test/event/event-scheduler.int.spec.ts` (8 ca): REQ-223 hết chỗ → đóng, huỷ → mở lại; tới giờ → đóng,
  Admin đóng tay giữ nguyên; nhắc 24h 1 outbox/sự kiện, chạy lại không trùng, mail + thông báo có link Meet; đổi
  giờ → nhắc lại; REQ-341/344 AT-EV01 https, sai → 400, chỉ người đăng ký thấy link; REQ-342 upcoming + RB-R05
  `events.view` xem được, thành viên 403; AT-EV02 mail + thông báo kèm link; REQ-345 x/y + `events.view`
  check-in → 403.
- e2e: `events.spec.ts` AT-EV01/AT-EV02/REQ-344 (msw + server); `admin-events.spec.ts` REQ-342 khối Sắp diễn ra +
  chi tiết có Meet + "Đã check-in x/y", REQ-341 Tạo link Meet mở tab mới (route giả `meet.google.com`, không ra
  mạng), link sai báo tại ô, lưu → hiện ở chi tiết.
- Sửa 2 ca e2e chập chờn có sẵn: `events.spec` Back trước khi tới Dashboard (chờ URL), `admin-rbac` tiêu đề trùng
  route announcer của Next (dùng `getByRole('heading')`).

## Cổng kiểm
| Lệnh | Kết quả |
|---|---|
| lint / typecheck | 8/8 · 8/8 (chỉ cảnh báo `<img>` có sẵn) |
| depcheck | no violations (614 modules) |
| Int server (`opchub_test`) | 77 file, **1023/1023** |
| Unit server / shared / admin / portal / ui | 98 / 87 / 156 / 114 / 37 |
| e2e behavior MSW | **170/170** (sửa 1 ca chập chờn `admin-rbac`; chạy lại events/admin-events sau khi thêm AT-EV02: 15/15) |
| e2e behavior server (`opchub_dev`, stack 4020/3280/3282) | **170/170** + chạy lại events/admin-events/admin-rbac sau khi sửa: 24/24 |

## Chưa làm / chuyển sau
- Baseline parity màn Sự kiện (Portal P-49 → P-54, Admin D-42 → D-50) có khối/hộp mới — chụp lại ở TIP-V2-307.
- Thông báo "Sự kiện thay đổi" (§12) khi Admin sửa giờ/địa điểm: chưa có mẫu câu trong prototype (V2Q-148).
