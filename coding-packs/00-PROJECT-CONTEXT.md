# OPCHUB — Project Context (Scan Report)

> Vibecode Kit v5.0 — BƯỚC 1 (SCAN)
> Coding workspace: `D:\CODING\OPCHUB\CODING`
> Scanned: 2026-10-16
> Scan type: **Greenfield + spec-driven** (chưa có source code; có SRS v2.0 + prototype tương tác)

---

## SCAN REPORT

### Workspace inventory

```
D:\CODING\OPCHUB\CODING\
├── coding-packs/                                   ← tạo bởi /vibecode:scan
└── OPCHUB Thiết kế giải pháp cộng đồng/
    └── deploy/                                     ← gói thiết kế tĩnh (không phải source sản phẩm)
        ├── README.md         Hướng dẫn deploy + tài khoản demo
        ├── dac-ta.html       243 KB — Đặc tả OPCHUB-SRS-2.0 (bản nghiệm thu, 16 mục)
        ├── index.html        820 KB — Prototype tương tác (User Portal + Admin), dữ liệu giả lập
        ├── support.js        69 KB  — "dc-runtime" (generated, render template x-dc bằng React)
        ├── doc-page.js       39 KB  — khung trang in A4 cho dac-ta.html
        └── assets/           opchub-logo.png, vcb-qr.png
```

- Không có git repo, không có package.json, không có test, không có .env. **0 dòng code sản phẩm.**
- Prototype `index.html`: 1 template `<x-dc>` (~509 KB markup, 328 `sc-if`, 240 `sc-for`) + 1 script ~280 KB chứa state, i18n, seed data. Đây là **tài liệu UI tham chiếu**, không tái sử dụng làm code. [SoT: deploy/index.html]

### TECH_STACK

Hiện trạng: không có. Phương án **đề xuất (baseline, chờ Kiến trúc sư duyệt)** theo SRS §3.3: [SoT: dac-ta.html §3.3]

| Layer | Đề xuất |
|---|---|
| Frontend | Next.js 14, TypeScript, Ant Design 5 (Admin: Ant Design Pro), TanStack Query; SSR trang công khai; responsive 360px+ / PWA |
| Backend | NestJS + Prisma, **modular monolith**, worker tách riêng |
| Realtime | Socket.IO + Redis adapter |
| Workers (BullMQ) | mail (retry 5, backoff), reconcile (webhook + quét bù 2'), bot (tick 1'), export (≤2 job song song) |
| Database | PostgreSQL primary + replica; Redis (cache, presence); S3 object storage; OpenSearch |
| Identity | Keycloak OIDC + Identity Brokering (Google/Facebook/LinkedIn; ChatGPT/Gemini/DeepSeek = nút riêng đi qua Google); JWT 15' + refresh 7d xoay vòng; 2FA admin |
| Integrations | Brevo SMTP; SePay/Casso/PayOS webhook HMAC → TK VCB 1203132809; tra cứu MST (nguồn chưa chốt); Google Maps embed; GitHub/GitLab link |
| Infra | Docker, Kubernetes (portal×2, admin×2, api×3, socket×2, 4 worker), GitLab CI/CD, Dev→Staging→Prod, Prometheus/Grafana/Loki, Sentry, Vault/K8s Secret |

> ⚠️ Lưu ý: global CLAUDE.md của người dùng có rule backend nhắc Rust/Go/Python/Node và SQL theo PostgreSQL — tương thích với NestJS + PostgreSQL. Stack cần **chốt ở RRI**.

### EXISTING_MODULES (theo spec — chưa có code)

**Backend modules** [SoT: §3.2]

