# TIP-V4-622: Admin Cài đặt / Bot / Sự kiện / danh mục theo prototype v4 — D-89

## HEADER
- TIP-ID: TIP-V4-622
- Project: OPCHUB
- Module: Admin `features/{settings,bots,events}` · `packages/ui` (modal, thanh trên cùng) · `packages/shared` (MSW, schema TK quản trị) · `packages/db` (cột ảnh đại diện TK quản trị) · server `modules/admin-account` · e2e
- Priority: P1 (goal V4-UI, sau TIP-V4-621)
- Depends on: TIP-V4-621 (nhánh `feature/TIP-V4-621-overview-flow` chưa merge → xếp chồng)
- Estimated: L
- REQ / D: D-89, D-33, D-47, D-50, D-51, REQ-141, Q-V4-615-5, DV-V4-615-8 → 11
- **Files touched:**
  - `packages/ui/src/modal/modal.module.css` (modify): header / body / footer thắng CSS-in-JS antd.
  - `packages/ui/src/app-shell/topbar.module.css` (modify): nút ngôn ngữ viền như prototype.
  - Admin settings: `components/{settings-nav,category-form,categories-tab,admin-row,admin-create-drawer}.tsx` + css, `types.ts`, `messages/vi/settings.json`.
  - Admin bots: `components/{bot-tabs,bots-screen,auto-panel}.tsx`, `bots.module.css`, `emergency-bar.module.css`, `messages/vi/bots.json`; `mocks/{browser.ts,handlers/bot-runtime.ts}`.
  - Admin events: `components/{event-grid.tsx,event-grid.module.css,event-table.module.css}`.
  - `packages/shared/src/mock-data/domains/{admin-rbac,bot-execution,settings-log}.ts`, `api-domains/admin-rbac.ts`.
  - `packages/db/prisma/schema/admin.prisma`, `migrations/20261027150000_v4_admin_avatar/migration.sql` (create), `seed/demo/{admin,settings}.ts`.
  - Server `admin-account/{repositories/admin-user.repository,services/admin-accounts.service}.ts`, `test/admin-account/admin-accounts.int.spec.ts`.
  - e2e: `behavior/{admin-settings,i18n,reports,bot-emergency,admin-bots}.spec.ts`, `helpers/bot-emergency-scene.ts`, `parity/scenarios/admin-content.ts`.
  - Báo cáo: `coding-packs/reports/ui-parity/{results.*,deviations.md,questions.md}`, `coding-packs/reports/TIP-V4-622-completion.md`.
- **Parallel-safe with:** sequential — chuỗi V4-617 → 624.

## CONTEXT
- Prototype `docs/spec/index.html`: `aSettings` (7 mục, `stAdmins`, `adOpen`, `stCats` 32 mục + "Áp dụng cho"), `aBots` (Chế độ tự động 100%, `_simTick` 10 giây), `aEvents` (`aeCards` bấm ảnh bìa mở chi tiết), CSS mobile `[data-m="tbl"]`.
- Bảng > 3% trước TIP (TIP-V4-615): D-36 → D-41, D-42 → D-45, D-66 → D-75, D-74, D-80, D-82.

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md), [frontend/antd-ui](../standards/frontend/antd-ui.md)
- [database/query-indexing](../standards/database/query-indexing.md) — chỉ thêm cột, không đổi truy vấn.
- [backend/auth-rbac](../standards/backend/auth-rbac.md), [testing/testing](../standards/testing/testing.md)

## TASK
Đưa các màn Admin Cài đặt, Bot tương tác, Sự kiện, danh mục lĩnh vực về prototype v4 ở 1440 + 390; giữ nghiệp vụ D-47 (không mật khẩu trong mail), D-50 (bot không hàng chờ duyệt), REQ-141 (tắt khẩn cấp).

## SPECIFICATIONS
### Business Rules
1. Danh mục lĩnh vực 32 mục, phạm vi Dự án / Doanh nghiệp / Nhóm ngành mạng lưới.
2. Mục Cài đặt "Đăng nhập & bảo mật", "Ngôn ngữ" (D-33) ẩn ở ≤ 767px, vẫn vào bằng `?tab=`.
3. TK quản trị có ảnh đại diện (`avatar_url` null được, không đổi quyền).
4. Bot: nút khẩn cấp luôn hiện, không đè tab; MSW nhịp đầu sau 10 giây.
5. Sự kiện: bấm ảnh bìa / tiêu đề thẻ mở Chi tiết.

### Validation / Error Handling
- `avatarUrl` parse bằng `adminAccountRowSchema` (nullable, mặc định null).

## ACCEPTANCE CRITERIA
- Given Admin MSW When mở Bot @390 Then bấm được tab "Hội thoại" (thanh khẩn cấp không đè).
- Given CSDL test When `GET /admin/admins` Then mỗi dòng có `avatarUrl`.
- Parity D-36 → D-47, D-50, D-66 → D-75, D-87 ≤ 3% cả 2 khung, trừ DV có D-xx (D-41 @390 D-50/REQ-141; D-70 D-47).

## CONSTRAINTS
- DO NOT: bỏ nút tắt khẩn cấp, thêm hàng chờ duyệt bot, gửi mật khẩu tạm qua email, mask thêm, nới ngưỡng.
- REUSE: `Modal`, `UserAvatar`, `Tabs` của `@opchub/ui`.
- SKIP: Affiliate, Thành viên @390 (→ TIP-V4-623).

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng `Files touched`
- [x] AC pass (int `test/admin-account`; e2e bot / sự kiện / cài đặt; parity)
- [x] Phân quyền giữ permission key; migration mới không sửa migration cũ
- [x] Commit theo đường dẫn, `git status --short` sạch
