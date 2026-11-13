# TIP-V46-825: Nhãn bộ chọn ngôn ngữ theo tên nước ở cả Portal lẫn Admin

## HEADER
- **TIP-ID:** TIP-V46-825
- **Project:** OPCHUB
- **Module:** `packages/shared` (fixtures), `packages/ui` (`LanguageMenu`), `apps/admin` (font subset menu), `apps/portal` + `apps/admin` presentation
- **Priority:** P1
- **Depends on:** TIP-V46-824 (đã merge vào `dev` tại `571e3772`)
- **Estimated:** S
- **REQ / D:** **D-142** (owner chốt 13/11/2026), kèm D-133, D-134, D-141, D-06, D-65
- **Files touched:**
  - Shared fixtures: `packages/shared/src/fixtures/prototype-seed.json` (modify), `packages/shared/src/fixtures/locale.ts` (modify), `packages/shared/src/fixtures/fixtures.spec.ts` (modify)
  - Shared UI: `packages/ui/src/auth/language-menu.tsx` (modify), `packages/ui/src/auth/language-menu.spec.tsx` (modify)
  - Admin font subset & receipt: `apps/admin/public/fonts/LanguageMenu-Regular.woff2` (modify), `apps/admin/public/fonts/NotoSansSC-Regular.woff2` (modify), `apps/admin/public/fonts/NotoSansThai-Regular.woff2` (modify), `apps/admin/public/fonts/NotoSansKhmer-Regular.woff2` (modify), `apps/admin/public/fonts/NotoSansLao-Regular.woff2` (modify), `apps/admin/public/fonts/NotoSansMyanmar-Regular.woff2` (modify), `apps/admin/src/i18n/font-assets.json` (modify), `apps/admin/messages/REVIEW.md` (modify)
  - Browser & parity tests: `e2e/behavior/i18n.spec.ts` (modify), `e2e/behavior/auth-flows.spec.ts` (modify), `e2e/behavior/auth-responsive-header.spec.ts` (modify), `e2e/behavior/portal-shell.spec.ts` (modify), `e2e/behavior/admin-i18n/navigation.ts` (modify), `e2e/behavior/admin-i18n-disabled.spec.ts` (modify), `e2e/audit/admin-i18n-fonts.spec.ts` (modify), `e2e/parity/scenarios/auth.ts` (modify), `e2e/parity/scenarios/portal-shell.ts` (modify)
  - Docs / TIP / Report: `coding-packs/01-REQUIREMENTS-MATRIX.md` (modify), `coding-packs/02-TASK-GRAPH.md` (modify), `coding-packs/tips/TIP-V46-825-language-country-labels.md` (create), `coding-packs/reports/TIP-V46-825-completion.md` (create)
- **Parallel-safe with:** sequential — đụng `packages/shared/src/fixtures/prototype-seed.json` và `packages/ui/src/auth/language-menu.tsx` dùng chung giữa Portal và Admin.

## CONTEXT
- Owner yêu cầu trực tiếp (13/11/2026) và chốt 3 câu làm rõ (**D-142**):
  1. Đổi chữ trên nút bấm chọn ngôn ngữ (Auth + Topbar ở cả Portal lẫn Admin) từ `active.native` sang **tên nước** (`active.country`, ví dụ `Việt Nam`, `Anh`, `Trung Quốc`, `Singapore`, `Brunei`...); trong popup giữ dòng chính là tên nước (`o.country`) + dòng phụ là tên ngôn ngữ bản ngữ (`o.native`).
  2. Đổi `country` của 2 mục `en` (cờ `gb` 🇬🇧) và `zh` (cờ `cn` 🇨🇳) từ `"Toàn cầu"` / `"Châu Á"` thành **`"Anh"`** và **`"Trung Quốc"`**; 10 mục ASEAN còn lại giữ nguyên.
  3. Giữ danh sách 12 tên nước tiếng Việt cố định hiện có cho mọi giao diện ngôn ngữ.
- Subset font `apps/admin/public/fonts/LanguageMenu-Regular.woff2` của Admin chỉ nhúng đúng tập ký tự `native + country` của 12 mục (`apps/admin/src/i18n/font-config.spec.ts`); thêm `"Anh"` và `"Trung Quốc"` bổ sung 3 mã ký tự `A` (`0x41`), `Q` (`0x51`), `ố` (`0x1ED1`) nên cần build lại từ `infra/scripts/build-admin-fonts.py` để không sinh ô vuông (tofu) và khớp SHA256 trong `font-assets.json`.

## APPLICABLE STANDARDS
- [frontend/antd-ui](../standards/frontend/antd-ui.md) & [frontend/ui-parity](../standards/frontend/ui-parity.md) — giữ nguyên bố cục, kích thước nút, cờ quốc gia (D-133), phân loại D-142 khi lệch chữ với prototype tĩnh (D-134).
- [global/code-structure](../standards/global/code-structure.md) — TypeScript strict, không `any`, file nhỏ gọn.
- [testing/testing](../standards/testing/testing.md) — unit + E2E hai cổng Portal/Admin đồng bộ với quyết định mới.
- [global/git-workflow](../standards/global/git-workflow.md) — nhánh `feature/TIP-V46-825-*` tách từ `dev`, commit đường dẫn cụ thể, tạo PR vào `dev`, không tự merge.

