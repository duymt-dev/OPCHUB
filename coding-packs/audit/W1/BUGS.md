# AUDIT-W1 — Lỗi (BUGS)

> Ngày 18/10/2026. Đo trên `main` @ `70cfcbb`, server thật (MSW tắt): api :4000, socket :4001, worker, Portal :3200, Admin :3201. Dữ liệu ở `opchub_dev` sau `seed:demo` và `flush:dev-cache`.
> File này chỉ mô tả lỗi, **không ghi cách sửa**. Mức: **S1** chặn go-live · **S2** sai nghiệp vụ · **S3** UX · **S4** nhỏ.
> Nguồn của mỗi lỗi:
> - `UAT-xx`: `work/uat.jsonl`
> - `walk`/`form`: `work/screens.jsonl`
> - `M1`…`M6`: 6 kiểm cơ học, xem `work/mechanical.md`
> - `CR-xx`: rà code, xem `work/code-review.md`
>
> Ảnh và log nằm trong `evidence/`. Chạy lại:
> - Dùng thử và UAT: `bash run-audit.sh` (xem `e2e/audit/playwright.audit.config.ts`)
> - Kiểm cơ học: `packages/db/node_modules/.bin/tsx apps/server/test/audit/run-all.audit.ts`

## Bảng đếm

| Mức | Số |
|---|---|
| S1 | 3 |
| S2 | 18 |
| S3 | 18 |
| S4 | 5 |
| **Tổng** | **44** |

---

## S1 — chặn go-live

### BUG-001 · Link đặt lại mật khẩu trong mail dẫn tới 404
- **Vai trò / màn:** mọi người dùng, cả Portal lẫn Admin. Đường đi: Quên mật khẩu → mail → `/reset-password`.
- **Tái hiện:**
  1. Vào `/forgot-password`, nhập email thành viên, bấm "Gửi liên kết đặt lại". `mail_logs` ghi `password_reset`.
  2. Mở link trong mail: `PORTAL_URL/reset-password?token=…`.
- **Mong đợi:** có màn đặt mật khẩu mới. Theo QT-02: liên kết sống 15 phút, đặt lại xong thì thu hồi mọi phiên.
- **Thực tế:** HTTP **404**. Portal chỉ có route `(public)/forgot-password` và `sso/callback`. API `POST /v1/auth/password/reset` có, nhưng không màn nào gọi. Admin dùng chung `/auth/password/forgot`, nên link cũng trỏ về Portal, mà Portal từ chối đăng nhập TK quản trị.
- **Bằng chứng:** `evidence/reset-link-404.png`, `evidence/uat-UAT-11.png`. UAT-11 TRƯỢT. M2 #1.
- **Tham chiếu:** QT-02, UAT-11, §11 (dòng "Đặt lại mật khẩu"), CR-08.
- **Code nghi ngờ:** `apps/server/src/modules/account/services/password-reset.service.ts:51`; `apps/portal/src/app/(public)/`.
- **Ghi chú:** `mail_logs.body_html` bị xoá sau khi gửi, nên token không còn trong DB. Cách làm này đúng, nhưng vì vậy không lấy được link thật để test e2e.

### BUG-002 · Tạo hoặc sửa sự kiện, nhóm, dự án, persona, logo có ảnh lớn hơn ~75KB đều trả 500 "Lỗi hệ thống"
- **Vai trò / màn:** Admin (Sự kiện, Nhóm cộng đồng, Bot persona, Cài đặt logo); thành viên (form Dự án: ảnh bìa, ảnh đội ngũ).
- **Tái hiện:**
  1. Admin vào Nội dung & Sự kiện, bấm Tạo sự kiện.
  2. Chọn ảnh bìa PNG 300KB, điền đủ trường, bấm Lưu.
  3. Hoặc gọi thẳng `POST /v1/admin/events` với `coverUrl` là data URL 90KB, 300KB, 1,5MB.
- **Mong đợi:** lưu được, vì hợp đồng zod cho `coverUrl` tới 2.000.000 ký tự. Nếu thật sự quá cỡ thì phải báo rõ (413).
- **Thực tế:**
  - Body 90KB → 201.
  - Body 300KB → **500** `INTERNAL`.
  - Body 1,5MB → **500**.
  - Trên UI, toast "Lỗi hệ thống", form không lưu.
  - Log api: `PayloadTooLargeError: request entity too large`.
  - Express trong Nest không cấu hình giới hạn body nên dùng mặc định 100kb; nginx là 1m.
  - FE gửi ảnh dạng data URL (base64 to thêm khoảng 33%), nên ảnh trên khoảng 75KB đã hỏng.
