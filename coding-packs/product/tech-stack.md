# OPCHUB — Tech Stack

> Baseline từ OPCHUB-SRS-2.0 §3.3 (chờ Kiến trúc sư phê duyệt). **Trạng thái: ĐỀ XUẤT — chốt ở `/vibecode:vision`.**

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Ant Design 5 (+ Ant Design Pro cho Admin), TanStack Query; SSR trang công khai; PWA 360px+ |
| Backend | NestJS, Prisma; modular monolith (12 module domain) + worker tách riêng |
| Realtime | Socket.IO + Redis adapter |
| Queue / Workers | BullMQ — mail, reconcile, bot, export |
| Database | PostgreSQL (primary + replica, PITR 7 ngày) |
| Cache / presence | Redis |
| Storage | S3-compatible (versioning) |
| Search | OpenSearch (có thể thay bằng Postgres FTS ở MVP) |
| Identity | Keycloak OIDC + Identity Brokering; JWT 15' + refresh 7d xoay vòng; 2FA admin |
| Email | Brevo SMTP (SPF/DKIM/DMARC) |
| Payment reconcile | SePay / Casso / PayOS webhook (HMAC-SHA256) → TK VCB 1203132809 |
| Khác | Tra cứu MST (chưa chốt nguồn), Google Maps embed |
| Infra | Docker, Kubernetes, GitLab CI/CD, Vault/K8s Secret |
| Observability | Prometheus + Grafana, Loki, Sentry |

## Constraints từ global rules
- File caps: BE 600 dòng, FE 400 dòng; test ở file riêng.
- PostgreSQL: composite index bằng-trước-khoảng-sau, INCLUDE, deferred join cho phân trang, partial/expression index.
