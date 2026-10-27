# OPCHUB — Requirements Matrix (RRI Report)

> Vibecode Kit v5.0 — BƯỚC 2 (RRI) Output
> Date: 2026-10-16
> Focus phiên này: **chốt công nghệ + thư viện cho từng nghiệp vụ** và phạm vi go-live.
> Nguồn: `00-PROJECT-CONTEXT.md` (scan), OPCHUB-SRS-2.0 (`dac-ta.html`), phỏng vấn Chủ nhà.
> **Cập nhật 18/10/2026 (GOAL V2-BUILD):** nguồn chuyển sang **OPCHUB-SRS-3.6** (`docs/spec/dac-ta.html`). Ưu tiên SRS-3.6 khi khác quyết định cũ (D-49). REQ mới ở mục **D9 → D14**; REQ cũ bị thay ghi `~~gạch~~ → REQ mới`. Số § trong các dòng cũ theo v2.0; bảng đổi số: `audit/W1/SPEC-V3-DELTA.md` §2.

---

## TECH DECISIONS (đã chốt)

### Nền tảng

| Lớp | Chốt | Ghi chú |
|---|---|---|
| Repo | Monorepo **pnpm workspaces + Turborepo** | `apps/portal`, `apps/admin`, `apps/api`, `apps/worker`, `packages/shared` (zod schema, types, constants), `packages/db` (Prisma) |
| Frontend | **Next.js 14 (App Router) + TypeScript + Ant Design 5** (+ `@ant-design/pro-components` cho Admin) + **TanStack Query** | Portal và Admin là 2 app riêng (tách quyền, tách bundle) |
| Backend | **NestJS** modular monolith | Module theo domain §3.2; worker là process NestJS riêng (standalone app) |
| ORM | **Prisma** | Index nâng cao (INCLUDE / partial / expression) viết trong migration SQL tay (`prisma migrate dev --create-only`); phân trang Admin dùng **deferred join qua `$queryRaw`/TypedSQL** — xem STD-DB |
| Database | **PostgreSQL 16** (cài native) + extensions `unaccent`, `pg_trgm`, `citext` | Thay OpenSearch bằng Postgres FTS ở MVP |
| Cache / presence / rate-limit | **Redis 7** (cài native) | |
| Queue | **BullMQ** | Queue: `mail`, `reconcile`, `bot`, `export`, `scheduler` |
| Realtime | **Socket.IO** (`@nestjs/websockets`, `@socket.io/redis-adapter`) | |
| Auth | **Tự viết trong NestJS** — `@nestjs/passport`, `@nestjs/jwt`, `argon2`, `otplib` (2FA admin) | **Không dùng Keycloak** |
| Hạ tầng | **Cài native trên VPS** (không Docker, không K8s) | Node LTS chạy bằng **systemd** (hoặc PM2), **Nginx** reverse proxy + TLS (certbot), Postgres/Redis native |
| Bot AI | **Claude API** (`@anthropic-ai/sdk`) + **hàng chờ duyệt** trước khi đăng | Có nút tắt khẩn cấp |
| i18n | **Tiếng Việt**, dùng `next-intl` từ đầu | Thêm en/ASEAN sau không sửa code |
| Đối soát CK | **Adapter chung** `BankWebhookProvider`, implement **SePay trước** | Đổi Casso/PayOS không chạm nghiệp vụ |

### Thư viện theo nghiệp vụ

| Nghiệp vụ | Thư viện / kỹ thuật | Quyết định thiết kế |
|---|---|---|
| Chat realtime | Server: `socket.io` + redis-adapter. Client: `socket.io-client` + `react-virtuoso` | Tin lưu Postgres, index `(room_id, created_at DESC)`; phân trang cursor `before`; presence ở Redis (TTL); auth socket bằng JWT ở handshake; client reconnect → gọi REST lấy tin sau `lastMessageId` |
| Tìm tin / tìm kiếm | Postgres FTS + `unaccent` + `pg_trgm` (GIN) | Tìm có dấu / không dấu |
| Kiểm duyệt từ khóa | `modern-ahocorasick` trên text đã `unaccent` + lowercase | Khớp → tạo `report(source='keyword')` |
| Rich text | **Tiptap** (+ mention extension) ; server `sanitize-html` allowlist | Sự kiện, dự án, email chào mừng, bình luận YC |
| Upload | S3 API (`@aws-sdk/client-s3`, presigned URL) trỏ **MinIO cài native** trên VPS; `sharp` resize | MIME check + 5MB |
| Đăng nhập SSO | `passport-google-oauth20`, `passport-facebook`, `passport-linkedin-oauth2` | ChatGPT/Gemini/DeepSeek = nút đi luồng Google |
| OTP / reset | Tự sinh 6 số, lưu hash, TTL Redis | |
| Rate limit | `@nestjs/throttler` + Redis storage | login 10/phút, OTP 3/15', API 100/phút |
| SĐT | `libphonenumber-js` | Chuẩn hóa E.164 |
| Đối soát | Webhook SePay, verify HMAC (`crypto.timingSafeEqual`); BullMQ repeatable quét bù 2' | UNIQUE `(provider, bank_txn_id)` → idempotent |
| QR chuyển khoản | VietQR quick link (`img.vietqr.io`) | Không cần lib |
| Tra cứu MST | Adapter `TaxLookupProvider`: **ESGOO** (`esgoo.net/api-mst/{mst}.htm`, free, có tên + địa chỉ + đại diện + **ngành nghề** + tình trạng) là nguồn chính; **VietQR** (`api.vietqr.io/v2/business/{mst}`, free, chỉ tên + địa chỉ, **ngừng 01/03/2027**) dự phòng; cache Redis 30 ngày; lỗi → nhập tay | Nguồn không chính thức, không SLA → bắt buộc fallback |
| Email | `nodemailer` → Brevo SMTP; template **React Email** | Queue `mail`, retry 5, backoff |
| Bot | BullMQ repeatable tick 1'; `@anthropic-ai/sdk` | Tin AI vào trạng thái `pending_review` (trừ khi Admin bật auto-post) |
| Thông báo | Bảng `notification` + socket `notification.new` | |
| Xuất CSV | `csv-stringify` stream → MinIO → link có hạn | Worker `export`, ≤2 job song song |
| Audit | NestJS interceptor → bảng `audit_log` append-only (REVOKE UPDATE/DELETE) | |
| Biểu đồ | `@ant-design/charts` | |
| Validation | `zod` dùng chung FE/BE (`nestjs-zod`) | |
| Lịch sự kiện | `ics` | |
| Testing | Vitest, Playwright (UAT-01→31), k6 (load §14.2) | |
| Observability | `pino` (nestjs-pino), Sentry | Prometheus/Grafana để sau go-live |

---

## REQUIREMENTS MATRIX

### D1 — Xác thực & tài khoản (GĐ1)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-015 | Xác thực SĐT bằng OTP qua **Zalo ZNS** — **để sau go-live beta**; schema có sẵn `phone_verified_at`, adapter `PhoneOtpProvider` | P2 | Thành viên | TBD |
| REQ-001 | Đăng nhập email/SĐT + mật khẩu, ghi nhớ; khóa tạm 15' sau 5 lần sai; chặn TK Đã khóa (AU-01) | P0 | Thành viên, Admin | TBD |
| REQ-002 | SSO Google/Facebook/LinkedIn; nút ChatGPT/Gemini/DeepSeek đi luồng Google; Admin bật/tắt từng nút (AU-02) | P0 | Thành viên | TBD |
| REQ-003 | Đăng ký cá nhân: họ tên, SĐT (mã quốc gia ASEAN), email, mật khẩu, vai trò, ≥1 nhóm, đồng ý điều khoản (AU-03/04) | P0 | Thành viên | TBD |
| REQ-004 | Đăng ký DN: MST 10/13 số → tra cứu tự điền tên DN + ngành nghề, sửa được; fallback nhập tay (AU-05) | P0 | Doanh nghiệp | TBD |
| REQ-005 | OTP email 6 số / 10'; gửi lại; đúng → TK Hoạt động ngay (AU-06, BR-01) | P0 | Thành viên | TBD |
| REQ-006 | Email chào mừng sau OTP: lời chào, quy định, tài liệu đính kèm — **không gửi mật khẩu** (sửa mâu thuẫn AU-04/AU-07) | P0 | Thành viên | TBD |
| REQ-007 | Quên mật khẩu: link 15', ≤3 lần/giờ, thu hồi mọi phiên (AU-08) | P0 | Thành viên | TBD |
| REQ-008 | Đăng xuất (AU-09); JWT access 15' + refresh 7d xoay vòng, thu hồi được | P0 | Tất cả | TBD |
| REQ-009 | Đổi mật khẩu (QT-14) | P0 | Tất cả | TBD |
| REQ-010 | SSO trùng email với TK có sẵn → liên kết sau khi xác thực mật khẩu/OTP (QT-15) | P0 | Thành viên | TBD |
| REQ-011 | ~~Quản lý TK quản trị + 2FA TOTP bắt buộc cho Admin (QT-18)~~ → REQ-322, REQ-352 (D-52) | P0 | Super Admin | TIP-V2-201, 202 |
| REQ-012 | Hồ sơ cá nhân/DN, ảnh đại diện, SSO đã liên kết (UP-06) | P1 | Thành viên | TBD |
| REQ-013 | Lưu vết đồng ý điều khoản (phiên bản + thời điểm) | P0 | Thành viên | TBD |
| REQ-014 | Xóa tài khoản / rút đồng ý (NĐ 13/2023, QT-17) | P1 | Thành viên | TBD |

