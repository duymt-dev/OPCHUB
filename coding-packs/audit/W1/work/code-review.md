# AUDIT-W1 · Làn C — Rà code và tài liệu

> Ngày rà: 18/10/2026 · nhánh `main` @ `70cfcbb` · chỉ đọc, không sửa code.
> Mức: **S1** chặn go-live · **S2** sai nghiệp vụ · **S3** UX · **S4** nhỏ.
> Loại: `bug` · `nợ-giả` (dữ liệu giả/tạm) · `nợ-dataurl` · `nợ-adapter` (chờ secret) · `nợ-lint` · `nợ-vps` (cấu hình chưa kiểm VPS) · `hiệu-năng` · `bảo-mật`.
> Đường dẫn tương đối gốc repo. Bản này chỉ mô tả vấn đề, không đề xuất cách sửa.

## Tổng hợp

| Mức | Số phát hiện |
|---|---|
| S1 | 7 |
| S2 | 14 |
| S3 | 15 |
| S4 | 12 |
| **Tổng** | **48** |

| Loại | Số |
|---|---|
| bug | 15 |
| nợ-giả | 11 |
| nợ-dataurl | 1 |
| nợ-adapter | 2 |
| nợ-lint | 2 |
| nợ-vps | 7 |
| hiệu-năng | 4 |
| bảo-mật | 6 |

Loại tính theo nhãn đầu tiên của mỗi phát hiện (CR-03 tính là nợ-lint, CR-42 là nợ-vps).

---

## a. TODO / FIXME / HACK

Quét `apps/*/src`, `packages/*/src`, `packages/db/seed`, `infra/`: **không có FIXME, HACK hay XXX**. Chỉ có 2 TODO, đều gắn OQ-06:

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-01 | nợ-adapter | S1 | `packages/integrations/src/bank-webhook/sepay.provider.ts:41` (verify ở `:48`) | Header chữ ký `x-sepay-signature` và endpoint `my.sepay.vn/userapi` là giả định. Chưa đối chiếu với tài khoản SePay thật. Nếu sai header thì mọi webhook bị từ chối và đối soát tự động không chạy. | OQ-06, D-07, QĐ-01, L3-04, UAT-09 |
| CR-02 | nợ-adapter | S3 | `packages/integrations/src/tax-lookup/esgoo.provider.ts:21` | Chưa rõ hạn mức gọi ESGOO. Vượt hạn mức thì tra MST lỗi và người dùng phải nhập tay. | OQ-06, D-17, L3-07, UAT-05 |

Ngoài marker TODO, mã nguồn còn khoảng 15 chú thích dạng "tạm … chờ Q-xx". Các chỗ này được ghi ở mục c và e.

---

## b. `eslint-disable`

Tổng 98 dòng. Trong đó 59 là header `/* eslint-disable */` của code sinh: 56 file Prisma ở `packages/db/src/generated/*`, 2 `mockServiceWorker.js`, 4 runtime turbopack trong `.next-server` (thư mục build, không phải mã nguồn). Còn lại 33 chỗ viết tay:

