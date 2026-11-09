# TIP-V46-823: Tổng quan Admin — Tương tác chọn khoảng lịch, chuyển mốc tăng trưởng thành viên (Tuần / Tháng / Năm) & cải thiện tìm kiếm topbar

## HEADER

- TIP-ID: TIP-V46-823
- Project: OPCHUB
- Module: `apps/admin/src/features/overview`, `apps/server/src/modules/reporting`, `packages/shared/src/api-domains/overview`, `packages/ui/src/global-search`
- Priority: **P2** (Hoàn thiện tương tác thực tế từ các mock UI tĩnh của Prototype)
- Depends on: V46-818, V46-821
- Estimated: M
- REQ / D:
  - **REQ-122**: Admin Tổng quan: KPI, biểu đồ tăng trưởng, đăng ký mới (AD-01)
  - **D-89**: Prototype v4 thắng về giao diện; các nút prototype chưa bấm được vẫn làm đúng nghiệp vụ (D-95), không để UI "chết"
  - **BR-491**: Tìm kiếm chung topbar (nhập từ 2 ký tự, Enter mở kết quả đầu, thông báo kết quả)
  - **BUG-029**: Khoảng ngày mặc định là từ ngày 01 đầu tháng hiện tại đến hôm nay (giờ VN)
  - **S-03**: Cache Redis cô lập theo query key, thời gian sống ngắn, không query DB trong vòng lặp
- **Files touched:**
  - `packages/shared/src/api-domains/overview.ts` (modify: thêm `adminOverviewQuerySchema`, nới `growth` schema hỗ trợ nhãn tuần/tháng/năm linh hoạt)
  - `apps/server/src/modules/reporting/overview.controller.ts` (modify: nhận query `from`, `to`, `period` qua `@ZodQuery`)
  - `apps/server/src/modules/reporting/overview.service.ts` (modify: hàm `overview(query)` tổng hợp `stats_daily` theo 7 tuần / 7 tháng / 5 năm; cô lập Redis cache key theo tham số)
  - `apps/server/src/modules/reporting/overview.service.spec.ts` (modify / create: unit test cho các mốc `period` và khoảng ngày)
  - `apps/admin/src/features/overview/components/overview-screen.tsx` (modify: thay thẻ `div` tĩnh bằng `<DateRangePicker>` từ `@opchub/ui`)
  - `apps/admin/src/features/overview/components/growth-chart.tsx` (modify: chuyển thẻ `span` tĩnh thành tab tương tác `Tuần` / `Tháng` / `Năm`, kết nối state `period`)
  - `apps/admin/src/features/overview/hooks/use-overview.ts` (modify: nhận query params `{ from?, to?, period? }` đồng bộ URL)
  - `apps/admin/src/features/overview/data.ts` (modify: hàm `fetchOverview` nhận tham số query)
  - `apps/admin/src/features/overview/data.spec.ts` (modify: bổ sung test format và query label)
  - `packages/ui/src/global-search/global-search.tsx` (modify: hiển thị gợi ý khi focus/nhập dưới 2 ký tự, xử lý Enter nhất quán)
  - `packages/ui/src/global-search/search-results.tsx` (modify: thông điệp rỗng rõ ràng)
- **Parallel-safe with:** none (chạy độc lập trên domain reporting/overview)

---

## CONTEXT

- **Vấn đề phát hiện khi kiểm tra**:
  1. **Button khoảng lịch**: Tại `apps/admin/src/features/overview/components/overview-screen.tsx`, nút ngày đang chỉ là một thẻ `<div className={rangeCss.box}>` tĩnh hiển thị text cố định, không có sự kiện `onClick`, không mở DatePicker popup.
  2. **Tăng trưởng thành viên**: Tại `apps/admin/src/features/overview/components/growth-chart.tsx`, 3 nhãn `Tuần` · `Tháng` · `Năm` là 3 thẻ `<span>` tĩnh, `styles.periodOn` gán chết cho Tháng. Backend `GET /admin/overview` chỉ query cố định 7 tháng từ `stats_daily`, chưa có logic tuần hoặc năm.
  3. **Thanh tìm kiếm Topbar**: Đã có code nhưng yêu cầu gõ tối thiểu 2 ký tự mới kích hoạt dropdown mà không có tooltip/hint báo người dùng; khi bấm Enter không có kết quả chi tiết nếu chưa có mục chọn.

---

## APPLICABLE STANDARDS