## TASK
Đổi nhãn hiển thị trên nút mở bộ chọn ngôn ngữ ở cả Portal lẫn Admin sang tên nước (`country`), chuẩn hóa `en.country = "Anh"` và `zh.country = "Trung Quốc"`, cập nhật subset font `LanguageMenu-Regular.woff2` của Admin và toàn bộ unit/browser tests liên quan.

## SPECIFICATIONS
1. **Danh mục `LANGS` (`D-142`):** Trong `packages/shared/src/fixtures/prototype-seed.json`, mục `code: "en"` đổi `country` thành `"Anh"` và mục `code: "zh"` đổi `country` thành `"Trung Quốc"`. Giữ nguyên thứ tự 12 mục, `code`, `dict`, `cc`, `flag` và `native`. Bổ sung hàm `localeCountry(code)` trong `packages/shared/src/fixtures/locale.ts` (mặc định `'Việt Nam'`).
2. **Component `LanguageMenu` (`D-142`, `D-133`):** Trong `packages/ui/src/auth/language-menu.tsx`, nút trigger (`variant="auth"` và `variant="topbar"`) hiển thị `{active?.country}` cạnh cờ `{active?.flagSrc}` (hoặc icon `globe` dự phòng khi danh sách rỗng). Trong popup `listbox`, giữ nguyên 2 dòng `<span className={styles.country}>{o.country}</span>` và `<span className={styles.native}>{o.native}</span>`.
3. **Font subset Admin (`D-37`, `D-141`, `D-142`):** Chạy `infra/scripts/build-admin-fonts.py` với bộ công cụ đã pin (`fonttools==4.68.0`, `Brotli==1.2.1`) để cập nhật `apps/admin/public/fonts/LanguageMenu-Regular.woff2`, `apps/admin/src/i18n/font-assets.json` và bảng kích thước trong `apps/admin/messages/REVIEW.md`.
4. **Không đụng ngoài phạm vi:** Không đổi `docs/spec/index.html` (chỉ đọc), không đổi tên cookie `NEXT_LOCALE`, không đổi mapping `en-SG → en` / `ms-BN → ms`, không đổi backend hay DB.

## ACCEPTANCE CRITERIA
- **AC825-01 (Fixtures):** Given `languageOptions` / `languages` từ `@opchub/shared/fixtures`; When đọc 12 mục; Then đủ 12 tên nước tiếng Việt cố định (`Việt Nam, Anh, Trung Quốc, Indonesia, Thái Lan, Malaysia, Singapore, Philippines, Campuchia, Lào, Myanmar, Brunei`), `en` là `"Anh"` và `zh` là `"Trung Quốc"` (`packages/shared/src/fixtures/fixtures.spec.ts`).
- **AC825-02 (LanguageMenu UI):** Given `LanguageMenu` ở cả `variant="auth"` và `variant="topbar"`; When chọn `vi`, `en`, `en-SG`, `th`, `ms-BN`; Then nút trigger hiển thị tên nước (`Việt Nam`, `Anh`, `Singapore`, `Thái Lan`, `Brunei`) kèm đúng cờ, còn popup vẫn hiện cả dòng tên nước lẫn dòng ngôn ngữ bản ngữ (`packages/ui/src/auth/language-menu.spec.tsx`).
- **AC825-03 (Admin Font Subset):** Given `LanguageMenu-Regular.woff2` và `font-assets.json`; When chạy `font-config.spec.ts` và `admin-i18n-fonts.spec.ts`; Then mọi ký tự trong `native + country` (kể cả `A`, `Q`, `ố`) đều có glyph hợp lệ, khớp SHA256 và không gọi Google Fonts CDN (`apps/admin/src/i18n/font-config.spec.ts`, `e2e/audit/admin-i18n-fonts.spec.ts`).
- **AC825-04 (Portal & Admin Browser E2E):** Given màn Auth và Topbar của Portal lẫn Admin; When mở trang và đổi ngôn ngữ (`vi → en`, `en-SG`, `my`...); Then nút ngôn ngữ hiện tên nước tương ứng, đổi giao diện đúng bundle, giữ cookie sau F5 và không tràn khung ở `1440`/`390` (`i18n.spec.ts`, `portal-shell.spec.ts`, `auth-responsive-header.spec.ts`, `admin-i18n-navigation.spec.ts`, `admin-i18n-disabled.spec.ts`).

## CONSTRAINTS
- **DO NOT:** sửa `docs/spec/index.html`, đổi cookie/API/DB, ẩn dòng `native` trong popup, hay dịch tự động tên nước theo ngôn ngữ giao diện.
- **SKIP:** thay đổi tab `Admin › Cài đặt › Ngôn ngữ` ngoài trường `country` tự động cập nhật từ `languages` fixture (theo lựa chọn A1 của owner).

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng danh sách **Files touched**, không dùng `git add -A`
- [x] AC825-01 → AC825-03 unit/font pass; AC825-04 cập nhật spec E2E đồng bộ (dừng chạy browser local theo chỉ đạo tiết kiệm tài nguyên của owner)
- [x] `pnpm lint && pnpm typecheck && pnpm depcheck` + unit suites + `audit-admin-i18n.mjs` pass
- [x] Commit Conventional Commits, push nhánh `feature/TIP-V46-825-language-country-labels`, tạo PR vào `dev` (không tự merge), báo `TIP-V46-825-DONE <sha>`
