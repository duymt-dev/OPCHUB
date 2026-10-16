# ADR-0004: Một VPS cài native

- Status: Accepted
- Date: 2026-10-16

## Context
Beta nhóm nhỏ, mục tiêu 5.000 online. Chủ nhà chọn cài native, chấp nhận không có HA.

## Decision
Nginx + certbot, systemd, PostgreSQL 16 + PgBouncer, Redis 7, MinIO trên một VPS; Cloudflare phía trước. Nâng dọc 4→8→16 vCPU, sau đó tách DB ra máy thứ hai.

## Consequences
Rẻ, đơn giản. Máy chết là dừng toàn hệ thống; bù bằng backup offsite + runbook khôi phục.
