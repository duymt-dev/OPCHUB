# UI parity — câu hỏi / mâu thuẫn giữa prototype và rule

> Gặp mâu thuẫn thì ghi ở đây, chọn phương án an toàn và làm tiếp (GOAL L0). PM trả lời ở cột cuối.

| # | Chỗ | Prototype | Rule | Đã chọn (an toàn) | PM |
|---|---|---|---|---|---|
| Q-01 | Đăng nhập | Một màn cho cả admin và user; admin còn chuyển qua lại User Portal | routing-auth.md: hai app, tài khoản admin không vào Portal | Hai app, chặn sai cổng (DV-01) | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-02 | Đăng nhập admin | Không có bước TOTP | routing-auth.md: Admin bắt buộc TOTP sau mật khẩu | Chưa làm TOTP ở L0 (mock); để L2 thêm màn A-xx TOTP — prototype không có mẫu UI, cần duyệt thiết kế | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-03 | "Ghi nhớ đăng nhập" | Mặc định bật | Token chỉ trong bộ nhớ, refresh cookie httpOnly | Gửi `remember` lên API; backend quyết định thời hạn cookie refresh | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-04 | Tài khoản dùng thử | Hiện email + mật khẩu demo ngay trên màn đăng nhập | security.md: không lộ thông tin đăng nhập | Giữ để đạt parity và cho demo; **phải ẩn ở build production** (cờ env, làm khi có backend) | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-05 | Ảnh mẫu | Unsplash, randomuser.me, flagcdn hotlink | nextjs-structure.md: ảnh qua `next/image` + remotePatterns MinIO/Cloudflare | Giữ URL ngoài trong fixtures cho parity; thay bằng ảnh tự host trước go-live | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-06 | Font | Google Fonts Noto Sans (6 họ chữ, ~tải lớn) | Ngân sách First Load JS/CSS | App dùng font hệ thống (cùng stack); harness parity chặn Google Fonts ở **cả hai bên** để so công bằng. Cần chốt có tự host Noto Sans không | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-07 | Số liệu "312 đang trực tuyến", "+452", "4.218" trên màn đăng nhập | Số cứng hoặc mô phỏng | Dữ liệu thật từ API | Lấy từ fixtures; L1 nối `GET /v1/public/stats` (chưa có trong SRS §13 — cần bổ sung) | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-08 | Paywall "gói dịch vụ bắt buộc" (C-01) | Không tái hiện được: TK user duy nhất luôn đã đóng phí | routing-auth.md: `PaywallGate` khi `pending_payment`/`expired` | MSW thêm TK demo chưa đóng phí (ví dụ `chua.dongphi@…`) để chụp được P-xx paywall; chụp parity so với bản dựng tay từ template | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-09 | Đăng ký/SSO xong không đăng nhập (C-02) | Báo "Tài khoản đã kích hoạt" rồi quay về màn đăng nhập; mail chào mừng gửi mật khẩu tạm dù người dùng đã đặt mật khẩu | Luồng QT đăng ký trong SRS | Theo SRS: kích hoạt xong vào thẳng `/community`; bỏ mật khẩu tạm trong mail chào mừng khi người dùng tự đặt | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-10 | Admin ↔ User Portal (C-03) | Nút chuyển sang Portal không bao giờ hiện; "Hồ sơ cá nhân", "Xem chat" của admin không làm gì | Hai app tách (Q-01) | Admin có trang `/account` riêng trong app admin; "Xem chat" = trình xem chỉ đọc trong admin. Cần PM chốt | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-11 | Bảo mật chưa có lối vào (C-05/C-06) | Panel SSO, chính sách mật khẩu, 2FA admin, khóa sau 5 lần sai, màn Marketing có trong template nhưng không có tab/menu | security.md | Dựng các panel này thành tab trong Cài đặt (D-xx đã liệt kê là "unreachable"); chờ PM xác nhận vị trí | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-12 | Dữ liệu lệch giữa màn (C-04/C-08) | Cộng đồng 64 / 36 / 34; Super Admin dùng email của TK thành viên demo; thông báo của user hiện ở admin | Nguồn số liệu thật từ API | Lấy số từ API khi có backend; thông báo tách theo người dùng; tài khoản Super Admin seed = `admin@opchub.community` | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-13 | Thao tác admin nguy hiểm (C-10) | Đổi quyền hệ thống inline, khóa hàng loạt, xóa, xuất CSV không xác nhận, không audit | AGENTS luật 10 (audit_logs), data-state.md (`Modal.confirm`) | App mới luôn `Modal.confirm` + gửi audit; lệch UI ghi vào deviations khi làm D-xx | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-14 | Phí: xác nhận chuyển khoản (C-09) | "Tôi đã chuyển khoản" tự kích hoạt sau 2,2 giây | Đối soát webhook ngân hàng + outbox | MSW giả lập trễ như prototype; backend thật chờ webhook | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-15 | Popup không có URL (C-12) | Không popup nào có URL | routing-auth.md: modal chi tiết có URL khi cần chia sẻ | Chỉ chi tiết sự kiện và dự án có URL; các modal khác không có URL | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-16 | Xác minh DN (C-07) | Cài đặt nói không cần duyệt nhưng admin có nút "Xác minh DN"; "Chờ xác minh" không bao giờ hiện | REQ-004 | Huy hiệu tự gắn theo MST, không khớp → admin duyệt tay (D-40) | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-17 | Giá & CK (C-09) | "200.000đ → 50.000đ/tháng · Ưu đãi 75%"; nội dung CK kèm SĐT | 600.000đ/năm; đối soát webhook | "600.000đ/năm (≈ 50.000đ/tháng)", đối soát theo Mã TV (D-41) | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-18 | Đổi quyền inline (C-10) | Chọn "Quản trị viên" ngay trong bảng thành viên | auth-rbac.md, rule 10 | Chỉ hiển thị; đổi ở Phân quyền, cần `s.role` (D-42) | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-19 | Chủ nhóm / điều phối (C-11) | Chủ nhóm gán cứng, quyền không rõ | REQ-127 | Chủ nhóm theo `group_id`, `c.mod` toàn cục (D-43) | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-20 | Khóa đăng nhập (C-06) | "Khóa sau 5 lần sai" chỉ trang trí; TK bị khóa vẫn vào | security.md | 5 lần → 15 phút, TK khóa → 403 (D-44) | ✅ Duyệt theo đề xuất (16/10/2026) |
| Q-21 | SSO thành viên mới (C-02) | SSO xong quay về login | D-30 | Form bổ sung, bỏ OTP, vào `/community` (D-45) | ✅ Duyệt theo đề xuất (16/10/2026) |

## Chốt bổ sung (16/10/2026)

- Q-02: màn TOTP admin dựng theo modal OTP đăng ký (A-21).
- Q-03: `remember` bật → refresh cookie 30 ngày; tắt → cookie phiên trình duyệt.
- Q-04: hộp tài khoản dùng thử ẩn ở production bằng `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` (mặc định tắt).
- Q-06: tự host Noto Sans + Noto Sans SC (subset); Thai/Khmer/Lao/Myanmar tải theo ngôn ngữ. Khi đổi font phải chạy lại parity.
- Q-07: bổ sung `GET /v1/public/stats` (cache 60 giây) vào hợp đồng API.
- Q-12: số cộng đồng = 34; Super Admin seed = `admin@opchub.community`.

Quyết định đã ghi vào Decisions Log: D-26 → D-45 (`coding-packs/01-REQUIREMENTS-MATRIX.md`).

## Mới phát sinh khi làm G0+G1 (16/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-22 | D-35 ghi "mặc định tắt" hộp TK dùng thử. Hiện app chưa có backend, chạy MSW là bản demo. | Để trống biến → theo chế độ API: MSW hiện, API thật ẩn. Production (API thật) vẫn tắt mặc định; đặt `off` để ẩn cả bản demo. |
| Q-23 | Admin bấm tab "Đăng ký" / SSO trên màn đăng nhập admin thì làm gì (prototype dùng chung màn)? | Toast hướng dẫn (đăng ký ở cổng thành viên; admin đăng nhập bằng email + mật khẩu). Chưa có SSO admin. |
| Q-24 | Ngôn ngữ ngoài vi/en: prototype chỉ dịch ~10 chuỗi màn đăng nhập. | Dùng đúng các chuỗi đó, còn lại giữ tiếng Việt (D-06: vi + khung next-intl). |
| Q-25 | Mật khẩu ở form đăng ký: prototype không kiểm. | Chưa chặn ở client (giống prototype); backend sẽ kiểm theo security.md. |

## Mới phát sinh khi làm G2b — Cộng đồng (16/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G2b-1 | `GET /groups` (SRS §13) chỉ có `region, q, page`; prototype lọc Đã/Chưa tham gia, sắp xếp 3 kiểu, đếm theo vùng trên cả 34 nhóm. | 34 nhóm (D-29) nên FE tải một lần (`size=100`) rồi lọc/sắp xếp/phân trang tại chỗ; trạng thái lọc ghi lên URL. Nếu số nhóm tăng nhiều cần thêm `filter`, `sort`, `counts` vào API. |
| Q-G2b-2 | Rời nhóm / huỷ yêu cầu không hỏi lại (prototype). | Giữ như prototype (thao tác của chính thành viên, đảo ngược được); không `Modal.confirm`. |
| Q-G2b-3 | Nhóm cần duyệt: tự duyệt sau 8 giây chỉ là mô phỏng. | Không tự duyệt trong FE; khi có socket báo kết quả duyệt thì cập nhật thẻ + thông báo (DV-G2b-1). |

## Mới phát sinh khi làm G2c Chat nhóm (16/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G2c-1 | Đính kèm file / ảnh trong chat: giới hạn loại, dung lượng, có quét virus không? Prototype chỉ gửi tệp mẫu. | Tạm gửi tệp mẫu như prototype (DV-G2c-2). Khi làm upload: dùng presigned URL MinIO, ≤ 5 MB như `UploadImage`, loại PDF/DOC/XLS/ảnh. |
| Q-G2c-2 | SRS §13 chỉ liệt kê `GET /rooms/:id/messages`, WS `message.{send,react,pin,reply}`, report. Các endpoint REST còn lại của chat chưa có trong SRS. | Bổ sung (mock + schema `chat-room.ts`): `GET /me/chat`, `GET/POST /groups/:id/rooms`, `DELETE /rooms/:id`, `POST /rooms/:id/read`, `POST /rooms/:id/messages`, `POST /messages/:id/reactions`, `PUT /messages/:id/pin`, `GET /rooms/:id/{members,pins,files}`. Ghi/react/pin chạy REST tới khi có socket; payload trùng WS §13.4. Đề nghị cập nhật SRS §13. |
| Q-G2c-3 | Ai được xoá chủ đề? Prototype: chỉ người tạo xoá chủ đề của mình. Chủ nhóm / điều phối viên có xoá được chủ đề của người khác không? | Chỉ người tạo (như prototype); phòng Chung không xoá được. Chủ nhóm xoá hộ để sau khi có quyết định. |
| Q-G2c-4 | Danh sách "THÀNH VIÊN · N" và gợi ý nhắc tên: prototype lấy 8 người mẫu, không phải thành viên thật của nhóm. | Mock trả 8 người mẫu như prototype; API thật phân trang thành viên online (S-01: danh sách online lấy qua REST khi mở bảng). |

## Mới phát sinh khi làm G2a Dashboard + khung app (16/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G2a-1 | SRS §13 không có API cho Dashboard LIVE, đánh dấu thông báo đã đọc, mail chào mừng xem trước. | Bổ sung `GET /dashboard/live`, `POST /notifications/read` (bỏ `ids` = tất cả), `GET /me/welcome-mail` (204 khi đã xem); schema ở `@opchub/shared/api-domains` (dashboard.ts, inbox.ts). Đề nghị cập nhật SRS §13. |
| Q-G2a-2 | Badge "Chat nhóm 18" ở sidebar: prototype gán cứng. | Giữ tĩnh 18 (`PORTAL_NAV_BADGES`); khi có socket: tổng tin chưa đọc các phòng của người dùng. |
| Q-G2a-3 | Số liệu Dashboard (312 online, 4.218 TV theo 10 nước ASEAN, 26 thành viên LIVE) là mô phỏng; dự án là 34 tỉnh/thành VN. | Dựng đúng như prototype từ seed; số thật lấy từ presence/thống kê khi có backend. Cần PM chốt có giữ khối "Quốc gia" ASEAN không. |
| Q-G2a-4 | Thông báo của TK mới (chưa có seed). | Hộp thư rỗng (D-29 theo từng người), không dùng chung seed của TK demo. |

## Mới phát sinh khi làm G3a Sự kiện + Gói dịch vụ + phí thành viên (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G3a-1 | `GET /events?mode` (SRS §13) không có `mine`/`q`; prototype lọc "Đã đăng ký" và tìm theo tên + địa điểm. | Ít sự kiện (30 ngày tới) nên FE tải một trang (`size=100`) rồi lọc tại chỗ; lọc/tìm ghi lên URL. Nếu nhiều sự kiện cần thêm `mine`, `q` vào API. |
| Q-G3a-2 | Form tư vấn điền sẵn tên, SĐT, email, tổ chức, MST từ hồ sơ; `Me` hiện không có SĐT / MST. | Đọc `GET /me` (hồ sơ đầy đủ của G3c), parse lỏng bằng `requesterProfileSchema` (chỉ trường form cần) — không thêm endpoint mới. |
| Q-G3a-3 | Ô "Thách thức lớn nhất khi vận hành OPC? (không bắt buộc)" trên popup Gói dịch vụ không có trường API. | Giữ ô nhập trong bộ nhớ, chưa gửi. Đề nghị thêm `note` vào `POST /me/membership/transfer-confirm` hoặc khảo sát riêng. |
| Q-G3a-4 | Phiếu tư vấn: prototype lưu nghề nghiệp, loại hình, quy mô, chức vụ, website, thời gian, ngân sách; `createServiceRequestSchema` không có. | Thêm `details` (nhãn → giá trị, tuỳ chọn) vào schema tạo/xem phiếu; admin xem ở chi tiết phiếu. |
| Q-G3a-5 | Popup bắt buộc (BR-03) có chặn cả màn đang mở qua link trực tiếp (VD `/chat/...`) không? Nội dung nền có tải không? | Popup che mọi route Portal, nền vẫn tải (như prototype); backend vẫn phải trả `402/403` cho API nghiệp vụ khi phí chưa đóng (ngoài phạm vi FE — cần PM chốt mã lỗi). |
| Q-G3a-6 | TK vừa kích hoạt (D-30) là "Chờ thanh toán": thấy mail chào mừng rồi mới đến popup bắt buộc? | Mail chào mừng hiện trước; đóng mail thì popup bắt buộc hiện. |

