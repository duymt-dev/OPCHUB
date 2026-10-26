# V4-P1 — Nền + gỡ quy trình — completion

- TIP của pha: V4-601, V4-606, V4-603, V4-604, V4-605 (đủ completion + SHA + PR, xem `V4-progress.md`)
- PR (xếp chồng, chưa merge): #17 (base `dev`) → #18 → #19 → #20 → #21
- HEAD đo pha: nhánh `feature/TIP-V4-605-service-tickets`, SHA ghi ở commit chứa file này (sau `c88c9c23`)

## Chạy toàn bộ một lần (số thật, 23/10/2026)

| Bộ | Kết quả | Thời gian |
|---|---|---|
| `pnpm test:int` (turbo, concurrency 1) | db 8 file / 31 test passed · server 129 file / 1266 test passed · 0 failed | db 21 s · server 12 phút 9 s |
| `pnpm e2e` (Playwright `--project=behavior`, build MSW, seed lại trước khi chạy) | 283 passed · 4 skipped · 0 failed | 12,5 phút |

- 4 skip: `tax-lookup-dlpl.spec.ts` (3 ca stub DLPL bật theo cờ + 1 ca `@live`), có từ trước V4.
- Không retries, không fixme, không nới timeout/assertion.
- Ca chập chờn ghi ở V4-605 (`service.int.spec` REQ-222 bình luận, hỏng 1 lần trong lần chạy phạm vi) qua ở lần chạy toàn bộ.
- Không chạy `e2e:server` (bộ trên server thật) ở pha này — goal phiên chỉ yêu cầu toàn bộ e2e behavior cuối pha; để V4-616 (nghiệm thu trên server dev).

## Cổng kiểm pha P1 (02-TASK-GRAPH)

| Cổng | Kết quả |
|---|---|
| Giá 3 gói ở một chỗ | Đạt: `packages/shared/src/membership/plans.ts` là nguồn duy nhất (V4-601); server, portal, admin, mail đọc từ đây |
| Không còn đường duyệt vào nhóm | Đạt: xoá `GroupJoinMode` + join request, migration tự duyệt (V4-603); grep `join-requests` / `joinRequest` trong `apps/*/src`, `packages/shared/src` = 0 |
| Không còn trạng thái NĐT | Đạt: bỏ cột, bảng bình luận, enum (V4-604); grep `INVESTOR_INTEREST_STATUS` = 0 |
| Không còn quy trình YC dịch vụ | Đạt: bỏ `status`, `assignee`, enum + 4 route (V4-605); grep `SERVICE_REQUEST_STATUS` = 0 |
| Không còn menu Marketing | Đạt phần menu: gỡ khỏi sidebar + lịch job (V4-606). Route `/marketing` còn, kiểm `settings.mail`, vì nhật ký mail nằm đó (Q-V4-606-2) |
| grep `600000` = 0 ngoài migration + test D-69 | **Chưa đạt hết — chuyển sang V4-602 (P2)**. Đã sửa `OTP_TTL` mock (không liên quan phí, `c88c9c23`). Còn lại chỉ ở affiliate (phí niêm yết 600.000 làm cơ sở hoa hồng): `srv/affiliate/domain/policy-preview.ts`, `repositories/me-affiliate.query.ts`, `services/me-affiliate.service.ts`, mock `shared/mock-data/domains/affiliate{,-demo}.ts`, `admin/mocks/handlers/affiliate.ts`; và seed `affiliate-scenario.ts` `LEGACY_FEE` (kỳ cũ D-69, được phép). Đây đúng phạm vi D-70 "hoa hồng = % × phí thực trả" của V4-602 — TIP kế tiếp; kiểm lại ở cổng P2 |
| Migration chạy sạch trên DB native | Đạt: 4 migration V4 `migrate deploy` trên `opchub_test` + `opchub_dev`; test migration dữ liệu D-69 (601), D-71 (603), D-72 (604, 605) xanh trong 31 test db |
| Parity ≤ 3% màn TIP đụng tới | Đạt hoặc có DV: DV-V4-601-1..3, DV-V4-603-1..6, DV-V4-604-1..2, DV-V4-605-1..2, DV-V4-606-1..5 (`ui-parity/deviations.md`); không mask, không nới ngưỡng |

## Lỗi lan

Không có lỗi lan: test:int và e2e behavior toàn bộ đều 0 failed.

## Mang sang P2

- grep `600000` affiliate → V4-602.
- P-69…72 (khối Gọi vốn) đo lại ở V4-610; P-81/82 sidebar còn chênh (DV-V4-601-1/2).
- Câu hỏi chờ owner: Q-V4-604-3 (goal phiên vs `GOAL-V4.md` mục 3), Q-V4-605-2 (badge), Q-V4-605-4 (AT-LK05).

Native HOLD: đã seed lại demo trên `opchub_dev` sau khi đo.
