# TIP-V2-117 — Completion Report: Portal đa ngôn ngữ (D-65)

- Nhánh `feature/i18n-languages` (base `dev` @ `224d07cf`), log chi tiết: [`TIP-V2-117-progress.md`](TIP-V2-117-progress.md)
- **Bản dịch là máy dịch (AI), CHƯA người bản xứ soát.** Độ tin cậy thấp: **km, lo, my**; trung bình: th, fil.
- Trạng thái soát từng bộ: [`apps/portal/messages/REVIEW.md`](../../apps/portal/messages/REVIEW.md)

## Đã làm

| Phần | Commit |
|---|---|
| Khung locale: `bundleOf`, `intlLocaleOf`, `loadMessages` (import động, khoá thiếu → vi), `<html lang>`, `messages.spec`, `locales.spec` | `d8993ad1` |
| Chuỗi cứng → messages: 16 tiêu đề trang (`common.meta.*`), nhãn phân trang / soạn thảo, thứ trong tuần, option form tư vấn, lỗi tải ảnh; bỏ mọi `'vi-VN'` cứng | `2c57f169` |
| Dịch en · id · ms · th · zh · fil · km · lo · my (12 namespace × 1.226 chuỗi mỗi bộ) | `27acad3d` · `3858d0dd` · `f87061bb` · `d3687210` · `093e6711` · `6b20aebe` · `d956c3a9` · `ae9674f1` · `2a307934` |
| Sửa lỗi e2e bắt được: mảng message bị biến thành object (`/services` lỗi ở mọi ngôn ngữ ≠ vi); thứ sự kiện "T5" → theo ngôn ngữ; chip lọc sự kiện tràn 390px (ms) | `33981c48` |
| E2E hành vi + giao diện theo ngôn ngữ (`i18n.spec`, `i18n-screens.spec`) | `a1222f57` |
| `SKIP_SEED` áp cả fixture per-test (chạy native trên DB dùng chung) | `0043c28f` |

## Bảng thuật ngữ (nguồn → en; các bộ khác theo brief từng ngôn ngữ, xem log Bước 3)

| Tiếng Việt | English |
|---|---|
| Thành viên | member |
| Phí thành viên | membership fee |
| Gói dịch vụ | service packages |
| Nhóm / Chủ nhóm / Chat nhóm | group / group owner / group chat |
| Sự kiện | event |
| Dự án OPC | OPC project |
| Nhà đầu tư / Gọi vốn | investor / fundraising |
| Đối tác / Affiliate | Affiliate |
| Hoa hồng / Mã giới thiệu | commission / referral code |
| Không dịch | OPC Hub, OPCHUB, OPC, Google, ChatGPT, Gemini, DeepSeek, Facebook, LinkedIn, Zalo, SePay, Vietcombank, ASEAN, VND |

## Acceptance Criteria

| AC | Kết quả | Bằng chứng |
|---|---|---|
| 1. `th` (và mọi bộ): `/login`, `/dashboard`, `/community`, `/projects`, `/profile` + chat, sự kiện, affiliate, gói dịch vụ đúng ngôn ngữ, `<html lang>`, tiêu đề tab | **PASS** | `i18n.spec` AC-1/2 × 11 mã; `i18n-screens.spec` 11 mã × 2 khổ màn, kiểm không sót chuỗi giao diện vi — MSW 36/36, native 36/36 |
| 2. `en-SG` → `en`, `ms-BN` → `ms` | **PASS** | `locales.spec`; e2e ca `en-SG`, `ms-BN` |
| 3. Cookie lạ → tiếng Việt; không hồi quy | **PASS** | e2e AC-3; hồi quy vi `events, profile, services, portal-shell, membership` 31/31; Bước 2: Portal e2e 47 passed, 3 failed = lỗi sẵn có Admin MSW (cùng fail trên `dev`) |
| 4. `messages.spec` 9 bộ: khoá, biến, ICU, rỗng | **PASS** | `vitest run src/i18n/messages.spec.ts` → 109 passed |
| 5. `en` số 1234 → `1,234` | **PASS** | e2e AC-5 (số từ `/public/stats`), `locales.spec` `fmtInt` |
| 6. Chọn English → đăng nhập → Dashboard tiếng Anh, giữ sau tải lại | **PASS** | e2e AC-6 (MSW + native) |
| 7. `next build` xanh; JS client ≤ +15% | **PASS** | `/dashboard`: dev 1.922.239 B → nhánh 1.926.335 B (**+0,21 %**); bản dịch không nằm trong chunk client (grep "Profil peribadi" trong `.next/static` = 0) |

## Cổng kiểm (2026-10-21)

- `pnpm lint` → Tasks 8 successful · `pnpm typecheck` → 8 successful · `pnpm depcheck` → no dependency violations (685 modules)
- `pnpm test` → 6 successful (portal 280, admin 334, ui 45, shared 140, server 131, integrations 40 passed)
- `pnpm build` → 3 successful

## DEVIATIONS

- `packages/ui` RichTextField: thêm prop `labels` tuỳ chọn (mặc định vi giữ nguyên, Admin không đổi) — TIP mục 7 cho phép.
- Không dùng `_meta` trong JSON (test so khoá chính xác) → trạng thái soát ở `messages/REVIEW.md` (TIP mục 12).
- `e2e/server/test.ts` (ngoài Files touched): `SKIP_SEED` áp cả fixture per-test.
- Phạm vi e2e theo Chủ nhà: chỉ chạy bộ i18n (MSW + native), không chạy lại toàn bộ.
- E2E native chạy `SKIP_SEED=1`: `opchub_dev` đã migrate theo nhánh bot (40 migration, enum `bot_thread_status` khác) nên `seed:demo` của nhánh này fail; không sửa DB dùng chung.
- Còn tiếng Việt có chủ đích: `data-screen-label` (harness parity, không hiển thị); value option form tư vấn (hợp đồng server); dữ liệu server (tên nhóm, sự kiện, lĩnh vực dự án) — D-65 giữ.

## Ghi chú cho người soát dịch

- `services.options.budget.*` ghi "triệu" không kèm tiền tệ (mọi bộ) — đề xuất thêm "VND" ở nguồn.
- "Hộ kinh doanh" không có tương đương chính xác (ms/fil/lo).
- Câu ghép quanh email (`*.descLead`) ở my/zh cần đọc lại ngữ pháp.
- Tên ví dụ đã đổi theo địa phương (id/ms/fil/zh/lo).
- "Offline" của sự kiện (ms/km/my); `membership.popup.title` en = "Service packages".
- Thứ sự kiện ở ngôn ngữ ≠ vi lấy từ `Intl` (vd "Thu, 22/10").
