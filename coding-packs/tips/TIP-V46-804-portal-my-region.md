# TIP-V46-804: Portal › Affiliate — tab "Vùng của tôi" (GĐ Vùng, chỉ xem), banner GĐ Vùng, nhãn gọn (BR-495), gia hạn D-131

## HEADER

- TIP-ID: TIP-V46-804
- Project: OPCHUB
- Module: regional-director (API đọc cho chính GĐ Vùng + consumer `regional_share.recorded`), affiliate (Portal `me-affiliate`: preview chính sách, danh sách giới thiệu theo khoản), Portal › Affiliate
- Priority: P0
- Depends on: TIP-V46-803 (đã merge, PR #81, `dev` `01de9037`)
- Estimated: L
- REQ / D: REQ-618, REQ-630 (phần BR-495) · D-120, D-121, D-122 / D-130, D-128, D-129, D-131 (+ D-110 làm tròn, D-125 không Web Push thật, D-127 BR-495)
- **Files touched:**
  - Shared
    - `packages/shared/src/api-domains/regional-shares.ts` (modify): thêm `myRegionSchema` (union `none` / `director`), `MyRegion`
    - `packages/shared/src/api-domains/affiliate.ts` (modify): `affiliatePolicyPreviewSchema` thêm `renewalRate`, `renewalMaxYear` (default để MSW cũ parse được); `affiliateReferralSchema` thêm `customerYear: int ≥ 1` (default 1), `source: 'membership' | 'fundraising'` (default `membership`)
    - `packages/shared/src/mock-data/domains/regional-shares.ts`, `regional-share-demo.ts` (modify): sinh `myRegion` cho GĐ Vùng demo từ cùng fixture sổ 802
    - `packages/shared/src/mock-data/domains/affiliate.ts` (modify): referral theo khoản (năm 1 + gia hạn), preview chính sách mới
    - `packages/shared/src/fixtures/prototype-seed.json` (modify): `ACCOUNTS` thêm 3 tài khoản GĐ Vùng của prototype v4.6 (`bao.tran@solobooks.vn` m3, `hai.lm@mediasoft.vn` m9, `ha.pt@mediasoft.vn` m10, mật khẩu demo như prototype) — chỉ fixture demo / MSW, không phải secret
  - Server
    - `apps/server/src/modules/regional-director/controllers/me-regional.controller.ts` (create): `GET /v1/me/gdv`
    - `apps/server/src/modules/regional-director/services/my-region.service.ts` (create)
    - `apps/server/src/modules/reporting/regional/my-region-projection.repository.ts` (create): 4 query đọc (KPI, theo năm, theo affiliate, theo tháng) — xem SPEC 6
    - `apps/server/src/modules/reporting/regional/regional-projection.module.ts`, `reporting/index.ts` (modify: export 1 provider)
    - `apps/server/src/modules/regional-director/services/regional-share-events.handler.ts` (modify): thêm `recorded(p)` — thông báo GĐ Vùng có khoản mới
    - `apps/server/src/worker/processors/regional-director.processor.ts` (modify): `registerWithId('regional_share.recorded', …)`
    - `apps/server/src/modules/regional-director/regional-director-core.module.ts` (modify): provider + controller vào `RegionalDirectorHttpModule`
    - `apps/server/src/modules/affiliate/services/me-affiliate.service.ts` (modify): preview thêm `renewalRate`, `renewalMaxYear`
    - `apps/server/src/modules/affiliate/repositories/me-affiliate.query.ts`, `me-affiliate.repository.ts` (modify): danh sách "Thành viên đã giới thiệu" theo **khoản** (SPEC 12)
    - `packages/db/prisma/migrations/20261107090000_v46_my_region_index/migration.sql` (create, **chỉ khi EXPLAIN cần**): index `regional_shares(region, director_user_id, month_key) INCLUDE (director_amount, base_amount, customer_year, affiliate_id, status) WHERE region IS NOT NULL` — không đổi bảng
  - Portal
    - `apps/portal/src/features/affiliate/`:
      - `api.ts`, `model.ts` (modify: `affiliateUrlSchema.tab` thêm `'reg'`), `types.ts` (modify)
      - `hooks/use-my-region.ts` (create)
      - `components/affiliate-screen.tsx` (modify: banner + tab thứ 3, vẫn chỉ orchestrator)
      - `components/affiliate-hero.tsx` (modify: BR-495 hai nhãn, khung locked theo D-131)
      - `components/history-columns.tsx`, `history-mobile.tsx` (modify: cột Gói ghi kèm năm `_yrL`)
      - `components/regional-banner.tsx` (create)
      - `components/my-region-tab.tsx`, `my-region-kpis.tsx`, `my-region-years.tsx`, `my-region-affiliates.tsx`, `my-region-months.tsx`, `my-region.module.css` (create)
    - `apps/portal/src/mocks/handlers/affiliate.ts` (modify: `GET /me/gdv`), `affiliate-demo.ts` (modify nếu login demo GĐ Vùng đi qua đây)
    - `apps/portal/messages/vi/affiliate.json` (modify: chỉ thêm khoá dưới `affiliate.region.*`, `affiliate.banner.*`, `affiliate.hero.badges.*`; sửa `hero.description`, `locked.description`; khoá cũ không còn dùng thì xoá)
  - Test
    - `packages/shared/src/api-domains/regional-shares.spec.ts`, `packages/shared/src/mock-data/domains/regional-shares.spec.ts` (modify)
    - `apps/server/test/regional-director/my-region.int.spec.ts`, `share-notify.int.spec.ts` (create)
    - `apps/server/test/affiliate/me-affiliate.int.spec.ts` (modify: preview + danh sách theo khoản)
    - `apps/server/test/outbox/*` (không sửa) — M1 "mọi event có consumer" phải PASS sau TIP này
    - `apps/portal/src/features/affiliate/components/{my-region-tab,regional-banner,affiliate-hero}.spec.tsx` (create / modify), `hooks/use-affiliate.spec.tsx` (modify)
    - `e2e/behavior/portal-my-region.spec.ts` (create); `e2e/behavior/affiliate-portal.spec.ts`, `affiliate-screen.spec.ts`, `affiliate-cross-app.spec.ts` (modify theo nhãn mới)
    - `e2e/parity/steps.ts` (modify: thêm `ACCOUNTS.director` + `start: 'director'`), `e2e/parity/types.ts` (modify: `Start`), `e2e/parity/scenarios/portal-account.ts` (modify: thêm `P-V46-REG`, `P-V46-REG-BANNER`)
  - Tài liệu
    - `coding-packs/standards/global/domain-glossary.md` (thêm dòng)
    - `coding-packs/reports/V4.6-progress.md` (dòng #4)
    - `coding-packs/reports/ui-parity/{screens,questions}.md` (dòng / mục V4.6)
    - `coding-packs/reports/TIP-V46-804-completion.md` (create)
- **Parallel-safe with:** sequential.
  - Chia `modules/regional-director/**`, `reporting/regional/**`, `api-domains/regional-shares.ts` với 801 / 802 / 803 (đã merge).
  - Chia `modules/affiliate/**`, `api-domains/affiliate.ts` với V46-807 (BR-463, nhãn quyền D-132 (3)) → 807 chạy sau 804.
  - Chia `e2e/parity/steps.ts` / `types.ts` với mọi TIP thêm persona parity mới (805+) → chỉ thêm dòng.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-804-portal-my-region` tách từ `dev` `01de9037`.
- **DB:** 801 → 803 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). TIP này **không đổi bảng**; chỉ có thể thêm 1 index (SPEC 7). Builder hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed. Không reset DB native, không tắt tiến trình HOLD.
- Delta `coding-packs/audit/SPEC-V4.6-DELTA.md` **P5**: tab "Vùng của tôi" cho GĐ Vùng (chỉ xem): doanh thu vùng, phần GĐV theo năm của khách, affiliate trong vùng, lịch sử chi trả; banner GĐ Vùng; nhãn affiliate gọn (BR-495).
- Đặc tả `docs/spec/dac-ta.html`: §31 (CS-11 → CS-15), §32 (GDV-R01 → R07, GĐ Vùng chỉ xem), BR-495 ("chỉ hiện 2 nhãn: % hoa hồng và thời gian ghi nhận link … Bỏ đoạn mô tả chi tiết năm 1/2–3/4").
- Prototype `docs/spec/index.html` v4.6:
  - Markup Portal › Affiliate dòng ~2563 → 2665: banner `afU.isGdvU` (2573), hero 2 nhãn, tab, `data-screen-label="Portal · Affiliate · Vùng của tôi"` (2629 → 2651)
  - Logic `afU` dòng ~5895 → 5910 (rows `plan + ' · ' + _yrL`), khối `{const myV=VGL.find(v=>v.uid===(s.meId||'m1'))…}` dòng ~6004 → 6016 (KPI, `yrs`, `affs`, `mons`, tab "Vùng của tôi" nhãn đếm "GĐ Vùng")
  - Tài khoản demo prototype: `bao.tran@solobooks.vn` (m3, GĐ Vùng Miền Bắc), `hai.lm@mediasoft.vn` (m9, Trung), `ha.pt@mediasoft.vn` (m10, Nam); seed DB đã bổ nhiệm đúng m3 / m9 / m10 (`packages/db/seed/demo/regional-directors.ts`)
- Đọc trước:
  - `apps/portal/src/features/affiliate/components/{affiliate-screen,affiliate-hero,history-tabs,history-columns}.tsx`, `hooks/use-affiliate.ts`, `model.ts`
  - `apps/server/src/modules/regional-director/services/{regional-share-read,regional-share-events.handler}.ts`, `repositories/regional-share-summary.repository.ts`
  - `apps/server/src/modules/reporting/regional/{regional-share-projection,customer-year}.repository.ts`
  - `apps/server/src/modules/affiliate/{services/me-affiliate.service,repositories/me-affiliate.repository,repositories/me-affiliate.query}.ts`
  - `packages/shared/src/membership/{regional-share,commission-year}.ts` (`regionalPercent`, `payoutMonthOf`, `regionalPayoutDate`, `commissionRateFor`)
  - Completion 802 / 803: consumer `regional_share.recorded` để lại cho 804 (Q-V46-802-7, M1 đỏ)

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): API "của tôi" thuộc domain regional-director; đọc chéo qua `reporting/regional`; không import nội bộ module khác
- [backend/api-conventions](../standards/backend/api-conventions.md): `/v1/me/gdv`, envelope chuẩn, không phân trang trên 3 bảng nhỏ (giới hạn cứng SPEC 6)
- [backend/auth-rbac](../standards/backend/auth-rbac.md): quyền theo **chính chủ** (`userId = sub` là GĐ Vùng hiện tại), không check tên vai trò
- [backend/queues-workers](../standards/backend/queues-workers.md): consumer outbox idempotent (`registerWithId`, id thông báo cố định)
- [database/query-indexing](../standards/database/query-indexing.md): "bằng trước, khoảng / sort sau", INCLUDE cho tổng hợp, không N+1
- [security/security](../standards/security/security.md): STK hiển thị cho chính chủ; không log STK
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md) · [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Cho GĐ Vùng xem phần của vùng mình ngay trong **Portal › Mạng lưới Affiliate**:

- Banner "Bạn là Giám đốc Vùng …" + nút "Xem Vùng của tôi".
- Tab thứ ba **"Vùng của tôi"** (nhãn đếm "GĐ Vùng", chỉ xem), gồm 4 KPI, bảng "Phần được chia theo năm của khách", bảng "Affiliate trong vùng", bảng "Lịch sử Media Soft chi trả theo tháng". API `GET /v1/me/gdv` đọc sổ chia sẻ 802.
- Thông báo trong app cho GĐ Vùng khi có khoản chia sẻ mới. Đây là consumer `regional_share.recorded`, giúp đóng gate M1.
- Hero affiliate gọn theo BR-495: chỉ 2 nhãn "Hoa hồng x%" và "Link ghi nhận N ngày".
- Danh sách giới thiệu hiện từng khoản kèm năm của khách theo D-131.

## SPECIFICATIONS

### Ai thấy gì

1. "GĐ Vùng hiện tại" = dòng `regional_directors` có `user_id = sub` (mỗi TV tối đa 1 vùng, D-120). Không phải GĐ Vùng → `GET /me/gdv` trả `{ state: 'none' }` (200, không 403, để Portal ẩn banner / tab mà không lỗi).
2. GĐ Vùng đã bị thu hồi → `none`. Khoản `pending` của người cũ vẫn được chi qua Admin (GDV-R05, 802), nhưng **không** hiện ở Portal sau thu hồi. Ghi **Q-V46-804-1**.
3. Chỉ xem: không nút, không sửa STK (STK GĐ Vùng do Admin nhập ở Cấu hình GĐ Vùng, 801). Nhãn "Chỉ xem" góc phải như prototype.
4. Không yêu cầu đã đóng phí (GĐ Vùng có trạng thái phí "Miễn phí · GĐ Vùng"); controller dùng `@SkipMembershipFee()` như `me/affiliate`.

### Dữ liệu `GET /v1/me/gdv` (`myRegionSchema`)

5. `{ state: 'director', region, label, provinces: string[], bank: { bankName, bankNo, bankHolder } | null, kpi, years, affiliates, months, payoutDate }`:
   - `label`: `REGIONAL_LABELS[region]`; `provinces`: tên tỉnh đã tick (chỉ hiển thị phạm vi, D-129)
   - `kpi`:
     - `revenue`: Σ `base_amount`
     - `count`: số khoản
     - `share`: Σ `director_amount`
     - `paid`: Σ `director_amount` của khoản `paid`, kèm `paidMonths` = số tháng có khoản `paid`
     - `due`: `share − paid`
   - `years`: đúng 4 dòng `y = 1, 2, 3, 4+` (`4+` gộp mọi `customer_year ≥ 4`). Mỗi dòng có `percent` (= `regionalPercent(y, chính sách hiện hành)`, chỉ để hiển thị cột "Tỷ lệ GĐV" như prototype), `count`, `revenue`, `share` (cộng từ khoản đã chụp, **không** tính lại theo % hiện hành)
   - `affiliates`: theo `affiliate_id`, gồm `name`, `code`, `customers` (đếm `DISTINCT customer_id`), `revenue`, `share`; sort `share DESC, name`; **tối đa 50 dòng** + `more` (số còn lại)
   - `months`: theo `month_key DESC`, gồm `monthKey`, `amount` (Σ `director_amount`), `status` (`paid` nếu mọi khoản tháng đó đã `paid`, ngược lại `pending`), `paidAt` (max `regional_payouts.paid_at` của các khoản đã chi trong tháng, null nếu chưa); tối đa 24 tháng
   - `payoutDate`: `regionalPayoutDate(now)` (ngày cuối tháng hiện tại, giờ VN)
6. **Phạm vi khoản** = `region = <vùng> AND director_user_id = sub` (chỉ khoản ghi cho chính người này). Không tính khoản `region IS NULL` (vùng trống / trước bổ nhiệm → Media Soft, D-121). Mọi tổng là số nguyên VND (`bigint` → `Number`).
7. Query: 4 aggregate một lần mỗi request (KPI + years có thể gộp 1 query `GROUP BY LEAST(customer_year, 4)`; affiliates 1 query lateral lấy tên / mã theo trang 50; months 1 query join `regional_payouts`). Tên affiliate lấy qua projection (`users.full_name`, `affiliates.code`), không N+1. EXPLAIN trên ≥ 10k `regional_shares`: nếu Seq Scan / Index Filter → thêm index ở migration SPEC "Files touched" (chỉ index, không đổi bảng).

### Thông báo khoản mới (consumer `regional_share.recorded`)

8. `RegionalShareEventsHandler.recorded({ shareId })`: đọc khoản. Nếu `director_user_id` khác null thì gửi `NotificationService.notify` với:
   - `id = regional-share:<shareId>`, `type: 'affiliate'`, `link: '/affiliate?tab=reg'`
   - title "Khoản chia sẻ mới · GĐ Vùng {label}"
   - body "{tên khách} · {Gói} · Năm {y} · phần GĐ Vùng {số tiền}" (dùng `COMMISSION_PLAN_LABEL`)

   Nếu `region IS NULL` thì không gửi. Idempotent nhờ id cố định.
9. Không Web Push / Zalo / mail (D-125); chỉ thông báo trong app.
10. Thông báo chi trả `regional_share.payout_recorded` (802) đổi `link` sang `/affiliate?tab=reg`. Thông báo bổ nhiệm 801 dùng `link: '/affiliate'`; đổi sang `?tab=reg` để khớp prototype ("Xem tab Vùng của tôi"). Giữ id cũ.

### Portal UI (prototype thắng)

11. **Banner** (chỉ khi `state = 'director'`), đặt trên cảnh báo thiếu STK. Nội dung nguyên văn "**Bạn là Giám đốc Vùng {label} · {tên}** · xem doanh thu vùng, phần được chia và lịch sử Media Soft chi trả." + nút "Xem Vùng của tôi". Bấm nút → `tab=reg`, cuộn tới tab.
12. **Danh sách "Thành viên bạn đã giới thiệu"** (D-131): mỗi **khoản** một dòng; referral chưa có khoản giữ một dòng "Vừa đăng ký · chờ thanh toán phí".
    - Query mới: `commissions` của đại lý ∪ referral chưa có khoản nào. Lọc tháng theo `commissions.month_key` hoặc `referrals.month_key`. Dùng deferred join `ORDER BY date DESC, id DESC`.
    - Cột Gói: `{Gói} · Năm 1` / `{Gói} · Năm y · gia hạn` (prototype `_yrL`).
    - Tổng tháng và đếm tab tính theo khoản.
    - Sửa luôn lỗi hiện tại: JOIN `c.source='membership'` làm Gọi vốn và khoản gia hạn không hiện.
13. **Hero** (BR-495):
    - Giữ tiêu đề "Giới thiệu thành viên mới, nhận {rate}% hoa hồng".
    - Thay đoạn mô tả bằng 2 nhãn: "Hoa hồng **{rate}%**" và "Link ghi nhận **{N} ngày**".
    - Thẻ tài khoản nhận và thanh chia sẻ giữ nguyên.
14. **Khung locked** (chưa có mã), nguyên văn prototype: "… bạn nhận **{rate}%** hoa hồng ({per} (Cá nhân) · {biz} (Doanh nghiệp) · {fund} (Gói Gọi vốn {fundRate}%)) ở năm 1, {renewalRate}% ở năm 2–{renewalMaxYear} khi khách gia hạn." Hai giá trị cuối lấy từ API (D-131), không hằng số.
15. **Tab "Vùng của tôi"**:
    - Tab thứ 3, nhãn "Vùng của tôi", ô đếm "GĐ Vùng". URL `?tab=reg`. Người không phải GĐ Vùng mở `?tab=reg` → về `ref`.
    - Bố cục theo `data-screen-label="Portal · Affiliate · Vùng của tôi"`:
      1. Tiêu đề "Vùng của tôi · GĐ Vùng {label} · {tên}" + phụ đề "{label} · {N} tỉnh/thành · {danh sách tỉnh}" + nhãn "Chỉ xem"
      2. Khung chú thích "Chỉ tính thành viên đăng ký qua link affiliate thuộc vùng. Media Soft chi trả phần GĐ Vùng vào ngày cuối tháng tới tài khoản **{Ngân hàng · STK · Chủ TK}**. GĐ Vùng tự chia cho Trưởng nhóm & Affiliate ngoài hệ thống." (STK đầy đủ cho chính chủ; thiếu STK → "—")
      3. 4 KPI:
         - "Doanh thu thực thu của vùng", phụ "{count} giao dịch qua link affiliate"
         - "Phần GĐ Vùng được chia", phụ "Theo tỷ lệ năm của khách"
         - "Media Soft đã chi trả", phụ "{paidMonths} tháng"
         - "Chờ chi cuối tháng", phụ "Ngày cuối tháng {MM/YYYY}"
      4. "Phần được chia theo năm của khách": cột Năm của khách / Tỷ lệ GĐV / Giao dịch / Doanh thu / Phần GĐ Vùng; nhãn "Năm 1 · khách mới", "Năm 2 · gia hạn", "Năm 3 · gia hạn", "Từ năm 4 trở đi"
      5. "Affiliate trong vùng · căn cứ để chia cho cấp dưới": cột Affiliate (tên + mã) / Khách / Doanh thu mang về / Phần vùng nhận; rỗng → "Chưa có giao dịch qua link affiliate trong vùng."; `more > 0` → dòng "+ {more} affiliate khác"
      6. "Lịch sử Media Soft chi trả theo tháng": cột Tháng / Số tiền / Trạng thái ("Đã chi trả" xanh, "Chờ chi" cam) / Ngày chi trả (ngày VN hoặc "—")
    - 390px: bảng cuộn ngang trong khung như các bảng Portal hiện có, body không tràn.
16. Tab "Lịch sử nhận tiền" của affiliate giữ nguyên (khoản `paid` cũ trước D-119), không gộp với chi trả GĐ Vùng.

### Validation

- Response parse bằng `myRegionSchema` (server `respond`, Portal `api(..., { schema })`); tiền `int ≥ 0`; `years.length = 4`.
- Payload outbox `regional_share.recorded` parse bằng schema có sẵn.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| Không phải GĐ Vùng / đã thu hồi | 200 `{ state: 'none' }`; Portal ẩn banner + tab |
| GĐ Vùng chưa có khoản | 200 `director` với tổng 0, `affiliates` rỗng → câu rỗng, `months` rỗng |
| Chưa đăng nhập | 401 như mọi `/me/*` |
| Lỗi tải `/me/gdv` | Portal vẫn hiện trang affiliate, banner / tab ẩn, log qua logger client hiện có (không chặn trang) |
| Consumer gặp khoản `region NULL` / khoản không tồn tại | bỏ qua, không lỗi |
| Relay `regional_share.recorded` 2 lần | 1 thông báo (id cố định) |

## ACCEPTANCE CRITERIA

- **Không phải GĐ Vùng** Given m1 (Nguyễn Văn An) When `GET /v1/me/gdv` Then `{ state: 'none' }`; Portal không có banner, không có tab "Vùng của tôi"; `?tab=reg` về tab giới thiệu (int `my-region.int.spec.ts` › `non director`; unit `my-region-tab.spec.tsx`).
- **KPI + năm** Given GĐ Vùng Bắc (m3), chính sách 50 / 10 / 20, sổ có 3 khoản năm 1 (1.200.000 → 600.000), 1 khoản năm 2 DN 3.600.000 (→ 1.440.000), 1 khoản năm 5 (1.200.000 → 240.000), 2 khoản đã chi tháng trước Then `kpi.revenue = 8.400.000`, `share = 3.480.000`, `paid` = tổng 2 khoản đã chi, `due = share − paid`; `years` = [Năm 1: 50%, 3, 3.600.000, 1.800.000; Năm 2: 40%, 1, 3.600.000, 1.440.000; Năm 3: 30%, 0, 0, 0; 4+: 20%, 1, 1.200.000, 240.000] (int `my-region` › `kpi and years`).
- **Chỉ khoản của mình** Given khoản `region NULL` (vùng trống), khoản Miền Trung, khoản Bắc của GĐ Vùng cũ đã thu hồi Then không tính vào `/me/gdv` của m3 (int `my-region` › `scope own shares`).
- **Affiliate** Given 2 affiliate trong vùng, A có 2 khách / 3 khoản, B 1 khách Then dòng A `customers = 2`, sort theo phần vùng giảm dần; 60 affiliate → 50 dòng + `more = 10` (int `my-region` › `affiliates`).
- **Tháng** Given tháng 10 đã chi ngày 31/10 (giờ VN), tháng 11 còn pending Then `months` = [11: pending, null; 10: paid, 31/10]; UI hiện "Chờ chi" / "Đã chi trả" (int `my-region` › `months`; e2e `portal-my-region` › `history`).
- **Thông báo khoản mới** Given đối soát phí của khách của affiliate Miền Bắc Then GĐ Vùng m3 nhận 1 thông báo `type affiliate`, link `/affiliate?tab=reg`, body có tên khách / gói / năm / số tiền; relay lại không thêm; khoản vùng trống không gửi ai (int `share-notify.int.spec.ts`).
- **M1** Given test outbox "mọi event có consumer" Then PASS (không thêm no-op) — đóng gate đỏ của 802 / 803.
- **Banner + tab** Given đăng nhập m3 Then thấy banner "Bạn là Giám đốc Vùng Miền Bắc · Trần Quốc Bảo …", bấm "Xem Vùng của tôi" → tab 3 active, URL `?tab=reg`, cuộn tới khối; tải lại trang giữ tab (e2e `portal-my-region` › `banner opens tab`).
- **BR-495** Given affiliate m1 Then hero có đúng 2 nhãn "Hoa hồng 20%" và "Link ghi nhận 30 ngày", không còn đoạn "{per} (Cá nhân) · …" (unit `affiliate-hero.spec.tsx`; e2e `affiliate-portal.spec.ts`).
- **Locked D-131** Given TV chưa có mã, chính sách gia hạn 10% / năm 3 Then câu có "ở năm 1, 10% ở năm 2–3 khi khách gia hạn"; đổi chính sách 15% / năm 4 → câu đổi (int `me-affiliate.int.spec.ts` › `preview renewal`; unit).
- **Danh sách theo khoản** Given khách K đóng phí năm 1 và gia hạn năm 2, khách L chỉ đăng ký, khách M mua Gói Gọi vốn Then 4 dòng: K "Gói Cá nhân · Năm 1", K "Gói Cá nhân · Năm 2 · gia hạn", M "Gói Gọi vốn · Năm 1", L "Vừa đăng ký · chờ thanh toán phí"; lọc tháng đúng `month_key`; tổng tháng = Σ khoản không hủy (int `me-affiliate` › `rows per commission`).
- **MSW = server** Given cùng fixture Then `myRegionSchema` parse cả MSW và server; đăng nhập MSW bằng `bao.tran@solobooks.vn` vào được Portal (unit `regional-shares.spec.ts`, `mock-auth-session.spec.ts`).
- **EXPLAIN (ANALYZE, BUFFERS)** 4 query `/me/gdv` + query danh sách giới thiệu theo khoản trên ≥ 10k khoản: không Seq Scan bảng lớn; dán vào completion.
- **Parity ≤ 3% (1440 + 390)**:
  - `P-V46-REG`: persona m3 › Mạng lưới Affiliate › "Vùng của tôi"
  - `P-V46-REG-BANNER`: persona m3, tab mặc định có banner
  - `P-97`, `P-98` không tụt so với `dev` (đo baseline trước; BR-495 làm P-97 khớp prototype hơn)
  - Không mask / nới

## CONSTRAINTS

- DO NOT:
  - nút chi trả / sửa STK / đổi tỉnh ở Portal (chỉ xem)
  - tính lại phần GĐ Vùng theo % hiện hành (chỉ cộng `director_amount` đã chụp; `percent` ở bảng năm chỉ để hiển thị)
  - dùng `regional_director_provinces` để lọc khoản (D-129); hiện khoản `region NULL` cho GĐ Vùng (D-121)
  - Admin đổi tay vùng affiliate (D-121); chi trả trực tiếp affiliate (D-119)
  - Web Push / Zalo / mail cho khoản mới (D-125)
  - hằng số 50 / 10 / 20, 10% / năm 3, giá gói trong code chạy (chỉ seed / test / fixture)
  - consumer no-op hoặc nới test M1
  - query trong vòng lặp; select `*`; log STK
  - `any`, `@ts-ignore`, `console.*`; nới parity / mask / timeout
  - sửa `packages/shared/src/permissions.ts` (807)
- REUSE:
  - `RegionalShareProjectionRepository` (mẫu query), `REGIONAL_LABELS`, `regionalPercent`, `regionalPayoutDate`, `payoutMonthOf`, `COMMISSION_PLAN_LABEL`
  - `NotificationService.notify`, `registerWithId`
  - `Tabs`, `AdminTable` / bảng Portal, `StatusTag`, `EmptyState`, `PageSkeleton` từ `@opchub/ui`; `formatVnd`, `formatDate` của Portal
  - `useUrlParams` + `affiliateUrlSchema`
- SKIP:
  - Phân trang affiliate trong vùng (giới hạn 50 + "khác"), CSV vùng
  - Hiện khoản `pending` của GĐ Vùng đã thu hồi ở Portal (Q-V46-804-1)
  - Nhãn quyền `affiliate.payout` (807, D-132 (3)); BR-463 ẩn khoản 0đ cũ (807)
  - Admin (801 → 803 đã làm)

## Câu hỏi ghi sẵn (`reports/ui-parity/questions.md` › V4.6, chọn phương án an toàn, không chặn)

- **Q-V46-804-1**: Sau khi thu hồi, GĐ Vùng cũ không còn tab "Vùng của tôi", kể cả khi còn khoản `pending` chờ chi (prototype tìm `VGL` theo người hiện tại). Admin vẫn chi qua tab GĐ Vùng và người cũ nhận thông báo chi trả.
- **Q-V46-804-2**: Bảng năm hiện cột "Tỷ lệ GĐV" theo chính sách **hiện hành** như prototype (`gPct(y)`), còn tiền cộng từ khoản đã chụp. Hai giá trị có thể lệch sau khi Admin đổi chính sách.
- **Q-V46-804-3**: Lịch sử chi trả gom theo **tháng của khoản** như prototype (`byM[mk]`), không theo lần bấm Chi trả. Một lần chi gồm nhiều tháng thì hiện thành nhiều dòng có cùng ngày chi.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-804-portal-my-region`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed (CONTEXT)
- [ ] Đo baseline `dev` trước (theo 803: int 1.790 pass / 4 fail; e2e cuối 6 fail; parity P-97 / P-98) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `portal-my-region.spec.ts`
- [ ] Parity ≤ 3% cả 1440 + 390: `P-V46-REG`, `P-V46-REG-BANNER`; P-97 / P-98 không tụt; `screens.md` cập nhật; không mask / nới
- [ ] EXPLAIN 5 query mới dán vào completion; chỉ thêm index khi cần, có `down.sql`
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **D-120 / GDV-R**: GĐ Vùng chỉ xem phần của chính mình (`director_user_id = sub`), phân quyền theo chính chủ ở backend
  - **D-121 / D-129**: khoản vùng trống không hiện; tỉnh tick chỉ hiển thị phạm vi
  - **D-131 / BR-495**: danh sách theo khoản kèm năm; hero 2 nhãn; câu locked lấy % gia hạn từ API
  - **Luật 5**: aggregate gom, không N+1, deferred join cho danh sách giới thiệu; **luật 8**: consumer idempotent, không side effect ngoài thông báo
- [ ] Gate M1 (mọi event có consumer) PASS
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] Glossary: "Vùng của tôi", "Phần GĐ Vùng được chia", "Chờ chi cuối tháng"
- [ ] Ghi Q-V46-804-1 → 3; cập nhật `V4.6-progress.md` dòng #4 (M1 = 801 → 804: ghi trạng thái mốc thật)
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity từng màn, EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ; ghi trung thực PARTIAL như 801 → 803

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority, depends 803, estimate L, REQ / D)
- [x] Context: DB đích, delta P5, § đặc tả, dòng prototype, tài khoản demo, file đọc trước, gate M1 dồn từ 802
- [x] Task rõ phạm vi + SKIP sang 807
- [x] Business rules đánh số 1 → 16, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: không phải GĐ Vùng, KPI + năm (số cụ thể), phạm vi khoản, affiliate, tháng, thông báo, M1, banner, BR-495, locked D-131, danh sách theo khoản, MSW, EXPLAIN, parity
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 807 và TIP thêm persona parity
- [x] BUILDER-CHECKLIST trích D-120 / D-121 / D-129 / D-131, luật 5 / 8
- ⚠️ Gap:
  - Fixture MSW hiện chỉ có 2 tài khoản demo (m1, admin), chưa có 3 tài khoản GĐ Vùng như prototype v4.6 → TIP thêm vào `prototype-seed.json` `ACCOUNTS`; builder kiểm parity login prototype dùng đúng email.
  - Q-V46-804-1 → 3 là phương án an toàn tự chọn theo prototype, cần owner xác nhận khi review.
  - `dev` còn gate đỏ từ 801 → 803 (int persona-turn, e2e 6 fail, parity D-84* / D-120-*): đo baseline trước.
