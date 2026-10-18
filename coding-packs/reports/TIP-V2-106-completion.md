# TIP-V2-106: Báo lỗi tại ô, đăng ký không nuốt lỗi, toast giữ lý do server, hết lỗi hydration (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. BUG-022, BUG-009, BUG-024, BUG-040, TD-036. Không migration, không đổi API.
> V2Q mới: V2Q-77 → V2Q-80.
> Commit: `16aa181` (ui + helper), `54d5d52` (đăng ký), `27cdfbc` (hydration), `a2552f5` (form Portal),
> `9d23d58` (form Admin), `2535e61` (toast phí/NĐT), `73fe1ac` (e2e) + commit báo cáo này.

## Đã làm
- **`packages/ui/src/form-errors/`** (mới): `field-errors.ts` (`FieldErrors`, `fieldErrorsFrom(fields, map?)` tra path lồng
  dài → ngắn, bỏ path ngoài map; `firstErrorKey`; `focusFirstInvalid(root, errorId?)` — nhóm thì focus con đầu),
  `field-error.tsx` (`<FieldError id text alert>`, `FieldErrorOf`, `invalidProps`, context `FieldA11yProvider` để ô con
  tự gắn `aria-invalid`/`aria-describedby`), `use-field-errors.ts` (`useFieldErrors`: `show` đặt mọi lỗi + hẹn focus ô
  đầu, `clear` xoá lỗi ô vừa sửa, `err(k)` → props; `role=alert` chỉ ở lỗi đầu; `translateErrors`).
  `index.ts` chỉ thêm 1 dòng export. `globals.css` (chỉ thêm cuối): viền `#ff4d4f` (colorError) cho
  `[aria-invalid=true]`, khung bọc `[data-invalid-frame]` (SĐT, mật khẩu, soạn thảo, ô tiền tệ), nhóm lựa chọn viền ngoài.
- `Field` (register) nhận `error?`; `TextInput`/`SelectInput`/`PasswordField`/`PhoneField` đọc context a11y;
  `RolePicker`/`GroupPicker` nhận `error?`; `SubmitButton` nhận `disabled`; `RichTextField` nhận `errorId?`.
- **`src/lib/api-errors.ts`** (Portal + Admin): `messageOf(e, fallback)`, `fieldsOf(e, map)`.
  **`src/lib/use-form-errors.ts`**: `check(errors)` (đánh dấu mọi ô + toast chữ lỗi đầu — V2Q-77),
  `fromApi(e, map, fallback)` (có `fields` → lỗi tại ô + toast `errors.fixFields`; không → toast `e.message`).
  `messages/vi/common.json` chỉ thêm `errors.fixFields`, `errors.failed`.
- **Mọi `validate*` trả map** (rỗng = hợp lệ, thứ tự khoá = thứ tự kiểm prototype, khoá i18n cũ giữ nguyên):
  Admin `validateEvent`, `validateGroup` (`duplicate` → ô `province`), `validateCampaign`, `validateCategory`,
  `personaError`, `scriptError`; Portal `validatePersonal`/`validateBusiness` (mới `auth/register-validation.ts`,
  thay 2 `firstError`), `validateSubmit`, `validateInterest`, `consultErrors` (giữ `firstError` suy ra từ map).
  Mỗi form khai báo map path server → ô (`EVENT_FIELD_MAP`, `GROUP_FIELD_MAP`, `CAMPAIGN_FIELD_MAP`,
  `CATEGORY_FIELD_MAP`, `PERSONA/SCRIPT_FIELD_MAP`, `REGISTER_FIELD_MAP` gồm `business.taxCode → tax`,
  `PROJECT_FIELD_MAP` gồm `funding.amount`, `repo.url`, `INTEREST_FIELD_MAP`, `CONSULT_FIELD_MAP` khớp V2Q-74).
- **Đăng ký (BUG-009)**: `use-register-submit.ts` bọc `try/catch` — 409/400 có `fields` → lỗi tại ô (email/SĐT/MST),
  không mở OTP; lỗi khác → toast thông điệp server; khoá nút khi gửi. Bỏ `void f.submit()` nuốt lỗi.
  MSW `register.ts`: 400 kèm `fields`; email TK demo đã có → 409 `fields[{path:'email'}]` như `register.service`.
- Mutation lưu (`useSaveEvent`, `useSaveGroup`, `useSaveProject`, `useSendInterest`, tạo chiến dịch, lĩnh vực) bỏ toast
  ở hook — form tự xử lý (`fromApi`), không toast trùng.
- **BUG-024**: `use-fee-actions.ts`, `use-investors.ts` → `messageOf(e, t('failed'))`. Rà: không còn `toast(t('failed'))`
  bỏ `e`. MSW Admin: cookie `opchub-mock-fee-conflict=1` → 409 `Phí vừa được cập nhật bởi thao tác khác` (V2Q-78).
- **Hydration (BUG-040, TD-036)**: `LoginHero` Portal + Admin `useState(0)`; `useEffect` đặt `Date.now()` sau mount
  (`setTimeout 0`) + `setInterval` 7 s. Không dùng `suppressHydrationWarning`.
- Kích thước: `event-form-fields.tsx` 259 → 196 (tách `event-place-fields.tsx` 88); `RepoDetail`, `ContactPair`,
  `TimingFields`, `ColorPicker`/`ScopeChecks` tách để qua `max-lines-per-function`. File lớn nhất bị đụng: 225 dòng.