| Module | Trách nhiệm | Bảng chính |
|---|---|---|
| Account | Đăng ký, OTP, login, SSO, hồ sơ, khóa/mở | user, business_profile, sso_link, otp |
| Membership | Trạng thái phí, nội dung CK, đối soát, gia hạn, nhắc | membership_fee, payment_txn |
| Community | Nhóm tỉnh/thành, thành viên, duyệt, gán, xuất | community_group, group_member |
| Chat | Phòng, tin, reply, reaction, @mention, ghim, tìm | room, message, reaction |
| Moderation | Từ khóa nhạy cảm, báo cáo, xử lý | report, keyword |
| Event | Sự kiện online/offline, đăng ký | event, event_registration |
| Project | Dự án, đội ngũ, repo, gọi vốn, góp ý, duyệt | project, project_member, funding, comment |
| Investor | Quan tâm đầu tư, gộp NĐT, trao đổi | investor_interest, investor_comment |
| Service Request | Phiếu YC-xxxx, trạng thái, phụ trách, bình luận nội bộ | service_request, request_comment |
| Bot Engine | Persona, kịch bản, lịch, khung giờ, tự sinh, tự trả lời | persona, script, sim_thread |
| Mail / Notification | Email OTP/chào mừng/nhắc phí; in-app | mail_template, mail_log, notification |
| Settings / Audit / Export | Danh mục, phân quyền, SMTP, nhật ký | category, role_perm, smtp_config, audit_log |

**Routes / screens** [SoT: §5, prototype `screen`/`pTab`/`aTab`]

- Auth (`screen:'auth'`): AU-01 Login · AU-02 SSO · AU-03 chọn loại TK · AU-04 ĐK cá nhân · AU-05 ĐK DN + tra MST · AU-06 OTP · AU-07 email chào mừng · AU-08 quên MK · AU-09 đăng xuất
- User Portal (`screen:'portal'`, `pTab`): UP-01 dashboard · UP-02 community · UP-03 chat · UP-04 events · UP-05 projects · UP-06 profile · UP-07 services (popup Gói dịch vụ, **bắt buộc khi chưa đóng phí**) · UP-08 thông báo
- Admin (`screen:'admin'`, `aTab`, sidebar 1 cấp 10 mục): AD-01 overview · AD-02 members · AD-03 fees · AD-04 groups (+tab Kiểm duyệt tin nhắn) · AD-05 bot · AD-06 events · AD-07 projects · AD-08 investors · AD-09 services · AD-10 settings (chung, danh mục, phân quyền, email chào mừng, SMTP, TK quản trị, nhật ký)

**API** (base `https://api.opchub.community/v1`) — 11 nhóm: Auth, Membership (gồm `POST /webhooks/bank`), Users, Groups, Chat (REST + WS), Bot, Events, Projects, Investors, Services, Settings. WS events: `room.join/leave`, `message.send/new/react/pin`, `member.request`, `notification.new`, `membership.updated`. [SoT: §13]

### Database schema (ERD) [SoT: §9]

~28 thực thể: user · business_profile · sso_link · otp · membership_fee · payment_txn · community_group · group_member · room · message · reaction · report · keyword · event · event_registration · project · project_member · comment · funding · investor_interest · investor_comment · service_request · request_comment · persona · script · sim_thread · mail_template · mail_log · category · notification · audit_log · smtp_config · role_perm.

Quan hệ chính: user 1–0..1 business_profile · user 1–1 membership_fee (lịch sử ở payment_txn) · user n–n community_group qua group_member (role owner/moderator/member) · group 1–n room 1–n message (`is_simulated`, `sender_id | persona_id`) · project 1–0..1 funding 1–n investor_interest · service_request 1–n request_comment (`mentions[]` → notification) · persona n–n group.

### State machines [SoT: §8]

