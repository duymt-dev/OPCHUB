# AUDIT-W1 · Làn B — Truy vết yêu cầu → test (TEST-GAPS)

> Rà soát tại `main` @ `70cfcbb` (2026-10-18). Chỉ đọc, không chạy test. Kết quả chạy lấy theo báo cáo đã commit: e2e behavior 115/115 ở cả MSW lẫn server thật (`coding-packs/reports/B6-completion.md`, `TIP-B62-completion.md`).
> Phân loại đọc từ nội dung `it`/`test` và các `expect`, không theo tên file. `e2e/parity/**` không tính.

## 0. Quy ước

Viết tắt đường dẫn:

| Viết tắt | Đường dẫn |
|---|---|
| `S/` | `apps/server/test/` (integration, `*.int.spec.ts`) |
| `C/` | `apps/server/test/contract/` (contract) |
| `E/` | `e2e/behavior/` (Playwright, chạy cả MSW lẫn server; nhánh `onServer` ghi ở mục 4) |
| `SV/` | `apps/server/src/` (unit) |
| `PU/` · `AU/` | `apps/portal/src/` · `apps/admin/src/` (unit FE; `mocks/*.spec.ts` là handler MSW) |
| `SH/` · `IN/` · `UI/` · `DB/` | `packages/shared/src/` · `packages/integrations/src/` · `packages/ui/src/` · `packages/db/test/` |

Loại: `unit`, `unit-msw` (handler/mock-data MSW), `int`, `contract`, `e2e` (= cùng assertion chạy cả `e2e-msw` và `e2e-server`), `e2e-msw` / `e2e-server` khi chỉ một chế độ.

Mức phủ: **ĐỦ** — nhánh chính + ngoại lệ/biên đặc tả nêu đều có assertion. **MỘT PHẦN** — ghi rõ thiếu gì. **TRỐNG** — không có test nào kiểm hành vi. Đánh dấu `[KT]` cho quyết định thuần kỹ thuật/hạ tầng (không kiểm được bằng test hành vi; vẫn tính vào thống kê).

## 1. Thống kê

| Nhóm | Tổng | ĐỦ | MỘT PHẦN | TRỐNG |
|---|---|---|---|---|
| REQ (68 REQ-ID chức năng) | 68 | 35 (51,5%) | 25 (36,8%) | 8 (11,8%) |
| NFR (NFR-01 → 06) | 6 | 0 (0%) | 4 (66,7%) | 2 (33,3%) |
| D (D-01 → D-48) | 48 | 21 (43,8%) | 17 (35,4%) | 10 (20,8%) |
| BR (BR-01 → BR-13) | 13 | 7 (53,8%) | 5 (38,5%) | 1 (7,7%) |
| QT (QT-01 → QT-13) | 13 | 2 (15,4%) | 11 (84,6%) | 0 (0%) |
| UAT (UAT-01 → UAT-31) | 31 | 15 (48,4%) | 14 (45,2%) | 2 (6,5%) |
| Ma trận §11 (12 dòng) | 12 | 3 (25,0%) | 5 (41,7%) | 4 (33,3%) |
| **Tổng chung** | **191** | **83 (43,5%)** | **81 (42,4%)** | **27 (14,1%)** |

Trong 27 dòng TRỐNG có 10 dòng `[KT]` hoặc hoãn theo quyết định: D-03, D-12, D-23, D-36, D-37, NFR-04, NFR-05 và nhóm Zalo ZNS (REQ-015, D-16, D-25). 17 dòng TRỐNG còn lại là hành vi nghiệp vụ hoặc quyết định sản phẩm chưa có test.

---

## 2. Bảng truy vết

### 2.1 REQ — D1 Xác thực & tài khoản

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| REQ-015 | OTP SĐT qua Zalo ZNS (để sau go-live) | — | — | TRỐNG | Để sau theo D-25; không có adapter test `PhoneOtpProvider` |
| REQ-001 | Đăng nhập email/SĐT + MK, ghi nhớ, khoá 15' sau 5 lần sai, chặn TK khoá | `S/account/auth.int.spec.ts` "đăng nhập bằng email…" (:40), "không ghi nhớ → cookie phiên" (:54), "đăng nhập bằng SĐT dạng 0xxx" (:60), "sai mật khẩu → 401…" (:67), "D-44: sai 5 lần → lần 6 … 429 + Retry-After" (:75), "TK bị khoá → 403" (:83); `E/a-01-login.spec.ts` "bỏ trống…", "sai mật khẩu…", "admin đăng nhập…" | int, e2e | ĐỦ | Khoá theo IP và màn login báo thời gian chờ chưa kiểm (xem D-44) |
| REQ-002 | SSO Google/FB/LinkedIn; ChatGPT/Gemini/DeepSeek đi Google; Admin bật/tắt từng nút | `S/account/sso.int.spec.ts` (:26, :75, :85, :91) chỉ provider `google` + provider lạ 404; `S/settings/settings-admin.int.spec.ts` "bảo mật: tắt SSO → audit sso" (:66); `E/auth-flows.spec.ts` "Google → form bổ sung…" (:133); `E/admin-settings.spec.ts` "SSO + chính sách bảo mật" (:225) | int, e2e | MỘT PHẦN | Không test Facebook/LinkedIn callback; không test ChatGPT/Gemini/DeepSeek đi luồng Google; không test nút đã tắt thì bị ẩn/chặn ở màn login hoặc callback |
| REQ-003 | Đăng ký cá nhân: họ tên, SĐT ASEAN, email, MK, vai trò, ≥1 nhóm, đồng ý điều khoản | `S/account/register.int.spec.ts` "cá nhân: 202 → OTP…" (:63), "email hoặc SĐT đã có TK → 409" (:109), "mật khẩu yếu → 400" (:122); `E/auth-flows.spec.ts` "thiếu vai trò → báo…" (:24), "đổi mã quốc gia SĐT" (:84); `PU/mocks/register-handlers.spec.ts` "thiếu nhóm → báo lỗi tiếng Việt" | int, e2e, unit-msw | MỘT PHẦN | Server không có test âm: thiếu vai trò, `groupIds` rỗng, không đồng ý điều khoản. Chặn vai trò/email chỉ kiểm toast FE |
| REQ-004 | Đăng ký DN: MST 10/13 số → tra tự điền tên + ngành, sửa được; fallback nhập tay | `S/account/register.int.spec.ts` "DN: tên khớp MST → verified; MST không tra được → pending" (:161), "tra MST: hợp lệ…; sai định dạng 400; không thấy 404" (:183); `IN/tax-lookup/chain.spec.ts` "ESGOO lỗi 500 → dùng VietQR", "cả hai lỗi → null"; `E/auth-flows.spec.ts` "MST sai → báo; đúng → tự điền…" (:56) | int, unit, e2e | ĐỦ | Cache Redis 30 ngày không kiểm (ghi ở D-17) |
| REQ-005 | OTP email 6 số/10'; gửi lại; đúng → Hoạt động ngay | `S/account/register.int.spec.ts` (:63 `expiresInSec: 600`), "OTP sai → 422…; sai 5 lần → mã bị huỷ" (:138), "gửi OTP quá 3 lần / 15 phút → 429" (:151); `E/auth-flows.spec.ts` (:24 thiếu số, sai mã, Gửi lại, đúng) | int, e2e | MỘT PHẦN | Không test OTP hết hạn sau 10 phút (không có test tua thời gian) |
| REQ-006 | Email chào mừng: lời chào, quy định, tài liệu đính kèm; không gửi MK | `S/account/register.int.spec.ts` (:63 `welcome.bodyHtml` không chứa "mật khẩu"); `SV/modules/mail/templates.spec.ts` "OTP có mã…; chào mừng có nút đăng nhập, không mật khẩu (D-47)"; `E/portal-shell.spec.ts` "đăng ký xong: modal mail chào mừng một lần…" (:109) | int, unit, e2e | MỘT PHẦN | Không kiểm tài liệu đính kèm có trong thư |
| REQ-007 | Quên MK: link 15', ≤3 lần/giờ, thu hồi mọi phiên | `S/account/password.int.spec.ts` "forgot…" (:55), "reset: token đúng → 204…, access cũ 401, token dùng lần 2 → 400" (:66), "reset: mật khẩu yếu → 400" (:87), "forgot quá 3 lần/giờ…" (:96); `C/account-auth.int.spec.ts` "quên mật khẩu → đặt lại bằng token trong mail" (:163); `E/auth-flows.spec.ts` "gửi liên kết → Đã gửi email" (:107) | int, contract, e2e | MỘT PHẦN | Không test token hết hạn sau 15'. Không có e2e mở `/reset-password?token=` (link mail trỏ tới `PORTAL_URL/reset-password`, `SV/modules/account/services/password-reset.service.ts:51`; Portal không có route `reset-password` trong `PU/app/(public)/`). E2E forgot bấm gửi mà không nhập email |
| REQ-008 | Đăng xuất; JWT access 15' + refresh 7d xoay vòng, thu hồi được | `S/account/auth.int.spec.ts` "refresh xoay vòng; dùng lại cookie cũ → 401…" (:90), "refresh từ Origin lạ → 403" (:106), "logout thu hồi phiên" (:112); `S/common/guards.int.spec.ts` "JwtAuth: token hết hạn → 401" (:76); `PU/lib/session.spec.ts`; `E/membership.spec.ts` Đăng xuất (:80) | int, unit, e2e | ĐỦ | Giá trị TTL 15'/7d không assert |
| REQ-009 | Đổi mật khẩu | `S/account/password.int.spec.ts` "change: sai mật khẩu hiện tại → 400…; thiết bị khác bị thu hồi" (:104); `E/profile.spec.ts` "bảo mật: đổi mật khẩu, độ mạnh…" (:80) | int, e2e | ĐỦ | |
| REQ-010 | SSO trùng email TK có sẵn → liên kết sau khi xác thực MK/OTP | `S/account/sso.int.spec.ts` "email đã có TK → existing + cookie refresh" (:75) kiểm điều NGƯỢC lại: đăng nhập luôn, không xác thực | int | TRỐNG | Không test bước xác thực MK/OTP trước khi liên kết. Mâu thuẫn REQ-010 ↔ D-45 → mục Câu hỏi |
| REQ-011 | Quản lý TK quản trị + 2FA TOTP bắt buộc cho Admin | `S/account/password.int.spec.ts` "TOTP: TK đã bật → login 401 + mfaToken…" (:147); `SV/modules/account/domain/totp.spec.ts`; `S/settings/roles-admins.int.spec.ts` "mời → invited…" (:55); `E/admin-settings.spec.ts` "Tài khoản quản trị…" (:179) | int, unit, e2e | MỘT PHẦN | Không test "bắt buộc": Admin chưa bật TOTP vẫn đăng nhập được (e2e admin đăng nhập không có TOTP). Không có e2e màn nhập TOTP |
| REQ-012 | Hồ sơ cá nhân/DN, ảnh đại diện, SSO đã liên kết | `S/account/profile.int.spec.ts` (:47, :60, :81, :91, :96, :136); `C/account-me.int.spec.ts` "hồ sơ…" (:51); `E/profile.spec.ts` (:22, :47, :80) | int, contract, e2e | ĐỦ | Upload ảnh đại diện chỉ kiểm presign (server) + MSW `PU/mocks/profile-handlers.spec.ts` |
| REQ-013 | Lưu vết đồng ý điều khoản (phiên bản + thời điểm) | `S/account/register.int.spec.ts` (:97 `consent.count = 2`) | int | MỘT PHẦN | Không assert phiên bản, thời điểm; không kiểm consent ở luồng SSO hoàn tất |
| REQ-014 | Xoá tài khoản / rút đồng ý (NĐ 13) | — | — | TRỐNG | Không có endpoint lẫn test |

### 2.2 REQ — D2 Phí thành viên & đối soát

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| REQ-020 | Popup Gói dịch vụ bắt buộc khi Chờ TT/Hết hạn; vẫn Tư vấn + Đăng xuất | `E/membership.spec.ts` "popup bắt buộc: không ×, Esc/nền chỉ nhắc; vẫn Tư vấn được; Đăng xuất" (:57); `UI/paywall-modal/paywall-modal.spec.tsx`; `PU/features/membership/model.spec.ts` "BR-03: chưa thanh toán / hết hạn → bắt buộc" | e2e, unit | MỘT PHẦN | E2E chỉ dùng TK Chờ TT; TK Hết hạn chỉ kiểm ở unit model. Tên test nói "nền" nhưng chỉ bấm Esc, không bấm nền |
| REQ-021 | API `402 MEMBERSHIP_REQUIRED`; WS `membership.updated` đóng popup | `S/common/guards.int.spec.ts` "Paywall: pending_payment / expired → 402…" (:93), "Paywall đọc Redis mới nhất" (:107); `S/membership-fee/membership.int.spec.ts` "paywall: token cũ … có publish realtime" (:58); `E/membership.spec.ts` "chuyển khoản → … popup tự đóng" (:86) | int, e2e | ĐỦ | |
| REQ-022 | Mã TV + nội dung `OPCHUB [Mã TV] [SĐT]` + QR VietQR, 600.000đ | `S/membership-fee/membership.int.spec.ts` "GET /me/membership: nội dung CK…" (:32); `E/membership.spec.ts` "thông tin CK + sao chép…" (:27) | int, e2e | MỘT PHẦN | Không kiểm QR VietQR (URL/ảnh) |
| REQ-023 | Webhook qua adapter chung, verify chữ ký, idempotent theo mã GD | `S/membership-fee/reconcile.int.spec.ts` "chữ ký sai → 401" (:63), "webhook gửi lại + quét bù cùng bank_txn_id…" (:125), "hai lần khớp song song…" (:139); `IN/bank-webhook/content.spec.ts` "đúng chữ ký → true, sai 1 ký tự → false" | int, unit | ĐỦ | Chỉ FakeBank; SePay provider không có test (D-07) |
| REQ-024 | Quét bù định kỳ 2' | `S/membership-fee/reconcile.int.spec.ts` (:125 `reconcile.poll()`); `S/membership-fee/membership.int.spec.ts` (:58) | int | MỘT PHẦN | Chỉ gọi `poll()` tay; không kiểm job lặp 2' được đăng ký |
| REQ-025 | Hàng đợi GD không khớp, Admin gán | `S/membership-fee/admin-fees.int.spec.ts` "giao dịch không khớp → khớp tay…; khớp lần 2 → 409" (:102); `C/membership-fee.int.spec.ts` "webhook ký HMAC + dev simulate → giao dịch không khớp → khớp tay" (:62) | int, contract | ĐỦ | Không có e2e UI hàng đợi |
| REQ-026 | Job hằng ngày → Sắp hết hạn (≤30d) / Hết hạn | `S/membership-fee/reconcile.int.spec.ts` "scheduler: còn 20 ngày → expiring; quá hạn → expired; chạy 2 lần không đổi thêm" (:151); `SV/modules/membership-fee/domain/membership-fee.state.spec.ts` | int, unit | ĐỦ | |
| REQ-027 | Lịch sử kỳ phí, gia hạn cộng nối tiếp | `S/membership-fee/reconcile.int.spec.ts` "đang active còn 100 ngày → nối tiếp từ ngày hết hạn (BR-05)" (:89); `membership-fee.state.spec.ts` (:25, :33, :39) | int, unit | ĐỦ | |
| REQ-028 | Admin Phí: KPI, lọc, Ghi nhận đã thu, Gia hạn 12 tháng, Gửi nhắc đơn/hàng loạt | `S/membership-fee/admin-fees.int.spec.ts` (:31, :46, :62, :87); `C/membership-fee.int.spec.ts` "admin…" (:101); `E/admin-fees.spec.ts` (:26, :50, :63, :93) | int, contract, e2e | MỘT PHẦN | Thao tác "Gia hạn 12 tháng" (`renew`) không có test server; chỉ `SH/mock-data/domains/domains.spec.ts` "BR-05: gia hạn nối tiếp" (MSW). E2E chỉ thấy nút hiện ra |
| REQ-029 | Huỷ ghi nhận nhầm / hoàn tiền | — | — | TRỐNG | |
| REQ-030 | Nhắc phí tự động trước 30/7/1 ngày | — | — | TRỐNG | Không thấy job nhắc tự động trong `SV/worker` |

### 2.3 REQ — D3 Cộng đồng & nhóm

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| REQ-040 | 34 nhóm, tìm, lọc khu vực, 9/trang | `S/community/groups.int.spec.ts` "seed: 34 nhóm, lọc Miền Trung, tìm theo tỉnh…" (:29); `E/community.spec.ts` (:26, :48 "Hiển thị 1–9 / 34"); `PU/features/community/model.spec.ts` | int, e2e, unit | ĐỦ | API mặc định 12/trang (assert ở :50, gắn nhãn BR-12) khác 9/trang → Câu hỏi |
| REQ-041 | Tham gia: đồng ý nội quy; nhóm duyệt cần lời giới thiệu; Huỷ yêu cầu | `S/community/groups.int.spec.ts` "nhóm mở: join…" (:53), "nhóm duyệt: thiếu intro → 409, có intro → pending + outbox, huỷ → cancelled" (:75); `E/community.spec.ts` (:62, :82) | int, e2e | MỘT PHẦN | "Đồng ý nội quy" chỉ kiểm toast FE; server không có test âm khi không đồng ý |
| REQ-042 | Chủ nhóm duyệt/từ chối trên panel; thông báo kết quả | `S/community/join-requests.int.spec.ts` (:44, :58, :80, :100); `S/notification/notifications.int.spec.ts` "duyệt vào nhóm → thông báo group" (:101); `E/chat.spec.ts` "bảng thông tin: duyệt yêu cầu…" (:108) | int, e2e | ĐỦ | |
| REQ-043 | Rời nhóm | `S/community/groups.int.spec.ts` (:53); `E/community.spec.ts` (:62); `E/profile.spec.ts` (:63) | int, e2e | ĐỦ | Chủ nhóm không tự rời được chỉ thể hiện qua nhánh `onServer` (mục 4) |
| REQ-044 | Admin Nhóm CRUD, 12/trang, xuất thành viên | `S/community/admin-groups.int.spec.ts` (:33, :44, :104); `C/community.int.spec.ts` (:96, :148); `E/admin-groups.spec.ts` (:26 "1–12 / 34", :55, :93, :105) | int, contract, e2e | ĐỦ | API admin mặc định size 10 (:40), UI 12 |
| REQ-045 | Admin Thành viên: 10/trang, khoá/mở (thu hồi phiên), gán nhóm giữ nhóm cũ, xuất CSV | `S/account/admin-users.int.spec.ts` (:30, :69, :112, :181, :201); `S/export/export.int.spec.ts` (:78); `E/admin-members.spec.ts` (:26, :45, :56, :85, :102) | int, e2e | ĐỦ | Giữ nhóm cũ không assert ở server (xem UAT-25) |
| REQ-046 | Chủ nhóm mời ra/cấm; bổ nhiệm/thay chủ nhóm | `S/community/admin-groups.int.spec.ts` (:44 tạo/sửa có `ownerId`) | int | MỘT PHẦN | Mời ra / cấm: không có endpoint lẫn test |

