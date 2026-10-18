# AUDIT-W1 — Câu hỏi còn mở (chờ PM / Chủ nhà)

> Gom ngày 18/10/2026 từ: `coding-packs/reports/ui-parity/questions.md` (Q-*), `coding-packs/01-REQUIREMENTS-MATRIX.md` (OQ-*), đặc tả `dacta.txt` §16 "Vấn đề mở" (VĐ-1 → VĐ-4), `infra/GO-LIVE-CHECKLIST.md` (L3-*), `TODO(OQ-06)` trong `packages/integrations`.
> Câu trùng đã gộp vào một dòng, cột ID liệt kê đủ các ID gốc. Câu nào đã có quyết định rõ (D-xx, "✅ Duyệt", "Đã chốt") thì nằm ở mục **Đã chốt** cuối file và không tính là đang mở.
> **L3** = cần Chủ nhà quyết hoặc cấp secret (tiền, pháp lý, kiến trúc, đổi hợp đồng). **Go-live** = "Chặn" nếu chưa trả lời thì không go-live được.

## Bảng đếm

| | Số |
|---|---|
| Câu hỏi đang mở (sau khi gộp) | **104** (12 câu SRS-3.6 mục N đã chốt 18/10/2026, xem Đã chốt) |
| Trong đó nhãn L3 | **25** |
| Trong đó chặn go-live | **26** |
| ID gốc được gộp vào 104 câu | ≈ 195 (gồm cả L3-*, VĐ-*, DV) |
| Đã chốt (không tính) | 13 dòng, ≈ 50 ID |

Theo domain:

| Domain | Mở | L3 | Chặn |
|---|---|---|---|
| A. Hạ tầng, vận hành, secret | 14 | 10 | 11 |
| B. Thanh toán, phí thành viên | 9 | 3 | 4 |
| C. Tài khoản, xác thực, bảo mật | 12 | 1 | 2 |
| D. Cộng đồng, nhóm, chat | 13 | 1 | 1 |
| E. Sự kiện | 4 | 0 | 0 |
| F. Dự án, nhà đầu tư | 10 | 2 | 2 |
| G. Dịch vụ tư vấn | 5 | 1 | 0 |
| H. Admin thành viên, quyền | 6 | 0 | 0 |
| I. Bot, persona | 4 | 1 | 0 |
| J. Marketing, mail | 7 | 1 | 1 |
| K. Cài đặt, ngôn ngữ | 3 | 0 | 0 |
| L. Pháp lý, nội dung | 4 | 4 | 4 |
| M. Hợp đồng API, seed, test | 13 | 1 | 1 |

---

