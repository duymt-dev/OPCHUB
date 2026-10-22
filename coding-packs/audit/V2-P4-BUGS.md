# V2-P4 — Findings phát sinh khi kiểm Affiliate

## AUDIT-P4-04 - S2 - CLOSED (audit preconditions and observation)

Full e6dc3cd audit records d15-lock-effects, hide-message and UAT-29 as S2.
877a461 extracts their corrected checks: a paid outsider loses public project
access after owner lock while group ownership transfers; a paid sender's actual
message is readable before reporting and original content disappears after hide;
welcome intro/document appear in Admin preview and delivered FakeMail, exact job
is sent and DB HTML remains purged. No production guard/visibility/mail change.
Focused native record rows close all three; UAT-29 now DAT. Old failures remain
in evidence, not deleted or reclassified as cosmetic. Four S2 raw findings include
UAT-14 bot, which remains P5/excluded, not fixed. Nineteen S3 remain documented in
V2-P4-AUDIT-FOLLOWUPS.md; full 251 completed is not a clean findings ledger.
Latest native/MSW Affiliate 52/52 each; full legacy behavior regression pending.
See ../reports/V2-P4-final-audit-checkpoint.md.

## AUTH-P4-01 - S2 - FIXED (source/focused native), full regression pending

Native parallel Admin reload reused a rotating refresh cookie across tabs and
logged one tab out. The earlier helper readiness fix b9207c5 alone did not solve
this: full rerun still 20 pass/1 fail/31 not run. Source 1eaebae adds an Admin
origin Web Lock without sharing tokens or weakening backend reuse detection.
Four strict units; gate 22/22, 835 + 2 existing skips; native concurrency passes
three repeated executions with both PATCH writes and simultaneous reload intact.
Full native regression, final audits/UAT remain pending. Unsupported Web Locks
retains old fallback, not claimed cross-tab protection. See
../reports/V2-P4-native-browser-checkpoint.md and its retained failed evidence.

## AUDIT-P4-01 · S3 · CLOSED (tooling) · C5 bỏ sót guard sau HTTP decorator

- Static preflight reported fifteen S1 missing-guard flags for Affiliate. Source
  actually has `@RequireAdmin` after `@Get/@Post`; the old reader scanned only
  preceding decorator lines. These are false audit findings, not fifteen proven
  production authorization bypasses.
- `ca6b368` uses a separate TypeScript AST helper, keeps true absent/comment/
  sibling guards unguarded in six fixture tests and removes stale Affiliate
  permission-key deferrals. No controller/permission guard was changed.
- C5 rerun **173 pass/0 finding**, including view 8/action 6/payout 1 routes.
  Fresh native guards/preview/Admin contract subset **7/7**; full forced gates
  **22/22**, **813 units + 2 skips**. This closes the reader bug, not P4 audit
  or native browser acceptance. See `../reports/V2-P4-audit-preflight.md`.

## AUDIT-P4-02 · S3 · CLOSED (tooling) · C4 chưa liệt kê transition Affiliate

- Source `1477383` adds a separate Affiliate audit module, linked through a facade:
  six legal transitions plus automatic creation and recorded-only rate invariants.
  Every check requires implementation, HTTP/worker registration and positive plus
  blocked native-test anchors. Nine auditor units reject missing sources/routes,
  empty declarations and omitted legal state-machine edges.
- Static C4 is now **36 pass/1 finding**. This closes the missing Affiliate
  catalogue, not native browser or P4 acceptance. Two new terminal-referral tests
  initially passed in a 57/57 native run, but the committed frozen-clock rerun
  exposed persistent fixture identity collisions; see TEST-P4-01 below.
- The P5 bot finding remains excluded by the user's stop-after-Affiliate scope,
  not implemented or marked fixed. No audit waiver is inferred.

## AUDIT-P4-03 · S4 · PARTIAL / DEFERRED · C6 còn 4 finding tài liệu env

- Documentation source `a88b561` documents twelve existing build/test/runtime
  keys across six examples. C6 rerun is **138 pass/4 findings**, not all green;
  no private env value, runtime configuration, dependency or new key was added.
