# TIP-V46-802 — Completion report

## Trạng thái: PARTIAL, chưa DONE

Đã triển khai sổ chia sẻ Media Soft ↔ GĐ Vùng, năm của khách, chính sách ba
tham số, chi trả theo tháng đã đóng và UI Admin. Không tích hợp/merge vào dev
hoặc main; PR dành cho owner review. Gate đỏ được giữ nguyên, không bỏ assertion,
tăng ngưỡng parity, thêm mask hoặc đánh đồng retest riêng với full-suite PASS.

- Nhánh: `feature/TIP-V46-802-gdv-revenue-share`, từ dev `e59a1f82`.
- Source checkpoint: `d4316aa7`; browser selector follow-up: `6a79bef8`.
- Policy integration follow-up: `a297d9ad` (đã push).
- [Draft PR #80 — base dev](https://github.com/duymt-dev/OPCHUB/pull/80).

## Kết quả kiểm chứng

Log dưới đây ở `test-results/`, không cộng trùng các lượt chạy lại.

| Gate | Kết quả | Log |
|---|---|---|
| lint | PASS, 8 tasks; warning img hiện hữu | `v46-802-lint-commit.log` |
| typecheck | PASS, 8 tasks | `v46-802-types-commit.log` |
| unit toàn repo | PASS, 1.965 tests, 2 skipped hiện hữu, 6 tasks | `v46-802-test-final.log` |
| integration toàn repo | FAIL: server 1.791 passed, 3 failed / 1.794; 190 files passed, 3 failed / 193. Turbo dừng, DB task chưa hoàn tất trong lượt này | `v46-802-test-int-full.log` |
| integration scope 802 | PASS, 25/25, 4 files | `v46-802-share-int-final.log` |
| integration DB package | PASS, 126/126, 26 files; migration rollup test DB deploy thành công | `v46-802-db-int-final.log` |
| integration persona-turn retest | FAIL, 7 passed + 1 failed; không sửa chat/query plan ngoài scope | `v46-802-persona-int-retest.log` |
| integration policy retest | PASS, 2/2; API lưu 60/15/25, audit exact before/after | `v46-802-policy-int-retest.log` |
| depcheck | PASS, FE/shared 2282 modules và BE 1025 modules | `v46-802-depcheck-final.log` |
| build | PASS, 3 tasks native, forced build riêng; MSW full và Admin v5 hai mode cũng PASS | `v46-802-build-native-final.log`, `v46-802-build-admin-{msw,server}-v5.log` |
| E2E scope MSW v5 | 5/5 TIP-802; policy rhythm retest riêng 2/2 | `v46-802-e2e-msw-final.log`, `v46-802-policy-selector-browser.log` |
| E2E scope native v5 | PASS, 5/5, API/socket/worker thật + Memurai 6381 | `v46-802-e2e-server-final-2.log` |
| E2E MSW full cuối | FAIL, 341 passed, 9 failed, 4 skipped / 354; 26,6 phút. Cùng 9 ca fail baseline, 5 ca TIP mới pass | `v46-802-e2e-full-final.log` |
| seed demo affiliate hai lần | PASS, trên dev riêng; sau đó chỉ flush cache Redis db 1 | `v46-802-seed-final-{1,2}.log`, `v46-802-cache-hold.log` |
| parity | FAIL, 3 passed (2 harness + 1 ảnh), 5 failed / 8 | `v46-802-parity-final.log`, [results](ui-parity/results.md) |

Unit phân rã: shared 630, server 235, Portal 392, Admin 549, UI 56,
integrations 103 (+2 skip). Pool mặc định, không giảm isolation.
Sau sửa test policy, root lint/typecheck vẫn PASS 8 tasks và root unit PASS
6 tasks (5 cached), cùng 1.965 tests +2 skip: `v46-802-{lint,types}-policy-followup.log`,
`v46-802-unit-policy-followup-2.log`. Một lần gọi Turbo qua PowerShell sai cách
truyền `--maxWorkers` chỉ lỗi CLI trước chạy test; đã gọi lại đúng qua cmd.
Native v5 lượt đầu có một lỗi setup seed (4 passed), rerun đủ năm ca đã PASS;
không xóa dấu vết lượt lỗi hoặc gọi nó là kết quả full-suite.

### Parity cuối ở source d4316aa7

| Màn | 1440 | 390 |
|---|---|---|
| D-120-GDV | 1,919% PASS | 5,785% FAIL |
| D-120-GDV-OPEN | 10,531% FAIL | 8,403% FAIL |
| D-84-POL | 32,374% FAIL | 15,157% FAIL |

KPI mobile đã sửa từ một thành hai cột theo prototype (lượt trước 12,531%).
Các ảnh còn khác do phần header/chính sách hiện hữu, phân bố seed và chiều cao
chi tiết/lịch sử; không quy toàn bộ sai lệch cho baseline. D-84-POL full screen
còn phần §31 thuộc 803. Chưa đạt tiêu chí parity của 802.

### Baseline và regression

Baseline dev đo cùng máy: 336 passed, 9 failed, 4 skipped / 349, 25,1 phút
(`v46-802-baseline-dev-e2e.log`). Lượt implementation đầu: 339 passed,
11 failed, 4 skipped / 354 (`v46-802-e2e-full.log`). Hai lỗi mới là test nhịp
chính sách dùng input đầu tiên, nay input đó là trường GĐ Vùng mới. Đã đổi
selector sang đúng defaultRate được test mô tả, không đổi bất kỳ giới hạn CSS,
validation, timeout hoặc assertion nào. Retest hai viewport PASS 2/2; lượt sửa
selector đầu sai relative scope cũng đã ghi FAIL, không dùng làm bằng chứng PASS.
Lượt full cuối đã dùng selector sửa đúng: cả hai ca policy type-scale PASS;
tập 9 lỗi còn lại khớp từng tên ca baseline (hai responsive agents, cross-app,
affiliate payout, affiliate screen, chat topic, portal shell và hai reports).
Không phát hiện thêm failure mới trong lượt full cuối; vẫn không coi gate này xanh.

Ba lỗi integration full: (1) kỳ vọng policy API cũ thiếu ba field mới — đã cập
nhật fixture valid 60/15/25, giữ so sánh exact và audit before/after; (2) benchmark
`persona-turn` không chọn `messages_simulated_room_idx`, retest vẫn FAIL — chưa
đo dev integration cùng điều kiện nên không gọi là baseline; (3) M1 thiếu consumer
`regional_share.recorded`. TIP chỉ định consumer thuộc 804, owner đã xác nhận giữ
phạm vi 802 và ghi PARTIAL. Không sửa allowlist/test M1 hay thêm consumer no-op.
Retest riêng không biến lượt integration full trên thành PASS.

## Phạm vi triển khai

- Ba bảng `customer_years`, `regional_shares`, `regional_payouts`; backfill mốc
  thực thu từ phí/Gọi vốn, không sinh hồi tố khoản chia sẻ. Ba migration được
  tạo bằng `migrate dev --create-only`, bỏ thay đổi index không liên quan trước deploy.
- Ledger immutable, unique nguồn giao dịch; outbox cùng transaction, retry không
  nhân đôi. Vùng lấy nhóm sớm nhất còn là thành viên, nhóm ngành lấy tỉnh cha;
  không dùng tỉnh tick làm điều kiện nhận tiền. Không đổi hoa hồng affiliate cũ.
- Năm theo ngày kỷ niệm tại Việt Nam; làm tròn nguyên đồng và phần dư Media Soft.
  Chi tháng đã đóng, khóa và cập nhật có điều kiện pending; biên lai/idempotency,
  audit che STK, outbox thông báo idempotent. Người cũ giữ quyền nhận khoản cũ.
- Bốn API có permission backend; UI ba KPI, ba miền, tìm kiếm, 8 dòng + keyset,
  lịch sử, xác nhận/toast chi trả và ba ô chính sách. MSW có cùng luật và snapshot.
- Seed mở rộng từ các nguồn thực trong demo affiliate; `seed:demo --affiliate`
  tạo 50 khoản, ba miền và biên lai mẫu. Seed mặc định không bật affiliate không
  tự tạo giao dịch giả. Dữ liệu demo không sao chép thuật toán prototype.

## Quyết định và điều chỉnh được ghi nhận

- Owner cho dùng lại `opchub_v46_801_dev`, `opchub_v46_801_test`, Memurai 6381;
  không reset/chuẩn hóa `opchub_dev`, `opchub_test` hoặc chạm Redis 6379.
- Owner chốt vùng/GĐ Vùng vẫn tồn tại khi tỷ lệ bằng 0; CHECK cho phép trường hợp đó.
- Owner chốt tổng chi dùng PostgreSQL bigint; API kiểm tra số nguyên VND an toàn.
- Owner chốt giữ phạm vi khi TIP xung đột M1; consumer khoản mới vẫn thuộc 804,
  báo PARTIAL, không thêm no-op/nới test kiến trúc.
- Q-V46-802-1..7 được ghi tại [questions](ui-parity/questions.md): Gọi vốn ghi khi
  duyệt; khoản người cũ dùng ngân hàng snapshot; chỉ chi tháng đã đóng; không thêm
  đường đảo giao dịch khi sản phẩm chưa có nghiệp vụ hủy sau đối soát.
- `customerFirstPaid` đọc PK của `customer_years`, nguồn chuẩn đã backfill/ghi tại
  lần thực thu đầu; không lặp UNION lịch sử cho mỗi lần ghi sổ.
- File bổ sung ngoài danh sách chi tiết TIP để giữ SRP: summary repository/domain,
  SQL earliest-group dùng chung, cursor/demo/bank/state helpers, policy validation,
  component trường chính sách, cache invalidation test; thêm migration bigint và
  rollup covering index. Event thu hồi thêm bank snapshot để chi người chưa từng
  nhận biên lai, đúng phương án Q2. Không thêm dependency/biến env sản phẩm.

## Acceptance criteria và bằng chứng

| Tiêu chí | Kiểm chứng / giới hạn |
|---|---|
| Tỷ lệ năm, làm tròn, ranh giới năm/tháng | shared `regional-share.spec.ts`, 4 ca |
| D-130 Gọi vốn, bỏ zero/non-referral/self/rejected | `share-ledger.int.spec.ts` |
| Vùng trống/bổ nhiệm sau, earliest group, tỉnh không tick | `share-ledger.int.spec.ts`; chưa có ca integration riêng cho nhóm ngành con |
| Unique nguồn/retry/concurrency | `share-ledger` chạy record song song; chưa kiểm relay thực tế hai lần trong ca này |
| Chính sách chỉ áp khoản mới, percent=0 có người nhận | `share-ledger`; API valid-update 60/15/25 và audit exact before/after trong `affiliate/policy.int.spec.ts` retest |
| Chi tháng đã đóng, biên lai, bank redaction, thông báo, khóa cạnh tranh | `share-payout.int.spec.ts`, gồm tổng 3 tỷ vượt int32 |
| AT-GDV04 khoản người cũ sau thu hồi | `share-payout`, bank snapshot và payee cũ |
| Quyền 5 vai trò × 4 route; thiếu key/invalid policy | `share-permissions.int.spec.ts` |
| Backfill hai nguồn, zero/legacy, chạy lại | `share-backfill.int.spec.ts` |
| KPI, 8+8 dòng, lịch sử, toast/KPI/F5, tìm kiếm, accountant/admin | `admin-regional-shares.spec.ts`, cùng assertions trên MSW và server thật |
| Mock persistence/idempotency/policy | 5 mock unit + 4 shared unit; cache refresh sau bổ nhiệm/thu hồi/sửa bank có hook test riêng |
| UI parity ≤3% | Chưa đạt toàn bộ; xem bảng đo cuối và artifacts |

## EXPLAIN ANALYZE — dữ liệu riêng, không đổi planner

Log `test-results/v46-802-explain-final.log` lấy chính SQL repository qua onQuery,
bind tham số lại, không dùng một query minh họa khác. Thêm 12.000 bản ghi mỗi bảng
shares/users/affiliates/group_members trong DB dev riêng, dọn fixture trong finally.
VACUUM ANALYZE và REINDEX KPI/payable sau nhiều lượt fixture insert/delete để tránh
index bloat; không `enable_seqscan=off` hay sửa planner toàn cục.

| Query | Plan thực đo | Execution time |
|---|---|---|
| KPI grouped tháng/người nhận | Index Only Scan `regional_share_kpi`, heap fetches 0 | 7.238 ms |
| Keyset 8 khoản, deferred payload/profile joins | Index Only Scan + 8 PK seeks | 0.227 ms |
| Nhóm sớm nhất | Index Only Scan `group_members_regional_earliest` + groups PK | 0.070 ms |
| Khóa 12.020 khoản kỳ đóng | Covering IDs + lateral PK FOR UPDATE | 111.002 ms |

Không Seq Scan bảng lớn ở bốn plan cuối. Những lượt trước có Seq Scan đã được
khắc phục bằng rollup index đúng grouping, deferred lock và chuẩn bị fixture sạch;
không dùng các plan trước làm bằng chứng PASS.

## Scope chưa làm / rủi ro còn lại

- Các gate full-suite và ảnh còn đỏ phải được xem theo kết quả cuối, không báo DONE.
- Chính sách toàn màn §31/net/header thuộc TIP-803; thông báo khoản mới thuộc 804;
  thay đổi BR-463 nguồn hoa hồng thuộc 807. Không sửa lan để làm xanh baseline.
- Người đã thu hồi mà không có ngân hàng trong biên lai hoặc sự kiện thu hồi bị
  chặn 409; chưa thêm UI nhập ngân hàng người cũ ngoài phạm vi TIP.
- Mock audit `regional_share.payout` hiện không thuộc filter snapshot `affiliate.*`;
  biên lai và thông báo vẫn persistence, native audit là bền vững trong Postgres.
- Hai khoảng trống kiểm thử cụ thể (nhóm ngành con, relay thật hai lần) trong bảng AC chưa được coi là PASS đầy đủ.
- Artifact log local ở `test-results/` không được commit vì chứa output môi trường;
  ảnh/diff và tổng hợp parity được commit tại thư mục report.

## Soát luật cứng 1–14

Code tách module/component, không vượt trần; TypeScript strict/zod, không any hoặc
ts-ignore; ranh giới depcheck; permission backend; không query per recipient/vòng
lặp ghi sổ; covering/keyset/deferred join; transition pending có điều kiện; audit
và outbox transaction; VND nguyên/time UTC + VN; fake integrations khi test; không
secret/env mới; test file riêng. Git commit/push và trạng thái sạch được ghi ở
checkpoint cuối. Đây không phải xác nhận mọi gate sản phẩm đã xanh.

## Verify và Native HOLD

1. `pnpm lint && pnpm typecheck && pnpm test`, `pnpm depcheck`, `pnpm build`.
2. Nạp URL hai DB riêng/Redis 6381 từ env local rồi `pnpm test:int` hoặc chạy
   bốn file `test/regional-director/share-*.int.spec.ts` của server và `pnpm --filter @opchub/db test:int`.
3. MSW: `PORTAL_PORT=3300 ADMIN_PORT=3301 PROTO_PORT=4830 pnpm e2e` (cú pháp
   đặt env tương ứng PowerShell). Scope: `pnpm --filter @opchub/e2e e2e admin-regional-shares`.
4. Server: Portal 3400/Admin 3401/API 4300/socket 4301; chạy
   `pnpm --filter @opchub/e2e e2e:server admin-regional-shares` với env đích riêng.
5. `PARITY_IDS=D-120-GDV,D-120-GDV-OPEN,D-84-POL pnpm --filter @opchub/e2e parity`.

Đã seed lại dev riêng hai lần sau native E2E và benchmark, giữ listener/API/socket/
worker, Portal/Admin thật, Memurai 6381 và prototype 4830 để owner kiểm độc lập.
Native PostgreSQL 5432 và Memurai 6379 vẫn chạy nguyên; không reset DB native,
không dừng hay đổi cổng dịch vụ native. Không giữ source uncommitted dưới tên HOLD.

**Kết luận:** triển khai đã commit/push, PR draft vào dev; PARTIAL theo owner.
Còn gate full integration (M1 và query-plan), full E2E baseline, parity và hai
khoảng trống coverage đã nêu. Không merge, auto-merge hoặc báo DONE.
