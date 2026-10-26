# TIP-V4-610: Gói Gọi vốn — mua (mã GV), đối soát, Admin thẩm định, tab Gọi vốn, hoa hồng 10%, nhắc + hết hạn

## HEADER
- TIP-ID: TIP-V4-610
- Project: OPCHUB
- Module: project (server) · membership-fee (reconcile dispatch) · affiliate (hoa hồng Gọi vốn) · notification · mail · worker · db · shared · integrations · portal (projects, membership) · admin (projects)
- Priority: P0 (REQ-512)
- Depends on: V4-601 (giá `FUNDRAISING_PLAN`), V4-602 (`commissions.source`, `affiliate_policy.fundraising_rate`), V4-604 (NĐT danh sách). Xếp chồng sau V4-607 (PR #23 chưa merge)
- Estimated: L
- REQ / D: REQ-512, REQ-502 · D-70, D-82, D-81 (fake bank), D-72, D-53 · §27.1, §27.6.1 UP-11/UP-12, §27.6.2 AD-06/AD-08b/AD-10, §27.7 F05, §27.8
- **Files touched:**
  - `packages/db/prisma/schema/project.prisma` (modify): enum `FundraisingStatus`, model `ProjectFundraising`
  - `packages/db/prisma/schema/affiliate.prisma`, `account.prisma` (modify): `Commission.feePeriodId?`, `Commission.fundraisingId? @unique`, bỏ `@unique` `referredUserId` (UQ partial viết tay), quan hệ User → `Commission[]`
  - `packages/db/prisma/schema/mail.prisma` (modify): `MailKind.fundraising`
  - `packages/db/prisma/migrations/20261024120000_v4_fundraising/` (create) + `packages/db/test/migration-fundraising.int.spec.ts` (create)
  - `packages/db/seed/demo/**` (modify): dự án đang khai báo gọi vốn → bản ghi Gọi vốn `active` (legacy)
  - `packages/shared/src/api-domains/fundraising.ts` (create) + `project-portal.ts`, `project-admin.ts`, `projects.ts` (modify: trường `fundraising`), `index.ts`
  - `packages/shared/src/outbox/events.ts`, `queues/queues.ts`, `api-domains/marketing.ts` (`MAIL_LOG_KIND`) (modify: chỉ thêm dòng)
  - `packages/shared/src/mock-data/domains/fundraising*.ts` (create) + project mock (modify)
  - `packages/integrations/src/bank-webhook/content.ts` (+ spec) (modify): `extractPaymentCode` (TV | GV)
  - `apps/server/src/modules/project/{domain/fundraising-status.ts, repositories/fundraising.repository.ts, services/fundraising*.service.ts, controllers/fundraising.controller.ts, controllers/admin-fundraising.controller.ts}` (create); `project.repository.ts`, `project-read.service.ts`, `project.mapper.ts`, `project-admin.service.ts`, module (modify)
  - `apps/server/src/modules/membership-fee/{ports.ts, services/reconcile.service.ts}` (modify: dispatch theo tiền tố, cổng `FUNDRAISING_PAYMENTS`)
  - `apps/server/src/modules/affiliate/{services/fundraising-commission.handler.ts (create), repositories/commission.repository.ts, repositories/me-affiliate*.ts, repositories/commission-admin.query.ts}` (modify: ghi nguồn + join theo `source='membership'`)
  - `apps/server/src/modules/investor/services/interest.service.ts`, `repositories/interest.repository.ts` (modify: chỉ nhận quan tâm khi Gọi vốn `active`)
  - `apps/server/src/modules/notification/services/*`, `apps/server/src/modules/mail/templates-fundraising.ts` (create), `mail-priority.ts`
  - `apps/server/src/worker/{schedules.ts, worker-app.module.ts, processors/fundraising.processor.ts}` (create/modify)
  - `apps/server/test/project/fundraising*.int.spec.ts` (create), contract table + coverage, `coding-packs/plans/api-contract.md`
  - `apps/portal/src/features/projects/**` (tab Gọi vốn đầu tư, popup Gói Gọi vốn, mở popup sau khi gửi dự án có gọi vốn), `apps/portal/src/features/membership/components/plan-panel.tsx` (nút Đăng ký mở popup), messages `projects.json` 10 ngôn ngữ, MSW handlers
  - `apps/admin/src/features/projects/**` (chip Gọi vốn + "Duyệt gọi vốn" / "Từ chối" ở dòng/thẻ), messages, MSW handlers
  - `e2e/behavior/fundraising.spec.ts` (create), `e2e/parity/scenarios/portal-projects.ts`, `admin-content.ts` (P-69..72 viết lại, thêm màn mới)
- **Parallel-safe with:** sequential — dùng chung `api-contract.md`, `coverage.int.spec.ts`, `events.ts`, `affiliate.prisma` với V4-602/607.

## CONTEXT
- §27.1/UP-11: "Khai báo số vốn, % cổ phần; thanh toán 15.000.000đ/dự án/6 tháng; nhà đầu tư quan tâm để lại tên, SĐT, đơn vị. Admin thẩm định trước khi hiển thị; không thu phí thành công."
- AD-06: "Duyệt Gói Gọi vốn … Duyệt Gọi vốn → ghi nhận hoa hồng 10% cho đại lý." F05: Đăng dự án → Admin duyệt → Mua Gói Gọi vốn → Admin thẩm định → NĐT quan tâm.
- D-82: Cá nhân + DN mua được; hết 6 tháng nhắc gia hạn (thông báo + email); hết hạn → tab Gọi vốn ẩn, dự án vẫn hiện; gia hạn = trả 15.000.000đ cho 6 tháng tiếp.
- D-70: hoa hồng Gọi vốn = `fundraisingRate` (mặc định 10) × 15.000.000 khi Admin duyệt, cho đại lý giới thiệu chủ dự án.
- Blueprint 2.2: `ProjectFundraising` (pending_payment → pending_review → active → expired | rejected), mã CK `GV` + 6 số qua cùng adapter `bank-webhook` (fake D-81), chuyển trạng thái qua `domain/fundraising-status.ts` có điều kiện `WHERE status = <from>`.
- Prototype v4:
  - `Popup · Gói Gọi vốn` "Thanh toán Gói Gọi vốn" (2 chế độ: sau khi đăng dự án / chọn dự án từ Bảng giá), bảng Số tiền / Ngân hàng / Số tài khoản / Chủ tài khoản / Nội dung + "Sao chép", ghi chú "Không thu phí thành công…", nút "Để sau" / "Tôi đã chuyển khoản".
  - Tab "Gọi vốn đầu tư" ở chi tiết dự án (chỉ khi bật + đang gọi vốn; chuyển sang dự án khác không có → về Tổng quan), "Dự án liên quan" thành tab.
  - Admin › Dự án: chip "Gọi vốn · chờ thanh toán / chờ duyệt / Đang gọi vốn / từ chối", nút "Duyệt gọi vốn" / "Từ chối" khi chờ duyệt. Toast "Đã duyệt gọi vốn · ghi nhận hoa hồng Affiliate 10% (nếu có người giới thiệu)" / "Đã từ chối gói gọi vốn".
  - Thông báo: "Đã nhận Gói Gọi vốn · chờ Admin thẩm định", "Gói Gọi vốn đã được duyệt: <tên>" / "Dự án hiển thị ở mục Gọi vốn trong 6 tháng.", "Gói Gọi vốn bị từ chối: <tên>" / "Admin sẽ liên hệ để hoàn tất hồ sơ."
- Hiện trạng: `ProjectFunding` là khai báo, tab/khối gọi vốn hiện khi có `funding`; nút Gói Gọi vốn trên Bảng giá chỉ toast "sẽ mở trong bản cập nhật tiếp theo".

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) (outbox cùng transaction, cổng giữa module), [backend/auth-rbac](../standards/backend/auth-rbac.md) (`projects.action`)
- [database/query-indexing](../standards/database/query-indexing.md), [database/prisma-migrations](../standards/database/prisma-migrations.md)
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md), [frontend/data-state](../standards/frontend/data-state.md), [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md)