- **Phạm vi (M3):** 9 endpoint:
  - `POST|PATCH /admin/personas`
  - `POST|PATCH /admin/groups`
  - `POST|PATCH /admin/events`
  - `POST|PATCH /projects`
  - `PATCH /admin/settings/general` (logo)
- **Bằng chứng:**
  - `evidence/cover-ui-event.png`
  - `work/screens.jsonl`: `cover-90kb` OK, `cover-300kb` và `cover-1500kb` lỗi, `cover-ui-event`
  - M3 #1–#9
- **Tham chiếu:** QT-08 (tạo sự kiện), QT-09 (đăng dự án), D-36, CR-09.
- **Code nghi ngờ:** `apps/server/src/main-api.ts`, `apps/server/src/common/http/bootstrap-http.ts` (không đặt limit); FE `readAsDataURL` ở `apps/admin/src/features/{events,groups,settings,bots}/components/*`, `apps/portal/src/features/projects/components/read-image.ts`.

### BUG-003 · Lỗi quá cỡ hoặc JSON hỏng bị đổi thành 500 INTERNAL
- **Vai trò / màn:** mọi API.
- **Tái hiện:** gửi body lớn hơn 100kb, hoặc JSON sai cú pháp.
- **Mong đợi:** 413 (quá cỡ) hoặc 400 `VALIDATION_ERROR` (JSON hỏng), đúng §13.2.
- **Thực tế:** 500 `INTERNAL` "Lỗi hệ thống, vui lòng thử lại", log mức error. Hậu quả: người dùng không biết nguyên nhân, cảnh báo 5xx của §14.1 kêu sai, Sentry/SLO bị nhiễu.
- **Bằng chứng:** M3 #11; log api (`PayloadTooLargeError`); `cover-300kb`.
- **Tham chiếu:** §13.2, §14.1 (tỉ lệ 5xx).
- **Code nghi ngờ:** `apps/server/src/common/filters/http-exception.filter.ts:44` (`normalizeError` chỉ nhận `AppError`, `ZodError`, `HttpException`).

---

## S2 — sai nghiệp vụ

### BUG-004 · Khoá tài khoản không ẩn dự án, không chuyển nhóm làm chủ về Admin (D-15)
- **Vai trò / màn:** Admin › Thành viên › Khoá → Portal (Khám phá dự án, nhóm).
- **Tái hiện:**
  1. Admin khoá một TK đang có dự án công khai và đang làm chủ nhóm (seed: chủ dự án `p6`, chủ nhóm `c5`).
  2. Đợi 6 giây cho outbox relay chạy.
  3. Thành viên khác mở `GET /projects/p6` và xem chủ nhóm `c5`.
- **Mong đợi:** D-15: TK bị khoá thì dự án tự ẩn và nhóm làm chủ chuyển về Admin.
- **Thực tế:**
  - `GET /projects/p6` trả 200, dự án vẫn hiện.
  - Nhóm `c5` vẫn do TK bị khoá làm chủ.
  - Outbox `user.locked` không có consumer. Worker log "Sự kiện outbox chưa có handler — bỏ qua `user.locked`".
  - Relay đánh dấu đã dispatch, nên sự kiện cũ cũng mất hẳn.
- **Bằng chứng:** `work/screens.jsonl` (`d15-lock-effects`), `evidence/worker-outbox-no-handler.log`, M1 #1.
- **Tham chiếu:** D-15, QT-12, CR-06.
- **Code nghi ngờ:** phát ở `apps/server/src/modules/account/services/admin-users.service.ts:84`; bỏ qua ở `apps/server/src/common/outbox/outbox-relay.service.ts:69-74`; `project.repository.ts` (`visibleTo` không lọc trạng thái chủ dự án).

### BUG-005 · Khoá TK, đổi mật khẩu, đổi vai trò không ngắt kết nối realtime
- **Vai trò / màn:** Chat (socket).
- **Tái hiện:** thành viên đang mở chat; Admin khoá TK đó (hoặc thành viên đặt lại mật khẩu, hoặc đổi vai trò).
- **Mong đợi:** QT-12: thu hồi phiên khi khoá. QT-02: đặt lại mật khẩu thì thu hồi toàn bộ phiên.
- **Thực tế:**
  - `user.session_revoked` và `user.role_changed` không có consumer.
  - Không chỗ nào publish `session.revoked` lên kênh `socket:user`.
  - Socket chỉ kiểm lúc handshake, nên socket đang mở vẫn gửi và nhận tin.
- **Bằng chứng:** M1 #2, #3; `evidence/worker-outbox-no-handler.log` (`user.session_revoked`, `user.role_changed`).
- **Tham chiếu:** QT-02, QT-12, BR-02, CR-07.
- **Code nghi ngờ:** `packages/shared/src/outbox/events.ts:19-23`; `admin-users.service.ts:89,128`; `password-reset.service.ts:77`; `settings/services/admin-accounts.service.ts:147`.

