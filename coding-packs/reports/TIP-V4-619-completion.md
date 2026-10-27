# TIP-V4-619 — Cộng đồng 90 nhóm Portal + Admin theo prototype v4 (D-89) — completion

- Nhánh `feature/TIP-V4-619-community-90`, xếp chồng trên `feature/TIP-V4-618-shell-v4` (chưa merge).
- PR: base `feature/TIP-V4-618-shell-v4` — **chưa tạo được**: `gh` chưa đăng nhập trên máy này. Nhánh đã push; cần owner chạy `gh auth login` (hoặc tạo PR trên web).
- Commit:
  - `7de7655f` 56 Nhóm ngành thuộc nhóm tỉnh, tổng 90 nhóm (schema + migration, seed native + MSW, fixtures `IND`);
  - `9c6f8b0e` Admin: lọc loại nhóm / ngành, tạo Nhóm ngành (API `kind`, `industry`);
  - `00c33a84` Portal: ô "chờ duyệt", dải NQ86, xem trước chat mở form tham gia;
  - `ec4c493b` parity: tiêu đề bảng nhóm ẩn ở 390, thẻ "Loại nhóm" 1 cột ở 390, ô đồng ý như prototype;
  - `9a77cc81` e2e hộp gán nhóm chọn nhóm tỉnh theo tên đúng;
  - `4e250e41` báo cáo parity, deviations, questions, file TIP;
  - commit completion này — SHA ở `git log`.
- REQ / D: D-89, Q-V4-603-4 (đã làm); DV-V4-603-3/4/5, DV-V4-615-2, DV-V4-615-7, DV-V2-307-15 (đã sửa); giữ D-71, NR-R02.

## Đã làm

1. **Dữ liệu**: `groups.kind` (`province` / `industry`), `industry`, `parent_id`; CHECK hình dạng; unique partial index một Nhóm tỉnh chung / tỉnh và một Nhóm ngành / (nhóm cha, ngành). 56 Nhóm ngành `g1…g56` theo `IND` của prototype (tên "OPC <tỉnh> – <ngành>", số thành viên / tin nhắn theo công thức prototype), có phòng Chung. Seed native (`required` + demo reset giữ `^[cg][0-9]+$`) và MSW cùng nguồn `buildIndustryGroups`.
2. **API**: `GroupSummary` thêm `kind`, `industry`, `parentId`. `POST/PATCH /admin/groups` nhận `kind`, `industry`: Nhóm ngành gắn Nhóm tỉnh chung cùng tỉnh; thiếu ngành 400 `fields[industry]`; chưa có nhóm tỉnh / trùng ngành 409. Kiểm trùng một truy vấn theo `province`. Trần `groupIds` (đăng ký, khai báo, dự án) 34 → 90.
3. **Portal**: ô "chờ duyệt" (luôn 0 — D-71), dải "Nghị quyết 86/NQ-CP · 05/4/2026" (10 ngôn ngữ); thẻ xem trước nhóm ở chat như v4 (không ô đồng ý), "Tham gia nhóm" mở form tham gia ở Cộng đồng — ô đồng ý nội quy + phí vẫn bắt buộc (NR-R02); ô đồng ý vẽ như prototype (input thật ẩn cho bàn phím / trình đọc màn hình).
4. **Admin**: lọc "Tất cả loại / Nhóm tỉnh / Nhóm ngành" + "Tất cả ngành" (trên URL `kind`, `ind`; chọn ngành tự sang Nhóm ngành), cột nhóm ghi "Nhóm tỉnh chung" / "Nhóm ngành · …", drawer "Loại nhóm" + "Ngành" (tên tự điền), kiểm lỗi tại ô; không có "Quyền tham gia" (D-71).

## Parity (MSW, ngưỡng 3%, không mask thêm)

| Màn | 1440 | 390 |
|---|---|---|
| P-17 / P-18 / P-19 / P-20 | 0,31 / 0,18 / 0,27 / 0,27% | 0,43 / 0,33 / 0,43 / 0,37% |
| P-21 / P-22 | 0,03 / 0,30% | 0,14 / 1,30% |
| P-23 | 0,15% | 0,01% |
| P-26 / P-27 | 0,31 / 0,31% | 0,40 / 0,42% |
| P-46 / P-47 / P-48 | 0,14 / 0,79 / 0,31% | 0,44 / 2,30 / 0,63% |
| D-23 → D-27 | 0,08% | 0,06 – 0,69% |
| D-28 / D-29 / D-30 | 1,10 / 1,28 / 1,16% | 1,35 / 1,72 / 1,49% |
| D-31 / D-86 | 0,09 / 2,74% | 0,22 / 1,95% |

P-24, P-25 giữ `unreachable` (D-71). Ngoài phạm vi, còn > 3%: D-89 @1440 3,14% (hộp gán nhóm ở Thành viên → V4-623), D-37 6,82 / 6,96% (Bot · Persona → V4-622).

## Test (số thật)

- `pnpm turbo run lint typecheck test` (server, shared, portal, admin, ui, db): 17 / 17 task thành công. Shared 399 / 399, Admin 455 / 455 (unit).
- `pnpm depcheck`: 0 vi phạm (857 module).
- Build MSW Portal + Admin: thành công.
- Int: toàn bộ `apps/server test:int` 1384 / 1392 pass ở lần chạy khởi động trước khi sửa service — 8 lỗi đều thuộc community / uploads (đếm 34 nhóm, luật tạo nhóm); chạy lại trên code cuối `test/community test/uploads/media-refs test/contract/community` + test mới `admin-industry-groups`: 7 file / 28 test pass. `packages/db test:int`: 16 file / 51 pass.
- e2e behavior MSW (18 file: admin-bots, admin-events, admin-groups, admin-marketing, admin-members, admin-projects, bot-auto(-lifecycle), chat, community, declaration, membership, mobile-acceptance, moderation, popup-v4, portal-shell, profile, projects): 108 / 110, 2 lỗi admin-members (bộ chọn nhóm khớp cả nhóm ngành) → sửa `9a77cc81`, chạy lại admin-members 10 / 10.
- e2e:server, toàn bộ `test:int` sau cùng, toàn bộ e2e MSW: để TIP-V4-624.

## Chưa làm / ghi chú

- PR chưa tạo (gh chưa đăng nhập).
- Migration chưa áp vào `opchub_dev` đang chạy native (HOLD); áp + seed lại demo ở TIP-V4-624.
- Bản dịch dải NQ86 / "chờ duyệt" cho 9 ngôn ngữ khác do agent dịch, cần người bản ngữ rà.