- [frontend/antd-ui](../standards/frontend/antd-ui.md) — Sử dụng component `DateRangePicker` Ant Design, token bảng màu, bo góc 6px, chiều cao 40px chuẩn prototype
- [frontend/data-state](../standards/frontend/data-state.md) — Quản lý trạng thái qua URL query parameters (`useUrlParams`) và TanStack Query key isolation
- [frontend/ui-parity](../standards/frontend/ui-parity.md) — Khớp pixel và style theo `docs/spec/index.html:443` và `:2807`
- [backend/api-conventions](../standards/backend/api-conventions.md) — Validate tham số REST qua zod query schema
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) — Controller, Service cô lập, không leak business logic
- [database/query-indexing](../standards/database/query-indexing.md) — Query `stats_daily` theo index có sẵn `(day, metric, dimension)`

---

## TASK

1. Thay thế box hiển thị khoảng ngày tĩnh trên Admin Tổng quan bằng component `DateRangePicker` tương tác đầy đủ, hỗ trợ chọn ngày tự do và các preset nhanh (Hôm nay, 7 ngày qua, 30 ngày qua, Tháng này, Tháng trước), lưu vào URL param `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
2. Biến 3 nút `Tuần` / `Tháng` / `Năm` trên biểu đồ tăng trưởng thành viên thành các tab chuyển đổi có thể bấm được, kết nối với state `?period=week|month|year`, cập nhật Backend để đọc `stats_daily` nhóm theo 7 tuần gần nhất (`period=week`), 7 tháng gần nhất (`period=month`), hoặc 5 năm gần nhất (`period=year`).
3. Cải thiện trải nghiệm thanh tìm kiếm `AdminSearch` trên Topbar: hiển thị hướng dẫn gợi ý "Nhập từ 2 ký tự để tìm kiếm..." khi ô tìm kiếm được focus mà chưa đủ ký tự, và thông báo rỗng thân thiện khi không có kết quả.

---

## SPECIFICATIONS

### 1. Date Range Picker trên Tổng quan
- Sử dụng component `DateRangePicker` từ `@opchub/ui` (đã được xây dựng sẵn từ Ant Design RangePicker, chiều cao 40px, bo tròn 6px, icon lịch `calendar` bên trái và mũi tên `chevronDown` bên phải).
- Mặc định khi vào trang: Nếu URL không có `from`/`to`, hiển thị khoảng từ ngày 01 đầu tháng hiện tại đến hôm nay (theo `BUG-029`).
- Khi người dùng chọn khoảng ngày mới:
  - Cập nhật URLSearchParams `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
  - Hook `useOverview` tự động kích hoạt refetch API với query mới.
  - Backend `GET /admin/overview?from=...&to=...` nhận query, tính toán số liệu thẻ KPI dựa trên khoảng ngày chỉ định.

### 2. Tăng trưởng thành viên: Chuyển đổi Tuần / Tháng / Năm
- Component `GrowthChart`:
  - 3 nút `Tuần`, `Tháng`, `Năm` có `role="tab"`, con trỏ chuột `cursor: pointer`, hiệu ứng hover và active `styles.periodOn`.
  - Giá trị đồng bộ vào query param `?period=week|month|year` (mặc định `month`).
  - Cột trục X:
    - `month`: 7 tháng (VD: `T5`, `T6`, `T7`, `T8`, `T9`, `T10`, `T11`).
    - `week`: 7 tuần (VD: `Tuần 40`, `Tuần 41`, ..., `Tuần 46` hoặc `W40`..`W46`).
    - `year`: các năm có số liệu (VD: `2022`, `2023`, `2024`, `2025`, `2026`).
- Backend `OverviewService`:
  - Schema `adminOverviewQuerySchema`:
    ```ts
    export const adminOverviewQuerySchema = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      period: z.enum(['week', 'month', 'year']).default('month'),
    });
    ```
  - Query `stats_daily`:
    - Với `period=week`: Nhóm `day` theo tuần ISO (`to_char(day, 'IYYY-"W"IW')`), lấy 7 tuần gần nhất.
    - With `period=month`: Giữ nguyên logic 7 tháng gần nhất.
    - With `period=year`: Nhóm `day` theo năm (`to_char(day, 'YYYY')`).
  - Cache Redis: Khóa cache phải chứa tham số: `admin:overview:${period}:${from ?? ''}:${to ?? ''}` với TTL 60 giây (S-03).

