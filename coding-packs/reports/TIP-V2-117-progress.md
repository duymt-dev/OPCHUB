# TIP-V2-117 — log tiến độ (append-only)

> Goal: [`plans/GOAL-V2-117-i18n.md`](../plans/GOAL-V2-117-i18n.md) · TIP: [`tips/TIP-V2-117-portal-i18n.md`](../tips/TIP-V2-117-portal-i18n.md)
> Nhánh `feature/i18n-languages`, base `dev` @ `224d07cf`. Mỗi bước append một mục, không sửa mục cũ.

## Trạng thái

| Bước | Nội dung | Trạng thái | Commit |
|---|---|---|---|
| 1 | Khung locale + test | xong | `d8993ad1` |
| 2 | Chuỗi cứng → messages | xong | `2c57f169` |
| 3 | Dịch en, id, ms, th, zh, fil, km, lo, my | xong | `27acad3d`…`2a307934` |
| 4 | E2E MSW + `i18n.spec` | xong | `33981c48`, `a1222f57` |
| 5 | E2E native + `i18n.spec` | chưa | |
| 6 | Cổng kiểm + verify + PR | chưa | |

## Câu hỏi

_(trống)_

## Nhật ký

## 2026-10-21 — Bước 0: lập goal
- Commit: `ae893f7f` — docs(i18n): add portal i18n tip v2-117 and decision d-65
- Đã làm: TIP-V2-117, quyết định D-65, file goal + log này.
- Bước kế: Bước 1 — khung locale + test.

## 2026-10-21 — Bước 1: khung locale + test
- Commit: `d8993ad1` — feat(portal-i18n): load message bundle per locale with vietnamese fallback
- Đã làm: `src/i18n/locales.ts` (`BUNDLES`, `bundleOf` theo `LANGS.dict`, `intlLocaleOf`); `messages.ts` thêm `loadMessages` (import động theo bộ, khoá thiếu/rỗng rơi về `vi`); `request.ts` bỏ `authOverrides` (Admin vẫn dùng — giữ trong shared); `<html lang>` theo locale; `message-check.ts` + `messages.spec.ts` (đủ khoá, giữ biến `{x}` + thẻ `<b>/<br>/<v>`, ngoặc cân bằng, parse ICU bằng `intl-messageformat`, không rỗng, không quên dịch) — chỉ chạy cho bộ đã có thư mục; `locales.spec.ts`.
- Thêm devDependency `intl-messageformat` 11.2.15 (catalog, cùng bản use-intl đang dùng) cho test ICU.
- Lệnh đã chạy + kết quả:
  - `npx vitest run` (portal) → `Test Files 38 passed (38)`, `Tests 166 passed (166)`
  - `npx tsc --noEmit`, `npx eslint src/i18n src/app/layout.tsx` → sạch
  - Thử `next build` + `next start` với bộ `en` tạm 1 khoá: cookie `NEXT_LOCALE=en-SG` → `<html lang="en-SG"`, chuỗi `en` hiện, khoá khác tiếng Việt; không cookie → `lang="vi"`. Đã xoá bộ thử.
- Quyết định: messages `vi` chỉ dùng biến đơn (không plural/select) → test so tập biến + thẻ thay vì cấu trúc ICU; trạng thái soát dịch ghi `messages/REVIEW.md` (không đặt `_meta` trong JSON vì test so khoá chính xác).
- Bước kế: Bước 2 — chuỗi cứng → messages.

