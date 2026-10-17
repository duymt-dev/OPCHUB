# TIP-B46: Dịch vụ + yêu cầu dịch vụ (flag FEATURE_SERVICES) — D-21, Q-G5c-4/6

## HEADER
- TIP-ID: TIP-B46 · Module: service · Priority: P2 · Depends on: TIP-B25 · Estimated: M (10h)
- **Files touched:**
  - `apps/server/src/modules/service/**` (create)
  - `packages/shared/src/outbox/events.ts`, `notification-events.handler.ts`, `notification.processor.ts` (modify: `service_request.mentioned`)
  - `apps/server/src/api/api-app.module.ts` (modify)
  - `apps/server/test/service/*.int.spec.ts` (create)
- **Parallel-safe with:** `sequential`.

## SPECIFICATIONS
1. Portal: `GET /services` (sort), `POST /service-requests` + Idempotency-Key (201, mã `YC-<seq>`, 404 dịch vụ tắt/không có).
2. Admin (`n.edit`): list deferred join (status/q), summary GROUP BY status (bảng nhỏ), staff (user có `n.edit`: admin + super_admin — Q-B46-1), transition `{from,to}` UPDATE `WHERE status=from` (409 "Phiếu đã được cập nhật bởi người khác"; sai luồng 409), assignee, comments (author = người gọi, body sanitize, mention → outbox `service_request.mentioned` → thông báo), export CSV, services CRUD (xoá khi có yêu cầu → 409).
3. Audit tag `content` cho mọi thao tác Admin.

## ⚠️ BUILDER-CHECKLIST
- [ ] Transition có điều kiện; idempotency; gate; commit; SHA
