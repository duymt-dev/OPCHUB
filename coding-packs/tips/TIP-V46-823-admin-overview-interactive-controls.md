# TIP-V46-823: Tổng quan Admin — khoảng ngày, chu kỳ tăng trưởng và phản hồi tìm kiếm

## HEADER

- TIP-ID: TIP-V46-823
- Project: OPCHUB
- Module: Admin overview / server reporting / shared overview contract / shared global-search
- Priority: **P2** · Estimated: M · Depends on: V46-818, V46-821
- Branch: `feature/TIP-V46-823-admin-overview-interactive-controls`; tích hợp về `dev`, không tự merge/release `main`.
- **DONE kỹ thuật 10/11/2026:** D-140 implementation `7c44fcab`, native/index follow-up `1c8006d4`; đủ 13 AC, native 26 tests, MSW/native browser 10+10, SQL plans thật. Giữ nguyên DB test cũ; xác minh trên native cluster riêng. Owner duyệt PR/ảnh và quyết định merge.
- Baseline đã đọc: implementation `26cf391d`, report `f2c31796`. Nhãn DONE trong report/task graph là kết quả báo cáo cũ; không thay thế AC của bản review này.
- REQ / D: **REQ-122**, **REQ-625**, BR-491 (§33.4), BUG-029 (TIP-V2-305), D-89 / D-93 / D-95 (prototype và chốt backend), D-107 (phí thật, không trial), D-134 (parity tham khảo + owner duyệt ảnh), D-139 (không mở rộng tìm kiếm), **D-140** (tổng hiện tại, phát sinh theo khoảng); S-03 (cache).
- **Parallel-safe with:** none; tránh sửa đồng thời reporting, overview, global-search và message keys liên quan.

### Files touched — corrective implementation dự kiến

Đây là manifest khi thực thi, **không phải các file code đã sửa ở lượt review tài liệu**. Đường dẫn mới là thiết kế handoff, không khẳng định đã tồn tại. Cập nhật manifest/lý do trước khi mở rộng scope.

