# TIP-V46-825 — Completion Report: Nhãn bộ chọn ngôn ngữ theo tên nước (Portal + Admin)

**STATUS: DONE — READY FOR OWNER PR REVIEW (`D-142`)**

## 1. Tóm tắt thay đổi (`D-142`)

1. **Danh mục ngôn ngữ (`packages/shared/src/fixtures/prototype-seed.json`, `packages/shared/src/fixtures/locale.ts`):**
   - Đổi `country` của `en` (`gb` 🇬🇧) từ `"Toàn cầu"` thành **`"Anh"`**, và `zh` (`cn` 🇨🇳) từ `"Châu Á"` thành **`"Trung Quốc"`**.
   - Giữ nguyên 10 mục ASEAN còn lại (`Việt Nam, Indonesia, Thái Lan, Malaysia, Singapore, Philippines, Campuchia, Lào, Myanmar, Brunei`), thứ tự 12 mục, `code`, `dict`, `cc`, `flag`, `native`.
   - Bổ sung helper `localeCountry(code)` (mặc định `'Việt Nam'`).
2. **Component `LanguageMenu` dùng chung Portal + Admin (`packages/ui/src/auth/language-menu.tsx`):**
   - Nút trigger (`variant="auth"` và `variant="topbar"`) hiển thị `{active?.country}` thay vì `{active?.native}` cạnh cờ quốc gia (`D-133`, `D-142`).
   - Popup `listbox` (`CHỌN QUỐC GIA & NGÔN NGỮ`) giữ nguyên bố cục 2 dòng: dòng chính `{o.country}`, dòng phụ `{o.native}`.
3. **Font subset Admin (`apps/admin/public/fonts/*.woff2`, `apps/admin/src/i18n/font-assets.json`, `apps/admin/messages/REVIEW.md`):**
   - Chạy lại `infra/scripts/build-admin-fonts.py` (`fonttools==4.68.0`, `Brotli==1.2.1`) để nhúng đủ ký tự của `"Anh"` và `"Trung Quốc"` (`A`, `Q`, `ố`) vào `LanguageMenu-Regular.woff2` (`9,752` bytes, `67` cmap entries, SHA256 `9b82a6f6...`) và đồng bộ receipt `font-assets.json` + bảng kích thước `REVIEW.md`.
4. **Cập nhật bộ test unit + E2E / parity (`packages/shared`, `packages/ui`, `e2e/`):**
   - Bổ sung unit test `AC825-01` (`fixtures.spec.ts`) và `AC825-02` (`language-menu.spec.tsx` cho cả `auth` và `topbar`, phân biệt `en` → `Anh` và `en-SG` → `Singapore`).
   - Đồng bộ kỳ vọng nhãn nút ngôn ngữ theo tên nước trong 9 file E2E/parity (`i18n.spec.ts`, `auth-flows.spec.ts`, `auth-responsive-header.spec.ts`, `portal-shell.spec.ts`, `admin-i18n/navigation.ts`, `admin-i18n-disabled.spec.ts`, `admin-i18n-fonts.spec.ts`, `parity/scenarios/auth.ts`, `parity/scenarios/portal-shell.ts`).

## 2. Kết quả kiểm chứng

| Cổng kiểm | Trạng thái | Chi tiết thực tế |
|---|---|---|
| `pnpm lint` | **PASS (8/8)** | Cả 8 package (`@opchub/admin`, `@opchub/portal`, `@opchub/ui`, `@opchub/shared`, `@opchub/e2e`, `@opchub/server`, `@opchub/db`, `@opchub/integrations`) sạch 0 lỗi |
| `pnpm typecheck` | **PASS (8/8)** | `next typegen && tsc --noEmit` trên Portal + Admin + toàn bộ workspace sạch 0 lỗi |
| `pnpm depcheck` | **PASS (0 vi phạm)** | `2942 modules / 8992 dependencies` + `1260 modules / 5995 dependencies` |
| `node infra/scripts/audit-admin-i18n.mjs` | **PASS** | `errors: []`, `unreviewed: []` |
| Unit tests (`@opchub/shared`, `@opchub/ui`, `@opchub/portal`, `@opchub/server`, `@opchub/integrations`, `@opchub/admin`) | **PASS** | `@opchub/shared` (kèm `AC825-01`), `@opchub/ui` (kèm `AC825-02`), `@opchub/portal` (476), `@opchub/server` (276), `@opchub/integrations` (126 + 2 skip sẵn có) đều PASS; `@opchub/admin` pass đủ `font-config.spec.ts` (`AC825-03`), `admin-language-switch.spec.tsx`, `production-catalogs.spec.ts` (49/49), `source-audit.spec.ts` (22/22) và 204/204 file còn lại |
| Local Next build + Playwright E2E | **Dừng theo chỉ đạo owner** | Owner chỉ đạo chốt dừng chạy kiểm thử nặng trên máy local để tiết kiệm tài nguyên (`13/11/2026`); các spec E2E đã được đồng bộ sẵn và kiểm tra qua `lint` + `typecheck` + CI trên PR |

## 3. Lưu ý & Vệ sinh môi trường (`AGENTS.md` Rule 15)

- **Git flow:** Nhánh `feature/TIP-V46-825-language-country-labels` tách từ `dev` (`571e3772`), commit liệt kê đường dẫn tường minh (không dùng `git add -A`), mở PR vào `dev`, **không tự merge**.
- **Parity (`D-134`, `D-142`):** Thay đổi chữ trên nút ngôn ngữ (`Tiếng Việt` → `Việt Nam`) là quyết định chủ đích `D-142` của owner; prototype tĩnh `docs/spec/index.html` giữ nguyên không sửa.
- **PostgreSQL & tiến trình nền:** Không mở kết nối tới PG `5432` / `opchub_test`; toàn bộ tiến trình `vitest` của task đã dừng sạch (`0` tiến trình con rò rỉ). Cụm dịch vụ cô lập có sẵn từ trước (nếu đang giữ cho kiểm thử riêng) không bị can thiệp.