## TASK
Hiện thực Gói Gọi vốn có phí:
- chủ dự án tạo khoản Gọi vốn có mã CK riêng `GV` + 6 số;
- ngân hàng (fake) báo về → đối soát chuyển "chờ thẩm định";
- Admin duyệt → dự án hiện tab Gọi vốn trong 6 tháng + ghi hoa hồng 10% cho đại lý giới thiệu; Admin từ chối → báo chủ dự án;
- job hằng ngày nhắc T-14 và chuyển hết hạn.

## SPECIFICATIONS
### Business Rules
1. **Trạng thái** (`fundraising-status.ts`):
   - pending_payment → pending_review (đối soát đủ tiền)
   - pending_review → active (Admin duyệt) | rejected (Admin từ chối)
   - active → expired (job)
   - Mọi chuyển: `updateMany WHERE id AND status = from`; 0 dòng → 409 `INVALID_STATE`.
2. **Tạo** `POST /v1/projects/:id/fundraising` (chủ dự án, đã đóng phí — paywall mặc định, NĐT 403 theo `AllowAccountTypes`):
   - Dự án của mình, chưa xoá. Có khoản `pending_payment` → trả lại khoản đó (idempotent, cùng mã).
   - Có khoản `pending_review` → 409 "Gói Gọi vốn đang chờ Admin thẩm định".
   - Có khoản `active` còn > 14 ngày → 409 "Dự án đang gọi vốn".
   - `amount = FUNDRAISING_PLAN.amount` (15.000.000, D-82 — Q-V4-610-3), `code = 'GV' || lpad(nextval('fundraising_code_seq'), 6, '0')`.
   - Trả `{ id, projectId, projectName, code, amount, status, endsAt, transferContent: 'OPCHUB <code>', bank }`.
