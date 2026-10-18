# TIP-V2-106: Báo lỗi tại ô (ApiError.fields), đăng ký không nuốt lỗi, toast giữ lý do server, hết lỗi hydration màn đăng nhập (BUG-022, BUG-009, BUG-024, BUG-040, TD-036)

## HEADER
- TIP-ID: TIP-V2-106 · Project: OPCHUB · Module: FE Portal + Admin (form), `packages/ui` · Priority: P1 · Depends on: — (nên merge sau TIP-V2-102 vì cùng sửa `event-form.tsx`, `group-form.tsx`) · Estimated: L (12h)
- **Files touched:**
  - Dùng chung: `packages/ui/src/form-errors/field-errors.ts` + `field-errors.spec.ts` (create: `FieldErrors = Record<string,string>`, `fieldErrorsFrom(fields, map?)`, `focusFirstInvalid(root)`), `packages/ui/src/form-errors/field-error.tsx` + `field-error.module.css` (create: `<FieldError id text/>`), `packages/ui/src/auth/register/fields.tsx` (modify: `Field` nhận `error?`, gắn `aria-invalid`/`aria-describedby` cho con), `packages/ui/src/index.ts` (modify — chỉ thêm dòng export)
  - Portal: `apps/portal/src/lib/api-errors.ts` (create: `messageOf(e, fallback)`, `fieldsOf(e)`), `features/auth/hooks/use-personal-form.ts`, `use-biz-form.ts`, `use-register-common.ts` (modify: `validate*` trả mọi lỗi, bắt `ApiError`), `features/auth/components/register-personal-form.tsx`, `register-biz-form.tsx`, `register-common-fields.tsx` (modify: truyền `error`), `features/auth/components/login-hero.tsx` (modify: hydration), `features/projects/model.ts` (modify: `validateSubmit`/`validateInterest` trả map), `features/projects/components/project-form.tsx`, `invest-modal.tsx`, `form-basic.tsx` (modify), `features/services/model.ts` (modify: `consultErrors`), `features/services/hooks/use-consult-form.ts`, `components/consult-sections.tsx`, `consult-form.tsx` (modify)
  - Admin: `apps/admin/src/lib/api-errors.ts` (create), `features/auth/components/login-hero.tsx` (modify: hydration), `features/events/model.ts`, `events/components/event-form.tsx`, `event-form-fields.tsx` (modify), `features/groups/model.ts`, `groups/components/group-form.tsx`, `group-form-fields.tsx` (modify), `features/marketing/model.ts`, `marketing/components/campaign-form.tsx`, `campaign-form-fields.tsx` (modify), `features/settings/model.ts`, `settings/hooks/use-categories.ts`, `settings/components/category-form.tsx` (modify), `features/bots/model.ts`, `bots/components/persona-drawer.tsx`, `persona-fields.tsx`, `script-drawer.tsx` (modify), `features/fees/hooks/use-fee-actions.ts`, `features/investors/hooks/use-investors.ts` (modify: toast giữ lý do)
  - i18n: `apps/{portal,admin}/messages/vi/common.json` (modify — chỉ thêm `errors.fixFields` "Vui lòng kiểm tra các trường được đánh dấu")
  - Test: unit `apps/admin/src/features/{events,groups,marketing,settings,bots}/model.spec.ts`, `apps/portal/src/features/{projects,services}/model.spec.ts` (modify); e2e `e2e/behavior/auth-flows.spec.ts`, `admin-events.spec.ts`, `admin-groups.spec.ts`, `admin-fees.spec.ts`, `services.spec.ts` (modify), `e2e/behavior/hydration.spec.ts` (create)