## Mới phát sinh khi làm G3c Hồ sơ cá nhân (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G3c-1 | SRS §13 chỉ có `GET/PATCH /me` và `POST /auth/password/{forgot\|reset}`; chưa có đổi mật khẩu khi đã đăng nhập, đăng xuất thiết bị khác, liên kết/huỷ SSO, upload ảnh. | Bổ sung (schema `api-domains/profile.ts`, MSW `handlers/profile.ts`): `POST /auth/password/change` (204; sai MK hiện tại 400), `POST /auth/sessions/revoke-others` → `{ revoked }`, `POST\|DELETE /me/sso/:provider`, `POST /uploads/presign` → presigned PUT (≤ 5 MB, png/jpeg/webp). `GET /me` trả hồ sơ đầy đủ + `stats` (Nhóm/Sự kiện/Dự án) + `linkedSso`. Đề nghị cập nhật SRS §13. |
| Q-G3c-2 | Đổi email trong hồ sơ: prototype lưu thẳng. Email là tên đăng nhập — có cần OTP xác nhận email mới không? | Tạm lưu như prototype (chỉ kiểm định dạng); khi có backend nên gửi OTP tới email mới trước khi đổi (security.md). |
| Q-G3c-3 | Huỷ liên kết SSO cuối cùng khi TK chưa từng đặt mật khẩu (đăng ký qua SSO, D-45) sẽ khoá TK. | Mock cho huỷ tự do như prototype; backend nên chặn huỷ liên kết cuối nếu chưa có mật khẩu. |
| Q-G3c-4 | "Đăng xuất khỏi tất cả thiết bị": prototype luôn báo "2 thiết bị khác". | Hiện đúng số phiên server trả về (`revoked`); MSW trả 2. |
## Mới phát sinh khi làm G3b — Dự án OPC (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G3b-1 | SRS §13 chỉ có `GET/POST /projects`, `GET /projects/:id`, góp ý, quan tâm đầu tư. Thiếu API cho thống kê, theo dõi, xin quyền repo, chia sẻ vào nhóm, hữu ích/trả lời/tiếp nhận góp ý, danh sách nhà đầu tư của chủ dự án, gợi ý thành viên đội ngũ, dữ liệu form sửa. | Bổ sung (mock + schema `api-domains/project-portal.ts`): `GET /projects/stats`, `GET /me/projects`, `GET /me/projects/:id`, `PATCH /projects/:id`, `PUT /projects/:id/follow`, `POST /projects/:id/repo-access`, `POST /projects/:id/share`, `PUT /comments/:id/like`, `POST /comments/:id/replies`, `PUT /comments/:id/resolved`, `GET /projects/:id/interests`, `GET /members/suggest`. Đề nghị cập nhật SRS §13. |
| Q-G3b-2 | Prototype không có trạng thái "Dự án của tôi" trống cho TK demo (P-61 unreachable). | Dựng màn trống theo prototype ("Bạn chưa có dự án nào" + "+ Đăng dự án đầu tiên"); test hành vi bằng thành viên mới qua SSO (D-45). |
| Q-G3b-3 | "Nhắn tin" ở thẻ chủ dự án: mở tin nhắn 1-1 hay phòng chat nhóm? Prototype chỉ toast. | Giữ toast (DV-G3b-7) tới khi chốt có tin nhắn riêng. |
| Q-G3b-4 | Ai thấy dự án "Riêng tư" (BR-08)? Prototype: thành viên các nhóm được chọn + đội ngũ. Đội ngũ nhập tên tự do (có thể không phải thành viên OPC Hub). | Mock: chủ dự án + thành viên các nhóm được chọn + người trong đội ngũ trùng tên thành viên. API thật nên lưu `userId` cho thành viên đội ngũ được chọn từ gợi ý. |
| Q-G3b-5 | Một người được gửi quan tâm đầu tư mấy lần cho cùng dự án? Prototype đổi nút thành "✓ Đã gửi quan tâm" và không cho gửi lại. | Một lần/người/dự án (409 lần sau); chủ dự án không tự quan tâm (403); số tiền ≥ mức tối thiểu. |
| Q-G3b-7 | Sửa dự án đang hiển thị (published): ẩn đi chờ duyệt lại hay giữ bản cũ hiển thị trong lúc chờ? Prototype đưa về chờ duyệt. | Như prototype: "Gửi đăng dự án" → `pending_review` (dự án tạm ẩn khỏi Khám phá); "Lưu nháp" → `draft`. |
| Q-G3b-6 | Ảnh bìa, ảnh đội ngũ: lưu ở đâu, giới hạn? | Tạm data URL ≤ 5 MB PNG/JPG (DV-G3b-3). Đề nghị mở rộng `UPLOAD_KINDS` (profile.ts, làn G3c) thêm `project-cover`, `team-avatar` rồi dùng `POST /uploads/presign` + PUT. |

## Mới phát sinh khi làm G4a — Admin · Thành viên (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G4a-1 | SRS §13 Users (admin) chỉ có `GET /admin/users?type&q&page`, `PATCH /admin/users/:id/status`, `POST /admin/users/assign-groups`, `POST /admin/users/export`. Thiếu: đổi vai trò, khoá/mở hàng loạt, duyệt xác minh DN, số đếm theo loại cho chip. | Bổ sung (schema `api-domains/admin-members.ts`, MSW `handlers/members.ts`): `GET /admin/users` trả thêm hồ sơ đăng ký + `counts {all,business,personal}`; `PATCH /admin/users/:id/role {role}`; `POST /admin/users/status {userIds,status}`; `POST /admin/users/:id/verification {decision: approve\|reject}` (chỉ khi đang "pending", 409 nếu không). |
| Q-G4a-2 | D-42 nói bảng thành viên **chỉ hiển thị** quyền, đổi ở "Cài đặt & Phân quyền"; nhưng screens.md D-15 vẫn là đổi qua select trong bảng. | Giữ select trong bảng (parity D-15) nhưng: chỉ bật khi có `s.role` (Super Admin), luôn hỏi xác nhận, BE ghi audit (DV-G4a-1). Nếu PM muốn đúng chữ D-42 thì đổi select thành nhãn chỉ đọc (1 dòng ở `member-table.tsx`). |
| Q-G4a-3 | Modal gán nhóm có "Thành viên / Điều phối viên" (vai trò trong nhóm) nhưng `assignGroupsSchema` (SRS) không có trường vai trò; D-43 coi điều phối viên là quyền toàn cục `c.mod`. | FE gửi thêm `role: member\|moderator`; schema hiện bỏ qua trường này (zod strip). Cần PM chốt: bỏ ô chọn, hay thêm vai trò trong nhóm (chủ nhóm?) vào SRS. |
| Q-G4a-4 | Khoá tài khoản (hàng loạt và menu ⋯) là thao tác nguy hiểm (D-32: luôn xác nhận) nhưng prototype làm ngay. | ✅ **Đã chốt (17/10/2026)** theo D-32 + luật 10 (mục tiêu giai đoạn): khoá luôn qua hộp xác nhận "Khóa tài khoản?" rồi gọi API ghi audit; mở khoá làm ngay. Xem DV-G4a-2. |
| Q-G4a-5 | "Từ chối" xác minh DN: prototype khoá luôn tài khoản; D-40 nói chưa xác minh vẫn dùng bình thường. | Chỉ bỏ huy hiệu (`verification: rejected`), không khoá TK, có hộp xác nhận (DV-G4a-3). Hiện trạng thái "Đã từ chối xác minh" chưa có nhãn riêng trên bảng (vẫn "Hoạt động"). |
| Q-G4a-6 | "Xuất CSV" (hàng loạt) prototype chỉ toast; SRS có `POST /admin/users/export` (job). Người dùng nhận file thế nào? | Gọi `POST /admin/users/export {userIds}` (202, job) + toast "Đang xuất N mục ra CSV…"; tải file khi job xong (thông báo / email) chưa làm — chờ chốt kênh nhận file. |

## Mới phát sinh khi làm G4d Bot tương tác (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G4d-1 | SRS §13 Bot chỉ có CRUD persona/script, `POST /admin/scripts/:id/run`, `PATCH /admin/bot/settings`, `GET /admin/bot/log`. Tab "Hội thoại" cần nội dung từng lượt + duyệt/bỏ; tab "Nhật ký tự động" cần dòng hoạt động của worker + "tin tự động hôm nay". | Bổ sung (schema `api-domains/bot-threads.ts`, MSW `handlers/bots.ts`): `GET /admin/bot/threads`, `POST /admin/bot/threads/:id/approve` (pending → posted có điều kiện, 409 nếu đã đăng), `DELETE /admin/bot/threads/:id` ("Bỏ", chỉ khi chờ duyệt), `GET /admin/bot/activity` → `{ items, todayCount }`. `botSettings` thêm `autoGenerate`, `replyToMembers`; persona thêm `avatarUrl, gender, ageRange, bio, skills, postsPerDay, activeHours, color` (đúng §11 `persona`); script thêm `type, delayMinutes, runAt, inviteReal` (§11 `script`). Đề nghị cập nhật SRS §13. |
| Q-G4d-2 | Ảnh persona lưu ở đâu? | Tạm data URL ≤ 5 MB (DV-G4d-6). Đề nghị thêm `persona-avatar` vào `UPLOAD_KINDS` rồi dùng presigned PUT. |
| Q-G4d-3 | Prototype "Chế độ tự động 100%" mặc định bật và mô tả "không cần quản trị viên thao tác hay duyệt" — mâu thuẫn D-04 (duyệt trước khi đăng). | Giữ công tắc + chữ như prototype cho parity, nhưng mọi hội thoại do Admin "Chạy ngay" đều chờ duyệt (DV-G4d-3); worker thật cần PM chốt: tự động có bỏ qua duyệt không (OQ-05 / D-04). Có nên đổi copy "không cần … duyệt"? **Đã chốt → D-48.** |
| Q-G4d-4 | Xoá persona đang có trong lượt kịch bản: prototype vẫn giữ lượt (hiện "?"). | Mock giữ nguyên lượt, hiển thị "?" như prototype. Backend nên chặn xoá (409) hoặc tắt persona thay vì xoá khi còn kịch bản dùng — cần PM chọn. |
| Q-G4d-5 | Chủ đề AI tự sinh: prototype lưu khi gõ từng ký tự. | Lưu khi rời ô / Enter (`PATCH /admin/bot/settings { topics }`) để không gọi API mỗi phím. |

## Mới phát sinh khi làm G4b — Phí thành viên (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G4b-1 | SRS §13 chỉ có `GET /admin/fees?status&q&page`, `POST /admin/fees/:uid/{collect\|renew\|remind}`, `POST /admin/fees/remind`. Màn cần thêm thống kê (thẻ + số trên tab), thu hàng loạt, "Gửi nhắc hàng loạt" (không chọn ai) và xuất CSV. | Bổ sung (schema `api-domains/fees-admin.ts`, MSW `handlers/fees.ts`): `GET /admin/fees/summary`, `POST /admin/fees/collect { userIds }`, `POST /admin/fees/remind-all` (202 `{ queued }`), `POST /admin/fees/export { userIds }` → `{ filename, csv }`. `FeeRow` thêm `accountType`, `joinedAt` cho cột Loại / Ngày ĐK. Đề nghị cập nhật SRS §13. |
| Q-G4b-2 | "Ghi nhận đã thu" (thu tay, không qua webhook — D-31) có cần nhập số tham chiếu / chứng từ và xác nhận không? Prototype ghi nhận ngay bằng 1 bấm, kể cả hàng loạt. | Giữ như prototype (không hộp xác nhận) vì đây là thao tác cộng thêm, không phá huỷ; BE ghi `audit_logs` người thu + thời điểm. Nếu cần chứng từ thì thêm modal sau. |
| Q-G4b-3 | "Gửi nhắc hàng loạt" nhắc ai? Prototype đếm mọi thành viên **khác** "Đang hiệu lực" (gồm cả "Sắp hết hạn"). | Như prototype: chờ thanh toán + sắp hết hạn + hết hạn. |
| Q-G4b-4 | "Ghi nhận đã thu" ở dòng hết hạn: gia hạn từ hôm nay hay nối tiếp ngày hết hạn cũ? | BR-05: còn hiệu lực thì nối tiếp, đã hết hạn thì tính từ hôm nay (đúng `feeAction` sẵn có và prototype). |

## Mới phát sinh khi làm G4c — Admin Nhóm cộng đồng (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G4c-1 | SRS §13 chỉ có `CRUD /admin/groups`, `POST /admin/groups/:id/members/export`, `GET/POST /admin/reports/:id/action`. Thiếu: chi tiết nhóm cho form sửa (chủ nhóm, ĐPV, phòng mặc định, nội quy, ảnh bìa), xem trước/xuất thành viên **nhiều nhóm**, số thành viên theo nhóm, bộ lọc từ khóa kiểm duyệt. | Bổ sung (schema `api-domains/group-admin.ts`, mock `mock-data/domains/group-admin.ts`, MSW `handlers/admin-groups.ts`): `GET /admin/groups/:id`; thân `POST/PATCH /admin/groups` thêm `ownerId, moderatorIds, roomKeys, extraRooms, rules, coverUrl` (có mặc định, client cũ vẫn hợp lệ); `GET /admin/groups/members?groupIds&status`, `GET /admin/groups/member-counts`, `POST /admin/groups/members/export` (202 + audit); `GET/POST /admin/moderation/keywords`, `DELETE /admin/moderation/keywords/:word`. Đề nghị cập nhật SRS §13. |
| Q-G4c-2 | Ảnh bìa nhóm lưu ở đâu? | Tạm data URL ≤ 5 MB (DV-G4c-3); đề nghị thêm `group-cover` vào `UPLOAD_KINDS`. |
| Q-G4c-3 | "Khóa" trong thẻ báo cáo khóa TK người gửi — nguy hiểm theo D-32 nhưng prototype làm ngay. Mock `actOnReport('lock')` chỉ đóng báo cáo, chưa khóa TK. | Giữ làm ngay như prototype cho parity; backend nên xác nhận + outbox khóa TK (luật 8). "Ẩn & xóa" đã có xác nhận. |
| Q-G4c-4 | Xuất thành viên nhóm: prototype tạo file ngay ở trình duyệt; SRS là job nền (`202 { jobId }`). | Gọi `POST /admin/groups/members/export` (audit, 202) rồi tạo CSV / .xls ở trình duyệt từ dữ liệu xem trước như prototype. Khi có worker: tải file từ job. |
| Q-G4c-5 | Badge "4" của mục Nhóm cộng đồng (MOCK_BADGES) cố định, không giảm khi xử lý báo cáo. | Không sửa `features/shell` (ngoài làn). Đề nghị nối badge với `GET /admin/reports?status=open`. |
| Q-G4c-6 | Tạo nhóm cho tỉnh đã có nhóm: prototype chặn ("Đã có nhóm cho {tỉnh}", D-29: 1 nhóm/tỉnh). Mock server chỉ chặn trùng **tên**. | FE chặn theo tỉnh như prototype; backend nên ràng buộc unique `province`. |