### BUG-006 · Luồng trao đổi nhà đầu tư bị tách làm hai, hai phía không thấy tin của nhau
- **Vai trò / màn:** Admin › Nhà đầu tư › Chi tiết ↔ trang dự án / "Trao đổi với OPC Hub" của nhà đầu tư.
- **Tái hiện:**
  1. Thành viên gửi quan tâm đầu tư.
  2. Admin bình luận ở `POST /admin/investors/:key/comments`.
  3. Nhà đầu tư mở `GET /me/investor-thread`.
- **Mong đợi:** QT-10, UAT-20: dùng chung một luồng, hiện ở cả 2 phía.
- **Thực tế:**
  - Nhà đầu tư không thấy bình luận của Admin.
  - Admin ghi vào `investor_admin_notes` (khoá theo `investor_key`), Portal đọc `investor_thread_messages` (khoá theo id quan tâm).
- **Bằng chứng:** UAT-20 TRƯỢT (`evidence/uat-UAT-20.png`). DB: `investor_admin_notes` có dòng `audit-thread-…`, `/me/investor-thread` trả `messages: []`.
- **Tham chiếu:** QT-10, UAT-20, QĐ-02.
- **Code nghi ngờ:** `apps/server/src/modules/investor/services/investor-admin.service.ts:111-130`, `interest.service.ts:96-140`, `repositories/investor-admin.repository.ts:126-139`, `interest.repository.ts:99-124`.

### BUG-007 · Đổi trạng thái quan tâm đầu tư không có điều kiện, lùi được từ Đã kết nối về Đã gửi
- **Vai trò / màn:** Admin › Nhà đầu tư › đổi trạng thái.
- **Tái hiện:** `PATCH /admin/investors/:key/status` với `{status:'sent'}` khi đang `connected`.
- **Mong đợi:** §8: Đã gửi → Đang trao đổi → Đã kết nối. Luật 7: `UPDATE … WHERE status = <from>`, nếu không cập nhật dòng nào thì 409.
- **Thực tế:** `updateMany({ where: { investorKey }, data: { status } })` đặt được mọi trạng thái, không 409.
- **Bằng chứng:** M4 mục không đạt #1.
- **Tham chiếu:** §8, QĐ-02, luật 7.
- **Code nghi ngờ:** `apps/server/src/modules/investor/repositories/investor-admin.repository.ts:110`.

### BUG-008 · Bot không phản hồi khi thành viên thật nhắn trong nhóm
- **Vai trò / màn:** Chat nhóm, Admin › Bot (công tắc "Tự trả lời thành viên thật").
- **Tái hiện:**
  1. Công tắc `replyToMembers=true`, có persona trong giờ ở c1.
  2. Thành viên gửi tin ở `c1-general`.
  3. Đợi 8 giây.
- **Mong đợi:** UAT-14, QT-07 bước 6: bot chọn persona trong nhóm, trong giờ để phản hồi. Theo D-04/D-48 thì phải qua duyệt trước khi đăng.
- **Thực tế:**
  - Không tạo hội thoại chờ duyệt nào (bot_threads 3 → 3), không có tin persona.
  - Server không đọc `replyToMembers` hay `autoGenerate` ở đâu cả.
  - §8 có trạng thái "Đang chạy" theo giãn cách, nhưng server chỉ có `pending`/`posted` và đăng hết một lần.
- **Bằng chứng:** UAT-14 TRƯỢT (`evidence/uat-UAT-14.png`); M4 #2.
- **Tham chiếu:** QT-07, UAT-14, UAT-15 (một phần), D-04, D-05, D-48.
- **Code nghi ngờ:** `apps/server/src/modules/bot/services/*` (không có handler tin thành viên), `bot-thread.service.ts:99`.
- **Ghi chú:** bot nằm sau cờ `FEATURE_BOTS` (D-05, GĐ3). Việc có chặn go-live hay không xem OPEN-QUESTIONS.

### BUG-009 · Form đăng ký cá nhân và doanh nghiệp nuốt lỗi API
- **Vai trò / màn:** Portal › Đăng ký.
- **Tái hiện:** đăng ký trùng email, SĐT hoặc MST (server trả 409), hoặc server trả 400 kèm `fields`.
- **Mong đợi:** §6: "báo lỗi tại trường, quay lại form".
- **Thực tế:** `void f.submit()` không bắt lỗi, người dùng không thấy gì.
- **Bằng chứng:** CR-20.
- **Tham chiếu:** QT-01, §6, UAT-01/02.
- **Code nghi ngờ:** `apps/portal/src/features/auth/hooks/use-personal-form.ts:32-44`, `use-biz-form.ts:42-58`, `register-personal-form.tsx:35`, `register-biz-form.tsx:82`.

