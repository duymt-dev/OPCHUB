# TIP-V4-601: Phí thành viên 3 gói (Cá nhân / Doanh nghiệp) + Bảng giá v4

## HEADER
- TIP-ID: TIP-V4-601
- Project: OPCHUB
- Module: membership-fee (server) · membership (portal) · fees (admin) · shared mock
- Priority: P0
- Depends on: none (đầu chuỗi V4)
- Estimated: L
- REQ / D: REQ-501 · D-68, D-69, D-81 (D-70 hoa hồng để V4-602; Gói Gọi vốn mua thật để V4-610)
- **Files touched:**
  - create `packages/shared/src/membership/plans.ts`, `packages/shared/src/membership/plans.spec.ts`
  - modify `packages/shared/src/index.ts`, `packages/shared/src/api-domains/fees-admin.ts`
  - modify `packages/db/prisma/schema/membership-fee.prisma`; create migration `packages/db/prisma/migrations/20261023090000_membership_plans/`
  - modify `packages/db/seed/**` (chỗ ghi `amount` phí), `packages/shared/src/mock-data/**` (FEE_AMOUNT, auth, fees-admin, admin)
  - modify `apps/server/src/modules/account/{ports.ts,services/register.service.ts}`
  - modify `apps/server/src/modules/membership-fee/{services/fee-writer.service.ts,services/membership-fee.service.ts,services/admin-fees.service.ts,services/fee-scheduler.service.ts,repositories/*}`
  - modify `apps/server/src/modules/mail/{templates-fee.ts,index.ts}`
  - modify `apps/portal/src/features/membership/**`, `apps/portal/messages/*/{membership,auth,chat,community}.json`
  - modify `apps/admin/src/features/fees/**`, `apps/admin/messages/*/fees.json`, `apps/admin/src/mocks/**` (fee)
  - modify tests: `apps/server/test/membership-fee/**`, `e2e/behavior/{membership,popup-v4,services,admin-fees,new-member-paywall,bank-fee-link,accountant-fee-link}.spec.ts`, `e2e/parity/scenarios/portal-account.ts`, `coding-packs/reports/ui-parity/screens.md`
- **Parallel-safe with:** V4-603, V4-604, V4-605 (khác module). `sequential, shares packages/shared/src/index.ts with V4-606` (chỉ thêm dòng).

## CONTEXT
- Working dir: `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V4-601-fee-3-plans` từ `dev` 32bf4016.
- Đọc trước: `plans/V4-BLUEPRINT.md` §2.1, D-68/D-69 trong `01-REQUIREMENTS-MATRIX.md`, prototype `docs/spec/index.html` (khối `data-pk-slider`, `feeT`, `pk`, admin `feRows`).
- Pattern: transition phí `membership-fee.service.ts#activate` (khoá dòng + version), outbox trong cùng transaction.

## APPLICABLE STANDARDS
- [database/query-indexing](../standards/database/query-indexing.md) · [backend/nestjs-modules](../standards/backend/nestjs-modules.md)
- [frontend/ui-parity](../standards/frontend/ui-parity.md) (≤ 3%) · [frontend/antd-ui](../standards/frontend/antd-ui.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md)

## TASK
Thay phí cố định 600.000đ bằng 2 gói năm theo loại tài khoản lúc đăng ký (Cá nhân 1.200.000đ, Doanh nghiệp 3.600.000đ),
giá đọc từ một nguồn trong `packages/shared`. Chuyển dữ liệu thành viên cũ theo D-69. Popup Gói dịch vụ đổi sang Bảng giá 3 thẻ v4
(Cá nhân / Doanh nghiệp / Gói Gọi vốn — thẻ Gọi vốn chỉ hiển thị, nút mua làm ở V4-610).

## SPECIFICATIONS
### Business Rules
1. `MEMBERSHIP_PLANS = { personal: { amount: 1_200_000, monthly: 100_000, listMonthly: 200_000 }, business: { amount: 3_600_000, monthly: 300_000, listMonthly: 500_000 } }`,
   `FUNDRAISING_PLAN = { amount: 15_000_000, months: 6, renewAmount: 7_500_000 }`, `planOf(accountType)` → `personal|business|null` (investor = null, D-14).
2. `membership_fees.plan` (enum `membership_plan`) + `amount` **không còn default**: `amount` = số tiền phải trả ở lần thanh toán kế tiếp.
3. Đăng ký mới: `openFor(tx, userId, accountType)` ghi `plan` + `amount` theo gói.
4. Kích hoạt / gia hạn thành công: sau khi ghi kỳ, đặt `plan = planOf(account_type hiện tại)` và `amount = giá gói` cho lần gia hạn sau
   (Admin đổi loại TK → áp từ kỳ gia hạn sau, D-68).
