# TIP-V46-802: Sổ chia sẻ Media Soft ↔ GĐ Vùng, năm của khách, kỳ chi, Chi trả

## HEADER

- TIP-ID: TIP-V46-802
- Project: OPCHUB
- Module: regional-director (sổ chia sẻ), affiliate (chính sách: 3 thông số), membership-fee + project (nguồn sự kiện đối soát, chỉ đọc payload), reporting/regional (projection đọc), Admin › Affiliate › tab GĐ Vùng
- Priority: P0
- Depends on: TIP-V46-801 (đã merge `e59a1f82`)
- Estimated: XL
- REQ / D: REQ-617 · D-119, D-121, D-122, D-128, D-129, D-130 (+ D-110 làm tròn đến đồng, D-104 đối soát, GDV-R05, CS-11 → CS-15)
- **Files touched:**
  - DB
    - `packages/db/prisma/schema/regional-share.prisma` (create): `RegionalShare`, `RegionalPayout`, `CustomerYear`, enum `RegionalShareSource`, `RegionalShareStatus`
    - `packages/db/prisma/schema/affiliate.prisma` (modify): `AffiliatePolicy` thêm `regionalFirstYear`, `regionalStep`, `regionalMin`
    - `packages/db/prisma/schema/regional-director.prisma` (modify): chỉ thêm quan hệ ngược `shares`, `payouts`
    - `packages/db/prisma/migrations/20261105090000_v46_regional_share/migration.sql` (create): bảng, CHECK, index, backfill năm của khách
    - `packages/db/seed/demo/regional-shares.ts` (create), `packages/db/seed/demo/index.ts` (modify: 1 import + 1 lời gọi), `packages/db/seed/demo/reset.ts` (modify: xoá 3 bảng mới)
  - Shared
    - `packages/shared/src/membership/regional-share.ts` + `.spec.ts` (create): hàm thuần `regionalPercent`, `regionalAmount`, `customerYearOf`, `payoutMonthOf`
    - `packages/shared/src/api-domains/regional-shares.ts` (create), `api-domains/index.ts` (modify: 1 dòng), `api-domains/affiliate.ts` (modify: `affiliatePolicySchema` thêm 3 trường có default)
    - `packages/shared/src/outbox/events.ts` (modify): `regional_share.recorded`, `regional_share.payout_recorded`
    - `packages/shared/src/mock-data/domains/regional-shares.ts` + `.spec.ts` (create), `mock-data/domains/affiliate-policy.ts`, `mock-data/domains/index.ts` (modify)
  - Server
    - `apps/server/src/modules/regional-director/`:
      - `domain/regional-share.rules.ts` + `.spec.ts` (create)
      - `repositories/regional-share.repository.ts`, `repositories/regional-payout.repository.ts` (create)
      - `services/regional-share-ledger.service.ts`, `services/regional-share-events.handler.ts`, `services/regional-payout.service.ts`, `services/regional-share-read.service.ts` (create)
      - `controllers/admin-regional-shares.controller.ts` (create)
      - `regional-director-core.module.ts`, `index.ts` (modify: thêm provider / export)
    - `apps/server/src/modules/reporting/regional/regional-projection.repository.ts` (modify): thêm `affiliateRegionAt(tx, affiliateUserId)` (D-128), `customerFirstPaid(tx, userId)` (D-130)
    - `apps/server/src/modules/affiliate/repositories/policy.repository.ts`, `services/affiliate-policy.service.ts`, `controllers/admin-affiliate-policy.controller.ts` (modify: 3 trường mới, audit sẵn có)
    - `apps/server/src/modules/affiliate/repositories/commission.repository.ts` (modify): thêm `referrerForShare(tx, referredUserId)` chỉ đọc (không khoá)
    - `apps/server/src/modules/affiliate/index.ts` (modify: export `AffiliateShareReader`), `apps/server/src/modules/affiliate/services/affiliate-share.reader.ts` (create)
    - `apps/server/src/worker/processors/regional-director.processor.ts` (modify: đăng ký consumer `membership_fee.confirmed`, `fundraising.reviewed`, `regional_share.payout_recorded`)
  - Admin
    - `apps/admin/src/features/affiliate/regional/`:
      - `api.ts`, `types.ts` (modify)
      - `hooks/use-regional-shares.ts`, `hooks/use-regional-payout.ts` (create)
      - `components/regional-list.tsx` (modify → bảng sổ chia sẻ)
      - `components/regional-share-kpis.tsx`, `regional-share-toolbar.tsx`, `regional-share-row.tsx`, `regional-share-items.tsx`, `regional-payout-history.tsx`, `regional-payout-dialog.tsx`, `regional-share.module.css` (create)
    - `apps/admin/src/features/affiliate/components/policy-fields.tsx` (modify: chỉ thêm 3 ô "Quy tắc chia sẻ Media Soft ↔ GĐ Vùng"; phần còn lại của Chính sách §31 là 803)
    - `apps/admin/src/mocks/handlers/regional-shares.ts` (create), `mocks/handlers/index.ts` (modify: 1 dòng)
    - `apps/admin/messages/vi/affiliate.json` (chỉ thêm khoá dưới `affiliate.regional.share.*`, `affiliate.policy.regional*`)
  - Test
    - `apps/server/test/regional-director/{share-ledger,share-backfill,share-payout,share-permissions}.int.spec.ts` (create)
    - `apps/server/test/factories/regional-share.factory.ts` (create)
    - `e2e/behavior/admin-regional-shares.spec.ts` (create); `e2e/parity/scenarios/admin-regional.ts` (modify: thêm `D-120-GDV`, `D-120-GDV-OPEN`)
  - Tài liệu
    - `coding-packs/standards/global/domain-glossary.md` (thêm dòng)
    - `coding-packs/reports/V4.6-progress.md` (dòng #2)
    - `coding-packs/reports/ui-parity/{screens,questions}.md` (dòng / mục V4.6)
    - `coding-packs/reports/TIP-V46-802-completion.md` (create)
- **Parallel-safe with:** sequential.
  - Chia `features/affiliate/**`, `policy-*`, `affiliate.prisma`, `api-domains/affiliate.ts` với V46-803.
  - Chia `api-domains/regional-*`, `modules/regional-director/**` với V46-804.
  - Chia `regional-director.processor.ts` và `commission.repository.ts` với V46-807 (BR-463).

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-802-gdv-revenue-share` tách từ `dev` `e59a1f82`.
- **DB (theo completion 801):** `opchub_dev` native đang có migration của nhánh khác, nên 801 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner đã duyệt). Builder **hỏi owner trước khi chạy migrate**: dùng lại 2 DB này, hay deploy lên `opchub_dev` / `opchub_test`. Không reset / chuẩn hoá DB native.
- Đặc tả `docs/spec/dac-ta.html`:
  - **§31**: chia sẻ Media Soft ↔ GĐ Vùng, công thức `max(min, y1 − giảm × (y − 1))`, CS-11 → CS-15
  - §31.3: các bước chi trả
  - §32 GDV-R05: phần đã ghi nhận trước thu hồi vẫn chi
  - §30.2: năm của khách (bị §31 thay, nhưng mốc năm vẫn dùng theo D-122)
- Delta: `coding-packs/audit/SPEC-V4.6-DELTA.md` P6 (phần GĐ Vùng: khoản ghi nhận, "Phải chi cuối tháng", Chi trả, lịch sử), P7 (chỉ 3 thông số).
- Prototype `docs/spec/index.html` v4.6:
  - Tab GĐ Vùng: markup dòng 4356 → 4389; logic `const gdv=(()=>{…})` (tìm chuỗi này, ngay trước `const A={gdv,…`)
  - `cfg={…g1:50,gStep:10,gMin:20}`, `gPct=y=>Math.max(cfg.gMin,cfg.g1-cfg.gStep*((y||1)-1))`
  - `eom0` = ngày cuối tháng hiện tại, `mKey` = `YYYY-MM`
  - Khối Chính sách "GĐ Vùng năm 1 / giảm mỗi năm / mức tối thiểu" (tìm `afA.cfg.gMin`)
- Đọc trước:
  - Nguồn sự kiện:
    - `apps/server/src/modules/membership-fee/services/membership-fee.service.ts` (`activate` → outbox `membership_fee.confirmed`: `periodId`, `listAmount`, `plan`, `confirmedAt`)
    - `apps/server/src/modules/project/services/fundraising-review.service.ts` (`fundraising.reviewed`: `amount`, `ownerId`, `decision`, `reviewedAt`)
  - Mẫu consumer: `apps/server/src/modules/affiliate/services/{affiliate-lifecycle,fundraising-commission}.handler.ts`; referral: `repositories/commission.repository.ts` (`pendingReferral`, `referrerOf`)
  - Mẫu chi trả idempotent: `apps/server/src/modules/affiliate/services/payout.service.ts` (`IdempotencyService.run` + biên lai trong DB + audit + outbox), header `Idempotency-Key` ở `admin-affiliates.controller.ts:115`
  - Vùng của affiliate D-128 / D-129: `apps/server/src/modules/reporting/regional/regional-projection.repository.ts` › `counts()` (lateral earliest-group; index `(user_id, status, created_at, group_id)` có ở migration `20261104091000`)
  - 801: `modules/regional-director/**`, `features/affiliate/regional/**`, `api-domains/regional-directors.ts`
  - Làm tròn: `modules/affiliate/domain/commission-amount.ts` (`Math.round`, D-110); tháng VN: `modules/affiliate/domain/month-key.ts`

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): sổ thuộc domain regional-director; đọc affiliate / referral qua `modules/affiliate/index.ts`; projection đọc chéo ở `reporting/regional`; không vòng phụ thuộc
- [backend/queues-workers](../standards/backend/queues-workers.md): consumer outbox idempotent, chạy lại không ghi thêm
- [backend/api-conventions](../standards/backend/api-conventions.md): `/v1/admin/gdv/shares*`, `Idempotency-Key` khi chi trả, phân trang keyset cho danh sách khoản
- [backend/auth-rbac](../standards/backend/auth-rbac.md): xem `affiliate.view`, chi trả `affiliate.payout`, sửa chính sách `affiliate.action`
- [database/prisma-migrations](../standards/database/prisma-migrations.md) · [database/query-indexing](../standards/database/query-indexing.md): UQ chống trùng, CHECK, index "bằng trước, khoảng / sort sau", backfill SQL một lần
- [security/security](../standards/security/security.md): snapshot STK chỉ vào bảng chi trả; không log STK
- [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Ghi **sổ chia sẻ Media Soft ↔ GĐ Vùng**:
- Mỗi khoản phí thành viên hoặc Gói Gọi vốn được đối soát / duyệt, của khách đăng ký qua link affiliate, sinh đúng một dòng sổ.
- Dòng sổ chụp lại: vùng (theo tỉnh của affiliate), năm của khách, tỷ lệ GĐ Vùng theo 3 thông số Chính sách, số tiền làm tròn đến đồng.
- Vùng trống, hoặc giao dịch trước ngày bổ nhiệm → 100% Media Soft.

Cuối tháng Admin bấm **Chi trả** từng GĐ Vùng (idempotent, audit) để chốt các khoản tháng đã qua; giữ lịch sử chi trả.

Dựng tab **Admin › Affiliate › GĐ Vùng** đúng prototype (3 KPI, tìm, bảng từng GĐ Vùng, mở dòng xem khoản và lịch sử), thêm 3 ô thông số vào Chính sách. Backfill năm của khách cho dữ liệu cũ.

## SPECIFICATIONS

### Dữ liệu

1. **`customer_years`** `(user_id PK FK users, first_paid_at timestamptz NOT NULL, source regional_share_source, source_id text)`: mốc năm 1 của khách (D-122, D-130).
   - Ghi **lần đầu** khách có giao dịch thực thu, bất kể có affiliate hay không và bất kể gói (`INSERT … ON CONFLICT DO NOTHING`).
   - Không bao giờ cập nhật về sau, trừ trường hợp backfill có mốc sớm hơn (SPEC 6).
2. **`regional_shares`**: mỗi dòng là một khoản ghi nhận. Cột:
   - `id uuid(7)`, `source regional_share_source (membership | fundraising)`, `source_id` (`membership_fee_periods.id` / `project_fundraisings.id`)
   - `customer_id`, `affiliate_id` (đại lý giới thiệu, snapshot), `affiliate_user_id`
   - `region region NULL` (NULL = vùng trống → Media Soft), `director_user_id NULL` (GĐ Vùng lúc ghi)
   - `plan commission_plan` (snapshot), `base_amount int` (phí thực thu, VND)
   - `customer_year int ≥ 1`, `percent int 0..100`, `director_amount int ≥ 0`, `media_soft_amount int ≥ 0`, CHECK `director_amount + media_soft_amount = base_amount`
   - `month_key char(7)` (tháng VN của `recorded_at`), `recorded_at timestamptz`
   - `status regional_share_status (pending | paid)`, `payout_id NULL`, `created_at`

   Ràng buộc:
   - **UQ `(source, source_id)`**: idempotent, mỗi khoản nguồn 1 dòng
   - CHECK `region IS NULL ⇔ director_user_id IS NULL ⇔ percent = 0`
   - Index `(region, status, month_key) INCLUDE (director_amount)` (KPI + phải chi); `(region, recorded_at DESC, id DESC)` (danh sách khoản keyset)
3. **`regional_payouts`**:
   - Cột: `id` (= hash idempotency như `payout.service.ts`), `region`, `director_user_id`, `month_keys text[]` (các tháng chốt), `amount int`, `count int`, `bank_snapshot jsonb` (`bankName`, `bankNo`, `bankHolder` lúc chi), `paid_by`, `paid_at`
   - Index `(region, paid_at DESC, id DESC)`
4. **`affiliate_policy`** thêm `regional_first_year int default 50 CHECK 1..100`, `regional_step int default 10 CHECK 0..100`, `regional_min int default 20 CHECK 0..100`, CHECK `regional_min ≤ regional_first_year`. **Đây là chỗ duy nhất giữ tỷ lệ** (GOAL cấm hằng số tỷ lệ trong code; mặc định chỉ ở migration / seed / test).
5. `fundraising_rate` (hoa hồng Gọi vốn 10%) **giữ nguyên** ở TIP này: hoa hồng affiliate vẫn tính để tham khảo (D-119). Gỡ khỏi UI Chính sách thuộc 803.

### Backfill (migration, chạy một lần, idempotent)

6. `customer_years` = với mỗi user, `MIN` theo thời gian của hai nguồn (D-130):
   - `membership_fee_periods.created_at` của kỳ có `amount > 0` (kỳ đã đối soát / ghi nhận thu)
   - `project_fundraisings.paid_at` của khoản `legacy = false AND amount > 0 AND paid_at IS NOT NULL AND status IN ('pending_review','active','expired')`

   Cùng mốc thì ưu tiên `membership`. Không tạo `regional_shares` cho khoản cũ: D-121 không truy thu; 3 GĐ Vùng seed được bổ nhiệm lúc seed. Seed demo sinh khoản riêng ở SPEC 22.

### Ghi sổ (consumer outbox, worker)

7. `RegionalShareEventsHandler` đăng ký trong `regional-director.processor.ts` bằng `registerWithId`:
   - `membership_fee.confirmed` → `record({ source: 'membership', sourceId: p.periodId, customerId: p.userId, baseAmount: p.listAmount, plan: p.plan, at: p.confirmedAt })`
   - `fundraising.reviewed` với `decision = 'approve'` → `record({ source: 'fundraising', sourceId: p.fundraisingId, customerId: p.ownerId, baseAmount: p.amount, plan: 'fundraising', at: p.reviewedAt })`

   Gọi vốn ghi khi Admin **duyệt**, giống hoa hồng Gọi vốn hiện hành; khoản bị từ chối không phải thực thu được giữ. Ghi Q-V46-802-1.
8. `RegionalShareLedgerService.record`, **một transaction**:
   1. Không ghi gì nếu `baseAmount ≤ 0` (CS-14, BR-463: trial / 0đ / legacy).
   2. `customer_years`: `INSERT … ON CONFLICT DO NOTHING` với `first_paid_at = at` (mọi khách, kể cả không có affiliate), rồi đọc lại `first_paid_at`.
   3. Referral: `AffiliateShareReader.referrerOf(tx, customerId)` (referral `pending | converted`, đọc qua `modules/affiliate/index.ts`). Không có, hoặc đại lý chính là khách (tự giới thiệu) → **không ghi dòng sổ** (CS-11: khách tự đăng ký là kết quả marketing của Media Soft).
      - Cookie 30 ngày và "lần giới thiệu đầu" đã áp lúc tạo `referrals` ở đăng ký (AF-R03); TIP này không kiểm lại.
   4. Vùng: `RegionalProjectionRepository.affiliateRegionAt(tx, affiliateUserId)` = miền của nhóm tỉnh tham gia **sớm nhất còn là thành viên**. Nhóm ngành lấy miền của nhóm tỉnh cha (D-128, cùng logic `counts()`, viết thành hàm dùng chung một chỗ). Không có nhóm → `region NULL`.
   5. GĐ Vùng: khoá dòng `regional_directors` của miền `FOR SHARE`.
      - Có `user_id` và `appointed_at ≤ at` → ghi cho GĐ Vùng đó (D-129: không xét tỉnh đã tick).
      - Ô trống, hoặc `appointed_at > at` → `region NULL`, 100% Media Soft (D-121: không truy thu).
   6. Năm của khách: `customerYearOf(firstPaidAt, at)` = `1 + số tròn 12 tháng` giữa hai mốc, tính theo **ngày lịch giờ VN** (đúng ngày kỷ niệm thì sang năm mới). Ví dụ mốc 15/03/2026: tới 14/03/2027 = năm 1, từ 15/03/2027 = năm 2. Mốc ngày 29/02 → kỷ niệm 28/02.
   7. Tỷ lệ: `regionalPercent(y, policy) = max(min, firstYear − step × (y − 1))`, đọc `affiliate_policy` trong cùng tx. `director_amount = Math.round(base × percent / 100)` (D-110), `media_soft_amount = base − director_amount`.
   8. `month_key = monthKey(at)` (giờ VN). `INSERT … ON CONFLICT (source, source_id) DO NOTHING`; có dòng mới thì outbox `regional_share.recorded { shareId }`. Chưa có consumer; để 804 thông báo, giữ hợp đồng.
9. **Không** sửa logic hoa hồng affiliate hiện hành (`affiliate-lifecycle.handler.ts`, `fundraising-commission.handler.ts`). Hai consumer chạy song song trên cùng sự kiện.
10. Thu hồi GĐ Vùng (801) **không** đổi dòng sổ đã ghi (GDV-R05, AT-GDV04). Dòng `pending` của người cũ vẫn được chi cho người cũ: `director_user_id` + snapshot STK lúc chi lấy từ dòng `regional_directors` hiện tại nếu người hiện tại vẫn là người đó, ngược lại lấy STK người cũ. Xem SPEC 13 + Q-V46-802-2.
11. Đổi 3 thông số Chính sách chỉ áp cho khoản ghi **sau** đó. Không tính lại khoản cũ: tỷ lệ đã chụp; khác hoa hồng AF-R08 có tính lại.

### Chi trả (§31.3)

12. `POST /v1/admin/gdv/:region/payouts`, quyền `affiliate.payout`, header `Idempotency-Key` bắt buộc (zod như `affiliatePayoutKeySchema`). Body `{ directorUserId }`: người được chi, để chi phần còn tồn của GĐ Vùng cũ.
13. Trong transaction:
    - Lấy các dòng `region = :region AND director_user_id = :directorUserId AND status = 'pending' AND month_key < monthKey(now)` `FOR UPDATE`. Chỉ chi tháng đã kết thúc, như `payout.service.ts`. Prototype gom cả tháng hiện tại; xem Q-V46-802-3.
    - Không còn dòng → 409 "Không có khoản chờ chi".
    - STK: người được chi là GĐ Vùng hiện tại → STK ô vùng. Người cũ → STK của bản chi trả gần nhất cho người đó. Không có STK → 409 "{tên} chưa cập nhật tài khoản nhận".
    - `UPDATE regional_shares SET status = 'paid', payout_id = $id WHERE id = ANY($ids) AND status = 'pending'`, số dòng phải bằng số đã khoá.
    - Tạo `regional_payouts` (`month_keys`, `amount` = tổng `director_amount`, `count`, `bank_snapshot`).
    - Audit `regional_share.payout` (`summary`: "Chi trả {số}đ cho GĐ Vùng {tên} · {các tháng}"; `diff` không chứa số TK đầy đủ, chỉ 4 số cuối).
    - Outbox `regional_share.payout_recorded { payoutId, region, directorUserId }`. Consumer: thông báo `type: 'affiliate'` cho GĐ Vùng "Media Soft đã chi trả {số}đ phần GĐ Vùng {vùng} · {các tháng}" (mẫu `affiliate.payout_recorded` hiện có).
    - Gọi lại cùng key → trả biên lai cũ (`IdempotencyService.run` + `regional_payouts.id`).

### API đọc (`/v1/admin/gdv/shares`, `affiliate.view`)

14. `GET /admin/gdv/shares?q=`, một payload:
    - `kpi`:
      - `total`: tổng `director_amount` mọi dòng có vùng
      - `count`, `affiliates`: số khoản / số đại lý khác nhau
      - `due`: tổng `pending` tháng đã qua
      - `paid`: tổng đã chi
      - `payoutDate`: ngày cuối tháng hiện tại, giờ VN
    - `rule`: `[{ year:1, percent }, {year:2}, {year:3}]` + `min`, tính từ chính sách hiện hành. Câu prototype "50% năm 1 · 40% năm 2 · 30% năm 3 · 20% từ năm 4".
    - `rows`: 3 ô theo thứ tự vùng, mỗi ô gồm:
      - GĐ Vùng hiện tại (tên, email, nhãn vùng · số tỉnh), STK (chủ TK / ngân hàng · số TK; trống → "Chưa cập nhật")
      - `affiliates` (số đại lý khác nhau trong sổ của vùng), `count`, `total`, `paid`, `due` (pending tháng đã qua), `pendingCurrent` (pending tháng hiện tại, hiển thị "Chờ chi cuối tháng")
      - `payees`: GĐ Vùng hiện tại + người cũ còn khoản `pending` của tháng đã qua, để hiện nút Chi trả cho từng người

    Lọc `q` theo tên GĐ Vùng hoặc nhãn vùng, không dấu, phía server. Tổng hợp bằng **một** query `GROUP BY region, director_user_id, status, (month_key < $cur)` trên index SPEC 2.
15. `GET /admin/gdv/:region/shares?cursor=&limit=8`: khoản của vùng, mới nhất trước, keyset `(recorded_at, id)`, deferred join lấy tên khách / tên đại lý qua projection (`reporting/regional`). Mỗi khoản:
    - Ngày (`dd/MM/yyyy` giờ VN), thành viên, đại lý, gói
    - Phí thực thu, tỷ lệ "`{percent}% · Năm {year}`", phần GĐV
    - Trạng thái: "Đã chi trả" / "Chờ chi cuối tháng"

    Kèm `more` = số khoản còn lại ("+ N khoản khác").
16. `GET /admin/gdv/:region/payouts`: lịch sử chi trả của vùng, mới nhất trước (tháng "Tháng MM/YYYY", ngày chi, số tiền, người nhận). Không trả số TK đầy đủ.
17. Policy: `GET /admin/affiliate/policy` và `PUT` (đã có) thêm 3 trường mới; `affiliatePolicySchema` dùng `.default(50 / 10 / 20)` để FE / MSW cũ không vỡ. `PUT` kiểm `min ≤ firstYear`, ngược lại 422 `fields.regionalMin`.

### Admin UI (prototype thắng)

18. Tab **GĐ Vùng** (`?tab=gdv`) thay `regional-list.tsx` hiện tại (đang chỉ 3 dòng):
    - 3 thẻ KPI: "Tổng phần GĐ Vùng" ({total} · "{count} khoản từ {affiliates} affiliate"), "Phải chi cuối tháng" ({due} · "Kỳ chi {dd/MM/yyyy}"), "Đã chi trả" ({paid} · "Lũy kế 3 GĐ Vùng")
    - Ô tìm "Tìm GĐ Vùng hoặc vùng..." + câu quy tắc đúng prototype (`Phần GĐ Vùng theo quy tắc {rule} · chỉ tính trên phí thực thu…· kỳ chi {ngày}`)
    - Bảng cột: GĐ Vùng · Tài khoản nhận · Affiliate · Số khoản · Tổng ghi nhận · Đã chi trả · Phải chi tháng này · (thao tác)
    - Nút **Chi trả** khi `due > 0` và có `affiliate.payout`, không thì "Không có khoản chờ"
    - Bấm tên → mở dòng (▸ / ▾): "Khoản ghi nhận cho GĐ Vùng" (8 khoản, cột Ngày · Thành viên · Affiliate · Phí thực thu · Tỷ lệ GĐ Vùng · Phần GĐV · Trạng thái, "+ N khoản khác" tải thêm keyset) + "Lịch sử chi trả"
    - Chi trả qua `regional-payout-dialog.tsx` (`Modal.confirm`): số tiền, các tháng, STK; toast "Đã chi trả {số} cho GĐ Vùng {tên} · {chủ TK}"
    - Kế toán có `affiliate.payout` → thấy nút. Thiếu quyền → ẩn nút; server vẫn 403.
19. Chính sách (`policy-fields.tsx`): thêm khối "Quy tắc chia sẻ Media Soft ↔ GĐ Vùng" với 3 ô số `GĐ Vùng năm 1 (%)`, `Giảm mỗi năm (%)`, `Mức tối thiểu (chi phí vận hành) (%)`, cùng câu mô tả prototype. Lưu bằng nút Lưu sẵn có của form. Bảng "phần GĐV theo từng gói năm 1 → từ năm 4" và các phần khác của §31 thuộc 803.
20. Thanh tab: số cạnh "GĐ Vùng" = số ô có người (prototype `VGL.length`); "Thu nhập ròng" ở đầu trang (`net`) **không đổi** ở TIP này (803).
21. MSW (`mock-data/domains/regional-shares.ts`): cùng hàm thuần `packages/shared/src/membership/regional-share.ts`. Khi MSW ghi nhận phí / duyệt Gọi vốn (handler hiện có trong `mock-data`), gọi `recordShare` để màn MSW và server cùng hành vi. Chi trả MSW kiểm `Idempotency-Key`.

### Seed demo

22. `seed/demo/regional-shares.ts`: sinh sổ **qua chính hàm thuần** từ các kỳ phí / Gọi vốn đã có trong seed của khách có referral, ghi như thể đối soát sau ngày bổ nhiệm, để tab có số thật theo dữ liệu seed.
    - Gồm đủ năm 1 / 2 / 3 / ≥ 4 (đặt `customer_years.first_paid_at` lùi cho vài khách, như prototype `yr`).
    - Có ít nhất 1 khoản `paid` tháng trước (có `regional_payouts`), 1 khoản `pending` tháng trước, 1 khoản tháng này.
    - Không dữ liệu giả ngoài seed. Chạy seed 2 lần vẫn cùng kết quả (id cố định / UQ).

### Validation

- `region`: `regionalRegionSchema` (801). `directorUserId`: chuỗi không rỗng. `Idempotency-Key`: như `affiliatePayoutKeySchema`. `cursor`: opaque base64url `(recordedAt, id)`, `limit` 1..50 (mặc định 8). `q` ≤ 100.
- Chính sách: 3 số nguyên, `regionalFirstYear` 1..100, `regionalStep` 0..100, `regionalMin` 0..100, `min ≤ firstYear`.

### Error Handling

| Trường hợp | HTTP / kết quả |
|---|---|
| Consumer chạy lại cùng sự kiện | không ghi thêm (UQ), không lỗi |
| `baseAmount ≤ 0` / không referral / tự giới thiệu | bỏ qua, chỉ ghi `customer_years` khi `> 0` |
| Ô vùng trống / bổ nhiệm sau giao dịch | dòng `region NULL`, 100% Media Soft |
| Chi trả thiếu quyền | 403 `VIEW_ONLY` / `FORBIDDEN` |
| Thiếu `Idempotency-Key` | 422 |
| Không còn khoản tháng đã qua | 409 "Không có khoản chờ chi" |
| Thiếu STK | 409 "{tên} chưa cập nhật tài khoản nhận" |
| Hai Admin chi cùng lúc | đúng 1 thành công, người kia 409 hoặc nhận biên lai cùng key |
| Chính sách `min > firstYear` | 422 `fields.regionalMin` |

## ACCEPTANCE CRITERIA

- **Tỷ lệ theo năm** Given chính sách 50 / 10 / 20, khách qua link của đại lý thuộc nhóm Hà Nội (Miền Bắc), GĐ Vùng Bắc bổ nhiệm trước đó, phí Cá nhân 1.200.000 When đối soát ở năm 1 / 2 / 3 / 4 / 7 của khách Then `percent` = 50 / 40 / 30 / 20 / 20, `director_amount` = 600.000 / 480.000 / 360.000 / 240.000 / 240.000, `director + media_soft = base`.
  Test: unit `regional-share.spec.ts` › `percent by customer year`; int `share-ledger.int.spec.ts` › `year 1..4+`.
- **Làm tròn** Given base 1.234.567, percent 30 Then director 370.370, media soft 864.197 (unit `rounding to dong`).
- **Ranh giới năm** Given mốc 15/03/2026 07:00 VN When ghi 14/03/2027 23:59 VN Then năm 1; 15/03/2027 00:00 VN Then năm 2; mốc 29/02/2028 → kỷ niệm 28/02/2029 (unit `customer year boundaries`).
- **Gọi vốn tính chung năm (D-130)** Given khách trả Gọi vốn 15/01/2026 rồi phí thành viên 20/02/2027 Then khoản phí thành viên ở năm 2 (int `share-ledger` › `fundraising starts customer year`).
- **Không ghi** Given trial (không có sự kiện) / `listAmount = 0` / Gọi vốn legacy / Gọi vốn bị từ chối / khách không qua link / đại lý tự giới thiệu Then không có dòng `regional_shares`; khoản `> 0` vẫn tạo `customer_years` (int `share-ledger` › `skips`).
- **Vùng trống / bổ nhiệm sau (D-121)** Given ô Nam trống When khách của đại lý miền Nam đối soát Then dòng `region NULL`, `media_soft_amount = base`. Given bổ nhiệm sau `at` Then cũng vậy, khoản cũ không đổi khi bổ nhiệm (int `share-ledger` › `vacant and late appointment`).
- **D-128** Given đại lý vào nhóm Đà Nẵng (Trung) ngày 1, nhóm Hà Nội ngày 5 Then khoản ghi Miền Trung. When rời nhóm Đà Nẵng, khoản mới ghi Miền Bắc, khoản cũ giữ Miền Trung. Đại lý chỉ ở nhóm ngành con của Cần Thơ → Miền Nam (int `share-ledger` › `affiliate region earliest group`).
- **D-129** Given GĐ Vùng Bắc bỏ tick Lào Cai When khách của đại lý nhóm Lào Cai đối soát Then vẫn ghi cho GĐ Vùng Bắc (int `share-ledger` › `unticked province`).
- **Idempotent** Given cùng sự kiện `membership_fee.confirmed` relay 2 lần, hoặc 2 worker song song Then đúng 1 dòng (int `share-ledger` › `idempotent`).
- **AT-GDV04** Given GĐ Vùng A có 2 khoản `pending` tháng 10, bị thu hồi 15/11, B được bổ nhiệm When Admin chi trả ngày 01/12 Then:
  - `payees` có A và B
  - Chi cho A: đúng 2 khoản tháng 10, STK của A, `regional_payouts` ghi `director_user_id = A`
  - Khoản sau 15/11 thuộc B

  Test: int `share-payout.int.spec.ts` › `AT-GDV04 pending shares survive revoke`.
- **Chi trả** Given vùng có khoản `pending` tháng trước + tháng này When POST payouts với key K Then:
  - chỉ khoản tháng trước thành `paid`; tháng này vẫn "Chờ chi cuối tháng"
  - audit có tổng tiền, không có số TK đầy đủ; outbox + thông báo GĐ Vùng
  - gọi lại key K → cùng biên lai, không thêm dòng
  - 2 request song song key khác nhau → 1 thành công, 1 nhận 409

  Test: int `share-payout` › `pays closed months only`, `idempotency`, `concurrency`.
- **Quyền** Given Kế toán Then xem được tab + chi trả được. Given Giảng viên / Biên tập (không `affiliate.view`) Then 403 ở cả 4 route. Given Quản trị viên (không `affiliate.payout`) Then xem được, POST payouts 403 (int `share-permissions.int.spec.ts`).
- **Backfill** Given DB có kỳ phí và Gọi vốn cũ When chạy migration Then `customer_years.first_paid_at` = min hai nguồn; khoản 0đ / legacy bị bỏ; chạy lại không đổi (int `share-backfill.int.spec.ts`, chạy SQL backfill trên DB test).
- **Chính sách** Given Admin đổi 50 / 10 / 20 → 60 / 15 / 25 Then audit `affiliate.policy_update` có diff; khoản ghi sau đó dùng tỷ lệ mới, khoản cũ giữ. `min > firstYear` → 422 (int `share-ledger` › `policy change not retroactive`).
- **UI** (e2e `admin-regional-shares.spec.ts`, MSW + server):
  - KPI khớp tổng API
  - mở dòng thấy 8 khoản + "+ N khoản khác" (bấm tải thêm)
  - lịch sử chi trả
  - Chi trả → toast đúng câu, KPI "Phải chi" giảm
  - tìm "nam" lọc còn Miền Nam
  - Kế toán thấy nút; Quản trị viên không thấy nút
- **Parity ≤ 3% (1440 + 390)**:
  - `D-120-GDV` (tab GĐ Vùng mặc định), `D-120-GDV-OPEN` (mở dòng Miền Bắc)
  - `D-84-POL` (đo lại phần 3 ô mới; phần §31 còn lại → 803, ghi số đo, không tính PASS nếu lệch vì 803)
- **EXPLAIN (ANALYZE, BUFFERS)** trên ≥ 10k `regional_shares` + ≥ 10k affiliates / group_members:
  - KPI / tổng theo vùng (Index Only Scan trên index INCLUDE)
  - danh sách khoản keyset 8 dòng
  - `affiliateRegionAt` (lateral earliest-group)
  - chọn khoản chi trả `FOR UPDATE`

  Không Seq Scan bảng lớn. Dán vào completion report.

## CONSTRAINTS

- DO NOT:
  - hằng số 50 / 10 / 20 hay tỷ lệ trong code chạy (chỉ migration default / seed / test)
  - chi trả trực tiếp cho affiliate, sửa luồng chi trả hoa hồng hiện tại (803 mới đổi)
  - tính lại khoản đã ghi khi đổi chính sách / đổi vùng / thu hồi
  - Admin gán tay vùng cho affiliate hay khoản (D-121)
  - dùng `regional_director_provinces` để quyết định người nhận (D-129)
  - query trong vòng lặp (gom KPI một query; danh sách deferred join)
  - đọc bảng của domain khác ngoài projection `reporting/regional` hoặc `modules/<x>/index.ts`
  - log / audit số TK đầy đủ
  - `any`, `@ts-ignore`, `console.*`
  - nới parity, mask, retries, timeout, `onServer` làm yếu assertion
- REUSE:
  - `monthKey` (affiliate), làm tròn `Math.round` như `commissionAmount`
  - `IdempotencyService.run` + mẫu biên lai `payout.service.ts`
  - `AuditService`, `OutboxService`, `registerWithId`, `NotificationService.notify`
  - `RegionalProjectionRepository` (mở rộng)
  - `affiliatePayoutKeySchema`, `regionalRegionSchema`, `REGIONAL_LABELS`
  - `@opchub/ui` (Modal confirm, toast, skeleton)
- SKIP:
  - Chính sách §31 đầy đủ, Hoa hồng chỉ tham khảo, bỏ chi trả affiliate, cột "Thuộc vùng (theo tỉnh)", "Thu nhập ròng" (803)
  - Portal "Vùng của tôi" + banner + thông báo khi có khoản mới (804)
  - BR-463 ẩn khoản hoa hồng 0đ cũ (807)
  - CSV xuất sổ (807 nếu đặc tả yêu cầu)
  - Hoàn / huỷ giao dịch đã đối soát: code hiện không có đường huỷ, nên không làm đảo khoản sổ; ghi Q-V46-802-4

## Câu hỏi ghi sẵn (`reports/ui-parity/questions.md` › V4.6, chọn phương án an toàn, không chặn)

- **Q-V46-802-1**: Gọi vốn ghi sổ lúc Admin **duyệt**, không lúc đối soát CK (giống hoa hồng Gọi vốn; khoản bị từ chối không sinh chia sẻ).
- **Q-V46-802-2**: Khoản `pending` của GĐ Vùng đã thu hồi được chi cho chính người đó với STK của họ (GDV-R05). STK người cũ: lấy từ bản chi trả gần nhất hoặc ô vùng lúc thu hồi. Nếu không có → chặn, Admin cập nhật thủ công ở lần sau (ghi completion report).
- **Q-V46-802-3**: Chi trả chỉ gom tháng đã kết thúc (giống chi trả hoa hồng, đúng "cuối tháng"). Prototype cho chi cả tháng hiện tại.
- **Q-V46-802-4**: Không có đường huỷ giao dịch đã đối soát nên không có bút toán đảo. "Giao dịch hủy khi đối soát" (CS-14) = giao dịch chưa từng kích hoạt phí, vốn không sinh sự kiện.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-802-gdv-revenue-share`; chỉ sửa file trong **Files touched** (thêm file ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi `migrate deploy` (xem CONTEXT); migration `--create-only` rồi sửa SQL; deploy sạch trên DB dev + test đã chốt; `prisma generate`
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt so với `dev` (ghi số `dev` đo cùng máy để so); e2e server cho `admin-regional-shares.spec.ts`
- [ ] Parity ≤ 3% cả 1440 + 390 cho `D-120-GDV`, `D-120-GDV-OPEN`; `screens.md` cập nhật; không mask / nới
- [ ] EXPLAIN 4 query mới, không Seq Scan bảng lớn
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **(3) / luật 8**: ghi sổ + `customer_years` + outbox **một transaction**; chi trả: khoá dòng, `UPDATE … WHERE status = 'pending'` đủ số dòng, audit + outbox cùng tx
  - **(4) / luật 10**: chi trả và đổi chính sách ghi `audit_logs`
  - **(5) / luật 5**: index "bằng trước, khoảng / sort sau", keyset + deferred join, không N+1
  - **Luật 9**: tiền số nguyên VND, `month_key` / năm của khách theo giờ VN
- [ ] D-119: không chi trả trực tiếp affiliate; D-121: không gán tay; D-129: tỉnh tick không quyết định tiền
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] Glossary thêm: sổ chia sẻ (`RegionalShare`, `regional_shares`), năm của khách (`CustomerYear`, `customer_years`), kỳ chi / chi trả GĐ Vùng (`RegionalPayout`), 3 thông số Chính sách
- [ ] Ghi Q-V46-802-1 → 4; cập nhật `V4.6-progress.md` dòng #2
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`; completion report có **git commit SHA**, PR, số test thật, parity từng màn, EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ; ghi trung thực PARTIAL như 801

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority, depends 801, estimate XL, REQ / D)
- [x] Context: DB đích (bài học 801), § đặc tả, dòng prototype, file đọc trước, mẫu consumer / chi trả
- [x] Task rõ phạm vi + SKIP sang 803 / 804 / 807
- [x] Business rules đánh số 1 → 22, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: tỷ lệ năm 1 → 4+, làm tròn, ranh giới năm, D-121 / D-128 / D-129 / D-130, idempotent, AT-GDV04, chi trả, quyền, backfill, chính sách, UI, parity, EXPLAIN
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 803 / 804 / 807
- [x] BUILDER-CHECKLIST trích luật 3 / 4 / 5 / 8 / 9 / 10 của BUILDER-HANDOFF liên quan sổ + chi trả
- ⚠️ Gap:
  - DB đích chưa chốt (801 dùng DB riêng): builder phải hỏi owner trước migrate.
  - 801 còn gate đỏ trên `dev` (e2e 13 fail, parity D-120-GCFG / D-84*): 802 phải đo baseline `dev` trước để tách lỗi cũ / mới.
  - Q-V46-802-1 → 4 là phương án an toàn tự chọn, cần owner xác nhận khi review.