| Rule | Số | Vị trí | Đánh giá |
|---|---|---|---|
| `@next/next/no-img-element` | 14 | portal: `chat/components/group-preview.tsx:24`, `group-rail.tsx:38`, `topic-list.tsx:81,87`, `projects/components/bits.tsx:23,63`; admin: `investors/components/tags.tsx:37`, `members/components/cells.tsx:25`, `projects/components/project-grid.tsx:31`, `project-table.tsx:74`, `review-body.tsx:36`, `settings/components/logo-picker.tsx:36`, `marketing/components/welcome-preview.tsx:20`, `settings/components/welcome-preview.tsx:21` | 10/14 ghi lý do "D-36: ảnh mẫu, tự host sau". **Đây là che vấn đề thật**: D-36 bắt buộc tự host qua `next/image` trước go-live, nên comment disable đang giữ chỗ cho việc chưa làm (CR-03). 2 chỗ logo trong khung email preview (`welcome-preview`) là hợp lý vì email không dùng `next/image`. `logo-picker` hiển thị data URL (CR-17). |
| `no-restricted-syntax` (đọc `process.env`) | 7 | `apps/server/src/common/config/env.ts:7`, `packages/db/seed/{index,demo,load}.ts`, `packages/db/test/env.ts:11`, `apps/server/test/setup/env.ts:10`, `packages/integrations/src/storage/s3.provider.spec.ts:5` | Hợp lệ: điểm đọc env duy nhất, script CLI, test. Mọi chỗ đều parse bằng zod. Không che lỗi. |
| `jsx-a11y/no-autofocus` | 4 | admin `members/…/confirm-dialog.tsx:56`, `requests/…/confirm-dialog.tsx:60`, `settings/…/confirm-dialog.tsx:53`; portal `chat/components/room-header.tsx:81` | Hợp lệ (focus nút chính của hộp xác nhận, ô tìm kiếm). Ba `confirm-dialog.tsx` gần như trùng nhau là nợ trùng lặp nhỏ. |
| `jsx-a11y/click-events-have-key-events` + `no-static-element-interactions` | 1 dòng (2 rule) | `apps/portal/src/features/chat/components/message-row.tsx:112` | Chỉ dùng để chặn nổi bọt sự kiện, chấp nhận được. |

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-03 | nợ-lint / nợ-giả | S2 | 14 chỗ `no-img-element` ở trên, và **12 `<img>` không có disable** (đúng 12 cảnh báo khi build): portal `dashboard/components/avatar.tsx:19`, `country-list.tsx:49`, `events/components/event-parts.tsx:19,32`, `membership/components/pay-details.tsx:53`, `profile/components/profile-card.tsx:102`, `shell/components/welcome-mail-modal.tsx:52`; admin `events/components/event-form-fields.tsx:35`, `event-grid.tsx:27,74`, `groups/components/group-form-fields.tsx:26`, `group-grid.tsx:24` | Có 26 `<img>` thô trong app. `next.config.ts` không có `images.remotePatterns`. Ngoài ra `packages/ui/src` có 15 `<img>` mà plugin Next không lint (`auth/auth-hero.tsx`, `group-card/group-cover.tsx`, `user-avatar/user-avatar.tsx`…). D-36 yêu cầu tự host và dùng `next/image` trước go-live, việc này chưa làm. | D-36, Q-05 |
| CR-04 | nợ-lint | S4 | `apps/*/.next-server/**` | Thư mục build e2e chế độ server nằm trong cây app. Grep và lint có thể quét nhầm vào đây. Cần kiểm `.gitignore` và `eslint ignores` có bỏ qua thư mục này không. | — |

---

## c. Mục "Chưa làm" trong completion report: còn tồn