## A. Hạ tầng, vận hành, secret

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| OQ-01, L3-01 | VPS nào (CPU/RAM, nhà cung cấp, đặt tại VN)? | Đề xuất Ubuntu 24.04, 4 vCPU/8 GB tại VN; chưa có máy | L3 | **Chặn**: chưa có nơi chạy |
| L3-02, Q-B64-3 | Tên miền + DNS Cloudflare cho Portal, Admin, `s3.` | Giả định `opchub.community`, `admin.`, `s3.` trong nginx/env | L3 | **Chặn**: CORS, cookie, presigned URL phụ thuộc |
| L3-03 | Bật TLS (certbot), HSTS, dải IP Cloudflare `set_real_ip_from` | Dòng cấu hình đang comment (`infra/nginx/opchub.conf`) | L3 | **Chặn**: không TLS; rate limit/khoá IP sai sau Cloudflare |
| L3-11 | Mật khẩu Postgres (`opchub_migrator`, `opchub_app`), Redis `requirepass`, credential RustFS | `CHANGE_ME` / trống trong `infra/env/*.example` | L3 | **Chặn** |
| L3-12 | Mật khẩu super admin đầu tiên `SEED_SUPER_ADMIN_PASSWORD` | Chưa có; đổi ngay sau lần đăng nhập đầu | L3 | **Chặn** |
| L3-08, Q-B65-2, Q-B65-3, Q-B65-4 | S3 offsite cho backup (rclone), giữ 14 bản local / 30 ngày offsite, lịch `pg_basebackup` cho PITR | Local 14 bản; `BACKUP_REMOTE` trống thì exit 1; PITR chưa lập lịch | L3 | **Chặn**: §14 RPO 24h chưa đảm bảo, chưa diễn tập khôi phục |
| L3-09, Q-B65-1 | DSN Sentry (tuỳ chọn) | Giữ chỗ `SENTRY_DSN=`; SDK chưa tích hợp | L3 | Không: tuỳ chọn |
| L3-10 | Webhook cảnh báo (Slack/Telegram) + giám sát uptime ngoài | `ALERT_WEBHOOK_URL` trống | L3 | **Chặn**: SLO §14.1 cần cảnh báo |
| B67 (B6-completion) | Ai deploy staging và chạy UAT 31 kịch bản? Lịch nào? | Chưa có staging; chỉ có checklist | L3 | **Chặn**: tiêu chí §15 = 100% UAT trên staging |
| B6-completion, Q-B66-2 | k6 qua nginx + PgBouncer trên VPS thật; tải chat §14.2 chia 10 phòng có được chấp nhận? | Đo trên máy dev Windows; 5.000 kết nối chia 10 phòng `general` | — | **Chặn**: §15 cần đạt hiệu năng §14 trên staging |
| B6-completion | Chạy `nginx -t`, `systemd-analyze verify`, `shellcheck` trên VPS | Máy dev chưa có công cụ | — | **Chặn**: cấu hình chưa từng được kiểm |
| OQ-16 (phần nhân sự) | Nhân sự trực sự cố + kế toán đối chiếu | Để sau | L3 | **Chặn**: rủi ro §16.4 cần kế toán bấm "Ghi nhận đã thu" |
| Q-B64-1 | `/socket.io` giữ `ip_hash` dù websocket-only | Giữ `ip_hash` | — | Không |
| Q-B64-2, Q-B64-4, Q-B64-6, Q-B64-7 | `NEXT_PUBLIC_*` nhúng lúc build; `DIRECT_URL` chỉ dùng ở deploy; rollback không hoàn tác migration; socket không có `/health` | Như mô tả trong `infra/README.md`; health socket qua handshake polling | — | Không |

## B. Thanh toán, phí thành viên

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| OQ-06, L3-04, TODO(OQ-06) `sepay.provider.ts:41` | Tài khoản SePay, API token, secret webhook; header chữ ký và endpoint API thật | Adapter chung, header giả định `x-sepay-signature`, `BANK_PROVIDER=fake` | L3 | **Chặn**: không có đối soát tự động (UAT-09) |
| OQ-06 (phần nghiệp vụ) | Gói tháng/năm, hoá đơn, hoàn tiền, miễn phí | Chỉ gói năm 600.000đ; không hoá đơn/hoàn tiền | L3 | **Chặn**: thu tiền thật cần chính sách hoàn tiền và hoá đơn |
| Q-B14-1 | Đối soát thiếu tiền, nhiều Mã TV, Mã không tồn tại, NĐT chuyển khoản | `unmatched` + lý do; thừa tiền vẫn kích hoạt 1 kỳ | L3 | **Chặn**: quy tắc tiền cần Chủ nhà duyệt |
| Q-B15-2 | Màn Admin cho hàng đợi giao dịch không khớp + khớp tay | Có API, chưa có màn | — | **Chặn**: kế toán không xử lý được CK sai |
| Q-G4b-2, Q-B15-1 | "Ghi nhận đã thu" có cần chứng từ, xác nhận, ô lý do? | Một bấm, lý do mặc định "Admin ghi nhận đã thu", audit | — | Không |
| Q-G4b-3, Q-B62-16 | "Gửi nhắc hàng loạt" nhắc ai; có bỏ TK bị khoá? | Chờ thanh toán + sắp hết hạn + hết hạn; server bỏ TK khoá | — | Không |
| Q-B14-2 | `transfer-confirm` không ghi DB, chỉ trả trạng thái | Idempotent 24h, chờ webhook | — | Không |
| Q-G3a-3 | Ô "Thách thức lớn nhất…" trên popup Gói dịch vụ không gửi đi | Giữ trong bộ nhớ, không gửi | — | Không |
| Q-G3a-5 | Mã lỗi khi gọi API nghiệp vụ lúc chưa đóng phí (402 hay 403) | Server trả `MEMBERSHIP_REQUIRED`; popup che mọi route | — | Không |

