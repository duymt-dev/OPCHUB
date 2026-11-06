# TIP-V46-803 — Completion report

## Trạng thái: PARTIAL, chưa DONE

Nhánh `feature/TIP-V46-803-affiliate-policy-reference`, từ dev `3429b7a7`;
TIP/decisions checkpoint `9fbe3c6b`, implementation checkpoint **`4c65e2b1`**, đã push.
Follow-up contract/fixture/harness `592b2536`, `4160aa0e`, `87253d95`;
fixture replay-safe `9dc2b689`. Không đổi production sau implementation checkpoint.
[Draft PR #81 — base dev](https://github.com/duymt-dev/OPCHUB/pull/81).
Không merge vào dev/main và không bật auto-merge. Các lượt kiểm chứng đã kết thúc;
không coi scope PASS là full-suite PASS.

## Đã triển khai

- D-131: snapshot `customer_year`, tỷ lệ gia hạn và năm tối đa trong policy;
  bỏ unique một khoản membership/khách, giữ unique theo nguồn giao dịch.
  Migration backfill theo ngày kỷ niệm tại Việt Nam, kể cả 29/2; thiếu mốc giữ năm 1.
- Affiliate và sổ chia sẻ dùng chung `CustomerYearRepository.firstPaid`, trong transaction
  ghi khoản/outbox. Owner chấp thuận **ngoại lệ reporting ghi dữ liệu hẹp đúng TIP**;
  không mở quyền ghi cho các projection khác (Q-V46-803-6).
- Năm đầu dùng tỷ lệ hiện hành, gia hạn dùng policy; ngoài năm tối đa, tỷ lệ 0,
  làm tròn 0đ hoặc tự giới thiệu không sinh khoản. Đổi tỷ lệ affiliate chỉ reprice
  membership `recorded` năm 1; policy mới không sửa snapshot cũ.
- Chính sách Admin chỉ hiển thị ba tham số vùng, bảng năm và bảng giá gói lấy từ
  cấu hình; các trường tỷ lệ ẩn vẫn giữ giá trị đã tải khi PUT. Audit chỉ diff trường đổi.
  Bước giảm 0 hiển thị một dòng theo D-132, không sao chép lỗi prototype.
- Banner hoa hồng tham khảo, nhãn năm trên từng khoản; cột vùng chỉ đọc, tính theo
  nhóm live sớm nhất/nhóm cha ngành, một query cho cả trang, không theo tỉnh tick.
- Header trừ tổng sổ GĐ Vùng cùng tháng, gồm mọi trạng thái, loại region NULL;
  hủy hoa hồng không đảo sổ theo D-132.
- Bỏ service, route POST chi trực tiếp, dialog, mutation và mock write affiliate.
  MSW có tombstone 404 để không fall through sang API native. Permission payout vẫn
  giữ cho GĐ Vùng; đổi nhãn quyền thuộc 807. Event/consumer payout cũ chỉ giữ để xử lý
  lịch sử đã xếp hàng, không còn producer mới.

## Thay đổi test và fixture có chủ đích

Các assertion “gia hạn không sinh hoa hồng” được thay bằng năm 1/2/3 có khoản,
năm 4 không có khoản theo D-131. Test chi trực tiếp được thay bằng 404/no-side-effect
và UI không có nút chi. Không giữ test thao tác đã bị nghiệp vụ D-119 loại bỏ.

Historical paid fixtures vẫn tồn tại. Helper tạo paid giả phục vụ các test lịch sử
được tách vào `historical-payment.fixture.ts`, không export qua barrel production,
không có route/job/UI gọi nó. Không tạo thêm paid khi seed gia hạn.

Demo thêm ba kỳ phí thực thể giả năm 2/3/4, hai commission tham khảo và ba dòng sổ
chia sẻ tương ứng; năm 4 không có commission. Đây là **lịch sử tổng hợp phục vụ test**,
có thể có ngày tương lai so với đồng hồ demo, không phải giao dịch thực thu production.
Native AF0 giữ 62 affiliates, 51 referrals, thành 53 commissions/65 periods.
MSW có baseline 66 affiliates, không giả giảm dữ liệu để khớp prototype 15 affiliates.
Khác biệt này và fixture tài chính cũ được giữ công khai trong báo cáo parity.

Các helper/module/test mới ngoài danh sách TIP chi tiết chỉ phục vụ tách trách nhiệm:
commission-year, policy preview/tables, mock renewal/reference/persistence state,
seed renewal và test backfill/region/renewal. Không thêm dependency hay env sản phẩm.
Portal UI thuộc 804, nhãn vai trò thuộc 807: chưa triển khai trong 803.

## Baseline và provenance

- Baseline browser chạy trên runtime 802 đã đóng băng trước sửa source:
  `v46-803-baseline-e2e.log`: **341 pass, 9 fail, 4 skip /354**.
- Baseline sáu màn parity: **3 pass (2 harness +1 ảnh), 11 fail /14**;
  COM substates: **5 pass (2 harness +3 ảnh), 13 fail /18**.
  Có bản sao JSON riêng trong `test-results/v46-803-baseline-all-parity.json`.
  D-85/D-85-CUS baseline bị lỗi capture do selector tên tab prototype đã đổi;
  số liệu SHA cũ `0b76e98a` còn trong catalog **không phải baseline mới** và không
  dùng làm bằng chứng so sánh. Chỉ lấy record SHA `9fbe3c6b` của lượt baseline.
- **Không có full integration baseline mới trước code**; chỉ tham chiếu report 802
  cho M1/persona-turn. Không gọi các kết quả sau sửa source là baseline dev.
- Lượt integration đầu và một số runner bị ngắt khi phiên được tiếp tục; log có
  các ca pass nhưng không có tổng kết không được tính là full-suite pass.
  Lượt sau phát hiện Memurai riêng đã dừng, API không khởi động được; đã dựng lại
  Memurai 6381 bằng config riêng, không dùng hoặc flush Redis native 6379.
- Full MSW attempt đầu được dừng có chủ đích sau khi thấy các assertion fixture
  trước D-131/D-132 không còn đúng, sau đó chạy full mới trên source đã commit;
  không cộng các ca pass của lượt dừng vào tổng cuối. Parity từng có một lần
  prototype connection-refused khi runner sở hữu webServer đó bị thay thế; đã đo
  lại đủ 28 ảnh trên prototype process riêng, không dùng record SHA cũ cho màn lỗi capture.
- Các lần thử migration create-only ban đầu sai thứ tự timestamp bị shadow P3006;
  đã sửa **migration mới chưa áp dụng**, không sửa migration đã áp dụng. Migration
  `20261106090000_v46_commission_customer_year` đã deploy trên cả hai DB riêng.

## Kiểm chứng cuối

Các log ở `test-results/` (local, ignored); không cộng trùng các lượt retest.

| Gate | Kết quả hiện có | Log |
|---|---|---|
| lint | PASS, 8 tasks; 9 warning img hiện hữu | `v46-803-lint-source.log` |
| typecheck | PASS, 8 tasks | `v46-803-types-source.log` |
| unit toàn repo | PASS, **1.960 passed +2 skipped** hiện hữu, 6 tasks | `v46-803-unit-final.log` |
| UI unit sau chỉnh layout | PASS, 14/14, 3 files | `v46-803-ui-unit-release.log` |
| depcheck | PASS, 2.297 FE/shared và 1.030 BE modules, không cycle | `v46-803-depcheck-release.log` |
| forced build MSW | PASS, 3 tasks, output riêng v6 | `v46-803-build-msw-release.log` |
| forced build native | PASS, 3 tasks, output riêng v3 | `v46-803-build-native-release.log` |
| E2E native scope | PASS, **4/4**, cùng assertions với MSW | `v46-803-e2e-native-release.log` |
| E2E fixture follow-up | PASS, 10/10: search/CSV/cancel/policy/F5/mobile/payout | `v46-803-e2e-fixtures-followup-2.log` |
| E2E D-131/status/toolbar | PASS, 11/11 | `v46-803-e2e-renewal-followup.log` |
| E2E negative/mobile follow-up | PASS, 10/10; no-write cancel/paid, restore, readable region table + reachable action | `v46-803-e2e-negative-followup.log` |
| full integration | **FAIL: server 1.790 passed, 4 failed /1.794, 192 files passed +4 failed /196**; DB task chưa chạy xong khi Turbo dừng | `v46-803-int-complete.log` |
| DB package integration | PASS, **126/126**, 26 files, migration deploy thành công | `v46-803-db-int-final.log` |
| Integration scope cuối | PASS, **78/78**, 28 files: toàn bộ affiliate + contract/coverage + 802 share-ledger | `v46-803-int-scope-verified.log` |
| Known integration gates retest | FAIL, **8 passed +2 failed /10**: M1 và persona-turn vẫn đỏ | `v46-803-known-gates-retest.log` |
| Full MSW E2E cuối | **346 passed, 6 failed, 4 skipped /356**, 21,9 phút; sáu ca fail đều nằm trong baseline chín ca fail | `v46-803-e2e-verification.log` |
| Parity cuối | FAIL, **7/28 ảnh PASS, 21/28 FAIL**, cộng 2 harness PASS | `v46-803-parity-verification.log` |
| Seed/HOLD | PASS hai lần seed, private API health OK, chỉ flush cache Redis riêng db 1 | `v46-803-seed-hold-{1,2}.log`, `v46-803-cache-hold.log` |
| EXPLAIN actual commissionPageQuery | PASS, 10.000 rows, offset 5.000, 20 rows; deferred join + index-only seek | `v46-803-explain-2.log` |

Unit phân rã: shared 633, server 235, Portal 392, Admin 541, UI 56,
integrations 103 (+2 skip S3 hiện hữu). Không giảm isolation hay bỏ test để làm xanh.
Sau follow-up: lint/typecheck 8 tasks PASS, root unit 6 tasks PASS cùng 1.960 +2 skip
(`v46-803-{lint,types,unit}-region-fixture.log`); depcheck cuối 2.297/1.030 modules
PASS (`v46-803-depcheck-verified.log`). Chạy scope 78 PASS không thay cho full-suite
1790/4 FAIL đã nêu.

EXPLAIN dùng session-local clones `LIKE public.* INCLUDING ALL` trên DEV riêng,
không sửa dữ liệu public, không tắt Seq Scan/chỉnh planner costs. Actual query mới
select `customerYear`; `commissions_created_at_id_idx` cho all, 63,090 ms và
`commissions_status_created_at_id_idx` cho recorded, 1,346 ms; cả hai index-only ID
scan (heap fetches 0), join PK lấy đúng 20 rows. Đây là đo chức năng/plan dưới tải
kiểm thử đồng thời, không phải benchmark latency. Lượt script đầu import nhầm
Prisma từ client thay vì index bị lỗi trước đo; đã sửa script local rồi chạy lại.

Các E2E cũ được cập nhật fixture rõ ràng: thêm hai khoản gia hạn làm tổng 53,
recorded 21; chọn năm 1 khi assert snapshot cũ; lấy tháng 10/2026 của AF0 thay vì
wall-clock hiện tại. Không giảm assertion tiền/CSV/audit. Test gia hạn cũ bỏ quy tắc
“không có khoản thứ hai”: trả trước trong cùng năm khách vẫn dùng tỷ lệ năm 1.
Không assert lịch sử gia hạn Portal cũ một dòng vì presentation đó thuộc TIP-804.

Full integration mất 46,8 phút: hai lỗi hiện hữu là M1 thiếu consumer và persona-turn
không chọn partial index mong đợi; hai lỗi do lần triển khai này là contract cũ còn
đòi payout 2xx và fixture renewalRate=0 không restore làm ảnh hưởng test kế tiếp.
Đã sửa contract thành **404 + parse error envelope**, giữ đầy đủ inventory coverage;
fixture lưu/restore policy và test năm 2 khai báo policy rõ ràng. Retest scope đầu
77 pass/1 fail do industry fixture trùng unique khi chạy lại; đổi sang key riêng,
không thay DB constraint hay query production. Không gọi các lỗi này là baseline.

Full E2E checkpoint 87253 trước cập nhật fixture cuối: **341 passed, 11 failed,
4 skipped /356**, 24 phút. Năm lỗi mới là hai dialog, hai status-menu do khoản gia
hạn và một assertion desktop “không được scroll” của bảng trước khi có cột vùng.
Đã giữ assertion money/no-write/keyboard/viewport, chọn đúng snapshot năm 1 và
kiểm scroll như prototype: cell không clip, body không tràn, action cuộn tới được.
Full cuối chạy lại sau commit; không thay các test chat/reports ngoài scope.
Sáu fail cuối: `affiliate-cross-app`, `affiliate-screen` (Portal), `chat` create-topic
404, `portal-shell` menu, `reports` B1 mặc định và export filename. Không sửa lan các
luồng này; các màn/logic Portal affiliate mới thuộc TIP-804. So với baseline 354 ca,
suite cuối 356 ca vì đã thêm reference coverage và thay các test UI chính sách/chi
trực tiếp đã bị D-119/D-132 loại bỏ. Không gọi việc giảm fail từ 9 xuống 6 là toàn bộ
gate đã PASS.

## Đối chiếu acceptance criteria

| Nhóm AC | Bằng chứng |
|---|---|
| Bảng năm 50/10/20, 60/15/25, first=min, step=0 | `policy-year-table.spec.tsx` 6 cases; policy-form + browser live preview |
| Giá gói từ cấu hình, ẩn tỷ lệ và giữ khi lưu/F5, audit diff | `policy-form.spec.tsx`, browser policy/reference/fixture follow-up; `policy.int.spec.ts` gồm 422 renewal-only |
| Banner, nhãn customerYear, không tự gán vùng | Native E2E scope 4/4; MSW cùng assertions; shared DTO parse |
| Membership năm 1..4, fundraising năm 2, consumer order/replay, zero rate | `renewal-commission.int.spec.ts` 5 cases, `commission.int.spec.ts`; shared commission-year unit |
| Không có khoản rounded-zero/self-referral | `affiliate-reference.spec.ts` + pure rate helper; handler có guard trước INSERT. Native self/rounded-zero chưa có test độc lập mới |
| Reprice chỉ năm 1, giữ renewal snapshots sau policy đổi | Native renewal integration + mock snapshot persistence unit |
| Backfill có/không anchor, leap VN và idempotent | `customer-year-backfill.int.spec.ts` 2 cases |
| Projection earliest live/industry parent/unticked/vacant/no-group, không N+1 | `region-column.int.spec.ts` 2 cases, spy thực `$queryRaw` + projection; trang fixture lọc một affiliate, chưa seed đủ 20 riêng cho spy |
| Net revenue trừ sổ vùng cùng tháng, không đảo khi hủy | `summary-paid.int.spec.ts`, stats unit; snapshot ledger 802 giữ nguyên |
| Gỡ direct payout, 404, historical paid còn đọc | Native payout integration, contract error schema và browser accountant + paid-history assertions |
| Regression 802 | `regional-director/share-ledger.int.spec.ts` 12 cases trong full và scoped integration |
| MSW/server | Shared schemas + native contract, handler unit, cùng 4 browser assertions; không khẳng định toàn bộ seed/provider parity vì baseline AF0 khác số affiliates |
| Parity và COM không tụt | **FAIL**, số đo chi tiết bên dưới; không đánh dấu AC này hoàn thành |

## Soát luật cứng 1–14

1–3: modules/components/hooks/test files riêng, lint/typecheck strict PASS, depcheck
không cycle; không thêm dependency. 4: backend permission guards giữ nguyên, route
retired luôn 404, không check tên role mới. 5: batch projection, index-only ID page
+ deferred join, EXPLAIN actual query 10k; chỉ select payload cần. 6: không sửa chat.
7–8: referral conditional transition, source UQ chống replay; anchor/commission/outbox
cùng transaction. 9: integer VND, UTC/VN anniversary. 10: policy/rate audit trong
transaction, diff chỉ trường đổi. 11: fake adapters/native private test runtimes.
12: không thêm secret/env sản phẩm, không thêm console trong source. 13: test ở
file riêng. 14: source đã commit/push, docs/evidence commit sau khi runner kết thúc;
chỉ báo PARTIAL khi còn gate đỏ. Ngoại lệ reporting ghi anchor có owner duyệt,
không viện ngoại lệ để mở thêm writes.

## Native HOLD và cách verify

Owner xác nhận dùng `opchub_v46_801_dev` / `opchub_v46_801_test`, PostgreSQL native
5432 nhưng database riêng; Memurai 6381, cache/queue riêng. Không reset hoặc migrate
`opchub_dev`, không đụng Redis 6379, không đổi các cổng native gốc.

Runtime kiểm thử riêng: MSW Portal/Admin 3300/3301; native Portal/Admin 3400/3401;
API/socket 4300/4301 và worker; prototype 4830. Chỉ thay thế các PID riêng đã xác minh.
Sau kiểm chứng đã seed lại demo riêng và flush **chỉ Redis db 1 ở 6381**, giữ tiến trình
cho owner kiểm độc lập. Working tree sạch/commit không đồng nghĩa tắt native HOLD.

Đã seed lại hai lần thành công (`v46-803-seed-hold-{1,2}.log`), flush 17 cache keys
trên Redis db 1 (`v46-803-cache-hold.log`). SQL xác minh DEV riêng: **62 affiliates,
53 commissions (2 renewal), 53 regional shares**. API 4300 `/v1/health` trả `ok: true`;
3300/3301, 3400/3401, 4300/4301, prototype 4830 và Memurai 6381 vẫn LISTEN.
5432/6379 native vẫn LISTEN; không dùng hoặc flush Redis 6379.

## Việc còn lại / gate đỏ

- M1 yêu cầu consumer `regional_share.recorded`; owner đã giữ phạm vi, để consumer
  ở TIP-804. Không thêm no-op hoặc nới test để giả PASS.
- Baseline persona-turn EXPLAIN và browser/parity ngoài scope được ghi theo kết quả
  đo thực tế cuối; không tự sửa chat/reporting nghiệp vụ ngoài TIP.
- Chưa đạt parity thì không báo DONE, dù unit/build/scope test có pass.

## Parity cuối — application checkpoint 87253d95

`v46-803-parity-verification.log`: **9 passed (2 harness +7 ảnh), 21 failed /30**.
28/28 ảnh đã đo, không lỗi capture ở lượt này; ngưỡng vẫn 3%, không mask/nới tolerance.
Catalog chứa cả màn lịch sử của TIP khác; chỉ các record 87253d95 dưới đây thuộc lượt này.

| Màn | 1440 | 390 | Baseline 1440 /390 |
|---|---|---|---|
| D-84 | 6.614% FAIL | 3.662% FAIL | 15.684 / 7.841 |
| D-84-AFF | 5.871% FAIL | 9.611% FAIL | 5.946 / 27.377 |
| D-84-AFF-Q | 1.702% PASS | 24.587% FAIL | 1.552 / 32.029 |
| D-84-POL | 3.917% FAIL | 10.151% FAIL | 32.374 / 15.157 |
| D-85 | 1.089% PASS | 7.488% FAIL | N/A / N/A |
| D-85-CUS | 8.453% FAIL | 16.518% FAIL | N/A / N/A |

### COM substates — so với baseline mới

| Màn | 1440: baseline → cuối | 390: baseline → cuối |
|---|---|---|
| D-84-COM-BULK | 14.009 → 6.323% FAIL | 9.698 → 14.165% FAIL |
| D-84-COM-CANCELLED | 1.786 → 1.040% PASS | 13.740 → 2.678% PASS |
| D-84-COM-CANCELLED-MENU | 1.908 → 1.078% PASS | 16.013 → 2.941% PASS |
| D-84-COM-EMPTY | 1.531 → 0.897% PASS | 6.412 → 6.720% FAIL |
| D-84-COM-PAID | 17.263 → 9.700% FAIL | 10.840 → 6.421% FAIL |
| D-84-COM-PAID-MENU | 17.356 → 9.747% FAIL | 11.336 → 6.799% FAIL |
| D-84-COM-RECORDED | 15.758 → 6.599% FAIL | 11.004 → 4.942% FAIL |
| D-84-COM-RECORDED-MENU | 15.805 → 6.625% FAIL | 11.463 → 5.150% FAIL |

**Không đạt AC parity và không đạt toàn bộ AC “COM không tụt”**: BULK390 tăng
9,698 →14,165%; EMPTY390 tăng 6,412 →6,720%. Không quy cả hai là lỗi có sẵn.
BULK hiển thị 11 khoản gồm gia hạn thay vì 9, vẫn chọn đúng hai khoản năm 1; không
ẩn khoản để làm xanh ảnh. EMPTY còn lệch khung/banner/header. D-85-CUS còn lệch
header khách hàng, bảng/seed; D-84-POL còn lệch nhịp mobile và khung chung.
AFF-Q1440 đạt 1,702%; default AFF còn chênh dữ liệu/phân bổ region so prototype,
mobile khác chiều cao card. Các chênh còn lại là việc cần refine, không coi là PASS.