Đã kiểm 17 report G0-G1 → G6, B1 → B6, TIP-B61/62/63. Mục đã làm ở pha sau thì không liệt kê, ví dụ: `/admin/badges`, socket transport, `stats_daily`/`weekly_active`, seed demo B62, `registrationOpen` (server trả 409, `event.service.ts:46`), `event.registered` mail, presign `project-cover`, `GET /admin/overview`, `/public/stats` phía server.

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-05 | nợ-giả | S2 | `apps/portal/src/features/chat/components/composer.tsx:23-24, 83-84` | Nút gửi tệp và gửi ảnh luôn gửi `DEMO_FILE` (`Ke-hoach-Q4.pdf`) hoặc `DEMO_IMAGE`, không mở hộp chọn tệp, không upload. Hành vi giống nhau ở cả `NEXT_PUBLIC_API_MOCKING=off`. Người dùng thật sẽ gửi tệp giả vào nhóm. | G2, B3 → B60, DV-G2c-2, Q-G2c-1 |
| CR-06 | bug | **S1** | Sinh: `apps/server/src/modules/account/services/admin-users.service.ts:84-87`; relay bỏ qua: `apps/server/src/common/outbox/outbox-relay.service.ts:69-74`; danh sách consumer: `apps/server/src/worker/processors/*.processor.ts` (không có `user.locked`) | Outbox `user.locked` không có consumer. Relay ghi warn rồi **đánh dấu đã gửi**, nên sự kiện mất luôn và không thể xử lý lại khi có consumer. Hậu quả: dự án của TK bị khoá vẫn hiện, vì `visibleTo` (`project/repositories/project.repository.ts:24-35`) không lọc theo trạng thái chủ dự án; nhóm do TK bị khoá làm chủ không chuyển về Admin. | **D-15**, B2 → B32, REQ-127 |
| CR-07 | bug | S2 | `packages/shared/src/outbox/events.ts:19-23`; phát ở `admin-users.service.ts:89-92`, `password-reset.service.ts:77`, `settings/services/admin-accounts.service.ts:147`, `admin-users.service.ts:128` | `user.session_revoked` và `user.role_changed` cũng không có consumer. Không có nơi nào publish socket `session.revoked`, nên nhánh `disconnectSockets` ở `socket/gateways/user-events.subscriber.ts:41` không bao giờ chạy. Socket đang mở của TK bị khoá, đổi mật khẩu hoặc bị thu hồi quyền quản trị vẫn sống. `message.send` (`socket/gateways/message.gateway.ts:21-30`) không kiểm lại khoá hay `permVersion`; chỉ handshake kiểm (`socket-auth.ts:25-33`). Comment ở `admin-accounts.service.ts:19` ghi "ngắt phiên realtime" nhưng không đúng thực tế. | D-15, D-42, BR-02, S-09 |
| CR-08 | bug | **S1** | `apps/portal/src/app/(public)/` (chỉ có `forgot-password`, `sso/callback`); link sinh ở `apps/server/src/modules/account/services/password-reset.service.ts:51` | Trang `/reset-password?token=` của Portal chưa có. Mail quên mật khẩu dẫn tới 404, nên luồng quên mật khẩu không hoàn tất. TK đăng ký không mật khẩu (Q-B11-1) cũng không đặt được mật khẩu. | B2, Q-B12-2, UAT-11 |
| CR-09 | nợ-dataurl | S2 | admin `groups/components/group-form.tsx:22`, `events/components/event-form.tsx:23`, `settings/components/logo-picker.tsx:30`, `bots/components/persona-photo.tsx:32`; portal `projects/components/read-image.ts:10`; schema nhận ảnh lớn: `packages/shared/src/api-domains/group-admin.ts:22`, `event-admin.ts:31` (≤ 2.000.000 ký tự), `settings-admin.ts:20` (≤ 2.800.000) | Ảnh bìa nhóm, sự kiện, logo, persona và ảnh dự án lưu dạng base64 trong cột DB. Mỗi dòng có thể tới ~2 MB, nên danh sách nhóm, sự kiện, dự án phình payload và cache. Không qua kiểm `head()` của storage. Riêng ảnh dự án: server đã có kind `project-cover` (Q-B30-1) nhưng FE vẫn gửi data URL. | D-09, D-36, DV-G3b-3, DV-G4c-3, DV-G4d-6, DV-G5a-3, Q-G6a-3 |
| CR-10 | nợ-giả | S3 | `apps/portal/src/features/projects/components/detail-side.tsx:59` | Nút "Nhắn tin" với chủ dự án chỉ hiện toast. | G3, DV-G3b-7, Q-G3b-3 |
| CR-11 | bug | S2 | admin `members/api.ts:68` (`exportJobSchema`); không có lời gọi `GET /admin/exports/:id` trong `apps/admin/src` | Xuất CSV thành viên chỉ tạo job (202) rồi toast. Admin không có cách tải file. Server đã có `GET /admin/exports/:id` (`export/export.controller.ts:13`) nhưng FE không gọi. | G4, Q-G4a-6, B5 → B60 |
| CR-12 | nợ-giả | S3 | `apps/portal/src/features/shell/nav.ts:25` (`PORTAL_NAV_BADGES = { chat: 18 }`) | Badge "Chat nhóm 18" ở sidebar Portal vẫn là số cố định. Admin đã nối `/admin/badges`, Portal thì chưa. | G2, Q-G2a-2 |
| CR-13 | bug | S2 | Không có màn FE nào gọi `/admin/fees/transactions` hay `…/:id/match` | Hàng đợi giao dịch không khớp và khớp tay đã có API (B15) nhưng Admin chưa có màn. Kế toán không xử lý được chuyển khoản sai nội dung, mà đây là biện pháp chính cho rủi ro "Dịch vụ báo tiền về gián đoạn" (§16.4). | Q-B15-2, D-41, OQ-06, QĐ-01 |
| CR-14 | bug | S2 | `apps/server/src/modules/account/services/totp.service.ts:22,32` (`enroll` không có caller); `requireAdmin2fa` ở `admin/…/settings/components/sso-tab.tsx:62` không được server đọc; admin FE không có màn nhập mã 2 lớp | TOTP admin chưa dùng được: không có endpoint bật TOTP, không có màn nhập mã. Công tắc "Bắt buộc 2FA quản trị viên" chỉ lưu cài đặt, không có hiệu lực. | D-27, D-33, Q-02, Q-B12-1, B1 |
| CR-15 | nợ-giả | S3 | `apps/portal/src/features/auth/components/login-hero.tsx:3-9,29,42-44`; `apps/portal/messages/vi/auth.json:9` (`"+452"`) | Màn đăng nhập dùng `DEFAULT_ONLINE`, `authStats` từ `@opchub/shared/fixtures` và chuỗi "+452" trong i18n. Server đã có `GET /public/stats` (`public.controller.ts:28`) nhưng FE không gọi. | D-38, Q-07, Q-B11-3 |
| CR-16 | bug | S3 | `apps/portal/src/features/membership/hooks/use-membership.ts:13,25` | Chờ kích hoạt phí bằng polling `refetchInterval`. Comment ghi "thay bằng `membership.updated` khi có socket", nhưng Portal chưa nghe sự kiện này (server đã publish ở `fee-events.handler.ts`). | G3, DV-G3a-2, Q-B14-3 |
| CR-17 | nợ-giả | S3 | Marketing: không có huỷ chiến dịch đang gửi, không có link huỷ đăng ký (grep `unsubscribe` không có kết quả); `openRate/clickRate` = null | Chiến dịch hàng loạt không có link huỷ nhận, gây rủi ro spam và vi phạm NĐ 13. Tỉ lệ mở/nhấp luôn trống. | G6, Q-G6b-4, Q-G6b-5, Q-B42-3 |
| CR-18 | nợ-vps | S1 | `coding-packs/reports/B6-completion.md` (mục "Chưa làm"); `infra/scripts/check-syntax.sh` | Chưa chạy `nginx -t`, `systemd-analyze verify`, `shellcheck`. k6 chưa đo qua nginx và PgBouncer. Chưa có staging và UAT. | B6, B67, §14.2, §15 |