### BUG-010 · Gửi tệp và ảnh trong chat luôn gửi tệp mẫu
- **Vai trò / màn:** Portal › Chat nhóm (nút đính kèm, nút ảnh).
- **Tái hiện:** bấm nút tệp hoặc nút ảnh trong composer.
- **Mong đợi:** chọn tệp thật, upload qua presign rồi gửi.
- **Thực tế:** gửi ngay `DEMO_FILE` (`Ke-hoach-Q4.pdf`, 640 KB) hoặc `DEMO_IMAGE`, không mở hộp chọn tệp. Ở server thật, tin hiện tệp không tồn tại.
- **Bằng chứng:** CR-05; DV-G2c-2.
- **Tham chiếu:** QT-06, §5.2.
- **Code nghi ngờ:** `apps/portal/src/features/chat/components/composer.tsx:23-24,83-84`.

### BUG-011 · Ảnh bìa nhóm và sự kiện ở Portal bỏ qua `coverUrl` của API
- **Vai trò / màn:** Portal › Cộng đồng, Sự kiện; Admin › lưới Sự kiện, Nhóm.
- **Tái hiện:** Admin đặt ảnh bìa (qua được BUG-002 với ảnh nhỏ), rồi mở Portal.
- **Mong đợi:** hiện đúng ảnh Admin đặt.
- **Thực tế:** card dùng ảnh Unsplash/picsum cố định theo id; avatar thành viên cũng là ảnh mẫu.
- **Bằng chứng:** CR-22.
- **Tham chiếu:** QT-08, D-36.
- **Code nghi ngờ:** `apps/portal/src/features/community/media.ts`, `apps/portal/src/features/events/media.ts`, `apps/admin/src/features/events/media.ts`.

### BUG-012 · Dashboard LIVE trên server thật hiển thị hoạt động giả
- **Vai trò / màn:** Portal › Dashboard.
- **Tái hiện:** thành viên đã đóng phí mở `/dashboard`.
- **Mong đợi:** hoạt động, phiên, thảo luận thật của cộng đồng.
- **Thực tế:**
  - `GET /dashboard/live` trả bộ mô phỏng của prototype (hoạt động, quốc gia ASEAN, phiên).
  - Người dùng thấy hoạt động giả như thật, ví dụ "Somchai Prasert gửi tin nhắn…", "Tổng thành viên 8" nằm cạnh "391 lượt tham gia".
- **Bằng chứng:** CR-23; ảnh Dashboard trong `evidence/uat-UAT-*` / phiên dùng thử.
- **Tham chiếu:** §5.2, DV-G2a-3.
- **Code nghi ngờ:** `apps/server/src/modules/dashboard/dashboard-live.service.ts:19-21`.

### BUG-013 · Xuất CSV thành viên ở Admin không tải được file
- **Vai trò / màn:** Admin › Thành viên › Xuất.
- **Tái hiện:** chọn thành viên rồi bấm Xuất.
- **Mong đợi:** QT-12 bước 5: tải CSV.
- **Thực tế:** chỉ tạo job (202) rồi toast. Admin không gọi `GET /admin/exports/:id` nên không lấy được link tải.
- **Bằng chứng:** CR-11.
- **Tham chiếu:** QT-12, UAT-25 (phần xuất), BR-13.
- **Code nghi ngờ:** `apps/admin/src/features/members/api.ts:68`.

### BUG-014 · Không có màn xử lý giao dịch chuyển khoản không khớp
- **Vai trò / màn:** Admin › Phí thành viên.
- **Tái hiện:** chuyển khoản sai nội dung (webhook ghi `payment_transactions` unmatched).
- **Mong đợi:** QT-03 bước 6b, rủi ro §16.4: kế toán khớp tay.
- **Thực tế:** API `/admin/fees/transactions` và `…/:id/match` có, nhưng không màn FE nào gọi. Chỉ "Ghi nhận đã thu" theo thành viên là còn dùng được.
- **Bằng chứng:** CR-13.
- **Tham chiếu:** QT-03, BR-04, QĐ-01.

### BUG-015 · 2FA Admin không bật được; công tắc "Bắt buộc 2FA" không có tác dụng
- **Vai trò / màn:** Admin › Cài đặt › Bảo mật; đăng nhập Admin.
- **Thực tế:** `totp.service.ts` có `enroll` nhưng không có caller, Admin FE không có màn đăng ký TOTP. `requireAdmin2fa` lưu được nhưng server không đọc.
- **Bằng chứng:** CR-14.
- **Tham chiếu:** §3.6, §14 (OWASP ASVS L2), Q-11.
- **Code nghi ngờ:** `apps/server/src/modules/account/services/totp.service.ts:22,32`; `apps/admin/src/features/settings/components/sso-tab.tsx:62`.