| File | Action / trách nhiệm |
|---|---|
| `packages/shared/src/api-domains/overview.ts` | modify: ngày thực/cặp ngày/thứ tự; contract chu kỳ, sparkline mới |
| `packages/shared/src/api-domains/overview.spec.ts` | create: test query contract |
| `packages/shared/src/mock-data/domains/overview.ts` | modify: 7 tuần/7 tháng/5 năm và khoảng ngày theo D-140 |
| `apps/server/src/modules/reporting/overview.controller.ts` | modify nếu cần: shared query/output schema, giữ `overview.view` |
| `apps/server/src/modules/reporting/overview.service.ts` | modify: orchestration, cache, KPI theo D-140; tách helper/SQL |
| `apps/server/src/modules/reporting/overview-intervals.ts` | create: hàm thuần mốc VN, ISO week, month, year |
| `apps/server/src/modules/reporting/overview-intervals.spec.ts` | create: số cột, biên tuần/năm, timezone |
| `apps/server/src/modules/reporting/overview-series.repository.ts` | create: SQL bounded aggregation, snapshot và fresh sparkline |
| `apps/server/src/modules/reporting/overview-flow.repository.ts` | modify: đầu/cuối khoảng cho phát sinh phí, giữ định nghĩa phí thật |
| `apps/server/src/modules/reporting/overview.service.spec.ts` | modify: service/cache/params với fake, không chỉ helper |
| `apps/server/src/modules/reporting/reporting.module.ts` | modify: đăng ký repository mới |
| `apps/server/src/modules/reporting/index.ts` | modify nếu cần: giữ public exports hiện có |
| `apps/server/test/reporting/overview.int.spec.ts` | modify: query/guard/range/cache/SQL thật qua biên năm |
| `apps/server/test/reporting/overview-query-plan.int.spec.ts` | create: EXPLAIN đúng SQL repository trên >10k dòng; fixture riêng, cleanup có guard |
| `coding-packs/reports/evidence/v46-823/native-query-plans.json` | create: PostgreSQL execution plans thật cho week/month/year |
| `coding-packs/reports/evidence/v46-823/native-query-plans-before.json` | create: baseline 905275 dòng, year còn Seq Scan trước index |
| `packages/db/prisma/schema/system.prisma` | modify: ghi chú partial covering index quản lý bằng SQL |
| `packages/db/prisma/migrations/20261120093000_v46_overview_series_covering/migration.sql` | create: partial metric/day INCLUDE value cho overview dimension rỗng |
| `packages/db/prisma/migrations/20261120093000_v46_overview_series_covering/down.sql` | create: rollback index, không xóa dữ liệu |
| `apps/admin/src/features/overview/components/overview-screen.tsx` | modify: orchestrator, truyền range/preset VN |
| `apps/admin/src/features/overview/components/overview-range-control.tsx` | create: tách picker khỏi screen orchestrator |
| `apps/admin/src/features/overview/components/growth-chart.tsx` | modify: tabs/a11y, nhãn custom range |
| `apps/admin/src/features/overview/components/overview.module.css` | modify: underline/hover/focus theo prototype |
| `apps/admin/src/features/overview/components/stat-cards.tsx` | modify: nhãn custom range |
| `apps/admin/src/features/overview/components/overview-controls.spec.tsx` | create: picker/tabs/loading/error/URL |
| `apps/admin/src/features/overview/hooks/use-overview-url.ts` | modify: validation/normalization dựa contract chung |
| `apps/admin/src/features/overview/hooks/use-overview-url.spec.tsx` | create: URL lỗi, F5, range/period giữ nhau |
| `apps/admin/src/features/overview/hooks/overview-range.ts` | create: preset VN tính mới khi dùng, normalize URL qua shared contract |
| `apps/admin/src/features/overview/hooks/use-overview.ts` | modify nếu cần: query key/polling/trạng thái response |
| `apps/admin/src/features/overview/data.ts` | modify: fetch/nhãn/sparkline không đổi theo tab |
| `apps/admin/src/features/overview/data.spec.ts` | modify: serialization, label, sparkline regression |
| `apps/admin/src/mocks/handlers/shell.ts` | modify: parse cùng schema, lỗi như server |
| `apps/admin/src/mocks/overview-handlers.spec.ts` | modify: invalid query + số liệu đổi thật theo filter |
| `packages/ui/src/global-search/global-search.tsx` | modify: hint riêng, không hiện stale hits dưới ngưỡng |
| `packages/ui/src/global-search/components/search-input.tsx` | create: tách input/ARIA khỏi orchestrator, giữ function dưới 80 dòng |
| `packages/ui/src/global-search/search-results.tsx` | modify nếu cần: empty state có từ khóa |
| `packages/ui/src/global-search/types.ts` | modify: props hint/loading/error tương thích caller cũ |
| `packages/ui/src/global-search/global-search.module.css` | modify nếu cần: hint cùng visual system |
| `packages/ui/src/global-search/global-search.spec.tsx` | modify: hint/empty/Enter/Esc/keyboard regression |
| `apps/admin/src/features/shell/components/admin-search.tsx` | modify: truyền hint/empty text/trạng thái từ caller |
| `apps/admin/src/features/shell/hooks/use-global-search.ts` | modify nếu cần: expose loading/error/current query để không báo rỗng sai |
| `apps/admin/messages/vi/common.json` | modify: chỉ thêm key hint/empty-with-query, giữ key cũ |
| `apps/admin/messages/vi/overview.json` | modify: chỉ thêm key custom range |
| `e2e/behavior/admin-overview.spec.ts` | modify: range/period, giữ conversion regression |
| `e2e/playwright.tip823.config.ts` | create: native verification dùng build folder riêng, kế thừa toàn bộ assertions/fixtures chuẩn |
| `coding-packs/reports/evidence/v46-823/server-D-01-1440-unmasked.png` | create: ảnh native desktop không che biểu đồ |
| `coding-packs/reports/evidence/v46-823/server-D-01-390-unmasked.png` | create: ảnh native mobile không che biểu đồ |
| `coding-packs/reports/evidence/v46-823/msw-D-01-1440-unmasked.png` | create: ảnh MSW desktop không che biểu đồ |
| `coding-packs/reports/evidence/v46-823/msw-D-01-390-unmasked.png` | create: ảnh MSW mobile không che biểu đồ |
| `e2e/behavior/global-search.spec.ts` | modify: Admin hint/empty, hồi quy Portal/mobile |
| `coding-packs/reports/TIP-V46-823-completion.md` | modify khi thực thi: kết quả/evidence thật thay claim sai |
| `coding-packs/02-TASK-GRAPH.md` | modify khi cập nhật tiến độ implementation thực tế |
| `coding-packs/reports/ui-parity/results.json` | modify: harness cập nhật riêng kết quả D-01 |
| `coding-packs/reports/ui-parity/results.md` | modify: báo cáo sinh tự động từ harness |
| `coding-packs/reports/ui-parity/diffs/D-01-1440.png` | create/modify nếu harness giữ diff >3% |
| `coding-packs/reports/ui-parity/diffs/D-01-390.png` | create/modify nếu harness giữ diff >3% |
| `coding-packs/reports/evidence/v46-823/lint.log` | create: gate output |
| `coding-packs/reports/evidence/v46-823/typecheck.log` | create: gate output |
| `coding-packs/reports/evidence/v46-823/unit.log` | create: full unit suite output |
| `coding-packs/reports/evidence/v46-823/depcheck.log` | create: boundary gate output |
| `coding-packs/reports/evidence/v46-823/build-admin.log` | create: isolated MSW build output |
| `coding-packs/reports/evidence/v46-823/build-portal.log` | create: isolated MSW build output |
| `coding-packs/reports/evidence/v46-823/build-server.log` | create: server build output |
| `coding-packs/reports/evidence/v46-823/native-overview.log` | create: failed bootstrap, chưa chạy được native AC |
| `coding-packs/reports/evidence/v46-823/native-verification.log` | create: final native overview/search/SQL integration result |
| `coding-packs/reports/evidence/v46-823/native-behavior.log` | create: same browser assertions against native API |
| `coding-packs/reports/evidence/v46-823/build-admin-native.log` | create: native Admin production build |
| `coding-packs/reports/evidence/v46-823/build-portal-native.log` | create: native Portal production build |
| `coding-packs/reports/evidence/v46-823/native-migrations.log` | create: isolated databases migration status and transactional down.sql check |
| `coding-packs/reports/evidence/v46-823/native-runtime.json` | create: public local ports/isolation notes, no credentials |
| `coding-packs/reports/evidence/v46-823/msw-behavior.log` | create: behavior suite output |
| `coding-packs/reports/evidence/v46-823/parity.log` | create: D-01 harness output |
| `coding-packs/reports/evidence/v46-823/D-01-1440.app.png` | create: owner review screenshot |
| `coding-packs/reports/evidence/v46-823/D-01-1440.proto.png` | create: owner review screenshot |
| `coding-packs/reports/evidence/v46-823/D-01-1440.diff.png` | create: measured diff |
| `coding-packs/reports/evidence/v46-823/D-01-390.app.png` | create: owner review screenshot |
| `coding-packs/reports/evidence/v46-823/D-01-390.proto.png` | create: owner review screenshot |
| `coding-packs/reports/evidence/v46-823/D-01-390.diff.png` | create: measured diff |

