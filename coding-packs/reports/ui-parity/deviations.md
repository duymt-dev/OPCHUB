# UI parity — lệch có chủ đích

> **Baseline: prototype v4 Ant / SRS-3.6, ngày 20/10/2026** (TIP-V2-307). Ngưỡng 3%/ảnh.
> Mỗi dòng chờ PM duyệt. Lệch không ảnh hưởng % parity vẫn ghi để biết.
> Kết quả đo: `results.md` (MSW) và `server/results.md` (stack server, seed:demo).

## TIP-V2-558 P4 Affiliate debt remeasure — 2026-10-22, PENDING owner review

Source `fb79c54c`, native (API 4020 / Admin 3282, opchub_dev) and MSW lanes, same
3% / pixelmatch 0.1, no mask: **29/34 pass in both lanes** (was 27/34 on f394dc5).
Raw per-state numbers: `../evidence/v2-558/final-parity-both-lanes.json`.
TD-P4-UI-06/07 (cancelled 390) and TD-P4-UI-08 (six selected-paint checks) now pass.
The five rows below remain FAIL; each is a pending deviation for owner decision,
not a pixel PASS and not self-approved.

| Pending item | State · viewport | f394dc5 → native / MSW | Why it stays above 3% |
|---|---|---|---|
| DV-P4-558-1 (extends DV-P4-404-1) | D-84-AFF 1440 / 390 | 24.14 → 24.21 / 24.19%; 27.69 → 27.69 / 27.69% | 62 real automatic agents (AF-R01) versus six prototype rows with different names, codes, bank lines and month status. Table now fits its card (no 9px overflow, no clipped status/action). Matching would require fake data or deleting agents, both forbidden. |
| DV-P4-558-2 (extends DV-P4-404-2) | D-84-POL 390 | 16.60 → 13.70 / 13.70% | Label/hint/field rhythm restored over AntD. About 9.6 points are the SRS-required editable terms textarea and Save placed below where the prototype ends (rows 1300–1450 of 1451px). Hiding terms is forbidden. |
| DV-P4-558-3 (extends DV-P4-404-5) | D-84-COM-EMPTY 390 | 7.72 → 3.40 / 3.40% | Guidance is now one compact line and the header white. Residual is the prototype's broken header labels spilling outside the card (its rows 1100–1180) which DV-P4-404-5 forbids recreating. |
| DV-P4-558-4 (extends DV-P4-404-5) | D-84-AFF-EMPTY 390 | 6.50 → 3.62 / 3.62% | Same as DV-P4-558-3 for the agents list. |

## P4 user-approved deferral - 2026-10-21

The user explicitly accepts remaining cosmetic UI differences as technical debt.
[Debt register](../../audit/V2-P4-UI-TECH-DEBT.md) records all seven measured
failures and the DV-P4-404-1..5 rationale. These differences no longer block P4
on pixel matching alone. Raw threshold/results remain unchanged (27/34 PASS,
seven FAIL); this is not pixel PASS or a functional/native/UAT waiver. Pending
approval language in the historical measurement below predates this decision.

## Ver2 (TIP-V2-307)

### P4 update — measured on `f394dc5`, approval still pending

Legacy DV-V2-307-12 no longer means P-97/98, A-31/32 or D-84/85 are unreachable:
they are enabled in P4. Additional Admin states are measured independently.
No pending item below is an accepted waiver or a reason to skip a screenshot.

| Pending item | Prototype / requirement conflict | Current evidence / remaining action |
|---|---|---|
| DV-P4-404-1 | Six prototype agents versus every real paid member becoming an agent (AF-R01) | Actual 62 agents retained, ten on the default page; default raw parity 24.14%/27.69% fails. HAOPC search is separately measured 1.09%/1.97%, not substituted for default acceptance. No seed/ledger filtering to fake six agents. |
| DV-P4-404-2 | Prototype policy uses static copy; SRS/TIP-404 requires editable terms | Full rule copy and visible editable terms before Save retained. V2Q-179 caption is now served by API 986930c and displayed by UI e1cb2f7; no frontend money formula. Desktop 2.40% passes; mobile 16.60% fails, worse than 13.73%, not an accepted waiver. No hidden terms or mask. |
| DV-P4-404-3 | Prototype omits some all-page CSV/page-size controls required by the task | Controls retained. Agent filtered mobile 1.97%, customer mobile 1.94% now pass without hiding a control. No pixel waiver is needed for these measured states; this does not waive other failures. |
| DV-P4-404-4 | Prototype selected-agent markup exposes CSV/clear; bulk-rate and cancellation reason dialogs are required by SRS/TIP | Keep required operations/confirmation. Unused prototype aRate/aApply model fields do not prove an inline input exists. Selected HAOPC now measures 1.12%/1.92% without hiding the app's rate action; dialog/pending/error evidence remains open. No invented prototype dialog or approved waiver. |
| DV-P4-404-5 | Prototype empty mobile tables leave header labels outside their card; app includes an explicit empty message | New states measured 7.72% commissions / 6.50% agents at 390, both FAIL. Do not remove empty guidance merely to match broken prototype layout. Pending review, not accepted pixel exceptions. |

Expanded Affiliate group: **27/34** images pass; previous 22-image subset remains
**17/22** and original seven-state subset **11/14**. The twelve added filter/menu
images are **10/12**; cancelled mobile list/menu fail **5.2758%/4.7331%**, so seven
raw failures remain, not seven newly introduced product regressions. Popup layout
now uses a 180px popup, dots and a readable disabled current marker. Remaining
placement/full-frame differences still need work; retained pager/terminal-safety
differences are not automatic
waivers. Hidden/opacity-zero initial menu captures were rejected and all 34 rows
rerun on the same source with actual menu paint checks. See
`../TIP-V2-404-popup-layout-checkpoint.md`. Two desktop menus slightly regress
within threshold; not every image improves. Same seven failures, no waiver.

The ordinary selected-commissions mobile gap is
fixed: restoring the real paid/cancelled inspection trigger changes its raw diff
**5.5311% → 2.4252%** (desktop **1.2932%**). No invisible padding/waiver or domain
change; terminal writes/direct payout remain disabled. Other twenty images were
unchanged in that earlier correction, not necessarily in the latest popup run.
See `../TIP-V2-404-status-menu-checkpoint.md` and the open inventory.

Historical Ver2 entries follow; current results are in `results.md`.

| # | Màn | Prototype | App mới | Lý do |
|---|---|---|---|---|
| DV-V2-307-1 | A-01 → A-05 (cả Admin) | Ver2 bỏ hộp "Tài khoản dùng thử" | Mặc định ẩn; chỉ hiện khi `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=on` (dev). A-05 → unreachable | V2Q-163; bỏ cờ khỏi stack e2e server |
| DV-V2-307-2 | A-12 → A-20, P-23, P-24 | Ô đồng ý: "Tôi đồng ý Điều khoản …"; form có ô "Mã giới thiệu (không bắt buộc)" | Ô đồng ý giữ bổ sung "(phí thành viên không hoàn lại …)" theo SRS; TIP-V2-403 đã thêm ô Mã giới thiệu cho cá nhân/DN/SSO | NR-R01/R02 (V2Q-136). Số đo trước TIP-403 là lịch sử, không dùng làm kết quả hiện tại; xem evidence/v2-403 và kết quả parity mới |
| DV-V2-307-3 | Shell Admin | Khối "Sự kiện sắp tới" ở sidebar luôn hiện | Chỉ hiện khi vai trò có `events.view` | RB-R06 (ẩn dữ liệu ngoài quyền); Super Admin thấy như prototype |
| DV-V2-307-4 | D-01 → D-05 | Biểu đồ tăng trưởng + đường nhỏ ở thẻ số do bộ mô phỏng vẽ | Số thật từ `GET /admin/overview` (TIP-V2-305) | Mask cột biểu đồ (`[data-m="bars"]`) + `polyline`; phần còn lại là chữ số thật (≈3,1–3,6%) |
| DV-V2-307-5 | D-07 → D-14 (390) | Danh sách thành viên theo thứ tự mảng mẫu | MSW sắp như server (`created_at DESC`) | Như DV-B63-2; 3,1–4,7% ở 390 |
| DV-V2-307-6 | D-42 → D-45, D-50, D-87 (390) | Khối "Sắp diễn ra" (ảnh + nền tối) và "Tiếp theo" không xếp chồng ở 390 → chữ bị bóp còn 1–2 ký tự mỗi dòng | Xếp chồng 1 cột ở ≤ 767px (ảnh trên, nội dung dưới, "Tiếp theo" bên dưới) | Lỗi responsive của prototype; không tái hiện bố cục vỡ. 1440 đạt |
| DV-V2-307-7 | D-44 | Bấm nhãn "Đã đầy" trên thẻ mở drawer Chi tiết sự kiện | Nhãn chỉ là trạng thái; drawer mở qua "Danh sách" (kịch bản phía app bấm "Danh sách" của Demo Day) | Nhãn trạng thái không phải nút (antd-ui) |
| DV-V2-307-8 | P-62 → P-72 | Khối "Vấn đề / Giải pháp / Thị trường" và "Hình ảnh sản phẩm" (3 ảnh) dựng cố định cho mọi dự án | Chỉ hiện khi dự án có dữ liệu (`highlights`, `gallery`); SoloBooks không có → ẩn | BUG-038 (không hiện nội dung bịa); cộng DV-V2-109-1 (dải liên hệ không Địa chỉ). 1440 3,2–6,8% · 390 9–37% (trang ngắn hơn) |
| DV-V2-307-9 | P-79 | Popup không có dòng hạn thành viên | TV đã đóng phí thấy "✓ Thành viên đến dd/mm/yyyy · đăng ký tiếp sẽ gia hạn 12 tháng" → hộp cao hơn, `fit` thu nhỏ 0,91 thay vì 1 | REQ-391 (e2e `services.spec`); thông tin hạn cần cho người gia hạn sớm |
| DV-V2-307-10 | D-81, D-82 | Xem thử: menu chỉ có quyền Xem (Tổng quan) không hiện dải "chỉ xem"; dải chỉ xem đứng **trước** dải xem thử, cách 20px | Như prototype (TIP-V2-307 sửa `menuAccess` + thứ tự/khoảng cách dải). Đo D-81 ≤ 3%, D-82 ≤ 3% | V2Q-164 — đã khớp; ghi để biết thay đổi hành vi |
| DV-V2-307-11 | D-83 | Đổi mật khẩu lần đầu là modal trên màn đăng nhập (nền form đăng nhập mờ) | Route `/first-password` (DV-V2-204-2): form đứng riêng ở cột phải, không còn form đăng nhập phía sau → 91,4% | SEC-R01 — phiên hạn chế chỉ gọi route thiết lập; email TK tạm được mask |
| DV-V2-307-12 | P-88 → P-98, D-84, D-85, A-31, A-32 | Affiliate (§20) | Chưa dựng — unreachable, bật lại ở TIP-V2-503 | Pha 4 (D-51: Affiliate thuộc go-live) |
| DV-V2-307-13 | P-52, P-96, D-59, D-88 | Link Google Meet sinh tại chỗ | Link Meet lấy từ API sự kiện (D-59), chỉ hiện cho người đã đăng ký; tạo bằng "Tạo link Meet" (fake adapter ở dev) | D-59, dịch vụ ngoài qua adapter (luật 11) |
| DV-V2-307-14 | D-29, P-74 (390) | Bấm "Tạo nhóm" / "Gửi đăng dự án" khi trống: chỉ toast | Toast + đánh dấu đỏ tại từng ô thiếu (form dài thêm) | BUG-022 (lỗi tại ô); D-29 @390 4,0%, P-74 @390 3,8% |
| DV-V2-307-15 | P-46 | Popup tham gia nhóm không có ô đồng ý | Thêm ô "Tôi đồng ý tuân thủ nội quy … phí … không hoàn lại" bắt buộc | NR-R02 (V2Q-136); 1440 3,6% · 390 11,4% |
| DV-V2-307-16 | P-80 → P-83 (390) | Form tư vấn / đã gửi: chữ dài xuống dòng khác do font render | Popup full-screen như prototype (TIP-V2-307 sửa `.narrow` ≤ 767px); còn 3,0–3,8% do xuống dòng | Trước sửa: P-83 @390 51,9% |
| DV-V2-307-17 | P-01 → P-04, P-13, P-15, P-80 → P-82 @1440 (chế độ server) | Dashboard số mô phỏng (312 online, 4.218 thành viên, 34 tỉnh, tin/thảo luận mẫu) | Số thật từ DB seed:demo (TIP-V2-305, BUG-029): 9 thành viên, 4 quốc gia, tin theo giờ thật → 31–48% (các màn có Dashboard làm nền) | MSW giữ số mẫu nên đạt; server không giả số (ui-parity: giả lập chỉ ở MSW) |
| DV-V2-307-18 | P-03, P-06 (chế độ server) | "Xem thêm N tỉnh/thành", "Thảo luận mới trong cộng đồng" | Không hiện: seed:demo chỉ có 6 thành viên VN ở ít tỉnh; thảo luận chỉ lấy tin gốc có trả lời trong 24h theo giờ server, seed tin cố định 16/10 → khối ẩn → kịch bản không tới được | Dữ liệu seed theo ngày cố định; MSW đạt (P-03 0,3%, P-06 0,9%). Đề xuất seed tương đối theo `now()` ở TIP sau (V2Q-166) |
| DV-V2-307-19 | D-21, D-41, D-46 @390, D-75, D-82 @390 (chế độ server) | Thứ tự / dữ liệu mẫu | Như DV-B63-3/4/5/6 và DV-B63-2 (sắp theo index, audit chỉ INSERT) | Kế thừa; D-82 @390 3,0% |

## Kế thừa — còn hiệu lực

