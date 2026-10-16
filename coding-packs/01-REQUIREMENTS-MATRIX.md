# OPCHUB — Requirements Matrix (RRI Report)

> Vibecode Kit v5.0 — BƯỚC 2 (RRI) Output
> Date: 2026-10-16
> Focus phiên này: **chốt công nghệ + thư viện cho từng nghiệp vụ** và phạm vi go-live.
> Nguồn: `00-PROJECT-CONTEXT.md` (scan), OPCHUB-SRS-2.0 (`dac-ta.html`), phỏng vấn Chủ nhà.

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
| REQ-011 | Quản lý TK quản trị + 2FA TOTP bắt buộc cho Admin (QT-18) | P0 | Super Admin | TBD |
| REQ-012 | Hồ sơ cá nhân/DN, ảnh đại diện, SSO đã liên kết (UP-06) | P1 | Thành viên | TBD |
| REQ-013 | Lưu vết đồng ý điều khoản (phiên bản + thời điểm) | P0 | Thành viên | TBD |
| REQ-014 | Xóa tài khoản / rút đồng ý (NĐ 13/2023, QT-17) | P1 | Thành viên | TBD |

### D2 — Phí thành viên & đối soát (GĐ1)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-020 | Popup Gói dịch vụ bắt buộc, không đóng được khi phí Chờ TT/Hết hạn; vẫn cho Tư vấn + Đăng xuất (UP-07, BR-03) | P0 | Thành viên | TBD |
| REQ-021 | API trả `402 MEMBERSHIP_REQUIRED` cho route cần phí; WS `membership.updated` đóng popup | P0 | Thành viên | TBD |
| REQ-022 | Sinh Mã TV + nội dung CK `OPCHUB [Mã TV] [SĐT]` + QR VietQR, số tiền 600.000đ | P0 | Thành viên | TBD |
| REQ-023 | Webhook báo tiền về qua adapter chung (SePay trước), verify chữ ký, idempotent theo mã GD | P0 | Hệ thống | TBD |
| REQ-024 | Quét bù định kỳ 2' qua API nhà cung cấp (QT-23) | P0 | Hệ thống | TBD |
| REQ-025 | Hàng đợi giao dịch không khớp, Admin gán GD cho thành viên (QT-21) | P0 | Admin | TBD |
| REQ-026 | Job hằng ngày chuyển Sắp hết hạn (≤30d) / Hết hạn (QT-20, BR-05) | P0 | Hệ thống | TBD |
| REQ-027 | Lịch sử kỳ phí (`membership_period`), gia hạn cộng nối tiếp (BR-05) | P0 | Hệ thống | TBD |
| REQ-028 | Admin Phí: KPI, lọc, Ghi nhận đã thu, Gia hạn 12 tháng, Gửi nhắc đơn/hàng loạt (AD-03, QT-04) | P0 | Admin | TBD |
| REQ-029 | Hủy ghi nhận nhầm / hoàn tiền (QT-24) | P1 | Admin | TBD |
| REQ-030 | Nhắc phí tự động trước 30/7/1 ngày (QT-25) | P1 | Hệ thống | TBD |

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
| REQ-068 | Chủ đề do thành viên tạo trong phòng (QT-33) | P2 | Thành viên | TBD |

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
| REQ-124 | RBAC cấu hình được: Super Admin toàn quyền (khóa cứng); Quản trị viên / Điều phối viên / Thành viên bật-tắt theo 14 quyền của prototype (m.view, m.edit, m.role, c.create, c.room, c.mod, p.edit, p.pub, e.edit, e.reg, n.edit, s.cfg, s.role, s.log); chỉ ai có `s.role` mới sửa được | P0 | Super Admin | TBD |
| REQ-127 | Vai trò ngữ cảnh Chủ nhóm theo `group_id` (thành viên thường được bổ nhiệm); nhóm chưa có chủ nhóm → Admin xử lý yêu cầu thay | P0 | Admin, Chủ nhóm | TBD |
| REQ-125 | Audit log mọi thao tác Admin + log xuất dữ liệu cá nhân (BR-13) | P0 | Hệ thống | TBD |
| REQ-126 | Danh sách Admin: 10/trang, Chọn tất cả theo trang, tự lùi trang khi lọc, bảng → thẻ trên mobile (BR-12) | P0 | Admin | TBD |

