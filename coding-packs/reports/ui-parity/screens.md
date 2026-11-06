# UI parity — danh mục trạng thái màn hình

> **Trạng thái: PM đã chốt toàn bộ mâu thuẫn (16/10/2026, D-26 → D-45).** Danh mục G1 chờ PM tick cuối.
> 205 trạng thái: Auth 30 (A-xx), Portal 95 (P-xx), Admin 80 (D-xx). 8 trạng thái không tái hiện được bằng thao tác (ghi rõ trong dòng).
> Mỗi dòng có chuỗi thao tác tái hiện trên prototype (`pnpm --filter @opchub/e2e proto`, cổng 4800) — dùng làm kịch bản cho `e2e/parity/screens.ts`.
> Route trong cột "Suggested route" áp theo D-39: chỉ chi tiết sự kiện, dự án có URL; modal khác không có URL. Mâu thuẫn prototype ↔ rule: đã chốt, bảng ở cuối file.
> Đã đo: A-01, D-01 — xem [results.md](results.md).

Source: `docs/spec/index.html` (template `<x-dc>` + `<script data-dc-script>`, copy at `D:/tmp_proto.js`).
Method: a static scan of every `data-screen-label`, `sc-if` flag (298 flags) and `onClick`/`onChange` binding (481), with each one traced to its setter in the script. The key flows (login, wrong login, SSO, register + OTP, admin login, notifications, services popup, mobile burger) were also run in headless Chromium (Playwright 1.64, `file:///…/index.html`).

## Ground rules for reproducing

- **Start:** open `index.html` and wait about 1.5 s. Initial state: `screen='auth'`, `authMode='login'`, `lang='vi'`.
- **LOGIN-USER:** under "Tài khoản dùng thử – bấm để điền", click the card **"Thành viên (đã thanh toán phí)"**. This fills `an.nguyen@mediasoft.vn` / `User@2026`. Then click **"Đăng nhập"** (`getByRole('button',{name:'Đăng nhập',exact:true})`). Result: Portal · Dashboard and the toast "Xin chào, đăng nhập User Portal" (2.2 s; wait about 2.6 s before taking a screenshot).
- **LOGIN-ADMIN:** click the card **"Quản trị viên (Admin)"**, then **"Đăng nhập"**. Result: Admin · Tổng quan and the toast "Đăng nhập Admin Dashboard".
- **Session guard (`componentDidUpdate`):**
  - With no session, any `screen≠auth` is bounced back to login.
  - `session=user` is forced off `admin`.
  - `session=admin` is forced off `portal`.
  - Every admin action that sets `screen:'portal'` is therefore a no-op (xem bảng "Mâu thuẫn — đã chốt", C-03).
- **Mobile:** below 768 px (390 px), the sidebar becomes a drawer opened by the burger `[title="Menu"]`.
  - The mini-sidebar toggle (`title="Thu gọn sidebar"` / `"Mở rộng sidebar"`) is desktop-only. It persists in `localStorage['opc-sb-mini']`; clear it before each run.
- **Portal sidebar:** Dashboard · Cộng đồng · Chat nhóm (badge 18, hard-coded) · Sự kiện sắp tới · Dự án OPC · Gói dịch vụ.
- **Admin sidebar ("QUẢN TRỊ"):** Tổng quan · Thành viên · Phí thành viên · Nhóm cộng đồng (badge 4 = reports) · Bot tương tác · Nội dung & Sự kiện · Dự án (badge 2) · Nhà đầu tư · Dịch vụ (badge 1) · Cài đặt & Phân quyền.
- **Viewports column:** "1440, 390" means the state renders at both viewports.

---

## A. Auth (`data-screen-label="Auth"`)

| ID | Area | Screen / state | Reproducible action sequence | Suggested route | Viewports |
|---|---|---|---|---|---|
| A-01 | Auth | Đăng nhập (mặc định): hero on the left; on the right "Chào mừng trở lại", tabs Đăng nhập/Đăng ký, Email, Mật khẩu ("Hiện"), "Ghi nhớ đăng nhập", "Quên mật khẩu?", "hoặc tiếp tục với" + Google/Facebook/LinkedIn/ChatGPT/Gemini/DeepSeek, demo-account cards | Open page | `/login` | 1440, 390 |
| A-02 | Auth | Login error: empty fields ("Vui lòng nhập email và mật khẩu") | A-01 → click "Đăng nhập" with no input | `/login` | 1440, 390 |
| A-03 | Auth | Login error: wrong credentials ("Email hoặc mật khẩu không đúng") | A-01 → type `a@b.c` in `input[type=email]`, `x` in `input[type=password]` → "Đăng nhập" (Enter also submits) | `/login` | 1440, 390 |
| A-04 | Auth | Password visible (toggle "Hiện" → "Ẩn") | A-01 → type a password → click "Hiện" | `/login` | 1440, 390 |
| A-05 | Auth | Demo account filled | A-01 → click card "Thành viên (đã thanh toán phí)" or "Quản trị viên (Admin)" | `/login` (dev-only block) | 1440, 390 |
| A-06 | Auth | Language popover "CHỌN QUỐC GIA & NGÔN NGỮ" (10 locales, ✓ on current) | A-01 → click "Tiếng Việt" (top right) | `/login` + popover | 1440, 390 |
| A-07 | Auth | UI switched to English ("Sign in", "Sign up"…) | A-06 → click "English" | `/en/login` or locale cookie | 1440, 390 |
| A-08 | Auth | SSO click: toast "Đang chuyển hướng tới Google…". After 0.9 s it sets portal, but the guard bounces back to login (no session) | A-01 → click "Google" (same for Facebook, LinkedIn) | `/api/auth/sso/google` → `/dashboard` | 1440, 390 |
| A-09 | Auth | SSO via AI provider: toast "Đăng nhập ChatGPT qua tài khoản Google…" (same for Gemini, DeepSeek) | A-01 → click "ChatGPT" | `/api/auth/sso/chatgpt` | 1440, 390 |
| A-10 | Auth | Register: choose type ("Tạo tài khoản OPC Hub", "BẠN ĐĂNG KÝ VỚI TƯ CÁCH", cards Doanh nghiệp / Cá nhân each with "Chọn"). No SSO row | A-01 → tab "Đăng ký" | `/register` | 1440, 390 |
| A-11 | Auth | Register closed: toast "Đăng ký mới đang tạm đóng" | LOGIN-ADMIN → "Cài đặt & Phân quyền" → "Chung" → toggle "Cho phép tự đăng ký" off → avatar menu → "Đăng xuất" → tab "Đăng ký" | `/register` (closed notice) | 1440, 390 |
| A-12 | Auth | Register business, empty ("Đăng ký doanh nghiệp"; "Doanh nghiệp / Tổ chức"; "Đổi loại"; "Mã số thuế *" with placeholder "VD: 0101234567" + "Tra cứu"; Tên doanh nghiệp; Ngành nghề; Quy mô; Người đại diện; Chức vụ; SĐT; Email công ty; Mật khẩu; "Chọn nhóm muốn tham gia") | A-10 → card "Doanh nghiệp" | `/register?type=biz` | 1440, 390 |
| A-13 | Auth | Business: invalid tax code, toast "Mã số thuế gồm 10 hoặc 13 chữ số" | A-12 → type `123` in "VD: 0101234567" → "Tra cứu" | `/register?type=biz` | 1440, 390 |
| A-14 | Auth | Business: tax lookup found ("✓ Đã tìm thấy doanh nghiệp, thông tin được điền tự động"; "Công ty TNHH Giải pháp MediaSoft", rep "Nguyễn Văn An", "6201 – Lập trình máy vi tính", "Ngành nghề đăng ký khác (4)" chips; toast "Đã tra cứu mã số thuế 0101234567 · đã điền ngành nghề") | A-12 → type `0101234567` → "Tra cứu" | `/register?type=biz` | 1440, 390 |
| A-15 | Auth | Business: secondary industry chip removed | A-14 → click "×" on a chip | `/register?type=biz` | 1440, 390 |
| A-16 | Auth | Phone country-code dropdown (VN +84 … BN +673) | A-12 or A-18 → click "+84" | dropdown | 1440, 390 |
| A-17 | Auth | Business validation toasts in order: "Vui lòng nhập mã số thuế" → "Vui lòng nhập tên doanh nghiệp" → "Vui lòng nhập ngành nghề kinh doanh" → "Vui lòng chọn ít nhất 1 nhóm" → "Vui lòng nhập email hợp lệ để nhận mã OTP" | A-12 → click "Đăng ký doanh nghiệp", filling progressively | `/register?type=biz` | 1440, 390 |
| A-18 | Auth | Register personal ("Đăng ký cá nhân"; Họ và tên, Số điện thoại, Email, Mật khẩu + "Nên có chữ hoa, số và ký tự đặc biệt"; "Bạn là": Chuyên gia, Giảng viên, Kỹ sư, Nhà đầu tư, Freelancer, Sinh viên; group chips; SSO row visible) | A-10 → card "Cá nhân" | `/register?type=per` | 1440, 390 |
| A-19 | Auth | Personal: role picked, groups pre-selected and suggested ("Gợi ý", "Đã chọn N nhóm") | A-18 → click "Chuyên gia" | `/register?type=per` | 1440, 390 |
| A-20 | Auth | Personal validation toasts: "Vui lòng chọn vai trò khi tham gia" / "Vui lòng chọn ít nhất 1 nhóm" / "Vui lòng nhập email hợp lệ để nhận mã OTP" | A-18 → "Đăng ký" with nothing chosen | `/register?type=per` | 1440, 390 |
| A-21 | Auth | OTP modal (6 boxes, "Xác nhận & kích hoạt tài khoản", "Chưa nhận được mã? Gửi lại", ×); toast "Đã gửi mã OTP 6 số tới …" | A-19 → type `test@x.vn` in "ban@congty.vn" → "Đăng ký" (business: A-14 + email "lienhe@congty.vn" + group → "Đăng ký doanh nghiệp") | `/register/verify?email=` | 1440, 390 |
| A-22 | Auth | OTP error "Vui lòng nhập đủ 6 chữ số" | A-21 → type `123` in `input[inputmode=numeric]` → "Xác nhận & kích hoạt tài khoản" | `/register/verify` | 1440, 390 |
| A-23 | Auth | OTP resent, toast "Đã gửi lại mã OTP tới …" | A-21 → "Gửi lại" | `/register/verify` | 1440, 390 |
| A-24 | Auth | OTP success: toast "Tài khoản đã kích hoạt · đã gửi email chào mừng tới …". The prototype falls back to login (no session set); the welcome-mail modal appears after the next login (P-05) | A-21 → type `123456` → "Xác nhận & kích hoạt tài khoản" | `/register/verify` → `/community` (intended) | 1440, 390 |
| A-25 | Auth | Back to type selection | A-12 or A-18 → "Đổi loại" | `/register` | 1440, 390 |
| A-26 | Auth | Forgot password form ("← Quay lại đăng nhập", "Quên mật khẩu", Email, "Gửi liên kết đặt lại"; tabs hidden) | A-01 → "Quên mật khẩu?" | `/forgot-password` | 1440, 390 |
| A-27 | Auth | Forgot password sent ("Đã gửi email", "Kiểm tra hộp thư an.nguyen@mediasoft.vn. Liên kết có hiệu lực trong 30 phút.", "Về đăng nhập" / "Gửi lại"; toast "Đã gửi liên kết đặt lại mật khẩu") | A-26 → "Gửi liên kết đặt lại" | `/forgot-password?sent=1` | 1440, 390 |
| A-28 | Auth | Back to login from forgot | A-27 → "Về đăng nhập" (or A-26 → "← Quay lại đăng nhập") | `/login` | 1440, 390 |
| A-29 | Auth | Logged out: login screen + toast "Đã đăng xuất" | Any app state → avatar menu (top right) → "Đăng xuất", or sidebar icon `[title="Đăng xuất"]` | `/login` | 1440, 390 |
| A-30 | Auth | Login with no SSO enabled (row hidden). Unreachable, because the admin SSO panel never renders (C-05) | n/a | `/login` | 1440, 390 |

