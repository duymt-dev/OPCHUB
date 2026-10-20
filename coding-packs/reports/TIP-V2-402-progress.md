# TIP-V2-402 — Checkpoint Portal/public + Admin, 20/10/2026

Status: CHECKPOINT LỊCH SỬ. TIP-402 đã chốt backend; xem
[completion](TIP-V2-402-completion.md). Pha 4/goal V2 chưa hoàn tất.

## Checkpoint kiểm chứng bổ sung

- Full regression khởi chạy ở `fe8a974`: **94 file, 1158/1158 pass**. Đây là
  regression nền; các thay đổi sau đó được kiểm lại ở bộ đích, không gộp số test.
- Bộ Affiliate/contract/M1 trên thay đổi mới: **21 file, 48/48 pass**. Kiểm lại
  riêng admin-commissions sau thêm assertion lý do ở hai API: **5/5 pass**.
- Root lint/typecheck/test/depcheck chạy lại: exit 0 cả bốn lệnh.
- Thêm race hai activation cùng email/khác mã (một user/phí/referral), rollback
  user/consent khi attach thất bại, guard mọi Admin GET và field envelope mọi ghi.
- Tên khách chỉ đọc qua Account.MemberDirectory (batch cho list), không JOIN
  users từ Affiliate. Soft-deleted customer dùng nhãn không định danh ở API/notice.
- Thêm 10 mẫu EXPLAIN history/search trên 10k commissions/affiliates, 20k
  users/referrals, cùng cách clone schema/index session-local. Tổng 15 mẫu list.
  Tìm commission dùng UNION ID theo customer/affiliate thay vì lọc lướt index ngày
  toàn cục. Test yêu cầu Index Cond affiliate_id, không chỉ có chữ Index Scan.
- Public kiểm mã hợp lệ trả thêm cookieDays từ chính sách hiện hành; frontend
  `/r/[code]` có thể ghi TTL đúng policy mà không cần hard-code 30 ngày.

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
- Thêm đủ 14 endpoint Admin: danh sách/thống kê, tỷ lệ đơn và hàng loạt, hủy,
  CSV đại lý/hoa hồng, chi trả và chính sách. Contract table: 194 nền P3 + 20 = 214.
- Quyền backend `affiliate.view/action/payout`; Admin không có khóa chi trả.
- Mutation khóa các đại lý theo ID tăng dần, rồi conditional update commission.
  Đổi tỷ lệ chỉ tính lại recorded, không thay khoản paid/cancelled.
- Audit và outbox cancel/rate/payout cùng transaction; consumer thật đăng ký worker.
  Notice có ID bền vững, replay không tạo bản sao.
- Chi trả chỉ ghi nhận đã chuyển, không gọi ngân hàng. Snapshot ngân hàng + receipt
  ID trong DB phục hồi kết quả nếu Redis mất cache sau commit; paused vẫn nhận tiền.
- CSV theo lô 1.000 và keyset, batch contact lookup; BOM/escape/formula protection,
  audit export cùng snapshot transaction RepeatableRead.
- Migration index `20261020130000_affiliate_admin_indexes` đã áp native dev/test.
  SQL viết tay vì INCLUDE/partial/expression; không chạy migrate dev/shadow DB để
  giữ giới hạn chỉ hai DB được phép. Có down.sql; không thay migration đã áp.

## Kiểm chứng

- `me-affiliate.int.spec.ts`, `referral-code.int.spec.ts`, `referral-registration.int.spec.ts`: 9/9 pass.
- `contract/affiliate.int.spec.ts` + `coverage.int.spec.ts`: 3/3 pass.
- Server typecheck pass sau khi sửa type test; lint đích không còn unsafe matcher.
- Integration đích + M1 + contract/coverage: 25/25 pass ở 11 file.
- lint/typecheck/test/depcheck toàn repo: pass. Full regression trước sửa query cuối:
  1069 pass, 1 fail ở plan; query đã sửa và test đích pass, chưa coi full regression xanh.

## Kiểm chứng Admin (đang tiếp tục)

- `payout.int.spec.ts`: 4/4 pass, gồm thiếu STK, paused, quyền, snapshot,
  consumer relay/replay, hai key cạnh tranh và retry sau mất cache.
- `admin-commissions`, `policy`, `contract/affiliate-admin`: 7/7 pass ở lượt đích.
- Affiliate + contract/coverage: 34/34 pass ở 14 file (chưa bao gồm plan/race mới).
- Root lint/typecheck/test/depcheck đã pass; server unit 111/111, có CSV mới.
- Lượt source cuối: Affiliate + Portal/Admin contract + coverage 214 endpoint + M1:
  **41/41 pass ở 17 file**, gồm race, audit rollback, cancel/rate qua relay thật
  và EXPLAIN clone cuối. Root lint/typecheck/test/depcheck chạy lại: đều exit 0.
  Log tại `reports/evidence/v2-402/`; full regression cũ giữ riêng, không đổi nhãn.
- Full regression đầu: 1153 pass, 1 fail, duy nhất test Admin EXPLAIN cũ; chưa có
  các race test thêm sau khi collection bắt đầu. Không gọi đây là full PASS.
- EXPLAIN cũ trên bảng dùng chung chọn Seq Scan sau nhiều fixture rollback (index
  bloat). Chỉ VACUUM không hết bloat, nên không dùng lượt đó làm bằng chứng PASS.
  Đã bỏ điều kiện toàn bộ enum dư thừa khỏi ID subquery. Test plan cuối dùng bảng
  tạm session-local `LIKE public.… INCLUDING ALL`: clone schema/index đã deploy,
  seed commit 10.000 dòng/bảng, VACUUM ANALYZE rồi đo cùng SQL builder production.
  Không tắt seqscan/đổi planner cost, không reindex bảng thật để làm xanh test.
  5/5 mẫu query dùng index, ID subquery Index Only Scan với Heap Fetches 0.
  Bằng chứng này chứng minh dataset 10k sạch, không khẳng định planner luôn chọn
  index với mọi mức bloat/phân bố dữ liệu trên bảng dùng chung.
  LIKE không sao chép FK; integration API vẫn chạy trên bảng thật có đầy đủ FK.

## Chốt backend / chuyển tiếp Pha 4

- Full regression cuối source fb8ecba đã PASS 1165/1165 (98 file); completion
  và traceability API đã chốt. Các checkpoint số liệu phía trên giữ làm lịch sử.
- TIP-403/404 mới dựng UI/MSW/parity; chưa có màn Affiliate, không coi API là xong UI.
