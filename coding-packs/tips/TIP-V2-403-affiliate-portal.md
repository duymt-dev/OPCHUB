# TIP-V2-403: Affiliate Portal + mã giới thiệu khi đăng ký (REQ-311, AF-R02…R04)

## HEADER
- TIP-ID: TIP-V2-403 · Project: OPCHUB · Module: portal/affiliate + portal/auth · Priority: P0 · Depends on: TIP-V2-402 (API + zod), TIP-V2-302 (form đăng ký + điều khoản mới) · Estimated: L (12h)
- **Files touched:**
  - `apps/portal/src/features/affiliate/` (create): `api.ts`, `types.ts`, `model.ts` + `model.spec.ts` (link chia sẻ FB/Zalo/mail, chuẩn hoá tên chủ TK, nhãn tháng), `hooks/{use-affiliate,use-referrals,use-payouts,use-bank-form}.ts`, `components/{affiliate-screen,affiliate-locked,affiliate-hero,bank-account-card,share-bar,affiliate-stats,referrals-tab,payouts-tab}.tsx` + `*.module.css`, `index.ts`
  - `apps/portal/src/app/(portal)/affiliate/page.tsx` (create) · `apps/portal/src/app/(public)/r/[code]/page.tsx` (create — ghi click rồi chuyển `/register?ref=MÃ`)
  - `apps/portal/src/features/shell/nav.ts` (modify: thêm `affiliate` giữa `projects` và `services`, icon `affiliate`) · `packages/ui/src/icons/paths.ts` (modify: thêm path `affiliate` theo prototype)
  - `apps/portal/src/features/auth/hooks/use-register-common.ts` (modify: state `referralCode` + `useReferralCode` gọi kiểm mã debounce) · `hooks/use-referral-code.ts` (create) · `components/referral-field.tsx` (create) · `components/register-common-fields.tsx`, `hooks/use-personal-form.ts`, `hooks/use-biz-form.ts`, `components/sso-complete-screen.tsx` (modify: hiển thị ô + gửi `referralCode`, chặn submit khi lỗi) · `api.ts` (modify: `checkReferralCode`, `trackClick`)
  - `apps/portal/messages/vi/affiliate.json` (create) · `apps/portal/messages/vi/auth.json`, `shell.json` (modify — chỉ thêm khoá) · `apps/portal/src/i18n/messages.ts` (modify: thêm 1 dòng)
  - `packages/shared/src/mock-data/domains/affiliate.ts` (create: store + seed theo prototype `AF0`, rate 20, cookie 30) · `mock-data/domains/index.ts` (modify: 1 dòng export)
  - `apps/portal/src/mocks/handlers/affiliate.ts` (create) · `handlers/index.ts` (modify) · `handlers/register.ts` (modify: kiểm `referralCode`) · `apps/portal/src/mocks/affiliate-handlers.spec.ts` (create)
  - `e2e/behavior/affiliate-portal.spec.ts` (create) · `e2e/server/api.ts` (modify: helper `affiliateCodeOf(email)` nếu cần)
- **Parallel-safe with:** TIP-V2-404 (khác app; chung `packages/shared/src/mock-data/domains/affiliate.ts` → 403 tạo, 404 chỉ thêm hàm). `sequential, shares features/auth/* with TIP-V2-302`.
- **Phase / nhánh:** V2-P4, `feature/V2-P4-affiliate`

