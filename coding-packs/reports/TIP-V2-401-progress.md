# TIP-V2-401 — Checkpoint 20/10/2026

Status: IN-PROGRESS, không phải báo cáo DONE của TIP/Pha 4.

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
