# AUDIT-W1 — Nợ kỹ thuật (TECH-DEBT)

> Đo trên `main` @ `70cfcbb`, ngày 18/10/2026. Chỉ nêu vấn đề, không nêu giải pháp.
> **Ảnh hưởng:**
> - **Cao:** chặn go-live hoặc rủi ro pháp lý/bảo mật
> - **TB:** ảnh hưởng vận hành hoặc hiệu năng khi tăng tải
> - **Thấp:** vệ sinh mã
>
> Nguồn: `work/code-review.md` (CR-xx), `work/mechanical.md` (M3/M4/M5/M6), completion report B1–B6.
> Mục nào đã là lỗi hành vi thì nằm ở `BUGS.md` và chỉ được dẫn chéo ở đây.

## Bảng đếm

| Nhóm | Số TD | Cao | TB | Thấp |
|---|---|---|---|---|
| A. Hạ tầng VPS / go-live | 6 | 5 | 1 | 0 |
| B. Adapter chờ secret / nhà cung cấp | 3 | 1 | 2 | 0 |
| C. Dữ liệu giả / số cứng còn trong sản phẩm | 4 | 0 | 2 | 2 |
| D. Ảnh lưu data URL trong DB | 2 | 0 | 2 | 0 |
| E. Bảo mật / tuân thủ | 3 | 1 | 1 | 1 |
| F. Hiệu năng / truy vấn | 4 | 0 | 2 | 2 |
| G. Kiến trúc / outbox / trạng thái | 4 | 1 | 2 | 1 |
| H. Lint / cấu trúc mã / env | 5 | 0 | 1 | 4 |
| I. Test / công cụ kiểm | 5 | 1 | 3 | 1 |
| **Tổng** | **36** | **9** | **16** | **11** |

---

## A. Hạ tầng VPS / go-live

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-001 | Cao | `infra/nginx/opchub.conf:94-101,129-137,166-177`; `snippets/opchub-backend.conf:9` | TLS và HSTS đang comment, chưa có chứng chỉ. | CR-40, L3-02 |
| TD-002 | Cao | `infra/nginx/opchub.conf:46-49` | `set_real_ip_from` Cloudflare chưa bật. Sau CDN, rate limit, khoá 5 lần sai (D-44) và audit IP đều gộp theo IP Cloudflare. | CR-41, D-44 |
| TD-003 | Cao | `infra/env/server.env.example`, `infra/redis/redis.conf.snippet:2`, `infra/pgbouncer/userlist.txt.example` | `CHANGE_ME` và secret trống (JWT, webhook, SMTP, S3, `DATA_ENC_KEY`); Redis chưa có `requirepass`. | CR-42, L3-04→11 |
| TD-004 | Cao | `infra/scripts/check-syntax.sh`; B6-completion "Chưa làm" | Chưa chạy `nginx -t`, `systemd-analyze verify`, `shellcheck` trên máy đích. Chưa có staging. k6 chưa đo qua nginx + PgBouncer (số §14.2 chỉ đo trên máy dev). | CR-18, B66 |
| TD-005 | Cao | `infra/env/backup.env.example`, `infra/backup/restore.md:46`, `infra/monitoring/slo.md:37` | Backup offsite chưa có remote, chưa có PITR (`pg_basebackup`), chưa diễn tập khôi phục. RPO/RTO §14 chưa chứng minh. | CR-43, L3-08 |
| TD-006 | TB | `infra/env/health.env.example` (`ALERT_WEBHOOK_URL`), `SENTRY_DSN` (chưa có SDK); `infra/systemd/*.service`, `restore.md:52` | Chưa có cảnh báo sự cố và theo dõi lỗi. Đường dẫn cứng giả định Ubuntu và Postgres 16. | CR-44, CR-45 |

## B. Adapter chờ secret / nhà cung cấp

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-007 | Cao | `packages/integrations/src/bank-webhook/sepay.provider.ts:41,48` | Header chữ ký `x-sepay-signature` và endpoint SePay là giả định, chưa đối chiếu tài khoản thật. Nếu sai thì đối soát tự động không chạy. Ngoài ra nginx không chặn IP webhook (BUG-032). | CR-01, CR-33, OQ-06, D-07 |
| TD-008 | TB | `packages/integrations/src/tax-lookup/esgoo.provider.ts:21` | Chưa rõ hạn mức gọi ESGOO. | CR-02, D-17 |
| TD-009 | TB | `apps/server/src/modules/account/services/sso.service.ts:52`; `BANK/TAX/SSO_PROVIDER=fake`; `FakeLlmProvider`, Zalo ZNS | SSO thật, LLM thật và Zalo ZNS chưa có adapter chạy được với nhà cung cấp thật. `redirect_uri` của SSO phụ thuộc hành vi riêng của fake (BUG-034). | M2 ghi chú, OQ-04, D-16, D-25 |

