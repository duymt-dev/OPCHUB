# TIP-V46-818: Nhật ký Admin có bộ lọc, gom nhãn vùng, phím mũi tên tìm kiếm, nhu cầu phù hợp (B11 + B13 + B14 phần kỹ thuật)

## HEADER

- TIP-ID: TIP-V46-818 (gộp nhóm đề xuất 818 + 819 theo D-139; số 819 không dùng)
- Project: OPCHUB
- Module: `apps/server/src/modules/settings` (nhật ký), `packages/shared` (nhãn vùng), `packages/ui/src/global-search`, `apps/server/src/modules/local-business` (nhu cầu phù hợp), Admin `features/settings`
- Priority: P2
- Depends on: V46-817 (đã vào `dev`). D-139. **Không release `main`** sau TIP này (D-139: release một lượt sau 821).
- Estimated: M
- REQ / D:
  - **D-139** (phạm vi 818; B16 đóng; 15 giây đóng theo D-127; soát dịch là việc tay; không purge `audit_logs`)
  - REQ-213 / NA-13 (nhật ký ≥ 12 tháng, append-only), D-136 › Q-V46-807-1 (màn / CSV 90 ngày)
  - BR-491 (tìm kiếm chung), D-136 › Q-V46-808-*; BR-478 → 480, BR-493, D-136 › Q-V46-809-*
  - **Q-V46-818-1 → 6** (cuối file, đã chốt theo mặc định)