| Đối tượng | Trạng thái |
|---|---|
| Tài khoản | Hoạt động ⇄ Đã khóa (không có "Chờ xác minh") |
| Phí thành viên | Chờ thanh toán → Đang hiệu lực → Sắp hết hạn (≤30d) → Hết hạn → (gia hạn) Đang hiệu lực |
| Yêu cầu vào nhóm | Chờ duyệt → Thành viên \| Từ chối \| Hủy |
| Dự án | Nháp → Chờ duyệt → Đang hiển thị ⇄ Đã ẩn \| Cần chỉnh sửa→Chờ duyệt \| Bị từ chối |
| Báo cáo tin | Mới → Đã xử lý (bỏ qua/ẩn/cảnh báo/khóa) |
| ĐK sự kiện | Đã đăng ký → Đã tham dự \| Đã hủy |
| Phiếu YC | Mới → Đang tư vấn → Đã báo giá → Thành công \| Từ chối (mở lại) |
| Quan tâm đầu tư | Đã gửi → Đang trao đổi (auto khi admin bình luận đầu) → Đã kết nối |
| Hội thoại bot | Chờ lịch → Đang chạy → Hoàn tất |

### PATTERNS_DETECTED

- **Paywall gate toàn Portal**: phí chưa hiệu lực → popup không đóng được; API trả `402 MEMBERSHIP_REQUIRED`; WS `membership.updated` đóng popup. [§5.2 UP-07, §13.2]
- **Đối soát CK theo nội dung**: `OPCHUB [Mã TV] [SĐT]` + 600.000đ; webhook HMAC-SHA256 + quét bù 2'; fallback Admin "Ghi nhận đã thu"; idempotency (không trùng kích hoạt). [QT-03, QĐ-01]
- **RBAC 4 vai trò hệ thống** (Super Admin / Quản trị viên / Điều phối viên / Thành viên) + **vai trò ngữ cảnh Chủ nhóm** theo `group_id`. Vai trò lúc đăng ký (Chuyên gia, Giảng viên, Kỹ sư, Nhà đầu tư…) chỉ là thuộc tính hồ sơ. [§2]
- **Auth flow**: đăng ký → OTP email 6 số/10' → Active ngay; email chào mừng có mật khẩu tạm (bắt buộc đổi lần đầu); khóa tạm 15' sau 5 lần sai; reset link 15', 3 lần/giờ, thu hồi mọi phiên.
- **Admin list convention**: phân trang 10/trang (Sự kiện 9, Nhóm 12, Cộng đồng Portal 9); "Chọn tất cả" chỉ trang hiện tại; tự lùi trang khi lọc; xuất CSV; mobile → bảng thành thẻ. [BR-12]
- **Audit bất biến** mọi thao tác Admin + log xuất dữ liệu cá nhân. [BR-13]
- **API conventions**: JSON UTF-8, ISO 8601 UTC, tiền = số nguyên VND, `?page&size → {items,page,size,total}`, `?sort=-created_at`, `Idempotency-Key` cho thanh toán/YC/quan tâm đầu tư; error codes 400/401/402/403/404/409/422/429. [§13.1–13.2]
- **Bot persona**: tin mô phỏng `is_simulated` (không hiện nhãn với user); chỉ đăng trong nhóm gán + khung giờ.
- **Rich text**: trình soạn thảo + sanitize allowlist (sự kiện, dự án, email chào mừng, bình luận YC).
- **i18n (prototype)**: 10 ngôn ngữ ASEAN+ (vi, en, th, zh, id, ms, fil, km, lo, my); SĐT có cờ + mã quốc gia ASEAN. ⚠️ SRS §14 chỉ ghi "tiếng Việt" → cần chốt.

### REUSABLE_COMPONENTS (từ prototype — tái tạo bằng AntD, không copy code)

- Seed/danh mục dùng làm migration seed: 34 tỉnh/thành mới (`PROVINCES` + vùng), danh mục lĩnh vực `CAT_SEED` (tên, màu, scope project/biz), vai trò đăng ký `REG_ROLES`, danh mục dịch vụ `SVC_SEED` (OPC cấp tỉnh G2B, trường ĐH/CĐ B2B, …), trạng thái YC `RQ_ST`, mẫu email chào mừng `WELCOME_TPL`, persona/script seed. [SoT: index.html script]
- UI patterns cần dựng component chung: Rich editor + SafeHTML, popup bắt buộc (non-closable modal), bảng Admin có bulk-select + export + pagination, thẻ nhóm có ảnh bìa, panel chi tiết dạng drawer, timeline trao đổi 2 chiều, chip trạng thái theo bảng màu.
- Assets: `opchub-logo.png`, `vcb-qr.png`.

