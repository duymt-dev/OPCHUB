# TIP-V2-302: Popup Gói dịch vụ V4, phí không hoàn lại, 6 dịch vụ tư vấn (UP-07 §23.5, NR-R01→R03, NA-19)

## HEADER
- TIP-ID: TIP-V2-302 · Project: OPCHUB · Module: portal/membership + portal/services + portal/auth + portal/community + admin/requests + server account/community/membership-fee/service · Priority: P0 · Depends on: TIP-V2-110 (validate phiếu DN), TIP-V2-106 (lỗi tại ô ở form đăng ký), TIP-V2-204 (khoá quyền menu Dịch vụ) · Estimated: L (14h)
- **Files touched:**
  - Portal popup: `apps/portal/src/features/membership/components/{plan-panel,plan-icons,paywall-gate,pay-details,pay-modal}.tsx` + `.module.css` tương ứng (modify) · `components/plan-hero.tsx`, `components/plan-perks.tsx`, `components/pay-terms.tsx` (create) · `hooks/use-plan-fit.ts` (create: thu nhỏ vừa màn ≥ 1100px) · `model.ts` + `model.spec.ts` (modify: giá V4)
  - `apps/portal/src/features/services/components/service-list.tsx` + `service-list.module.css` (modify: nút "Tư vấn →", tiêu đề "Dịch vụ & chương trình khác")
  - `packages/ui/src/paywall-modal/paywall-modal.tsx` + `.module.css` + `paywall-modal.spec.tsx` (modify: chế độ `fit` không cuộn)
  - `apps/portal/public/sv-hero-v6.png` (create, chép từ `docs/spec/assets/sv-hero-v6.png`)
  - Điều khoản: `apps/portal/src/features/auth/components/{register-personal-form,register-biz-form}.tsx` (modify) · `apps/portal/src/features/community/components/join-modal.tsx` (modify) · `apps/portal/messages/vi/{membership,services,auth,community}.json` (modify)
  - Server lưu vết đồng ý (REQ-013): `packages/db/prisma/schema/account.prisma` (modify: `ConsentKind` thêm `fee_policy`) · migration `<ts>_consent_fee_policy` (**agent chính tạo, `--create-only` + review SQL**) · `apps/server/src/modules/account/repositories/registration.repository.ts` (modify: `TERMS_VERSION`, ghi `fee_policy`) · `packages/shared/src/api/auth.ts` (modify: `agreeTerms: z.literal(true)` cho 2 schema đăng ký) · `packages/shared/src/api-domains/groups.ts` (modify: `joinGroupSchema.agreeRules: z.literal(true)`) · `apps/server/src/modules/community/services/group.service.ts` (modify: ghi consent `fee_policy` qua cổng) · `apps/server/src/modules/membership-fee/services/membership-fee.service.ts` (modify: `confirmTransfer` ghi consent `fee_policy`) · `apps/server/src/modules/account/ports.ts` + `account/index.ts` (modify: cổng `CONSENT_WRITER`)
  - Danh mục 6 dịch vụ: `packages/shared/src/fixtures/prototype-seed.json` (modify: thay `SVC_SEED`, `REQ_SEED` theo prototype ver2) · `packages/db/seed/catalog.ts` + `packages/db/seed/required.ts` (modify: 6 dịch vụ thành seed bắt buộc, upsert theo id) · `packages/db/seed/demo/service.ts` (modify: chỉ còn phiếu mẫu) · `packages/shared/src/mock-data/domains/services-admin.ts` (modify nếu id dịch vụ đổi)
  - Mock: `apps/portal/src/mocks/handlers/{membership,account,community,register}.ts` (modify: nhận cờ đồng ý)
  - Test: `apps/server/test/account/register.int.spec.ts`, `apps/server/test/community/groups.int.spec.ts`, `apps/server/test/membership-fee/membership.int.spec.ts`, `apps/server/test/service/service.int.spec.ts` (modify) · `e2e/behavior/{membership,services,auth-flows,community}.spec.ts` (modify) · `e2e/behavior/popup-v4.spec.ts` (create)
- **Parallel-safe with:** 301, 303, 305, 306. `sequential, shares features/auth/* with TIP-V2-106 (trước) và TIP-V2-403 (sau: mã giới thiệu)`; `shares registration.repository.ts + api/auth.ts with TIP-V2-402`; `shares membership-fee.service.ts with TIP-V2-108/301/401`.
- **Phase / nhánh:** V2-P3, `feature/V2-P3-v2-features`

