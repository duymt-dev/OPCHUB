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