---

## d. Deviation (`coding-packs/reports/ui-parity/deviations.md`)

Phân loại: **(1)** chỉ khác prototype, hành vi đúng đặc tả · **(2)** che lỗi hoặc thiếu chức năng thật · **(3)** cần PM quyết.

| DV | Lớp | Lý do ngắn |
|---|---|---|
| DV-01, 02, 03, 04, 08, 09, 10, 11, 13, 14, 15 | 1 | Theo D-26, D-30, D-44, D-45 và ui-parity; chỉ khác giao diện hoặc luồng có quyết định. |
| DV-05 | 1 | Số Tổng quan đã nối `GET /admin/overview` (`overview/data.ts:8`). Riêng chuỗi cứng "4.218 / +12% / +452" trong i18n thuộc lớp 2 (CR-24). |
| DV-06 | 2 | Nút thu gọn sidebar Admin vẫn chưa hoạt động. |
| DV-07 | 1 | Popover thông báo đã có (`admin-notifications`). |
| DV-12 | 1 | Hộp TK dùng thử tắt khi API thật (D-35). |
| DV-G2b-1, G2b-2, G2b-3 | 1 | Duyệt thật qua API (D-43); truy cập bàn phím. |
| DV-G2c-1 | 1 | Transport socket đã có (`socket-transport.ts:50`). |
| **DV-G2c-2** | **2** | Gửi tệp mẫu thay cho tệp thật (CR-05). |
| DV-G2c-3 | 1 | D-43. |
| **DV-G2c-4** | **2** | Chat chuyển sang `/community?join=<id>` nhưng màn Cộng đồng không đọc `?join=` (grep không thấy), nên form tham gia không tự mở. |
| DV-G2c-5 | 1 | Chỉ thêm trạng thái lên URL. |
| DV-G2a-1, G2a-2, G2a-4, G2a-5 | 1 | D-30, truy cập bàn phím, copy chữ. |
| **DV-G2a-3** | **2** | Dashboard LIVE: danh sách hoạt động, quốc gia, phiên, thảo luận vẫn là bộ mô phỏng prototype trên server thật (`dashboard-live.service.ts:19-21`). Người dùng thấy hoạt động giả như thật (CR-23). |
| DV-G3a-1, G3a-3, G3a-4, G3a-5, G3a-6 | 1 | D-41, BR-03, screens.md. |
| DV-G3a-2 | 3 | Polling thay socket chấp nhận được về chức năng, nhưng cần PM chốt có bắt buộc realtime không (CR-16). |
| DV-G3c-1, G3c-2, G3c-3 | 1 | D-40; upload avatar đã qua presign. |
| DV-G3b-1, G3b-4, G3b-5 | 1 | D-39, §8, idempotency. |
| DV-G3b-2 | 3 | Tải `size=100` rồi phân trang ở client; khi dự án nhiều sẽ thiếu dữ liệu và chậm. Cần ngưỡng chuyển sang phân trang server. |
| **DV-G3b-3** | **2** | Ảnh dự án dạng data URL (CR-09). |
| DV-G3b-6 | 1 | Rich text có sanitize hai phía. Nút "Liên kết" dùng `prompt()` là S4. |
| **DV-G3b-7** | **2** | "Nhắn tin" chỉ toast (CR-10). Cần PM chốt phạm vi (3). |
| DV-G4a-1 | 3 | Đổi quyền inline mâu thuẫn chữ D-42 (Q-G4a-2). |
| DV-G4a-2, G4a-3, G4a-4, G4a-5, G4a-6 | 1 | D-32, D-40, kịch bản test. |
| DV-G4d-1, G4d-2, G4d-4, G4d-5 | 1 | URL, xác nhận, feature flag D-05. |
| DV-G4d-3 | 1 | Đúng D-04 và D-48. |
| **DV-G4d-6** | **2** | Ảnh persona dạng data URL (CR-09). |
| DV-G4b-1, G4b-2, G4b-3, G4b-4 | 1 | Phân trang server, audit. |
| DV-G4c-1, G4c-2, G4c-4, G4c-5 | 1 | D-26, D-32. |
| **DV-G4c-3** | **2** | Ảnh bìa nhóm dạng data URL. Ngoài ra card nhóm Portal và lưới Admin bỏ qua `coverUrl` của API (CR-22). |
| DV-G5c-1 → G5c-6 | 1 | Dữ liệu thật, audit, URL. |
| DV-G5b-1 → G5b-5 | 1 | §8, luật 10. |
| DV-G5a-1, G5a-2, G5a-4, G5a-5 | 1 | Audit, luật 9. |
| **DV-G5a-3** | **2** | Ảnh bìa sự kiện dạng data URL. Portal `event-parts.tsx:19` bỏ qua `coverUrl` (CR-22). |
| DV-G6b-1 → G6b-4 | 1 | Luật 8, 10, bảo mật. |
| DV-G6a-1, G6a-2, G6a-3, G6a-4, G6a-5, G6a-6, G6a-7 | 1 | D-33, D-46, D-42. |
| DV-D47-1, DV-D48-1 | 1 | Theo D-47, D-48. |
| DV-B63-1 | 3 | Lộ email, SĐT, địa chỉ thật của chủ dự án cho mọi người xem dự án (CR-31). Cần PM và chủ nhà chốt theo NĐ 13. |
| DV-B63-2, B63-3, B63-4, B63-6, B63-7 | 1 | Q-B63-7 đã chốt giữ hành vi server. |
| DV-B63-5 | 3 | Thiếu trường "tổ chức" cho TK cá nhân (Q-B63-6). |