- **Files touched:**
  - **Phần 1 — Bộ lọc Nhật ký hoạt động (B11)**
    - `packages/shared/src/api-domains/audit-log-page.ts` (modify: thêm `tag?`, `actorId?`, `from?`, `to?` vào query schema, vẫn `.strict()`)
    - `packages/shared/src/api-domains/audit-log-page.spec.ts` (create hoặc modify nếu đã có)
    - `apps/server/src/modules/settings/repositories/audit-log.repository.ts` (modify: điều kiện lọc trong subquery keyset)
    - `apps/server/src/modules/settings/services/*audit-log*.service.ts` (modify: truyền bộ lọc; xuất CSV dùng cùng bộ lọc)
    - `apps/server/src/modules/settings/controllers/roles.controller.ts` (modify: nhận query; export body nhận bộ lọc)
    - `packages/shared/src/api-domains/export.ts` (modify: kind `audit` nhận bộ lọc tùy chọn, payload cũ vẫn parse)
    - `apps/server/src/modules/export/**` builder `audit` (modify: áp bộ lọc)
    - `packages/db/prisma/schema/system.prisma` + migration `20261118090000_v46_audit_filters/{migration,down}.sql` (create: index `(tag, created_at DESC, id DESC)`, `(actor_id, created_at DESC, id DESC)` — chỉ thêm index, **không** đổi trigger append-only)
    - `apps/admin/src/features/settings/components/audit-log-tab.tsx` (modify: gắn thanh lọc)
    - `apps/admin/src/features/settings/components/audit-log-filters.tsx` (create)
    - `apps/admin/src/features/settings/hooks/use-audit-log.ts` (modify: queryKey có bộ lọc)
    - `apps/admin/messages/vi/settings.json` (modify: nhãn bộ lọc)
    - MSW: handler nhật ký Admin (modify: lọc trên mock)
    - Test: `apps/server/test/settings/audit-log-page.int.spec.ts` (modify: ca lọc), `audit-log-tab.spec.tsx` (modify)
  - **Phần 2 — Gom nhãn vùng (B11)**
    - `packages/shared/src/regions/region-labels.ts` (create: `REGION_LABEL_SHORT` = "Miền Bắc / Miền Trung / Miền Nam", `REGION_LABEL_DIRECTOR` = "Miền Bắc / Miền Trung & Tây Nguyên / Miền Nam")
    - `packages/shared/src/api-domains/regional-directors.ts`, `reports.ts` (modify: re-export / dùng nguồn chung, giữ tên export cũ để không vỡ import)
    - `packages/shared/src/mock-data/domains/overview-conversion.ts` (modify)
    - `apps/server/src/modules/community/domain/region.ts`, `apps/server/src/modules/reporting/conversion.ts` (modify: dùng nguồn chung)
    - `packages/shared/src/regions/region-labels.spec.ts` (create)
  - **Phần 3 — Tìm kiếm chung: phím mũi tên (B13)**
    - `packages/ui/src/global-search/global-search.tsx`, `search-results.tsx`, `hooks/use-search-keyboard.ts` (modify)
    - `packages/ui/src/global-search/global-search.spec.tsx` (modify)
  - **Phần 4 — Nhu cầu phù hợp (B14 phần kỹ thuật)**
    - `apps/server/src/modules/local-business/repositories/need-match.query.ts` (modify: ứng viên ưu tiên cùng ngành **và** cùng tỉnh, SPEC 9)
    - `apps/server/src/modules/local-business/services/need-match.service.ts` (modify: hàm `invalidate(userIds)` dùng chung)
    - `apps/server/src/modules/local-business/services/need-owner.service.ts` (modify: xóa cache khi đóng / xóa nhu cầu, SPEC 10)
    - `apps/server/src/modules/local-business/services/store-owner.service.ts` (modify: xóa cache của chính chủ gian hàng khi lưu gian hàng / sản phẩm)
    - `apps/server/src/modules/local-business/services/need-match-notify.handler.ts` (modify: link thông báo `/needs?q=<tên>`)
    - `apps/portal/src/features/dashboard/components/need-matches-card.tsx` (không đổi trừ khi cần cho link; ghi completion nếu đụng)
    - Test: `apps/server/test/local-business/need-matches.int.spec.ts`, `need-matches-plan.int.spec.ts`, `need-match-notify.int.spec.ts` (modify)
  - **Báo cáo**
    - `coding-packs/reports/TIP-V46-818-completion.md`, `TIP-V46-818-query-plans.md` (create)
    - `coding-packs/reports/V4.6-progress.md` (dòng #18), `coding-packs/plans/V4.6-DEBT.md` (B11 / B13 / B14), `coding-packs/reports/ui-parity/questions.md` (mục TIP-V46-818)
- **Parallel-safe with:** sequential (817 → 818 → 820 → 821, D-139).

## CONTEXT

- Working dir `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-818-admin-log-search` từ `dev` `dee26a97`.
- **Nhật ký hoạt động** (khảo sát 08/11/2026):
  - `GET /v1/admin/settings/audit-logs` (`roles.controller.ts:23-25`), xuất `POST …/audit-logs/export` (`:29`, job `export` kind `audit`).
  - Query schema `audit-log-page.ts:15-35` chỉ `cursor` + `limit`, `.strict()` → **chưa có bộ lọc**.
  - SQL `audit-log.repository.ts:15-25`: cửa sổ 90 ngày `AUDIT_WINDOW_MS`, keyset `(created_at, id) DESC`, deferred join LATERAL.
  - Index hiện có (`system.prisma:26-27`): `(created_at DESC, id DESC)`, `(entity, entity_id, created_at DESC)`. Không có index theo `tag` / `actor_id`.
  - FE `audit-log-tab.tsx` (64 dòng): tiêu đề, Xuất CSV, danh sách (avatar, người + tóm tắt, chip nhóm, thời gian tương đối), "Xem thêm". `AUDIT_TAGS` ở `settings-admin.ts:48`.
  - Prototype (`index.html:5025-5039`, CSV `:6553`) **không có bộ lọc** → bộ lọc là phần thêm theo D-139, đặt gọn trên danh sách, không đổi bố cục còn lại.
  - Lưu giữ: trigger `audit_logs_no_update_delete` / `audit_logs_no_truncate` (migration init `:513-523`), housekeeping không đụng `audit_logs`. D-139 giữ nguyên.
- **Nhãn vùng:** `REGIONAL_LABELS.central = 'Miền Trung & Tây Nguyên'` (`regional-directors.ts:9-13`) dùng ở màn / mail / thông báo GĐ Vùng; "Miền Trung" ở `reports.ts:14-18`, `community/domain/region.ts:5-9`, `reporting/conversion.ts:8`, `regional-directors.ts:14` (`PROVINCE_LABELS`), mock `overview-conversion.ts:19`. Prototype dùng cả hai (`index.html:5958`, `:6100`, `:6188`).
- **Tìm kiếm chung:** `packages/ui/src/global-search/global-search.tsx` dùng chung Portal / Admin; Enter mở kết quả đầu (`:34-38`), Esc xóa (`use-search-keyboard.ts`); **không** có ArrowUp / ArrowDown, không `aria-activedescendant`. Ẩn ≤ 1023px theo BR-491 "Ẩn trên điện thoại".
- **Nhu cầu phù hợp:**
  - `need-match.query.ts:19-31`: ứng viên = cùng ngành **hoặc** cùng tỉnh, `ORDER BY updated_at DESC LIMIT 200` rồi mới chấm điểm → có thể bỏ sót nhu cầu cũ điểm cao khi > 200 ứng viên.
  - Cache `need-matches:{userId}` 60 giây (`need-match.service.ts:18,40`); chỉ xóa khi `need.published` (816, `need-match-notify.handler.ts:47-49`). Không xóa khi đóng / xóa nhu cầu hay khi chủ gian hàng sửa gian hàng / sản phẩm.
  - Thông báo trong app link `/needs` (`handler :43`); thẻ Dashboard "Xem & liên hệ" link `/needs?q=<tên>`.
  - Không có trang chi tiết nhu cầu; chỉ TK doanh nghiệp có gian hàng có gợi ý (BR-480, D-75 / OQ-12).

## APPLICABLE STANDARDS

- [database/query-indexing](../standards/database/query-indexing.md): index "bằng trước, khoảng / sort sau", keyset, deferred join, EXPLAIN.
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md), [backend/auth-rbac](../standards/backend/auth-rbac.md) (quyền `settings.log` giữ nguyên).
- [frontend/data-state](../standards/frontend/data-state.md), [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/ui-parity](../standards/frontend/ui-parity.md) (D-134 tham khảo).
- [testing/testing](../standards/testing/testing.md), [global/code-structure](../standards/global/code-structure.md), [global/git-workflow](../standards/global/git-workflow.md).