### BUG-016 · Chi tiết dự án lộ email, SĐT, địa chỉ của chủ dự án cho mọi người xem
- **Vai trò / màn:** Portal › Dự án › chi tiết (cột liên hệ).
- **Thực tế:** API trả email, SĐT, địa chỉ thật của chủ dự án (TK cá nhân lẫn DN) cho bất kỳ ai xem được dự án.
- **Bằng chứng:** CR-31; DV-B63-1.
- **Tham chiếu:** §14 (NĐ 13/2023), QT-09 bước 6 ("liên hệ Email/Zalo/Gọi"). Cần PM chốt phạm vi.
- **Code nghi ngờ:** `apps/server/src/modules/project/repositories/project.repository.ts:150-172`.

### BUG-017 · Tải file xuất dữ liệu cá nhân không ghi audit
- **Vai trò / màn:** Admin › mọi màn có xuất CSV.
- **Thực tế:** `GET /admin/exports/:id` trả presigned URL tải CSV dữ liệu cá nhân mà không ghi `audit_logs`. Chỉ lúc tạo job là có audit.
- **Bằng chứng:** CR-28.
- **Tham chiếu:** BR-13, §14 (log xuất dữ liệu), luật 10.
- **Code nghi ngờ:** `apps/server/src/modules/export/export.controller.ts:13`, `export.service.ts:55-79`.

### BUG-018 · Phí hết hạn vẫn dùng được Portal cho tới lần job đêm chạy
- **Vai trò / màn:** Portal (mọi màn cần phí).
- **Tái hiện:** `valid_until` vừa qua nhưng `status` vẫn `active` (job `feeStatus` chạy lúc 00:05 giờ VN). Gọi `/dashboard/live`.
- **Mong đợi:** BR-03: hết hạn thì popup bắt buộc, API 402.
- **Thực tế:** trả 200, Portal không hiện popup. Guard chỉ đọc `status` (Redis `auth:fee`), không so `validUntil`. Có thể dùng thêm tối đa khoảng 24 giờ.
- **Bằng chứng:** `work/screens.jsonl` (`fee-expired`).
- **Tham chiếu:** BR-03, BR-05, QT-04.
- **Code nghi ngờ:** `apps/server/src/common/auth/guards.ts:86-89`; `apps/server/src/worker/schedules.ts` (`fee-status-daily`).

### BUG-019 · Phiếu tư vấn doanh nghiệp thiếu tên DN hoặc MST vẫn được tạo
- **Vai trò / màn:** Portal › Gói dịch vụ › Đăng ký tư vấn (đối tượng DN).
- **Tái hiện:** `POST /service-requests` với `requesterType:'business'`, không có `organization` và `taxCode`.
- **Mong đợi:** QT-11: DN phải có thêm tên DN, MST, loại hình, quy mô, chức vụ. UAT-21: thiếu trường bắt buộc thì bị chặn.
- **Thực tế:** 201, phiếu được tạo. Server chỉ kiểm các trường chung; FE có kiểm, nhưng gọi API thẳng thì qua được.
- **Bằng chứng:** UAT-21 TRƯỢT (`evidence/uat-UAT-21.png`).
- **Tham chiếu:** QT-11, UAT-21.
- **Code nghi ngờ:** `packages/shared/src/api-domains/services.ts:49-61` (`createServiceRequestSchema`); `apps/server/src/modules/service/services/service-request.service.ts`.

### BUG-020 · Gửi tin quá dài, sai cú pháp hoặc có HTML: lưu nguyên văn chuỗi `<script>`
- **Vai trò / màn:** Portal › Dự án › Góp ý.
- **Tái hiện:** `POST /projects/:id/comments` với body `<script>alert(1)</script><img src=x onerror=alert(2)>`.
- **Thực tế:** DB lưu nguyên văn. FE hiện bằng `{c.body}` (React tự escape) nên **không** chạy được script trên Portal hiện tại. Nhưng dữ liệu bẩn sẽ đi vào CSV xuất, mail, và mọi client khác.
- **Bằng chứng:** `work/screens.jsonl` (`xss-comment`); `apps/portal/src/features/projects/components/comment-item.tsx:39,118`.
- **Tham chiếu:** §14 (sanitize rich text), §3.6.
- **Ghi chú:** để S2 vì dữ liệu không được làm sạch ở biên. Rủi ro XSS trực tiếp hiện là thấp.

