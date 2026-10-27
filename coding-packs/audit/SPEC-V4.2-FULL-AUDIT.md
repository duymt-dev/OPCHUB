# SPEC v4.2 — rà soát toàn bộ đặc tả + prototype so với code (27/10/2026)

> Phạm vi: đặc tả v4.2 §27 → §29 + màn prototype `docs/spec/index.html` tương ứng, đối chiếu code `dev`
> `e9e69fe4`. 5 mảng rà song song, chỉ đọc. Quy tắc: prototype thắng (D-93), nút prototype no-op vẫn
> làm theo nghiệp vụ (D-95); mục đã chốt D-89 → D-103 chỉ ghi "đã chốt, chưa làm".
> Câu hỏi owner ở cuối mỗi mảng → chốt trong RRI (D-104 trở đi).

## Lỗi thật đã xác minh (sửa không cần chốt)

| # | Lỗi | Bằng chứng | Sửa |
|---|---|---|---|
| B1 | Đổi % hoa hồng đại lý ghi đè cả khoản Gọi vốn (BR-GV-06 cố định 10%) | `affiliate/repositories/affiliate-write.repository.ts:44` UPDATE không lọc `source` | Chỉ áp `source='membership'` |
| B2 | Gia hạn Gọi vốn luôn thu giá đầy đủ, không dùng giá gia hạn | `project/services/fundraising.service.ts:69` `FUNDRAISING_PLAN.amount` | Theo F5 + cấu hình giá |
| B3 | Nội dung CK đúng mẫu §28.1 (có cả TV và GV) bị đẩy sang đối soát tay | `packages/integrations/src/bank-webhook/content.ts:39` | Theo F2 |
| B4 | Tin trúng từ khoá được phát cho cả phòng trước khi ẩn (trái D-77 "ẩn ngay") | `chat/services/message.service.ts:174-184` phát `message.new` rồi mới chạy hook; `keyword-filter.service.ts` xếp job sau commit | Khớp từ khoá đồng bộ trước khi lưu / phát |
| B5 | File thực thi lọt qua (x.exe khai MIME pdf, tên giữ đuôi gốc) | `shared/api-domains/uploads.ts:86-97` whitelist theo MIME khai báo | Chặn theo đuôi, đuôi khớp MIME, kiểm magic bytes |
| B6 | File chat tải được bằng URL công khai, không kiểm thành viên nhóm | `uploads/local-uploads.controller.ts:42,62` `@Public` (dev); production `publicUrl` — bucket public chưa xác minh | URL ký ngắn hạn sau khi kiểm thành viên (D-98) |


## Mảng 1: Tài khoản · Đăng ký · Phí · Trial · Gọi vốn · VietQR (agent, chỉ đọc)

## Đã chốt, chưa làm (khối lượng chính — trial phải đi trước)
- D-94 1A trial: enum membership_fee không có trial; fee-writer.service.ts:13 tạo pending_payment; isFeeUsable (fee-access.ts:25) chỉ active/expiring; job quét membership-fee.repository.ts:78. Cổng: guards.ts:132, chat-access.service.ts:43, socket-auth.ts:58, uploads.service.ts:38, store-explore.repository.ts:32, Portal isActive (model.ts:27). nextPeriod đã nối tiếp valid_until.
- D-94 2A migration pending_payment → trial/expired theo created_at + 90 ngày.
- D-94 5A price_config: planAmount / FUNDRAISING_PLAN dùng ở fee-writer, membership-fee.service:146, fundraising.service:69, fundraising-review:86; FE plan-cards, pay-banner, billing-tab, onboarding-card, fundraising-popup. Validate prcV: per.y, biz.y, fund.p > 0; fund.mo ≥ 1; cảnh báo tháng > niêm yết.
- §27.2(5) giá lúc thanh toán = giá cấu hình hiện hành (membership_fees.amount hiện chốt lúc tạo kỳ; đối soát so cur.amount membership-fee.service.ts:98).
- D-96 VietQR (pay-details.tsx:273 ảnh tĩnh) + dòng chú thích "Mã QR đã điền sẵn {tiền} và nội dung {ref}".
- D-101 Admin › Phí: cột Tên / Email / Nhóm (fee-table.tsx:103), 6 tab + 6 thẻ (fee-stats.tsx), doanh thu = Σ giá gói TV active/soon (admin-fees.repository.ts:90 hiện cộng mọi kỳ), rowActions trial chỉ "Gửi nhắc".