## C. Tài khoản, xác thực, bảo mật

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| OQ-04, L3-05, Q-B11-4, Q-B13-2 | Client ID/secret SSO Google/Microsoft/…; liên kết SSO thật | `FakeSsoProvider`; nút ẩn khi chưa cấu hình | L3 | Không: ẩn nút được |
| Q-B12-2 | Trang Portal `/reset-password?token=` | API có; trang FE chưa có | — | **Chặn**: quên mật khẩu không hoàn tất (UAT-11) |
| Q-B12-1 | Màn TOTP admin (nhập mã, bật TOTP) | Chỉ bắt khi TK đã có secret; chưa có endpoint bật, chưa có màn | — | **Chặn** nếu giữ D-27 bắt buộc 2FA admin |
| Q-B11-1, Q-25 | Đăng ký cho bỏ trống mật khẩu/SĐT? Kiểm mật khẩu ở client? | Bỏ trống được; đặt sau qua Quên mật khẩu; không kiểm ở client | — | Không (nhưng phụ thuộc Q-B12-2) |
| Q-B11-2, Q-B62-1 | `OTP_FIXED_CODE`, `RATE_LIMIT_DISABLED` chỉ dev/test | Env schema từ chối ở production | — | Không |
| Q-B15-3 | TK bị khoá gọi API trả 403 hay 401? | 403 "Tài khoản đã bị khóa" | — | Không |
| Q-G3c-2 | Đổi email (tên đăng nhập) có cần OTP email mới? | Lưu thẳng, chỉ kiểm định dạng | — | Không |
| Q-G3c-3 | Chặn huỷ liên kết SSO cuối khi TK chưa có mật khẩu? | Không chặn (server cũng không chặn) | — | Không |
| Q-G3c-4 | "Đăng xuất tất cả thiết bị" hiển thị số phiên | Số phiên server trả | — | Không |
| OQ-12 | Một MST cho nhiều người đăng ký? | Đề xuất cho phép, người đăng ký đầu là đại diện | — | Không |
| Q-22 | Hộp TK dùng thử: biến trống thì theo chế độ API | MSW hiện, API thật ẩn | — | Không |
| Q-23 | Admin bấm "Đăng ký"/SSO trên màn login admin | Toast hướng dẫn | — | Không |

## D. Cộng đồng, nhóm, chat

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| OQ-13 | Ai là chủ 34 nhóm lúc ra mắt? | Nhóm chưa có chủ thì Admin duyệt thay | L3 | **Chặn**: cần danh sách chủ nhóm để vận hành |
| Q-G2c-1 | Đính kèm file/ảnh chat: loại, dung lượng, quét virus? | Gửi tệp mẫu `DEMO_FILE`/`DEMO_IMAGE` | — | Không (nhưng nút gửi tệp đang gửi tệp giả) |
| Q-G2c-3 | Chủ nhóm/ĐPV xoá được chủ đề của người khác? | Chỉ người tạo | — | Không |
| Q-G2c-4, Q-B23-4 | Danh sách thành viên phòng: phân trang? | 50 người đầu + `total` | — | Không |
| Q-G2b-1 | `GET /groups` cần filter/sort/counts khi số nhóm tăng? | Tải `size=100`, lọc ở client | — | Không |
| Q-G2b-2 | Rời nhóm / huỷ yêu cầu có hỏi lại? | Không hỏi lại | — | Không |
| Q-G2a-2 | Badge "Chat nhóm" sidebar Portal | Số cứng 18 | — | Không |
| Q-G2a-3, Q-B34-1 | Dashboard LIVE: giữ khối Quốc gia ASEAN? Dữ liệu hoạt động/phiên/thảo luận mô phỏng trên server thật? | Số tổng thật + phần còn lại mô phỏng | — | Không (nhưng hiển thị hoạt động giả, liên quan VĐ-3) |
| Q-B20-1 | Chủ nhóm rời nhóm | 409, Admin đổi chủ nhóm trước | — | Không |
| Q-B20-2 | Sửa nhóm: chỉ thêm phòng, không xoá phòng có tin | Như mô tả | — | Không |
| Q-B20-5 | Lọc `region=Khác` | Trả rỗng | — | Không |
| Q-B23-1, Q-B23-2, Q-B23-3 | DTO admin/portal theo quyền; `message.new` trung lập; gửi tin = đã đọc | Như mô tả | — | Không |
| Q-B24-1, Q-B24-2, Q-B24-3, Q-G4c-3 | Lý do báo cáo tự động theo từ khoá; gom nhiều người báo thành 1 ca; nội dung cảnh báo; "Khóa" từ kiểm duyệt có cần xác nhận | Như mô tả; "Khóa" làm ngay, không hỏi | — | Không |

