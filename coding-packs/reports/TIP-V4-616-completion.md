# TIP-V4-616 — Nghiệm thu §27 trên server dev — completion

- Nhánh `feature/TIP-V4-616-acceptance-27`, xếp chồng trên `feature/TIP-V4-615-parity-v4` (PR #31 chưa merge).
- PR: [#32](https://github.com/duymt-dev/OPCHUB/pull/32), base `feature/TIP-V4-615-parity-v4`.
- Commit:
  - `3bdf92c0` TIP;
  - `f5cc81ff` README server: build `.next-server` không bật cờ tài khoản dùng thử (V2Q-163);
  - `17d6173c` **sửa code**: đăng ký lưu nhóm đã chọn (`opcIntent`) → popup khai báo điền sẵn OPC;
  - `8aa8d8d8` kịch bản e2e chạy đúng trên server dev (khai báo, bỏ check-in, feed Dashboard, huỷ nhận email) + README `UNSUBSCRIBE_SECRET`;
  - `912cc6cb` báo cáo: `V4-acceptance.md`, completion, `V4-P5-completion.md`, progress, Q-V4-616-1..2.
- REQ / D: D-86 · §27.6.1 · §27.6.2 · §27.7 · §27.9.

## Đã làm

1. **Ma trận §27** (`V4-acceptance.md`): 14 UP + 12 AD (+ AD-08b) + 9 F → spec hành vi + int.
   - Mỗi mã có ít nhất một test pass trên server dev.
2. **Chạy toàn bộ `e2e:server --project behavior`** trên server dev, ghi số thật:

   | Lần | Phạm vi | Passed | Failed | Skipped |
   |---|---|---|---|---|
   | 1 | 309 test | 291 | 9 | 9 |
   | 2 | 8 file / 37 test | 37 | 0 | 0 |

3. **Lỗi code tìm ra** (Q-V4-607-1 chưa làm hết):
   - `register.service` không ghi `users.opc_intent` khi kích hoạt.
   - Hậu quả: thành viên mới chọn nhóm lúc đăng ký nhưng popup khai báo không điền sẵn → không lưu được khai báo, kẹt.
   - Sửa trong `registration.repository.ts` + `register.service.ts`.
   - Int `account/register` kiểm `/me/declaration` trả `persona` + `groupIds` đúng.
   - `referral-atomicity` truyền `opcIntent: []`.
4. **Kịch bản e2e** theo luật server thật, không nới assertion:
   - `declaration` UP-02: đóng phí qua ngân hàng giả trước khi mở Cộng đồng, vì chưa đóng phí thì `/groups` = 402.
   - `admin-events`: bỏ check-in sự kiện đã kết thúc → toast 409 + giữ 1/7 (BUG-041).
   - `portal-shell` NA-24: fixture `botManual` có sẵn, để bot tự động không chen tin vào feed.
5. README `e2e/server`:
   - build không có `SHOW_DEMO_ACCOUNTS`;
   - nạp `UNSUBSCRIBE_SECRET` từ `.env` (không in / commit).

## Test (số thật)

- Phạm vi TIP:
  - int `register` + `declaration` + `referral-atomicity` 19/19;
  - server lint / typecheck / unit 225.
- Cổng P5 (HEAD `8aa8d8d8`):
  - lint 0 lỗi, typecheck sạch, depcheck sạch;
  - unit: ui 49 · admin 453 · server 225 · portal 397 · integrations 86 (+2 skip) · shared 395.
- test:int toàn bộ: server 141 file / 1386/1386 · db 16 file / 51/51.
- e2e MSW toàn bộ: xem `V4-P5-completion.md`.
- Parity: TIP không đổi UI (chỉ server + e2e). `results.md` giữ số V4-615.

## Chưa làm / chờ owner

- `tax-lookup-dlpl @live` (cần key DLPL thật) không chạy.
- Q-V4-616-1: seed cố định `MOCK_NOW` lệch với giờ thật của server dev.
- Q-V4-616-2: bot tự động chen tin khi test.
- Merge chuỗi PR #17 → #31 → PR của TIP này.
