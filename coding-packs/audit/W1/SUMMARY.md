# AUDIT-W1 — Tổng hợp

> Rà soát OPCHUB trên server thật (MSW tắt), `main` @ `70cfcbb`, ngày 18/10/2026. Không sửa code sản phẩm.
> Audit đo theo đặc tả v2.0; số § trong các file theo v2.0. Bản SRS-3.6 mới xem [SPEC-V3-DELTA.md](SPEC-V3-DELTA.md).
> Dữ liệu: `opchub_dev`, Redis db 1. Dịch vụ ngoài dùng fake. Mỗi lượt dùng thử chạy `seed:demo` + `flush:dev-cache` trước.

## Các file

| File | Nội dung |
|---|---|
| [BUGS.md](BUGS.md) | 44 lỗi BUG-001 → BUG-044, có bước tái hiện và bằng chứng |
| [TECH-DEBT.md](TECH-DEBT.md) | 36 nợ TD-001 → TD-036, chia 9 nhóm |
| [TEST-GAPS.md](TEST-GAPS.md) | Truy vết 191 dòng REQ / NFR / D-01→48 / BR / QT / UAT / §11 → test |
| [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) | 116 câu mở (gồm 12 câu SRS-3.6); 31 L3; 30 chặn go-live |
| [SPEC-V3-DELTA.md](SPEC-V3-DELTA.md) | Thay đổi đặc tả v2.0 → SRS-3.6 (`docs/spec/ver2/`): đánh số lại §, NA-01→29, Affiliate, phân quyền 25 quyền, v3.5, v3.6; mâu thuẫn với D-xx |
| [SCREENS.md](SCREENS.md) | 205 màn đã dùng thử; kiểm form, biên, chéo vai trò; luồng mail |
| `evidence/` | Ảnh màn lỗi, log worker outbox |
| `work/` | Dữ liệu thô (`uat.jsonl`, `screens*.jsonl`, `findings.jsonl`), `code-review.md` (CR-01→48, phân loại 101 DV), `mechanical.md` (6 kiểm cơ học) |

Script (không nằm trong gate):
- `e2e/audit/*.audit.ts`, config `e2e/audit/playwright.audit.config.ts`
- `apps/server/test/audit/*.audit.ts`, chạy bằng `run-all.audit.ts`

## 1. Lỗi theo mức

| Mức | Nghĩa | Số |
|---|---|---|
| S1 | Chặn go-live | **3** |
| S2 | Sai nghiệp vụ | **18** |
| S3 | UX | **18** |
| S4 | Nhỏ | **5** |
| **Tổng** | | **44** |

## 2. Lỗi theo domain

| Domain | S1 | S2 | S3 | S4 | Tổng |
|---|---|---|---|---|---|
| Xác thực & tài khoản | 1 | 3 | 2 | 1 | 7 |
| Nền tảng API / form chung | 2 | 0 | 2 | 0 | 4 |
| Phí thành viên | 0 | 2 | 2 | 0 | 4 |
| Cộng đồng & nhóm | 0 | 1 | 1 | 0 | 2 |
| Chat & kiểm duyệt | 0 | 1 | 2 | 0 | 3 |
| Sự kiện | 0 | 0 | 0 | 1 | 1 |
| Dự án | 0 | 3 | 2 | 1 | 6 |
| Nhà đầu tư | 0 | 2 | 0 | 0 | 2 |
| Dịch vụ / phiếu YC | 0 | 1 | 0 | 0 | 1 |
| Bot / persona | 0 | 1 | 0 | 0 | 1 |
| Dashboard | 0 | 1 | 1 | 0 | 2 |
| Thành viên / khoá TK (Admin) | 0 | 3 | 0 | 0 | 3 |
| Thông báo & mail | 0 | 0 | 1 | 0 | 1 |
| Phân quyền | 0 | 0 | 1 | 1 | 2 |
| Marketing | 0 | 0 | 2 | 0 | 2 |
| Bảo mật phiên | 0 | 0 | 1 | 0 | 1 |
| Admin shell / UI chung | 0 | 0 | 1 | 1 | 2 |
| **Tổng** | **3** | **18** | **18** | **5** | **44** |

Nợ kỹ thuật: 36 mục (ảnh hưởng Cao 9, TB 16, Thấp 11). 9 mục Cao gồm 5 hạ tầng VPS, 1 adapter SePay, 1 TOTP, 1 outbox mất sự kiện, 1 độ phủ test.

## 3. Bốn lỗi đã biết: đều có mặt

| Lỗi đã biết | BUG | Mức |
|---|---|---|
| Ảnh bìa body > 100KB trả 500 | BUG-002 (9 endpoint) + BUG-003 (lỗi bị đổi thành 500) | S1 |
| Trường bắt buộc chỉ báo bằng toast | BUG-022 | S3 |
| Khoá TK không ẩn dự án, không chuyển nhóm (D-15, `user.locked` không có consumer) | BUG-004 (+ BUG-005, TD-023) | S2 |
| `/reset-password` trả 404 | BUG-001 | S1 |