## Lệch FE / copy (tự làm)
- Bảng giá pk: "0đ", niêm yết gạch, "Miễn phí 3 tháng đầu", "Từ tháng thứ 4: …", lead mới, "Thanh toán khi đăng ký", nút Gia hạn khi trial (plan-cards.tsx:59-68, membership.json plan.lead).
- Popup bắt buộc: svMustT "Hết 3 tháng miễn phí · nâng cấp để tiếp tục" (paywall-gate.tsx); bỏ ngoại lệ /affiliate (overlay-policy.ts:3).
- Toast khai báo "Đã lưu thông tin · bạn được dùng miễn phí 3 tháng đến dd/mm/yyyy", về Dashboard.
- Dashboard bước 1 trial "Kích hoạt tài khoản · miễn phí 3 tháng" + "Dùng đầy đủ quyền thành viên đến … · sau đó nâng cấp gói để tiếp tục" + "Xem gói"; thẻ Gọi vốn thêm "(không áp dụng miễn phí 3 tháng)".
- Popup Gọi vốn BR-GV-01: lọc không nháp, đã bật gọi vốn, không chờ duyệt, không đang còn hạn (fundraising-host.tsx:18; server start() nhận cả nháp / chưa khai báo) + kiểm server; câu "Chưa có dự án nào bật…"; dòng "Cấu trúc: …"; Quay lại + ×.
- PayBanner: prototype payBanner:false — chưa xác minh.

## Bug xác minh
- Gia hạn Gọi vốn luôn thu 15tr (fundraising.service.ts:69), renewAmount không dùng ở server.
- extractPaymentCode (packages/integrations/src/bank-webhook/content.ts:39) trả null khi có cả TV và GV → mẫu §28.1 rơi vào xử lý tay.

## Khớp
BR-PAY-REF phí TV; hàng đối soát tay phí TV; fundSt; duyệt +6 tháng + tự ẩn; hoa hồng Gọi vốn khi duyệt (D-70); khai báo trường; đăng ký trùng / mã giới thiệu / OTP; billing-tab bố cục; plan-badge SOON 30.

## Cần chốt
F1 đối soát phí TV: A bắt buộc OPCHUB + đúng bằng giá (thừa/thiếu → tay) · B giữ D-41 (TV ở mọi vị trí, nhận dư).
F2 nội dung CK Gọi vốn: A `OPCHUB TVxxxxxx 0xxx GVxxxxxx` + parser ưu tiên GV, kiểm TV khớp chủ · B giữ `OPCHUB GV000123`.
F3 khớp tay Gọi vốn: A màn đối soát chọn khoản Gọi vốn → pending_review, lý do + audit · B chỉ bỏ qua.
F4 email biên nhận: A mẫu mail biên nhận phí + Gọi vốn · B chỉ chuông.
F5 giá gia hạn Gọi vốn: A 7.500.000 từ cấu hình, chỉ khi đã hết hạn, bỏ mua sớm 14 ngày · B giữ 15tr + 14 ngày (D-82).
F6 Gọi vốn bị từ chối: A rejected → pending_review khi bổ sung (không thu lại) · B mua khoản mới.
F7 khoản 600.000 cũ (D-69): A theo giá cấu hình hiện hành · B giữ 600k.
F8 nhắc khi trial: A nhắc T-7, T-0 · B không nhắc.

## Mảng 2: Affiliate · Dịch vụ · Nhà đầu tư (agent, dev e9e69fe4, chỉ đọc)

Tóm tắt: Dịch vụ + Nhà đầu tư khớp gần hết. Affiliate lệch lớn: code còn AF-R01 (đóng phí mới thành đại lý, mã hợp lệ khi còn phí) trong khi D-94 3A chốt mọi TV; commission chưa lưu loại gói.