| # | Màn | Prototype | App mới | Lý do |
|---|---|---|---|---|
| DV-01 | A-01 | Đăng nhập admin và user trên cùng một màn, cùng một trang | Hai app tách origin (`portal` :3000, `admin` :3001); mỗi app có `/login` riêng, tài khoản sai cổng báo "Tài khoản này đăng nhập ở cổng khác" | AGENTS.md + routing-auth.md: Portal và Admin là hai app; giao diện màn đăng nhập giữ nguyên |
| DV-02 | A-01 | Ô nhập là `<input>` tự vẽ | `antd` `Input` với prefix/suffix, override chiều cao 40, padding 0 12, khoảng cách icon 10 | ui-parity.md: dùng Ant Design thật, chỉnh token |
| DV-03 | A-01 | Ô "Ghi nhớ đăng nhập" là checkbox gốc của trình duyệt (`accent-color`) | `antd` `Checkbox` (ô vuông bo 3px, màu primary) | Như DV-02; lệch vài pixel, trong ngưỡng |
| DV-04 | A-01 | Placeholder màu mặc định của Chromium | Token `colorTextPlaceholder = #757575` cho khớp | Giữ giống prototype thay vì màu placeholder mặc định của antd |
| DV-08 | A-08, A-09 | Bấm SSO: toast "Đang chuyển hướng…", 0,9 giây sau đặt `screen=portal` rồi bị guard đẩy về login | Toast giống prototype; 0,9 giây sau chuyển tới provider (MSW: `/sso/callback`). Email mới → form "Hoàn tất đăng ký" (loại TK, SĐT, nhóm), bỏ OTP, vào `/community` | D-45. Ảnh parity chụp lúc toast đang hiện nên không ảnh hưởng % (A-08 0,11/0,35%, A-09 0,11/0,35%) |
| DV-09 | A-24 | Kích hoạt OTP xong quay về màn đăng nhập; mail chào mừng gửi mật khẩu tạm | Xác thực OTP trả phiên đăng nhập, vào thẳng `/community`; không gửi mật khẩu tạm | D-30. Không so ảnh được (khác màn đích) — kiểm bằng `e2e/behavior/auth-flows.spec.ts` |
| DV-10 | A-11 | Lối vào: admin tắt "Cho phép tự đăng ký" rồi đăng xuất, cùng một trang | Portal đọc `GET /v1/public/settings`; tắt → toast "Đăng ký mới đang tạm đóng", không sang `/register` | D-26 (hai app tách) nên prototype không có đường tái hiện ở app mới; kiểm bằng test hành vi (cookie mock `opchub-mock-reg-closed`) |
| DV-11 | A-30 | Panel SSO admin không có lối vào nên không tắt được SSO | Ẩn cả vạch "hoặc tiếp tục với" khi danh sách SSO rỗng | C-05; không chụp được trên prototype |
| DV-13 | A-03 | Không khóa đăng nhập | Lỗi `RATE_LIMITED` hiện nguyên thông báo thời gian chờ của server; `403` → "Tài khoản đã bị khóa, liên hệ hỗ trợ" | D-44; prototype không có trạng thái này nên không có ảnh gốc |
| DV-14 | A-07 | Đổi ngôn ngữ chỉ đổi state trong trang | Cookie `NEXT_LOCALE` + `router.refresh()`; giữ qua tải lại. Ngoài tiếng Việt chỉ dịch các chuỗi mà prototype đã dịch (D-06) | A-07 đạt 0,11/0,35% |
| DV-15 | A-01 (Admin) | Tab "Đăng ký" và nút SSO dùng chung với user | Admin: "Đăng ký" báo đăng ký ở cổng thành viên; SSO báo admin đăng nhập bằng email + mật khẩu; có `/forgot-password` riêng | D-26; giao diện giữ nguyên |
| DV-G2b-1 | P-25 | Yêu cầu vào nhóm cần duyệt tự được duyệt sau 8 giây (setTimeout trong trang) kèm thông báo | Chờ chủ nhóm duyệt thật qua `POST /groups/:id/requests/:uid/approve` (D-43); MSW chưa tự duyệt | ui-parity.md: giả lập đặt trong MSW, không trong component. Ảnh P-25 chụp ngay sau khi gửi nên không ảnh hưởng (0,33/0,43%) |
| DV-G2b-2 | P-17 | Chip/lọc là `div`/`span` có onClick; popup tham gia đóng bằng bấm nền | Dùng `button` (role radio / aria-pressed); popup có `role=dialog`, Esc đóng | Truy cập bằng bàn phím (antd-ui.md); giao diện giữ nguyên |
| DV-G2b-3 | P-17 | "Vào phòng chat" đổi tab sang Chat nhóm của nhóm đó | Điều hướng `/chat/<groupId>` (màn Chat do làn khác dựng) | Route theo screens.md P-28 |
| DV-G2c-1 | P-34 | Gửi tin cập nhật state tại chỗ; persona mô phỏng tự trả lời sau 3,5 giây | Tin đi qua lớp transport (REST + MSW nay, Socket.IO sau), idempotent theo `clientMsgId` (S-12). Chưa giả lập persona tự trả lời | Bot mô phỏng là việc của worker (S-11), không đặt trong component. Ảnh chụp trước 3,5 giây nên không ảnh hưởng % (P-34 0,97/2,74%) |
| DV-G2c-3 | P-36, P-38 | Mọi thành viên ghim / bỏ ghim được | "Ghim"/"Bỏ ghim" chỉ hiện với chủ nhóm của nhóm đó; mock trả 403 cho người khác | D-43. TK demo là chủ nhóm c1, c6 nên ảnh vẫn khớp; ở c2 nút ghim ẩn (prototype hiện) |
| DV-G2c-4 | P-46 | Bấm "Gửi yêu cầu tham gia" (nhóm cần duyệt) chuyển sang tab Cộng đồng, mở form | Sang `/community?join=<id>` để màn Cộng đồng (G2b) mở form giới thiệu | Không tự làm lại form tham gia trong chat; cần G2b đọc `?join=` (xem Q-G2c-2) |
| DV-G2c-5 | P-40 | Bảng thông tin mở sẵn khi rộng ≥ 1280px (state trong bộ nhớ) | Như prototype, cộng trạng thái trên URL `?panel=members|files|pins|none` | data-state.md: tab/bảng ghi vào URL |
| DV-G2a-1 | P-05 | Mail chào mừng có khối "Mật khẩu tạm OPC-XXXX" + "Vui lòng đổi mật khẩu…"; modal hiện sau khi đăng nhập lại | Bỏ khối mật khẩu tạm, chỉ còn "URL đăng nhập" + "Tên đăng nhập". Modal hiện ngay khi vào app sau OTP (đã có phiên), một lần (`GET /me/welcome-mail`, 204 khi đã xem) | D-30. Đo 3,50% (1440) / 4,29% (390) sau khi đưa nền về đầu trang (trước đó 6,16% / 4,34% do prototype giữ vị trí cuộn của form đăng ký); phần còn lại là nội dung mail dịch lên 60px + người dùng nền khác (tài khoản mới thay vì An) — đều do D-30 (390): khối mật khẩu bỏ đi làm nội dung dồn lên, và topbar/sidebar là TK mới ("Thành viên mới") thay vì TK An mà prototype đăng nhập lại |
| DV-G2a-2 | P-05 (kịch bản) | Đăng ký → OTP → về đăng nhập → đăng nhập An → modal trên Dashboard | Bên app: OTP → `/community` (D-30) → bấm "Dashboard" để cùng nền ảnh | Chỉ đổi chuỗi thao tác phía app trong `e2e/parity/scenarios/portal-shell.ts` |
| DV-G2a-3 | P-01 → P-04 | Bộ mô phỏng 3 giây/lần đổi trạng thái, số liệu, "vừa nhắn" | Ảnh chụp tĩnh từ `GET /dashboard/live` (MSW); đồng hồ + "Làm mới sau N s" chạy nhịp 3 giây; realtime qua socket khi có backend | Như DV-05 (ui-parity: mô phỏng chỉ ở MSW). P-01…P-04 đạt ≤ 2,15% |
| DV-G2a-4 | Shell | Nút ngôn ngữ, chuông, menu người dùng, chip lọc LIVE, thẻ thành viên là `div` có onClick | `button` (aria-expanded / role menu, dialog, radio / aria-pressed); popover tự vẽ, Esc + bấm ngoài để đóng | Truy cập bàn phím; không dùng motion antd (đồng hồ parity dừng) |
| DV-G3a-2 | P-86 | "Tôi đã chuyển khoản" → setTimeout 2,2 s trong trang tự kích hoạt | `POST /me/membership/transfer-confirm` (202, chờ webhook); MSW giả lập webhook về sau 2,2 s; FE hỏi lại `GET /me/membership` mỗi giây tới khi hạn mới về (sau thay bằng socket `membership.updated`) | D-31. Ảnh chụp lúc đang đối soát: 0,21 / 0,06% |
| DV-G3a-3 | P-87, P-88 | Không tái hiện được (TK m1 luôn đã đóng phí; `payBanner:false` gán cứng) | Dựng theo D-28/BR-03: TK `do.haiyen@opchub.vn` thấy popup không đóng được (Esc / nền → toast nhắc), vẫn Tư vấn và Đăng xuất; banner hiện khi hộp chuyển khoản không che. Kiểm bằng `e2e/behavior/membership.spec.ts` | C-01, D-28 |
| DV-G3a-4 | P-79 → P-86 | Popup không có URL (state) | Mỗi bước có đường dẫn: `/services`, `/services/:svc/request`, `/services/requests/:code`, `/membership/pay` (screens.md); mở từ sidebar thì đè lên màn đang xem, đóng thì về lại; vào thẳng URL thì nền là Dashboard | screens.md; ảnh không đổi |
| DV-G3a-5 | P-49 → P-54 | Thẻ, chip lọc là `div` có onClick; modal chi tiết không có URL | `button` (role radio cho chip, aria-disabled cho "Hết chỗ"); chi tiết ở `/events/:id` (D-39), Esc đóng | Truy cập bàn phím; ảnh không đổi (P-52 0,16 / 0,26%) |
| DV-G3a-6 | P-05 (khung app) | — | TK mới "Chờ thanh toán" (D-30): mail chào mừng hiện trước, đóng mail thì popup bắt buộc hiện; `e2e/behavior/portal-shell.spec.ts` bấm "Dashboard" bằng sự kiện DOM vì popup che | BR-03; P-05 giữ 3,50 / 4,29% (DV-G2a-1) |
| DV-G2a-5 | Shell | Mục nav Portal tên "Dashboard"; app trước đó ghi "Tổng quan" | `common.nav.dashboard` = "Dashboard" theo prototype; sửa 1 dòng `e2e/behavior/chat.spec.ts` bấm theo chữ mới | Copy chữ theo prototype |
| DV-G3c-1 | P-91 | Không có thông báo xác minh; MST / tên DN không khoá | Huy hiệu "✓ Đã xác minh" / "Chờ xác minh" cạnh nhãn MST (title giải thích); DN đã xác minh thì MST + tên DN chỉ đọc, server trả 403 nếu đổi | D-40. Đổi từ khối thông báo sang huy hiệu để không đẩy form (8,59% → 0.76% / 1.78% ở 1440/390, đạt) |
| DV-G3c-2 | P-89 → P-94 | Đổi ảnh đại diện tạo `blob:` URL tại chỗ; lưu hồ sơ, đổi mật khẩu, SSO, đăng xuất thiết bị khác chỉ đổi state + toast | Ảnh qua `UploadImage` → `POST /uploads/presign` + PUT (MSW giả MinIO) → `PATCH /me { avatarUrl }`; các thao tác khác gọi API (Q-G3c-1). Tên/ảnh mới đồng bộ lên khung app | security.md (upload presigned), ui-parity: giả lập ở MSW. Giao diện giữ nguyên |
| DV-G3c-3 | P-89 | Thẻ thống kê, tab, nút "Liên kết"… là `div` có onClick | `button` (tab dùng `Tabs` của packages/ui: role tab, phím mũi tên); tab ghi lên URL `?tab=info|business|activity|security` | Truy cập bàn phím + data-state.md. Giao diện giữ nguyên |
| DV-G3b-1 | P-55 → P-78 | Dự án OPC là một tab, chi tiết mở trong trang (state `projSel`) | `/projects` (Khám phá), `/projects/mine` (Dự án của tôi), `/projects/:id` (chi tiết, D-39); tab chi tiết + sắp xếp/lọc góp ý ghi lên URL `?tab=&csort=&ctype=` | D-39 + data-state.md. Mở chi tiết từ cuối danh sách: prototype giữ vị trí cuộn, app về đầu trang → kịch bản gọi `resetScroll` sau khi mở chi tiết |
| DV-G3b-2 | P-55 → P-58 | Lọc/sắp xếp/tìm trên danh sách trong bộ nhớ | `GET /projects?q&cat&stage&sort&size=100` rồi phân trang tại chỗ (9/trang) như Q-G2b-1; trạng thái lọc trên URL | Số dự án công khai nhỏ; khi lớn chuyển sang phân trang server (keyset) |
| DV-G3b-3 | P-73 → P-77 | Ảnh bìa / ảnh đội ngũ đọc thành data URL trong state | Giữ data URL gửi kèm `coverUrl`/`avatarUrl` (≤ 5 MB, PNG/JPG) | `POST /uploads/presign` (G3c) mới nhận `kind: avatar`; cần thêm `project-cover`, `team-avatar` (Q-G3b-6) rồi đổi sang presigned PUT như hồ sơ |
| DV-G3b-4 | P-73 → P-77 | "Lưu nháp" / "Gửi đăng dự án" đổi `status` trong state | Gửi `submit: false/true`; server tự chuyển `draft` / `pending_review` (luật 7), sửa dự án đang hiển thị cũng đưa về `pending_review` để duyệt lại (xem Q-G3b-7) | Máy trạng thái §8; FE không gửi `status` |
| DV-G3b-5 | P-70, P-71 | Quan tâm đầu tư thêm vào state | `POST /projects/:id/interest` kèm `Idempotency-Key` (mỗi lần mở modal một key); cùng key trả lại bản cũ, key khác cho người đã gửi → 409 | Hợp đồng MSW cũ (gửi lại cùng key → 409) đổi theo idempotency đúng nghĩa; `domain-handlers.spec.ts` sửa theo |
| DV-G3b-6 | P-62, P-66 | Ô soạn RichEd tự viết; nút "Liên kết" dùng `prompt()` | `RichTextField` mới ở `packages/ui` (Tiptap, cùng thanh công cụ); nội dung hiển thị lại qua `SafeHtml`. "Liên kết" vẫn dùng `prompt()` như prototype | `RichEditor` có sẵn dùng antd và thanh công cụ khác; RichTextField dựng ngay (không `next/dynamic`) để thanh công cụ có ở ảnh chụp |
| DV-G4a-2 | D-11, D-14 | "Khóa tài khoản" (thanh hàng loạt / menu ⋯) khoá ngay + toast | Hộp xác nhận "Khóa tài khoản?" ("{tên} / N tài khoản sẽ không đăng nhập được…", nút "Khóa" đỏ / "Hủy") rồi mới gọi API (`POST /admin/users/status` hoặc `PATCH /admin/users/:id/status`, BE ghi audit) + toast; "Hủy" giữ nguyên lựa chọn. "Mở khóa" vẫn làm ngay. Kịch bản parity bấm "Khóa" trong hộp ở phía app: D-11 0,06 / 0,08%, D-14 0,06 / 0,08% (D-10 0,06 / 0,08%, D-13 0,05 / 0,01% không đổi) | D-32 + luật 10 (thao tác admin phá huỷ: xác nhận + audit). Q-G4a-4 đã chốt |
| DV-G4a-3 | D-16 | "Từ chối" trong "Hồ sơ đăng ký" khoá tài khoản ngay, không hỏi | Hộp xác nhận "Từ chối hồ sơ doanh nghiệp?"; từ chối chỉ bỏ huy hiệu (xác minh → "rejected"), **không** khoá TK; gọi `POST /admin/users/:id/verification` | D-40 (chưa xác minh vẫn dùng bình thường) + D-32. Prototype không có hồ sơ chờ xác minh nên không ảnh hưởng ảnh |
| DV-G4a-4 | D-07 → D-17 | Không có hồ sơ "Chờ xác minh" nào (Rina Sari "Hoạt động") | Seed MSW: m7 Rina Sari (MST Indonesia, không tra được qua adapter MST VN) ở "Chờ xác minh" → nhãn vàng ở dòng m7 + drawer có "Từ chối" / "Xác minh doanh nghiệp" | D-40; cần để có luồng duyệt tay. Chỉ khác nhãn trạng thái một dòng (D-07 0,06%, mọi dòng ≤ 0,41%) |
| DV-G4a-5 | D-07 → D-17 | Ô tick, chip loại, nút lưới/danh sách, ⋯, tên thành viên là `div` có onClick; menu ⋯ / modal / drawer chỉ đóng bằng bấm nền | `button` (role checkbox với `aria-checked="mixed"`, radio, menuitemradio, aria-pressed); Esc đóng menu / modal / drawer; lọc + tìm + dạng xem + trang + cỡ trang ghi lên URL `?view&type&q&page&size` | Truy cập bàn phím + data-state.md. Giao diện giữ nguyên |
| DV-G4a-6 | D-13, D-14 (kịch bản) | — | `rowMenu` trong `e2e/parity/scenarios/admin-members.ts`: ở 390 chờ 400 ms (drawer điều hướng prototype đóng bằng transition 0,25 s chạy giờ thật) rồi cuộn nút ⋯ sát đáy (`block: 'end'`) ở cả hai bên trước khi bấm | Không chờ thì vị trí cuộn lệch ngẫu nhiên giữa hai bên (D-13 @390: 5,69% → 0,01%, ổn định 3/3 lần đo). Không đổi UI |
| DV-G4d-1 | D-36 → D-41 | Bot tương tác là một tab state (`simTab`), drawer persona/kịch bản là state | `/bots`, `/bots/personas`, `/bots/scripts`, `/bots/threads`; drawer ở `/bots/personas/new\|:id`, `/bots/scripts/new\|:id` (screens.md); đổi tab bằng history API, nút Back về đúng tab | data-state.md + screens.md. Ảnh không đổi (D-36 → D-41 ≤ 1,13%) |
| DV-G4d-2 | D-37, D-39 | "Xóa" persona / kịch bản xoá ngay + toast | Hộp xác nhận "Xóa persona?" / "Xóa kịch bản?" (Modal của packages/ui) rồi `DELETE /admin/personas/:id` / `/admin/scripts/:id`; MSW ghi audit (`persona.delete`, `script.delete`) | Luật 10 + data-state.md (xác nhận thao tác phá huỷ). Ảnh chụp trước khi bấm Xóa nên không ảnh hưởng |
| DV-G4d-3 | D-39, D-41 | "Chạy ngay": nếu tắt tự động và bật duyệt → chờ duyệt, ngược lại đăng thẳng vào nhóm; bộ mô phỏng 10 giây/lần tự đăng từng lượt + ghi nhật ký | "Chạy ngay" luôn tạo hội thoại **chờ duyệt** (`POST /admin/scripts/:id/run` → 202 `pending`); "Duyệt & đăng" mới đưa tin `is_simulated` vào phòng Chung các nhóm đích + ghi nhật ký. Chưa giả lập worker tự đăng (nhật ký trống "Đang khởi động…" như ảnh prototype) | D-04 (Claude + duyệt trước khi đăng). Worker là việc của BullMQ (S-11), không đặt trong component |
| DV-G4d-4 | D-36 → D-41 | Công tắc, chip nhóm, Sửa/Xóa, ↑ ↓ × là `div`/`span` có onClick; drawer đóng bằng bấm nền | `button role=switch` / `aria-pressed` / `title`+`aria-label`; drawer `role=dialog`, Esc đóng | Truy cập bàn phím (antd-ui.md); giao diện giữ nguyên |
| DV-G4d-5 | D-36 → D-41 | Bot luôn hiện | Sau cờ `NEXT_PUBLIC_FEATURE_BOTS` (trống = bật khi dùng MSW); tắt thì màn báo "chưa được bật" | D-05 (Bot sau feature flag). Mục nav vẫn hiện theo quyền `c.mod` (nav.ts làn khác sở hữu) |
| DV-G4d-6 | D-38 | Ảnh persona tạo `blob:` URL tại chỗ | Đọc thành data URL (PNG/JPG/WebP ≤ 5 MB) gửi kèm `avatarUrl` | Như DV-G3b-3; đổi sang `POST /uploads/presign` khi có loại `persona-avatar` (Q-G4d-2) |
| DV-G4b-1 | D-18 → D-22 | Lọc / tìm / phân trang trên mảng trong bộ nhớ; tab, ô tìm, trang là state | `GET /admin/fees?status&q&page&size` (phân trang server) + `GET /admin/fees/summary` cho thẻ thống kê và số trên tab; trạng thái ghi lên URL `?status=pending|active|soon|expired&q=&page=&size=` | data-state.md; ảnh không đổi (D-18 → D-22 ≤ 0,52%) |
| DV-G4b-2 | D-20, D-21 | Ghi nhận thu / gia hạn / nhắc / xuất CSV chỉ đổi state + toast; CSV dựng ở trình duyệt | Mọi thao tác gọi API (BE ghi `audit_logs`, luật 10): `POST /admin/fees/:uid/{collect|renew|remind}`, `POST /admin/fees/collect`, `/remind`, `/remind-all`, `/export` (server trả CSV, FE chỉ tải về). Số tiền trong toast lấy từ server (`feeAmount`, số nguyên VND) | Luật 9, 10; Q-G4b-1. Giao diện giữ nguyên |
| DV-G4b-3 | D-18 → D-22 | Ô tick, tab, nút là `div`/`span` có onClick | `button` (`role=checkbox` có `aria-checked`/`mixed`, tab `role=radio`), bảng có `role=table/row/cell`, ô tìm có `aria-label` | Truy cập bàn phím; ảnh không đổi |
| DV-G4b-4 | D-20 | Thanh chọn hàng loạt tự vẽ riêng cho màn Phí | Component riêng `FeeBulkBar` thay vì `BulkBar` của packages/ui (bố cục khác: chữ co giãn, nút liền sau, "Bỏ chọn" xám) | Giữ parity; `BulkBar` dùng cho Thành viên/Nhóm/Dự án |
| DV-G4c-1 | D-32 | "Xem chat" đặt `screen=portal`, guard trả về admin → màn không đổi (no-op) | Mở trình xem chat **chỉ đọc** trong admin `/groups/:id/chat` (danh sách phòng + lịch sử tin, không ô soạn), nút "← Quay lại Nhóm cộng đồng" | D-26 / C-03. Ảnh khác hẳn có chủ đích: 53,38% (1440) / 84,14% (390). Kiểm bằng `e2e/behavior/admin-groups.spec.ts` |
| DV-G4c-2 | D-23 → D-26, D-33 | Xóa nhóm (thẻ, bảng, bulk "Xóa nhóm") và "Ẩn & xóa" tin nhắn làm ngay + toast | Hộp xác nhận tự vẽ (`role=dialog`, "Xóa nhóm cộng đồng?" / "Ẩn & xóa tin nhắn?") rồi mới gọi API; API ghi `audit_logs` (MSW: `auditLog()`). "Cảnh cáo", "Khóa", "Bỏ qua" làm ngay như prototype | D-32 + luật 10. Ảnh parity không đổi (kịch bản không bấm xóa). "Khóa" có nên xác nhận → Q-G4c-3 |
| DV-G4c-3 | D-28, D-30 | Ảnh bìa nhóm đọc thành `blob:` URL trong state | Đọc thành data URL (≤ 5 MB, PNG/JPG/WebP) gửi kèm `coverUrl` | Như DV-G3b-3: chờ `UPLOAD_KINDS` có `group-cover` để dùng presigned PUT (Q-G4c-2) |
| DV-G4c-4 | D-23 → D-35 | Tab, kiểu xem, miền, tìm, sắp xếp, trang, lọc báo cáo trong state; nút/chip/ô tick là `div` | Ghi lên URL `/groups?tab=&view=&region=&q=&sort=&page=&size=&rep=` (data-state.md); drawer/modal không có URL (D-39). Nút là `button`, ô tick `role=checkbox`, chip miền `aria-pressed`, tab `role=tab` | Truy cập bàn phím; ảnh không đổi |
| DV-G4c-5 | D-28 | Chủ nhóm / điều phối viên chọn theo **tên** | Chọn theo `userId` (danh sách từ `GET /admin/users`) | Tên không duy nhất; ảnh không đổi |
| DV-G5c-1 | D-65 | Tab "Danh mục dịch vụ" hiện **14 dòng trống** (không số thứ tự, ô chỉ có placeholder, công tắc bật, "YC" không số) dù tab ghi "6" — lỗi gắn dữ liệu trong `sc-for` của prototype | 6 dòng thật từ `GET /admin/services` (tên, hình thức, mô tả, số thứ tự, "N YC"); bố cục / chữ / kích thước giữ đúng | Không tái hiện được lỗi của prototype; 24,31% (1440) / 27,69% (390), phần chênh là các dòng trống thừa + chữ trong ô |
| DV-G5c-2 | D-58 → D-65 | Tab loại, chip trạng thái, tìm, trang là state; drawer là state; tab Dịch vụ là state (`rqTab`); nút/ô là `div`/`span` có onClick | URL: `/investors?kind=&q=&page=&size=`, `/requests?status=&q=&page=&size=`, `/requests/catalog` (history API, Back về đúng tab); drawer không có URL (D-39). `button` + `role=radio/tab/switch`, drawer `role=dialog`, Esc đóng | data-state.md + truy cập bàn phím; ảnh không đổi (≤ 0,18%) |
| DV-G5c-3 | D-64 | "Từ chối" phiếu YC đổi ngay + toast | Hộp xác nhận "Từ chối yêu cầu YC-xxxx?" rồi `POST /admin/service-requests/:code/transition { from, to: 'lost' }` (cập nhật có điều kiện, 409 nếu trạng thái đã đổi), audit. Kịch bản parity bấm "Từ chối" trong hộp ở phía app (0,03 / 0,03%) | D-32 + luật 7, 10 |
| DV-G5c-4 | D-65 | "×" xoá dịch vụ chưa có YC ngay; sửa ô lưu mỗi phím vào state | Hộp xác nhận "Xóa dịch vụ?" rồi `DELETE /admin/services/:id` (409 nếu đã có YC, như toast prototype) + audit; sửa ô lưu khi rời ô / Enter (`PATCH /admin/services/:id`) | D-32, luật 10; không gọi API mỗi phím |
| DV-G5c-5 | D-58 → D-65 | Lọc / tìm / phân trang / CSV dựng trong trình duyệt; đổi trạng thái kết nối, bình luận, phụ trách chỉ đổi state | Phân trang server + API mới (Q-G5c-1, Q-G5c-2); CSV do server dựng (BOM), xuất dữ liệu cá nhân ghi audit; mọi thao tác ghi gọi API, MSW ghi `auditLog()` | Luật 10 + data-state.md; ảnh không đổi |
| DV-G5c-6 | D-60 | Bình luận mẫu "Somchai Prasert \| Siam AI Labs" | Không seed (khóa không khớp nhà đầu tư nào nên prototype cũng không hiện) | Giữ đúng ảnh prototype |
| DV-G5b-1 | D-51 → D-57 | Tab, kiểu xem, trang, cỡ trang, drawer duyệt (`rvId`) là state; tab / nút lưới–danh sách / ô tick / công tắc nổi bật là `div` có onClick | `/projects?tab=pending\|live\|hidden\|changes\|rejected\|draft&view=&page=&size=`; drawer ở `/projects/:id/review` (giữ query, history API, Back đóng drawer). Tab `role=tab`, kiểu xem `aria-pressed`, ô tick `role=checkbox` (`mixed`), nổi bật `role=switch`; Esc đóng drawer / hộp xác nhận | data-state.md + screens.md D-55. Ảnh D-51 → D-57 ≤ 0,20% |
| DV-G5b-2 | D-54, D-55 | "Xóa" (thẻ, bảng ✕, bulk), "Ẩn" (bulk), "Ẩn dự án" và "Từ chối" (drawer) làm ngay + toast | Hộp xác nhận tự vẽ `role=alertdialog` ("Xóa dự án?" / "Ẩn dự án?" / "Từ chối dự án?") rồi mới gọi API; API ghi `audit_logs` (MSW: `project.delete`, `project.hide`, `project.reject`…). "Duyệt & xuất bản", "Yêu cầu chỉnh sửa", "Xuất bản lại", bulk "Duyệt & xuất bản" làm ngay như prototype | Luật 10 + bài học G4. Kịch bản parity không bấm thao tác phá huỷ nên ảnh không đổi |
| DV-G5b-3 | D-51 → D-57 | Mọi thao tác đổi state trong bộ nhớ; bulk xuất bản / ẩn ép trạng thái bất kể hiện tại; xoá chỉ bỏ khỏi mảng | `POST /admin/projects/:id/review { decision: approve\|request_changes\|reject\|hide\|republish, note }`, `POST /admin/projects/bulk { ids, action }` (trả `{ done, skipped }` — dự án ở trạng thái không hợp lệ bị bỏ qua, toast ghi "bỏ qua N"), `DELETE /admin/projects/:id`, `PUT /admin/projects/featured { projectId }`. Chuyển trạng thái chỉ theo SRS §8 (Chờ duyệt → Đang hiển thị \| Cần chỉnh sửa \| Bị từ chối; Đang hiển thị ⇄ Đã ẩn), cập nhật có điều kiện (409 nếu sai trạng thái) | Luật 7 + 10. Xem Q-G5b-1, Q-G5b-2 |
| DV-G5b-4 | D-57 | Ô cỡ trang hiện "6 / trang" (value 10 không có trong danh sách 6/9/12/24) dù trang dùng 10 | Ô hiện "10 / trang" (thêm 10 vào danh sách 6/9/10/12/24) | AD-07: 10/trang. Chênh chỉ ở chữ ô chọn (D-51 → D-57 ≤ 0,20%) |
| DV-G5b-5 | D-55 | Bảng "Đội ngũ" của dự án seed không khai báo đội ngũ hiện tên chủ dự án | Như prototype (store admin bỏ đội ngũ mẫu mà Portal dùng để minh hoạ, rơi về chủ dự án) | Giữ đúng dữ liệu đăng ký; ảnh không đổi |
| DV-G5a-1 | D-42 → D-50 | Tìm, tab trạng thái, hình thức, kiểu xem, trang là state; tab/nút/thẻ là `div` có onClick | Ghi lên URL `/events?q=&status=open\|almost\|full&mode=online\|offline&view=list&page=&size=` (data-state.md); drawer không có URL (D-39). Tab `role=tab`, nút `button`, bảng `role=table`, công tắc `role=switch`, Offline/Online `role=radio` | Truy cập bàn phím; ảnh không đổi (D-42 → D-50 ≤ 0,06%) |
| DV-G5a-2 | D-46 | Check-in, "Check-in tất cả", "Xuất CSV" chỉ đổi state / toast; người đăng ký là danh sách tên cố định | Gọi API có `audit_logs` (luật 10): `POST /admin/events/:id/registrations/check-in { userIds, attended }`, `POST /admin/events/:id/registrations/export` → CSV (BOM) tải về + toast "Đang xuất danh sách đăng ký…". Danh sách từ `GET /admin/events/:id/registrations` (thêm `org`, `status=attended`) | Q-G5a-1; giao diện giữ nguyên |
| DV-G5a-3 | D-47, D-49 | Ảnh bìa sự kiện đọc thành `blob:` URL trong state | Đọc thành data URL (PNG/JPG/WebP ≤ 5 MB) gửi kèm `coverUrl` | Như DV-G4c-3; chờ `UPLOAD_KINDS` có `event-cover` (Q-G5a-2) |
| DV-G5a-4 | D-50 | "Chia sẻ" chỉ hiện toast, không sao chép gì | Sao chép `NEXT_PUBLIC_PORTAL_URL/events/:id` (D-39: chi tiết sự kiện có URL) vào clipboard rồi toast; clipboard bị chặn vẫn toast như prototype | Biến env mới (có trong `.env.example` + zod) |
| DV-G5a-5 | D-47 → D-49 | Form lưu `start` thành `time`, ngày dạng chữ "T5, 22/10"; kết thúc, bản đồ, nhóm, mở đăng ký chỉ ở state | Gửi `startsAt` ISO UTC (giờ VN → UTC, luật 9) + `endTime`, `mapUrl`, `groupId`, `registrationOpen`, `coverUrl` (thân `POST/PATCH /admin/events` mở rộng có mặc định). Tên < 3 ký tự báo "Tên sự kiện tối thiểu 3 ký tự" (theo `eventUpsertSchema`) | Q-G5a-1; ảnh không đổi |
| DV-G6b-1 | D-78, D-79 | Màn Marketing không có lối vào (C-05); tab, thao tác chỉ đổi state | Mục menu `/marketing` (D-33, quyền `n.edit`); tab trên URL `?tab=auto\|log`; tab `role=tab`, bảng `role=table`, đối tượng nhận `role=radio`, mẫu/nhóm `aria-pressed`, công tắc `role=switch` | Unreachable trên prototype nên không đo ảnh; dựng theo markup + chữ của prototype |
| DV-G6b-2 | D-78, D-79 | "Gửi ngay" (bảng và form) và "Xóa" làm ngay, chỉ đổi state | Hộp xác nhận "Gửi chiến dịch ngay?" (kèm số người nhận) / "Xóa chiến dịch?" rồi gọi API ghi `audit_logs`; gửi chỉ tạo job qua outbox (`POST /admin/campaigns/:id/send` → 202). Chiến dịch "Đang gửi" không xoá được (nút Xóa tắt, API 409); "Gửi ngay" chỉ từ Bản nháp / Đã lên lịch (luật 7) | Luật 8, 10; không hoàn tác |
| DV-G6b-3 | D-78 | "Gửi lại", "Gửi thử", "Lưu mẫu" chỉ hiện toast; "Xem" hiện mật khẩu tạm đã gửi | Gọi API (`POST /admin/mail/log/:id/resend` 202, `POST /admin/mail/welcome/test` 202, `PUT /admin/mail/welcome`) có audit; hộp "Xem" che mật khẩu tạm (`••••••••`) — không lưu/hiện lại mật khẩu sau khi gửi | Bảo mật; Q-G6b-3 |
| DV-G6b-4 | D-79 | Ước tính người nhận tính ở client (8 thành viên mẫu × 480; nhóm = tổng thành viên) | Server trả `GET /admin/campaigns/estimate?audience&groupIds` (mock giữ công thức prototype) | Số thật do BE đếm |
| DV-G6a-1 | D-66 → D-75 (390) | Danh sách tab Cài đặt có 7 mục; panel SSO và Ngôn ngữ không có lối vào (C-05) | Thêm 2 tab "Đăng nhập & bảo mật" (`?tab=sso`) và "Ngôn ngữ" (`?tab=languages`) theo D-33. Ở 390 danh sách tab dọc cao thêm 118px nên mọi nội dung bên dưới lệch xuống: 1440 không đổi (≤ 0,36%), 390 đo được D-66 9,90 · D-67 7,30 · D-68 7,04 · D-70 13,35 · D-71 11,95 · D-72 15,83 · D-73 10,60 · D-74 12,65 · D-75 11,09%. Ẩn 2 tab mới khi đo thử thì 390 còn ≤ 0,37% (D-66 0,12 · D-67 0,28 · D-68 0,28 · D-70 0,37 · D-71 0,15 · D-72 0,14 · D-73 0,02 · D-74 0,01 · D-75 0,00%) | D-33 (Q-11 đã duyệt) |
| DV-G6a-2 | D-69 | Ma trận 25 khoá §21 (`ADM_PERMS`) × 5 vai trò, nhãn menu trên mỗi dòng | Như prototype ver2 (TIP-V2-204): `ADMIN_PERMISSIONS` 25 khoá, Super Admin khoá cứng, thêm xoá vai trò tự tạo + "Xem thử với vai trò…". Đo 1440 **0,33%** · 390 7,98% (phần lệch 390 do DV-G6a-1) | §21, D-52 (trước TIP-V2-204: 7,17 / 28,11%) |
| DV-G6a-3 | D-69, D-80 | "Lưu" phân quyền lưu ngay + toast (kể cả không đổi gì) | Chưa đổi ô nào → toast "Chưa có thay đổi nào"; có đổi → hộp xác nhận "Lưu thay đổi phân quyền?" (N thay đổi) → `PUT /admin/admin-roles/permissions` + audit → "Đã lưu phân quyền". Kịch bản D-80 phía app tick 1 ô rồi xác nhận: 1440 0,70% · 390 5,25% (DV-G6a-1) | NA-28 (áp ngay cho mọi phiên) + luật 10 |
| DV-G6a-4 | D-73, D-74 | Bảng 6 TK `stAdmins`; "Khóa"/"Thu hồi"/đổi vai trò đổi state ngay; hộp thoại tạo TK 540px | Như prototype, cộng: khoá + thu hồi hỏi xác nhận, đổi vai trò gọi `PATCH /admin/admin-accounts/:id/role`, mọi thao tác ghi audit; Super Admin không có nút. Hộp thoại tạo TK (antd Modal 540px) lỗi tại ô (AT-RB01). TK demo đều "Chưa bật" 2FA (V2Q-114). D-73 1440 1,24% · 390 9,95%; D-74 1440 2,90% · 390 6,68% (390 do DV-G6a-1) | §21 RB-R02/R04/R08, luật 10 |
| DV-G6a-5 | D-66 → D-77 | Tab, lĩnh vực đang sửa, bộ lọc lĩnh vực là state; mọi công tắc / ô tick là `div` | `/settings?tab=&edit=&scope=` (data-state.md); `button` + `role=switch/checkbox/radio`, bảng `role=table`. Ô chữ "Chung" lưu khi rời ô / Enter (`PATCH /admin/settings/general`), công tắc lưu ngay; mọi ghi chép có audit và hiện ở "Nhật ký hoạt động" (đọc `GET /admin/audit-logs`, 90 ngày) | data-state.md + luật 10; ảnh không đổi |
| DV-G6a-6 | D-71, D-72 | Kiểm tra kết nối chỉ xét ô login/key trống ở client; SMTP key giữ trong state và hiện lại | `POST /admin/smtp/verify` với thông số đang nhập (key bỏ trống = dùng key đã lưu); server không bao giờ trả key (`hasKey`) — ô key hiện placeholder "đã lưu". Thiếu login/key vẫn báo lỗi ngay như prototype | Bảo mật (không lộ secret) |
| DV-G6a-7 | D-70 | "Gửi thử" email chào mừng chỉ toast | Dùng chung `POST /admin/mail/welcome/test` của Marketing (G6b, job outbox 202) gửi tới email admin đang đăng nhập; "Lưu mẫu" kiểm `welcomeMailSchema` (URL tài liệu phải http(s)) | D-30 + luật 8 |
| DV-D47-1 | D-70 (cả Marketing · Email tự động) | Công tắc "Tài khoản & mật khẩu truy cập" + khối URL / tên đăng nhập / "Mật khẩu tạm OPC-…" + "Vui lòng đổi mật khẩu…" trong xem trước | Bỏ hẳn công tắc, khối và trường `showPassword` (D-47); mail chỉ còn lời chào, quy định, nút "Đăng nhập ngay", tài liệu. Đo 17/10/2026: D-70 16,39% @1440 / 13,52% @390 (đã gồm DV-G6a-1 ở 390) | D-47 (D-30, D-45): không gửi mật khẩu qua email |
| DV-D48-1 | Chat Portal (P-28 → P-48), D-36 | Tin bot gắn nhãn "Bot thị trường" + avatar "BOT"; chữ "Chế độ tự động 100% … không cần duyệt" | Portal không biết tin nào do persona đăng: bỏ vai trò `bot`, bỏ `isSimulated` khỏi DTO Portal (vẫn lưu ở DB/Admin). Admin: "Chế độ tự động" + mô tả bắt duyệt; "Soạn trả lời thành viên thật … chờ duyệt". Đo: P-28 → P-48 vẫn đạt (seed không có tin bot), D-36 0,55% / 2,14% | D-48 (D-04): luôn duyệt; persona mang danh tính thành viên |
| DV-B63-1 | P-67, P-68 (chế độ server; P-62 → P-72 của chủ DN đã khớp sau seed địa chỉ DN) | Dải liên hệ dự án sinh từ tên chủ dự án: email `bao.tq@opchub.vn`, SĐT `09…` giả, địa chỉ chọn theo tổng mã ký tự | API thật trả email / SĐT / địa chỉ thật của chủ dự án (hồ sơ TK + hồ sơ DN); TK demo không có địa chỉ → ô trống, hàng thấp hơn ~19px | Không bịa dữ liệu liên hệ cá nhân trên server (Q-B63-5) |
| DV-B63-2 | D-07 → D-15 (chế độ server, 390) | Danh sách thành viên theo thứ tự mảng `MEMBERS` | `ORDER BY created_at DESC, id` (deferred join trên idx `users_list`) — mới nhất lên đầu | query-indexing.md: phân trang ổn định theo index; Q-B62-18 |
| DV-B63-3 | D-21 (chế độ server, 390) | Bảng phí theo thứ tự mảng | `ORDER BY updated_at DESC` — dòng vừa ghi nhận thu nhảy lên đầu | Như DV-B63-2 |
| DV-B63-4 | D-41 (chế độ server, 390) | Hội thoại bot theo thứ tự seed | `ORDER BY created_at DESC` — hội thoại chờ duyệt mới nhất lên đầu | Như DV-B63-2 |
| DV-B63-5 | D-46 (chế độ server, 390) | Dòng phụ người đăng ký = `org` (tên thương hiệu mẫu: LeadPilot, BrandKit…) | Tên công ty trong hồ sơ DN, không có thì "Thành viên OPC" | Schema không có trường "tổ chức" cho TK cá nhân; không thêm cột chỉ để khớp ảnh (Q-B63-6) |
| DV-B63-6 | D-75 (chế độ server) | Nhật ký 6 dòng mẫu | `audit_logs` chỉ INSERT (luật 11) → dòng do e2e tạo các lượt trước vẫn còn, trang dài hơn | Không xoá được nhật ký kể cả trên dev (trigger); Q-B62-13 |
| DV-B63-7 | D-31 (chế độ server) | Số cạnh chip nhóm = số thành viên thật trong mock | Như mock sau Q-B63-4 (`GROUP BY` group_members) | Trước đó server trả `member_count` hiển thị (1248…) |
| DV-V2-109-1 | P-62 → P-72 (chi tiết dự án) | Dải liên hệ hero: Email, Zalo, Điện thoại, Địa chỉ (email/SĐT/địa chỉ sinh từ tên chủ dự án); thẻ chủ dự án có nút "Nhắn tin" (chỉ toast) | Chỉ kênh chủ dự án tự công khai (`projects.contact_email`, `contact_phone`): dải Email/Zalo/Điện thoại, không còn Địa chỉ; thẻ chủ dự án 3 nút Email / Zalo / Gọi; không kênh nào → "Chủ dự án chưa công khai thông tin liên hệ" | BUG-016 (NĐ 13/2023), BUG-021, QT-09 bước 6 (V2Q-81, V2Q-82). Đo bản TIP so HEAD `b37db1a`: P-62…P-72 từ đạt (≤ 3%, bản HEAD build riêng) lên 3,5–4,9% @1440, 9,0–11,9% @390; màn khác không đổi |
| DV-V2-204-1 | Shell Admin | Chế độ chỉ xem / xem thử vai trò là state trong trang | Quyền lấy từ `admin.permissions` (server); dải "Chế độ chỉ xem" + chặn nút ghi theo regex `roGuard` của prototype; xem thử chỉ trong bộ nhớ, không gửi server; tải lại `/admin/auth/me` khi đổi menu (NA-28) | §21 RB-R06/R07/R09 · luật 4 |
| DV-V2-204-2 | A-01 (Admin) | Đổi mật khẩu lần đầu là popup `cpOpen` trên màn đăng nhập | Màn `/first-password` (và `/two-factor` cho SEC-R02) — phiên hạn chế chỉ gọi được các route thiết lập | SEC-R01/R02; câu chữ theo prototype |

