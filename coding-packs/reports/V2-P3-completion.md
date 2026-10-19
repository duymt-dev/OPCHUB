# V2-P3 — Nghiệp vụ ver2 (phí, gói V4, sự kiện, nhóm, số liệu thật, dọn dữ liệu, parity) (completion)

> GOAL V2-BUILD, Pha 3. Nhánh `feature/V2-P3-business-v2`, merge vào `main`. 7 TIP (TIP-V2-301 → 307).

## TIP và commit

| TIP | Nội dung | Nợ / lỗi đóng | Commit |
|---|---|---|---|
| 301 | Hạn phí, nhắc T-30/T-7/T-0/T+3 lúc 08:00 + thông báo trong app | REQ-202, 204 | `ba244a5` |
| 302 | Popup Gói dịch vụ V4, phí không hoàn lại (NR-R01), 6 dịch vụ tư vấn | REQ-013, 219, 382, 391, 408, 409 · BUG-030 | `3e1a721` |
| 303 | Sự kiện: link Google Meet, khối Sắp diễn ra, check-in x/y, quét 15' | REQ-223, 341 → 345, 405 | `d98ff5b` |
| 304 | Chủ đề chỉ Admin tạo, khởi tạo nhóm, vai trò Thành viên/Giảng viên trong nhóm | REQ-209, 212, 218, 229, 361, 362 | `eefc758` |
| 305 | Số liệu thật realtime (Redis), số đỏ chưa đọc, bỏ dữ liệu giả | BUG-012, 028, 029 · CR-15 · TD-010 · REQ-210, 224, 225 | `39a1efe`, `e8dd6bc` |
| 306 | Dọn dữ liệu 02:00, lưu giữ audit, dọn ảnh bị thay, rà NA-06/07/14/20/21/22 | REQ-206, 207, 213, 214, 220 → 222, 226 | `36ef30c`, `c9fcf39` |
| 307 | Registry parity + baseline theo prototype ver2 (MSW + server), shell ver2 | BUG-022 · REQ-391 | `c8b2dc0` → `ed03ecc` |

Sau pha: `10fcb07` (mỏ neo audit C4 cho chuyển trạng thái NĐT sau BUG-007), commit báo cáo này (UAT-12 chọn
nhóm có chủ còn hạn phí — seed demo ngày cố định, chủ nhóm c4 hết hạn đúng 20/10/2026).

Lựa chọn tạm chờ PM: V2Q-134 → V2Q-166 (`reports/V2-questions.md`).

## Cổng kiểm (20/10/2026)

| Lệnh | Kết quả |
|---|---|
| `pnpm lint` / `pnpm typecheck` | sạch |
| `pnpm depcheck` | no dependency violations |
| Int server (`opchub_test`) | **1051/1051** |
| Unit admin / portal / ui / shared / server / integrations | 158 / 114 / 39 / 90 / 99 / 25 |
| e2e behavior MSW / server | **178/178** · **178/178** |
| Audit cơ học | C1 20/20 · C2 22/22 · C3 79/79 · C4 **28/29** · C5 155/155 · C6 126/142 |
| Audit e2e trên server | **236/236** bước; **UAT 30/31 đạt** — UAT-14 (persona tự phản hồi, BUG-008) thuộc Pha 5 |
| Parity | MSW 303/387 ≤ 3%, server 290/387 ≤ 3%; mọi ảnh > 3% có DV-V2-307-1 → 19 (`ui-parity/deviations.md`) |

Môi trường server: stack riêng (API 4020, socket 4021, Portal 3280, Admin 3282), `seed` + `seed:demo` +
`flush:dev-cache` trước khi chạy; đã tắt sau khi xong.

## Còn lại / chuyển pha sau

- **C4**: hội thoại bot → Pha 5 (TIP-V2-501/502), cùng UAT-14.
- **Parity**: A-12 → A-20 (ô "Mã giới thiệu"), A-31/32, P-97/98, D-84/85 (màn Affiliate) → Pha 4.
- **C6**: biến dev/e2e không có trong `infra/env/*.example` — cố ý (S4).