## TASK

1. Thêm bộ lọc cho Nhật ký hoạt động Admin (nhóm thao tác, người thực hiện, khoảng ngày trong 90 ngày), áp cho cả danh sách và CSV.
2. Gom các bảng nhãn vùng trùng về một nguồn, giữ nguyên chữ hiển thị.
3. Thêm điều hướng bằng phím mũi tên cho ô tìm kiếm chung (Portal + Admin).
4. Nhu cầu phù hợp: bớt bỏ sót do trần ứng viên, xóa cache đúng lúc, sửa link thông báo.

## SPECIFICATIONS

### Phần 1 — Bộ lọc Nhật ký hoạt động

1. Query thêm (đều tùy chọn): `tag` ∈ `AUDIT_TAGS`; `actorId` (id Admin, 1..200); `from`, `to` (ISO datetime). Ràng buộc: khoảng `[from, to]` bị kẹp vào cửa sổ 90 ngày hiện có (`max(from, now − 90 ngày)`, `min(to, now)`); `from > to` → 400. Cursor giữ nguyên định dạng; đổi bộ lọc thì FE bỏ cursor cũ.
2. SQL: thêm điều kiện vào subquery `SELECT id, created_at … ORDER BY created_at DESC, id DESC LIMIT` (giữ deferred join). Index mới `(tag, created_at DESC, id DESC)` và `(actor_id, created_at DESC, id DESC)`; lọc cả hai cùng lúc dùng một trong hai index rồi lọc phần còn lại (chấp nhận; ghi EXPLAIN). Không lọc theo văn bản tự do trong `summary` (Q-V46-818-2).
3. Danh sách người thực hiện cho ô chọn: lấy từ danh sách Admin sẵn có (`settings.admins` / directory đã dùng ở màn Tài khoản quản trị), **không** query `DISTINCT actor_id` trên `audit_logs`. Thao tác hệ thống (`actor_id IS NULL`) có lựa chọn "Hệ thống" (`actorId=system` map sang `IS NULL`).
4. Xuất CSV dùng đúng bộ lọc đang chọn; payload export kind `audit` thêm `filters` tùy chọn — job cũ không có `filters` vẫn chạy như trước. Audit `audit.export` (hoặc mã hiện có) ghi kèm bộ lọc.
5. FE: thanh lọc gọn trên danh sách: Select "Nhóm" (Tất cả + `AUDIT_TAGS` với nhãn chip hiện có), Select "Người thực hiện" (có tìm), RangePicker (giới hạn 90 ngày, giờ VN), nút "Xóa lọc" khi có lọc. Đổi lọc → tải lại trang đầu. Rỗng → "Không có thao tác phù hợp". Mobile 390: các ô xếp dọc, không tràn ngang.
6. Không đổi: cửa sổ 90 ngày, append-only, không purge (D-139), quyền `settings.log`.