### 2.4 REQ — D4 Chat & kiểm duyệt

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| REQ-060 | Phòng mặc định + tuỳ chỉnh; gửi realtime, trả lời, cảm xúc, @nhắc, ghim | `S/chat/chat-rest.int.spec.ts` (:55, :76, :121, :147); `S/chat/chat-socket.int.spec.ts` (:29); `S/notification/notifications.int.spec.ts` "@nhắc + trả lời…" (:62); `S/gates/b3-community-chat.int.spec.ts`; `E/chat.spec.ts` (:41, :59, :77) | int, e2e | ĐỦ | |
| REQ-061 | Lịch sử cursor, đồng bộ khi reconnect | `S/chat/chat-rest.int.spec.ts` "lịch sử keyset before/after…" (:76) | int | MỘT PHẦN | Chỉ có API `after=`; không test client reconnect gọi lại REST |
| REQ-062 | Tìm tin trong phòng (FTS không dấu) | `S/chat/chat-rest.int.spec.ts` (:111 `q=meetup`); `E/chat.spec.ts` "tìm trong phòng…" (:98) | int, e2e | MỘT PHẦN | Không có ca có dấu ↔ không dấu |
| REQ-063 | Panel: thành viên, file, tin ghim | `S/chat/chat-rest.int.spec.ts` (:76 files, :121 pins, :179 members); `E/chat.spec.ts` (:108) | int, e2e | ĐỦ | |
| REQ-064 | Báo cáo vi phạm; tự phát hiện từ khoá | `S/moderation/moderation.int.spec.ts` (:55, :78); `SV/modules/moderation/domain/aho-corasick.spec.ts`; `E/chat.spec.ts` "báo cáo tin…" (:133) | int, unit, e2e | ĐỦ | |
| REQ-065 | Tab Kiểm duyệt: Bỏ qua / Ẩn / Cảnh báo / Khoá (đồng bộ khoá TK) | `S/moderation/moderation.int.spec.ts` "admin hide…" (:101), "admin warn → outbox…; lock → khoá người gửi" (:121); `E/admin-groups.spec.ts` "kiểm duyệt: … Ẩn & xóa…, Bỏ qua" (:142) | int, e2e | MỘT PHẦN | Khoá qua kiểm duyệt chỉ assert `status = locked`, không kiểm thu hồi phiên/outbox `user.locked`. E2E không bấm Cảnh báo / Khoá |
| REQ-066 | Quản lý từ khoá | `S/moderation/moderation.int.spec.ts` (:151); `E/admin-groups.spec.ts` (:165) | int, e2e | ĐỦ | |
| REQ-067 | Sửa / xoá tin của mình | — | — | TRỐNG | |
| REQ-068 | Chủ đề do thành viên tạo | `S/chat/chat-rest.int.spec.ts` "chủ đề: tạo, trùng 'chung' → 409, xoá…" (:147); `E/chat.spec.ts` (:41) | int, e2e | ĐỦ | |

### 2.5 REQ — D5 Sự kiện

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| REQ-080 | Portal: nổi bật, lưới, lọc, chi tiết bản đồ/link, ĐK/Huỷ, hết chỗ chặn | `S/event/events.int.spec.ts` (:29, :46, :86, :93 tranh chỗ cuối, :108); `E/events.spec.ts` (:38, :57, :71, :91) | int, e2e | ĐỦ | |
| REQ-081 | Admin CRUD (Tiptap), 9/trang, danh sách ĐK + xuất, chia sẻ link | `S/event/admin-events.int.spec.ts` (:41, :88, :103, :151, :161); `C/event.int.spec.ts` (:48); `E/admin-events.spec.ts` (:26, :69, :99, :125) | int, contract, e2e | ĐỦ | 9/trang không assert (e2e dùng 6) |
| REQ-082 | Sửa sự kiện → thông báo + email người đã ĐK; email xác nhận + `.ics` | `S/mail/admin-mail.int.spec.ts` "event.registered → mail xác nhận…" (:179) | int | MỘT PHẦN | Không có outbox/test cho sửa sự kiện → thông báo/email; không có `.ics` |
| REQ-083 | Huỷ/dời sự kiện; điểm danh | `S/event/admin-events.int.spec.ts` "check-in một / tất cả / bỏ" (:103); `E/admin-events.spec.ts` (:99) | int, e2e | MỘT PHẦN | Huỷ/dời sự kiện (khác xoá) không có test |

### 2.6 REQ — D6 Dự án & nhà đầu tư

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| REQ-100 | Đăng dự án → Chờ duyệt | `S/project/projects.int.spec.ts` "lưu: submit → Chờ duyệt, nháp…; HTML sanitize" (:35), "gửi đăng thiếu link test → 400…" (:64); `E/projects.spec.ts` "form: báo thiếu trường, lưu nháp rồi gửi duyệt" (:165) | int, e2e | ĐỦ | |
| REQ-101 | Khám phá / Của tôi; chỉ Đang hiển thị ở Khám phá | `S/project/projects.int.spec.ts` (:94, :117); `E/projects.spec.ts` (:34, :140) | int, e2e | ĐỦ | |
| REQ-102 | Admin: Duyệt / Cần chỉnh sửa / Từ chối / Ẩn-Hiện, badge | `S/project/admin-projects.int.spec.ts` (:43, :60, :79, :117); `S/reporting/overview.int.spec.ts` "GET /admin/badges…" (:92); `E/admin-projects.spec.ts` (:50, :81, :108) | int, e2e | ĐỦ | "Cần chỉnh sửa" chỉ có ở e2e (cả hai chế độ) |
| REQ-103 | Bình luận lồng 1 cấp; liên hệ Email/Zalo/Gọi | `S/project/project-social.int.spec.ts` "góp ý → like → trả lời của chủ…" (:51); `S/project/projects.int.spec.ts` "chi tiết: liên hệ từ hồ sơ chủ" (:150); `E/projects.spec.ts` (:88) | int, e2e | ĐỦ | |
| REQ-104 | Quan tâm đầu tư: loại, ≥ tối thiểu, 1 lần/dự án | `S/investor/investors.int.spec.ts` (:52, :77); `E/projects.spec.ts` (:116) | int, e2e | ĐỦ | |
| REQ-105 | Admin NĐT: gộp, lọc, trạng thái, trao đổi 2 chiều, CSV | `S/investor/investors.int.spec.ts` (:93, :132); `C/investor.int.spec.ts` (:48); `E/admin-investors.spec.ts` (:28, :59, :84) | int, contract, e2e | MỘT PHẦN | Không test bình luận Admin hiện ra trong luồng của NĐT (xem UAT-20) |
| REQ-106 | Sửa dự án đã duyệt → về Chờ duyệt, bản đang hiển thị giữ nguyên | — (`S/project/projects.int.spec.ts` :64 chỉ kiểm dự án Đã ẩn → 409) | — | TRỐNG | Không có test PATCH dự án `published` |
| REQ-108 | Giai đoạn Ý tưởng / MVP / Tăng trưởng / Đã ra mắt | `S/project/projects.int.spec.ts` "khám phá: lọc giai đoạn…" (:117); `E/projects.spec.ts` (:34) | int, e2e | ĐỦ | |
| REQ-109 | TK NĐT miễn phí: không paywall, xem dự án + quan tâm + trao đổi | `S/common/guards.int.spec.ts` "D-14: investor…" (:113); `S/account/auth.int.spec.ts` (:123 `membershipFee` null); `S/project/projects.int.spec.ts` "Nhà đầu tư đọc được dự án nhưng không đăng được" (:166); `SV/modules/account/domain/me.mapper.spec.ts` | int, unit | ĐỦ | |
| REQ-107 | Chia sẻ dự án Private cho nhóm | `S/project/projects.int.spec.ts` "BR-08: riêng tư chỉ hiện cho nhóm được chia sẻ" (:94); `S/project/project-social.int.spec.ts` "chia sẻ…" (:131); `E/projects.spec.ts` (:194) | int, e2e | ĐỦ | |

### 2.7 REQ — D7 Dashboard, thông báo, cài đặt

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| REQ-120 | Dashboard: chào, nhóm, sự kiện sắp tới, thành viên hoạt động, Thảo luận mới | `S/dashboard/dashboard.int.spec.ts` (:20, :41); `E/portal-shell.spec.ts` (:18, :44) | int, e2e | MỘT PHẦN | "Thảo luận mới" và sự kiện sắp tới không assert nội dung |
| REQ-121 | Chuông thông báo theo ma trận §11, bấm đi tới nội dung | `S/notification/notifications.int.spec.ts` (:31, :62, :101); `E/portal-shell.spec.ts` "thông báo: chưa đọc (2)…; mở nhắc tên vào chat" (:52) | int, e2e | MỘT PHẦN | 4/12 dòng §11 không có thông báo (mục 2.13) |
| REQ-122 | Admin Tổng quan: KPI, biểu đồ, đăng ký mới | `S/reporting/overview.int.spec.ts` (:31, :39, :58, :79); `E/a-01-login.spec.ts` (:42) | int, e2e | ĐỦ | |
| REQ-123 | Cài đặt chung, lĩnh vực (BR-11), mail chào mừng, SMTP, TK quản trị, nhật ký; không có công tắc OTP/vai trò | `S/settings/settings-admin.int.spec.ts` (:48, :66, :84, :101, :163); `S/mail/admin-mail.int.spec.ts` (:76, :113, :141); `S/settings/roles-admins.int.spec.ts`; `E/admin-settings.spec.ts` (8 test) | int, e2e | ĐỦ | |
| REQ-124 | RBAC 14 quyền, Super Admin khoá cứng, chỉ `s.role` sửa | `S/common/guards.int.spec.ts` (:119, :125, :130); `S/settings/roles-admins.int.spec.ts` (:27); `SH/permissions.spec.ts`; `E/admin-settings.spec.ts` "Phân quyền…" (:100) | int, unit, e2e | ĐỦ | |
| REQ-127 | Chủ nhóm theo `group_id`; nhóm chưa có chủ → Admin xử lý | `S/common/guards.int.spec.ts` "GroupRole…" (:145); `S/community/join-requests.int.spec.ts` "admin c.mod duyệt được mọi nhóm" (:100) | int | ĐỦ | |
| REQ-125 | Audit mọi thao tác Admin + log xuất dữ liệu | `S/common/audit.int.spec.ts` (:17, :36, :54, :69); `DB/schema.int.spec.ts` "audit_logs chặn UPDATE và DELETE"; audit assert rải ở admin-users, admin-fees, admin-events, investors, export, settings | int | MỘT PHẦN | Không có test quét đủ mọi endpoint admin; nhiều thao tác (ví dụ khớp tay GD, gán nhóm) không assert audit |
| REQ-126 | DS Admin 10/trang, Chọn tất cả theo trang, tự lùi trang, bảng → thẻ mobile | `AU/features/members/model.spec.ts` "chọn tất cả trên trang"; `AU/mocks/handlers.spec.ts` "phân trang thành viên size 10"; `E/admin-members.spec.ts` (:56 trạng thái mixed); `E/admin-events.spec.ts` (:26 kẹp trang) | unit, unit-msw, e2e | MỘT PHẦN | E2E không bấm "Chọn tất cả"; không có test bảng → thẻ trên mobile |

### 2.8 REQ — D8 Sau go-live

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| REQ-140 | Bot: persona, kịch bản, lịch, khung giờ, nhóm gán | `S/bot/bot.int.spec.ts` (:46, :151, :178); `C/bot.int.spec.ts`; `E/admin-bots.spec.ts` (:34, :65, :111) | int, contract, e2e | MỘT PHẦN | Lịch và khung giờ không có hiệu lực được kiểm (không có tick worker) |
| REQ-141 | Bot automatic per-turn generation/replies (D-50); emergency stop + hide bot messages | S/bot/{bot,bot-generation,bot-reply,bot-reply-worker,bot-emergency,bot-pending-cleanup,bot-hide,bot-hide-storage}.int.spec.ts; Portal room-reload cache units; S/dashboard/{bot-threads,bot-thread-storage}.int.spec.ts; AU/features/bots/{hooks/use-bot-emergency,hooks/use-bot-control,components/emergency-bar}.spec.tsx; AU/mocks/bot-emergency-handlers.spec.ts; packages/shared/src/mock-data/domains/bot-visibility.spec.ts | unit, int; browser pending | MỘT PHẦN | FakeLlm/native workers, emergency queue races and hide/audit/real sockets/SQL plan/publication fence exercised; see TIP-V2-502 emergency/hide checkpoints. Dashboard backend and Admin emergency controls have scoped evidence; strict MSW emergency/hide contract and hidden chat reads now have regressions; MSW Dashboard now reads actual stored openings with hide/cursor/GC coverage; MSW delayed member replies now have admission/publication and HTTP regressions; MSW deferred NA-07 keyword jobs now cover persona/member publication; complete auto/moderation-action/mock-native seed alignment, live cross-app propagation and browser acceptance remain open; old approval browser scenario is not current coverage. Real-provider probes are not browser E2E |
| REQ-143 | Email hỗ trợ trên popup thanh toán, footer, trang lỗi | — | — | TRỐNG | |
| REQ-142 | Dịch vụ tư vấn: form, YC-xxxx, tiến trình, phụ trách, bình luận gắn tên | `S/service/service.int.spec.ts` (:58, :81, :129, :163); `C/service-request.int.spec.ts`; `E/services.spec.ts` (:45); `E/admin-requests.spec.ts` (5 test) | int, contract, e2e | ĐỦ | |

### 2.9 NFR

| ID | Yêu cầu | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| NFR-01 | p95 API < 300ms, tin < 500ms, DS < 2s | Ngoài bộ test rà: `infra/k6/*.js`, `coding-packs/reports/B66-k6.md` (đo trên máy dev) | k6 | MỘT PHẦN | Không có test tự động trong CI; chưa đo trên VPS |
| NFR-02 | Responsive 360px+, WCAG 2.1 AA | `E/portal-shell.spec.ts` "mobile: drawer…" (:97, 390px); `UI/base-components.spec.tsx` (aria) | e2e, unit | MỘT PHẦN | Không kiểm 360px, không kiểm tràn ngang, không có kiểm a11y tự động |
| NFR-03 | TLS, argon2, sanitize, CSRF/XSS/SQLi, ASVS L2, secret ngoài repo | `SV/common/html/sanitize.spec.ts`; `UI/ui.spec.tsx` "bỏ script…"; `S/common/error-envelope.int.spec.ts` "helmet + health" (:85); `S/account/auth.int.spec.ts` (:106 Origin lạ); `SV/common/config/env.schema.spec.ts` | unit, int | MỘT PHẦN | Không có test SQLi, không kiểm argon2 hash, không có quét bảo mật |
| NFR-04 | Backup hằng ngày + WAL, PITR 7 ngày, thử khôi phục | — (chỉ `infra/backup/*`) | — | TRỐNG | [KT] |
| NFR-05 | Single VPS không HA | — | — | TRỐNG | [KT] |
| NFR-06 | 5.000 online, k6 5.000 socket 50 tin/s | Ngoài bộ test rà: `infra/k6/socket-chat.js`, `B66-k6.md` | k6 | MỘT PHẦN | Như NFR-01 |

### 2.10 Decisions Log D-01 → D-48