### D2 — Phí thành viên & đối soát (GĐ1)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-020 | Popup Gói dịch vụ bắt buộc, không đóng được khi phí Chờ TT/Hết hạn; vẫn cho Tư vấn + Đăng xuất (UP-07, BR-03); bố cục V4 → REQ-391 | P0 | Thành viên | TIP-V2-302 |
| REQ-021 | API trả `402 MEMBERSHIP_REQUIRED` cho route cần phí; WS `membership.updated` đóng popup | P0 | Thành viên | TBD |
| REQ-022 | Sinh Mã TV + nội dung CK `OPCHUB [Mã TV] [SĐT]` + QR VietQR, số tiền 600.000đ | P0 | Thành viên | TBD |
| REQ-023 | Webhook báo tiền về qua adapter chung (SePay trước), verify chữ ký, idempotent theo mã GD | P0 | Hệ thống | TBD |
| REQ-024 | Quét bù định kỳ 2' qua API nhà cung cấp (QT-23) | P0 | Hệ thống | TBD |
| REQ-025 | Hàng đợi giao dịch không khớp, Admin gán GD cho thành viên (QT-21) | P0 | Admin | TBD |
| REQ-026 | Job hằng ngày chuyển Sắp hết hạn (≤30d) / Hết hạn (QT-20, BR-05) | P0 | Hệ thống | TBD |
| REQ-027 | Lịch sử kỳ phí (`membership_period`), gia hạn cộng nối tiếp (BR-05) | P0 | Hệ thống | TBD |
| REQ-028 | Admin Phí: KPI, lọc, Ghi nhận đã thu, Gia hạn 12 tháng, Gửi nhắc đơn/hàng loạt (AD-03, QT-04) | P0 | Admin | TBD |
| REQ-029 | Hủy ghi nhận nhầm (QT-24). ~~Hoàn tiền~~: bỏ theo NR-R01 (D-54) | P1 | Admin | TIP-V2-108 |
| REQ-030 | ~~Nhắc phí tự động trước 30/7/1 ngày (QT-25)~~ → REQ-204 (T-30/T-7/T-0/T+3, D-57) | P1 | Hệ thống | TIP-V2-301 |

### D3 — Cộng đồng & nhóm (GĐ1)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-040 | Danh sách 34 nhóm tỉnh/thành, tìm, lọc khu vực, 9/trang (UP-02) | P0 | Thành viên | TBD |
| REQ-041 | Tham gia nhóm: đồng ý nội quy; nhóm cần duyệt yêu cầu lời giới thiệu; Hủy yêu cầu (QT-05) | P0 | Thành viên | TBD |
| REQ-042 | Chủ nhóm duyệt/từ chối trên panel phòng; thông báo kết quả | P0 | Chủ nhóm | TBD |
| REQ-043 | Rời nhóm (QT-28) | P0 | Thành viên | TBD |
| REQ-044 | Admin Nhóm: CRUD nhóm (ảnh, tỉnh, mô tả, chủ nhóm, điều phối, chế độ duyệt, nội quy, phòng), 12/trang, xuất thành viên (AD-04) | P0 | Admin | TBD |
| REQ-045 | Admin Thành viên: lưới/danh sách 10/trang, khóa/mở (thu hồi phiên), gán 1..n nhóm hàng loạt giữ nhóm cũ, xuất CSV (AD-02, QT-12, BR-07) | P0 | Admin | TBD |
| REQ-046 | Chủ nhóm mời ra / cấm; bổ nhiệm/thay chủ nhóm (QT-29/30) | P1 | Chủ nhóm, Admin | TBD |

### D4 — Chat & kiểm duyệt (GĐ2)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-060 | Phòng mặc định + phòng tùy chỉnh; gửi tin realtime, trả lời, cảm xúc, @nhắc, ghim (UP-03) | P0 | Thành viên | TBD |
| REQ-061 | Lịch sử tin cursor-based, đồng bộ khi reconnect | P0 | Thành viên | TBD |
| REQ-062 | Tìm tin trong phòng (FTS không dấu) | P1 | Thành viên | TBD |
| REQ-063 | Panel thông tin: thành viên, file, tin ghim | P1 | Thành viên | TBD |
| REQ-064 | Báo cáo vi phạm; tự phát hiện từ khóa nhạy cảm (QT-06) | P0 | Thành viên, Hệ thống | TBD |
| REQ-065 | Tab Kiểm duyệt tin nhắn: Bỏ qua / Ẩn / Cảnh báo / Khóa (đồng bộ khóa TK) | P0 | Điều phối, Admin | TBD |
| REQ-066 | Quản lý từ khóa nhạy cảm (QT-36) | P1 | Admin | TBD |
| REQ-067 | Sửa / xóa tin của mình (QT-34) | P1 | Thành viên | TBD |
| REQ-068 | ~~Chủ đề do thành viên tạo trong phòng (QT-33)~~ → bỏ; chủ đề chỉ Admin tạo, REQ-209 (D-61) | — | — | TIP-V2-304 |

### D5 — Sự kiện (GĐ2)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-080 | Portal: nổi bật, lưới, lọc Online/Offline/Của tôi, chi tiết (bản đồ / link), Đăng ký/Hủy, hết chỗ thì chặn (UP-04, QT-08) | P0 | Thành viên | TBD |
| REQ-081 | Admin: CRUD sự kiện (Tiptap), 9/trang, danh sách ĐK + xuất, chia sẻ link (AD-06) | P0 | Admin | TBD |
| REQ-082 | Sửa sự kiện → thông báo + email người đã ĐK; email xác nhận + file .ics | P1 | Thành viên | TBD |
| REQ-083 | Hủy/dời sự kiện; điểm danh (QT-38/39) | P1 | Admin | TBD |

### D6 — Dự án & nhà đầu tư (GĐ2)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-100 | Đăng dự án: Tiptap, lĩnh vực, giai đoạn, đội ngũ + ảnh, link test, repo, Public/Private, gọi vốn → Chờ duyệt (UP-05, QT-09) | P0 | Chủ dự án | TBD |
| REQ-101 | Khám phá / Dự án của tôi; lọc, sắp xếp; chỉ Đang hiển thị ở Khám phá (BR-08) | P0 | Thành viên | TBD |
| REQ-102 | Admin duyệt: Duyệt / Cần chỉnh sửa / Từ chối / Ẩn-Hiện, badge chờ duyệt (AD-07) | P0 | Admin | TBD |
| REQ-103 | Bình luận góp ý (lồng 1 cấp); liên hệ Email/Zalo/Gọi | P1 | Thành viên | TBD |
| REQ-104 | Quan tâm đầu tư: loại Cá nhân/DN/Quỹ, ≥ mức tối thiểu, 1 lần/dự án (BR-09, QT-10) | P0 | Nhà đầu tư | TBD |
| REQ-105 | Admin Nhà đầu tư: gộp, lọc, trạng thái Đã gửi→Đang trao đổi→Đã kết nối, trao đổi 2 chiều, xuất CSV (AD-08, QĐ-02) | P0 | Admin | TBD |
| REQ-106 | Sửa dự án đã duyệt (bất kỳ trường nào) → về Chờ duyệt; bản đang hiển thị giữ nguyên tới khi bản sửa được duyệt (QT-42) | P0 | Chủ dự án | TBD |
| REQ-108 | Giai đoạn dự án: Ý tưởng / MVP / Tăng trưởng / Đã ra mắt (theo prototype) | P0 | Chủ dự án | TBD |
| REQ-109 | Tài khoản Nhà đầu tư miễn phí: không qua paywall, chỉ xem dự án + gửi quan tâm + trao đổi | P0 | Nhà đầu tư | TBD |
| REQ-107 | Chia sẻ dự án Private cho nhóm (QT-43) | P1 | Chủ dự án | TBD |

### D7 — Dashboard, thông báo, cài đặt (GĐ1–2)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-120 | Portal Dashboard: lời chào, nhóm, sự kiện sắp tới, thành viên hoạt động, Thảo luận mới (UP-01) | P0 | Thành viên | TBD |
| REQ-121 | Chuông thông báo in-app theo ma trận §11, bấm đi tới nội dung (UP-08) | P0 | Tất cả | TBD |
| REQ-122 | Admin Tổng quan: KPI, biểu đồ tăng trưởng, đăng ký mới (AD-01) | P1 | Admin | TBD |
| REQ-123 | Cài đặt chung, danh mục lĩnh vực (chỉ ẩn khi đang dùng — BR-11), email chào mừng (xem trước, gửi thử), SMTP (kiểm tra kết nối), TK quản trị, nhật ký (AD-10). **Không có** công tắc tắt OTP email và tắt bắt buộc vai trò & nhóm — luôn bắt buộc theo BR-01, BR-06 | P0 | Admin | TBD |
| REQ-124 | ~~RBAC 14 quyền (m.view … s.log), Quản trị viên / Điều phối viên / Thành viên~~ → REQ-321…329 (25 quyền, 5 vai trò + tự tạo, D-52) | P0 | Super Admin | TIP-V2-201…204 |
| REQ-127 | Vai trò ngữ cảnh Chủ nhóm theo `group_id` (thành viên thường được bổ nhiệm); nhóm chưa có chủ nhóm → Admin xử lý yêu cầu thay | P0 | Admin, Chủ nhóm | TBD |
| REQ-125 | Audit log mọi thao tác Admin + log xuất dữ liệu cá nhân (BR-13) | P0 | Hệ thống | TBD |
| REQ-126 | Danh sách Admin: 10/trang, Chọn tất cả theo trang, tự lùi trang khi lọc, bảng → thẻ trên mobile (BR-12) | P0 | Admin | TBD |

### D8 — Bot, dịch vụ, hỗ trợ (go-live theo D-51; flag chỉ còn là công tắc khẩn cấp)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-140 | Bot: persona, kịch bản, lịch, khung giờ, nhóm gán (AD-05, QT-07, BR-10); **go-live** (D-51) | P0 | Admin | TIP-V2-501 |
| REQ-141 | ~~Bot AI → hàng chờ duyệt~~ → REQ-208 (NA-08 tự động 100%, đăng ngay, qua lọc NA-07, D-50); giữ nút tắt khẩn cấp + ẩn tin bot | P0 | Admin | TIP-V2-501, 502 |
| REQ-143 | Hỗ trợ người dùng qua email (hiển thị trên popup thanh toán, footer, trang lỗi) | P0 | Thành viên | TBD |
| REQ-142 | Dịch vụ tư vấn: form theo đối tượng, phiếu YC-xxxx, tiến trình, phụ trách, bình luận gắn tên (UP-07, AD-09, QT-11); **go-live**, 6 dịch vụ V4 (D-60) | P0 | Người dùng, Admin | TIP-V2-110, 302 |

