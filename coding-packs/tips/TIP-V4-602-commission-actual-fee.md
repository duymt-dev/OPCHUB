# TIP-V4-602: Hoa hồng Affiliate theo phí thực trả (D-70)

## HEADER
- TIP-ID: TIP-V4-602
- Project: OPCHUB
- Module: affiliate (server, admin tab Chính sách, portal Affiliate) · db · shared · mock
- Priority: P0
- Depends on: V4-601 (giá 3 gói). Xếp chồng sau V4-605 (PR #21 chưa merge)
- Estimated: M
- REQ / D: REQ-502 · D-70 (thay cơ sở 600.000 của D-53) · D-69 (kỳ cũ giữ 600.000) · AD-06, AD-10, F05
- **Files touched:**
  - `packages/db/prisma/schema/affiliate.prisma` (modify): enum `CommissionSource { membership fundraising }`, `Commission.source @default(membership)`, `AffiliatePolicy.fundraisingRate @default(10)`
  - `packages/db/prisma/migrations/20261023200000_v4_commission_actual_fee/` (create), `packages/db/test/migration-commission-source.int.spec.ts` (create)
  - `packages/db/seed/demo/affiliate-scenario.ts` (modify): dùng hằng kỳ cũ D-69 từ shared
  - `packages/shared/src/membership/plans.ts` (modify): `LEGACY_ANNUAL_FEE` (D-69), `fundraisingCommission(rate)`
  - `packages/shared/src/api-domains/affiliate.ts` (modify): policy thêm `fundraisingRate`; bỏ schema preview
  - `packages/shared/src/mock-data/domains/{affiliate,affiliate-demo,affiliate-policy}.ts` (+ spec) (modify)
  - `apps/server/src/modules/affiliate/**`: xoá `domain/policy-preview.ts` (+ spec); sửa policy controller/service/repository, `me-affiliate.{query,service}.ts`
  - `apps/server/src/modules/membership-fee/services/membership-fee.service.ts` (modify): `listAmount` = phí thực trả
  - `packages/shared/src/outbox/events.ts` (comment)
  - `apps/server/test/affiliate/**` liên quan, `apps/server/test/contract/{affiliate-admin,coverage}.int.spec.ts`
  - `apps/admin/src/features/affiliate/**` (tab Chính sách), `apps/admin/messages/vi/affiliate.json`, `apps/admin/src/mocks/handlers/affiliate.ts`, mock specs
  - `apps/portal/src/features/affiliate/**` nếu cần (số tiền hero lấy từ API)
  - `coding-packs/plans/api-contract.md`
  - `e2e/behavior/affiliate-*.spec.ts` liên quan, `e2e/parity/scenarios/admin-affiliate-states.ts` (nếu cần)
- **Parallel-safe with:** sequential, xếp chồng sau V4-605 (cùng `api-contract.md`, `coverage.int.spec.ts`).

## CONTEXT
- D-70: hoa hồng = % mặc định × **số tiền gói thực đóng** (1.200.000 / 3.600.000), làm tròn xuống đồng. Gọi vốn: 10% × 15.000.000 khi Admin duyệt Gọi vốn. Giữ D-53: chỉ lần đóng phí đầu, chặn tự giới thiệu, chi trả cuối tháng.
- Blueprint 2.3: `Commission.listAmount` = số tiền thực trả; thêm `Commission.source`; `AffiliatePolicy.fundraisingRate Int @default(10)`.
- Prototype v4 tab Chính sách: ô "Tỷ lệ hoa hồng mặc định (%)" + gợi ý "Áp dụng trên phí năm: Gói Cá nhân 1.200.000đ · Gói Doanh nghiệp 3.600.000đ"; ô chỉ đọc "Hoa hồng Gói Gọi vốn (%)" = 10 + "= 1.500.000đ / Gói Gọi vốn 15.000.000đ · ghi nhận khi Admin duyệt". Không còn ví dụ "= 120.000đ / thành viên 600.000đ".
- Hiện tại: `membership_fee.confirmed.listAmount = cur.amount` (số phải thu theo gói sau V4-601); `policyPreview` dùng hằng 600.000; `me-affiliate` dùng `fee?.amount ?? 600_000` và `COALESCE(list_amount, 600000)`.
- Key files: `affiliate-lifecycle.handler.ts` (ghi hoa hồng), `commission.repository.ts`, `policy.repository.ts`, `admin/features/affiliate/components/policy-*.tsx`.

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): outbox cùng transaction, tiền số nguyên
- [database/query-indexing](../standards/database/query-indexing.md), [database/prisma-migrations](../standards/database/prisma-migrations.md)
- [frontend/ui-parity](../standards/frontend/ui-parity.md), [frontend/antd-ui](../standards/frontend/antd-ui.md)
- [testing/testing](../standards/testing/testing.md)