| ID | Quyết định | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| D-01 | Auth tự viết NestJS | toàn bộ `S/account/*.int.spec.ts`, `S/common/guards.int.spec.ts` | int | ĐỦ | [KT] kiểm gián tiếp |
| D-02 | Prisma; index nâng cao SQL tay; deferred join | `DB/schema.int.spec.ts` "index users_list là covering + partial" | int | MỘT PHẦN | [KT] chỉ 1 index được kiểm; không test kế hoạch truy vấn deferred join |
| D-03 | Hạ tầng native | — | — | TRỐNG | [KT] |
| D-04 | Bot = Claude API + duyệt trước khi đăng | `S/bot/bot.int.spec.ts` (:75) | int | MỘT PHẦN | Có hàng duyệt; không có Claude |
| D-05 | Go-live GĐ1+2; Bot + Dịch vụ sau feature flag | `SV/common/feature/feature.module.spec.ts` "cờ tắt → không import module…" | unit | ĐỦ | |
| D-06 | vi + khung next-intl | `E/auth-flows.spec.ts` "chọn English…" (:120) | e2e | ĐỦ | |
| D-07 | Adapter chung, SePay trước | `IN/bank-webhook/content.spec.ts`; `S/membership-fee/reconcile.int.spec.ts` (FakeBank) | unit, int | MỘT PHẦN | `sepay.provider.ts` không có test |
| D-08 | Postgres FTS + unaccent + pg_trgm | `S/account/admin-users.int.spec.ts` (:30 tìm không dấu); `S/account/profile.int.spec.ts` (:109) | int | MỘT PHẦN | Tìm tin chat không có ca không dấu |
| D-09 | MinIO (S3 API) | `IN/storage/s3.provider.spec.ts`, `IN/storage/local.provider.spec.ts`; `C/storage.int.spec.ts` | unit, contract | ĐỦ | |
| D-10 | Không gửi MK trong mail chào mừng | `S/account/register.int.spec.ts` (:63); `SV/modules/mail/templates.spec.ts`; `E/portal-shell.spec.ts` (:109) | int, unit, e2e | ĐỦ | |
| D-11 | 2 app Next.js | `E/a-01-login.spec.ts` "tài khoản thành viên không vào được Admin" (:54) | e2e | ĐỦ | |
| D-12 | 1 VPS, không HA | — | — | TRỐNG | [KT] |
| D-13 | Brevo miễn phí 300/ngày | `S/mail/admin-mail.int.spec.ts` "hạn mức ngày…" (:166) | int | ĐỦ | |
| D-14 | TK NĐT miễn phí | xem REQ-109 | int, unit | ĐỦ | |
| D-15 | Hết phí: mất tương tác, giữ dữ liệu. Bị khoá: dự án tự ẩn, nhóm làm chủ chuyển về Admin | `S/account/admin-users.int.spec.ts` (:69 outbox `user.locked` = 1); `SH/contracts.spec.ts` "user.locked cần userId"; `S/common/guards.int.spec.ts` (:93 phí → 402) | int, unit | MỘT PHẦN | Chỉ phía phát `user.locked`. Không có consumer `user.locked` trong `SV/worker/processors/*` và không có test dự án bị ẩn / nhóm chuyển chủ |
| D-16 | Có xác thực SĐT | — | — | TRỐNG | Hoãn theo D-25 |
| D-17 | MST: ESGOO chính, VietQR dự phòng, cache, nhập tay | `IN/tax-lookup/chain.spec.ts` (3 test); `S/account/register.int.spec.ts` (:161, :183) | unit, int | MỘT PHẦN | Cache 30 ngày không kiểm |
| D-18 | Sửa trường nào cũng duyệt lại | — | — | TRỐNG | Như REQ-106 |
| D-19 | Giai đoạn theo prototype | xem REQ-108 | int, e2e | ĐỦ | |
| D-20 | Phân quyền cấu hình, 14 quyền, SA khoá cứng | xem REQ-124 | int, unit, e2e | ĐỦ | |
| D-21 | Phiếu YC theo SRS | `S/service/service.int.spec.ts` "transition có điều kiện…" (:81); `AU/features/requests/model.spec.ts` "nút theo máy trạng thái SRS §8" | int, unit | ĐỦ | |
| D-22 | Kênh hỗ trợ = Email | — | — | TRỐNG | Như REQ-143 |
| D-23 | Beta nhóm nhỏ | — | — | TRỐNG | [KT] |
| D-24 | Bỏ công tắc OTP và vai trò & nhóm | `E/auth-flows.spec.ts` (:24 vai trò, :56 nhóm) — chỉ toast FE; `S/account/register.int.spec.ts` (:63 user chỉ tạo sau OTP) | e2e, int | MỘT PHẦN | Server không có test âm thiếu vai trò / nhóm; không assert vắng công tắc ở Cài đặt |
| D-25 | Zalo ZNS, làm sau | — | — | TRỐNG | Hoãn |
| D-26 | 2 app; admin không vào Portal; admin `/account` riêng; "Xem chat" chỉ đọc | `E/admin-groups.spec.ts` "Xem chat mở trình xem chỉ đọc" (:133); `S/chat/chat-rest.int.spec.ts` "Admin c.mod … không gửi được" (:216); `E/a-01-login.spec.ts` (:54) | e2e, int | MỘT PHẦN | Không test admin bị chặn khi đăng nhập Portal; không test trang `/account` của admin |
| D-27 | TOTP admin, màn nhập 6 số | `S/account/password.int.spec.ts` (:147); `C/account-auth.int.spec.ts` (:215) | int, contract | MỘT PHẦN | Không có e2e màn nhập TOTP |
| D-28 | MSW thêm TK demo chưa đóng phí | `PU/mocks/membership-handlers.spec.ts` "TK chưa đóng phí (D-28)…"; `E/membership.spec.ts` (:57) | unit-msw, e2e | ĐỦ | |
| D-29 | 34 cộng đồng; SA seed; thông báo theo từng người | `DB/seed-demo.int.spec.ts` "34 nhóm còn sống…"; `SH/fixtures/fixtures.spec.ts`; `S/notification/notifications.int.spec.ts` (:31 "ids người khác không đổi"); `SH/mock-data/domains/inbox.spec.ts` | int, unit | ĐỦ | |
| D-30 | Sau kích hoạt vào `/community`; không MK tạm | `E/auth-flows.spec.ts` (:24); `E/portal-shell.spec.ts` (:109) | e2e | ĐỦ | |
| D-31 | Xác nhận CK = webhook + outbox; MSW giả lập trễ | `S/membership-fee/reconcile.int.spec.ts` (:69 outbox activated); `S/membership-fee/membership.int.spec.ts` (:44, :58); `PU/mocks/membership-handlers.spec.ts` "D-31…" | int, unit-msw | ĐỦ | |
| D-32 | Thao tác admin nguy hiểm luôn `Modal.confirm` + audit | `E/admin-members.spec.ts` (:56 khoá có xác nhận), `E/admin-groups.spec.ts` (:105), `E/admin-projects.spec.ts` (:50, :108, :137), `E/admin-requests.spec.ts` (:75), `E/admin-settings.spec.ts` (:58, :100, :179) | e2e | MỘT PHẦN | "Ghi nhận đã thu" (đơn và hàng loạt) bấm thẳng ra toast, không có hộp xác nhận (`E/admin-fees.spec.ts` :53, :87) |
| D-33 | Bảo mật là tab trong Cài đặt; Marketing là mục menu | `E/admin-settings.spec.ts` (:225 `tab=sso`); `E/admin-marketing.spec.ts` "vào từ menu…" (:28) | e2e | ĐỦ | |
| D-34 | Ghi nhớ: refresh cookie 30 ngày; tắt: cookie phiên | `S/account/auth.int.spec.ts` (:40 có `Expires`, :54 không có) | int | MỘT PHẦN | Không assert hạn 30 ngày |
| D-35 | TK dùng thử chỉ dev/demo, prod ẩn bằng env | — (e2e server bật `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=on`) | — | TRỐNG | Không test trạng thái mặc định tắt |
| D-36 | Ảnh mẫu tự host trước go-live | — | — | TRỐNG | [KT] |
| D-37 | Tự host font Noto Sans | — | — | TRỐNG | [KT] |
| D-38 | `GET /v1/public/stats` cache 60 giây | `S/account/register.int.spec.ts` "/public/stats…" (:202); `C/settings.int.spec.ts` (:113) | int, contract | MỘT PHẦN | Cache 60s không kiểm |
| D-39 | Chỉ chi tiết sự kiện, dự án có URL | `E/events.spec.ts` (:71 `/events/e1`); `E/projects.spec.ts` (:76 `/projects/p1`) | e2e | ĐỦ | |
| D-40 | DN dùng ngay; tự gắn "Đã xác minh" khi tên khớp; không khớp → Chờ xác minh, admin duyệt tay (audit) | `S/account/register.int.spec.ts` (:161); `SV/modules/account/domain/register.mapper.spec.ts`; `S/account/admin-users.int.spec.ts` "xác minh DN…" (:156); `E/admin-members.spec.ts` (:139); `E/profile.spec.ts` (:47) | int, unit, e2e | MỘT PHẦN | Duyệt tay không assert audit; nhánh Từ chối chỉ bấm Huỷ ở e2e, server không test reject |
| D-41 | Giá 600k (≈50k/tháng), bỏ "Ưu đãi 75%"; đối soát chỉ theo Mã TV; "Ghi nhận đã thu" bắt buộc lý do + quyền + audit | `S/membership-fee/reconcile.int.spec.ts` (:69, :118); `DB/schema.int.spec.ts` "thu tay phải có lý do (D-41)"; `S/membership-fee/admin-fees.int.spec.ts` (:46); `E/services.spec.ts` (:38 không có "Ưu đãi 75%") | int, e2e | MỘT PHẦN | `POST /admin/fees/:uid/collect` không gửi lý do vẫn 200, lý do mặc định "Admin ghi nhận đã thu" (admin-fees :49–56) — không có test âm thiếu lý do |
| D-42 | Bảng thành viên chỉ hiển thị quyền; đổi ở Cài đặt, cần `s.role`, xác nhận + audit | `S/account/admin-users.int.spec.ts` "đổi vai trò: admin → 403; super_admin → 200 + audit" (:125); `E/admin-settings.spec.ts` (:100); `E/admin-members.spec.ts` "đổi quyền hệ thống cần xác nhận (D-42)" (:125) | int, e2e | MỘT PHẦN | E2E đổi quyền ngay trên bảng Thành viên, ngược với "chỉ hiển thị" → Câu hỏi |
| D-43 | Chủ nhóm: duyệt, mời ra, cấm, ghim, xoá tin trong nhóm; ĐPV (`c.mod`) mọi nhóm; báo cáo ẩn danh với chủ nhóm | `S/chat/chat-rest.int.spec.ts` (:121 ghim chỉ chủ nhóm); `S/community/join-requests.int.spec.ts` (:100); `S/common/guards.int.spec.ts` (:145) | int | MỘT PHẦN | Mời ra, cấm, xoá tin của chủ nhóm: không test. Ẩn danh người báo cáo: không test |
| D-44 | Sai 5 lần → khoá 15' theo TK + IP, rate-limit, màn login báo thời gian chờ; TK khoá → 403 | `S/account/auth.int.spec.ts` (:75, :83); `S/common/error-envelope.int.spec.ts` (:76) | int | MỘT PHẦN | Chiều IP không kiểm; không e2e màn báo thời gian chờ |
| D-45 | SSO email mới: form bổ sung, bỏ OTP → `/community`; email có TK → đăng nhập luôn | `S/account/sso.int.spec.ts` (:26, :75); `E/auth-flows.spec.ts` (:133); `PU/mocks/register-handlers.spec.ts` | int, e2e, unit-msw | ĐỦ | |
| D-46 | 14 permission key, 5 tiêu đề, SA khoá cứng | `SH/permissions.spec.ts`; `E/admin-settings.spec.ts` (:100) | unit, e2e | ĐỦ | |
| D-47 | Bỏ hẳn khối MK tạm khỏi mẫu, xem trước, biến chèn | `SV/modules/mail/templates.spec.ts`; `E/admin-settings.spec.ts` (:124); `SH/mock-data/domains/inbox.spec.ts` | unit, e2e | ĐỦ | |
| D-48 | Bot luôn duyệt; danh tính persona; Portal không thấy `isSimulated` | `S/bot/bot.int.spec.ts` (:75); `S/chat/chat-socket.int.spec.ts` (:29); `S/chat/chat-rest.int.spec.ts` (:55); `SH/contracts.spec.ts`; `SH/mock-data/domains/bot-identity.spec.ts`; `S/gates/b5-admin-ops.int.spec.ts` | int, unit | ĐỦ | |

### 2.11 BR-01 → BR-13

| ID | Quy tắc | Test đang kiểm | Loại | Mức | Ghi chú / thiếu |
|---|---|---|---|---|---|
| BR-01 | Kích hoạt ngay sau OTP, không Chờ xác minh | `S/account/register.int.spec.ts` (:63, :161 DN pending vẫn 200) | int | ĐỦ | |
| BR-02 | Trạng thái TK chỉ Hoạt động / Đã khoá | `S/account/auth.int.spec.ts` (:83); `S/account/admin-users.int.spec.ts` (:69) | int | ĐỦ | |
| BR-03 | 600k/năm; chưa TT / hết hạn → popup bắt buộc | `S/common/guards.int.spec.ts` (:93); `E/membership.spec.ts` (:57); `PU/features/membership/model.spec.ts` | int, e2e, unit | MỘT PHẦN | Popup cho TK Hết hạn chỉ kiểm ở unit |
| BR-04 | Nội dung CK `OPCHUB [Mã TV] [SĐT]`; đối soát theo nội dung + số tiền | `S/membership-fee/reconcile.int.spec.ts` (:69, :104, :118); `IN/bank-webhook/content.spec.ts` | int, unit | ĐỦ | |
| BR-05 | ≤30 ngày = Sắp hết hạn; gia hạn +12 tháng nối tiếp | `membership-fee.state.spec.ts` (:16, :25, :33, :39); `S/membership-fee/reconcile.int.spec.ts` (:89, :151) | unit, int | ĐỦ | |
| BR-06 | ≥1 nhóm khi đăng ký; nhóm duyệt cần lời giới thiệu | `S/community/groups.int.spec.ts` (:75); `E/auth-flows.spec.ts` (:56 "Vui lòng chọn ít nhất 1 nhóm"); `PU/mocks/register-handlers.spec.ts` "thiếu nhóm" | int, e2e, unit-msw | MỘT PHẦN | Server không có test `groupIds` rỗng → 400 |
| BR-07 | Admin gán nhóm giữ nhóm cũ, không qua duyệt | `S/account/admin-users.int.spec.ts` (:181); `E/admin-members.spec.ts` (:102) | int, e2e | MỘT PHẦN | Không assert nhóm cũ còn nguyên ở server |
| BR-08 | Dự án mới Chờ duyệt; chỉ Đang hiển thị ở Khám phá; Private chỉ chủ, đội, nhóm chia sẻ | `S/project/projects.int.spec.ts` (:35, :94); `S/gates/b4-events-projects-investors.int.spec.ts` | int | ĐỦ | Thành viên đội ngũ (không phải chủ) xem Private: không test riêng |
| BR-09 | 1 quan tâm/dự án; ≥ tối thiểu; đơn vị bắt buộc với DN, Quỹ | `S/investor/investors.int.spec.ts` (:52, :77) | int | ĐỦ | Quỹ thiếu đơn vị không có ca riêng |
| BR-10 | Persona chỉ đăng nhóm đã gán, trong khung giờ; kịch bản chỉ chạy khi đến lịch | — | — | TRỐNG | Không có test worker bot tick |
| BR-11 | Lĩnh vực đang dùng chỉ ẩn, không xoá | `S/settings/settings-admin.int.spec.ts` (:101); `E/admin-settings.spec.ts` (:58); `AU/mocks/settings-handlers.spec.ts` | int, e2e | ĐỦ | |
| BR-12 | Phân trang Admin 10 (Sự kiện 9, Nhóm 12); Chọn tất cả chỉ trang hiện tại | `AU/mocks/handlers.spec.ts` (size 10); `E/admin-groups.spec.ts` (:26 12/trang); `AU/features/members/model.spec.ts` | unit-msw, e2e, unit | MỘT PHẦN | Sự kiện 9/trang không assert; API admin nhóm mặc định 10; Chọn tất cả không e2e |
| BR-13 | Mọi thao tác Admin ghi audit; xuất dữ liệu cá nhân có log | xem REQ-125; `S/export/export.int.spec.ts` (:35) | int | MỘT PHẦN | Như REQ-125 |

### 2.12 QT-01 → QT-13 (gồm "Quy tắc nghiệp vụ & ngoại lệ")

| ID | Quy trình | Test đang kiểm | Loại | Mức | Thiếu |
|---|---|---|---|---|---|
| QT-01 | Đăng ký + OTP | `S/account/register.int.spec.ts` (toàn file); `C/account-auth.int.spec.ts` (:96); `S/gates/b2-member-lifecycle.int.spec.ts`; `E/auth-flows.spec.ts` (:24, :56) | int, contract, e2e | MỘT PHẦN | Quy tắc "Cá nhân: vai trò + ≥1 nhóm; DN: MST, tên, ngành, ≥1 nhóm" chỉ kiểm toast FE, server không có test âm. "Email hợp lệ mới gửi OTP": FE. Quy tắc "mật khẩu tạm bắt buộc đổi lần đầu" lỗi thời theo D-10/D-30 → Câu hỏi |
| QT-02 | Đăng nhập, SSO, quên MK, đăng xuất | REQ-001, 002, 007, 008 | int, e2e | MỘT PHẦN | ChatGPT/Gemini/DeepSeek đi Google; link 15'; trang đặt lại MK; "đăng xuất đóng mọi menu/popup" chỉ kiểm từ popup phí |
| QT-03 | Thanh toán phí bắt buộc | `E/membership.spec.ts` (4 test); `S/membership-fee/*`; `S/gates/b2-member-lifecycle.int.spec.ts` | e2e, int | MỘT PHẦN | Quy tắc "bấm nền / nút đóng → nhắc": chỉ bấm Esc. Còn lại (Tư vấn, Đăng xuất, đóng hộp CK về popup, hiệu lực nối tiếp) có test |
| QT-04 | Quản lý phí: gia hạn & nhắc | `S/membership-fee/admin-fees.int.spec.ts`; `E/admin-fees.spec.ts` (:26 KPI 3.600.000đ, :50 → 4.200.000đ) | int, e2e | MỘT PHẦN | Gia hạn 12 tháng chưa test server; email nhắc chỉ kiểm ghi `mail_logs`, không kiểm gửi |
| QT-05 | Tham gia nhóm & chủ nhóm duyệt | `S/community/groups.int.spec.ts`, `join-requests.int.spec.ts`; `S/account/admin-users.int.spec.ts` (:181 gán không qua duyệt); `E/community.spec.ts`, `E/chat.spec.ts` (:108) | int, e2e | ĐỦ | |
| QT-06 | Chat & kiểm duyệt | `S/chat/*`, `S/moderation/moderation.int.spec.ts`, `S/gates/b3-community-chat.int.spec.ts`, `S/bot/bot.int.spec.ts` (isSimulated); `E/chat.spec.ts`, `E/admin-groups.spec.ts` | int, e2e | ĐỦ | Quy tắc "tin persona đánh dấu mô phỏng, không hiện nhãn" và "khoá người gửi đồng bộ TK" có test |
| QT-07 | Bot tương tác | `S/bot/bot.int.spec.ts`; `E/admin-bots.spec.ts` | int, e2e | MỘT PHẦN | Chỉ CRUD + chạy tay + duyệt. Không có: tick theo lịch, ≥2 persona trong giờ, bỏ lượt ngoài giờ + nhật ký, tự phản hồi thành viên thật, hiện ở "Thảo luận mới" |
| QT-08 | Sự kiện: tạo → ĐK → tham dự | `S/event/*`; `S/mail/admin-mail.int.spec.ts` (:179); `E/events.spec.ts`, `E/admin-events.spec.ts` | int, e2e | MỘT PHẦN | Bước 5 "sự kiện đổi → thông báo người đã ĐK" không có |
| QT-09 | Dự án: đăng, duyệt, góp ý | `S/project/*`; `E/projects.spec.ts`, `E/admin-projects.spec.ts` | int, e2e | MỘT PHẦN | Bước 4b "Cần chỉnh sửa → sửa, gửi lại" không test phía chủ dự án; quy tắc "lĩnh vực lấy từ Danh mục" không có test âm lĩnh vực ngoài danh mục. Repo Private → yêu cầu truy cập có test |
| QT-10 | Quan tâm đầu tư & trao đổi | `S/investor/investors.int.spec.ts`; `S/gates/b4-events-projects-investors.int.spec.ts`; `E/projects.spec.ts` (:116), `E/admin-investors.spec.ts` | int, e2e | MỘT PHẦN | Quy tắc "luồng dùng chung Admin ↔ NĐT" không có test cùng luồng hai phía |
| QT-11 | Phiếu YC dịch vụ | `S/service/service.int.spec.ts`; `E/services.spec.ts`, `E/admin-requests.spec.ts`; `PU/features/services/model.spec.ts` | int, e2e, unit | MỘT PHẦN | Quy tắc "Cột Tỉnh: trống thì nhận diện từ địa chỉ" không có; thiếu trường bắt buộc chỉ kiểm FE |
| QT-12 | Quản lý thành viên: khoá, gán, xuất | `S/account/admin-users.int.spec.ts`; `S/export/export.int.spec.ts`; `E/admin-members.spec.ts` | int, e2e | MỘT PHẦN | Quy tắc "tin nhắn cũ giữ nguyên khi khoá" không có test |
| QT-13 | Email hệ thống & SMTP | `S/mail/admin-mail.int.spec.ts`, `S/mail/mail-worker.int.spec.ts`; `E/admin-settings.spec.ts` (:124, :144) | int, e2e | MỘT PHẦN | Quy tắc "email người gửi thuộc tên miền đã xác thực" không có. Hạn mức ngày có test |

