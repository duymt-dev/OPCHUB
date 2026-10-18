# TIP-V2-307: Registry parity + baseline theo prototype ver2 (ui-parity, SRS-3.6)

## HEADER
- TIP-ID: TIP-V2-307 · Project: OPCHUB · Module: e2e/parity + coding-packs/reports/ui-parity · Priority: P1 · Depends on: TIP-V2-204 (vai trò, chỉ xem, xem thử, đổi MK lần đầu), TIP-V2-301, 302, 303, 304, 305. Affiliate (TIP-V2-403/404) chưa xong thì để `unreachable` kèm lý do, TIP-V2-503 bật lại · Estimated: L (12h)
- **Files touched:**
  - `e2e/parity/scenarios/{auth,portal-shell,portal-chat,portal-events,portal-account,portal-community,admin-members,admin-groups,admin-content,admin-settings}.ts` (modify)
  - `e2e/parity/scenarios/admin-rbac.ts` (create: chỉ xem, xem thử, đổi MK lần đầu, sidebar theo vai trò) · `e2e/parity/scenarios/affiliate.ts` (create: Portal · Affiliate, Admin · Affiliate, chi tiết đại lý; `unreachable` tới khi 403/404 xong)
  - `e2e/parity/scenarios/admin.ts`, `e2e/parity/scenarios/portal.ts` (modify: gộp file mới) · `e2e/parity/registry.ts` (modify nếu cần thứ tự)
  - `e2e/parity/steps.ts` (modify: tài khoản Kế toán / Giảng viên / Biên tập nội dung, TK quản trị mật khẩu tạm; helper `asRole`) · `e2e/parity/types.ts` (modify: `Viewport` thêm `1366` cho AT-LK04) · `e2e/parity/parity.spec.ts` (modify: `HEIGHT[1366]=768`) · `e2e/parity/stabilize.ts` (modify nếu số liệu realtime 305 cần đóng băng)
  - `coding-packs/reports/ui-parity/screens.md` (modify: danh mục trạng thái ver2) · `deviations.md` (**reset** cho ver2) · `questions.md` (modify: thêm mục ver2) · `results.md`, `results.json` (regenerate) · `coding-packs/reports/ui-parity/server/{results.md,results.json}` (regenerate)
  - `apps/portal/src/mocks/**`, `apps/admin/src/mocks/**`, `packages/shared/src/mock-data/**` (modify chỉ khi dữ liệu seed lệch prototype ver2, VD tên vai trò "Giảng viên", `SVC_SEED`/`REQ_SEED`)
- **Parallel-safe with:** TIP-V2-401, 402 (không chung file). `sequential: chạy cuối P3, sau 204 + 301–305`.
- **Phase / nhánh:** V2-P3, `feature/V2-P3-v2-features`

## CONTEXT
- Chuẩn: [ui-parity](../standards/frontend/ui-parity.md) (ngưỡng ≤ 3%, deviation có lý do, giả lập chỉ trong MSW). Bộ máy hiện có: `e2e/parity/` (205 trạng thái A/P/D, `PARITY_MODE=proto-only` chụp ảnh gốc từ `pnpm --filter @opchub/e2e proto` cổng 4800, `E2E_TARGET=server` ghi riêng `ui-parity/server/`). Baseline `e2e/.parity-out/` không commit (`.gitignore`).
- Prototype ver2 (`docs/spec/index.html`) so bản cũ (`git show 9e3720e^:docs/spec/index.html`):
  - **Màn mới** (`data-screen-label`): `Portal · Affiliate`, `Portal · Affiliate · Lịch sử nhận tiền`, `Admin · Affiliate`, `Admin · Affiliate · Chi tiết đại lý`.
  - **Trạng thái mới**: popup Gói dịch vụ V4 (hero, giá 50.000đ, 6 dịch vụ "Tư vấn →"); hộp CK có "Điều kiện thanh toán"; ô đồng ý "không hoàn lại" ở đăng ký và tham gia nhóm; ô "Mã giới thiệu (không bắt buộc)" + "✓ Được giới thiệu bởi …" + "Mã giới thiệu không tồn tại"; sự kiện: form "Link Google Meet" + "Tạo link Meet", khối "Sắp diễn ra" + "Tiếp theo", drawer chi tiết "Đã check-in x/y", Portal "Link phòng họp … sau khi bạn đăng ký" / "Vào phòng họp"; form nhóm "Chủ đề thảo luận · chỉ quản trị viên tạo" + "+ Thêm chủ đề"; Chat "CHỦ ĐỀ THẢO LUẬN do Admin tạo"; Gán vào nhóm có select Thành viên/Giảng viên; Cài đặt: "+ Tạo tài khoản quản trị" (modal), Vai trò & phân quyền 25 quyền × 5 vai trò, "Xem thử menu theo vai trò" / "Thoát xem thử", dải "Chế độ chỉ xem — vai trò …", màn "Đổi mật khẩu lần đầu"; cột "Vai trò khi đăng ký" (chỉ đọc) ở Thành viên.
  - **Bỏ**: "Tạo chủ đề mới" / "Tạo chủ đề thảo luận" (Portal), "Gửi lời mời" + "Chờ chấp nhận" (TK quản trị), "Quyền hệ thống" / "Thay đổi vai trò thành viên" (Thành viên), "Điều phối viên" (đổi thành Giảng viên), "Chương trình & dịch vụ khác" + 6 dịch vụ cũ.