## C. Dữ liệu giả / số cứng còn trong sản phẩm

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-010 | TB | `apps/server/src/modules/dashboard/dashboard-live.service.ts:19-21` | Bộ mô phỏng prototype nằm trong code server production (BUG-012). | CR-23 |
| TD-011 | TB | `portal community/media.ts`, `events/media.ts`, `admin events/media.ts`, `packages/ui/src/group-card/group-media.ts:14` | Ảnh Unsplash, picsum, randomuser hotlink theo id; bỏ qua `coverUrl` (BUG-011). Phụ thuộc CDN ngoài, trái D-36. | CR-22, CR-25 |
| TD-012 | Thấp | `apps/admin/messages/vi/overview.json`, `portal/messages/vi/dashboard.json:5`, `auth.json:9`, `packages/shared/src/fixtures/auth-hero.ts`, `growth-chart.tsx:8` | Số, chuỗi `dateRange` "01/10/2026 – 15/10/2026" và trục biểu đồ viết cứng trong i18n hoặc fixture. `@opchub/shared/fixtures` được import vào code app production. | CR-15, CR-24 |
| TD-013 | Thấp | `project-read.service.ts` (Q-B32-1); `portal shell/nav.ts:25`; `composer.tsx:23-24` | Nội dung tab dự án, badge chat 18 và tệp mẫu `DEMO_FILE` vẫn ở trong code app (BUG-010, 028, 038). | CR-05, CR-12, CR-26 |

## D. Ảnh lưu data URL trong DB

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-014 | TB | `packages/shared/src/api-domains/group-admin.ts:22`, `event-admin.ts:31` (≤ 2.000.000), `settings-admin.ts:20` (≤ 2.800.000); FE `readAsDataURL` ở 5 chỗ | Ảnh bìa nhóm, sự kiện, logo, persona và ảnh dự án lưu base64 trong cột DB. Mỗi dòng có thể tới khoảng 2 MB, làm phình payload danh sách, cache Redis và backup. Ảnh không đi qua kiểm `head()` của storage. Riêng dự án: server có kind `project-cover` nhưng FE không dùng. | CR-09, D-09, D-36 |
| TD-015 | TB | `apps/server/src/main-api.ts` / bootstrap HTTP (không có limit) so với nginx `client_max_body_size 1m` và zod tới 2,8MB | Ba lớp giới hạn kích thước (zod, body-parser, nginx) không thống nhất. Đây là gốc của BUG-002, BUG-003 và BUG-037. | M3 |

## E. Bảo mật / tuân thủ

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-016 | Cao | `totp.service.ts:22,32`; `sso-tab.tsx:62` | TOTP Admin là mã chết; `requireAdmin2fa` không được đọc. Chưa đạt ASVS L2 §14 (BUG-015). | CR-14, D-27, D-33 |
| TD-017 | TB | Comment, project, campaign body | Không làm sạch HTML ở biên server cho chuỗi người dùng (BUG-020). Phụ thuộc hoàn toàn vào việc FE escape. | `xss-comment` |
| TD-018 | Thấp | `auth.controller.ts:66`, `password.controller.ts:74`; socket handshake | Không có rate limit riêng cho logout, revoke-others; socket không giới hạn tốc độ kết nối. | CR-35 |

## F. Hiệu năng / truy vấn

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-019 | TB | `apps/server/src/common/outbox/outbox-relay.service.ts:48-65` | Handler outbox chạy tuần tự trong transaction đang giữ khoá lô (`FOR UPDATE SKIP LOCKED`). Handler chậm (mail, Redis) giữ kết nối PgBouncer lâu. | CR-36 |
| TD-020 | TB | `project.repository.ts:50-52`, `project-admin.repository.ts:21`, `group.repository.ts:32`, `service-admin.service.ts:58`, `investor-admin.repository.ts:38`, `message.repository.ts:71` | Tìm kiếm `ILIKE '%q%'` không có index trigram, trong khi D-08 chọn FTS + unaccent + pg_trgm. Sẽ seq scan khi bảng lớn. | CR-39, D-08 |
| TD-021 | Thấp | `project.prisma:127` so với `project.repository.ts:31` | `project_members` thiếu index theo `user_id` cho `visibleTo`. | CR-38 |
| TD-022 | Thấp | `reconcile.service.ts:49,56`, `admin-fees.service.ts:123`, `project-social.service.ts:157` | Truy vấn hoặc transaction trong vòng lặp (hai chỗ có chủ đích). Chia sẻ dự án gửi tuần tự từng nhóm. Portal dự án tải `size=100` rồi phân trang ở client (DV-G3b-2). | CR-37 |

