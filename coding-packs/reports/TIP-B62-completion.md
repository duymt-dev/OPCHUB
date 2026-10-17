# TIP-B62 — Seed demo + 115 behavior e2e trên server thật (hoàn thành)

## Kết quả

```
cd e2e && pnpm e2e:server --project behavior
  115 passed (7.7m)
```

- Portal/Admin build `NEXT_PUBLIC_API_MOCKING=off` (`.next-server`, cổng 3200/3201 — 3100 thuộc dự án khác trên máy),
  server dist: api :4000, socket :4001, worker; DB `opchub_dev`, Redis db 1.
- Fixture tự động `demoReset` (`e2e/server/test.ts`) chạy `seed:demo` + `flush:dev-cache` trước **mỗi** test
  (MSW dựng lại dữ liệu theo trang; server phải reset để test độc lập).

## Seed demo (`packages/db/seed/demo/**`, `pnpm --filter @opchub/db seed:demo`)

Dựng từ chính dữ liệu MSW (`@opchub/shared` prototype-seed + mock-domains), idempotent theo id cố định, chỉ chạy
trên `opchub_dev` / `opchub_test` (`demo/guard.ts` kiểm tên DB). Gồm TK demo + M1–M8, 34 nhóm, phí + kỳ phí,
sự kiện + đăng ký, dự án + bình luận, NĐT, lĩnh vực, quản trị + nhật ký, chiến dịch + mail log, persona/kịch bản/
hội thoại, dịch vụ + phiếu, tin nhắn phòng, `stats_daily` 7 tháng (B63). Quyết định dữ liệu: Q-B62-2 → Q-B62-21.

## Lệch hành vi lộ ra và cách xử lý

| Mục | Xử lý |
|---|---|
| Rate limit chặn e2e một IP | `RATE_LIMIT_DISABLED` (cấm production trong env schema) — Q-B62-1 |
| Redis giữ cache cũ sau reset DB | `flush:dev-cache` (chỉ db dev, mọi tiền tố `opchub:*` cache) — Q-B62-14 |
| Nhóm không có chủ nhóm → form Admin báo lỗi | Seed gán chủ nhóm cho mọi nhóm có thành viên — Q-B62-15 |
| Chuông Portal không nhận thông báo sinh ở worker | Portal nghe `notification.new` qua socket dùng chung (`lib/socket.ts`) — Q-B62-21 |
| Luật server chặt hơn MSW (TK chưa phí, chủ nhóm rời nhóm, đăng ký đóng, phiên khác…) | Nhánh `onServer` trong spec dùng helper `e2e/server/api.ts` để tạo đúng tiền điều kiện thật (CK ngân hàng giả, chuyển chủ nhóm, đóng đăng ký…) — **không** nới kiểm tra; Q-B62-16 → Q-B62-20 |
| Nhật ký chỉ INSERT giữ dòng các lượt trước | Kiểm dòng mới nhất `.first()` — Q-B62-13 |

## Commit

`0cd95d3` · `3a04014` · `bc975af` · `bc8464e` · `cea578c` · `e4f0d94` · `5f1b825` · `563a955` · `200053b`

## Chưa làm

- e2e chạy trên `opchub_dev` (không có DB e2e riêng — chỉ được dùng opchub_dev/opchub_test).
