# TIP-V4-620: Dự án OPC Portal + Admin theo prototype v4 — D-89

## HEADER
- TIP-ID: TIP-V4-620
- Project: OPCHUB
- Module: `packages/db` (cột dự án v4) · `packages/shared` (schema, seed v4, MSW) · server `modules/project` · Portal `features/projects` · Admin `features/projects` · e2e
- Priority: P1 (goal V4-UI, sau TIP-V4-619)
- Depends on: TIP-V4-619 (nhánh `feature/TIP-V4-619-community-90` chưa merge → xếp chồng)
- Estimated: XL
- REQ / D: D-89, Q-V4-615-2, DV-V4-615-3, DV-V4-615-5, DV-V2-307-8, DV-V2-109-1, DV-V4-610-2/3, BUG-016 (giữ), BUG-038 (giữ), D-31 (giữ)
- **Files touched:**
  - `packages/db/prisma/schema/project.prisma` (modify); migration `20261027120000_v4_project_explore`, `20261027130000_v4_project_milestones` (create): `audience`, `needs`, `view_count`, `contact_address`, `highlights`, `gallery`, `milestones` + CHECK + index `projects_published_views`.
  - `packages/db/seed/**` (dự án demo p11–p15, 32 nhóm ngành, highlights / gallery / milestones), `packages/db/test/seed-demo.int.spec.ts`.
  - `packages/shared/src/api-domains/project-portal.ts` + spec, `enums`, `fixtures`, `mock-data/domains/{project-store,ops-project-portal,project-revision,project-v4-seed}.ts`, `mock-data/index.ts` + spec.
  - `apps/server/src/modules/project/{domain/project.mapper,repositories/project.repository,repositories/project-write.repository,services/project-read.service,services/project-write.service}.ts` + category-admin, `apps/server/test/project/projects.int.spec.ts`.
  - Portal: `features/projects/{explore-model.ts(+spec),types.ts,api.ts,hooks/use-url-params.ts}`, `components/{explore-screen,explore-hero,explore-cats,explore-side,explore-results,project-card,form-basic,form-contact,detail-contact}.tsx` + css, `messages/*/projects.json`.
  - Admin: `features/projects/{types.ts,hooks/use-projects-params.ts,components/review-body.tsx,components/project-table.module.css}`, `messages/vi/projects.json`, mocks spec.
  - e2e: `behavior/{projects,fundraising,admin-projects}.spec.ts`, `parity/scenarios/{portal-projects,admin-content}.ts`.
  - Báo cáo: `coding-packs/reports/ui-parity/{results.*,deviations.md,questions.md}`, `coding-packs/reports/TIP-V4-620-completion.md`.
- **Parallel-safe with:** sequential — chuỗi V4-617 → 624.

## CONTEXT
- Prototype `docs/spec/index.html`: `projPage` (hero, `pjStatsH`, lưới ngành, cột lọc `who / provs / devs / needs`, `SMAP` 5 giai đoạn, `NEEDS`, sắp xếp `view`), `EX` + 15 dự án, chi tiết (`pj.highlights`, `galleryEl`, `updates`), Admin `vt_prj` + `rvTab` mặc định `live`.
- Bảng > 3% trước TIP: `TIP-V4-615-completion.md` (P-55 → P-76, D-51 → D-57).

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md), [frontend/data-state](../standards/frontend/data-state.md) (bộ lọc trên URL)
- [database/query-indexing](../standards/database/query-indexing.md) — index `(view_count DESC, id) WHERE status='published' AND deleted_at IS NULL`; thống kê bằng `groupBy` / `aggregate`, không query trong vòng lặp.
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md), [testing/testing](../standards/testing/testing.md)

## TASK
Đưa trang Dự án OPC (khám phá, chi tiết, form) và Admin › Dự án về đúng prototype v4; thiếu dữ liệu thì thêm cột + API; seed native + MSW khớp 15 dự án prototype.

## SPECIFICATIONS
### Business Rules
1. Đối tượng (`audience`): student / personal / organization / business; giai đoạn 5 mức (thêm `developing`); nhu cầu kết nối (`needs`): customers / partners / investors / experts / pilot.
2. Số hero: dự án công bố; đơn vị tham gia = số chủ dự án khác nhau; kết nối = góp ý + 3 × số dự án (công thức prototype, Q-V4-620-1).
3. Lượt xem tăng khi người xem không phải chủ dự án; sắp xếp "Nhiều lượt xem".
4. Huy hiệu "Nổi bật" cho 2 thẻ đầu khi trang 1, sắp xếp mới nhất, chưa lọc; còn lại hiện nhu cầu đầu tiên.
5. Liên hệ: chỉ kênh chủ dự án tự công khai (BUG-016), thêm Địa chỉ. Điểm nổi bật / hình ảnh / mốc chỉ hiện khi có dữ liệu (BUG-038).
6. Admin mở tab "Đang hiển thị" mặc định; thứ tự tab live, pending, hidden, changes, rejected, draft.

### Validation / Error Handling
- `GET /projects`: `audience`, `stage` (nhiều), `needs`, `province`, `sort` ngoài tập → 400.
- `highlights` ≤ 3 mục, `gallery` ≤ 3, `milestones` ≤ 20 (zod + CHECK `jsonb_typeof = 'array'`).

## ACCEPTANCE CRITERIA
- Given seed When `GET /projects` Then 11 dự án công bố; lọc MVP + Sinh viên → 2.
- Given Portal Dự án When chọn "Có mô hình thử nghiệm" + "Nhiều lượt xem" Then "4 dự án".
- Given chi tiết SoloBooks Then "Vấn đề / Giải pháp / Thị trường", 3 ảnh, 3 mốc + "Xuất bản trên OPC Hub" cuối.
- Given Admin › Dự án Then tab "Đang hiển thị" chọn sẵn, "Hiển thị 1–10 / 11 dự án".
- Parity P-55 → P-68, P-73 → P-78, P-103, D-51 → D-57, D-92 ≤ 3% ở 1440 + 390.

## CONSTRAINTS
- DO NOT: nới ngưỡng, mask thêm, sửa prototype, bịa nội dung cho dự án không có dữ liệu, đổi mã GV (D-31).
- REUSE: `useUrlParams`, `ProjectTable`, `useFollow`, handler MSW sẵn có.
- SKIP: form nhập highlights / gallery / milestones (Q-V4-620-2); P-69 → P-72 (prototype lỗi lồng thẻ).

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng `Files touched`
- [x] AC pass (int `test/project`, `test/contract`; e2e `projects`, `fundraising`, `admin-projects`; parity)
- [x] Không sửa migration đã áp — thêm migration mới cho `milestones`
- [x] Commit theo đường dẫn, `git status --short` sạch
