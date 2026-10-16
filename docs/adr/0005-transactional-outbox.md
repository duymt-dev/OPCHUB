# ADR-0005: Transactional outbox cho hiệu ứng phụ quan trọng

- Status: Accepted
- Date: 2026-10-16

## Context
Enqueue sau commit có thể mất việc nếu process chết giữa hai bước (phí kích hoạt nhưng không đóng popup / không gửi email).

## Decision
Ghi `outbox_events` trong cùng transaction với thay đổi nghiệp vụ; worker relay đọc bằng `FOR UPDATE SKIP LOCKED` và đẩy vào BullMQ / socket. Consumer idempotent.

## Consequences
Không mất sự kiện. Thêm một bảng và một relay job; độ trễ thêm ~1 giây.
