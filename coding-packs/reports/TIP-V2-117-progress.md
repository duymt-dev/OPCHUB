# TIP-V2-117 — log tiến độ (append-only)

> Goal: [`plans/GOAL-V2-117-i18n.md`](../plans/GOAL-V2-117-i18n.md) · TIP: [`tips/TIP-V2-117-portal-i18n.md`](../tips/TIP-V2-117-portal-i18n.md)
> Nhánh `feature/i18n-languages`, base `dev` @ `224d07cf`. Mỗi bước append một mục, không sửa mục cũ.

## Trạng thái

| Bước | Nội dung | Trạng thái | Commit |
|---|---|---|---|
| 1 | Khung locale + test | xong | `d8993ad1` |
| 2 | Chuỗi cứng → messages | chưa | |
| 3 | Dịch en, id, ms, th, zh, fil, km, lo, my | chưa | |
| 4 | E2E MSW + `i18n.spec` | chưa | |
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