## CONTEXT
- Đặc tả: §23.5 (UP-07 V4), §23.3 LK-08/LK-09, §23.7 AT-LK04/AT-LK05, §22.5 NR-R01→R03, §22.6 AT-NR01, §8.21 NA-19, UAT-06→08. REQ-391, REQ-381/382/383, REQ-219, REQ-408, REQ-409, REQ-013, REQ-020. D-54, D-58, D-60.
- Prototype `docs/spec/index.html`: khối `data-sv-pop` (lưới `data-m="svgrid"`, `svhero`, `svprice`); `componentDidMount._svFit` thu nhỏ popup bằng `transform: scale` khi `innerWidth ≥ 1100` (W = min(95vw,1440), H = 95vh). Dưới 1100 thì 1 cột, cuộn dọc. Chuỗi: "Kết nối, học hỏi, phát triển cùng cộng đồng OPC", "Ưu đãi 75%", "50.000đ / tháng", "Thanh toán theo năm: 600.000đ", "200.000đ/tháng (Giá niêm yết)", "Đăng ký thành viên ngay · 600.000đ/năm", "Thanh toán an toàn (Vietcombank, ví điện tử…)", "Tự động gia hạn 12 tháng (Dễ dàng quản lý)", "Hỗ trợ 24/7 Qua chat và email", "Dịch vụ & chương trình khác", "Tư vấn theo nhu cầu cho cá nhân, tổ chức và doanh nghiệp.", nút "Tư vấn →". Khung "**Điều kiện thanh toán:** … Phí **không hoàn lại** …" trong hộp chuyển khoản. Ô đồng ý ở đăng ký cá nhân, DN và khi tham gia cộng đồng (xem 3 câu ở mục Business Rules).
- `SVC_SEED` ver2: `comm` Cộng đồng & Kết nối · `train` Đào tạo & Ươm mầm OPC · `tools` Công cụ & Giải pháp số · `b2b` Hợp tác & Dự án · `org` Chương trình dành cho tổ chức · `event` Sự kiện & Tài trợ (thay 6 id cũ `prov, uni, ai30, tools, event, b2b`). `REQ_SEED` ver2 dùng `train, org, org, tools, b2b`.
- Hiện trạng code: `PlanPanel` + `ServiceList` theo prototype cũ, giá "≈ x/tháng". `Consent` chỉ có `terms`, `privacy` (`TERMS_VERSION='2026-10'`). Đăng ký và tham gia nhóm chưa gửi cờ đồng ý lên server. Dịch vụ chỉ có trong seed demo, gated `FEATURE_SERVICES` (D-51: flag chỉ là công tắc khẩn cấp).
- Mẫu: `apps/portal/src/features/membership/components/plan-panel.tsx`, `packages/ui/src/paywall-modal/`, `registration.repository.ts` (consent `createMany`).

