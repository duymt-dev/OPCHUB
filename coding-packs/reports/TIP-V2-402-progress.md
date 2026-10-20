# TIP-V2-402 — Checkpoint Portal/public, 20/10/2026

Status: IN-PROGRESS; chưa phải completion của TIP/Pha 4.

## Đã triển khai

- Shared zod DTO Affiliate Portal/Admin; mã, tháng, STK và chuẩn hóa tên chủ TK.
- `GET /me/affiliate`, `/referrals`, `/payouts`; `PUT /me/affiliate/bank`.
- `GET /public/affiliate/codes/:code`; `POST /public/affiliate/click`.
- Click dùng Redis NX theo IP+mã/giờ, ngày VN, không ghi khi paused/hết phí.
- Registry/cổng Account → Affiliate tránh phụ thuộc vòng. Kiểm mã trước gửi OTP;
  kiểm lại và gắn referral cùng transaction tạo user. SSO mang `referralCode`.
- API Portal luôn scope theo JWT user, không nhận owner từ body/query; không paywall
  khung khóa hoặc STK của đại lý đã hết phí nhưng còn khoản nhận.
- Phân trang referrals lấy ID trước rồi join payload; tiền tổng hợp bằng integer DB.
- Contract table 194 nền P3 + 6 endpoint mới = 200; coverage có lời gọi cho đủ 6.

## Kiểm chứng

- `me-affiliate.int.spec.ts`, `referral-code.int.spec.ts`, `referral-registration.int.spec.ts`: 9/9 pass.
- `contract/affiliate.int.spec.ts` + `coverage.int.spec.ts`: 3/3 pass.
- Server typecheck pass sau khi sửa type test; lint đích không còn unsafe matcher.
- Integration đích + M1 + contract/coverage: 25/25 pass ở 11 file.
- lint/typecheck/test/depcheck toàn repo: pass. Full regression trước sửa query cuối:
  1069 pass, 1 fail ở plan; query đã sửa và test đích pass, chưa coi full regression xanh.

## Còn lại (không thu hẹp scope TIP)

- Toàn bộ 14 endpoint Admin: summary, commissions/cancel/export, affiliates/rate,
  detail/months/customers/payout/export, policy GET/PUT; audit cùng transaction.
- Consumer thông báo cancel/rate/payout thật, idempotency và snapshot lúc chi trả.
- Integration test Admin/permission/CSV/âm và race attach trong transaction.
- Test/lint/typecheck/depcheck toàn bộ sau khi API hoàn chỉnh; EXPLAIN query list mới.
- Completion report, traceability, commit/push TIP hoàn chỉnh.
- TIP-403/404 mới dựng UI/MSW/parity; chưa có màn Affiliate, không coi API là xong UI.
