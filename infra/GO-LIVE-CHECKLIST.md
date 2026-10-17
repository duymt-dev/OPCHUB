# OPCHUB — Checklist go-live (TIP-B67, chỉ chuẩn bị)

> Không deploy trong pha B6: cần VPS + secret thật (mức **L3**, chủ nhà quyết). File này là thứ tự việc cần làm và
> điều kiện nghiệm thu khi đã có Staging. Cách cài chi tiết: [`infra/README.md`](README.md).

## 1. Chủ nhà cấp (L3) — chặn go-live

| #     | Hạng mục                                                                                    | Dùng ở                               | Ghi chú                                  |
| ----- | ------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------- |
| L3-01 | VPS Ubuntu 24.04 (≥ 4 vCPU / 8 GB) + quyền sudo                                             | toàn bộ                              | ADR-0004: 1 VPS native, scale dọc 4→8→16 |
| L3-02 | Tên miền + DNS (Cloudflare): Portal, Admin, `s3.`                                           | nginx, CORS, cookie                  | Q-B64-3 (`s3.opchub.community`)          |
| L3-03 | TLS (certbot) + bật HSTS, dải IP Cloudflare `set_real_ip_from`                              | nginx                                |                                          |
| L3-04 | SePay: tài khoản, API token, secret webhook, đăng ký URL `/v1/webhooks/bank`                | `server.env` `BANK_PROVIDER=sepay`   | QĐ-01; TK Vietcombank 1203132809         |
| L3-05 | SSO (Google / Microsoft…) client ID + secret                                                | `SSO_PROVIDER`                       | OQ-04: hiện chỉ fake                     |
| L3-06 | Brevo SMTP: tài khoản, key, SPF/DKIM/DMARC cho tên miền gửi                                 | `SMTP_*` hoặc Admin › Cài đặt › SMTP | Rủi ro OTP vào spam (§16.4)              |
| L3-07 | Nguồn tra cứu MST (VietQR / Esgoo / chain) + khoá nếu có                                    | `TAX_LOOKUP_PROVIDER`                | Vấn đề mở §16                            |
| L3-08 | S3 offsite cho backup (rclone remote) + backup dữ liệu RustFS                               | `backup.env`, `rclone.conf`          | Q-B65-2/3/4                              |
| L3-09 | DSN Sentry (tuỳ chọn)                                                                       | `SENTRY_DSN`                         | Q-B65-1: SDK chưa tích hợp               |
| L3-10 | Webhook cảnh báo (Slack/Telegram) + giám sát uptime ngoài                                   | `health.env`                         | SLO §14.1                                |
| L3-11 | Mật khẩu Postgres (`opchub_migrator`, `opchub_app`), Redis `requirepass`, credential RustFS | `/etc/opchub/*.env`                  | Không bao giờ vào repo                   |
| L3-12 | Mật khẩu super admin đầu tiên (`SEED_SUPER_ADMIN_PASSWORD`)                                 | `pnpm --filter @opchub/db seed`      | Đổi ngay sau lần đăng nhập đầu           |
| L3-13 | Nội dung pháp lý: Điều khoản (công bố thành viên mô phỏng), miễn trừ gọi vốn                | Portal                               | Vấn đề mở §16                            |

## 2. Thứ tự dựng Staging → Production

1. Làm theo `infra/README.md` › **Lần đầu** bước 1 → 11 (OS, Postgres, PgBouncer, Redis, RustFS, env, mã nguồn, systemd,
   Nginx + TLS, journald, firewall).
2. `bash infra/scripts/check-syntax.sh` trên VPS — lần này có `nginx -t`, `systemd-analyze verify`, `shellcheck` thật.
3. `sudo /srv/opchub/repo/infra/deploy/deploy.sh <sha>` (migrate deploy → build → restart từng instance → health).
4. Seed bắt buộc: `pnpm --filter @opchub/db seed` (super admin, 34 nhóm tỉnh, danh mục, cài đặt). **Không** chạy `seed:demo`
   trên Production.
5. Staging: env giống Production nhưng `FEATURE_BOTS` / `FEATURE_SERVICES` theo phạm vi UAT GĐ3; có thể `seed:demo` để UAT.
6. Bật `opchub-backup.timer`, `opchub-health.timer`; chạy tay `pg-backup.sh` một lần + diễn tập khôi phục theo
   `infra/backup/restore.md` (RTO 4h, RPO 24h).
7. k6 trên Staging (`infra/k6/README.md`): 4 kịch bản §14.2, ghi số đo vào báo cáo nghiệm thu.
8. Production env bắt buộc: `NODE_ENV=production`, `OTP_FIXED_CODE=` trống, `STORAGE_PROVIDER=s3`, `MAIL_PROVIDER=smtp`,
   `BANK_PROVIDER=sepay`, `TRUST_PROXY=true`, `REFRESH_COOKIE_SECURE=true`, Portal/Admin `NEXT_PUBLIC_API_MOCKING=off`
   (server từ chối khởi động nếu `OTP_FIXED_CODE` có giá trị hoặc `STORAGE_PROVIDER=local`).
9. Cắt chuyển: DNS trỏ VPS → kiểm `GET /v1/health`, đăng nhập Admin, gửi 1 giao dịch SePay thử 600.000đ → đối soát.

## 3. Nghiệm thu UAT trên Staging (SRS §15) — tick khi đạt

