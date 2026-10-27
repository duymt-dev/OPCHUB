# TIP-V42-703: Cấu hình bảng giá (price_configs + lịch sử + audit + cache) và thay mọi hằng số giá

## HEADER
- TIP-ID: TIP-V42-703
- Project: OPCHUB
- Module: pricing (mới), membership-fee, project (Gọi vốn), affiliate, settings (Admin), Portal membership / profile / onboarding / fundraising, MSW
- Priority: P0
- Depends on: TIP-V42-702 (nhánh chưa merge → xếp chồng)
- Estimated: L
- REQ / D: REQ-603, D-94 5A (CR-08), D-104 (đúng bằng giá cấu hình — đối soát ở 704), D-106, D-110, D-116, S-03, V-12, §27.2(5), §27.5b, §27.5c
- **Files touched:**
  - DB: `packages/db/prisma/schema/pricing.prisma` (create: `PriceConfig` một dòng id = 1, `PriceConfigHistory`), migration `20261028100000_v42_price_config` (create: bảng, CHECK, dòng mặc định 200.000 / 1.200.000 · 500.000 / 3.600.000 · 15.000.000 / 7.500.000 / 6), `packages/db/test/migration-price-config.int.spec.ts` (create)
  - Shared: `packages/shared/src/membership/pricing.ts` (create: `priceConfigSchema`, `PriceConfig`, `planPrice`, `planMonthly`, `planDiscount`, `planAmountOf`, `fundAmountOf`, `fundCommission`, `validatePriceConfig`) + `.spec.ts`, `membership/plans.ts` (bỏ `MEMBERSHIP_PLANS`, `FUNDRAISING_PLAN`, `planAmount`, `planDiscountPct`, `fundraisingCommission`; giữ `MEMBERSHIP_PLAN`, `planOf`, `LEGACY_ANNUAL_FEE` cho dữ liệu lịch sử), `plans.spec.ts`, `index.ts`, `api-domains/settings-admin.ts` (tag `pricing`), `fixtures/price-defaults.ts` (create: giá mặc định chỉ cho seed / test / MSW)
  - Server: `modules/pricing/**` (create: `pricing-core.module.ts`, `pricing-http.module.ts`, `price-config.service.ts` (đọc qua Redis cache, CAS epoch), `price-config.repository.ts`, `controllers/{admin-price-config,public-price-config}.controller.ts`, `index.ts`), `api/api-app.module.ts`, `socket/socket-app.module.ts`, `worker/worker-app.module.ts`, `membership-fee/services/{fee-writer,membership-fee}.service.ts`, `project/services/{fundraising,fundraising-review}.service.ts`, `affiliate/services/me-affiliate.service.ts`, `affiliate/controllers/admin-affiliate-policy.controller.ts` (chú thích)
  - Admin: `features/settings/{types.ts,api.ts}`, `components/{settings-screen.tsx,price-tab.tsx,price-plan-card.tsx,price-fund-card.tsx,price.module.css}`, `hooks/use-price-config.ts`, `messages/vi/settings.json`, `features/affiliate/components/policy-fields.tsx` + hook giá, `mocks/handlers/settings.ts`, `mocks/settings-handlers.spec.ts`
  - Portal: `features/membership/{api.ts,hooks/use-prices.ts,index.ts}`, `components/{plan-cards,pay-banner}.tsx`, `features/profile/components/billing-tab.tsx`, `features/onboarding/components/onboarding-card.tsx`, `features/fundraising/components/fundraising-popup.tsx`, `messages/*/{auth,community}.json` (giá trong câu đồng ý → tham số), component đọc câu đó, `mocks/handlers/account.ts` (GET `/public/price-config`)
  - MSW / mock-data: `packages/shared/src/mock-data/**` đọc `PRICE_DEFAULTS` (fixtures) thay hằng số
  - Seed: `packages/db/seed/{load.ts,demo/stores.ts,demo/affiliate-scenario.ts}`, `seed/required.ts` (đảm bảo dòng price_config)
  - Test: `apps/server/test/pricing/price-config.int.spec.ts` (create), factory + int spec đang import hằng số → `PRICE_DEFAULTS`, e2e `behavior/admin-price-config.spec.ts` (create), parity `e2e/parity/scenarios/admin-settings.ts` (D-100)
  - Báo cáo: `coding-packs/reports/explain/V42-703-*.{sql,txt}`, `TIP-V42-703-completion.md`, `V4.2-progress.md`, `V4.2-M1-completion.md`
