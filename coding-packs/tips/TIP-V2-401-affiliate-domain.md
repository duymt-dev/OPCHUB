# TIP-V2-401: Affiliate — domain, schema, outbox phí → đại lý + hoa hồng (AF-R01, R05, R06, R07)

## HEADER
- TIP-ID: TIP-V2-401 · Project: OPCHUB · Module: affiliate (mới) · Priority: P0 · Depends on: TIP-V2-101 (outbox tin cậy), TIP-V2-301 (job phí 08:00 + guard `valid_until`, D-57) · Estimated: L (12h)
- **Files touched:**
  - `packages/db/prisma/schema/affiliate.prisma` (create): `Affiliate`, `Referral`, `Commission`, `AffiliatePolicy`, `AffiliateClickDaily`, enum `AffiliateStatus`, `ReferralStatus`, `CommissionStatus`
  - `packages/db/prisma/schema/account.prisma` (modify — chỉ thêm dòng back-relation trong `model User`: `affiliate`, `referral`, `commissionsReferred`)
  - `packages/db/prisma/schema/membership-fee.prisma` (modify — chỉ thêm back-relation `commission Commission?` trong `MembershipFeePeriod`)
  - `packages/db/prisma/migrations/<ts>_affiliate/migration.sql` — **migration do agent chính tạo, `--create-only` + review SQL** (CHECK, partial index, seed dòng `affiliate_policy`)
  - `packages/db/seed/required.ts` (modify: upsert `affiliate_policy` id=1) · `packages/db/seed/demo/affiliate.ts` (create) · `packages/db/seed/demo/index.ts` (modify: gọi `seedAffiliates`) · `packages/db/seed/demo/reset.ts` (modify: xoá bảng affiliate)
  - `packages/shared/src/outbox/events.ts` (modify — chỉ thêm: `membership_fee.confirmed`, `affiliate.commission_recorded`)
  - `packages/shared/src/api-domains/settings.ts` (modify: `NOTIFICATION_TYPES` thêm `'affiliate'`)
  - `apps/server/src/modules/affiliate/` (create): `domain/{affiliate.state,referral.state,commission.state,affiliate-code,commission-amount,month-key}.ts` + `*.spec.ts` cạnh từng file, `repositories/{affiliate,referral,commission,policy}.repository.ts`, `services/{affiliate-lifecycle,affiliate-notify}.handler.ts`, `services/affiliate-backfill.service.ts`, `affiliate-core.module.ts`, `index.ts`
  - `apps/server/src/modules/membership-fee/services/membership-fee.service.ts` (modify: `activate()` ghi thêm outbox `membership_fee.confirmed` cùng tx; `addPeriod` trả id kỳ)
  - `apps/server/src/modules/membership-fee/repositories/payment-transaction.repository.ts` (modify: `addPeriod` trả `{ id }`)
  - `apps/server/src/worker/processors/affiliate.processor.ts` (create) · `apps/server/src/worker/worker-app.module.ts` (modify: import `AffiliateCoreModule` + `AffiliateProcessor`)
  - `apps/server/test/affiliate/{lifecycle,commission,pause}.int.spec.ts` (create) · `apps/server/test/factories/affiliate.factory.ts` (create)
- **Parallel-safe with:** TIP-V2-501/502. `sequential, shares membership-fee.service.ts + outbox/events.ts with TIP-V2-101/108/301` (làm sau P1–P3). 402/403/404 chờ TIP này.
- **Phase / nhánh:** V2-P4, `feature/V2-P4-affiliate`

## CONTEXT
- Đặc tả §20.1 (AF-R01…R10), §20.2–20.3 (AF-01, AF-02), §20.5 máy trạng thái, §20.7 dữ liệu, §19.12; D-53 (tiền nguyên, `month_key` giờ VN), D-54 (không hoàn phí → không có nhánh huỷ do hoàn phí), D-57.
- Điểm kích hoạt phí duy nhất: `MembershipFeeService.activate()` — được gọi bởi `ReconcileService.match` (webhook/poll), `AdminFeesService.collect` (ghi nhận đơn lẻ + hàng loạt), `FeeTransactionsService.match` (khớp tay). Hook vào đây là phủ đủ 3 đường của AF-R01.
- Hết hạn: `FeeSchedulerService.sweep` ghi `membership_fee.changed` (status `expired`). Gia hạn: `membership_fee.activated`.
- Mẫu consumer: `worker/processors/fee.processor.ts`, `notification.processor.ts`; `OutboxRelayService.register` cho phép nhiều handler cùng loại. Mẫu thông báo: `NotificationService.notify` (export từ `@/modules/notification`).
- Prototype `mkCode`: họ tên bỏ dấu → từ cuối (≤6 ký tự) + `OPC` + 2 số (VD `ANOPC42`); mặc định `rate:20, cookie:30`.