Đếm (101 dòng): lớp 1 = 87 · lớp 2 = 9 (DV-06, G2c-2, G2c-4, G2a-3, G3b-3, G3b-7, G4d-6, G4c-3, G5a-3) · lớp 3 = 5 (G3a-2, G3b-2, G4a-1, B63-1, B63-5). DV-G3b-7 tính ở lớp 2.

---

## e. Rà các vùng dễ lỗi trên server thật

### e1. Xử lý lỗi API ở FE và báo lỗi tại trường (§6)

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-19 | bug | S2 | `apps/portal/src/lib/api-client.ts:75`, `apps/admin/src/lib/api-client.ts:75`; envelope `packages/shared/src/api/index.ts:14` | `ApiError.fields` được parse nhưng **không nơi nào đọc**. Cả hai app không dùng AntD `Form` hay `setFields`. Mọi form là `useState` tự dựng. Portal có 30 `useMutation` và 44 `onError`, Admin có 48 và 65; tất cả chỉ toast. Lỗi server theo trường (ví dụ `fieldError('CONFLICT','email')` ở `profile.service.ts:64`, `province`, `mfaToken`) không gắn vào ô nào. Vi phạm yêu cầu "báo lỗi tại trường". | SRS §6, data-state.md |
| CR-20 | bug | S2 | `apps/portal/src/features/auth/hooks/use-personal-form.ts:32-44`, `use-biz-form.ts:42-58`; gọi `void f.submit()` ở `register-personal-form.tsx:35`, `register-biz-form.tsx:82` | Đăng ký cá nhân và doanh nghiệp không `try/catch`. 4xx/5xx (email trùng, MST trùng, rate limit, mật khẩu yếu) thành unhandled rejection, người dùng **không thấy thông báo gì**. Đây là luồng đầu phễu, ảnh hưởng UAT-01/02/05. | QT đăng ký, BR-01, UAT-01/02/05 |
| CR-21 | bug | S3 | `apps/admin/src/features/fees/hooks/use-fee-actions.ts:31`, `apps/admin/src/features/investors/hooks/use-investors.ts:53` | `toast(t('failed'))` bỏ qua `e.message` của server, nên mất lý do lỗi (409, 403 thiếu quyền). | — |

**Form bắt buộc chỉ báo bằng toast.** Mọi hàm kiểm dưới đây trả về **một lỗi đầu tiên** rồi toast, không đánh dấu ô (CR-19). Comment trong code ghi là làm theo thứ tự toast của prototype.

| Hàm | Định nghĩa | Nơi toast |
|---|---|---|
| `validateSubmit` | `apps/portal/src/features/projects/model.ts:181` | `projects/components/project-form.tsx:34-35` |
| `validateInterest` | `apps/portal/src/features/projects/model.ts:200` | `projects/components/invest-modal.tsx:153-154` |
| `firstError` (tư vấn) | `apps/portal/src/features/services/model.ts:71` | `services/hooks/use-consult-form.ts:56-57` |
| `firstError` (đăng ký CN) | `apps/portal/src/features/auth/hooks/use-personal-form.ts:25` | `:34` |
| `firstError` (đăng ký DN) | `apps/portal/src/features/auth/hooks/use-biz-form.ts:32` | `:43-44` |
| `validateEvent` | `apps/admin/src/features/events/model.ts:124` | `events/components/event-form.tsx:45-46` |
| `validateGroup` | `apps/admin/src/features/groups/model.ts:115` | `groups/components/group-form.tsx:47-48` |
| `validateCampaign` | `apps/admin/src/features/marketing/model.ts:108` | `marketing/components/campaign-form.tsx:47-48` |
| `validateCategory` | `apps/admin/src/features/settings/model.ts:38` | `settings/hooks/use-categories.ts:45-46` |
| `personaError` / `scriptError` | `apps/admin/src/features/bots/model.ts:102,148` | `bots/components/persona-drawer.tsx:44-45`, `script-drawer.tsx:48-49` |
| `validate` prop | `apps/admin/src/features/settings/components/general-tab.tsx:23,31` | `onInvalid` → toast |