## 2026-10-21 — Bước 2: chuỗi cứng → messages
- Commit: `2c57f169` — feat(portal-i18n): move hardcoded strings, titles and formats to messages
- Đã làm:
  - 16 trang dùng `generateMetadata = pageMeta('<key>')` (`src/i18n/page-meta.ts`, khoá `common.meta.*`, mẫu `{page} · OPC Hub`).
  - `LocalizedPagination` / `LocalizedRichTextField` (`src/i18n/localized-ui.tsx`) truyền nhãn `common.pager.*` / `common.editor.*`; dùng ở 4 màn phân trang + 2 ô soạn thảo.
  - `packages/ui` RichTextField: thêm prop `labels` tuỳ chọn (mặc định tiếng Việt như cũ → Admin không đổi); tách `toolbar.ts`, `labels.ts` (giữ `max-lines-per-function`).
  - Định dạng: `src/i18n/format.ts` (`fmtInt`, `fmtCompact`, `formatLocale`) + `LocaleSync` đặt locale lúc render; bỏ mọi `'vi-VN'` cứng ở Portal; `money()` tiếng Việt giữ "tỷ/triệu", ngôn ngữ khác dạng gọn `Intl` (en-GB: `2bn`).
  - Thứ trong tuần `dashboard.dow.*`; option form tư vấn: value giữ chuỗi tiếng Việt gửi server, nhãn `services.options.*`; lỗi tải ảnh `UploadImageError` mang mã → `common.upload.*`; 3 aria-label + "[Ảnh]" + vai trò mặc định vào messages.
- Lệnh đã chạy + kết quả:
  - Portal `npx vitest run` → `Test Files 38 passed (38)`, `Tests 167 passed (167)`; `tsc`, `eslint src` sạch.
  - `packages/ui` `vitest` → `Tests 45 passed (45)`; `tsc` + `eslint` sạch. Admin `tsc` sạch.
  - Quét dấu tiếng Việt trong `apps/portal/src/**/*.tsx` (bỏ comment, mock, spec) → còn 1: `data-screen-label="Portal · Chat nhóm"` (nhãn harness parity, không hiển thị) — giữ.
  - `.ts` còn tiếng Việt có chủ đích: value option form tư vấn (hợp đồng server), `fmtCompact` nhánh vi, regex @mention / bỏ dấu, `formatVnd` hậu tố `đ`.
  - E2E MSW (build portal + admin): `a-01-login, portal-shell, projects, services, profile, dashboard, community` → `47 passed`, `3 failed` (A-01 admin đăng nhập, TK thành viên vào Admin, BUG-029 stats Admin).
  - Cùng `a-01-login.spec.ts` trên `dev` @ `224d07cf` (worktree `../wt-base-i18n`) → **cùng 3 failed**, `5 passed` ⇒ **lỗi sẵn có** (Admin MSW), không do nhánh này.
- Bước kế: Bước 3 — dịch `en`.

## 2026-10-21 — Bước 3a: dịch `en`
- Commit: `27acad3d` — feat(portal-i18n): add english translation
- Đã làm: 12 file `messages/en/*.json` (1.226 chuỗi lá, AI dịch theo bảng thuật ngữ); `messages/REVIEW.md` (trạng thái soát từng bộ, thuật ngữ).
- Lệnh đã chạy + kết quả: `npx vitest run src/i18n/messages.spec.ts` → `Tests 13 passed (13)`.
- Điểm cần người soát (en): `membership.popup.title` = "Service packages"; `services.status.won/lost` = "Won/Declined"; `projects.form.err.badEquity` dùng dấu chấm thập phân "0.1%"; ví dụ tên "Nguyen Van An" giữ không dấu.
- Bước kế: dịch `id`, `ms`.

## 2026-10-21 — Bước 3b: dịch id, ms, th, zh, fil, km, lo, my
- Commit (mỗi ngôn ngữ một commit, đúng thứ tự): `3858d0dd` id · `f87061bb` ms · `d3687210` th · `093e6711` zh · `6b20aebe` fil · `d956c3a9` km · `ae9674f1` lo · `2a307934` my.
- Đã làm: mỗi bộ 12 file, 1.226 chuỗi lá; AI dịch song song (mỗi agent chỉ ghi thư mục bộ của mình), bảng thuật ngữ theo ngôn ngữ trong brief.
- Chỉnh tay: `fil/projects.json` `form.err.badEquity` "0,1%" → "0.1%" (dấu thập phân Philippines).
- Lệnh đã chạy + kết quả: `npx vitest run src/i18n/messages.spec.ts` (toàn bộ 9 bộ) → `Test Files 1 passed (1)`, `Tests 109 passed (109)`.
- Điểm cần người bản xứ soát (đã ghi trong báo cáo cuối): ngân sách "triệu" không ghi tiền tệ ở `services.options.budget.*` (mọi bộ — đề xuất thêm "VND" ở nguồn); "hộ kinh doanh" không có tương đương chính xác (ms/fil/lo); câu ghép quanh email (`*.descLead`) ở my/zh; tên ví dụ đổi theo địa phương (id/ms/fil/zh/lo); "Offline" của sự kiện (ms/km/my).
- Bước kế: Bước 4 — e2e MSW toàn bộ + `i18n.spec`.