---

## P. User Portal (every row starts with LOGIN-USER unless stated otherwise)

| ID | Area | Screen / state | Reproducible action sequence | Suggested route | Viewports |
|---|---|---|---|---|---|
| P-01 | Portal | Dashboard v4.6: greeting, onboarding and rule-based store need matches (0-3 rows); full-page capture, no masks. | LOGIN-USER; native demo: stores | /dashboard | 1440, 390 |
| P-02 | Portal | Dashboard: member picked (member highlighted in the table/grid) | P-01 → click an avatar in "Đang trực tuyến" or a seat tile in the LIVE grid | `/dashboard` | 1440, 390 |
| P-03 | Portal | Dashboard: country expanded / "Xem thêm N tỉnh/thành" / "Thu gọn" | P-01 → under "Quốc gia" click "Việt Nam" (VN is open by default; click another country to expand it) → "Xem thêm … tỉnh/thành" | `/dashboard` | 1440, 390 |
| P-04 | Portal | Dashboard: LIVE legend filter (Tất cả / chat / online / event / off) + pagination ("8 / trang"…"24 / trang") | P-01 → click a legend chip above the LIVE grid; change the page-size select; click page numbers | `/dashboard?live=chat&page=2` | 1440, 390 |
| P-05 | Portal | Welcome email preview modal ("✓ Đã gửi email chào mừng", "Tới … · Chào mừng bạn đến với OPC Hub – Thông tin truy cập & quy định hoạt động", "URL đăng nhập", "Tên đăng nhập", "Mật khẩu tạm OPC-XXXX", "Quy định hoạt động trên nền tảng", "Đăng nhập ngay", "Tài liệu đính kèm") | Register personal (A-21 → A-24), then LOGIN-USER: the modal shows over the dashboard | email template (no route); in-app `/welcome` optional | 1440, 390 |
| P-06 | Portal | Dashboard: "Tham gia thảo luận →" on a simulated thread (opens chat) | P-01 → in "Thảo luận mới trong cộng đồng" click "Tham gia thảo luận →" | `/chat/[groupId]` | 1440, 390 |
| P-07 | Portal | Topbar: notifications dropdown ("Thông báo", "Đánh dấu tất cả đã đọc", tabs "Tất cả" / "Chưa đọc (2)", 4 seed items) | P-01 → click bell `[title="Thông báo"]` | `/dashboard` + dropdown (`/notifications` on mobile) | 1440, 390 |
| P-08 | Portal | Notifications: "Chưa đọc" tab | P-07 → "Chưa đọc (2)" | dropdown | 1440, 390 |
| P-09 | Portal | Notifications: empty ("Không có thông báo") | P-07 → "Đánh dấu tất cả đã đọc" → "Chưa đọc (0)" | dropdown | 1440, 390 |
| P-10 | Portal | Notification deep-link (mention → Chat #Hỏi đáp OPC Hà Nội; event → event modal; group → chat c2; verify → Hồ sơ) | P-07 → click "Lê Minh Anh nhắc đến bạn trong #Hỏi đáp" (or "Sắp diễn ra: OPC Meetup #12") | `/chat/c1/qa`, `/events/e1` | 1440, 390 |
| P-11 | Portal | Language popover in topbar | P-01 → "Tiếng Việt" | popover | 1440, 390 |
| P-12 | Portal | User menu ("Nguyễn Văn An", "Thành viên OPC", "Hồ sơ cá nhân", "Đăng xuất"; no "Chuyển sang …" when logged in) | P-01 → click avatar `[data-m="me"]` | menu | 1440, 390 |
| P-13 | Portal | Sidebar collapsed (mini, 76 px; icons only, badge dots, "UP" chip) | P-01 → `[title="Thu gọn sidebar"]` | layout pref | 1440 only |
| P-14 | Portal | Mobile nav drawer (burger) | Viewport 390 → P-01 → `[title="Menu"]`; closes on item click or backdrop | layout | 390 only |
| P-15 | Portal | Breadcrumb "Trang chủ" → dashboard | Any portal tab → `[title="Trang chủ"]` (ẩn ở 390) | `/dashboard` | 1440 |
| P-16 | Portal | Sidebar "Sự kiện gần nhất · OPC Meetup #12 · Xem chi tiết →" → events tab | P-01 → "Xem chi tiết →" | `/events` | 1440 (in drawer at 390) |
| P-17 | Portal | Cộng đồng: list (search "Tìm theo tên, chủ đề hoặc mô tả cộng đồng...", filters "Tất cả"/"Đã tham gia", "Sắp xếp" Nhiều thành viên/Hoạt động nhiều/Tên A–Z, "KHU VỰC" chips, "Hiển thị N / M cộng đồng", cards with "Vào phòng chat"/"Rời nhóm"/"Đăng ký tham gia") | P-01 → sidebar "Cộng đồng" | `/community` | 1440, 390 |
| P-18 | Portal | Cộng đồng: search with clear "×" | P-17 → type `Đà Nẵng` in search → click "×" | `/community?q=` | 1440, 390 |
| P-19 | Portal | Cộng đồng: filter "Đã tham gia" (3 groups: OPC Hà Nội, OPC TP. Hồ Chí Minh, OPC Khánh Hòa) | P-17 → "Đã tham gia" | `/community?filter=joined` | 1440, 390 |
| P-20 | Portal | Cộng đồng: region chip + sort | P-17 → "Miền Trung" chip; Sắp xếp → "Tên A–Z" | `/community?region=…&sort=name` | 1440, 390 |
| P-21 | Portal | Cộng đồng: empty ("Không tìm thấy cộng đồng phù hợp" + "Xoá bộ lọc") | P-17 → search `zzzz` | `/community?q=zzzz` | 1440, 390 |
| P-22 | Portal | Cộng đồng: pagination ("Hiển thị 1–9 / 34 cộng đồng", pages, "6/9/12/24 / trang") | P-17 → scroll to bottom → page "2" / size select | `/community?page=2&size=12` | 1440, 390 |
| P-23 | Portal | Join modal, public group ("Đăng ký tham gia {name}", rules, intro "(không bắt buộc)", "Tôi đồng ý tuân thủ nội quy cộng đồng", "Huỷ" / "Tham gia ngay") | P-17 → card "OPC Đà Nẵng" → "Đăng ký tham gia" | `/community/c3/join` (modal) | 1440, 390 |
| P-24 | Portal | Join modal, approval group (CTA "Gửi yêu cầu tham gia", intro "(bắt buộc)"); toast "Vui lòng đồng ý nội quy cộng đồng" / "Nhóm này cần lời giới thiệu để quản trị viên duyệt" | P-17 → "OPC Hải Phòng" → "Đăng ký tham gia" → click CTA without ticking | `/community/c4/join` | 1440, 390 |
| P-25 | Portal | Card pending ("Đang chờ duyệt" + "Huỷ yêu cầu"); toast "Đã gửi yêu cầu – chủ nhóm sẽ xem xét và duyệt". Auto-approves after 8 s with a notification | P-24 → type an intro in "Bạn đang làm gì, mong muốn gì…" → tick agree → "Gửi yêu cầu tham gia" | `/community` | 1440, 390 |
| P-26 | Portal | Joined public group; toast "Chào mừng bạn đến với OPC Đà Nẵng!" | P-23 → tick agree → "Tham gia ngay" | `/community` | 1440, 390 |
| P-27 | Portal | Leave group; toast "Đã rời …" | P-17 → joined card → "Rời nhóm" | `/community` | 1440, 390 |
| P-28 | Portal | Chat nhóm: room (rail "NHÓM" with joined groups + "NHÓM KHÁC"; channel list "CHỦ ĐỀ THẢO LUẬN" (# Chung + topics); header "# Chung · …", "● N online"; messages; composer "Nhắn tin trong #Chung..." with "Đính kèm file" / "Gửi ảnh" / "Nhắc tên" (@) / "Gửi") | P-01 → "Chat nhóm" (default room c1 OPC Hà Nội) | `/chat/c1` (`/chat/[groupId]/[channelId]`) | 1440, 390 |
| P-29 | Portal | Chat: switch channel (e.g. "Hỏi đáp thuế & pháp lý") | P-28 → click channel in list (danh sách chủ đề `data-m="chlist"` ẩn ở 390) | `/chat/c1/qa` | 1440 |
| P-30 | Portal | Chat: switch group | P-28 → group avatar in rail (`title="OPC TP. Hồ Chí Minh"`) | `/chat/c2` | 1440, 390 |
| P-31 | Portal | Chat: create topic form ("Tạo chủ đề thảo luận", "Tên chủ đề, VD: Tìm đối tác in ấn", "Mô tả ngắn (không bắt buộc)", "Tạo") | P-28 → `[title="Tạo chủ đề mới"]` (ẩn ở 390) | `/chat/c1` (inline) | 1440 |
| P-32 | Portal | Chat: own topic created (with delete ✕ `[title="Xoá chủ đề của bạn"]`); duplicate gives toast "Chủ đề này đã có trong nhóm" | P-31 → type `Test` → "Tạo" | `/chat/c1/[newId]` | 1440 |
| P-33 | Portal | Chat: empty channel ("Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!") | P-32 (new topic) | `/chat/c1/[id]` | 1440 |
| P-34 | Portal | Chat: message sent (text / file "Ke-hoach-Q4.pdf" / image) | P-28 → type `Xin chào` → Enter or "Gửi"; `[title="Đính kèm file"]`; `[title="Gửi ảnh"]` | `/chat/c1` | 1440, 390 |
| P-35 | Portal | Chat: mention suggestion list ("Nhắc tên thành viên") | P-28 → `[title="Nhắc tên"]` (inserts @) | `/chat/c1` | 1440, 390 |
| P-36 | Portal | Chat: message selected (action bar: emoji reactions, "Trả lời", "Ghim"/"Bỏ ghim", "Báo cáo") | P-28 → click a message bubble from another member | `/chat/c1` | 1440, 390 |
| P-37 | Portal | Chat: replying bar (quote + ×) | P-36 → "Trả lời" | `/chat/c1` | 1440, 390 |
| P-38 | Portal | Chat: pinned banner ("{who}: {text}", "N tin đã ghim") + expanded pin list ("Bỏ ghim") | P-28 (seed has 1 pin in c1 #Chung) → click the pin banner | `/chat/c1` | 1440, 390 |
| P-39 | Portal | Chat: in-room search ("Tìm tin nhắn trong phòng này...", "Đóng") | P-28 → `[title="Tìm trong phòng"]` → type | `/chat/c1?q=` | 1440, 390 |
| P-40 | Portal | Chat: right info panel, tab "Thành viên" (THÀNH VIÊN · N; first is mod; owner sees join requests "Duyệt"/"Từ chối" for c1/c6) | P-28: ở 1440 bảng mở sẵn (nút `[title="Ẩn bảng thông tin"]`); ở 390 bấm `[title="Hiện thành viên, file, ghim"]` | `/chat/c1?panel=members` | 1440 (overlay at 390) |
| P-41 | Portal | Chat panel: join requests approved/rejected; "Không có yêu cầu nào đang chờ." | P-40 (room OPC Hà Nội) → "Duyệt" on "Nguyễn Thị Hồng" | `/chat/c1?panel=members` | 1440 |
| P-42 | Portal | Chat panel: tab "File" (and empty) | P-40 → "File" | `?panel=files` | 1440 |
| P-43 | Portal | Chat panel: tab "Đã ghim (N)" / empty "Chưa có tin nhắn nào được ghim." | P-40 → "Đã ghim (1)" | `?panel=pins` | 1440 |
| P-44 | Portal | Report message modal ("Báo cáo tin nhắn", reasons Spam / quảng cáo, Lừa đảo, Ngôn từ xúc phạm, Chia sẻ thông tin cá nhân, Khác; "Mô tả thêm (không bắt buộc)"; "Huỷ" / "Gửi báo cáo"; toast "Vui lòng chọn lý do") | P-36 → "Báo cáo" | modal | 1440, 390 |
| P-45 | Portal | Message reported (tag "Bạn đã báo cáo tin này") | P-44 → "Lừa đảo" → "Gửi báo cáo" | `/chat/c1` | 1440, 390 |
| P-46 | Portal | Chat: preview of a non-joined group ("Bạn chưa là thành viên của nhóm này…", "Để sau", CTA "Tham gia nhóm" / "Gửi yêu cầu tham gia" / "Đang chờ chủ nhóm duyệt") | P-28 → in "NHÓM KHÁC" click e.g. "OPC Đà Nẵng" | `/chat/c3` (preview) | 1440, 390 |
| P-47 | Portal | Chat: no groups ("Bạn chưa tham gia nhóm nào. Hãy tham gia một cộng đồng để vào các phòng chat nội bộ." / "Chỉ thành viên nhóm mới xem và gửi được tin nhắn.") | P-17 → "Đã tham gia" → "Rời nhóm" on all 3 joined → "Chat nhóm". Ở 390 cột chủ đề ẩn nên chỉ thấy "Chỉ thành viên nhóm mới xem và gửi được tin nhắn." | `/chat` (empty) | 1440, 390 |
| P-48 | Portal | Chat: "+ Tham gia thêm nhóm" → community | P-28 → `[title="Tham gia thêm nhóm"]` | `/community` | 1440, 390 |
| P-49 | Portal | Sự kiện sắp tới: featured hero ("SỰ KIỆN NỔI BẬT", countdown ngày/giờ/phút/giây, CTA) + search "Tìm sự kiện theo tên, địa điểm..." + filters Tất cả / Đã đăng ký / Online / Offline + grid (Chi tiết / Đăng ký) | P-01 → "Sự kiện sắp tới" | `/events` | 1440, 390 |
| P-50 | Portal | Events filtered ("Đã đăng ký" shows e2; "Online"; "Offline") | P-49 → filter chip | `/events?filter=mine` | 1440, 390 |
| P-51 | Portal | Events empty ("Không có sự kiện phù hợp.") | P-49 → search `zzzz` | `/events?q=zzzz` | 1440, 390 |
| P-52 | Portal | Event detail modal (cover, mode, title, Thời gian, place, map for offline with address, description, CTA "Đăng ký tham gia" / "Huỷ đăng ký" / "Hết chỗ") | P-49 → "Chi tiết" on "OPC Meetup #12 – Vận hành doanh nghiệp một mình" | `/events/e1` | 1440, 390 |
| P-53 | Portal | Event registered / cancelled (toast "Đăng ký thành công – email xác nhận đã được gửi" / "Đã huỷ đăng ký") | P-49 → "Đăng ký tham gia" on e1; again → "Huỷ đăng ký" | `/events/e1` | 1440, 390 |
| P-54 | Portal | Event full ("Hết chỗ", disabled): Demo Day 120/120 | P-49 → card "Demo Day – Dự án cộng đồng Q4" → "Chi tiết" (nút trên thẻ đã là "Hết chỗ") | `/events/e4` | 1440, 390 |
| P-55 | Portal | Dự án OPC · Khám phá dự án (scope tabs "Khám phá dự án N" / "Dự án của tôi N", "+ Đăng dự án của bạn", stats, "★ DỰ ÁN NỔI BẬT TUẦN", search "Tìm dự án theo tên, mô tả hoặc chủ dự án...", stage select "Mọi giai đoạn", sort "Mới nhất", "LĨNH VỰC" chips, grid) | P-01 → "Dự án OPC" | `/projects` | 1440, 390 |
| P-56 | Portal | Projects table view | P-55 → view toggle `[title="Dạng bảng"]` | `/projects?view=table` | 1440, 390 |
| P-57 | Portal | Projects filtered (category chip "Fintech", stage "MVP", sort "Nhiều theo dõi") | P-55 → chip / selects | `/projects?cat=…&stage=…&sort=…` | 1440, 390 |
| P-58 | Portal | Projects empty ("Không tìm thấy dự án phù hợp" + "Xoá bộ lọc") | P-55 → search `zzzz` | `/projects?q=zzzz` | 1440, 390 |
| P-59 | Portal | Follow / unfollow ("+ Theo dõi" ↔ "✓ Đang theo dõi") | P-56 → "+ Theo dõi" on a row | `/projects` | 1440, 390 |
| P-60 | Portal | Dự án của tôi (list with status, "Chỉnh sửa", "Chia sẻ"; review note line) | P-55 → "Dự án của tôi" | `/projects/mine` | 1440, 390 |
| P-61 | Portal | Dự án của tôi empty ("Bạn chưa có dự án nào", "+ Đăng dự án đầu tiên"). Not reachable for the seed user (owns p10) | n/a (user with no projects) | `/projects/mine` | 1440, 390 |
| P-62 | Portal | Project detail · tab "Tổng quan" (breadcrumb "Dự án OPC / {name}", follow, contact (Zalo/Email/Điện thoại), "Giới thiệu dự án", highlights, side "Thông tin", "Truy cập website ↗", "Bản test & mã nguồn", related) | P-55 → click card "SoloBooks" | `/projects/p1` | 1440, 390 |
| P-63 | Portal | Project detail · "Cập nhật" | P-62 → tab "Cập nhật" | `/projects/p1?tab=updates` | 1440, 390 |
| P-64 | Portal | Project detail · "Đội ngũ" | P-62 → "Đội ngũ" | `/projects/p1?tab=team` | 1440, 390 |
| P-65 | Portal | Project detail · "Góp ý (N)": sort "Mới nhất"/"Hữu ích nhất", type filters, composer (types Góp ý/…), "Gửi góp ý", "Hữu ích", "Trả lời", owner "Đánh dấu đã tiếp nhận" | P-62 → "Góp ý (…)" | `/projects/p1?tab=feedback` | 1440, 390 |
| P-66 | Portal | Góp ý reply box ("Viết trả lời...", "Gửi") and error toast "Nội dung góp ý quá ngắn" | P-65 → "Trả lời"; or "Gửi góp ý" with `abc` | `?tab=feedback` | 1440, 390 |
| P-67 | Portal | Góp ý empty ("Chưa có góp ý nào. Hãy là người đầu tiên!") | P-62 on a project with no comments (e.g. "BrandKit Mini") → "Góp ý (0)" | `?tab=feedback` | 1440, 390 |
| P-68 | Portal | Repo states: public "Xem mã nguồn ↗" / private locked "Repository riêng tư – chủ dự án sẽ cấp quyền…" + "Yêu cầu quyền truy cập" → "✓ Đã gửi yêu cầu truy cập" / "Dự án chưa chia sẻ mã nguồn." | P-55 → "SoloBooks" (public) / "LeadPilot" (private) → "Yêu cầu quyền truy cập" / "BrandKit Mini" (no repo) | `/projects/[id]` | 1440, 390 |
| P-69 | Portal | Fundraising box ("Gọi vốn đầu tư", Cần gọi, Cổ phần chào bán, Đã cam kết, "Mục đích sử dụng vốn", "Quan tâm đầu tư") | P-62 (SoloBooks, fund on) | `/projects/p1` | 1440, 390 |
| P-70 | Portal | Investment interest modal ("Quan tâm đầu tư · SoloBooks", kinds Cá nhân / Doanh nghiệp / Quỹ đầu tư, Họ và tên, Số điện thoại, org field for biz/fund, "Số tiền dự kiến đầu tư (VND)", message, "Huỷ" / "Gửi quan tâm") | P-69 → "Quan tâm đầu tư" | `/projects/p1/invest` (modal) | 1440, 390 |
| P-71 | Portal | Interest sent ("✓ Đã gửi quan tâm · …", thread "Trao đổi với OPC Hub", "Nhắn cho Admin OPC Hub…", "Gửi") | P-70 → fill phone `0912345678`, amount `100000000` → "Gửi quan tâm" | `/projects/p1` | 1440, 390 |
| P-72 | Portal | Owner view of fundraising ("Nhà đầu tư quan tâm (N)" list) | P-60 → "OPC Hub Mobile" (owned by Nguyễn Văn An, fund on) | `/projects/p10` | 1440, 390 |
| P-73 | Portal | Project form drawer, new ("Đăng dự án mới": Ảnh bìa, "* Tên dự án", Lĩnh vực, Giai đoạn, Mô tả ngắn, Mô tả chi tiết (rich editor), Website, Tag, Bản test URL, Kho mã nguồn GitHub/GitLab + link + Public/Private, "Dự án đang tìm kiếm đầu tư" toggle, team rows, visibility Công khai/Riêng tư, communities; "Huỷ" / "Lưu nháp" / "Gửi đăng dự án") | P-55 → "+ Đăng dự án của bạn" | `/projects/new` | 1440, 390 |
| P-74 | Portal | Project form validation toasts ("Vui lòng nhập tên dự án", "Vui lòng chọn lĩnh vực", "Vui lòng nhập mô tả ngắn", fund amount/equity, test URL) | P-73 → "Gửi đăng dự án" with an empty form | `/projects/new` | 1440, 390 |
| P-75 | Portal | Project form: fundraising section expanded (amount, VND/USD, % cổ phần, min, deck, use) | P-73 → toggle "Dự án đang tìm kiếm đầu tư" | `/projects/new` | 1440, 390 |
| P-76 | Portal | Project form: edit existing ("Chỉnh sửa dự án") | P-60 → "Chỉnh sửa" | `/projects/[id]/edit` | 1440, 390 |
| P-77 | Portal | Project saved: "Đã lưu bản nháp" / "Đã gửi dự án – quản trị viên sẽ duyệt trước khi hiển thị công khai" (switches to Dự án của tôi) | P-73 → fill fields → "Lưu nháp" or "Gửi đăng dự án" | `/projects/mine` | 1440, 390 |
| P-78 | Portal | Share project modal ('Chia sẻ "{name}"', readonly link, "Sao chép link", "Gửi vào phòng chat nhóm" checklist, message, "Huỷ" / "Chia sẻ") | P-60 → "Chia sẻ" | modal | 1440, 390 |
| P-79 | Portal | Gói dịch vụ popup, paid member ("{Văn An}, trở thành thành viên OPC Hub Community", "THÀNH VIÊN HỆ THỐNG · Ưu đãi 75% · 50.000đ / tháng", benefits, "✓ Thành viên đến dd/mm/yyyy · đăng ký tiếp sẽ gia hạn 12 tháng", "Thách thức lớn nhất khi vận hành OPC? (không bắt buộc)", "Đăng ký ngay · 600.000đ/năm", "Chương trình & dịch vụ khác" (6 services, "Tư vấn"), close ×) | P-01 → sidebar "Gói dịch vụ" | `/services` (modal) | 1440, 390 |
| P-80 | Portal | Service consult form ("Đăng ký tư vấn dịch vụ", "Dịch vụ quan tâm", "Tư cách đăng ký" Cá nhân / Doanh nghiệp / Tổ chức, personal block, phone, email, "NHU CẦU" when/budget, "Mô tả nhu cầu *", "Hủy" / "Gửi yêu cầu"; header back "Gói dịch vụ") | P-79 → "Tư vấn" on "Khóa học Vận hành OPC bằng AI – 30 ngày" → "Cá nhân" (user demo là DN nên form mở sẵn biến thể Doanh nghiệp = P-81) | `/services/[svcId]/request` | 1440, 390 |
| P-81 | Portal | Consult form, business variant ("THÔNG TIN TỔ CHỨC": Tên tổ chức, Loại hình, Mã số thuế / Quy mô, Tỉnh / thành, Website, "NGƯỜI LIÊN HỆ") | P-79 → "Tư vấn" (mở sẵn biến thể này cho user DN, đã điền Tên tổ chức, MST, người liên hệ) | same | 1440, 390 |
| P-82 | Portal | Consult validation toasts ("Vui lòng nhập họ tên người liên hệ", "Số điện thoại không hợp lệ", …) | P-81 → "Gửi yêu cầu" (toast đầu tiên: "Vui lòng chọn loại hình tổ chức"; biến thể Cá nhân: "Vui lòng chọn nghề nghiệp / vai trò") | same | 1440, 390 |
| P-83 | Portal | Consult sent ("Đã gửi yêu cầu tư vấn", "Mã phiếu YC-…", Dịch vụ, Trạng thái "Mới đăng ký", "Về Gói dịch vụ") | P-81 → chọn "Loại hình" (Doanh nghiệp) + "Tỉnh / thành" + nhập "Mô tả nhu cầu" → "Gửi yêu cầu" | `/services/requests/[id]` | 1440, 390 |
| P-84 | Portal | Transfer box ("Thanh toán phí thành viên · 600.000đ / năm (50.000đ/tháng)", Vietcombank, Số tài khoản 1203132809, Chủ TK "Công ty cổ phần Tập đoàn Media Soft", Số tiền 600.000đ, Nội dung "OPCHUB TV000001 0912345678", 3× "Sao chép", "Quay lại", "Tôi đã chuyển khoản") | P-79 → "Đăng ký ngay · 600.000đ/năm" | `/membership/pay` | 1440, 390 |
| P-85 | Portal | Copy toasts ("Đã sao chép số tài khoản" / "số tiền" / "nội dung chuyển khoản") | P-84 → each "Sao chép" | same | 1440, 390 |
| P-86 | Portal | Payment waiting ("Đang đối soát giao dịch với Vietcombank…") → after 2.2 s success toast "Đã nhận 600.000đ · tài khoản tự động kích hoạt đến …" and modal closes | P-84 → "Tôi đã chuyển khoản" | `/membership/pay?status=pending` | 1440, 390 |
| P-87 | Portal | Mandatory paywall ("Cần thanh toán để tiếp tục", no ×, "Đăng xuất"; × / backdrop gives toast "Vui lòng thanh toán phí thành viên để tiếp tục sử dụng OPC Hub"). **Not reachable via UI** (see C-01) | Only via state: `meId` of an unpaid member (m6/m1 after expiry) while `screen='portal'`. The Playwright fiber hook found no class instance, so state injection isn't available either | `/membership/required` (blocking modal over any portal route) | 1440, 390 |
| P-88 | Portal | Payment banner ("Tài khoản đang chờ thanh toán phí thành viên" / "Phí thành viên đã hết hạn", "Thanh toán ngay", ×). Dead code: `payBanner:false` is hard-coded | n/a | banner on `/dashboard` | 1440, 390 |
| P-89 | Portal | Hồ sơ: header (avatar upload, name, "Doanh nghiệp", status "Đang hoạt động", stats Nhóm / Sự kiện / Dự án, "Liên hệ") + tab "Thông tin cá nhân" (Họ và tên, Email, Số điện thoại + CC, "Bạn là", Quốc gia, Tỉnh / Thành phố, Giới thiệu bản thân, "Hoàn tác" / "Lưu thay đổi") | P-01 → sidebar "Hồ sơ cá nhân →" (or user menu "Hồ sơ cá nhân") | `/profile` | 1440, 390 |
| P-90 | Portal | Profile save toasts ("Họ và tên không được để trống", "Email không hợp lệ", success) | P-89 → clear name → "Lưu thay đổi" | `/profile` | 1440, 390 |
| P-91 | Portal | Hồ sơ · "Thông tin doanh nghiệp" (biz only; MST/Tên DN locked; Lĩnh vực, Quy mô, Chức vụ, Website). Neither the verified nor the pending notice ever shows (C-07) | P-89 → "Thông tin doanh nghiệp" | `/profile?tab=business` | 1440, 390 |
| P-92 | Portal | Hồ sơ · "Nhóm & hoạt động" ("Nhóm đã tham gia" with action, "Sự kiện đã đăng ký"; empty "Bạn chưa tham gia nhóm nào." / "Chưa đăng ký sự kiện nào.") | P-89 → "Nhóm & hoạt động" (or click stat "Nhóm") | `/profile?tab=activity` | 1440, 390 |
| P-93 | Portal | Hồ sơ · "Bảo mật" ("Đổi mật khẩu": hiện tại / mới + strength bars / xác nhận, "Cập nhật mật khẩu"; "Tài khoản liên kết" SSO Liên kết / Huỷ liên kết; "Đăng xuất khỏi tất cả thiết bị" → "Đăng xuất") | P-89 → "Bảo mật" | `/profile?tab=security` | 1440, 390 |
| P-94 | Portal | Password change toasts ("Nhập mật khẩu hiện tại", "Mật khẩu mới chưa đủ mạnh", "Xác nhận mật khẩu không khớp", "Đã cập nhật mật khẩu"); logout-all "Đã đăng xuất khỏi 2 thiết bị khác" | P-93 → "Cập nhật mật khẩu" with fields empty / filled | `/profile?tab=security` | 1440, 390 |
| P-95 | Portal | Profile stat "Dự án" → Dự án của tôi | P-89 → click stat "Dự án" | `/projects/mine` | 1440, 390 |

---

## D. Admin Dashboard (every row starts with LOGIN-ADMIN unless stated otherwise)

| ID | Area | Screen / state | Reproducible action sequence | Suggested route (admin app) | Viewports |
|---|---|---|---|---|---|
| D-01 | Admin | Admin · Tổng quan (sau đăng nhập admin): header "Tổng quan · Theo dõi tăng trưởng, sự kiện và kiểm duyệt nội dung cộng đồng", date range "01/10/2026 – 15/10/2026", stat cards Thành viên 4.218 / Cộng đồng 64 / Dự án OPC 24 / Sự kiện 12, chart "Tăng trưởng thành viên" (Tuần / Tháng / Năm; legend Đang hoạt động / Mới / Chưa kích hoạt) | LOGIN-ADMIN | `/` or `/overview` | 1440, 390 |
| D-02 | Admin | Admin topbar user menu ("Quản trị hệ thống", "Super Admin", "Hồ sơ cá nhân", "Đăng xuất") | D-01 → avatar `[data-m="me"]` | menu | 1440, 390 |
| D-03 | Admin | "Hồ sơ cá nhân" / "Hồ sơ cá nhân →" clicked: **no-op** (tries `screen=portal`, guard reverts) | D-02 → "Hồ sơ cá nhân" | `/account` (admin's own profile, to define) | 1440, 390 |
| D-04 | Admin | Admin notifications dropdown (shows the **user's** seed notifications: "@An …", "Tài khoản doanh nghiệp đã được xác minh") | D-01 → `[title="Thông báo"]` | dropdown | 1440, 390 |
| D-05 | Admin | Sidebar collapsed (mini, "AD" chip, badge dots) | D-01 → `[title="Thu gọn sidebar"]` | layout | 1440 only |
| D-06 | Admin | Mobile drawer | 390 → D-01 → `[title="Menu"]` | layout | 390 only |
| D-07 | Admin | Thành viên · list view (header "Thành viên · N tài khoản", search "Tìm theo tên, email...", view toggle Dạng lưới / Dạng danh sách, type chips "Tất cả" / "Doanh nghiệp" / "Cá nhân", table: checkbox, Thành viên, Loại tài khoản, Nhóm tham gia (+N), "Quyền hệ thống" select, date, status, ⋯) | D-01 → "Thành viên" | `/members` | 1440, 390 |
| D-08 | Admin | Thành viên · grid view | D-07 → `[title="Dạng lưới"]` | `/members?view=grid` | 1440, 390 |
| D-09 | Admin | Members filtered by type / search, and the search-empty result | D-07 → "Doanh nghiệp"; type `zzzz` in "Tìm theo tên, email..." | `/members?type=biz&q=` | 1440, 390 |
| D-10 | Admin | Bulk selection bar ("Đã chọn N mục", "+ Gán vào nhóm", "Khóa tài khoản", "Mở khóa", "Xuất CSV", "Bỏ chọn"); header checkbox shows "–" / "✓" | D-07 → tick 2 row checkboxes (or header checkbox) | `/members` (selection) | 1440, 390 |
| D-11 | Admin | Bulk lock / unlock / export toasts ("Đã khóa N tài khoản", "Đã mở khóa…", "Đang xuất N mục ra CSV…") | D-10 → each button | `/members` | 1440, 390 |
| D-12 | Admin | Modal "Gán N thành viên vào nhóm" / "Gán {name} vào nhóm" (names, "Tìm nhóm theo tên hoặc tỉnh/thành...", role Thành viên / Điều phối viên, group checklist, "Hủy" / "Gán vào nhóm") | D-10 → "+ Gán vào nhóm" | `/members?assign=ids` (modal) | 1440, 390 |
| D-13 | Admin | Row action menu "Đổi trạng thái" (Hoạt động ✓ / Khóa tài khoản or Mở khóa / Gán vào nhóm…, "Xem hồ sơ đăng ký") | D-07 → row "⋯" | popover | 1440, 390 |
| D-14 | Admin | Row status changed (locked badge "Đã khóa"; seed m4 Ngô Thành Đạt is already locked) | D-13 → "Khóa tài khoản" | `/members` | 1440, 390 |
| D-15 | Admin | Role changed via "Quyền hệ thống" select (Thành viên / Điều phối viên / Quản trị viên); toast "Đã cập nhật vai trò …" | D-07 → change a row select | `/members` | 1440, 390 |
| D-16 | Admin | Member registration drawer "Hồ sơ đăng ký" (status, biz rows MST / Tên DN …, representative rows, personal rows, groups, system rows; pending: "Từ chối" / "Xác minh doanh nghiệp") | D-07 → click a member name (or D-13 → "Xem hồ sơ đăng ký") | `/members/[id]` | 1440, 390 |
| D-17 | Admin | Members pagination ("6/9/12/24 / trang", default 10) | D-07 → page size "6 / trang" → trang "2" (seed 8 TV; mặc định 1 trang) | `/members?page=2` | 1440, 390 |
| D-18 | Admin | Phí thành viên (stats Tổng thành viên / Đã đóng phí / Chờ thanh toán / …; "Phí thành viên hệ thống"; search "Tìm tên, email..."; "Gửi nhắc hàng loạt"; tabs Tất cả / Đang hiệu lực / Chờ thanh toán / Sắp hết hạn / Hết hạn; row actions "Ghi nhận đã thu" / "Gia hạn 12 tháng" / "Gửi nhắc") | D-01 → "Phí thành viên" | `/fees` | 1440, 390 |
| D-19 | Admin | Fees filtered (e.g. "Chờ thanh toán": m6 Đỗ Hải Yến) and empty "Không có thành viên phù hợp" | D-18 → tab chip; search `zzzz` | `/fees?status=pending` | 1440, 390 |
| D-20 | Admin | Fees bulk bar ("Đã chọn N thành viên", "Ghi nhận đã thu", "Gửi nhắc", "Xuất CSV", "Bỏ chọn") | D-18 → tick rows | `/fees` | 1440, 390 |
| D-21 | Admin | Fees row actions (toast "Đã ghi nhận thu 600.000đ · {name}", "Đã gửi email nhắc thanh toán tới …"); "Gửi nhắc hàng loạt" toast | D-18 → "Ghi nhận đã thu" on a pending row | `/fees` | 1440, 390 |
| D-22 | Admin | Fees pagination | D-18 → page size "6 / trang" → trang "2" (seed 8 TV) | `/fees?page=2` | 1440, 390 |
| D-23 | Admin | Nhóm cộng đồng · tab "Danh sách nhóm" grid (default) ("+ Tạo nhóm", "Xuất dữ liệu", stats Nhóm cộng đồng / Tỉnh / thành có nhóm "N / 34" / Tổng thành viên / Tin nhắn / tuần, region chips Tất cả / Miền Bắc / Miền Trung / Miền Nam, search "Tìm theo tên nhóm hoặc tỉnh / thành...", sort, note "Yêu cầu tham gia nhóm do chủ nhóm / điều phối viên của từng nhóm duyệt trực tiếp trong phòng chat.", cards Sửa / Xuất DS / Xem chat / Xóa) | D-01 → "Nhóm cộng đồng" | `/groups` | 1440, 390 |
| D-24 | Admin | Groups list (table) view | D-23 → `[title="Dạng danh sách"]` | `/groups?view=list` | 1440, 390 |
| D-25 | Admin | Groups filtered by region / search / empty search | D-23 → "Miền Trung"; search `zzzz` | `/groups?region=…&q=` | 1440, 390 |
| D-26 | Admin | Groups bulk bar ("Đã chọn N mục", "Xóa nhóm", "Xuất CSV", "Bỏ chọn") | D-24 → tick rows | `/groups` | 1440, 390 |
| D-27 | Admin | Groups pagination (default 12) | D-23 → pager | `/groups?page=2` | 1440, 390 |
| D-28 | Admin | Drawer "Tạo nhóm cộng đồng mới" (Ảnh bìa nhóm "+ Tải ảnh bìa · Tỉ lệ 2:1", "* Tên nhóm" placeholder "VD: OPC Đà Nẵng", Tỉnh / Thành phố, Mô tả ngắn N/200, "Quyền tham gia" Công khai / Cần duyệt, chủ nhóm, "Thêm điều phối viên", "Phòng chat mặc định", "+ Thêm phòng chat", "Nội quy nhóm" + "+ Thêm nội quy", "Huỷ" / "Tạo nhóm") | D-23 → "+ Tạo nhóm" | `/groups/new` | 1440, 390 |
| D-29 | Admin | Group form validation toasts ("Vui lòng nhập tên nhóm", "Vui lòng chọn tỉnh / thành phố", "Đã có nhóm cho {tỉnh}", "Vui lòng nhập mô tả", "Vui lòng chọn chủ nhóm") | D-28 → "Tạo nhóm" with the form empty; or pick "Hà Nội" | `/groups/new` | 1440, 390 |
| D-30 | Admin | Drawer "Chỉnh sửa nhóm cộng đồng" ("Lưu thay đổi") | D-23 → "Sửa" on OPC Hà Nội | `/groups/[id]/edit` | 1440, 390 |
| D-31 | Admin | Modal "Xuất danh sách thành viên nhóm" (group checklist "Chọn tất cả" / "Bỏ chọn tất cả", "Trường dữ liệu", "Trạng thái thành viên" Tất cả / Đang hoạt động / Đã khóa, "Định dạng" CSV / Excel (.xls), "Xem trước" table, "Huỷ" / "Tải xuống N dòng") | D-23 → "Xuất dữ liệu" (all) or "Xuất DS" (one) or bulk "Xuất CSV" | `/groups/export` (modal) | 1440, 390 |
| D-32 | Admin | "Xem chat" from admin: **no-op** (sets screen=portal, guard reverts) | D-23 → "Xem chat" | `/groups/[id]/chat` (admin read-only viewer, to define) | 1440, 390 |
| D-33 | Admin | Nhóm cộng đồng · tab "Kiểm duyệt tin nhắn (4)" ("Tin nhắn nhạy cảm · Phát hiện tự động trong chat nhóm và báo cáo từ thành viên", filters Tất cả / Tự động / Báo cáo, report cards "Ẩn & xóa" / "Cảnh cáo" / "Khóa" / "Bỏ qua"; "Bộ lọc từ khóa" chips ×, "Thêm từ khóa...", "Thêm") | D-23 → tab "Kiểm duyệt tin nhắn" | `/groups/moderation` | 1440, 390 |
| D-34 | Admin | Moderation empty ("Không còn tin nhắn nhạy cảm cần xử lý.") | D-33 → "Bỏ qua" on all 4 reports | `/groups/moderation` | 1440, 390 |
| D-35 | Admin | Keyword added / removed (toast "Đã thêm từ khóa “…”") | D-33 → type `test` → "Thêm" (Enter); click a chip to remove | `/groups/moderation` | 1440, 390 |
| D-36 | Admin | Bot tương tác · tab "Nhật ký tự động" (stats Persona đang hoạt động / Kịch bản / Hội thoại đã đăng / Chờ duyệt; "Chế độ tự động 100%" switch, options "Tự sinh kịch bản từ chủ đề", "Tự trả lời thành viên thật", topics textarea; log list or "Đang khởi động… hoạt động tự động sẽ hiện tại đây.") | D-01 → "Bot tương tác" | `/bots` | 1440, 390 |
| D-37 | Admin | Bot · tab "Persona" (cards: toggle, tone, tags, "Sửa" / "Xóa", "+ Tạo persona") | D-36 → "Persona" | `/bots/personas` | 1440, 390 |
| D-38 | Admin | Drawer "Persona" (photo or colour, "THÔNG TIN CƠ BẢN": Tên hiển thị, Giới tính, Độ tuổi, Vai trò, Tỉnh / thành, Giới thiệu ngắn; "PHONG CÁCH TƯƠNG TÁC": Giọng văn, Chuyên môn, Tần suất, Khung giờ; "NHÓM THAM GIA"; "Hủy" / "Lưu persona") | D-37 → "+ Tạo persona" (or "Sửa") | `/bots/personas/new` | 1440, 390 |
| D-39 | Admin | Bot · tab "Kịch bản hội thoại" (cards with avatars, "Chạy ngay" / "Sửa" / "Xóa", "+ Tạo kịch bản") | D-36 → "Kịch bản hội thoại" | `/bots/scripts` | 1440, 390 |
| D-40 | Admin | Drawer "Kịch bản hội thoại" (Chủ đề, Loại hội thoại, Giãn cách, Lịch chạy, "Mời thành viên thật tham gia", nhóm, lượt rows with persona select + ↑ ↓ ×, "+ Thêm lượt", "XEM TRƯỚC TRONG NHÓM CHAT", "Hủy" / "Lưu kịch bản") | D-39 → "+ Tạo kịch bản" | `/bots/scripts/new` | 1440, 390 |
| D-41 | Admin | Bot · tab "Hội thoại" (threads; pending thread "Bỏ" / "Duyệt & đăng"; empty "Chưa có hội thoại. Vào tab Kịch bản và bấm Chạy ngay.") | D-36 → "Hội thoại" | `/bots/threads` | 1440, 390 |
| D-42 | Admin | Nội dung & Sự kiện grid (stats Sự kiện sắp tới / Lượt đăng ký / Tỉ lệ lấp đầy …; search "Tìm sự kiện..."; tabs Tất cả / Đang mở / Sắp đầy / Đã đầy; select Mọi hình thức / Online / Offline; "+ Tạo sự kiện"; cards "Danh sách" / "Chỉnh sửa" / "Chia sẻ"; tile "+ Tạo sự kiện mới") | D-01 → "Nội dung & Sự kiện" | `/events` | 1440, 390 |
| D-43 | Admin | Events list view | D-42 → `[title="Dạng danh sách"]` | `/events?view=list` | 1440, 390 |
| D-44 | Admin | Events filtered / empty ("Không có sự kiện phù hợp.") | D-42 → "Đã đầy"; search `zzzz` | `/events?status=full` | 1440, 390 |
| D-45 | Admin | Events pagination (default 9) | D-42 → thanh phân trang (seed 5 sự kiện → chỉ 1 trang, không có trang 2) | `/events?page=2` | 1440, 390 |
| D-46 | Admin | Drawer "Danh sách đăng ký" (event header, "Xuất CSV", "Đã check-in n/N", "Check-in tất cả", per-row "Check-in" ↔ "✓ Đã check-in") | D-42 → "Danh sách" on a card | `/events/[id]/registrations` | 1440, 390 |
| D-47 | Admin | Drawer "Tạo sự kiện mới" (Ảnh bìa 16:9, "* Tên sự kiện" placeholder "VD: OPC Meetup #13", "Hình thức" Offline / Online, Ngày, Bắt đầu / Kết thúc, offline: Tên địa điểm / Địa chỉ chi tiết / Link Google Maps "Mở thử ↗" + map preview; Số chỗ tối đa; Nhóm tổ chức; Mô tả (rich); "Mở đăng ký" switch; "Huỷ" / "Lưu sự kiện") | D-42 → "+ Tạo sự kiện" | `/events/new` | 1440, 390 |
| D-48 | Admin | Event form, Online variant (link field) | D-47 → "Online" | `/events/new` | 1440, 390 |
| D-49 | Admin | Drawer "Chỉnh sửa sự kiện" | D-42 → "Chỉnh sửa" | `/events/[id]/edit` | 1440, 390 |
| D-50 | Admin | Event share toast "Đã sao chép liên kết sự kiện" | D-42 → "Chia sẻ" | `/events` | 1440, 390 |
| D-51 | Admin | Dự án (Kiểm duyệt dự án) grid, tab "Chờ duyệt (2)" (HalalLink, EduMate; button "Xem & duyệt"; "Xóa") | D-01 → "Dự án" | `/projects?tab=pending` | 1440, 390 |
| D-52 | Admin | Project review tabs Đang hiển thị / Đã ẩn / Cần chỉnh sửa / Bị từ chối / Bản nháp, plus empty "Không còn dự án nào chờ duyệt" / "Không có dự án trong mục này." | D-51 → each tab ("Đã ẩn" có 1 dự án; "Bị từ chối" / "Bản nháp" mới trống) | `/projects?tab=live` etc. | 1440, 390 |
| D-53 | Admin | Projects list view | D-51 → `[title="Dạng danh sách"]` | `/projects?view=list` | 1440, 390 |
| D-54 | Admin | Projects bulk bar ("Đã chọn N mục", "Duyệt & xuất bản", "Ẩn", "Xóa", "Bỏ chọn") | D-53 → tick rows | `/projects` | 1440, 390 |
| D-55 | Admin | Project review drawer "Xem & duyệt dự án" (status label, cover, tags, info rows, review note; "★ Đặt làm dự án nổi bật tuần"; "Lý do" select; note editor; pending: "Từ chối" / "Yêu cầu chỉnh sửa" / "Duyệt & xuất bản"; live: "Ẩn dự án"; hidden: "Xuất bản lại") | D-51 → "Xem & duyệt" on HalalLink | `/projects/[id]/review` | 1440, 390 |
| D-56 | Admin | Project approved / changes requested / rejected / hidden (toasts; badge counts update) | D-55 → each action | `/projects` | 1440, 390 |
| D-57 | Admin | Projects pagination (default 10) | D-51 → pager (seed ≤ 6 dự án mỗi tab → chỉ 1 trang; chụp tab "Đang hiển thị") | `/projects?page=2` | 1440, 390 |
| D-58 | Admin | Nhà đầu tư (stats; "Quỹ và cá nhân đã bày tỏ quan tâm đầu tư vào các dự án OPC"; search "Tìm tên, doanh nghiệp, quỹ, số điện thoại..."; "Xuất CSV"; tabs Tất cả / Quỹ đầu tư / Doanh nghiệp / Cá nhân; table "Chi tiết") | D-01 → "Nhà đầu tư" | `/investors` | 1440, 390 |
| D-59 | Admin | Investors filtered / empty ("Không có nhà đầu tư phù hợp") / pagination | D-58 → "Quỹ đầu tư"; search `zzzz` | `/investors?kind=fund` | 1440, 390 |
| D-60 | Admin | Investor drawer "Thông tin nhà đầu tư" (status steps Đã gửi / Đang trao đổi / Đã kết nối; "Gọi điện", "Sao chép số"; "Dự án đã quan tâm (N)"; comment thread, "Viết bình luận cho nhà đầu tư… (Enter để gửi)", "Gửi") | D-58 → "Chi tiết" | `/investors/[id]` | 1440, 390 |
| D-61 | Admin | Dịch vụ · tab "Yêu cầu đăng ký" (stats per status; pipeline note "Mới đăng ký → Đang tư vấn → Đã báo giá → Đã chốt / Từ chối → Hoàn thành"; search "Tìm mã, tên, email, tổ chức..."; "Xuất CSV"; status chips; table "Chi tiết") | D-01 → "Dịch vụ" | `/service-requests` | 1440, 390 |
| D-62 | Admin | Requests filtered / empty ("Không có yêu cầu phù hợp") / pagination | D-61 → "Mới đăng ký"; search `zzzz` | `/service-requests?status=new` | 1440, 390 |
| D-63 | Admin | Request drawer "Yêu cầu YC-1005" (step bar 1–5, "Chuyển sang: Đang tư vấn", "Từ chối" / "Mở lại tư vấn", "Nhân sự phụ trách" select, service info, contact, extra fields, comments with @mentions, editor, "Gửi bình luận", internal note) | D-61 → "Chi tiết" on YC-1005 | `/service-requests/[id]` | 1440, 390 |
| D-64 | Admin | Request lost state (red "Từ chối", "Mở lại tư vấn") | D-63 → "Từ chối" | `/service-requests/[id]` | 1440, 390 |
| D-65 | Admin | Dịch vụ · tab "Danh mục dịch vụ" ("Danh mục chương trình & dịch vụ · Hiển thị trong popup Gói dịch vụ của User Portal. Không phải cấp thành viên."; editable rows Tên / Hình thức / Mô tả, "N YC", `[title="Hiển thị"]`, `[title="Xóa"]`, "+ Thêm chương trình / dịch vụ") | D-61 → tab "Danh mục dịch vụ" | `/service-requests/catalog` | 1440, 390 |
| D-66 | Admin | Cài đặt · "Chung" (Thông tin nền tảng: Logo "Tải ảnh lên" / "Gỡ bỏ", Tên nền tảng, Tên miền, Email liên hệ, Múi giờ; "Đăng ký & tham gia" switches "Cho phép tự đăng ký", "Xác thực email bằng OTP khi đăng ký", "Bắt buộc chọn vai trò & nhóm khi đăng ký") | D-01 → "Cài đặt & Phân quyền" | `/settings?tab=general` | 1440, 390 |
| D-67 | Admin | Cài đặt · "Danh mục lĩnh vực" (form "Thêm lĩnh vực mới" / "Sửa lĩnh vực": name "Tên lĩnh vực, VD: Năng lượng tái tạo", colours, "Áp dụng cho" Dự án / Doanh nghiệp; tabs Tất cả / Dự án / Doanh nghiệp; rows ▲▼, toggle, "Sửa", "Xoá"; info "N đang hiển thị · M đã ẩn") | D-66 → left tab "Danh mục lĩnh vực" | `/settings?tab=categories` | 1440, 390 |
| D-68 | Admin | Category edit mode ("Sửa lĩnh vực", "Huỷ" / "Lưu") | D-67 → "Sửa" on a row | `/settings?tab=categories&edit=id` | 1440, 390 |
| D-69 | Admin | Cài đặt · "Vai trò & phân quyền" (matrix of roles Super Admin / Quản trị viên / Điều phối viên / Thành viên × permission keys, ✓ cells; "Lưu" gives toast "Đã lưu phân quyền") | D-66 → "Vai trò & phân quyền" | `/settings?tab=roles` | 1440, 390 |
| D-70 | Admin | Cài đặt · "Email chào mừng" (Tiêu đề, Lời chào, toggles "Nội dung kèm theo", attachments "Tiêu đề tài liệu" / URL, "Bổ sung tài liệu đính kèm", "Quy định hoạt động" + "+ Thêm quy định", "Gửi thử", "Lưu mẫu", live "Xem trước") | D-66 → "Email chào mừng" | `/settings?tab=welcome-mail` | 1440, 390 |
| D-71 | Admin | Cài đặt · "Gửi email (SMTP)" (Brevo; switch `[title="Bật/tắt gửi email"]`, Máy chủ SMTP, Cổng, Mã hóa, SMTP login, SMTP key + show/hide, "Kiểm tra kết nối", Tên / Email người gửi, Reply-to, Giới hạn / ngày, test email, "Gửi thử", "Khôi phục mặc định", "Lưu cấu hình") | D-66 → "Gửi email (SMTP)" | `/settings?tab=smtp` | 1440, 390 |
| D-72 | Admin | SMTP check error ("Không xác thực được – kiểm tra lại SMTP login / key.") vs OK (success box, toast "Kết nối Brevo SMTP thành công") | D-71 → "Kiểm tra kết nối" với SMTP key trống (mặc định trống; toast "Vui lòng nhập SMTP login và SMTP key của Brevo"); then fill → again | `/settings?tab=smtp` | 1440, 390 |
| D-73 | Admin | Cài đặt · "Tài khoản quản trị" ("N tài khoản có quyền truy cập Admin Dashboard", invite "Email người được mời..." + role + "Gửi lời mời", table Tài khoản / Vai trò / Bảo mật 2FA / Đăng nhập gần nhất, "Thu hồi" / "Chủ sở hữu") | D-66 → "Tài khoản quản trị" | `/settings?tab=admins` | 1440, 390 |
| D-74 | Admin | Admin invited (new row "Chờ chấp nhận") / invalid ("Email không hợp lệ") / revoke toast | D-73 → type `x@y.vn` → "Gửi lời mời" | `/settings?tab=admins` | 1440, 390 |
| D-75 | Admin | Cài đặt · "Nhật ký hoạt động" ("Nhật ký hoạt động quản trị · Ghi lại mọi thay đổi cấu hình và phân quyền trong 90 ngày.") | D-66 → "Nhật ký hoạt động" | `/settings?tab=audit-log` | 1440, 390 |
| D-76 | Admin | Settings SSO panel (provider cards with user counts, toggles, "Cấu hình", "Chính sách mật khẩu & bảo mật": min length, "Bắt buộc 2FA cho quản trị viên", "Khóa tạm sau 5 lần đăng nhập sai"). **Unreachable**: `stSso` is in the template but `setPage` maps the `sso` tab to `general` and the tab list has no SSO entry | n/a | `/settings?tab=sso` | 1440, 390 |
| D-77 | Admin | Settings language panel (default language, locales with translation %). **Unreachable** for the same reason | n/a | `/settings?tab=languages` | 1440, 390 |
| D-78 | Admin | Marketing (stats; tabs "Chiến dịch" / "Email tự động" / "Nhật ký gửi"; "+ Tạo chiến dịch"; campaign table "Gửi ngay" / "Nhân bản" / "Xóa"; log "Xem" / "Gửi lại"). **Unreachable**: there is no sidebar entry for `aTab='marketing'` | n/a | `/marketing` | 1440, 390 |
| D-79 | Admin | Marketing modal "Tạo chiến dịch email" (templates, "* Tên chiến dịch", "* Đối tượng nhận" Tất cả thành viên / Theo nhóm cộng đồng / Doanh nghiệp / Cá nhân, groups, "Ước tính N người nhận", "* Tiêu đề email", body, "Chèn biến", schedule, "Lưu nháp" / "Lên lịch" / "Gửi ngay"). Unreachable (via D-78) | n/a | `/marketing/campaigns/new` | 1440, 390 |
| D-80 | Admin | Toast (global, bottom; 2.2 s) | Any action with feedback | Toast/message component | 1440, 390 |

---

## Mâu thuẫn prototype ↔ rule — đã chốt

Cả 12 mâu thuẫn đã được PM chốt ngày 16/10/2026. Cột "Screen / state" và "Reproducible action sequence" ở trên vẫn mô tả **đúng hành vi prototype** (để tái hiện và so ảnh); app mới làm theo quyết định dưới đây. Chi tiết: [questions.md](questions.md), Decisions Log trong `coding-packs/01-REQUIREMENTS-MATRIX.md`.

| # | Mâu thuẫn | App mới làm theo | Quyết định | Dòng ảnh hưởng |
|---|---|---|---|---|
| C-01 | Popup bắt đóng phí không mở được | MSW có TK demo chưa đóng phí để dựng/chụp popup | D-28 | P-87, P-88 |
| C-02 | Đăng ký/SSO xong không vào app; mail gửi mật khẩu tạm | Kích hoạt xong vào `/community`; không gửi mật khẩu tạm; SSO mới → form bổ sung, bỏ OTP | D-30, D-45 | A-08, A-09, A-24, P-05 |
| C-03 | Chuyển Admin ↔ Portal làm dở | Hai app riêng; admin có `/account` và trình xem chat chỉ đọc | D-26 | D-03 và các nút "Xem chat" |
| C-04 | Admin thấy thông báo của user | Thông báo theo từng người | D-29 | D-04 |
| C-05 | Panel bảo mật, Marketing không có lối vào | Tab trong Cài đặt; Marketing là mục menu admin | D-33 | A-30, D-76 → D-79 |
| C-06 | Khóa đăng nhập không có tác dụng | 5 lần sai → khóa 15 phút; TK bị khóa → 403; TK dùng thử chỉ hiện ở dev/demo | D-34, D-35, D-44 | A-01 → A-05 |
| C-07 | Xác minh DN mâu thuẫn | Huy hiệu tự gắn theo MST; không khớp → admin duyệt tay | D-40 | Hồ sơ, Thành viên |
| C-08 | Số liệu lệch giữa màn | 34 cộng đồng; Super Admin seed `admin@opchub.community`; số lấy từ API | D-29, D-38 | A-01, D-01 |
| C-09 | Thanh toán giả lập; giá "Ưu đãi 75%" | Webhook + outbox; "600.000đ/năm (≈ 50.000đ/tháng)"; đối soát theo Mã TV | D-31, D-41 | Gói dịch vụ, Phí thành viên |
| C-10 | Đổi quyền/xóa/xuất không xác nhận | Bảng chỉ hiển thị quyền; đổi ở Phân quyền (`s.role`); mọi thao tác nguy hiểm xác nhận + audit | D-32, D-42 | Thành viên, Nhóm, Dự án |
| C-11 | Chủ nhóm / điều phối không rõ | Chủ nhóm theo nhóm; `c.mod` toàn cục; báo cáo ẩn danh với chủ nhóm | D-43 | Chat nhóm |
| C-12 | Popup không có URL | Chỉ chi tiết sự kiện, dự án có URL | D-39 | Cột "Suggested route" |

## Counts

- **Auth:** 30 states (A-01 … A-30)
- **Portal:** 95 states (P-01 … P-95)
- **Admin:** 80 states (D-01 … D-80)
- **Total:** 205 states
- **Unreachable or design-only:** 8 states. These are A-30, P-61 (seed only), P-87, P-88, D-76, D-77, D-78 and D-79.

## Sửa sau proto-only

Chạy `PARITY_MODE=proto-only PARITY_IDS='P-*,D-*'` trên prototype (16/10/2026), sửa các dòng có chuỗi thao tác / viewport sai:

| ID | Sửa |
|---|---|
| P-15 | Nút `[title="Trang chủ"]` bị ẩn ở 390 → viewport chỉ 1440 |
| P-29, P-31, P-32, P-33 | Danh sách chủ đề (`data-m="chlist"`) ẩn ở 390 → viewport chỉ 1440 |
| P-40 | Ở 1440 bảng thông tin mở sẵn (nút có title "Ẩn bảng thông tin"); chỉ 390 mới cần bấm "Hiện thành viên, file, ghim" |
| P-47 | Thêm bước lọc "Đã tham gia"; ở 390 thông điệp "Bạn chưa tham gia nhóm nào…" nằm trong cột ẩn, chỉ thấy "Chỉ thành viên nhóm mới xem và gửi được tin nhắn." |
| P-53 | Nút trên thẻ là "Đăng ký tham gia", không phải "Đăng ký" |
| P-54 | Phải bấm "Chi tiết" trên thẻ Demo Day để mở modal; nút thẻ đã là "Hết chỗ" |
| P-80, P-81 | Đảo: user demo là DN nên "Tư vấn" mở sẵn biến thể Doanh nghiệp (P-81); biến thể Cá nhân (P-80) cần bấm "Cá nhân" |
| P-82 | Họ tên đã điền sẵn; toast đầu tiên khi gửi trống là "Vui lòng chọn loại hình tổ chức" |
| P-83 | Cần chọn thêm "Loại hình" ngoài Tỉnh / thành + Mô tả |
| D-17, D-22 | Seed 8 thành viên, mặc định 1 trang → phải đổi "6 / trang" mới có trang 2 |
| D-45 | Seed 5 sự kiện → không có trang 2; chụp thanh phân trang 1 trang |
| D-52 | Tab "Đã ẩn" có 1 dự án (không trống); trống là "Bị từ chối", "Bản nháp" |
| D-57 | Mỗi tab ít dự án; kịch bản chụp tab "Đang hiển thị" |
| P-46 | Prototype tự cuộn trang + rail xuống đáy khi mở xem trước (tác dụng phụ `_scroll`); kịch bản đưa mọi vùng cuộn về đầu trước khi chụp |
| D-72 | SMTP key mặc định đã trống; bấm "Kiểm tra kết nối" ngay, kèm toast "Vui lòng nhập SMTP login và SMTP key của Brevo" |

Không tái hiện được (bỏ qua trong proto-only): P-61, P-87, P-88, D-76, D-77, D-78, D-79 — lý do ghi trong `e2e/parity/scenarios/*` (`unreachable`).

## Ver2 — prototype v4 Ant / SRS-3.6 (TIP-V2-307, 20/10/2026)

Baseline chụp lại toàn bộ từ `docs/spec/index.html` ver2 (`PARITY_MODE=proto-only`). Không tái dùng id cũ cho trạng thái mới.

### Bỏ ở ver2 (gỡ khỏi `e2e/parity/scenarios`)

| ID | Trạng thái cũ | Lý do |
|---|---|---|
| P-31, P-32, P-33 | Chat: form tạo chủ đề / đã tạo / chủ đề trống | NA-09, D-61: chủ đề do quản trị viên tạo — prototype và app đều bỏ "Tạo chủ đề" ở Portal |
| D-15 | Thành viên: đổi "Quyền hệ thống" | RB-R01: TK quản trị tách khỏi thành viên, bỏ cột/hộp đổi quyền (D-49) |

D-74 giữ id nhưng đổi nội dung: "Gửi lời mời" → hộp thoại "+ Tạo tài khoản quản trị" (RB-R02, đã đổi ở TIP-V2-204).

### Sửa chuỗi thao tác

| ID | Sửa |
|---|---|
| A-05 | Ver2 bỏ khối "Tài khoản dùng thử – bấm để điền" trên prototype → `unreachable` |
| A-29 | Đăng xuất nằm trong menu người dùng ở topbar (`[data-m="me"]`), bỏ nút cuối sidebar |
| P-16 | Thẻ "Sự kiện gần nhất" → khối "Sự kiện sắp tới" (3 sự kiện) + "Xem tất cả" |
| P-52 | Chờ thêm câu "Link phòng họp Google Meet hiển thị sau khi bạn đăng ký tham gia." (D-59) |
| P-79 | Thêm viewport 1366×768 (AT-LK04, REQ-391: popup V4 không thanh cuộn) |
| P-80 → P-83 | Chọn dịch vụ theo tên "Đào tạo & Ươm mầm OPC" (bỏ chỉ số vị trí) |
| P-84 | Chờ khối "Điều kiện thanh toán" (NR-R01) |
| P-89 → P-95 | "Hồ sơ cá nhân" mở từ menu người dùng ở topbar (bỏ thẻ hồ sơ cuối sidebar) |

### Thêm

| ID | Trạng thái | Viewport |
|---|---|---|
| P-96 | Chi tiết sự kiện · đã đăng ký: khối Google Meet + "Vào phòng họp" (D-59) | 1440, 390 |
| P-97 | Portal · Affiliate — đã bật trong `portal-account.ts`, xem evidence TIP-V2-403 | 1440, 390 |
| P-98 | Portal · Affiliate · Lịch sử nhận tiền — đã bật trong `portal-account.ts` | 1440, 390 |
| A-31 | Đăng ký · mã giới thiệu hợp lệ "✓ Được giới thiệu bởi …" — đã bật trong `auth.ts` | 1440, 390 |
| A-32 | Đăng ký · "Mã giới thiệu không tồn tại" — đã bật trong `auth.ts` | 1440, 390 |
| D-81 | Xem thử vai trò Kế toán: menu theo vai trò + dải cam "Thoát xem thử" (RB-R09, AT-RB02) | 1440, 390 |
| D-82 | Chế độ chỉ xem: Giảng viên mở Thành viên (AT-RB03) | 1440, 390 |
| D-83 | Đổi mật khẩu lần đầu sau khi tạo TK quản trị (AT-SEC01, RB-R02) | 1440 |
| D-84 | Admin · Affiliate · Hoa hồng mặc định — đã bật, source 94b60c0 đạt cả hai ảnh | 1440, 390 |
| D-85 | Admin · Affiliate · Chi tiết đại lý · Đối soát tháng — đã bật, source 94b60c0 đạt cả hai ảnh | 1440, 390 |
| D-84-AFF | Admin · Affiliate · tab Đại lý mặc định (giữ mọi đại lý tự động từ API) | 1440, 390 |
| D-84-AFF-Q | Admin · Affiliate · tab Đại lý, tìm HAOPC bằng UI | 1440, 390 |
| D-84-POL | Admin · Affiliate · tab Chính sách | 1440, 390 |
| D-84-COM-BULK | Admin · Affiliate · tìm Nguyễn Văn An, chọn Đỗ Minh Tuấn và Đặng Ngọc Ánh | 1440, 390 |
| D-84-COM-RECORDED | Admin · Affiliate · chọn bộ lọc Đã ghi nhận qua UI, 19 khoản, 10 dòng trang đầu | 1440, 390 |
| D-84-COM-PAID | Admin · Affiliate · chọn bộ lọc Đã chi trả qua UI, 31 khoản, 10 dòng trang đầu | 1440, 390 |
| D-84-COM-CANCELLED | Admin · Affiliate · chọn bộ lọc Đã hủy qua UI, một khoản | 1440, 390 |
| D-84-COM-RECORDED-MENU | Admin · Affiliate · lọc Đã ghi nhận → mở menu dòng đầu, không đổi trạng thái | 1440, 390 |
| D-84-COM-PAID-MENU | Admin · Affiliate · lọc Đã chi trả → mở menu dòng đầu; giữ bất biến khoản đã chi | 1440, 390 |
| D-84-COM-CANCELLED-MENU | Admin · Affiliate · lọc Đã hủy → mở menu dòng đầu; không khôi phục khoản terminal | 1440, 390 |
| D-84-AFF-BULK | Admin · Affiliate · tìm và chọn HAOPC | 1440, 390 |
| D-84-COM-EMPTY | Admin · Affiliate · Hoa hồng không có kết quả sau tìm kiếm, kiểm có dòng trước khi lọc | 1440, 390 |
| D-84-AFF-EMPTY | Admin · Affiliate · Đại lý không có kết quả sau tìm kiếm, kiểm có dòng trước khi lọc | 1440, 390 |
| D-85-CUS | Admin · Affiliate · Chi tiết HAOPC, tab Khách hàng của đại lý | 1440, 390 |
| D-85-RATE | Admin · Affiliate · Chi tiết HAOPC, trạng thái sửa tỷ lệ cá nhân | 1440, 390 |
| D-86 | Tạo nhóm · "+ Thêm chủ đề" (chủ đề chỉ quản trị viên tạo, NA-09) | 1440, 390 |
| D-87 | Sự kiện · khối "Sắp diễn ra" + "Tiếp theo" (TIP-V2-303) | 1440, 390 |
| D-88 | Tạo sự kiện Online · "Link Google Meet" + "Tạo link Meet" (D-59) | 1440, 390 |
| D-89 | Gán vào nhóm · vai trò "Giảng viên" (GR-R01) | 1440, 390 |

Trạng thái ver2 đã có sẵn id cũ (không thêm): popup V4 + 6 dịch vụ (P-79), câu "không hoàn lại" ở tham gia nhóm (P-23/P-24) và đăng ký (A-1x), Chat "CHỦ ĐỀ THẢO LUẬN · do Admin tạo" (P-28), drawer danh sách đăng ký + check-in x/y (D-46), ma trận 25 quyền × 5 vai trò (D-69), hộp thoại tạo TK quản trị (D-74), cột "Vai trò khi đăng ký" (D-07).

### Counts ver2

- Auth 32 (A-01 … A-32), Portal 95 (P-01 … P-98, bỏ 3, thêm 3), Admin 88 (D-01 … D-89, bỏ D-15, thêm 9). **Tổng 215 trạng thái.**
- Năm trạng thái con Affiliate mới (D-84-AFF/AFF-Q/POL, D-85-CUS/RATE): Admin
  tăng lên 93, **tổng danh mục ver2 220 trạng thái**. Đây là số trạng thái được
  liệt kê, không phải tuyên bố toàn bộ đã chạy hoặc đạt parity.
- Số ảnh đo, đạt, DV, unreachable: xem [results.md](results.md) và [server/results.md](server/results.md).
- Bốn trạng thái chọn/rỗng Affiliate bổ sung: Admin **97**, tổng danh mục **224**
  trạng thái. Affiliate hiện đăng ký 11 trạng thái/22 ảnh; chưa phải inventory
  đầy đủ cho mọi dialog/pending/error/permission. Không tính proto-only là pass
  so khớp app và không coi selector trả rỗng là bằng chứng nếu thiếu positive control.

## V4.2 D-112 bot scheduling (TIP-V42-713)

| ID | Area | State | Prototype steps | App | Viewports |
|---|---|---|---|---|---|
| D-36-SCHEDULE-WAIT | Admin Bot | Future schedule | Bot tương tác → Từ ngày2099-01-01 | /bots |1440,390|
| D-36-SCHEDULE-END | Admin Bot | Ended schedule | Bot tương tác → Đến ngày2020-01-01 | /bots |1440,390|
| D-36-SCHEDULE-PAUSE | Admin Bot | Manual pause | Bot tương tác → Tạm dừng bot | /bots |1440,390|
| D-36-SCHEDULE-CLEAR | Admin Bot | Clear dates retains pause | Future schedule → pause → Xóa lịch | /bots |1440,390|

| D-36-REPLIES | Admin | Bot · Trả lời từng tin | Bot tương tác → Trả lời từng tin | `/bots/replies` | 1440, 390 |

### TIP-V42-713 bulk AI states

| ID | Area | State | Prototype actions | App route | Viewports |
|---|---|---|---|---|---|
| D-39-BULK | Admin | Bulk AI modal | Bot > conversation scripts > AI bulk | /bots/scripts | 1440, 390 |
| D-39-BULK-TYPE | Admin | Custom-type editor | Open bulk > add conversation type | /bots/scripts | 1440, 390 |
| D-39-BULK-FORM | Admin | Populated form | Open bulk > one topic, one script, Hanoi group | /bots/scripts | 1440, 390 |
| D-39-BULK-RESULT | Admin | Generated results | Populated form > generate > reveal results | /bots/scripts | 1440, 390 |

### TIP-V46-801 — GĐ Vùng

| ID | Area | State | Prototype actions | App route | Viewports |
|---|---|---|---|---|---|
| D-120-GCFG | Admin | Cấu hình GĐ Vùng | Affiliate > Cấu hình GĐ Vùng | /affiliate?tab=gcfg | 1440, 390 |
| D-120-GCFG-RO | Admin | Kế toán chỉ xem | Cài đặt > xem thử Kế toán > Affiliate > Cấu hình GĐ Vùng | /affiliate?tab=gcfg | 1440, 390 |
| D-120-GDV | Admin | Danh sách GĐ Vùng / sổ chia sẻ | Affiliate > GĐ Vùng | /affiliate?tab=gdv | 1440, 390 — 802 đã đo, chưa đạt cả hai |
| D-120-GDV-OPEN | Admin | Khoản ghi nhận Miền Bắc + lịch sử | Affiliate > GĐ Vùng > mở Miền Bắc | /affiliate?tab=gdv | 1440, 390 — 802 đã đo, chưa đạt |
| D-18-GDV | Admin | Miễn phí · GĐ Vùng | Phí thành viên > Miễn phí · GĐ Vùng | /fees?status=gdv | 1440, 390 |
| D-78-GDV | Admin | Email hệ thống GĐ Vùng | Marketing > Email tự động | /marketing?tab=auto | 1440, 390 |

### TIP-V46-803 — đo ở source 87253d95

| ID | Route/state | 1440 | 390 |
|---|---|---|---|
| D-84 | /affiliate?tab=com | 6.614% FAIL | 3.662% FAIL |
| D-84-AFF | /affiliate?tab=aff | 5.871% FAIL | 9.611% FAIL |
| D-84-AFF-Q | /affiliate?tab=aff&q=HAOPC | 1.702% PASS | 24.587% FAIL |
| D-84-POL | /affiliate?tab=cfg | 3.917% FAIL | 10.151% FAIL |
| D-85 | /affiliate/:id | 1.089% PASS | 7.488% FAIL |
| D-85-CUS | /affiliate/:id?tab=customers | 8.453% FAIL | 16.518% FAIL |

Đã đo cả 8 D-84-COM-* substates ở 1440/390; xem bảng baseline → cuối trong
[TIP-803 completion](../TIP-V46-803-completion.md#com-substates--so-với-baseline-mới).
Ngưỡng 3% giữ nguyên; đây là PARTIAL, không đánh dấu hoàn tất parity.

## V4.6 — TIP-V46-804

| ID | Khu vực | Trạng thái / thao tác | Route app | Viewport |
|---|---|---|---|---|
| P-V46-REG-BANNER | Portal m3 | Đăng nhập GĐ Vùng Bắc → Mạng lưới Affiliate, banner trên cảnh báo STK | /affiliate | 1440, 390 |
| P-V46-REG | Portal m3 | Banner → Xem Vùng của tôi; bảng vùng chỉ đọc | /affiliate?tab=reg | 1440, 390 |

P-97/P-98 được đo baseline trước thay đổi và đo lại; xem TIP-V46-804-completion.md. Ngưỡng 3% giữ nguyên.
# V4.6 — TIP-V46-805 (D-134: reference + owner image review)

| ID | Khu vực | Trạng thái / thao tác | Route app | Viewport |
|---|---|---|---|---|
| D-V46-RENEW | Admin | Cài đặt → Nhắc gia hạn; ba mốc, hai kênh D-125, danh sách đúng đối tượng | /settings?tab=renewal | 1440, 390 |

Đo baseline D-66 → D-75 trước build 805; lưu số đo trước/sau trong completion.
Không sinh sáu khoản phí giả để ép bảng giống prototype; fixture opt-in 12 ngày chỉ cho acceptance.

## V4.6 — TIP-V46-806 (D-134, D-135)

| ID | Khu vực | Trạng thái / thao tác | Route app | Viewport |
|---|---|---|---|---|
| D-V46-BANK | Admin | Cài đặt → Đối soát ngân hàng; cổng, webhook, tự kích hoạt và năm giao dịch mẫu | /settings?tab=bank | 1440, 390 |

Không mask hoặc nới ngưỡng 3%. Cổng chưa hỗ trợ và nút fake theo D-135,
cú pháp OPCHUB theo D-123; số liệu giao dịch là fixture, không sửa ledger để khớp ảnh.

### TIP-V46-808 — Tìm kiếm chung

| ID | App | Trạng thái | Route | Viewport |
|---|---|---|---|---|
| P-V46-SEARCH | Portal | Topbar gõ MediaSoft; mobile ẩn ô | /dashboard |1440,390 |
| D-V46-SEARCH | Admin | Topbar gõ MediaSoft; mobile ẩn ô | /overview |1440,390 |

Không mask, không nới ngưỡng. Visibility/quyền theo TIP; không lộ dữ liệu ẩn để khớp prototype.

| P-V46-PUBLIC-CARD | Portal | Trang công khai in edit wizard | Gian hàng địa phương → Gian hàng của tôi → Chỉnh sửa gian hàng | `/stores/mine` edit | 1440,390 |
| P-V46-GUEST | Portal | Anonymous business page, no prototype counterpart | Actual guest URL only; owner reviews images | `/g/htx-ca-phe-hoa-phu` | 1440,390 |

### TIP-V46-811

- D-V46-AI — AI Provider,1440/390; D124 no assistant; Q811 price fields, real inactive providers/spend.
- D-V46-APP — App & notifications,1440/390; configuration only perD125, in-app Admin test.