## TIP-V2-403 — chênh lệch cần giữ theo đặc tả

| # | Màn | Prototype | App | Lý do / bằng chứng |
|---|---|---|---|---|
| DV-V2-403-1 | A-17, A-20 (1440, 390) | Bấm gửi form trống chỉ hiện toast đầu tiên, không dành chỗ cho lỗi từng trường | Hiện toast đầu tiên **và** lỗi dưới mọi trường sai; focus trường đầu. Form dài hơn nên ảnh raw vượt 3% | Giữ BUG-022 và SRS §6 về lỗi tại trường; không xóa lỗi hay nới assertion để làm parity xanh. Xem `../TIP-V2-403-progress.md` và raw evidence `../evidence/v2-403/`. Đây không phải kết luận toàn bộ parity PASS |

## Lưu trữ — hết hiệu lực từ baseline ver2

| # | Lý do bỏ |
|---|---|
| DV-05 | Tổng quan nay lấy số thật từ API (TIP-V2-305) → DV-V2-307-4 |
| DV-06 | Shell ver2 dựng lại (TIP-V2-307); thu gọn sidebar đã có |
| DV-07 | Popover thông báo / ngôn ngữ / menu người dùng đã có (DV-G2a-4) |
| DV-12 | Ver2 bỏ hộp "Tài khoản dùng thử" → DV-V2-307-1 |
| DV-G2c-2 | Đính kèm qua presigned upload thật (TIP-V2-1xx), không còn tệp mẫu |
| DV-G3a-1 | D-41 bị D-58 thay: app hiện 50.000đ/tháng, giá gạch, Ưu đãi 75% như prototype |
| DV-G3b-7 | Thay bởi DV-V2-109-1 (thẻ chủ dự án Email / Zalo / Gọi) |
| DV-G4a-1 | D-15 bỏ khỏi baseline ver2 (quyền hệ thống chuyển sang TK quản trị §21) |