## E. Sự kiện

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| Q-G3a-1 | `GET /events` cần `mine`, `q` khi nhiều sự kiện? | Tải 1 trang, lọc ở client | — | Không |
| Q-G5a-3 | Xoá/huỷ sự kiện đã có người đăng ký: báo ai, hoàn chỗ ra sao? | Không có UI xoá/huỷ | — | Không |
| Q-G5a-4 | Drawer người đăng ký: cần tìm/phân trang? | API trả đủ, phân trang | — | Không |
| Q-B31-1 | `e.reg` đọc lịch + đăng ký; `e.edit` tạo/sửa/xoá | Như mô tả | — | Không |

## F. Dự án, nhà đầu tư

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| Q-B63-5, DV-B63-1 | Hiện email/SĐT/địa chỉ thật của chủ dự án cho mọi người xem dự án? | Server trả liên hệ thật | L3 | **Chặn**: dữ liệu cá nhân (NĐ 13) cần Chủ nhà quyết |
| Q-B33-2 | `totalAmount` cộng lẫn VND và USD | Cộng số nguyên theo đơn vị gốc | L3 | **Chặn** nếu cho gọi vốn USD (số tiền hiển thị sai) |
| Q-G3b-3 | "Nhắn tin" với chủ dự án: chat 1-1 hay nhóm? | Chỉ toast | — | Không |
| Q-G3b-4 | Dự án Riêng tư: ai thấy? Thành viên đội ngũ nhập tên tự do | Chủ + đội ngũ (theo userId) + thành viên nhóm được chia sẻ | — | Không |
| Q-G3b-5 | Quan tâm đầu tư mấy lần/người/dự án? | 1 lần; chủ dự án không tự quan tâm | — | Không |
| Q-G3b-7, Q-B32-3 | Sửa dự án đang hiển thị: ẩn chờ duyệt hay giữ bản cũ? (D-18/REQ-106 vs prototype) | Ẩn, về `pending_review` | — | Không |
| Q-G5b-2 | Dự án Bị từ chối có "Xuất bản lại"? | Không (theo SRS §8) | — | Không |
| Q-G5b-4 | Nổi bật tuần: Admin chọn hay Portal tự chọn? | Lưu server qua `PUT /admin/projects/featured` | — | Không |
| Q-B32-1, Q-B32-2 | Điểm nổi bật/thư viện ảnh/cập nhật chưa có nguồn; ảnh bìa mặc định | Nội dung cố định như prototype; 1 ảnh Unsplash | — | Không |
| Q-B32-4, Q-G5c-3 | Chia sẻ > 10 nhóm chạm rate limit; trạng thái kết nối NĐT cho lùi bước | Chấp nhận; chọn tự do có audit | — | Không |

## G. Dịch vụ tư vấn

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| VĐ-2 (§16) | Danh mục dịch vụ tư vấn và quyền lợi chính thức | Seed từ prototype; Dịch vụ sau feature flag (D-05) | L3 | Không: tắt bằng `FEATURE_SERVICES` |
| Q-G5c-4 | Máy trạng thái phiếu YC: SRS §8 hay prototype? (D-21 ghi "theo SRS") | Theo prototype (thêm won → done) | — | Không |
| Q-G5c-5, Q-G5c-7 | Ghi chú nội bộ không dựng; route `/requests` vs `/service-requests` | Không dựng; theo nav | — | Không |
| Q-G5c-6, Q-B46-1 | Nhân sự phụ trách lấy từ đâu | TK quản trị có `n.edit` | — | Không |
| Q-G3a-2, Q-G3a-4, Q-B46-2 | Form tư vấn điền sẵn từ `/me`; `details` mở rộng; gửi phiếu không cần phí | Như mô tả | — | Không |

