# ADR-0010: Web Push qua trình duyệt và PWA không lưu ngoại tuyến

## Status

Accepted — D-137, TIP-V46-816. Owner duyệt thêm ledger giao nhận và transaction
nguyên tử trong phiên thực hiện TIP; không thay đổi hợp đồng notifications hiện có.

## Context

Cấu hình PWA và năm loại thông báo đã có, nhưng chưa có đăng ký thiết bị, adapter
Web Push hoặc service worker. Thiết bị của thành viên và Admin phải phân biệt realm
(D-52). Một mốc `last_success_at` của thiết bị không thể chống trùng khi nhiều thông
báo xen kẽ hoặc chỉ một phần thiết bị cần thử lại.

## Decision

- Dùng thư viện `web-push` để thực hiện mã hóa Web Push và xác thực VAPID. Đây là
  dependency giao thức, không phải SDK của dịch vụ trả phí. Mọi lời gọi đi qua
  `PushProvider` trong integrations; dev/test mặc định fake, production cấm fake.
- Khóa riêng chỉ ở env server; public key cấp qua API đã xác thực. Đăng ký thiết bị
  và tùy chọn lấy chủ sở hữu từ phiên, không nhận user ID hay realm từ request body.
- Giữ nguyên bảng/API notifications. Lưu loại đẩy và realm ở `push_dispatches`;
  `push_deliveries` lưu kết quả theo cặp thông báo/thiết bị. Ghi thông báo và ý định
  đẩy trong cùng transaction. Dùng transactional outbox để phục hồi việc xếp job.
- Payload job chỉ chứa ID; đọc lại cấu hình Admin và tùy chọn thành viên lúc xử lý.
  Gửi tối đa 10 lời gọi song song; truy vấn và ghi kết quả theo lô. Thành công đã
  lưu trong ledger không gửi lại khi retry; 404/410 xóa đăng ký, lỗi tạm thử lại.
- Mỗi payload có tag ổn định bằng notification ID; cắt nội dung, che PII/số tiền,
  chỉ chấp nhận liên kết nội bộ. Không log endpoint, khóa đăng ký hoặc khóa riêng.
- Portal có manifest và service worker chỉ xử lý push/click, không có fetch handler
  hay cache ngoại tuyến. Không đăng ký worker đẩy thật khi MSW đang điều khiển trang.
  Admin có worker riêng theo base path `/admin/` của deployment.
- Năm loại đẩy do caller khai báo rõ ràng; không suy diễn từ loại thông báo trong
  app. Nhu cầu phù hợp tái sử dụng thuật toán chấm điểm hiện có, sự kiện thêm mốc
  một giờ, tổng hợp gian hàng chỉ tính lượt xem hôm qua khi Admin bật loại store.
- Thiết bị không hoạt động 90 ngày được dọn theo lô; tối đa 10 thiết bị/người/realm.

## Consequences

- Owner phải tự tạo VAPID key, cấu hình env production và mở HTTPS outbound tới
  dịch vụ đẩy của trình duyệt; Nginx không cache worker/manifest. Không deploy VPS
  trong TIP này. Kiểm tra trình duyệt thật/iOS là bước thủ công sau cấu hình.
- Test tự động dùng fake hoặc HTTP loopback stub, không gửi đẩy thật, không gọi AI.
- Ledger chống gửi lại những thành công đã ghi nhận, không thể bảo đảm exactly-once
  xuyên qua hệ thống ngoài: crash sau khi dịch vụ đẩy nhận nhưng trước commit kết
  quả vẫn có thể gửi lại. Tag ổn định giúp trình duyệt thay thông báo cùng tag;
  không được diễn giải điều này thành bảo đảm một lời gọi mạng tuyệt đối.
- Việc trình duyệt nhận push không chứng minh người dùng đã đọc thông báo. Không
  bổ sung tracking hoặc thống kê tỷ lệ nhận trong phạm vi này.

## References

- [web-push: VAPID và sendNotification](https://github.com/web-push-libs/web-push)
- [PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)
- [notificationclick](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event)
- [ADR-0005](0005-transactional-outbox.md), TIP-V46-816 và D-137.