## Lệch / chưa có
- CR-07: đại lý chỉ tạo ở `membership_fee.confirmed` (affiliate-lifecycle.handler.ts:35,50), backfill chỉ TV đã trả; đăng ký không tạo đại lý → ĐÃ CHỐT D-94 3A, chưa làm.
- Mã tạm dừng theo phí: referral-code.service.ts:55-62, onFeeChanged active↔paused, me-affiliate.service.ts:50-60 → cần chốt (Q1).
- BR-AFF-REV type/plan: commissions không có cột plan; plan cứng 'Phí thành viên 12 tháng' (me-affiliate.service.ts:87, affiliate-admin.service.ts:113) → cần chốt (Q2).
- §27.6 Hủy: prototype cho Khôi phục Đã hủy → Đã ghi nhận; code cancelled là trạng thái cuối (affiliate.state.ts:18, commission-status-menu.tsx:46) → cần chốt (Q3).
- §28.2 làm tròn: prototype Math.round; code Math.floor (commission-amount.ts, affiliate-write.repository.ts:44); D-53/D-70 "làm tròn xuống" → cần chốt (Q4).
- BR-GV-06 BUG: đổi % (affiliate-write.repository.ts:44) ghi đè cả khoản source='fundraising' → sửa: chỉ áp source='membership'.
- CH-03 thẻ doanh thu: phụ đề "{count} thành viên đã thanh toán" → "n Gói DN · n Gói Cá nhân · n Gói Gọi vốn" (sau Q2).
- CH-04 perT: chỉ Gói Cá nhân (me-affiliate.service.ts:47) → trả 3 số (Cá nhân, DN, Gọi vốn %), giá từ Cấu hình bảng giá.
- Portal tab giới thiệu chỉ source='membership' (me-affiliate.query.ts:14,18) → hiện cả khoản Gọi vốn.
- §27.6 chi trả: code chặn tháng chưa kết thúc (payout.service.ts:44), prototype cho cả tháng hiện tại → giữ cuối tháng (§27.6), DV.
- BR-GV-06 thời điểm ghi: prototype khi thanh toán, code khi Admin duyệt (D-70) → giữ D-70.

## Copy (tự làm theo prototype)
- portal affiliate.json locked.*: "Link giới thiệu của bạn đang được khởi tạo" + câu mới (D-101).
- onboarding.json:77 FX-04 "Có link ngay khi đăng ký · nhận hoa hồng khi người được giới thiệu thanh toán gói".
- admin affiliate.json: rateHint "Áp dụng trên phí năm thực thu: Gói Cá nhân {p} · Gói Doanh nghiệp {b} · 3 tháng miễn phí không phát sinh hoa hồng" (prototype v4.2 VẪN CÓ dòng này — sửa D-101 "bỏ dòng"), ruleText v4.2, autoHint "Mọi thành viên (cá nhân & doanh nghiệp) tự động có link affiliate · hoa hồng mặc định 20%".
- FX-02 fallback server dịch vụ bật đầu tiên khi serviceId rỗng / dịch vụ tắt (phòng thủ).

## Khớp
mã từ tên + /r/MÃ; 20% + % riêng Admin + audit; cookie 30 ngày; lần đầu; tự giới thiệu; Đã ghi nhận ngay; void khi mã tạm dừng; thông báo hoa hồng; amount snapshot; lịch sử nhận tiền; chi tiết đại lý; danh mục dịch vụ CRUD + popup + form; mã YC-1001; bỏ 5 bước YC; nhà đầu tư danh sách + xuất + audit; quyền.

## Cần chốt
Q1 mã tạm dừng: A bỏ ràng buộc phí (mã luôn hoạt động) · B ràng buộc isPaid có tính trial.
Q2 loại gói hoa hồng: A cột plan snapshot + backfill · B suy khi đọc qua JOIN.
Q3 khôi phục hoa hồng đã hủy: A cho cancelled→recorded (audit) · B giữ.
Q4 làm tròn: A Math.round · B giữ làm tròn xuống.
(Q5 bug % Gọi vốn: tự sửa.)

## Mảng 3: Cộng đồng · Chat · Kiểm duyệt · Bot (agent, chỉ đọc)