- **Parallel-safe with:** TIP-V2-101, 103, 107 (trừ `use-investors.ts`), 109, 112, 114. `sequential, shares event-form.tsx + group-form.tsx with TIP-V2-102` (106 sau 102). `sequential, shares use-investors.ts with TIP-V2-107` (107 trước, 106 rebase). `sequential, shares consult-*.tsx + services/model.ts with TIP-V2-110`. `sequential, shares campaign-form*.tsx + marketing/model.ts with TIP-V2-114`. `sequential, shares form-basic.tsx/project-form.tsx with TIP-V2-102/113`. `shares packages/ui/src/index.ts with TIP-V2-102/105` (chỉ thêm dòng).
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes` (nhánh con `feature/V2-P1-106-form-errors`)

## CONTEXT
- Đặc tả §6 (vòng đời): "Không hợp lệ / trùng email, SĐT, MST → **báo lỗi tại trường**, quay lại form"; §15 NFR WCAG 2.1 AA; UAT-01/02/19/21.
- Audit: BUG-022 (chỉ toast lỗi đầu tiên, không `aria-invalid`, `ApiError.fields` không ai đọc; 11 hàm `validate*`/`firstError`), BUG-009 (`void f.submit()` nuốt lỗi 409/400 ở `use-personal-form.ts:32-44`, `use-biz-form.ts:42-58`), BUG-024 (`toast(t('failed'))` bỏ `e.message` ở `use-fee-actions.ts:31`, `use-investors.ts:53`), BUG-040/TD-036 (`login-hero.tsx:18` `useState(() => Date.now())` → React #418 khi đồng hồ lệch; Admin có cùng mẫu).
- Server đã trả `fields` cho 400 zod và 409 trùng (`register.service.ts:160-166` path `email`/`phone`; MST trùng `biz-lookup.service.ts`). `ApiError` ở `apps/{portal,admin}/src/lib/api-client.ts:8-19` đã có `fields`.
- Danh sách hàm cần đổi: Admin `validateEvent` (`events/model.ts:124`), `validateGroup` (`groups/model.ts:115`), `validateCampaign` (`marketing/model.ts:108`), `validateCategory` (`settings/model.ts:38`), `personaError`/`scriptError` (`bots/model.ts:102,148`); Portal `firstError` ×2 (auth hooks), `validateSubmit`/`validateInterest` (`projects/model.ts:181,200`), `firstError` (`services/model.ts:71`).

## APPLICABLE STANDARDS
[antd-ui](../standards/frontend/antd-ui.md) · [data-state](../standards/frontend/data-state.md) · [nextjs-structure](../standards/frontend/nextjs-structure.md) · [ui-parity](../standards/frontend/ui-parity.md) (≤ 3%) · [code-structure](../standards/global/code-structure.md) · [testing](../standards/testing/testing.md)

## TASK
Đổi mọi form có kiểm lỗi sang báo **tại ô** (đánh dấu mọi ô sai cùng lúc, `aria-invalid`, chữ lỗi dưới ô, focus ô đầu), gộp cả lỗi `fields` từ server. Đăng ký bắt lỗi API. Toast thao tác Admin dùng thông điệp server. Màn đăng nhập không còn lỗi hydration.

## SPECIFICATIONS
### Business Rules
1. **Mô hình lỗi**: mỗi `validate*` trả `Partial<Record<FieldKey, ErrorKey>>` (rỗng = hợp lệ) — kiểm **tất cả** trường, không dừng ở lỗi đầu; giữ thông điệp hiện có (khoá i18n cũ) và thứ tự prototype dùng để chọn ô focus đầu tiên. Ràng buộc chéo (VD `duplicate` tỉnh của nhóm) gắn vào ô liên quan (`province`).
2. **Hiển thị**: ô sai có viền đỏ (token `colorError` của theme), `aria-invalid="true"`, `aria-describedby` trỏ `<FieldError>` (role `alert` chỉ cho lỗi đầu tiên để trình đọc màn hình không đọc lặp). Sửa ô → xoá lỗi ô đó. Bấm Lưu khi có lỗi: focus ô đầu tiên + **một** toast `errors.fixFields` (giữ hành vi toast của prototype cho parity, nhưng không còn là kênh duy nhất).
3. **Lỗi server**: `fieldsOf(e)` ánh xạ `ApiError.fields[].path` → khoá ô (map đường dẫn lồng: `phone.number` → `phone`, `business.taxCode` → `tax`…; mỗi form khai báo map nhỏ). Có `fields` → hiện tại ô + toast `errors.fixFields`; không có `fields` → toast `e.message` (BUG-024).
4. **Đăng ký (BUG-009)**: `submit` bọc `try/catch`; 409 email/SĐT/MST → lỗi tại ô tương ứng (`email`, `phone`, `tax`) theo `fields`; lỗi khác → toast `e.message`. Nút gửi khoá khi đang gửi. Thay `onClick={() => void f.submit()}` bằng handler đã bắt lỗi.
5. **Toast Admin (BUG-024)**: `use-fee-actions.ts`, `use-investors.ts` dùng `messageOf(e, t('failed'))` (`ApiError` → `e.message`). Rà các hook Admin/Portal còn `toast(t('failed'))` không nhận `e` — hiện chỉ 2 chỗ trên (các chỗ khác đã dùng `e.message`).
6. **Hydration (BUG-040, TD-036)**: `LoginHero` (Portal + Admin) khởi tạo `now = 0` (trích dẫn đầu tiên, giống SSR), `useEffect` đặt `Date.now()` sau mount rồi `setInterval` 7 s. Không dùng `suppressHydrationWarning` để che.
7. Kích thước file: các file form > 250 dòng sau khi sửa (`event-form-fields.tsx` 259 dòng) phải tách (VD `event-place-fields.tsx`) — luật 1.

### Validation
- Logic kiểm ở `model.ts` (hàm thuần, có unit test); component chỉ hiển thị. Không đổi hợp đồng API.

## ACCEPTANCE CRITERIA
- Given form Tạo sự kiện trống, When bấm Lưu, Then các ô Tên, Ngày, Địa điểm, Địa chỉ cùng có `aria-invalid="true"` và chữ lỗi, focus ở ô Tên (BUG-022, §6).
- Given tương tự cho Tạo nhóm, Chiến dịch, Lĩnh vực, Persona, Kịch bản, Dự án, Quan tâm đầu tư, Tư vấn, Đăng ký cá nhân/DN → mọi ô thiếu được đánh dấu cùng lúc (BUG-022, UAT-01, UAT-19, UAT-21).
- Given đăng ký bằng email đã có, When server trả 409 `fields[{path:'email'}]`, Then ô Email hiện "Email đã được sử dụng cho tài khoản khác", không mở OTP (BUG-009, §6).
- Given server trả 400 có `fields` ở form Admin, Then lỗi hiện tại ô tương ứng (BUG-022).
- Given ghi nhận phí bị 409, Then toast hiện đúng thông điệp server (BUG-024).
- Given đồng hồ trình duyệt lệch 3 giờ, When mở `/login` (Portal, Admin), Then không có `pageerror` React #418 (BUG-040, TD-036).
- Parity các màn form không vượt ngưỡng 3% ở trạng thái mặc định (ui-parity).

## TESTS BẮT BUỘC
- Unit `packages/ui/src/form-errors/field-errors.spec.ts`: `BUG-022 ánh xạ fields lồng sang khoá ô`, `bỏ path không có trong map`.
- Unit model (sửa test cũ theo kiểu trả map + thêm): `events/model.spec.ts` `BUG-022 validateEvent trả mọi lỗi`, tương tự `groups`, `marketing`, `settings`, `bots`, Portal `projects` (`UAT-19 validateInterest thiếu SĐT + đơn vị cùng lúc`), `services` (`UAT-21 consultErrors DN thiếu tên DN + loại hình`).
- E2E (msw + server, cùng assertion — D-63): `auth-flows.spec.ts` `UAT-01 BUG-022 đăng ký trống → mọi ô bắt buộc aria-invalid`, `BUG-009 UAT-02 email trùng → lỗi tại ô Email` (MSW: handler đăng ký trả 409 `fields` cho email cố định đã tồn tại — sửa `apps/portal/src/mocks/handlers/register.ts`); `admin-events.spec.ts` `BUG-022 tạo sự kiện trống → 4 ô đánh dấu`; `admin-groups.spec.ts` `BUG-022 tạo nhóm trống`; `services.spec.ts` `UAT-21 BUG-022 tư vấn DN thiếu trường → đánh dấu tại ô`; `admin-fees.spec.ts` `BUG-024 lỗi 409 hiện lý do server` (msw: route trả 409; server: ghi nhận 2 lần cùng TV đã hết điều kiện).
- E2E `e2e/behavior/hydration.spec.ts`: `BUG-040 TD-036 /login Portal và Admin với đồng hồ lệch 3 giờ không có React #418` (`page.clock.install({ time: Date.now() + 3h })`, lắng nghe `pageerror`).
- Chạy parity các màn form liên quan (`PARITY_IDS` của Tạo sự kiện, Tạo nhóm, Đăng ký) — ghi kết quả vào report.