- Three `SENTRY_DSN` placeholders remain deferred under Q-B65-1: the SDK is not
  integrated. Preserve the explicit placeholders; adding infrastructure or a
  fake consumer only to silence this check would misrepresent implementation.
- The DB example's `DATABASE_URL` is retained as an explicit runtime/API
  reference. DB CLI uses `DIRECT_URL`; server PrismaService consumes
  `DATABASE_URL`. C6's DB-only schema scope still reports this cross-package
  reference. Defer that documentation/scope warning, do not claim DB CLI reads it.
- Audit runner exit 0 does not mean findings passed. Current raw before/after
  output and scope limits are preserved in `../reports/V2-P4-audit-preflight.md`.

## TEST-P4-01 · S3 · CLOSED (test fixture) · Frozen-clock fixture identity repeats

- The final focused rerun of `referral-terminal.int.spec.ts` failed 2/2 before
  domain assertions: `users_member_code_key` collided. Factory identities were
  based on `Date.now()` plus a process-local counter; a frozen clock and a new
  test process reuse those values against the persistent native test database.
- Fix `bc03c9f`: derive fixture email/member-code identity from its UUID,
  independent of the clock/counter. Preserve test rows, native DB constraints,
  clock pinning, assertions and all production code. Two consecutive fresh
  processes pass 2/2 each; full Affiliate/contract native **57/57 in 24 files**,
  forced gates **22/22**, **822 units + 2 skips**, both depcheck graphs pass.
- This is a test-fixture defect, not evidence of a production referral regression.
  Raw failure and reruns: `../reports/evidence/v2-p4-transition-audit/`.

## BUG-045 · S2 · Cache server-state của tài khoản trước còn sau đăng xuất

- **Phát hiện:** AT-AF02, trên MSW. Đăng ký khách qua HAOPC, đóng phí, khai STK,
  đăng xuất rồi đăng nhập Lê Thu Hà trong cùng tab bằng điều hướng SPA.
- **Thực tế trước sửa:** hộp chào mừng mở lại với tên Lê Thu Hà nhưng email/nội dung
  của khách vừa đăng xuất. Mask của hộp chặn thao tác Affiliate, test timeout.
  Provider giữ cùng QueryClient; các key `me`/welcome/affiliate không có identity
  boundary. Không suy diễn rằng backend đã trả dữ liệu sai người.
- **Mong đợi:** AU-09 yêu cầu xóa query cache khi đăng xuất; chuyển danh tính không
  được dùng dữ liệu riêng của người trước. Refresh cùng danh tính không mất cache.
- **Sửa:** `providers/session-query-boundary.tsx` đăng ký subscription đồng bộ vào
  auth store, clear QueryClient khi `me.id` đổi. AppProviders chỉ nối component.
  Query đang chạy của người cũ bị loại; response muộn không ghi vào cache mới.
- **Regression:** bốn test `session-query-boundary.spec.ts`; AT-AF02/BUG-045 cùng
  assertion trên MSW/native, đi hết đến khách mới + hoa hồng 150.000đ của HAOPC.
- **Trạng thái:** CLOSED, source `f821b0e`, bổ sung `32f6112`. Bốn unit pass;
  AT-AF02 pass trong lượt MSW 25/26 và native 26/26. Lỗi còn lại của lượt MSW
  thuộc UAT-11 đăng nhập sau đổi mật khẩu, không phải luồng đổi danh tính này.
  Log tại `../reports/evidence/v2-403/acceptance/`; không suy rộng thành DONE Pha 4.

## Ghi chú kiểm thử

### UI-404-05 · S3 · FIXED (source/MSW) · Paid/cancelled rows lost their status menu

- The prototype renders a status-menu trigger on every commission. The app
  returned null for paid/cancelled actions, so terminal rows lost status
  inspection and their mobile action areas collapsed. Fresh browser geometry
  showed matching summary/first recorded-row positions but a 168px shorter app
  table across the nine-row selected-owner view; this was not a bulk-bar offset.
- Source `cbf9eaa` extracts a feature-local menu for all three statuses. Only
  recorded-to-cancelled delegates to the existing reason/confirmation flow;
  direct payment, restore and all terminal writes remain disabled. Permission
  keys/preview/revocation gate cancellation; parent and backend guards remain.
  Read-only inspection is explicitly safe, not a new write exemption.
