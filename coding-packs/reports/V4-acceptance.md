# V4 — Nghiệm thu §27 trên server dev (TIP-V4-616, D-86)

- Ngày đo: 26/10/2026.
- Nhánh `feature/TIP-V4-616-acceptance-27`.
  - API dùng bản sửa đăng ký `17d6173c`.
  - Test dùng bản sửa kịch bản `8aa8d8d8`.
- Server dev chạy trên máy dev, không phải VPS:
  - API NestJS: api :4000 · socket :4001 · worker;
  - DB `opchub_dev`, Redis db 1, storage local;
  - ngân hàng giả (D-81), stub DLPL :4810 (D-65), FakeMail ghi đĩa.
- Portal :3200 / Admin :3201 build `NEXT_PUBLIC_API_MOCKING=off` vào `.next-server`, không bật `SHOW_DEMO_ACCOUNTS`.
- Lệnh chạy:
  - `FAKE_MAIL_DIR=… E2E_TARGET=server npx playwright test -c playwright.server.config.ts --project behavior`;
  - globalSetup chạy `seed:demo` + `flush:dev-cache`;
  - fixture `demoReset` seed lại trước mỗi test;
  - 1 worker, không retries.

## Kết quả (số thật)

| Lần | Phạm vi | Passed | Failed | Skipped | Thời gian |
|---|---|---|---|---|---|
| 1 | toàn bộ `--project behavior` (309 test, 75 file) | 291 | 9 | 9 | 53,8 phút |
| 2 | chạy lại 8 file chứa 9 test lỗi (37 test), sau khi sửa | **37** | **0** | 0 | 3,9 phút |

Kết luận: mọi test lần 1 đều pass sau lần 2. Không test nào còn lỗi trên server dev.

### 9 lỗi ở lần 1, nguyên nhân và cách sửa

