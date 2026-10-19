# TIP-V2-302: Popup Gói dịch vụ V4, phí không hoàn lại, 6 dịch vụ tư vấn (completion)

> V2-P3, nhánh `feature/V2-P3-business-v2`. UP-07 §23.5 · LK-08/09 · NR-R01 → R03 · NA-19 · D-54, D-58, D-60 ·
> REQ-013, 219, 382, 391, 408, 409 · AT-LK04, AT-LK05, AT-NR01, UAT-06 → 08.
> Migration `20261019160000_consent_fee_policy` (agent chính tạo, áp `opchub_dev` + `opchub_test`).
> V2Q mới: V2Q-136 → V2Q-142.

## Đã làm
- **Popup V4** (`features/membership`): cột trái = `PlanHero` (logo, tiêu đề, ảnh `sv-hero-v6.png`, 3 lợi ích) +
  `PlanPrice` ("THÀNH VIÊN HỆ THỐNG", "Ưu đãi 75%", 50.000đ / tháng, "Thanh toán theo năm: 600.000đ", 200.000đ/tháng
  gạch + "(Giá niêm yết)", 6 quyền lợi) + `PlanTiles` (5 ô) + "Đăng ký thành viên ngay · 600.000đ/năm" (mở hộp CK,
  LK-09) + 3 cam kết. Giá tháng/niêm yết là hằng `PLAN_PRICE` trong `model.ts` (D-58); số tiền thu vẫn là `amount`.
  Bỏ ô "Thách thức lớn nhất…" (V2Q-142). Cột phải `ServiceList`: "Dịch vụ & chương trình khác", 6 dịch vụ có icon
  theo id + nút "Tư vấn →" (nhãn truy cập "Tư vấn <tên>").
- **`PaywallModal` chế độ `fit`** (`@opchub/ui`): rộng min(95vw, 1440px); ≥ 1100px `useFitScale` thu nhỏ bằng
  `transform: scale` (3 vòng như prototype) cho vừa 95% chiều cao, không cuộn, khoá cuộn trang phía sau; < 1100px
  một cột cuộn dọc, ẩn hero; < 768px toàn màn hình.
- **NR-R02**: ô đồng ý cá nhân / DN / SSO hoàn tất / tham gia cộng đồng / xem trước nhóm ở Chat có câu
  "600.000đ/năm, không hoàn lại sau khi thanh toán"; chưa tích → lỗi tại ô (`errAgree`, `aria-invalid`) hoặc nút
  khoá. Hộp chuyển khoản có khung "Điều kiện thanh toán: … Phí không hoàn lại …". Banner + tiêu đề hộp CK theo
  giá V4 ("50.000đ/tháng", "ưu đãi 75%").
- **Server lưu vết (REQ-013)**: `ConsentKind.fee_policy`, `TERMS_VERSION = '2026-10-v36'`. Đăng ký (OTP/SSO) ghi
  `terms|privacy|fee_policy`; tham gia nhóm và `transfer-confirm` ghi `fee_policy` một lần mỗi phiên bản qua
  `ConsentWriter` (account export, `INSERT … WHERE NOT EXISTS`, index `(user_id, kind)`). Body thiếu
  `agreeTerms: true` / `agreeRules: true` → 400 (schema `packages/shared`).
- **Danh mục 6 dịch vụ V4** (`comm, train, tools, b2b, org, event`) là seed bắt buộc (`SERVICES` trong
  `seed/catalog.ts`, chỉ tạo khi thiếu); seed demo chỉ còn phiếu (YC-1005 train, 1004/1003 org, 1002 tools, 1001 b2b).
  `FEATURE_SERVICES` mặc định bật (V2Q-139).
- **MSW**: cầu cookie `opchub-mock-yc` chép phiếu tư vấn Portal sang Admin (như cầu nhà đầu tư) để AT-LK05 chạy
  cùng assertion ở msw.
- **NR-R01**: `grep -riE "refund|hoàn tiền|hoàn phí"` trong `apps/ packages/` = 0 (chỉ tên hằng `NON_REFUND`).

## Test
- Unit: `membership/model.spec.ts` REQ-391 giá V4; `paywall-modal.spec.tsx` REQ-391 `fitScale` (thu nhỏ vừa
  1366×768, đã vừa giữ 1); `register-validation.spec.ts` REQ-382 ô đồng ý.
- Int server: `register.int` REQ-013/382 (3 consent cùng version), REQ-382 thiếu `agreeTerms` (cá nhân, DN) → 400;
  `groups.int` REQ-382 thiếu `agreeRules` → 400, consent ghi 1 lần; `membership.int` REQ-382 transfer-confirm ghi
  consent, REQ-219 nội dung CK ổn định + không dấu. Int db `seed-demo.int` REQ-408 6 dịch vụ + seed không ghi đè.
- e2e mới `behavior/popup-v4.spec.ts` (msw + server, 1366×768): AT-LK04 không thanh cuộn + 390px không tràn ngang,
  REQ-409 hộp CK + điều kiện không hoàn lại, AT-LK05 Tư vấn "Công cụ & Giải pháp số" → phiếu Mới ở Admin, AT-NR01
  câu ở đăng ký cá nhân + DN. Sửa `auth-flows` (ô đồng ý + SSO), `services`, `membership`, `community`, `chat`
  (AT-NR01 xem trước), `admin-requests` (danh mục V4), `projects`, `portal-shell`, audit UAT-08.

## Cổng kiểm
| Lệnh | Kết quả |
|---|---|
| lint / typecheck | 8/8 · 8/8 (chỉ cảnh báo `<img>` có sẵn) |
| depcheck | no violations (608 modules) |
| Int server (`opchub_test`) | 76 file, **1010/1010** · int db 14/14 |
| Unit server / shared / admin / portal / ui | 95 / 85 / 154 / 114 / 37 |
| e2e behavior MSW | **167/167** (3 ca cũ sửa theo ô đồng ý / danh mục V4, chạy lại đạt) |
| e2e behavior server (`opchub_dev`, stack 4020/3280/3282) | **167/167** (166 + `profile` BUG-030 SSO thêm ô đồng ý, chạy lại đạt) |

## Chưa làm / chuyển sau
- Baseline parity P-79 → P-88 (popup V4) chụp lại ở TIP-V2-307.
- Mã giới thiệu trên form đăng ký (TIP-V2-403).
- Ngưỡng chữ tối thiểu khi thu nhỏ (KT-04) chờ Kiến trúc sư (V2Q-141).
