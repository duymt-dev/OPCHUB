# TIP-V4-618 — Shell, avatar, Dashboard, Chat, Hồ sơ theo prototype v4 (D-89) — completion

- Nhánh `feature/TIP-V4-618-shell-v4`, xếp chồng trên `feature/TIP-V4-617-auth-v4` (PR #34 chưa merge).
- PR: base `feature/TIP-V4-617-auth-v4` — **chưa tạo được**: `gh` chưa đăng nhập trên máy này. Nhánh đã push; cần owner chạy `gh auth login` (hoặc tạo PR trên web).
- Commit:
  - `23395bc5` Dashboard v4 (lời chào + "Hướng dẫn bắt đầu"), bỏ khối LIVE ở Portal;
  - `c25770f2` avatar người đang đăng nhập = chữ viết tắt #1677FF (`MeAvatar`);
  - `bd798ad9` API `GET /me/membership/periods` + MSW (phí m1 tính từ ngày tham gia như `prBill`);
  - `ed37de9e` Hồ sơ v4: tab "Gói & thanh toán", thẻ 2 số, liên kết chỉ Google;
  - `979cea33` Chat: seed phòng như v4, avatar tin của tôi, giữ cuối danh sách khi tải lại;
  - `a839db6a` tin thành viên bị ẩn giữ ghim / cảm xúc / "Đã ghim" (không lộ nội dung);
  - `23eccac5` báo cáo parity, deviations, questions, file TIP;
  - commit completion này — SHA ở `git log`.
- REQ / D: D-89, Q-V4-615-3, Q-V4-612-3 (đã sửa), DV-V4-615-4, DV-V4-612-1 (đã sửa); giữ D-47, D-71, D-77, REQ-141.

## Đã làm

1. **Avatar** (`packages/ui/src/user-avatar/me-avatar.tsx`): ảnh nếu có, không thì chữ viết tắt theo `ini()` của prototype (chữ đầu từ đầu + từ cuối) nền #1677FF, cỡ chữ 0,36 × size. Dùng ở topbar, menu người dùng, thẻ Hồ sơ (96), tin của tôi trong chat (36).
2. **Dashboard**: chỉ lời chào + "Hướng dẫn bắt đầu"; xoá component / hook / model LIVE ở Portal. `GET /dashboard/live` giữ ở server.
3. **Hồ sơ**:
   - thẻ trái 2 số (Nhóm, Sự kiện), bỏ "Dự án";
   - tab mới "Gói & thanh toán": gói theo loại TK (D-68), trạng thái phí từ phiên, giá tháng / năm, "Thanh toán" mở Bảng giá khi chưa kích hoạt; "Lịch sử thanh toán" = kỳ phí + Gói Gọi vốn có mã CK; mã CK là mã thật (BR-04 / D-41);
   - "Tài khoản liên kết" chỉ Google (`LOGIN_SSO_IDS`); khoá huỷ liên kết cuối (BUG-030) tính trên liên kết còn hiển thị.
4. **API mới** `GET /me/membership/periods` (membership-fee): kỳ phí của tôi, mới nhất trước, tối đa 50, đọc theo index `(user_id, ends_at DESC)`, chỉ select cột cần; `@SkipMembershipFee`; schema `myFeePeriodsSchema`.
5. **Chat**:
   - tin của 4 ca kiểm duyệt lịch sử gỡ khỏi phòng (`deleted_at` ở seed native; MSW chỉ giữ liên kết ca → tin); MSW bỏ lịch sử tin bot seed (native vẫn chỉ seed khi `--bot-history`);
   - danh sách tin giữ ở cuối khi phòng tải lại sau gửi / báo cáo (`use-stick-to-bottom`), mở phòng lần đầu vẫn đứng ở đầu như prototype;
   - tin thành viên bị ẩn giữ ghim (câu "Tin nhắn đã bị ẩn…" trên thanh ghim), cảm xúc và nhãn "Đã ghim"; không thả thêm cảm xúc (server 409, nút bị khoá). Tin bot ẩn xoá hết như REQ-141.
6. **i18n**: `profile.tabs.pay` + `profile.pay.*` cho 10 ngôn ngữ Portal; `dashboard.json` rút còn `page`.

## Parity (MSW, ngưỡng 3%, không mask thêm)

| Màn | 1440 | 390 |
|---|---|---|
| P-01 Dashboard | 0,02% | 0,00% |
| P-07 | 0,03% | 0,03% |
| P-28 | 0,54% | 1,23% |
| P-29 | 0,16% | — |
| P-30 | 0,14% | 0,56% |
| P-34 | 0,80% | 2,57% |
| P-35 | 0,17% | 0,60% |
| P-36 | 0,54% | 1,36% |
| P-37 / P-38 | 0,41% | 1,19% |
| P-39 | 0,35% | 1,06% |
| P-42 / P-43 | 0,41% | — |
| P-44 | 0,21% | 0,46% |
| P-45 / P-121 | 1,25% | 2,98% |
| P-89 / P-90 | 0,07% | 0,11% |
| P-91 | 0,73% | 1,74% |
| P-92 | 0,03% | 0,33% |
| P-93 | 0,04% | 0,15% |
| P-94 | 0,04% | 0,27% |

Còn > 3% trong phạm vi TIP, **chờ owner chốt** (nghiệp vụ bảo mật / quyền giữ D-xx — không tự đổi, không ghi `unreachable`):

- P-05 mail chào mừng 4,52 / 4,71% — prototype hiện "Mật khẩu tạm"; D-47 cấm gửi mật khẩu qua email (Q-V4-618-1, DV-V4-618-1).
- P-40 @390 4,31% — prototype còn "Chờ duyệt vào nhóm" + nhãn "Điều phối"; D-71 bỏ duyệt, D-56 "Giảng viên" (Q-V4-618-2, DV-V4-618-2).

Thuộc TIP sau: P-17 → P-27, P-46 → P-48 (Cộng đồng 90 nhóm → V4-619); P-55 → P-76, P-104 (→ V4-620); P-81, P-82, P-105 (→ V4-623). Lần đo `PARITY_IDS='P-*'`: 125 đạt / 62 chưa đạt (toàn bộ 62 thuộc các nhóm trên + P-05, P-40).

## Test (số thật)

- `pnpm turbo run lint typecheck test` (server, shared, portal, admin, ui, db): 17/17 task thành công (lint chỉ cảnh báo cũ, 0 lỗi).
- `pnpm depcheck`: 0 vi phạm (853 module).
- Build MSW Portal + Admin: thành công.
- Unit mới / sửa: `profile/billing.spec.ts` (2), `report-actions.spec.ts` (+1 ghim tin ẩn, viết lại 2 ca seed), `dashboard-threads.spec.ts`, `inbox.spec.ts`, `portal/src/mocks/dashboard-bot-handlers.spec.ts` (dựng lịch sử bot bằng chạy kịch bản thật). Shared 397 / 397, Portal 394 / 394.
- Int mới: `test/membership-fee/fee-periods.int.spec.ts` (2), `test/moderation/hidden-pin.int.spec.ts` (1). Lần chạy `test/moderation test/chat test/bot`: 25 file / 116 test pass; `test/membership-fee`: pass; `packages/db` `seed-demo` + `bot-demo-scenario`: 10 / 10.
- e2e behavior MSW: `profile, chat, moderation, portal-shell, mobile-acceptance, bot-auto-lifecycle, bot-auto, admin-members, membership, popup-v4`: 51 / 51; chạy lại sau sửa ghim `chat, moderation, bot-auto, bot-auto-lifecycle, profile`: 24 / 24.
- e2e:server, toàn bộ `test:int`, toàn bộ e2e MSW: để TIP-V4-624.

## Chưa làm / ghi chú

- PR chưa tạo (gh chưa đăng nhập).
- `GET /dashboard/live` không còn FE dùng; giữ API.
- Không động tới API / socket / worker đang chạy (native HOLD); demo DB chưa seed lại (TIP-V4-624).
