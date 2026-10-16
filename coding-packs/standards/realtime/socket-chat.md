# Socket & chat

Hiện thực S-01 → S-12 trong Vision. Mục tiêu: 5.000 người online, 50 tin/giây, p95 < 500ms, không mất tin.

## Kết nối

- `apps/socket` là process riêng, transport **chỉ websocket** (tắt polling), có `@socket.io/redis-adapter`.
- Handshake gửi access JWT trong `auth.token`. Token sai, tài khoản `locked` hoặc chưa đóng phí thì từ chối kết nối.
- Mỗi socket tự join room `user:{userId}` (dùng để đẩy thông báo, `membership.updated`, ép ngắt kết nối).
- Tên room: `room:{roomId}`. Tên event và zod payload đặt trong `packages/shared/socket`.

## Vào phòng (S-02)

- `room.join` kiểm quyền **một lần**: là thành viên nhóm, phòng tồn tại, phí còn hiệu lực. Lưu kết quả vào `socket.data.rooms`.
- Bị mời ra / bị khóa / hết phí: server phát vào `user:{id}` để client rời phòng và server gọi `socketsLeave`.

## Gửi tin

```
message.send { roomId, clientMsgId, body, replyTo?, mentions[] }
  1. roomId ∈ socket.data.rooms, nếu không thì ack lỗi FORBIDDEN
  2. rate limit theo user (Redis): 10 tin / 10 giây
  3. body: text thuần ≤ 4000 ký tự, không nhận HTML
  4. kiểm từ khóa in-memory (Aho-Corasick); khớp thì tạo report source=keyword (qua queue)
  5. INSERT, unique (room_id, sender_id, client_msg_id). Trùng thì trả lại tin cũ
  6. ack { ok: true, id, createdAt } — chỉ ack SAU khi commit (S-12)
  7. io.to(`room:${roomId}`).emit('message.new', dto)
  8. mentions → notification + emit vào user:{id} (S-04)
```

**Cấm trong đường gửi tin:** truy vấn DB cho từng người nhận, `fetchSockets()`, gọi dịch vụ ngoài, tạo notification cho cả phòng.

## Presence (S-01)

- Online lưu Redis (set + TTL theo heartbeat).
- Chỉ phát **số** online mỗi phòng, gom tối đa mỗi 5 giây. Không phát sự kiện vào/ra từng người.
- Danh sách người online lấy qua REST có phân trang khi mở panel.

## Chưa đọc (S-04, S-05)

- `room_read_cursors (user_id, room_id, last_read_message_id)`, cập nhật khi client báo đã đọc (debounce).
- Số chưa đọc giữ counter Redis theo (user, room); mất key thì tính lại từ cursor.

## Reconnect (S-06)

- Client: backoff ngẫu nhiên tăng dần (1s → 30s, có jitter).
- Sau khi kết nối lại: `GET /v1/rooms/:id/messages?after=<lastId>&limit=100` cho từng phòng đang mở; nhiều hơn 100 thì hiện "tải thêm".
- Client giữ hàng đợi tin chưa được ack và gửi lại cùng `clientMsgId`.

## Khác

- Lịch sử: keyset `before=<messageId>`, 50 tin/lần.
- Sửa/xóa/ghim/react: event riêng, kiểm quyền người gửi hoặc moderator nhóm.
- Tin của persona đi đúng đường trên với `isSimulated = true`, rate limit riêng theo nhóm (S-11).
- Không giữ state nghiệp vụ trong bộ nhớ process ngoài cache quyền của socket, để restart từng instance không mất gì.