Tài liệu review hiện tại: modify chính TIP này và `coding-packs/01-REQUIREMENTS-MATRIX.md` (D-140). Không mặc định sửa DateRangePicker chung hay Portal caller: truyền preset VN từ feature, props UI mới tương thích ngược. Nếu cần thêm migration/index hoặc đổi các bản dịch khác, ghi từng đường dẫn/lý do trước khi code, không dùng wildcard làm manifest.

## CONTEXT

- **Nguồn:** `01-REQUIREMENTS-MATRIX.md` › REQ-122/625, D-93/107/134/139/140; `audit/SPEC-V4.6-DELTA.md` › **P2** (topbar). **P10** chỉ là bảng chuyển đổi theo vùng đã làm, không phải căn cứ đổi toàn bộ KPI lịch sử.
- **Đặc tả:** `docs/spec/dac-ta.html` › §33.4 BR-491 (từ 2 ký tự, 4/nhóm, Admin thêm Thành viên, Enter/Esc, ẩn mobile), NA-24 (polling khi tab hiện). BUG-029: `TIP-V2-305-realtime-metrics-unread.md` › specification 6.
- **Prototype:** `docs/spec/index.html` › Admin › Tổng quan: header khoảng ngày, 4 KPI, “Tăng trưởng thành viên” (Tuần/Tháng/Năm, active underline), topbar search. Chỉ tham chiếu, không copy script. Prototype không chốt công thức historical KPI hoặc số năm.
- **Trước implementation:** picker và period labels là UI tĩnh. **Baseline hiện tại đã có picker/URL/period API**, task tiếp theo là khép gap, không implement lại từ đầu.