### D9 — Nghiệp vụ ẩn NA-01 → NA-29 (SRS-3.6 §8)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-201 | NA-01 Phân tách phiên User/Admin; hai TK độc lập, không nút chuyển khu vực; kiểm quyền ở backend | P0 | Tất cả | TIP-V2-202 |
| REQ-202 | NA-02 Cổng phí bắt buộc; Quay lại chỉ lùi bước trong popup; Admin không chịu cổng phí | P0 | Thành viên | TIP-V2-108, 301 |
| REQ-203 | NA-03 Đối soát webhook + quét bù 2'; idempotent; thiếu tiền / sai nội dung không kích hoạt; gia hạn sớm cộng dồn | P0 | Hệ thống | TIP-V2-108, 301 |
| REQ-204 | NA-04 Job 08:00: Sắp hết hạn / Hết hạn + mail nhắc T-30, T-7, T-0, T+3, mỗi mốc ≤ 1 lần; Admin gửi nhắc tay | P0 | Hệ thống | TIP-V2-301 |
| REQ-205 | NA-05 Hàng đợi email: nhật ký, thử lại; vượt hạn mức → OTP ưu tiên, chiến dịch dời ngày | P0 | Hệ thống | TIP-V2-114 |
| REQ-206 | NA-06 Tra cứu MST tự điền; MST đã có TK → báo trùng, gợi ý Đăng nhập; lỗi → nhập tay | P0 | Doanh nghiệp | TIP-V2-306 |
| REQ-207 | NA-07 Phát hiện tin nhạy cảm ở mỗi tin (cả tin persona) → báo cáo; không tự ẩn | P0 | Hệ thống | TIP-V2-306 |
| REQ-208 | NA-08 Bot tự động 100% theo lịch kịch bản, đăng ngay; ≤ 120 tin mô phỏng/phòng, ≤ 30 hội thoại; tạm dừng ngoài giờ | P0 | Hệ thống | TIP-V2-501 |
| REQ-209 | NA-09 Chủ đề thảo luận chỉ Admin tạo trong form nhóm; "Chung" luôn có; Portal không có nút tạo/xóa | P0 | Admin | TIP-V2-304 |
| REQ-210 | NA-10 Thông báo in-app theo sự kiện nghiệp vụ; đã đọc khi mở danh sách / bấm | P0 | Tất cả | TIP-V2-305 |
| REQ-211 | NA-11 Gộp nhà đầu tư; tổng vốn = tổng các lần quan tâm; tin Admin đầu tiên → Đang trao đổi | P0 | Admin | TIP-V2-107 |
| REQ-212 | NA-12 Gán nhóm hàng loạt, khử trùng lặp, giữ nhóm cũ, thông báo từng nhóm mới | P0 | Admin | TIP-V2-304 |
| REQ-213 | NA-13 Audit giữ ≥ 12 tháng, không xóa từ UI; job dọn dữ liệu hằng đêm | P0 | Hệ thống | TIP-V2-306 |
| REQ-214 | NA-14 Xuất bất đồng bộ, link ký 1 giờ, ghi log dữ liệu cá nhân | P0 | Admin | TIP-V2-109 |
| REQ-215 | NA-15 Khóa 15' sau 5 lần sai; đúng → đặt lại bộ đếm; đặt lại MK → mở khóa; áp dụng cả Admin | P0 | Tất cả | TIP-V2-202 |
| REQ-216 | NA-16 Khóa TK: thu hồi phiên, ngắt WebSocket, ẩn khỏi online, ẩn dự án Public; giữ tin cũ (+ D-15, D-55) | P0 | Admin | TIP-V2-104 |
| REQ-217 | NA-17 SSO ánh xạ đúng email; nút bị tắt không hiện; TK Admin không SSO | P0 | Thành viên | TIP-V2-105, 202 |
| REQ-218 | NA-18 Gợi ý nhóm theo vai trò khi đăng ký; bắt buộc ≥ 1 nhóm; báo chủ nhóm | P0 | Thành viên | TIP-V2-304 |
| REQ-219 | NA-19 Nội dung CK `OPCHUB [Mã TV] [SĐT]` + QR cố định theo TK, không dấu | P0 | Thành viên | TIP-V2-302 |
| REQ-220 | NA-20 Danh mục lĩnh vực dùng chung; không xóa khi đang dùng; đếm theo dự án đang hiển thị | P1 | Admin | TIP-V2-306 |
| REQ-221 | NA-21 Dự án Private chỉ chủ, đội ngũ, Admin xem; ẩn link kho mã; chưa duyệt chỉ ở "Dự án của tôi" | P0 | Thành viên | TIP-V2-306 |
| REQ-222 | NA-22 Mã YC-xxxx; ghi chú nội bộ ẩn với người gửi; chỉ @nhắc TK nội bộ | P0 | Admin | TIP-V2-306 |
| REQ-223 | NA-23 Scheduler sự kiện 15': nhắc 24h, tự đóng đăng ký, hủy trả chỗ, ẩn sự kiện đã qua | P0 | Hệ thống | TIP-V2-303 |
| REQ-224 | NA-24 Số liệu dashboard 3 giây; số đỏ sidebar (dự án chờ duyệt, YC mới, tin cần kiểm duyệt); hoạt động ≤ 50 mục | P0 | Tất cả | TIP-V2-305 |
| REQ-225 | NA-25 Đếm tin chưa đọc theo chủ đề / nhóm / menu; tin của mình không tính | P0 | Thành viên | TIP-V2-305 |
| REQ-226 | NA-26 Xử lý ảnh tải lên: nén, lưu storage; sai định dạng / quá cỡ báo lỗi, giữ ảnh cũ | P0 | Tất cả | TIP-V2-102 |
| REQ-227 | NA-27 Làm sạch rich text ở backend, giữ biến email | P0 | Hệ thống | TIP-V2-103 |
| REQ-228 | NA-28 Ma trận quyền có hiệu lực ngay cho phiên đang mở, không cần đăng nhập lại | P0 | Admin | TIP-V2-203 |
| REQ-229 | NA-29 Khởi tạo nhóm: 1 nhóm/tỉnh, chủ nhóm, chủ đề "Chung"; đổi chủ → chủ cũ thành Thành viên | P0 | Admin | TIP-V2-304 |

### D10 — Affiliate (SRS-3.6 §20; go-live theo D-51, D-53)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-301 | AF-R01 Phí được xác nhận (CK, ghi nhận đơn / hàng loạt) → tự thành đại lý: mã từ tên, link `/r/MÃ`, % mặc định; không tạo tay | P0 | Hệ thống | TIP-V2-401 |
| REQ-302 | AF-R02 Chưa đóng phí → không có mã/link; hiện khung "Đóng phí thành viên để nhận link giới thiệu" | P0 | Thành viên | TIP-V2-402, 403 |
| REQ-303 | AF-R03 Gắn mã khi đăng ký từ `/r/MÃ`, `?ref=` hoặc nhập tay; lưu cùng TK mới | P0 | Thành viên | TIP-V2-402, 403 |
| REQ-304 | AF-R04 Từ chối mã không tồn tại / của chính mình / đại lý tạm dừng; còn lỗi thì không gửi được form | P0 | Thành viên | TIP-V2-402, 403 |
| REQ-305 | AF-R05 Hoa hồng chỉ ở lần đóng phí đầu tiên của người được giới thiệu; gia hạn không sinh | P0 | Hệ thống | TIP-V2-401 |
| REQ-306 | AF-R06 Phí người được giới thiệu được xác nhận → hoa hồng Đã ghi nhận = 600.000 × %; thông báo đại lý | P0 | Hệ thống | TIP-V2-401 |
| REQ-307 | AF-R07 Đại lý hết hạn phí → Tạm dừng (link ngừng ghi nhận, khách đóng phí lúc này không sinh hoa hồng); gia hạn → Hoạt động | P0 | Hệ thống | TIP-V2-401 |
| REQ-308 | AF-R08 % mặc định ở Chính sách; Admin sửa % riêng (1–50%) hoặc hàng loạt; áp cho khoản chưa chi + khách mới | P0 | Admin | TIP-V2-402, 404 |
| REQ-309 | AF-R09 Chi trả theo tháng toàn bộ khoản Đã ghi nhận; bắt buộc STK (tên in hoa không dấu); thông báo kèm số tiền, ngân hàng, kỳ | P0 | Kế toán | TIP-V2-402, 404 |
| REQ-310 | AF-R10 Hủy hoa hồng Đã ghi nhận khi vi phạm; lý do hiện ở cả hai phía | P0 | Admin | TIP-V2-402, 404 |
| REQ-311 | Màn Affiliate Portal (§20.6) | P0 | Thành viên | TIP-V2-403 |
| REQ-312 | Màn Affiliate Admin: Hoa hồng, Đại lý, Chi tiết đại lý, Chính sách (§20.6) | P0 | Admin, Kế toán | TIP-V2-404 |

### D11 — Tài khoản quản trị, vai trò & phân quyền (SRS-3.6 §21, D-52)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-321 | RB-R01 Menu Thành viên chỉ có người đăng ký qua form; cột "Vai trò khi đăng ký" chỉ đọc | P0 | Admin | TIP-V2-204 |
| REQ-322 | RB-R02 Tạo TK quản trị (họ tên, SĐT, email nội bộ, vai trò, MK tạm ≥ 8); email không trùng TK quản trị / thành viên; gửi email đăng nhập | P0 | Super Admin | TIP-V2-201, 202 |
| REQ-323 | RB-R03 TK quản trị không ở menu Thành viên, không vào Portal; TK thành viên không vào Admin | P0 | Tất cả | TIP-V2-202 |
| REQ-324 | RB-R04 5 vai trò mặc định + vai trò tự tạo; Super Admin không sửa/khóa; xóa vai trò tự tạo khi không còn TK giữ | P0 | Super Admin | TIP-V2-201, 203 |
| REQ-325 | RB-R05 25 quyền theo 11 menu, tách Xem / Thao tác; Super Admin toàn quyền | P0 | Super Admin | TIP-V2-201, 203 |
| REQ-326 | RB-R06 Sidebar chỉ hiện menu có ≥ 1 quyền; tab Cài đặt lọc theo quyền | P0 | Admin | TIP-V2-204 |
| REQ-327 | RB-R07 Chế độ chỉ xem: dải thông báo, chặn mọi nút thao tác (cả phía server) | P0 | Admin | TIP-V2-203, 204 |
| REQ-328 | RB-R08 Đổi vai trò, khóa/mở, thu hồi TK quản trị ghi nhật ký; TK bị khóa không đăng nhập được | P0 | Super Admin | TIP-V2-202 |
| REQ-329 | RB-R09 Super Admin xem thử với một vai trò (dải cam, nút Thoát xem thử) | P1 | Super Admin | TIP-V2-204 |