## Mới phát sinh khi làm G5c — Admin Nhà đầu tư + Dịch vụ (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G5c-1 | SRS §13 chỉ có `GET /admin/investors?kind&q&page` (trả từng lần quan tâm). Màn cần nhà đầu tư **gộp** theo người (QT-10), thống kê, đổi trạng thái kết nối, trao đổi phía Admin, xuất CSV. | Bổ sung (schema `api-domains/investors-admin.ts`, mock `mock-data/domains/investors-admin.ts`, MSW `handlers/investors.ts`): `GET /admin/investors` trả bản gộp (`key` = id lần quan tâm đầu), `GET /admin/investors/summary`, `GET /admin/investors/:key`, `PATCH /admin/investors/:key/status`, `GET/POST /admin/investors/:key/comments`, `POST /admin/investors/export { kind?, q? }`. Khóa gộp tạm là tên + tổ chức; backend nên có `investor_id`. Đề nghị cập nhật SRS §13. |
| Q-G5c-2 | SRS §13 Services chỉ có `GET /admin/service-requests?status&q&page`, `PATCH /admin/service-requests/:code`, `POST …/comments`. Thiếu: thống kê theo trạng thái, danh sách nhân sự, CRUD danh mục dịch vụ, bình luận có gắn tên, xuất CSV. | Bổ sung (`api-domains/services-admin.ts`, `mock-data/domains/services-admin.ts`, `handlers/service-requests.ts`): `GET /admin/service-requests/summary`, `GET …/staff`, `POST …/:code/transition { from, to }` (luật 7), `PATCH …/:code/assignee`, `GET/POST …/:code/comments { body, mentions }`, `POST …/export`, `GET/POST /admin/services`, `PATCH/DELETE /admin/services/:id`. `PATCH /admin/service-requests/:code` vẫn nhận nhưng đổi trạng thái chỉ qua máy trạng thái. |
| Q-G5c-3 | Trạng thái kết nối nhà đầu tư: prototype cho bấm tự do cả 3 bước (kể cả lùi "Đã kết nối" → "Đã gửi"); SRS §8 chỉ vẽ chiều tiến. | Giữ như prototype (chọn tự do, có audit). Nếu cần chỉ đi tới thì chặn ở `setInvestorStatus`. |
| Q-G5c-4 | Máy trạng thái phiếu YC: SRS §8 "Mới → Đang tư vấn → Đã báo giá → Thành công \| Từ chối → mở lại"; prototype thêm "Đã chốt → Hoàn thành" và cho Từ chối từ Mới. | Theo prototype: new→consulting/lost, consulting→quoted/lost, quoted→won/lost, won→done, lost→consulting (`SERVICE_REQUEST_TRANSITIONS`). Enum `SERVICE_REQUEST_STATUS` ở `enums.ts` thiếu `done` (api-domains có) — nên đồng bộ. |
| Q-G5c-5 | "Ghi chú nội bộ" (rqNote / rqSaveNote) có trong logic prototype nhưng không có trên giao diện. | Không dựng (bình luận nội bộ đã thay vai trò này). |
| Q-G5c-6 | Gắn tên nhân sự trong bình luận: prototype gửi thông báo cho người được gắn. Danh sách nhân sự lấy từ đâu (vai trò nào)? | Mock `GET /admin/service-requests/staff` (4 người như prototype); backend nên lấy theo quyền `n.edit` và đẩy thông báo qua outbox. |
| Q-G5c-7 | Mục nav "Dịch vụ" của admin trỏ `/requests`, screens.md ghi `/service-requests`. | Theo nav (`/requests`, `/requests/catalog`); kịch bản parity bấm từ sidebar nên không cần `appPath`. Đề nghị sửa screens.md. |
## Mới phát sinh khi làm G5b — Admin Kiểm duyệt dự án (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G5b-1 | SRS §13 chỉ có `POST /admin/projects/:id/review` (và `GET /projects` công khai). Thiếu: danh sách admin mọi trạng thái kèm repo / link test / nhóm chia sẻ, thao tác hàng loạt, xoá, nổi bật tuần. | Thêm `GET /admin/projects?status&q&page&size` (DTO `adminProjectSchema`), `GET /admin/projects/counts`, `GET\|DELETE /admin/projects/:id`, `POST /admin/projects/bulk`, `PUT /admin/projects/featured` (MSW `admin-projects.ts`, schema `api-domains/project-admin.ts`); đề nghị bổ sung vào §13. |
| Q-G5b-2 | "Xuất bản lại" dự án Bị từ chối: prototype cho phép (`isOff` gồm hidden + rejected), SRS §8 coi Bị từ chối là trạng thái cuối (chủ dự án sửa rồi gửi lại). | Theo SRS §8: chỉ dự án Đã ẩn có "Xuất bản lại"; Bị từ chối chỉ xem. Bulk "Duyệt & xuất bản" chỉ áp dụng Chờ duyệt / Đã ẩn, còn lại báo "bỏ qua". |
| Q-G5b-3 | Badge "2" của mục Dự án ở sidebar (`MOCK_BADGES`) cố định, prototype giảm còn 1 sau khi duyệt. | Không sửa `features/shell` (ngoài làn). Đề nghị nối badge với `GET /admin/projects/counts` (`pending_review`). Số trên tab "Chờ duyệt" trong màn đã cập nhật đúng. |
| Q-G5b-4 | Nổi bật tuần: prototype chỉ lưu trong state và Portal tự chọn dự án nhiều người theo dõi nhất. | Lưu ở server (`PUT /admin/projects/featured`, audit); chỉ dự án Đang hiển thị, ẩn / xoá thì tự bỏ nổi bật. Portal (`/projects/stats.featured`) chưa đọc giá trị này — cần làn Portal nối khi có backend. |
| Q-G5b-5 | Từ chối có cần xác nhận không (prototype làm ngay khi đã chọn lý do)? | Có (luật 10, phá huỷ): hộp "Từ chối dự án?" sau khi kiểm lý do. Yêu cầu chỉnh sửa không xác nhận (đảo ngược được). |

## Mới phát sinh khi làm G5a — Admin Nội dung & Sự kiện (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G5a-1 | SRS §13 chỉ có `CRUD /admin/events` và `GET /admin/events/:id/registrations`. Màn cần thêm: giờ kết thúc, link Google Maps, nhóm tổ chức, mở/đóng đăng ký, ảnh bìa; check-in (từng người / tất cả); xuất CSV danh sách đăng ký. | Bổ sung (schema `api-domains/event-admin.ts`, mock `mock-data/domains/event-admin.ts`, MSW `handlers/admin-events.ts`): thân `POST/PATCH /admin/events` thêm `endTime, mapUrl, groupId, registrationOpen, coverUrl` (có mặc định); `GET .../registrations` (vẫn phân trang) thêm `org` + `status=attended`; `POST /admin/events/:id/registrations/check-in { userIds, attended }`; `POST /admin/events/:id/registrations/export` → `{ filename, csv }`. Mọi thao tác ghi `audit_logs`. Đề nghị cập nhật SRS §13. |
| Q-G5a-2 | Ảnh bìa sự kiện lưu ở đâu? | Tạm data URL ≤ 5 MB (DV-G5a-3); đề nghị thêm `event-cover` vào `UPLOAD_KINDS`. |
| Q-G5a-3 | Prototype không có nút xoá / huỷ sự kiện ở Admin. Có cần không? Huỷ sự kiện đã có người đăng ký thì báo ai, hoàn chỗ ra sao? | Không thêm UI xoá/huỷ (ngoài prototype). API mock `DELETE /admin/events/:id` đã ghi audit. Nếu thêm: hộp xác nhận + outbox báo người đăng ký (luật 8, D-32). |
| Q-G5a-4 | Danh sách đăng ký của prototype là 7 tên cố định (≤ số đã đăng ký) trong khi `registered` là số đếm (54, 143…). | Mock trả 7 người mẫu + người đăng ký thật trong CSDL giả; API thật trả đủ (phân trang). Có cần tìm / phân trang trong drawer khi N lớn không? |
| Q-G5a-5 | Tắt "Mở đăng ký": portal có chặn đăng ký mới không? Mock portal chưa đọc cờ này. | Đề nghị BE trả 409 "Sự kiện đã đóng đăng ký" khi `registrationOpen=false`; portal hiện nhãn tương ứng (làn portal). |
| Q-G5a-6 | Link chia sẻ dùng gốc portal nào? | Biến `NEXT_PUBLIC_PORTAL_URL` (mặc định `https://opchub.community`) + `/events/:id` (D-39). |

## Mới phát sinh khi làm G6b — Admin Marketing (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G6b-1 | SRS §13 không có endpoint Marketing (chỉ `GET/PUT /admin/mail/welcome`). | Đặt tên REST (schema `api-domains/marketing.ts`, mock `mock-data/domains/marketing.ts`, MSW `handlers/marketing.ts`): `GET /admin/marketing/summary`, `GET/POST /admin/campaigns` (POST `mode: draft\|schedule\|send`; `send` → 202 + job outbox), `DELETE /admin/campaigns/:id`, `POST /admin/campaigns/:id/send` (202), `GET /admin/campaigns/templates`, `GET /admin/campaigns/estimate?audience&groupIds`, `GET /admin/mail/log?page&size`, `POST /admin/mail/log/:id/resend` (202), `POST /admin/mail/welcome/test` (202). Mọi thao tác ghi audit. Đề nghị bổ sung §13 + bảng `campaigns`, `mail_log`. |
| Q-G6b-2 | Tab "Email tự động" trùng nội dung "Email chào mừng" trong Cài đặt (làn khác). Giữ cả hai nơi? | Giữ cả hai như prototype, dùng chung `GET/PUT /admin/mail/welcome` (không sửa `features/settings`). Nếu chỉ giữ một nơi, đề nghị giữ ở Marketing và Cài đặt dẫn link. |
| Q-G6b-3 | Prototype gửi mật khẩu tạm trong email chào mừng và cho xem lại ở Nhật ký gửi. | Không hiện lại mật khẩu (che `••••••••`). Theo D-30/D-45 nên bỏ hẳn mật khẩu tạm khỏi email (người dùng tự đặt mật khẩu khi đăng ký) — cần PM chốt. **Đã chốt → D-47.** |
| Q-G6b-4 | Đối tượng "Trạng thái: Chờ xác minh" có trong logic prototype nhưng không có nút; tỷ lệ mở/click lấy từ đâu? | Không dựng đối tượng này (Q-16: không còn trạng thái chờ xác minh). Mở/click: BE nhận webhook của nhà cung cấp mail (Brevo) qua adapter — ngoài phạm vi FE. |
| Q-G6b-5 | Gửi chiến dịch tới hàng nghìn người: giới hạn ngày của SMTP (`dailyLimit`), huỷ/tạm dừng chiến dịch đang gửi, hủy đăng ký nhận (unsubscribe)? | Chưa dựng (prototype không có). Worker nên chia lô theo `dailyLimit`, email có link hủy nhận; cần PM chốt trước L1. |

## Mới phát sinh khi làm G6a — Admin Cài đặt & Phân quyền (17/10/2026) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Đã chọn |
|---|---|---|
| Q-G6a-1 | SRS §13 Settings chỉ có `/admin/categories`, `/admin/roles/permissions`, `/admin/mail/welcome`, `/admin/smtp`, `/admin/smtp/test`. Màn cần thêm cài đặt chung, thứ tự + số dùng lĩnh vực, kiểm tra kết nối SMTP, tài khoản quản trị, nhật ký, SSO / chính sách, ngôn ngữ. | Bổ sung (schema `api-domains/settings-admin.ts`, mock `settings-config.ts` + `settings-log.ts`, MSW `handlers/settings.ts`): `GET/PATCH /admin/settings/general`, `GET /admin/categories` (thêm `projectCount`, `bizCount`), `PUT /admin/categories/order`, `PUT/PATCH/DELETE /admin/categories/:id` (409 nếu trùng tên / đang dùng), `POST /admin/smtp/verify`, `GET /admin/admins`, `POST /admin/admins/invite`, `DELETE /admin/admins/:id`, `GET /admin/audit-logs`, `GET/PATCH /admin/settings/security`, `GET/PATCH /admin/settings/languages`. Đề nghị cập nhật §13. |
| Q-G6a-2 | Ma trận prototype 8 dòng gộp, không khớp 14 permission key (D-20). Hiển thị theo cái nào? | Theo 14 key của `PERMISSION_GROUPS` (DV-G6a-2). Nếu PM muốn giữ 8 dòng gộp thì cần bảng ánh xạ dòng → key. **Đã chốt → D-46.** |
| Q-G6a-3 | Logo nền tảng lưu ở đâu? `UPLOAD_KINDS` chưa có loại cho logo. | Tạm gửi data URL (PNG/SVG/JPG/WebP ≤ 2 MB) trong `PATCH /admin/settings/general { logoUrl }`; đề nghị thêm `platform-logo` (presigned URL). |
| Q-G6a-4 | Mời quản trị viên: người được mời đã là thành viên thì nâng quyền hay tạo tài khoản mới? Lời mời hết hạn sau bao lâu? Ai được mời Super Admin? | Chỉ mời được Quản trị viên / Điều phối viên, cần `s.role`; dòng "Chờ chấp nhận" đến khi người nhận bấm link. Chưa có hạn lời mời / gửi lại — chờ PM. |
| Q-G6a-5 | Tắt nhà cung cấp SSO / đổi chính sách mật khẩu áp dụng ngay cho portal? Portal (A-30) chưa đọc cấu hình này. | Lưu ở server + audit; portal / auth BE cần đọc `GET /admin/settings/security` (hoặc endpoint công khai rút gọn) — làn auth nối. Độ dài mật khẩu tối thiểu mới chỉ áp dụng cho lần đặt mật khẩu sau. |
| Q-G6a-6 | Tắt ngôn ngữ: người dùng đang chọn ngôn ngữ đó thì sao? | Không cho tắt ngôn ngữ mặc định (như prototype). Người dùng đang dùng ngôn ngữ bị tắt đề nghị rơi về mặc định ở lần tải sau — chờ PM. |

## Backend (B1 → B6) — đã chọn phương án an toàn, chờ PM xác nhận