- Six new units pass; full forced gates **22/22 / 828 units + 2 existing skips**,
  both depcheck graphs and separate Admin MSW/native builds pass. Committed
  Affiliate/RBAC browser mock regression **50/50**, including two new 360/390
  menu/disabled-operation/zero-write/reason-dialog/F5 cases. Native browser and
  full visual-state acceptance remain open; no claim of a new native 57 rerun.

- Layout follow-up f394dc5 keeps the current status readable but aria-disabled,
  adds trailing check/dots and a real 180px popup. Nine menu units and 52/52
  committed MSW pass, including keyboard/viewport/zero-write cases on f91f499.
  This strengthens source/MSW evidence, not native or whole-UI acceptance.

### MSW-404-06 · S3 · CLOSED · Relay chờ ping khi clock parity đang dừng

- Đo D-84 trên bridge mới bị timeout 120 giây ở đăng nhập, chưa tạo ảnh để so.
  Ping đầu tiên chạy trước iframe hydrate; các ping tiếp theo dùng interval 100ms,
  không chạy khi harness giữ clock đứng yên. Không coi timeout này là pixel diff.
- Source `8635d63`: iframe gửi referrer ở mức origin; host thông báo ready ngay
  sau khi cài listener, chỉ tới origin HTTP(S) cùng hostname của parent từ referrer.
  Không gửi state/credential trong ready; nhận state vẫn qua source/origin guard,
  MessageChannel và Web Lock cũ. Không đổi clock hay nới ngưỡng parity để né lỗi.
- Sáu unit kiểm ready sau listener, exact target origin, cleanup và năm referrer
  không hợp lệ. Browser `affiliate-frozen-clock.spec.ts` giữ clock đứng yên toàn
  bộ login/Admin/F5/Portal/F5, pass trong focused MSW 3/3.
- Chạy lại D-84/D-85 đã đi tới so ảnh: 1/4 pass, ba pixel diff vẫn fail như trước.
  Finding này đóng lỗi khởi động relay, **không đóng UI-404-03** hay nghiệm thu P4.

### MSW-404-05 · S3 · CLOSED · Welcome mail đã lấy hiện lại sau F5

- Mở rộng AT-AF02: bank của thành viên mới vẫn đúng sau reload, nhưng thao tác
  logout timeout vì popup welcome xuất hiện lại, mask chặn nút menu. Trace chỉ
  rõ pointer bị mask intercept; không nới timeout/force click để làm test xanh.
- `takeWelcomeMail` dùng Set ở module, mất consumed marker khi tải lại runtime.
  Source `13ea4ed`: WeakMap theo MockDb + consumed metadata trong shared ledger;
  parser nhận ledger cũ không có metadata mà không xóa financial rows.
- Hai unit + AT-AF02 F5 assertion popup count=0, sau đó logout/đổi owner và đọc
  commission đều pass trong bộ focused MSW **5/5** và hồi quy chốt SHA **33/33**.
  Full unit **714 + 2 skipped**.
- Chỉ kết luận lỗi backend giả MSW đã sửa. Native dùng mail controller riêng;
  chưa coi browser native trên source mới đã được kiểm. Khác BUG-045 (cache cũ
  qua đổi danh tính), không mở lại/đóng thay lỗi đó. Xem evidence payout-browser.

### MSW-404-04 · CLOSED · Bearer cũ của Admin bị khóa vẫn đọc/ghi Affiliate

- Refresh MSW đã từ chối account locked, nhưng guard Affiliate chỉ kiểm kết quả
  `mockAdminMeOf`; hàm này vẫn trả profile/quyền của account đã khóa. Do đó một
  bearer `mock.<id>` có sẵn có thể vượt guard dù tài khoản không còn active.
- Source `ea4c189` kiểm account hiện hành phải active ở guard chung trước đọc,
  parse body và tác động tài chính. Không dựa vào tên vai trò, không lưu quyền
  trong cookie. Mở khóa dùng lại account/quyền hiện hành.
