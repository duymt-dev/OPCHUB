# Architecture Decision Records

| #                                             | Quyết định                                                                 | Trạng thái |
| --------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| [0001](0001-monorepo-server-3-entrypoints.md) | Monorepo + apps/server một app ba entrypoint                               | Accepted   |
| [0002](0002-prisma-orm.md)                    | Prisma làm ORM                                                             | Accepted   |
| [0003](0003-self-hosted-auth.md)              | Auth tự viết trong NestJS, không Keycloak                                  | Accepted   |
| [0004](0004-native-single-vps.md)             | Một VPS cài native                                                         | Accepted   |
| [0005](0005-transactional-outbox.md)          | Transactional outbox cho hiệu ứng phụ quan trọng                           | Accepted   |
| [0006](0006-ant-design-6.md)                  | Ant Design 6, không dùng pro-components                                    | Accepted   |
| [0007](0007-s3-storage-rustfs.md)             | Object storage S3-compatible: RustFS thay MinIO (MinIO cộng đồng đã ngừng) | Accepted   |
| [0008](0008-llm-config-in-admin.md)           | Cấu hình nhà cung cấp AI (LLM) trong Admin thay cho biến môi trường        | Accepted   |
| [0009](0009-multi-ai-providers.md)            | Nhiều nhà cung cấp AI, fallback và adapter tương thích                     | Accepted   |
| [0010](0010-web-push.md)                      | Web Push VAPID, ledger giao nhận và PWA không lưu ngoại tuyến              | Accepted   |
| [0011](0011-ai-operations.md)                 | Giữ chỗ ngân sách AI, nhật ký metadata và AI hỗ trợ soạn/kiểm duyệt        | Accepted   |

Mẫu ADR mới: copy một file, tăng số, giữ 4 mục Context · Decision · Consequences · Status.
