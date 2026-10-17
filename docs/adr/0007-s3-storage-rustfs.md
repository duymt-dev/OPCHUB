# ADR-0007: Object storage S3-compatible — RustFS thay MinIO

- Status: Accepted
- Date: 2026-10-17

## Context

D-09 và ADR-0004 chọn MinIO native. Bản cộng đồng của MinIO đã ngừng phát hành binary (10/2025), vào chế độ
không bảo trì (02/2026) và repo bị lưu trữ (25/04/2026); `dl.min.io` trả 410 cho mọi bản cộng đồng, không còn
bản vá bảo mật. Dùng tiếp sẽ để một thành phần giữ file người dùng chạy phần mềm không được vá.

## Decision

- Dùng **RustFS** (Apache-2.0, binary đơn, S3 API cổng 9000, console 9001) làm object storage cho dev và VPS.
- Code chỉ nói S3: `StorageProvider` trong `packages/integrations/storage` dùng `@aws-sdk/client-s3` với
  `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `forcePathStyle: true`.
  Không dùng API riêng của nhà cung cấp nào.
- Tên biến, tài liệu, systemd unit gọi là "S3 storage" thay vì "MinIO". Chỗ cũ ghi "MinIO" hiểu là storage S3-compatible này.
- Dự phòng nếu RustFS không đạt khi chạy thử tải (B66): SeaweedFS hoặc Garage — chỉ đổi binary + env.

## Consequences

- Không đổi kiến trúc, ranh giới module hay hợp đồng API; presigned PUT/GET giữ nguyên.
- RustFS trẻ hơn MinIO: B65/B66 phải kiểm presigned URL, upload 5MB, backup thư mục dữ liệu và khôi phục.
- Dev Windows: `D:\opchub-local\start-s3.ps1`; VPS: unit `opchub-s3.service` (TIP-B64).
