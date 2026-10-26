# TIP-V4-613 — Trợ lý OPC Hub ở chân sidebar Portal — completion

- Nhánh: `feature/TIP-V4-613-assistant`, xếp chồng trên `feature/TIP-V4-609-local-needs` (PR #26 chưa merge)
- PR: [#27](https://github.com/duymt-dev/OPCHUB/pull/27) (base `feature/TIP-V4-609-local-needs`)
- Commit:
  - `67aeb243` TIP
  - `3b9fea13` Portal: khung Trợ lý, i18n 10 ngôn ngữ, gắn vào shell, Q-V4-613-1..3
  - `c684e63b` e2e + parity
- REQ / D: REQ-513 · REQ-509 · D-72, D-74, D-80 · §27.1 QT-13 · AD-09 / UP-12 · §27.8

## Đã làm

- Feature mới `apps/portal/src/features/assistant`:
  - `AssistantPanel` ở chân sidebar, ngay trên thẻ gói.
  - Mặc định đóng, khi đóng chỉ còn một dòng.
  - Mở ra là accordion các mục danh mục đang bật (AD-09), dùng `useServices()` sẵn có, không thêm API.
  - Mỗi mục có model, mô tả và nút "Đăng ký tư vấn". Nút mở popup Gói dịch vụ ở form của đúng dịch vụ (`openConsultForm`, prototype `wgo`).
  - Liên kết "Xem tất cả dịch vụ →" gọi `openPricingPopup()` (prototype `svwAll`).
  - Nhớ đóng / mở bằng `localStorage` `opc-assistant-open`, có try/catch.
  - Có trạng thái đang tải, lỗi (nút Thử lại) và rỗng.
- `membership`: thêm `openConsultForm`; `index.ts` export thêm `openPricingPopup`.
- `services`: `index.ts` export `useServices`, `ServiceIcon` (feature khác không import nội bộ).
- Shell: `sidebarExtra` = AssistantPanel + PlanBadge.
  - Sidebar thu gọn 76px thì khung ẩn cùng thẻ gói.
  - Mobile: khung nằm trong drawer.
- i18n `assistant.json` cho 10 ngôn ngữ.

## Câu hỏi đã chọn phương án an toàn

1. **Q-V4-613-1** — Prototype không có markup khung, chỉ có logic `svw*` cho một nút nổi; SRS QT-13 ghi "chân sidebar". Làm theo SRS (nguồn ưu tiên cao hơn). Khung đặt trên thẻ gói để thẻ gói giữ vị trí như prototype. Copy do TIP chốt.
2. **Q-V4-613-2** — Không đếm "yêu cầu của tôi" (`nReq`): chưa có API đọc yêu cầu.
3. **Q-V4-613-3** — Không có ảnh `sv-*.png`, không phân trang 8 mục; dùng icon dịch vụ, danh sách cuộn trong khung.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (cảnh báo `<img>` có từ trước) |
| typecheck | sạch (8/8) |
| unit | portal 378 · admin 437 · shared 378 · server 225 · ui 48 · integrations 86 (+2 skip) |
| depcheck | sạch (823 module) |
| build (MSW) | 3/3 |
| test:int | không chạy: TIP không đụng server / db |
| e2e behavior — assistant, portal-shell, a-01-login, membership, popup-v4, needs | 30/30 |

Test mới:

- Unit `features/assistant/model.spec.ts` (2): nhớ trạng thái, storage lỗi không ném, accordion.
- Component `assistant-panel.spec.tsx` (3):
  - mặc định đóng, mục tắt không hiện, nhớ trạng thái;
  - accordion → form đúng dịch vụ, Xem tất cả;
  - lỗi → Thử lại; danh mục rỗng.
- e2e `e2e/behavior/assistant.spec.ts` (2):
  - mở → 10 mục đang bật, không có "Marketing số theo tháng" → tải lại vẫn mở → "Kết nối nguồn vốn" → `/services/fund/request`, ô dịch vụ = `fund` → Xem tất cả → `/services`;
  - sidebar thu gọn thì khung ẩn, mở rộng thì hiện lại; mobile 390 khung nằm trong drawer.

## Parity (không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| P-117 Trợ lý · đóng | — | — | `unreachable`: prototype không có markup (Q-V4-613-1) |
| P-118 Trợ lý · mở | — | — | `unreachable`: như trên |
| P-99 Sidebar (đo lại) | 0,60% | — | đạt. Bản đầu đặt khung dưới thẻ gói, cao 3 dòng → 3,18%; đã đổi vị trí và gọn khung khi đóng |
| P-99-DRAWER (đo lại) | — | 2,82% | đạt |
| P-14 Drawer mobile (đo lại) | — | 2,74% | đạt |
| P-111 Nhu cầu (kiểm không lan) | 0,32% | 0,09% | đạt |
| P-01 Dashboard | 66,44% | 71,74% | không đổi so với trước TIP (66,29 / 71,74), DV-V4-606-1 chờ V4-611 |
| P-13 Sidebar thu gọn | 53,60% | — | nền Dashboard, DV-V4-606-1; khung ẩn khi thu gọn |
| P-105 Khám phá gian hàng | 3,72% | 0,89% | DV-V4-608-1 (3,99% lúc đo V4-608), không vượt |

## Luật cứng 1–14

| # | Luật | |
|---|---|---|
| 1 | Kích thước file | ✅ file lớn nhất `assistant-panel.tsx` < 120 dòng |
| 2 | TS strict, không `any` | ✅ |
| 3 | Ranh giới import | ✅ chỉ qua `index.ts` của `services` / `membership`; depcheck sạch |
| 4–11 | BE / DB / realtime / outbox / audit / adapter | — không đụng |
| 12 | Không secret, không `console.*` | ✅ |
| 13 | Test ở file riêng | ✅ |
| 14 | Commit theo đường dẫn, status sạch | ✅ |

EXPLAIN: không có truy vấn mới.

## Chưa làm / chuyển tiếp

- Đếm yêu cầu tư vấn của tôi cho từng mục (Q-V4-613-2): cần API đọc yêu cầu.
- Owner duyệt vị trí / copy khung (Q-V4-613-1).
