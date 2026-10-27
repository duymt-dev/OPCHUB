# OPCHUB — Roadmap

> Draft từ OPCHUB-SRS-2.0 §16. Phase 0 → 3 đã làm (B1 → B6, V2, V4); thứ tự hiện hành ở phần **v4.2** dưới đây.

## Phase 0 — Nền tảng (2 tuần) → M0 (T2)
Hạ tầng, CI/CD, identity, khung UI, schema DB v1. Nghiệm thu: pipeline xanh, auto deploy Staging.

## Phase 1 — Lõi / MVP (6 tuần) → M1 (T8)
QT-01→05, QT-12, QT-13: đăng ký + OTP + email chào mừng, đăng nhập/SSO/quên MK, phí thành viên + đối soát + popup bắt buộc, cộng đồng + duyệt/gán nhóm, Admin Thành viên/Phí/Nhóm/Cài đặt.
Nghiệm thu: UAT-01→12, 24→30.

## Phase 2 — Tương tác (4 tuần) → M2 (T12)
QT-06 chat + kiểm duyệt, QT-08 sự kiện, QT-09 dự án, QT-10 nhà đầu tư, Dashboard.
Nghiệm thu: UAT-13, 16→20.

## Phase 3 — Mở rộng (4 tuần) → M3 (T14), Go-live M4 (T16)
QT-07 Bot tương tác, QT-11 Dịch vụ (phiếu YC), báo cáo, load test, bảo mật, UAT, go-live.
Nghiệm thu: UAT-14, 15, 21→23; 100% UAT + SLO §14.

## Đã làm
- B1 → B6 (backend + FE trên server thật), V2 (SRS-3.6), V4 (SRS-4.0: 3 gói phí, gian hàng, nhu cầu, onboarding, báo cáo), UI v4 khớp prototype (parity 438/442, 4 ngoại lệ owner chấp nhận).

## v4.2 (27/10/2026, D-93 → D-117, REQ-601 → 615) — TIP chưa lập
1. Sửa lỗi B1 → B6 (đối soát, hoa hồng, gia hạn, kiểm duyệt, upload)
2. Miễn phí 3 tháng + cổng quyền chung + Cấu hình bảng giá
3. Đối soát §28.1 + VietQR + Gọi vốn (gia hạn, khớp tay, duyệt lại, biên nhận)
4. Affiliate cho mọi thành viên
5. Khởi đầu tự nhắc + Admin (Phí, Thành viên)
6. Chat: chủ đề đổi tên / xoá, File chia sẻ nhóm
7. Gian hàng 5 bước + media, dự án hiện ngay, đăng dự án từ gian hàng
8. Bot: lịch, trả lời từng tin, AI tạo hàng loạt, AI cấu hình Admin

## Post-launch (chưa có trong SRS)
- Chưa xác định. Ứng viên: app mobile native, cổng thanh toán thẻ/ví, quyền xóa tài khoản tự phục vụ, i18n ASEAN.