- **Parallel-safe with:** sequential — chồng trên 702; 704 / 705 / 706 / 707 đọc `PriceConfigService`.

## CONTEXT
- Prototype v4.2: Admin › Cài đặt tab `['price','Cấu hình bảng giá','Gói Cá nhân, Doanh nghiệp, Gọi vốn']` đặt sau SMTP, trước Tài khoản quản trị, khoá `cfg` = `settings.general`; khung `stPrice` (2 thẻ gói + thẻ Gọi vốn cam), `prcV` (validate, cảnh báo, flash), `_prc(s)` mặc định `per{list:200000,y:1200000} biz{list:500000,y:3600000} fund{p:15000000,r:7500000,mo:6}`.
- Đặc tả §27 data model `price_config(per.list, per.y, biz.list, biz.y, fund.p, fund.r, fund.mo)`, "lưu lịch sử thay đổi"; API `GET/PUT /admin/price-config`; E2E-12 "Đổi giá → Bảng giá cập nhật ngay".
- Mẫu code: `settings/app-settings.service.ts` (cache Redis), `dashboard/dashboard-content-cache.service.ts` (epoch/CAS chống ghi cache cũ), `affiliate/services/affiliate-policy.service.ts` (một dòng, khoá FOR UPDATE, audit diff), Admin `features/settings/hooks/use-smtp.ts` (form nháp + lưu).

## APPLICABLE STANDARDS
- [backend/auth-rbac](../standards/backend/auth-rbac.md) — `settings.general` cho Admin, Portal đọc công khai
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) — module core / http tách, audit trong transaction
- [database/query-indexing](../standards/database/query-indexing.md) — lịch sử theo `(changed_at DESC)`
- [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/ui-parity](../standards/frontend/ui-parity.md), [frontend/data-state](../standards/frontend/data-state.md)
- [testing/testing](../standards/testing/testing.md)

## TASK
Đưa giá gói vào một nguồn duy nhất trong DB (`price_configs`, một dòng) có lịch sử (`price_config_history`) + audit, đọc qua cache Redis (S-03), Admin sửa ở tab "Cấu hình bảng giá" đúng prototype v4.2. Server, Portal, Admin, MSW không còn hằng số giá: mọi giá đọc từ cấu hình (server: `PriceConfigService`; FE: `GET /public/price-config`).

## SPECIFICATIONS
### Business Rules
1. Bảng `price_configs` (tên theo task graph; một dòng `id = 1`): `per_list`, `per_year`, `biz_list`, `biz_year`, `fund_price`, `fund_renew`, `fund_months` (int, VND / tháng), `version`, `updated_at`, `updated_by`. Bảng `price_config_history`: ảnh chụp đầy đủ sau mỗi lần lưu + `changed_by`, `changed_at`, index `(changed_at DESC)`.
2. Đọc: `PriceConfigService.current()` — cache Redis `pricing:config` (TTL 300 s) + epoch CAS; Admin lưu → tăng epoch + xoá key **sau commit** (S-03). Thiếu dòng → lỗi rõ ràng "chạy seed / migrate".
3. Ghi `PUT /admin/price-config` (`settings.general`): khoá dòng FOR UPDATE, cập nhật + bump `version`, thêm dòng lịch sử, `audit_logs` (action `pricing.update`, entity `price_config`, tag `pricing`, diff before / after) trong **một** transaction (luật 10).
4. Áp dụng (§27.2(5) "chỉ giao dịch mới"; khoản đã thu giữ nguyên):
   - Mở phí trial (đăng ký), kỳ sau khi kích hoạt (`nextPlan`) → `amount` = giá năm cấu hình hiện hành theo gói.
   - Khoản Gọi vốn mới: `fund.p`; đã từng duyệt (hết hạn) → `fund.r` (D-106). Khoản `pending_payment` đang mở trả lại nguyên (idempotent, mã CK đã phát).
   - Duyệt Gọi vốn: thời hạn = `fund.mo` tháng.
   - Hoa hồng: preview Affiliate theo giá Cá nhân cấu hình; hoa hồng đã ghi giữ nguyên (BR-AFF-REV). % Gọi vốn vẫn ở `affiliate_policy.fundraising_rate` (không nhân đôi nguồn).
   - Khoản phí đang chờ (trial / expired chưa trả) khi đổi giá: Q-V42-703-1 — đối soát "đúng bằng giá hiện hành" (D-104) thuộc 704; 703 cập nhật `membership_fees.amount` của các dòng **chưa thanh toán lần nào hoặc đang expired** theo giá mới trong cùng transaction lưu giá (khoản chưa thu = giao dịch mới), không đụng kỳ đã thu.
