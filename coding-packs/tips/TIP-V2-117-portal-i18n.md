# TIP-V2-117: Portal đa ngôn ngữ — dịch đủ 9 ngôn ngữ

## HEADER
- TIP-ID: TIP-V2-117 · Project: OPCHUB · Module: Portal i18n (`apps/portal`) + `packages/shared/fixtures` + `packages/ui`
- Depends on: None (nền `dev` @ `224d07cf`) · Priority: P1 · Estimated: XL (16–24h, phần lớn là dịch)
- Nhánh: `feature/i18n-languages` (worktree `D:\CODING\OPCHUB\wt-login-sso`), PR vào `dev`
- REQ / D: D-06 (mở rộng), **D-65 (mới)**, Q-24 (thay thế), domain-glossary §nhãn
- **Files touched:**
  - `apps/portal/messages/<locale>/*.json` (create — 9 locale × 12 namespace: `en, zh, id, th, ms, fil, km, lo, my`)
  - `apps/portal/messages/vi/*.json` (modify — chỉ thêm khoá `meta.*` cho tiêu đề trang, khoá nhãn UI mặc định)
  - `apps/portal/src/i18n/messages.ts` (modify — nạp theo locale, lazy import)
  - `apps/portal/src/i18n/request.ts` (modify — bỏ `authOverrides`, `en-SG`→`en`, `ms-BN`→`ms`)
  - `apps/portal/src/i18n/locales.ts` (create — map locale → bundle, `intlLocale` cho định dạng số/ngày)
  - `apps/portal/src/i18n/messages.spec.ts` (create — kiểm đủ khoá, khớp biến, ICU hợp lệ)
  - `apps/portal/src/app/layout.tsx` (modify — `<html lang>` theo locale)
  - `apps/portal/src/app/**/page.tsx`, `layout.tsx` có `metadata.title` cứng (modify — `generateMetadata` + `getTranslations`, ~17 file)
  - `apps/portal/src/features/**` chỗ dùng `toLocaleString('vi-VN')` (modify — dùng `useFormatter`/locale hiện hành, 9 file)
  - `packages/ui/src/{pagination,bulk-bar,modal,drawer}/*.tsx` (modify — chỉ nếu Portal không truyền nhãn; ưu tiên Portal truyền nhãn qua props, KHÔNG đổi mặc định của ui)
  - `packages/shared/src/fixtures/locale.ts` (modify — thêm `messageLocaleOf(code)`; giữ `authOverrides` nếu Admin còn dùng)
  - `scripts/i18n-check.mjs` hoặc test tương đương (create, tuỳ chọn)
  - `e2e/behavior/auth-flows.spec.ts` (modify — kiểm thêm 1 màn sau đăng nhập đổi ngôn ngữ)
- **Parallel-safe with:** chạy một mình trên nhánh. Không đụng `apps/admin`, `apps/server`.

## CONTEXT
- Working directory: `D:\CODING\OPCHUB\wt-login-sso`
- next-intl `4.14.9`, không prefix URL; locale từ cookie `NEXT_LOCALE` (`apps/portal/src/i18n/request.ts`). Kiểu `Messages` suy từ file `vi` (`global.d.ts`).
- 12 mã trong `LANGS` (`packages/shared/src/fixtures/prototype-seed.json`): `vi, en, zh, id, th, ms, en-SG(dict en), fil, km, lo, my, ms-BN(dict ms)`. Nút chọn: `packages/ui/src/auth/language-switch.tsx`, dùng ở `auth-frame.tsx` và `portal-shell.tsx`.
- Bundle `vi` Portal: 12 namespace, ~1.141 chuỗi (affiliate, auth, chat, common, community, dashboard, events, membership, profile, projects, services, shell).
- Hiện trạng: locale khác `vi` = bundle `vi` + ~10 chuỗi đăng nhập từ `prototype-i18n.json` (`authOverrides`).
- Chuỗi tiếng Việt viết cứng ngoài messages ở Portal: ~17 `metadata.title`; định dạng số `toLocaleString('vi-VN')` ở 9 file.

## TASK
Dịch toàn bộ messages Portal sang 9 ngôn ngữ (AI dịch, người bản xứ soát sau), nạp đúng bundle theo cookie, đưa tiêu đề trang vào messages, định dạng số/ngày theo ngôn ngữ, và có test chặn thiếu khoá / sai biến. Không đổi cách chọn ngôn ngữ (cookie), không nối cài đặt Ngôn ngữ của Admin (D-65).