## Test (số thật)
- `pnpm lint` 8/8 (chỉ 12 warning `<img>` có sẵn); `pnpm typecheck` 8/8; `pnpm depcheck`: no dependency violations
  (551 modules). e2e `tsc --noEmit` + eslint `behavior` sạch.
- `pnpm test`: ui 30/30, admin 133/133, portal 105/105, server 76/76, shared 76/76, integrations 25 + 2 skip.
  Mới: `field-errors.spec.ts` (`BUG-022 ánh xạ fields lồng sang khoá ô`, `bỏ path không có trong map`, dịch giữ thứ
  tự, focus ô đầu); `events` `BUG-022 validateEvent trả mọi lỗi`; `groups`, `marketing`, `settings`, `bots` tương tự;
  `projects` `BUG-022 validateSubmit…`, `UAT-19 validateInterest thiếu SĐT + đơn vị cùng lúc`; `services`
  `UAT-21 consultErrors DN thiếu tên DN + loại hình`; `register-validation.spec.ts` (UAT-01 cá nhân/DN);
  MSW `BUG-009 UAT-02 email đã có TK → 409 fields email`, `BUG-024 cookie giả lập 409`.
- Int server (opchub_test): **290/290** (67 file) — TIP không đổi server.
- e2e MSW (build riêng `.next-106`, Portal 3310 / Admin 3311→3315 sau khi tách hàm / proto 4810):
  toàn bộ behavior **134 passed, 1 failed** ở cả hai lượt; lượt 1 `events.spec.ts › lọc chip` (flaky đã biết từ
  TIP-110, chạy lại `--repeat-each=2` 22/22), lượt 2 `auth-flows › UAT-11 đặt lại mật khẩu` treo 2 phút khi chạy song
  song (chạy riêng `--repeat-each=3 --workers=1` 3/3; spec không bị TIP đụng). Mới: `UAT-01 BUG-022 đăng ký trống →
  mọi ô bắt buộc aria-invalid`, `BUG-009 UAT-02 email trùng → lỗi tại ô Email`, `BUG-022 tạo sự kiện trống → 4 ô đánh
  dấu` (kiểm `aria-describedby` → chữ lỗi, 1 `role=alert`, focus Tên), `BUG-022 tạo nhóm trống`, `UAT-21 BUG-022 tư
  vấn DN thiếu trường`, `BUG-024 lỗi 409 hiện lý do server`, `hydration.spec.ts`. Không nhánh `onServer` làm yếu
  assertion (BUG-024 chỉ khác cách tạo 409, cùng assertion).
- **Hydration — lưu ý trung thực (V2Q-80)**: spec MSW xanh cả với bản build TRƯỚC TIP (đã thử): bản MSW không SSR hero.
  Build `NEXT_PUBLIC_API_MOCKING=off` có SSR hero = trích dẫn đầu tiên; bản sau TIP chạy probe lệch 3 giờ / 7 s / 14 s:
  không có lỗi React. Chưa đo được bản trước TIP ở chế độ server (cổng thử bị chiếm, xem dưới).
- **Parity** (so cùng prototype, bản HEAD `37a6731` build riêng `.next-106base` vs bản TIP): 68 ảnh. Không đổi
  (Δ 0,00) mọi màn mặc định: A-10…A-16, A-18, A-19, D-28, D-30, D-36…D-40, D-46…D-49, D-67, D-68, D-69, D-80,
  P-70…P-73, P-75…P-77. Giảm: A-17 (9,39 → 3,00 / 14,93 → 10,13), A-20 (9,35 → 5,40 / 16,29 → 12,84). Tăng ở màn
  "báo lỗi" (thiết kế mới có chữ lỗi dưới ô, prototype chỉ toast): D-29 0,71 → 2,39 @1440, 0,18 → 3,97 @390;
  P-74 0,99 → 1,94 @1440, 0,45 → 3,78 @390 (vượt 3% ở 390 — trạng thái lỗi, không phải mặc định; AC chỉ yêu cầu mặc
  định). A-12…A-19 và D-46…D-49 @1440, D-67/68/69 @390 đã vượt 3% ở HEAD trước TIP (không do TIP). Không commit file
  kết quả parity (đã `git checkout` + `git clean` `coding-packs/reports/ui-parity`).

## e2e server: CHƯA chạy
Không dựng/dừng api 4000, Next 3200/3201/3220/3222. **Cần agent chính**: rebuild `.next-server*` Portal + Admin, chạy
`pnpm e2e:server --project behavior auth-flows admin-events admin-groups admin-fees services hydration` (+ marketing,
settings, bots, projects). Kỳ vọng: 409 email trùng từ `register.service` (an.nguyen@mediasoft.vn có trong seed),
`hydration.spec.ts` là bài kiểm thật của BUG-040 ở chế độ server.

## Ngoài phạm vi / ghi chú
- `sso-complete-screen.tsx` vẫn toast lỗi cũ và `void submit()` (không nằm trong TIP); `PhoneRow`/`GroupsRow` cho
  `err` tuỳ chọn để màn này chạy như cũ.
- Tiến trình còn lại do builder tạo nhưng chưa dừng được (TaskStop trên Windows chỉ dừng `pnpm`, tiến trình con
  `next start` còn sống; lệnh dừng PID bị chặn bởi quyền): `next start` cổng **3310, 3311, 3312, 3313, 3315, 3320,
  3321** (thư mục build đã xoá, chỉ còn trong bộ nhớ). Cần agent chính/người dùng dừng (vd. theo cổng).
- Thư mục build tạm `.next-106*` đã xoá; script/log tạm ở `D:/opchub-local/v2/tmp106/` (ngoài repo).