### Findings review source — không phải kết quả UI/native

| ID | Mức | Baseline / yêu cầu |
|---|---|---|
| R823-1 | P1 | `compute()` lọc tổng theo `createdAt <= end` nhưng status hiện tại; `paid(start)` không có end; `counts()`/upcoming dùng hiện tại. Không phải snapshot lịch sử nhất quán. Sửa theo D-140. |
| R823-2 | P2 | `lastYears()`/test/mock lấy **7 năm**, trái TASK gốc **5 năm**. Giữ 5 năm trong contract đích, không sửa doc thành 7 để hợp thức hóa code. |
| R823-3 | P2 | GlobalSearch chưa có hint khi focus/1 ký tự. Report xác nhận ẩn listbox, không chứng minh hint. Enter mặc định **đã mở dòng đầu** qua keyboard helper, không coi đây là chức năng thiếu. |
| R823-4 | P1 | Schema chỉ regex ngày: nhận ngày không tồn tại/from > to/một đầu khoảng. Cần validation + 400 có fields, không để DB/500. |
| R823-5 | P2 | `series()` lấy lower bound 01/01 thay vì đầu bucket: vừa đọc dư, vừa có thể cắt ngày tháng 12 thuộc ISO week đầu năm. |
| R823-6 | P2 | Spark “Thành viên mới” lấy từ `growth`: đổi tab đổi cả chu kỳ spark, trái claim “giữ sparkline 7 tháng”. Cần field monthly riêng + regression test. |
| R823-7 | P2 | Preset shared dùng timezone máy/giá trị module-load; “Tháng này” tới cuối tháng. Overview cần preset VN tính mới, nhãn custom range không còn “tháng này”. |
| R823-8 | P2 | 4 unit tests service chỉ kiểm helper, chưa kiểm service/cache/query/KPI; MSW test kiểm range/labels chưa chứng minh số liệu đổi. Cần unit/native/e2e. |

**Đính chính report:** source có `CACHE_SEC = 60`, không phải TTL 5 phút như report mục 1.2. Không đổi TTL lên 5 phút. Review này không xác minh trạng thái PR #114 hoặc kiểm UI/native DB.

## APPLICABLE STANDARDS

- [code-structure](../standards/global/code-structure.md), [git-workflow](../standards/global/git-workflow.md): modular, test riêng, commit/push nhánh TIP.
- [nextjs-structure](../standards/frontend/nextjs-structure.md), [routing-auth](../standards/frontend/routing-auth.md), [data-state](../standards/frontend/data-state.md): orchestrator, URL state, query key isolation.
- [antd-ui](../standards/frontend/antd-ui.md), [ui-parity](../standards/frontend/ui-parity.md): component/token chung, keyboard, 1440/390; D-134 thay gate pixel bằng tham khảo + owner duyệt ảnh.
- [api-conventions](../standards/backend/api-conventions.md), [auth-rbac](../standards/backend/auth-rbac.md), [nestjs-modules](../standards/backend/nestjs-modules.md): shared zod, permission key, SQL ở repository.
- [query-indexing](../standards/database/query-indexing.md), [testing](../standards/testing/testing.md): equality trước range, bounded query, test truy vết, MSW/native cùng assertion.