## APPLICABLE STANDARDS
[ui-parity](../standards/frontend/ui-parity.md) · [antd-ui](../standards/frontend/antd-ui.md) · [nextjs-structure](../standards/frontend/nextjs-structure.md) · [data-state](../standards/frontend/data-state.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [prisma-migrations](../standards/database/prisma-migrations.md) · [testing](../standards/testing/testing.md)

## TASK
Dựng lại popup Gói dịch vụ theo V4: cột trái là gói thành viên hệ thống với giá D-58, cột phải là 6 dịch vụ có nút "Tư vấn →", vừa một màn 1366×768 không cuộn. Đưa câu "không hoàn lại" vào 3 ô đồng ý (đăng ký cá nhân, DN, tham gia cộng đồng) và khung "Điều kiện thanh toán" trong hộp chuyển khoản. Server lưu vết đồng ý theo phiên bản (REQ-013). Thay danh mục dịch vụ bằng 6 dịch vụ V4 trong seed bắt buộc.

## SPECIFICATIONS
### Business Rules
1. **Cột trái** (§23.5): logo, tiêu đề, ảnh hero `sv-hero-v6.png`, 3 lợi ích, giá "50.000đ / tháng" + nhãn "Ưu đãi 75%" + "Thanh toán theo năm: 600.000đ" + "200.000đ/tháng (Giá niêm yết)" gạch ngang, 6 quyền lợi, 5 ô tính năng, nút "Đăng ký thành viên ngay · 600.000đ/năm", 3 cam kết. Số tiền thu vẫn là `amount` từ `/me/membership` (600.000). Giá tháng và giá niêm yết là hằng hiển thị trong `model.ts`, không lưu DB (D-58).
2. **LK-09 / REQ-409**: nút "Đăng ký thành viên ngay" mở hộp chuyển khoản (luồng LK-02 hiện có, `p.toPay(true)`). TV đã đóng phí vẫn thấy dòng "✓ Thành viên đến …" như hiện tại.
3. **Cột phải** (D-60, LK-08): tiêu đề "Dịch vụ & chương trình khác". Mỗi dịch vụ đang bật có nút "Tư vấn →" mở form tư vấn hiện có và tạo phiếu `YC-xxxx` tại Admin › Dịch vụ, đúng `serviceId`/tên dịch vụ (AT-LK05). Danh mục đọc `GET /services` (enabled, sort). Admin › Dịch vụ › Danh mục quản lý 6 dịch vụ (màn hiện có `catalog-tab.tsx`, không thêm màn).
4. **Hiển thị** (§23.5, AT-LK04, KT-04): viewport ≥ 1100px thì popup 2 cột, `use-plan-fit` đo `scrollHeight` rồi scale tối đa 3 vòng như prototype để vừa 95% chiều cao, `overflow: hidden`. Dưới 1100px thì 1 cột, ẩn hero, cuộn dọc. Ngưỡng chữ nhỏ nhất KT-04 để Kiến trúc sư quyết (ghi câu hỏi). Tạm theo prototype: không chặn tỉ lệ dưới.
5. **NR-R02 điểm 1**, ô đồng ý (copy đúng prototype):
   - Cá nhân: "Tôi đồng ý với Điều khoản sử dụng, Chính sách bảo mật và Chính sách phí thành viên của OPC Hub (phí 600.000đ/năm, không hoàn lại sau khi thanh toán)."
   - DN: giữ câu prototype "Tôi xác nhận là người đại diện hợp pháp và đồng ý với Điều khoản sử dụng của OPC Hub." và **thêm** cụm phí không hoàn lại như câu cá nhân (prototype DN thiếu cụm này, NR-R02 bắt buộc; xem Câu hỏi).
   - Tham gia cộng đồng: "Tôi đồng ý tuân thủ nội quy cộng đồng và chính sách phí thành viên (600.000đ/năm, không hoàn lại sau khi thanh toán)".
   - Chưa tích → chặn gửi + báo tại ô (theo chuẩn của TIP-V2-106).
6. **NR-R02 điểm 2**: hộp chuyển khoản có khung "Điều kiện thanh toán:" đúng câu prototype. Bấm "Tôi đã chuyển khoản" đồng nghĩa với đồng ý, server ghi consent `fee_policy`.
7. **REQ-013 lưu vết**: thêm `ConsentKind.fee_policy`, `TERMS_VERSION` mới (VD `2026-10-v36`). Đăng ký (OTP verify, cả SSO hoàn tất) ghi `terms`, `privacy`, `fee_policy`. Tham gia nhóm và `transfer-confirm` ghi `fee_policy` nếu user chưa có bản ghi cùng version (một INSERT … WHERE NOT EXISTS). Server từ chối 400 nếu body thiếu `agreeTerms: true` / `agreeRules: true` (test âm). community/membership-fee ghi consent qua cổng `CONSENT_WRITER` của account (không import chéo repository).
8. **NR-R01 / D-54**: rà để chắc chắn không còn endpoint, nút hay chuỗi "hoàn tiền" hoặc "hoàn phí" (grep `refund|hoàn tiền|hoàn phí` = 0 ngoài tài liệu).
9. **NA-19 / REQ-219** (kiểm, không đổi logic): nội dung `OPCHUB [Mã TV] [SĐT]` không dấu, không đổi giữa các lần mở, QR VCB 1203132809, 600.000đ. Thêm test nếu thiếu.
10. **Danh mục dịch vụ seed bắt buộc**: 6 dịch vụ V4 upsert theo id ở `seedRequired` (mọi môi trường, D-60). Phiếu demo giữ ở seed demo. `FEATURE_SERVICES` mặc định bật hoặc bỏ gate theo D-51 (ghi lại lựa chọn trong report).

### Data / Migration
- `ALTER TYPE consent_kind ADD VALUE 'fee_policy'`. Migration do agent chính tạo, `--create-only` + review SQL. Không đổi bảng `services` (id text sẵn có).

## ACCEPTANCE CRITERIA
- Given TV chưa đóng phí mở Portal ở 1366×768, Then popup V4 hiện đủ 2 cột, `document.scrollingElement` và popup không có thanh cuộn (AT-LK04, REQ-391).
- Given 390px, Then popup 1 cột, cuộn dọc, không tràn ngang (REQ-391, UAT-31).
- Given bấm "Tư vấn →" ở "Công cụ & Giải pháp số" rồi gửi form hợp lệ, Then Admin › Dịch vụ có phiếu mới trạng thái Mới với tên dịch vụ "Công cụ & Giải pháp số" (AT-LK05, LK-08, REQ-408).
- Given bấm "Đăng ký thành viên ngay · 600.000đ/năm", Then mở hộp chuyển khoản, nội dung `OPCHUB TVxxxxxx 09…` (LK-09, UAT-08, REQ-219).
- Given form đăng ký (cá nhân, DN) và form tham gia cộng đồng, Then thấy "600.000đ/năm, không hoàn lại sau khi thanh toán"; hộp chuyển khoản có "Điều kiện thanh toán" + "không hoàn lại" (AT-NR01, REQ-382).
- Given đăng ký + OTP thành công, Then `consents` có 3 dòng `terms|privacy|fee_policy` cùng version mới (REQ-013). Given POST đăng ký thiếu `agreeTerms`, Then 400 (test âm).
- Popup vẫn không đóng được khi chưa đóng phí; vẫn Tư vấn được + Đăng xuất (UAT-06/07, REQ-020).

## TESTS BẮT BUỘC
- Unit `apps/portal/src/features/membership/model.spec.ts`: `REQ-391 giá V4 50.000đ/tháng, niêm yết 200.000đ, 75%`. `packages/ui/src/paywall-modal/paywall-modal.spec.tsx`: `REQ-391 chế độ fit không cuộn`.
- Int: `register.int.spec.ts` `REQ-013 REQ-382 lưu consent fee_policy + version`, `REQ-382 thiếu agreeTerms → 400`; `groups.int.spec.ts` `REQ-382 tham gia nhóm ghi consent / thiếu agreeRules → 400`; `membership.int.spec.ts` `REQ-382 transfer-confirm ghi consent`, `REQ-219 nội dung CK ổn định`; `service.int.spec.ts` `REQ-408 6 dịch vụ V4 từ seed bắt buộc`.
- e2e `e2e/behavior/popup-v4.spec.ts` (msw + server, viewport 1366×768): `AT-LK04 không thanh cuộn`, `AT-LK05 Tư vấn → Công cụ & Giải pháp số → phiếu ở Admin`, `REQ-409 Đăng ký thành viên ngay → hộp CK`, `AT-NR01 câu không hoàn lại ở đăng ký + CK`. Sửa `membership.spec.ts`, `services.spec.ts`, `auth-flows.spec.ts`, `community.spec.ts` theo copy mới. Không có nhánh `onServer` làm yếu assertion (D-63).

## CONSTRAINTS
- DO NOT: copy code prototype; hard-code giá trong component (để ở `model.ts`); lưu đồng ý chỉ ở client; thêm chức năng hoàn phí.
- REUSE: `ConsultForm`, `RequestDone`, `PayModal`, `PaywallModal`, `useServices`, API `/services`, `/service-requests`.
- SKIP: mã giới thiệu trên form đăng ký (TIP-V2-403); baseline parity màn popup (TIP-V2-307 chụp lại).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 1 (FE ≤ 250 dòng/file, popup chỉ là orchestrator), luật 2 (body parse zod `packages/shared`), luật 3 (feature FE không import nội bộ feature khác — `services` qua `index.ts`), luật 9 (tiền số nguyên).
- [ ] i18n `messages/vi/*.json` chỉ thêm hoặc sửa khoá, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + `pnpm test:int` + `pnpm e2e` msw và server; parity P-79→P-88 đo lại tạm (baseline mới ở 307).
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-302-DONE <sha> — <N> test passed`, viết `coding-packs/reports/TIP-V2-302-completion.md`.