### 2.13 UAT-01 → UAT-31

| ID | Kịch bản → kỳ vọng | Test đang kiểm | Loại | Mức | Thiếu |
|---|---|---|---|---|---|
| UAT-01 | ĐK cá nhân thiếu vai trò → chặn | `E/auth-flows.spec.ts` (:28) | e2e | MỘT PHẦN | Chỉ kiểm toast FE; server không có 400 cho thiếu vai trò |
| UAT-02 | ĐK đủ → hộp OTP, gửi email | `E/auth-flows.spec.ts` (:39); `S/account/register.int.spec.ts` (:63 mail_logs otp) | e2e, int | ĐỦ | |
| UAT-03 | OTP thiếu số → "Vui lòng nhập đủ 6 chữ số" | `E/auth-flows.spec.ts` (:42) | e2e | ĐỦ | |
| UAT-04 | OTP đúng → Portal; TV xuất hiện ở Admin; mail chào mừng có log | `E/auth-flows.spec.ts` (:50); `S/account/register.int.spec.ts` (:63 welcome mail_log) | e2e, int | MỘT PHẦN | Không kiểm TV mới hiện trong Admin Thành viên |
| UAT-05 | ĐK DN bằng MST → tự điền tên, ngành; OTP → Hoạt động | `E/auth-flows.spec.ts` (:56); `S/account/register.int.spec.ts` (:161) | e2e, int | ĐỦ | |
| UAT-06 | TK mới vào Portal → popup tự hiện, không đóng | `E/portal-shell.spec.ts` (:129); `E/membership.spec.ts` (:57) | e2e | ĐỦ | |
| UAT-07 | Bấm nền / đóng popup khi chưa TT → giữ + nhắc | `E/membership.spec.ts` (:63 không ×, :64 Esc); `UI/paywall-modal/paywall-modal.spec.tsx` | e2e, unit | MỘT PHẦN | Không bấm nền |
| UAT-08 | Đăng ký ngay → hộp CK `OPCHUB TVxxxxxx SĐT` | `E/membership.spec.ts` (:27, :92) | e2e | ĐỦ | |
| UAT-09 | Xác nhận CK → đối soát → Đang hiệu lực, popup đóng; Admin thấy Đang hiệu lực | `E/membership.spec.ts` (:86); `S/gates/b2-member-lifecycle.int.spec.ts` | e2e, int | MỘT PHẦN | Không kiểm phía Admin; MSW tự hẹn giờ, server dùng `simulateTransfer` (mục 4) |
| UAT-10 | Admin Ghi nhận đã thu → Đang hiệu lực, hạn +12 tháng | `S/membership-fee/admin-fees.int.spec.ts` (:46); `E/admin-fees.spec.ts` (:50) | int, e2e | MỘT PHẦN | Không assert `validUntil` +12 tháng sau thu tay |
| UAT-11 | Đăng nhập / quên MK → đúng khu vực; gửi liên kết đặt lại | `E/a-01-login.spec.ts` (:24, :42, :54); `E/auth-flows.spec.ts` (:107); `S/account/password.int.spec.ts` (:55) | e2e, int | MỘT PHẦN | Không có e2e mở `/reset-password` từ link |
| UAT-12 | Tham gia nhóm → vào hoặc Chờ duyệt; chủ nhóm duyệt → vào, có thông báo | `E/community.spec.ts` (:62, :82); `E/chat.spec.ts` (:108); `S/community/join-requests.int.spec.ts`; `S/gates/b3-community-chat.int.spec.ts` (:77) | e2e, int | ĐỦ | |
| UAT-13 | Gửi tin → realtime | `S/chat/chat-socket.int.spec.ts` (:29 B nhận `message.new`); `E/chat.spec.ts` (:59) | int, e2e | ĐỦ | E2E chỉ một trình duyệt |
| UAT-14 | Thành viên thật nhắn → persona trong giờ, trong nhóm tự phản hồi | S/bot/{bot-reply,bot-reply-storage,bot-reply-worker}.int.spec.ts; packages/shared/src/mock-data/domains/{bot-reply-admission,bot-reply-worker}.spec.ts; PU/mocks/bot-reply-handlers.spec.ts | unit, native int, MSW HTTP | MỘT PHẦN | Native FakeLlm/outbox-worker and MSW delayed reply/admission/publication boundaries have scoped evidence; actual browser lanes and real-LLM E2E still pending. See TIP-V2-502-progress and TIP-V2-502-msw-replies-checkpoint |
| UAT-15 | Bot tự động theo lịch, giãn cách; hiện ở Dashboard | S/bot/{bot-scheduler,bot-worker,bot-generation,bot-auto-admission}.int.spec.ts; S/dashboard/{bot-threads,bot-thread-storage}.int.spec.ts; packages/shared/src/mock-data/domains/{dashboard-threads,bot-script-scheduler,bot-script-admission}.spec.ts; PU/mocks/dashboard-bot-handlers.spec.ts; AU/mocks/{bot-moderation-handlers,bot-scheduler-handlers}.spec.ts | unit, native int, MSW HTTP | MỘT PHẦN | Real native scheduled/automatic turns and message-backed Dashboard have scoped evidence; TIP-513 adds MSW due ordering/one-shot/rearm/capacity/live spacing and actual Admin HTTP polling/manual dedupe controls (15 cases). Auto-plan approval, complete mock auto/limits/live bridge, browser lanes, real-LLM E2E and final acceptance pending |
| UAT-16 | ĐK sự kiện → lưu, gửi xác nhận | `S/event/events.int.spec.ts` (:46); `S/mail/admin-mail.int.spec.ts` (:179); `E/events.spec.ts` (:57) | int, e2e | ĐỦ | |
| UAT-17 | Đăng dự án mới → Chờ duyệt | `S/project/projects.int.spec.ts` (:35); `E/projects.spec.ts` (:165) | int, e2e | ĐỦ | |
| UAT-18 | Admin duyệt → Đang hiển thị ở Khám phá | `S/project/admin-projects.int.spec.ts` (:43); `S/gates/b4-events-projects-investors.int.spec.ts` (:69–87); `E/admin-projects.spec.ts` (:50) | int, e2e | ĐỦ | |
| UAT-19 | Quan tâm đầu tư thiếu SĐT / đơn vị → chặn | `S/investor/investors.int.spec.ts` (:77 DN thiếu đơn vị 400); `E/projects.spec.ts` (:121 SĐT, toast FE) | int, e2e | MỘT PHẦN | Thiếu SĐT không có test server |
| UAT-20 | Admin bình luận NĐT; NĐT trả lời trên dự án → cùng luồng 2 phía | `S/investor/investors.int.spec.ts` (:93 chủ dự án ↔ NĐT, :132 admin bình luận); `AU/mocks/g5c-handlers.spec.ts` | int, unit-msw | MỘT PHẦN | Không test bình luận Admin hiện trong `/me/investor-thread` của NĐT |
| UAT-21 | Form tư vấn thiếu trường bắt buộc → chặn | `E/services.spec.ts` (:55–71); `PU/features/services/model.spec.ts` | e2e, unit | MỘT PHẦN | Chỉ FE; server `S/service/service.int.spec.ts` chỉ có thiếu Idempotency-Key / dịch vụ lạ |
| UAT-22 | Form hợp lệ → YC-xxxx Mới ở Admin | `S/service/service.int.spec.ts` (:58, :115); `E/services.spec.ts` (:75) | int, e2e | ĐỦ | |
| UAT-23 | Chuyển trạng thái YC, bình luận gắn tên → người được gắn nhận thông báo | `S/service/service.int.spec.ts` (:81, :129); `E/admin-requests.spec.ts` (:58, :96) | int, e2e | ĐỦ | |
| UAT-24 | Khoá thành viên → Đã khoá, không đăng nhập được | `S/account/admin-users.int.spec.ts` (:69); `E/admin-members.spec.ts` (:56, :85) | int, e2e | ĐỦ | |
| UAT-25 | Gán 2 TV vào 1 nhóm → có nhóm mới, giữ nhóm cũ | `S/account/admin-users.int.spec.ts` (:181); `E/admin-members.spec.ts` (:102) | int, e2e | MỘT PHẦN | Giữ nhóm cũ không assert ở server |
| UAT-26 | Chọn tất cả trên bảng Thành viên → chỉ trang hiện tại | `AU/features/members/model.spec.ts` "chọn tất cả trên trang"; `E/admin-members.spec.ts` (:61 chỉ kiểm `mixed`) | unit, e2e | MỘT PHẦN | E2E không bấm "Chọn tất cả" |
| UAT-27 | Phân trang DS Admin đúng số dòng, tự lùi trang khi lọc | `E/admin-events.spec.ts` (:54–61 kẹp trang); `E/admin-members.spec.ts` (:45); `UI/base-components.spec.tsx` "kẹp trang vượt tổng" | e2e, unit | MỘT PHẦN | Không kiểm số dòng mặc định từng màn; "tự lùi khi lọc" chỉ ở màn Sự kiện |
| UAT-28 | SMTP thiếu key → kiểm tra kết nối báo lỗi | `S/mail/admin-mail.int.spec.ts` (:76); `E/admin-settings.spec.ts` (:144) | int, e2e | ĐỦ | |
| UAT-29 | Sửa mail chào mừng, thêm tài liệu → xem trước + mail mới đúng | `E/admin-settings.spec.ts` (:124); `S/mail/admin-mail.int.spec.ts` (:141) | e2e, int | MỘT PHẦN | Không thêm tài liệu; không kiểm nội dung mail mới sau sửa |
| UAT-30 | Đăng xuất → về màn đăng nhập, đóng mọi popup | `E/membership.spec.ts` (:80–83) | e2e | ĐỦ | |
| UAT-31 | Mobile 390px không tràn ngang; bảng Admin thành thẻ | `E/portal-shell.spec.ts` (:97) | e2e | MỘT PHẦN | Không kiểm tràn ngang; không test Admin mobile |

### 2.14 Ma trận thông báo & email §11