| Mã     | Kịch bản                                    | Kết quả mong đợi                                          | Tự động hoá sẵn có                        | Đạt |
| ------ | ------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- | --- |
| UAT-01 | Đăng ký cá nhân thiếu vai trò               | Bị chặn, báo lỗi                                          | e2e `auth-flows`                          | ☐   |
| UAT-02 | Đăng ký cá nhân đủ thông tin                | Mở hộp OTP, gửi email                                     | e2e `auth-flows`                          | ☐   |
| UAT-03 | Nhập OTP thiếu số                           | Báo "Vui lòng nhập đủ 6 chữ số"                           | e2e `auth-flows`                          | ☐   |
| UAT-04 | Nhập OTP đúng                               | Vào Portal; TV xuất hiện ở Admin; email chào mừng ghi log | e2e + int `register`                      | ☐   |
| UAT-05 | Đăng ký DN bằng MST hợp lệ                  | Tự điền tên DN, ngành nghề; OTP → Hoạt động ngay          | e2e `auth-flows` (cần L3-07)              | ☐   |
| UAT-06 | Tài khoản mới vào Portal                    | Popup Gói dịch vụ tự hiện, không đóng được                | e2e `membership`                          | ☐   |
| UAT-07 | Bấm nền / đóng popup khi chưa thanh toán    | Popup giữ nguyên, hiện nhắc                               | e2e `membership`                          | ☐   |
| UAT-08 | Đăng ký ngay                                | Hộp chuyển khoản, nội dung `OPCHUB TVxxxxxx SĐT`          | e2e `membership`                          | ☐   |
| UAT-09 | Xác nhận đã chuyển khoản                    | Đối soát → phí Đang hiệu lực, popup đóng; Admin thấy      | int `membership-fee` + SePay thật (L3-04) | ☐   |
| UAT-10 | Admin Ghi nhận đã thu cho TV chờ            | Đang hiệu lực, hạn +12 tháng                              | e2e `admin-fees`                          | ☐   |
| UAT-11 | Đăng nhập / quên mật khẩu                   | Vào đúng khu vực; gửi liên kết đặt lại                    | e2e `a-01-login`, `auth-flows`            | ☐   |
| UAT-12 | Tham gia nhóm (đồng ý nội quy)              | Vào nhóm / Chờ duyệt; chủ nhóm duyệt → thông báo          | e2e `community`                           | ☐   |
| UAT-13 | Gửi tin trong chat                          | Tin hiển thị realtime                                     | e2e `chat` + int `socket`                 | ☐   |
| UAT-14 | TV thật nhắn trong nhóm                     | Persona trong giờ tự phản hồi                             | **chưa** (bot auto-reply: GĐ3)            | ☐   |
| UAT-15 | Bot tự động                                 | Tạo hội thoại theo lịch, đăng giãn cách; hiện ở Dashboard | e2e `admin-bots` (duyệt tay)              | ☐   |
| UAT-16 | Đăng ký sự kiện                             | Lưu đăng ký, gửi xác nhận                                 | e2e `events`                              | ☐   |
| UAT-17 | Đăng dự án mới                              | Trạng thái Chờ duyệt                                      | e2e `projects`                            | ☐   |
| UAT-18 | Admin duyệt dự án                           | Đang hiển thị ở Khám phá                                  | e2e `admin-projects`                      | ☐   |
| UAT-19 | Quan tâm đầu tư thiếu SĐT / đơn vị          | Bị chặn                                                   | e2e `projects`                            | ☐   |
| UAT-20 | Admin bình luận NĐT; NĐT trả lời trên dự án | Cùng một luồng 2 phía                                     | e2e `admin-investors`                     | ☐   |
| UAT-21 | Form tư vấn thiếu trường                    | Bị chặn                                                   | e2e `services`                            | ☐   |
| UAT-22 | Form tư vấn hợp lệ                          | Tạo YC-xxxx trạng thái Mới ở Admin                        | e2e `services`, `admin-requests`          | ☐   |
| UAT-23 | Chuyển trạng thái YC, bình luận gắn tên     | Tiến trình cập nhật; người được gắn nhận thông báo        | e2e `admin-requests`                      | ☐   |
| UAT-24 | Khóa thành viên                             | Đã khóa; không đăng nhập được                             | e2e `admin-members`                       | ☐   |
| UAT-25 | Gán 2 TV vào 1 nhóm                         | Cả 2 có nhóm mới, giữ nhóm cũ                             | e2e `admin-members`                       | ☐   |
| UAT-26 | Chọn tất cả trên bảng Thành viên            | Chỉ chọn dòng trang hiện tại                              | e2e `admin-members`                       | ☐   |
| UAT-27 | Phân trang danh sách Admin                  | Đúng số dòng/trang, tự lùi trang khi lọc                  | e2e admin-*                               | ☐   |
| UAT-28 | Cấu hình SMTP thiếu key                     | Kiểm tra kết nối báo lỗi                                  | e2e `admin-settings`                      | ☐   |
| UAT-29 | Sửa email chào mừng, thêm tài liệu          | Xem trước + email mới đúng                                | e2e `admin-settings`                      | ☐   |
| UAT-30 | Đăng xuất                                   | Về màn đăng nhập, đóng mọi popup                          | e2e `portal-shell`                        | ☐   |
| UAT-31 | Mobile 390px                                | Không tràn ngang; bảng Admin thành thẻ                    | parity (khung mobile) + kiểm tay          | ☐   |

**Tiêu chí go-live (§15):** 100% UAT đạt trên Staging; không lỗi Nghiêm trọng/Cao; đạt hiệu năng §14 (k6);
bàn giao mã nguồn, tài liệu, API (`coding-packs/plans/api-contract.md`), vận hành (`infra/README.md`), tài khoản quản trị.

## 4. Sau go-live 24h

- Theo dõi `monitoring/slo.md`: API p95 < 300ms, 5xx < 1%, đối soát < 15 phút, OTP mail < 60s.
- Kiểm backup đêm đầu đã lên offsite; `journalctl -u 'opchub-*' -p err` không lỗi lặp.
- Đổi mật khẩu super admin seed; rà `audit_logs` các thao tác Admin đầu tiên.