- Kịch bản bị ảnh hưởng (id hiện có): `P-30…P-33` (tạo chủ đề), `P-79…P-88` (popup, CK), `P-49…P-54` (sự kiện), `P-17/P-25` (tham gia nhóm), `A-1x/A-2x` (form đăng ký), `D-12` (gán nhóm), `D-15` (đổi quyền hệ thống), `D-28…D-30` (form nhóm), `D-42…D-50` (sự kiện), `D-72` (vai trò), `D-73/D-74` (TK quản trị), `D-01` (Tổng quan số liệu), `P-01…P-06` (Dashboard).

## APPLICABLE STANDARDS
[ui-parity](../standards/frontend/ui-parity.md) · [testing](../standards/testing/testing.md) · [antd-ui](../standards/frontend/antd-ui.md)

## TASK
Cập nhật bộ kịch bản parity theo prototype ver2: thêm trạng thái mới, sửa chuỗi thao tác cho màn đã đổi, gỡ kịch bản của màn đã bỏ. Chụp lại toàn bộ baseline từ prototype mới, đo lại ở cả MSW và server. Mở `deviations.md` mới cho ver2, chỉ giữ những lệch còn đúng và có lý do.

## SPECIFICATIONS
### Business Rules
1. **Gỡ** (không giữ `unreachable`): P-30 (form tạo chủ đề), P-31/P-32 nếu chỉ phục vụ tạo chủ đề, D-15 (đổi quyền hệ thống trên thành viên), D-74 (Gửi lời mời). Ghi id đã gỡ vào `screens.md` mục "Bỏ ở ver2" kèm lý do (D-61, RB-R01, RB-R02). Không tái dùng id cũ cho trạng thái mới.
2. **Sửa**: chuỗi thao tác cho các id ở CONTEXT theo copy/nút mới. VD P-79 chờ "Dịch vụ & chương trình khác"; `AI_COURSE_IDX` thay bằng chọn theo tên dịch vụ ("Đào tạo & Ươm mầm OPC"); D-12 chọn "Giảng viên"; D-73 chờ "+ Tạo tài khoản quản trị".
3. **Thêm** (id tiếp số cuối mỗi nhóm, ghi `screens.md`): Portal: popup V4 @1366 (AT-LK04, `viewports: [1366, 1440, 390]`), hộp CK có Điều kiện thanh toán, form đăng ký có mã giới thiệu (hợp lệ / không tồn tại), tham gia nhóm có câu không hoàn lại, chi tiết sự kiện chưa đăng ký / đã đăng ký (link Meet), Chat "do Admin tạo". Admin: khối Sắp diễn ra, drawer chi tiết sự kiện + check-in x/y, form sự kiện có Link Meet, form nhóm "+ Thêm chủ đề", modal Tạo TK quản trị, Vai trò & phân quyền 25 quyền, xem thử vai trò, dải chỉ xem (Giảng viên mở Thành viên — AT-RB03), sidebar Kế toán (AT-RB02), màn Đổi mật khẩu lần đầu (AT-SEC01). Affiliate: 4 màn mới, đặt `unreachable: 'chờ TIP-V2-403/404'` nếu chưa có route.
4. **Tài khoản** (`steps.ts`): thêm vai trò quản trị theo seed TIP-V2-201 (Kế toán, Giảng viên, Biên tập nội dung, TK mật khẩu tạm). Prototype đăng nhập bằng thẻ demo hoặc xem thử; app dùng TK seed. Lệch cách vào màn thì ghi DV.
5. **Số liệu động** (TIP-V2-305): Dashboard/Tổng quan/màn đăng nhập dùng số thật nên không khớp số của prototype. `mask` vùng số (selector cụ thể) thay vì nới ngưỡng, ghi DV. Không thêm nhánh `onServer` làm yếu assertion; khác biệt dữ liệu server xử lý bằng seed `seed:demo` giống MSW (D-63).
6. **Baseline**: `PARITY_MODE=proto-only pnpm parity` trên prototype ver2 → `e2e/.parity-out/proto/` (không commit). Sau đó `pnpm parity` (MSW) và `E2E_TARGET=server pnpm parity` (seed:demo + flush:dev-cache trước). Mọi trạng thái ≤ 3% hoặc có DV được duyệt.
7. **deviations.md reset**: tạo bản ver2. Đầu file ghi "Baseline: prototype v4 Ant / SRS-3.6, ngày …". Duyệt lại từng DV cũ (DV-01…DV-15, DV-G…): còn đúng thì chép lại (giữ id), hết lý do thì bỏ (VD DV-05 "số tĩnh" đã có số thật, DV-G2c-2 tệp mẫu đã có TIP-V2-111). Thêm DV mới cho ver2 (VD "Tạo link Meet mở meet.google.com/new thay vì sinh mã giả" D-59; "Sắp diễn ra tính theo giờ VN"; Affiliate chờ). Bản cũ chuyển sang mục "Lưu trữ B1–B6" cuối file hoặc dựa vào git history; không giữ song song hai bảng hiệu lực.
8. `results.md` có cột trạng thái và SHA của lần đo. Ghi tổng: số trạng thái, đạt, DV, unreachable.