### Phần 2 — Gom nhãn vùng

7. Tạo `packages/shared/src/regions/region-labels.ts` là nguồn duy nhất: `REGION_LABEL_SHORT` (Bắc / Trung / Nam) và `REGION_LABEL_DIRECTOR` (… "Miền Trung & Tây Nguyên" …). Các hằng cũ (`REGIONAL_LABELS`, `PROVINCE_LABELS`, `REPORT_REGION_LABEL`, map trong `community/domain/region.ts`, `reporting/conversion.ts`, mock) trỏ về nguồn chung (giữ tên export để không lan sửa import). **Chuỗi hiển thị không đổi ở bất kỳ màn / mail / CSV nào** (Q-V46-818-1). Test snapshot hai bảng nhãn.

### Phần 3 — Phím mũi tên tìm kiếm

8. Khi dropdown mở: ArrowDown / ArrowUp di chuyển dòng đang chọn qua mọi nhóm (vòng đầu ↔ cuối), Enter mở dòng đang chọn (chưa chọn → kết quả đầu như hiện nay), Esc giữ nguyên. Ô nhập có `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; dòng có `role="option"` + `aria-selected`; dòng chọn có nền nhấn nhẹ theo token AntD. Kết quả mới về → bỏ chọn. Rê chuột cập nhật dòng chọn. **Không** bật tìm kiếm trên mobile, không "Xem tất cả", không thêm nhóm (BR-491; Q-V46-818-3).

### Phần 4 — Nhu cầu phù hợp

9. **Ứng viên:** thay một truy vấn `LIMIT 200` bằng hai nhánh gộp (`UNION ALL` + khử trùng id): (a) cùng ngành **và** cùng tỉnh — tối đa 200 mới nhất; (b) cùng ngành **hoặc** cùng tỉnh — tối đa 200 mới nhất. Chấm điểm trên tập ≤ 400 như cũ (`selectNeedMatches`, BR-478, top 3). Mục tiêu: nhu cầu khớp cả ngành và tỉnh (≥ 80 điểm) không bị đẩy khỏi tập bởi nhu cầu chỉ khớp một tiêu chí. Giữ deferred join; EXPLAIN cả hai nhánh (Q-V46-818-4).
10. **Xóa cache** `need-matches:{userId}` (hàm `invalidate` dùng chung, `DEL` nhiều khóa một lệnh):
    - chủ gian hàng lưu gian hàng hoặc sản phẩm → xóa khóa của chính họ (sau commit);
    - nhu cầu **đóng / xóa** → xóa cho tập người nhận như `need.published` (dùng lại truy vấn audience của 816, qua outbox `need.unpublished { needId }` để không chặn thao tác); sửa nội dung nhu cầu hiện không có API nên bỏ qua.
    - TTL 60 giây giữ nguyên làm lưới an toàn.
11. **Link thông báo** "Nhu cầu phù hợp với gian hàng của bạn" → `/needs?q=<tên nhu cầu>` (mã hóa URL), giống nút trên thẻ Dashboard. Không tạo trang chi tiết (Q-V46-818-5).
12. Không mở gợi ý cho TK cá nhân / nhà đầu tư (BR-480, D-75; Q-V46-818-6).

### Validation

- Query nhật ký parse zod (`tag` enum, `actorId` 1..200 hoặc `system`, ngày ISO). Sai → 400 mã lỗi chung.
- Outbox `need.unpublished` payload zod trong `packages/shared/src/outbox/events.ts`.

### Error Handling

| Trường hợp | Xử lý |
|---|---|
| `from > to` / ngày sai định dạng | 400 |
| Khoảng ngày ngoài 90 ngày | Kẹp vào cửa sổ, không lỗi |
| Redis lỗi khi xóa cache nhu cầu | Log warn, không làm hỏng thao tác chính; TTL 60 giây tự hết |
| Job export cũ không có `filters` | Chạy như trước |

## ACCEPTANCE CRITERIA

- **Lọc nhật ký:** Given 3 Admin, 4 nhóm thao tác, dữ liệu trải 100 ngày When lọc `tag=member&actorId=<A>&from=<30 ngày trước>` Then chỉ đúng dòng của A nhóm Thành viên trong 30 ngày, keyset trang 2 không trùng / sót; dòng > 90 ngày không bao giờ hiện; `actorId=system` trả dòng `actor_id IS NULL`. Test: `audit-log-page.int.spec.ts` › `filters by tag actor and range inside the 90-day window`.
- **CSV theo bộ lọc:** Given bộ lọc trên When xuất CSV Then file chỉ có các dòng đó; job export cũ không `filters` vẫn xuất đủ. Test: cùng file › `export applies filters and old payload still works`.
- **Append-only:** `audit-retention.int.spec.ts` không đổi và vẫn xanh (không purge).
- **FE lọc:** Given Admin mở Nhật ký When chọn Nhóm + Người + khoảng ngày Then danh sách tải lại trang đầu, "Xóa lọc" trả về toàn bộ; 390 px không tràn ngang. Test: `audit-log-tab.spec.tsx`; e2e MSW mở rộng ca nhật ký hiện có.
- **Nhãn vùng:** Given mọi màn / mail / CSV dùng nhãn vùng Then chuỗi giống hệt trước khi sửa; `region-labels.spec.ts` khóa hai bảng nhãn; `rg` không còn map nhãn vùng định nghĩa lại ngoài nguồn chung (trừ re-export).
- **Phím mũi tên:** Given dropdown có 2 nhóm × 2 dòng When ArrowDown ×3 rồi Enter Then mở dòng thứ 3; ArrowUp ở dòng đầu về dòng cuối; `aria-activedescendant` đúng id. Test: `global-search.spec.tsx`.
- **Ứng viên nhu cầu:** Given 250 nhu cầu mới chỉ cùng tỉnh và 1 nhu cầu cũ cùng ngành + tỉnh Then nhu cầu cũ có trong top 3. Test: `need-matches.int.spec.ts` › `same field and province need survives candidate cap`.
- **Cache:** Given gợi ý đã cache When nhu cầu đó đóng / xóa, hoặc chủ gian hàng đổi ngành Then lần đọc kế tiếp phản ánh ngay (không chờ 60 giây). Test: `need-matches.int.spec.ts` › `invalidates on close delete and store edit`.
- **Link thông báo:** thông báo `need` có link `/needs?q=<tên>` đã mã hóa. Test: `need-match-notify.int.spec.ts`.
- **Không hồi quy:** int search / need-matches-plan / audit / reporting / regional xanh.

## CONSTRAINTS

- DO NOT:
  - xóa / sửa `audit_logs`, nới trigger append-only, thêm bước housekeeping cho `audit_logs` (D-139)
  - đổi chuỗi nhãn vùng đang hiển thị
  - bật tìm kiếm trên mobile, thêm "Xem tất cả" / nhóm mới / tìm theo SĐT (BR-491, D-136 Q808-3)
  - tạo trang chi tiết nhu cầu, mở gợi ý cho TK cá nhân / nhà đầu tư
  - query `DISTINCT actor_id` trên `audit_logs`; query trong vòng lặp
  - sửa thanh tab Cài đặt (B16 đã đóng)
  - release `main` (D-139)
- REUSE: `auditLogPageQuery` deferred join, module `export` + `useExportJob`, `AUDIT_TAGS` + nhãn chip, danh sách Admin sẵn có, `selectNeedMatches` / `scoreNeedMatch`, truy vấn audience 816, outbox.
- SKIP:
  - soát 9 bản dịch AI (việc tay của owner, D-65 / D-139)
  - chu kỳ 15 giây tự mở khóa (D-127 / D-139)
  - B13: mobile, "Xem tất cả", nhóm sự kiện / dịch vụ / nhà đầu tư, SĐT; B14: trang chi tiết, TK cá nhân / nhà đầu tư — **đóng theo D-139** (owner chốt mặc định an toàn 08/11/2026), không làm
  - B15 (820), B7 → B10 (821)

## Câu hỏi — **đã chốt theo mặc định** (owner, 08/11/2026: "ok chốt mặc định"; ghi `questions.md` › TIP-V46-818)

- **Q-V46-818-1 Nhãn vùng.** Mặc định: giữ hai chữ như prototype (GĐ Vùng "Miền Trung & Tây Nguyên", báo cáo "Miền Trung"), chỉ gom về một nguồn.
- **Q-V46-818-2 Lọc nhật ký theo từ khóa.** Mặc định: không (chỉ nhóm / người / ngày). Tìm văn bản tự do cần index trigram trên bảng append-only lớn dần, để sau.
- **Q-V46-818-3 Tìm kiếm.** Mặc định: chỉ thêm phím mũi tên; giữ BR-491 (ẩn trên điện thoại, 4 kết quả / nhóm, 5 nhóm, không SĐT).
- **Q-V46-818-4 Trần ứng viên nhu cầu.** Mặc định: hai nhánh 200 + 200 (khớp cả hai tiêu chí ưu tiên), không chấm điểm trong SQL.
- **Q-V46-818-5 Trang chi tiết nhu cầu.** Mặc định: không làm; link thông báo về danh sách lọc theo tên như thẻ Dashboard.
- **Q-V46-818-6 Gợi ý cho TK cá nhân / nhà đầu tư.** Mặc định: không (BR-480 — không có gian hàng để chấm điểm).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-818-admin-log-search`; chỉ sửa file trong **Files touched** (ngoài danh sách ghi lý do trong completion).
- [ ] Migration chỉ thêm index, có `down.sql`; up → down → up trên DB test riêng owner đã duyệt; trigger append-only không đổi.
- [ ] EXPLAIN (ANALYZE) nhật ký: không lọc / lọc `tag` / lọc `actorId` / lọc cả hai + khoảng ngày; ứng viên nhu cầu hai nhánh — ghi `TIP-V46-818-query-plans.md`.
- [ ] Mọi AC có test PASS, ghi tên test + kết quả từng cái.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; e2e MSW không tụt; chép output thật.
- [ ] Luật liên quan:
  - **Luật 5:** index "bằng trước, sort sau", keyset + deferred join, không query trong vòng lặp
  - **Luật 10:** xuất nhật ký vẫn ghi audit kèm bộ lọc
  - **REQ-213:** `audit_logs` append-only, không xóa