## G. Kiến trúc / outbox / trạng thái

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-023 | Cao | `outbox-relay.service.ts:69-74` | Sự kiện outbox không có handler vẫn bị đánh dấu dispatched. Sự kiện mất vĩnh viễn, không replay được khi bổ sung consumer (`user.locked` đã phát ra từ trước). | CR-06, M1 |
| TD-024 | TB | `investor-admin.repository.ts:110`; `bot-thread.service.ts:99`; `project-status.ts:22`; `event.repository.ts:114`; `services-admin.ts:27` | Máy trạng thái §8 lệch ở 5 domain: thiếu hàm transition hoặc điều kiện `WHERE status`, thiếu trạng thái "Đang chạy" của bot, thừa cạnh và thừa trạng thái `done` (BUG-007, 033, 041). | M4 |
| TD-025 | TB | `investor_admin_notes` / `investor_thread_messages` | Hai mô hình dữ liệu song song cho cùng một luồng trao đổi nhà đầu tư (BUG-006). | UAT-20 |
| TD-026 | Thấp | `packages/shared/src/permissions.ts:3,5`; FE login-screen, admins-tab, use-admins | Danh mục quyền có key chết (`m.role`, `p.edit`). FE kiểm tên vai trò ở 10 chỗ (BUG-035, 042). | M5 |

## H. Lint / cấu trúc mã / env

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-027 | TB | 26 `<img>` trong app (14 có `eslint-disable no-img-element`, 12 không) + 15 trong `packages/ui`; `next.config.ts` không có `images.remotePatterns` | Chưa dùng `next/image`, không tối ưu ảnh. Build ra 12 cảnh báo. | CR-03, D-36 |
| TD-028 | Thấp | `packages/ui/src/globals.css:11-12`, `theme/tokens.ts:6` | Noto Sans chưa tự host. | CR-27, D-37 |
| TD-029 | Thấp | `apps/*/.next-server/**` | Thư mục build e2e chế độ server nằm trong cây app, dễ bị grep hoặc lint quét nhầm. | CR-04 |
| TD-030 | Thấp | `apps/admin/src/features/{members,requests,settings}/components/confirm-dialog.tsx`; `packages/ui/src/app-shell/` | Ba hộp xác nhận trùng nhau. App shell thiếu trạng thái `collapsed` (BUG-027, 044). | CR-47, CR-48 |
| TD-031 | Thấp | `env.schema.ts:27,63,65`; `infra/env/*.env.example`; `packages/db/.env.example`; `apps/server/test/setup/env.ts:11,19` | 15 lệch giữa env zod và `.env.example`: thiếu khoá, hoặc khoá thừa không schema nào đọc (`SENTRY_DSN`, `DATABASE_URL` ở `packages/db`). | M6 #1–15 |

## I. Test / công cụ kiểm

| TD | Ảnh hưởng | Vị trí | Vấn đề | Nguồn |
|---|---|---|---|---|
| TD-032 | Cao | `e2e/behavior/**`, `apps/*/src/mocks/**` | Test được viết theo prototype và MSW, chưa theo đặc tả. Chỉ 43,5% REQ/D/BR/QT/UAT/§11 có test đủ. 27 dòng không có test nào. Cả 4 lỗi đã biết đều không có test bắt (TEST-GAPS §1). | TEST-GAPS |
| TD-033 | TB | `e2e/behavior/admin-settings.spec.ts:222`, `admin-marketing.spec.ts:53,113` + 10 nhánh khác | 13 nhánh `onServer` làm yếu assertion trên server thật (bỏ hẳn hoặc nới thành regex). | TEST-GAPS §4 |
| TD-034 | TB | `apps/server/test/**` | Không có test âm về kích thước body, không có test consumer outbox cho từng loại sự kiện, không có test tick worker bot/nhắc phí. Ba lỗ hổng này khớp với BUG-002, BUG-004 và BUG-008. | TEST-GAPS, M1, M3 |
| TD-035 | TB | `e2e/behavior/**` | Không có e2e đi theo link trong mail (mail_logs xoá `body_html`, FakeMail giữ thư trong RAM worker). Luồng mail → màn đích không kiểm được tự động (BUG-001, BUG-023). | forms.audit.ts |
| TD-036 | Thấp | `apps/portal/src/features/auth/components/login-hero.tsx:18` | SSR phụ thuộc `Date.now()`, nên parity và audit chạy với clock giả sẽ gặp hydration #418 (BUG-040). Đây là nhiễu đo lường cho mọi bộ kiểm có cài clock. | walk |

## Ghi chú về script audit (ngoài gate)

- `e2e/audit/**` qua được `tsc -p e2e/tsconfig.json`, nhưng `eslint audit` còn 11 lỗi:
  - 6 chỗ đọc `process.env` trực tiếp (`AUDIT_*`);
  - 3 chỗ `require-await`;
  - 1 chỗ `max-lines-per-function`;
  - 1 chỗ `no-base-to-string`.
- Script `lint` của e2e (`eslint parity behavior env.ts urls.ts`) không quét `audit/`, nên không chặn gate.
- Phải sửa trước nếu muốn đưa audit vào CI.