## ACCEPTANCE CRITERIA
- `selectScenarios()` không còn id nào thao tác "Tạo chủ đề mới", "Gửi lời mời", "Đổi quyền" (grep kịch bản = 0) (D-61, RB-R01/R02).
- Popup Gói dịch vụ @1366×768: diff ≤ 3% và không thanh cuộn (AT-LK04, REQ-391).
- Mọi trạng thái reachable đạt ≤ 3% ở MSW **và** server, hoặc có DV trong `deviations.md` ver2 (ui-parity).
- `screens.md` liệt kê id mới, id đã gỡ, id `unreachable` kèm lý do; số trạng thái khớp `results.md`.
- `deviations.md` chỉ có một bảng hiệu lực cho ver2; mỗi dòng có Prototype / App / Lý do (D-xx hoặc REQ).

## TESTS BẮT BUỘC
- `pnpm --filter @opchub/e2e lint` sạch.
- `PARITY_MODE=proto-only pnpm parity` chạy hết, không lỗi bước trên prototype ver2.
- `pnpm parity` (MSW) và `E2E_TARGET=server pnpm parity`: bảng kết quả commit vào `coding-packs/reports/ui-parity/` và `…/server/`.
- `pnpm e2e` (behavior) vẫn xanh ở cả msw và server sau khi đổi mock.

## CONSTRAINTS
- DO NOT: nới `MAX_DIFF_PCT`; commit ảnh `.parity-out`; sửa code màn để "ăn ảnh" nếu làm sai nghiệp vụ (ghi DV thay vào đó); thêm nhánh `onServer`.
- REUSE: `steps.ts` (`tap`, `press`, `type`, `waitText`, `nav`), `stabilize.ts`, `compare.ts`, `report.ts`.
- SKIP: sửa lỗi UI tìm thấy khi đo (ghi `questions.md` / báo PM, sửa ở TIP gốc); Affiliate chưa có route (TIP-V2-503 bật lại).

## ⚠️ BUILDER-CHECKLIST
- [ ] ui-parity ≤ 3%, mỗi deviation có lý do; luật 13 (test ở file riêng); D-63 (msw + server, không làm yếu assertion).
- [ ] Không commit `.parity-out/`; báo cáo đặt đúng `coding-packs/reports/ui-parity/` (+ `server/`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test` + parity MSW + server + `pnpm e2e`.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-307-DONE <sha> — <N> trạng thái đạt / <M> DV / <K> unreachable`, viết `coding-packs/reports/TIP-V2-307-completion.md`.