## TASK

Performance review khi chạy native: 905275 dòng (11 năm × 7 metrics × 35 dimensions), planner chọn Seq Scan cho cả hai query year (~73/79 ms). Bổ sung index partial `(metric, day DESC) INCLUDE(value) WHERE dimension = ''`: equality metric trước range day, chỉ đánh index tập overview, giữ snapshot sort trong SQL. Không ép planner. Chỉ migrate runtime PostgreSQL tách biệt; DB/cổng cũ vẫn HOLD. So lại cả 6 query trước/sau index bằng đúng SQL repository.

1. Áp dụng quyết định D-140, sửa range validation/preset VN/URL và KPI theo contract bên dưới.
2. Chốt 7 tuần/7 tháng/5 năm, sửa biên aggregation, tách SQL và bổ sung monthly sparkline độc lập.
3. Hoàn thiện hint/empty state AdminSearch, giữ Enter/Esc/arrow/RBAC và giới hạn D-139.
4. Bổ sung test/evidence thật, sửa report/task graph trước khi báo implementation DONE.

## SPECIFICATIONS

### 1. Query và ngày VN (BUG-029)

- `GET /v1/admin/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&period=week|month|year`; period mặc định `month`.
- from/to: hoặc cùng vắng, hoặc đủ hai ngày có thật, đúng calendar date, `from <= to`; cùng ngày hợp lệ. Sai ngày/thiếu một đầu/period lạ → 400 `VALIDATION_ERROR` có fields. API không normalize âm thầm.
- Không params → ngày 01 tháng VN hiện tại đến hôm nay VN. Không xóa/đổi tên field response, định nghĩa phí hoặc công thức default.
- Phát sinh theo ngày dùng `[startOfFromVN, startOfDayAfterToVN)` đổi sang UTC; không dùng `23:59:59.999` vì PostgreSQL chính xác microsecond.
- FE kiểm URL dựa contract shared: cặp ngày sai/thiếu bỏ cả cặp về default, period sai về month. Effective URL/API/cache phải khớp, không gửi ngày lỗi xuống server.
- Chọn range giữ period, chọn period giữ range, F5 giữ filters. Reset ngày nếu có thì bỏ cả hai params về default; không yêu cầu thêm clear button khi component đang `allowClear=false`.
- Overview truyền preset tính mới theo `Asia/Ho_Chi_Minh`, không theo timezone máy hoặc thời điểm module load: Hôm nay; 7 ngày qua (hôm nay + 6 ngày trước); 30 ngày qua (hôm nay + 29 ngày trước); Tháng này (01 → hôm nay); Tháng trước (đủ tháng trước).
- Không tự áp cửa sổ 90 ngày, cấm tương lai hoặc giới hạn năm nhỏ nhất: chưa có quyết định đó cho overview. Nếu cần giới hạn hiệu năng phải hỏi owner trước.

### 2. Ý nghĩa KPI — Q823-1 đã chốt theo D-140

**Owner 10/11/2026 chọn “Tổng hiện tại, phát sinh theo khoảng (đề xuất)”** khi được hỏi hai phương án. Nội dung câu hỏi đã nêu: tổng/luồng hiện tại, phát sinh và % theo khoảng; biểu đồ theo Tuần/Tháng/Năm gần nhất. Không dựng snapshot lịch sử.

