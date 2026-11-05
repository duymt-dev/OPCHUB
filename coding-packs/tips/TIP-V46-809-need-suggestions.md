# TIP-V46-809: Dashboard Portal — thẻ "Nhu cầu phù hợp với gian hàng của bạn" (BR-478 → 480)

## HEADER

### Execution refinements

- Additional narrow test infrastructure: `e2e/server/test.ts` and `e2e/parity/types.ts`
  expose existing `seed:demo --stores` via an explicit annotation; P01/new behavior cases
  use the same full store seed as MSW. `apps/server/scripts/flush-dev-cache.mjs` adds only
  the new cache namespace to post-demo reset, not production write invalidation.
- Candidate late join uses a correlated LATERAL payload lookup limited to the unique ID.
  A plain join let PostgreSQL choose a needs payload Seq Scan on10k fixtures. The bounded
  lookup preserves one SQL and exact200-candidate semantics without new indexes/planner flags.
- Shared `selectNeedMatches` additionally centralizes ranking/projection for mock/server.
- Standard unpaid402 MEMBERSHIP_REQUIRED wins erroneous TIP403 wording; locked/investor403.

- TIP-ID: TIP-V46-809
- Project: OPCHUB
- Module: local-business (chấm điểm nhu cầu cho gian hàng của chính TV), Portal dashboard (thẻ mới)
- Priority: P2
- Depends on: 808 (đã merge — `visibleNeedSql` / `visibleStoreSql`); chạy sau 808 theo thứ tự GOAL (`dev` `4dcb6818`)
- Estimated: M
- REQ / D: REQ-626 · BR-478, BR-479, BR-480 · D-89 / D-93 (prototype thắng), D-95 (nút prototype làm theo nghiệp vụ), D-75 / OQ-12 (chỉ TK Doanh nghiệp có gian hàng, mỗi TK một gian hàng), D-92 / D-124 (không có Trợ lý OPC Hub — "AI gợi ý" ở đây là chấm điểm quy tắc, **không gọi LLM**), D-65 (Portal 10 bộ ngôn ngữ), D-134 (parity tham khảo) · **Q-V46-809-1 → 4** (cuối file)
- **Files touched:**
  - Shared
    - `packages/shared/src/api-domains/needs.ts` (modify): `needMatchReasonSchema` (`field | province | product`), `needMatchRowSchema`, `needMatchesSchema` (`{ hasStore, storeField, rows }`)
    - `packages/shared/src/needs/need-match.ts` (create): hàm thuần `matchKeywords(text)` và `scoreNeedMatch(store, need)` (SPEC 3 → 6) dùng chung server + MSW; export ở `packages/shared/src/index.ts` (modify: 1 dòng `export * from './needs/need-match'`, như `membership/*`)
    - `packages/shared/src/mock-data/domains/need-matches.ts` (create): `myMockNeedMatches(userId, now)` dùng `scoreNeedMatch`; `mock-data/domains/index.ts` (modify: 1 dòng)
  - Server (`modules/local-business`, chỉ đọc bảng `stores`, `store_items`, `needs` của domain mình)
    - `apps/server/src/modules/local-business/repositories/need-match.query.ts` (create): 2 câu SQL — gian hàng của TV + tên sản phẩm; ứng viên nhu cầu (SPEC 7)
    - `apps/server/src/modules/local-business/services/need-match.service.ts` (create): chấm điểm, lọc ≥ 30, top 3, cache Redis 60 giây theo người
    - `apps/server/src/modules/local-business/controllers/need.controller.ts` (modify): `GET /v1/me/needs/matches`
    - `apps/server/src/modules/local-business/local-business.module.ts` (modify: provider)
  - Portal
    - `apps/portal/src/features/dashboard/components/need-matches-card.tsx`, `need-match-row.tsx`, `need-matches.module.css` (create)
    - `apps/portal/src/features/dashboard/hooks/use-need-matches.ts`, `apps/portal/src/features/dashboard/api.ts` (create)
    - `apps/portal/src/features/dashboard/components/dashboard-screen.tsx` (modify: thêm thẻ sau `OnboardingPanel`)
    - `apps/portal/messages/{vi,en,zh,id,th,ms,fil,km,lo,my}/dashboard.json` (modify: khối `matches.*`)
    - `apps/portal/src/mocks/handlers/needs.ts` (modify: `GET /me/needs/matches`, đăng ký **trước** handler `/me/needs/:id` nếu có trùng mẫu)
  - Test
    - `packages/shared/src/needs/need-match.spec.ts`, `packages/shared/src/mock-data/domains/need-matches.spec.ts` (create)
    - `apps/server/test/local-business/need-matches.int.spec.ts`, `need-matches-plan.int.spec.ts` (create)
    - `apps/portal/src/features/dashboard/components/need-matches-card.spec.tsx` (create)
    - `e2e/behavior/dashboard-need-matches.spec.ts` (create)
    - `e2e/parity/scenarios/portal-shell.ts` (modify: `P-01` chụp cả thẻ; thêm `P-V46-MATCH-NONE` nếu dựng được TV có gian hàng không khớp)
  - Tài liệu
    - `coding-packs/reports/V4.6-progress.md` (dòng #9), `coding-packs/reports/ui-parity/{screens,questions,results}.md` + `results.json`, `coding-packs/reports/TIP-V46-809-completion.md`, `coding-packs/reports/TIP-V46-809-query-plans.md` (create), `coding-packs/standards/global/domain-glossary.md` ("Nhu cầu phù hợp", "Mức phù hợp")
- **Parallel-safe with:** sequential.
  - Chia `modules/local-business/**` (`need.controller.ts`, `local-business.module.ts`) với V46-808 (đã merge) và V46-810 (trang công khai gian hàng) → 810 chạy sau.
  - Chia `packages/shared/src/api-domains/needs.ts`, `apps/portal/src/mocks/handlers/needs.ts` với 808 (đã merge).
  - Chia `apps/portal/messages/*/dashboard.json` với mọi TIP Portal → chỉ thêm khóa.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-809-need-suggestions` tách từ `dev` `4dcb6818`.
- **DB:** 801 → 808 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). Builder hỏi owner DB đích trước khi int / e2e server / seed. TIP này **không có migration** (dùng index sẵn có; nếu EXPLAIN cho thấy cần index mới thì dừng, ghi completion, hỏi owner).
- Delta `coding-packs/audit/SPEC-V4.6-DELTA.md` **P3**: Dashboard Portal có thẻ "Nhu cầu phù hợp với gian hàng của bạn" (BR-478 → 480): ngành +50 / tỉnh +30 / từ khóa +7 (≤ 20), ≥ 30 điểm, top 3, trần 98%. Code hiện tại chưa có.
- Đặc tả §33.2c:
  - Luồng: có gian hàng → lấy ngành, tỉnh, sản phẩm → chấm điểm nhu cầu đang mở → lọc ≥ 30 điểm, lấy 3 cao nhất → hiển thị kèm lý do → Xem & liên hệ.
  - BR-478: đúng ngành +50 · cùng tỉnh +30 · khớp từ khóa sản phẩm +7 / từ (tối đa +20); hiển thị tối đa 98%.
  - BR-479: chỉ nhu cầu đang mở, không phải của chính gian hàng, gian hàng chủ nhu cầu không bị ẩn.
  - BR-480: không có gian hàng → không hiện thẻ; có gian hàng nhưng không khớp → gợi ý bổ sung ngành, tỉnh, sản phẩm.
- Prototype `docs/spec/index.html` v4.6:
  - **Markup** dòng 646 → 650: khối cuối Dashboard, rộng 100%, ngay dưới thẻ "Hướng dẫn bắt đầu".
  - **Khung thẻ**: nền trắng, viền `#F0F0F0`, bo 8px.
  - **Đầu thẻ** (`padding:18px 24px`, viền dưới `#F0F0F0`):
    - icon 36 × 36 bo 8, nền `#F9F0FF`, màu `#722ED1` (lấp lánh)
    - tiêu đề "Nhu cầu phù hợp với gian hàng của bạn" 18px/600
    - dòng phụ "AI gợi ý theo ngành, tỉnh/thành và sản phẩm trong gian hàng · {n} nhu cầu" 13.5px `rgba(0,0,0,0.5)`
    - nút viền bên phải "Xem tất cả nhu cầu" (cao 34px, viền `#D9D9D9`, 13px)
  - **Dòng** (`padding:14px 24px`, viền dưới `#F5F5F5`):
    - dòng 1: chip loại (12px, nền `#E6F4FF`, chữ `#1677FF`, bo 4) + tiêu đề 15px/500 cắt `…`
    - dòng 2: `{ngành} · {tỉnh}` của nhu cầu (13px `rgba(0,0,0,0.5)`) + chip lý do (12px, viền `#D3ADF7`, chữ `#722ED1`, nền `#F9F0FF`): "Đúng ngành", "Cùng tỉnh", "Khớp sản phẩm"
    - bên phải: `{điểm}%` đậm 16px `#722ED1` + "mức phù hợp" 12px `rgba(0,0,0,0.45)`
    - nút chính "Xem & liên hệ" (nền `#1677FF`, cao 34px)
  - **Không khớp** (giữa, 14px `rgba(0,0,0,0.45)`, `padding:24px`): "Chưa có nhu cầu phù hợp. Bổ sung ngành, tỉnh và sản phẩm trong gian hàng để AI gợi ý chính xác hơn."
  - **Logic** `_ops().match` dòng 6544 → 6548:
    - từ khóa = `(intro + ' ' + tên mọi sản phẩm).toLowerCase().split(/[^a-zà-ỹ0-9]+/).filter(w => w.length > 3)`
    - ngành `n.mf === mine.field` +50, tỉnh `n.prov === mine.prov` +30
    - `k = words.filter(w => (title + ' ' + desc).toLowerCase().includes(w)).length`; có khớp thì `+min(20, 7k)`
    - `sc >= 30` → sắp giảm dần → 3 đầu; hiển thị `min(98, sc)%`
    - bấm "Xem & liên hệ" → Nhu cầu, tab Tất cả, ô tìm = tiêu đề; "Xem tất cả nhu cầu" → Nhu cầu lọc ngành của gian hàng
  - **Lỗ của prototype**:
    - không kiểm gian hàng chủ nhu cầu bị ẩn / nháp (trái BR-479)
    - từ khóa giữ dấu, không bỏ trùng
    - hòa điểm không có thứ tự phụ
- Code hiện tại (đọc trước):
  - **Dashboard Portal**:
    - `features/dashboard/components/dashboard-screen.tsx` (19 dòng) chỉ render `<OnboardingPanel />` (lời chào + "Hướng dẫn bắt đầu", `features/onboarding/**`)
    - `messages/*/dashboard.json` chỉ có `page.*`
    - parity `P-01` (`e2e/parity/scenarios/portal-shell.ts`)
  - **Gian hàng**:
    - `Store.ownerId @unique` (OQ-12, 1 TK 1 gian hàng); `field`, `province` (có thể rỗng), `intro`, `status draft | published | hidden`
    - `StoreItem.name`
    - chỉ TK Doanh nghiệp có gian hàng (`store-auto-create.handler.ts:32`, `store-owner.service.ts:56` `BUSINESS_ONLY`)
  - **Nhu cầu**:
    - `Need.title`, `description`, `type` (9 loại; nhãn `needs.json › type`), `field` (+ `fieldCustom` khi "Khác"), `province` (bắt buộc), `status`, `storeId`, `ownerId`
    - index `(status, province, field, updated_at desc)`, `(status, updated_at desc, id)`
  - **Hiển thị**:
    - `visibleNeedSql(now)` / `visibleStoreSql(now)` ở `repositories/search-visibility.query.ts` (808): nhu cầu mở + gian hàng chủ `published` + chủ chưa xóa + còn phí
    - Prisma: `visibleNeed(now)` (`need-explore.repository.ts:19-22`)
  - **Danh mục**: ngành gian hàng và nhu cầu cùng danh sách `STORE_FIELDS` (`fixtures/stores-seed.ts`); tỉnh cùng `provinces` fixtures
  - **Màn Nhu cầu Portal**:
    - không có trang chi tiết; URL nhận `q`, `type`, `province`, `field`, `page` (`features/needs/hooks/use-needs.ts`)
    - liên hệ bằng `ContactButtons` trên thẻ
    - tìm kiếm chung 808 mở nhu cầu bằng `/needs?q={tiêu đề}`
  - **Gợi ý chiều ngược** (nhu cầu → gian hàng): `NeedExploreRepository.suggestions` — tham khảo mẫu 1 query, không dùng lại logic

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): repository chỉ đọc `stores`, `store_items`, `needs` (cùng domain local-business); rule chấm điểm là hàm thuần (`domain` / shared), service không viết SQL
- [backend/api-conventions](../standards/backend/api-conventions.md) · [backend/auth-rbac](../standards/backend/auth-rbac.md): route thành viên mặc định (paywall + khóa TK); không cho nhà đầu tư
- [database/query-indexing](../standards/database/query-indexing.md): 2 câu SQL cố định, ứng viên giới hạn (SPEC 7), chỉ select cột cần, không query trong vòng lặp
- [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md) (D-134) · [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Thêm thẻ **"Nhu cầu phù hợp với gian hàng của bạn"** ở cuối Dashboard Portal, như prototype v4.6.

- **Server** chấm điểm các nhu cầu đang mở so với gian hàng của chính thành viên (endpoint `GET /v1/me/needs/matches`):
  - ngành +50, tỉnh +30, từ khóa sản phẩm +7 / từ, tối đa +20;
  - lọc ≥ 30 điểm, lấy 3 cao nhất, hiển thị tối đa 98%.
- Chấm điểm bằng quy tắc, **không gọi LLM**.
- **Thẻ trên Dashboard**:
  - mỗi dòng có lý do, phần trăm và nút "Xem & liên hệ";
  - không có gian hàng thì không hiện thẻ;
  - có gian hàng nhưng không khớp thì hiện câu gợi ý bổ sung.

## SPECIFICATIONS

### Phạm vi (BR-479, BR-480)

1. **Ai thấy thẻ**: TV có gian hàng (`stores.owner_id = me`), tức chỉ TK Doanh nghiệp (D-75 / OQ-12).
   - TK Cá nhân, nhà đầu tư, TV không có gian hàng → API trả `{ hasStore: false, rows: [] }` → **không hiện thẻ**.
   - Không gọi API khi `me.accountType !== 'business'`.
   - Nhà đầu tư: route không có `@AllowAccountTypes('investor')` → 403. FE không gọi nên không lỗi.
2. **Gian hàng của TV** dùng làm gốc chấm điểm (**Q-V46-809-1** mặc định): mọi trạng thái trừ `hidden`.
   - Gian hàng nháp vẫn được gợi ý, để TV thấy giá trị trước khi đăng.
   - Gian hàng bị Admin ẩn → `hasStore: true`, `rows: []`, thẻ hiện câu không khớp.
3. **Nhu cầu ứng viên**: `visibleNeedSql(now)` (đang mở + gian hàng chủ `published` + chủ chưa xóa + còn phí) **và** `n.store_id <> {gian hàng của TV}` **và** `n.owner_id <> me`. Dùng lại hàm, không chép điều kiện.

### Chấm điểm (BR-478) — hàm thuần `scoreNeedMatch` trong `packages/shared`

4. **Từ khóa của gian hàng** `matchKeywords(intro + ' ' + tên mọi sản phẩm)`:
   - chữ thường;
   - **bỏ dấu** (NFD + bỏ dấu kết hợp, `đ` → `d`) (**Q-V46-809-2** mặc định);
   - tách theo ký tự không phải chữ / số;
   - giữ từ dài **> 3 ký tự** (như prototype);
   - **bỏ trùng**, giữ tối đa 50 từ đầu tiên.
5. **Điểm**:
   - **Đúng ngành** +50: `need.field === store.field`, cả hai khác rỗng, `need.fieldCustom = false`.
   - **Cùng tỉnh** +30: `need.province === store.province`, `store.province` khác rỗng.
   - **Khớp sản phẩm**: `k` = số từ khóa xuất hiện (chuỗi con, sau khi bỏ dấu + chữ thường) trong `need.title + ' ' + need.description`; `k > 0` → `+min(20, 7 × k)`.
   - Lý do theo thứ tự `field`, `province`, `product`; chỉ gồm phần có cộng điểm.
6. **Lọc / sắp / cắt**:
   - `score >= 30`, sắp `score DESC`; hòa điểm thì `updated_at DESC`, rồi `id` (prototype không có thứ tự phụ);
   - lấy 3 đầu;
   - `pct = min(98, score)`.

### API và truy vấn

7. `GET /v1/me/needs/matches` → `needMatchesSchema`:

   ```ts
   {
     hasStore: boolean,
     storeField: string | null,
     rows: {
       id: string,
       type: NeedType,
       title: string,
       field: string,
       province: string,
       reasons: ('field' | 'province' | 'product')[],
       pct: number,
     }[]
   }
   ```

   - **Câu 1**: gian hàng của TV (`id`, `field`, `province`, `intro`, `status`) + `array_agg(store_items.name)` theo `store_id` (index `store_items (store_id, sort)`).
   - **Câu 2** (ứng viên): chỉ nhu cầu có thể đạt ≥ 30 điểm, tức `n.field = {field}` **hoặc** `n.province = {province}` (từ khóa tối đa 20 nên không tự đạt ngưỡng). Dùng index `(status, province, field, updated_at desc)`.
     - Giới hạn **200 ứng viên** mới nhất; select `id, type, title, description, field, field_custom, province, updated_at`.
     - Gian hàng có cả `field` và `province` rỗng → không chạy câu 2, trả `rows: []`.
   - Chấm điểm trong service bằng `scoreNeedMatch` trên ≤ 200 dòng (không query thêm).
   - Không trả `description`, liên hệ, giá ra ngoài.
8. **Cache** Redis `need-matches:{userId}` 60 giây (gian hàng / nhu cầu đổi thì chờ tối đa 60 giây). Không xóa cache khi ghi (chấp nhận trễ 60 giây, ghi completion).

### Giao diện

9. `NeedMatchesCard` render sau `OnboardingPanel` trong `dashboard-screen.tsx`, rộng 100%, đúng số đo prototype ở CONTEXT.
   - Dòng phụ: `"AI gợi ý theo ngành, tỉnh/thành và sản phẩm trong gian hàng · {n} nhu cầu"`, với `n` = số dòng (0–3).
   - Chip loại theo nhãn `needs.type.*` hiện có ("Cần mua", "Cần đầu ra", "Cần đối tác", "Cần dịch vụ", …).
   - Chip lý do: "Đúng ngành", "Cùng tỉnh", "Khớp sản phẩm".
   - Dòng 2 (`{ngành} · {tỉnh}`) bỏ phần rỗng.
   - Đang tải: skeleton 3 dòng trong khung thẻ.
   - Lỗi: ẩn danh sách, hiện câu lỗi ngắn + "Thử lại", không chặn Dashboard.
10. **Nút**:
    - "Xem & liên hệ" → `/needs?q={tiêu đề}`, giống tìm kiếm chung 808: màn Nhu cầu chưa có chi tiết và `ContactButtons` nằm trên thẻ.
    - "Xem tất cả nhu cầu" → `/needs?field={storeField}` khi có ngành, ngược lại `/needs`.
    - Cả dòng không bấm được (prototype chỉ nút).
11. **Không khớp** (`hasStore` và `rows` rỗng): giữ đầu thẻ ("· 0 nhu cầu"), thân thẻ hiện "Chưa có nhu cầu phù hợp. Bổ sung ngành, tỉnh và sản phẩm trong gian hàng để AI gợi ý chính xác hơn." (**Q-V46-809-3** mặc định: không thêm nút "Cập nhật gian hàng").
12. **i18n** `dashboard.matches.*`: `title`, `sub` (`{n}` ICU plural), `all`, `view`, `fit`, `none`, `reason.{field,province,product}`, `error`, `retry`. Portal 10 bộ (D-65, AI dịch, giữ biến). Chuỗi "AI gợi ý" giữ theo prototype (**Q-V46-809-4**).

### Validation

- Response parse bằng `needMatchesSchema` ở server test, MSW, FE.
- `matchKeywords` / `scoreNeedMatch` nhận chuỗi rỗng, `null` sản phẩm → không lỗi.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| TV hết phí / bị khóa | 403 như mọi route thành viên; FE ẩn thẻ (Dashboard vẫn hiện, paywall xử lý ở shell) |
| Nhà đầu tư gọi trực tiếp | 403 |
| TK Cá nhân / không có gian hàng | 200 `{ hasStore: false, rows: [] }` |
| Gian hàng bị Admin ẩn | 200 `{ hasStore: true, rows: [] }` → câu không khớp |
| Redis lỗi | tính trực tiếp, log cảnh báo, vẫn 200 |
| 5xx | thẻ hiện lỗi + "Thử lại" |

## ACCEPTANCE CRITERIA

- **BR-478 điểm** (unit `need-match.spec.ts`):
  - đủ ngành + tỉnh + 3 từ khóa → 100 điểm, hiển thị 98%, lý do `[field, province, product]`;
  - chỉ ngành + 1 từ → 57%;
  - chỉ tỉnh → 30% (đạt ngưỡng);
  - chỉ từ khóa → loại;
  - ngành "Khác" tự nhập (`fieldCustom`) → không cộng ngành;
  - "Cà phê rang mộc" khớp nhu cầu "cần mua ca phe rang" (bỏ dấu);
  - từ ≤ 3 ký tự ("mua", "bán") không tính;
  - từ trùng chỉ tính một lần.
- **BR-478 top 3** Given gian hàng "Thực phẩm · Đắk Lắk" có sản phẩm "Cà phê nhân Robusta" và 6 nhu cầu mở đủ mức điểm Then:
  - trả 3 dòng điểm cao nhất, giảm dần;
  - hòa điểm thì nhu cầu cập nhật mới hơn đứng trước;
  - lý do / % đúng.

  Test: int `need-matches.int.spec.ts` › `top3`.
- **BR-479 phạm vi** Given nhu cầu khớp nhưng thuộc một trong: chính gian hàng TV; gian hàng chủ bị ẩn; gian hàng chủ nháp; chủ hết phí; nhu cầu đã đóng; nhu cầu bị Admin ẩn Then không có trong kết quả (int `› visibility`).
- **BR-480 không gian hàng** Given TK Cá nhân / TK DN chưa có gian hàng Then `hasStore: false`, Dashboard không có thẻ, FE TK Cá nhân không gửi request (int + unit `need-matches-card.spec.tsx` › `no store`; e2e `dashboard-need-matches.spec.ts` › `personal`).
- **BR-480 không khớp** Given TK DN có gian hàng nhưng không nhu cầu nào ≥ 30 Then thẻ hiện "· 0 nhu cầu" + câu "Chưa có nhu cầu phù hợp. Bổ sung ngành, tỉnh và sản phẩm trong gian hàng để AI gợi ý chính xác hơn." (unit + e2e `› none`).
- **Gian hàng nháp / ẩn** Given gian hàng TV đang nháp Then vẫn có gợi ý; Admin ẩn gian hàng TV Then thẻ hiện câu không khớp (int `› own store status`).
- **Nút** When bấm "Xem & liên hệ" Then mở `/needs?q={tiêu đề}` có đúng thẻ nhu cầu đó và nút liên hệ; When bấm "Xem tất cả nhu cầu" Then `/needs?field={ngành gian hàng}` (e2e `› navigate`).
- **Quyền** Given nhà đầu tư Then `GET /v1/me/needs/matches` 403; TV hết phí 403 (int `› access`).
- **Hiệu năng** Given ≥ 10k nhu cầu (≥ 2k cùng ngành / tỉnh với gian hàng thử) When gọi Then:
  - câu 2 dùng index `needs (status, province, field, updated_at desc)` hoặc `(status, updated_at desc, id)`, không Seq Scan, ≤ 200 dòng;
  - EXPLAIN (ANALYZE, BUFFERS) dán vào `TIP-V46-809-query-plans.md`;
  - gọi lần 2 trong 60 giây không chạy SQL (cache).

  Test: int `need-matches-plan.int.spec.ts`.
- **MSW** `myMockNeedMatches` cho cùng kết quả với server trên seed demo (unit `need-matches.spec.ts` dùng chung `scoreNeedMatch`).
- **Không hồi quy**: `onboarding.spec.ts`, `needs.spec.ts`, `stores.spec.ts`, `needs.int.spec.ts`, e2e MSW không tụt so với `dev`.
- **Parity (D-134, tham khảo)**: `P-01` Dashboard ở 1440 + 390 có thẻ, ghi % + nguyên nhân phần > 3% (dữ liệu: nhu cầu seed khác prototype; D-xx: thứ tự phụ, bỏ dấu); lệch giao diện thật phải sửa.

## CONSTRAINTS

- DO NOT:
  - gọi LLM / adapter `llm` (D-92, D-124: không có Trợ lý; "AI gợi ý" là chấm điểm quy tắc)
  - đọc bảng ngoài domain local-business; chép điều kiện hiển thị (dùng `visibleNeedSql`)
  - chấm điểm trong SQL bằng chuỗi `ILIKE` theo từng từ khóa (không vòng query); query trong vòng lặp; `select *`
  - trả mô tả / liên hệ / ngân sách nhu cầu trong API thẻ
  - thêm migration / index khi chưa có EXPLAIN chứng minh cần (hỏi owner)
  - đổi màn Nhu cầu, thẻ Hướng dẫn bắt đầu, gợi ý gian hàng chiều ngược hiện có
  - `any`, `@ts-ignore`, `console.*`; mask / nới assertion (D-134)
- REUSE:
  - `visibleNeedSql`, `visibleStoreSql`, `usableFeeSql`, `RedisService` (mẫu cache 60 giây như `need-explore` facets)
  - nhãn `needs.type.*`, `STORE_FIELDS`, `provinces`
  - mẫu route `/needs?q=` của `portal-search.tsx` (808)
- SKIP:
  - Trang chi tiết nhu cầu, mở liên hệ trực tiếp từ Dashboard
  - Thông báo đẩy "Nhu cầu phù hợp gian hàng" (BR-493, TIP 811 chỉ cấu hình)
  - Gợi ý cho TK Cá nhân / nhà đầu tư
  - Xóa cache khi gian hàng / nhu cầu đổi
  - Học máy / điểm theo hành vi

## Câu hỏi chờ owner chốt (phương án mặc định đã ghi trong SPEC; builder dùng mặc định nếu owner chưa trả lời, ghi completion)

- **Q-V46-809-1 Gian hàng nháp của chính TV.** Prototype vẫn gợi ý khi gian hàng nháp hoặc bị ẩn.
  - **Mặc định:** nháp vẫn gợi ý; bị Admin ẩn thì không gợi ý (hiện câu không khớp).
- **Q-V46-809-2 Khớp từ khóa có dấu hay không dấu.** Prototype giữ dấu.
  - **Mặc định:** bỏ dấu (như tìm kiếm chung 808), không bỏ sót khi người đăng gõ không dấu.
- **Q-V46-809-3 Nút ở trạng thái không khớp.** Prototype chỉ có câu chữ.
  - **Mặc định:** chỉ câu chữ, không thêm nút "Cập nhật gian hàng".
- **Q-V46-809-4 Chữ "AI gợi ý".** Thẻ không gọi AI, chỉ chấm điểm theo quy tắc.
  - **Mặc định:** giữ chữ theo prototype (D-89); đổi thành "Gợi ý theo ngành…" nếu owner muốn tránh hiểu nhầm.

Ghi 4 câu vào `reports/ui-parity/questions.md` › V4.6 (dạng "mặc định, chờ owner").

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-809-need-suggestions`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi int / e2e server / seed; không migration (cần index → dừng, hỏi)
- [ ] Đo baseline `dev` trước (e2e MSW, `onboarding.spec.ts`, parity `P-01`) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `dashboard-need-matches.spec.ts`
- [ ] EXPLAIN (ANALYZE, BUFFERS) câu 1 + câu 2 trên ≥ 10k nhu cầu → `TIP-V46-809-query-plans.md`
- [ ] Parity (D-134): `P-01` ở 1440 + 390, ghi % + nguyên nhân; sửa hết lệch giao diện thật
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 3 / ranh giới domain**: chỉ đọc `stores`, `store_items`, `needs`; hàm chấm điểm thuần trong `packages/shared`, dùng chung server + MSW
  - **Luật 5**: 2 câu SQL cố định, ứng viên ≤ 200 qua index "bằng trước, sort sau", không N+1
  - **Luật 11 / D-124**: không gọi LLM, không adapter mới
  - **D-75 / OQ-12**: chỉ TK Doanh nghiệp có gian hàng; TK Cá nhân / NĐT không có thẻ
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] D-65: 9 bộ dịch Portal có khối `dashboard.matches`; `messages.spec.ts` PASS
- [ ] Ghi Q-V46-809-1 → 4 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #9; glossary
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity (tham khảo), EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ (lint / type / unit / int / e2e / depcheck / build); parity theo D-134 không chặn nhưng phải có nguyên nhân

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority P2, depends 808, estimate M, REQ / D)
- [x] Context: DB đích (không migration), delta P3, §33.2c BR-478 → 480, dòng prototype + số đo + công thức, code hiện tại (dashboard, store, need, hiển thị, danh mục)
- [x] Task rõ + SKIP (chi tiết nhu cầu, push, TK Cá nhân, xóa cache)
- [x] Business rules đánh số 1 → 12, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: điểm, top 3, phạm vi, không gian hàng, không khớp, gian hàng nháp / ẩn, nút, quyền, hiệu năng, MSW, không hồi quy, parity
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 810 (local-business)
- [x] BUILDER-CHECKLIST trích luật 3 / 5 / 11, D-75 / D-124
- ⚠️ Gap:
  - Giới hạn 200 ứng viên mới nhất có thể bỏ sót nhu cầu cũ hơn có điểm cao (cùng ngành + tỉnh) khi một ngành / tỉnh có > 200 nhu cầu mở. Chấp nhận cho thẻ top 3; ghi completion kèm số đo thật.
  - Cache 60 giây theo người: TV vừa sửa gian hàng có thể thấy gợi ý cũ tối đa 60 giây.
  - Q-V46-809-1 → 4 chưa chốt; mặc định bám prototype, chỉ chặt hơn ở BR-479 (gian hàng chủ nhu cầu) và bỏ dấu.