## P5 owner-approved spec deviations ? 2026-10-21

DV-V2-P5-1: Owner approved spec-required D-36/D-37/D-39/D-41 differences: no approval workflow, scheduled/running turn progress, generated conversation history, emergency stop/hide controls and resulting layout shifts. Keep raw pixel failures; not a parity PASS. See `../TIP-V2-550-parity-review.md` for exact both-lane measurements. Native P-01 full-page data differences are a separate disclosed limitation, not covered by this approval.

DV-V2-P5-2: In a separate explicit reply on 2026-10-21, owner accepted the native
Dashboard P-01 unmatched-data comparison as P5 UI-testing debt to list in the PR.
Disclosed raw full-page differences: 38–41%; native real members/activity/messages
versus prototype fixtures. This supersedes the pending approval for that caveat,
not the measurement: native matched-data bot-card pixel parity remains unproven.
Do not label either raw native P-01 image PASS or replace real data with fake data.


## Bot availability correction ? 2026-10-22

DV-G4d-5 is superseded for Bot availability: owner requires no server or Next environment flag. Navigation follows permissions; API is always registered. Runtime settings and audited emergency stop/hide remain. This changes availability, not acceptance of the P5 pixel deviations DV-V2-P5-1/2.

## TIP-V2-560 measurement update for DV-V2-P5-1 (2026-10-22, APPROVED by owner 2026-10-22)

Fixed layout debt: emergency bar inset band (16px padding inside the padded card), test
`e2e/behavior/bot-ui-debt-emergency.spec.ts` FAIL before (bar 62px) / PASS after, native and
MSW same assertion. D-50/D-51 controls stay visible and enabled. Threshold 3%, no mask.

| State | Native before | Native after | MSW after | After removing the spec-required 40px emergency band* |
|---|---|---|---|---|
| D-36 1440 | 6.18% | **2.03%** | **2.05%** | — (passes) |
| D-36 390 | 7.81% | 5.57% | 6.01% | native 4.04% / MSW 4.13% (empty-log copy + tab wrap) |
| D-37 1440 | 8.95% | 6.83% | 6.81% | 1.50% / 1.50% |
| D-37 390 | 7.86% | 6.92% | 6.87% | 1.53% / 1.47% |
| D-39 1440 | 10.41% | 7.85% | 7.82% | 1.89% / 1.89% |
| D-39 390 | 11.16% | 9.81% | 9.54% | 2.66% / 2.38% |
| D-41 1440 | 31.10% | 6.38% | 20.96% | native: bands 3.53% + height pad 2.86% (app 1399 vs proto 1359); after the 40px band 3.67%, all of it in the thread list (live worker conversations, progress "lượt n/m", Dừng buttons vs prototype approve/reject); MSW height 1667 = more generated threads |
| D-41 390 | 10.48% | 25.32% | 17.64% | same, app height 2476–3014 vs proto 2393 |