## 4. UAT-01 → UAT-31 (server thật): ĐẠT 27, TRƯỢT 4

| UAT | Kết quả | Ghi chú |
|---|---|---|
| UAT-01 | ĐẠT | Thiếu vai trò bị chặn; chỉ báo bằng toast (BUG-022) |
| UAT-02 | ĐẠT | Hộp OTP hiện, `mail_logs` có 1 dòng otp |
| UAT-03 | ĐẠT | Báo "Vui lòng nhập đủ 6 chữ số" |
| UAT-04 | ĐẠT | Vào `/community`; Admin thấy TK; có log mail chào mừng |
| UAT-05 | ĐẠT | Nhập MST tự điền tên DN; TK active |
| UAT-06 | ĐẠT | Popup Gói dịch vụ hiện, không đóng được |
| UAT-07 | ĐẠT | Popup giữ nguyên, hiện nhắc |
| UAT-08 | ĐẠT | Nội dung CK đúng dạng `OPCHUB TVxxxxxx SĐT` |
| UAT-09 | ĐẠT | Webhook fake → active; popup đóng (bằng polling, BUG-025) |
| UAT-10 | ĐẠT | Ghi nhận đã thu → active, hạn +12 tháng |
| UAT-11 | **TRƯỢT** | Link đặt lại mật khẩu → 404 (BUG-001) |
| UAT-12 | ĐẠT | Xin tham gia → chủ nhóm duyệt → thành viên, có thông báo |
| UAT-13 | ĐẠT | Hai trình duyệt; tin hiện realtime |
| UAT-14 | **TRƯỢT** | Persona không phản hồi thành viên thật (BUG-008) |
| UAT-15 | ĐẠT | Chạy kịch bản → duyệt → đăng tin persona. Chạy tay; không chạy theo lịch hay giãn cách (M4 #2) |
| UAT-16 | ĐẠT | Đăng ký 201; 1 mail xác nhận |
| UAT-17 | ĐẠT | Dự án ở trạng thái `pending_review` |
| UAT-18 | ĐẠT | Duyệt → hiện ở Khám phá |
| UAT-19 | ĐẠT | Thiếu SĐT → 400; quỹ thiếu đơn vị → 400 |
| UAT-20 | **TRƯỢT** | Luồng trao đổi nhà đầu tư tách làm hai (BUG-006) |
| UAT-21 | **TRƯỢT** | DN thiếu tên DN / MST vẫn 201 (BUG-019) |
| UAT-22 | ĐẠT | Tạo YC-1007, trạng thái `new` |
| UAT-23 | ĐẠT | `new` → `consulting`; người được gắn tên có thông báo. Link thông báo chết (BUG-023) |
| UAT-24 | ĐẠT | Khoá → đăng nhập bị 403 |
| UAT-25 | ĐẠT | Gán 2 người vào nhóm → số thành viên 8 → 10 |
| UAT-26 | ĐẠT | "Chọn tất cả" chỉ chọn trang hiện tại |
| UAT-27 | ĐẠT | Số dòng/trang của 5 bảng Admin đúng |
| UAT-28 | ĐẠT | SMTP thiếu key → 400 |
| UAT-29 | ĐẠT | Mail thử có nội dung mới |
| UAT-30 | ĐẠT | Đăng xuất → `/login`; vào lại bị đẩy về login |
| UAT-31 | ĐẠT | 390px không tràn ngang; bảng thành thẻ |

Chú ý: UAT ĐẠT ở đây là đạt theo câu chữ §15. Nhiều UAT đạt nhưng có lỗi phụ đi kèm (UAT-01 → BUG-022, UAT-09 → BUG-025, UAT-23 → BUG-023, UAT-24 → BUG-004/005).

## 5. Dùng thử màn: 205/205 kịch bản registry

| Kết quả | Số |
|---|---|
| OK | 61 |
| Chỉ có React #418: artefact do clock giả của parity (BUG-040, S4) | 123 |
| Có tín hiệu khác: đã phân loại, không phát sinh lỗi mới | 11 |
| Registry đánh dấu unreachable, có lý do | 10 |

Chi tiết ở [SCREENS.md](SCREENS.md). Ở 1440, không màn nào hiện "Lỗi hệ thống" khi đi theo kịch bản. Lỗi 500 chỉ lộ ra khi nhập dữ liệu thật (ảnh), không lộ ra khi đi theo dữ liệu seed. Kịch bản parity không bắt được các lỗi này.

## 6. Độ phủ test (TEST-GAPS)

| Nhóm | Tổng | ĐỦ | MỘT PHẦN | TRỐNG |
|---|---|---|---|---|
| REQ | 68 | 35 | 25 | 8 |
| NFR | 6 | 0 | 4 | 2 |
| D-01 → D-48 | 48 | 21 | 17 | 10 |
| BR-01 → BR-13 | 13 | 7 | 5 | 1 |
| QT-01 → QT-13 | 13 | 2 | 11 | 0 |
| UAT-01 → UAT-31 | 31 | 15 | 14 | 2 |
| §11 thông báo/email | 12 | 3 | 5 | 4 |
| **Tổng** | **191** | **83 (43,5%)** | **81 (42,4%)** | **27 (14,1%)** |

Không có test nào bắt được bốn lỗi đã biết. Có 13 nhánh `onServer` làm yếu assertion.

## 7. Kiểm cơ học (6 kiểm)

| Kiểm | Đạt | Không đạt | Vào |
|---|---|---|---|
| 1. Outbox → consumer | 11 | 3 | BUG-004, BUG-005, TD-023 |
| 2. Link server sinh → đích có thật | 9 | 4 | BUG-001, BUG-023 |
| 3. Giới hạn zod ≤ giới hạn body | 68 | 11 | BUG-002, BUG-003, BUG-037, TD-015 |
| 4. Transition §8 → code / endpoint / test | 22/28 cạnh | 11 | BUG-007, 008, 033, 041, TD-024 |
| 5. Permission key → guard | 131 | 16 | BUG-035, BUG-042, TD-026 |
| 6. Env zod ↔ `.env.example` | 117 | 15 | TD-031 |

## 8. Top 10 vấn đề ưu tiên

Chỉ nêu vấn đề, không nêu giải pháp.

1. **Không đặt lại được mật khẩu.** Link trong mail dẫn tới 404; TK đăng ký không mật khẩu không có đường đặt mật khẩu (BUG-001, S1).
2. **Không lưu được nội dung có ảnh thật.** Sự kiện, nhóm, dự án, persona, logo có ảnh trên khoảng 75KB đều trả 500. Lỗi bị đổi thành "Lỗi hệ thống" (BUG-002, BUG-003, S1). Gốc là ảnh lưu dạng data URL trong DB (TD-014, TD-015).
3. **Khoá TK chỉ chặn đăng nhập.** Dự án vẫn hiện, nhóm vẫn do TK đó làm chủ, socket đang mở vẫn gửi tin. Sự kiện outbox bị đánh dấu đã xử lý nên mất vĩnh viễn (BUG-004, BUG-005, TD-023; D-15, QT-12).
4. **Hạ tầng go-live chưa sẵn sàng.** Chưa có TLS/HSTS, real_ip Cloudflare, secret, backup offsite + diễn tập khôi phục, cảnh báo sự cố. Chưa kiểm cú pháp trên máy đích, chưa có staging (TD-001 → TD-006).
5. **Đối soát phí phụ thuộc giả định chưa xác minh.** Header chữ ký SePay là giả định, nginx không chặn IP webhook, không có màn khớp tay giao dịch không khớp. Phí hết hạn còn dùng được tới khoảng 24 giờ (TD-007, BUG-014, BUG-018, BUG-032).
6. **Form không báo lỗi tại ô, có màn nuốt lỗi.** Mọi form chỉ toast một lỗi đầu tiên. Đăng ký cá nhân/DN không hiện gì khi server từ chối, mà đây là đầu phễu (BUG-022, BUG-009, BUG-024).
7. **Dữ liệu giả lẫn vào sản phẩm.** Dashboard LIVE mô phỏng; gửi tệp trong chat gửi tệp mẫu; ảnh bìa lấy từ Unsplash thay cho ảnh Admin tải lên; số cứng ở màn đăng nhập và Tổng quan (BUG-010, 011, 012, 028, 029).
8. **Rủi ro dữ liệu cá nhân (NĐ 13) và kiểm soát Admin.** Lộ email/SĐT/địa chỉ chủ dự án; tải CSV dữ liệu cá nhân không có audit; 2FA Admin không bật được; marketing không có huỷ đăng ký (BUG-016, 017, 015, 036).
9. **Luồng nghiệp vụ chéo vai trò bị đứt.** Trao đổi nhà đầu tư tách hai bảng; trạng thái nhà đầu tư đổi tuỳ ý; bot không phản hồi thành viên; phiếu tư vấn DN thiếu MST vẫn tạo được; xuất CSV thành viên không tải được (BUG-006, 007, 008, 019, 013).
10. **Bộ test không phản ánh đặc tả.** Chỉ 43,5% có test đủ. Thiếu kiểm âm phía server (kích thước body, consumer outbox, worker theo lịch). Không có e2e đi theo link trong mail. Nhánh `onServer` làm yếu assertion (TD-032 → TD-035).