### D12 — Bổ sung v3.5 (SRS-3.6 §22)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-341 | EV-R01 Trường link Google Meet (`https://`), nút "Tạo link Meet" (D-59) | P0 | Admin | TIP-V2-303 |
| REQ-342 | EV-R02 Khối "Sắp diễn ra" + cột "Tiếp theo" (3 sự kiện) ở Admin | P1 | Admin | TIP-V2-303 |
| REQ-343 | EV-R03 Panel Chi tiết sự kiện: thông tin, link Meet (sao chép, mở), danh sách đăng ký, check-in | P0 | Admin | TIP-V2-303 |
| REQ-344 | EV-R04 Link Meet + "Vào phòng họp" chỉ hiện sau khi đăng ký; xác nhận đăng ký kèm link | P0 | Thành viên | TIP-V2-303 |
| REQ-345 | EV-R05 Check-in từng người / tất cả; "Đã check-in x/y"; → Đã tham dự | P0 | Admin | TIP-V2-303 |
| REQ-351 | SEC-R01 TK quản trị đăng nhập lần đầu bằng MK tạm → bắt buộc đổi MK (≥ 8, có chữ hoa + số, khác MK tạm) | P0 | Admin | TIP-V2-202, 204 |
| REQ-352 | SEC-R02 Cột "Bảo mật 2FA"; bật "Yêu cầu 2FA cho quản trị viên" → thiết lập ở lần đăng nhập sau | P0 | Super Admin | TIP-V2-202, 204 |
| REQ-353 | SEC-R03 Khóa tạm + thu hồi phiên áp dụng cả TK quản trị | P0 | Admin | TIP-V2-202 |
| REQ-361 | GR-R01 Gán vào nhóm chọn vai trò trong nhóm: Thành viên / Giảng viên | P0 | Admin | TIP-V2-304 |
| REQ-362 | GR-R02 Vai trò trong nhóm hiện ở danh sách thành viên phòng chat; không cấp quyền Admin | P0 | Thành viên | TIP-V2-304 |
| REQ-371 | IV-R01 Admin trao đổi với nhà đầu tư; mỗi tin → NĐT nhận thông báo in-app | P0 | Admin | TIP-V2-107 |
| REQ-372 | IV-R02 Portal: khối "Trao đổi với OPC Hub" cùng luồng, NĐT trả lời trực tiếp | P0 | Nhà đầu tư | TIP-V2-107 |
| REQ-373 | IV-R03 Tin Admin đầu tiên chuyển Đã gửi → Đang trao đổi | P0 | Hệ thống | TIP-V2-107 |
| REQ-381 | NR-R01 Phí không hoàn lại; không có chức năng hoàn phí | P0 | Hệ thống | TIP-V2-302 |
| REQ-382 | NR-R02 Điều kiện "không hoàn lại" phải đồng ý ở ô điều khoản (đăng ký, tham gia cộng đồng) và khung "Điều kiện thanh toán" | P0 | Thành viên | TIP-V2-302 |
| REQ-383 | NR-R03 Hiệu lực 12 tháng từ khi xác nhận; hết hạn → cần gia hạn (NA-04) | P0 | Hệ thống | TIP-V2-301 |

### D13 — Popup Gói dịch vụ V4 (SRS-3.6 §23.5)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-391 | UP-07 V4: cột trái thành viên hệ thống (50.000đ/tháng, thu 600.000đ/năm, niêm yết 200.000đ/tháng, D-58); cột phải 6 dịch vụ "Tư vấn →"; ≥ 1100px vừa một màn không cuộn, mobile 1 cột | P0 | Thành viên | TIP-V2-302 |

### D14 — Đối chiếu User ↔ Admin LK-01 → LK-12 (SRS-3.6 §23.3), nghiệm thu chéo
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-401 | LK-01 Đăng ký + OTP → Admin Tổng quan / Thành viên; user Hoạt động, phí Chờ thanh toán | P0 | — | TIP-V2-503 |
| REQ-402 | LK-02 Popup phí, CK đúng nội dung → Admin Phí; Chờ thanh toán → Đã thanh toán 12 tháng | P0 | — | TIP-V2-503 |
| REQ-403 | LK-03 Tham gia nhóm → chủ nhóm duyệt; pending → active | P0 | — | TIP-V2-503 |
| REQ-404 | LK-04 Báo cáo tin → tab Kiểm duyệt tin nhắn; Mới → Đã xử lý | P0 | — | TIP-V2-503 |
| REQ-405 | LK-05 Đăng ký sự kiện → danh sách đăng ký; registered → attended | P0 | — | TIP-V2-303, 503 |
| REQ-406 | LK-06 Đăng dự án → Admin Dự án; Nháp → Chờ duyệt → Đang hiển thị | P0 | — | TIP-V2-503 |
| REQ-407 | LK-07 Quan tâm đầu tư → Admin Nhà đầu tư, panel trao đổi | P0 | — | TIP-V2-107, 503 |
| REQ-408 | LK-08 "Tư vấn →" ở 1 trong 6 dịch vụ → Admin Dịch vụ; Mới → Đang tư vấn → Hoàn tất | P0 | — | TIP-V2-110, 302 |
| REQ-409 | LK-09 "Đăng ký thành viên ngay" → luồng thanh toán LK-02 | P0 | — | TIP-V2-302 |
| REQ-410 | LK-10 Link affiliate → Đơn giới thiệu, Chi trả; referral → commission → paid (không có hoàn phí, D-54) | P0 | — | TIP-V2-404, 503 |
| REQ-411 | LK-11 Bot persona tự động 100% theo kịch bản | P0 | — | TIP-V2-502 |
| REQ-412 | LK-12 Hồ sơ, đổi MK, 2FA → Admin Thành viên chi tiết (chỉ xem) | P0 | — | TIP-V2-503 |

### D15 — Nâng cấp SRS-4.0 (§27, D-67…D-80)

| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-501 | Phí 3 gói theo loại TK; Bảng giá UP-12 + popup; đối soát khớp số tiền theo gói; chuyển thành viên cũ theo D-69 | P0 | Thành viên, Kế toán | V4-601 |
| REQ-502 | Hoa hồng Affiliate trên phí thực trả; 10% Gọi vốn khi duyệt (D-70) | P0 | Đại lý, Admin | V4-602 |
| REQ-503 | Câu xác nhận đăng ký "người đại diện hợp pháp + Điều khoản sử dụng" (UP-01) | P1 | Khách | V4-607 |
| REQ-504 | Khai báo sau đăng nhập: Cá nhân (bạn là ai, OPC muốn tham gia) / Doanh nghiệp (thông tin DN, MST tự điền) → popup bảng giá (UP-02) | P0 | Thành viên mới | V4-607 |
| REQ-505 | Onboarding 8 bước (bước 2–8 khóa khi chưa đóng phí), lưu tiến độ theo từng người; Admin cột Khởi đầu x/8, lọc, nút Nhắc → thông báo (UP-04, AD-02, D-76) | P0 | Thành viên, Admin | V4-611 |
| REQ-506 | Vào nhóm ngay khi đã đóng phí; bỏ chế độ duyệt + migrate yêu cầu chờ (D-71) | P0 | Thành viên | V4-603 |
| REQ-507 | Kiểm duyệt §26.6: tự ẩn, đếm vi phạm, tự khóa N ngày, Khôi phục tin, tự mở khóa; tab trong Nhóm cộng đồng (D-77) | P0 | Admin, Thành viên | V4-612 |
| REQ-508 | Nhà đầu tư = danh sách + xuất; bỏ trạng thái, Gọi điện, bình luận (D-72) | P1 | Admin | V4-604 |
| REQ-509 | Yêu cầu dịch vụ = phiếu + ghi chú @nhắc; bỏ quy trình 5 bước; Danh mục chương trình & dịch vụ bật/tắt/thêm/sửa, hiện ở Bảng giá, Trợ lý, form tư vấn (D-72, AD-09) | P0 | Admin, Thành viên | V4-605 |
| REQ-510 | Gian hàng địa phương: tự tạo khi DN đóng phí, khám phá/lọc (§25.2), chi tiết 1 trang, liên hệ Email/Zalo/Gọi; Admin ẩn khi vi phạm (UP-08, AD-07, D-75) | P0 | Doanh nghiệp, Thành viên | V4-608 |
| REQ-511 | Nhu cầu địa phương: chủ gian hàng đăng (cần mua/đầu ra/đối tác/dịch vụ…, ngành "Khác" → nhập), gợi ý gian hàng cùng tỉnh; đóng/mở lại/xóa; Admin ẩn khi vi phạm (UP-09, AD-07) | P0 | Doanh nghiệp | V4-609 |
| REQ-512 | Gói Gọi vốn 15.000.000đ/dự án/6 tháng: khai báo vốn, % cổ phần, thanh toán, Admin thẩm định trước khi hiển thị; nút Quan tâm đầu tư (UP-11, AD-06) | P0 | Chủ dự án, NĐT | V4-610 |
| REQ-513 | Trợ lý OPC Hub ở chân sidebar Portal, mở danh mục dịch vụ & chương trình | P2 | Thành viên | V4-613 |
| REQ-514 | Menu hai cổng theo §27.3 (D-80) | P1 | Tất cả | V4-606 |
| REQ-515 | Gỡ menu Marketing + tắt job worker (D-73) | P1 | Admin | V4-606 |
| REQ-516 | Admin › Báo cáo: tổng hợp + xuất CSV theo mẫu B1/B2/B3 (D-78) | P2 | Admin | V4-614 |
| REQ-517 | Parity: đo lại toàn bộ trên prototype v4, lập DV mới, scenario cho màn mới (D-79) | P1 | QA | V4-615 |