- `affiliate-authorization.spec.ts`: **14/14** pass, đủ 7 read + 7 write/export
  endpoint; kiểm đọc trước khóa, 401 sau khóa, đọc lại sau mở khóa. Write bị từ
  chối không đổi referral/payout/policy hoặc thêm audit. Full forced unit **686
  passed + 2 existing skipped**, lint/typecheck/depcheck pass.
- Finding chỉ áp dụng backend giả MSW. Không coi đây là bằng chứng cho kiểm
  khóa tài khoản/native hoặc bridge Portal–Admin; các gate P4 đó còn mở.

### UI-404-03 · S3 · DEFERRED (user-approved cosmetic debt) · Admin Affiliate chưa đạt parity ver2

- 2026-10-22 TIP-V2-558 (`fb79c54c`): native + MSW **29/34** (was 27/34). FIXED:
  TD-P4-UI-06/07/08. Still FAIL, pending owner as DV-P4-558-1..4: D-84-AFF
  24.21/27.69%, D-84-POL 390 13.70%, empty lists 390 3.40/3.62%. Details and raw
  numbers in V2-P4-UI-TECH-DEBT.md; status stays DEFERRED, not pixel PASS.

- 2026-10-21: user approves cosmetic differences as technical debt to prioritize
  P4 completion. Seven known raw failures are recorded in V2-P4-UI-TECH-DEBT.md;
  not FIXED or pixel PASS. Prior OPEN/no-waiver statements below are historical.
  Functional/native/UAT/security/money/audit acceptance remains mandatory.

- Current UI **f394dc5**, keyboard paint readiness **f91f499**: full MSW
  **52/52**, **831 units + 2 existing skips**, gates 22/22 with cache explicitly
  reported. Fresh raw parity **27/34**, same seven failures. Cancelled mobile
  menu improves **5.1425% -> 4.7331%** but remains FAIL; two desktop menus
  slightly regress within 3%. No threshold/mask/seed/waiver change. Initial
  width 0/2 and full 51/52 animation-race failures retained with final strict
  readiness/repeat evidence. Native browser/final audits/UAT/merge remain OPEN.
  See `../reports/TIP-V2-404-popup-layout-checkpoint.md`.

- Prior coverage `2f4f2b1`, readiness `c353134`: six additional filter/open-menu
  states expand measurement to **34 images, 27 pass/7 fail**, every row freshly
  on the same source. The old 22 remain exactly **17/22**; new twelve **10/12**.
  Cancelled mobile list/menu **5.2758%/5.1425%** join five existing failures;
  no new production source changed. Real menus inspected; initial hidden-menu
  captures and subsequent mixed-SHA results rejected. Post-settle hooks plus
  paused-clock paint/opacity/viewport checks preserve all assertions, masks and
  thresholds. Full MSW **52/52** (two new filter/F5 cases included), forced
  **22/22 / 828 units + 2 skips**; native browser/final phase acceptance open.
  See `../reports/TIP-V2-404-commission-states-checkpoint.md`.

- Prior `cbf9eaa`: terminal-row status-menu correction (UI-404-05) brings selected
  commissions to **1.2932%/2.4252%**, both PASS. Full fresh group **17/22**, all
  metadata on the same source; other twenty rows unchanged. Five raw image
  failures remain, no mask/waiver/seed change. Full **50/50 MSW**, **828 units +
  2 skips**, forced 22/22, depcheck and separate Admin MSW/native builds pass.
  Open-menu visual states/native browser/phase acceptance remain open. See
  `../reports/TIP-V2-404-status-menu-checkpoint.md`.

- Prior registration `4ab2b73`, UI `a853ba9`, readiness `2a589cb`: expanded
  list selection/empty coverage from 14 to **22** images, all current metadata
  verified on `2a589cb`. Baseline 14/22 improved to **16/22**; old subset stays
  11/14. Agent selection passes **1.1244%/1.9151%**, commissions selected desktop
  passes **1.4513%**, mobile **5.5311%** still fails (previously 5.1552%).
  New empty mobile failures **7.7236%/6.5047%**, plus old default-agent/policy
  failures: six images remain OPEN, no waiver. Empty baseline assertions protect
  against invalid selectors passing vacuously. First post-layout mixed-SHA
  attempt with four count-locator errors was rejected, not reused as new evidence.
  Forced gates 22/22, 804 units + 2 skips, depcheck/builds and 44/44 MSW pass.
  See `../reports/TIP-V2-404-list-states-checkpoint.md` and
  `V2-P4-ADMIN-STATE-INVENTORY.md`; full inventory/native acceptance still open.
  All earlier measurement entries below are historical.