| # | Sự kiện → người nhận (in-app / email) | Test đang kiểm | Loại | Mức | Thiếu |
|---|---|---|---|---|---|
| N-01 | ĐK gửi OTP → người ĐK (email, 10') | `S/account/register.int.spec.ts` (:63 mail_logs `otp`, `expiresInSec: 600`); `SV/modules/mail/templates.spec.ts` | int, unit | ĐỦ | |
| N-02 | OTP thành công → mail chào mừng + tài liệu đính kèm | `S/account/register.int.spec.ts` (:95 mail `welcome`) | int | MỘT PHẦN | Tài liệu đính kèm |
| N-03 | Thanh toán được đối soát → TV (in-app + email) | `S/notification/notifications.int.spec.ts` (:101 `feeActivated` → in-app "Đã ghi nhận phí thành viên") | int | MỘT PHẦN | Email không có (không có handler mail cho `membership_fee.activated`). Test gọi handler trực tiếp, không qua relay |
| N-04 | Nhắc phí (Admin) → TV (in-app + email) | `S/membership-fee/admin-fees.int.spec.ts` (:62 mail_logs `fee_reminder`) | int | MỘT PHẦN | In-app không có |
| N-05 | Yêu cầu tham gia nhóm → chủ nhóm (in-app, badge) | `S/community/join-requests.int.spec.ts` (:100 socket `member.request`); `S/chat/chat-rest.int.spec.ts` (:179 `pendingRequests`) | int | MỘT PHẦN | Chỉ đẩy socket + badge; không có bản ghi thông báo trong hộp thư |
| N-06 | Được duyệt vào nhóm → TV (in-app → phòng Chung) | `S/notification/notifications.int.spec.ts` (:101 link `/chat/<g>`); `S/gates/b3-community-chat.int.spec.ts` (:77) | int | ĐỦ | |
| N-07 | Sự kiện thay đổi → người đã ĐK (in-app + email) | — | — | TRỐNG | |
| N-08 | Dự án được duyệt / cần sửa / từ chối → chủ dự án (in-app) | — | — | TRỐNG | |
| N-09 | Quan tâm đầu tư mới → chủ dự án, Admin (in-app) | — | — | TRỐNG | |
| N-10 | Admin trả lời NĐT → NĐT (in-app) | — | — | TRỐNG | |
| N-11 | Gắn tên trong bình luận YC → nhân sự (in-app, mở đúng phiếu) | `S/service/service.int.spec.ts` "bình luận: … @nhắc → outbox + thông báo cho nhân sự" (:129) | int | ĐỦ | |
| N-12 | Đặt lại MK → người dùng (email, 15') | `S/account/password.int.spec.ts` (:55) | int | MỘT PHẦN | Hạn 15' không kiểm |

(Đối chiếu: các consumer outbox có trong `SV/worker/processors/*.ts` gồm `chat.mentioned`, `group.request_decided`, `moderation.warned`, `membership_fee.activated`, `event.registered`, `service_request.mentioned`, `group.join_requested`. Không có loại sự kiện cho N-07 → N-10.)

---

## 3. Yêu cầu chỉ được kiểm trên MSW, không có trên server thật

### 3.1 Chỉ có test handler / mock-data MSW

| Yêu cầu | Test MSW | Server thật |
|---|---|---|
| REQ-028 / QT-04 "Gia hạn 12 tháng" (`renew`) | `SH/mock-data/domains/domains.spec.ts` "BR-05: gia hạn nối tiếp ngày hết hạn hiện tại" (`feeAction('m1','renew')`) | Không có test `POST /admin/fees/:uid/renew`; e2e chỉ thấy nút |
| REQ-140 persona giữ khung giờ, tần suất | `AU/mocks/bot-handlers.spec.ts` "persona mới giữ màu, khung giờ, tần suất" | `S/bot/bot.int.spec.ts` không assert `activeHours` |
| REQ-141 cấu hình tự sinh / tự trả lời | `AU/mocks/bot-handlers.spec.ts` "cấu hình: tự sinh / tự trả lời" | `S/bot/bot.int.spec.ts` (:178) chỉ PATCH `delayMinutes` |
| BR-12 / REQ-126 Admin Thành viên 10/trang; trang vượt → rỗng | `AU/mocks/handlers.spec.ts` "phân trang thành viên size 10", "trang vượt quá trả items rỗng" | Không có |
| BR-06 / REQ-003 thiếu nhóm → lỗi | `PU/mocks/register-handlers.spec.ts` "thiếu nhóm → báo lỗi tiếng Việt" | Không có |
| REQ-064 lý do báo cáo sai → 400 kèm fields | `PU/mocks/domain-handlers.spec.ts` "báo cáo tin nhắn: sai lý do → 400" | Không có |
| REQ-124 key quyền lạ → 400 | `AU/mocks/domain-handlers.spec.ts` "quyền vai trò: key lạ → 400" | Không có |
| Marketing: tạo thiếu tiêu đề → 400 | `AU/mocks/marketing-handlers.spec.ts` "tạo thiếu tiêu đề → 400" | `S/marketing/campaigns.int.spec.ts` chỉ có thiếu giờ lên lịch → 400 |
| REQ-123 Cài đặt chung: email sai → 400 | `AU/mocks/settings-handlers.spec.ts` "cài đặt chung: email sai 400" | Không có |
| REQ-012 presign + PUT + GET ảnh đại diện (cả luồng) | `PU/mocks/profile-handlers.spec.ts` "presign + PUT + GET ảnh đại diện" | `S/account/profile.int.spec.ts` (:136) chỉ presign; `C/storage.int.spec.ts` có PUT/GET chung, không gắn hồ sơ |
| D-31 webhook về trễ tự động | `PU/mocks/membership-handlers.spec.ts` "D-31: … webhook giả về trễ mới kích hoạt" | Server không tự báo tiền; e2e dùng `simulateTransfer` |

### 3.2 Chỉ kiểm ở FE (toast/validation), chạy cả hai chế độ e2e nhưng không chạm tới server, và server không có test âm tương ứng

- UAT-01 / REQ-003 thiếu vai trò; email không hợp lệ (`E/auth-flows.spec.ts` :28, :35).
- REQ-004 MST sai định dạng ở form (server có `/biz/lookup?tax=123 → 400`, nhưng submit đăng ký DN thiếu MST không có test server).
- REQ-041 chưa đồng ý nội quy (`E/community.spec.ts` :68).
- UAT-19 SĐT không hợp lệ, số tiền dưới tối thiểu ở form (`E/projects.spec.ts` :121, :126; server có test mức tối thiểu, không có thiếu SĐT).
- UAT-21 form tư vấn thiếu trường (`E/services.spec.ts` :56–71).
- Form bỏ trống: đăng nhập (`E/a-01-login.spec.ts` :6), hồ sơ (`E/profile.spec.ts` :29), tạo nhóm (`E/admin-groups.spec.ts` :65, :84), sự kiện (`E/admin-events.spec.ts` :75, :81), dự án (`E/projects.spec.ts` :170), persona/kịch bản (`E/admin-bots.spec.ts`), chiến dịch (`E/admin-marketing.spec.ts` :57, :60), bình luận YC (`E/admin-requests.spec.ts` :102): chỉ assert toast. Server có test 400 tương ứng cho: `PATCH /me` body rỗng, dự án thiếu `testUrl`, chiến dịch thiếu giờ lên lịch, mật khẩu yếu. Các form còn lại không có.
- Ảnh bìa lớn hơn 100KB: không có test ở bất kỳ tầng nào. Server chỉ giới hạn 5MB (`SV/modules/uploads/image-ref.service.spec.ts` "…sai kiểu → 400" với ảnh 6MB); `S/event/admin-events.int.spec.ts` (:88) chỉ kiểm ảnh ngoài storage.

---

## 4. Nhánh `onServer` làm yếu kiểm tra

Nguồn `onServer = env.E2E_TARGET === 'server'` (`e2e/server/api.ts:10`). Fixture `e2e/server/test.ts` reset `seed:demo` + xoá cache Redis trước mỗi test ở chế độ server (không đổi assertion).

| # | Vị trí | Hình thức | Assertion bị bỏ / đổi | Lý do theo comment |
|---|---|---|---|---|
| 1 | `E/admin-settings.spec.ts:222` | `if (!onServer) await expect(page.getByText('bật đăng nhập bằng DeepSeek')).toBeVisible()` | **Bỏ hẳn** trên server: kiểm dòng nhật ký seed hiện trong tab Nhật ký | "Server: audit_logs chỉ INSERT, màn tải 500 dòng mới nhất → dòng seed bị lượt e2e trước đẩy ra (DV-B63-6)" |
| 2 | `E/admin-marketing.spec.ts:53` | `onServer ? /^Ước tính \d[\d.]* người nhận$/ : 'Ước tính 3.840 người nhận'` | Số ước tính chính xác → regex số bất kỳ (không kiểm giá trị) | "Q-B62-17: MSW nhân số thành viên mẫu (x480); API thật đếm người nhận thật trong CSDL" |
| 3 | `E/admin-marketing.spec.ts:113` | `onServer ? /\d[\d.]* người nhận/ : '1.920 người nhận'` | Số người nhận trong hộp xác nhận → regex số bất kỳ | Như #2 (cùng Q-B62-17, không ghi lại comment) |
| 4 | `E/admin-fees.spec.ts:69` | `` `Đã gửi email nhắc tới ${onServer ? 2 : 3} thành viên` `` | Số thư nhắc hàng loạt khác giữa hai chế độ (vẫn kiểm chính xác); hành vi MSW và server lệch nhau | "Q-B62-16: API thật không nhắc TK đã bị khoá (Ngô Thành Đạt) → 2; MSW đếm cả → 3" |
| 5 | `E/admin-members.spec.ts:53` | `rowOf(page, onServer ? 'Ngô Thành Đạt' : 'Hoàng Gia Linh')` | Dòng trang 2 khác nhau (thứ tự sắp xếp lệch) | "Q-B62-18: API thật xếp theo ngày tham gia mới nhất → trang 2 là 2 TK cũ nhất" |
| 6 | `E/admin-requests.spec.ts:19–20` | `STAFF` / `MENTION` đổi tên theo chế độ | Tên nhân sự phụ trách và người được gắn khác nhau | "Q-B62-19: nhân sự phụ trách trên API thật = TK quản trị có `n.edit` (Q-B46-1), không phải danh sách cứng SERVICE_STAFF của mock" |
| 7 | `E/portal-shell.spec.ts:131` | `if (onServer) await payFee(page)` | Trên server TK đã đóng phí trước khi vào Dashboard → không còn kiểm "TK chưa đóng phí vẫn dựng Dashboard dưới popup" như bản MSW | "Q-B62-20: API thật chặn /dashboard/live khi chưa đóng phí (đăng nhập + phí) → đóng phí trước" |
| 8 | `E/projects.spec.ts:155` | `if (onServer) await payFee(page)` | Như #7 cho "Dự án của tôi" trống của TK SSO mới | "Q-B62-20: API thật chặn /me/projects khi chưa đóng phí → TK SSO mới đóng phí trước" |
| 9 | `E/chat.spec.ts:168–179` | `if (onServer) { setGroupOwner(...); pageFetch(DELETE join) } else { fetch(DELETE join) }` | Server: Admin chuyển chủ nhóm c1, c6 trước khi rời; MSW cho chủ nhóm rời thẳng. Assertion giữ nguyên, nhưng bản MSW không kiểm ràng buộc "chủ nhóm không tự rời" | "D-43 / Q-B20-1: chủ nhóm không tự rời → Admin chuyển chủ c1, c6 trước; gọi API kèm token" |
| 10 | `E/profile.spec.ts:65` | `if (onServer) await setGroupOwner('c1', 'm2')` | Như #9 cho rời nhóm ở Hồ sơ | "D-43 / Q-B20-1: An là chủ OPC Hà Nội trên API thật → Admin chuyển chủ trước khi rời" |
| 11 | `E/profile.spec.ts:113` | `if (onServer) await extraSessions(..., 2)` | Không bỏ assertion; tạo 2 phiên thật để toast "2 thiết bị khác" đúng. Bản MSW trả số cố định nên không kiểm thu hồi thật | "MSW trả số cố định; API thật đếm phiên thật → đăng nhập thêm 2 thiết bị (mật khẩu mới)" |
| 12 | `E/membership.spec.ts:98` | `if (onServer) await simulateTransfer(...)` | Không bỏ assertion; server cần ngân hàng giả bắn webhook. Bản MSW không đi qua webhook/HMAC | "MSW tự hẹn giờ webhook; API thật: ngân hàng giả báo tiền vào đúng nội dung CK (BR-04)" |
| 13 | `E/auth-flows.spec.ts:96–98` | `if (onServer) closeRegistration() else addCookies(...)` | Không bỏ assertion; chỉ khác cách dựng trạng thái | "API thật: tắt Mở đăng ký trong Cài đặt chung; MSW: cookie giả" |

Bỏ hẳn assertion: #1. Nới lỏng thành regex: #2, #3. Đổi giá trị kỳ vọng do hành vi MSW ≠ server: #4, #5, #6. Đổi tiền điều kiện làm mất một nhánh kiểm: #7, #8 (server), #9, #10 (MSW). Chỉ khác cách dựng dữ liệu: #11, #12, #13.

### 4.1 Xử lý (TIP-V2-115, 19/10/2026)

Sau TIP: `grep -nE "onServer \?|if \(!?onServer\)" e2e/behavior` không còn nhánh nào trong biểu thức `expect`; các `if (onServer)` còn lại chỉ dựng tiền điều kiện (luật 5 của [testing](../../standards/testing/testing.md)).

| # | Trạng thái | Cách xử lý / lý do giữ |
|---|---|---|
| 1 | **ĐÃ XỬ LÝ** | Test mới `D-63 TD-033 nhật ký hiện thao tác vừa làm (tắt SSO DeepSeek)`: tắt DeepSeek trong test rồi kiểm dòng "tắt đăng nhập bằng DeepSeek" ở cả hai chế độ. MSW ghi tên nhà cung cấp như `SSO_LABEL` server (trước ghi id `deepseek`). Không đổi API. |
| 2, 3 | **ĐÃ XỬ LÝ** | MSW `estimateRecipients` đếm như `AudienceRepository.estimate`: TK `active` theo loại (Cá nhân = personal + investor), trừ email đã huỷ nhận; bỏ `SCALE 480`. Assert số chính xác `Ước tính 11 người nhận` / `7 người nhận` cả hai chế độ. `seed:demo` reset xoá `mail_suppressions` (trước đó `unsubscribe.spec` để lại dòng huỷ nhận → số server lệch theo thứ tự chạy). |
| 4 | **ĐÃ XỬ LÝ** | `5a6ce63`: MSW `remindAllFees` bỏ TK `locked` như server → `2` cả hai; unit test MSW cập nhật ở `19511d9`. |
| 5 | **ĐÃ XỬ LÝ** | MSW `listAdminMembers` xếp `createdAt DESC, id DESC` như server; trang 2 kiểm Ngô Thành Đạt + Trần Quốc Bảo cả hai chế độ. |
| 6 | **ĐÃ XỬ LÝ** | MSW `GET /admin/service-requests/staff` = TK quản trị `active` có `n.edit` theo ma trận quyền hiện hành (như `ServiceAdminService.staff`); `STAFF`/`MENTION` một giá trị (`Nguyễn Văn An` / `Quản trị hệ thống`). `SERVICE_STAFF` chỉ còn là danh sách tác giả bình luận mẫu cho seed. |
| 7, 8 | **HỢP LỆ (dựng dữ liệu)** | `if (onServer) await payFee(page)` chỉ dựng tiền điều kiện; assertion giống nhau. Còn lệch hành vi: MSW chưa chặn `/dashboard/live`, `/me/projects` khi chưa đóng phí (402) → **chưa làm** phần TIP mục 2 #7–8 (MSW 402 + `payFee` cả hai chế độ). Chuyển TIP sau. |
| 9, 10 | **HỢP LỆ (dựng dữ liệu)** | `setGroupOwner` chỉ dựng tiền điều kiện. Còn lệch: MSW cho chủ nhóm tự rời (server 409, D-43) → **chưa làm** MSW 409. Chuyển TIP sau. |
| 11 | **HỢP LỆ (dựng dữ liệu)** | `extraSessions` dựng 2 phiên thật; MSW trả số cố định. Chưa làm MSW đếm phiên thật. |
| 12 | **HỢP LỆ (dựng dữ liệu)** | `simulateTransfer` (ngân hàng giả bắn webhook) chỉ dựng dữ liệu; MSW tự hẹn giờ. Khối `if (onServer) { polls ≤ 2 }` (V2Q-94) là kiểm THÊM chỉ có nghĩa khi có socket, không nới assertion chung. |
| 13 | **HỢP LỆ (dựng dữ liệu)** | `closeRegistration()` / cookie giả: chỉ khác cách dựng trạng thái. |

Các `if (onServer)` khác (không thuộc 13 mục gốc) cũng chỉ dựng dữ liệu, giữ nguyên theo D-63: `admin-fees` (route 409 giả / cookie BUG-024; `simulateTransfer` UAT-10), `admin-members` (`lockMember` UAT-24), `admin-projects` (`reviseProject` / cookie REQ-106, V2Q-105), `profile` (TK SSO thật BUG-030), `auth-flows` (link đặt lại MK đọc từ mailbox `FAKE_MAIL_DIR` ở server, token MSW cố định — TD-035 đã làm ở TIP-V2-105).

---

## 5. Câu hỏi

1. **REQ-010 ↔ D-45**: REQ-010 yêu cầu xác thực MK/OTP trước khi liên kết SSO với email đã có TK; D-45 và `S/account/sso.int.spec.ts:75` cho đăng nhập luôn. Đã tính REQ-010 là TRỐNG. Nguồn nào đúng?
2. **QT-01 "Mật khẩu tạm trong email chào mừng bắt buộc đổi ở lần đăng nhập đầu"** lỗi thời theo D-10/D-30/D-47. Tôi không tính nó là thiếu test của QT-01. Có cần đánh dấu chính thức là bị thay thế?
3. **Phân trang**: REQ-040 ghi 9/trang (Portal Cộng đồng), `S/community/groups.int.spec.ts:49–50` assert API mặc định 12 và gắn nhãn BR-12; BR-12 nói "Nhóm 12" cho danh sách Admin, nhưng API `/admin/groups` mặc định 10 (`S/community/admin-groups.int.spec.ts:40`). Mặc định nào là chuẩn cho từng màn?
4. **D-42** nói bảng Thành viên chỉ hiển thị quyền, nhưng `E/admin-members.spec.ts:125` "đổi quyền hệ thống cần xác nhận (D-42)" đổi quyền ngay trên bảng. Test có đang kiểm một hành vi trái quyết định?
5. **D-41** "Ghi nhận đã thu bắt buộc lý do": `POST /admin/fees/:uid/collect` không gửi lý do vẫn 200 với lý do mặc định. Lý do mặc định có được chấp nhận là "có lý do"?
6. **BR-04 ↔ D-41**: BR-04 đối soát theo nội dung (có SĐT) + số tiền; D-41 chỉ theo Mã TV. Test hiện theo D-41. Tôi chấm BR-04 là ĐỦ theo cách hiểu D-41 thay BR-04.
7. **Ảnh bìa > 100KB**: không tìm thấy ngưỡng 100KB trong ma trận, đặc tả text hay code (code giới hạn 5MB). Nguồn ngưỡng 100KB ở đâu?
8. **§11 dòng "Yêu cầu tham gia nhóm → chủ nhóm, in-app"**: server chỉ đẩy socket `member.request` + badge `pendingRequests`, không tạo bản ghi thông báo. Như vậy có đạt "in-app"? Tôi chấm MỘT PHẦN.
9. **Quyết định [KT] và hoãn** (D-03, D-12, D-23, D-36, D-37, NFR-04, NFR-05, REQ-015, D-16, D-25): tôi tính TRỐNG cho đủ 100% dòng. Có muốn tách thành nhóm "không áp dụng" khỏi thống kê?
10. **k6** (`infra/k6`, `B66-k6.md`) không nằm trong danh sách nguồn test của nhiệm vụ; tôi chấm NFR-01/NFR-06 MỘT PHẦN dựa trên đó. Nếu chỉ tính bộ test được liệt kê thì cả hai là TRỐNG.
11. **Mức "e2e-server"**: tôi coi mọi `E/*.spec.ts` chạy ở cả hai chế độ dựa trên báo cáo 115/115 (B6, B62), không chạy lại trong đợt này.

## 6. Truy vết REQ SRS-3.6 (GOAL V2-BUILD, thêm 18/10/2026)

Initial statistics below are historical (18 October), not current counts. TIPs update their own rows; current P4 trace is section 7. P5 and final-V2 consolidation remain excluded from the stop-after-P4 delivery.
Tên test phải chứa mã REQ/AT (D-63).

| Nhóm | Tổng | ĐỦ | MỘT PHẦN | TRỐNG |
|---|---|---|---|---|
| REQ-2xx NA-01→29 | 29 | 0 | 0 | 29 |
| REQ-3xx AF/RB/EV/SEC/GR/IV/NR/UP | 38 | 0 | 0 | 38 |
| REQ-4xx LK-01→12 | 12 | 0 | 0 | 12 |
| D-49 → D-63 | 15 | 0 | 0 | 15 |
| AT (§20.8, §21.6, §22.6, §23.7) | 23 | 0 | 0 | 23 |
| **Tổng V2** | **117** | 0 | 0 | **117** |

### 6.1 REQ

| ID | Yêu cầu | Test đang kiểm | Mức | TIP |
|---|---|---|---|---|
| REQ-201 | NA-01 Phân tách phiên User/Admin; hai TK độc lập, không nút chuyển khu vực; kiểm quyền ở backend | — | TRỐNG | TIP-V2-202 |
| REQ-202 | NA-02 Cổng phí bắt buộc; Quay lại chỉ lùi bước trong popup; Admin không chịu cổng phí | — | TRỐNG | TIP-V2-108, 301 |
| REQ-203 | NA-03 Đối soát webhook + quét bù 2'; idempotent; thiếu tiền / sai nội dung không kích hoạt; gia hạn sớm cộng dồn | — | TRỐNG | TIP-V2-108, 301 |
| REQ-204 | NA-04 Job 08:00: Sắp hết hạn / Hết hạn + mail nhắc T-30, T-7, T-0, T+3, mỗi mốc ≤ 1 lần; Admin gửi nhắc tay | — | TRỐNG | TIP-V2-301 |
| REQ-205 | NA-05 Hàng đợi email: nhật ký, thử lại; vượt hạn mức → OTP ưu tiên, chiến dịch dời ngày | — | TRỐNG | TIP-V2-114 |
| REQ-206 | NA-06 Tra cứu MST tự điền; MST đã có TK → báo trùng, gợi ý Đăng nhập; lỗi → nhập tay | — | TRỐNG | TIP-V2-306 |
| REQ-207 | NA-07 Phát hiện tin nhạy cảm ở mỗi tin (cả tin persona) → báo cáo; không tự ẩn | S/moderation/moderation.int.spec.ts; S/notification/moderation-warning.int.spec.ts; S/bot/{persona-publication,bot-reply-worker}.int.spec.ts; packages/shared/src/moderation/keyword-matcher.spec.ts; packages/shared/src/mock-data/domains/moderation-jobs.spec.ts; AU/mocks/bot-moderation-handlers.spec.ts; AU/mocks/moderation-actions.spec.ts; AU/mocks/moderation-warning-handlers.spec.ts; AU/mocks/moderation-lock-handlers.spec.ts; PU/mocks/moderation-lock-session.spec.ts; packages/shared/src/mock-data/domains/moderation-lock.spec.ts; PU/mocks/moderation-warning-handlers.spec.ts; packages/shared/src/mock-data/domains/moderation-warning.spec.ts; packages/shared/src/mock-data/domains/{report-actions,audit-store}.spec.ts | MỘT PHẦN: native persona/script/reply publication reaches NA-07 worker, one automatic report, no automatic hide; shared matcher + MSW deferred jobs/automatic-case dedupe and Admin HTTP queue now have regressions; focused native moderation8/8; TIP-511 adds scoped mock hide/sibling/permission/audit/keyword/hidden-history regressions; TIP-516 adds deferred recipient warning/retry/source identity/retention (shared16, two HTTP workflows, focused native14); TIP-517 adds captured-member runtime lock/reason/audit and stale access/refresh epochs (shared12, Admin29/Portal8); D-55/project visibility/ghost seed/live bridge/browser/audit trace pending | TIP-V2-306, TIP-V2-516, TIP-V2-517 |
| REQ-208 | NA-08 Bot tự động 100% theo lịch kịch bản, đăng ngay; ≤ 120 tin mô phỏng/phòng, ≤ 30 hội thoại; tạm dừng ngoài giờ | SV/modules/bot/domain/{active-hours,schedule,bot-thread-status,auto-plan}.spec.ts; S/bot/{bot-scheduler,bot-worker,bot-generation,bot-auto-admission,bot-retention,persona-turn,persona-publication,execution-fields,bot}.int.spec.ts; IN/llm/{fake,local}.spec.ts; SV/common/{config/bot-env,integrations/llm-provider}.spec.ts; packages/shared/src/mock-data/domains/{bot-script-scheduler,bot-script-admission}.spec.ts; AU/mocks/{bot-permissions,bot-catalog-contract,bot-handler-errors,bot-activity-handlers}.spec.ts; packages/shared/src/mock-data/domains/{bot-script-limits,bot-posting-limits}.spec.ts ; shared/bot/runtime-time.spec.ts; E/bot-scheduling.spec.ts::UAT-15 REQ-208 D-50 manual schedule posts without approval; Stop prevents next turn | MỘT PHẦN: native scheduled/automatic turns, fenced drafts, cap/rate/quota/NA-07 and completion-clock/window-close regressions; full native1300/1300 at6ce5094b (TIP-512), not browser acceptance. TIP-513 proves MSW schedule/rearm/live spacing; TIP-514 adds17 original permission/audit regressions + expanded HTTP54/54. Owner plan approved (P5-PLAN-01); complete mock auto/limits/live/catalog storage alignment, both browser lanes and real-LLM E2E remain pending  TIP-520/521: canonical all-day shared11/native worker-reply16, MSW browser subset5/5; native browser/full auto remains pending. | TIP-V2-501, TIP-V2-513, TIP-V2-514, TIP-V2-515 , TIP-V2-520, TIP-V2-521 |
| REQ-209 | NA-09 Chủ đề thảo luận chỉ Admin tạo trong form nhóm; "Chung" luôn có; Portal không có nút tạo/xóa | — | TRỐNG | TIP-V2-304 |
| REQ-210 | NA-10 Thông báo in-app theo sự kiện nghiệp vụ; đã đọc khi mở danh sách / bấm | — | TRỐNG | TIP-V2-305 |
| REQ-211 | NA-11 Gộp nhà đầu tư; tổng vốn = tổng các lần quan tâm; tin Admin đầu tiên → Đang trao đổi | — | TRỐNG | TIP-V2-107 |
| REQ-212 | NA-12 Gán nhóm hàng loạt, khử trùng lặp, giữ nhóm cũ, thông báo từng nhóm mới | — | TRỐNG | TIP-V2-304 |
| REQ-213 | NA-13 Audit giữ ≥ 12 tháng, không xóa từ UI; job dọn dữ liệu hằng đêm | — | TRỐNG | TIP-V2-306 |
| REQ-214 | NA-14 Xuất bất đồng bộ, link ký 1 giờ, ghi log dữ liệu cá nhân | — | TRỐNG | TIP-V2-109 |
| REQ-215 | NA-15 Khóa 15' sau 5 lần sai; đúng → đặt lại bộ đếm; đặt lại MK → mở khóa; áp dụng cả Admin | — | TRỐNG | TIP-V2-202 |
| REQ-216 | NA-16 Khóa TK: thu hồi phiên, ngắt WebSocket, ẩn khỏi online, ẩn dự án Public; giữ tin cũ (+ D-15, D-55) | S/account/lock-propagation.int.spec.ts; shared/group-lock-effects.spec.ts; AU+PU/mocks/group-lock-handlers.spec.ts; TIP-517 session regressions | PARTIAL: native lock propagation6/6; TIP-517 stale access/refresh epochs; TIP-518 deferred group transfer12 shared + Admin/Portal HTTP, permanent demotion/system audit/retry/count. Public project visibility, live push/online/cross-origin and full browser acceptance pending | TIP-V2-104, TIP-V2-517, TIP-V2-518 |
| REQ-217 | NA-17 SSO ánh xạ đúng email; nút bị tắt không hiện; TK Admin không SSO | — | TRỐNG | TIP-V2-105, 202 |
| REQ-218 | NA-18 Gợi ý nhóm theo vai trò khi đăng ký; bắt buộc ≥ 1 nhóm; báo chủ nhóm | — | TRỐNG | TIP-V2-304 |
| REQ-219 | NA-19 Nội dung CK `OPCHUB [Mã TV] [SĐT]` + QR cố định theo TK, không dấu | — | TRỐNG | TIP-V2-302 |
| REQ-220 | NA-20 Danh mục lĩnh vực dùng chung; không xóa khi đang dùng; đếm theo dự án đang hiển thị | — | TRỐNG | TIP-V2-306 |
| REQ-221 | NA-21 Dự án Private chỉ chủ, đội ngũ, Admin xem; ẩn link kho mã; chưa duyệt chỉ ở "Dự án của tôi" | — | TRỐNG | TIP-V2-306 |
| REQ-222 | NA-22 Mã YC-xxxx; ghi chú nội bộ ẩn với người gửi; chỉ @nhắc TK nội bộ | — | TRỐNG | TIP-V2-306 |
| REQ-223 | NA-23 Scheduler sự kiện 15': nhắc 24h, tự đóng đăng ký, hủy trả chỗ, ẩn sự kiện đã qua | — | TRỐNG | TIP-V2-303 |
| REQ-224 | NA-24 Số liệu dashboard 3 giây; số đỏ sidebar (dự án chờ duyệt, YC mới, tin cần kiểm duyệt); hoạt động ≤ 50 mục | S/dashboard/{dashboard,dashboard-provenance,bot-threads,bot-thread-storage}.int.spec.ts; packages/shared/src/mock-data/domains/dashboard-threads.spec.ts; PU/mocks/dashboard-bot-handlers.spec.ts | MỘT PHẦN: native counters/feed/paywall, persisted member identity/company + DB-rename control (TIP-512 focused6/6), real latest50 bot openings, cache and >26k-row query plan; MSW stored bot history/latest50/hidden reads have scoped regression evidence; sidebar/browser/full audits still require final acceptance | TIP-V2-305, TIP-V2-502, TIP-V2-512 |
| REQ-225 | NA-25 Đếm tin chưa đọc theo chủ đề / nhóm / menu; tin của mình không tính | — | TRỐNG | TIP-V2-305 |
| REQ-226 | NA-26 Xử lý ảnh tải lên: nén, lưu storage; sai định dạng / quá cỡ báo lỗi, giữ ảnh cũ | — | TRỐNG | TIP-V2-102 |
| REQ-227 | NA-27 Làm sạch rich text ở backend, giữ biến email | — | TRỐNG | TIP-V2-103 |
| REQ-228 | NA-28 Ma trận quyền có hiệu lực ngay cho phiên đang mở, không cần đăng nhập lại | AU/mocks/bot-catalog-contract.spec.ts::NA-28 grants are evaluated on every request without role-name checks | MỘT PHẦN: MSW bot endpoints evaluate revoked/read-only/action-only grants on every request; full native session/browser propagation acceptance still pending | TIP-V2-203, TIP-V2-514 |
| REQ-229 | NA-29 Khởi tạo nhóm: 1 nhóm/tỉnh, chủ nhóm, chủ đề "Chung"; đổi chủ → chủ cũ thành Thành viên | — | TRỐNG | TIP-V2-304 |
| REQ-301 | AF-R01 Phí được xác nhận (CK, ghi nhận đơn / hàng loạt) → tự thành đại lý: mã từ tên, link `/r/MÃ`, % mặc định; không tạo tay | domain/affiliate-code.spec.ts; affiliate/lifecycle.int.spec.ts; affiliate/backfill.int.spec.ts; affiliate/backfill-plan.int.spec.ts  E/affiliate-agent-creation.spec.ts; apps/server/test/audit/c4-affiliate/{check.spec,worker-edges.audit,commission-edges.audit}.ts; | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-401 |
| REQ-302 | AF-R02 Chưa đóng phí → không có mã/link; hiện khung "Đóng phí thành viên để nhận link giới thiệu" | affiliate/me-affiliate.int.spec.ts; membership/overlay-policy.spec.ts; e2e/behavior/affiliate-screen.spec.ts | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-402, 403 |
| REQ-303 | AF-R03 Gắn mã khi đăng ký từ `/r/MÃ`, `?ref=` hoặc nhập tay; lưu cùng TK mới | affiliate/referral-code.int.spec.ts; affiliate/referral-registration.int.spec.ts; affiliate/referral-atomicity.int.spec.ts; auth/referral-model.spec.ts; auth/hooks/use-referral-code.spec.tsx; auth/referral-session.spec.ts; e2e/behavior/affiliate-portal.spec.ts; affiliate-lifecycle.spec.ts | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-402, 403 |
| REQ-304 | AF-R04 Từ chối mã không tồn tại / của chính mình / đại lý tạm dừng; còn lỗi thì không gửi được form | affiliate/referral-code.int.spec.ts; auth/hooks/use-referral-code.spec.tsx; mocks/affiliate-handlers.spec.ts; e2e/behavior/affiliate-portal.spec.ts (AT-AF03); affiliate-paused.spec.ts (AT-AF05) | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-402, 403 |
| REQ-305 | AF-R05 Hoa hồng chỉ ở lần đóng phí đầu tiên của người được giới thiệu; gia hạn không sinh | affiliate/commission.int.spec.ts (AT-AF04) | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-401 |
| REQ-306 | AF-R06 Phí người được giới thiệu được xác nhận → hoa hồng Đã ghi nhận = 600.000 × %; thông báo đại lý | affiliate/commission.int.spec.ts (AT-AF02, relay + retry); E/affiliate-renewal.spec.ts (AT-AF04, 8d04869, MSW pass; native browser pending) apps/server/test/audit/c4-affiliate/{check.spec,worker-edges.audit,commission-edges.audit}.ts; affiliate/referral-terminal.int.spec.ts; | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-401 |
| REQ-307 | AF-R07 Đại lý hết hạn phí → Tạm dừng (link ngừng ghi nhận, khách đóng phí lúc này không sinh hoa hồng); gia hạn → Hoạt động | affiliate/pause.int.spec.ts; affiliate/referral-code.int.spec.ts (link/check guard)  E/affiliate-payout.spec.ts; apps/server/test/audit/c4-affiliate/{check.spec,worker-edges.audit,commission-edges.audit}.ts; affiliate/referral-terminal.int.spec.ts; | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-401 |
| REQ-308 | AF-R08 % mặc định ở Chính sách; Admin sửa % riêng (1–50%) hoặc hàng loạt; áp cho khoản chưa chi + khách mới | affiliate/admin-commissions.int.spec.ts; affiliate/policy.int.spec.ts; affiliate/admin-races.int.spec.ts; AU/features/affiliate/hooks/use-affiliate-writes.spec.tsx; AU/mocks/affiliate-handlers.spec.ts; E/admin-affiliate.spec.ts; E/admin-affiliate-operations.spec.ts  affiliate/policy-preview.int.spec.ts; AU/mocks/affiliate-policy-preview.spec.ts; AU/features/affiliate/components/policy-rate-preview.spec.tsx;  E/affiliate-dialogs-responsive.spec.ts;  AU/features/affiliate/components/rate-dialog.spec.tsx; | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-402, 404 |
| REQ-309 | AF-R09 Chi trả theo tháng toàn bộ khoản Đã ghi nhận; bắt buộc STK (tên in hoa không dấu); thông báo kèm số tiền, ngân hàng, kỳ | affiliate/payout.int.spec.ts; affiliate/history.int.spec.ts; affiliate/me-affiliate.int.spec.ts; affiliate/model.spec.ts; affiliate/hooks/use-bank-form.spec.tsx; e2e/behavior/affiliate-screen.spec.ts; affiliate-lifecycle.spec.ts; affiliate-paused.spec.ts  E/affiliate-payout.spec.ts; DB/affiliate-payout-demo.int.spec.ts; apps/server/test/audit/c4-affiliate/{check.spec,worker-edges.audit,commission-edges.audit}.ts; | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-402, 403, 404 |
| REQ-310 | AF-R10 Hủy hoa hồng Đã ghi nhận khi vi phạm; lý do hiện ở cả hai phía | affiliate/admin-commissions.int.spec.ts; affiliate/components/history-mobile.spec.tsx; AU/features/affiliate/components/action-dialogs.spec.tsx; AU/mocks/affiliate-handlers.spec.ts; E/admin-affiliate.spec.ts  E/affiliate-dialogs-responsive.spec.ts; apps/server/test/audit/c4-affiliate/{check.spec,worker-edges.audit,commission-edges.audit}.ts; AU/features/affiliate/components/commission-status-menu.spec.tsx; E/affiliate-status-menu.spec.ts; E/affiliate-status-filters.spec.ts; e2e/parity/scenarios/admin-affiliate-commission-{steps,states}.ts; | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-402, 403, 404 |
| REQ-311 | Màn Affiliate Portal (§20.6) | affiliate/me-affiliate.int.spec.ts; affiliate/history.int.spec.ts; affiliate/history-plan.int.spec.ts; affiliate/guards.int.spec.ts; affiliate/model.spec.ts; affiliate/components/history-mobile.spec.tsx; shared/fixtures/affiliate.spec.ts; shared/mock-data/domains/affiliate-demo.spec.ts; db/test/affiliate-demo.int.spec.ts; portal/mocks/affiliate-demo.spec.ts; ui/admin-table/admin-table.spec.tsx; ui/status-tag/status-tag.spec.tsx; e2e/behavior/affiliate-screen.spec.ts; parity P-97/98; e2e/behavior/affiliate-lifecycle.spec.ts; affiliate-paused.spec.ts; affiliate/components/share-bar.spec.tsx | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-403 |
| REQ-312 | Màn Affiliate Admin: Hoa hồng, Đại lý, Chi tiết đại lý, Chính sách (§20.6) | AU/features/affiliate/{api,model}.spec.ts; AU/features/affiliate/hooks/{use-affiliate-page,use-affiliate-queries,use-affiliate-writes}.spec.tsx; AU/features/affiliate/components/{action-dialogs,affiliate-stats,affiliate-pagination,affiliate-detail-head,affiliate-export-button}.spec.tsx; AU/mocks/affiliate-handlers.spec.ts; AU/mocks/affiliate-authorization.spec.ts (14 locked-session endpoint regressions); E/admin-affiliate.spec.ts; E/admin-affiliate-operations.spec.ts; E/admin-rbac.spec.ts; S/affiliate/summary-paid.int.spec.ts; parity D-84/85; SH/mock-data/domains/affiliate-persistence/snapshot.spec.ts (17 restore cases)  E/affiliate-cross-app.spec.ts; SH/mock-data/domains/affiliate-persistence/{host,webhooks}.spec.ts;  E/affiliate-{agent-creation,concurrent,payout}.spec.ts; DB/affiliate-payout-demo.int.spec.ts; SH/mock-data/domains/affiliate-persistence/welcome.spec.ts; E/affiliate-{renewal,responsive,frozen-clock}.spec.ts; SH/mock-data/domains/affiliate-persistence/host-ready.spec.ts; AU/features/affiliate/components/{affiliate-detail-tabs,commission-bulk-bar}.spec.tsx;  AU/features/affiliate/components/{agent-identity,agent-period}.spec.tsx; AU/features/affiliate/agent-month-options.spec.ts; E/affiliate-agent-period.spec.ts; AU/features/affiliate/hooks/use-affiliate-tab-visibility.spec.ts; AU/features/affiliate/format.spec.ts; E/affiliate-customers-responsive.spec.ts;  AU/features/affiliate/components/policy-form.spec.tsx; E/affiliate-policy-responsive.spec.ts;  affiliate/policy-preview.int.spec.ts; AU/mocks/affiliate-policy-preview.spec.ts; AU/features/affiliate/components/policy-rate-preview.spec.tsx;  e2e/parity/scenarios/admin-affiliate-list-states.ts (four comparable states; positive baseline before empty);  E/affiliate-dialogs-responsive.spec.ts;  AU/features/affiliate/components/rate-dialog.spec.tsx;  apps/server/test/audit/controller-decorators.spec.ts; apps/server/test/audit/c4-affiliate/{check.spec,worker-edges.audit,commission-edges.audit}.ts; AU/features/affiliate/components/commission-status-menu.spec.tsx; E/affiliate-status-menu.spec.ts; E/affiliate-status-filters.spec.ts; e2e/parity/scenarios/admin-affiliate-commission-{steps,states}.ts; | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-404 |
| REQ-321 | RB-R01 Menu Thành viên chỉ có người đăng ký qua form; cột "Vai trò khi đăng ký" chỉ đọc | — | TRỐNG | TIP-V2-204 |
| REQ-322 | RB-R02 Tạo TK quản trị (họ tên, SĐT, email nội bộ, vai trò, MK tạm ≥ 8); email không trùng TK quản trị / thành viên; gửi email đăng nhập | — | TRỐNG | TIP-V2-201, 202 |
| REQ-323 | RB-R03 TK quản trị không ở menu Thành viên, không vào Portal; TK thành viên không vào Admin | — | TRỐNG | TIP-V2-202 |
| REQ-324 | RB-R04 5 vai trò mặc định + vai trò tự tạo; Super Admin không sửa/khóa; xóa vai trò tự tạo khi không còn TK giữ | — | TRỐNG | TIP-V2-201, 203 |
| REQ-325 | RB-R05 25 quyền theo 11 menu, tách Xem / Thao tác; Super Admin toàn quyền | — | TRỐNG | TIP-V2-201, 203 |
| REQ-326 | RB-R06 Sidebar chỉ hiện menu có ≥ 1 quyền; tab Cài đặt lọc theo quyền | — | TRỐNG | TIP-V2-204 |
| REQ-327 | RB-R07 Chế độ chỉ xem: dải thông báo, chặn mọi nút thao tác (cả phía server) | — | TRỐNG | TIP-V2-203, 204 |
| REQ-328 | RB-R08 Đổi vai trò, khóa/mở, thu hồi TK quản trị ghi nhật ký; TK bị khóa không đăng nhập được | — | TRỐNG | TIP-V2-202 |
| REQ-329 | RB-R09 Super Admin xem thử với một vai trò (dải cam, nút Thoát xem thử) | — | TRỐNG | TIP-V2-204 |
| REQ-341 | EV-R01 Trường link Google Meet (`https://`), nút "Tạo link Meet" (D-59) | — | TRỐNG | TIP-V2-303 |
| REQ-342 | EV-R02 Khối "Sắp diễn ra" + cột "Tiếp theo" (3 sự kiện) ở Admin | — | TRỐNG | TIP-V2-303 |
| REQ-343 | EV-R03 Panel Chi tiết sự kiện: thông tin, link Meet (sao chép, mở), danh sách đăng ký, check-in | — | TRỐNG | TIP-V2-303 |
| REQ-344 | EV-R04 Link Meet + "Vào phòng họp" chỉ hiện sau khi đăng ký; xác nhận đăng ký kèm link | — | TRỐNG | TIP-V2-303 |
| REQ-345 | EV-R05 Check-in từng người / tất cả; "Đã check-in x/y"; → Đã tham dự | — | TRỐNG | TIP-V2-303 |
| REQ-351 | SEC-R01 TK quản trị đăng nhập lần đầu bằng MK tạm → bắt buộc đổi MK (≥ 8, có chữ hoa + số, khác MK tạm) | — | TRỐNG | TIP-V2-202, 204 |
| REQ-352 | SEC-R02 Cột "Bảo mật 2FA"; bật "Yêu cầu 2FA cho quản trị viên" → thiết lập ở lần đăng nhập sau | — | TRỐNG | TIP-V2-202, 204 |
| REQ-353 | SEC-R03 Khóa tạm + thu hồi phiên áp dụng cả TK quản trị | — | TRỐNG | TIP-V2-202 |
| REQ-361 | GR-R01 Gán vào nhóm chọn vai trò trong nhóm: Thành viên / Giảng viên | — | TRỐNG | TIP-V2-304 |
| REQ-362 | GR-R02 Vai trò trong nhóm hiện ở danh sách thành viên phòng chat; không cấp quyền Admin | — | TRỐNG | TIP-V2-304 |
| REQ-371 | IV-R01 Admin trao đổi với nhà đầu tư; mỗi tin → NĐT nhận thông báo in-app | — | TRỐNG | TIP-V2-107 |
| REQ-372 | IV-R02 Portal: khối "Trao đổi với OPC Hub" cùng luồng, NĐT trả lời trực tiếp | — | TRỐNG | TIP-V2-107 |
| REQ-373 | IV-R03 Tin Admin đầu tiên chuyển Đã gửi → Đang trao đổi | — | TRỐNG | TIP-V2-107 |
| REQ-381 | NR-R01 Phí không hoàn lại; không có chức năng hoàn phí | — | TRỐNG | TIP-V2-302 |
| REQ-382 | NR-R02 Điều kiện "không hoàn lại" phải đồng ý ở ô điều khoản (đăng ký, tham gia cộng đồng) và khung "Điều kiện thanh toán" | — | TRỐNG | TIP-V2-302 |
| REQ-383 | NR-R03 Hiệu lực 12 tháng từ khi xác nhận; hết hạn → cần gia hạn (NA-04) | — | TRỐNG | TIP-V2-301 |
| REQ-391 | UP-07 V4: cột trái thành viên hệ thống (50.000đ/tháng, thu 600.000đ/năm, niêm yết 200.000đ/tháng, D-58); cột phải 6 dịch vụ "Tư vấn →"; ≥ 1100px vừa một màn không cuộn, mobile 1 cột | — | TRỐNG | TIP-V2-302 |
| REQ-401 | LK-01 Đăng ký + OTP → Admin Tổng quan / Thành viên; user Hoạt động, phí Chờ thanh toán | — | TRỐNG | TIP-V2-503 |
| REQ-402 | LK-02 Popup phí, CK đúng nội dung → Admin Phí; Chờ thanh toán → Đã thanh toán 12 tháng | — | TRỐNG | TIP-V2-503 |
| REQ-403 | LK-03 Tham gia nhóm → chủ nhóm duyệt; pending → active | — | TRỐNG | TIP-V2-503 |
| REQ-404 | LK-04 Báo cáo tin → tab Kiểm duyệt tin nhắn; Mới → Đã xử lý | — | TRỐNG | TIP-V2-503 |
| REQ-405 | LK-05 Đăng ký sự kiện → danh sách đăng ký; registered → attended | — | TRỐNG | TIP-V2-303, 503 |
| REQ-406 | LK-06 Đăng dự án → Admin Dự án; Nháp → Chờ duyệt → Đang hiển thị | — | TRỐNG | TIP-V2-503 |
| REQ-407 | LK-07 Quan tâm đầu tư → Admin Nhà đầu tư, panel trao đổi | — | TRỐNG | TIP-V2-107, 503 |
| REQ-408 | LK-08 "Tư vấn →" ở 1 trong 6 dịch vụ → Admin Dịch vụ; Mới → Đang tư vấn → Hoàn tất | — | TRỐNG | TIP-V2-110, 302 |
| REQ-409 | LK-09 "Đăng ký thành viên ngay" → luồng thanh toán LK-02 | — | TRỐNG | TIP-V2-302 |
| REQ-410 | LK-10 Link affiliate → Đơn giới thiệu, Chi trả; referral → commission → paid (không có hoàn phí, D-54) | E/affiliate-{lifecycle,cross-app,payout,concurrent,renewal}.spec.ts; E/admin-affiliate-operations.spec.ts; S/affiliate/{payout,history,admin-races}.int.spec.ts | ĐỦ hành vi P4: native/MSW 221/221; Affiliate API 55/55 + separate coverage 2/2; latest UAT 30/30 in scope. UI/audit debt declared, not pixel PASS; see section 7 and V2-P4-completion.md | TIP-V2-404, 503 |
| REQ-411 | LK-11 Bot persona tự động 100% theo kịch bản | SV/modules/bot/domain/reply-pick.spec.ts; S/bot/{bot-reply,bot-reply-storage,bot-reply-worker,bot-scheduler,bot-generation}.int.spec.ts; S/dashboard/{bot-threads,bot-thread-storage}.int.spec.ts; packages/shared/src/mock-data/domains/{dashboard-threads,bot-message-store}.spec.ts; PU/mocks/dashboard-bot-handlers.spec.ts; packages/shared/src/mock-data/domains/{bot-reply-admission,bot-reply-worker}.spec.ts; PU/mocks/bot-reply-handlers.spec.ts | MỘT PHẦN: native FakeLlm worker, replies/NA-07 and real Dashboard script/auto/reply openings, GC/per-room identity/cache/keyset/visibility proven; MSW message-backed openings/latest50/visibility and private metadata now have scoped cases; both browser lanes, real-LLM E2E, complete auto/moderation-action/live-bridge/mock-native seed alignment and final audits pending; see TIP-V2-502-dashboard-checkpoint and TIP-V2-502-msw-dashboard-checkpoint | TIP-V2-502 |
| REQ-412 | LK-12 Hồ sơ, đổi MK, 2FA → Admin Thành viên chi tiết (chỉ xem) | — | TRỐNG | TIP-V2-503 |

### 6.2 Decisions D-49 → D-63

| ID | Quyết định | Test đang kiểm | Mức |
|---|---|---|---|
| D-49 | Nguồn đặc tả (18/10/2026) | — | TRỐNG |
| D-50 | Automatic bots without approval | SV/bot/runtime tests; AU/features/bots/components/auto-panel.spec.tsx; E/bot-scheduling.spec.ts | PARTIAL: scheduling/cursor/stop/absence of approval controls and actual first-turn activity verified in MSW; native focused worker/reply16; native browser/full acceptance pending |
| D-51 | Phạm vi go-live | — | TRỐNG |
| D-52 | Phân quyền | — | TRỐNG |
| D-53 | Affiliate | — | TRỐNG |
| D-54 | Hoàn phí | — | TRỐNG |
| D-55 | Khoá tài khoản | TIP-517 lock/session controls; TIP-518 shared12 + Admin/Portal HTTP; native lock propagation6 | MỘT PHẦN: ownership transferred permanently, system audit/count/retry; project/live/browser acceptance pending |
| D-56 | "Giảng viên" | — | TRỐNG |
| D-57 | Hạn phí & nhắc | — | TRỐNG |
| D-58 | Giá hiển thị | — | TRỐNG |
| D-59 | Google Meet | — | TRỐNG |
| D-60 | Dịch vụ tư vấn | — | TRỐNG |
| D-61 | Chủ đề chat | — | TRỐNG |
| D-62 | TK quản trị & SSO | — | TRỐNG |
| D-63 | Chuẩn test | — | TRỐNG |

### 6.3 Nghiệm thu AT mới

| ID | Kịch bản → kỳ vọng | Test đang kiểm | Mức | TIP |
|---|---|---|---|---|
| AT-AF01 | Đóng phí lần đầu → tự có mã + link, Admin nhãn Tự động | E/affiliate-agent-creation.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-401, 404 |
| AT-AF02 | Mở /r/MÃ → đăng ký → đóng phí → 1 khoản Đã ghi nhận đúng %, thông báo đại lý | E/affiliate-lifecycle.spec.ts; E/affiliate-cross-app.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-401, 403 |
| AT-AF03 | Nhập mã của chính mình → lỗi, không gửi được form | E/affiliate-portal.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-402, 403 |
| AT-AF04 | Khách gia hạn năm 2 → không phát sinh hoa hồng mới | E/affiliate-renewal.spec.ts; S/affiliate/commission.int.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-401 |
| AT-AF05 | Đại lý hết hạn → Tạm dừng, mã bị từ chối, khoản cũ vẫn chi trả | E/affiliate-paused.spec.ts; E/affiliate-payout.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-401, 402 |
| AT-AF06 | Chi trả khi đại lý chưa có STK → bị chặn | E/affiliate-payout.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-402, 404 |
| AT-RB01 | Tạo TK quản trị bằng email thành viên → lỗi | E/admin-rbac.spec.ts; E/admin-settings.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-201 |
| AT-RB02 | Kế toán đăng nhập → sidebar đúng 6 menu | E/admin-rbac.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-204 |
| AT-RB03 | Giảng viên mở Thành viên bấm Khóa/Xuất → chế độ chỉ xem, bị chặn | E/admin-rbac.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-203, 204 |
| AT-RB04 | Khóa TK quản trị rồi đăng nhập → "Tài khoản quản trị đã bị khóa" | E/admin-rbac.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-202 |
| AT-RB05 | Xóa vai trò đang có TK → bị chặn | E/admin-rbac.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-203 |
| AT-RB06 | Menu Thành viên không có TK quản trị; cột Vai trò khi đăng ký chỉ đọc | E/admin-rbac.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-204 |
| AT-EV01 | Chưa đăng ký mở sự kiện → không thấy link Meet | E/events.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-303 |
| AT-EV02 | Đăng ký → thấy link Meet + Vào phòng họp; thông báo kèm link | E/events.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-303 |
| AT-SEC01 | TK quản trị mới đăng nhập bằng MK tạm → bắt buộc đổi MK | E/admin-rbac.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-202, 204 |
| AT-GR01 | Gán vào nhóm vai trò Giảng viên → phòng chat hiển thị | E/admin-members.spec.ts; E/chat.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-304 |
| AT-IV01 | Admin trả lời NĐT → NĐT nhận thông báo, thấy tin | E/investor-thread.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-107 |
| AT-NR01 | Đăng ký + mở popup phí → thấy điều kiện không hoàn lại ở 2 chỗ | E/popup-v4.spec.ts; E/community.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-302 |
| AT-LK01 | Đăng ký mới không CK → popup không tắt, không vào menu khác | E/membership.spec.ts; audit/manual-fee-activation.audit.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-503 |
| AT-LK02 | Kế toán xác nhận đã thu → popup tự đóng, hạn 12 tháng | audit/manual-fee-activation.audit.ts (native direct live gate + persisted calendar-year expiry) | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-503 |
| AT-LK03 | Báo cáo tin → tab Kiểm duyệt tin nhắn | E/chat.spec.ts; E/admin-groups.spec.ts; audit/checks/hide-message.ts (actual report/hide native) | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-503 |
| AT-LK04 | Popup Gói dịch vụ 1366×768 không cuộn | E/popup-v4.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-302 |
| AT-LK05 | "Tư vấn →" Công cụ & Giải pháp số → YC đúng tên dịch vụ | E/popup-v4.spec.ts | ĐỦ hành vi - full native/MSW 221; native-only audit noted explicitly | TIP-V2-302 |


## Affiliate Admin state audit ? source `5894b5b` (P4 IN-PROGRESS)

- REQ-308/312: individual editor unit cases cover cancel/latest server value,
  invalid input, valid PATCH, permission denial/revocation, pending locks and
  retry after conflict. `affiliate-inline-rate.spec.ts` additionally checks
  actual inline form (no modal), cancel/F5 unchanged, invalid save disabled,
  PATCH 200 and saved value after F5; shared MSW/native assertions, not a new
  `onServer` exception. New native browser run is still missing.
- REQ-309/410: receipt tests preserve supplied amount independently of fee/rate,
  immutable bank and paid date; unknown bank remains unknown without losing
  the known amount/date, cancelled entries stay explicit, period uses VN time.
  History badge reads API total with size 1, including cancelled entries, not
  converted statistic or page length; empty ID/denied permission do not fetch.
- Detail default size 8/main size 10, URL fallback/explicit size and retaining
  option 8 after changing size have unit coverage. Five additional parity
  states are now executable at two widths; raw failures are retained. Neither
  739 passing unit tests nor the default four passing screenshots proves all
  P4 native/audit/parity requirements. See `TIP-V2-404-states-checkpoint.md` and
  its evidence directory for intermediate failures and committed rerun results.

Final test follow-up `5a4349c`: full Affiliate + Admin RBAC MSW 37/37 passed;
focused mobile 1/1 is included in that total. Parity on UI source `5894b5b`
is 8/14, six failures remain. No new native browser/audit acceptance is claimed.

REQ-312 agent cards on `6ee0fc3`: mobile 360/390 asserts all nine cells fit,
selection/clear, actual API amounts, detail/F5 and full-width empty search.
Two new cases are included in full 39/39 MSW, not added twice. Four new
identity/bulk-bar unit cases are included in 743 passed + 2 existing skips.
The native variants are registered but not newly run. Raw Admin parity still
8/14; V2Q-178 records bank/period DTO gaps rather than fictional UI values.

REQ-312 / V2Q-178 TIP-V2-402B, source `79f7073`: native list-presentation
integration covers bank null, lifetime versus selected/empty/all months,
paid/recorded/cancelled, historical unequal rates, live-bank change versus
immutable paid receipt and permission denial. Three new cases are included
in 48/48 Affiliate+Admin-contract integration (20 files); the contract case
checks 14 endpoints, not 14 extra tests. Five shared schema/provider cases
are included in committed 748 unit passed + 2 existing skips. Full MSW 39/39
uses freshly rebuilt apps/relay. No new native browser/audit acceptance is
claimed; current bank/period UI wiring and complete parity are still pending.

## 7. P4 current acceptance trace - 21 October 2026

This supersedes older P4 pending statuses, not the historical raw evidence.
Scope: REQ-301-312 and REQ-410, AT-AF01-06, Affiliate/RBAC integration.
Native full behavior 221/221 on 877a461; MSW full behavior 221/221 with d422acd
content. Additional native manual collection 1/1 and final-source lock 1/1.
Production source is unchanged between the final full suites. Prefixes retain
section 0 meanings; API/domain suites live in S/affiliate/.

| IDs | Actual assertions / test references | Current level |
|---|---|---|
| 301, 302 | E/affiliate-agent-creation, affiliate-screen; lifecycle/me-affiliate integration: exactly one automatic agent after fee, unpaid preview without code/link | ĐỦ hành vi |
| 303, 304 | E/affiliate-portal, affiliate-lifecycle, affiliate-paused; referral-code/registration/atomicity integration: URL/cookie/manual, self/invalid/paused refusal | ĐỦ hành vi |
| 305, 306 | E/affiliate-renewal and affiliate-lifecycle; commission integration: reactive renewal, persisted year extension, no second commission, real amounts/notifications | ĐỦ hành vi |
| 307 | E/affiliate-paused, affiliate-payout; pause/referral-terminal integration: paused new refusal, old money still payable and replay cannot revive terminal rows | ĐỦ hành vi |
| 308 | E/admin-affiliate-operations, affiliate-inline-rate, affiliate-cross-app/concurrent; policy/admin-races integration: range, bulk/individual, recorded versus paid, persisted policy and parallel writes | ĐỦ hành vi |
| 309 | E/affiliate-payout, affiliate-screen; payout/history integration: missing-bank 409 without mutation, retry, closed month, persisted immutable receipt | ĐỦ hành vi |
| 310 | E/admin-affiliate and affiliate-dialogs-responsive/status-menu; admin-commissions integration: reason required, cancel does not write, valid cancellation persists both sides | ĐỦ hành vi |
| 311 | E/affiliate-screen, affiliate-cross-app, affiliate-payout; history/me-affiliate integration: own-only bank/referral/payout history, mask and persisted snapshots | ĐỦ hành vi |
| 312 | Full Admin UI, policy, period/search/status/page/F5, cards/dialogs/menu, RBAC and CSV same-operation audit assertions in 52-case subset | ĐỦ hành vi; cosmetic debt |
| 410 | E/affiliate-lifecycle, affiliate-payout, affiliate-cross-app/concurrent; selected CSV and exact audit row in admin-affiliate-operations | ĐỦ hành vi |

Visual qualification remains explicit: final Admin parity 27/34 <=3%, seven
failures; six native selected-label paint rechecks remain red. User accepts
cosmetic debt, not weakened assertions. See V2-P4-UI-TECH-DEBT and audit follow-ups.
Native seeded audit 251 completed invocations is not a zero-finding PASS; three
in-scope S2 auditor issues corrected, UAT latest 30/30 in scope, UAT-14 excluded
P5. Nineteen S3 findings remain reasoned follow-ups. No P5 or all-V2 coverage
completion is inferred from these P4 results. Final reports retain full evidence.


### P5 TIP-527 actual-provider qualification (2026-10-21)

REQ-207 / UAT-14: separate opt-in native browser test proves an actual member
question -> eligible same-group persona -> actual LocalLlm delayed worker ->
live open chat -> F5 quote/public-payload persistence (1/1, TIP-527 evidence).
This does not replace the required same-assertion Fake MSW/native pair.
REQ-208 / UAT-15: original real opening reached Dashboard but the browser test
failed on a two-surface strict locator; article scoping corrected, not rerun.
Keep PARTIAL; not a full real-provider3/4turn conversation. Two cumulative
upstream attempts200/stop, zero excess requests; Fake/demo restored.
Full post526 Fake MSW222/222 terminal at27731c1e; full native/current integration,
missing acceptance rows, audits and parity still require their own proof.
See reports/TIP-V2-527-completion.md; no overall P5 coverage certification.


### P5 TIP-529 delayed worker deadline correction
REQ-207/208: S/bot/bot-queue-deadline.int.spec.ts checks actual Redis timestamp
plus delay equals the persisted Postgres nextAt under advancing clocks. Original
25ms-early regression fails before/pass after; no-drift control unchanged.
Original S/bot/bot-reply-worker.int.spec.ts and publication/emergency/cleanup
cohort18/18 after correction; actual170727ms delayed reply and moderation pass.
Full integration at a7f68d00 remains a retained failure (server1286pass/1fail),
not a full PASS after this scoped retry. Deployment/full acceptance pending.


### P5 TIP-530 same-assertion Fake live member reply
UAT-14 / REQ-060 / REQ-411: E/bot-replies.spec.ts sends a unique real member
question through UI after actual same-group/all-day persona setup; same delayed
Fake reply, open chat (before F5), quote, null sender and private-field exclusion
assertions pass on MSW (11/11 cohort) and native1/1. New live committed room
notifications have shared13 and Portal3 lifecycle controls plus existing3 cache
regressions. Original MSW missing-live failure retained. Final source corrects
legacy REQ-207 title to060: do NOT count this happy-path case as NA-07 proof.
REQ-411/LK-11 remains PARTIAL for full automatic script lifecycle. UAT-15, other
UAT/AT/LK, full integration/context-history failure, audits and parity remain open.


### P5 TIP-531 UAT-14 context chronology
S/bot/bot-reply.int.spec.ts retains every addressed-persona assertion, with
actual source-derived chronology for ten newer speakers. Original13pass/1fail
retained; after15/15 including new S/bot/bot-reply-context.int.spec.ts exact
nine prior messages plus newest human trigger. No production history filtering
or passing-full-integration claim. See TIP-V2-531-completion.md.


### P5 TIP-532 full auto lifecycle: native proven / MSW red
E/bot-auto-lifecycle.spec.ts (UAT-15/REQ-208/411/P5-PLAN-01) completes actual
three-turn opening/other/opener conversation on native1/1,10.4min; default
300000ms deadlines, no early post/manual run, live chat/F5/private identity
boundary and exact Dashboard source/first preview/count2 pass. MSW same case
fails at cursor2 (received1) after350000ms; generic Admin error state retained.
Do not mark full MSW or both-lane lifecycle covered. Post531 integration still
red on different Dashboard chronology fixture, server1289pass/1fail. Native
demo restored. See TIP-V2-532-progress.md; no overall P5 coverage certificate.

### P5 TIP-534 Dashboard response chronology
S/dashboard/bot-thread-storage.int.spec.ts UAT-15 preserves original union
count3, exact earliest-human preview and hidden/deleted exclusions with explicit
source-derived response timestamps. New REQ-411 opposite-order control requires
the earlier persona preview/count2. Final scoped5/5, original/intermediate
failures retained. Wide-row latest50 fixture remains ahead of prior actual HTTP
roots without changing any plan/count/body assertion. Full integration pending;
not a substitute for missing UAT/AT/LK or the red MSW automatic lifecycle.

### P5 TIP-536 Dashboard suite clock/isolation
Original latest50 and first-script-card identities failed in post534 full:
server1289pass/2fail, DB23/23. S/dashboard/thread-clock.int.spec.ts adds4
calendar/rollover/nonmutation controls; shared injected clock now next-day
Vietnam noon, storage fixture closed per case. All original two-file Dashboard
assertions retained; expanded focused16/16. Fresh full regression still pending.

Post536 fresh forced full at7cd23214 now PASS: server1295/1295 in128files,
DB23/23 in5files, zero cached,12m34.057s. This verifies the actual queue deadline,
context and Dashboard regressions together; no aggregate UAT/AT/LK/parity or
MSW lifecycle completion is inferred.

### P5 TIP-535 generated-worker notification boundary
Shared src/mock-data/tests/worker-lifetime.spec.ts executes both generated
workers: before8failed/2RPC controls passed; patched template/CLI assets10/10.
Four lifecycle events settle without a reply; actual request RPC still waits
for the exact response. Uncached root units1280pass +2existing skips. Canonical
UAT-15 browser is still running; do not promote this source-level regression
to complete MSW or UAT/AT/LK acceptance.

Subsequent535 canonical browser cohort now10/10 PASS (11.2min): UAT-15 full
auto3turn10.2min and UAT-14 member reply38.6s, same original assertions. Together
with native530/532 these two scenarios pass both lanes. Full224 regression,
remaining acceptance rows, audit and parity remain separate pending gates.

### P5 TIP-537 explicit mobile UAT-31 (partial scope)
E/mobile-acceptance.spec.ts adds two same-lane390px Portal Dashboard/community/
drawer and Admin Members card/bounds/selection/desktop-restoration scenarios.
MSW2/2; native pending live full runner/restoration. First1pass/1fail retained:
exact partial selected-label locator corrected to full count1 inside its region.
No overflow tolerance, style edit or weaker assertion. Registry226; live535
full invocations collected224 and exclude these2. Other mobile views/parity
remain separate, not inferred covered.

### P5 TIP-538 registration cross-app evidence — MSW red
E/registration-acceptance.spec.ts adds UAT-02/03 own OTP mail/short-code and
UAT-04/REQ-401 personal activation -> same Admin member/profile -> welcome log.
MSW0/2: OTP mail entry absent; activated member absent. Active/pending Me and
Portal navigation precede second failure; welcome check not reached. Native
pending live535 runner/restoration. Registry228, not the live224 collection.
No business-registration or complete LK-01 coverage inferred. See538 report.

### P5 TIP-539 registration profiles/mail and native receipts
Personal UAT-02/03/04 scenarios now pass identical recipient/kind/sent-state
checks both lanes: fresh MSW cohort24/24 (auth14, Marketing6, mobile2,
registration2), native new4/4 after retained original2pass/2fail mail polls.
The poll fix waits for query render after reload, exact counts1 unchanged and
same20second budget, no lane branch. Native demo required/demo/flush restored.
Shared registration8tests cover public metadata, no credentials, expiry/resend,
one activation, mail once, fresh snapshot restore and admission count stability.
Native contracts are pending30min, OTP10min, missing resend202, OTP_INVALID422;
legacy unit400 expectation corrected from native HTTP_STATUS, original red kept.
Root units1289pass +2existing skips,6tasks (5cached); other gates allgreen.
Original native full224/224 terminal0,38.8min, demo restored; excludes new4.
LK-01 remainsPARTIAL (business/Dashboard fields not inferred), UAT-31 remains
representative-screenPARTIAL. Full post539 regression/audit/parity pending.

### P5 TIP-541 business registration UAT-05 / LK-01
E/business-registration-acceptance.spec.ts validates tax autofill, secondary
industry removal in actual registration request, active/business/pending-fee
session, sameID Admin business/profile/tax/industry/verification, its own Admin
pending fee and sent OTP+welcome logs. Scoped1/1 PASS both lanes, no lane branch,
new unique recipient, native required/demo/flush restored. Registry229; live540
full MSW collected228 before this new case. UAT-05 nowPASS both, LK-01 remains
PARTIAL only for the independently unverified Admin overview destination.

### P5 TIP-542 fresh-member paywall and re-login — MSW red
E/new-member-paywall.spec.ts adds2 unique registrations with submitted phones/
passwords, welcome preview, actual fee popup/reminders/navigation/ref/phone,
logout all dialogs then sameID re-login. Native2/2 PASS23.5s, demo restored.
MSW0/2: session OPCHUB NEW and re-login401. First native0/2 welcome-load race
retained; explicit own welcome preview/close strengthens same-lane precondition.
No lane assertions weakened. Root1289pass +2existing skips cached, other gates
green. P5-MSW-NEW-MEMBER-01 open/refine543. Registry231; live540 collected228.

### P5 TIP-543 new-member mock identity/auth correction
Padded real member code/retained phone/current profile+fee session replaces
OPCHUB NEW. Portal-private salted PBKDF2 verifiers survive F5, only valid OTP
promotes pending credential; snapshots stay credential-free. Shared2 +Portal6
new controls, root1297pass +2existing skips (543b4cached;543c6cached tasks).
Fresh MSW34/34 PASS2.1min; stronger other-menu/F5 two cases thenPASS both lanes
(MSW29.4s/native1.0min, demo restored). Original542red and543compile/import
failures retained. 540 full228/228 PASS24.4min on539 builds, not post543231.
UAT-06/07/08/30 and AT-LK01 now scopedPASS both lanes; remaining acceptance,
full current regression, audit/parity and final dev/owner-review PR still open.

### P5 TIP544 accountant collection linkage
AT-LK02/UAT-10/REQ-402: new shared-lane accountant-fee-link case proves same
fresh member, actual paidAt, calendar12month expiry, live Portal closure before
reload and persisted membership. Native3/3 PASS41.1s including2 helper
regressions; MSW2pass/1fail17.5s at fixed paidAt (later checks not reached).
Registry232; no full232 claim. Native required/demo/flush0 restored=true.
P5-MSW-FEE-CLOCK-01 open; corrective TIP545. Evidence v2-544.

### P5 TIP545 clock/calendar checkpoint (not final acceptance)
REQ-402/AT-LK02/UAT-10: shared4 and HTTP1 new regressions pass. Native same3
PASS42.5s/demo restored. Fresh545 MSW2pass/1fail53.8s now reaches live gate
closure failure after passing actual paidAt/calendar12months/Admin status.
Two old365day assertions corrected to exact future calendar-year dates per
native BR-05; original root failures retained. TIP545 live propagation pending.

### P5 TIP545c live membership propagation
AT-LK02/UAT-10/REQ-402 scoped MSW3/3 PASS on fresh545c builds, unchanged
assertions; native5453/3 PASS42.5s restored. Shared10 hint-boundary and Portal3
subscription tests added, root1315pass+2skips/all gates0. Same-user relay event
causes authenticated membership read, not trusted session payload or polling.
Full232/fresh native/audit/parity still pending. Evidence v2-545c.

### P5 TIP546 bank-fee linkage
UAT09/AT-NR01/LK02/REQ402 fresh member same-assertion bank flow: MSW1/1PASS,
native twiceFAIL Community after successful activation, cached /groups402 not
retried. Admin fee assertions unreached native. Refine547; registry233. Root
1315pass+2skips/all gates0; demo restored both native runs. Expanded545d MSW
34/35 with UAT11 pending-login timeout retained separately. Evidence v2-546.

### Branded HTML mail (2026-10-22)

REQ-005/006/082/123/204/205/222/227/322, TD-035, D-47: shared branded layout,
escaping, configured links, OTP/expiry, fee notices and campaign unsubscribe preservation.
20 new renderer unit cases; focused unit 26/26; mail/password/marketing integration 43/43;
root 1496 passed + 2 skipped, lint/typecheck/depcheck pass. Browser layout checks 8/8
(360px/800px). MSW reset E2E 0/2 (UAT-11 login selector timeout; D-62 missing confirmation),
native E2E and real mailbox-client verification remain open. No full E2E acceptance claim.
See `coding-packs/reports/branded-html-emails-completion.md` and its linked evidence.
## TIP-V46-805 — REQ-620 / REQ-204 trace (05/11/2026)

BR-471–474 / TC-471–472: `renewal-milestone.spec.ts`, `api-domains/renewal.spec.ts`,
`mock-data/domains/renewal.spec.ts`, `templates-renewal.spec.ts`, `renewal-tab.spec.tsx`,
`membership-fee/{renewal-admin,renewal-scheduler,renewal-plan}.int.spec.ts`,
`e2e/behavior/admin-renewal.spec.ts`. Existing fee/trial tests follow the approved new mốc;
old manual fee behavior stays asserted. Final gate counts and native/MSW evidence:
`coding-packs/reports/TIP-V46-805-completion.md` (status there is authoritative; no inferred full PASS).

## TIP-V46-811 additive traceability

REQ-628: shared ai-providers/mask-pii specs, adapter local.spec, settings ai-settings/ai-router/ai-migration/ai-plans integration, retained llm-config/runtime and bot-bulk-worker checks, housekeeping aiCalls, Admin ai-tab/MSW tests and identical ai-providers E2E. Full/native gates tracked in TIP-V46-811-completion.md until finalization.
REQ-629: app-notify shared/API/UI specs and identical app-notify E2E, permission/input/413/audit and acting-Admin notification tests. D125 configuration only, no Web Push delivery claimed.

## TIP-V46-822 — REQ-322/323/351, RB-R02/RB-R03, NA-26

Self Admin profile and SEC-R01 in-session password: shared `api/admin-auth.spec.ts`;
Admin `features/profile/admin-profile.spec.tsx` and `mocks/admin-profile-handlers.spec.ts`;
native `test/admin-account/admin-profile.int.spec.ts` plus retained admin-auth/security suites;
identical MSW/native `e2e/behavior/admin-profile.spec.ts`. Includes account/realm/restricted
session negatives, validation/413/429, immutable identity/role, real storage ownership and GC,
Argon2/version/refresh revocation/new current session, transactional audit/outbox and idempotent
monotonic Redis replay. Actual gate counts and verification status are authoritative in
`coding-packs/reports/TIP-V46-822-completion.md`; no unrelated historical gap is closed here.

## TIP-V46-824 - D-141 foundation checkpoint (2026-11-11)

PARTIAL, not feature acceptance: Admin i18n locales/loader/format/message-contract specs and shared UiProvider/date-picker specs verify the source split, locale allowlist/aliases, raw ICU contract negative fixtures, fallback/isolation and opt-in control compatibility. Source9e207741; full root2360 pass +2 existing skips, focused48. Raw catalog readiness FAIL22/250; nine target catalogs, full runtime/UI integration, identical MSW/native assertions, font/layout/performance evidence remain open. See reports/TIP-V46-824-completion.md for per-AC status; no unrelated historical gap is closed.

TIP824 presentation checkpoint55116347: request.spec (raw en/en-SG auth/profile/meta, unsafe-cookie fallback), all10 AntD locale serialization/imports and strict fil/lo dictionary coverage, persistent control-provider draft, safe client ICU-error fallback, UI label props, canonical permission/menu/region/bot/rejection labels and chart-label adapter. All original scope still open until complete raw catalogs, browser/native/viewport/font/performance evidence; latest report supersedes foundation-only progress. Unit2393 +2 existing skips; production login SSR4/4 is not browser/native acceptance.

TIP824 English/content checkpoint ec97a874 (2026-11-11): fixed explicit25-file `i18n/tests/english-catalog.spec.ts` validates all2608 English leaves before fallback (AC824-02). `events/content-defaults.spec.ts` preserves canonical default/authored payload content (AC824-11); `groups/export-content.spec.ts` checks Vietnamese headers/cells/raw names and exact CSV/Excel contract; `marketing/components/welcome-preview.spec.tsx` verifies actual email text remains Vietnamese under an English provider (AC824-12). Focused33 pass; root2426 pass +2 pre-existing skips, Admin715 fresh. Both current Admin build modes pass, but no current browser/native API acceptance. Other8 bundles and remaining AC evidence stay open; no unrelated historical gap is closed.

TIP824 AI/local-validation checkpoint9e962712: AI-call live filter/column and moderation label/value tests (AC824-06/08/11); structured issue mapping and Profile password error-switch/draft/no-request test plus raw API text negative (AC824-10/12); Settings email-preview boundary (AC824-12). Source additions52, vi/en2660 leaves; original2456 legacy and524 settings leaves hash-protected (AC824-03). Root2444 pass +2 existing skips, Admin733 fresh; both builds pass. Remaining8 catalogs, other UI/validation/formatter call sites and full browser/native/font/performance acceptance stay open. No historical unrelated gap is closed.