*Analysis only (`bands` helper, e2e/.parity-out, not committed): drop the 44px bar band and
keep the 4px shorter spec copy (auto-mode text without "100%", no approval wording); raw
numbers above stay the official FAIL values. D-38 (2.27/0.12) and D-40 (0.95/0.15) still pass.

P-01-BOTCARD (owner-approved seed fixture, 2026-10-22): measured. `seed:demo -- --bot-history`
persists the two `done` demo threads (th1/th2) as real bot messages, the native twin of MSW
`seedMockBotHistory`; parity captures only the "Thảo luận mới trong cộng đồng" block on both sides.

| Viewport | Native (6 runs) | MSW | Residual |
|---|---|---|---|
| 1440 | 3.00% ×5 PASS (2.995%), 1 run 51.03% | 3.00% PASS | run 3 native: 2 live worker openings ("Định giá dịch vụ", c1/c2) appeared in the 10s Dashboard cache window; not reproduced in runs 4–6 |
| 390 | 7.49% ×6 (stable) | 7.34% | group meta "OPC Hà Nội, OPC TP. Hồ Chí Minh" wraps 2 lines in the prototype; app shows only the first destination (MSW history doc: "other destinations are not invented"), plus relative time (3h/20h vs fixed seed time) |

The 390 FAIL stays FAIL; it is data/time copy, not card layout. P-01 itself keeps its original numbers.

**Owner decision 2026-10-22:** "duyệt DV-V2-P5-1". The TIP-560 numbers above (D-36 390, D-37,
D-39, D-41, P-01-BOTCARD 390) are approved as spec/data deviations. The raw values stay FAIL in
`results.md`; this approval is not a parity PASS. D-36 1440 and P-01-BOTCARD 1440 pass outright.

## V4 — TIP-V4-601 (23/10/2026) — chờ owner duyệt

| DV | Màn | % (sha 7123673a) | Lý do / phương án |
|---|---|---|---|
| DV-V4-601-1 | P-81 @1440 / @390 | 3,96 / 4,13% | Sidebar + topbar: menu v4 9 mục §27.3 + thẻ gói chân sidebar thuộc V4-606. Nội dung form khớp. Đo lại sau V4-606 (Q-V4-601-4). |
| DV-V4-601-2 | P-82 @1440 / @390 | 12,26 / 16,42% | Như DV-V4-601-1 + lỗi tại từng ô (BUG-022, SRS §6) — cùng loại DV-V2-307-14, DV-V2-403-1. Không ẩn lỗi (Q-V4-601-3). |
| DV-V4-601-3 | P-89 @390 | 7,38% | Prototype v4 thêm tab Hồ sơ "Gói & thanh toán" (UP-14) chưa giao TIP nào; đề xuất V4-607 (Q-V4-601-1). |

## V4 — TIP-V4-606 (23/10/2026) — chờ owner duyệt

Shell §27.3 đo riêng (chỉ vùng sidebar / menu người dùng, `capture` không mask): **P-99 1,78%, P-99-DRAWER 1,77%, D-90 1,92%, D-90-DRAWER 1,86%, D-91 1,11 / 0,01%** — đạt.
Màn cũ đo lại toàn trang trên prototype v4 còn lệch do **nội dung màn** v4 chưa dựng (không do menu):

| DV | Màn | % | Nguyên nhân / TIP xử lý |
|---|---|---|---|
| DV-V4-606-1 | P-01…P-06, P-13, P-15, P-17…P-19 | 29–72% | Dashboard v4: thẻ "Hướng dẫn bắt đầu" 8 bước (V4-611), Cộng đồng v4 (V4-603) |
| DV-V4-606-2 | P-07…P-12 (thông báo, topbar) | 4,8–6,8% | Nền Dashboard v4 phía sau popover (V4-611) |
| DV-V4-606-3 | D-01…D-05 | 4,1–42% | Tổng quan v4 "Luồng hệ thống" (V4-614/615) |
| DV-V4-606-4 | D-07…D-14, D-17 | 3,5–13% | Thành viên v4: cột Khởi đầu x/8 + Nhắc (V4-611) |
| DV-V4-606-5 | P-16 | unreachable | Prototype v4 bỏ "Sự kiện sắp tới" ở chân sidebar; thay P-99 |

## V4 — TIP-V4-603 (23/10/2026) — chờ owner duyệt

Đo lại trên prototype v4 tại `ee268a6a` (không mask, không nới ngưỡng). D-28 0,09 / 0,25%, D-30 0,15 / 0,48%, P-40 @1440 2,67% — đạt.

| DV | Màn | Chênh | Lý do |
|---|---|---|---|
| DV-V4-603-1 | P-24, P-25, P-41 | unreachable | D-71 / §27.1 bỏ duyệt vào nhóm: không còn popup "Cần duyệt", thẻ "Đang chờ duyệt", mục "Chờ duyệt vào nhóm". Prototype v4 còn nhánh này (Q-V4-603-1). |
| DV-V4-603-2 | P-40 @390 | 9,12% | Prototype v4 còn danh sách "Chờ duyệt vào nhóm" (2 yêu cầu + nút Duyệt) phía trên danh sách thành viên → mọi dòng lệch xuống. App theo D-71 chỉ còn nhãn "Bạn là chủ nhóm". |
| DV-V4-603-3 | P-26, P-27 | 42,7–65,1% | Cộng đồng v4: 90 nhóm (thêm "Nhóm ngành"), dải "Nghị quyết 86/NQ-CP" dưới tiêu đề, ô thống kê "chờ duyệt". Nhóm ngành + dải NQ86 chưa có D-xx/TIP (Q-V4-603-4). |
| DV-V4-603-4 | P-23 | 23,0 / 10,1% | Popup tham gia phủ lên màn Cộng đồng v4 (DV-V4-603-3); nội dung popup khớp. |
| DV-V4-603-5 | P-46 | 4,8 / 15,1% | Lệch có từ trước (3,56 / 11,37% tại c9fcf39); prototype v4 còn nhãn "Cần duyệt" + nút "Gửi yêu cầu tham gia" ở xem trước nhóm cần duyệt. |
| DV-V4-603-6 | P-89 @390 | 7,38% | Không đổi so với V4-601 (DV-V4-601-3). |

## V4 — TIP-V4-604 (23/10/2026) — chờ owner duyệt

Đo lại trên prototype v4 (không mask, không nới ngưỡng). D-58 0,44 / 0,16%, D-59 0,44 / 0,16%, D-60 0,66 / 1,29% — đạt (390 cần 2 luật mobile v4: ô thống kê 2 cột, ẩn hàng tiêu đề bảng).

| DV | Màn | Chênh | Lý do |
|---|---|---|---|
| DV-V4-604-1 | P-69 | 32,17 / 16,72% | Prototype v4 chuyển khối "Gọi vốn đầu tư" từ cột phải sang **tab "Gọi vốn đầu tư"** (chỉ khi dự án bật gọi vốn, kèm "Dự án liên quan" thành tab), thêm "Vấn đề / Giải pháp / Thị trường", "Hình ảnh sản phẩm" ở Tổng quan. Tab Gọi vốn thuộc V4-610 (02-TASK-GRAPH "tab Gọi vốn dự án"). Đo lại ở V4-610. |
| DV-V4-604-2 | P-70, P-71, P-72 | không đo được (đã sửa bước chờ dải "★ DỰ ÁN NỔI BẬT TUẦN" — v4 bỏ dải; kịch bản vẫn chờ nút "Quan tâm đầu tư" / "Nhà đầu tư quan tâm (2)" ở cột phải, v4 chuyển vào tab Gọi vốn → hết giờ, số cũ c9fcf39 giữ nguyên; viết lại kịch bản ở V4-610) | Như DV-V4-604-1 — kịch bản và màn đổi ở V4-610. Bản v4 còn "Trao đổi với OPC Hub" trong tab Gọi vốn: trái D-72, app không làm (Q-V4-604-1). |
| DV-V4-605-1 | D-64 | không đo (`unreachable`, dòng cũ c9fcf39 giữ nguyên) | D-72 / §27.1 bỏ quy trình 5 bước Phiếu YC: không còn nút "Từ chối" / "Mở lại tư vấn"; drawer v4 chỉ có thông tin + ghi chú nội bộ (đã đo ở D-63 = 1,08 / 1,97%). |
| DV-V4-605-2 | P-81, P-82 | 3,88 / 4,13% · 12,23 / 16,43% | Giữ nguyên DV-V4-601-1/2 (không đổi do V4-605; trạng thái phiếu không hiện ở form). |
| DV-V4-602-1 (= DV-P4-558-1) | D-84-AFF 1440 / 390 | 24,40 / 29,42% | Như DV-P4-558-1: 62 đại lý tự tạo thật (AF-R01) so với 6 dòng prototype; không làm giả dữ liệu. |
| DV-V4-602-2 (= DV-P4-558-2) | D-84-POL 390 | 13,61% (trước V4 13,70%) | Ô "Điều khoản chương trình" + nút Lưu (SRS bắt buộc) nằm dưới chỗ prototype kết thúc. Thêm ô chỉ đọc "Hoa hồng Gói Gọi vốn (%)" và gợi ý giá 2 gói theo v4 (D-70); 1440 = 2,41% đạt. |
| DV-V4-602-3 | D-85-CUS 390 | 11,03% (trước 20,42% khi mới đổi sang v4) | Prototype v4 ở ≤ 1023px ép bảng khách hàng thành lưới 2 cột với hàng tiêu đề cao cố định 38px — 3 dòng chữ tiêu đề chồng lên dòng đầu. App dùng cùng lưới 2 cột nhưng không chồng chữ (không cố tình làm hỏng khả năng đọc để khớp pixel). |
| DV-V4-607-1 | A-12, A-16, A-17, A-18, A-20 → A-23, A-31, A-32 (1440 / 390) | 70 – 91% | Prototype v4 dựng lại toàn bộ màn đăng nhập / đăng ký (ảnh nền toàn trang + thẻ form; form đăng ký không còn ô vai trò / nhóm / MST). V4-607 chỉ đổi câu xác nhận (D-87) và thêm popup khai báo; bố cục màn auth mới không thuộc TIP nào trong GOAL-V4 trước V4-615 → chờ owner chốt (Q-V4-607-1) và đo lại ở V4-615. A-13 / A-14 / A-15 / A-19 `unreachable` (prototype v4 không còn ô MST / vai trò trên form). |
| DV-V4-607-2 (= DV-G2a-1) | P-05 1440 / 390 | 4,52 / 4,71% (chỉ hộp mail) | Như DV-G2a-1: bỏ khối "Mật khẩu tạm" theo D-30 nên nội dung mail dồn lên. Kịch bản chụp riêng hộp mail vì nền Dashboard v4 thuộc V4-611. |

## V4 — TIP-V4-610 (24/10/2026) — chờ owner duyệt

Đo trên prototype v4 (không mask, không nới ngưỡng). Mới: P-103 0,44 / 0,37%, P-104 1440 0,63%, D-92 (Admin › Dự án · chip Gọi vốn chờ duyệt) 1,23 / 0,96% — đạt. Popup chỉ chụp hộp thoại (như P-100 → P-102); D-92 chụp thẻ OPC Hub Mobile.

| DV | Màn | Chênh | Lý do |
|---|---|---|---|
| DV-V4-610-1 | P-69, P-70, P-71, P-72 | không đo (`unreachable`, dòng cũ giữ nguyên) | Prototype v4 lỗi lồng thẻ: tab "Gọi vốn đầu tư" / "Dự án liên quan" nằm trong khối tab Góp ý nên bấm tab chỉ còn trống (Q-V4-610-6). App: khối gọi vốn + NĐT quan tâm ở tab Gọi vốn (chỉ khi gói hiệu lực), kiểm ở `e2e/behavior/projects.spec.ts` + `fundraising.spec.ts`. |
| DV-V4-610-2 | P-62, P-68 | 28,67 / 35,50% · 32,90 / 34,56% | Bố cục v4 đã khớp (6 tab, cột phải chỉ Chủ dự án + Thông tin, Bản test trong Tổng quan). Phần còn lệch là DV-V2-307-8 (prototype dựng cố định "Vấn đề / Giải pháp / Thị trường" + 3 ảnh cho mọi dự án; app chỉ hiện khi có dữ liệu — BUG-038) và DV-V2-109-1 (không Địa chỉ, 3 nút liên hệ). |
| DV-V4-610-3 | P-63 → P-67 | 3,30 – 4,56% @1440 · 7,04 – 20,68% @390 | Như DV-V2-109-1 / DV-V2-307-8 (dải liên hệ + thẻ chủ dự án); tab mới không đổi phần nội dung tab. Trước V4-610: 3,18 – 4,93% / 8,96 – 15,42%. P-64 @390 tăng 9,71 → 20,68% vì trang ngắn hơn (Dự án liên quan rời khỏi cột phải) nên phần lệch cố định chiếm tỷ lệ lớn hơn. |
| DV-V4-610-4 | P-104 390 | 15,94% | Nội dung CK prototype là `OPC M1 GV U1792…` (mã dài ghép từ id, xuống 2 dòng, "Sao chép" xuống dòng riêng); app dùng mã GV 6 số (`OPCHUB GV000001`, D-31 / BR-04) nên hộp ngắn hơn 1 dòng, phần dưới lệch theo. 1440 = 0,63% đạt; P-103 390 (cùng popup, mã prototype ngắn) = 0,37%. |
| DV-V4-608-1 | P-105 1440 | 3,99% | Prototype hiện toàn bộ lưới gian hàng không phân trang và thẻ có thêm tag "loại hình" thứ 2 (HTX / OPC / Hộ kinh doanh, prototype `TG` / `kind`), lượt xem, tim, badge "Nổi bật / Đang tìm đối tác" (không có nguồn dữ liệu, Q-V4-608-5). App: `STORE_PAGE_SIZE` = 24 (17 gian hàng mẫu vừa 1 trang), thẻ 1 tag ngành → thẻ thấp hơn vài px, cộng dồn qua 6 hàng. 390 = 1,45% đạt; P-106 / P-107 (cùng thẻ) ≤ 1,09%. |
| DV-V4-608-2 | P-108 | 2,20 / 0,75% (khung nhìn đầu trang) | Phía dưới prototype là "Đang cần" (V4-609) + "Hình ảnh & Video" / "Reels" (dữ liệu mở rộng FS / EX, Q-V4-608-6) — không làm ở V4-608 nên so khung nhìn đầu trang (hero + Giới thiệu + Sản phẩm). App đặt khối Thông tin liên hệ có 3 nút Email / Zalo / Gọi (REQ-510) ngay sau Sản phẩm & Dịch vụ; nút "Xem trang hồ sơ công khai" / "Chia sẻ" chép link gian hàng. |
| DV-V4-608-3 | D-93 1440 · 390 | 3,47 / 3,10% | Prototype liệt kê theo thứ tự seed; app (server + MSW) sắp `updated_at desc` (index `(status, updated_at desc, id)`, AD-07) → các dòng khác tên / ngành / ngày ở cùng vị trí. Ở 390 prototype còn ẩn dòng SP/DV + Thao tác (ô `text-align:right` bị luật lưới 1 cột đè), app vẫn hiện để thao tác được. KPI, chip, ô tìm, lưới 8 cột, pager khớp; D-94 (cùng gian hàng) = 0,02%. |