| Field | Contract đích |
|---|---|
| `members.value`, `communities.value`, `projects.value/pending`, `events.value/upcoming`, `paid.value`, `flow` | Tổng/trạng thái hiện tại, cùng nghĩa giữa thẻ và flow; **không** thêm `createdAt <= to` để giả tổng lịch sử. |
| `newThisMonth`, `communitiesNew`, `paid.newThisMonth` | Giữ tên field để tương thích; custom range là phát sinh trong cả hai biên from/to. Phí giữ eligibility/status hiện có và D-107; không tự đổi sang đếm giao dịch ngân hàng, trial hoặc lịch sử mọi lần gia hạn. |
| `membersDeltaPct`, `paid.deltaPct` | Dùng phát sinh trong khoảng; giữ công thức hiện có `fresh / (total - fresh) * 100`, 1 chữ số thập phân, mẫu số không dương → 0. Đây không phải phép tái dựng tổng thực tại đầu kỳ; không thêm phép so sánh kỳ trước trong TIP. |
| `growth` | Gần nhất neo theo hôm nay VN, period chỉ đổi growth; không lọc bằng from/to. |
| Sparkline KPI | Luôn 7 tháng gần nhất neo hôm nay VN, độc lập range/period. Spark thẻ “mới” dùng số mới mỗi tháng, không tái dùng growth tuần/năm. |
| Conversion theo vùng / CSV | Contract riêng hiện tại, không nhận filter overview; không mở lại BR-475 → 477. |

- Bổ sung field `newMembersSpark` (mảng 7 số nguyên) vào overview response để giữ spark “mới” độc lập. Đây là thay đổi additive; giữ toàn bộ field cũ và cập nhật server/schema/MSW/caller trong cùng TIP. Không gọi đây là KPI mới.
- Custom range: nhãn dùng “trong khoảng đã chọn”/ngày thực; không gọi khoảng nhiều tháng là “tháng này” hoặc “Tháng MM/YYYY”. Default vẫn giữ chữ theo prototype.
- Không hứa “cả 4 tổng đều đổi”: chỉ field phát sinh/% thay đổi khi đổi range, field tổng hiện tại giữ nguyên có chủ đích.
- Tái dựng historical snapshot, thay eligibility phí hoặc đổi công thức % là thay đổi nghiệp vụ khác, cần chốt mới theo D-93.

### 3. Chu kỳ tăng trưởng (REQ-122)

- week = **7 tuần ISO** (thứ Hai → Chủ nhật, key có ISO year `IYYY-WIW`); month = **7 tháng**; year = **5 năm lịch**. Đủ bucket cũ → mới, bucket trống = 0; không chỉ trả năm có dữ liệu.
- Bucket hiện tại tới hôm nay VN, bucket trước hết kỳ. Lower bound = **ngày đầu bucket đầu tiên**, kể cả tháng 12 của ISO week 1; không lấy tùy tiện 01/01.
- active/inactive = snapshot mới nhất của metric trong bucket, **không cộng snapshot hằng ngày**. fresh = `SUM(members_new)` trong bucket; không đổi nghĩa metric của job statsDaily.
- Nhãn Wn/Tn/YYYY; key nội bộ đầy đủ khi qua năm. Giữ field `growth.month`, không đổi tên trong TIP này.
- Tabs có underline active như prototype, không đổi sang segmented control khác kiểu. Có tablist/tab/selected/focus hợp lệ và dùng được bằng bàn phím.
- Chuyển tab/refetch không trình bày dữ liệu query cũ như kết quả mới; có loading/error đúng chuẩn.

### 4. Cache và SQL (S-03)

- Redis TTL **60 giây**, key cô lập theo period/effective range. Default/month có thể giữ alias `admin:overview`, không trả response custom cho default hoặc ngược lại. Thay đổi response additive cần tránh cache cũ khiến field mới thiếu.
- TanStack key cùng effective params; giữ polling 3 giây khi tab hiện, dừng khi ẩn. Refetch không đồng nghĩa bypass Redis TTL.
- SQL parameterized qua `Prisma.sql`, đặt trong repository; số query hữu hạn, không query từng bucket/user/metric trong loop. Chỉ đọc metrics và cửa sổ tối thiểu cần cho output.
- PK hiện có `stats_daily(day, metric, dimension)` không tự chứng minh tối ưu. Đo `EXPLAIN (ANALYZE, BUFFERS)` trên seed đủ lớn cho cả 3 period. Xem xét index equality dimension/metric trước day, INCLUDE payload hoặc partial index theo query thật. Không thêm expression index chỉ vì `to_char` ở SELECT/GROUP BY khi WHERE không lọc biểu thức đó.
- Nếu cần index/migration mới: cập nhật manifest/thiết kế và review trước khi code. Không tự thêm migration ngoài scope.