File form: portal `auth/components/register-{biz,personal}-form.tsx`, `chat/components/topic-form.tsx`, `profile/components/form-fields.tsx`, `projects/components/{form-basic,form-repo-fund,form-team,project-form}.tsx`, `services/components/{consult-form,form-fields}.tsx`; admin `events/components/event-form{,-fields}.tsx`, `groups/components/group-form{,-fields,-rooms}.tsx`, `marketing/components/campaign-form{,-fields}.tsx`, `settings/components/category-form.tsx`.

Chỉ login, OTP và quên mật khẩu hiện lỗi inline (một thông điệp): `portal/…/auth/components/login-screen.tsx:53-64`, `admin/…/login-screen.tsx:57`, `portal/…/auth/hooks/use-otp-flow.ts:39,47`, `forgot-screen.tsx:32`.

### e2. Số cứng, dữ liệu giả khi `NEXT_PUBLIC_API_MOCKING=off`

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-22 | nợ-giả | S2 | portal `community/media.ts:9-84` (dùng ở `community-card.tsx:56-61`, `join-summary.tsx:18`); portal `events/media.ts:6-78` (dùng ở `event-parts.tsx:19-23,31`); admin `events/media.ts:6-45` (`event-grid.tsx:73-74`); `packages/ui/src/group-card/group-media.ts:14` (`group-grid.tsx:24`) | Ảnh bìa nhóm và sự kiện lấy theo id từ Unsplash/picsum, **bỏ qua `coverUrl` API**. Ảnh Admin tải lên không hiện ở Portal. Avatar "thành viên" và "người tham dự" trên card là mặt người mẫu (randomuser) chứ không phải thành viên thật. | D-36, Q-05, Q-B23-5 |
| CR-23 | nợ-giả | S2 | `apps/server/src/modules/dashboard/dashboard-live.service.ts:19-21` | `GET /dashboard/live` trên server thật trả danh sách hoạt động, quốc gia ASEAN, phiên, thảo luận **mô phỏng** trộn với số thật. Thành viên thấy hoạt động không có thật. | Q-G2a-3, Q-B34-1, REQ-120, OQ-15 |
| CR-24 | nợ-giả | S3 | `apps/admin/messages/vi/overview.json:4,7,9,13,20-22`; `apps/admin/src/features/overview/components/growth-chart.tsx:8` (`AXIS`) | Tổng quan Admin: "4.218", "+12%", "+452 thành viên tháng này", "+2 nhóm mới", "4 sắp diễn ra" là chuỗi cứng; trục Y cố định 0-600. `dateRange "01/10/2026 – 15/10/2026"` cứng trong `overview.json:4`, `portal/messages/vi/dashboard.json:5`, và các màn admin bots, events, fees, groups, investors, marketing, members gọi `t('dateRange')`. | DV-05, Q-12 |
| CR-25 | nợ-giả | S4 | portal `profile/components/profile-card.tsx:104`; admin `members/model.ts:38` | Cờ quốc gia hotlink `flagcdn`. | D-36 |
| CR-26 | nợ-giả | S4 | `apps/server/src/modules/project/services/project-read.service.ts` (Q-B32-1) | Tab chi tiết dự án: điểm nổi bật, thư viện ảnh, cập nhật là nội dung cố định giống nhau cho mọi dự án. | Q-B32-1 |
| CR-27 | nợ-giả | S4 | `packages/ui/src/globals.css:11-12`, `packages/ui/src/theme/tokens.ts:6` | Chưa tự host Noto Sans (không có `@font-face`/`next/font`), chỉ khai báo trong font stack. | D-37 |

### e3. Audit log Admin (BR-13, luật 10)