- [ ] Trần file BE 600 / FE 400; không `any` / `@ts-ignore` / `console.*`.
- [ ] Ghi Q-V46-818-1 → 6 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #18, `V4.6-DEBT.md` B11 / B13 / B14.
- [ ] Commit `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`; không tự merge; **không** mở PR release `main`. Completion có **git commit SHA**.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched mức file (tên service nhật ký / builder export dạng mẫu glob — builder xác nhận file thật, ghi completion)
- [x] Context có dòng code hiện trạng cho cả 4 phần; prototype không có bộ lọc / phím mũi tên
- [x] SPEC 1 → 12; validation; bảng lỗi
- [x] AC Given / When / Then có tên test
- [x] Constraints trích D-139 / REQ-213 / BR-491 / BR-480
- [x] Parallel: sequential trong đợt 817 → 821
- ⚠️ Gap:
  - Bộ lọc nhật ký và phím mũi tên vượt prototype; không có ảnh đối chiếu, owner duyệt ảnh trong PR (D-134).
  - Hai nhánh ứng viên vẫn có thể bỏ sót khi một ngành + tỉnh có > 200 nhu cầu mở cùng lúc; chấp nhận theo Q-V46-818-4.
  - B13 / B14 phần đổi nghiệp vụ (mobile, "Xem tất cả", trang chi tiết, TK cá nhân) đã đóng theo D-139; muốn làm cần D-xx mới.