## H. Admin thành viên, quyền

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| Q-G4a-2 | Đổi quyền inline trong bảng (screens.md) hay chỉ hiển thị (D-42)? | Giữ select, cần `s.role` + xác nhận + audit | — | Không |
| Q-G4a-3 | Ô vai trò "Thành viên/Điều phối viên" khi gán nhóm không có trong schema | FE gửi, server bỏ qua | — | Không |
| Q-G4a-5 | Nhãn "Đã từ chối xác minh" trên bảng | Chưa có nhãn riêng | — | Không |
| Q-G4a-6, Q-G4c-4, Q-B43-1 | Kênh nhận file xuất CSV (job) | Chỉ toast; FE chưa gọi `GET /admin/exports/:id` | — | Không |
| Q-B15-4, Q-B20-3 | Quyền màn Phí (`m.view`/`m.edit`), màn Nhóm (`m.view`/`c.create`) | Như mô tả | — | Không |
| Q-B20-4 | Nhóm tạo từ Admin: người tạo làm chủ nhóm | Như mô tả | — | Không |

## I. Bot, persona

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| OQ-05 | Claude API key + ngân sách bot | Để sau (bot sau go-live, D-04) | L3 | Không: bot sau feature flag |
| Q-B45-1 | N tin persona/phút/nhóm (S-11) | 30 tin/phút/nhóm | — | Không |
| Q-G4d-4 | Xoá persona đang dùng trong kịch bản: chặn 409 hay tắt? | Giữ lượt, hiện "?" | — | Không |
| Q-G4d-5, Q-B45-2, Q-B45-3 | Lưu chủ đề khi rời ô; cờ `FEATURE_BOTS/SERVICES` mặc định tắt; sequence id persona | Như mô tả | — | Không |

## J. Marketing, mail

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| L3-06, D-13 | Brevo: tài khoản, key, SPF/DKIM/DMARC; gói miễn phí 300 thư/ngày đủ không? | `MAIL_PROVIDER=fake` | L3 | **Chặn**: OTP đăng ký đi qua mail |
| Q-G6b-5 | Chiến dịch hàng nghìn người: chia lô theo `dailyLimit`, huỷ/tạm dừng, link huỷ đăng ký | Chưa dựng huỷ/unsubscribe | — | Không (khuyến nghị có trước khi gửi chiến dịch) |
| Q-G6b-4, Q-B42-3 | Tỉ lệ mở/nhấp từ webhook Brevo | Cột `null` | — | Không |
| Q-B42-2 | Mẫu soạn nhanh cần bảng để Admin sửa? | Hằng số dùng chung | — | Không |
| Q-G6b-2 | Email chào mừng ở cả Marketing và Cài đặt? | Giữ cả hai | — | Không |
| Q-B42-1, Q-B62-17 | Ước tính người nhận "theo nhóm" đếm trùng | Ước tính theo `member_count`, chốt số thật khi gửi | — | Không |
| Q-B41-1, Q-B41-2, Q-B41-3 | Verify SMTP khi fake; vượt `daily_limit` thì dời tới 00:00; thư thử chỉ ở audit | Như mô tả | — | Không |

## K. Cài đặt, ngôn ngữ

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| Q-G6a-4 | Mời quản trị viên: nâng quyền TK có sẵn hay tạo mới? Hạn lời mời? Ai mời Super Admin? | Chỉ mời QTV/ĐPV, cần `s.role`; chưa có hạn/gửi lại | — | Không |
| Q-G6a-5, Q-G6a-6, Q-24 | Tắt SSO/đổi chính sách MK áp dụng ngay cho Portal? Tắt ngôn ngữ người dùng đang chọn? Ngoài vi chỉ dịch màn login | Lưu server + audit; chính sách MK đã áp ở BE; ngôn ngữ rơi về mặc định | — | Không |
| Q-B40-2, Q-B40-3 | Câu nhật ký thống nhất; xoá lĩnh vực đang dùng → 409 | Như mô tả | — | Không |

