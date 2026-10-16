# ADR-0002: Prisma làm ORM

- Status: Accepted
- Date: 2026-10-16

## Context
SRS chọn Prisma. Rule PostgreSQL bắt buộc covering/partial/expression index và deferred join, Prisma không khai báo được trong schema.

## Decision
Prisma 7, schema chia nhiều file theo domain. Index nâng cao viết tay trong migration SQL (`--create-only`). List lớn dùng TypedSQL / `$queryRaw` với `Prisma.sql`.

## Consequences
DX tốt, type-safe. Đổi lại phải review SQL migration thủ công và có thêm lớp TypedSQL.