## CONSTRAINTS
- DO NOT: đổi thông điệp lỗi đã có (giữ khoá i18n); đổi hợp đồng API; dùng `suppressHydrationWarning`; thêm thư viện form mới (react-hook-form…) — dùng state hiện có; import chéo giữa feature (helper chung đặt ở `packages/ui` hoặc `src/lib`).
- REUSE: `ApiError.fields`, `Field` (`packages/ui/src/auth/register/fields.tsx`), theme token AntD, i18n hiện có.
- SKIP: số liệu cứng ở login hero (BUG-029, TIP-V2-305); validate server phiếu DN (TIP-V2-110); `prompt()` liên kết (TIP-V2-113).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 1 (FE tối ưu 150–250 dòng, trần 400; tách khi vượt), luật 3 (feature không import nội bộ feature khác), luật 13 (test file riêng), WCAG (`aria-invalid`, `aria-describedby`).
- [ ] File dùng chung chỉ thêm dòng (`packages/ui/src/index.ts`, `messages/vi/common.json`), giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm e2e` (msw) + `pnpm e2e:server --project behavior` xanh; parity màn form ≤ 3%.
- [ ] `git commit -- <paths>` (không `-A`), `git status --short` sạch; báo `TIP-V2-106-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-106-completion.md`.