## Lệch / chưa có
- §27.7 Admin sửa/xoá chủ đề: code chỉ thêm phòng (group-admin.service.ts:135-155,199-213, Q-B20-2) → cần chốt (O1).
- Trial vào nhóm: đã chốt D-94; gộp trial vào isFeeUsable (guards.ts:107-135) dùng chung mọi cổng.
- D-98 File chia sẻ: code theo phòng, chỉ kind file, take 200 (room.repository.ts:213-220). Chi tiết làm: gồm ảnh; "{size} · {who}"; "# chủ đề · time"; Tải về; chip đếm toàn bộ; tìm tên + người gửi; mở chủ đề gốc; tab "File chia sẻ"; câu đầu + câu trống theo prototype; bỏ SEEDF.
- §27.7 chỉ thành viên tải: uploads @Public GET + publicUrl (local-uploads.controller.ts) → URL ký ngắn hạn sau kiểm thành viên nhóm (thuộc D-98). Bucket S3 prod: chưa xác minh.
- §27.7 20 MB: CHAT_FILE_MAX_BYTES 10 MB (uploads.ts:96) → 20 MB (D-98).
- Chặn file thực thi: whitelist MIME khai báo, tên giữ đuôi gốc → x.exe khai application/pdf lọt (uploads.ts:86-94) → chặn theo đuôi + đuôi khớp MIME + magic bytes; thêm doc/xls/csv/ppt. (BẢO MẬT — tự sửa trong D-98.)
- CR-14 ẩn ngay: keyword-filter.service.ts:275-284 xếp job sau commit; message.service.ts:177-189 phát message.new nguyên văn trước → lệch D-77 "ẩn ngay" → sửa: matcher đồng bộ trước insert/phát.
- Copy cảnh báo lần 1 (warning-notification.ts) → "Tin nhắn đã bị ẩn do vi phạm nội quy. Nếu tiếp tục, tài khoản sẽ bị khóa {LD} ngày." (payload thêm days).
- Copy đẩy ra khi khoá (auth.json:36) → "Tài khoản bị khóa {LD} ngày do vi phạm nội quy nhiều lần." (reason violation).
- Kịch bản giãn cách 1–60 phút: schema 1–120 (bot.ts:70), runtime trần 5 phút (runtime-time.ts:33-49) → tôn trọng 1–60.
- D-99 bot (đã chốt) chi tiết: lịch from/to ngày VN, to hết ngày; trạng thái paused/wait/ended/live + các câu; Xoá lịch; Tạm dừng / Chạy lại. Trả lời từng tin: quét 20 s; phòng Chung; N mặc định 50 (1–200); tin chữ thành viên thật, chưa ẩn, chưa trả lời; mỗi tin 1 phản hồi có replyToId; xếp nhóm theo tin chờ; công tắc Tự động tách Tạm dừng; Quét ngay chạy cả khi Tự động tắt; Dừng + tiến độ; theo dõi ≤ 10 nhóm; xem trước 8 tin; lịch sử 100 (hiện 20) + "Xem trong nhóm →". AI hàng loạt: chủ đề mỗi dòng bỏ trùng; 4 loại + loại tự định nghĩa (lưu server — bảng mới); 1–5 (2), 2–8 (4), 1–60 phút (5); nhóm đích bắt buộc; ≥ 2 persona bật, ưu tiên persona thuộc nhóm; cấu trúc mở đầu / trả lời / khép; chống trùng chuẩn hoá; tích chọn + "x câu · y khác nhau · trùng z" + "Lưu n kịch bản". AI config Admin thay env BOT_LLM_PROVIDER (integrations.module.ts:127).

## Khớp
TV không tạo chủ đề; D-71 bỏ duyệt; tin ẩn không hiện file; V4-11 resolveFile; báo cáo → ẩn; ngưỡng lần 2 khoá 7 ngày, cửa sổ 90 ngày (OI-02 = D-77); FX-01; tự mở khoá; Khôi phục (D-77); Admin Kiểm duyệt; E2E-04, 14; không nhãn bot; NA-07 với bot; giới hạn D-50.

