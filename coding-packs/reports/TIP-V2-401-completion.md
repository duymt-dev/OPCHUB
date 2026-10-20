# TIP-V2-401 — Affiliate domain và consumer phí

Status: DONE trong phạm vi backend TIP-401; **không phải DONE Pha 4/goal V2**.

Code: `bac74a5` (schema, migration, lifecycle, backfill, seed, notification),
`d044c38` (retry sự kiện cũ, keyset/deferred join, test nhiều lô và EXPLAIN).
P3 đã merge/push main `4f95c97`; P4 nhận main qua `df0259a`.

## Acceptance → bằng chứng

| Tiêu chí | Bằng chứng |
|---|---|
| AF-R01 xác nhận phí → một đại lý, mã từ tên, % policy | lifecycle.int.spec.ts, affiliate-code.spec.ts |
| AF-R05/R06 lần đóng phí đầu → một hoa hồng, tiền niêm yết, outbox + chuông | commission.int.spec.ts qua relay thật |
| Gia hạn không sinh hoa hồng lần hai; UQ chống ghi trùng | commission.int.spec.ts |
| AF-R07 paused/void/reactivate, guard valid_until trước sweep, giữ khoản cũ | pause.int.spec.ts |
| Retry xác nhận/expired cũ không đảo trạng thái mới | pause.int.spec.ts, đọc phí hiện hành |
| Transition hợp lệ/không hợp lệ | affiliate.state.spec.ts + UPDATE có điều kiện |
| Tiền làm tròn xuống, month_key theo ngày VN | commission-amount.spec.ts, month-key.spec.ts, commission.int.spec.ts |
| Backfill idempotent lô 500, active/expired; 501 người và collision 22 mã | lifecycle.int.spec.ts, backfill.int.spec.ts |
| Đủ consumer worker, không allowlist/no-op | common/outbox-consumers.int.spec.ts |
| CHECK rate và UQ referred_user_id | lifecycle.int.spec.ts, commission.int.spec.ts |

## Lệnh và kết quả

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck`: pass.
  Lint còn cảnh báo img FE hiện hữu, không có error.
- Unit Affiliate: 4 file, **11/11**; unit server tổng **110/110**.
- Lượt integration đích cuối: **11 file, 25/25 pass**, gồm 11 test domain/backfill,
  2 M1, 9 API/đăng ký TIP-402, 1 contract mới và 2 coverage.
- DB seed/integration checkpoint nền: **14/14** (bac74a5).
- Log cuối: `reports/evidence/v2-401/integration.log`; plan độc lập:
  `reports/evidence/v2-401/backfill-plan.log`.

## Query và EXPLAIN

Fixture 10.000 thành viên/kỳ phí trong transaction rồi rollback; cursor 5.000, trang 500.
Query dùng PK user_id, lateral existence lookup có LIMIT và deferred name lookup.
Plan cuối: index seek mọi bảng, không Seq Scan, trả đúng ID 5.001–5.500.
Execution **8.687ms** ở lượt integration cuối (9.121ms ở lượt độc lập).
Không tắt planner/enable_seqscan để ép kết quả.

## Chưa xác nhận / chuyển tiếp

- Full server regression trước sửa query cuối: **1069 pass, 1 fail** ở kiểm plan.
  Plan đã sửa và test đích cuối pass; **chưa tuyên bố full regression xanh**.
  Giữ log lịch sử `server-regression.log`; chạy lại full sau khi API Admin hoàn chỉnh.
- E2E hai chế độ, parity và audit toàn pha chạy khi 402/403/404 hoàn thành.
- Ba event Admin khai báo sớm ở checkpoint được chuyển về bước triển khai 402;
  chỉ thêm lại cùng consumer thật và test hiệu ứng, không dùng stub để vượt M1.
- Các thay đổi 402 Portal/public đang có checkpoint riêng; Admin/UI/Pha 5 chưa xong.