### GAPS_DETECTED

1. **Chưa có source code, repo git, CI** — toàn bộ là greenfield.
2. **Mâu thuẫn trạng thái Phiếu YC**: SRS = Mới → Đang tư vấn → Đã báo giá → Thành công/Từ chối; prototype có thêm `won`="Đã chốt" + `done`="Hoàn thành". Cần chốt.
3. **Ngôn ngữ**: prototype 10 ngôn ngữ vs SRS "tiếng Việt".
4. **Quan hệ user–membership_fee 1–1** nhưng gia hạn/lịch sử nằm ở payment_txn → cần bảng lịch sử kỳ phí rõ ràng (đề xuất `membership_period`).
5. **Phí 50.000đ/tháng nhưng thu 600.000đ/năm** — chỉ gói năm? Có gói khác không?
6. **Mã TV** (`TV000123`) — quy tắc sinh chưa đặc tả.
7. **Vấn đề mở SRS §16**: nguồn tra cứu MST/VSIC; danh mục & quyền lợi dịch vụ chính thức; chính sách công bố thành viên mô phỏng; miễn trừ thông tin gọi vốn.
8. **OpenSearch** có trong kiến trúc nhưng chưa có use case cụ thể (tìm tin chat?) — có thể bỏ ở MVP, dùng Postgres FTS/trigram.
9. **Quyền xóa tài khoản (NĐ 13/2023)** có trong NFR nhưng không có chức năng/API tương ứng.
10. **Notification preferences**, xóa/sửa tin nhắn chat, giới hạn file upload trong chat — chưa đặc tả.
11. "Đã tham dự" (check-in sự kiện) — không có chức năng/API ghi nhận.

### CODE_HEALTH

| Metric | Value |
|---|---|
| Source code | Không có (greenfield) |
| TypeScript strict / ESLint | N/A |
| Tests | 0 (SRS nói prototype chạy 44 bước auto, đạt 100% — script không có trong folder) |
| Console.logs (prototype) | 0 |
| Git | Chưa init |

### ESTIMATED_SIZE (ước lượng build theo SRS)

- Màn hình: 9 auth + 8 portal + 10 admin (≈ 25 sub-tab) → ~45 view
- API: ~70 endpoint REST + 8 WS event
- Bảng DB: ~33
- Worker: 4 (mail, reconcile, bot, export)
- Timeline SRS: 16 tuần, team 1 PO + 1 TL + 2 FE + 3 BE + 1 DevOps + 2 QA + 1 UI/UX
- LoC ước tính: FE ~35–45k, BE ~30–40k

---

## Auto-Answered Requirements (for RRI — skip these)

- Mục tiêu, đối tượng, phạm vi/ngoài phạm vi [§1]
- RBAC đầy đủ (ma trận quyền 5 cột) [§2]
- Luồng nghiệp vụ QT-01 → QT-13 với quy tắc/ngoại lệ [§7]
- Business rules BR-01 → BR-13 [§12]
- Thông báo & email matrix [§11]
- API catalogue + conventions + error codes + WS events [§13]
- NFR & SLO: API p95 <300ms; tin nhắn <500ms; list <2s 4G; OTP <30s; đối soát <5'; 5xx <0,5%; uptime 99,5%; RPO 24h / RTO 4h; 100k TK, 5k socket; OWASP ASVS L2; WCAG 2.1 AA; NĐ 13/2023 [§14]
- Load test: ĐK 200/phút p95<800ms; chat 5k conn 50 msg/s p95<500ms; admin 100 phiên p95<400ms; 1.000 CK/giờ đối soát <5' [§14.2]
- UAT-01 → UAT-31 + tiêu chí nghiệm thu [§15]
- Lộ trình 4 GĐ / 16 tuần + mốc M0–M4 [§16]
- QĐ-01 (webhook trung gian + fallback thủ công), QĐ-02 (3 trạng thái NĐT), QĐ-03 (tab kiểm duyệt trong Nhóm) [§16.5]
- Bảo mật: rate-limit login 10/phút, OTP 3/15', API 100/phút, auth 20/phút; upload ảnh MIME + 5MB; TLS 1.2+; at-rest encryption [§3.6]

