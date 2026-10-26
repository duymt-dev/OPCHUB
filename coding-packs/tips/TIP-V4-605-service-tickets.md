# TIP-V4-605: Yêu cầu dịch vụ = phiếu + ghi chú @nhắc (D-72)

## HEADER
- TIP-ID: TIP-V4-605
- Project: OPCHUB
- Module: service (server, admin requests, portal services) · db · shared
- Priority: P0
- Depends on: V4-604 (xếp chồng, PR #20 chưa merge)
- Estimated: M
- REQ / D: REQ-509 · D-72 (thay QT-11, NA-22 phần trạng thái) · §27.1, AD-09
- **Files touched:**
  - `packages/db/prisma/schema/service.prisma` (modify): bỏ `ServiceRequestStatus`, `status`, `assignee`, index `(status, created_at)`
  - `packages/db/prisma/migrations/20261023180000_v4_service_tickets/` (create), `packages/db/test/migration-service-tickets.int.spec.ts` (create)
  - `packages/db/seed/demo/service.ts` (modify)
  - `packages/shared/src/{enums.ts,api-domains/services.ts,api-domains/services-admin.ts}` (modify)
  - `packages/shared/src/mock-data/domains/{services-admin,ops-admin,admin}.ts` (+ spec) (modify)
  - `apps/server/src/modules/service/**`: delete `services/service-request-patch.service.ts`; modify controller, admin service, mapper, module
  - `apps/server/src/modules/reporting/overview.service.ts` (badge)
  - `apps/server/test/{service,contract,gates,audit}/**` liên quan
  - `apps/admin/src/features/requests/**`, `apps/admin/messages/vi/requests.json`, `apps/admin/src/mocks/handlers/{service-requests,admin-system,shell}.ts`, mock specs
  - `apps/portal/src/features/services/components/request-done.tsx` (+ css), `apps/portal/messages/*/services.json`
  - `coding-packs/plans/api-contract.md`, `apps/server/test/contract/coverage.int.spec.ts`
  - `e2e/behavior/{admin-requests,services,popup-v4}.spec.ts`, `e2e/audit/uat-interaction.audit.ts`, `e2e/parity/scenarios/admin-content.ts`
- **Parallel-safe with:** sequential, xếp chồng sau V4-604 (cùng `api-contract.md`, `c4-transitions.audit.ts`, `uat-interaction.audit.ts`).

## CONTEXT
- D-72: bỏ quy trình 5 bước YC (enum `ServiceRequestStatus`), người phụ trách, thống kê/lọc theo trạng thái (migration). YC = phiếu + ghi chú nội bộ @nhắc. Danh mục chương trình & dịch vụ do Admin bật/tắt/thêm/sửa.
- Prototype v4 `index.html` 3456–3544: bảng Mã | Người liên hệ | Dịch vụ | Tỉnh thành | Ngày gửi | Chi tiết; không thẻ thống kê, không chip trạng thái. Drawer chỉ "Yêu cầu {mã}" + thông tin + "Trao đổi nội bộ" (soạn thảo + "Gắn tên:" + "Gửi bình luận"). Tab Danh mục: tên, hình thức, mô tả ngắn, hiển thị, "{n} YC", xoá.
- Blueprint 2.5: giữ `ServiceRequestComment` (mentions); `Service` thêm `audience` — prototype v4 không hiện `audience` ở danh mục → chưa thêm (Q-V4-605-3).

## TASK
Đưa Admin › Dịch vụ về phiếu + ghi chú nội bộ @nhắc, giữ danh mục CRUD. Bỏ trạng thái, chuyển trạng thái, phụ trách, thống kê/lọc theo trạng thái ở DB, server, Admin, Portal, mock, test.

## SPECIFICATIONS
1. Route bỏ: `GET /admin/service-requests/summary`, `POST /admin/service-requests/:code/transition`, `PATCH /admin/service-requests/:code`, `PATCH /admin/service-requests/:code/assignee`. Bảng hợp đồng 208 → 204.
2. Route giữ: `GET /admin/service-requests` (`q`, phân trang; bỏ `status`), `GET …/:code/comments`, `POST …/:code/comments` (mentions ≤ 10, outbox `service_request.mentioned`, audit), `POST …/export` (CSV bỏ cột Trạng thái, Phụ trách; audit), `GET …/staff` (= người gắn tên được: admin có `services.action`, Q-V4-605-1), catalog `GET|POST|PATCH|DELETE /admin/services`, Portal `GET /services`, `POST /service-requests`.
3. Badge menu "Dịch vụ" = số phiếu chưa có ghi chú nội bộ (Q-V4-605-2).
4. Portal màn "Đã gửi yêu cầu tư vấn": bỏ dòng trạng thái.
5. Migration: bỏ index, cột `status`, `assignee`, enum; phiếu và ghi chú giữ nguyên.

## ACCEPTANCE CRITERIA
- Given Admin mở Dịch vụ, Then không có thẻ thống kê, chip trạng thái, cột Phụ trách / Trạng thái; drawer không có bước, nút chuyển, chọn phụ trách.
- Given Admin gửi ghi chú gắn tên, Then người được gắn nhận thông báo `mention`; ghi chú hiện ở "Trao đổi nội bộ".
- Given route cũ, Then 404.
- Given migration chạy trên dữ liệu cũ, Then phiếu, ghi chú giữ nguyên; không còn cột / enum.
- Parity: D-61, D-62, D-63, D-65, P-79…P-83 ≤ 3% (1440 + 390); D-64 (từ chối) = unreachable.

## CONSTRAINTS
- DO NOT: bỏ catalog CRUD, mentions, outbox `service_request.mentioned`, audit; đổi mã `YC-`.
- REUSE: `AdminDirectoryPort.withPermission`, `ServiceCatalogService`, `mockAdminsWith`.

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng Files touched
- [x] Mọi outbox event còn consumer (M1)
- [x] Integration Postgres thật: phiếu, ghi chú + mention, catalog, migration dữ liệu
- [x] lint/typecheck/unit/depcheck/build + test:int module + gác cổng + e2e domain — số thật
- [x] Parity màn đụng tới ≤ 3% (1440 + 390) hoặc DV
- [x] Commit theo đường dẫn, `git status --short` sạch, báo SHA