5. Portal: `GET /public/price-config` (không cần đăng nhập — Bảng giá + câu đồng ý ở đăng ký) trả `PriceConfig`; FE tính giá tháng = round(y/12), % ưu đãi = max(0, round((1 − m/list)·100)) bằng hàm shared.
6. Lịch sử: không có UI riêng trong prototype → hiện qua Nhật ký hoạt động (tag `pricing`, tóm tắt "Cập nhật bảng giá") + bảng history cho truy vết (DV ghi questions Q-V42-703-2).

### Validation (zod shared + prototype `prcV`)
- Mọi trường số nguyên ≥ 0, ≤ 10 tỷ; `per.y`, `biz.y`, `fund.p` > 0 → "Giá bán không được để trống"; `fund.mo` ≥ 1 (≤ 60) → "Thời hạn gói Gọi vốn tối thiểu 1 tháng". `fund.r` > 0.
- Cảnh báo (không chặn): giá tháng > niêm yết → "Giá bán theo tháng đang cao hơn giá niêm yết."
- Ô nhập `inputmode="numeric"`, lọc ký tự không phải số.

### Error Handling
- 400 VALIDATION_ERROR (thông điệp tiếng Việt như trên); 403 khi thiếu `settings.general`; 409 khi `version` gửi lên khác bản hiện tại (hai Admin cùng sửa).

## ACCEPTANCE CRITERIA
- Given DB sau migrate When GET `/admin/price-config` Then đúng giá mặc định §27.2 (int + db).
- Given Admin `settings.general` When PUT giá Cá nhân 1.500.000 Then 200, `version+1`, 1 dòng history, 1 audit `pricing.update` có diff; GET `/public/price-config` ngay sau trả giá mới (cache đã xoá) (int).
- Given Admin thiếu `settings.general` When PUT Then 403; Given `per.y = 0` / `fund.mo = 0` Then 400 đúng thông điệp (int).
- Given giá Cá nhân đổi When đăng ký TK Cá nhân mới Then `membership_fees.amount` = giá mới; TK trial cũ chưa trả → amount giá mới; kỳ đã thu giữ nguyên (int).
- Given `fund.p`, `fund.r`, `fund.mo` đổi When tạo khoản Gọi vốn mới / gia hạn / duyệt Then amount và thời hạn theo cấu hình mới; khoản pending đã mở giữ nguyên (int).
- Given Admin › Cài đặt When chọn "Cấu hình bảng giá" Then đúng bố cục prototype (2 thẻ + thẻ Gọi vốn), sửa → hiện "Hủy thay đổi", lưu → toast "Đã lưu bảng giá · áp dụng ngay cho trang Bảng giá và thanh toán mới"; Portal Bảng giá đọc giá từ API (e2e behavior MSW).
- Parity D-100 ≤ 3% ở 1440 + 390; P-79 (Bảng giá) không tụt.
- `grep -rnE "1_200_000|3_600_000|15_000_000|7_500_000|1200000|3600000" apps packages/shared/src --include=*.ts{,x}` (trừ test / fixtures / migration / seed) = 0.

## CONSTRAINTS
- DO NOT: để hằng số giá trong `apps/**/src` hoặc `packages/shared/src` ngoài `fixtures/price-defaults.ts`; đổi % hoa hồng Gọi vốn ở bảng giá (giữ `affiliate_policy`); sửa `amount` các kỳ đã thu.
- REUSE: `AuditService`, `RedisService`, `respond/ZodBody`, `useSettingsMutation`, `SettingsNav`.
- SKIP: đối soát đúng bằng (704), VietQR (705), multi-dự án (D-94 4B), doanh thu theo gói Admin Phí (708).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng Files touched; mỗi AC có test, ghi số thật
- [ ] Ghi giá + history + audit cùng transaction; xoá cache sau commit (S-03)
- [ ] Permission key `settings.general`, không check tên vai trò (luật 4)
- [ ] Tiền số nguyên VND (luật 9); không `any`; FE ≤ 400, BE ≤ 600 dòng
- [ ] grep hằng số giá = 0 ngoài fixtures / seed / migration / test
