# TIP-V2-108: Guard phí so `valid_until`, màn giao dịch cần đối soát, Portal nghe `membership.updated` (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. BUG-018 · BUG-014 · BUG-025 · D-57 · NA-02 · NA-03 · QĐ-01 · UAT-09/10.
> TIP không đổi schema, **không cần migration**. V2Q mới: V2Q-92 → V2Q-96.
> Commit: `6564323` (server + contract), `9bd09d0` (Admin + MSW), `9c31018` (Portal), `e73e73f` (e2e)
> + commit báo cáo này.

## Đã làm
- **Guard tức thời (D-57, BUG-018)**: `common/auth/fee-access.ts` — `effectiveFeeStatus(fee, now)` (active/expiring có
  `validUntil <= now` → `expired`; trạng thái khác giữ nguyên), `isFeeUsable`. Áp ở `MembershipFeeGuard`,
  `ChatAccessService.assertFee`, `SocketAuth.authenticate`; nguồn vẫn Redis `auth:fee` → claim JWT, không query DB
  (S-03), `now` lấy 1 lần mỗi request. `isFeeActive` giữ + re-export. Investor / route quản trị không đổi.
- **`/me/membership`** trả `status = effectiveFeeStatus(...)`, không ghi DB (job `fee-status-daily` giữ nguyên).
- **Khớp tay (BUG-014)**: `unmatchedTxnSchema.matchedHint` (nullable, default null); `FeeTransactionsService.unmatched`
  tính `extractMemberCode(content)` (thuần). `MembershipFeeService.activate` bỏ chặn thiếu tiền khi
  `source = 'manual'` (QĐ-01, V2Q-95) — đối soát tự động vẫn chặn.
- **Socket cho TK chưa phí (V2Q-92)**: handshake trước đây từ chối TK chưa/hết phí nên `membership.updated` không bao
  giờ tới người đang chờ đối soát. Thêm `auth.scope = 'membership'`: TK chưa phí (không khoá, version hợp lệ, không
  phải NĐT) được nối nhưng chỉ ở `user:{id}`; `rejectClientEvents` trả ack MEMBERSHIP_REQUIRED cho mọi sự kiện client;
  `socket.data.limited` → không tính online. Không `scope` → luật cũ.
- **Admin `/fees/transactions`**: `FeeTransactionsScreen` (orchestrator), `TxnTable` (giờ VN, VND, nội dung, lý do,
  gợi ý Mã TV, "Khớp tay" chỉ khi `m.edit`), `MatchDialog` + `MemberPicker` (debounce 300 ms, 10 gợi ý, điền sẵn
  khi `matchedHint` khớp đúng 1 người, lý do 1–500, bước xác nhận "Khớp giao dịch <tiền> cho <tên>?"), "Tải thêm"
  keyset (`useInfiniteQuery`, `before` không lên URL), trống "Không có giao dịch cần đối soát". 204 → toast
  "Đã khớp giao dịch cho <tên> · hiệu lực đến <ngày>" + invalidate `feeKeys.all`; 409 → toast server + tải lại.
  Toolbar Phí thành viên: link "Giao dịch cần đối soát (N)" ("9+"), màn ≤ 600 px nhãn ngắn "Đối soát (N)" (V2Q-96).
  Tìm thành viên qua `GET /admin/fees?q=` (V2Q-93). `fees.json` chỉ thêm khoá `txn.*`; `index.ts` thêm 1 export.
- **MSW**: `GET /admin/fees/transactions` (keyset), `POST …/:id/match` (204 / 409 / 400); kho mẫu 3 giao dịch
  (sai nội dung, thiếu tiền TV000006, mã không tồn tại) trong `mock-data/domains/fees-admin.ts`.