Gần như mọi handler ghi hoặc xuất của Admin đều gọi `audit.log`/`logMany` (`apps/server/src/common/audit/audit.service.ts:24,42`). Các lỗ hổng còn lại:

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-28 | bảo-mật | S2 | `apps/server/src/modules/export/export.controller.ts:13`, `export.service.ts:55-79` | `GET /admin/exports/:id` trả presigned URL tải CSV dữ liệu cá nhân (thành viên, thành viên nhóm) nhưng **không ghi audit**. Chỉ lúc yêu cầu xuất mới có audit. | BR-13, luật 10 |
| CR-29 | bug | S4 | `apps/server/src/modules/chat/controllers/messages.controller.ts:58`, `message.service.ts:166-175` | Admin có `c.mod` ghim hoặc bỏ ghim tin ở mọi phòng mà không ghi audit. | BR-13 |
| CR-30 | bug | S4 | `investor/…/investor-admin.service.ts:156`, `event/…/event-registrants.service.ts:90`, `membership-fee/…/admin-fees.service.ts:213`, `service/…/service-admin.service.ts:251` | Xuất CSV đồng bộ ghi audit trong transaction riêng sau khi dựng CSV. Nếu ghi audit lỗi thì dữ liệu đã lộ mà không có vết. | BR-13 |

### e4. Bảo mật

Đã ổn: sanitize rich text phía server (`common/html/sanitize.ts:26`, dùng ở `project-write.service.ts:103`, `campaign.service.ts:70`, `service-admin.service.ts:193`), FE `SafeHtml` (`packages/ui/src/safe-html/safe-html.tsx:36`) là nơi duy nhất dùng `dangerouslySetInnerHTML`. BR-08 dùng `visibleTo` ở chi tiết, khám phá, bình luận, quan tâm. Throttler Redis toàn cục 100/phút, cộng giới hạn riêng cho login, OTP, register, password, SSO, presign. CORS lấy từ env, có credentials. Cookie `opchub_rt` httpOnly, `secure` (mặc định true), `sameSite=lax`, path `/v1/auth`. Webhook dùng HMAC và `timingSafeEqual`.

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-31 | bảo-mật | S2 | `apps/server/src/modules/project/repositories/project.repository.ts:150-172` | Chi tiết dự án trả **email, SĐT, địa chỉ của chủ dự án** cho mọi người xem được dự án, kể cả dự án công khai với mọi thành viên. Đây là dữ liệu cá nhân (NĐ 13). | DV-B63-1, Q-B63-5, OQ-15 |
| CR-32 | bảo-mật | S3 | `apps/server/src/modules/account/controllers/session-cookie.ts:43-48` | Kiểm CSRF theo `Origin` cho qua request **không có header `Origin`**. Với `sameSite=lax` thì rủi ro thấp, nhưng không đúng chữ security.md ("kiểm Origin thuộc whitelist"). | security.md |
| CR-33 | bảo-mật | S3 | `bank-webhook.controller.ts:12` (comment "IP-restricted ở Nginx") so với `infra/nginx/snippets/opchub-backend.conf:16-25` (không có `allow/deny`) | Comment nói webhook chỉ nhận từ IP nhà cung cấp, nhưng Nginx không chặn IP. Chỉ còn HMAC bảo vệ, và header chữ ký chưa xác nhận (CR-01). | OQ-06 |
| CR-34 | bảo-mật | S3 | `apps/server/src/modules/account/services/profile.service.ts:58-64, 74-83` | Đổi email (tên đăng nhập) không cần OTP xác nhận email mới. Huỷ liên kết SSO cuối cùng không bị chặn khi TK chưa có mật khẩu, nên TK có thể tự khoá mình. | Q-G3c-2, Q-G3c-3 |
| CR-35 | bảo-mật | S4 | `auth.controller.ts:66` (logout), `password.controller.ts:74` (revoke-others); socket handshake | Không có giới hạn riêng (chỉ 100/phút toàn cục); socket không giới hạn tốc độ kết nối. | security.md |

### e5. Hiệu năng

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-36 | hiệu-năng | S3 | `apps/server/src/common/outbox/outbox-relay.service.ts:48-65` | Handler outbox chạy tuần tự **trong transaction đang giữ khoá lô** (`FOR UPDATE SKIP LOCKED`). Handler chậm (gửi mail, Redis) làm transaction kéo dài, giữ kết nối PgBouncer. | queues-workers.md |
| CR-37 | hiệu-năng | S4 | `membership-fee/services/reconcile.service.ts:49,56`; `admin-fees.service.ts:123-125` (≤ 100 transaction/lượt); `project/services/project-social.service.ts:157-158` | Truy vấn hoặc transaction trong vòng lặp. Hai chỗ đầu có chủ đích (mỗi giao dịch một transaction); chia sẻ dự án gửi tin tuần tự từng nhóm. | luật 5 |
| CR-38 | hiệu-năng | S4 | `packages/db/prisma/schema/project.prisma:127` (`@@index([projectId, sort])`) so với `project.repository.ts:31` | `visibleTo` lọc `members.some.userId` nhưng `project_members` không có index theo `user_id`. | query-indexing.md |
| CR-39 | hiệu-năng | S4 | `project.repository.ts:50-52`, `project-admin.repository.ts:21-22`, `group.repository.ts:32`, `service-admin.service.ts:58-61`, `investor-admin.repository.ts:38`, `chat/…/message.repository.ts:71` | Tìm kiếm `contains insensitive`/`ILIKE '%q%'` không có index trigram, nên seq scan khi bảng lớn. D-08 chọn Postgres FTS + unaccent + pg_trgm. | D-08, query-indexing.md |