## TASK
Hoa hồng phí thành viên tính trên phí thực trả của khoản phí (không vượt giá gói phải thu), không còn hằng 600.000 trong mã chạy. Thêm cột nguồn hoa hồng và % Gọi vốn trong chính sách. Tab Chính sách Admin và số tiền hero Portal theo prototype v4.

## SPECIFICATIONS
### Business Rules
1. `listAmount` của `membership_fee.confirmed` = phí gói của kỳ vừa đóng (`membership_fees.amount` lúc kích hoạt: 1.200.000 / 3.600.000, kỳ cũ D-69 600.000). Không lấy số tiền chuyển: chuyển dư không tăng hoa hồng; khớp tay thiếu (QĐ-01, kế toán chịu trách nhiệm) giữ hoa hồng theo gói (Q-V4-602-4).
2. Kỳ `pending_payment` còn 600.000 (D-69) → hoa hồng trên 600.000. Hằng kỳ cũ chỉ định nghĩa một chỗ: `LEGACY_ANNUAL_FEE` trong `plans.ts`.
3. `commissions.source` mặc định `membership`; dữ liệu cũ = `membership`. Ghi hoa hồng `fundraising` thuộc V4-610 (cần `ProjectFundraising`); V4-602 chỉ thêm cột + chính sách (Q-V4-602-1).
4. `affiliate_policy.fundraising_rate` 1–50, mặc định 10. GET/PUT chính sách có `fundraisingRate`; PUT ghi audit như cũ.
5. Bỏ `GET /admin/affiliate/policy/preview` (prototype v4 không còn ví dụ theo tỷ lệ; gợi ý giá lấy từ `MEMBERSHIP_PLANS`). Hợp đồng 204 → 203 (Q-V4-602-2).
6. Portal hero "bạn nhận X": `perAmount` = % × giá Gói Cá nhân (mức thấp nhất, không hứa quá; Q-V4-602-3). Prototype v4 còn `FEE=600000` ở `affPage`.
7. Lịch sử giới thiệu: dòng chưa có hoa hồng hiện "—" (như cũ); `feeAmount` khi chưa có hoa hồng = 0 thay vì 600.000.

### Validation
- `fundraisingRate`: số nguyên 1–50 (zod + CHECK DB).

### Error Handling
- Route preview cũ → 404.

## ACCEPTANCE CRITERIA
- Given TV Doanh nghiệp được giới thiệu, đóng 3.600.000 lần đầu, đại lý 20% When đối soát Then hoa hồng 720.000, `list_amount` 3.600.000, `source` membership.
- Given TV Cá nhân đóng 1.200.000 Then hoa hồng 240.000.
- Given kỳ cũ 600.000 (D-69) đóng đủ Then hoa hồng 120.000.
- Given chuyển dư 1.500.000 cho Gói Cá nhân Then hoa hồng 240.000 (theo gói). Given khớp tay 900.000 (QĐ-01) Then hoa hồng 240.000 (AT-AF02 giữ nguyên).
- Given migration trên dữ liệu cũ Then mọi hoa hồng `source = membership`, chính sách `fundraising_rate = 10`, số tiền không đổi.
- Given Admin mở tab Chính sách Then thấy gợi ý giá 2 gói và ô Gọi vốn 10% "= 1.500.000đ / Gói Gọi vốn 15.000.000đ"; lưu chính sách vẫn ghi audit.
- Given grep `600000|600_000` trong mã chạy Then chỉ còn `LEGACY_ANNUAL_FEE` (D-69).

## CONSTRAINTS
- DO NOT: tính lại hoa hồng đã ghi; đổi D-53 (lần đầu, tự giới thiệu, chi trả cuối tháng); ghi hoa hồng Gọi vốn khi chưa có luồng duyệt (V4-610).
- REUSE: `commissionAmount`, `MEMBERSHIP_PLANS`, `FUNDRAISING_PLAN`, audit hiện có.
- SKIP: hoa hồng Gọi vốn thực ghi, unique `(source, sourceId)` (V4-610).

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng Files touched
- [x] Tiền số nguyên, làm tròn xuống; outbox cùng transaction
- [x] Integration Postgres thật: hoa hồng theo gói, kỳ cũ D-69, chuyển dư, migration dữ liệu
- [x] lint/typecheck/unit/depcheck/build + test:int module + gác cổng + e2e domain — số thật
- [x] Parity màn đụng tới ≤ 3% (1440 + 390) hoặc DV
- [x] Commit theo đường dẫn, `git status --short` sạch, báo SHA
