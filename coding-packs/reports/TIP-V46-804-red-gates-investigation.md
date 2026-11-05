# TIP-V46-804 — Điều tra gate đỏ ngoài parity

Ngày 05/11/2026, theo yêu cầu owner «ok kiểm tra luôn đi».
Source checkpoint `7d9d72b7`, production checkpoint `c1fd1625`.
**Chỉ điều tra, chưa sửa production/test gate. TIP-804 vẫn PARTIAL.**

## Kết quả tái hiện

- Chạy lại đúng sáu test E2E MSW: **6 FAIL**, cùng điểm dừng đã báo.
- Chạy lại `test/bot/persona-turn.int.spec.ts`: **7 PASS / 1 FAIL** tại tên index.
- Kiểm chứng native route Chat bằng integration hiện hữu: **1 PASS / 13 skipped**
  (lọc đúng test `Portal không tạo/xoá chủ đề`, không phải cả file PASS 14 test).
- Bản sao chẩn đoán của bốn E2E, giữ nguyên assertions và chỉ ghim browser clock
  `2026-10-16T08:30:00Z`: **4/4 PASS**, gồm cả nội dung CSV và hủy xuyên hai origin.
  Đây **không phải** lượt PASS của test gate gốc: bản gốc chưa được sửa.
- Gate trước commit báo cáo: lint **8/8 PASS**, typecheck **8/8 PASS** (đều cache
  replay, source không đổi); unit **1.968 PASS / 2 skipped**, 6/6 tasks,
  2 cached / 4 chạy mới. Log cùng prefix `...-lint.log`, `...-typecheck.log`, `...-unit.log`.

Lệnh tái hiện sáu test: `pnpm --filter @opchub/e2e exec playwright test --project=behavior`
với năm file `affiliate-cross-app.spec.ts`, `affiliate-screen.spec.ts`, `chat.spec.ts`,
`portal-shell.spec.ts`, `reports.spec.ts`; grep
`bank/rate/policy|AF0 lịch sử|API tạo|ngôn ngữ, menu|B1 mặc định|Xuất CSV B1`.
Cổng MSW Portal/Admin 3300/3301, prototype 4830, một worker.

## 1. Bốn E2E phụ thuộc giờ thật — đã xác định nguyên nhân

| Test | Nguyên nhân và kiểm chứng |
|---|---|
| `affiliate-screen.spec.ts:17` | Hook `useAffiliateHistory` mặc định `monthKey(now)` theo browser. Browser hiện 11/2026; fixture Đỗ Minh T. là 10/2026. API tháng 11 trả 200, total=0; API tháng 10 trả 200, total=3, đủ ba khách. Mở URL `?month=2026-10` thấy đúng dòng. |
| `affiliate-cross-app.spec.ts:14` | Kiều Văn Sơn của HAOPC là fixture c16, giao dịch 10/10/2026 giờ UTC. Test quay lại `/affiliate` không chọn tháng, nên đang lọc 11/2026. Ghim tháng 10 thì toàn luồng bank/rate/policy/F5/hủy và lý do hủy đều PASS. Không có bằng chứng mất dữ liệu hay lỗi đồng bộ hủy trong tình huống này. |
| `reports.spec.ts:39` | `useReportFilter` gọi `reportMonths(Date.now())`, đúng quy tắc tháng trước theo giờ VN. Tháng thực là 11/2026 nên mặc định 10/2026; test chốt 09/2026 theo comment fixture 16/10/2026 nhưng không đặt clock. Ghim clock thì PASS. |
| `reports.spec.ts:79` | Cùng lệch tháng phía trên. Với clock fixture, tên file 2026-09, BOM, 17 dòng, hàng tháng/năm và toast đều PASS nguyên assertion. |

Chẩn đoán chỉ thêm precondition sau vào **bản sao bỏ qua bởi Git**, không sửa bản gốc:

```ts
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-16T08:30:00Z'));
});
```

Hướng sửa: chọn tháng fixture rõ ràng ở test dữ liệu lịch sử; test mặc định tháng trước
cần clock tất định. Không sửa app để quay về tháng fixture, không ghim global clock
cho mọi test, không đổi assertions chỉ để khớp tháng đang chạy.

## 2. Chat 500 — lỗ hổng mock + proxy build, không phải native endpoint 500

- `POST /v1/groups/c1/rooms` không có MSW handler (chỉ có GET).
- Request lọt xuống network; manifest build `.next-v46-804-msw-v3/routes-manifest.json`
  có rewrite `/v1/:path*` → `http://localhost:4000/v1/:path*`.
- Next log đúng request: `Failed to proxy .../groups/c1/rooms`,
  `ECONNREFUSED ::1:4000` và `127.0.0.1:4000`; browser nhận 500 `Internal Server Error`.