| # | Câu hỏi | Phương án đang làm |
|---|---|---|
| Q-B02-1 | data-model ghi `id uuid`, nhưng FE + e2e dùng id prototype trong URL và API (`/chat/c1`, `/events/e1`, `/v1/projects/p1/interest`, `m1`…). Đổi sang uuid thì 115 e2e + parity trên server thật (B62/B63) phải sửa test. | Cột khoá chính kiểu **`text`**, mặc định sinh UUID v7 (`uuid(7)`) cho bản ghi mới; seed (bắt buộc + demo) giữ id prototype (`c1…c34`, `m1…`, `p1…`). Hợp đồng zod vốn là `z.string()` nên không phá FE. |
| Q-B11-1 | Form đăng ký FE không bắt buộc mật khẩu/SĐT (e2e chỉ điền họ tên, vai trò, nhóm, email), trong khi TIP-B11 yêu cầu kiểm `minPasswordLength`. | Mật khẩu + SĐT **được bỏ trống**: TK tạo không có mật khẩu, người dùng đặt sau qua "Quên mật khẩu" (B12). Nếu có nhập thì mật khẩu phải ≥ `minPasswordLength` và đủ 3/4 tiêu chí độ mạnh (giống FE); SĐT chuẩn hoá E.164, trùng → 409. |
| Q-B11-2 | Trên server thật OTP gửi qua FakeMail, e2e không đọc được hộp thư nhưng gõ cứng `123456`. | Biến env `OTP_FIXED_CODE` (chỉ dev/test; env schema **từ chối khởi động** nếu đặt ở production). Mã vẫn lưu HMAC, vẫn giới hạn sai 5 lần / gửi 3 lần mỗi 15'. |
| Q-B11-3 | `GET /me/welcome-mail` (popup xem trước mail chào mừng) chưa thuộc TIP nào; D-38 `/public/stats` chưa có schema. | Làm trong B11: popup lấy một lần (Redis 30 ngày, lần sau 204). Thêm `publicStatsSchema {members, communities}` vào shared; FE hero vẫn dùng số cố định cho tới khi nối (ghi nhận cho B62). |
| Q-B11-4 | SSO thật cần client ID (OQ-04). | `SsoProvider` adapter + `FakeSsoProvider` (code dạng email → danh tính đó). Callback `GET /auth/sso/:provider` chuyển về `/sso/callback?provider&code=mock` của Portal. Provider bị Admin tắt → 403. |
| Q-B12-1 | D-27 TOTP admin, nhưng FE Admin chưa có màn nhập mã 2 lớp / bật TOTP. | Chỉ bắt buộc khi TK **đã bật** (`totp_secret_enc` có giá trị): login trả 401 `Cần mã xác thực 2 lớp` + `fields[{path:'mfaToken'}]`, bước 2 `POST /auth/totp/verify {mfaToken, code}`. `requireAdmin2fa` chưa ép buộc khi TK chưa bật. Màn bật/tắt TOTP: B40. |
| Q-B12-2 | Portal chưa có trang `/reset-password?token=` (link trong mail quên mật khẩu). | API `POST /auth/password/reset {token,newPassword}` + schema `resetPasswordSchema` đã có; trang FE ghi nhận cho B62 (không đụng FE trong pha BE). |
| Q-B13-1 | `POST /uploads/presign` (ảnh đại diện) FE đang gọi nhưng chưa thuộc TIP nào. | Làm trong B13 ở module `uploads` riêng: key `avatar/{userId}/{uuid}.{ext}`, PUT ký 5', ≤ 5 MB, png/jpeg/webp. Kiểm lại `head()` sau upload để chặn file giả kiểu → ghi nhận cho B65 (bảo mật). |
| Q-B13-2 | Liên kết SSO từ màn Hồ sơ (prototype chỉ bật/tắt, chưa có OAuth thật — OQ-04). | `POST /me/sso/:provider` ghi `auth_identities` với subject `provider:email`; khi có OAuth thật sẽ đổi sang luồng redirect. Mặc định TK mới **không** liên kết sẵn (prototype mock gắn sẵn Google+LinkedIn — chỉ là dữ liệu demo, seed demo B6 sẽ tái tạo). |
| Q-B13-3 | Hồ sơ hiển thị `persona` là nhãn ("Chuyên gia") nhưng đăng ký gửi id (`expert`). | Lưu id trong `users.registration_role`, trả nhãn; PATCH nhận nhãn hoặc id. TK DN trả `persona = "Doanh nghiệp"`. |
| Q-B14-1 | Đối soát thiếu tiền / nhiều Mã TV / Mã không tồn tại / Nhà đầu tư chuyển khoản: xử lý thế nào? | Để `unmatched`, ghi lý do vào `raw._unmatchedReason`, phí không đổi — Admin xử lý tay ở màn Phí (B15). Thừa tiền vẫn kích hoạt 1 kỳ (không cộng dồn kỳ theo bội số). |
| Q-B14-2 | `transfer-confirm` (D-31) có tạo bản ghi gì không? | Không ghi DB — chỉ trả trạng thái hiện tại + `awaitingWebhook: true`, idempotent theo `Idempotency-Key` 24h. E2E trên server thật cần `POST /v1/dev/bank/simulate` (chỉ non-production + FakeBank) để giả webhook — ghi cho B62. |
| Q-B14-3 | Realtime `membership.updated` từ worker tới socket. | Worker publish Redis kênh `socket:user` `{userId, event, data}` (đã parse theo `serverEvents`); process socket subscribe + emit `user:{id}` ở B22. |
| Q-B15-1 | Thu tay (`collect`/`renew`) cần lý do (D-41, CHECK DB) nhưng FE không gửi body. | Server dùng lý do mặc định **"Admin ghi nhận đã thu"** + audit `fee.collect` (người thu = actor). Khi FE có ô lý do sẽ nhận `{reason}`. |
| Q-B15-2 | Hàng đợi giao dịch không khớp + khớp tay: TIP có nhưng Admin chưa có màn. | API `GET /admin/fees/transactions?before=&size=` (keyset) + `POST /admin/fees/transactions/:id/match {userId, reason}` → kỳ `manual`, giao dịch `manual`. Màn FE ghi nhận ngoài phạm vi BE. |
| Q-B15-3 | AC TIP-B15 "khoá → token cũ 401" nhưng guard B07 kiểm `auth:locked` trước → 403 "Tài khoản đã bị khóa". | Giữ **403** (thông điệp đúng hơn, FE đã xử lý 403 locked → đăng xuất). Đăng nhập lại cũng 403 (BR-02). |
| Q-B15-4 | Quyền màn Phí thành viên: không có key `f.*` trong 14 key (D-46). | Dùng nhóm "Thành viên": đọc `m.view`, ghi `m.edit`. Đổi vai trò dùng `s.role` (D-42). |
| Q-B20-1 | Chủ nhóm bấm "Rời nhóm": spec không nói. Nhóm mất người duyệt yêu cầu. | Chặn **409 "Chủ nhóm không thể rời nhóm"**; Admin đổi chủ nhóm trước. |
| Q-B20-2 | Admin sửa nhóm bỏ chọn phòng mặc định / xoá phòng thêm: phòng có thể đã có tin nhắn. | Form sửa chỉ **thêm** phòng (không xoá phòng đang có tin). Xoá phòng đi qua chat (B23 `DELETE /rooms/:id`). |
| Q-B20-3 | Quyền màn Admin Nhóm: 14 key có `c.create`, `c.room`, `c.mod`. | Đọc `m.view` (moderator mặc định có), ghi nhóm `c.create`. Audit tag `content`. |
| Q-B20-4 | Nhóm tạo từ Admin: không chọn chủ nhóm (`ownerId` trống). | Người tạo (admin) làm chủ nhóm; admin là thành viên `owner` của nhóm đó. |
| Q-B20-5 | Lọc `region=Khác`: enum DB chỉ có 3 miền (mọi tỉnh trong danh mục thuộc 3 miền). | Trả rỗng. Tạo nhóm với tỉnh ngoài danh mục → 400 `province`. |
| Q-B23-1 | Portal và Admin dùng chung `GET /groups/:id/rooms`, `GET /rooms/:id/messages` nhưng DTO khác (Admin cần `isSimulated`, D-48). | Server chọn DTO theo quyền người gọi: có `c.mod` → DTO admin (`roomSchema`/`messageSchema`, chỉ đọc, không cần phí); thành viên → DTO Portal (không `isSimulated`). |
| Q-B23-2 | `message.new` phát cho cả phòng nhưng DTO có trường riêng từng người (`myReactions`, `reportedByMe`). | Phát bản trung lập (`[]`/`false`); client giữ phần của mình. Người gửi nhận DTO đầy đủ trong ack. |
| Q-B23-3 | Chưa đọc khi chính mình gửi tin. | Gửi tin = đã đọc tới tin đó (seq phòng ở Redis; người khác +1 qua seq, không ghi theo từng người nhận — S-02/S-05). |
| Q-B23-4 | `GET /rooms/:id/members` không phân trang trong hợp đồng; mock trả 8 người cố định. | Trả 50 thành viên đầu (chủ nhóm/ĐPV trước) + `total = member_count`; online theo presence Redis. Phân trang thêm khi FE cần. |
| Q-B23-5 | Ảnh bìa/thumb nhóm (`thumbUrl`, `coverUrl`) chưa có nguồn thật. | Giữ quy ước prototype (Unsplash cố định c1–c6, picsum cho nhóm khác); thay bằng `groups.cover_url` khi tự host (D-36). |
| Q-B24-1 | Ca từ khoá (`auto`) không có lý do người dùng chọn nhưng `reportSchema.reason` bắt buộc. | Suy lý do theo từ khoá seed (chuyển khoản trước/vay nóng/kiếm tiền nhanh → `scam`, bán tài khoản → `spam`, số CCCD/mật khẩu → `personal_info`, đồ ngu → `abuse`); từ khoá Admin thêm → `other`. |
| Q-B24-2 | Một tin bị nhiều người báo: hiển thị 1 dòng `reporterCount` hay nhiều dòng? | Gom 1 ca mở theo (tin, nguồn) — `reporterCount` tăng; lượt báo từng người ở `message_flags` (Admin thấy người báo, D-43). Ẩn tin đóng mọi ca mở của tin đó. |
| Q-B24-3 | Hành động `warn`: nội dung cảnh báo gửi người vi phạm. | Outbox `moderation.warned` → thông báo cá nhân (B25) "Tin nhắn của bạn vi phạm nội quy nhóm", link tới phòng. |
| Q-B21-1 | `GET /admin/groups/requests` có trong MSW/TASK-GRAPH nhưng không màn FE nào gọi. | Không làm endpoint; duyệt yêu cầu đi qua `GET/POST /groups/:id/requests` (chủ nhóm hoặc `c.mod`). |
| Q-B30-1 | FE hiện gửi ảnh bìa dự án / sự kiện / avatar đội dạng data URL (không qua presign). | BE nhận cả hai: data URL ảnh PNG/JPEG/WEBP ≤ 2.000.000 ký tự, hoặc URL storage của chính người gửi (`${kind}/${userId}/…`, kiểm `head` ≤ 5MB). Đã thêm kind `project-cover`, `team-avatar`, `event-cover` để FE chuyển sang presign (B60). |
| Q-B31-1 | Điều phối viên có `e.reg` thấy menu Sự kiện nhưng hợp đồng ghi `GET /admin/events` cần `e.edit`. | Đọc lịch + danh sách đăng ký/check-in/xuất: `e.reg`; tạo/sửa/xoá: `e.edit`. |
| Q-B31-2 | Mail xác nhận đăng ký sự kiện (toast "email xác nhận đã được gửi"). | Outbox `event.registered` đã có; B31 mới sinh thông báo cá nhân. Mail template sự kiện làm ở B41 (consumer thêm vào cùng sự kiện). |
| Q-B32-1 | Trang chi tiết dự án: điểm nổi bật / thư viện ảnh / cập nhật không có nguồn dữ liệu. | Giữ nội dung cố định như prototype; mục "Xuất bản trên OPC Hub" theo ngày xuất bản thật. Cần đặc tả nếu muốn chủ dự án tự nhập. |
| Q-B32-2 | Ảnh bìa mặc định khi dự án chưa có ảnh. | Thẻ / Admin dùng 1 ảnh mẫu Unsplash cố định; `/me/projects/:id` trả `null` (form sửa). Seed demo (B62) gán ảnh như prototype p1–p6. |
| Q-B32-3 | D-18 "bản đang hiển thị giữ nguyên tới khi bản sửa được duyệt" (REQ-106) vs prototype về Chờ duyệt ngay (Q-G3b-7). | Theo prototype: lưu là về `pending_review`/`draft`, rời Khám phá và bỏ nổi bật. Giữ bản hiển thị song song cần bảng phiên bản — chờ PM. |
| Q-B32-4 | Chia sẻ dự án gửi tin vào phòng Chung: tin mang tên người chia sẻ. | Đi qua `MessageService.send` (quyền thành viên, rate limit 10/10s, idempotent `clientMsgId`). Chia sẻ > 10 nhóm cùng lúc có thể chạm rate limit — chấp nhận. |
| Q-B33-1 | Admin "Nhà đầu tư" gom theo `investorName` + `organization` trong mock. | Gom theo tài khoản (`investor_key` = user_id); bảng `investor_summaries` cập nhật cùng transaction để danh sách là Index Scan. Loại/đơn vị/SĐT = lần quan tâm mới nhất. |
| Q-B33-2 | `totalAmount` cộng lẫn VND và USD. | Giữ như mock (cộng số nguyên theo đơn vị gốc). Cần quyết định quy đổi nếu có dự án gọi vốn USD thật. |
| Q-B34-1 | Dashboard live: danh sách thành viên / hoạt động / quốc gia / phiên / thảo luận chưa có nguồn thật. | Số tổng quan thật (nhóm, thành viên, online Redis, tin hôm nay, chỗ sự kiện sắp tới); phần còn lại dùng bộ mô phỏng prototype dùng chung với MSW — thay dần khi B45 bot có dữ liệu. |
| Q-B40-1 | Seed e2e mong đợi 4 tài khoản quản trị (Nguyễn Văn An là chủ sở hữu) nhưng seed bắt buộc chỉ có 1 Super Admin (D-29). | Seed bắt buộc giữ 1 Super Admin; 4 quản trị + 6 dòng nhật ký mẫu thuộc **seed demo B62**. `GET /admin/admins` = users vai trò ≠ member + lời mời đang chờ (`inv-…`, status `invited`). |
| Q-B40-2 | Câu nhật ký mock viết hoa đầu câu / tiếng Anh lẫn lộn. | Server thống nhất câu thường dạng động từ ("cập nhật cài đặt chung", "mời … làm Điều phối viên"). Tag theo AUDIT_TAGS; marketing/dịch vụ dùng `content`, bot dùng `moderation` (không thêm tag mới). |
| Q-B40-3 | Xoá lĩnh vực đã dùng (BR-11). | Lĩnh vực có dự án đang sống / hồ sơ DN → 409 "Lĩnh vực đang được sử dụng – hãy ẩn thay vì xoá"; xoá được thì soft delete + đổi tên `name#id` để tên cũ dùng lại được. |
| Q-B41-1 | Verify SMTP trên dev/test không có mạng. | `MAIL_PROVIDER=fake` → không mở kết nối, chỉ cần có key (gửi kèm hoặc đã lưu) → "Xác thực thành công với host:port". `smtp` → `transport.verify()` thật. |
| Q-B41-2 | Hạn mức `daily_limit` của SMTP (Brevo free 300/ngày). | Đếm Redis theo ngày VN, vượt → job mail dời tới 00:00 VN (`moveToDelayed`), không tính lần thử, không mất thư. Chỉ áp dụng khi gửi qua cấu hình `smtp_configs`. |
| Q-B41-3 | `POST /admin/mail/welcome/test` + `/admin/smtp/test` ghi `mail_logs` kind `test` → không hiện ở Nhật ký thư (chỉ welcome/campaign). | Giữ: nhật ký thư chỉ hiện thư thật tới thành viên; thư thử xem qua audit (`mail.welcome.test`, `smtp.test`). |
| Q-B42-1 | Ước tính người nhận "theo nhóm" của prototype = tổng `member_count` (đếm trùng người ở nhiều nhóm). | Ước tính giữ tổng `member_count` như prototype (nhanh, khớp UI); khi gửi xong `recipients` chốt = số thư thực xếp (đã loại trùng). Tất cả/DN/Cá nhân đếm users active. |
| Q-B42-2 | Mẫu soạn nhanh (templates) chưa có bảng. | Hằng prototype dùng chung `@opchub/shared/mock-domains` (`listMailTemplates`); cần bảng khi Admin muốn tự sửa mẫu. |
| Q-B42-3 | Tỷ lệ mở/nhấp (`openRate/clickRate`) cần webhook nhà cung cấp (Q-G6b-4). | Cột có sẵn, giá trị `null` cho tới khi nối webhook Brevo (ngoài phạm vi B5). |
| Q-B43-1 | Xuất đồng bộ đang có (phí, NĐT, đăng ký sự kiện, phiếu dịch vụ) FE phụ thuộc CSV inline. | Giữ inline (bảng nhỏ, có audit). Job bất đồng bộ chỉ cho thành viên (`/admin/users/export`) + thành viên nhóm (`/admin/groups/members/export`), trạng thái `GET /admin/exports/:id` (chỉ người tạo; `url` presign 5'). FE hiện vẫn dựng file từ `GET /admin/groups/members` — nối tải file từ job ở B60. |
| Q-B44-1 | Sidebar Admin gọi 3 API rời (báo cáo, dự án, phiếu YC) → lỗi 403 khi thiếu một quyền làm hỏng cả Promise.all. | Thêm `GET /admin/badges` trả `{reports, projects, requests}` theo quyền người gọi (không có quyền → 0; không có quyền Admin nào → 403). FE đổi sang endpoint này ở B60. `GET /admin/overview` (`adminOverviewSchema` mới) thay số cứng màn Tổng quan. |
| Q-B44-2 | `weekly_active` cần quét tin nhắn 7 ngày toàn bảng. | Thêm BRIN `messages(created_at)` (bảng chỉ INSERT theo thời gian, chi phí ghi gần 0) — job 00:10 VN chạy Bitmap Index Scan thay Seq Scan. |
| Q-B45-1 | Bot đăng tin: giới hạn S-11 "N tin/phút/nhóm" chưa có số. | 30 tin persona/phút/nhóm (Redis); vượt → 429 khi duyệt, hội thoại đã chuyển `posted` → duyệt lại không được; Admin chạy lại kịch bản. Cần PM chốt N. |
| Q-B45-2 | Cờ FEATURE_BOTS / FEATURE_SERVICES (D-05) chưa có trong env. | Thêm vào zod env, mặc định `false` (production tắt); `.env.example` dev/test bật để e2e Admin chạy. Tắt → module không đăng ký → 404. |
| Q-B45-3 | Id persona/kịch bản: e2e đòi `ps\d+`. | Sequence `persona_seq` / `bot_script_seq` bắt đầu 100 (seed demo prototype dùng ps1…/sc1… không đụng). |
| Q-B46-1 | Nhân sự phụ trách phiếu YC: mock cố định 4 tên. | Danh sách = tài khoản quản trị đang hoạt động có `n.edit` theo ma trận quyền hiện hành; @nhắc theo tên → thông báo cá nhân (outbox `service_request.mentioned`). |
| Q-B46-2 | Màn dịch vụ Portal nằm trong hộp phí (paywall) — thành viên chưa đóng phí vẫn phải gửi được phiếu tư vấn. | `GET /services`, `POST /service-requests` bỏ qua kiểm phí (`@SkipMembershipFee`), vẫn cần đăng nhập + Idempotency-Key. |
| Q-B64-1 | `/socket.io` sticky: TIP ghi `ip_hash`, Vision §3.2 nói websocket-only không cần sticky. | Giữ `ip_hash` (vô hại, client reconnect về cùng instance). |
| Q-B64-2 | `NEXT_PUBLIC_*` nhúng lúc build. | `deploy.sh` chép `/etc/opchub/{portal,admin}.env` thành `.env.production.local` trước `pnpm build`; đổi giá trị phải deploy lại. |
| Q-B64-3 | Presigned URL trỏ `S3_ENDPOINT` 127.0.0.1 — trình duyệt không tới được. | Server block `s3.opchub.community` proxy RustFS :9000 giữ Host (chữ ký S3). Chủ nhà chốt tên miền (L3). |
| Q-B64-4 | `DIRECT_URL` không có trong `apps/server/.env.example`. | Chỉ `deploy.sh` dùng cho `prisma migrate deploy`; schema env server bỏ qua khoá lạ. |
| Q-B64-5 | Đường đăng ký thật là `/v1/auth/register/{personal,business}`. | Một zone rate-limit 5/phút/IP cho register + otp; login 10/phút; webhook ngân hàng không giới hạn. |
| Q-B64-6 | Rollback không hoàn tác migration. | Health lỗi → trả symlink `current` về bản trước; README yêu cầu migration tương thích ngược (expand → contract). |
| Q-B64-7 | Socket không có `/health`. | Health/deploy gọi handshake polling `/socket.io/?EIO=4&transport=polling`, 400 = sống. Endpoint health riêng cho socket để sau (đổi server). |
| Q-B65-1 | Sentry chưa có DSN. | Chỉ giữ chỗ `SENTRY_DSN=` trong env example + slo.md; SDK tích hợp khi Chủ nhà cấp DSN. |
| Q-B65-2 | §14 giữ backup 30 ngày, TIP ghi 14 bản. | Local 14 bản (`BACKUP_KEEP_LOCAL`), offsite 30 ngày (`BACKUP_KEEP_REMOTE_DAYS`). |
| Q-B65-3 | PITR cần base backup vật lý. | WAL archive cấu hình + đẩy offsite; `pg_basebackup` hằng tuần ghi ở restore.md (L3, chưa lập lịch). |
| Q-B65-4 | `BACKUP_REMOTE` trống. | Vẫn giữ bản local nhưng cảnh báo + exit 1 (không đạt yêu cầu offsite). |
| Q-B61-1 | B61 đối chiếu bảng 193 endpoint với route server: thiếu 7 (`GET /admin/bot/log`, `GET /admin/groups/requests`, `GET /admin/reports/:id/action`, `PATCH /admin/service-requests/:code`, `POST /admin/groups/:id/members/export`, `GET\|PUT /uploads/:key`); `:uid` ≠ `:userId`. | Hợp đồng là nguồn sự thật → thêm đủ 7 route (bot log deferred join; yêu cầu chờ mọi nhóm chỉ xem, quyền `c.room`; PATCH phiếu gộp transition có điều kiện + giao việc). Đổi tên tham số trong bảng thành `:userId` (chỉ là tên, đường thật không đổi). |
| Q-B61-2 | `GET\|PUT /uploads/:key` chỉ có trong MSW (giả MinIO). | `STORAGE_PROVIDER=local` (chỉ dev/e2e, cấm production — env zod chặn): object lưu đĩa `LOCAL_STORAGE_DIR` ngoài repo, URL PUT ký HMAC (key + kiểu + kích thước + hạn) như presigned S3; production vẫn S3/RustFS, route trả 404. |
| Q-B61-A1 | `harness.ep` không trả header nên không đọc được cookie refresh. | Spec lấy cookie bằng `t.call('/auth/login')` thường; harness giữ nguyên. |
| Q-B61-A2 | `GET /admin/exports/:id`, `POST /auth/totp/verify` FE chưa gọi. | Dùng schema server `respond` (`exportStatusSchema`, `loginResponseSchema`). |
| Q-B61-A3 | FE `PATCH /admin/users/:id/status` dùng schema inline `{id, status}`. | Contract chép đúng schema inline; đề xuất đưa vào `packages/shared` sau. |
| Q-B61-C1 | Tạo nhóm Admin chỉ nhận tỉnh thật (đều đã có nhóm seed). | Test xoá mềm tạm nhóm seed `c33` rồi khôi phục trong `finally` (giống spec B20 dùng `c34`). |
| Q-B61-C2 | `GET /groups/:id/rooms` trả shape khác cho Admin (`roomSchema`) và thành viên (`chatRoomSchema`). | Contract kiểm cả hai góc nhìn với đúng schema FE tương ứng. |
| Q-B61-D1 | `POST /webhooks/bank`, `/dev/bank/simulate` trả `{ received }` nhưng chưa có zod chung (FE không gọi). | Contract dùng `z.object({ received: int })` cục bộ; đề xuất thêm `bankWebhookAckSchema` vào shared sau. |
| Q-B61-D2 | Cột quyền trong bảng ghi `m.edit` cho GET `/admin/fees`, `/admin/fees/transactions`, `/admin/fees/export`; controller dùng `m.view`. | Giữ server (đúng quy ước "GET dùng key đọc"); bảng ghi cặp `m.view / m.edit` như các mục khác. |
| Q-B61-D3 | `POST /admin/fees/remind-all` xếp thư nhắc cho mọi TV chưa hiệu lực trong DB test (mail fake). | Gọi một lần như hợp đồng yêu cầu; `mail_logs` DB test tăng mỗi lượt chạy (chấp nhận, DB test). |
| Q-B62-1 | e2e/k6 một máy: mọi request cùng IP → rate limit login/OTP chặn. | Env `RATE_LIMIT_DISABLED` (chỉ dev/e2e/k6; server từ chối ở production). |
| Q-B61-B1 | `removeTestGroups` xoá mọi nhóm "Tỉnh thử …" — hai tiến trình vitest chạy cùng lúc trên DB test xoá nhóm của nhau (flaky). | Một tiến trình đã tuần tự (`fileParallelism: false`); lane B dùng tiền tố riêng + xoá theo id. Cổng chạy một tiến trình nên không ảnh hưởng. |
| Q-B61-B2 | `POST /admin/smtp/verify` cần `username` khác rỗng; cấu hình đã lưu có thể `''`. | Đúng validation (form FE bắt buộc); test gửi username tường minh, server giữ nguyên. |
| Q-B61-B3 | Khoá upload có `/` (`avatar/<uid>/<uuid>.png`), mẫu `:key` một đoạn. | Contract gửi khoá encode `%2F` (Express giải mã đúng khoá đã ký); FE dùng URL nhiều đoạn, route `*key` nhận cả hai. |
| Q-B62-2 | Mock ghi tên người ngoài M1–M8 (tác giả bình luận/tin, 6 người xin vào nhóm, người nhận mail chào mừng) nhưng e2e đòi đúng 8 tài khoản. | Tạo user cá nhân `deleted_at` có giá trị (`g-*`, q1–q6); nếu server lọc user đã xoá khi join thì tên có thể thiếu — kiểm ở e2e. |
| Q-B62-3 | Portal chỉ nhận vai trò `member`; danh sách admin mock cho m1 super_admin, m6 moderator. | m1/m6 giữ `member`; m2/m3 `moderator`; thêm super_admin `ad1` "Nguyễn Văn An" (không mật khẩu) làm chủ. |
| Q-B62-4 | TK demo chưa đóng phí là `do.haiyen@opchub.vn`, prototype m6 là `yen.do@brandkit.vn`. | Email m6 = `do.haiyen@opchub.vn` (mật khẩu prototype `User@2026`). |
| Q-B62-5 | `groups.member_count` là số hiển thị prototype, không phải số dòng `group_members`. | Giữ số mock (ước tính người nhận chiến dịch "1.248 / 1.902" cần). |
| Q-B62-6 | Mock mặc định chủ nhóm là m2 cho mọi nhóm trừ c1/c6. | Chỉ gán owner khi người đó đã là thành viên, không thổi phồng số thành viên. |
| Q-B62-7 | Doanh thu server = tổng kỳ phí. | Chỉ ghi kỳ cho phí active/expiring → 6 × 600.000đ = 3.600.000đ như mock. |
| Q-B62-8 | Mock có tin cho `c1:board` (phòng không tồn tại). | Bỏ. |
| Q-B62-9 | Unread seed ghi c1:qa 3 tin chưa đọc, phòng chỉ có 2. | Không đặt con trỏ đọc cho phòng đó → hiển thị 2; phòng khác đặt con trỏ N tin trước cuối. |
| Q-B62-10 | Báo cáo vi phạm trong mock không có tin chat tương ứng. | Tạo tin `rpt-r1…r4` ở phòng chung, `hidden_at` đặt sẵn; ẩn từ màn kiểm duyệt vẫn chạy. |
| Q-B62-11 | `registered_count` sự kiện (e1 = 54) là số prototype. | Giữ số đó; chỉ lưu m1→e2 + tối đa 7 người mẫu (drawer "0/7", "54/80"). |
| Q-B62-12 | "Email đã gửi 30 ngày" server đếm `mail_logs`; mock cộng người nhận chiến dịch. | Thêm 4.050 dòng mail_log tổng hợp cho cp1/cp3 bằng `generate_series`; kiểm số ở e2e. |
| Q-B62-13 | `audit_logs` chỉ INSERT. | Dòng demo `demo-lg1…6` ON CONFLICT DO NOTHING; dòng e2e tạo ra giữ lại giữa các lượt. |
| Q-B62-14 | Redis dev giữ unread/cài đặt/tổng quan cũ sau reset DB. | `pnpm --filter @opchub/server flush:dev-cache` (chỉ db 1) chạy trong globalSetup sau `seed:demo`. |
| Q-B62-15 | Nhóm không có m2 thì không có chủ nhóm → form sửa nhóm Admin báo "Vui lòng chọn chủ nhóm". | Seed: chủ nhóm = m2 nếu là thành viên, không thì thành viên đầu tiên chưa khoá; c1, c6 vẫn là An. |
| Q-B62-16 | "Gửi nhắc hàng loạt": server bỏ TK đã khoá (2), MSW đếm mọi phí chưa active (3). | Giữ server (không gửi mail cho TK bị khoá); e2e server kỳ vọng 2. Chờ PO xác nhận. |
| Q-B62-17 | Ước tính người nhận chiến dịch: MSW nhân ×480, server đếm người thật. | Giữ server; e2e server chỉ kiểm định dạng số. |
| Q-B62-18 | Danh sách thành viên Admin: server sắp `created_at DESC`, mock theo thứ tự fixture. | Giữ server (keyset/deferred join); e2e server kiểm TK cũ nhất ở trang 2. |
| Q-B62-19 | Nhân sự phụ trách dịch vụ: mock cứng st1–st4, server = TK quản trị có `n.edit`. | Giữ server; không tạo TK quản trị giả cho tên mock. e2e server dùng TK quản trị có thật. |
| Q-B62-20 | TK mới chưa đóng phí: MSW vẫn trả `/dashboard/live`, `/me/projects`; server chặn (hợp đồng "đăng nhập + phí"). | Giữ server; e2e server đóng phí bằng ngân hàng giả rồi mới kiểm màn. |
| Q-B62-21 | Chuông thông báo Portal không nhận `notification.new` (sinh ở worker, đến sau REST). | Portal nghe `notification.new` qua socket dùng chung (`lib/socket.ts`) → invalidate; MSW bỏ qua. |
| Q-B63-1 | Admin Tổng quan trên server trống sparkline + biểu đồ (`stats_daily` chưa có dòng nào trên dev). | Seed demo ghi `stats_daily` 7 tháng bằng đúng số prototype (`OVERVIEW_FIXTURE` chuyển sang `@opchub/shared/mock-domains`, MSW dùng chung). KPI hiện tại vẫn đếm thật (8 thành viên, 34 nhóm…). |
| Q-B63-2 | Parity chế độ server ghi đè `results.json` của MSW. | Kết quả server ghi riêng `ui-parity/server/`; baseline MSW (G6) giữ nguyên. |
| Q-B63-3 | Ảnh chụp server lẫn dữ liệu lượt trước + chụp trước khi API trả về. | Parity dùng fixture reset dữ liệu mỗi test như behavior; `settle()` đợi `networkidle` trước khi chụp. |
| Q-B63-4 | Hộp "Xuất danh sách thành viên" hiện `groups.member_count` (số hiển thị 1.248…) trong khi tải về chỉ có thành viên thật. | Đếm thật `GROUP BY group_members` (status=member) — khớp số dòng tải xuống và MSW. |
| Q-B63-5 | Liên hệ dự án: mock sinh email/SĐT/địa chỉ giả từ tên chủ dự án. | Server dùng liên hệ thật của chủ dự án; không seed địa chỉ giả cho TK cá nhân. Ghi DV-B63-1. |
| Q-B63-6 | "Tổ chức" người đăng ký sự kiện (LeadPilot, BrandKit…) không có trường trong schema. | Giữ tên công ty hồ sơ DN / "Thành viên OPC"; cần trường tổ chức cho TK cá nhân thì thêm sau (ADR). |
| Q-B63-7 | Parity server không thể đạt 182 nếu giữ hành vi server: thứ tự danh sách (mới nhất trước) và liên hệ/tổ chức thật khác mảng mẫu prototype. | **Chủ nhà chốt 18/10/2026**: giữ hành vi server, ghi deviation DV-B63-x; mốc parity chế độ server = không tụt ngoài các deviation đã ghi. |
| Q-B66-1 | k6 đo độ trễ nhận tin ra âm ~7 giờ: `@prisma/adapter-pg` đọc timestamptz rồi **thay offset bằng +00:00**; Postgres local có TimeZone=Asia/Bangkok → mọi `created_at` đọc ra lệch +7h (ghi bằng `now()` của DB). | `createPrismaClient` gửi `options=-c TimeZone=UTC`; production qua PgBouncer (bỏ `options`) → `ALTER ROLE … SET timezone='UTC'` trong infra/README bước 2. Đã kiểm lại cả dữ liệu cũ đọc đúng. |
| Q-B66-2 | §14.2 "5.000 kết nối + 50 tin/giây" không nói số phòng. Dồn 5.000 người vào MỘT phòng → mỗi tin phát tới 5.000 socket = 250.000 khung/giây, vượt sức một máy dev (và không giống thực tế 34 nhóm × nhiều phòng). | k6 chia 5.000 kết nối đều vào 10 phòng `general` (c1…c10, ~500 người/phòng), 50 tin/giây tổng; ghi kèm số đo 1 phòng 1.000 người. Instance socket theo Vision §3.2 (2 instance + redis-adapter). |

## V4 — phát sinh khi làm TIP-V4-601 (23/10/2026) — đã chọn phương án an toàn, chờ owner xác nhận

| # | Câu hỏi | Phương án đã chọn |
|---|---|---|
| Q-V4-601-1 | Prototype v4 + §27.6 UP-14: Hồ sơ cá nhân thêm tab **"Gói & thanh toán"** (gói, hạn, lịch sử thanh toán), bỏ ô thống kê "Dự án". Bảng "V4 — PARITY UI" của `02-TASK-GRAPH.md` không giao UP-14 cho TIP nào. P-89 @390 đo trên v4 = 7,38% vì thiếu tab này. | Không mở rộng V4-601 (ngoài Files touched). Ghi nợ, đề xuất gộp vào V4-607 (khai báo sau đăng nhập, cùng màn Hồ sơ) hoặc V4-615. P-89 để FAIL, không mask. |
| Q-V4-601-2 | Prototype v4 mở "Bảng giá" từ menu là **trang** (`data-pg="1"`: không nền tối, không ×), chỉ "Quay lại" từ chuyển khoản mới là hộp nổi (`svPop`). | Làm theo prototype: `PaywallModal page` → `role=region`; TK chưa đóng phí vẫn là hộp chặn (BR-03, D-28). Tên mục menu "Bảng giá" để V4-606 đổi (parity dùng nhãn theo từng bên). |
| Q-V4-601-3 | P-81/P-82 (form tư vấn dạng trang) 3,96–16,42%: app hiện lỗi tại từng ô (BUG-022, SRS §6) còn prototype chỉ toast. | Giữ lỗi tại ô (DV-V2-307-14 / DV-V2-403-1 cùng loại); không nới assertion, không ẩn lỗi. |
| Q-V4-601-4 | P-81 @1440/390 (3,96 / 4,13%, chưa bấm gửi): lệch ở sidebar + topbar — menu v4 9 mục (§27.3) và thẻ "Gói Doanh nghiệp · Xem bảng giá" chân sidebar. | Thuộc V4-606 (menu §27.3); đo lại P-80…P-82 sau V4-606. Không mask. |
| Q-V4-606-1 | `reports.view` (blueprint) chưa có trong prototype `ADM_PERMS` v4. | Chưa thêm ở V4-606 để ma trận khớp prototype; V4-614 thêm cùng màn Báo cáo. |
| Q-V4-606-2 | D-73 gỡ menu Marketing, nhưng nhật ký gửi email OTP/chào mừng (Admin hỗ trợ đăng ký) chỉ có ở màn Marketing. | Gỡ khỏi sidebar, giữ route `/marketing` (quyền `settings.mail`) để tra log; đề xuất chuyển log vào Cài đặt › Email chào mừng ở TIP sau. |
| Q-V4-606-3 | Gỡ hẳn `MarketingProcessor` làm sự kiện `campaign.send` đã ghi không có consumer (vi phạm M1). | Chỉ gỡ lịch `campaigns-due`; giữ consumer outbox + lô gửi. |
| Q-V4-603-1 | Prototype v4 còn nhánh "Cần duyệt" (nhóm c1/c4/c5/c6 khi TK chưa đóng phí), mục "Chờ duyệt vào nhóm" ở panel chat, "Quyền tham gia" ở form Admin — trái §27.1 / D-71. | Theo §27 (hiệu lực cao hơn): bỏ hết. P-24, P-25, P-41 = unreachable; TK chưa đóng phí đã bị paywall chặn trước khi tham gia. |
| Q-V4-603-2 | Gợi ý "Người duyệt thành viên vào nhóm" dưới ô Chủ nhóm (Admin) không còn đúng. | Đổi thành "Người quản lý nhóm, ghim tin và điều phối thảo luận" (quyền còn lại của D-43). Chờ owner duyệt câu chữ. |
| Q-V4-603-3 | Migration: yêu cầu chờ của TK chưa đóng phí / hết hạn. | Xoá yêu cầu (blueprint 2.4); TV đóng phí rồi bấm Tham gia lại. rejected / cancelled → left. |
| Q-V4-603-4 | Prototype v4 Cộng đồng có 90 nhóm (34 tỉnh + "Nhóm ngành", form Admin có "Loại nhóm / Ngành") và dải "Nghị quyết 86/NQ-CP · 05/4/2026". Không có D-xx, REQ hay TIP V4 nào giao. | Chưa làm ở V4-603 (ngoài phạm vi D-71). Đề xuất owner chốt D-xx cho nhóm ngành + dải NQ86, giao TIP riêng hoặc gộp V4-615. Ghi DV-V4-603-3. |
| Q-V4-604-1 | Prototype v4 Admin › Nhà đầu tư đã bỏ cột trạng thái và nút "Gọi điện", nhưng drawer còn mục "Trao đổi với nhà đầu tư" (bình luận + ô gửi), bảng còn biểu tượng số bình luận, Portal còn "Trao đổi với OPC Hub". D-72 / §27 bỏ luồng trao đổi. | Theo D-72 (hiệu lực cao hơn): bỏ hết trao đổi ở 2 phía, xoá `investor_comments`, đóng sự kiện `investor.admin_replied` chưa phát. Drawer chỉ hiển thị + "Sao chép số". Ghi DV-V4-604. |
| Q-V4-604-2 | `myInterest.threadKey` (khoá gửi tin vào luồng) không còn công dụng. | Bỏ khỏi `projectDetailSchema` và server; `myInterest` còn `amount`, `currency`. |
| Q-V4-604-3 | Goal phiên (owner gõ lại 23/10/2026) thu hẹp phạm vi test mỗi TIP (test:int theo module + test gác cổng, e2e theo domain; toàn bộ cuối pha), còn `plans/GOAL-V4.md` mục 3 TEST (dòng 62, 65) vẫn ghi chạy đủ. File ghi "chỉ Chủ nhà sửa"; agent không sửa. | Theo goal mới nhất của owner cho TIP từ V4-605; vẫn chạy toàn bộ test:int + e2e behavior cuối pha. Đề xuất owner cập nhật GOAL-V4.md cho khớp. V4-604 đã chạy toàn bộ. |
| Q-V4-605-1 | `GET /admin/service-requests/staff` vừa là danh sách phụ trách (bỏ theo D-72) vừa là nguồn tên "Gắn tên:" cho ghi chú. | Giữ route, đổi nghĩa thành "người gắn tên được" (admin có `services.action`); bỏ chọn phụ trách. |
| Q-V4-605-2 | Badge menu "Dịch vụ" (prototype: số phiếu `st === 'new'`) không còn trạng thái. | Badge = số phiếu chưa có ghi chú nội bộ nào (gần nghĩa "mới" nhất). Chờ owner chốt. |
| Q-V4-605-3 | Blueprint 2.5 thêm `Service.audience`; prototype v4 không có ô này ở danh mục, chưa có màn dùng. | Chưa thêm ở V4-605; V4-613 (Trợ lý) thêm nếu cần. |
| Q-V4-605-4 | Prototype v4 (SVC_SEED 15 mục) tắt "Công cụ & Giải pháp số" nên AT-LK05 (§23.7) không bấm được dịch vụ này. | Seed đúng v4 (tắt); e2e AT-LK05 đi cùng luồng với "Đào tạo & Ươm mầm OPC" đang bật. Chủ nhà xác nhận nếu muốn bật lại. |
| Q-V4-602-1 | Hoa hồng Gọi vốn (10% khi Admin duyệt) cần `ProjectFundraising` (V4-610). | V4-602 chỉ thêm `commissions.source` + `affiliate_policy.fundraising_rate`; ghi hoa hồng Gọi vốn ở V4-610. |
| Q-V4-602-2 | `GET /admin/affiliate/policy/preview` (ví dụ "= 120.000đ / thành viên 600.000đ") không còn trong prototype v4. | Bỏ route (hợp đồng 204 → 203); gợi ý giá gói lấy từ `MEMBERSHIP_PLANS`. |
| Q-V4-602-3 | Portal "bạn nhận X" khi chưa biết người được giới thiệu chọn gói nào; prototype v4 vẫn dùng `FEE=600000`. | X = % × Gói Cá nhân 1.200.000 (mức thấp nhất, không hứa quá). Chờ owner chốt. |
| Q-V4-602-4 | "Phí thực trả" khi chuyển dư / khớp tay thiếu (QĐ-01). | Cơ sở hoa hồng = phí gói của kỳ vừa đóng (1.200.000 / 3.600.000; kỳ cũ D-69 600.000); số tiền chuyển dư / thiếu không đổi hoa hồng. |
| Q-V4-607-1 | Prototype v4 bỏ ô "Bạn là" / "Chọn nhóm" (Cá nhân) và MST / tên DN / ngành / nhóm (DN) khỏi form đăng ký, chuyển sang popup khai báo sau đăng nhập. | Giữ form đăng ký hiện có (không phá luồng đang chạy); TK mới `declared_at = NULL` → popup khai báo điền sẵn dữ liệu đã nhập, bấm "Lưu & tiếp tục →". Owner chốt nếu muốn bỏ các ô khỏi form. |
| Q-V4-607-2 | TIP ghi "MST đã thuộc DN khác → 409" nhưng OQ-12 cho phép nhiều người cùng MST (không unique). | Theo OQ-12: không chặn MST trùng; lưu `verification` như đăng ký (tên khớp kết quả tra → verified, còn lại pending). |
| Q-V4-607-3 | Popup DN prototype chỉ hiện ô tên / ngành sau khi tra MST thấy; nếu tra lỗi (D-40) thì không có ô để nhập tay. | Tra lỗi → mở ô tên / ngành để nhập tay (D-40 không chặn); MST đã nhập lúc đăng ký coi như đã tra. |
| Q-V4-607-4 | MSW: TK SSO mới và TK đại lý demo không nằm trong kho đăng ký mock. | Mock coi như đã khai báo (server thật vẫn bắt khai báo vì `declared_at` NULL khi tạo qua SSO). |
| Q-V4-607-5 | Thứ tự popup sau kích hoạt. | Như prototype v4: mail chào mừng (z 80/81) nằm trên popup khai báo (z 72/73); đóng mail → khai báo → Bảng giá. |
| Q-V4-610-1 | Prototype "Tôi đã chuyển khoản" chuyển ngay khoản Gói Gọi vốn sang chờ thẩm định; D-31 chỉ cho webhook ngân hàng xác nhận tiền. | Theo D-31: nút chỉ ghi nhận (toast như prototype), trạng thái đổi khi webhook ngân hàng về (`fundraising.paid`); MSW giả webhook trễ 2,2 s. |
| Q-V4-610-2 | Dự án đã khai báo gọi vốn trước V4 chưa mua gói thì có còn hiện phần Gọi vốn không? | Migration tạo khoản `legacy` đang hiệu lực 6 tháng (amount 0, không mã) để không mất phần đang hiển thị; legacy không chặn mua gói có phí, không tính vào gia hạn, không hiện chip Admin, không sinh hoa hồng. |
| Q-V4-610-3 | Thẻ Bảng giá prototype ghi "Gia hạn 7.500.000đ / 6 tháng" nhưng D-82 chỉ chốt 15.000.000đ / 6 tháng. | Thu `FUNDRAISING_PLAN.amount` cho cả mua mới và gia hạn (cho gia hạn từ 14 ngày trước hạn); giá gia hạn riêng chờ owner chốt. |
| Q-V4-610-4 | Lịch sử thanh toán Gói Gọi vốn ở Hồ sơ (UP-14) chưa có màn. | Không làm trong V4-610; API `GET /me/fundraisings` đã có cho màn sau. |
| Q-V4-610-5 | Giao dịch GV không khớp (thiếu tiền / sai mã) — khớp tay ở Admin › Phí thành viên? | Không làm trong V4-610; giao dịch vào hàng chờ khớp như phí thành viên (`unmatched`), khớp tay GV để sau. |
| Q-V4-610-6 | Prototype v4 lồng khối tab "Gọi vốn đầu tư" + "Dự án liên quan" bên trong `<sc-if pjTabCmt>` (index.html 1244–1321) → bấm tab không hiện gì. | App dựng 2 tab theo đúng ý đồ v4 (khối gọi vốn chỉ ở tab Gọi vốn; Dự án liên quan tối đa 6); P-69 → P-72 `unreachable`, hành vi kiểm ở e2e. |
| Q-V4-608-1 | Ai thấy tab "Gian hàng của tôi"? TK Cá nhân / chưa đóng phí. | Cá nhân: tab hiện thông báo "Chỉ tài khoản Doanh nghiệp…" (server 403 `BUSINESS_ONLY`); DN chưa đóng phí: paywall như các màn trả phí (MembershipFeeGuard). |
| Q-V4-608-2 | D-84 tự tạo gian hàng khi đóng phí — tạo ở trạng thái nào? | Bản nháp (`draft`), chủ bấm Xuất bản mới hiện ở Khám phá (không qua duyệt, D-75). Không tạo hàng loạt cho DN có sẵn. |
| Q-V4-608-3 | Admin ẩn gian hàng nháp rồi "Hiển thị" lại thì về trạng thái nào? Có cần lý do ẩn? | Về đúng trạng thái trước khi ẩn (`hidden_prev`); lý do tuỳ chọn (prototype không có ô nhập), mỗi gian hàng 1 dòng audit. |
| Q-V4-608-4 | Chủ hết hạn phí thì gian hàng thế nào? | Không còn ở Khám phá / trang chi tiết với người khác; dữ liệu giữ nguyên, chủ vẫn xem/sửa; đóng phí lại → hiện lại, không cần xuất bản lại. |
| Q-V4-608-5 | Nút liên hệ ở trang chi tiết (prototype có "Nhắn tin", "Quan tâm"). | Chỉ Email (`mailto:`) / Zalo (`zalo.me/<sđt>`) / Gọi (`tel:`) theo REQ-510; ẩn nút thiếu dữ liệu. Không làm "Quan tâm" / "Xem nhiều" / "Nổi bật" (chưa có nguồn). |
| Q-V4-608-6 | Dashboard số liệu (lượt xem, khách quan tâm, lịch hẹn, biểu đồ), Hồ sơ năng lực / Đội ngũ / Chứng nhận / Reels, mẫu `equip`. | Không làm trong V4-608 — không có nguồn dữ liệu, không bịa. Chờ owner chốt phạm vi. |
| Q-V4-608-7 | 16 gian hàng mẫu prototype thuộc chủ DN ngoài 8 thành viên demo. | `seed:demo` mặc định chỉ có `st1` (M1) để số đếm thành viên/phí của e2e server không đổi; `seed:demo --stores` thêm 16 chủ DN (không đăng nhập, phí còn hạn) cho demo đủ 17 gian hàng. MSW luôn có đủ 17. |
| Q-V4-609-1 | Admin "Hiển thị" nhu cầu bị ẩn: prototype luôn về "Đang mở", kể cả nhu cầu đã đóng trước khi ẩn. | Về đúng trạng thái trước khi ẩn (`hidden_prev`), như Gian hàng (Q-V4-608-3) — không tự mở lại nhu cầu chủ đã đóng. |
| Q-V4-609-2 | Chủ có xoá được nhu cầu đang bị Admin ẩn? (prototype hiện chữ "Liên hệ Admin để mở lại", không có nút Xóa) | Không: 409 "Liên hệ Admin để mở lại"; giữ bằng chứng vi phạm cho Admin. |
| Q-V4-609-3 | Gợi ý gian hàng: prototype đếm gian hàng cùng ngành (`field === mf`), ưu tiên cùng tỉnh, không giới hạn; không có bước gợi ý sau khi đăng. | Như prototype: số đếm trên thẻ + link sang Khám phá lọc ngành (+ tỉnh); một truy vấn `GROUP BY` cho cả trang. Không gửi thông báo cho gian hàng được gợi ý. |
| Q-V4-609-4 | Ngành "Khác" tự nhập không khớp danh mục → không có gian hàng gợi ý, không vào bộ lọc ngành của Khám phá. | Lưu chữ tự nhập (`field_custom = true`), vẫn hiện ở bộ lọc ngành của trang Nhu cầu; gợi ý = không có. |
| Q-V4-609-5 | Nhu cầu đăng ở Portal MSW không sang Admin MSW (kho tách theo cổng). | MSW chỉ demo bằng nhu cầu seed ở Admin; server thật dùng chung DB. e2e Admin dùng nhu cầu seed. |
| Q-V4-609-6 | Thẻ "Nhu cầu phù hợp" ở Dashboard, bước onboarding "Gửi nhu cầu", tin "Nhu cầu" ở bảng tin. | Không làm trong V4-609 — V4-611 (onboarding 8 bước, D-85) tính từ bảng `needs`. |
| Q-V4-609-7 | Prototype form "Đăng nhu cầu" để Tỉnh/thành gõ tự do. | App dùng danh sách 34 tỉnh/thành (mặc định tỉnh của gian hàng) để lọc và gợi ý cùng tỉnh khớp chính xác. |
| Q-V4-609-8 | Nút Zalo / Gọi / Email trên thẻ nhu cầu: prototype lấy liên hệ của gian hàng. | Lấy SĐT / email khai trên nhu cầu (người liên hệ riêng của nhu cầu); thiếu thì nút mờ, không bấm được. |
| Q-V4-609-9 | Prototype không có câu cho TK Cá nhân bấm "+ Đăng nhu cầu". | Tab "Nhu cầu của tôi" hiện "Đăng nhu cầu dành cho tài khoản Doanh nghiệp…" (server 403 `BUSINESS_ONLY`); DN chưa có gian hàng (chưa đóng phí) mở popup đóng phí. |
| Q-V4-613-1 | Prototype v4 không có markup khung Trợ lý OPC Hub (chỉ logic mồ côi `svw*`, dựng nút nổi góc dưới); SRS QT-13 ghi "khung ở chân sidebar". | **Đã chốt (D-92, owner 27/10/2026): bỏ** — gỡ khung Trợ lý khỏi Portal theo prototype; xoá kịch bản P-117 / P-118 và e2e `assistant.spec.ts`. |
| Q-V4-613-2 | Prototype tính số yêu cầu tư vấn của người dùng cho từng mục (`nReq`). | Không làm: chưa có API đọc yêu cầu của tôi (`/service-requests` chỉ POST). |
| Q-V4-613-3 | Ảnh minh hoạ `sv-*.png`, phân trang 8 mục của prototype. | Không làm: dùng icon dịch vụ sẵn có; danh sách cuộn trong khung (tối đa 420px). |
| Q-V4-611-1 | Prototype v4 Dashboard chỉ có lời chào + thẻ "Hướng dẫn bắt đầu"; khối LIVE (REQ-224 / NA-24 số liệu 3 giây) không còn trong markup v4. | Giữ khối LIVE phía dưới (REQ-224 còn hiệu lực, có e2e); lời chào + thẻ đặt trên cùng. Parity P-119 đo vùng lời chào + thẻ. Chờ owner chốt có bỏ khối LIVE không. |
| Q-V4-611-2 | Tiêu chí "Hoàn thiện hồ sơ" Cá nhân: prototype chỉ cần đã lưu hồ sơ hoặc có ảnh; D-85 liệt kê bạn là ai, OPC muốn tham gia, ảnh, liên hệ. | Theo D-85: `registration_role` + `opc_intent` ≠ rỗng + ảnh đại diện + SĐT. DN: người đại diện + MST + ngành + ảnh. |
| Q-V4-611-3 | Bước "Gửi lời chào": prototype đếm mọi tin; outbox `chat.member_sent` chỉ phát ở phòng mặc định. | Snapshot đếm mọi tin không mô phỏng, chưa xoá (index mới `messages(sender_id)`); tiến độ Admin bù bằng sweep 03:10 hằng ngày. |
| Q-V4-611-4 | NĐT (`investor`) không có biến thể onboarding trong prototype. | Không có thẻ (`GET /me/onboarding` 204), vẫn hiện lời chào; Admin › Thành viên không liệt kê NĐT như trước. |
| Q-V4-611-5 | Prototype không có câu cho giới hạn Nhắc 1 lần/ngày (D-88) và không có mẫu email nhắc. | 429 "Đã nhắc thành viên này trong 24 giờ qua"; mẫu tạm "Hoàn tất hướng dẫn bắt đầu trên OPC Hub" (biến `{{ten}}`, `{{con_thieu}}`, `{{link}}`) sửa ở Marketing › Email tự động, lưu `app_settings.onboarding_mail`. Thông báo loại mới `system`. |
| Q-V4-611-6 | Admin › Thành viên: prototype có 7 ô chọn lọc (Nhóm, Vai trò, Phí, Trạng thái, Hồ sơ, Ngày, Khởi đầu). | Chỉ làm "Khởi đầu" (Tất cả / Đã hoàn tất / Chưa hoàn tất, URL `?onb=`); 6 ô còn lại ngoài phạm vi V4-611 → DV D-07…D-14. |
| Q-V4-611-7 | MSW: tiến độ Portal ↔ Admin (kho tách theo cổng). | Cờ "khám phá" / "chia sẻ link" qua cookie `opchub-mock-ob`; dữ liệu khác Admin tự tính từ kho mock. M1 = 6/8 (thiếu hồ sơ — không có ảnh — và Affiliate) như prototype `_ob`. |
| Q-V4-611-8 | Bước "Hồ sơ" ở Admin cho thành viên khác: prototype `_ob` chỉ xét `!(needProfile \|\| (biz && !tax))` (DN có MST là đủ); D-85 cần người đại diện + MST + ngành + ảnh. | Theo D-85 (nguồn ưu tiên cao hơn prototype) → m7 Rina Sari (seed không có ảnh) 2/8, prototype 3/8 (DV-V4-611-2). |
| Q-V4-612-1 | Prototype `dismiss` = "Khôi phục tin"; server cũ còn action `dismiss`, `hide`, `warn`. | `dismiss` xử lý như `restore` (hiện lại tin, bỏ tính vi phạm, đóng mọi ca của tin); `hide`/`warn` giữ cho API cũ, UI v4 chỉ còn "Khóa N ngày" + "Khôi phục tin". |
| Q-V4-612-2 | Prototype báo người gửi "Tin nhắn đã bị ẩn do vi phạm nội quy. Nếu tiếp tục, tài khoản sẽ bị khóa N ngày." ngay trên Portal. | Server gửi cảnh báo qua outbox `moderation.warned` (thông báo sẵn có); chưa có toast realtime cho người gửi. |
| Q-V4-612-3 | P-34 / P-45 / P-121 @390: sau khi gửi tin, MSW tải lại phòng (storage event, 0ddc089e) và danh sách đứng ở đầu; prototype cuộn xuống cuối. Có từ trước V4-612 (đo worktree `730b3a13`: P-34 4,99%). | Không sửa trong V4-612 (ngoài phạm vi); đề xuất TIP chat sửa cuộn sau khi tải lại. |
| Q-V4-612-4 | Tin bot/persona trúng từ khoá: D-77 nói "ẩn ngay" cho mọi tin. | Ẩn (Portal bỏ hẳn tin bot ẩn như REQ-141), không tính vi phạm (không người gửi). |
| Q-V4-614-1 | Prototype v4 không có màn / menu "Báo cáo" (D-78 giữ màn, §27.9 T15 nói không có menu). | Dựng màn mới theo khung Admin chung, mục sidebar cuối nhóm DOANH THU & ĐỐI TÁC, quyền `reports.view` (Quản trị viên + Kế toán mặc định). D-99 `unreachable`. |
| Q-V4-614-2 | Chỉ số trong mẫu chưa có nguồn dữ liệu (Hợp đồng G2B/B2B, Tài trợ sự kiện, Kết nối đối tác, Cơ hội hợp tác, Đề xuất đào tạo, 5 nguồn doanh thu ngoài phí). | Để trống trong CSV, hiện "—" + tooltip "Chưa có dữ liệu trên hệ thống" trên màn; không bịa số. "Kế hoạch", "% đạt", người ký (Trưởng đại diện, Giám đốc Vùng) trống (D-78: không hệ kế hoạch / vai trò vùng-tỉnh). |
| Q-V4-614-3 | Dòng "Hạn nộp: …" trong mẫu không còn ý nghĩa khi không có quy trình nộp. | Giữ nguyên để file đúng khuôn mẫu (cùng số dòng / cột). |
| Q-V4-614-4 | B3 "Báo cáo vùng (tháng / quý)". | Chỉ tháng; "Kỳ báo cáo" = MM/YYYY. Quý chờ owner chốt. |
| Q-V4-614-5 | "Số Coffee Chat" (B1) và "Sự kiện ngành" khác nhau thế nào? Sự kiện không có cột huỷ / loại Coffee Chat. | Cả hai = số sự kiện của nhóm có `starts_at` trong tháng (TIP). Khi có loại sự kiện thì tách. |
| Q-V4-614-6 | Doanh thu phí theo tỉnh / vùng: thành viên ở nhiều nhóm khác tỉnh được tính cho mỗi tỉnh. | B2 / B3 dòng tỉnh: tính cho mỗi tỉnh người đó tham gia (distinct trong tỉnh); tổng vùng B3 = cộng các dòng tỉnh như mẫu, có thể lớn hơn "Phí thành viên" ở khối nguồn (distinct theo vùng). |

## V4 — phát sinh khi làm TIP-V4-615 (26/10/2026) — đã chọn phương án an toàn, chờ owner xác nhận

| # | Câu hỏi | Phương án đang làm |
|---|---|---|
| Q-V4-615-1 | Prototype v4 dựng lại màn đăng nhập / đăng ký / quên mật khẩu (ảnh nền toàn trang, thẻ form, chỉ Google SSO, khẩu hiệu mới). Có làm lại màn auth theo v4 và bỏ ChatGPT / Gemini / DeepSeek (D-64)? | Giữ màn auth hiện có + 4 nút SSO theo D-64 / cấu hình D-33; chờ D-xx mới trước khi dựng lại (DV-V4-615-1). |
| Q-V4-615-2 | Prototype v4 dựng lại trang Dự án OPC (hero, lưới ngành, cột lọc trái; bỏ lọc giai đoạn / "Nhiều theo dõi"). Có làm theo? | Giữ trang Dự án V4-610 (lọc giai đoạn, theo dõi); chờ owner (DV-V4-615-3). |
| Q-V4-615-3 | Ảnh đại diện mặc định: app dùng ảnh bóng người tự host (87fd73cb); prototype v4 dùng chữ viết tắt trên nền #1677FF. | Giữ ảnh bóng người (quyết định đã có trong code, không D-xx ngược lại); đổi chỉ cần `fallback="initials"` ở `UserAvatar` của thanh trên cùng (DV-V4-615-4). |
| Q-V4-615-4 | Tổng quan Admin v4 thêm khối "Luồng hệ thống" (5 thẻ số liệu liên module + CTA). Cần API tổng hợp mới. | Chưa làm trong V4-615 (TIP parity); đề xuất TIP riêng sau V4 (DV-V4-615-6). |
| Q-V4-615-5 | Danh mục lĩnh vực v4 có cột "Áp dụng cho" (Dự án / Doanh nghiệp / Nhóm ngành mạng lưới) và 32 mục mẫu. | Giữ danh mục dự án 14 mục (REQ-220); phạm vi "Nhóm ngành mạng lưới" thuộc cây mạng lưới đã gỡ (D-78) (DV-V4-615-9). |

## V4 — phát sinh khi làm TIP-V4-616 (26/10/2026) — đã chọn phương án an toàn, chờ owner xác nhận

| # | Câu hỏi | Phương án đang làm |
|---|---|---|
| Q-V4-616-1 | Seed demo dùng ngày cố định `MOCK_NOW` (16/10/2026), server dev chạy giờ thật. Khi ngày thật qua mốc, sự kiện seed (e1 22/10) đã kết thúc → bỏ check-in trả 409 (BUG-041), khác bản MSW. Có dời mốc seed theo ngày chạy không? | Giữ seed cố định (parity + MSW cần ngày cố định). e2e server kiểm đúng luật: toast 409 + giữ 1/7. Int `admin-events` BUG-041 phủ cả hai cạnh. |
| Q-V4-616-2 | Bot tự động (`autoGenerate`) chạy nền trên server dev, chen tin vào nhóm lúc test đếm feed Dashboard. | Test NA-24 bật fixture `botManual` có sẵn (tắt tự động riêng test đó). Seed demo mặc định vẫn bật bot như cấu hình demo. |

## V4 — chốt theo D-89 (TIP-V4-617, 27/10/2026)

| # | Câu hỏi | Đã chốt |
|---|---|---|
| Q-V4-615-1 | Làm lại màn auth theo v4, bỏ ChatGPT / Gemini / DeepSeek? | **Chốt theo D-89**: màn auth theo v4, SSO chỉ Google (`LOGIN_SSO_IDS`); `SSO_IDS` giữ cho liên kết / cấu hình cũ. Đã làm ở TIP-V4-617. |
| Q-V4-607-1 | Bỏ ô vai trò / nhóm / MST khỏi form đăng ký? | **Chốt theo D-89**: form đăng ký theo v4; vai trò / MST / tên DN / ngành / quy mô / nhóm khai báo ở popup sau đăng nhập. API đăng ký nhận các trường đó tùy chọn; DN bắt buộc người đại diện. Đã làm ở TIP-V4-617. |
| Q-V4-601-3 | Ẩn lỗi tại ô cho khớp prototype? | **Chốt theo D-89**: giữ lỗi tại ô cho trình đọc màn hình (`aria-invalid`, `aria-describedby`, toast lỗi đầu, focus ô đầu), không hiện chữ dưới ô (trừ mã giới thiệu như prototype). Đổi chung ở TIP-V4-617; đo lại các form khác ở TIP-V4-623. |
| Q-V4-615-2 → 5 | Dự án v4, avatar chữ viết tắt, "Luồng hệ thống", danh mục v4 | **Chốt theo D-89** (theo v4); làm ở TIP-V4-618 → 622. |

## V4 — TIP-V4-618 (27/10/2026)

| # | Câu hỏi | Đề xuất / đã làm |
|---|---|---|
| Q-V4-612-3 | Danh sách tin @390 đứng ở đầu sau khi gửi / báo cáo. | **Đã sửa** (V4-618): giữ ở cuối khi phòng tải lại (`use-stick-to-bottom`), không cuộn khi tải lại cùng tin cuối. |
| Q-V4-615-3 | Avatar chữ viết tắt, Hồ sơ v4. | **Đã làm** (V4-618, D-89). Tab "Gói & thanh toán": API mới `GET /me/membership/periods`; mã CK hiển thị là mã thật `OPCHUB TV…` (BR-04 / D-41), không dùng mã minh hoạ "OPC M1 DN" của prototype. |
| Q-V4-618-1 | P-05: prototype v4 hiện "Mật khẩu tạm" trong mail chào mừng; D-47 cấm gửi mật khẩu qua email. | **Chờ owner**: giữ D-47 (bảo mật) → P-05 4,52 / 4,71% là DV có lý do; hoặc owner chốt hiện dòng che "••••••••" (không có giá trị thật). Chưa tự đổi. |
| Q-V4-618-2 | P-40: prototype v4 còn khối "Chờ duyệt vào nhóm" + nhãn "Điều phối"; D-71 bỏ duyệt, D-56 đổi tên "Giảng viên". | **Chờ owner**: giữ D-71 / D-56 → P-40 @390 4,31% là DV có lý do. |
| Q-V4-618-3 | Tin thành viên bị ẩn: prototype giữ cảm xúc + "Đã ghim" + ghim trên thanh ghim (nội dung thay câu giữ chỗ). | **Đã làm**: giữ hiển thị như prototype, không lộ nội dung; không thả thêm cảm xúc vào tin ẩn (409). Tin bot ẩn xoá hết như REQ-141. |


## V4 — TIP-V4-619 (27/10/2026)

| # | Câu hỏi | Đề xuất / đã làm |
|---|---|---|
| Q-V4-603-4 | Cộng đồng v4: 90 nhóm (Nhóm ngành), dải NQ86, form Admin "Loại nhóm / Ngành". | **Đã làm** (V4-619, D-89): `groups.kind` (`province` / `industry`), `industry`, `parent_id` + CHECK hình dạng + unique "một Nhóm tỉnh chung / tỉnh" và "một Nhóm ngành / tỉnh / ngành". 56 Nhóm ngành seed theo `IND` của prototype (id `g1…g56`, số thành viên theo công thức prototype). Admin tạo Nhóm ngành phải có Nhóm tỉnh chung cùng tỉnh (409 nếu chưa có / trùng ngành). |
| Q-V4-619-1 | Prototype v4: bấm "Tham gia nhóm" ở xem trước chat vào nhóm ngay, không ô đồng ý phí. NR-R02 bắt buộc đồng ý nội quy + phí không hoàn lại. | **Đã làm**: thẻ xem trước giống v4 (không ô đồng ý); nút mở form tham gia ở Cộng đồng có ô đồng ý (giữ NR-R02 — nghiệp vụ tiền). |
| Q-V4-619-2 | Ô "chờ duyệt" của prototype v4 trong khi D-71 bỏ duyệt vào nhóm. | **Đã làm**: giữ ô như prototype, giá trị luôn 0 (không có trạng thái chờ — D-71). Drawer Admin không có "Quyền tham gia" (D-71). |

## V4 — TIP-V4-620 (27/10/2026)

| # | Câu hỏi | Đề xuất / đã làm |
|---|---|---|
| Q-V4-615-2 | Trang Dự án OPC v4 (hero, lưới ngành, lọc trái, 5 giai đoạn, "Nhiều lượt xem"). | **Đã làm** (V4-620, D-89): cột mới `audience`, `needs`, `view_count`, `contact_address`, `highlights`, `gallery`, `milestones` (CHECK + index `projects_published_views`); API `GET /projects` nhận `audience`, `stage` nhiều giá trị, `needs`, `province`, `sort=view`. Bảng / chi tiết vẫn hiện 4 nhãn giai đoạn cũ như prototype; thẻ / bộ lọc / form dùng 5 mức `dev.*`. |
| Q-V4-620-1 | Prototype tính "Kết nối thành công" = góp ý + 3 × số dự án; không có bảng kết nối thật. | **Đã làm** theo công thức prototype (`pjStatsH`), ghi rõ ở service. Khi có nghiệp vụ "kết nối" thật (D-xx mới) thì thay nguồn số. |
| Q-V4-620-2 | "Vấn đề / Giải pháp / Thị trường", "Hình ảnh sản phẩm", mốc cập nhật: prototype không có form nhập. | **Đã làm**: là cột dữ liệu (zod giới hạn 3 / 3 / 20 mục), seed demo theo prototype; form sửa dự án giữ nguyên giá trị đang có. Form nhập → chờ owner (TIP sau nếu cần). |
| Q-V4-620-3 | P-104 @390: nội dung CK prototype dùng mã dài ghép id; app dùng mã GV 6 số (D-31 / BR-04). | **Chờ owner**: giữ D-31 (đối soát tiền) → 15,94% là DV có lý do. |
| Q-V4-620-4 | Prototype tự mâu thuẫn quốc gia BrandKit Mini: Portal lấy `EX.p4.country` = "Thái Lan", Admin lấy `p.country || 'Việt Nam'` (p4 không có `country`) = "Việt Nam". | **Đã làm**: app dùng một nguồn (`projects.country` = "Thái Lan") cho cả hai; D-53 vẫn 0,20 / 0,17%. |

## V4 — TIP-V4-621 (27/10/2026)

| # | Câu hỏi | Đề xuất / đã làm |
|---|---|---|
| Q-V4-615-4 | Tổng quan Admin v4: khối "Luồng hệ thống" (5 thẻ liên module + CTA). | **Đã làm** (V4-621, D-89): `GET /admin/overview` thêm `flow` (phí hiệu lực / tổng thành viên, gian hàng theo trạng thái, nhu cầu mở / đóng, dự án chờ / hiển thị, số nhóm) — mỗi bảng một `count` / `groupBy status`, cache 60 giây như cũ (S-03); index partial mới `membership_fees_paid_at`. |
| Q-V4-621-1 | Prototype "Thành viên đã đóng phí 1 / 8" (chỉ TK demo đã đóng) vs dữ liệu phí MSW / seed (6 / 8 đang hiệu lực). | **Đã làm**: số thật từ bảng phí (không sửa dữ liệu phí cho khớp prototype vì màn Phí thành viên đã đạt parity với 6 TK hiệu lực). |
| Q-V4-621-2 | Biểu đồ v4 "4.218 · +12% · +452 thành viên tháng này" nằm dưới thẻ "Thành viên 20.000". Nghĩa của 4.218? | **Đã làm**: = thành viên đã kích hoạt phí (đang hiệu lực) + số đóng phí từ đầu tháng (`paid`); thẻ "Thành viên" = tổng TK thành viên. Chờ owner xác nhận cách hiểu. |

## V4 — TIP-V4-622 (27/10/2026)

| # | Câu hỏi | Đề xuất / đã làm |
|---|---|---|
| Q-V4-615-5 | Danh mục lĩnh vực v4 có cột "Áp dụng cho" (Dự án / Doanh nghiệp / Nhóm ngành mạng lưới) và 32 mục mẫu. | **Đã làm** (V4-622, D-89): 32 mục theo prototype, thêm phạm vi `net` (Nhóm ngành mạng lưới) cho bộ lọc và form; dữ liệu demo + MSW khớp prototype. |
| Q-V4-622-1 | Prototype Cài đặt 7 mục; app thêm "Đăng nhập & bảo mật" (D-33) và "Ngôn ngữ". | **Đã làm**: ở ≤ 767px ẩn 2 mục thêm khỏi danh sách (khớp prototype), vẫn mở được bằng `?tab=sso` / `?tab=languages`; 1440 giữ đủ 9 mục (D-33). Chờ owner xác nhận có cần lối vào 2 mục này ở điện thoại không. |
| Q-V4-622-2 | Bot v4 ô thứ 4 "Chờ duyệt" + hội thoại "Chờ duyệt" (Bỏ / Duyệt & đăng). | **Giữ D-50**: không có hàng chờ duyệt — ô "Chờ lịch / Đang chạy", hội thoại có nút "Dừng"; thanh "Tắt khẩn cấp / Ẩn tin bot" (REQ-141) giữ (DV-V4-622-1). |
| Q-V4-622-3 | Email chào mừng v4 có khối mật khẩu tạm. | **Giữ D-47** (không gửi mật khẩu qua email); D-70 còn 16,40 / 15,66% — chỉ owner đổi được D-47. |

## V4 — TIP-V4-623 (27/10/2026)

| # | Câu hỏi | Đề xuất / đã làm |
|---|---|---|
| Q-V4-611-6 | Thanh lọc Thành viên v4 có 7 ô; app chỉ "Khởi đầu". | **Đã làm** (V4-623, D-89): đủ 7 ô, lọc ở server (`GET /admin/users?group&role&fee&status&profile&days&onboarding`) + MSW; "Phí đã đóng" = phí đang hiệu lực (active / expiring) như màn Phí thành viên; "Hồ sơ chưa khai báo" = chưa qua popup khai báo hoặc DN thiếu MST. |
| Q-V4-623-1 | Thứ tự dòng Thành viên: prototype theo mảng mẫu, app `created_at DESC`. | **Giữ Q-B62-18** (đã chốt): không đổi ngày đăng ký demo để khớp thứ tự (làm giả). 10 màn Thành viên còn 3,07 – 5,33% chỉ vì thứ tự dòng. Owner muốn thứ tự khác (VD theo mã thành viên tăng dần) thì cần D-xx mới. |
| Q-V4-623-2 | Khám phá Gian hàng v4 có tim / lượt xem / "Nổi bật" (P-105 @1440 3,64%). | **Chờ owner** (như Q-V4-608-5): cần quyết định nguồn — bảng lượt xem + yêu thích gian hàng và tiêu chí "Nổi bật" (Admin gắn tay hay theo lượt xem). Không dựng số giả. |
| Q-V4-623-3 | Bảng khách hàng đại lý @390: hàng tiêu đề prototype cao 38px làm chữ chồng lên dòng đầu. | **Giữ không chồng chữ** (lỗi hiển thị của prototype); D-85-CUS @390 còn 5,50%. |

## V4 — TIP-V4-624 (27/10/2026)

| # | Câu hỏi | Đề xuất / đã làm |
|---|---|---|
| Q-V4-623-2 / Q-V4-608-5 | Tim / lượt xem / "Nổi bật" gian hàng. | **Đã làm** (`0940865b`, D-89 — prototype v4 thắng về giao diện): lượt xem đếm khi mở chi tiết (trừ chủ), tim theo từng người dùng, "Nổi bật" do Admin gắn tay (quyền `stores.action`, audit `store.feature` / `store.unfeature`). Không số giả: dữ liệu demo seed theo prototype. |
| Q-V4-623-3 | Tiêu đề bảng khách hàng đại lý @390. | **Đã làm** (`9d7587d3`): tiêu đề cao 38px như prototype; app không chồng chữ vì bỏ hàng đo 1px của bảng và dòng đầu bắt đầu ngay dưới tiêu đề. D-85-CUS @390 1,32%. |
| Q-V4-623-1 | Thứ tự dòng Thành viên. | **Đã chốt D-90** (owner 27/10/2026, phương án A): theo mã TV tăng dần như prototype; đã làm ở `f7663fa2` (thay Q-B62-18). |
| Q-V4-620-3, Q-V4-622-2, Q-V4-622-3, Q-V4-603-1, AF-R01, §20.6, DV-G4c-1 | Các ảnh > 3% còn lại. | **Chốt lại ở D-91** (owner 27/10/2026, "1A 2A 3A 4A 5A 6B 7B"): 2–5 đã làm, 6–7 giữ. |
| Q-V4-624-1 | D-91 (1) "demo chỉ 6 đại lý": AF-R01 bắt mọi TV đã đóng phí tự thành đại lý; 51 khách AF0 đã đóng phí → không thể chỉ còn 6 mà vẫn giữ AF-R01. | **Đã chốt (c)** (owner 27/10/2026, "xác nhận và chấp nhận"): giữ 62 đại lý thật; D-84-AFF là ngoại lệ được chấp nhận. |

## V4.2 — TIP-V42-702 (28/10/2026)

Các màn dưới đây đo trên prototype v4.2 vượt 3% **cả trên bản build 701** (trước khi 702 sửa gì), tức do
prototype v4.2 đổi giao diện; mỗi màn đã có TIP trong GOAL-V4.2 phụ trách, không sửa lan ở 702.

| # | Màn | % (1440 / 390) | TIP phụ trách |
|---|---|---|---|
| Q-V42-702-1 | D-18 → D-22 Admin › Phí (6 tab, thẻ "Đang miễn phí 3 tháng", "Hết hạn · cần nâng cấp", cột Email / Nhóm / Ngày thu) | 15 / 20% | V42-708 (D-107) |
| Q-V42-702-2 | D-07 @390 Admin › Thành viên (bỏ lọc "Khởi đầu") | 1,59 / 6,18% | V42-708 (D-100) |
| Q-V42-702-3 | P-84, P-85 @390 hộp chuyển khoản (ảnh VietQR EMVCo thay QR tĩnh Vietcombank) | 1,25 / 7,73%; 1,29 / 9,32% | V42-705 (D-96) |
| Q-V42-702-4 | P-100 → P-102 popup khai báo: kịch bản prototype không tới được popup — v4.2 `_login` đóng mail chào mừng (mật khẩu tạm) trước khi đăng nhập TK mới, kịch bản cũ đọc mật khẩu qua TK demo | timeout | V42-714 (đo lại parity toàn bộ) |
| Q-V42-701-1 | P-42 Chat › tab "File chia sẻ" (đổi nhãn + nguồn theo nhóm) | timeout | V42-709 (D-111) |

## V4.2 — TIP-V42-703 (28/10/2026)

| # | Câu hỏi | Phương án an toàn đã chọn | Ai chốt |
|---|---|---|---|
| Q-V42-703-1 | Đổi giá có áp cho khoản **chưa thu** đang chờ (trial / hết hạn / kỳ kế tiếp) không? §27.2(5) "chỉ giao dịch mới" vs D-104 "đúng bằng giá hiện hành" | Có: `membership_fees.amount` là số phải trả lần **kế tiếp** → cập nhật theo giá mới trong cùng transaction lưu giá; kỳ đã thu (`membership_fee_periods`), hoa hồng đã ghi và khoản Gọi vốn đã phát mã (`pending_payment`) giữ nguyên | Owner (đối soát đúng bằng ở V42-704) |
| Q-V42-703-2 | Lịch sử bảng giá: prototype không có màn xem lịch sử | Lưu `price_config_history` (chỉ thêm, trigger chặn sửa / xoá) + Nhật ký hoạt động tag "Bảng giá" (diff before / after); không thêm UI ngoài prototype | Owner |
| Q-V42-703-3 | REQ-603 nhắc "% hoa hồng" sửa được trong bảng giá; prototype ghi cứng "Hoa hồng Affiliate 10%" | Giữ % Gọi vốn ở `affiliate_policy.fundraising_rate` (BR-GV-06, D-70), tab bảng giá chỉ hiện 10% như prototype; không nhân đôi nguồn | Owner |
| Q-V42-703-4 | Tên bảng: task graph `price_configs`, đặc tả `price_config` | Dùng `price_configs` (task graph, quy ước số nhiều của repo) + `price_config_history` | — |

## V4.2 — TIP-V42-704 (28/10/2026)

| # | Câu hỏi | Phương án an toàn đã chọn | Ai chốt |
|---|---|---|---|
| Q-V42-704-1 | §28.1 "bắt đầu bằng OPCHUB": ngân hàng thường chèn mã giao dịch **trước** nội dung khách gõ (`MBVCB.123 OPCHUB TV… …`) | Tìm token `OPCHUB` đứng riêng (tách theo khoảng trắng), phần sau phải đúng mẫu; dính liền (`OPCHUBTV…`), gạch nối, thừa token → đối soát tay. Không nới thêm | Owner |
| Q-V42-704-2 | Token SĐT trong nội dung có phải khớp SĐT tài khoản không? | Không đối chiếu (người chuyển có thể dùng TK người thân); chỉ nhận đúng 10 số bắt đầu `0` ở vị trí thứ 3; khớp theo Mã TV + số tiền | Owner |
| Q-V42-704-3 | Khoản Gọi vốn phát trước 704 có nội dung `OPCHUB GVxxxxxx` (thiếu Mã TV) | Không tự khớp ("Không tìm thấy Mã TV trong nội dung") → hàng "Cần đối soát" có gợi ý mã GV, kế toán khớp tay (D-113 F3). Khoản phát từ 704 dùng mẫu mới | Owner |
| Q-V42-704-4 | Nội dung email biên nhận: đặc tả chỉ nêu "Email biên nhận", không có mẫu | Tự soạn: tiêu đề "Biên nhận phí thành viên OPC Hub · BN-xxxxxxxx" / "Biên nhận Gói Gọi vốn OPC Hub · GVxxxxxx"; thân: số tiền, gói / dự án, hiệu lực đến hoặc "chờ Admin thẩm định", câu "không hoàn lại" (§27.2) | Owner |
| Q-V42-704-5 | Tab Hồ sơ › Gói & thanh toán: phiên (`/me`) không có SĐT để dựng đủ nội dung CK cho dòng Gọi vốn | Hiện `OPCHUB [Mã TV] GVxxxxxx` (mã tham chiếu, không phải chuỗi để chuyển khoản); nội dung đủ SĐT ở popup thanh toán (lấy từ API) | — |
| Q-V42-704-6 | Parity màn bị chạm: kịch bản P-103 / P-104 / D-92 (popup Gọi vốn) và D-19 (tab Phí "Chờ thanh toán 1") viết cho prototype v4 không tới được màn trên prototype v4.2 (v4.2: chọn nhiều dự án, cột "2. Chuyển khoản" + VietQR, 6 tab Phí) — hỏng ở bước chụp **prototype**, không phải app | Không sửa kịch bản ở 704: popup Gọi vốn dựng lại theo v4.2 ở V42-705 (đo lại P-103 / P-104 / D-92 tại đó), tab Phí ở V42-708 (D-19). D-18 đo lại 15,13 / 20,08% = như trước 704 (Q-V42-702-1). Màn "Giao dịch cần đối soát" không có trong prototype | — |
| Q-V42-705-1 | Popup Gọi vốn v4.2 cho chọn nhiều dự án (ô tích + "Chọn / bỏ chọn tất cả", phụ đề "Chọn một hoặc nhiều dự án…") nhưng D-94 4B / D-96 giữ **1 dự án / khoản** | Dựng bố cục 2 cột v4.2; thẻ chọn là radio (một dự án), chọn sẵn dự án đầu; bỏ link "Chọn / bỏ chọn tất cả"; phụ đề "Chọn một dự án cần gọi vốn mỗi lần · …". P-103 @390 2,91% (phần lệch còn lại chủ yếu là link này + mẫu điểm QR khác mã GV) | Owner (DV theo D-96) |
| Q-V42-705-2 | Ảnh QR prototype lấy từ `img.vietqr.io` (mẫu compact2: mức sửa lỗi H, logo V giữa mã); D-96 cấm gọi dịch vụ ngoài | Server sinh chuỗi EMVCo (cùng chuỗi prototype: kiểm bằng giải mã ảnh — P-84 / P-85 trùng từng ký tự), client vẽ bằng antd `QRCode` mức H + logo V khoét giữa; khung thẻ VietQR dựng lại bằng CSS (chữ VIETQR, napas 247 / Vietcombank, tên TK / STK / số tiền). BIN qua env `BANK_BIN` (mặc định 970436) | — |
| Q-V42-705-3 | Toast app có `z-index: 1100` (nổi trên hộp thoại); prototype `z-index: 50` (nằm dưới mask / hộp thoại 70 → 81) | Theo prototype: toast `packages/ui` về 50 — toast phát lúc mở hộp thoại bị mask che như bản mẫu (P-85, P-104). Hộp thoại AntD (z 1000) cũng che toast. Hệ quả: toast báo lỗi phát khi hộp thoại đang mở (vd "Vui lòng chọn ít nhất 1 dự án cần gọi vốn") bị mask làm mờ / bị hộp thoại che ở màn hẹp, đúng như prototype. Nếu owner muốn toast luôn nổi trên → đổi lại 1100 (P-85 @390 lên ~3,3%, P-104 @390 lên ~4,6%) | Owner |
| Q-V42-705-4 | Mã GV ở prototype là `GV` + timestamp (`GV17921160023`), app `GV` + 6 số (D-105) → chuỗi QR P-103 / P-104 khác nội dung, mẫu điểm QR khác dù cùng mức H | Giữ D-105; phần lệch trong ngưỡng (P-103 @390 2,91%, P-104 @390 2,45%) | — |