## 2026-10-21 — Bước 4: e2e MSW (hành vi + giao diện theo ngôn ngữ)
- Commit: `33981c48` — fix(portal-i18n): keep message arrays, localize event weekdays, wrap event chips · `a1222f57` — test(e2e): add portal i18n behavior and ui checks per locale
- Phạm vi e2e theo Chủ nhà (2026-10-21): viết test hành vi / giao diện khi đổi ngôn ngữ, **không** chạy lại toàn bộ bộ e2e.
- Đã làm:
  - `e2e/behavior/helpers/i18n.ts`: chuỗi mong đợi đọc từ `messages/<bộ>` (người soát sửa bản dịch không vỡ test); `viLeftovers` (chuỗi vi có dấu đã được dịch khác) + `visibleMatches` (nút chữ đang hiện trùng nguyên văn).
  - `i18n.spec.ts` (14 test): AC-1/2 × 11 mã (đăng nhập + Dashboard, `<html lang>`, tiêu đề tab), AC-3 cookie lạ → vi, AC-5 en dấu phẩy nghìn, AC-6 chọn English → giữ sau tải lại.
  - `i18n-screens.spec.ts` (22 test): 11 mã × 1440px / 390px, đi qua Cộng đồng, Chat nhóm, Sự kiện, Dự án, Affiliate, Gói dịch vụ, Hồ sơ (+ đổi tab Bảo mật): tiêu đề màn + tiêu đề tab đúng bản dịch, không sót chuỗi giao diện tiếng Việt, không cuộn ngang, ảnh chụp mỗi màn (attachment).
- Lỗi test bắt được và đã sửa (commit `33981c48`):
  1. `/services` mọi ngôn ngữ ≠ vi: "Không thể tải dữ liệu" — `overlay()` biến mảng (`t.raw('benefits')`) thành object → `.map is not a function`. Sửa giữ mảng; `overlay.spec.ts`.
  2. Thứ viết tắt sự kiện tiếng Việt ("T5, 22/10") ở sidebar, màn Sự kiện, Hồ sơ → `eventDay()` dựng lại từ `startsAt` theo giờ VN (vi giữ chuỗi server); "Online/Offline" sidebar lấy `events.mode`.
  3. 390px `ms`: chip lọc sự kiện ("Dalam talian", "Bersemuka") tràn → chip cuộn trong khối trên mobile.
- Lệnh đã chạy + kết quả:
  - `playwright test --project=behavior behavior/i18n-screens.spec.ts behavior/i18n.spec.ts --workers=4` → `36 passed (1.7m)`
  - Hồi quy màn liên quan (vi): `events, profile, services, portal-shell, membership` → `31 passed (50.6s)`
  - Portal `vitest run` → `Test Files 39 passed (39)`, `Tests 279 passed (279)`; `tsc`, `eslint` sạch.
  - (Trước khi đổi phạm vi) chạy toàn bộ behavior MSW: `117 passed / 39 failed` — toàn bộ fail là Admin/Affiliate-admin (đăng nhập Admin MSW không chuyển trang); A-01 cùng fail trên `dev` @ `224d07cf` ⇒ lỗi sẵn có, không thuộc Portal.
- Quyết định: chuỗi trùng dữ liệu (tên TK demo "Nguyễn Văn An"; lĩnh vực dự án do Admin quản lý — D-65 giữ vi) không tính là sót dịch; chỉ quét namespace của màn + khung.
- Bước kế: Bước 5 — chạy `i18n.spec` + `i18n-screens.spec` trên server native.