### BUG-021 · Nút "Nhắn tin" với chủ dự án chỉ hiện toast
- **Vai trò / màn:** Portal › Dự án › chi tiết.
- **Thực tế:** không mở luồng nhắn tin nào.
- **Bằng chứng:** CR-10; DV-G3b-7.
- **Tham chiếu:** QT-09 bước 6. Cần PM chốt phạm vi (OPEN-QUESTIONS).
- **Code nghi ngờ:** `apps/portal/src/features/projects/components/detail-side.tsx:59`.

---

## S3 — UX

### BUG-022 · Form bỏ trống trường bắt buộc chỉ báo bằng một toast, không báo tại ô
- **Vai trò / màn:**
  - Admin: Tạo sự kiện, Tạo nhóm, Chiến dịch, Lĩnh vực, Persona, Kịch bản.
  - Portal: Đăng ký cá nhân và DN, Dự án, Quan tâm đầu tư, Tư vấn.
- **Tái hiện:** mở form, bấm Lưu khi chưa nhập gì.
- **Mong đợi:** §6: "báo lỗi tại trường"; đánh dấu mọi ô thiếu cùng lúc.
- **Thực tế:**
  - Chỉ hiện một toast cho lỗi đầu tiên ("Vui lòng nhập tên sự kiện"), ở đáy giữa trang, đè mép trái form và tự tắt.
  - Không ô nào có `aria-invalid` hay chữ lỗi.
  - `ApiError.fields` từ server được parse nhưng không chỗ nào đọc.
  - 11 hàm `validate*`/`firstError` đều trả một lỗi đầu tiên.
- **Bằng chứng:** `evidence/form-empty-events.png`, `evidence/form-empty-groups.png`; `work/screens.jsonl` (`form-empty-*`); CR-19.
- **Tham chiếu:** §6, WCAG 2.1 AA (§14).
- **Code nghi ngờ:** `apps/{portal,admin}/src/lib/api-client.ts:75`; `apps/admin/src/features/{events,groups,marketing,settings,bots}/model.ts`; `apps/portal/src/features/auth/hooks/use-*-form.ts`.

### BUG-023 · Link thông báo chết: `/membership`, `/requests?code=`, `/huong-dan`
- **Thực tế:**
  - Thông báo "phí đã kích hoạt" có `link:'/membership'`, nhưng Portal chỉ có `/membership/pay`.
  - Thông báo @nhắc phiếu YC có `link:'/requests?code=…'`, nhưng Admin `/requests` không đọc `?code=`, và hook thông báo Admin không điều hướng. Mọi link thông báo ở Admin đều chết.
  - Mail chào mừng có `guideUrl=/huong-dan`, Portal không có trang này.
- **Bằng chứng:** M2 #2, #3, #4, ghi chú M2.
- **Tham chiếu:** §11, UAT-23 (người được gắn nhận thông báo: có, nhưng mở thì không tới phiếu).
- **Code nghi ngờ:** `apps/server/src/modules/notification/services/notification-events.handler.ts:116,154`; `apps/admin/src/features/shell/hooks/use-notifications.ts`; `packages/shared/src/fixtures/prototype-seed.json:1696`.

### BUG-024 · Lỗi thao tác Admin bỏ mất lý do của server
- **Thực tế:** `toast(t('failed'))` không dùng `e.message`. Ví dụ ghi nhận phí, đổi trạng thái nhà đầu tư bị 409 thì người dùng chỉ thấy "Thất bại".
- **Bằng chứng:** CR-21.
- **Code nghi ngờ:** `apps/admin/src/features/fees/hooks/use-fee-actions.ts:31`, `apps/admin/src/features/investors/hooks/use-investors.ts:53`.

### BUG-025 · Chờ kích hoạt phí bằng polling; không dùng `membership.updated`
- **Thực tế:** popup bắt buộc đóng nhờ `refetchInterval`, không nghe sự kiện realtime `membership.updated` (§13.4).
- **Bằng chứng:** CR-16; DV-G3a-2.
- **Tham chiếu:** §13.4, UAT-09 (vẫn đạt, nhưng có trễ).

### BUG-026 · Từ Chat bấm "Tham gia" sang Cộng đồng nhưng không mở form tham gia
- **Thực tế:** chuyển tới `/community?join=<id>` nhưng màn Cộng đồng không đọc `?join=`.
- **Bằng chứng:** CR-46; DV-G2c-4.
- **Tham chiếu:** QT-05 bước 1.

### BUG-027 · Nút thu gọn sidebar Admin không có tác dụng
- **Bằng chứng:** CR-47; DV-06.
- **Code nghi ngờ:** `packages/ui/src/app-shell/`.