- **Portal (BUG-025)**: `useMembershipPush` (gắn trong `PaywallGate`) parse `serverEvents['membership.updated']`,
  `setQueryData(membershipKeys.mine)` + cập nhật `auth-store.me.membershipFee`; `useTransferConfirm` giữ nguyên
  (toast + đóng hộp). Mất kết nối khi `waiting` → refetch 1 lần lúc `connect`. Kết nối ở chế độ chờ phí nhận trạng
  thái có hiệu lực → nối lại để có quyền chat. `useMembership`: `refetchInterval` 1 s chỉ khi `!realtimeEnabled &&
  waiting`; `isMandatory(status, validUntil, now)` + đồng hồ phút (không gọi API). `lib/socket.ts` gửi `scope`.

## Test (số thật)
- `pnpm lint` 8/8 task (0 error; 5 warning `<img>` có sẵn ở events/groups); `pnpm typecheck` 8/8; `pnpm depcheck`:
  no dependency violations (562 modules).
- `pnpm test`: server 83, shared 80, portal 111, admin 139, ui 30, integrations 25 + 2 skip — tất cả pass. Mới:
  `fee-access.spec.ts` (`D-57 BUG-018 active quá valid_until → expired`, `expiring còn hạn → usable`,
  `pending_payment không đổi`, `valid_until null`…), portal `model.spec` `BUG-018 D-57 isMandatory theo validUntil`,
  admin `fee-handlers.spec` `BUG-014 MSW giao dịch không khớp + khớp tay 409 lần 2`.
- Int server (opchub_test): **318/318** (70 file). Mới: guards `REQ-202 BUG-018 D-57 Redis active nhưng valid_until đã
  qua → 402; expiring còn hạn → 200`; socket `REQ-202 BUG-018 handshake hết hạn theo valid_until → MEMBERSHIP_REQUIRED`,
  `BUG-025 V2Q-92 chưa đóng phí + scope membership → chỉ nhận membership.updated, room.join bị chặn`; membership
  `BUG-018 D-57 /me/membership trả expired tức thời; /dashboard/live → 402`; chat-rest `REQ-202 BUG-018 D-57 đọc chat
  … → 402`; admin-fees `REQ-203 BUG-014 danh sách unmatched có matchedHint; khớp tay thiếu m.edit → 403` (+ khớp thiếu
  tiền 500.000đ → 204), `REQ-203 BUG-014 khớp tay → audit fee.match_transaction + kỳ phí manual có lý do`.
- e2e MSW (build riêng `.next-108`, Portal 3350 / Admin 3351 / proto 4840): admin-fees + membership 10/10; **toàn bộ
  behavior 142/142 passed**. Mới: `UAT-10 BUG-014 REQ-203 giao dịch sai nội dung → khớp tay → biến khỏi danh sách, TV
  Đang hiệu lực`; sửa `BUG-025 UAT-09 … popup tự đóng, không polling /me/membership mỗi giây` (server: đếm ≤ 2 trong
  5 s; MSW không có socket → chỉ kiểm kết quả, V2Q-94).
- Parity D-18 → D-22 (1440 + 390): 10/10, chênh ≤ 0,97 % (ngưỡng 3 %). File kết quả parity tái sinh không commit.

## e2e server: CHƯA chạy
Theo brief, không dựng/dừng api 4000 / socket 4001 / Next 3220/3222, không `seed:demo` opchub_dev. **Cần agent chính**:
restart api + socket (handshake `scope` mới), rebuild Portal + Admin chế độ server, rồi
`cd e2e && pnpm exec playwright test -c playwright.server.config.ts behavior/admin-fees.spec.ts behavior/membership.spec.ts`
(+ chat/portal-shell vì socket Portal giờ luôn gửi `scope`).

## Ngoài phạm vi / ghi chú
- SKIP theo TIP: mail nhắc + job 08:00 (TIP-V2-301), nội dung CK có SĐT (NA-19, TIP-V2-302), hoàn phí.
- Tìm thành viên theo SĐT trong hộp Khớp tay chưa có (API `/admin/fees?q=` không tìm SĐT — V2Q-93).
- V2Q-92 mở rộng hợp đồng handshake (§14.4 không nói TK chưa phí nhận sự kiện thế nào) — cần PM xác nhận.