### NFR
| REQ-ID | Requirement | Priority |
|---|---|---|
| NFR-01 | API p95 < 300ms; tin nhắn < 500ms; danh sách < 2s 4G | P0 |
| NFR-02 | Responsive 360px+, WCAG 2.1 AA, Ant Design tiếng Việt | P0 |
| NFR-03 | Bảo mật: TLS, argon2, sanitize HTML, CSRF/XSS/SQLi, OWASP ASVS L2, secret ngoài repo | P0 |
| NFR-04 | Backup Postgres hằng ngày + WAL archive (PITR 7 ngày), giữ 30 ngày; thử khôi phục hằng tháng | P0 |
| NFR-05 | Single VPS, **chấp nhận không có HA** (Chủ nhà xác nhận 2026-10-16); bù bằng backup offsite + runbook khôi phục | P1 |
| NFR-06 | Quy mô: **5.000 người online đồng thời** trên 1 VPS 8 vCPU/16GB (beta chạy 4/8); bắt buộc qua k6 (5.000 socket, 50 tin/giây) trước khi mở rộng khỏi beta; thiết kế theo S-01 → S-12 (Vision §4) | P0 |

---

## AUTO-ANSWERED (from Scan Report)

- Nghiệp vụ QT-01→13, BR-01→13, ma trận thông báo, state machines, ERD, API catalogue, UAT-01→31 — lấy nguyên từ SRS [SoT: 00-PROJECT-CONTEXT.md]
- Next.js + Ant Design + TanStack Query, NestJS, Postgres, Redis, BullMQ, Socket.IO, Brevo — giữ theo SRS §3.3
- API conventions: JSON, ISO 8601 UTC, VND số nguyên, `{items,page,size,total}`, Idempotency-Key, error codes §13.2
- Ràng buộc global CLAUDE.md: file caps, test tách file, PostgreSQL index rules, commit + SHA

## APPLICABLE STANDARDS (from coding-packs/standards/)

- none — chưa có `standards/` (greenfield). Ràng buộc tương đương lấy từ global CLAUDE.md, ghi ở BUILDER-HANDOFF khi blueprint.

## DECISIONS LOG