## V4 — TIP-V4-611 (26/10/2026) — chờ owner duyệt

Đo trên prototype v4 (không mask, không nới ngưỡng). Mới: P-119 Dashboard · Hướng dẫn bắt đầu 0,00 / 0,35% — đạt; P-120 (chưa đóng phí) `unreachable` (prototype không có TK chưa đóng phí, như P-110). Admin › Thành viên: thêm cột Khởi đầu, ẩn hàng tiêu đề cột ở < 768px và chữ viết tắt avatar "từ đầu + từ cuối" như prototype (`ini`). DV-V4-606-4 cũ (3,5–13%) thay bằng số dưới.

| DV | Màn | Chênh (1440 / 390) | Lý do |
|---|---|---|---|
| DV-V4-611-1 (thay DV-V4-606-1 phần Dashboard) | P-01 | 72,04 / 75,33% | Prototype v4 Dashboard chỉ còn lời chào + thẻ; app giữ khối LIVE (REQ-224 / NA-24, có e2e) phía dưới (Q-V4-611-1). Vùng lời chào + thẻ đo riêng ở P-119: đạt. |
| DV-V4-611-2 (thay DV-V4-606-4) | D-96, D-97 | 3,69 / 5,43% | Cột Khởi đầu + "Nhắc" khớp; chỉ lệch thứ tự dòng: app (server + MSW) sắp `created_at DESC` (DV-B63-2 / DV-V2-307-5), prototype theo mảng mẫu. m7 Rina Sari "Chờ xác minh" (DV-G4a-4) và 2/8 (prototype 3/8: prototype coi hồ sơ người khác là đủ khi có MST; D-85 cần cả ảnh đại diện, seed m7 không có ảnh). |
| DV-V4-611-3 (thay DV-V4-606-4) | D-07, D-08, D-10, D-11, D-14, D-17 | D-07 1,88 / 10,94% · D-08 3,08 / 10,38% · D-10 2,79 / 11,44% · D-11 3,94 / 12,12% · D-14 1,91 / 12,46% · D-17 0,78 / 17,78% | Như DV-V4-611-2 (thứ tự dòng) + thanh lọc: prototype 7 ô chọn (Nhóm, Vai trò, Phí, Trạng thái, Hồ sơ, Ngày, Khởi đầu), app chỉ "Khởi đầu" (Q-V4-611-6, TIP SKIP) → ở 390 thanh lọc thấp hơn ~190px, mọi thẻ dòng lệch lên. Trước V4-611 (cùng prototype v4): D-07 11,61 / 8,67%, D-08 12,30 / 12,89%, D-11 11,58 / 9,73%, D-14 11,59 / 10,05%. |
| DV-V4-611-4 | D-09, D-12, D-13 | D-09 1,32 / 14,05% · D-12 3,13 / 3,64% · D-13 2,13 / 3,88% | Như DV-V4-611-3 (D-12 / D-13 là modal / menu phủ trên bảng lệch thứ tự). |

## V4 — TIP-V4-612 (26/10/2026) — chờ owner duyệt

Đo trên prototype v4 tại `fa345bcc` (không mask, không nới ngưỡng). D-33 0,24 / 0,45%, D-34 0,08 / 0,22% (v4: "Khôi phục tin" cả 4 thẻ), D-35 0,24 / 0,35%, D-98 (Thời gian khóa 14 ngày, mới) 0,24 / 0,37%, P-44 0,57 / 1,10%, P-45 @1440 2,20%, P-121 @1440 2,20% — đạt. Bước D-33…D-35 bỏ chờ "Hiển thị 1–12 / 34 nhóm" (prototype v4 có 90 nhóm — DV-V4-603-3).

| DV | Màn | Chênh | Lý do |
|---|---|---|---|
| DV-V4-612-1 | P-45, P-121 @390 | 6,47 / 6,47% | Như P-34 @390 (4,99%, đo lại trên worktree `730b3a13` = trước V4-612: cũng 4,99%): sau khi gửi/báo cáo, MSW phát sự kiện storage → phòng tải lại (0ddc089e) và danh sách ở 390 đứng đầu; prototype cuộn xuống cuối. Thêm: app giữ dòng giữ chỗ cho tin seed `rpt-r4` (Vũ Đức Long, đã ẩn từ demo — Q-B62-9) mà prototype không có. Không do V4-612 gây ra phần cuộn; ghi Q-V4-612-3. |
| DV-V4-612-2 | A-33 | unreachable | Prototype không có TK bị khoá có hạn sẵn để đăng nhập; hành vi "khóa đến dd/mm/yyyy" kiểm ở test:int `moderation/violations` + unit `login-messages`. |

## V4 — TIP-V4-614 (26/10/2026) — chờ owner duyệt

Đo lại D-01 (shell Admin, sidebar thêm mục "Báo cáo") trên prototype v4 tại `85e440ce`, không mask thêm, không nới ngưỡng: 35,18 / 4,15% (trước V4-614: 35,50 / 4,15% — DV-V4-606, nội dung Tổng quan v4 thuộc V4-615). Mục mới không làm tăng chênh.

| DV | Màn | Chênh | Lý do |
|---|---|---|---|
| DV-V4-614-1 | D-99 Admin › Báo cáo | unreachable | Prototype v4 không có menu "Báo cáo" (`AG` không có `reports`, §27.9 T15); `aReports` dựng trên cây mạng lưới đã gỡ (§24, D-78). Màn dựng theo khung Admin chung (thẻ số liệu + thanh lọc + bảng). Hành vi: e2e `reports.spec.ts` 5/5, test:int `reporting/report-export` 6/6, CSV khớp byte với `docs/spec/mau-bao-cao/*.csv` (unit `templates.spec`). |
| DV-V4-614-2 | D-01 (sidebar Admin 1440 / 390) | 35,18 / 4,15% | Thêm mục "Báo cáo" cuối nhóm DOANH THU & ĐỐI TÁC mà prototype không có (D-78 giữ màn). Không đổi kết luận D-01 (vẫn DV-V4-606 cho nội dung Tổng quan). |

## V4 — TIP-V4-615 (26/10/2026) — đo lại toàn bộ trên prototype v4, chờ owner duyệt

Đo toàn bộ 520 kịch bản tại `8a5fa5e6` (lần cuối, không lỗi kịch bản), đo lại Admin D-01…D-39, D-86, D-89, D-96, D-97 tại `d73b4a90` sau khi sửa. Không mask thêm, không nới ngưỡng, không sửa ảnh prototype. 434 ảnh / 223 màn đo được: **234 ảnh đạt**, 98 màn đạt cả hai khung; 43 màn `unreachable` (bảng cuối `results.md`, mỗi dòng có lý do). Mọi màn còn > 3% có DV dưới đây hoặc DV-V4-6xx của TIP trước (bảng tổng hợp ở `TIP-V4-615-completion.md`).

Sửa trong TIP (lệch thật, có D-xx): nút ngôn ngữ thanh trên cùng = quả địa cầu + viền (prototype `[data-m="lang"]`); Cài đặt bỏ ô khoảng ngày (`showRange = !aSettings`); phụ đề "Thành viên OPC" (prototype `userSub`); phụ đề trang Dự án v4; Admin Sự kiện: ô thống kê 2 cột + khối Sắp diễn ra 1 cột ở ≤ 1023px; thẻ vai trò và danh sách nhóm trong hộp gán nhóm 2 cột ở ≤ 1023px (luật `minmax(200px…)` của prototype); bỏ ghi chú "Yêu cầu tham gia nhóm do chủ nhóm… duyệt" (D-71). Kịch bản sửa theo luồng v4: ô đăng nhập không còn `type=email`, mắt "Hiện" là biểu tượng, số nhóm 90, Admin Dự án mở tab "Đang hiển thị", ô chọn cỡ trang theo option.

| DV | Màn | Chênh (1440 / 390) | Lý do |
|---|---|---|---|
| DV-V4-615-1 (mở rộng DV-V4-607-1) | A-01 → A-04, A-06, A-08, A-10, A-25 → A-29 | 79 – 92% / 24 – 87% | Prototype v4 dựng lại toàn bộ màn đăng nhập (ảnh nền `login-bg-v11.png` toàn trang, tiêu đề "Kết nối năng lực địa phương / Kiến tạo chuỗi cung ứng quốc tế.", thẻ form, chỉ còn Google SSO, câu lỗi "email/số điện thoại"). Chưa có D-xx / TIP cho bố cục auth mới; app giữ màn hiện có (D-64 SSO 4 nút, D-33). A-07 (prototype chọn English không dịch màn) và A-09 (không còn nút ChatGPT) → `unreachable`. Q-V4-615-1. |
| DV-V4-615-2 (mở rộng DV-V4-603-3) | P-17 → P-22, P-26, P-27, P-48 | 29 – 47% / 26 – 71% | Cộng đồng v4: 90 nhóm (thêm 56 Nhóm ngành), dải "Nghị quyết 86/NQ-CP", ô "chờ duyệt". Nhóm ngành chưa có D-xx (Q-V4-603-4). P-21 @1440 đạt 2,52%. P-48 = màn Cộng đồng sau "+ Tham gia thêm nhóm". |
| DV-V4-615-3 | P-55, P-56, P-58, P-59, P-73 → P-75 | 49 – 57% / 46 – 59%; form 19,5 – 20,7% / 2,3 – 3,7% | Prototype v4 dựng lại trang Dự án OPC (hero tối "Sáng kiến & Giải pháp cho địa phương", lưới ngành, cột lọc bên trái, ô tìm mới); form đăng dự án nằm trên trang này nên nền lệch. Chưa có D-xx; app giữ trang Dự án theo V4-610 (đã đạt trước V4-615 trên prototype cũ). P-57 → `unreachable` (bỏ lọc giai đoạn + "Nhiều theo dõi"). Q-V4-615-2. |
| DV-V4-615-4 | P-28 → P-39, P-47, P-89 → P-94 @390; P-93, P-94 @1440 | Chat 3,2 – 7,0% @390; Hồ sơ 6,6 – 8,8% @390, Bảo mật 19,8% | Thanh trên cùng: ảnh đại diện mặc định là bóng người tự host (`/images/avatar-default.svg`, 87fd73cb) — prototype v4 dùng chữ viết tắt trên nền #1677FF. Hồ sơ: prototype bỏ ô "Dự án" (P-95 `unreachable`) và chỉ còn Google ở "Tài khoản liên kết" (app 6 nhà cung cấp theo D-64); thêm tab "Gói & thanh toán" (DV-V4-601-3). Q-V4-615-3. |
| DV-V4-615-5 | D-57 | 32,70 / 36,78% | Admin Dự án v4 mở tab "Đang hiển thị" với 11 dự án mẫu dạng lưới; app (MSW) có 6 dự án hiển thị và chọn tab theo trạng thái. D-51 / D-55 / D-56 đo trên tab "Chờ duyệt" của cả hai bên. D-53 / D-54 → `unreachable` (prototype bỏ dạng danh sách). |
| DV-V4-615-6 (thay DV-V4-606-3 / DV-V4-614-2) | D-01 → D-05, D-81 | 35,2 – 42,2% / 4,1 – 33,1%; D-81 29,10 / 3,68% | Tổng quan v4 thêm khối "Luồng hệ thống" (5 thẻ: thành viên đã đóng phí x/8, gian hàng, nhu cầu, dự án chờ duyệt, nhóm cộng đồng — số liệu từ nhiều module, có CTA). Cần API tổng hợp mới ngoài phạm vi TIP parity; app giữ 4 thẻ + biểu đồ (vùng biểu đồ vẫn che như trước — `OVERVIEW_CHART_MASK`). Q-V4-615-4. |
| DV-V4-615-7 | D-23 → D-31, D-86 | 7,0 – 18,9% / 3,9 – 36,5% (D-89 3,14 / 1,48%) | Admin Nhóm cộng đồng v4: 90 nhóm, thêm bộ lọc "Tất cả loại / Nhóm tỉnh / Nhóm ngành" + "Tất cả ngành"; drawer tạo nhóm thêm "Loại nhóm" (tỉnh / ngành) và "Quyền tham gia" (Công khai / Cần duyệt — trái D-71). Như DV-V4-615-2 (Q-V4-603-4). Trước khi bỏ ghi chú duyệt (D-71) D-23 là 4,45%: ghi chú cao bằng hàng lọc thứ hai của prototype nên che lệch; sau khi bỏ, lưới lệch lên một hàng. |
| DV-V4-615-8 | D-36, D-37, D-39, D-41 | 2,1 – 21,0% / 6,2 – 17,6% | Bot tương tác: app có hàng "Tắt khẩn cấp / Ẩn tin bot" (bot-emergency, TIP-V2-5xx) và ô thứ 4 "Chờ lịch / Đang chạy"; prototype v4 không có. Nhãn "Chế độ tự động 100%" của prototype vs "Chế độ tự động". Giữ chức năng dừng khẩn cấp (an toàn vận hành). |
| DV-V4-615-9 | D-66 → D-75 @390; D-67, D-68 @1440; D-70 | 0,2 – 16,4% / 10,4 – 66,1% | Cài đặt: app có 9 mục (thêm "Đăng nhập & bảo mật" D-33 và "Ngôn ngữ") — prototype v4 7 mục; ở 390 danh sách mục cao hơn 2 dòng nên mọi nội dung lệch xuống (DV-G6a-1). Danh mục lĩnh vực: prototype 32 mục với cột "Áp dụng cho" (Dự án / Doanh nghiệp / Nhóm ngành mạng lưới), app 14 mục chỉ dự án. Email chào mừng: bỏ khối mật khẩu tạm (D-47). |
| DV-V4-615-10 | D-42 → D-45, D-50, D-87 @390 | 0,2 – 0,4% / 11,7 – 36,0% | Admin Sự kiện @390: đã sửa lưới ô thống kê và khối Sắp diễn ra (21,6 → 11,7% ở D-43); phần còn lại là thẻ "Sự kiện tiếp theo" của prototype giữ 2 cột ảnh | nội dung ở 390 (nội dung bị ép hẹp) — app xếp dọc để đọc được. |
| DV-V4-615-11 | D-82 @390, D-80 @390, D-74 @390 | 10,33 / 5,88 / 8,06% | Như DV-V4-615-9 (danh sách mục Cài đặt dài hơn) và DV-V4-611-3 (thanh lọc Thành viên) ở nền phía sau. |
| DV-V4-615-12 | P-60, P-76, P-77 @390; D-89 @1440; D-32; D-83 | P-60 0,30 / 5,25%; P-76 1,51 / 3,64%; D-89 3,14 / 1,48%; D-32 54,5 / 84,4%; D-83 85,77% | P-60 / P-76 / P-77: ảnh đại diện thanh trên (DV-V4-615-4), nhãn lĩnh vực mẫu ("Chuyển đổi số & AI" của danh mục v4 vs "AI / SaaS" — DV-V4-615-9) và số dự án Khám phá (prototype v4 11, MSW 6). D-89: hộp gán nhóm khớp; nền Thành viên lệch như DV-V4-611-3. D-32: giữ DV-G4c-1 (trình xem chat chỉ đọc). D-83: giữ DV-V2-307-11 (route `/first-password`) trên nền màn đăng nhập v4 (DV-V4-615-1). |

## V4 — TIP-V4-617 (27/10/2026) — Auth theo prototype v4 (D-89)

Đo `PARITY_IDS='A-*,P-0*,P-100,P-101,P-102'` trên nhánh `feature/TIP-V4-617-auth-v4` (MSW), không mask thêm, không nới ngưỡng, không sửa ảnh prototype. **Mọi A-xx đo được ≤ 3% ở cả 1440 + 390** (cao nhất A-06 @390 1,03%). SHA sửa ghi ở completion `TIP-V4-617-completion.md`.