### D8 — Sau go-live (feature flag, GĐ3)
| REQ-ID | Requirement | Priority | Persona | TIP |
|---|---|---|---|---|
| REQ-140 | Bot: persona, kịch bản, lịch, khung giờ, nhóm gán (AD-05, QT-07, BR-10) | P2 | Admin | TBD |
| REQ-141 | Bot AI: Claude API sinh chủ đề / trả lời → hàng chờ duyệt; nút tắt khẩn cấp + ẩn tin bot | P2 | Admin | TBD |
| REQ-143 | Hỗ trợ người dùng qua email (hiển thị trên popup thanh toán, footer, trang lỗi) | P0 | Thành viên | TBD |
| REQ-142 | Dịch vụ tư vấn: form theo đối tượng, phiếu YC-xxxx, tiến trình, phụ trách, bình luận gắn tên (UP-07, AD-09, QT-11) | P2 | Người dùng, Admin | TBD |

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

## OPEN QUESTIONS

| # | Question | Impact | Status / Suggested Resolution |
|---|---|---|---|
| OQ-01 | Cấu hình VPS (CPU/RAM, nhà cung cấp, đặt tại VN?) | Sizing, NĐ 53 | 1 máy đã chốt; đề xuất 4vCPU/8GB tại VN |
| OQ-04 | Thông tin app SSO Google/Facebook/LinkedIn | REQ-002 | Chủ nhà cấp sau — build bằng biến môi trường, nút ẩn khi chưa cấu hình |
| OQ-05 | Claude API key + ngân sách bot | REQ-141 | Để sau (bot sau go-live) |
| OQ-06 | Toàn bộ thanh toán: nhà cung cấp webhook, Mã TV, gói tháng/năm, hóa đơn, hoàn tiền, CK lỗi, miễn phí | D2 | **Để sau.** Build theo default: adapter chung, Mã TV = `TV`+6 số, chỉ gói năm 600k, CK lỗi → hàng đợi không khớp |
| OQ-11 | Tài khoản Zalo OA + ZNS template, chi phí | REQ-015 | **Đã chốt Zalo ZNS (D-25), để sau** |
| OQ-12 | Một MST cho nhiều người đăng ký? | REQ-004 | Mở — đề xuất cho phép, đánh dấu người đăng ký đầu là đại diện |
| OQ-13 | Ai là Chủ nhóm 34 nhóm lúc ra mắt? | REQ-127 | Mở — đề xuất: nhóm chưa có chủ thì Admin duyệt thay, bổ nhiệm dần |
| OQ-14 | Công tắc "tắt OTP" và "tắt bắt buộc vai trò & nhóm" | REQ-123 | **Đóng — bỏ cả hai (D-24)** |
| OQ-15 | Pháp lý: % cổ phần, công bố bot, Điều khoản/Chính sách, hồ sơ NĐ 13, đăng ký BCT / NĐ 147 | Go-live | **Để sau** — build trường % cổ phần ẩn được bằng flag; trang Điều khoản là nội dung tĩnh sửa được |
| OQ-16 | Dữ liệu ban đầu (danh mục, mẫu email, ảnh bìa/nội quy 34 nhóm), nhân sự trực sự cố + kế toán | Go-live | **Để sau** — seed từ prototype |

## SCOPE BOUNDARIES

### In Scope (go-live = GĐ1 + GĐ2)
- D1 Xác thực & tài khoản, D2 Phí & đối soát, D3 Cộng đồng & nhóm, D4 Chat & kiểm duyệt, D5 Sự kiện, D6 Dự án & nhà đầu tư, D7 Dashboard/thông báo/cài đặt
- Hạ tầng native VPS, CI build + deploy script, backup

### Out of Scope (defer)
- Bot tương tác (GĐ3, Claude API + duyệt) — sau feature flag
- Dịch vụ tư vấn / phiếu YC (GĐ3) — sau feature flag
- Kubernetes, OpenSearch, Prometheus/Grafana, Keycloak
- Ngôn ngữ ngoài tiếng Việt
- Cổng thanh toán thẻ/ví, app native, giao dịch đầu tư thực tế
- Hóa đơn điện tử tự động

---

## QUALITY GATE — `/vibecode:rri`

- [x] All P0 requirements identified with REQ-IDs (D1–D7 + NFR)
- [x] Auto-answered items marked
- [x] Decisions log with rationale (D-01 → D-11)
- [x] Open questions listed (OQ-01 → OQ-10)
- [x] Requirements matrix complete
- [x] Applicable Standards — none (no standards index)
- ⚠️ Gap: phiên RRI tập trung tech stack; các P0 nghiệp vụ mới (REQ-010, 025, 026, 043, 106) dùng default đề xuất — Chủ nhà chưa xác nhận từng mục
- ⚠️ Gap: SRS ghi uptime 99,5% + replica; native single-VPS không đạt HA — cần chấp nhận rủi ro (NFR-05)
- Confidence P0: ~85% (cập nhật 2026-10-16 sau trả lời 31 câu hỏi mở)
