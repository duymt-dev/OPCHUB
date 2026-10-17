# TIP-B31: Sự kiện Portal + Admin (REQ-080 → 083, Q-G5a-1 → 5)

## HEADER
- TIP-ID: TIP-B31 · Module: event · Priority: P0 · Depends on: TIP-B30, TIP-B25 · Estimated: L (10h)
- **Files touched:**
  - `apps/server/src/modules/event/**` (create: `domain/{event.mapper,vn-time}.ts`, `repositories/event.repository.ts`, `services/{event,event-admin,event-registrants,profile-stats.provider}.ts`, `controllers/{events,admin-events}.controller.ts`, `event-core.module.ts`, `index.ts`)
  - `packages/shared/src/outbox/events.ts` (modify: `event.registered`)
  - `apps/server/src/modules/notification/services/notification-events.handler.ts`, `apps/server/src/worker/processors/notification.processor.ts` (modify)
  - `apps/server/src/api/api-app.module.ts`, `apps/server/src/worker/worker-app.module.ts` (modify)
  - `apps/server/test/event/{events,admin-events}.int.spec.ts`, `apps/server/test/factories/event.factory.ts` (create)
- **Parallel-safe with:** `sequential, shares api-app.module.ts with TIP-B32`.

## CONTEXT
- Hợp đồng: `eventItemSchema`, `eventRegistrationResultSchema`, `adminEventSchema`, `adminEventUpsertSchema`, `eventRegistrantSchema`, `eventCheckInSchema`, `eventRegistrantsExportSchema`.
- MSW: `apps/portal/src/mocks/handlers/{lists,membership}.ts`, `apps/admin/src/mocks/handlers/admin-events.ts`; mock `mock-data/domains/{ops-content,event-admin,event-notify}.ts`.

## SPECIFICATIONS
1. `day` = `"T5, 22/10"` (CN/T2…T7, giờ VN), `time` = `"HH:mm"` VN; `endTime` ↔ `ends_at` cùng ngày VN.
2. `GET /events?mode&page&size(9)`: sắp `starts_at` tăng; `registeredByMe` 1 query cho cả trang.
3. `POST /events/:id/registration` (201): tx khoá `events FOR UPDATE`; lỗi theo thứ tự 404 → 409 "Sự kiện đã đóng đăng ký" → 409 "Bạn đã đăng ký sự kiện này" → 409 "Sự kiện đã hết chỗ". Đăng ký lại sau huỷ: `cancelled → registered` có điều kiện. Outbox `event.registered` → thông báo `event` "Đã đăng ký: <title>".
4. `DELETE …/registration`: `registered → cancelled WHERE status='registered'`, 0 dòng → 409 "Bạn chưa đăng ký sự kiện này"; giảm `registered_count` cùng tx.
5. Admin: ghi `e.edit`; đọc danh sách `e.reg` (Q-B31-1); POST 201 / PATCH (409 "Số chỗ nhỏ hơn số người đã đăng ký") / DELETE; audit `event.create|update|delete` tag `content`.
6. Registrants (`e.reg`): dòng `registered|attended`, `org` = tên DN hoặc "Thành viên OPC"; check-in một UPDATE; export CSV (BOM, quote) + audit `event.registrants_export`.

## ACCEPTANCE CRITERIA
- Đăng ký → `registered+1` + thông báo; lần 2 → 409; huỷ → `-1`.
- Hết chỗ → 409; `registrationOpen=false` → 409; 2 request song song cho chỗ cuối → đúng 1 thành công.
- Check-in tất cả → mọi dòng `attended`; export `dang-ky-<id>.csv` có audit.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đổi trạng thái chỉ qua UPDATE có điều kiện; audit cùng tx; EXPLAIN danh sách ≥10k; gate; commit; SHA