## APPLICABLE STANDARDS
[nestjs-modules](../standards/backend/nestjs-modules.md) (outbox, ranh giới) · [queues-workers](../standards/backend/queues-workers.md) · [prisma-migrations](../standards/database/prisma-migrations.md) · [query-indexing](../standards/database/query-indexing.md) · [testing](../standards/testing/testing.md) · [domain-glossary](../standards/global/domain-glossary.md)

## TASK
Tạo module `affiliate` (domain + repository + consumer outbox) và schema 5 bảng. Khi phí thành viên được xác nhận (mọi đường) → tự tạo đại lý; nếu là lần đóng phí đầu tiên của người có referral → ghi hoa hồng Đã ghi nhận + thông báo đại lý; phí hết hạn / gia hạn → đại lý Tạm dừng / Hoạt động.

## SPECIFICATIONS
### Business Rules
1. **Sự kiện mới** `membership_fee.confirmed` `{ userId, periodId, listAmount, confirmedAt, isFirst }` ghi trong `activate()` CÙNG transaction với kỳ phí (luật 8). `isFirst` = user chưa có kỳ nào trước kỳ vừa thêm (đếm trong tx sau `lockForUpdate`). `listAmount` = `membership_fees.amount` (600.000), không phải số tiền chuyển.
2. **AF-R01** consumer `AffiliateLifecycleHandler.onFeeConfirmed`: `INSERT … ON CONFLICT (user_id) DO NOTHING` đại lý `status=active`, `rate = policy.default_rate`, `code` sinh theo `affiliate-code.ts` (bỏ dấu, `đ→d`, in hoa, từ cuối ≤6 + `OPC` + 2 số 10–99; trùng → thử hậu tố khác tối đa 20 lần rồi thêm số thứ 3). Đã có đại lý `paused` → chuyển `active` có điều kiện (AF-R07). Không có API tạo đại lý thủ công. Nhà đầu tư không đóng phí → không thành đại lý (D-14).
3. **AF-R05/R06** cùng handler, một transaction: tìm `referral` `pending` của `userId`; không có → dừng. `isFirst=false` → không làm gì (AT-AF04). Đại lý tạm dừng tại `confirmedAt` (status `paused` HOẶC phí đại lý `valid_until < confirmedAt` — guard tức thời D-57) → referral `pending → void` (WHERE status='pending'), không hoa hồng. Ngược lại: referral `pending → converted` + `converted_at`, `INSERT commission … ON CONFLICT (referred_user_id) DO NOTHING` với `amount = floor(listAmount × rate / 100)` (D-53, `commission-amount.ts`, số nguyên), `rate` chụp lại, `status=recorded`, `month_key = YYYY-MM theo Asia/Ho_Chi_Minh của confirmedAt` (`month-key.ts`), `fee_period_id = periodId`; ghi outbox `affiliate.commission_recorded { commissionId }` cùng tx.
4. **Thông báo** `AffiliateNotifyHandler.recorded`: 1 query đọc commission + tên khách + đại lý → `notify` type `affiliate`, tiêu đề "Hoa hồng mới: <tên> đã đóng phí thành viên", body "Khoản hoa hồng <x>đ đã được ghi nhận cho mã <MÃ> · chi trả cuối tháng.", link `/affiliate` (copy prototype).
5. **AF-R07** `onFeeChanged` (`membership_fee.changed|activated`): status `expired` → `active → paused` (WHERE status='active'); `active|expiring` → `paused → active`. Không đụng hoa hồng đã ghi nhận (vẫn chi được, AT-AF05).
6. **Transition** chỉ qua hàm trong `domain/*.state.ts` (`canTransition`) + UPDATE có điều kiện `WHERE status = <from>` (luật 7). Commission: `recorded → paid | cancelled`; Referral: `pending → converted | void`; Affiliate: `active ↔ paused`.
7. **Backfill** go-live: `AffiliateBackfillService.ensureForPaidMembers()` chạy lúc worker khởi động (idempotent, lô 500, một `INSERT … SELECT … ON CONFLICT DO NOTHING` cho user có ít nhất một kỳ phí và chưa là đại lý; code sinh ở app theo lô), status theo phí hiện hành.
8. Handler idempotent: chạy lại cùng sự kiện không tạo bản ghi thứ hai (UQ + điều kiện trạng thái).