## Cần chốt
O1 sửa / xoá chủ đề: A đổi tên + xoá mềm (tin giữ, ẩn khỏi Portal, audit, "Chung" khoá cứng) · B giữ chỉ thêm.
O2 giãn cách Trả lời từng tin: A giây (prototype, 5 mặc định) · B 1–60 phút (đặc tả).
O3 giới hạn persona khi trả lời: A theo prototype (persona thuộc nhóm, bỏ khung giờ / quota / cooldown 120 s) · B giữ khung giờ + quota, chỉ thay cooldown bằng giãn cách cấu hình.
O4 kịch bản đã lưu tự chạy luân phiên: A có (xen kẽ AI tự sinh) · B chỉ runAt / thủ công.
O5 số hội thoại tự động cùng lúc: A một hội thoại toàn hệ thống (prototype) · B song song theo nhóm (≤ 30).

## Mảng 4: Gian hàng · Nhu cầu · Dự án OPC · Sự kiện (agent, chỉ đọc)

## Lệch / chưa có
- D-97 trình tạo (đã chốt) — chi tiết cần làm:
  - need theo bước: B1 tên, ngành, tỉnh · B2 giới thiệu ≥ 40 + ảnh bìa (bắt buộc) · B3 không bắt buộc · B4 ≥ 1 SP/DV · B5 hotline + địa chỉ; Xuất bản kiểm đủ, Lưu nháp không kiểm. Code `canPublishStore` (shared/api-domains/stores.ts:168) chỉ tên / giới thiệu / SP.
  - Copy thông báo đúng prototype ("Vui lòng nhập tên doanh nghiệp", "Giới thiệu cần tối thiểu 40 ký tự", "Đã lưu nháp gian hàng", ...).
  - Tự mở trình tạo khi gian hàng auto còn trống (wzOn).
  - Logo nhiều ảnh, × ảnh đang chọn → chữ viết tắt. Ảnh bìa: 6 ảnh mẫu COVERS + tải lên; × đang dùng → rest[0]; ảnh mẫu × vào hidCovers.
  - Tầm nhìn / sứ mệnh, gallery, video (không có kind upload video — uploads.ts:69), đội ngũ (bắt buộc họ tên + chức vụ), chứng nhận (bắt buộc tên + ảnh), hồ sơ năng lực (.pdf .ppt .pptx .doc .docx), nhiều hotline / email / địa chỉ, mạng xã hội zalo/fb/web/yt/tt/li, phường / xã (ward).
  - Chi tiết gian hàng: logo, các khối media, liên hệ nhiều; không dữ liệu giả (EX facts, gallery FS, reels từ ảnh — BUG-038); mạng xã hội mở link thật; nút "Chỉnh sửa / + Thêm …" của chủ mở trình tạo đúng bước.
  - Xem trước theo wz.pv.
  - API: mở rộng PUT /me/store (không bắt buộc CRUD tách).
- Tự tạo gian hàng khi trial bắt đầu (không chỉ fee confirmed).
- QT-ST-PJ: Project không có store_id / province (project.prisma) → thêm; khối dự án dùng visibleTo.
- E2E-10 dự án hiện ngay vs code pending_review (project-write.service.ts:53, D-18) → cần chốt.
- §27.3 expired khoá dự án: visibleTo không kiểm phí (project.repository.ts:33) → cần chốt.
- Gọi vốn gia hạn: code luôn tính amount (fundraising.service.ts:69) → giá fund.r theo cấu hình (D-94 5A); thời điểm gia hạn cần chốt.
- Nhu cầu: ngân sách cho phép từ = đến (needs.ts:146–188 lỗi khi >=); xoá nhu cầu bị ẩn (need-owner.service.ts:95 trả 409) → cho xoá (xoá mềm).
- BR-GV-01 điều kiện "nháp" + "đã bật gọi vốn": chưa xác minh.

## Khớp
mức hoàn thiện (stores/model.ts:86); Admin chỉ Ẩn/Hiện (giữ chặn HIDDEN_BY_ADMIN); MembershipFeeGuard; BR-TRIAL-04 gian hàng/nhu cầu lọc theo phí; nhu cầu hiện ngay; Admin Gian hàng / Nhu cầu; fundSt; sự kiện v4.2 không đổi.

