# API conventions

Theo SRS §13.1–13.2.

## URL

- Base `/v1`. Tài nguyên số nhiều, kebab-case: `/v1/groups/:id/join`, `/v1/service-requests`.
- Route quản trị dưới `/v1/admin/...`. Webhook dưới `/v1/webhooks/...`.
- Hành động không phải CRUD dùng động từ ở cuối: `POST /v1/admin/fees/:userId/renew`.

## Response

Thành công trả thẳng resource:

```json
{ "id": "…", "status": "active", "validUntil": "2027-10-16T00:00:00Z" }
```

List có số trang (Admin):

```json
{ "items": [], "page": 1, "size": 10, "total": 134 }
```

- `size` mặc định theo BR-12 (10; Sự kiện 9; Nhóm 12), tối đa 100.
- Page vượt quá tổng thì trả `items: []` kèm `total` thật; client tự lùi trang.

List cuộn vô hạn (chat, thông báo, audit): cursor

```json
{ "items": [], "nextCursor": "…" | null }
```

## Lỗi

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": [{ "path": "phone", "message": "…" }], "requestId": "…" } }
```

| HTTP | code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | zod fail; `fields` bắt buộc |
| 401 | `UNAUTHORIZED` | thiếu hoặc hết hạn token |
| 402 | `MEMBERSHIP_REQUIRED` | phí `pending_payment`/`expired`; client mở paywall |
| 403 | `FORBIDDEN` | thiếu quyền hoặc tài khoản `locked` |
| 404 | `NOT_FOUND` | không thấy, **hoặc không có quyền xem** (không lộ sự tồn tại) |
| 409 | `CONFLICT` | trùng email/SĐT/MST, đã gửi quan tâm, sai trạng thái khi transition |
| 422 | `OTP_INVALID` | OTP sai/hết hạn |
| 429 | `RATE_LIMITED` | vượt giới hạn; kèm header `Retry-After` |

Danh sách code đặt trong `packages/shared/errors`. Không tự chế thêm code ngoài bảng nếu chưa bổ sung vào shared.

## Dữ liệu

- JSON camelCase. Thời gian ISO 8601 UTC. Tiền: số nguyên VND, trường tên `amount`.
- ID: UUID. Mã cho người đọc (`TV000123`, `YC-0001`) là cột riêng.
- Không trả `passwordHash`, token, SMTP key, raw webhook ra ngoài. Response đi qua mapper/zod output schema.

## Lọc, sắp xếp

- `?q=&status=&sort=-createdAt`. Field cho phép sort phải nằm trong whitelist của endpoint.

## Idempotency

- Bắt buộc header `Idempotency-Key` cho: xác nhận chuyển khoản, gửi quan tâm đầu tư, gửi phiếu YC.
- Lưu Redis 24h theo (userId, key): cùng key trả lại kết quả cũ.

## Tài liệu

- OpenAPI sinh từ zod (`nestjs-zod`) tại `/v1/docs`, chỉ bật ở dev/staging.