5. Migration D-69: backfill `plan` từ `users.account_type` (investor → personal, không dùng); `pending_payment` **giữ** `amount` cũ;
   `active|expiring|expired` → `amount` = giá gói mới (hạn hiện tại giữ nguyên).
6. Đối soát: chuyển khoản ≥ `amount` hiện hành mới kích hoạt (giữ quy tắc cũ); khớp tay vẫn cho thiếu tiền (QĐ-01).
7. Mail nhắc phí + thông báo: câu "Phí {amount}/năm" theo `amount` của từng người.
8. Admin Phí thành viên: toast dòng = `amount` của dòng; toast hàng loạt "Đã ghi nhận thu phí cho {n} thành viên" (prototype). Bỏ `feeAmount` khỏi summary.
9. Portal: popup Gói dịch vụ = header "BẢNG GIÁ THÀNH VIÊN" + 3 lợi ích + 3 thẻ (gói của mình có nhãn "Gói của bạn", nút "Đăng ký · {y}/năm" hoặc
   "Gia hạn · {y}/năm"; gói còn lại nút xám "Dành cho tài khoản {Cá nhân|Doanh nghiệp}"; thẻ Gọi vốn nút "Kích hoạt gói thành viên trước" khi chưa phí,
   "Đăng ký · 15.000.000đ/dự án" khi đã phí — bấm báo "sẽ mở ở V4-610" bằng toast, không tạo thanh toán), dưới là danh sách dịch vụ.
   Hộp chuyển khoản, banner, điều kiện thanh toán dùng tên gói + giá năm + giá tháng theo prototype.

### Validation
- Mọi chỗ hiển thị tiền dùng `formatVnd` (Portal) / `toLocaleString('vi-VN')` (server). Không hằng số 600000 mới.

### Error Handling
- Không có `plan` cho investor: `/me/membership` vẫn 403/404 như cũ (D-14).

## ACCEPTANCE CRITERIA
- Given đăng ký TK Cá nhân When kích hoạt OTP Then `membership_fees.amount = 1200000, plan = personal`.
- Given TK DN pending 3.600.000 When webhook 1.200.000 Then không kích hoạt, giao dịch `unmatched` "Số tiền nhỏ hơn phí thành viên".
- Given TK cũ pending 600.000 (trước go-live) When webhook 600.000 Then kích hoạt và `amount` chuyển thành giá gói cho lần sau.
- Given TK active 600.000 sau migration Then `amount` = giá gói, `valid_until` không đổi.
- Given user DN mở Gói dịch vụ Then thẻ DN có "Gói của bạn", nút "Gia hạn · 3.600.000đ/năm"; thẻ Cá nhân nút "Dành cho tài khoản Cá nhân" bị khoá.
- Given Admin bấm "Ghi nhận đã thu" dòng Cá nhân Then toast "Đã ghi nhận thu 1.200.000đ · {tên}".
- Parity P-79, P-84 (và màn bị ảnh hưởng) ≤ 3% ở 1440 + 390.

## CONSTRAINTS
- DO NOT: đổi cơ sở hoa hồng (V4-602), tạo thanh toán Gọi vốn (V4-610), đổi câu xác nhận đăng ký (V4-607) ngoài thay số tiền.
- REUSE: `PaywallModal`, `ServiceList`, `formatVnd`, `activate()`.

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng Files touched (+ `packages/ui/src/paywall-modal/*`, `apps/portal/src/features/shell/portal-shell.tsx` cho Bảng giá dạng trang v4 — ghi completion); grep `600000|600_000|600\.000` ngoài migration/test D-69/affiliate (V4-602) = 0
- [x] Integration Postgres thật: `plans.int.spec.ts` 4 ca (DN thiếu tiền, D-69 600k cũ, đổi loại TK, outbox) — membership-fee 44/44, affiliate 53/53, toàn bộ server 131 file pass
- [x] lint 0 lỗi · typecheck 8/8 · test 6/6 task · test:int (db 5, server 131 file) · depcheck sạch · build 3/3 · e2e behavior 285 passed / 0 failed / 4 skipped
- [x] Parity P-79 (1,15 / 1,38 / 0,54%), P-84 (1,03 / 0,13%) đạt; P-81, P-82, P-89@390 có DV-V4-601-1..3 chờ duyệt
- [x] Rule: đổi trạng thái chỉ qua `activate` có điều kiện version; tiền Int VND; không file vượt trần
- [x] Commit theo đường dẫn, `git status --short` sạch, báo SHA
