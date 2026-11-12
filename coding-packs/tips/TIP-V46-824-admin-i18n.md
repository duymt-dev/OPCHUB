# TIP-V46-824: i18n toàn bộ Admin — Việt + 9 bản dịch ASEAN

## HEADER

- **TIP-ID:** TIP-V46-824 · **Project:** OPCHUB · **Module:** Admin presentation/i18n.
- **Priority:** P1 · **Estimated:** XL, khoảng 5–8 ngày công; hơn 22.000 chuỗi đích trước khi bổ sung nhãn còn thiếu. Không coi đây là việc chỉ dịch màn đăng nhập.
- **Status:** **IN PROGRESS / PARTIAL — NOT DONE, NOT READY TO MERGE.** Source0e3803b3: raw10 bundles/250 files complete; root3367 passed +2 existing skips, both Admin builds PASS; corrected mobile geometry/data-ready core checks and full208/208 behavior PASS per MSW/native. Original-baseline performance now verified by auditb2b8acf0 (JS growth1.21–1.84%, existing250KiB debt disclosed). Remaining16-AC auth/state/control/value/VI-prototype obligations still open; see completion report. No PR/merge/release.
- **Baseline:** `dev` / `origin/dev` tại `f7c1b2b8`, đã có PR #116 (823) và #118 (822).
- **Branch:** `feature/TIP-V46-824-admin-i18n`, PR vào `dev`; không merge tự động, không release `main`.
- **Depends on:** V2-117 (mẫu Portal, đã có), V46-822 và V46-823 (đã merge). Không sửa nghiệp vụ hai TIP này.
- **REQ / D:** **D-141**, D-06, D-37, D-65 (thay riêng giới hạn Admin), D-89, D-93, D-133, D-134, D-139, D-140; hồi quy REQ-122, REQ-625, RB-R02/R03, SEC-R01.
- **Files touched:** danh sách file-level create/modify/delete trong [manifest bắt buộc](TIP-V46-824-admin-i18n-manifest.md), là phần mở rộng của HEADER này. Không dùng wildcard làm quyền sửa toàn app. Có file đã i18n đúng thì ghi `no change needed` trong báo cáo, không sửa hình thức để đủ danh sách.
- **Parallel-safe with:** **sequential**, không chạy cùng TIP Admin hoặc shared UI đang hoạt động. Shares `apps/admin/messages/vi/common.json`, `apps/admin/src/features/shell/components/admin-shell.tsx` với V46-822; shares `apps/admin/messages/vi/overview.json`, `apps/admin/src/features/overview/data.ts` với V46-823. Hai TIP cũ đã merge, không mở lại. Một TIP trong batch này → không có cặp giao nhau chưa khai báo.

## CONTEXT

- Working directory: `D:\CODING\OPCHUB\CODING`.
- Stack chuẩn: [global/tooling](../standards/global/tooling.md), Next 16 / React 19 / AntD 6 / next-intl 4 / TypeScript strict / pnpm được repo pin. [Product tech-stack](../product/tech-stack.md) có bảng baseline lịch sử Next14/AntD5/Docker, **không** lấy bảng đó để thay stack hiện hành.
- SoT: [Requirements — D-141](../01-REQUIREMENTS-MATRIX.md), [Vision](../00-PROJECT-CONTEXT.md), [Builder handoff](../BUILDER-HANDOFF.md), [task graph](../02-TASK-GRAPH.md).
- Đặc tả/prototype: `docs/spec/index.html` phần bảng chọn quốc gia/ngôn ngữ, `LANGS`, topbar Admin và các màn `aTab`; `docs/spec/dac-ta.html` §21–22 về Admin/tài khoản/phân quyền, §33 về nghiệp vụ V4.6. Đây là mở rộng do owner yêu cầu, **không gán bừa một P#** trong `SPEC-V4.6-DELTA.md` cho i18n. D-139 B16 không được diễn giải thành quyền nối cấu hình Ngôn ngữ.
- Read first: `apps/admin/src/i18n/{request,messages,global.d}.ts`, root layout, app providers, shell/auth frame; `packages/shared/src/fixtures/locale.ts`, `packages/ui/src/{auth/language-switch,providers/ui-provider,date-range-picker/date-range-picker}.tsx`.
- Mẫu tham khảo **chỉ đọc, không import chéo app**: `apps/portal/src/i18n/{locales,messages,message-check,messages.spec}.ts`, [TIP-V2-117](TIP-V2-117-portal-i18n.md). Không sao chép điểm yếu của test Portal hiện tại: nó chỉ duyệt thư mục locale đang tồn tại (`present`), nên không phát hiện mất nguyên bộ dịch.

### Kết quả rà soát trên baseline