3. `GET /v1/me/fundraisings`: các khoản của tôi (mới nhất trước, ≤ 100) cho popup chọn dự án.
4. **Đối soát**:
   - `extractPaymentCode(content)` → `{ kind: 'member', code: 'TV…' } | { kind: 'fundraising', code: 'GV…' } | null`; có cả TV và GV khác nhau → null (mơ hồ).
   - GV → cổng `FUNDRAISING_PAYMENTS.pay(tx, code, amount, txnId, now)` do project cung cấp:
     - khoá giao dịch → khoản `pending_payment` theo mã;
     - đủ tiền → `pending_review`, `paid_at`, `payment_transaction_id`, outbox `fundraising.paid`;
     - thiếu tiền / không có mã / sai trạng thái → `unmatched` có lý do (rollback như phí).
   - Không có cổng (process socket) → `unmatched` "Chưa hỗ trợ".
5. **Thẩm định** `POST /v1/admin/projects/:id/fundraising/:fid/review { decision: 'approve'|'reject', note? }` (`projects.action`):
   - Chỉ từ `pending_review`.
   - Duyệt: `active`, `starts_at = max(now, ends_at khoản active trước của dự án)`, `ends_at = starts_at + 6 tháng`, `reviewed_by/at`.
   - Ghi `audit_logs` (`project.fundraising_review`) + outbox `fundraising.reviewed { fundraisingId, decision }` cùng transaction.
6. **Hoa hồng** (consumer `fundraising.reviewed`, approve):
   - Referral của chủ dự án (`pending|converted`); đại lý `active`; rate = `affiliate_policy.fundraising_rate`; `list_amount = amount`; `amount = floor(rate × list_amount / 100)`; `source = 'fundraising'`; `fundraising_id` UQ (chạy lại không ghi trùng).
   - Không có người giới thiệu / đại lý tạm dừng → không ghi.
   - Outbox `affiliate.commission_recorded`.
   - Không đụng referral (không đổi `converted`).
7. **Hiển thị**:
   - `fundraisingActive` = có khoản `active` (`ends_at > now`).
   - Detail/thẻ: `funding` chỉ trả khi active, với mọi người trừ chủ dự án.
   - Lọc "Đang gọi vốn" = funding + active.
   - Quan tâm đầu tư (`POST projects/:id/interest`) chỉ khi active, ngược lại 404 "Dự án không gọi vốn".
8. **Job** `scheduler.fundraisingStatus` 08:10 VN hằng ngày:
   - (a) `active` có `ends_at ≤ now` → `expired` + thông báo + email "Gói Gọi vốn đã hết hạn".
   - (b) `active` có `ends_at` trong 14 ngày, `reminded_at IS NULL` → claim `reminded_at` + thông báo + email nhắc gia hạn.
   - Index `(status, ends_at)`. Batch 200, không query trong vòng lặp.
9. **Migration**:
   - Bảng + enum + sequence; UQ partial một khoản mở (`pending_payment|pending_review`) / dự án.
   - Backfill: mỗi dự án đang có `project_fundings` → một khoản `active`, `legacy = true`, `amount 0`, `code NULL`, `starts_at = now()`, `ends_at = now() + 6 tháng` (Q-V4-610-2, không làm mất tab của dự án đang hiển thị).
   - `commissions`: `fee_period_id` NULL được, thêm `fundraising_id` UQ FK, đổi UQ `referred_user_id` → partial `WHERE source = 'membership'`, CHECK nguồn ↔ khoá.
   - `mail_kind` thêm `fundraising`.
10. **Portal**:
    - Bảng giá "Đăng ký · 15.000.000đ/dự án" mở popup chế độ chọn dự án: dự án của tôi không có khoản `pending_review` / `active`. Không có → "Bạn chưa có Dự án OPC để gọi vốn." + "+ Đăng dự án mới".
    - Gửi dự án có bật gọi vốn (không phải nháp) mà chưa có khoản mở/active → popup chế độ dự án.
    - "Tôi đã chuyển khoản" → `POST /v1/me/fundraisings/:id/transfer-confirm` (202, chỉ ghi nhận như D-31; MSW giả webhook về trễ) → toast "Đã ghi nhận thanh toán · hồ sơ gọi vốn chuyển sang chờ Admin duyệt" sau khi đối soát.
    - Tab "Gọi vốn đầu tư" (giữa Góp ý và Dự án liên quan, chỉ khi `fundraisingActive`), "Dự án liên quan" thành tab; cột phải còn Chủ dự án + Thông tin (+ repo).