| # | Decision | Options | Chosen | Rationale |
|---|---|---|---|---|
| D-01 | Auth | Keycloak / tự viết NestJS | **Tự viết NestJS** | Ít hạ tầng; luồng OTP, MST, paywall custom nhiều — Keycloak phải viết SPI/theme |
| D-02 | ORM | Drizzle / Prisma / Kysely | **Prisma** | Theo SRS, phổ biến; index nâng cao bằng migration SQL tay, deferred join bằng `$queryRaw`/TypedSQL |
| D-03 | Hạ tầng | Docker Compose / K8s / native | **Native trên VPS** | Chủ nhà chọn; systemd + Nginx + Postgres/Redis/MinIO native |
| D-04 | Bot AI | Claude + duyệt / kịch bản tĩnh / hoãn | **Claude API + duyệt trước khi đăng** | Tự nhiên hơn, có kiểm soát; triển khai sau go-live |
| D-05 | Phạm vi go-live | GĐ1 / GĐ1+2 / full | **GĐ1 + GĐ2** | Bot + Dịch vụ sau feature flag, giảm rủi ro pháp lý & thời gian |
| D-06 | i18n | vi / vi+en / 10 ngôn ngữ | **vi + khung next-intl** | |
| D-07 | Đối soát | SePay / Casso / PayOS / adapter | **Adapter chung, SePay trước** | Đổi nhà cung cấp không đụng nghiệp vụ |
| D-08 | Tìm kiếm | OpenSearch / Postgres FTS | **Postgres FTS + unaccent + pg_trgm** | Đủ cho quy mô MVP, bớt 1 hệ thống |
| D-09 | Object storage | S3 cloud / MinIO / disk | **MinIO native** (S3 API) | Hợp hướng native; đổi sang S3 cloud chỉ đổi endpoint |
| D-10 | Email welcome | Gửi MK tạm / không | **Không gửi mật khẩu** | Sửa mâu thuẫn AU-04/AU-07, bảo mật |
| D-11 | Portal vs Admin | 1 app / 2 app | **2 app Next.js** | Tách quyền + bundle; dùng chung `packages/ui` |
| D-12 | Số máy | 1 / nhiều | **1 VPS**, chấp nhận không HA | Chủ nhà chọn |
| D-13 | Brevo | Miễn phí / trả phí | **Gói miễn phí tạm thời** (300 email/ngày) | Đủ cho beta nhóm nhỏ; nâng gói trước khi mở rộng |
| D-14 | NĐT và paywall | Bắt đóng phí / TK NĐT miễn phí | **TK Nhà đầu tư miễn phí** | Không cản NĐT tham gia |
| D-15 | Lan truyền trạng thái | — | Hết phí: mất quyền tương tác, giữ dữ liệu. Bị khóa: dự án tự ẩn, nhóm làm chủ chuyển về Admin | Theo đề xuất |
| D-16 | Xác thực SĐT | Có / không | **Có** | SĐT dùng đăng nhập + nội dung CK + NĐ 147/2024 |
| D-17 | Nguồn MST | — | **ESGOO chính, VietQR dự phòng**, cache, fallback nhập tay | Miễn phí; ESGOO có ngành nghề |
| D-18 | Duyệt lại dự án | Chỉ trường gọi vốn / mọi trường | **Sửa trường nào cũng duyệt lại** | Chủ nhà chọn |
| D-19 | Giai đoạn dự án | — | **Theo prototype** (Ý tưởng, MVP, Tăng trưởng, Đã ra mắt) | |
| D-20 | Phân quyền | Cố định / cấu hình | **Cấu hình được** theo ma trận 14 quyền, Super Admin khóa cứng | Đúng §2 + prototype |
| D-21 | Phiếu YC | SRS / prototype | **Theo SRS** (sau go-live) | |
| D-22 | Kênh hỗ trợ | Email / Zalo / hotline | **Email** | |
| D-23 | Ra mắt | Beta / mở thẳng | **Beta nhóm nhỏ** trước | |
| D-24 | Công tắc OTP / vai trò & nhóm | Bỏ / giữ / chỉ giữ OTP | **Bỏ cả hai** | Giữ đúng BR-01, BR-06; chống tài khoản rác |
| D-25 | Xác thực SĐT | SMS / Zalo ZNS / Firebase | **Zalo ZNS, làm sau** | Rẻ, phổ biến ở VN; chưa cần cho beta |
| D-26 | Portal ↔ Admin (Q-01, Q-10) | Một màn / hai app | **Hai app tách**; admin không vào Portal; admin có `/account` riêng; "Xem chat" là trình xem chỉ đọc trong admin | routing-auth.md; giảm rủi ro phân quyền |
| D-27 | TOTP admin (Q-02) | Có / không | **Có**, màn nhập 6 số theo kiểu modal OTP đăng ký | Prototype không có, lệch có chủ đích |
| D-28 | Paywall demo (Q-08) | — | MSW thêm **TK demo chưa đóng phí** để dựng/chụp popup bắt phí | Prototype không tái hiện được |
| D-29 | Số liệu lệch (Q-12) | 64 / 36 / 34 | **34 cộng đồng**; Super Admin seed `admin@opchub.community`; thông báo theo từng người | 34 tỉnh/thành |
| D-30 | Sau kích hoạt đăng ký (Q-09) | Về login / vào app | **Vào thẳng `/community`**; không gửi mật khẩu tạm khi người dùng đã tự đặt | |
| D-31 | Xác nhận chuyển khoản (Q-14) | Tự kích hoạt / webhook | **Webhook + outbox**; MSW giả lập trễ | Rule 8 |
| D-32 | Thao tác admin nguy hiểm (Q-13) | — | Luôn `Modal.confirm` + `audit_logs` | Rule 10 |
| D-33 | Cài đặt bảo mật (Q-11) | — | Panel SSO, chính sách MK, 2FA, khóa 5 lần sai = **tab trong Cài đặt**; Marketing = mục menu admin | |
| D-34 | Ghi nhớ đăng nhập (Q-03) | — | Bật: refresh cookie 30 ngày; tắt: cookie phiên | |
| D-35 | TK dùng thử trên login (Q-04) | — | Chỉ dev/demo; production ẩn bằng `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` (mặc định tắt) | security.md |
| D-36 | Ảnh mẫu (Q-05) | Hotlink / tự host | Giữ cho parity; **tự host trước go-live** qua `next/image` | |
| D-37 | Font (Q-06) | Google Fonts / hệ thống / tự host | **Tự host Noto Sans + SC (subset)**; script khác tải theo ngôn ngữ; đo lại parity khi đổi | Hiệu năng |
| D-38 | Số liệu màn login (Q-07) | Cứng / API | `GET /v1/public/stats` cache 60 giây (bổ sung SRS §13) | |
| D-39 | URL cho popup (C-12) | Tất cả / không | Chỉ **chi tiết sự kiện, dự án** có URL; modal khác không | routing-auth.md |
| D-40 | Xác minh DN (C-07) | Duyệt tay / tự động | Tài khoản dùng ngay sau OTP; huy hiệu **"Đã xác minh" tự gắn** khi tra MST thấy DN đang hoạt động và tên khớp; không khớp → "Chờ xác minh", admin duyệt tay (audit). Chưa xác minh vẫn dùng bình thường | Không chặn người dùng; adapter MST là nguồn |
| D-41 | Giá & nội dung CK (C-09) | — | Hiện **"600.000đ/năm (≈ 50.000đ/tháng)"**, bỏ giá gạch "Ưu đãi 75%" (trừ khi có khuyến mãi thật); đối soát **chỉ theo Mã TV** (`TV`+6 số), SĐT trong nội dung chỉ tham khảo; "Ghi nhận đã thu" bắt buộc lý do + quyền + audit | Khớp D-giá; tránh lệch khi đổi SĐT |
| D-42 | Đổi quyền hệ thống (C-10) | Inline / chỗ riêng | Bảng thành viên **chỉ hiển thị** quyền; đổi quyền ở "Cài đặt & Phân quyền", cần `s.role` (Super Admin), xác nhận + audit | Chống leo thang quyền |
| D-43 | Chủ nhóm vs điều phối viên (C-11) | — | **Chủ nhóm** = vai trò theo `group_id` (REQ-127): duyệt/từ chối vào nhóm, mời ra, cấm, ghim, xóa tin **trong nhóm mình**; **Điều phối viên** (`c.mod`) kiểm duyệt mọi nhóm; báo cáo ẩn danh với chủ nhóm, admin thấy người báo cáo | Chống báo cáo bừa |
| D-44 | Khóa đăng nhập (C-06) | — | Sai **5 lần → khóa 15 phút** theo tài khoản + IP, kèm rate-limit; màn login báo thời gian chờ. TK bị admin khóa → `403` "Tài khoản đã bị khóa, liên hệ hỗ trợ" | security.md |
| D-45 | SSO thành viên mới (C-02) | — | Email chưa có TK → form bổ sung (loại TK, nhóm, SĐT), **bỏ OTP email** (provider đã xác thực) → vào `/community`; email đã có TK → đăng nhập luôn | Bổ sung D-30 |
| D-46 | Ma trận phân quyền (Q-G6a-2) | 14 key / 6–8 dòng gộp | **14 permission key** theo D-20, nhóm 5 tiêu đề để dễ đọc; Super Admin khóa cứng | Backend kiểm theo key (luật 4); lệch prototype D-69 chấp nhận (DV-G6a-2) |
| D-47 | Mật khẩu tạm trong mail chào mừng (Q-G6b-3) | Giữ / che / bỏ | **Bỏ hẳn** khối mật khẩu tạm khỏi mẫu, xem trước, biến chèn; thay bằng nút "Đăng nhập" | D-30 tự đặt mật khẩu, D-45 SSO không có mật khẩu; không gửi mật khẩu qua email |
| D-48 | Bot tự động & danh tính (Q-G4d-3) | Không duyệt / duyệt | **Luôn duyệt trước khi đăng** (giữ D-04); chữ "không cần duyệt" sửa lại. Bot đăng **với danh tính persona như thành viên**: Portal không hiện nhãn/avatar "Bot", API Portal không trả `isSimulated`; cờ chỉ lưu ở DB + Admin để kiểm duyệt/audit | Chủ nhà chọn (17/10/2026) |
| D-49 | Nguồn đặc tả (18/10/2026) | SRS-2.0 / SRS-3.6 | **SRS-3.6 (`docs/spec/`) ưu tiên** khi khác Decisions Log cũ. Thay D-04, D-05, D-20, D-41 (phần giá), D-42, D-46, D-48 (phần duyệt) | Chủ nhà chọn "ưu tiên ver2" |
| D-50 | Bot NA-08 | Duyệt / tự động | **Tự động 100%**: đăng ngay không duyệt, vẫn qua lọc NA-07; ≤ 120 tin mô phỏng/phòng, ≤ 30 hội thoại; tạm dừng ngoài giờ / khi kịch bản tắt; dev/test dùng FakeLlm. Giữ phần danh tính persona của D-48 | SRS-3.6 §8.10, LK-11 |
| D-51 | Phạm vi go-live | GĐ1+2 / + Bot, Dịch vụ, Affiliate | **GĐ1 + GĐ2 + Bot + Dịch vụ + Affiliate**; feature flag chỉ còn là công tắc khẩn cấp | Thay D-05 |
| D-52 | Phân quyền | 14 quyền / §21 | **§21**: bảng `admin_users`, `admin_roles`, `admin_role_permissions`; email không trùng thành viên; 5 vai trò hệ thống + vai trò tự tạo; 25 khoá `<menu>.view` / `<menu>.action`; ẩn menu; chế độ chỉ xem (server trả 403 mã riêng); Super Admin xem thử | Thay D-20, D-42, D-46 |
| D-53 | Affiliate | Có / để sau | **Có, go-live**; hoa hồng = 600.000 × %, làm tròn xuống đồng; `month_key` theo giờ VN; chi trả = Admin/Kế toán ghi nhận đã chuyển (không gọi ngân hàng) | §20 |
| D-54 | Hoàn phí | — | **Không hoàn lại** (NR-R01); không có chức năng hoàn phí; bỏ "tạm dừng nếu hoàn phí" ở LK-10 | §22.5 |
| D-55 | Khoá tài khoản | NA-16 / D-15 | **Cả hai**: thu hồi refresh, ngắt socket, ẩn khỏi online, ẩn dự án Public **và** nhóm làm chủ chuyển về Admin. Mở khoá: dự án hiện lại, nhóm không tự trả lại | NA-16 + D-15 |
| D-56 | "Giảng viên" | — | **Hai khái niệm riêng**: vai trò quản trị (RB-R04, thay Điều phối viên) và vai trò trong nhóm (GR-R01, thay `moderator` trong nhóm, không cấp quyền Admin) | §21, §22.3 |
| D-57 | Hạn phí & nhắc | 00:05 / 08:00 | Một job **08:00 giờ VN**: Sắp hết hạn / Hết hạn + mail nhắc **T-30, T-7, T-0, T+3**, mỗi mốc ≤ 1 lần/thành viên; guard phí so `valid_until` tức thời | NA-04; BUG-018 |
| D-58 | Giá hiển thị | D-41 / V4 | **Theo popup V4**: "50.000đ/tháng (thanh toán theo năm 600.000đ, niêm yết 200.000đ/tháng, ưu đãi 75%)"; thu 600.000đ/năm; đối soát vẫn theo Mã TV (giữ phần còn lại của D-41) | §23.5 |
| D-59 | Google Meet | API / dán link | Trường **`meetUrl`** riêng (`https://`); "Tạo link Meet" mở `https://meet.google.com/new` ở tab mới; không gọi Google API | EV-R01 |
| D-60 | Dịch vụ tư vấn | Sau go-live / go-live | **Go-live**, 6 dịch vụ theo popup V4, nút "Tư vấn →" tạo phiếu YC | §23.5, LK-08 |
| D-61 | Chủ đề chat | Thành viên tạo / Admin | **Chỉ Admin tạo** (NA-09); bỏ REQ-068 | §8.11 |
| D-62 | TK quản trị & SSO | — | TK quản trị **không SSO, không vào Portal**; TK thành viên không vào Admin | NA-01, NA-17, RB-R03 |
| D-63 | Chuẩn test | — | Mỗi REQ V2 có test, tên test ghi mã REQ/AT; server có test âm; e2e chạy msw + server; **cấm nhánh `onServer` làm yếu assertion** | Bài học audit W1 (TD-032…035) |
| D-64 | SSO Google thật (21/10/2026) | 4 redirect URI / 1 URI; lưu theo nút / `google`; production thiếu key: tắt SSO / không khởi động | **1 redirect URI `/sso/callback/google`** cho Google + ChatGPT + Gemini + DeepSeek (nút lưu trong state); liên kết lưu **`provider='google'`, subject = `sub`**; production `SSO_PROVIDER≠google` hoặc thiếu key → **server không khởi động**; OAuth code + PKCE + state + nonce, tự viết adapter bằng `jose` (không passport); Facebook/LinkedIn ẩn tới khi có app | REQ-002, REQ-217, OQ-04, TIP-V2-116 |
| D-65 | Portal đa ngôn ngữ (21/10/2026) | chỉ en / 9 ngôn ngữ; Portal / Admin / server; nối cài đặt Admin | **Dịch đủ 9 bản** `en, zh, id, th, ms, fil, km, lo, my` (`en-SG`→`en`, `ms-BN`→`ms`) **chỉ cho Portal**; AI dịch, người bản xứ soát sau; Admin + lỗi API + email vẫn tiếng Việt; **không nối** cài đặt Ngôn ngữ Admin (nút vẫn đủ 12, mặc định vi); thay Q-24 (chỉ dịch màn đăng nhập) | D-06, Q-24, TIP-V2-117 |
| D-66 | Nguồn MST thật (21/10/2026) — thay thứ tự D-17 | ESGOO chính / DLPL chính | **DLPL API (`/v1/businesses?tax_code=`, gói Starter+) chính → ESGOO → VietQR**; key qua header `Authorization: Bearer`, env `DLPL_API_KEY` (thiếu key thì bỏ DLPL, warn); DLPL không có người đại diện → **để trống, người dùng tự nhập**; lỗi/hết lượt DLPL chuyển nguồn sau, không cache "không thấy" | REQ-001, D-17, TIP-V2-118 |
| D-67 | Nguồn đặc tả (23/10/2026) — thay D-49 | SRS-3.6 / SRS-4.0 | **SRS-4.0 (`docs/spec/`, §27 ưu tiên cao nhất)** là nguồn sự thật, thay toàn bộ. D-xx cũ còn hiệu lực trừ khi D-67…D-80 thay. Chỗ SRS-4.0 tự mâu thuẫn (`audit/SPEC-V4-DELTA.md` §3) → hỏi owner, không tự chọn | §27, Q-V4-1 |
| D-68 | Phí 3 gói (23/10/2026) — thay số tiền D-53/D-58 | 600.000 / 3 gói | **Cá nhân 1.200.000đ/năm · Doanh nghiệp 3.600.000đ/năm · Gọi vốn 15.000.000đ/dự án/6 tháng (tùy chọn)**. Gói theo **loại TK khi đăng ký** (`ACCOUNT_TYPE`); đổi loại TK do Admin, áp từ kỳ gia hạn sau. Không hoàn phí (D-54 giữ) | §27.1, UP-03/11/12, Q-V4-2 |
| D-69 | Chuyển phí thành viên cũ | Giữ đến hết hạn / áp ngay / giữ giá cũ | **Giữ hạn hiện tại**; lần gia hạn tiếp theo trả theo gói mới (D-68). Khoản đang chờ thanh toán tạo trước go-live v4 giữ số tiền cũ | Q-V4-2 |
| D-70 | Hoa hồng Affiliate theo gói — thay cơ sở 600.000 của D-53 | Phí thực trả / cố định 600.000 | **% mặc định × số tiền gói thực đóng** (1.200.000 / 3.600.000), làm tròn xuống đồng; **Gọi vốn: 10% × 15.000.000 khi Admin duyệt Gọi vốn**, cho đại lý giới thiệu chủ dự án. Chỉ lần giới thiệu đầu, chặn tự giới thiệu, chi trả cuối tháng (giữ D-53) | AD-06, AD-10, F05, F06, Q-V4-3 |
| D-71 | Vào nhóm — thay phần duyệt của D-43, QT-05 | Bỏ / giữ theo nhóm | **Bỏ hẳn duyệt**: đã đóng phí → vào nhóm ngay. Bỏ `GroupJoinMode.approval` và yêu cầu chờ; migration tự duyệt yêu cầu đang chờ. Chủ nhóm giữ các quyền khác của D-43 | §27.1, UP-05, Q-V4-4 |
| D-72 | Nhà đầu tư & Yêu cầu dịch vụ — thay QT-10, QT-11, NA-11, NA-22, §22.4 | Ẩn / xóa | **Xóa hẳn**: bỏ trạng thái kết nối NĐT, nút Gọi điện, luồng bình luận; bỏ quy trình 5 bước YC (enum `ServiceRequestStatus`), người phụ trách, thống kê/lọc theo trạng thái (migration). NĐT = **danh sách (tên, SĐT, đơn vị, dự án) + xuất**. YC = phiếu + ghi chú nội bộ @nhắc. Danh mục chương trình & dịch vụ do Admin bật/tắt/thêm/sửa | §27.1, AD-08b, AD-09, §26.6, Q-V4-5, Q-V4-12 |
| D-73 | Marketing / chiến dịch email | Gỡ menu + tắt job / xóa / giữ | **Gỡ menu + tắt job worker** (MarketingProcessor); giữ code + bảng; xóa khi bàn giao (§27.10). Chỉ còn Email chào mừng tự động trong Cài đặt | §27.1, Q-V4-6 |
| D-74 | Phạm vi go-live v4 — mở rộng D-51 | — | **Thêm vào go-live**: Onboarding 8 bước (UP-04 + cột Khởi đầu x/8, lọc, Nhắc ở AD-02), Gian hàng địa phương (UP-08, AD-07), Nhu cầu địa phương (UP-09, AD-07), Trợ lý OPC Hub, Khai báo sau đăng nhập, Gói Gọi vốn (UP-11) | §27.6, Q-V4-7 |
| D-75 | Gian hàng & Nhu cầu — quyền | §27.5 / mọi thành viên | **Theo §27.5**: chỉ TK **Doanh nghiệp đã đóng phí** có Gian hàng (tự tạo khi đóng phí, hiển thị ngay, Admin chỉ ẩn khi vi phạm); chỉ **chủ gian hàng** đăng Nhu cầu (UP-09). Cá nhân chỉ xem | §27.5, UP-08, UP-09, Q-V4-8 |
| D-76 | Onboarding với TK Cá nhân | Bước thay thế / theo prototype | **Theo prototype v4** (`docs/spec/index.html`): nội dung 8 bước cho từng loại TK lấy đúng như prototype khi viết TIP; không tự chế bước | UP-04, Q-V4-7 |
| D-77 | Kiểm duyệt §26.6 — mở rộng D-44/D-55 | Đầy đủ / báo cáo không tự ẩn / chưa áp | **Áp đầy đủ**: tin có từ khóa cấm **hoặc bị báo cáo** ẩn ngay ("Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng"); lần 1 ẩn + cảnh báo; từ lần 2 **tự khóa N ngày** (mặc định 7; Admin chọn 1/3/7/14/30), đang đăng nhập bị đăng xuất, đăng nhập báo ngày mở khóa; **Khôi phục tin** = hiện lại + không tính vi phạm, nếu còn < 2 lần và đang khóa tự động thì mở ngay; **tự mở khóa** định kỳ + khi đăng nhập. Kiểm duyệt là **tab** trong Nhóm cộng đồng | §26.6, AD-08, Q-V4-11 |
| D-78 | Báo cáo | Ngoài phạm vi / giữ | **Giữ màn Admin › Báo cáo**: Admin tự tổng hợp và **xuất CSV theo mẫu B1/B2/B3** (`docs/spec/mau-bao-cao/`) theo nhóm/tỉnh/vùng; **không** có vai trò cấp vùng/tỉnh nộp báo cáo, không cây mạng lưới. Quản lý mạng lưới, Portal › Mạng lưới: ngoài phạm vi | §24 (đã gỡ), T15, Q-V4-9 |
| D-79 | Parity UI v4 — thay baseline cũ | Đo lại toàn bộ / theo TIP | **Đo lại toàn bộ** trên prototype v4 làm baseline mới; DV-* cũ hết hiệu lực, lập lại theo số mới; thêm scenario cho màn mới; màn đã gỡ khỏi menu đánh `unreachable` | Q-V4-10 |
| D-80 | Menu hai cổng | — | **Theo §27.3**: Portal 9 mục (Dashboard · Chat nhóm · Cộng đồng · Sự kiện · Nhu cầu địa phương · Gian hàng địa phương · Dự án OPC · Bảng giá · Mạng lưới Affiliate; Hồ sơ ở thanh trên). Admin theo §27.3 + Báo cáo (D-78) | §27.3 |
| D-81 | Đối soát chuyển khoản (OQ-17, 23/10/2026) | API VCB / trung gian / fake | **Giữ fake provider** cho đến khi owner chốt kênh thật; logic 3 gói (D-68) đối soát qua adapter `bank-webhook` hiện có. Không chặn TIP phí **Đóng — fake provider tạm (D-81)** |
| D-82 | Gói Gọi vốn (OQ-21) | Cá nhân mua được? Hết hạn? | **TK Cá nhân mua được** (như Doanh nghiệp). Hết 6 tháng → **nhắc gia hạn** (thông báo + email). Đề xuất kèm theo: hết hạn mà chưa gia hạn thì dự án tắt hiển thị gọi vốn (tab Gọi vốn ẩn, dự án vẫn hiện); gia hạn = trả 15.000.000đ cho 6 tháng tiếp | OQ-21, UP-11 |
| D-83 | Kiểm duyệt — hết hạn vi phạm & số ngày khóa (bổ sung D-77) | Suốt đời / hết hạn; cố định / Admin chọn | Số lần vi phạm **reset sau 90 ngày** (chỉ đếm vi phạm trong 90 ngày gần nhất). **Admin chọn số ngày khóa** (1/3/7/14/30, mặc định 7) | §26.6 |
| D-84 | Gian hàng cho DN đã đóng phí trước v4 (bổ sung D-75) | Tạo ngay / khi đóng phí | **Tạo khi đóng phí**: DN đã đóng phí trước go-live v4 chưa có gian hàng; gian hàng tự tạo ở lần đóng phí kế tiếp (gia hạn). Không migration tạo hàng loạt | REQ-510 |
| D-85 | Onboarding — tiến độ thành viên hiện có (bổ sung D-76) | Từ 0 / tính sẵn | **Theo đặc tả + prototype + đề xuất**: tiến độ **tính từ dữ liệu thật** (không lưu cờ thủ công cho bước có dữ liệu), nên thành viên cũ thấy ngay bước đã làm. 8 bước theo prototype `_dash`: (1) Thanh toán phí, (2) Hoàn thiện hồ sơ (DN: người đại diện, MST, ngành, ảnh; Cá nhân: bạn là ai, OPC muốn tham gia, ảnh, liên hệ), (3) Tham gia nhóm tỉnh, (4) Gửi lời chào trong chat, (5) DN: hoàn thiện Gian hàng · Cá nhân: đăng Dự án đầu tiên, (6) DN: gửi Nhu cầu đầu tiên · Cá nhân: khám phá gian hàng & nhu cầu cùng tỉnh, (7) Chia sẻ link Affiliate, (8) Đăng ký một sự kiện. Bước 2–8 khóa khi chưa đóng phí. Bước không có dữ liệu nguồn (6 Cá nhân "khám phá", 7 "chia sẻ link") lưu **cờ theo từng người** khi bấm. Cá nhân có dự án → thẻ tùy chọn "Gói Gọi vốn" ngoài 8 bước | UP-04, OQ-20, T12 |
| D-86 | Test nghiệm thu v4 (OQ-18) | Theo §26 / theo §27 | **Viết theo §27 + D-67…D-88**; §26 chỉ tham khảo, các ca mâu thuẫn (UT-01 5 bước, UT-13/AT-10 trạng thái, AT-09 trao đổi, §26.1 600.000đ, E-15 KPI) bỏ **Đóng — test theo §27 (D-86)** |
| D-87 | Câu xác nhận đăng ký (OQ-19) | Dùng chung / tách | **Tạm dùng chung** câu "người đại diện hợp pháp + Điều khoản sử dụng" cho cả hai loại TK; tách khi owner có câu riêng cho Cá nhân (để trong i18n, đổi không cần code) **Đóng — dùng chung tạm (D-87)** |
| D-88 | Nhắc onboarding (OQ-20) | — | **Thông báo trong app trước**; email nhắc dùng **mẫu tạm** trong Cài đặt › Email tự động (Admin sửa được). Nút Nhắc ở Admin: tối đa 1 lần/ngày/thành viên **Đóng — app trước, email mẫu tạm (D-88)** |
| D-89 | Giao diện theo prototype v4 (owner, 26/10/2026) | Giữ D-xx cũ + DV / theo v4 hoàn toàn | **Theo prototype v4 hoàn toàn**: mọi màn Portal / Admin / Auth khớp `docs/spec/index.html` ≤ 3% ở 1440 + 390. Prototype v4 **thắng mọi D-xx cũ về giao diện**: SSO chỉ Google (thay D-64 phần nút ChatGPT / Gemini / DeepSeek), Cộng đồng 90 nhóm (34 tỉnh + 56 Nhóm ngành, bổ sung D-71), trang Dự án OPC v4, Tổng quan Admin có khối "Luồng hệ thống", avatar chữ viết tắt, Cài đặt / Bot / Sự kiện / danh mục lĩnh vực theo v4. **Nghiệp vụ tiền / quyền / kiểm duyệt giữ D-xx**; thiếu API thì làm API mới. Dữ liệu demo / MSW chỉnh khớp seed prototype, không làm giả dữ liệu thật. DV chỉ còn dùng khi prototype lỗi / không đi tới được (unreachable có lý do); DV-V4 cũ phải sửa hết. Chốt Q-V4-615-1..5 | TIP-V4-617 → 624, standards/frontend/ui-parity |
| D-90 | Thứ tự danh sách Thành viên Admin (owner, 27/10/2026 — chốt Q-V4-623-1, thay Q-B62-18) | Ngày tham gia mới nhất / mã TV tăng dần | **Mã thành viên tăng dần** (`member_code ASC`) như prototype v4 (m1 → m8 = TV000001 →); TK mới đăng ký (mã lớn hơn) xuống cuối. Server + MSW cùng thứ tự; index `(member_code)` partial `deleted_at IS NULL`. Các DV còn lại của TIP-V4-624 (D-47, D-31, D-50, D-71 / D-56, SRS §20.6, AF-R01, DV-G4c-1) **giữ nguyên** theo owner. | Q-V4-623-1, D-89 |
| D-91 | 12 ảnh parity còn > 3% sau D-90 (owner, 27/10/2026 — "1A 2A 3A 4A 5A 6B 7B") | Theo prototype / giữ | **(1) D-84-AFF**: owner chọn A (seed demo chỉ 6 đại lý) — **chưa làm, chờ owner**: trái AF-R01 (51 khách đã đóng phí phải tự thành đại lý; worker `AffiliateBackfillService` tạo lại) → cần owner chốt bỏ AF-R01 cho bộ demo hay giữ (B); **(2) D-84-POL**: ô "Điều khoản chương trình" (SRS §20.6) thu thành nút "Sửa điều khoản" mở hộp thoại, vẫn đủ chức năng; **(3) D-32**: "Xem chat" của prototype là no-op (guard trả về admin) → *unreachable* có lý do, app giữ trình xem chỉ đọc (DV-G4c-1); **(4) D-41**: ≤ 767px chuyển "Tắt khẩn cấp / Ẩn tin bot" (REQ-141) vào menu ⋯, giữ chức năng; **(5) D-70 / P-05**: khối "Mật khẩu tạm" của mail chào mừng thay bằng khối "Đặt mật khẩu" cùng vị trí / kích thước — vẫn **không** gửi mật khẩu (D-47); **(6) P-104**: giữ D-31 (mã CK 6 số); **(7) P-40**: giữ D-71 / D-56. | Q-V4-624-1 → 7, D-89, D-90 |