## L. Pháp lý, nội dung (đều L3)

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| VĐ-3 (§16), L3-13, OQ-15 | Chính sách công bố thành viên mô phỏng (persona) trong Điều khoản | Trang Điều khoản tĩnh sửa được; chưa có nội dung | L3 | **Chặn**: rủi ro §16.4 |
| VĐ-4 (§16), L3-13, OQ-15 | Điều khoản miễn trừ thông tin gọi vốn (không phải chào bán chứng khoán); % cổ phần | Trường % cổ phần ẩn được bằng flag | L3 | **Chặn**: tính năng gọi vốn mở ở GĐ2 |
| OQ-15 | Hồ sơ NĐ 13 (dữ liệu cá nhân), đăng ký Bộ Công Thương / NĐ 147 | Để sau | L3 | **Chặn**: nghĩa vụ pháp lý trước khi thu thập dữ liệu, thu phí |
| VĐ-1 (§16), L3-07, OQ-06, D-17, TODO(OQ-06) `esgoo.provider.ts:21` | Nguồn tra MST + VSIC (API chính thức hay trung gian); hạn mức ESGOO | ESGOO chính, VietQR dự phòng, cache, nhập tay | L3 | **Chặn**: UAT-05 cần nguồn MST thật |

## M. Hợp đồng API, seed, test

| ID gốc | Câu hỏi | Phương án tạm | L3 | Go-live |
|---|---|---|---|---|
| Q-G2c-2, Q-G2a-1, Q-G3c-1, Q-G3b-1, Q-G4a-1, Q-G4d-1, Q-G4b-1, Q-G4c-1, Q-G5c-1, Q-G5c-2, Q-G5b-1, Q-G5a-1, Q-G6b-1, Q-G6a-1, Q-B61-1, Q-B11-3 | Cập nhật SRS §13 với ~120 endpoint bổ sung (đổi hợp đồng) | `coding-packs/plans/api-contract.md` là nguồn sự thật | L3 | **Chặn**: §15 bàn giao tài liệu API |
| Q-G3b-6, Q-G4c-2, Q-G4d-2, Q-G5a-2, Q-G6a-3, Q-B30-1, Q-B13-1 | Ảnh bìa nhóm/sự kiện/dự án/đội, persona, logo lưu ở đâu? | Data URL ≤ 2 MB trong DB; avatar đã qua presign | — | Không (nợ kỹ thuật, D-36) |
| Q-G4c-6 | Ràng buộc 1 nhóm/tỉnh | Unique `province` (partial) đã có trong DB | — | Không |
| Q-B02-1 | Khoá chính `text` UUID v7, seed giữ id prototype | Như mô tả | — | Không |
| Q-B13-3 | Lưu `persona` id, trả nhãn | Như mô tả | — | Không |
| Q-B21-1 | Bỏ `GET /admin/groups/requests` | Không làm (sau B61 đã thêm lại) | — | Không |
| Q-B44-2 | BRIN `messages(created_at)` cho `weekly_active` | Đã thêm | — | Không |
| Q-B61-2, Q-B61-B3 | `STORAGE_PROVIDER=local` chỉ dev; khoá upload có `/` | Như mô tả | — | Không |
| Q-B61-A1, Q-B61-A2, Q-B61-A3, Q-B61-C1, Q-B61-C2, Q-B61-D1, Q-B61-D2, Q-B61-D3, Q-B61-B1, Q-B61-B2 | Chi tiết harness contract test (schema inline, quyền `m.view`, DB test, cờ chạy tuần tự…) | Như mô tả trong questions.md | — | Không |
| Q-B62-2 → Q-B62-15 (14 ID), Q-B62-18, Q-B62-19, Q-B62-20, Q-B62-21 | Quy ước seed demo và kỳ vọng e2e chế độ server (TK g-*, member_count hiển thị, mail_log tổng hợp, flush cache…) | Như mô tả trong questions.md | — | Không |
| Q-B63-1, Q-B63-2, Q-B63-3, Q-B63-4 | `stats_daily` seed 7 tháng; kết quả parity server ghi riêng; fixture reset; đếm thật thành viên xuất | Như mô tả | — | Không |
| Q-B63-6 | Trường "tổ chức" cho TK cá nhân | Dùng tên DN hoặc "Thành viên OPC" | — | Không |
| Q-B66-1 | Múi giờ Postgres: `ALTER ROLE … SET timezone='UTC'` qua PgBouncer | Ghi trong infra/README bước 2 | — | Không (phải làm đúng khi cài VPS) |