## Questions for RRI (còn mở)

1. Chốt stack (NestJS/Prisma theo SRS, hay khác?) + quy mô hạ tầng MVP (K8s ngay hay docker-compose/VPS trước?)
2. Keycloak hay auth tự viết (NestJS + Passport) cho MVP?
3. Phạm vi MVP: theo GĐ 1 (lõi) hay full 16 tuần? Team thực tế là ai (AI agents / người)?
4. i18n: chỉ vi, hay vi+en, hay 10 ngôn ngữ như prototype?
5. Trạng thái phiếu YC (gap #2), mã TV, gói phí (gap #5, #6)
6. Nhà cung cấp webhook ngân hàng cụ thể (SePay / Casso / PayOS)
7. Nguồn tra cứu MST
8. Monorepo layout (portal + admin chung app hay 2 app Next.js?)
9. Xóa tài khoản / quyền dữ liệu cá nhân

## Constraints

- **Global CLAUDE.md (bắt buộc)**: backend 200–400 dòng/file (cap 600); frontend 150–250 (cap 400); màn hình chính chỉ orchestrate, tách `components/`, `hooks/`, `types.ts`; test ở file riêng; tách domain rõ ràng.
- **PostgreSQL rules (bắt buộc)**: composite index "bằng trước, khoảng/sort sau"; covering index `INCLUDE`; deferred join cho phân trang (mọi danh sách Admin đều phân trang → áp dụng rộng); partial index (vd. `membership_fee WHERE status IN ('pending','expiring')`); expression index (`LOWER(email)`).
- **Git**: commit ngay khi xong + test pass; báo DONE kèm git SHA. → **cần `git init`** trước khi build.
- Tên đường dẫn thư mục thiết kế có dấu + khoảng trắng → tooling nên tham chiếu bằng quoted path hoặc copy spec vào `docs/`.
- UI: Ant Design, phẳng, tiếng Việt, responsive 360px+, WCAG 2.1 AA.
- Thanh toán chỉ chuyển khoản VCB; không cổng thẻ/ví; không giao dịch đầu tư thực.

## Risks / Tech Debt

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| Kiến trúc SRS nặng (K8s, Keycloak, OpenSearch, 4 worker) cho MVP | Cao | Đề xuất đơn giản hóa ở Vision; giữ ranh giới module để scale sau |
| Webhook báo tiền về gián đoạn / trùng kích hoạt | Cao | Idempotency theo `txnId`, quét bù, fallback thủ công (QĐ-01) |
| Bot persona (thành viên mô phỏng) — rủi ro pháp lý/uy tín | Trung bình | Công bố trong Điều khoản; flag tắt được |
| Nguồn MST không ổn định | Trung bình | Cache + nhập tay |
| Email OTP vào spam / vượt hạn mức Brevo (free 300/ngày) | Trung bình | SPF/DKIM/DMARC; nâng gói |
| Paywall chặn toàn Portal → giảm conversion | Trung bình | Quyết định sản phẩm, đã chốt trong BR-03 |
| Spec và prototype lệch nhau ở vài chi tiết | Thấp | Ưu tiên SRS; liệt kê lệch ở GAPS |

---

*[SoT: dac-ta.html = OPCHUB-SRS-2.0 (10/2026, Media Soft, trạng thái "Chờ nghiệm thu"); index.html = OPC Hub Community v4 Ant prototype]*