| Hạng mục | Bằng chứng code / rủi ro phải xử lý |
|---|---|
| Catalog | Chỉ `apps/admin/messages/vi`: **17 file, 2.456 string leaves**. 9 bản dịch tương ứng tối thiểu 22.104 chuỗi; số cuối thay đổi khi thêm nhãn UI. |
| Loader | `request.ts` chỉ overlay vài nhãn `auth.login` qua `authOverrides`; chọn English không có nghĩa toàn Admin đã dịch. |
| HTML / title | Root `<html lang="vi">`; 22 route có metadata cứng, `/profile` chưa có title riêng. |
| UI library | `UiProvider` khóa `vi_VN`, `dayjs.locale('vi')`; nhãn mặc định Pagination/BulkBar/Modal/Drawer/RichTextField và preset DateRangePicker có tiếng Việt. |
| Hardcode | AI suggestions, AI call log/filter/columns, moderation, persona options, screen aria-label, upload failures. Có cả tiếng Việt trong dữ liệu cố định: không được thay nhầm value gửi API. |
| Formatting | Formatter cố định vi-VN ở affiliate, overview, members, fees, groups, events, projects, investors, stores, needs, requests, marketing, reports, settings. Phân biệt formatter hiển thị với parser/ngày nghiệp vụ. |
| Shared labels | Permission matrix đọc `ADMIN_PERMISSIONS` / `ADMIN_MENUS`; nhãn vùng đọc shared/API. Chỉ dịch projection ở Admin, không đổi registry server/Portal hoặc mã quyền. |
| Catalog lớn | `vi/settings.json` **591 dòng / 524 chuỗi**. Tách vật lý theo domain trước khi thêm bản dịch; giữ nguyên logical keys `settings.*`. |
| AntD locale | Bản cài có en_GB, zh_CN, id_ID, th_TH, ms_MY, km_KH, my_MM; **không có fil_PH, lo_LA, en_SG**. Không viết import tới module không tồn tại. |

## APPLICABLE STANDARDS

- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md): next-intl, Server/Client, metadata, page orchestrator.
- [frontend/antd-ui](../standards/frontend/antd-ui.md): ConfigProvider/App, AntD thật, label/a11y, responsive.
- [frontend/data-state](../standards/frontend/data-state.md): cache giữ raw DTO, form/URL state; không trộn chuỗi dịch vào server state.
- [frontend/routing-auth](../standards/frontend/routing-auth.md): token memory-only, refresh single-flight, Admin khác Portal.
- [frontend/ui-parity](../standards/frontend/ui-parity.md): D-134, ảnh thật 1440/390, không mask hoặc nới assertion.
- [global/code-structure](../standards/global/code-structure.md): file/domain nhỏ, strict types, không `any`/`@ts-ignore`.
- [global/domain-glossary](../standards/global/domain-glossary.md): dùng đúng thuật ngữ, không đổi ý nghĩa tài chính/phân quyền.
- [global/git-workflow](../standards/global/git-workflow.md): commit, push, clean tree, Git SHA.
- [testing/testing](../standards/testing/testing.md): AC có tên test mang mã, MSW/native cùng assertion.
- Tài liệu kỹ thuật đã đối chiếu: [next-intl configuration](https://next-intl.dev/docs/usage/configuration) cho request-scoped locale/messages; [AntD i18n](https://ant.design/docs/react/i18n/) cho ConfigProvider và locale tùy chỉnh. Khi execute đối chiếu API với phiên bản **đang cài**, không nâng major theo website.

## TASK

Hoàn thiện i18n cho toàn bộ giao diện Admin, từ auth tới các màn nghiệp vụ, dialog/drawer, Hồ sơ, trạng thái lỗi/rỗng và nhãn truy cập. Tạo đủ 9 catalog đích, chuyển locale nhất quán giữa next-intl, metadata, định dạng và AntD, giữ nguyên API/dữ liệu/quyền/nghiệp vụ. Có kiểm tra catalog bắt buộc và bằng chứng browser hai chế độ, không chỉ kiểm tra nút chọn ngôn ngữ.

## SPECIFICATIONS

### 1. Phạm vi nghiệp vụ — D-141

1. Bộ dịch: `vi, en, zh, id, th, ms, fil, km, lo, my`. Menu vẫn **12 lựa chọn**, `en-SG → en`, `ms-BN → ms`; giữ tên bản ngữ, thứ tự và cờ D-133.
2. Bao phủ: login, forgot/reset password, first-password, two-factor; shell/sidebar/search/notifications chrome; overview; members; fees/transactions; groups/chat viewer/moderation; bots tất cả tab; events; stores; needs; projects; investors; requests/catalog; affiliate/GĐ Vùng; marketing; reports; settings tất cả tab; profile; 403/404/loading/error.
3. Chỉ đổi **presentation**. Không đổi endpoint, schema/enum, payload/value bộ lọc, permission, quy tắc phí/hoa hồng, SQL, lịch job, query/cache TTL, D-140 hay URL. Không thêm locale vào API và không re-fetch dữ liệu chỉ để dịch nhãn.
4. Không nối `settings.languages` với bộ chọn của Admin hay Portal. Mặc định khi không có cookie hợp lệ vẫn `vi`; giữ hành vi lưu cấu hình hiện có của tab Cài đặt. Dịch nhãn tab, **không** gán `% progress` backend bằng chất lượng catalog hay sửa thành 100% để khoe đã dịch.
5. Không dịch dữ liệu: tên người/công ty/nhóm/tỉnh, role name tùy chỉnh, danh mục tùy chỉnh, nội dung chat/email/notification/audit, prompt/persona bio, script/topic, ghi chú/lý do đã lưu; mã TV/GV, nội dung `OPCHUB …`, email/URL/model ID/tên provider. Không thay tiếng Việt bằng tiếng Anh trong seed/DB.
6. Lỗi API (`error.message`, `fields[].message`) và kết quả tác vụ server, nội dung email/CSV/xuất file hiện có vẫn theo hợp đồng hiện tại, có thể tiếng Việt. Đây là **ngoại lệ được liệt kê**, không tuyên bố mọi text từ backend đã dịch. Không dịch mù bằng dictionary tìm/thay chuỗi server; không sửa `ApiError.message` trước các nhánh xử lý khóa tài khoản.
7. Tên ngôn ngữ/quốc gia trong selector giữ fixture như Portal; đây là danh mục nhận diện quốc gia, không phải key thiếu. Admin/Portal ở production khác host; cookie host-only hiện có không bảo đảm độc lập khi local dùng chung `localhost` khác port — không tự đổi tên cookie trong TIP này.

### 2. Locale runtime, SSR và fallback

8. Reuse `LOCALE_COOKIE=NEXT_LOCALE`, `isLocale`, `DEFAULT_LOCALE`, `languageOptions`, `LanguageSwitch`. Chọn → cookie path `/`, SameSite Lax, max-age hiện tại + `router.refresh()`. Không thêm prefix `/en`, redirect toàn trang, localStorage, endpoint hay tài khoản preference.
9. `locales.ts` phân biệt selected locale / bundle / Intl locale / AntD locale / dayjs locale. Cookie phải qua allowlist **trước** dynamic import; giá trị lạ, thiếu, chuỗi path traversal → `vi`. Không dùng `Accept-Language` để thay default đã chốt.
10. Map Intl: vi→vi-VN, en→en-GB, en-SG→en-SG, zh→zh-CN, id→id-ID, th→th-TH, ms→ms-MY, ms-BN→ms-BN, fil→fil-PH, km→km-KH, lo→lo-LA, my→my-MM. Selected locale giữ nguyên để cờ/cookie/html không mất danh tính SG/BN.
11. `request.ts` bỏ Admin `authOverrides`; nạp bundle đủ theo request. Giữ `timeZone: Asia/Ho_Chi_Minh`. Root async `getLocale()` → `html lang`; NextIntlClientProvider nhận cùng request config. Không dùng `suppressHydrationWarning` để che mismatch phát sinh.
12. Tách source catalog, loader, merge helper. `messages.ts` tiếp tục export `messages` / `Messages` compatible với test hiện tại; runtime chỉ nạp `vi` và bundle đã chọn. Client chỉ nhận **một** catalog resolved, không import cả 10 bundle qua client barrel.
13. Merge sâu fallback leaf về `vi` khi thiếu/null/sai kiểu/rỗng; mảng giữ cấu trúc/thứ tự, không merge sai bằng object keys. Module thiếu → fallback đúng namespace và logger chẩn đoán có locale/key, không PII. Loader fallback bảo vệ runtime nhưng **test/build gate vẫn FAIL nếu thiếu file/khóa**.
14. ICU malformed phải bị checker chặn. Runtime dùng fallback an toàn dịch được cho lỗi ngoài dự kiến, không hiển thị raw key/stack; callback non-serializable đặt ở client provider phù hợp, không truyền function từ Server Component. Không nuốt mọi lỗi để giả PASS.
15. Switch giữ pathname + toàn bộ query/hash, không logout, không reset QueryClient/auth store, không mất form đang nhập hoặc phát mutation. Memoized columns/options/formatter phải có dependency locale/t; text đang mở thay theo locale. Với lỗi cục bộ đang hiển thị, lưu mã lỗi/params hoặc re-render lời dịch, không lưu chuỗi dịch vĩnh viễn vào cache.

### 3. Catalog, cấu trúc và dịch thuật

16. `vi` là source schema. Giữ nguyên câu chữ Việt hiện hành trừ bổ sung nhãn trước đây viết cứng; không đổi key đang dùng chỉ vì dịch.
17. Thay `settings.json` bằng 6 file `settings/core.json`, `access.json`, `mail.json`, `audit.json`, `finance.json`, `ai.json`. Merge vào **một namespace settings** ở loader. Phân nhóm chi tiết trong manifest; test so sánh flattened baseline trước/sau tách để bảo toàn mọi key/value. Không thêm logic/nhãn mới vào file 591 dòng cũ.
18. Namespace mới: `meta.json` (title theo route), `ui.json` (pagination, editor, calendar preset, local errors, labels dùng chung), `bot-options.json` (label cho preset; value không đổi). Catalog khác theo domain cũ. Mỗi catalog vật lý mới ≤400 dòng, mục tiêu ≤250; nếu cần tách nữa phải cập nhật manifest cụ thể **trước** khi làm, giữ logical namespace.
19. Dịch đủ tất cả catalog ở 9 locale, kể cả nhãn additions của 822/823/AI ops. AI dịch, `messages/REVIEW.md` ghi source SHA, ngày, coverage, glossary từng locale và `native-reviewed: false`. Không đặt boolean `_meta` vào message tree.
20. Giữ tên key, biến và kiểu argument, rich-text tag, URL, ký hiệu kỹ thuật. Dùng ICU plural/select theo ngôn ngữ, luôn có `other`; không nối mảnh câu Việt thành câu ngoại ngữ. `en` plural cần trường hợp 1/other. Không yêu cầu các locale có cùng mọi plural category, nhưng phải giữ argument, explicit numeric cases và select selectors có ý nghĩa nghiệp vụ.
21. Không rỗng, không copy toàn bộ vi sang đích, không để `[TODO]`, bản dịch Latin giả cho Khmer/Lao/Myanmar. Allowlist chuỗi giống vi phải cụ thể `namespace.key + reason`, chỉ thuật ngữ/tên riêng/ký hiệu hợp lệ. Kiểm Unicode NFC, tránh mojibake và escape biến/thẻ sai. Khmer/Lao/Myanmar ghi độ tin cậy và chờ người bản xứ, không gắn nhãn đã được họ duyệt.

Checker dùng ICU AST để đối chiếu argument name/type, select/plural và rich-text tags; regex `{...}` đơn giản không đủ. Duyệt danh sách bundle/namespace **cố định kỳ vọng**, không lấy danh sách thư mục có sẵn rồi bỏ qua phần thiếu. Test âm dùng fixture/temp catalog cô lập; không xóa catalog production thật để chạy test. Source audit dùng AST/literal context để tìm text UI (kể cả chữ không dấu/English và aria/title/placeholder), không chỉ grep dấu tiếng Việt; ngoại lệ lưu theo file + literal + lý do, cấm allowlist nguyên feature. Audit helper/checker tách file ≤400 dòng, không dồn vào test suite hàng nghìn dòng.

Execute inventory clarification (11/11/2026): baseline có `settings.renewal.actions = ""`, là header cột thao tác cố ý để trống. Giữ nguyên vi/hash và cho phép **riêng key này**, chỉ khi cả source/target đều chuỗi rỗng và có lý do allowlist cụ thể. Không cho phép biến source có chữ thành rỗng hoặc miễn kiểm cả namespace; test âm phải chặn các trường hợp đó.

Owner-approved execute clarification (11/11/2026): owner đồng ý thêm props định dạng số **tùy chọn** cho shared Pagination/BulkBar để Admin dịch đầy đủ số hiển thị. Giữ nguyên mặc định Portal, giá trị số/callback và logic chọn/phân trang; cập nhật manifest trước khi sửa hai file shared này. Chạy hồi quy shared UI/Portal và build Portal; không mở rộng sang thay đổi nghiệp vụ Portal.

Owner-approved auth execute clarification (11/11/2026): owner đồng ý thêm prop định dạng lỗi **tùy chọn** cho shared LoginPanel, chỉ Admin sử dụng để lỗi client đang hiển thị đổi theo locale. Portal mặc định không đổi; giữ nguyên draft, cơ chế xóa lỗi khi chọn tài khoản mẫu, pending và callback string/undefined. Không suy diễn text API thành mã lỗi client. Khai báo file-level manifest trước sửa, chạy shared/UI + Portal regression và build Portal.

Owner-approved sidebar execute clarification (11/11/2026): owner đồng ý thêm callback định dạng số **tùy chọn** cho AppShell/Sidebar. Admin opt in để badge dùng chữ số theo locale (đặc biệt Myanmar); giữ nguyên số đếm thô, điều kiện hiện badge/dot, href và callback điều hướng. Portal không opt in và giữ nguyên mặc định. Không thêm next-intl vào shared UI; khai báo manifest trước sửa, chạy shared UI/Portal regression và build Portal.

### 4. UI, labels và validation

22. Metadata: 22 route title hiện có + `/profile` chuyển `generateMetadata/getTranslations('meta')`; giữ brand `OPC Hub Admin`, robots noindex/nofollow. Không locale hóa href/slug/canonical hoặc public SEO Portal.
23. Nhãn permission/menu dùng stable keys từ shared registry → messages Admin; giữ raw permission key cho guard/callback. Nhãn vùng dùng enum/key → messages, vi giữ phân biệt `Miền Trung & Tây Nguyên` ở GĐ Vùng và `Miền Trung` ở báo cáo/chuyển đổi (D-139). Với API cung cấp label kèm enum, chọn enum; nếu chỉ có nhãn cố định, adapter có whitelist exact và fallback raw, không dịch arbitrary text.
24. Bot tone/gender/active-hours/script type, group region, project rejection presets: render `{value: canonicalExistingValue, label: translated}`. Lưu/đọc vẫn dùng **value cũ**, kể cả value hiện là tiếng Việt. Prompt/default content để gửi server không đổi theo locale. Dữ liệu tùy chỉnh không bị ép map thành preset.
25. Truyền đủ props dịch cho Pagination, BulkBar, Modal/Drawer closeLabel, RichTextField toolbar/link dialog, date preset/placeholder, Empty/Error, upload aria-label, confirm/tooltip. Dùng hook nhãn dùng chung trong Admin; không làm `packages/ui` phụ thuộc next-intl hoặc app. Existing Vietnamese defaults của shared UI phải giữ nguyên cho Portal.
26. Có thể mở rộng `UiProvider` bằng **optional** typed AntD locale prop; default vi giữ nguyên. Locale bridge riêng Admin nạp map và chuyển vào provider trước khi render controls, không nháy lịch Việt trong trang locale khác. Không thêm provider App lồng làm toast khác hành vi.
27. AntD: en/en-SG dùng en_GB; ms/ms-BN dùng ms_MY; các bundle có module dùng bản cài. fil và lo tạo locale patch typed từ en_GB, dịch đầy đủ text control Admin dùng (Calendar/DatePicker/TimePicker, pagination, table empty/filter/sort, select, upload, modal, form). Không fallback im lặng tiếng Anh/Việt cho control đang hiển thị. Lazy-load map hữu hạn; test import mọi entry.
28. Dayjs có `vi,en-gb,zh-cn,id,th,ms,tl-ph,km,lo,my`. Date values/instances mang `.locale(...)`; không đặt singleton locale theo từng SSR request. DateRangePicker thêm optional date-locale prop khi cần, giữ default của Portal. Preset label truyền từ Admin; không thay logic/range đang áp dụng để tiện dịch.
29. Validation **phía client** và upload error cục bộ phải dịch: helper nhận translator + structured issue/path/code, giữ schema shared làm chuẩn. Custom issue chỉ có text thì dùng mapping hữu hạn có regression test; unknown → thông báo trường không hợp lệ đã dịch, không hiện raw key. Giữ loại lỗi/field/focus, không weaken required/length/password equality/strength. Riêng lỗi backend theo mục 6 không đổi. Không parse thông báo dịch để quyết định auth/permission. Client toast của hành động AI được dịch, nhưng `locale: 'vi'` trong request sinh nội dung AI hiện tại **không** đổi theo locale giao diện: ngôn ngữ nội dung sinh là nghiệp vụ khác.

### 5. Số, tiền, ngày và biểu đồ

30. Pure formatter nhận locale rõ ràng; component/hook đọc locale hiện hành. Không đọc cookie/window trong hàm model và không giữ `Intl('vi-VN')` cấp module cho UI đa ngôn ngữ. Có unit riêng cho null/0/âm/giá trị lớn, không biến null thành số 0.
31. Số và phần trăm dùng locale hiện hành, **không đổi công thức/làm tròn nghiệp vụ**. Currency giữ currency từ DTO: VND vẫn nguyên đồng, không đổi tỷ giá; các màn đang hỗ trợ USD vẫn USD. Đơn vị triệu/tỷ phải dịch hoặc dùng formatter compact phù hợp với độ chính xác hiện tại. Locale vi giữ định dạng prototype tương đương.
32. Ngày/timestamp hiển thị theo locale nhưng timezone **Asia/Ho_Chi_Minh**, calendar **Gregorian** (th không đổi năm 2026 thành 2569). Date-only `YYYY-MM-DD`, month keys `YYYY-MM`, datetime input, API params, CSV machine fields vẫn canonical; không parse ngược chuỗi hiển thị locale để gửi server. Test ranh giới 17:00Z/00:00 VN, giao năm/ISO week.
33. Không đổi parser, logic so sánh/sort/filter, `toLocaleLowerCase('vi')` phục vụ tìm kiếm, hoặc export formatter chỉ vì scan thấy locale hardcode. Các hàm dùng đồng thời UI + export phải tách; **export file giữ contract cũ**.
34. Chart overview API hiện trả `growth[].month` là nhãn: `T1`…`T12` ở tháng, `W1`…`W53` ở tuần, năm dạng `2026` (`apps/server/src/modules/reporting/overview-intervals.ts`). Adapter presentation nhận **period + nhãn API đã kiểm định**, dịch tháng/tuần qua messages; không suy lại dữ liệu, không đổi SQL/response. Vi giữ nhãn cũ. Giá trị chưa nhận diện → raw label, ghi test; không dùng label đã dịch làm React key/cache key. D-140: tổng/current flow, phát sinh theo range, chart gần nhất độc lập range phải giữ đúng.

### 6. Font, hiệu năng, accessibility

35. Font không phụ thuộc font đã cài trên máy dev. Tự host Noto Sans + script SC/Thai/Khmer/Lao/Myanmar ở Admin theo D-37, kèm license/OFL và source provenance trong REVIEW. Latin default; chỉ tải script cần cho locale hiện tại; không gọi Google Fonts CDN/runtime dịch. Không import trực tiếp font qua `apps/portal`.
36. Không đổi theme/layout theo bản dịch; cho label wrap đúng chỗ, không cắt mất thao tác. Kiểm 1440 và 390, keyboard/focus, menu 12 lựa chọn, dialog/calendar, không tràn viewport; bảng dài được cuộn trong container theo thiết kế. Font glyph đúng, không ô vuông.
37. Đo baseline vs sau: production JS gzip route login/overview/settings/profile và payload catalog hiện hành; ghi cách đo, cache mode. Budget First Load JS theo standard ≤250KB gzip; nếu baseline đã vượt thì báo rõ nợ, không bịa đạt. Không được ship cả 10 catalog/font script trong payload mỗi trang hoặc tăng >15% JS executable cùng route do loader (phần message RSC/font đo tách riêng). Tối ưu trước khi chốt nếu regression do TIP.

## ACCEPTANCE CRITERIA

Mỗi dòng có test mang prefix **D-141 AC824-xx**; số lượng case thực tế không mặc định bằng số AC.

| AC | Given / When / Then | Test owner / bằng chứng |
|---|---|---|
| 01 | Given 12 mã hợp lệ + cookie thiếu/lạ/path traversal; When resolve; Then đúng bundle/Intl/AntD/dayjs, aliases giữ identity, fallback vi an toàn. | `i18n/locales.spec.ts`, `request.spec.ts` |
| 02 | Given catalog raw 10 locale; When checker chạy; Then bắt buộc tồn tại mọi file/namespace, đúng leaf keys/types, ICU parse, args/tags/selects, không rỗng/TODO/copy vi trái allowlist. Xóa 1 locale/file/key hoặc làm hỏng placeholder phải FAIL checker. | `i18n/messages.spec.ts`, `tests/message-contract.spec.ts` |
| 03 | Given catalog vi gốc và settings sau split; When flatten; Then mọi key/value cũ giữ nguyên; loader fallback deep đúng object/array, không lộ key, thiếu bundle không làm test xanh giả. | `i18n/message-loader.spec.ts`, checkpoint hash trước khi thêm key, diff/catalog inventory |
| 04 | Given ở `/login`; When chọn từng locale rồi mở trang/refresh; Then html lang, title, auth form/hero/footer/2FA flow copy đổi đồng bộ, 12 option/cờ đúng; vi cũ không hồi quy. | `admin-i18n-auth.spec.ts`, screenshots |
| 05 | Given đã login ở `/members?status=active&page=2`; When vi→en→th→vi; Then giữ URL/query, session, quyền, dữ liệu, current page; không gọi mutation hoặc logout. | `admin-i18n-navigation.spec.ts` |
| 06 | Given tất cả màn trong coverage matrix; When English render với data/loading/empty/error/403 và mở tab/dialog chính; Then nhãn UI/title/aria dịch đúng, không còn hardcode ngoài allowlist. | `admin-i18n-screens.spec.ts`, coverage matrix + static AST audit |
| 07 | Given mỗi trong 10 bundle; When mở overview/profile/settings và controls đại diện; Then thấy đúng catalog chứ không chỉ auth override, vi/en/zh/th/km/lo/my có ảnh 1440/390. | `admin-i18n-screens.spec.ts`, `admin-i18n-visual.spec.ts` |
| 08 | Given số 1234, VND/USD, null/âm và ngày gần UTC boundary; When đổi locale; Then format locale đúng, VN timezone/Gregorian, tiền/công thức/query range/export bytes không đổi. | `i18n/format.spec.ts`, `admin-i18n-controls.spec.ts` |
| 09 | Given RangePicker open + table empty/pagination + rich editor/dialog; When mỗi locale được chọn; Then AntD/dayjs/preset/close/toolbar dịch đúng kể cả fil/lo, không rò locale giữa request. | `i18n/antd-locales.spec.ts`, `admin-ui-locale-provider.spec.tsx`, `admin-i18n-controls.spec.ts` |
| 10 | Given draft profile, lỗi local password và modal đang mở; When switch; Then draft không mất, error/labels đổi ngôn ngữ, payload đúng, hidden avatar error vẫn toast nhìn được. | `i18n/validation.spec.ts`, `profile/admin-profile.spec.tsx`, `admin-i18n-navigation.spec.ts` |
| 11 | Given group region/persona preset/permission matrix dùng English; When chọn/lưu; Then request value/mã quyền/canonical text như vi; custom content giữ nguyên. Không đổi RBAC/readonly. | `i18n/domain-labels.spec.ts`, `admin-i18n-values.spec.ts` |
| 12 | Given lỗi API/field và nội dung notification/audit/email/CSV; When locale ngoài vi; Then giữ nguyên raw contract và cơ chế locked/refresh; chrome/fallback client dịch, không tự dịch nội dung. | `admin-i18n-values.spec.ts`, auth/session tests hiện có |
| 13 | Given settings languages toggle/default đã lưu; When đổi selector/F5; Then selector vẫn đủ12 và cookie có hiệu lực độc lập config, không phát PATCH settings chỉ vì switch. | `admin-i18n-navigation.spec.ts` |
| 14 | Given cùng source build; When chạy toàn bộ i18n behavior ở MSW và native; Then cùng assertion pass, cùng seed preconditions, không skip riêng server. | logs hai mode + SHA; original DB giữ nguyên |
| 15 | Given vi baseline và locales dài/script mới; When desktop/mobile/keyboard; Then layout không lệch thật, không tràn/tofu, nội dung và control còn dùng được, no hydration/missing-message errors. | ảnh unmasked, D-134 classification, browser console capture |
| 16 | Given production build + lazy loader; When đo vi/en/th; Then một resolved catalog/request, fonts theo script, no cross-request leak, metrics mục37 có bằng chứng. | build/asset manifest, sizes table |

### Coverage matrix bắt buộc trong report

- Mỗi route ở mục2 là một hàng; ghi locale đã thử, title, main state, dialog/tab/form, raw-content exceptions, test ID và evidence path. Không dùng một ảnh Dashboard làm bằng chứng Profile.
- English: toàn bộ routes và tất cả tab chính, ít nhất một drawer/modal/form của mỗi domain có chúng. 10 bundle: auth + overview + profile + settings + native component labels. Hai alias: cookie/title/cờ/format riêng.
- Settings: general, categories, roles, admins, welcome mail, SMTP, audit, SSO, languages, pricing, renewal, bank, AI, app-notify theo tab thực tế (không thêm tab vì danh sách này). Bots, projects, affiliate, requests có subroute/tab phải liệt kê cụ thể sau kiểm kê.
- Unit/static không thay browser/native evidence. Native-language human review ngoài technical gate, ghi pending, không bịa approval.

## IMPLEMENTATION ORDER & VERIFY

1. Fresh baseline: đọc D-141, branch/status, xác nhận 822/823 đã tích hợp; tính file intersection theo manifest. Ghi snapshot key/value/settings và route/control inventory trước khi code. Checkpoint split-only phải khớp hash 524 leaves trong manifest trước khi thêm nhãn mới; `catalog-baseline.json` chỉ lưu count/hash/source SHA, không chép lại monolith. Báo cáo diff trước/sau additions dùng baseline git, test lâu dài kiểm logical schema/catalog contract.
2. Nền nhỏ: settings split, locale maps, loader/fallback, provider, checker và unit âm. Không dịch 9 bộ trước khi schema/checker ổn định.
3. Presentation: meta/ui/options, hardcode inventory, formatter + callers, canonical-value adapters, local error labels; vi regression.
4. Dịch EN hoàn chỉnh và browser smoke mọi domain; sau đó 8 locale còn lại, glossary + REVIEW. Không checkpoint DONE khi chỉ EN hoặc chỉ login xong.
5. Fonts/control locales + browser all-bundle, responsive, SSR isolation/performance; regression Portal vì UiProvider/DateRangePicker optional props.
6. Gate bắt buộc: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck`; build Admin MSW và native tách output; build/test Portal nếu shared UI đổi. Không bỏ hook hoặc nâng dependency để né lỗi.
7. Focused unit: `pnpm --filter @opchub/admin exec vitest run src/i18n src/providers/admin-ui-locale-provider.spec.tsx src/features/profile/admin-profile.spec.tsx`; `pnpm --filter @opchub/ui test`.
8. Browser: `pnpm --filter @opchub/e2e exec playwright test --project=behavior behavior/admin-i18n-auth.spec.ts behavior/admin-i18n-navigation.spec.ts behavior/admin-i18n-screens.spec.ts behavior/admin-i18n-controls.spec.ts behavior/admin-i18n-values.spec.ts behavior/admin-i18n-visual.spec.ts --workers=1`; lặp với `-c playwright.server.config.ts` và đúng env/build/server prerequisites. `admin-i18n-visual` nằm behavior để chạy cùng assertion hai mode, không sửa harness để bỏ server.
9. Hồi quy behavior `admin-profile.spec.ts`, suite overview của 823, auth-flows/Admin shell và Portal language/shell. Xác nhận tên file thực tế trước khi chạy, report command chính xác. Parity vi D-01/auth + một settings state với prototype; locale khác không có prototype dịch → review ảnh, **không báo pixel parity ngôn ngữ đó**.
10. **Native safety:** không reset/recreate/repair DB `opchub_test` hay thay data/service trên PG5432. Dùng cluster native cô lập đã được phép, cấu hình ngoài repo và test-owned fixtures; không phụ thuộc đường dẫn TEMP phiên cũ như hạ tầng vĩnh viễn. Nếu không còn môi trường hợp lệ, ghi native chưa đạt; không đánh DONE dựa MSW. Không thêm migration/SQL/int server suite cho TIP thuần presentation này.
11. Report từng AC, lỗi thực tế và deviations; append traceability W1, chỉ đổi row824; commit paths cụ thể, push feature, PR vào dev, Git SHA + clean status. Không merge thay owner.

## CONSTRAINTS

### Owner-approved bounded correction — 12/11/2026

Owner also approved optional RichText close labels and optional Enter/Space toolbar handling, enabled by Admin only; Portal defaults and pointer behavior stay unchanged. Exact paths are in the manifest. Auth fixtures are permitted only through existing Admin API, prefix-owned accounts on the approved isolated cluster; existing accounts/data and original services remain untouched. These are narrow approvals, not permission for broad shared UI/backend changes.

Owner approved “Cho phép sửa serializer UTC tương đương” after the actual AI call-log date-filter GET returned 400. Serialize the same +07:00 day boundaries as UTC Z in Admin only; preserve instants, schema/API, range rules and all existing business values. This exception does not authorize backend/schema changes. Keep the original failure and rerun the real filter control against both modes before claiming acceptance.

- **DO NOT:** sửa server/DB/Portal business logic, đổi hợp đồng API/error/export, dịch user content hoặc thay payload canonical, đổi persistence/auth/permission, nối settings language, sửa prototype/baseline/mask ảnh, hardcode language vào UI, global mutable locale theo request, dynamic import từ cookie chưa allowlist.
- **REUSE:** next-intl/AntD/dayjs đang có; shared locale fixtures và LanguageSwitch; raw zod/API; hiện có props labels; logger. Không import code của Portal, không thêm runtime translator/LLM call.
- **Dependency:** được khai báo trực tiếp devDependency `intl-messageformat` từ catalog đã có như Portal để test ICU; không import dependency transitive không khai báo. Lockfile chỉ thay importer tương ứng, không upgrade dây chuyền. Nếu cần parser AST ICU chuyên dụng, đối chiếu export công khai của package đã khai báo; thêm package mới phải ghi lý do và cập nhật manifest trước.
- **SKIP:** backend/email/CSV đa ngôn ngữ, human translation review, bản dịch Portal còn thiếu, SEO, user preference DB, cross-tab sync mới, redesign, sửa nợ ngoài phạm vi. Native-only dữ liệu tiếng Việt không phải lý do dịch DB.
- Production FE mục tiêu ≤250, trần400; helper/test tách theo domain; page ≤80. Không gom 16domain formatter/label map vào một file khổng lồ. Message JSON cũng chia nhỏ, không tạo bản sao monolith settings 591 dòng.

## QUALITY GATE — TIP GENERATION

- Completeness: header/context/task/spec/validation/error/AC/constraints/standards/manifest/checklist đủ; task graph row824 có trạng thái **chưa code**.
- Cross-reference: D-141 đúng câu trả lời owner; giữ nguyên D-65 phần Portal/API/email, D-139 settings, D-133 flags, D-140 overview; không thay backend architecture trong handoff.
- Parallel-break: một TIP implementation; manifest là phụ lục **không phải TIP độc lập**. File overlap với 822/823 đã merge được khai báo sequential. Chưa có quyền chạy song song.
- Gaps: chưa có implementation, 9 catalog, test/i18n runtime evidence hay native-speaker review. Đây là đầu việc execute, không phải implementation PASS. Font nguồn/license và size phải ghi thật khi thi công.

## ⚠️ BUILDER-CHECKLIST

- [ ] Đúng manifest; file cần thêm được cập nhật explicit + kiểm overlap trước khi sửa. Settings split bảo toàn vi keys/values.
- [ ] 10 bundle đủ file/key/type/ICU/args/tags, kiểm âm xóa file/locale/key thật; 12 selector +2alias giữ identity.
- [ ] Toàn bộ routes/tabs/dialogs trong coverage matrix; không chỉ shell/login; Profile/Overview có ảnh đúng màn.
- [ ] Mọi AC824-01→16 có PASS/FAIL và command/evidence thật; MSW/native cùng assertion; không bịa native verification.
- [ ] Handoff rule1: schema/API canonical không đổi; rule4: không thêm ghi Admin/export lách audit; rule7: modular, strict, tests riêng, không secret/console.
- [ ] Server DTO/cache, auth tokens, URL/filter, dữ liệu người dùng, CSV/email và số tiền giữ nguyên; local error labels dịch đúng.
- [ ] AntD/dayjs/metadata/html/font đồng bộ; fil/lo controls không rơi về tiếng Việt; SSR concurrent không lẫn locale.
- [ ] vi không lệch UI thật; ảnh 1440/390 không mask; D-134 owner review ghi pending nếu chưa duyệt.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`, build Admin hai mode, shared UI/Portal regression và browser hai mode chạy thật.
- [ ] REVIEW ghi AI translation / native-reviewed=false, glossary và font licenses; báo cáo performance không lấy all-cached timing làm benchmark.
- [ ] Giữ nguyên native5432/test data/services; report/report-trace/task-row824 đúng, không sửa goal của PM.
- [ ] Commit/push, `git status --short` sạch; báo **TIP-V46-824-DONE <Git SHA>** chỉ sau execute/gates, không khi mới viết TIP.