### Data (affiliate.prisma — tiền Int, thời gian Timestamptz)
- `affiliates`: id, user_id **UQ** FK users, code **UQ** (citext hoặc lưu in hoa), rate Int (CHECK 1–50), status, bank_name, bank_no, bank_holder (nullable), created_at, updated_at. Index `(status, created_at DESC)`.
- `referrals`: id, affiliate_id FK, affiliate_code (snapshot), referred_user_id **UQ** FK, status, month_key char(7), created_at, converted_at. Index `(affiliate_id, month_key, created_at DESC)`.
- `commissions`: id, affiliate_id, referred_user_id **UQ**, fee_period_id UQ FK, amount Int, rate Int, status, month_key, paid_at, paid_by, paid_bank_snapshot Json, cancel_reason, cancelled_at, cancelled_by, created_at. Index `(affiliate_id, month_key, status) INCLUDE (amount)` (đối soát/chi trả), `(status, created_at DESC, id DESC)` (Admin list keyset/deferred join). CHECK `status <> 'cancelled' OR cancel_reason IS NOT NULL`.
- `affiliate_policy`: id=1 (CHECK id=1), default_rate Int (CHECK 1–50, mặc định 20), cookie_days Int (CHECK 1–365, mặc định 30), terms text, updated_at.
- `affiliate_clicks_daily`: (affiliate_id, day date) PK, count Int — phục vụ "Lượt nhấp link 30 ngày" (ghi ở TIP-V2-402).
- Migration do agent chính tạo (`--create-only` + review SQL: CHECK, INCLUDE, seed policy).

### Error Handling
- Handler ném lỗi → relay thử lại (TIP-V2-101); lỗi nghiệp vụ "không áp dụng" (không referral, không lần đầu) là `return`, không ném.

## ACCEPTANCE CRITERIA
- Given TV chưa đại lý, When webhook khớp phí lần đầu / Admin ghi nhận đơn lẻ / hàng loạt / khớp tay, Then có đúng 1 `affiliates` active, code dạng `^[A-Z]{1,6}OPC\d{2,3}$`, rate = policy (AT-AF01, AF-R01).
- Given B có referral pending tới đại lý A rate 20, When phí lần đầu của B xác nhận, Then 1 commission recorded amount 120000, month_key giờ VN, A có 1 thông báo `affiliate` (AT-AF02, AF-R06).
- Given B đã có commission, When B gia hạn năm 2, Then số commission của B vẫn 1 (AT-AF04, AF-R05).
- Given A hết hạn (sweep → expired), Then A `paused`; B đóng phí lúc này → referral `void`, không commission; A gia hạn → `active` (AT-AF05, AF-R07).
- Phí xác nhận lúc 23:30 30/09 giờ VN (16:30Z) → month_key `2026-09`; 00:30 01/10 VN → `2026-10` (D-53).
- Relay gọi lại cùng sự kiện 2 lần → không trùng đại lý/hoa hồng/thông báo (idempotent).

## TESTS BẮT BUỘC
- Unit: `domain/affiliate-code.spec.ts` (`REQ-301 sinh mã từ tên có dấu`), `commission-amount.spec.ts` (`D-53 làm tròn xuống đồng`), `month-key.spec.ts` (`D-53 month_key giờ VN`), `*.state.spec.ts` (transition hợp lệ/không hợp lệ).
- Int: `apps/server/test/affiliate/lifecycle.int.spec.ts` (`AT-AF01 REQ-301 webhook|collect|bulk|match → đại lý`), `commission.int.spec.ts` (`AT-AF02 REQ-306`, `AT-AF04 REQ-305 gia hạn không sinh`, `idempotent`), `pause.int.spec.ts` (`AT-AF05 REQ-307 tạm dừng/void/hoạt động lại`, `REQ-307 guard valid_until trước khi sweep`).
- Test âm (D-63): rate ngoài 1–50 bị CHECK chặn; commission thứ 2 cho cùng referred_user bị UQ chặn.

## CONSTRAINTS
- DO NOT: query trong vòng lặp (backfill/thông báo theo lô); đọc bảng `membership_fees` trực tiếp từ module affiliate ngoài 1 query guard trạng thái đại lý qua cổng `FEE_READER` (đã có ở `account/ports.ts`) — nếu cần đọc hàng loạt, thêm hàm vào cổng; float cho tiền; tạo API/UI trong TIP này.
- REUSE: `OutboxService.add` (common/outbox), `NotificationService`, `PrismaService`, mẫu `membership-fee.state.ts`.
- SKIP: API, màn hình, referral lúc đăng ký (TIP-V2-402), chi trả/huỷ (TIP-V2-402).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 7 (transition có điều kiện), luật 8 (outbox cùng transaction), luật 9 (tiền nguyên VND, `timestamptz` UTC, month theo VN), luật 1 (file ≤ 400 dòng BE tối ưu).
- [ ] Shared file chỉ thêm dòng (`outbox/events.ts`, `settings.ts`, `worker-app.module.ts`), giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; int test chạy trên DB test.
- [ ] `git commit -- <paths>` (không `-A`), `git status --short` sạch, báo `TIP-V2-401-DONE <sha>` + số test thật; report `coding-packs/reports/TIP-V2-401-completion.md`.