| # | Test | Nguyên nhân | Sửa |
|---|---|---|---|
| 1 | `a-01-login` V2Q-163 | `.next-server` build theo README cũ có cờ `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=on` → hiện hộp "Tài khoản dùng thử" | README bỏ cờ (`f5cc81ff`), build lại |
| 2 | `accountant-fee-link` AT-LK02 | **Lỗi code**: đăng ký không lưu nhóm đã chọn (`opcIntent`) → popup khai báo không điền sẵn OPC, kẹt | `17d6173c`: lưu `opcIntent` lúc kích hoạt; int `register` kiểm `/me/declaration` trả đúng `persona` + `groupIds` |
| 3 | `affiliate-agent-creation` AT-AF01 | như #2 | như #2 |
| 4 | `admin-events` check-in | Server dùng giờ thật (26/10), sự kiện e1 của seed (`MOCK_NOW` 16/10) đã kết thúc → bỏ check-in = 409, đúng luật BUG-041 | `8aa8d8d8`: nhánh server kiểm toast "Sự kiện đã kết thúc, không thể bỏ check-in" + giữ 1/7. MSW giữ nguyên 0/7. Int `admin-events` BUG-041 phủ cả hai cạnh |
| 5 | `affiliate-dialogs-responsive` 360px | API khởi động lại (19:37, nạp bản sửa #2) giữa test → phiên mất, về màn đăng nhập | không sửa; lần 2 pass |
| 6 | `declaration` UP-02 | Kịch bản MSW mở Cộng đồng khi chưa đóng phí. Server trả 402 `MEMBERSHIP_REQUIRED` (int `groups` kiểm) | `8aa8d8d8`: trên server đóng phí qua ngân hàng giả (`payFee`) trước, assertion giữ nguyên |
| 7 | `portal-shell` NA-24 | Bot tự động (persona Lê Thu Hằng) gửi tin vào OPC Đà Nẵng đúng lúc test đếm → 3 thay vì 2 mục | `8aa8d8d8`: test dùng fixture có sẵn `botManual` (tắt bot tự động), giữ `before + 2` |
| 8–9 | `unsubscribe` BUG-036 (2) | Thiếu `UNSUBSCRIBE_SECRET` trong env Playwright (token ký HMAC cùng secret với API) | Nạp từ `apps/server/.env` lúc chạy, không in / commit. README ghi lệnh (`8aa8d8d8`) |

Không dùng retries / fixme. Không nới assertion hay timeout.

### 9 skip ở lần 1 (có bằng chứng thay thế)

| Spec | Số | Lý do (ghi trong spec) | Bằng chứng thay thế |
|---|---|---|---|
| `moderation` | 2 | kho mock MSW | int `moderation/violations` (5) + `moderation` (6) trên Postgres thật |
| `reports` | 5 | số liệu mock MSW | int `reporting/report-export` (6) + unit `templates.spec` so byte CSV mẫu |
| `onboarding` UP-04 Portal | 1 | tiến độ M1 phụ thuộc seed demo | int `onboarding` (5); spec AD-02 (Admin) pass trên server |
| `tax-lookup-dlpl` @live | 1 | cần key DLPL thật (không dùng, D-65) | 3 test DLPL qua stub pass trên server |

## Ma trận §27 → test

Cột "server dev" ghi số test pass sau lần 2. Với file lỗi ở lần 1, đó là số của lần 2.

| Mã §27 | Nội dung | Test hành vi (`e2e/behavior`, pass trên server dev) | Bằng chứng khác |
|---|---|---|---|
| UP-01 | Đăng ký Cá nhân / DN, MST tự điền, xác nhận đại diện, chặn mã giới thiệu của chính mình | `registration-acceptance` 2 · `business-registration-acceptance` 1 · `tax-lookup-dlpl` 3 · `affiliate-portal` 4 (AT-AF03) · `popup-v4` 4 | int `account/register` |
| UP-02 | Đăng nhập, hiện / ẩn mật khẩu, ghi nhớ, SSO, quên mật khẩu; khai báo sau đăng nhập → Bảng giá | `a-01-login` 8 · `auth-flows` 14 · `declaration` 4 | int `account/declaration` |
| UP-03 | Thanh toán phí chuyển khoản, đối soát tự động → kích hoạt, gian hàng (DN), mã Affiliate, email | `bank-fee-link` 1 · `membership` 4 · `accountant-fee-link` 1 · `affiliate-agent-creation` 1 | int `membership-fee` |
| UP-04 | Hướng dẫn bắt đầu 8 bước, khoá khi chưa đóng phí, đồng bộ Admin | `onboarding` 1 (AD-02) · `new-member-paywall` 2 | int `onboarding` 5 (skip Portal ghi trên) |
| UP-05 | Cộng đồng theo tỉnh, đã đóng phí vào nhóm ngay | `community` 7 | int `community/groups` (D-71, 402 khi chưa đóng phí) |
| UP-06 | Chat nhóm: tin / ảnh / tệp, trả lời, cảm xúc, @nhắc, ghim, tìm, báo cáo tin | `chat` 13 | int `chat`, `moderation` |
| UP-07 | Sự kiện online / offline, Meet / bản đồ, đăng ký | `events` 6 | int `event` |
| UP-08 | Gian hàng địa phương: khám phá, chi tiết, liên hệ | `stores` 2 | int `local-business` |
| UP-09 | Nhu cầu địa phương: đăng, hiện ngay, gợi ý gian hàng | `needs` 3 | int `local-business` |
| UP-10 | Dự án OPC: khám phá / của tôi, form đăng, Admin duyệt | `projects` 15 | int `project` |
| UP-11 | Gói Gọi vốn 15.000.000đ, nhà đầu tư quan tâm | `fundraising` 2 · `projects` (quan tâm đầu tư) | int `project` (fundraising) |
| UP-12 | Bảng giá 3 gói + Hỗ trợ phát triển DN + form tư vấn | `services` 6 · `popup-v4` 4 · `assistant` 2 | int `service` |
| UP-13 | Mạng lưới Affiliate: mã / link, khách, lịch sử, STK | `affiliate-portal` 4 · `affiliate-screen` 5 · `affiliate-cross-app` 1 · `affiliate-paused` 2 · `affiliate-renewal` 1 | int `affiliate` |
| UP-14 | Hồ sơ cá nhân: thông tin, ảnh, mật khẩu | `profile` 6 | int `account` |
| AD-01 | Tổng quan: chỉ số lấy từ module | `realtime-metrics` 3 · `admin-shell` 2 | int `dashboard`, `reporting/overview` |
| AD-02 | Thành viên: bảng / thẻ, lọc, Khởi đầu + Nhắc, gán nhóm, xuất | `admin-members` 10 · `onboarding` (AD-02) | int `admin-account`, `onboarding` |
| AD-03 | Phí thành viên: danh sách, đối soát, khớp tay | `admin-fees` 6 · `accountant-fee-link` 1 | int `membership-fee` |
| AD-04 | Nhóm cộng đồng: tạo nhóm, phòng, xuất thành viên | `admin-groups` 8 | int `community` |
| AD-05 | Sự kiện: tạo online / offline, lưới / danh sách | `admin-events` 8 | int `event/admin-events` |
| AD-06 | Dự án OPC: duyệt / sửa / từ chối / ẩn, Gói Gọi vốn | `admin-projects` 6 · `fundraising` 2 | int `project` |
| AD-07 | Gian hàng & Nhu cầu: ẩn khi vi phạm | `stores` (AD-07) · `needs` (AD-07) | int `local-business` |
| AD-08 | Kiểm duyệt tin (tab trong Nhóm cộng đồng), khoá N ngày | `admin-groups` (kiểm duyệt, V4-612) | int `moderation/violations` 5 + `moderation` 6 (spec `moderation` skip ở server) |
| AD-08b | Nhà đầu tư | `admin-investors` 4 | int `investor` |
| AD-09 | Dịch vụ: yêu cầu tư vấn, ghi chú nội bộ, danh mục | `admin-requests` 4 · `services` 6 | int `service` |
| AD-10 | Mạng lưới Affiliate: đại lý, hoa hồng, chi trả, chính sách | `admin-affiliate` 4 · `admin-affiliate-operations` 3 · `affiliate-payout` 2 · `affiliate-ui-debt-*` 13 · `affiliate-*-responsive` 11 | int `affiliate` |
| AD-11 | Bot tương tác: persona, kịch bản, tự động | `admin-bots` 4 · `bot-auto` 1 · `bot-auto-lifecycle` 1 · `bot-emergency` 1 · `bot-replies` 1 · `bot-scheduling` 1 · `bot-ui-debt-emergency` 2 | int `bot` |
| AD-12 | Cài đặt hệ thống 7 mục | `admin-settings` 10 · `admin-rbac` 9 | int `settings` |
| F01 | Đăng ký → kích hoạt (không cần Admin duyệt, popup Bảng giá) | `registration-acceptance` · `business-registration-acceptance` · `new-member-paywall` · `bank-fee-link` · `declaration` | int `account/register` |
| F02 | Onboarding 8 bước ↔ Admin Nhắc | `onboarding` (AD-02) | int `onboarding` 5 |
| F03 | Nhóm & chat → kiểm duyệt → khoá → tự mở | `chat` 13 · `admin-groups` 8 | int `moderation/violations` (tự ẩn, khoá N ngày, khôi phục, tự mở) |
| F04 | Gian hàng ↔ Nhu cầu | `stores` 2 · `needs` 3 | int `local-business` |
| F05 | Dự án & Gọi vốn | `projects` 15 · `admin-projects` 6 · `fundraising` 2 | int `project` |
| F06 | Affiliate | `affiliate-lifecycle` 1 · `affiliate-payout` 2 · `affiliate-cross-app` 1 · `affiliate-agent-creation` 1 | int `affiliate` |
| F07 | Đăng ký tư vấn dịch vụ | `services` 6 · `admin-requests` 4 · `popup-v4` (AT-LK05) | int `service` |
| F08 | Sự kiện | `events` 6 · `admin-events` 8 | int `event` |
| F09 | Bot tương tác tự động | `bot-auto` · `bot-auto-lifecycle` · `bot-scheduling` · `bot-replies` | int `bot` |

Đủ 14 UP + 12 AD (+ AD-08b) + 9 F. Mỗi mã có ít nhất một test hành vi pass trên server dev. AD-08 / F03 phần khoá N ngày có thêm int trên Postgres thật.

## Ngoài phạm vi / còn lại

- `tax-lookup-dlpl @live` không chạy (cần key thật, D-65 + cấm ngân hàng / dịch vụ thật trong goal).
- Seed demo dùng ngày cố định `MOCK_NOW` (16/10/2026), còn server chạy giờ thật. Sự kiện trong seed sẽ "đã qua" khi ngày thật vượt mốc → Q-V4-616-1.