## CONTEXT
- Prototype `docs/spec/index.html` khối `<!-- ===== PORTAL: AFFILIATE ===== -->` (khung khoá, hero, thẻ tài khoản, link + mã, chia sẻ, 5 thẻ thống kê, 2 tab) và ô "Mã giới thiệu (không bắt buộc)" trong form đăng ký (`rgRef`, `rgRefErr`, "✓ Được giới thiệu bởi …").
- §20.6 dòng User Portal; AF-R02 (khung "Đóng phí thành viên để nhận link giới thiệu" kèm % và số tiền), AF-R03/R04; NA về cookie: `affiliate_policy.cookie_days`.
- Mẫu feature: `apps/portal/src/features/services/**` (api/hooks/components/model.spec), `features/membership` (nút "Thanh toán phí thành viên" → `PAYWALL_PATHS.pay` / `openInPlace`).
- Copy (giữ nguyên chữ prototype): "CHƯƠNG TRÌNH AFFILIATE OPC HUB", "Giới thiệu thành viên mới, nhận {rate} hoa hồng", "Chưa có số tài khoản nhận hoa hồng.", "In hoa, không dấu, đúng như trên thẻ/ứng dụng ngân hàng", "Thành viên bạn đã giới thiệu", "Lịch sử nhận tiền", "Hoa hồng được chuyển khoản 1 lần vào ngày cuối mỗi tháng"; thống kê: Lượt nhấp link (30 ngày gần nhất) · Thành viên đã thanh toán (Tỷ lệ chuyển đổi) · Hoa hồng tháng này · Tồn kỳ trước chưa chi · Đã nhận.

## APPLICABLE STANDARDS
[nextjs-structure](../standards/frontend/nextjs-structure.md) · [routing-auth](../standards/frontend/routing-auth.md) · [data-state](../standards/frontend/data-state.md) · [antd-ui](../standards/frontend/antd-ui.md) · [ui-parity](../standards/frontend/ui-parity.md) (≤ 3%) · [testing](../standards/testing/testing.md)

## TASK
Dựng màn `/affiliate` của Portal theo prototype ver2 (khung khoá khi chưa đóng phí, link/mã/chia sẻ, thống kê, 2 tab, khai báo tài khoản nhận), route `/r/[code]` và ô mã giới thiệu tự điền trong form đăng ký cá nhân / doanh nghiệp / hoàn tất SSO; MSW + e2e.

## SPECIFICATIONS
1. **Route** `/affiliate` nằm trong `(portal)` nhưng KHÔNG bị paywall chặn (người chưa đóng phí phải thấy khung khoá — AF-R02); `state:'locked'` → `affiliate-locked.tsx` (%, số tiền/khách = `perAmount`, nút "Thanh toán phí thành viên" mở hộp `/membership/pay`). `paused` → dải cảnh báo "Mã đang tạm dừng — gia hạn phí để tiếp tục nhận hoa hồng" (Câu hỏi Q-403-1).
2. **Link + mã**: sao chép (toast "Đã sao chép link giới thiệu"/"mã giới thiệu"); chia sẻ: Facebook `https://www.facebook.com/sharer/sharer.php?u=<link>`, Zalo `https://zalo.me/share?url=<link>` (Câu hỏi Q-403-2), Email `mailto:?subject=…&body=<link>` — mở tab mới, hàm thuần trong `model.ts`.
3. **Tài khoản nhận**: chưa có → banner + nút "Cập nhật ngay"/"+ Thêm tài khoản ngân hàng"; form Select 15 ngân hàng prototype, số TK chỉ số, tên chủ TK tự chuẩn hoá in hoa không dấu khi gõ (`toHolder()` trong `model.ts`, server chuẩn hoá lần nữa); lưu → `PUT /me/affiliate/bank`, toast "Đã lưu tài khoản nhận hoa hồng".
4. **Tab Thành viên đã giới thiệu**: Select tháng (URL `?month=`), dòng tổng (số khách, hoa hồng, trạng thái), bảng Thành viên · Gói · Ngày · Phí thành viên · Hoa hồng · Trạng thái (Đã ghi nhận / Đã chi trả / Đã hủy + lý do tooltip AF-R10), phân trang (URL `?page=`). **Tab Lịch sử nhận tiền**: kỳ, số tiền, ngày chi, ngân hàng.
5. **`/r/[code]`** (public, server component tối giản + client effect): gọi `POST /public/affiliate/click`, lưu cookie `opc_ref=<MÃ>` `Max-Age = cookie_days × 86400`, `SameSite=Lax`, `Path=/`, rồi `router.replace('/register?ref=MÃ')`. Mã sai định dạng → vẫn chuyển `/register` (không lộ thông tin).
6. **Ô mã giới thiệu** (cả 2 form + SSO hoàn tất): ưu tiên `?ref=` > cookie `opc_ref` > nhập tay; chỉ `A-Z0-9`, in hoa, ≤ 12 (giống prototype); kiểm `GET /public/affiliate/codes/:code?email=` debounce 400ms khi ≥ 4 ký tự và khi email đổi; hợp lệ → "✓ Được giới thiệu bởi <tên>"; lỗi → chữ đỏ dưới ô với đúng 3 thông điệp AF-R04; còn lỗi → nút gửi bị chặn + toast lỗi (AT-AF03). Lỗi 422 path `referralCode` từ server cũng hiện tại ô.
7. **Menu**: mục "Affiliate" sau "Dự án", trước "Gói dịch vụ" (prototype `PN`).
8. File FE ≤ 250 dòng tối ưu, trần 400; screen chỉ orchestrator.