### P5-PLAN-01 — Chốt số lượt hội thoại tự sinh (owner, 21/10/2026)

Owner chọn **“Giữ 3–4 lượt, persona mở đầu chốt lại”** trong câu trả lời trực tiếp.
Kế hoạch: persona mở đầu → persona khác → persona thứ ba nếu đủ điều kiện →
persona mở đầu chốt. Không suy diễn thành số lượt cho kịch bản do Admin tự soạn.
Các điều kiện nhóm/khung giờ/quota vẫn áp dụng; không đủ persona hoặc quota thì
không tự bỏ điều kiện để tạo hội thoại. Đây là quyết định đã duyệt, thay trạng
thái “đề xuất/chờ xác nhận” P5-PLAN-01 trong các báo cáo checkpoint cũ.

## OPEN QUESTIONS

| # | Question | Impact | Status / Suggested Resolution |
|---|---|---|---|
| OQ-01 | Cấu hình VPS (CPU/RAM, nhà cung cấp, đặt tại VN?) | Sizing, NĐ 53 | 1 máy đã chốt; đề xuất 4vCPU/8GB tại VN |
| OQ-04 | Thông tin app SSO Google/Facebook/LinkedIn | REQ-002 | **Google: đã có key (21/10/2026) → D-64, TIP-V2-116.** Facebook/LinkedIn: chủ nhà cấp sau — nút ẩn khi chưa cấu hình |
| OQ-05 | Claude API key + ngân sách bot | REQ-141 | Để sau (bot sau go-live) |
| OQ-06 | Toàn bộ thanh toán: nhà cung cấp webhook, Mã TV, gói tháng/năm, hóa đơn, hoàn tiền, CK lỗi, miễn phí | D2 | **Để sau.** Build theo default: adapter chung, Mã TV = `TV`+6 số, phí theo 3 gói D-68 (thay "chỉ gói năm 600k"), CK lỗi → hàng đợi không khớp |
| OQ-11 | Tài khoản Zalo OA + ZNS template, chi phí | REQ-015 | **Đã chốt Zalo ZNS (D-25), để sau** |
| OQ-12 | Một MST cho nhiều người đăng ký? | REQ-004 | **Đóng (đề xuất, 23/10/2026)** — cho phép; người đăng ký đầu là đại diện; mỗi TK DN có gian hàng riêng (D-75) |
| OQ-13 | Ai là Chủ nhóm 34 nhóm lúc ra mắt? | REQ-127 | **Hạ ưu tiên** — D-71 bỏ duyệt vào nhóm; nhóm chưa có chủ vẫn hoạt động, bổ nhiệm dần |
| OQ-14 | Công tắc "tắt OTP" và "tắt bắt buộc vai trò & nhóm" | REQ-123 | **Đóng — bỏ cả hai (D-24)** |
| OQ-15 | Pháp lý: % cổ phần, công bố bot, Điều khoản/Chính sách, hồ sơ NĐ 13, đăng ký BCT / NĐ 147 | Go-live | **Để sau** — build trường % cổ phần ẩn được bằng flag; trang Điều khoản là nội dung tĩnh sửa được |
| OQ-16 | Dữ liệu ban đầu (danh mục, mẫu email, ảnh bìa/nội quy 34 nhóm), nhân sự trực sự cố + kế toán | Go-live | **Để sau** — seed từ prototype |
| OQ-17 | Kênh đối soát chuyển khoản Vietcombank (API ngân hàng hay trung gian) | REQ-501 | **Đóng — fake provider tạm (D-81)** |
| OQ-18 | Mâu thuẫn nội bộ SRS-4.0 (`audit/SPEC-V4-DELTA.md` §3, 10 điểm) chưa xử lý bởi D-67…D-80: §26 test cũ (UT-01 5 bước, AT-09/AT-10, §26.1 600.000đ, E-15 KPI) | Nghiệm thu | **Đóng — test theo §27 (D-86)** |
| OQ-19 | Câu xác nhận "người đại diện hợp pháp" dùng chung cho TK Cá nhân (§27.10 đề xuất tách) | REQ-503 | **Đóng — dùng chung tạm (D-87)** |
| OQ-20 | Email nhắc onboarding: mẫu trong Email tự động | REQ-505 | **Đóng — app trước, email mẫu tạm (D-88)** |
| OQ-21 | Gọi vốn: TK Cá nhân có mua được không; quá 6 tháng xử lý thế nào | REQ-512 | **Đóng — Cá nhân mua được, nhắc gia hạn (D-82)** |