### e6. Cấu hình hạ tầng chưa kiểm trên VPS

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-40 | nợ-vps | S1 | `infra/nginx/opchub.conf:94-101,129-137,166-177`; `infra/nginx/snippets/opchub-backend.conf:9` | TLS chưa bật (dòng `ssl_certificate` đang comment), HSTS đang comment. | L3-02, L3-03 |
| CR-41 | nợ-vps | S1 | `infra/nginx/opchub.conf:46-49` | `set_real_ip_from` Cloudflare đang comment. Sau Cloudflare, `limit_req` và `req.ip` thấy IP Cloudflare: rate limit login/OTP gộp mọi người dùng, khoá 5 lần sai theo IP (D-44) khoá nhầm hàng loạt, audit ghi IP sai. | D-44, L3-03 |
| CR-42 | nợ-vps / nợ-adapter | S1 | `infra/env/server.env.example:13,15,23,32-35,42,44-51,57-58,62`; `infra/redis/redis.conf.snippet:2`; `infra/pgbouncer/userlist.txt.example` | `CHANGE_ME`, secret trống (`JWT_SECRET`, `BANK_WEBHOOK_SECRET`, SMTP, S3, `DATA_ENC_KEY`), `BANK/TAX/SSO_PROVIDER=fake`, Redis chưa đặt `requirepass`. Tất cả chờ L3. | L3-04 → L3-11 |
| CR-43 | nợ-vps | S2 | `infra/env/backup.env.example` (`offsite:opchub-backup`), `infra/backup/restore.md:46`, `infra/monitoring/slo.md:37` | Backup offsite chưa có remote, chưa có timer `pg_basebackup` cho PITR, **chưa diễn tập khôi phục**. RPO/RTO §14 chưa chứng minh. | L3-08, Q-B65-3/4 |
| CR-44 | nợ-vps | S3 | `infra/env/health.env.example` (`ALERT_WEBHOOK_URL` trống); `SENTRY_DSN` (SDK chưa tích hợp) | Không có cảnh báo sự cố và không theo dõi lỗi FE/BE. | L3-09, L3-10, Q-B65-1 |
| CR-45 | nợ-vps | S4 | `infra/systemd/*.service` (`/srv/opchub/current`), `infra/backup/restore.md:52` (`/var/lib/postgresql/16/main`) | Đường dẫn cứng giả định Ubuntu và Postgres 16. Cần đúng khi cài VPS. | ADR-0004 |

### e7. Khác

| ID | Loại | Mức | Vị trí | Mô tả | Tham chiếu |
|---|---|---|---|---|---|
| CR-46 | bug | S3 | `apps/portal/src/features/community/` (không đọc `?join=`) | Từ chat bấm "Tham gia" chuyển sang `/community?join=<id>` nhưng màn Cộng đồng không mở form giới thiệu. | DV-G2c-4, Q-G2c-2 |
| CR-47 | bug | S3 | `packages/ui/src/app-shell/` (không có trạng thái `collapsed`) | Nút thu gọn sidebar Admin có nhưng không hoạt động. | DV-06 |
| CR-48 | bug | S4 | `apps/admin/src/features/{members,requests,settings}/components/confirm-dialog.tsx` | Ba hộp xác nhận gần như trùng nhau, không dùng chung từ `packages/ui`. | code-structure.md |

---

## Bảng tra nhanh theo mức

- **S1 (7):** CR-01 SePay chưa xác nhận · CR-06 `user.locked` mất (D-15) · CR-08 thiếu `/reset-password` · CR-18 chưa kiểm VPS/UAT · CR-40 TLS/HSTS · CR-41 real IP Cloudflare · CR-42 secret/provider fake. Nếu PM coi D-36 (CR-03) và diễn tập khôi phục §14 (CR-43) là điều kiện go-live thì thêm 2.
- **S2 (14):** CR-03, 05, 07, 09, 11, 13, 14, 19, 20, 22, 23, 28, 31, 43.
- **S3 (15):** CR-02, 10, 12, 15, 16, 17, 21, 24, 32, 33, 34, 36, 44, 46, 47.
- **S4 (12):** CR-04, 25, 26, 27, 29, 30, 35, 37, 38, 39, 45, 48.
