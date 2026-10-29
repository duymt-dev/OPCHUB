# TIP-V42-702: Miễn phí 3 tháng (trial) + một cổng quyền dùng chung

## HEADER
- TIP-ID: TIP-V42-702
- Project: OPCHUB
- Module: membership-fee, common/auth, account (đăng ký), local-business / onboarding / reporting (đọc phí), worker, Portal membership + dashboard, Admin fees (nhãn), MSW
- Priority: P0
- Depends on: TIP-V42-701 (nhánh chưa merge → xếp chồng)
- Estimated: L
- REQ / D: REQ-601, D-94 (1A, 2A), D-113 (nhắc T-7 / T-0 trước khi hết trial), D-116, BR-TRIAL-01 → 05, V-11
- **Files touched:**
  - DB: `packages/db/prisma/schema/membership-fee.prisma` (enum `trial`), migration `2026102800xxxx_v42_trial` (create)
  - Shared: `packages/shared/src/enums.ts`, `packages/shared/src/membership/fee-access.ts` (create: `USABLE_FEE_STATUS`, `isFeeUsable`, `effectiveFeeStatus`, `TRIAL_DAYS`) + `.spec.ts`, `membership/plans.ts` (bỏ `LEGACY_ANNUAL_FEE` khỏi giá đang bán), `index.ts`
  - Server: `common/auth/fee-access.ts` (dùng bản shared), `auth-state.service.ts` (`isFeeActive` → bỏ), `membership-fee/domain/membership-fee.state.ts`, `membership-fee/services/fee-writer.service.ts`, `membership-fee/repositories/{membership-fee,fee-reminder}.repository.ts`, `membership-fee/domain/fee-reminder.ts`, `mail/templates-fee.ts` (câu nhắc trial), `local-business/repositories/store-explore.repository.ts`, `onboarding/repositories/onboarding.repository.ts`, `account/repositories/admin-member-filter.sql.ts`, `membership-fee/services/admin-fees.service.ts` + repository (nhãn + đếm trial), `reporting/stats-daily.service.ts`, `affiliate/services/me-affiliate.service.ts` (chỉ đổi sang `isFeeUsable`)
  - Portal: `features/membership/model.ts` + spec, `components/{paywall-gate,plan-badge}.tsx`, `features/profile/components/billing-tab.tsx`, `messages/*/membership.json` (thêm khoá)
  - Admin: `features/fees/{model,types}.ts` (tone + nhãn trial)
  - MSW: `packages/shared/src/mock-data/{auth.ts,domains/fees-admin.ts}`
  - Test: `apps/server/test/membership-fee/trial.int.spec.ts` (create), factory `user.factory.ts` (fee `trial`), unit spec
- **Parallel-safe with:** sequential — chồng trên 701; 703 đọc cùng `plans.ts`.

## CONTEXT
- Đặc tả §29.6 BR-TRIAL-01 → 05; prototype `fst()` (trial = until > now, nhãn "Miễn phí 3 tháng"), `svMustT` "Hết 3 tháng miễn phí · nâng cấp để tiếp tục".
- Vision §5 vòng đời phí, V-11.

## APPLICABLE STANDARDS
- [backend/auth-rbac](../standards/backend/auth-rbac.md) — `isFeeUsable` duy nhất
- [database/query-indexing](../standards/database/query-indexing.md) — partial index thêm `trial`
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) — outbox khi đổi trạng thái
- [global/domain-glossary](../standards/global/domain-glossary.md)

## SPECIFICATIONS
1. `MembershipFeeStatus` thêm `trial`. Đăng ký (cùng transaction tạo user): fee `{status: trial, validUntil: now + 90 ngày}` theo gói loại TK. NĐT không có phí (giữ).
2. `isFeeUsable(fee, now)` ở `packages/shared` = status ∈ {trial, active, expiring} và `validUntil > now`. Server (guard REST, chat, socket, upload), SQL lọc (Khám phá gian hàng, onboarding, lọc Admin, thống kê) dùng tập `USABLE_FEE_STATUS` do shared công bố.
3. Chuyển trạng thái: `trial → active` (thanh toán: kỳ 12 tháng tính từ **now**, không nối phần trial còn lại — BR-TRIAL-04 "thanh toán → kích hoạt 12 tháng"), `trial → expired` (job khi `valid_until <= now`). `pending_payment` giữ trong enum cho dữ liệu cũ, không tạo mới.
4. Migration dữ liệu (D-94 2A, D-116): fee `pending_payment` → `trial` với `valid_until = users.created_at + 90 ngày`; đã quá → `expired`. `amount` = giá gói hiện hành (bỏ khoản 600.000 chờ). Bump `version`.
5. Job hằng ngày: trial quá hạn → expired + outbox `membership_fee.changed`; nhắc T-7 và T-0 cho trial (thông báo + email, câu riêng "Còn N ngày miễn phí…"), không nhắc T-30 / T+3 cho trial.
6. Portal: trial = đã kích hoạt (không popup bắt buộc); hết trial → popup bắt buộc với tiêu đề "Hết 3 tháng miễn phí · nâng cấp để tiếp tục"; nhãn trạng thái "Miễn phí 3 tháng". Gói Gọi vốn không đổi (vẫn thu phí, BR-TRIAL-03).
7. Admin: nhãn + tone "Miễn phí 3 tháng" (tab và thống kê đầy đủ ở V42-708).
8. Hoa hồng: trial không sinh hoa hồng (giữ — hoa hồng chỉ ở `membership_fee.confirmed`).

## ACCEPTANCE CRITERIA
- Given đăng ký mới When kích hoạt OTP Then fee `trial`, `validUntil ≈ now + 90 ngày`, gọi được route Portal cần phí, socket không `limited` (int).
- Given trial quá hạn When gọi route cần phí Then 402 ngay (không chờ job); job chạy → `expired` + outbox, chạy lại không đổi (int).
- Given trial When CK đúng Then `active`, kỳ 12 tháng từ hôm nay, có hoa hồng nếu có người giới thiệu (int).
- Given dữ liệu cũ `pending_payment` tạo 10 ngày trước / 200 ngày trước When migrate Then `trial` đến created+90 / `expired` (int db).
- Given trial còn 7 ngày / 0 ngày When job nhắc Then 1 mail + 1 thông báo, chạy lại không gửi lại (int).
- Given TK trial When mở Portal Then không popup bắt buộc; hết trial Then popup với câu trial (e2e MSW).

## CONSTRAINTS
- DO NOT: viết lại `status IN ('active','expiring')` ngoài shared; tạo khoản `pending_payment` mới.
- SKIP: Cấu hình bảng giá (703), đối soát §28.1 (704), affiliate cho mọi TV (707), 6 tab Admin Phí (708).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng Files touched; mỗi AC có test, ghi số thật
- [ ] grep `'active', 'expiring'` chỉ còn ở shared / migration / test
- [ ] Luật 7 (transition có điều kiện), luật 8 (outbox), S-03 (bump version + `membership.updated`)
