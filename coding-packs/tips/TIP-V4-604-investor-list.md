# TIP-V4-604: Nhà đầu tư = danh sách + xuất (D-72)

## HEADER
- TIP-ID: TIP-V4-604
- Project: OPCHUB
- Module: investor (server, admin, portal funding box) · db · shared
- Priority: P1
- Depends on: V4-603 (xếp chồng, PR #19 chưa merge)
- Estimated: M
- REQ / D: REQ-508 · D-72 (thay QT-10, NA-11, NA-22, §22.4) · §27.1, AD-08b, UP-11, F05
- **Files touched:**
  - `packages/db/prisma/schema/investor.prisma` (modify): bỏ `InvestorInterestStatus`, `investor_interests.status` + index, `investor_summaries.status`, model `InvestorComment`
  - `packages/db/prisma/migrations/20261023160000_v4_investor_list/` (create)
  - `packages/db/seed/demo/{investor,reset}.ts` (modify)
  - `packages/shared/src/{enums.ts,outbox/events.ts,api-domains/investors.ts,api-domains/investors-admin.ts}` (modify)
  - `packages/shared/src/mock-data/domains/{investors-admin,content,ops-project-social,index}.ts` (modify), `investor-thread.ts`, `investor-bridge.ts` (delete)
  - `apps/server/src/modules/investor/**`: delete `domain/interest-status*.ts`, `repositories/investor-comment.repository.ts`, `services/investor-notify.handler.ts`; modify services, repositories, controllers, module
  - `apps/server/src/worker/processors/investor.processor.ts` (delete) + `worker-app.module.ts`
  - `apps/server/test/investor/**`, `test/contract/investor.int.spec.ts`, `test/audit/c4-transitions.audit.ts`
  - `apps/admin/src/features/investors/**`, `apps/admin/src/mocks/handlers/{investors,investor-bridge,index}.ts`, `apps/admin/src/mocks/g5c-handlers.spec.ts`, `apps/admin/messages/vi/investors.json`
  - `apps/portal/src/features/projects/{api.ts,components/funding-box.tsx,hooks/*}`, `apps/portal/src/mocks/handlers/{projects,content,account,index,investor-bridge}.ts`, `apps/portal/src/mocks/domain-handlers.spec.ts`, `apps/portal/messages/*/projects.json`
  - `coding-packs/plans/api-contract.md`
  - `e2e/behavior/{admin-investors,investor-thread}.spec.ts`, `e2e/audit/uat-interaction.audit.ts`, parity `admin-content.ts`, `portal-projects.ts`
- **Parallel-safe with:** sequential, xếp chồng sau V4-603 (cùng `api-contract.md`, `c4-transitions.audit.ts`).

## CONTEXT
- §27.1: "Nhà đầu tư: Bỏ trạng thái kết nối; giữ danh sách nhà đầu tư quan tâm (tên, SĐT, đơn vị) và xuất dữ liệu." AD-08b: "tên, SĐT, đơn vị, dự án quan tâm; xuất dữ liệu. Dữ liệu từ nút Quan tâm đầu tư ở UP-11."
- D-72: **xóa hẳn** trạng thái kết nối, nút Gọi điện, luồng bình luận.
- Prototype v4 (`index.html` 4131–4201) đã bỏ cột trạng thái và nút Gọi, nhưng vẫn còn "Trao đổi với nhà đầu tư" (Admin) và "Trao đổi với OPC Hub" (Portal). D-72 có hiệu lực cao hơn → bỏ (Q-V4-604-1).

## APPLICABLE STANDARDS
- [database/query-indexing](../standards/database/query-indexing.md) (danh sách keyset theo `last_at`, giữ nguyên) · [backend/nestjs-modules](../standards/backend/nestjs-modules.md) · [testing/testing](../standards/testing/testing.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md)

## TASK
Đưa Admin › Nhà đầu tư về danh sách + xuất CSV, gồm drawer "Thông tin nhà đầu tư" chỉ hiển thị (có Sao chép số). Bỏ trạng thái, bình luận, luồng trao đổi Portal, sự kiện `investor.admin_replied`. Giữ nút "Quan tâm đầu tư" và danh sách "Nhà đầu tư quan tâm" của chủ dự án.

## SPECIFICATIONS
### Business Rules
1. Giữ:
   - `POST /projects/:id/interest`, `GET /projects/:id/interests`.
   - `GET /admin/investors`, `/admin/investors/summary`, `POST /admin/investors/export` (có audit), `GET /admin/investors/:key`.
2. Xóa:
   - `PATCH /admin/investors/:key/status`, `GET|POST /admin/investors/:key/comments`.
   - `GET /me/investor-thread`, `POST /investor-thread/:key/messages`.
   - Outbox `investor.admin_replied` và consumer của nó.
3. DB migration:
   - Bỏ index `investor_interests_status_created_at_idx`.
   - Bỏ cột `investor_interests.status`, `investor_summaries.status`.
   - Bỏ bảng `investor_comments` và enum `investor_interest_status`.
   - Outbox `investor.admin_replied` chưa gửi → đánh dấu đã gửi (không còn consumer, giữ M1).
4. Danh sách Admin:
   - Cột: Nhà đầu tư (tên + ngày gần nhất), Loại, Doanh nghiệp / Quỹ, Số điện thoại, Dự án quan tâm, Tổng quan tâm, Chi tiết.
   - Lọc theo loại. Tìm theo tên, đơn vị, SĐT. Xuất CSV.
   - Không có cột trạng thái, không có số bình luận.
5. Drawer:
   - Hiển thị: tên, loại, đơn vị, SĐT, tổng vốn quan tâm.
   - "Sao chép số".
   - "Dự án đã quan tâm (N)" gồm số tiền, chủ dự án, ngày, lời nhắn.
   - Không có bước trạng thái, không có Gọi điện, không có trao đổi.
6. Portal tab Gọi vốn:
   - Bỏ khối "Trao đổi với OPC Hub".
   - Giữ "Quan tâm đầu tư" / "✓ Đã gửi quan tâm" và danh sách "Nhà đầu tư quan tâm" của chủ dự án.
7. Loại thông báo `invest` giữ trong enum để thông báo cũ vẫn đọc được; không sinh mới.

### Error Handling
- Route đã xóa → 404 (Nest không có route).

## ACCEPTANCE CRITERIA
- Given Admin mở Nhà đầu tư, Then bảng không có cột trạng thái. Drawer không có "Trạng thái kết nối", "Gọi điện", "Trao đổi với nhà đầu tư". "Xuất CSV" tải đủ cột, có audit.
- Given NĐT gửi quan tâm, Then dòng xuất hiện ở Admin. Summary đếm đúng. Không ghi outbox.
- Given dữ liệu cũ có status + comments + outbox `investor.admin_replied` pending, When chạy migration, Then cột, bảng và enum bị bỏ; outbox pending được đóng; dòng quan tâm giữ nguyên.
- Given NĐT mở tab Gọi vốn, Then không có "Trao đổi với OPC Hub".
- Parity: D-58, D-59, D-60, P-70 ≤ 3% (1440 + 390). P-69, P-71, P-72 đo lại.

## CONSTRAINTS
- DO NOT: xóa `InvestorInterest` / `InvestorSummary` / export; đổi keyset danh sách; bỏ audit export.
- REUSE: `InvestorAdminRepository.page`, `ExportService`.

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng Files touched
- [x] Mọi outbox event còn consumer (M1); migration đóng event mồ côi
- [x] Integration Postgres thật: interest + summary, admin list/export, migration dữ liệu
- [x] lint/typecheck/test/test:int/depcheck/build + e2e behavior — số thật
- [x] Parity màn đụng tới ≤ 3% (1440 + 390) hoặc DV
- [x] Commit theo đường dẫn, `git status --short` sạch, báo SHA