## SPECIFICATIONS

### Quyết định (D-65)
| Điểm | Chốt |
|---|---|
| Ngôn ngữ | 9 bản dịch: `en, zh, id, th, ms, fil, km, lo, my`. `en-SG` dùng `en`, `ms-BN` dùng `ms` (theo `LANGS.dict`). `vi` là nguồn. |
| Phạm vi | **Chỉ Portal.** Admin, lỗi API và email server vẫn tiếng Việt (TIP sau). |
| Người dịch | AI dịch từ `vi`; ghi `_meta.reviewed=false` để biết chưa soát. Người bản xứ soát sau. |
| Cài đặt Admin | **Không nối**: nút chọn vẫn hiện đủ 12, mặc định `vi`. |
| Thiếu khoá | Runtime rơi về chuỗi `vi` (không hiện tên khoá). Test CI bắt thiếu khoá. |

### Nạp messages
1. `src/i18n/locales.ts`:
   - `BUNDLES = ['vi','en','zh','id','th','ms','fil','km','lo','my'] as const`
   - `bundleOf(code)`: dùng `LANGS.dict` (`en-SG`→`en`, `ms-BN`→`ms`), không hợp lệ → `vi`
   - `intlLocaleOf(code)`: `vi→vi-VN, en→en-GB, en-SG→en-SG, zh→zh-CN, id→id-ID, th→th-TH, ms→ms-MY, ms-BN→ms-BN, fil→fil-PH, km→km-KH, lo→lo-LA, my→my-MM`
2. `messages.ts`: giữ `messages` (vi, import tĩnh — nguồn kiểu). Thêm `loadMessages(bundle)`:
   - Dynamic import các namespace của bundle đó.
   - Deep-merge lên `vi`, nên khoá thiếu rơi về `vi`.
   - Không import tĩnh cả 10 bundle (tránh phình bundle server).
3. `request.ts`:
   - `locale = isLocale(cookie) ? cookie : 'vi'`
   - `messages = await loadMessages(bundleOf(locale))`
   - `timeZone` giữ `Asia/Ho_Chi_Minh`.
   - Bỏ dùng `authOverrides` ở Portal; giữ hàm trong shared cho Admin.
   - `auth.language` lấy từ `localeNative(locale)`.
4. `app/layout.tsx`: `<html lang={await getLocale()}>`.

### Định dạng
5. Thay `toLocaleString('vi-VN')` ở Portal bằng `useFormatter().number(n)`. Ở hàm thuần ngoài component, nhận `locale` làm tham số; không cứng `vi-VN`.
   - Ngày giờ giữ `timeZone` VN.
   - Tiền tệ vẫn VND (`600.000đ` thành `600,000 ₫` ở en là chấp nhận được).

### Tiêu đề trang
6. Mỗi `metadata = { title: '... · OPC Hub' }` → `generateMetadata()` + `getTranslations('meta')`. Thêm namespace `meta` vào `common.json` (hoặc file `meta.json` mới) cho mọi tiêu đề. Hậu tố `· OPC Hub` giữ nguyên (tên thương hiệu).

### Nhãn mặc định của `packages/ui`
7. Ở mọi chỗ Portal dùng `Pagination`, `BulkBar`, `Modal`, `Drawer`, truyền nhãn từ `common.*`; không sửa mặc định tiếng Việt trong ui (Admin vẫn dựa vào). `RichTextField` (chuỗi cứng trong ui): chỉ xử lý nếu Portal dùng. Khi đó thêm prop `labels` tuỳ chọn, mặc định giữ nguyên → ghi DEVIATIONS nếu đụng ui.

### Quy tắc dịch (bắt buộc với từng file)
8. Giữ nguyên: tên khoá, cấu trúc lồng, biến `{name}`, cú pháp ICU (`{count, plural, ...}`, `select`). Cũng giữ thẻ rich text (`<b>…</b>`), URL, email, mã (`TV000123`), số tiền.
9. Plural:
   - Ngôn ngữ có số nhiều (en, ms, id, fil) phải có `one`/`other` khi `vi` dùng `plural`.
   - zh/th/km/lo/my chỉ cần `other`.
10. Không dịch:
    - Tên riêng và thương hiệu: OPC Hub, OPCHUB, Google, Zalo, SePay, Vietcombank, ASEAN.
    - Tên nhóm cộng đồng nếu nằm trong dữ liệu seed (không có trong messages).