---

## Đã chốt (không tính là đang mở)

| ID | Quyết định |
|---|---|
| Q-01 → Q-21 | ✅ PM duyệt theo đề xuất 16/10/2026 → D-26 … D-45 |
| Q-02, Q-03, Q-04, Q-06, Q-07, Q-12 | Chốt bổ sung 16/10/2026 (TOTP kiểu modal OTP, remember 30 ngày, ẩn TK demo, tự host Noto Sans, `/public/stats`, 34 cộng đồng) |
| Q-G4a-4 | Đã chốt 17/10/2026: khoá luôn qua hộp xác nhận + audit |
| Q-G6a-2 | Đã chốt → D-46 (14 permission key) |
| Q-G6b-3 | Đã chốt → D-47 (bỏ mật khẩu tạm khỏi mail) |
| Q-G4d-3 | Đã chốt → D-48 (luôn duyệt; persona như thành viên) |
| Q-B63-7 | **Chủ nhà chốt 18/10/2026**: giữ hành vi server, ghi DV-B63-x |
| OQ-11 | Đã chốt Zalo ZNS (D-25), làm sau go-live |
| OQ-14 | Đóng: bỏ công tắc OTP và vai trò/nhóm (D-24) |
| Q-G4c-5, Q-G5b-3, Q-B44-1 | Đã xử lý trong code: `GET /admin/badges` (B60) |
| Q-G2b-3, Q-G3a-6, Q-G4b-4, Q-G5a-5, Q-G5a-6, Q-G5b-5, Q-G6b-3 | Đã làm đúng theo luật hoặc BR (BR-05, BR-03, luật 10); server trả 409 khi đóng đăng ký sự kiện |
| Q-14 / Q-B14-3 | Webhook + outbox (D-31); publish `membership.updated` đã có |
| QĐ-01, QĐ-02, QĐ-03 (§16.5) | Đã chốt trong đặc tả |
| N-01 (NA-08 ↔ D-04/D-48/D-05) | Chốt 18/10/2026: bot tự động 100%, đăng ngay (D-50); go-live (D-51) |
| N-02 (§21 ↔ D-20/D-42) | Chốt: áp §21 cho go-live (D-52) |
| N-03 (Affiliate) | Chốt: thuộc go-live (D-51, D-53); thuế TNCN hoa hồng ghi V2-questions |
| N-04 (nhắc phí) | Chốt: T-30/T-7/T-0/T+3 lúc 08:00 (D-57) |
| N-05 (khoá TK) | Chốt: NA-16 + D-15 (D-55) |
| N-06 (LK-10 ↔ NR-R01) | Chốt: không hoàn phí (D-54) |
| N-07 ("Giảng viên") | Chốt: hai khái niệm riêng (D-56) |
| N-08 (ma trận §21.2) | Chốt: giữ đúng ma trận §21.2 làm mặc định, sửa được tại Cài đặt (D-52) |
| N-09 (giá niêm yết) | Chốt: theo popup V4 (D-58) |
| N-10 (Google Meet) | Chốt: trường `meetUrl`, không gọi API (D-59) |
| N-11 (câu chữ không hoàn lại) | Chốt: dùng câu chữ prototype ver2 (D-58); lưu vết đồng ý theo REQ-013 |
| N-12 (bản chuẩn) | Chốt: SRS-3.6 thay `docs/spec/` (commit 9e3720e), D-49 |