## Cần chốt
S1 dự án đăng xong: A hiện ngay, Admin hậu kiểm, sửa không duyệt lại (Gọi vốn vẫn duyệt) · B giữ duyệt trước.
S2 dự án TK hết hạn: A rời Khám phá như gian hàng, hiện lại khi thanh toán · B vẫn hiện, chỉ khoá đăng / sửa.
S3 DN đã đóng phí chưa có gian hàng: A migration tạo Nháp cho mọi DN trial/active · B giữ D-84.
S4 Gian hàng / Nhu cầu cho Cá nhân: A giữ D-75 (chỉ DN) · B Cá nhân đăng nhu cầu không cần gian hàng.
S5 giới hạn media: A ảnh ≤ 5 MB, 12 ảnh / 10 logo / 10 chứng nhận, video ≤ 100 MB × 6, tài liệu ≤ 20 MB × 10 · B owner đặt.
S6 Dashboard Gian hàng của tôi: A dựng, chỉ số thật · B không làm.
S7 gia hạn Gọi vốn: A chỉ khi hết hạn (prototype) · B giữ cửa sổ 14 ngày, cộng dồn.
S8 Lưu nháp trên gian hàng đang hiện: A theo prototype gỡ khỏi Khám phá (kèm xác nhận) · B giữ hiển thị, nút thành "Lưu thay đổi".

## Mảng 5: Shell · Dashboard & Khởi đầu · Admin · Thông báo · Đăng nhập (agent, chỉ đọc)

## Lệch / chưa có
- Cài đặt thiếu tab "Cấu hình bảng giá" (settings/types.ts:4-31, need price:'cfg') → D-94 5A, đặt giữa SMTP và Tài khoản quản trị, khoá settings.general.
- Thành viên ô lọc onb (member-filters.tsx, members/api.ts:33, admin-member-filter.sql.ts:25-29) + cột Khởi đầu / Nhắc (member-table.tsx:41,90) → D-100.
- "Xóa lọc" chỉ xoá 7 ô; prototype xoá cả q + type, nhãn "Xóa lọc (N bộ lọc)".
- Ô lọc Phí: prototype _mfPaid = until > now (trial = đã đóng) → cần chốt.
- Thẻ "Chưa khai báo" trong cột Loại TK: chưa có → thêm profileIncomplete (bool).
- CR-11 _obAutoRemind: sau đăng nhập user 2,5 s, chưa xong + > 24 h → notify system "Bạn còn N bước khởi đầu chưa hoàn tất" / "Còn thiếu: …. Hoàn tất để kết nối hiệu quả hơn với cộng đồng.", mở dashboard, KHÔNG email. Code: chỉ Admin Nhắc (onboarding-remind.service.ts, có email D-88). onboarding_reminders.sent_by NOT NULL (onboarding.prisma:28) → cho null.
- Bước 1 Dashboard trial + paid gồm trial (onboarding.repository.ts:30, shared/onboarding/steps.ts) → D-94.
- FX-04 copy onboarding.json:77; Gọi vốn onboarding.json:88 thêm "thanh toán khi đăng ký (không áp dụng miễn phí 3 tháng)".
- Sau kích hoạt (OTP + SSO) → /dashboard thay /community (use-otp-flow.ts:13, use-sso-registration.ts:46).
- Tab Cài đặt › SSO chỉ Google (sso-tab.tsx:97).

## Khớp
menu Portal (PN 9 mục, Hồ sơ ở avatar); menu Admin (AG + Báo cáo D-78, Marketing gỡ D-73, giữ Nhà đầu tư); quyền 27 + reports.view, ADM_DEF khớp (PG là mã chết); chế độ chỉ xem / xem thử; FX-03 popup mail theo tài khoản (thêm e2e A → B); thông báo deep link; Tổng quan luồng; mail chào mừng D-47/D-91.

## Chưa xác minh
nhãn trial thẻ gói sidebar (prBill.stT); cách đếm thẻ "Phí" Tổng quan khi trial.

## Cần chốt
A1 "khi đăng nhập" tự nhắc: A chỉ đăng nhập thật (prototype) · B lần mở app đầu tiên trong ngày (cả khi phiên còn hạn).
A2 trial trong ô lọc "Phí thành viên" + thẻ Phí Tổng quan: A trial = đã đóng (prototype) · B chỉ phí thật; trial là "Chưa đóng" hoặc thêm lựa chọn "Miễn phí 3 tháng".