## SCOPE BOUNDARIES

### In Scope (go-live = GĐ1 + GĐ2 + Bot + Dịch vụ + Affiliate, D-51)
- D1 Xác thực & tài khoản, D2 Phí & đối soát, D3 Cộng đồng & nhóm, D4 Chat & kiểm duyệt, D5 Sự kiện, D6 Dự án & nhà đầu tư, D7 Dashboard/thông báo/cài đặt
- D8 Bot tự động, Dịch vụ tư vấn; D9 Nghiệp vụ ẩn NA-01→29; D10 Affiliate; D11 TK quản trị & phân quyền; D12 v3.5; D13 popup V4; D14 LK-01→12
- Hạ tầng native VPS, CI build + deploy script, backup
- **v4 (D-74, 23/10/2026)**: D15 REQ-501…517 — phí 3 gói, Gọi vốn, onboarding 8 bước, Gian hàng, Nhu cầu, Trợ lý OPC Hub, kiểm duyệt §26.6, Báo cáo xuất mẫu

### Out of Scope (defer)
- Kubernetes, OpenSearch, Prometheus/Grafana, Keycloak
- Ngôn ngữ ngoài tiếng Việt
- Cổng thanh toán thẻ/ví, app native, giao dịch đầu tư thực tế
- Hoàn phí thành viên (D-54); tạo link Google Meet qua API (D-59)
- Hóa đơn điện tử tự động
- Cây mạng lưới / Giám đốc vùng / hoa hồng cộng dồn (§24), Quản lý mạng lưới, Portal › Mạng lưới (D-78)
- Chiến dịch email Marketing (gỡ menu, D-73)

---

## QUALITY GATE — `/vibecode:rri`

- [x] All P0 requirements identified with REQ-IDs (D1–D7 + NFR)
- [x] Auto-answered items marked
- [x] Decisions log with rationale (D-01 → D-63)
- [x] Open questions listed (OQ-01 → OQ-10)
- [x] Requirements matrix complete
- [x] Applicable Standards — none (no standards index)
- ⚠️ Gap: phiên RRI tập trung tech stack; các P0 nghiệp vụ mới (REQ-010, 025, 026, 043, 106) dùng default đề xuất — Chủ nhà chưa xác nhận từng mục
- ⚠️ Gap: SRS ghi uptime 99,5% + replica; native single-VPS không đạt HA — cần chấp nhận rủi ro (NFR-05)
- Confidence P0: ~85% (cập nhật 2026-10-16 sau trả lời 31 câu hỏi mở)


## Owner amendment ? 2026-10-22: Bot without environment flags

Owner explicitly requires Bot to behave like other Admin domains: no server FEATURE_BOTS or Next NEXT_PUBLIC_FEATURE_BOTS gate. This supersedes D-51 only for the Bot environment emergency switch, and the older D-05/DV-G4d-5 Bot gating. Bot UI/API remain permission-controlled and always registered. Execution remains controlled by persisted bot.enabled, reply/auto settings and audited emergency stop/hide. Existing disabled settings are not enabled by this change. Legacy env variables are ignored and can be removed; no production activation or data change is performed by this task.