| DV | Trạng thái | Số mới (1440 / 390) |
|---|---|---|
| DV-V4-615-1 (A-01 → A-04, A-06, A-08, A-10, A-25 → A-29) | **đã sửa** (V4-617): khung ảnh nền, hero, thẻ form, chỉ Google SSO, chân trang cờ | A-01 0,16 / 0,32 · A-02 0,19 / 0,40 · A-03 0,16 / 0,33 · A-04 0,20 / 0,33 · A-06 0,30 / 1,03 · A-08 0,16 / 0,35 · A-10 0,07 / 0,17 · A-25 0,07 / 0,15 · A-26 0,12 / 0,32 · A-27 0,07 / 0,19 · A-28 0,16 / 0,34 · A-29 0,23 / 0,40 |
| DV-V4-607-1 (A-12, A-16 → A-18, A-20 → A-23, A-31, A-32) | **đã sửa** (V4-617): form đăng ký v4 (bỏ vai trò / MST / nhóm → popup khai báo), hộp OTP | A-12 0,08 / 0,18 · A-16 0,07 / 0,00 · A-17 0,13 / 0,27 · A-18 0,11 / 0,25 · A-20 0,11 / 0,33 · A-21 0,14 / 0,28 · A-22 0,14 / 0,20 · A-23 0,14 / 0,28 · A-31 0,13 / 0,32 · A-32 0,11 / 0,25 |
| DV-V2-403-1 (A-17, A-20) | **đã sửa** (V4-617, D-89): chữ lỗi tại ô chỉ cho trình đọc màn hình (vẫn `aria-invalid` + `aria-describedby` + toast + focus), không cuộn trang | A-17 0,13 / 0,27 · A-20 0,11 / 0,33 |

Không đo được — lý do mới (cột "Không đo được" trong `results.md`):

- A-07: prototype v4 lỗi — chọn English không dịch màn đăng nhập (chỉ đổi nhãn nút) → không có ảnh chuẩn; i18n app kiểm ở e2e `i18n.spec`.
- A-09, A-13, A-14, A-15, A-19: trạng thái đã bỏ ở cả hai bên (D-89: chỉ Google; form đăng ký không còn MST / vai trò / nhóm — đo ở popup khai báo P-100 → P-102).
- A-05, A-11, A-24, A-30: giữ lý do cũ (prototype không có lối vào / kiểm bằng test hành vi).

Đổi chung kéo theo (ảnh hưởng mọi form có lỗi tại ô, BUG-022): `FieldError` mặc định ẩn chữ (chỉ trình đọc màn hình), `focusFirstInvalid` không cuộn trang. Các DV cùng loại DV-V2-307-14 (D-29, P-74), DV-V4-601-2 / DV-V4-605-2 (P-81, P-82) sẽ đo lại ở TIP-V4-623.


## V4 — TIP-V4-618 (27/10/2026) — Shell, avatar, Dashboard, Chat, Hồ sơ theo prototype v4 (D-89)

Đo `PARITY_IDS='P-*'` trên nhánh `feature/TIP-V4-618-shell-v4` (MSW, xếp chồng trên V4-617), không mask thêm, không nới ngưỡng, không sửa ảnh prototype. SHA ở `TIP-V4-618-completion.md`.

| DV | Trạng thái | Số mới (1440 / 390) |
|---|---|---|
| DV-V4-615-4 (Chat @390, Hồ sơ, Bảo mật) | **đã sửa** (V4-618): avatar chữ viết tắt #1677FF (topbar, menu, tin của tôi, thẻ hồ sơ), thẻ hồ sơ 2 số, tab "Gói & thanh toán" (API `GET /me/membership/periods`), liên kết chỉ Google; phòng chat không còn tin "đã bị ẩn" / tin bot seed | P-28 0,54 / 1,23 · P-30 0,14 / 0,56 · P-34 0,80 / 2,57 · P-36 0,54 / 1,36 · P-37 0,41 / 1,19 · P-38 0,41 / 1,19 · P-39 0,35 / 1,06 · P-89 0,07 / 0,11 · P-90 0,07 / 0,11 · P-91 0,73 / 1,74 · P-92 0,03 / 0,33 · P-93 0,04 / 0,15 · P-94 0,04 / 0,27 |
| DV-V4-612-1 (P-45, P-121 @390) + Q-V4-612-3 | **đã sửa** (V4-618): danh sách tin giữ ở cuối khi phòng tải lại; tin thành viên bị ẩn giữ ghim (câu giữ chỗ), cảm xúc và nhãn "Đã ghim" như prototype — không lộ nội dung (D-77); tin bot ẩn vẫn xoá hết (REQ-141) | P-45 1,25 / 2,98 · P-121 1,25 / 2,98 |
| P-01 Dashboard (V4-617 ghi 72 / 75%) | **đã sửa** (V4-618): chỉ lời chào + "Hướng dẫn bắt đầu" | P-01 0,02 / 0,00 |

Còn > 3%, giữ nghiệp vụ D-xx (goal: "nghiệp vụ tiền / quyền / kiểm duyệt giữ D-xx") — **chờ owner chốt**, không đổi thành `unreachable`:

| DV | Màn | 1440 / 390 | Lý do |
|---|---|---|---|
| DV-V4-618-1 (= DV-V4-607-2) | P-05 mail chào mừng | 4,52 / 4,71% | Prototype v4 hiện dòng "Mật khẩu tạm OPC-…" + "Vui lòng đổi mật khẩu…". D-47 / D-30: người dùng tự đặt mật khẩu, không gửi mật khẩu qua email (bảo mật). Hiện mật khẩu giả là làm giả dữ liệu thật. Q-V4-618-1. |
| DV-V4-618-2 (thay P-41) | P-40 @390 bảng Thành viên | 1,46 / 4,31% | Prototype v4 còn khối "Chờ duyệt vào nhóm" cho chủ nhóm (kịch bản đã từ chối hết 2 yêu cầu bằng giao diện để còn "Không có yêu cầu nào đang chờ."). D-71: bỏ hẳn duyệt vào nhóm (quyền). Thêm: nhãn "Điều phối" (prototype) vs "Giảng viên" (D-56 đổi tên vai trò). Q-V4-618-2. |

Thuộc TIP sau (chưa sửa ở V4-618): P-17 → P-27, P-46 → P-48 (Cộng đồng 90 nhóm, rail chat "NHÓM KHÁC 87 nhóm" → TIP-V4-619); P-55 → P-76, P-104 (Dự án → TIP-V4-620); P-81, P-82, P-105 (→ TIP-V4-623).

## V4 — TIP-V4-619 (27/10/2026) — Cộng đồng 90 nhóm Portal + Admin (D-89)

Đo trên nhánh `feature/TIP-V4-619-community-90` (MSW, xếp chồng trên V4-618), không mask thêm, không nới ngưỡng, không sửa ảnh prototype. SHA ở `TIP-V4-619-completion.md`.

| DV | Trạng thái | Số mới (1440 / 390) |
|---|---|---|
| DV-V4-603-3, DV-V4-615-2 (P-17 → P-22, P-26, P-27, P-48) | **đã sửa** (V4-619): 90 nhóm = 34 Nhóm tỉnh chung + 56 Nhóm ngành (schema `groups.kind / industry / parent_id`, seed native + MSW theo `IND` của prototype), dải "Nghị quyết 86/NQ-CP · 05/4/2026", ô "chờ duyệt" (luôn 0 — D-71) | P-17 0,31 / 0,43 · P-18 0,18 / 0,33 · P-19 0,27 / 0,43 · P-20 0,27 / 0,37 · P-21 0,03 / 0,14 · P-22 0,30 / 1,30 · P-26 0,31 / 0,40 · P-27 0,31 / 0,42 · P-48 0,31 / 0,63 |
| DV-V4-603-4 (P-23) | **đã sửa** (V4-619): nền Cộng đồng v4 + ô đồng ý vẽ như prototype (hộp 20px co theo flex) | P-23 0,15 / 0,01 |
| DV-V4-603-5, DV-V2-307-15 (P-46) | **đã sửa** (V4-619): thẻ xem trước nhóm chưa tham gia không còn ô đồng ý như prototype v4; "Tham gia nhóm" mở form tham gia ở Cộng đồng (`/community?join=`) — ô đồng ý nội quy + phí không hoàn lại vẫn bắt buộc ở đó (NR-R02) | P-46 0,14 / 0,44 |
| DV-V4-615-7 (D-23 → D-31, D-86) | **đã sửa** (V4-619): Admin lọc "Tất cả loại / Nhóm tỉnh / Nhóm ngành" + "Tất cả ngành", cột nhóm ghi "Nhóm tỉnh chung" / "Nhóm ngành · …", drawer "Loại nhóm" + "Ngành" (API tạo / sửa nhận `kind`, `industry`; server gắn nhóm tỉnh cha); hàng tiêu đề bảng ẩn ở 390 như prototype. "Quyền tham gia" (Công khai / Cần duyệt) không làm — D-71, prototype hiện cả hai lựa chọn nhưng nằm dưới màn hình đầu ở 390 và trong vùng đo vẫn ≤ 3% | D-23 0,08 / 0,07 · D-24 0,08 / 0,12 · D-25 0,08 / 0,06 · D-26 0,08 / 0,11 · D-27 0,08 / 0,69 · D-28 1,10 / 1,35 · D-29 1,28 / 1,72 · D-30 1,16 / 1,49 · D-31 0,09 / 0,22 · D-86 2,74 / 1,95 |
| P-24, P-25 | giữ `unreachable` cũ (D-71: không còn nhánh "Cần duyệt") | — |

P-47 0,79 / 2,30 đạt. Còn > 3% ngoài phạm vi TIP này: D-89 @1440 3,14% (hộp gán nhóm ở màn Thành viên — nền trang cuộn khác, → TIP-V4-623), D-37 6,82 / 6,96% (Bot · Persona → TIP-V4-622).

## V4 — TIP-V4-620 (27/10/2026) — Dự án OPC v4 Portal + Admin (D-89)

Đo trên nhánh `feature/TIP-V4-620-projects-v4` (MSW, xếp chồng trên V4-619), không mask thêm, không nới ngưỡng, không sửa ảnh prototype. Commit: `2f253e3e` (dữ liệu v4), `1c8e1e54` (trang Portal), `debcdb5e` (điểm nổi bật / hình ảnh / mốc), `d1ffef9b` (Admin).

| DV | Trạng thái | Số mới (1440 / 390) |
|---|---|---|
| DV-V4-615-3 (P-55, P-56, P-58, P-59, P-73 → P-75) + P-57 | **đã sửa** (V4-620): trang Dự án OPC v4 — hero "Sáng kiến & Giải pháp cho địa phương" + ô tìm + 3 số (dự án công bố / đơn vị tham gia / kết nối), lưới "Nhóm ngành giải pháp địa phương", cột lọc trái (Đối tượng / Địa phương / Giai đoạn 5 mức / Nhu cầu kết nối), thẻ dự án v4, sắp xếp "Nhiều lượt xem" (API `sort=view`, `projects.view_count`), 15 dự án seed theo prototype. P-57 bỏ `unreachable` (lọc "Có mô hình thử nghiệm" + "Nhiều lượt xem") | P-55 0,05 / 0,03 · P-56 0,05 / 0,13 · P-57 0,11 / 0,38 · P-58 0,02 / 0,02 · P-59 0,05 / 0,12 · P-60 0,03 / 0,05 · P-73 0,29 / 0,43 · P-74 0,52 / 1,07 · P-75 0,11 / 2,28 · P-76 0,29 / 0,67 · P-77 0,04 / 0,08 · P-78 0,09 / 0,79 |
| DV-V2-307-8, DV-V4-610-2, DV-V4-610-3, DV-V2-109-1 (P-62 → P-68) | **đã sửa** (V4-620): "Vấn đề / Giải pháp / Thị trường" (`projects.highlights`), "Hình ảnh sản phẩm" (`projects.gallery`), mốc cập nhật (`projects.milestones`) là dữ liệu thật của dự án (seed demo theo prototype, không bịa cho dự án không có — BUG-038 giữ); dải liên hệ có Địa chỉ (`projects.contact_address`, chủ dự án tự công khai — BUG-016 giữ) | P-62 0,90 / 1,80 · P-63 0,39 / 1,58 · P-64 0,38 / 1,62 · P-65 0,35 / 0,98 · P-66 0,31 / 0,69 · P-67 0,43 / 0,81 · P-68 1,82 / 2,33 |
| DV-V4-615-5 (D-57) + D-53 / D-54 | **đã sửa** (V4-620): Admin mở tab "Đang hiển thị" mặc định (thứ tự tab như v4), 11 dự án hiển thị / 2 trang × 10, nhãn "Đang phát triển"; D-53 / D-54 bỏ `unreachable` (prototype vẫn có dạng danh sách); hàng tiêu đề bảng ẩn ở 390 | D-51 0,10 / 0,21 · D-52 0,14 / 0,43 · D-53 0,20 / 0,17 · D-54 0,18 / 0,23 · D-55 0,04 / 0,04 · D-56 0,10 / 0,28 · D-57 0,14 / 0,11 · D-92 0,00 / 0,00 |
| DV-V4-604-1, DV-V4-610-1 (P-69 → P-72) | giữ `unreachable` — chính prototype lỗi: `<sc-if pjTabCmt>` không đóng trước khối tab Gọi vốn / Dự án liên quan (index.html 1244–1321), bấm tab không hiện gì. Hành vi kiểm ở `e2e/behavior/projects.spec.ts` + `fundraising.spec.ts` | — |
| P-61 | giữ `unreachable` (TK demo duy nhất của prototype sở hữu p10) | — |

Còn > 3%, giữ nghiệp vụ tiền D-xx — **chờ owner**, không đổi thành `unreachable`:

| DV | Màn | 1440 / 390 | Lý do |
|---|---|---|---|
| DV-V4-610-4 | P-104 @390 | 0,63 / 15,94% | Nội dung CK prototype `OPC M1 GV U1792…` (mã ghép id, 2 dòng); app dùng mã GV 6 số `OPCHUB GV000001` (D-31 / BR-04 — đối soát tiền) nên hộp ngắn hơn 1 dòng. Q-V4-620-3. |

## V4 — TIP-V4-621 (27/10/2026) — Admin Tổng quan "Luồng hệ thống" (D-89)

Đo trên nhánh `feature/TIP-V4-621-overview-flow` (MSW, xếp chồng trên V4-620), không mask thêm (giữ mask biểu đồ cũ DV-V2-307-4 — số thật), không nới ngưỡng, không sửa ảnh prototype. Commit `8ce626a6` (API), `edaca419` (Admin).

| DV | Trạng thái | Số mới (1440 / 390) |
|---|---|---|
| DV-V4-615-6 (thay DV-V4-606-3 / DV-V4-614-2) — D-01 → D-05, D-81 | **đã sửa** (V4-621): khối "Luồng hệ thống — Số liệu trực tiếp từ các module" (5 thẻ: Thành viên đã đóng phí x / y, Gian hàng đang hiển thị, Nhu cầu đang mở, Dự án chờ duyệt — "Cần làm" khi còn chờ, Nhóm cộng đồng; bấm thẻ mở module). `GET /admin/overview` thêm `flow`, `paid` (thành viên đã kích hoạt phí + đóng phí trong tháng), `events.upcoming`. Thẻ số v4: Thành viên · Cộng đồng · Thành viên mới (Tháng MM/YYYY) · Sự kiện (n sắp diễn ra); lưới thẻ 2 cột ở 390 như prototype | D-01 0,16 / 0,31 · D-02 0,16 / 0,31 · D-03 1,86 / 1,21 · D-04 1,12 / 1,53 · D-05 1,96 / — · D-06 — / 0,06 · D-81 0,16 / 0,31 |