### 5. Tìm kiếm topbar (REQ-625, BR-491, D-139)

- Admin focus/trimmed query < 2 ký tự: hiện hint **“Nhập ít nhất 2 ký tự để tìm kiếm...”**, không query API, không stale hits; hint không phải option chọn được hoặc kết quả giả.
- Đủ ngưỡng: giữ debounce hiện có, tối đa 4/nhóm, nhóm theo quyền. Sau request thành công không có hits: **“Không tìm thấy kết quả cho ‘{query}’”**, render text an toàn. Đang tải/lỗi API không được báo nhầm “không có kết quả”.
- Chuỗi qua next-intl ở Admin caller; không hardcode tiếng Việt trong UI package. Props hint/loading/error mới optional/tương thích để Portal không lỗi type hoặc đổi nghiệp vụ.
- Enter mở active selection, chưa active thì dòng đầu; hint/no-result không điều hướng. Giữ ArrowUp/Down, IME, Esc, blur/outside-click; Esc đóng cả hint/results. Bấm ngoài giữ chữ theo D-136.
- Giữ route hiện có: project → review, member/store/need/group → list lọc tương ứng; không thêm route chi tiết nhu cầu.
- Portal và ngôn ngữ hiện có không hồi quy. Mobile vẫn ẩn search; không thêm SĐT, nhóm sự kiện/dịch vụ/nhà đầu tư hoặc “Xem tất cả” (D-139).

## ACCEPTANCE CRITERIA

Tên test dưới đây là **yêu cầu bổ sung**, không khẳng định đã tồn tại hoặc PASS.

| AC | Given / When / Then | Test đích |
|---|---|---|
| AC823-01 | Given clock sát nửa đêm VN, browser timezone khác VN / When mở default/chọn preset / Then ngày đúng VN, Tháng này tới hôm nay, preset không đóng băng theo module load. | `overview-controls.spec.tsx` › `BUG-029 VN defaults and fresh presets`; `admin-overview.spec.ts` |
| AC823-02 | Given range+period / When đổi từng filter/F5/reset / Then giữ filter kia, URL/API/key khớp, invalid URL fallback an toàn. | `use-overview-url.spec.tsx` › `REQ-122 preserves filters and normalizes URL`; e2e |
| AC823-03 | Given sai format/ngày không tồn tại/from > to/thiếu đầu/period lạ / When gọi API / Then 400 có fields, không 500; cùng ngày và ngày nhuận hợp lệ. | `overview.spec.ts`; `overview.int.spec.ts` › `REQ-122 validates overview query` |
| AC823-04 | Given thiếu token/thiếu overview.view / When GET với mọi loại query / Then 401/403; có quyền trả đúng schema. | `overview.int.spec.ts` › `REQ-122 overview permission key enforced` |
| AC823-05 | Given phát sinh trước start/đúng start/cuối to tới microsecond/đúng ngày sau to / When filter / Then phát sinh đúng biên, tổng/flow vẫn hiện tại, % đúng công thức D-140. | `overview.int.spec.ts` › `REQ-122 D-140 range semantics and VN boundaries` |
| AC823-06 | Given nhiều snapshot/ngày, bucket rỗng qua năm / When week/month/year / Then 7/7/5 bucket, snapshot latest/fresh sum/empty 0. | `overview-intervals.spec.ts`; `overview.int.spec.ts` › `REQ-122 aggregates periods across ISO year` |
| AC823-07 | Given 12/02/2026 VN, bucket đầu W1 từ 29/12/2025 / When đọc 7 tuần / Then tính đủ dữ liệu 29–31/12, không cắt ở 01/01. | `overview.int.spec.ts` › `REQ-122 first ISO bucket includes previous December` |
| AC823-08 | Given nhiều range/period/default đã cache / When gọi lại / Then không lẫn, hit không query DB, TTL 60 giây, cache payload cũ thiếu newMembersSpark không làm hỏng response. | `overview.service.spec.ts` › `REQ-122 isolates cache and handles old payload` |
| AC823-09 | Given month+range / When click/keyboard week/year / Then URL/selected/cột đúng 7/5, không stale response, cả 4 spark vẫn 7 tháng và không đổi theo tab. | `overview-controls.spec.tsx`; `data.spec.ts`; e2e `REQ-122 overview range and periods` |
| AC823-10 | Given Admin trống/1 ký tự / When focus/nhập/Esc/click ngoài / Then hint đúng/đóng được, không fetch dưới ngưỡng; đủ ngưỡng Enter mở dòng đầu/active. | `global-search.spec.tsx` › `REQ-625 hint threshold and keyboard`; e2e |
| AC823-11 | Given từ khóa không khớp / When request thành công kết thúc / Then empty có từ khóa; loading/error không bị báo rỗng, Enter không route. | UI + e2e `REQ-625 keyword empty state without false loading result` |
| AC823-12 | Given mobile/Portal/Admin thiếu quyền nhóm / When search regression / Then mobile ẩn, Portal giữ contract, không rò nhóm, không mở tính năng D-139 đã đóng. | Global-search tests hiện có + e2e hai chế độ |
| AC823-13 | Given MSW/native cùng fixture/clock / When filter/chuyển tab / Then cùng assertion kiểm giá trị, không chỉ echo range/label; conversion/CSV không hồi quy. | `overview-handlers.spec.ts`; `admin-overview.spec.ts` MSW + native |