- Latest API `986930c` / UI `e1cb2f7`: V2Q-179 monetary hint now comes from the
  server for the valid draft rate; no FE formula or stale-rate substitution.
  Native API/contract **55/55**, unit **804 + 2 skips**, forced gates **22/22**,
  depcheck, fresh Portal/Admin MSW and Admin native builds, **44/44 MSW** pass.
  Fresh raw group remains **11/14**: policy desktop **2.3953%** passes, mobile
  **16.5967%** fails and worsens from 13.7312%. Default agents still fail both
  sizes. Required terms and 62 agents retained; no mask/threshold change/waiver.
  Full state inventory and native browser/audits/P4 acceptance remain OPEN.
  See `../reports/TIP-V2-404-policy-preview-checkpoint.md`.

- Latest source `b58f863` + `822a9cb`: complete static policy copy and visible
  editable terms retained. Forced gates **22/22**, **773 units + 2 skips**,
  depcheck, Admin MSW/native builds and **44/44 MSW** pass. Raw parity **11/14**:
  policy desktop **2.3704%** passes, mobile **13.7312%** remains FAIL alongside
  default agents **24.1407%/27.6858%**. No mask or threshold relaxation.
  Server-owned draft monetary example is missing (V2Q-179); do not fabricate it
  in FE. Complete state inventory, native browser/audits and P4 acceptance still
  OPEN. See `../reports/TIP-V2-404-policy-checkpoint.md` and policy-layout evidence.
  Older measurements below are historical, not the latest acceptance results.

- Latest `3932bbf`: customer mobile 4.92% → **1.94%**, desktop **1.80%**;
  active tab/count and all pager controls retained at 360/390. Dates/header now
  match the prototype without changing payout receipts or API money. Seven unit
  cases added; forced gates 22/22, **765 + 2 skips**, MSW **42/42** pass.
  Fresh group **10/14**, four default-agent/policy failures remain. Native browser,
  audits and P4 acceptance remain OPEN. See customer-mobile checkpoint/evidence.

- Latest UI `10a3c71`, test `fc642f6`: bank/lifetime/period are consumed without
  frontend financial arithmetic; month/all survive F5. Final 758 unit + 2 skips,
  MSW 40/40 pass. First full 39/40 F5 failure remains archived; follow-up asserts
  committed q before/after reload, keeps every data assertion, six repeats pass.
- Fresh raw parity **9/14**: filtered HAOPC 1.09%/1.97% passes, but default agents
  worsen to 24.14%/27.69%; policy 5.37%/15.48%, customer mobile 4.92% remain FAIL.
  Keep 62 real automatic agents, required controls and five failing images.
  Native browser/audit and visual acceptance remain OPEN, no self-approved waiver.
  See `../reports/TIP-V2-404-agent-presentation-checkpoint.md`.

- Contract portion of V2Q-178 resolved by TIP-402B `79f7073`: bank/lifetime/
  period supplied by the protected list API and fake provider, old fields keep
  their meaning. Native integration 48/48, MSW 39/39, unit 748 passed + 2 skips.
  UI consumption/parity/native-browser/audit remain open; do not close UI-404-03
  merely because the new contract is available.

- `6ee0fc3`: Đại lý chuyển sang card trên mobile 360/390, kiểm đủ mọi cột trong
  viewport, chọn/bỏ chọn, đối soát/F5 và empty state. Full 39/39 MSW, 743 unit
  pass + 2 existing skips; parity vẫn 8/14. Default agents 16,58%/20,66%, filtered
  HAOPC 1,14%/6,99% — không tuyên bố mọi ảnh cải thiện. Bank/period fields API
  còn thiếu (V2Q-178), không fake, N+1 hoặc lọc bỏ đại lý tự động. UI-404-03 OPEN.

