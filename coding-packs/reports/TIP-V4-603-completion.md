# TIP-V4-603 — Vào nhóm ngay (D-71) — completion

- Nhánh: `feature/TIP-V4-603-group-join-instant` (xếp chồng trên `feature/TIP-V4-606-menu-perms`, PR #18 chưa merge)
- PR: [#19](https://github.com/duymt-dev/OPCHUB/pull/19) (base `feature/TIP-V4-606-menu-perms`)
- Commit:
  - `c6585ca1` TIP
  - `51fe083c` db + shared
  - `8711d090` server
  - `ee268a6a` Portal + Admin
  - `ce607561` e2e + parity
- REQ / D: REQ-506 · D-71 (thay phần duyệt của D-43, QT-05) · §27.1, UP-05, AD-04, F03

## Đã làm

- **DB**
  - Bỏ `GroupJoinMode` và `groups.join_mode`. Enum `group_member_status` chỉ còn `member | left | removed`, mặc định `member`.
  - Migration `20261023140000_v4_group_join_instant`:
    - `pending` của TV còn phí → `member`, `member_count` cộng tương ứng, outbox `group.joined`.
    - `pending` của TV chưa đóng phí hoặc đã hết hạn → xoá.
    - `rejected` / `cancelled` → `left`.
    - Bỏ index `group_members_pending`.
  - Đã chạy `migrate deploy` trên `opchub_test` và `opchub_dev`. Trên dev có 6 pending, đều là TK ma không có phí, nên bị xoá.
- **Server**
  - `POST /groups/:id/join`: vào `member` ngay, cộng thành viên, outbox `group.joined`, tất cả trong cùng transaction. Đã là thành viên → 409. Paywall giữ nguyên (402).
  - Rời nhóm là transition có điều kiện `member → left`. Chủ nhóm vẫn không được rời (D-43).
  - Đăng ký (NA-18): một INSERT…SELECT cho mọi nhóm đã chọn, cộng thành viên, ghi outbox `group.joined`.
  - Consumer `group.joined` gửi thông báo "Chào mừng bạn đến với {nhóm}!". Bất biến M1: mọi sự kiện đều có consumer.
  - Xoá `GET /groups/:id/requests`, `POST /groups/:id/requests/:userId/:decision`, `GET /admin/groups/requests`, cùng với sự kiện `group.join_requested`, `group.request_decided`, socket `member.request` và `ChatGroup.pendingRequests`. `api-contract.md` còn 213 endpoint.
- **Portal**
  - Cộng đồng: chỉ còn trạng thái "Đăng ký tham gia" / "Vào phòng chat" / "Rời nhóm". Nhãn luôn là "Công khai". Popup có giới thiệu "(không bắt buộc)" và nút "Tham gia ngay". Bỏ ô "chờ duyệt".
  - Chat: xem trước nhóm luôn có nút "Tham gia nhóm" (vẫn phải tick đồng ý NR-R02). Bỏ mục "Chờ duyệt vào nhóm" và số chờ trên rail.
  - Hồ sơ › Hoạt động: chỉ hiện nhóm đã tham gia.
  - Dọn khoá i18n ở cả 10 locale. Bỏ CSS chết.
- **Admin**
  - Form nhóm bỏ "Quyền tham gia".
  - Gợi ý ô Chủ nhóm đổi thành "Người quản lý nhóm, ghim tin và điều phối thảo luận" (Q-V4-603-2).
- **Seed / MSW**: bỏ `APPROVAL_GROUPS`, `JOIN_REQUESTS` và 6 TK ma q1…q6 vốn chỉ tồn tại để làm yêu cầu chờ.

## Test (số thật)

| Lệnh | Kết quả |
|---|---|
| `pnpm lint` | 8/8 task, 0 lỗi |
| `pnpm typecheck` | đạt |
| `pnpm test` | 6/6 task (shared 378, portal 320, admin 456+, server, ui) |
| `pnpm test:int` | db 6 file / 26 test. Server 1304/1306 ở lần chạy đầu, xem chi tiết dưới bảng |
| `pnpm depcheck` | không vi phạm (783 module) |
| `pnpm build` | 3/3 (MSW + `NEXT_PUBLIC_PORTAL_URL`) |
| e2e behavior (MSW) | 286 passed / 1 failed / 4 skipped (dev: 285/0/4), xem chi tiết dưới bảng |

- **db `test:int`**: gồm `migration-group-join` 3 ca, chạy SQL migration thật trên schema tạm ở `opchub_test`.
- **Server `test:int`**, hai ca hỏng ở lần chạy đầu:
  - `contract/coverage`: bảng contract còn 3 route đã xoá. Đã sửa bảng, chạy lại pass.
  - `bot-scheduler`: chạy lại pass (7/7). Không đụng code bot.
- **e2e behavior**: ca hỏng là `affiliate-frozen-clock`. Ca này hết thời gian ở bước đăng nhập Portal khi chờ heading Affiliate. Chạy lại riêng và chạy chung với `affiliate-screen` + `portal-shell` đều pass 4/4 lần. TIP không đụng code affiliate. Vẫn ghi là 1 failed.

## Parity (prototype v4, ≤ 3%, sha ee268a6a)

| Màn | 1440 | 390 |
|---|---|---|
| D-28 Drawer tạo nhóm | 0,09% ✅ | 0,25% ✅ |
| D-30 Drawer sửa nhóm | 0,15% ✅ | 0,48% ✅ |
| P-40 Chat · bảng Thành viên | 2,67% ✅ | 9,12% ❌ DV-V4-603-2 |
| P-23 Tham gia | 23,01% ❌ DV-V4-603-4 | 10,06% ❌ |
| P-26 / P-27 Cộng đồng | 42,7–43,2% ❌ DV-V4-603-3 | 65,0–65,1% ❌ |
| P-46 Xem trước nhóm | 4,77% ❌ DV-V4-603-5 | 15,11% ❌ |
| P-89 Hồ sơ | 1,02% ✅ | 7,38% ❌ DV-V4-601-3 |
| P-24, P-25, P-41 | unreachable (màn gỡ, DV-V4-603-1) | |

- Không nới ngưỡng, không mask.
- Lệch lớn ở P-23/P-26/P-27 là do màn Cộng đồng của prototype v4 có 90 nhóm (thêm "Nhóm ngành") và dải "Nghị quyết 86/NQ-CP". Hai thứ này chưa có D-xx hay TIP nào giao → Q-V4-603-4, chờ owner.
- P-40 @390 lệch vì prototype còn danh sách chờ duyệt mà D-71 đã bỏ.
- D-29 @390 3,97% là lệch có từ trước, không đo lại trong lượt này.

## Soát luật cứng

1. File: không file nào vượt trần. `ops-community.ts` 176 dòng, `group.service.ts` 90 dòng.
2. Không `any` / `@ts-ignore`.
3. depcheck sạch.
4. Không kiểm theo tên vai trò. Chủ nhóm xác định theo `group_role`.
5. Không có query trong vòng lặp. Đăng ký và migration đều chạy theo lô.
6. Không query theo từng người nhận. Thông báo chào chỉ gửi cho 1 người.
7. Transition có điều kiện `WHERE status = 'member'`.
8. Outbox `group.joined` ghi trong cùng transaction.
9. Không có tiền.
10. Không có thao tác Admin mới.
11. Không có dịch vụ ngoài.
12. Không có secret.
13. Test nằm ở file riêng.
14. Commit theo đường dẫn, `git status` sạch.

## Chưa làm / chuyển tiếp

- Nhóm ngành, dải NQ86, Admin "Loại nhóm / Ngành" (prototype v4) chưa có D-xx → Q-V4-603-4.
- P-46 lệch có từ trước, đo lại ở V4-615.
- Native HOLD: đã seed demo lại sau khi đo.