11. **Admin**:
    - Dòng/thẻ dự án có chip theo khoản mới nhất không legacy (`Gọi vốn · chờ thanh toán`, `Gọi vốn · chờ duyệt`, `Đang gọi vốn`, `Gọi vốn · từ chối`).
    - Chờ duyệt → "Duyệt gọi vốn" (xanh) / "Từ chối" (không hỏi lý do — prototype).

### Validation / Error Handling
- Không phải chủ dự án → 404 (không lộ). Chưa đóng phí → paywall 402 như route khác.
- Thẩm định trạng thái sai → 409 `INVALID_STATE`. `fid` không thuộc `id` → 404.
- Portal: chưa chọn dự án → "Vui lòng chọn dự án cần gọi vốn".

## ACCEPTANCE CRITERIA
- Given chủ dự án đã đóng phí When tạo Gọi vốn Then nhận mã `GV` 6 số, gọi lại trả cùng mã.
- Given giao dịch fake "OPCHUB GV000001" 15.000.000 When đối soát Then khoản `pending_review`, giao dịch `matched`, chạy lại không đổi. Given chuyển 14.000.000 Then `unmatched` "Số tiền nhỏ hơn Gói Gọi vốn".
- Given khoản `pending_review` When Admin duyệt Then `active` 6 tháng, audit, tab Gọi vốn hiện + nút Quan tâm. Duyệt lần 2 → 409.
- Given chủ dự án được đại lý X giới thiệu When duyệt Then commission `source=fundraising`, 1.500.000 (10%), đổi % chính sách 12 → 1.800.000; duyệt lại không ghi trùng; hoa hồng phí thành viên cũ của cùng người vẫn còn.
- Given Admin từ chối Then `rejected`, chủ dự án nhận thông báo, tab không hiện.
- Given khoản active còn 10 ngày When job chạy Then một thông báo + email nhắc, chạy lại không nhắc lần 2. Given quá hạn Then `expired`, tab ẩn, dự án vẫn ở Khám phá, quan tâm mới → 404.
- Given migration Then dự án có khai báo gọi vốn trước đó có khoản active legacy; hoa hồng cũ giữ nguyên.
- Portal/Admin MSW: luồng Bảng giá → popup → chuyển khoản → Admin duyệt → tab Gọi vốn hiện (e2e behavior).

## CONSTRAINTS
- DO NOT: hằng số 15.000.000 / 600.000 mới (đọc `FUNDRAISING_PLAN`), gọi ngân hàng thật, sửa baseline/ngưỡng parity, làm "Trao đổi với OPC Hub" (D-72, Q-V4-604-1).
- REUSE: `bank-webhook` adapter, `PaymentTransactionRepository`, `OutboxService`, `AuditService`, `MailService.requestMany`, `NotificationService.notify`, `FundingBox`/`InvestModal`, `PlanCards`.
- SKIP: Lịch sử thanh toán ở Hồ sơ (UP-14, chưa có màn — Q-V4-610-4), khớp tay GV ở Admin › Phí (Q-V4-610-5), "Đã thẩm định" badge / Gọi vốn nổi bật / Demo Day.

## PARITY (bảng "V4 — PARITY UI")
- P-69 (tab Gọi vốn đầu tư), P-70/P-71 (modal quan tâm từ tab), P-72 (chủ dự án · NĐT quan tâm), P-62 (đo lại — cột phải đổi), P-103 Popup Gói Gọi vốn (chọn dự án), P-104 popup sau khi gửi dự án có gọi vốn, D-88 Admin · Dự án · Gọi vốn chờ duyệt (chip + nút).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`; file BE ≤ 600, FE ≤ 400 dòng; không `any`.
- [ ] Chuyển trạng thái chỉ qua `fundraising-status.ts` + `WHERE status = from` (luật 7); duyệt Gọi vốn ghi audit + outbox cùng transaction (luật 8, 10).
- [ ] Tiền số nguyên VND, giá từ `FUNDRAISING_PLAN` (luật 9); ngân hàng fake (D-81).
- [ ] Mọi sự kiện outbox mới có consumer (test/common/outbox-consumers); hợp đồng API cập nhật.
- [ ] Index `(project_id, status)`, `(status, ends_at)`; job không query trong vòng lặp.
- [ ] lint + typecheck + unit + depcheck + build; test:int project/membership-fee/affiliate/investor + cổng; e2e behavior projects/membership + smoke; parity ≤ 3%.