### 3. Tìm kiếm chung Topbar
- Trong `packages/ui/src/global-search/global-search.tsx`:
  - Khi ô input được focus hoặc gõ < 2 ký tự: hiển thị một dòng gợi ý mờ nhẹ trong dropdown hoặc placeholder rõ ràng: "Nhập ít nhất 2 ký tự để tìm kiếm...".
  - Giữ nguyên quy tắc BR-491: Phím Enter khi đang mở kết quả sẽ mở kết quả đầu tiên; Esc đóng popover.
  - Khi không tìm thấy kết quả: hiển thị "Không tìm thấy kết quả cho '<từ_khóa>'".

---

## ACCEPTANCE CRITERIA

### Kịch bản 1: Chọn khoảng ngày trên Tổng quan
- **Given**: Quản trị viên đang ở màn hình Tổng quan `/overview`.
- **When**: Bấm vào button khoảng lịch ở góc phải trên.
- **Then**: Popup lịch mở ra với danh sách preset ("Hôm nay", "7 ngày qua", "30 ngày qua", "Tháng này", "Tháng trước") và bảng chọn 2 tháng.
- **When**: Chọn preset "30 ngày qua".
- **Then**: URL cập nhật `?from=...&to=...`, button hiển thị nhãn ngày đã chọn, dữ liệu 4 thẻ số tự động cập nhật.

### Kịch bản 2: Chuyển tab Tuần / Tháng / Năm biểu đồ tăng trưởng
- **Given**: Biểu đồ Tăng trưởng thành viên đang hiển thị tab "Tháng".
- **When**: Quản trị viên click vào tab "Tuần".
- **Then**: Tab "Tuần" có gạch chân xanh `styles.periodOn`, URL có `?period=week`.
- **Then**: Các cột biểu đồ đổi sang nhãn tuần (7 cột tuần), số liệu active/fresh/inactive tương ứng từng tuần.
- **When**: Click vào tab "Năm".
- **Then**: Tab "Năm" active, các cột biểu đồ đổi sang nhãn các năm.

### Kịch bản 3: Tương tác thanh tìm kiếm topbar
- **Given**: Ô tìm kiếm trên topbar Admin.
- **When**: Focus vào ô và gõ 1 ký tự (VD: "a").
- **Then**: Hiển thị popup gợi ý "Nhập từ 2 ký tự để tìm kiếm...".
- **When**: Gõ tiếp ký tự thứ 2 (VD: "an").
- **Then**: Dropdown gửi API tìm kiếm và hiển thị danh sách kết quả gom theo nhóm: Thành viên, Gian hàng, Nhu cầu, Dự án, Nhóm.
- **When**: Nhấn phím Enter.
- **Then**: Điều hướng tới trang chi tiết hoặc danh sách lọc tương ứng của kết quả đầu tiên.

---

## CONSTRAINTS

- **DO NOT**:
  - Không phá vỡ định dạng dữ liệu trả về hiện tại của `GET /admin/overview` khi không truyền param (phải backward-compatible 100%).
  - Không bỏ kiểm tra quyền RBAC trên endpoint hay trên giao diện.
  - Không thực hiện query nặng lặp qua từng hàng `stats_daily`; phải dùng aggregation `sum()`, `GROUP BY` trực tiếp trong SQL.
- **REUSE**:
  - Tái sử dụng component `DateRangePicker` có sẵn trong `@opchub/ui/src/date-range-picker`.
  - Tái sử dụng helper `chartAxis`, `chartMax`, `barHeight` trong `apps/admin/src/features/overview/data.ts`.
- **SKIP**:
  - Chưa cần thêm các chỉ số KPI mới ngoài các trường đã có trong `AdminOverview`.
  - Chưa làm trang kết quả tìm kiếm độc lập `/admin/search` dạng toàn màn hình (vẫn theo đúng BR-491 dạng dropdown topbar).

---

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] Implement đúng `Files touched` — không thêm file ngoài scope
- [ ] Mọi Acceptance Criteria test PASS — ghi kết quả từng cái (không "pass" chung chung)
- [ ] Self-test THẬT: `pnpm --filter @opchub/server test` và `pnpm --filter @opchub/admin test` — paste output thật, KHÔNG chỉ nói "pass"
- [ ] Đảm bảo `pnpm lint && pnpm typecheck` xanh 100%
- [ ] Cache Redis cho `/admin/overview` cô lập đầy đủ theo `period` và `range` (S-03)
- [ ] Giao diện DateRangePicker trên màn hình Tổng quan khớp chiều cao 40px và style của prototype v4