## ACCEPTANCE CRITERIA
- Given TV chưa đóng phí, When mở `/affiliate`, Then thấy "Đóng phí thành viên để nhận link giới thiệu" + "20%" + "120.000đ", không có link/mã (AF-R02, REQ-302).
- Given mở `/r/HAOPC`, When tới form đăng ký, Then ô mã tự điền `HAOPC` và hiện "✓ Được giới thiệu bởi Lê Thu Hà" (AT-AF02, REQ-303).
- Given nhập mã của chính email đang đăng ký, Then "Không thể dùng mã giới thiệu của chính bạn", bấm Đăng ký không gửi request (AT-AF03, REQ-304).
- Given mã của đại lý tạm dừng, Then "Mã giới thiệu đang tạm dừng (đại lý hết hạn phí thành viên)" (AT-AF05).
- Given đại lý chưa khai STK, Then banner "Chưa có số tài khoản nhận hoa hồng."; nhập "nguyễn văn an" → hiển thị "NGUYEN VAN AN", lưu xong banner biến mất (REQ-309, REQ-311).
- Lọc tháng + trang ghi lên URL, F5 giữ nguyên (REQ-311).

## TESTS BẮT BUỘC
- Unit `apps/portal/src/features/affiliate/model.spec.ts` (`REQ-309 toHolder`, `REQ-311 share links`), `features/auth` spec cho ưu tiên `?ref=` > cookie (`REQ-303`).
- MSW `apps/portal/src/mocks/affiliate-handlers.spec.ts` (`REQ-304 3 lý do`, `REQ-302 locked`).
- e2e `e2e/behavior/affiliate-portal.spec.ts` chạy **msw + server** (D-63, cấm nhánh `onServer` làm yếu assertion): `AT-AF02 /r/MÃ tự điền + đăng ký + đóng phí → đại lý thấy khách` (server dùng `payFee`), `AT-AF03 tự giới thiệu chặn form`, `AT-AF05 mã tạm dừng bị từ chối`, `REQ-302 khung khoá`, `REQ-311 tab + phân trang + khai STK`.
- Parity: thêm màn `Portal · Affiliate` vào registry (TIP-V2-307) nếu registry đã có cơ chế; ngưỡng ≤ 3%.

## CONSTRAINTS
- DO NOT: copy code prototype; import nội bộ feature `membership` ngoài `index.ts` công khai; giữ mã giới thiệu trong localStorage (dùng cookie theo `cookie_days`); `any`/`@ts-ignore`.
- REUSE: `@/lib/api-client`, `useUrlParams`, `formatVnd`/`formatDate` (export qua `features/membership/index.ts` nếu chưa có — chỉ thêm dòng), component bảng/phân trang trong `packages/ui`.
- SKIP: Admin (TIP-V2-404); thông báo realtime (đã đi qua chuông có sẵn với type `affiliate`).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 1 (FE ≤ 400, screen orchestrator), 2 (zod parse response qua schema shared), 3 (không import chéo feature).
- [ ] File dùng chung (`nav.ts`, `messages/vi/*.json`, `handlers/index.ts`, `i18n/messages.ts`) chỉ thêm dòng, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + `pnpm e2e` (msw) + `pnpm e2e:server --project behavior -g "Affiliate"` xanh.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-403-DONE <sha>`; report `coding-packs/reports/TIP-V2-403-completion.md`.
