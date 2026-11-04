# TIP-V46-804 — Completion report

## Trạng thái: PARTIAL — chưa DONE

Nhánh `feature/TIP-V46-804-portal-my-region`, tách từ dev `01de9037`;
TIP checkpoint `ce6d9427`. Implementation `08fbd7de`, presentation `2167e976`,
retention follow-up **`c1fd1625`**, test-only cookie assertion `d690a63f`, đã commit và push.
[Draft PR #82 — base dev](https://github.com/duymt-dev/OPCHUB/pull/82).
Không merge, không auto-merge, không push main. Mọi lượt gate đã kết thúc;
không coi scope PASS là full-suite PASS. REQ-618 / REQ-630, D-119–D-122 / D-127–D-132.

## Đã triển khai

- `GET /v1/me/gdv`: auth + SkipMembershipFee; chỉ slot hiện tại có user_id=sub.
  Không phải GĐ Vùng/đã thu hồi trả 200 none, không lộ ngân hàng/vùng khác.
  Mọi aggregate lọc đồng thời region và director_user_id, loại region NULL.
- Bốn aggregate qua reporting projection: KPI snapshot, đúng 4 bucket năm (4+),
  DISTINCT khách theo affiliate, 50 affiliate + more, 24 tháng mới nhất.
  % hiển thị lấy policy hiện hành, tiền không tính lại. Tháng mixed vẫn pending;
  paidAt nối đúng payout của khoản, không dùng tháng batch chi.
- Consumer regional_share.recorded thật: thông báo in-app tới người nhận snapshot,
  ID cố định regional-share:<shareId>, body tên khách/gói/năm/tiền, link ?tab=reg.
  Skip khoản mất/vùng trống; giữ ID payout/bổ nhiệm và đổi deep link tương ứng.
  Test M1 không sửa/nới; không thêm no-op, email, Web Push hoặc Zalo provider.
- Portal có banner trên cảnh báo STK, tab Vùng của tôi chỉ đọc, URL/F5/fallback,
  đủ 4 KPI + 3 bảng, STK đầy đủ chỉ cho chính chủ, bảng mobile cuộn trong khung.
  Tách screen orchestration, hook, banner, KPI và từng bảng thành module nhỏ.
- Hero đúng 2 badge; locked lấy tỷ lệ/năm gia hạn từ API. Referrals dùng từng
  commission membership/fundraising UNION referral chưa có commission, ID ổn định,
  deferred join, lọc tháng theo nguồn, hiện năm khách cả desktop/mobile.
  Lịch sử affiliate paid cũ và thẻ ngân hàng/thanh chia sẻ không đổi nghiệp vụ.
- MSW có cùng schema, tổng snapshot và 3 login GĐ Vùng; cập nhật 10 bộ messages,
  giữ ICU/biến/thẻ. Không thêm dependency/env/schema bảng/migration.

### Follow-up giữ lịch sử sau xóa tài khoản

RegionalShare không FK tới affiliate/user để giữ sổ tài chính. Rà soát phát hiện
INNER join tên có thể làm mất dòng bảng affiliate sau hard delete, dù KPI còn tiền.
Test thật ban đầu RED (0 dòng thay vì 1); c1fd1625 dùng LEFT LATERAL, giữ ID/tổng
snapshot, tên “Thành viên đã xóa”, mã trống. Test GREEN trong scope cuối 127/127.
Không thay dữ liệu ledger, không phục hồi PII, không mở rộng nghiệp vụ chi trả.

## Gates và bằng chứng

| Gate | Kết quả thực đo | Log local (test-results/) |
|---|---|---|
| lint | PASS, 8/8 tasks; warning img có sẵn, không error | v46-804-lint-final.log |
| typecheck | PASS, 8/8 tasks; đã có lượt force toàn bộ | v46-804-typecheck-final.log; typecheck-latest.log |
| unit | PASS: **1.968 passed, 2 skipped**; 6/6 tasks | v46-804-unit-final.log |
| depcheck | PASS: 2 graph, không violation | v46-804-depcheck-final.log |
| build | Root 3/3 ở checkpoint; final FE MSW/native 2/2 mỗi mode; backend cuối PASS | build-msw.log; build-server.log; build-msw-final.log; build-native-final.log; build-server-final.log |
| full test:int | DB 126/126; server **1.800 pass / 1 fail**, 200 file; root FAIL | v46-804-int-full.log |
| affected integration cuối | **127/127, 41 file PASS**, gồm M1/relay/retention/5 plans | v46-804-int-final-scope.log |
| full MSW E2E R2 | **349 pass / 6 fail / 4 skip**, 359 test; FAIL, trước test-only assertion follow-up | v46-804-e2e-msw-final.log |
| cross-app retest cuối | 1 FAIL tại cancelled row, trùng lỗi baseline; badge 45 ngày đã qua | v46-804-cross-app-final.log |
| native E2E 804 cuối | **3/3 PASS**, cùng assertions MSW, sau backend build cuối | v46-804-e2e-native-final.log |
| parity MSW | 3/8 ảnh PASS + 2 harness PASS; 5 ảnh FAIL | v46-804-parity-msw-final.log |
| parity native | 1/8 ảnh PASS + 2 harness PASS; 7 ảnh FAIL | v46-804-parity-native-final.log |

Unit: shared 637, server 235, Portal 396, Admin 541, UI 56, integrations 103 + 2 skip.
Giữ test timeout/isolation, không thêm skip hay nới assert. Giới hạn concurrency/worker
chỉ phục vụ tài nguyên máy. Lượt unit cuối dùng cache hợp lệ cho cả 6 tasks; lượt trước đã chạy lại server 235
và giữ nguyên các kết quả package đã kiểm chứng. Source đã commit ngay sau các scope/gate PASS, không giữ
source chưa commit trong HOLD.

**Full test:int hoàn tất trước retention follow-up** (backend tương đương 08fbd7de;
presentation 2167e976 không đổi backend). Sau c1fd1625 đã chạy lại
lint/typecheck/toàn bộ unit/depcheck, build backend, toàn bộ affected integration
127/127 và native browser 3/3. **Không chạy lại full 41 phút sau follow-up**;
không cộng scope vào full count để giả thành full-suite PASS.

### Lỗi full integration còn lại

Duy nhất `test/bot/persona-turn.int.spec.ts` — exact prune query không chọn
messages_simulated_room_idx theo assertion trên >10k messages. Có ở baseline mới
trước code (scope 30 file: 86 pass / 2 fail — M1 và persona plan). 804 đóng M1;
không sửa query/test Bot ngoài phạm vi. Không chạy lại full pre-code integration;
không lấy báo cáo cũ làm lượt baseline mới.

### Sáu lỗi E2E có sẵn

Baseline mới ở ce6d9427 (production giống dev 01de9037): 346 pass / 6 fail / 4 skip.
Full R2 thêm đúng 3 test 804 PASS; cùng 6 test identity đỏ. Không có test 804 mới bị lỗi.
Riêng nguyên nhân dừng sớm của cross-app đã được xử lý/đối chiếu như ghi bên dưới:

- affiliate-cross-app.spec.ts:14 — bank/rate/policy hai origin.
- affiliate-screen.spec.ts:17 — lịch sử AF0/ngân hàng snapshot.
- chat.spec.ts:44 — API tạo chủ đề 404.
- portal-shell.spec.ts:67 — ngôn ngữ/menu/Trang chủ/sự kiện sắp tới.
- reports.spec.ts:39 — B1 mặc định.
- reports.spec.ts:79 — CSV B1/filename.

Cross-app ở full R2 dừng sớm vì assert đoạn mô tả cũ, không phải đúng nguyên nhân
baseline. d690a63f cập nhật assert chính xác badge “Link ghi nhận 45 ngày” theo BR-495,
không giảm timeout hay bỏ assertion. Retest đi qua badge/rate/bank/F5 rồi FAIL tại
cancelled row “Kiều Văn S.”, đúng điểm baseline trước code. **Không chạy lại full
MSW sau test-only follow-up**, không tự suy diễn thành 350 pass hay full-suite PASS.

R1 dùng runtime trước refinement (347 pass / 8 fail / 4 skip, gồm 2 caption mới
chưa khớp runtime) đã được thay bởi **full R2 final 349/6/4**; không dùng R1 làm
bằng chứng bản cuối. Native chỉ chạy scope 804, không tuyên bố full native E2E PASS.

## Acceptance criteria

| Nhóm | Bằng chứng / trạng thái |
|---|---|
| Auth, none/revoked, SkipMembershipFee, chính chủ | my-region.int.spec.ts; native browser PASS |
| Snapshot KPI/4 năm/current policy/không lọc tỉnh tick | my-region.int.spec.ts PASS |
| DISTINCT khách, cap 50/more, cap 24 tháng | my-region-limits.int.spec.ts PASS |
| Paid/mixed tháng, exact payout paidAt | my-region-limits.int.spec.ts PASS |
| Relay/idempotency/snapshot người nhận/M1 | my-region.int.spec.ts + outbox-consumers.int.spec.ts PASS |
| Banner/tab/URL/F5/read-only/mobile không tràn | portal-my-region.spec.ts, MSW + native PASS |
| Locked renewal 10%/năm 3 và 15%/năm 4 | affiliate-hero.spec.tsx PASS; API preview policy không hardcode |
| Mỗi commission/nguồn/month/khách pending | portal-referral-rows.int.spec.ts PASS |
| MSW director login/schema + lỗi optional query không lộ PII | my-region.spec.ts + use-my-region.spec.tsx PASS |
| EXPLAIN 10k, không SeqScan bảng lớn | [Năm plan cuối](TIP-V46-804-query-plans.md) PASS |
| P-97/P-98 không tụt baseline MSW | Đạt cả 4 ảnh, nhưng P-97 desktop vẫn >3% |
| Parity vùng mới ≤3% cả hai viewport | **CHƯA ĐẠT**, không đánh dấu DONE |

## Parity — ngưỡng giữ nguyên 3%

Tất cả final measurements ở **c1fd1625**, thao tác đăng nhập thật qua UI;
không mask, không crop để giấu sai lệch, không tăng tolerance/timeout.
Trước full-page capture, cùng thao tác cuộn về đầu ở cả hai phía để ổn định sticky header.

| ID | Viewport | Baseline MSW trước code | Final MSW | Final native |
|---|---|---|---|---|
| P-97 | 1440 | 9.245% FAIL | 4.152% FAIL | 4.206% FAIL |
| P-97 | 390 | 12.039% FAIL | 1.199% PASS | 4.154% FAIL |
| P-98 | 1440 | 8.234% FAIL | 1.175% PASS | 1.240% PASS |
| P-98 | 390 | 12.780% FAIL | 1.556% PASS | 5.142% FAIL |
| P-V46-REG | 1440 | — | 7.346% FAIL | 7.420% FAIL |
| P-V46-REG | 390 | — | 15.266% FAIL | 15.234% FAIL |
| P-V46-REG-BANNER | 1440 | — | 16.606% FAIL | 16.653% FAIL |
| P-V46-REG-BANNER | 390 | — | 10.861% FAIL | 11.008% FAIL |

Không có baseline native mới trước code; không dùng baseline MSW để kết luận
native không regression. Bốn ảnh mới REG/REG-BANNER **là gate đỏ của 804**, không
đổ thành “lỗi nền”. Các khác biệt còn gồm layout/empty referrals và shell của persona
m3, mã affiliate, trạng thái phí, fixture sổ/biên lai 802/803 (có năm tương lai),
đồng hồ API native so với clock browser/prototype. Không đổi ledger hay thuật toán
hoa hồng để bắt chước số tiền prototype. Cần vòng refine/parity tiếp, không tự xin
ngoại lệ ngưỡng. Ảnh diff + JSON được lưu riêng MSW và server/ trong ui-parity/. Các JSON/Markdown
catalog còn giữ kết quả các TIP cũ; **chỉ 8 ảnh trong bảng này được đo mới ở 804**,
không tuyên bố đã chạy lại toàn bộ catalog parity.
Một lượt native trung gian trùng reset HOLD bị loại; lượt cuối và seed HOLD được
chạy **tuần tự** sau đó.

## Quyết định/phạm vi

Q-V46-804-1..3 đã ghi trong ui-parity/questions.md theo phương án an toàn của TIP:
revoked → none; % hiện hành chỉ để hiển thị; tháng theo khoản, max đúng payout.
Owner xác nhận DB riêng/6381 trước integration/seed. Không sửa permission 807,
zero legacy, Bot, báo cáo hay các failure ngoài TIP; không thêm direct affiliate payout.

Portal chưa có client logger đã cài: lỗi optional GET /me/gdv báo qua browser
reportError với thông báo cố định, không response/credential/STK, không console.*.
Đây là **lệch hẹp so với câu “logger hiện có”** cần owner review, không giả một
logger/no-op và không thêm SDK. Lỗi không thay ordinary affiliate bằng error screen.
Các module mới ngoài danh sách header TIP chỉ để tách SQL/projection/hook/view/test
và hồi quy retention; Admin production không đổi, chỉ fixture typed thêm default fields.

## Strict Native HOLD

Final parity native kết thúc rồi mới seed `--affiliate` **2 lần tuần tự** và flush
cache **Memurai 6381 db1**. Hai lần count giống nhau:
80 users, 62 affiliates, 51 referrals, 53 commissions, 65 periods, 53 shares,
1 payout, 50 customer-year anchors, 3 director slots có người; **0 khoản lệch
base_amount = director_amount + media_soft_amount**. Không tuyên bố timestamp/UUID
hai lần seed giống byte; bằng chứng là count và invariant tài chính.

- Giữ private `opchub_v46_801_dev` / `opchub_v46_801_test`, Redis db1/dev + db2/test.
- Native test Portal/Admin: http://localhost:3400 / http://localhost:3401,
  API4300, Socket4301, worker chạy; FE dist .next-v46-804-server-v3.
- MSW Portal/Admin: http://localhost:3300 / http://localhost:3301;
  prototype http://localhost:4830; FE dist .next-v46-804-msw-v3.
- Postgres5432 PID5932, Redis native6379 PID1244 vẫn chạy; không ghi vào
  opchub_dev/opchub_test, không dừng/đổi dịch vụ/cổng native gốc. Memurai riêng6381 PID20340.
- Manifest/count/seed/cache local: v46-804-hold.json, hold-seed-{1,2}.log,
  hold-counts-{1,2}.log, hold-cache.log. Giữ services/data để owner kiểm độc lập;
  HOLD không có nghĩa giữ source chưa commit.

## Verify lại

Nạp env vào **hai DB riêng đã chốt**, Redis6381 (không dùng native6379), fake adapters;
không đưa credentials vào repo/log. Chạy lint/typecheck/test/depcheck/build như root
scripts; root integration dùng `pnpm test:int`. Unit lượt cuối dùng Turbo concurrency=2,
Vitest maxWorkers=3, không đổi isolation. Local launcher có sẵn test-results/v46-804-run.cjs.
E2E MSW: PORTAL_PORT=3300, ADMIN_PORT=3301, PROTO_PORT=4830 → `pnpm e2e`.
Native: config e2e/playwright.server.config.ts, SERVER_PORTAL_PORT=3400,
SERVER_ADMIN_PORT=3401, API_PROXY_URL=http://127.0.0.1:4300,
SOCKET_PUBLIC_URL=http://localhost:4301, seed/reset chỉ DB riêng.
Parity: PARITY_IDS=P-97,P-98,P-V46-REG,P-V46-REG-BANNER, hai viewport mặc định.

Đăng nhập bao.tran@solobooks.vn / User@2026 → Mạng lưới Affiliate → Xem Vùng của tôi;
kiểm 3 bảng/chỉ xem, F5 giữ tab. M1 consumer gate PASS nhưng milestone delivery
801→804 vẫn **PARTIAL** vì các full gate và parity nêu trên chưa xanh.
