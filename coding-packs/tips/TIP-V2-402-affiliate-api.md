# TIP-V2-402: Affiliate — API Portal, ghi nhận click, kiểm mã khi đăng ký, API Admin (AF-R02…R04, R08…R10)

## HEADER
- TIP-ID: TIP-V2-402 · Project: OPCHUB · Module: affiliate · Priority: P0 · Depends on: TIP-V2-401, TIP-V2-201/203 (khoá `affiliate.view` / `affiliate.action` / khoá chi trả, 403 chỉ xem), TIP-V2-302 (schema đăng ký mới) · Estimated: XL (16h)
- **Files touched:**
  - `packages/shared/src/api-domains/affiliate.ts` (create: DTO Portal) · `affiliate-admin.ts` (create: DTO Admin) · `index.ts` (modify: thêm 2 dòng export)
  - `packages/shared/src/api/auth.ts` (modify: `registerPersonalSchema`, `registerBusinessSchema`, `ssoCompleteSchema` thêm `referralCode: z.string().trim().toUpperCase().max(12).optional()`)
  - `packages/shared/src/api-domains/settings-admin.ts` (modify: `AUDIT_TAGS` thêm `'affiliate'`)
  - `apps/server/src/modules/affiliate/controllers/{me-affiliate,referral-public,admin-affiliate-commissions,admin-affiliates,admin-affiliate-policy}.controller.ts` (create)
  - `apps/server/src/modules/affiliate/services/{me-affiliate,referral-code,affiliate-admin,commission-admin,payout,affiliate-csv}.service.ts` (create) · `repositories/*` (modify: thêm truy vấn list/thống kê) · `affiliate-core.module.ts` (modify: `AffiliateHttpModule`) · `index.ts` (modify)
  - `apps/server/src/modules/account/ports.ts` (modify — thêm cổng `REFERRAL_PORT { validate(code, email), attach(tx, userId, code) }`)
  - `apps/server/src/modules/account/services/register.service.ts` (modify: `start()` gọi `validate` (AF-R04), `activate()` gọi `attach` trong transaction tạo user) · `account/domain/register.mapper.ts` (modify: `pendingRegistrationSchema` + `fromPersonal/fromBusiness` mang `referralCode`) · `account/services/sso.service.ts` (modify: truyền `referralCode`)
  - `apps/server/src/api/api-app.module.ts` (modify: thêm `AffiliateHttpModule`)
  - `coding-packs/plans/api-contract.md` (modify: mục `## \`affiliate\``) · `apps/server/test/contract/affiliate.int.spec.ts` (create) · `apps/server/test/contract/coverage.int.spec.ts` (modify: số endpoint 193 → 193 + N)
  - `apps/server/test/affiliate/{me-affiliate,referral-code,admin-commissions,payout,policy}.int.spec.ts` (create)
- **Parallel-safe with:** TIP-V2-501/502. `sequential, shares register.service.ts + api/auth.ts with TIP-V2-302; api-app.module.ts (chỉ thêm dòng)`.
- **Phase / nhánh:** V2-P4, `feature/V2-P4-affiliate`

## CONTEXT
- §20.1 AF-R02…R04, R08…R10; §20.3–20.4 (AF-02, AF-03); §20.6 nội dung màn; §21.2 dòng Affiliate (Kế toán có cả 3 quyền; Quản trị viên không có "Chi trả"); D-53 (chi trả = ghi nhận đã chuyển, không gọi ngân hàng), D-63.
- Mẫu controller/zod: `membership-fee/controllers/admin-fees.controller.ts` (`@RequirePermission`, `ZodBody`, `respond`), CSV: `investor/controllers/admin-investors.controller.ts` (`csvFileSchema` → `{filename,csv}` + audit). Phân trang trả `{items,page,size,total}` theo [api-conventions](../standards/backend/api-conventions.md).
- Đăng ký: `RegisterService.start()` lưu bản chờ Redis, `activate()` tạo user trong 1 tx → referral gắn user id ở đây (AF-R03). SSO `SsoService.complete()` dùng chung `activate`.
- Copy lỗi lấy đúng prototype: "Mã giới thiệu không tồn tại", "Không thể dùng mã giới thiệu của chính bạn", "Mã giới thiệu đang tạm dừng (đại lý hết hạn phí thành viên)".