- Integration backend hiện hữu `chat-rest.int.spec.ts`, REQ-209/NA-09/D-61,
  trả đúng 404 cho route POST đã bỏ; test PASS trên DB test riêng.

Hướng sửa: mock route bị cấm trả đúng 404 theo backend; kiểm tra build MSW không
vô tình phụ thuộc API thật cho request không được mock. **Không khởi động dịch vụ
cổng 4000 để che lỗi**, không đổi kỳ vọng test sang 500.

## 3. Ngôn ngữ — xung đột UI/test/prototype cần chốt, chưa nới test

- E2E dòng 71 yêu cầu không `<img>` và có globe SVG, dựa trên TIP-V4-615.
- Commit `6d500837` ngày 29/10 chủ động đổi topbar sang cờ; unit test cũng đổi
  sang yêu cầu cờ. `LanguageMenu` hiện render `active.flagSrc` không phân biệt variant.
- Tuy nhiên prototype hiện tại `docs/spec/index.html:404` vẫn vẽ globe trong
  topbar; completion V4-615 và parity deviations cũng ghi globe.
- Vì vậy không đủ cơ sở chỉ gọi E2E là lỗi thời: hiện có **mâu thuẫn chuẩn UI**.
  Cần owner chốt giữ thay đổi cờ hay theo prototype globe trước khi sửa đồng bộ.
  Không tự hoàn nguyên commit hay bỏ assertion trong lượt điều tra này.

## 4. Bot execution plan — lựa chọn chi phí của planner, không thiếu index

- PostgreSQL 16.14. Catalog ở cả hai DB riêng xác nhận
  `messages_simulated_room_idx` tồn tại, `indisvalid=true`, `indisready=true`,
  đúng `(room_id, created_at DESC, id DESC) WHERE is_simulated AND deleted_at IS NULL`.
- Test thêm 10.242 simulated rows nhưng chỉ **121 dòng cho mỗi phòng đích**,
  10.000 dòng còn lại ở phòng khác; `ANALYZE` đã chạy.
- Lượt test gốc chọn `messages_room_id_sender_id_client_msg_id_key`,
  lọc/sort 121 dòng mỗi phòng rồi update qua `messages_pkey`; execution khoảng 0,772ms.
  Test dừng ở assertion tên index, chưa đi tới hai assertion count phía sau.
- Thí nghiệm riêng trong transaction rollback, 10.242 dòng với cùng phân bố:
  query runtime chọn index cạnh tranh, update hai dòng, còn **120 live simulated
  rows mỗi phòng**; lượt cuối execution 1,687ms. Không có Seq Scan ở lượt này.
- Clone TEMP mới bằng `LIKE ... INCLUDING ALL` và cùng dữ liệu vẫn chọn index
  cạnh tranh: không thể quy nguyên nhân chỉ cho bloat DB test.
- Chỉ trên clone TEMP dùng để chẩn đoán, bỏ index cạnh tranh thì planner dùng
  Index Only Scan trên clone của partial index. Cost selector có cạnh tranh
  khoảng 173 + sort so với partial khoảng 181; index không bị thiếu/hỏng predicate.
  Tất cả thay đổi dữ liệu/DDL thí nghiệm được rollback; không drop index thật,
  không tắt planner flags, không dùng thí nghiệm ép lựa chọn làm bằng chứng gate PASS.
- Stress clone với nhiều dòng cùng phòng hoặc member noise còn cho thấy planner
  có thể chọn Hash Join / Seq Scan update. Đây là rủi ro hiệu năng cần xét thêm,
  không được kết luận query tối ưu cho mọi phân bố chỉ vì lượt nhỏ dưới 1ms.

Hướng sửa: corrective task tách riêng, làm fixture representative và kiểm tra plan
trên DB sạch/nhiều phân bố; giữ gate không quét bảng lớn. Không bỏ yêu cầu index
hay thêm index trùng, không sửa query nghiệp vụ khi chưa có bằng chứng cần thiết.

## Evidence và phạm vi an toàn

Log local (gitignored): `test-results/v46-804-investigate-{e2e,int,clock,chat-native}.log`,
`...-browser.json`, `...-db.json`, `...-plan.json`; script chẩn đoán cùng prefix.
Các bằng chứng then chốt đã được chép vào báo cáo này để không phụ thuộc log local.
Không chạy lại full integration/full E2E, build hay parity; gate cũ vẫn như
completion report. Không seed/reset DB dev, không restart dịch vụ; chỉ dùng
`opchub_v46_801_test`/Redis 6381 db2 cho integration, đọc catalog hai DB riêng.
Sau rollback kiểm tra DB test còn 19 messages, không còn dòng `diagnostic-%`;
chạy ANALYZE lại bảng test để thống kê không giữ số dòng thí nghiệm đã rollback.
DB/Redis native và các cổng/tiến trình giữ nguyên. Chưa sửa source hoặc test gate.