- Rà thêm năm trạng thái: editor cá nhân đã đổi từ modal về inline; badge tổng
  lịch sử sửa 13 → 14, không thay statistic 13 khách hiệu lực; trang chi tiết 8
  dòng, receipt hai dòng giữ bank/amount/date do API trả. Đây sửa sai UI cũ,
  không phải thay đổi nghiệp vụ để khớp ảnh. Customer desktop 1,82%, mobile
  4,92% ở lượt dirty-source gần nhất; mặc định/edit đạt. Agent/policy vẫn còn
  gap, chưa tự duyệt deviation. Chi tiết và log ở
  `../reports/TIP-V2-404-states-checkpoint.md`. Mục này tiếp tục OPEN.
- Source UI `5894b5b`, test follow-up `5a4349c`: full MSW **37/37 pass** sau khi
  trace phát hiện test bấm input radio ẩn của AntD. Test bấm label hiển thị,
  không force và giữ mọi assertion. Parity committed-source **8/14**, sáu
  ảnh còn fail; không dùng test hành vi pass để đóng gap hình ảnh/native.

- **Mới nhất, source `94b60c0`:** D-84 desktop/mobile **1,4234% / 1,1162%**,
  D-85 **0,7973% / 1,7664%**. Bốn ảnh mặc định đã đạt trên đúng commit, không
  đổi threshold/mask; wrapper checkbox AntD cao 22px thay vì 16px là nguyên
  nhân hàng mobile dư 3px. Tên/count tab lấy API, size control vẫn giữ nguyên.
  725 unit + 2 existing skipped, MSW 36/36, native integration 44/44 và cả hai
  native build pass. **Vẫn OPEN cho phạm vi còn lại**: parity các tab/dialog và
  browser native chưa đủ; không suy rộng bốn ảnh thành mọi trạng thái Affiliate.
  Xem `../reports/TIP-V2-404-parity-checkpoint.md` và evidence/geometry/.
- Lịch sử `4ea72de`: D-84 desktop **3,4931%**, mobile **4,1351%**;
  D-85 desktop **1,3799%**, mobile **4,2046%**. Vẫn chỉ **1/4 pass**. Wrapper
  search trước đó tràn tới x=395,203 dù inner input/root có vẻ vừa viewport;
  giới hạn toolbar theo card đã đưa ảnh mobile về đúng 390px và giảm diff từ
  5,3564%. Test nay kiểm outer compact wrapper, không chỉ input bị shell clip.
  Forced gates 720 unit + 2 existing skipped và MSW 36/36 pass không thay parity.
  Các số checkpoint cũ dưới đây chỉ là lịch sử; tab/dialog/native còn phải kiểm.
- Checkpoint `9d3e34f`/`6437a46` bổ sung policy hint thực, caption/count lấy API
  và chỉnh mobile. Forced 672 unit + 2 existing skipped, MSW 16/16 pass. Finding
  vẫn **OPEN**: lượt parity trước commit chỉ D-85 desktop đạt; native và các
  tab/dialog còn thiếu. Xem progress/evidence admin-summary cho lượt chốt SHA;
  các số `c7cb493` bên dưới là lịch sử, không phải số đo source mới.
- Bật lại D-84/D-85 phát hiện mobile bảng không thành thẻ, chi tiết stat xếp
  một cột/card rời khác prototype; D-84 mobile raw diff ban đầu 52.38%.
- Source `c7cb493` sửa card/toolbar/column/menu/mobile commission cards và detail
  responsive, giữ trường tiền/trạng thái/permission. 7 unit mới + full 660 unit,
  MSW behavior 16/16 và hai build pass, nhưng không dùng chúng thay parity.
- Đo lại đúng source sau commit: D-84 desktop **4.230858%**, mobile **4.582076%**;
  D-85 desktop **1.466281%**, mobile **6.956654%**. Chỉ D-85 desktop đạt ≤3%.
