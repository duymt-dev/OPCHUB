# V2 LK evidence matrix - IN PROGRESS

Source: SRS-3.6 section23.3, REQ-401..412 and current decisions. The spec table saying "matched" describes the intended contract, not a runtime test result. All rows below remain UNVERIFIED until the same user-to-admin action/data assertions pass on both lanes.

D-54 overrides obsolete LK-10 refund prose: no refund workflow or refund-driven pause is required or permitted.

| Link / REQ | User action | Admin destination | Required persisted data | MSW | Native |
|---|---|---|---|---|---|
| LK-01 / REQ-401 | Đăng ký cá nhân / doanh nghiệp + OTP email | Tổng quan › Đăng ký mới; Thành viên | user = Hoạt động; fee = Chờ thanh toán | UNVERIFIED | UNVERIFIED |
| LK-02 / REQ-402 | Popup phí bắt buộc sau đăng nhập, chuyển khoản đúng nội dung | Thành viên › Phí thành viên | fee: Chờ thanh toán → Đã thanh toán (12 tháng) | UNVERIFIED | UNVERIFIED |
| LK-03 / REQ-403 | Tham gia nhóm tỉnh/thành | Chủ nhóm duyệt trong phòng chat; Admin › Nhóm cộng đồng | group_member: pending → active | UNVERIFIED | UNVERIFIED |
| LK-04 / REQ-404 | Gửi tin / báo cáo tin vi phạm | Cộng đồng › Nhóm cộng đồng › tab Kiểm duyệt tin nhắn | report: Mới → Đã xử lý | UNVERIFIED | UNVERIFIED |
| LK-05 / REQ-405 | Đăng ký sự kiện | Nội dung › Sự kiện › danh sách đăng ký | registration: registered → attended | UNVERIFIED | UNVERIFIED |
| LK-06 / REQ-406 | Đăng dự án (Public/Private, gọi vốn) | Nội dung › Dự án | Nháp → Chờ duyệt → Đang hiển thị | UNVERIFIED | UNVERIFIED |
| LK-07 / REQ-407 | Quan tâm đầu tư (Cá nhân / DN / Quỹ) | Nội dung › Nhà đầu tư › panel trao đổi | investor_interest + investor_comment | UNVERIFIED | UNVERIFIED |
| LK-08 / REQ-408 | Bấm “Tư vấn →” trên 1 trong 6 dịch vụ | Dịch vụ › Yêu cầu tư vấn | service_request: Mới → Đang tư vấn → Hoàn tất | UNVERIFIED | UNVERIFIED |
| LK-09 / REQ-409 | Bấm “Đăng ký thành viên ngay” | Thành viên › Phí thành viên | Mở luồng thanh toán LK-02 | UNVERIFIED | UNVERIFIED |
| LK-10 / REQ-410 | Chia sẻ link affiliate | Affiliate › Đơn giới thiệu, Chi trả | referral -> commission -> paid; no refund workflow (D-54) | UNVERIFIED | UNVERIFIED |
| LK-11 / REQ-411 | Chat với bot tương tác (persona) | Cộng đồng › Bot tương tác | Tự động 100% theo kịch bản | PARTIAL: TIP-530 actual member -> Admin execution -> live/F5 reply; full automatic script lifecycle pending | PARTIAL: identical TIP-530 case1/1; full automatic script lifecycle pending |
| LK-12 / REQ-412 | Cập nhật hồ sơ, đổi mật khẩu, 2FA | Thành viên › chi tiết (chỉ xem) | profile, security | UNVERIFIED | UNVERIFIED |

Evidence must identify the created/updated entity in this test, its Admin menu/detail and authoritative response/data. A pre-existing seed record, title match or unrelated independent page assertion is insufficient.