Số "1 / 8" của prototype (chỉ TK demo `m1` đã đóng phí) khác MSW "6 / 8" (đếm từ dữ liệu phí giả của màn Phí thành viên — 6 TK đang hiệu lực); vẫn ≤ 3%, không làm giả số (Q-V4-621-1).

## V4 — TIP-V4-622 (27/10/2026) — Admin Cài đặt / Bot / Sự kiện / danh mục (D-89)

Đo trên nhánh `feature/TIP-V4-622-settings-bots-events` (MSW, xếp chồng trên V4-621), không mask thêm, không nới ngưỡng, không sửa ảnh prototype. Commit `3bb04800`, `a7862e5a`, `3864fa86`, `c5520695`, `b2ff0f8b`, `951da040`.

| DV | Trạng thái | Số mới (1440 / 390) |
|---|---|---|
| DV-V4-615-8 — D-36, D-37, D-39, D-41 | **đã sửa** phần giao diện: nhãn "Chế độ tự động 100%"; nút "Tắt khẩn cấp / Ẩn tin bot" (REQ-141, D-51 — giữ vì an toàn vận hành) nằm cuối hàng tab ở 1440, cuối thẻ ở 390 (không đè tab); MSW chạy nhịp bot đầu sau 10 giây như `_simTick` | D-36 0,36 / 2,78 · D-37 0,24 / 1,72 · D-38 0,06 / 0,12 · D-39 0,31 / 2,78 · D-40 0,06 / 0,15 · D-41 0,49 / **5,58** |
| DV-V4-622-1 (còn lại của DV-V4-615-8) — D-41 @390 | **giữ, có lý do (D-50 / REQ-141)**: prototype còn ô "Chờ duyệt 1" và hội thoại "Chờ duyệt" với nút "Bỏ / Duyệt & đăng" — D-50 bỏ hàng chờ duyệt (bot tự động 100%), app hiện "Chờ lịch / Đang chạy" + nút "Dừng"; thêm thanh khẩn cấp cuối thẻ (REQ-141). 1440 đạt vì cùng chiều cao | 0,49 / 5,58 |
| DV-V4-615-9 — Cài đặt D-66 → D-75 | **đã sửa**: danh mục 32 mục + phạm vi "Nhóm ngành mạng lưới" (Q-V4-615-5); ở 390 ẩn 2 mục "Đăng nhập & bảo mật", "Ngôn ngữ" khỏi danh sách (vẫn vào được qua `?tab=` và ở 1440 — D-33); bảng vai trò / TK quản trị / nhật ký dạng thẻ ở 390 theo `[data-m="tbl"]`; ảnh đại diện TK quản trị (migration `20261027150000_v4_admin_avatar`); nhãn "Mời, thu hồi quyền"; nút ngôn ngữ thanh trên cùng Admin có viền như prototype | D-66 0,27 / 0,33 · D-67 0,24 / 0,19 · D-68 0,24 / 0,19 · D-69 2,64 / 2,98 · D-71 0,22 / 0,27 · D-72 0,22 / 0,26 · D-73 0,26 / 0,28 · D-74 0,70 / 1,67 · D-75 0,39 / 0,71 |
| DV-D47-1 — D-70 Email chào mừng | **giữ, có lý do (D-47, bảo mật)**: prototype có công tắc + khối "Tài khoản & mật khẩu truy cập / Mật khẩu tạm OPC-…" trong mail chào mừng; D-47 bỏ hẳn (không gửi mật khẩu qua email) — Q-V4-622-3 | 16,40 / 15,66 |
| DV-V4-615-10 — Sự kiện D-42 → D-47, D-50, D-87 | **đã sửa**: thẻ Sự kiện tiếp theo, ô thống kê, hàng tiêu đề bảng ẩn ở 390; bấm ảnh bìa / nhãn trạng thái / tiêu đề thẻ mở Chi tiết như prototype `e.list` (kịch bản D-44 bấm "Đã đầy" ở cả hai bên) | D-42 0,23 / 0,37 · D-43 0,26 / 0,39 · D-44 0,24 / 0,38 · D-45 0,23 / 0,37 · D-46 0,08 / 0,12 · D-47 0,04 / 0,00 · D-50 0,28 / 0,42 · D-87 0,43 / 0,40 |
| DV-V4-615-11 — D-74 @390 (nền Cài đặt) | **đã sửa**: hộp thoại tạo TK quản trị theo `adOpen` (thân 20/24, chữ line-height mặc định) | D-74 0,70 / 1,67 |

## V4 — TIP-V4-623 (27/10/2026) — Affiliate + các màn 3–5% còn lại (D-89)

Đo trên nhánh `feature/TIP-V4-623-affiliate-rest` (MSW, xếp chồng trên V4-622), toàn bộ parity một lượt (413 pass / 31 fail / 76 skip; 3 màn fail do chạy chồng — P-30 @390, D-35 @390, D-74 @1440 — đo lại riêng đều đạt 0,54 / 0,24 / 0,70%). Không mask thêm, không nới ngưỡng, không sửa ảnh prototype. Commit `7d8e72af`, `276a499f`, `8bcf79bc`, `3276be3e`, `4aa1a2b6`.

| DV | Trạng thái | Số mới (1440 / 390) |
|---|---|---|
| DV-V4-611-3 — thanh lọc Thành viên (D-07 → D-17) | **đã sửa** (`7d8e72af`): 7 ô lọc v4 (Nhóm, Vai trò khi đăng ký, Phí, Trạng thái, Hồ sơ, Ngày đăng ký, Khởi đầu) + "N kết quả" + "Xóa lọc (n)", lọc thật ở server (`EXISTS` trên khoá / index sẵn có) và MSW | D-08 2,83 / 2,71 · D-09 0,99 / 2,62 · D-17 0,45 / 1,14 · D-12 @390 0,93 |
| DV-V4-611-2 / -3 / -4 (còn lại) — D-07 @390, D-10 @390, D-11, D-12 @1440, D-13 @390, D-14 @390, D-82 @390, D-89 @1440, D-96, D-97 | **giữ, có lý do (Q-B62-18 đã chốt)**: chỉ lệch thứ tự dòng — server sắp `created_at DESC, id DESC` (keyset / deferred join), prototype theo thứ tự mảng mẫu m1 → m8; m7 "Chờ xác minh" + 2/8 (DV-G4a-4, D-85 cần ảnh đại diện). Đổi thứ tự cho khớp = sửa dữ liệu ngày đăng ký (làm giả) hoặc bỏ sắp theo ngày. | D-07 1,61 / 3,48 · D-10 2,75 / 3,53 · D-11 3,73 / 5,00 · D-12 3,07 / 0,93 · D-13 1,80 / 3,65 · D-14 1,64 / 4,98 · D-82 1,46 / 3,29 · D-89 3,07 / 1,75 · D-96 3,69 / 5,33 · D-97 3,69 / 5,32 |
| Gian hàng Admin (D-93 → D-95) | **đã sửa** (`276a499f`): bảng theo thứ tự tạo như `aAll` (index `(status, created_at, id)`, seed tạo theo thứ tự prototype) | D-93 0,28 / 2,87 · D-94 0,02 / 0,02 · D-95 0,07 / 0,09 |
| P-79 → P-83 form tư vấn | **đã sửa** (`8bcf79bc`): khoảng cách khối Liên hệ / Nhu cầu | P-79 0,06 / 0,00 · P-81 0,03 / 0,04 · P-82 0,56 / 0,50 |
| DV-V4-602-3 — D-85-CUS @390 | **đã sửa phần lớn** (`3276be3e`): chữ bảng khách hàng line-height tự nhiên như prototype, số TK nhóm 4 chữ số ("2468 1357"), ngày chi trả "30/9/2026". Còn lại: hàng tiêu đề prototype cao cố định 38px làm 3 dòng chữ chồng lên dòng đầu (lỗi hiển thị của prototype — app không chồng chữ) và ô "8 / trang" (REQ-312 đổi cỡ trang). | 1,71 / **5,50** (trước 10,91) |
| DV-V2-307-11 — D-83 Đổi mật khẩu lần đầu | **đã sửa** (`4aa1a2b6`): hộp thoại nổi trên màn đăng nhập (mặt nạ 45%) như `cpOpen`; route `/first-password` giữ phiên hạn chế SEC-R01, form đăng nhập phía sau `inert` | **1,78** (trước 12,14) |
| DV-V4-602-1 — D-84-AFF | **giữ, có lý do (AF-R01, dữ liệu thật)**: 62 đại lý tự tạo từ phí đã đóng của dữ liệu demo so với 6 dòng AF0 của prototype; khớp = xoá đại lý thật hoặc làm giả. | 24,12 / 29,36 |
| DV-V4-602-2 — D-84-POL @390 | **giữ, có lý do (SRS §20.6 / §20.7 `affiliate_policy.terms`)**: ô "Điều khoản chương trình" + nút Lưu nằm dưới chỗ prototype kết thúc; 1440 = 2,01% đạt. | 2,01 / 13,48 |
| DV-V4-610-4 — P-104 @390 | **giữ, có lý do (D-31 / BR-04, tiền)**: mã CK `OPCHUB GV000001` 1 dòng vs prototype mã ghép id 2 dòng. | 0,63 / 15,94 |
| P-105 @1440 Khám phá Gian hàng | **giữ, chờ owner (Q-V4-608-5)**: prototype có nút tim, lượt xem (`hval` giả từ id), nhãn "Nổi bật" (cứng 3 id) / "Cung cấp thiết bị" — chưa có nguồn dữ liệu (bảng `stores` không có lượt xem / yêu thích); 390 = 0,82% đạt. | 3,64 / 0,82 |
| P-40 @390 Chat · bảng Thành viên | **giữ, có lý do (D-71, D-56)**: prototype còn mục duyệt yêu cầu tham gia (D-71 bỏ duyệt tham gia) và nhãn "Điều phối" (D-56 đổi "Giảng viên"). | 1,45 / 4,31 |
| DV-G2a-1 — P-05 mail chào mừng | **giữ, có lý do (D-30 / D-47)**: bỏ khối "Mật khẩu tạm" trong mail. | 4,52 / 4,71 |

## V4 — TIP-V4-624 (27/10/2026) — đo lại toàn bộ + nghiệm thu (D-89)

Đo trên nhánh `feature/TIP-V4-624-acceptance` (MSW, cổng 3020 / 3021). Không mask thêm, không nới ngưỡng, không sửa ảnh prototype.

| DV | Trạng thái | Số mới (1440 / 390) |
|---|---|---|
| P-105 @1440 Khám phá Gian hàng (Q-V4-608-5, Q-V4-623-2) | **đã sửa** (`0940865b`): lượt xem chi tiết (`stores.view_count`, chủ tự xem không tính, sort "Xem nhiều"), tim yêu thích theo từng người (`store_favorites`, `PUT /stores/:id/favorite`), "Nổi bật" do Admin gắn (`PUT /admin/stores/:id/featured`, quyền `stores.action`, ghi audit), tag loại hình (`legal_form`). Seed demo theo prototype (`hval`, 3 id Nổi bật). | **0,10 / 0,14** (trước 3,64 / 0,82) |
| DV-V4-602-3 — D-85-CUS @390 (Q-V4-623-3) | **đã sửa** (`9d7587d3`): hàng tiêu đề lưới cao 38px (viền nằm trong), chữ tiêu đề 12px như prototype; ẩn hàng đo cột của bảng trong lưới 2 cột; gạch chân tab chi tiết đè lên viền thanh tab (`margin-bottom: -1px`). e2e kiểm chiều cao tiêu đề và vị trí dòng đầu. | **1,52 / 1,32** (trước 1,71 / 5,50) |
| DV-V4-611-2 / -3 / -4 — thứ tự dòng Thành viên (D-07 @390, D-10 @390, D-11, D-12 @1440, D-13 @390, D-14 @390, D-82 @390, D-89 @1440, D-96, D-97) | **đã sửa** (`f7663fa2`, D-90 owner chốt Q-V4-623-1 phương án A): danh sách theo mã TV tăng dần như prototype (m1 → m8 = TV000001 →), server `ORDER BY member_code, id` + index covering partial, MSW cùng thứ tự. Int + e2e MSW / server kiểm thứ tự và trang 2. | D-07 0,18 / 0,05 · D-10 0,17 / 0,05 · D-11 0,18 / 0,05 · D-12 0,01 / 1,72 · D-13 0,10 / 0,00 · D-14 0,18 / 0,05 · D-82 0,17 / 0,10 · D-89 0,01 / 0,00 · D-96 0,35 / 0,06 · D-97 0,35 / 0,06 |
| Các DV còn lại sau D-90 | owner chốt lại 27/10/2026 → **D-91** ("1A 2A 3A 4A 5A 6B 7B") | xem dưới |
| D-84-POL @390 — DV-V4-602-2 (SRS §20.6) | **đã sửa** (D-91 (2)): ô "Điều khoản chương trình" thành nút "Sửa điều khoản" mở hộp thoại (vẫn thuộc form, lưu cùng chính sách, lỗi tự mở hộp); khoảng cách ô / input 36px theo prototype. Unit + e2e (360 / 390 / 1440). | 1,02 / **2,42** (trước 2,01 / 13,48) |
| D-32 — DV-G4c-1 | **unreachable có lý do** (D-91 (3)): prototype "Xem chat" là no-op (guard `session==="admin"&&screen==="portal"` trả về admin) → không có màn đích. App giữ trình xem chỉ đọc, kiểm ở e2e admin-groups. | không đo |
| D-41 @390 — DV-V4-622-1 (REQ-141) | **đã sửa** (D-91 (4)): ≤ 767px "Tắt khẩn cấp / Ẩn tin bot" thu vào nút ⋯ ở góc thẻ Bot (chức năng + hộp xác nhận giữ nguyên); hội thoại đăng đủ lượt hiện "Đã đăng" như prototype, dừng giữa chừng giữ tiến độ. Unit + e2e. | 0,39 / **0,69** (trước 5,58 @390) |
| D-70 / P-05 — DV-G2a-1 (D-47) | **đã sửa** (D-91 (5)): khối "Tài khoản & thông tin truy cập" như prototype (URL, Tên đăng nhập, dòng "Mật khẩu: Do bạn tự đặt") + ghi chú "Vì bảo mật, OPC Hub không gửi mật khẩu của bạn qua email." — **không có giá trị mật khẩu** (D-47). Cờ `showAccess` (mặc định bật, mẫu cũ parse được), mail server cùng khối. Unit server + e2e Admin / Portal. | D-70 0,41 / 0,55 (trước 16,33 / 15,56) · P-05 0,25 / 0,46 (trước 4,52 / 4,71) |
| D-84-AFF — DV-V4-602-1 (AF-R01) | **giữ — owner chấp nhận ngoại lệ** (D-91 (1), Q-V4-624-1 = c, 27/10/2026): owner chọn A (demo 6 đại lý) nhưng chưa làm — 51 khách AF0 đã đóng phí, AF-R01 bắt buộc tự thành đại lý (worker `AffiliateBackfillService` tạo lại); làm A = bỏ đóng phí của 51 khách hoặc bỏ AF-R01 cho demo (đổi số liệu tiền / hoa hồng của kịch bản). Q-V4-624-1. | 24,12 / 29,36 |
| P-104 @390 (D-31), P-40 @390 (D-71 / D-56) | **giữ — owner chấp nhận ngoại lệ** (D-91 (6), (7), 27/10/2026). | 15,94 · 4,31 |