- **OPEN:** còn 3 raw screen fail, caption/copy/header và tab/dialog chưa đủ.
  Không mask, không nâng threshold, không đánh dấu skip hoặc waiver tự duyệt.
  Xem `../reports/evidence/v2-404/admin-layout/` và report parity/results.

### UI-404-04 · S3 · FIXED (source/unit) · Policy server errors were toast-only

- Standard `frontend/data-state.md` requires API 400 `fields` to appear at their
  corresponding form controls. Policy form mapped client zod errors only; the
  mutation's global handler displayed a toast without setting server field errors.
- Reproduced before the fix: three new cases failed while the previous eight
  passed. Source `7c36279` uses the existing `fieldsOf` helper, applies only the
  three registered policy keys, preserves the draft and retains the global toast.
- After the fix all **11/11** policy unit cases pass. Each of rate/cookie/terms
  shows its first server error via `aria-invalid` and associated help, ignores
  duplicate/unknown fields, retains all draft values and retries successfully.
- No API contract/ledger change. These are simulated API failures in component
  tests, not proof of native backend validation or a browser 400 acceptance run.
  Native/browser audit remains part of the open TIP-404 acceptance scope.

### UI-404-02 · S3 · Thiếu điều khiển đổi cỡ trang Affiliate Admin

- E2E tìm `Số dòng mỗi trang` timeout; source AdminTable mặc định
  `showSizeChanger=false` trong khi màn Affiliate chưa có pager riêng.
  URL/model/API nhận size nhưng người dùng không đổi được bằng UI.
- Sửa source `034bd00`: pager feature riêng tái sử dụng packages/ui/Pagination
  cho cả bốn bảng; tắt pager AntD cũ, reset page 1 khi đổi size, hỗ trợ read-only.
- Ba unit pass; browser pagination sang trang 2, đổi size 20, reset trang 1 và
  F5 giữ size pass trong MSW regression 16/16. Native build pass.
- **FIXED trên source/MSW; native browser và parity còn chờ nghiệm thu.**
  Không dùng finding này để tuyên bố toàn REQ-312/TIP-404/P4 đã hoàn thành.
  Evidence: `../reports/evidence/v2-404/admin-operations/`.

### MSW-404-01 · CLOSED · Admin F5 luôn về đăng nhập

- E2E `admin-affiliate.spec.ts` xác nhận URL/search trước reload nhưng sau F5
  rơi về login. Chỉ là gap của backend/gate MSW; không tuyên bố native refresh lỗi.
- Source trước sửa: `/admin/auth/refresh` trả 401 cố định; AuthGate/SetupGate
  khởi tạo `tried=true` khi MSW nên không thử khôi phục phiên.
- Sửa `7c12a6f`: fake session cookie chỉ chứa account id, grant đọc mới từ backend,
  logout clear, account unknown/locked không khôi phục. Hai gate refresh đồng nhất
  native/MSW. Không lưu access/refresh credential thực hoặc permission vào cookie.
- Bằng chứng: 3 unit fake session + 4 unit gate; E2E F5 vẫn giữ assertion search/
  ba kết quả AF0 và dòng theo cặp khách/đại lý, pass trong MSW suite 25/25.
  Xem `../reports/evidence/v2-404/msw-checkpoint/`. Chưa dùng để chốt toàn TIP-404.

- Clipboard E2E tìm nút theo nhãn tiếng Việt đã phát hiện icon AntD thêm `copy`
  vào accessible name. Thêm nhãn hành động và đánh dấu icon trang trí; unit giữ
  truy vấn tên chính xác (regex neo hai đầu), không nới assertion theo target.
- Mock webhook trước đây dùng mốc seed cho `paidAt`, có thể trước lúc khách đăng
  ký. Webhook nay truyền thời điểm thực; unit kiểm qua ranh giới tháng Việt Nam
  và gia hạn nối tiếp. Không thay timestamp seed tĩnh của các fixture khác.
- Dataset paused là tiền điều kiện riêng: kỳ phí một năm kết thúc 19/10/2026,
  bao phủ mọi khoản cũ của HAOPC. Native integration xác nhận quan hệ/ngày; không
  sửa luật chuyển trạng thái sản phẩm hoặc thêm endpoint dev để bỏ qua guard.
