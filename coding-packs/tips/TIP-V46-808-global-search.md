# TIP-V46-808: Tìm kiếm chung ở topbar Portal / Admin (BR-491)

## HEADER

- TIP-ID: TIP-V46-808
- Project: OPCHUB
- Module: search (mới, gom kết quả), local-business / project / community / account (mỗi domain một hàm tìm trên bảng của mình), packages/ui (ô tìm + dropdown), shell Portal / Admin
- Priority: P2
- Depends on: none về nghiệp vụ; chạy sau 807 theo thứ tự GOAL (`dev` `8543728d`)
- Estimated: M
- REQ / D: REQ-625 · BR-491, TC-491 · D-89 / D-93 (prototype thắng), D-95 (nút / hành vi prototype làm theo nghiệp vụ), D-65 (Portal 10 bộ ngôn ngữ), D-134 (parity tham khảo) · **Q-V46-808-1 → 5** (cuối file, phương án mặc định chờ owner chốt)
- **Files touched:**
  - DB
    - `packages/db/prisma/migrations/20261111090000_v46_global_search/{migration,down}.sql` (create): 3 index GIN trigram biểu thức (SPEC 9)
  - Shared
    - `packages/shared/src/api-domains/search.ts` (create): `globalSearchQuerySchema`, `searchKindSchema` (`store | need | project | group | member`), `searchHitSchema`, `globalSearchResultSchema`; `api-domains/index.ts` (modify: 1 dòng)
    - `packages/shared/src/mock-data/domains/search.ts` (create): tìm trên kho giả cùng luật; `mock-data/domains/index.ts` (modify: 1 dòng)
  - Server — mỗi domain tìm trên **bảng của mình**, export qua `index.ts` (ranh giới `nestjs-modules.md`)
    - `apps/server/src/modules/local-business/repositories/{store-search,need-search}.query.ts` (create), `services/local-business-search.service.ts` (create), `local-business.module.ts` (modify: provider + export), `index.ts` (modify: 1 dòng)
    - `apps/server/src/modules/project/repositories/project-search.query.ts` (create), `services/project-search.service.ts` (create), `project-core.module.ts` (modify), `index.ts` (modify)
    - `apps/server/src/modules/community/repositories/group-search.query.ts` (create), `services/group-search.service.ts` (create), `community-core.module.ts` (modify), `index.ts` (modify)
    - `apps/server/src/modules/account/services/member-search.service.ts` (create, dùng lại `member-search.query.ts`), `account.module.ts` (modify), `index.ts` (modify)
    - `apps/server/src/modules/search/{search.module.ts,search.service.ts,search.controller.ts,admin-search.controller.ts,index.ts}` (create)
    - `apps/server/src/api/api-app.module.ts` (modify: 1 import)
  - UI dùng chung
    - `packages/ui/src/global-search/{global-search.tsx,global-search.module.css,types.ts,index.ts}` (create): ô tìm + dropdown theo prototype, không gọi API (nhận `groups`, `onQuery`, `onPick`)
    - `packages/ui/src/index.ts` (modify: 1 dòng)
  - Portal
    - `apps/portal/src/features/shell/components/portal-search.tsx` (create), `hooks/use-global-search.ts` (create), `api.ts` (modify: `fetchGlobalSearch`), `components/portal-shell.tsx` (modify: bỏ `executePortalSearch`, truyền `search={<PortalSearch />}`)
    - `apps/portal/messages/{vi,en,zh,id,th,ms,fil,km,lo,my}/common.json` (modify: khối `shell.globalSearch`)
    - `apps/portal/src/mocks/handlers/shell.ts` (modify: `GET /v1/search`)
  - Admin
    - `apps/admin/src/features/shell/components/admin-search.tsx` (create), `hooks/use-global-search.ts` (create), `api.ts` (modify), `components/admin-shell.tsx` (modify: bỏ `executeAdminSearch`, truyền `search`)
    - `apps/admin/messages/vi/common.json` (modify: khối `shell.globalSearch`)
    - `apps/admin/src/mocks/handlers/shell.ts` (modify: `GET /v1/admin/search`)
  - Test
    - `packages/shared/src/api-domains/search.spec.ts`, `packages/shared/src/mock-data/domains/search.spec.ts` (create)
    - `apps/server/test/search/global-search.int.spec.ts`, `apps/server/test/search/global-search-plan.int.spec.ts` (create)
    - `packages/ui/src/global-search/global-search.spec.tsx` (create)
    - `e2e/behavior/global-search.spec.ts` (create); `e2e/behavior/stores.spec.ts` (modify: chỉ thu hẹp locator `getByRole('search')` về ô tìm của màn Gian hàng, giữ nguyên assertion)
    - `e2e/parity/scenarios/portal-shell.ts` (modify: `P-V46-SEARCH`), `e2e/parity/scenarios/admin-members.ts` (modify: `D-V46-SEARCH`)
  - Tài liệu
    - `coding-packs/reports/V4.6-progress.md` (dòng #8), `coding-packs/reports/ui-parity/{screens,questions,results}.md` + `results.json`, `coding-packs/reports/TIP-V46-808-completion.md`, `coding-packs/reports/TIP-V46-808-query-plans.md` (create), `coding-packs/standards/global/domain-glossary.md` ("Tìm kiếm chung")
- **Parallel-safe with:** sequential.
  - Chia `apps/{portal,admin}/src/features/shell/**`, `mocks/handlers/shell.ts` với V46-807 (đã merge; Admin `shell.ts` có handler chuyển đổi).
  - Chia `modules/local-business/**` (need / store) với V46-809 (gợi ý nhu cầu) và V46-810 (trang công khai gian hàng) → 809, 810 chạy sau.
  - Chia `apps/portal/messages/*/common.json` với mọi TIP Portal → chỉ thêm khóa.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-808-global-search` tách từ `dev` `8543728d`.
- **DB:** 801 → 807 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). Builder hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed. Không reset DB native, không tắt tiến trình HOLD.
- Delta `coding-packs/audit/SPEC-V4.6-DELTA.md` **P2**: topbar Portal + Admin có ô **tìm kiếm chung** (BR-491): Gian hàng / Nhu cầu / Dự án / Nhóm (+ Thành viên ở Admin), 4 kết quả / nhóm, Enter / Esc; code hiện tại là ô tìm cục bộ (`602e7c5e`).
- Đặc tả §33.4:
  - BR-491: ô tìm kiếm trên thanh trên cùng. Từ 2 ký tự hiện kết quả theo nhóm: Gian hàng, Nhu cầu địa phương, Dự án OPC, Nhóm cộng đồng; Admin thêm Thành viên. Tối đa 4 kết quả / nhóm. Enter mở kết quả đầu, Esc đóng. Ẩn trên điện thoại.
  - TC-491: gõ "cà phê" → có nhóm Gian hàng và Nhu cầu; bấm mở đúng trang.
- Prototype `docs/spec/index.html` v4.6:
  - Markup topbar dòng 357 → 372 (`data-m="search"` dòng 363).
  - Logic `_ops().gs` dòng 6512 → 6521.
  - Ẩn ở `@media (max-width:1023px)` dòng 28 / 36.
  - Ô: cao 40px, nền `rgba(0,0,0,0.04)`, viền `#F0F0F0`, bo 6px, `max-width:520px`, căn giữa giữa breadcrumb và chuông; icon kính lúp 16px; nút `×` chỉ khi dropdown mở.
  - Placeholder:
    - Portal: "Tìm gian hàng, nhu cầu, dự án, nhóm…"
    - Admin: "Tìm thành viên, gian hàng, nhu cầu, dự án, nhóm…"
  - Dropdown:
    - `top:46px`, rộng bằng ô, nền trắng, viền `#F0F0F0`, bo 8px, bóng `0 6px 16px rgba(0,0,0,0.08),0 3px 6px -4px rgba(0,0,0,0.12)`, `z-index:80`, `max-height:420px`, cuộn, `padding:6px 0`
    - Tiêu đề nhóm: 11px/600, `letter-spacing:.06em`, IN HOA, `rgba(0,0,0,0.45)`, `padding:8px 14px 4px`
    - Dòng kết quả: `padding:8px 14px`, hover `#F5F5F5`; tiêu đề 14px `rgba(0,0,0,0.88)`, phụ đề 12px `rgba(0,0,0,0.45)`, cắt `…`; không icon / avatar
    - Rỗng: "Không tìm thấy kết quả" (13px, giữa, `padding:20px 14px`)
  - Nhóm, trường khớp và đích bấm theo prototype:

    | Nhóm | Trường khớp | Tiêu đề / phụ đề | Bấm (Portal) | Bấm (Admin) |
    |---|---|---|---|---|
    | Gian hàng | tên, ngành, tỉnh | tên / `ngành · tỉnh` | chi tiết gian hàng | tab Gian hàng |
    | Nhu cầu địa phương | tiêu đề, ngành, tỉnh | tiêu đề / `ngành · tỉnh` | Nhu cầu lọc theo tiêu đề | tab Nhu cầu |
    | Dự án OPC | tên, tagline | tên / `tagline \|\| danh mục` | chi tiết dự án | tab Dự án |
    | Nhóm cộng đồng | tên | tên / `{n} thành viên` | đã vào → phòng chat; chưa → Cộng đồng | tab Nhóm |
    | Thành viên (Admin) | tên, email | tên / email | — | Thành viên lọc theo tên |

  - Prototype khớp chuỗi con **không phân biệt hoa thường nhưng phân biệt dấu**, không debounce, không phím mũi tên, không đóng khi bấm ra ngoài. Prototype còn để lọt gian hàng nháp và dự án chưa duyệt (**Q-V46-808-1, 2, 5**).
- Code hiện tại (đọc trước):
  - **Topbar dùng chung**: `packages/ui/src/app-shell/topbar.tsx` (`TopbarSearch`, submit → `onSearch(q)`; prop `search?: ReactNode` thay hẳn ô mặc định, dòng ~128); CSS `topbar.module.css` ẩn ô ở ≤ 767px; `use-popover.ts` (bấm ra ngoài + Esc, chưa export).
  - **Portal**: `features/shell/components/portal-shell.tsx:36-55` `executePortalSearch` chỉ gắn `?q=` vào URL trang hiện tại (dashboard / profile → `/community?q=`). Mỗi màn Gian hàng / Nhu cầu / Dự án / Cộng đồng **đã có ô tìm riêng** trong thân trang.
  - **Admin**: `features/shell/components/admin-shell.tsx:34-49` `executeAdminSearch` tương tự (overview / settings → `/members?q=`). Các màn Thành viên / Gian hàng / Nhu cầu / Nhóm / Phí / NĐT / Yêu cầu đã có toolbar tìm riêng.
  - **Route đích**:
    - Portal: `/stores/[id]`, `/projects/[id]`, `/needs?q=` (không có trang chi tiết nhu cầu), `/chat/:groupId`, `/community?join=<id>` (mở hộp tham gia)
    - Admin: `/members?q=`, `/stores?q=`, `/needs?q=`, `/groups?q=`, `/projects/:id/review` (drawer theo URL; màn Dự án không có `q`)
  - **Hiển thị theo domain** (phải dùng lại, không chép):
    - Gian hàng: `visibleStore(now)` `local-business/repositories/store-explore.repository.ts:29-36` (`published`, chủ chưa xóa, phí còn dùng được)
    - Nhu cầu: `visibleNeed` `need-explore.repository.ts:19-22` (`open` + gian hàng hiển thị)
    - Dự án: `visible(userId, now)` `project/repositories/project-feed.query.ts:14-28` (`published`, chưa xóa, chủ / thành viên / chia sẻ nhóm / công khai + chủ còn phí)
    - Nhóm: `deleted_at IS NULL` (`community/repositories/group.repository.ts:23-38`)
    - Thành viên: `memberSearchQuery` `account/repositories/member-search.query.ts` khớp index `users_search` (unaccent tên + email)
  - **Index**: `unaccent` + `pg_trgm` + `immutable_unaccent()` đã có (init migration dòng 2 → 9); GIN trigram có sẵn `users_search`, `groups_search (immutable_unaccent(name))`; **chưa có** cho `stores`, `needs`, `projects`.
  - **Gác cổng Portal**: guard toàn cục (khóa TK, phí `MEMBERSHIP_REQUIRED`); nhà đầu tư chỉ qua route có `@AllowAccountTypes('investor')` (stores / needs / projects có, groups không). Rate limit toàn cục 100 / phút / người.

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): repository chỉ đọc bảng domain mình. Module `search` **không** đọc bảng domain khác, chỉ gọi service export qua `index.ts` của từng domain; không phụ thuộc vòng.
- [backend/api-conventions](../standards/backend/api-conventions.md) · [backend/auth-rbac](../standards/backend/auth-rbac.md): Admin lọc nhóm theo permission key (`members.view`, `stores.view` cho gian hàng + nhu cầu, `projects.view`, `groups.view`)
- [database/query-indexing](../standards/database/query-indexing.md) · [database/prisma-migrations](../standards/database/prisma-migrations.md): biểu thức index khớp **từng ký tự** với câu truy vấn; `LIMIT 4`; chỉ select cột cần; `CREATE INDEX CONCURRENTLY` không chạy trong transaction migration của Prisma → dùng `CREATE INDEX IF NOT EXISTS` thường, ghi thời gian tạo trên dữ liệu thật
- [security/security](../standards/security/security.md): escape `% _ \` (`containsPattern`); không lộ bản ghi người xem không có quyền; giới hạn độ dài `q`
- [frontend/data-state](../standards/frontend/data-state.md): TanStack Query, khóa theo `q`, debounce, `placeholderData` giữ kết quả cũ khi gõ
- [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md) (D-134) · [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Thay ô tìm cục bộ ở topbar Portal và Admin bằng **ô tìm kiếm chung** như prototype:

- Gõ từ 2 ký tự, hiện dropdown kết quả theo nhóm (Gian hàng, Nhu cầu địa phương, Dự án OPC, Nhóm cộng đồng; Admin thêm Thành viên), tối đa 4 kết quả / nhóm.
- Enter mở kết quả đầu, Esc đóng; ẩn khi màn hình ≤ 1023px.
- Server có 2 endpoint (`/v1/search`, `/v1/admin/search`). Endpoint gom kết quả từ hàm tìm của từng domain, dùng đúng luật hiển thị của domain đó, không dấu, có index trigram.

## SPECIFICATIONS

### Hành vi (BR-491)

1. **Ngưỡng**:
   - `q` sau `trim()` dài < 2 ký tự → không gọi API, đóng dropdown.
   - Dài ≥ 2 → gọi API sau debounce **250 ms**; giữ kết quả cũ trong lúc chờ (`placeholderData`).
   - Kết quả về muộn của `q` cũ không ghi đè `q` mới (khóa query theo `q`).
   - `q` tối đa 100 ký tự.
2. **Nhóm**:
   - Thứ tự cố định: Gian hàng → Nhu cầu địa phương → Dự án OPC → Nhóm cộng đồng → Thành viên (chỉ Admin).
   - Nhóm không có kết quả thì không hiện.
   - Không nhóm nào có kết quả → "Không tìm thấy kết quả".
   - Mỗi nhóm tối đa **4** dòng; server trả đúng 4, không trả tổng.
3. **Khớp** (**Q-V46-808-1** mặc định: không dấu, không phân biệt hoa thường):
   - `immutable_unaccent(<biểu thức>) ILIKE immutable_unaccent(containsPattern(q))`.
   - "ca phe" và "cà phê" cho cùng kết quả.
   - Trường khớp theo prototype:
     - Gian hàng: `name || ' ' || field || ' ' || province`
     - Nhu cầu: `title || ' ' || field || ' ' || province`
     - Dự án: `name || ' ' || summary`
     - Nhóm: `name` (đúng index `groups_search`)
     - Thành viên: `full_name || ' ' || email` (đúng index `users_search`); cộng thêm `member_code = upper(q)` khi `q` có dạng `TV` + 6 số (**Q-V46-808-3**)
4. **Thứ tự trong nhóm**: khớp đầu chuỗi trước (`immutable_unaccent(<tên / tiêu đề>) ILIKE immutable_unaccent(q || '%')`), rồi thứ tự mặc định của màn danh sách tương ứng:
   - gian hàng `updated_at DESC, id`
   - nhu cầu `updated_at DESC, id`
   - dự án `published_at DESC, id`
   - nhóm `member_count DESC, id`
   - thành viên `member_code, id`
5. **Bàn phím / chuột**:
   - Enter → mở kết quả đầu tiên của nhóm đầu tiên (prototype); không có kết quả thì không làm gì.
   - Esc → xóa chữ, đóng dropdown.
   - Nút `×` (chỉ hiện khi dropdown mở) → như Esc.
   - Bấm một dòng → mở đích (SPEC 6), xóa chữ, đóng.
   - Bấm ra ngoài → đóng dropdown, **giữ chữ** (**Q-V46-808-5**; prototype không có).
   - Không làm phím mũi tên (prototype không có; SKIP).
   - A11y: input `role="combobox"` + `aria-expanded` + `aria-controls`; dropdown `role="listbox"`, dòng `role="option"`; tiêu đề nhóm `role="presentation"`; vẫn bọc trong `role="search"` có `aria-label`.
6. **Đích bấm**:
   - Portal:
     - Gian hàng → `/stores/{id}`
     - Nhu cầu → `/needs?q={tiêu đề}` (prototype `ndQ: title`; không có trang chi tiết)
     - Dự án → `/projects/{id}`
     - Nhóm:
       - đã là thành viên (`joined`) → `/chat/{groupId}`
       - chưa → `/community?join={groupId}` (mở hộp tham gia có sẵn; prototype chỉ về danh sách Cộng đồng, D-95 làm theo nghiệp vụ)
   - Admin (prototype chỉ về đúng tab; app thêm lọc để thấy ngay bản ghi):
     - Thành viên → `/members?q={tên}`
     - Gian hàng → `/stores?q={tên}`
     - Nhu cầu → `/needs?q={tiêu đề}`
     - Dự án → `/projects/{id}/review` (drawer theo URL có sẵn)
     - Nhóm → `/groups?q={tên}`
7. **Ẩn trên điện thoại**: ô tìm ẩn ở `max-width: 1023px` như prototype (thay mốc 767px của ô cũ). Không có lối tìm thay thế trên mobile.
8. **Bỏ hành vi cũ**: xóa `executePortalSearch` / `executeAdminSearch`. Topbar không còn gắn `?q=` vào URL; ô tìm trong thân từng màn giữ nguyên. Giữ `TopbarSearch` trong `packages/ui` làm mặc định cho app không truyền `search` (không xóa API của `AppShell`).

### Phạm vi dữ liệu (**Q-V46-808-2**, **Q-V46-808-4** mặc định)

9. **Migration** `20261111090000_v46_global_search` (`down.sql` drop 3 index):

   ```sql
   CREATE INDEX IF NOT EXISTS stores_search ON stores
     USING gin (immutable_unaccent(name || ' ' || field || ' ' || province) gin_trgm_ops);
   CREATE INDEX IF NOT EXISTS needs_search ON needs
     USING gin (immutable_unaccent(title || ' ' || field || ' ' || province) gin_trgm_ops);
   CREATE INDEX IF NOT EXISTS projects_search ON projects
     USING gin (immutable_unaccent(name || ' ' || summary) gin_trgm_ops) WHERE deleted_at IS NULL;
   ```

   Câu truy vấn phải dùng **đúng** biểu thức trên (gom trong `*-search.query.ts`, có comment như `member-search.query.ts`).
10. **Portal** `GET /v1/search?q=`:
    - Controller `@Controller()` thường: guard phí / khóa TK áp như mọi route thành viên; `@AllowAccountTypes('investor')` để nhà đầu tư dùng được.
    - Gian hàng: chỉ bản ghi qua `visibleStore(now)`. Hàm hiện ở repository nội bộ → export qua `local-business/index.ts` hoặc dùng trong `store-search.query.ts` cùng domain; **không chép** điều kiện.
    - Nhu cầu: `visibleNeed(now)`.
    - Dự án: `visible(userId, now)` của `project-feed.query.ts` (export hàm, không chép).
    - Nhóm: `deleted_at IS NULL`, có cờ `joined` = `EXISTS group_members (user_id, status='member')`. **Nhà đầu tư không có nhóm Nhóm cộng đồng** (route `/groups` cấm nhà đầu tư).
    - Không có nhóm Thành viên.
11. **Admin** `GET /v1/admin/search?q=` (`@RequireAnyAdmin('members.view','stores.view','projects.view','groups.view')`):
    - Mỗi nhóm chỉ chạy khi Admin có quyền xem tương ứng:
      - Thành viên: `members.view`
      - Gian hàng + Nhu cầu: `stores.view`
      - Dự án: `projects.view`
      - Nhóm: `groups.view`
    - Thiếu quyền thì bỏ nhóm, không báo lỗi.
    - Phạm vi Admin (**Q-V46-808-4** mặc định): mọi bản ghi chưa xóa, **mọi trạng thái** như màn quản trị tương ứng (gian hàng nháp / ẩn, nhu cầu đóng / ẩn, dự án mọi trạng thái, thành viên bị khóa).
    - Thành viên: chỉ `account_type IN ('personal','business')` như màn Thành viên.
    - Phụ đề thêm nhãn trạng thái khi không phải trạng thái hiển thị bình thường, vd `Ăn uống · Đắk Lắk · Đã ẩn`.
12. **Gom kết quả**:
    - `SearchService` gọi song song 4–5 hàm domain (`Promise.all`), mỗi hàm **1 câu SQL** `LIMIT 4`; không query trong vòng lặp.
    - Hàm domain trả `{ id, title, sub, joined? }` đã định dạng (phụ đề: gian hàng / nhu cầu `field · province`, bỏ phần rỗng; dự án `summary` hoặc tên danh mục; nhóm `{memberCount} thành viên` — FE dịch; thành viên `email`).
    - Không cache Redis (kết quả theo người xem). Rate limit giữ mức toàn cục.

### Giao diện

13. `GlobalSearch` trong `packages/ui`:
    - props `{ placeholder, emptyText, clearLabel, groups: { kind, label, items: { id, title, sub }[] }[], open, onQuery(q), onPick(kind, item) }`
    - không biết API / router
    - CSS đúng số đo prototype ở CONTEXT; tiêu đề nhóm IN HOA bằng `text-transform`
14. Portal `PortalSearch` / Admin `AdminSearch`:
    - hook `useGlobalSearch` (debounce + TanStack Query, `enabled: q.length >= 2`, `staleTime` 30 giây)
    - ánh xạ đích SPEC 6, `router.push`
    - nhãn nhóm từ i18n
15. **i18n** khóa `shell.globalSearch.*`: `placeholder`, `empty`, `clear`, `groups.{store,need,project,group,member}`, `members` (`"{n} thành viên"`).
    - Portal 10 bộ (D-65, AI dịch, giữ biến); Admin chỉ `vi`.
    - Tiếng Việt đúng prototype: "Gian hàng", "Nhu cầu địa phương", "Dự án OPC", "Nhóm cộng đồng", "Thành viên", "Không tìm thấy kết quả", placeholder 2 câu ở CONTEXT.
    - Nút `×` dịch nhãn (sửa luôn chữ cứng "Xoá tìm kiếm" chỉ trong component mới).

### Validation

- `globalSearchQuerySchema`: `{ q: string().trim().min(2).max(100) }`; ngắn hơn → 400 (FE không gọi).
- Response parse bằng `globalSearchResultSchema` ở server test, MSW và FE.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| `q` < 2 hoặc > 100 ký tự | 400 `VALIDATION_ERROR` |
| TV hết phí / bị khóa | 403 như mọi route thành viên (FE: dropdown không mở, không toast) |
| Admin không có quyền nào trong 4 khóa | 403 |
| Admin thiếu một phần quyền | 200, bỏ nhóm thiếu quyền |
| Lỗi mạng / 5xx | dropdown hiện "Không tìm thấy kết quả" và giữ chữ; không toast (tránh nhiễu khi gõ) |
| Ký tự `% _ \` trong `q` | được escape, khớp đúng chữ |

## ACCEPTANCE CRITERIA

- **TC-491** Given seed có gian hàng "HTX Cà phê Hòa Phú" (published, chủ còn phí) và nhu cầu đang mở có "cà phê" When TV Portal gõ "cà phê" Then:
  - có nhóm "Gian hàng" và "Nhu cầu địa phương";
  - bấm gian hàng mở `/stores/{id}`, bấm nhu cầu mở `/needs?q=…` có thẻ nhu cầu đó.

  Test: e2e `global-search.spec.ts` › `TC-491 portal`; int `global-search.int.spec.ts` › `TC-491`.
- **Không dấu** Given như trên When gõ "ca phe" Then cùng kết quả "cà phê" (int `› unaccent`; unit mock `search.spec.ts`).
- **Ngưỡng / giới hạn** Given 6 gian hàng khớp When gõ Then:
  - 1 ký tự → không request, không dropdown;
  - 2 ký tự → 1 request sau debounce;
  - nhóm Gian hàng đúng 4 dòng, dòng khớp đầu chuỗi đứng trước.

  Test: unit `global-search.spec.tsx` › `threshold`, int `› limit order`.
- **Bàn phím** Given dropdown có kết quả When Enter Then mở kết quả đầu nhóm đầu; When Esc Then chữ xóa, dropdown đóng; bấm ra ngoài → đóng, giữ chữ (unit + e2e `› keyboard`).
- **Rỗng** Given gõ "zzqx" Then "Không tìm thấy kết quả" (unit + e2e).
- **Hiển thị Portal** Given gian hàng nháp, gian hàng ẩn, gian hàng có chủ hết phí, nhu cầu đã đóng, dự án `pending_review`, dự án `hidden`, dự án riêng tư không chia sẻ cho người xem, nhóm đã xóa — tên đều chứa "thuxyz" When TV khác gõ "thuxyz" Then không có bản ghi nào trong số đó. Chủ dự án riêng tư thấy dự án của mình (int `› portal visibility`).
- **Nhóm đã vào / chưa vào** Given TV là thành viên nhóm A, chưa vào nhóm B Then bấm A → `/chat/{A}`, bấm B → `/community?join={B}` mở hộp tham gia (e2e `› group target`; int trả `joined`).
- **Nhà đầu tư** Given TK nhà đầu tư Then 200, không có nhóm "Nhóm cộng đồng"; TV hết phí → 403 (int `› access`).
- **Admin** Given Super Admin gõ tên một TV bị khóa + một gian hàng đã ẩn Then:
  - có nhóm "Thành viên" (đứng cuối) và "Gian hàng" (phụ đề có "Đã ẩn");
  - gõ `TV000123` ra đúng TV đó (Q-V46-808-3);
  - bấm Thành viên → `/members?q={tên}`, bấm Dự án → `/projects/{id}/review`.

  Test: int `› admin scope`; e2e `› admin`.
- **Admin theo quyền** (ma trận mặc định `DEFAULT_ADMIN_ROLE_PERMISSIONS`) Given Kế toán (chỉ `members.view` trong 4 khóa) Then chỉ có nhóm Thành viên. Given Giảng viên (`members.view` + `groups.view`) Then chỉ Thành viên + Nhóm cộng đồng. Given vai trò tùy chỉnh chỉ có `fees.view` Then 403 (int `› admin permissions`).
- **Escape** Given `q = "50%_"` Then không lỗi, chỉ khớp chuỗi chứa đúng "50%_" (int `› escape`).
- **Hiệu năng** Given ≥ 10k `stores`, ≥ 10k `needs`, ≥ 10k `projects`, ≥ 10k `users` When `q` ≥ 3 ký tự Then EXPLAIN (ANALYZE, BUFFERS) từng câu dùng `stores_search` / `needs_search` / `projects_search` / `groups_search` / `users_search` (Bitmap Index Scan), không Seq Scan.
  - `q` 2 ký tự (trigram không dùng được): ghi plan + thời gian thật vào `TIP-V46-808-query-plans.md`; mục tiêu ≤ 50 ms / câu trên 10k dòng.
  - Test: `global-search-plan.int.spec.ts`.
- **Ẩn mobile** Given 390px Then không có ô tìm ở topbar; 1024px có (e2e `› responsive`).
- **Không hồi quy**: `e2e/behavior/stores.spec.ts` (đã thu hẹp locator, không nới assertion), các màn có ô tìm riêng vẫn lọc đúng; e2e MSW không tụt so với `dev`.
- **Parity (D-134, tham khảo)** `P-V46-SEARCH` (Portal, dropdown mở với "cà phê"), `D-V46-SEARCH` (Admin) ở 1440: ghi % + nguyên nhân phần > 3%. Lệch loại D-xx: đích bấm Admin có lọc, đóng khi bấm ra ngoài, chữ không dấu ra thêm kết quả. Lệch giao diện thật phải sửa. 390: ô ẩn, chụp topbar.

## CONSTRAINTS

- DO NOT:
  - đọc bảng domain khác trong module `search` (gọi service export của domain); chép điều kiện hiển thị (`visibleStore`, `visibleNeed`, `visible`) — export và dùng lại
  - trả bản ghi người xem không được thấy ở màn tương ứng; trả trường riêng tư (SĐT, email người khác ở Portal)
  - query trong vòng lặp; `select *`; `OFFSET`; đếm tổng
  - gọi API khi `q` < 2 ký tự; bỏ debounce
  - sửa ô tìm trong thân từng màn; nới / xóa assertion của `stores.spec.ts`
  - dùng tìm kiếm ngoài (Elasticsearch, Meilisearch…), `tsvector` (ngoài phạm vi, chưa có ADR)
  - `any`, `@ts-ignore`, `console.*`; mask / nới assertion (D-134)
- REUSE:
  - `immutable_unaccent`, `containsPattern`, `memberSearchQuery`, index `users_search` / `groups_search`
  - `visibleStore`, `visibleNeed`, `visible` (project feed), `usableFeeSql`
  - `use-popover.ts` (export qua `app-shell/index.ts` nếu cần — 1 dòng, thêm vào Files touched) cho bấm ra ngoài + Esc
  - `useJoinParam` (`/community?join=`), `reviewPath(id)` Admin Dự án, mẫu debounce `fees/hooks/use-member-lookup.ts` (chuyển thành hook chung trong `global-search` nếu cần)
- SKIP:
  - Phím mũi tên / chọn dòng bằng bàn phím
  - Lối tìm trên mobile
  - "Xem tất cả kết quả"
  - Tìm theo sản phẩm của gian hàng, mô tả nhu cầu, tỉnh của nhóm, SĐT thành viên (prototype không khớp các trường này)
  - Sự kiện / dịch vụ / nhà đầu tư (không trong BR-491)

## Câu hỏi chờ owner chốt (phương án mặc định đã ghi trong SPEC; builder dùng mặc định nếu owner chưa trả lời, ghi completion)

- **Q-V46-808-1 Khớp có dấu hay không dấu.** Prototype phân biệt dấu ("ca phe" không ra "cà phê").
  - **Mặc định:** không dấu (như ô tìm Thành viên đang có), tìm ra nhiều hơn prototype, không bỏ sót kết quả.
- **Q-V46-808-2 Phạm vi Portal.** Prototype để lọt gian hàng nháp và dự án chưa duyệt / bị ẩn.
  - **Mặc định:** Portal chỉ trả đúng những gì màn danh sách tương ứng cho người đó xem: gian hàng đã đăng + chủ còn phí, nhu cầu đang mở, dự án đã duyệt theo quyền xem, nhóm chưa xóa.
- **Q-V46-808-3 Tìm thành viên ở Admin.** Prototype khớp tên + email.
  - **Mặc định:** tên + email, cộng **Mã TV chính xác** (`TV` + 6 số); không tìm theo SĐT.
- **Q-V46-808-4 Phạm vi Admin.** Prototype dùng cùng bộ lọc với Portal (bỏ gian hàng ẩn, chỉ nhu cầu mở).
  - **Mặc định:** Admin tìm mọi bản ghi chưa xóa, mọi trạng thái, như màn quản trị, phụ đề ghi trạng thái; mỗi nhóm theo quyền xem.
- **Q-V46-808-5 Đóng dropdown và đích bấm.** Prototype không đóng khi bấm ra ngoài; Admin bấm chỉ về tab, không lọc.
  - **Mặc định:** bấm ra ngoài thì đóng, giữ chữ; Admin bấm thì về tab **đã lọc** theo tên (dự án mở drawer duyệt); Portal nhóm chưa vào mở hộp tham gia.

Ghi 5 câu vào `reports/ui-parity/questions.md` › V4.6 (dạng "mặc định, chờ owner").

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-808-global-search`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed; migration `--create-only` rồi sửa SQL, có `down.sql`
- [ ] Đo baseline `dev` trước (e2e MSW, `stores.spec.ts`, parity topbar P-11 / P-12 / D-02) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `global-search.spec.ts`
- [ ] EXPLAIN (ANALYZE, BUFFERS) 5 câu tìm trên ≥ 10k dòng, `q` 2 ký tự và ≥ 3 ký tự → `TIP-V46-808-query-plans.md`
- [ ] Parity (D-134): `P-V46-SEARCH`, `D-V46-SEARCH` ở 1440 (+ 390 topbar), ghi % + nguyên nhân; sửa hết lệch giao diện thật
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 3 / ranh giới domain**: `search` chỉ gọi service export của domain; repository chỉ đọc bảng domain mình; `depcheck` PASS
  - **Luật 4**: Admin lọc nhóm bằng permission key, không check tên vai trò
  - **Luật 5**: index biểu thức khớp câu truy vấn, `LIMIT 4`, `Promise.all` cố định 4–5 câu, không N+1
  - **Luật 2**: `q` parse bằng zod trong `packages/shared`
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] D-65: 9 bộ dịch Portal có khối `shell.globalSearch`; `messages.spec.ts` PASS
- [ ] Ghi Q-V46-808-1 → 5 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #8; glossary
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity (tham khảo), EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ (lint / type / unit / int / e2e / depcheck / build); parity theo D-134 không chặn nhưng phải có nguyên nhân

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority P2, depends, estimate M, REQ / D)
- [x] Context: DB đích, delta P2, BR-491 / TC-491, dòng prototype + số đo, code hiện tại (topbar, route đích, luật hiển thị, index)
- [x] Task rõ + SKIP (mũi tên, mobile, xem tất cả, trường ngoài prototype, sự kiện / dịch vụ)
- [x] Business rules đánh số 1 → 15, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: TC-491, không dấu, ngưỡng, bàn phím, rỗng, hiển thị Portal, nhóm đã vào, nhà đầu tư, Admin, quyền Admin, escape, hiệu năng, mobile, không hồi quy, parity
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 809 / 810 (local-business), shell đã merge 807
- [x] BUILDER-CHECKLIST trích luật 2 / 3 / 4 / 5
- ⚠️ Gap:
  - Trigram không dùng index với `q` 2 ký tự, nên câu tìm có thể quét bảng. TIP yêu cầu đo thời gian thật; nếu > 50 ms trên 10k dòng thì ghi completion để owner chọn (nâng ngưỡng hiển thị nhóm lên 3 ký tự hoặc chấp nhận).
  - Hàm điều kiện hiển thị đang nằm trong repository nội bộ của từng domain. Builder phải export qua `index.ts` mà không tạo phụ thuộc vòng; nếu vướng thì dừng và báo (nestjs-modules).
  - Q-V46-808-1 → 5 chưa chốt; mặc định chọn hướng an toàn (không lộ bản ghi ẩn) và không bớt kết quả so với prototype.