### BUG-028 · Badge "Chat nhóm 18" ở Portal là số cố định
- **Thực tế:** `PORTAL_NAV_BADGES = { chat: 18 }`, không theo số tin chưa đọc thật.
- **Bằng chứng:** CR-12; ảnh Portal (sidebar luôn hiện 18).
- **Code nghi ngờ:** `apps/portal/src/features/shell/nav.ts:25`.

### BUG-029 · Số liệu cố định trên màn đăng nhập và Tổng quan Admin
- **Thực tế:**
  - Màn đăng nhập: "312 đang trực tuyến", "4.218 thành viên", "36 cộng đồng".
  - Tổng quan Admin: "+12%", "+452 thành viên tháng này", trục biểu đồ cố định.
  - Tất cả là chuỗi trong i18n hoặc fixture, không phải số thật.
- **Bằng chứng:** CR-15, CR-24.
- **Code nghi ngờ:** `apps/portal/src/features/auth/components/login-hero.tsx`, `packages/shared/src/fixtures/auth-hero.ts`, `apps/admin/messages/vi/overview.json`, `apps/admin/src/features/overview/components/growth-chart.tsx:8`.

### BUG-030 · Đổi email (tên đăng nhập) không xác nhận OTP; huỷ được liên kết SSO cuối cùng
- **Bằng chứng:** CR-34.
- **Tham chiếu:** QT-01 (email hợp lệ là điều kiện OTP), §3.6.
- **Code nghi ngờ:** `apps/server/src/modules/account/services/profile.service.ts:58-64,74-83`.

### BUG-031 · Kiểm CSRF theo `Origin` cho qua request không có header `Origin`
- **Bằng chứng:** CR-32.
- **Code nghi ngờ:** `apps/server/src/modules/account/controllers/session-cookie.ts:43-48`.

### BUG-032 · Webhook ngân hàng được ghi là "giới hạn IP ở Nginx" nhưng nginx không có allow/deny
- **Bằng chứng:** CR-33.
- **Code nghi ngờ:** `apps/server/src/modules/membership-fee/controllers/bank-webhook.controller.ts:12` so với `infra/nginx/snippets/opchub-backend.conf:16-25`.

### BUG-033 · Chủ dự án lưu lại dự án đang hiển thị hoặc bị từ chối thì sinh cạnh ngoài §8
- **Thực tế:** `OWNER_EDITABLE` gồm `published` và `rejected`, nên có Đang hiển thị → Nháp và Bị từ chối → Chờ duyệt/Nháp.
- **Bằng chứng:** M4 #3.
- **Tham chiếu:** §8, BR-08, D-18.
- **Code nghi ngờ:** `apps/server/src/modules/project/domain/project-status.ts:22`.

### BUG-034 · SSO thật: `redirect_uri` không mang provider, mà màn callback cần `?provider=`
- **Thực tế:** chỉ `FakeSsoProvider` tự gắn tham số này; provider thật (Google…) sẽ không gắn.
- **Bằng chứng:** ghi chú M2; câu hỏi 2 trong `work/mechanical.md`.
- **Tham chiếu:** QT-02, D-45, OQ-04.
- **Code nghi ngờ:** `apps/server/src/modules/account/services/sso.service.ts:52`.

### BUG-035 · Quyền `m.role` và `p.edit` hiện ở màn Phân quyền nhưng không chỗ nào kiểm
- **Thực tế:** Admin bật hay tắt hai quyền này cũng không có tác dụng. Đổi vai trò dùng `s.role`, mọi route dự án dùng `p.pub`.
- **Bằng chứng:** M5 #1, #2.
- **Tham chiếu:** §2, D-20, D-42.

### BUG-036 · Chiến dịch marketing: không huỷ được khi đang gửi, không có link huỷ đăng ký
- **Bằng chứng:** CR-17.
- **Tham chiếu:** QT-13 (gửi email), NĐ 13 (rút lại đồng ý).

### BUG-037 · Nội dung chiến dịch gần trần 100.000 ký tự thì vượt giới hạn body 100kb
- **Thực tế:** zod cho tới khoảng 105kB; body-parser chặn ở 100kB và trả 500 (BUG-003).
- **Bằng chứng:** M3 #10.
- **Code nghi ngờ:** `apps/server/src/modules/marketing/controllers/campaigns.controller.ts:63`.

### BUG-038 · Tab chi tiết dự án hiện nội dung cố định giống nhau cho mọi dự án
- **Thực tế:** tab điểm nổi bật, thư viện ảnh, cập nhật là dữ liệu mẫu (Q-B32-1).
- **Bằng chứng:** CR-26.
- **Code nghi ngờ:** `apps/server/src/modules/project/services/project-read.service.ts`.