## CONSTRAINTS

- **DO NOT:** dùng current status giả snapshot lịch sử; hợp thức hóa code bằng đổi 5 thành 7 năm; đổi định nghĩa phí D-107; query trong loop; thêm dependency/major stack; sửa prototype/baseline để che lệch.
- **REUSE:** DateRangePicker, useUrlParams, API client, TanStack Query, chartAxis/chartMax/barHeight, keyboard helper; guards/metrics hiện có.
- **SKIP:** KPI mới, backend search scope/ranking mới, tìm mobile/SĐT/nhóm mới/“Xem tất cả”, full search page, chi tiết nhu cầu, đổi conversion/CSV, release main.
- SQL/helper mới tách module; không thêm logic vào monolith quá cap. Test riêng. Không sửa ngoài manifest khi chưa ghi lý do/cập nhật TIP.

## BUILDER-CHECKLIST

- [x] Đọc D-140 và bản TIP review này, không lấy DONE cũ làm bằng chứng nghiệm thu.
- [x] Kiểm pwd/branch/status; tiếp tục đúng nhánh TIP từ dev, không tạo lại feature từ main/ghi đè thay đổi người khác.
- [x] AC823-01 → 13 có test mang REQ/BUG tương ứng và evidence từng ca, không đánh dấu PASS bằng source review.
- [x] `pnpm lint && pnpm typecheck && pnpm test`, `pnpm depcheck` pass; ghi output thật, phân biệt cache replay và chạy mới.
- [x] Native overview integration + search regression pass; e2e MSW/native cùng assertion, không weaken/skip theo chế độ.
- [x] Build app bị ảnh hưởng pass; SQL plans cho cả 3 period; TTL/key có test.
- [x] Parity Tổng quan/topbar 1440/390 ghi số đo/cặp ảnh/nguyên nhân; bổ sung ảnh không mask ở cả MSW/native. Pixel % không chặn DONE theo D-134; owner duyệt ảnh trong PR, không giả định đã duyệt.
- [x] Report sửa claim TTL/số năm/search hint/test coverage; task graph phản ánh tiến độ mới. Commit/push đường dẫn cụ thể, status sạch, báo implementation DONE kèm Git SHA.

### Execution note (10/11/2026)

Implementation: `7c44fcab`; native test/index follow-up `1c8006d4`. Initial bootstrap failed on existing test DB drift; owner chose to preserve it. Resolved verification through a separate native PG16/Memurai instance without resetting/repairing the original databases or services. All 110 migrations applied there; native integration 26 passed, both browser lanes 10 passed each; all six real SQL plans on 905275 rows use Index Only Scan / Heap Fetches 0 after the covering index. See completion report for evidence, reproduction and normal owner PR/image review.