## APPLICABLE STANDARDS
[api-conventions](../standards/backend/api-conventions.md) · [auth-rbac](../standards/backend/auth-rbac.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [query-indexing](../standards/database/query-indexing.md) · [security](../standards/security/security.md) · [testing](../standards/testing/testing.md)

## TASK
Mở API cho màn Affiliate Portal (thống kê, link/mã, referrals, lịch sử nhận tiền, tài khoản ngân hàng), API công khai ghi click + kiểm mã, gắn referral khi đăng ký, và API Admin (đại lý, %, hoa hồng, huỷ, chi trả tháng, chính sách, CSV). Mọi thao tác Admin ghi `audit_logs`.

## SPECIFICATIONS
### Endpoints (`/v1`)
Portal (JWT thành viên, `@SkipMembershipFee()` cho GET để hiện khung khoá):
1. `GET /me/affiliate` → `{ state: 'locked'|'active'|'paused', policy:{rate,perAmount,cookieDays}, code?, link?, bank?, stats?:{clicks30d, paidCount, conversionPct, thisMonth, carryOver, received} }`. Chưa đóng phí (không có đại lý) → `locked`, không có code/link (AF-R02). `link = ${PORTAL_URL}/r/${code}`.
2. `GET /me/affiliate/referrals?month=YYYY-MM&page&size` → `{ months:[…], summary:{count, commission, status}, items:[{name, plan, date, feeAmount, commission, status, cancelReason}], page,size,total }` (lọc tháng, phân trang; tên khách rút gọn).
3. `GET /me/affiliate/payouts?page&size` → kỳ đã chi `{ monthKey, amount, count, paidAt, bank }`.
4. `PUT /me/affiliate/bank` `{ bankName (∈ danh sách 15 ngân hàng prototype), bankNo (6–19 số), bankHolder }` — server chuẩn hoá holder: bỏ dấu, `đ→D`, in hoa, gộp khoảng trắng; chỉ `[A-Z ]` (AF-R09). 409 nếu chưa là đại lý.
Công khai (`@Public()`, throttle):
5. `POST /public/affiliate/click` `{ code }` → 204; đại lý `active` → tăng `affiliate_clicks_daily` (UPSERT +1, ngày VN); khác → 204 không ghi (AF-R07 "link ngừng ghi nhận"). Chống spam: 1 lần / IP+code / giờ (Redis SET NX).
6. `GET /public/affiliate/codes/:code?email=` → `{ valid:true, affiliateName }` hoặc `{ valid:false, reason:'not_found'|'self'|'paused', message }` (AF-R04).
Đăng ký: `registerPersonal|Business|ssoComplete` nhận `referralCode`; `start()` kiểm như (6) → lỗi `VALIDATION_ERROR` path `referralCode` (form bị chặn); `activate()` kiểm lại + `INSERT referrals (pending, affiliate_code, month_key)` cùng tx tạo user (AF-R03). "self" = email đăng ký trùng email user của đại lý (không phân biệt hoa thường).
Admin:
7. `GET /admin/affiliate/summary?month=` (`affiliate.view`): doanh thu từ affiliate, tổng hoa hồng, hoa hồng phải trả, doanh thu thuần.
8. `GET /admin/affiliate/commissions?q&status=all|recorded|paid|cancelled&page&size` (`affiliate.view`) — deferred join theo index `(status, created_at DESC, id DESC)`.
9. `POST /admin/affiliate/commissions/cancel` `{ ids (≤100), reason (1–500) }` (`affiliate.action`) — chỉ `recorded → cancelled` có điều kiện; khoản khác bỏ qua, trả `{ cancelled }`; outbox `affiliate.commission_cancelled` → thông báo đại lý kèm lý do (AF-R10).
10. `POST /admin/affiliate/commissions/export` `{ ids? , q?, status? }` (`affiliate.action`) → CSV.
11. `GET /admin/affiliates?q&month&page&size` (`affiliate.view`): tên, mã, email, % , khách, doanh thu, số dư (recorded chưa chi), đã chi, trạng thái tháng, nhãn `auto`/`paused`, `hasBank`.
12. `PUT /admin/affiliates/rate` `{ ids (≤100), rate 1–50 }` và `PATCH /admin/affiliates/:id` `{ rate }` (`affiliate.action`) — AF-R08: cập nhật `affiliates.rate` + `UPDATE commissions SET rate, amount = floor(listAmount*rate/100) WHERE affiliate_id = ANY AND status='recorded'` trong cùng tx (khoản đã chi giữ nguyên); thông báo đại lý "Tỷ lệ hoa hồng của bạn đổi thành X%".
13. `GET /admin/affiliates/:id` + `/:id/months?page&size` (đối soát theo tháng: khách, hoa hồng, trạng thái, ngày chi) + `/:id/customers?page&size` (khách, ngày, %HH, hoa hồng, trạng thái, lịch sử chi trả) (`affiliate.view`).
14. `POST /admin/affiliates/:id/payouts` `{ monthKey }` (**khoá chi trả** — Kế toán, Super Admin) — AF-R09: chưa có STK → 409 `"<Tên> chưa cập nhật số tài khoản"` (AT-AF06); không có khoản recorded tháng đó → 409 "Không còn hoa hồng chưa chi trong <tháng>"; `monthKey` ≥ tháng hiện tại (VN) → 409 "Chỉ chi trả tháng đã kết thúc". Thành công: `recorded → paid` có điều kiện, `paid_at`, `paid_by`, `paid_bank_snapshot` cùng tx + outbox `affiliate.payout_recorded` → thông báo đại lý kèm số tiền, ngân hàng, kỳ.
15. `POST /admin/affiliates/export` (`affiliate.action`) → CSV danh sách đại lý.
16. `GET|PUT /admin/affiliate/policy` (`affiliate.view` / `affiliate.action`): `{ defaultRate 1–50, cookieDays 1–365, terms ≤ 5000 }`; đổi `defaultRate` chỉ áp cho đại lý mới.
- Mọi thao tác Admin (9, 10, 12, 14, 15, 16) ghi `audit_logs` tag `affiliate` CÙNG transaction (luật 10, kể cả xuất CSV).

### Validation / Error Handling
- Zod ở `packages/shared` cho mọi query/body; `rate` int 1–50 → ngoài khoảng 422 `VALIDATION_ERROR` path `rate`. Thiếu quyền thao tác → 403 mã chỉ xem của TIP-V2-203.
- Outbox mới (chỉ thêm dòng vào `outbox/events.ts`): `affiliate.commission_cancelled {commissionIds, reason}`, `affiliate.payout_recorded {affiliateId, monthKey}`, `affiliate.rate_changed {affiliateIds, rate}` + handler trong `affiliate-notify.handler.ts` (TIP-V2-401).

## ACCEPTANCE CRITERIA
- Given TV chưa đóng phí, When `GET /me/affiliate`, Then `state:'locked'`, không có `code`/`link` (AF-R02, REQ-302).
- Given mã A hợp lệ, When đăng ký với `referralCode` A rồi xác thực OTP, Then 1 referral pending gắn user id mới (AF-R03, REQ-303).
- Given email đăng ký = email đại lý A, When đăng ký với mã A, Then 422 path `referralCode` "Không thể dùng mã giới thiệu của chính bạn", không gửi OTP (AT-AF03, REQ-304). Mã lạ → "Mã giới thiệu không tồn tại"; A paused → "…đang tạm dừng…" (AT-AF05).
- Given đại lý chưa có STK, When Kế toán chi trả tháng 09, Then 409 yêu cầu cập nhật STK, không khoản nào đổi trạng thái (AT-AF06, REQ-309).
- Given A paused có khoản recorded, When chi trả, Then thành công (AT-AF05).
- Given 2 khoản recorded + 1 paid, When đặt % = 30, Then 2 khoản recorded có amount 180000, khoản paid giữ nguyên (AF-R08, REQ-308).
- Huỷ không lý do → 422; huỷ khoản paid → bỏ qua, `cancelled:0` (AF-R10, REQ-310). Vai trò Quản trị viên gọi payout → 403; Kế toán → 200.
- `PUT /me/affiliate/bank` holder "Nguyễn Văn An" → lưu "NGUYEN VAN AN".

## TESTS BẮT BUỘC
- `apps/server/test/affiliate/me-affiliate.int.spec.ts` (`REQ-302 locked`, `REQ-311 stats/referrals lọc tháng`, `REQ-309 bank holder in hoa không dấu`).
- `referral-code.int.spec.ts` (`AT-AF03 REQ-304 self`, `REQ-304 not_found`, `AT-AF05 paused`, `REQ-303 attach khi verify OTP + SSO`, `click paused không ghi`).
- `admin-commissions.int.spec.ts` (`REQ-310 huỷ có lý do + thông báo`, `REQ-308 % đơn/hàng loạt`, `CSV + audit`).
- `payout.int.spec.ts` (`AT-AF06 REQ-309 chặn khi chưa STK`, `REQ-309 chi trả + snapshot + thông báo`, `AT-AF05 chi trả đại lý tạm dừng`, `quyền: Quản trị viên 403, Kế toán 200`).
- `policy.int.spec.ts`; contract `apps/server/test/contract/affiliate.int.spec.ts` (mỗi endpoint ≥1 `ep(...)`). Test âm cho mọi endpoint ghi (D-63).

## CONSTRAINTS
- DO NOT: check tên vai trò (chỉ khoá quyền, luật 4); trả số tài khoản đầy đủ cho vai trò không có quyền xem affiliate; gọi API ngân hàng (D-53); query trong vòng lặp khi hàng loạt (một UPDATE … `= ANY($ids)`); OFFSET lớn không deferred join.
- REUSE: `csvFileSchema`, `AuditService.log`, `IdempotencyService` cho payout (header `Idempotency-Key`), `ZodBody`/`respond`, throttle decorator của `register.controller.ts`.
- SKIP: UI (TIP-V2-403/404); seed demo (TIP-V2-401).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 2 (zod ở shared, không `any`), 4 (permission key), 5 (index/deferred join), 7, 8, 10 (audit mọi thao tác Admin + xuất CSV).
- [ ] Cập nhật `api-contract.md` + `coverage.int.spec.ts` khớp số endpoint.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` xanh.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-402-DONE <sha>`; report `coding-packs/reports/TIP-V2-402-completion.md`.