### BUG-039 · Admin ghim hoặc bỏ ghim tin ở mọi phòng không ghi audit; xuất CSV đồng bộ chưa nhất quán audit
- **Bằng chứng:** CR-29, CR-30.
- **Tham chiếu:** BR-13.
- **Code nghi ngờ:** `apps/server/src/modules/chat/controllers/messages.controller.ts:58`, `message.service.ts:166-175`; `investor-admin.service.ts:156`, `event-registrants.service.ts:90`, `admin-fees.service.ts:213`, `service-admin.service.ts:251`.

---

## S4 — nhỏ

### BUG-040 · Màn đăng nhập lỗi hydration (React #418) khi đồng hồ máy khách lệch máy chủ
- **Tái hiện:** mở `/login` với đồng hồ trình duyệt lệch đủ để `quoteAt(Date.now())` rơi vào chu kỳ 7 giây khác so với lúc SSR. Ví dụ lệch 3 giờ: lỗi; đồng hồ thật: không lỗi.
- **Thực tế:** `pageerror: Minified React error #418`. Câu trích dẫn render lại phía client. 123/195 lượt dùng thử ghi lỗi này, vì mọi lượt đều bắt đầu từ `/login` với đồng hồ cố định của parity.
- **Bằng chứng:** `work/screens.jsonl` (`R418`); probe đồng hồ thật 0 lỗi, lệch 3 giờ 1 lỗi.
- **Code nghi ngờ:** `apps/portal/src/features/auth/components/login-hero.tsx:18` (`useState(() => Date.now())`), `packages/shared/src/fixtures/auth-hero.ts:49`.

### BUG-041 · Đăng ký sự kiện và phiếu YC có cạnh, trạng thái ngoài §8
- **Thực tế:**
  - Sự kiện có thêm Đã hủy → Đã đăng ký (đăng ký lại) và Đã tham dự → Đã đăng ký (bỏ check-in).
  - Phiếu YC có thêm trạng thái `done` sau Thành công.
- **Bằng chứng:** M4 #4, #5.
- **Tham chiếu:** §8. Cần PM chốt đây là mở rộng hợp lệ hay sai.

### BUG-042 · FE so tên vai trò thay vì quyền
- **Thực tế:**
  - Admin chặn TK `member` bằng `systemRole === 'member'`.
  - Portal từ chối mọi TK quản trị (kể cả moderator) bằng `systemRole !== 'member'`.
  - Nhãn TK demo theo `a.role === 'admin'`.
- **Bằng chứng:** M5 #7–#16.
- **Tham chiếu:** luật 4, §2.

### BUG-043 · Nút "Liên kết" trong rich text dùng `prompt()` của trình duyệt
- **Bằng chứng:** CR (DV-G3b-6).
- **Tham chiếu:** §14 (giao diện Ant Design).

### BUG-044 · Ba hộp xác nhận gần trùng nhau ở Admin không dùng chung
- **Bằng chứng:** CR-48.
- **Code nghi ngờ:** `apps/admin/src/features/{members,requests,settings}/components/confirm-dialog.tsx`.

---

## Đã kiểm, không phải lỗi (ghi lại để wave sau khỏi kiểm lại)

| Kiểm | Kết quả |
|---|---|
| Admin ẩn tin bị báo cáo → Portal | Tin không còn trả nội dung cho Portal (`hide-message` OK) |
| Gửi 2 lần cùng `Idempotency-Key` (phiếu YC) | Chỉ tạo 1 phiếu (`double-submit-service` OK) |
| Tên nhóm 5.000 ký tự | 400 có `fields`, không 500 (`long-input-group` OK) |
| Ảnh bìa nhỏ hơn hoặc bằng 90KB | 201 (`cover-90kb`) |
| Chat realtime 2 trình duyệt | Đạt (UAT-13) |
| P-05: TK chưa đóng phí bị 402 ở `/groups`, `/dashboard/live` | Đúng BR-03 (popup bắt buộc) |
| A-23: gửi lại OTP bị 429 | Đúng giới hạn gửi lại OTP; lượt kiểm lại sau khi xoá cache: OK |
| P-52, D-49: "Refused to execute script maps.googleapis.com" | Do bộ audit chặn ảnh ngoài; không phải lỗi app |
| P-14, D-06, P-29, P-33: bước thao tác hỏng | Kịch bản parity viết cho 390px hoặc cho dữ liệu prototype; lượt kiểm lại không ra lỗi app |

Finding phát sinh sau snapshot W1: [V2-P4-BUGS.md](../V2-P4-BUGS.md), gồm BUG-045
(identity/query cache). Không cộng vào bảng đếm lịch sử 44 lỗi ngày 18/10 ở trên.
