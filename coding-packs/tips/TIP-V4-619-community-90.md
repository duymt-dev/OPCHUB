# TIP-V4-619: Cộng đồng 90 nhóm (34 tỉnh + 56 ngành) Portal + Admin theo prototype v4 — D-89

## HEADER
- TIP-ID: TIP-V4-619
- Project: OPCHUB
- Module: `packages/db` (schema + seed nhóm ngành) · `packages/shared` (fixtures, schema, MSW) · server `modules/community` · Portal `features/{community,chat}` · Admin `features/groups` · e2e
- Priority: P1 (goal V4-UI, sau TIP-V4-618)
- Depends on: TIP-V4-618 (nhánh `feature/TIP-V4-618-shell-v4` chưa merge → xếp chồng)
- Estimated: L
- REQ / D: D-89, Q-V4-603-4, DV-V4-603-3/4/5, DV-V4-615-2, DV-V4-615-7, D-71 (giữ), NR-R02 (giữ), D-29
- **Files touched:**
  - `packages/db/prisma/schema/community.prisma` (modify), `packages/db/prisma/migrations/20261027090000_v4_industry_groups/migration.sql` (create): `group_kind`, `kind`, `industry`, `parent_id`, CHECK, unique một Nhóm tỉnh chung / tỉnh, một Nhóm ngành / tỉnh / ngành.
  - `packages/db/seed/{catalog,required}.ts`, `seed/demo/{community,reset}.ts`, `test/{schema,seed-demo}.int.spec.ts` (modify): seed 56 nhóm ngành + phòng Chung.
  - `packages/shared/src/fixtures/{prototype-seed.json,industry-groups.ts,index.ts,types.ts,fixtures.spec.ts}`: `IND` từ prototype, `buildIndustryGroups`.
  - `packages/shared/src/api/{index,auth,declaration}.ts`, `api-domains/{group-admin,project-portal}.ts`: `kind / industry / parentId` trên nhóm; upsert Admin nhận `kind`, `industry`; trần `groupIds` 34 → 90.
  - `packages/shared/src/mock-data/**` (community, ops-community, group-admin, index + spec): MSW 90 nhóm, luật Nhóm ngành như server.
  - `apps/server/src/modules/community/{domain/group.mapper,repositories/group-admin.repository,services/group-admin.service}.ts`, `apps/server/test/community/{groups,admin-industry-groups}.int.spec.ts`.
  - Portal: `features/community/components/{community-header,community-screen,join-modal}.tsx` + css, `features/chat/components/{group-preview,rail-with-preview}.tsx`, `messages/*/{community,chat}.json`.
  - Admin: `features/groups/{model,types}.ts`, `hooks/use-groups-params.ts`, `components/{groups-toolbar,group-table,group-form,group-form-fields,group-form-kind}.tsx` + css, `messages/vi/groups.json`, mocks spec.
  - e2e: `behavior/{community,chat,admin-groups}.spec.ts`.
  - Báo cáo: `coding-packs/reports/ui-parity/{results.*,deviations.md,questions.md}`, `coding-packs/reports/TIP-V4-619-completion.md`.
- **Parallel-safe with:** sequential — chuỗi V4-617 → 624.

## CONTEXT
- Prototype `docs/spec/index.html`: `IND` (ngành theo tỉnh) sinh nhóm `g1…` (`kind:'nganh'`, `parent`, `members=max(18, round(m*(0.22-j*0.05)))`, `weekly=round(m*0.4)`); Cộng đồng có dải "Nghị quyết 86/NQ-CP · 05/4/2026", ô "chờ duyệt"; Admin `grKinds`, `grInds`, form `gf.kinds` + `gf.industry`, `gfSave` (trùng Nhóm tỉnh chung → báo chọn Nhóm ngành).
- Bảng > 3% trước TIP: `results.md` (P-17 → P-27, P-46 → P-48, D-23 → D-31, D-86).

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md), [frontend/data-state](../standards/frontend/data-state.md) (lọc loại / ngành trên URL)
- [database/query-indexing](../standards/database/query-indexing.md) — unique partial index theo `kind`; kiểm trùng một truy vấn theo `province`.
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md), [testing/testing](../standards/testing/testing.md)

## TASK
Đưa Cộng đồng Portal + Admin về đúng prototype v4: 90 nhóm (34 Nhóm tỉnh chung + 56 Nhóm ngành thuộc nhóm tỉnh), dải NQ86, bộ lọc loại / ngành và form tạo Nhóm ngành ở Admin; dữ liệu native + MSW khớp seed prototype.

## SPECIFICATIONS
### Business Rules
1. Nhóm có `kind` = `province` (Nhóm tỉnh chung, một / tỉnh) hoặc `industry` (Nhóm ngành, có `industry` + `parent_id` = Nhóm tỉnh chung cùng tỉnh; một / tỉnh / ngành, không phân biệt hoa thường).
2. D-71 giữ: vào nhóm ngay; ô "chờ duyệt" luôn 0; Admin không có "Quyền tham gia".
3. NR-R02 giữ: tham gia cần đồng ý nội quy + phí không hoàn lại — xem trước ở chat mở form tham gia ở Cộng đồng.
4. Tên tự điền "OPC <tỉnh> – <ngành>" khi chọn Nhóm ngành.

### Validation / Error Handling
- `POST/PATCH /admin/groups`: `kind=industry` thiếu ngành → 400 `fields[industry]`; tỉnh chưa có Nhóm tỉnh chung → 409; trùng ngành cùng tỉnh → 409; Nhóm tỉnh chung trùng tỉnh → 409.

## ACCEPTANCE CRITERIA
- Given seed When `GET /groups?size=100` Then 34 nhóm `c*` (province) + 56 nhóm `g*` (industry), `g1` = "OPC Hà Nội – Công nghệ & AI", cha `c1`.
- Given Admin When tạo Nhóm ngành Hà Nội Then 201, `parentId=c1`; trùng ngành 409; thiếu ngành 400.
- Given Admin "Nhóm cộng đồng" When chọn ngành "Cà phê" Then chuyển "Nhóm ngành", 6 nhóm.
- Given chat xem trước nhóm chưa tham gia When "Tham gia nhóm" Then mở form tham gia có ô đồng ý.
- Parity P-17 → P-27, P-46 → P-48, D-23 → D-31, D-86 ≤ 3% ở 1440 + 390.

## CONSTRAINTS
- DO NOT: nới ngưỡng, mask thêm, sửa prototype, bỏ ô đồng ý phí (NR-R02), thêm duyệt vào nhóm (D-71).
- REUSE: `regionOfProvince`, `useUrlParams`, `FieldErrorOf`, `useJoinParam`.
- SKIP: D-37 (Bot → V4-622), D-89 hộp gán nhóm (→ V4-623).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`
- [ ] AC pass (int `groups`, `admin-industry-groups`; e2e `community`, `chat`, `admin-groups`; parity)
- [ ] `pnpm lint && pnpm typecheck && pnpm test`, `pnpm depcheck`, build MSW
- [ ] Migration có CHECK + unique partial index; FE ≤ 400 dòng
- [ ] Commit theo đường dẫn, báo SHA thật