11. Giọng văn: lịch sự, ngắn như bản `vi`; nút bấm dạng động từ. Thuật ngữ thống nhất trong một ngôn ngữ: lập bảng thuật ngữ ngắn ở đầu báo cáo cho các từ Thành viên, Phí thành viên, Nhóm, Sự kiện, Dự án, Nhà đầu tư, Đối tác/Affiliate, Hoa hồng.
12. Mỗi file locale có `"_meta": { "source": "vi", "reviewed": false }` ở gốc **chỉ khi** next-intl bỏ qua được. Nếu gây lỗi kiểu, ghi trạng thái soát vào `apps/portal/messages/REVIEW.md` thay vì trong JSON.

### Test (`messages.spec.ts`)
13. Với mỗi bundle ≠ vi, mỗi namespace:
    - (a) tập khoá lá **bằng** tập khoá `vi` (không thiếu, không thừa);
    - (b) tập biến `{x}` của mỗi chuỗi bằng của `vi`;
    - (c) chuỗi ICU parse được bằng `intl-messageformat` (đã có qua next-intl);
    - (d) không chuỗi nào rỗng;
    - (e) không chuỗi nào giống hệt `vi` khi chuỗi `vi` có dấu tiếng Việt (bắt quên dịch). Được miễn qua danh sách cho phép, nếu có.
14. `locales.spec`: `bundleOf('en-SG')==='en'`, `bundleOf('ms-BN')==='ms'`, `bundleOf('xx')==='vi'`.

## ACCEPTANCE CRITERIA
1. Given cookie `NEXT_LOCALE=th` When mở `/login`, `/dashboard`, `/community`, `/projects`, `/profile` Then mọi chuỗi giao diện là tiếng Thái (trừ dữ liệu người dùng / tên riêng), `<html lang="th">`, tiêu đề tab tiếng Thái.
2. Given `NEXT_LOCALE=en-SG` Then hiện bản `en`; `ms-BN` → bản `ms`.
3. Given cookie lạ / không có Then tiếng Việt như hiện tại; mọi e2e hiện có chạy MSW xanh như trước khi đổi (không hồi quy).
4. Given 9 bundle When chạy `messages.spec.ts` Then không thiếu/thừa khoá, biến khớp `vi`, ICU hợp lệ, không chuỗi rỗng.
5. Given `en` When xem số thành viên 1234 Then hiển thị `1,234` (không `1.234`).
6. Given chọn English ở màn đăng nhập rồi đăng nhập (MSW) Then Dashboard tiếng Anh; tải lại vẫn tiếng Anh (e2e).
7. Build Portal (`next build`) xanh; kích thước JS phía client của trang không tăng quá 15% so với `dev` (messages chỉ bundle locale đang dùng). Ghi số đo vào báo cáo.

## CONSTRAINTS
- DO NOT: sửa `apps/admin`, `apps/server`, mẫu email; đổi tên khoá `vi`; thêm prefix URL; thêm thư viện dịch / gọi API dịch lúc runtime; viết cứng chuỗi giao diện mới trong component.
- REUSE: `LANGS`, `LOCALE_COOKIE`, `isLocale`, `localeNative`, `LanguageSwitch` hiện có.
- File cap FE ≤ 400 dòng (file JSON messages không tính); `messages.spec.ts` tách hàm tiện ích nếu > 250 dòng.
- Bản dịch là **máy dịch**: báo cáo phải ghi rõ "chưa người bản xứ soát", liệt kê ngôn ngữ độ tin cậy thấp (km, lo, my).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`; ngoài danh sách → DEVIATIONS
- [ ] AC 1–7 có bằng chứng; ghi PASS/FAIL từng AC
- [ ] Chạy thật, paste output: `pnpm --filter @opchub/portal test`, `typecheck`, `lint`, `build`; e2e MSW `auth-flows.spec.ts` + `portal-shell.spec.ts`
- [ ] domain-glossary: không chuỗi giao diện cứng trong component (grep dấu tiếng Việt trong `apps/portal/src/**/*.tsx` ngoài comment/mock = 0)
- [ ] Không đụng Admin/server
- [ ] `coding-packs/reports/TIP-V2-117-completion.md` + bảng thuật ngữ; cập nhật dòng V2-117 trong `02-TASK-GRAPH.md`
- [ ] Commit, `git status --short` sạch, báo DONE kèm Git SHA
