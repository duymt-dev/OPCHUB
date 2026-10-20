# TIP-V2-401 — Checkpoint 20/10/2026

Checkpoint lịch sử; backend TIP-401 đã có [completion report](TIP-V2-401-completion.md).
Pha 4 và goal V2 vẫn chưa DONE.

- Đã fast-forward nhánh P4 lên P3 `1cb47f8`, giữ nguyên code Affiliate kế thừa.
- Schema/migration Affiliate đã có; DB test báo không có migration đang chờ.
- Hoàn thiện cấp mã theo lô, khoá transaction chống tranh chấp giữa worker/backfill,
  backfill keyset lô 500, seed đại lý từ các kỳ phí demo thật.
- Hook xác nhận phí ghi `membership_fee.confirmed` cùng transaction của kỳ phí;
  consumer tự tạo đại lý, hoa hồng lần đầu, pause/reactivate và thông báo.
- Repository dùng transition domain; thông báo hoa hồng dùng ID ổn định khi retry.

## Kiểm chứng đã chạy

- `pnpm lint`: pass, còn cảnh báo img hiện hữu ở FE.
- `pnpm typecheck`: pass.
- `pnpm test`: pass (Turbo: 6 task successful).
- `pnpm depcheck`: pass, không vi phạm dependency.
- Affiliate unit: 4 file, 11 test passed.
- Affiliate integration trên `opchub_test`: 3 file, 7 test passed.
- DB integration/seed: 2 file, 14 test passed.

## Còn phải kiểm chứng / thực hiện

- Chưa chạy toàn bộ integration server, e2e hai chế độ hoặc audit hồi quy sau thay đổi.
- Chưa có EXPLAIN với dữ liệu ≥10k cho query backfill.
- Cần mở rộng test backfill vượt một lô và collision mã cùng tên.
- Seed hiện chỉ gồm thành viên đã có kỳ phí thật; dữ liệu Affiliate toàn màn và mock store
  cần đối chiếu khi dựng 402/403/404, không tự thêm đại lý không có tài khoản.
- Ba outbox event thao tác Admin đã khai báo trước ở checkpoint kế thừa;
  handler/API cho chúng thuộc TIP-402, chưa triển khai.
- TIP-402/403/404 và Pha 5 chưa hoàn thành.

Phiên bị chuyển việc sang fork skill Vibecode theo yêu cầu người dùng; giữ nguyên phạm vi goal V2.

## Tiếp tục sau handoff

- P3 đã merge `--no-ff` và push main tại `4f95c97`; P4 đã nhận main tại `df0259a`.
- Thêm test backfill 501 người, collision 22 mã cùng tên và cạnh retry sự kiện phí cũ.
- Đọc trạng thái phí hiện hành khi đồng bộ nhãn đại lý, tránh sự kiện cũ đảo trạng thái mới.
- Query backfill chuyển sang keyset + deferred lateral join. EXPLAIN trên 10.000 kỳ phí:
  cursor 5.000, trả 500 dòng. Query cuối dùng lateral existence + deferred join,
  index seek mọi bảng, không Seq Scan; execution 8.687ms ở lượt đích cuối.
- `test/affiliate` + M1 + contract/coverage ở lượt đích cuối: **25/25 passed**.
  Log: `reports/evidence/v2-401/integration.log`.
- Lượt full integration đầu: 1057 passed, 2 failed do event Admin khai báo trước và retry.
  Hai lỗi đã được sửa và test đích xác nhận. Lượt full thứ hai: 1069 pass, 1 fail
  ở query plan trung gian; đã sửa query cuối và test đích pass, chưa tuyên bố full xanh.
- Ba event thao tác Admin chuyển về đúng bước TIP-402, chỉ khai báo khi có consumer thực;
  không thêm consumer rỗng hoặc allowlist để vượt M1.
- Đang triển khai TIP-402: 6 endpoint Portal/public + cổng gắn referral khi đăng ký.
  Test đích API/đăng ký 9/9 (cả OTP cá nhân, DN và SSO); contract + coverage 3/3,
  bảng hiện có 200 endpoint. API Admin, thông báo thao tác Admin và UI chưa hoàn thành.
