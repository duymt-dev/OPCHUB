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
