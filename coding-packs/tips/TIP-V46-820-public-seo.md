# TIP-V46-820: SEO trang công khai gian hàng — sitemap, robots, JSON-LD, ảnh OG, lượt khách, xóa cache kịp thời (B15)

## HEADER

- TIP-ID: TIP-V46-820
- Project: OPCHUB
- Module: Portal `app/(public)/g/[slug]`, `app/sitemap.ts`, `app/robots.ts`; server `modules/local-business` (trang công khai, lượt xem); handler phí / khóa TK
- Priority: P2
- Depends on: V46-818 (đã vào `dev`). D-139. **Không release `main`** sau TIP này (release một lượt sau 821).
- Estimated: M
- REQ / D:
  - **D-139** (820 = B15)
  - REQ-627, BR-494 / TC-494 (trang công khai `opchub.community/g/<slug>`, bật / tắt hiện trên Google, tiêu đề / mô tả ≤ 160)
  - D-136 › Q-V46-810-1 → 6 (slug không đổi khi đổi tên; khách xem không tăng KPI; tiêu đề SEO ≤ 70)
  - **Q-V46-820-1 → 7** (cuối file)
- **Files touched:**
  - **Portal**
    - `apps/portal/src/app/sitemap.ts` (create: `/g/<slug>` đủ điều kiện + `/huong-dan`)
    - `apps/portal/src/app/robots.ts` (create)
    - `apps/portal/src/app/(public)/g/[slug]/page.tsx` (modify: JSON-LD, OG đủ kích thước, Twitter card)
    - `apps/portal/src/app/(public)/g/[slug]/opengraph-image.tsx` (create: ảnh OG sinh tại server bằng `next/og`)
    - `apps/portal/src/app/(public)/g/[slug]/store-json-ld.tsx` (create: component `<script type="application/ld+json">`)
    - `apps/portal/src/app/(public)/g/[slug]/guest-view-beacon.tsx` (create: client component gửi lượt khách)
    - `apps/portal/src/lib/server-api.ts` (modify: gọi API sitemap)
    - `apps/portal/src/features/stores/components/dashboard/dash-cards.tsx` (modify: thêm số "Lượt khách xem trang công khai 7 ngày" tách riêng)
    - `apps/portal/messages/*/` khóa mới (modify, 10 ngôn ngữ)
    - MSW handler (modify)
  - **Shared**
    - `packages/shared/src/api-domains/store-public.ts` (modify: schema sitemap item, guest view body, field `guestViews7d` trong dashboard)
    - `packages/shared/src/seo/store-json-ld.ts` (create: hàm dựng JSON-LD thuần, dùng ở Portal + test)
  - **Server — local-business**
    - `controllers/store-public.controller.ts` (modify: `GET /v1/public/stores-sitemap`, `POST /v1/public/stores/:slug/view`)
    - `services/store-public.service.ts` (modify: `invalidateOwner(userIds)` xóa cache theo chủ gian hàng; sitemap)
    - `repositories/store-public.repository.ts` (modify: truy vấn sitemap keyset, slug theo `owner_id`)
    - `repositories/store-guest-view.repository.ts` (create: ghi lượt khách theo ngày)
    - `services/store-guest-view.service.ts` (create: chống trùng + lọc bot)
    - `services/store-dashboard.service.ts` + `repositories/store-views.query.ts` (modify: trả `guestViews7d`)
    - `services/store-public-invalidation.handler.ts` (create: nghe outbox phí / khóa TK / xóa TK → xóa cache)
    - `local-business-core.module.ts`, `index.ts` (modify: nối)
  - **Server — điểm phát sự kiện** (chỉ nối, không đổi nghiệp vụ): xác nhận `membership_fee.changed` / `user.locked` / sự kiện xóa TK hiện có được phát đúng lúc; nếu xóa TK chưa có outbox thì thêm `user.deleted { userId }` trong cùng transaction xóa (ghi completion file thật).
  - **DB**
    - `packages/db/prisma/schema/local-business.prisma` + migration `20261119090000_v46_store_guest_views/{migration,down}.sql` (create: `store_daily_guest_views (store_id, day, views)` PK `(store_id, day)`; index sitemap `stores (updated_at DESC, id)` WHERE `status = 'published' AND seo_index` nếu EXPLAIN cần)
  - **Hạ tầng (chỉ file cấu hình, không chạy trên VPS)**
    - `infra/nginx/app.opchub.community.conf` (modify: `X-Robots-Tag: noindex` cho host `app.opchub.community`, Q-V46-820-2) — chỉ khi xác nhận host này là bản sao Portal
  - **Test**
    - `apps/server/test/local-business/store-sitemap.int.spec.ts`, `store-guest-view.int.spec.ts`, `store-public-invalidation.int.spec.ts` (create)
    - `packages/shared/src/seo/store-json-ld.spec.ts` (create)
    - Portal unit: `sitemap` / `robots` / `opengraph-image` / beacon (create)
    - e2e MSW: mở rộng ca trang công khai hiện có (kiểm meta, JSON-LD, robots, sitemap)
  - **Báo cáo**
    - `coding-packs/reports/TIP-V46-820-completion.md`, `TIP-V46-820-query-plans.md` (create)
    - `coding-packs/reports/V4.6-progress.md` (dòng #19), `coding-packs/plans/V4.6-DEBT.md` (B15), `coding-packs/reports/ui-parity/questions.md` (mục TIP-V46-820)
- **Parallel-safe with:** sequential (817 → 818 → 820 → 821, D-139).

## CONTEXT

- Working dir `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-820-public-seo` từ `dev` `1b5a28e6`.
- **Trang công khai hiện tại** (`apps/portal/src/app/(public)/g/[slug]/page.tsx`):
  - `dynamic = 'force-dynamic'`; `generateMetadata` (`:11-33`): title / description từ `s.seo`, `robots: { index: s.seo.index, follow: s.seo.index }`, canonical `${PORTAL_URL}/g/${slug}`, openGraph (title, description, url, `website`, `vi_VN`, ảnh = `coverUrl ?? logoUrl`, không kích thước), không Twitter card, không JSON-LD.
  - Layout gốc Portal noindex toàn bộ (`app/layout.tsx:12-17`); `/g/` ghi đè. Chưa có `sitemap.ts` / `robots.ts`. Không middleware. `/` chuyển hướng `/dashboard`.
  - Dữ liệu: `server-api.ts:8-32` gọi `GET ${API_INTERNAL_URL}/public/stores/:slug` (`no-store`, timeout 5 giây). API `store-public.controller.ts:6-15` (`@Public`, throttle 60 / phút, `Cache-Control: public, max-age=60`), service `store-public.service.ts:53-87` cache Redis `store-public:{slug}` 60 giây; xóa cache khi chủ sửa SEO / gian hàng / xuất bản / gỡ, Admin ẩn. Điều kiện hiện: `visibleStoreSql` (published, chủ chưa xóa, phí còn hiệu lực).
  - **Vì sao trễ 60 giây:** phí hết hạn theo thời gian, xóa TK, thu hồi phí **không** xóa cache → trang còn hiện tới hết TTL.
- **Slug:** `stores.slug` unique, sinh khi tạo (`allocateStoreSlug`, ≤ 60 ký tự), chủ không đổi được, không có bảng lịch sử slug. D-136: slug không đổi khi đổi tên.
- **Lượt xem:** `store_daily_views` + `stores.view_count`, chỉ ghi từ trang chi tiết trong app khi người xem không phải chủ (`store-explore.service.ts:58-59`); không chống trùng, không lọc bot. `/g/` **không** tính (D-136 Q-810-3). Dashboard 7 ngày + tổng hợp 08:05 đọc bảng này.
- **Trang công khai khác:** chỉ `/g/*` và `/huong-dan`; dự án / sự kiện / nhu cầu / nhóm cần đăng nhập (D-139 đóng trang khách).
- **Env / nginx:** `PORTAL_URL=https://opchub.community`. `infra/nginx/opchub.conf:129-138` proxy `/` → Portal, không `proxy_cache`; `:220-221` dặn không gắn `X-Robots-Tag: noindex` cho `/g/`. Host `app.opchub.community` (`app.opchub.community.conf:149,160`) cũng phục vụ Portal → nguồn trùng nội dung, hiện chỉ dựa canonical.
- **Prototype** (`index.html:2008-2010`, `_ops().pub` `:6549-6552`): card "Trang công khai" — "Xem như khách", "Sao chép link", "Hiển thị trên Google"; link `opchub.community/g/<slug>`; tiêu đề mặc định `{name} – {field} tại {prov}`, mô tả ≤ 160. Prototype **không có** sửa slug, ảnh OG, sitemap, lượt khách riêng.
- Đặc tả `dac-ta.html:244` BR-494 / `:246` TC-494; không có BR cho sitemap / OG / slug / định nghĩa lượt xem.

## APPLICABLE STANDARDS

- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md), [frontend/routing-auth](../standards/frontend/routing-auth.md) (route công khai), [frontend/data-state](../standards/frontend/data-state.md).
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) (outbox, handler idempotent).
- [database/query-indexing](../standards/database/query-indexing.md) (keyset sitemap, upsert theo ngày, EXPLAIN).
- [security/security](../standards/security/security.md) (endpoint công khai: throttle, không lộ dữ liệu ẩn; không lưu IP thô).
- [testing/testing](../standards/testing/testing.md), [global/code-structure](../standards/global/code-structure.md), [global/git-workflow](../standards/global/git-workflow.md).

## TASK

Hoàn thiện SEO cho trang công khai gian hàng `/g/<slug>`: `sitemap.xml` + `robots.txt`, dữ liệu có cấu trúc JSON-LD, ảnh chia sẻ (OG) sinh tại server, đếm lượt khách xem trang công khai **tách riêng** khỏi KPI hiện có, và xóa cache ngay khi phí đổi / TK bị khóa / xóa để trang không còn hiện tới 60 giây. Slug giữ nguyên chính sách D-136 (không cho sửa).

## SPECIFICATIONS

### Sitemap & robots

1. `GET /v1/public/stores-sitemap?cursor` (`@Public`, throttle như trang công khai): trả `{ items: [{ slug, updatedAt }], nextCursor }` cho gian hàng **thỏa `visibleStoreSql` và `seo_index = true`**, keyset `(updated_at DESC, id)`, 1.000 / trang, chỉ cột cần. Cache Redis 10 phút, xóa khi một gian hàng đổi `seo_index` / xuất bản / gỡ / bị ẩn (dùng chung điểm xóa cache trang công khai).
2. `app/sitemap.ts` (Next): gom các trang API (tối đa 50.000 URL — vượt thì dùng `generateSitemaps` chia file), thêm `${PORTAL_URL}/huong-dan`. URL tuyệt đối theo `PORTAL_URL`; `lastModified` = `updatedAt`. Revalidate 1 giờ. API lỗi → trả sitemap chỉ có `/huong-dan` (không 500).
3. `app/robots.ts`: `Allow: /g/`, `Allow: /huong-dan`; `Disallow` mọi đường app còn lại (`/dashboard`, `/stores`, `/needs`, `/projects`, `/chat`, `/profile`, `/login`, `/register`, `/r/`, `/sso/`, `/unsubscribe`, `/v1/`…); `Sitemap: ${PORTAL_URL}/sitemap.xml`. Trên host khác `PORTAL_URL` (vd. `app.opchub.community`) trả `Disallow: /` (đọc host từ header, Q-V46-820-2).

### JSON-LD & ảnh OG

4. Trang `/g/<slug>` đang `index = true` chèn một `<script type="application/ld+json">` kiểu **`LocalBusiness`** (Q-V46-820-3): `name`, `description` (mô tả SEO), `url` (canonical), `image` (ảnh OG), `address` (`addressRegion` = tỉnh, `addressCountry` = `VN`), `telephone` / `email` **chỉ khi trang đã hiển thị công khai các trường này** (Q-810-5), `sameAs` = link mạng xã hội đang hiện. Không thêm đánh giá / giá / giờ mở cửa. JSON được escape `<` để không chèn script. Trang `noindex` không chèn JSON-LD.
5. `opengraph-image.tsx` (`next/og`, 1200 × 630, PNG): nền màu thương hiệu (token sẵn có của Portal), logo gian hàng nếu có (tải qua URL storage nội bộ, timeout 3 giây, lỗi thì bỏ), tên gian hàng (cắt 60 ký tự), "{ngành} · {tỉnh}", chữ "opchub.community". Font: dùng font đã có trong repo hỗ trợ tiếng Việt (không tải font từ dịch vụ ngoài lúc chạy; nếu repo chưa có, đóng gói file font giấy phép mở và ghi lý do). Ưu tiên: ảnh bìa có sẵn vẫn dùng nếu chủ đã tải lên (Q-V46-820-4) — `opengraph-image` chỉ là ảnh mặc định khi **không có** ảnh bìa. Metadata OG có `width` / `height` / `alt`; thêm `twitter: { card: 'summary_large_image' }`.
6. Gian hàng không hiện (ẩn / hết phí / không tồn tại) → `opengraph-image` trả 404, không lộ tên.

### Lượt khách xem trang công khai

7. `guest-view-beacon.tsx` (client, chỉ trên `/g/` khi trang hiện): sau khi trang hiển thị, gửi **một** `POST /v1/public/stores/:slug/view` (dùng `navigator.sendBeacon`, rơi về `fetch keepalive`). Không gửi khi trình duyệt báo `navigator.webdriver`, khi đang ở chế độ "Xem như khách" của chính chủ (đã đăng nhập là chủ → server bỏ qua).
8. Server `store-guest-view.service`:
   - Bỏ qua User-Agent khớp danh sách bot thông dụng (googlebot, bingbot, facebookexternalhit, zalo, crawler, spider, bot, headless…), UA rỗng, chủ gian hàng (nếu có phiên).
   - Chống trùng 30 phút theo `hash(ip + UA + slug)` — chỉ lưu **băm** SHA-256 có muối trong Redis `SET NX EX 1800`, không lưu IP thô (Q-V46-820-5).
   - Ghi `store_daily_guest_views (store_id, day theo giờ VN)` bằng upsert `views = views + 1`. **Không** đụng `stores.view_count` / `store_daily_views` (giữ D-136 Q-810-3).
   - Throttle endpoint 30 / phút / IP; gian hàng không hiện → 204 không ghi.
9. Dashboard gian hàng: thêm số "Lượt khách xem trang công khai (7 ngày)" cạnh KPI "Lượt xem gian hàng" hiện có (không cộng vào). Tổng hợp 08:05 và push **không đổi** (Q-V46-820-6).

### Xóa cache kịp thời (hết trễ 60 giây)

10. `store-public-invalidation.handler` nghe outbox: `membership_fee.changed` (gồm hết hạn từ job `feeStatus` 08:00 và thu hồi), `user.locked`, xóa TK (sự kiện hiện có hoặc `user.deleted` mới). Lấy slug gian hàng theo `owner_id` (một truy vấn, nhiều userId một lần) → `DEL store-public:{slug}` + xóa cache sitemap. Handler idempotent.
11. Kiểm chứng phí hết hạn có phát `membership_fee.changed` trong cùng transaction đổi trạng thái; nếu job phí đổi trạng thái hàng loạt mà không phát sự kiện từng người, handler nhận một sự kiện tổng (`membership_fee.expired_batch { userIds }` qua outbox, chia lô 500) — builder chọn theo code hiện có, ghi completion.
12. Giữ TTL 60 giây và `Cache-Control: public, max-age=60` làm lưới an toàn (Q-V46-820-7). Trễ còn lại tối đa = thời gian xử lý outbox (vài giây) + `max-age` của trình duyệt / proxy đã nhận trước đó.

### Slug

13. **Không** cho chủ sửa slug, **không** bảng chuyển hướng (Q-V46-820-1, giữ D-136). Chỉ đảm bảo slug trong sitemap / canonical / JSON-LD / OG nhất quán.

### Validation

- `cursor` sitemap base64url; `slug` theo `storePublicSlugSchema`; body view rỗng (không nhận dữ liệu từ client ngoài slug trong URL).
- JSON-LD dựng từ dữ liệu đã qua schema công khai, escape an toàn.

### Error Handling

| Trường hợp | Xử lý |
|---|---|
| API sitemap lỗi / timeout | Sitemap chỉ có `/huong-dan`, log warn |
| Logo OG tải lỗi / chậm | Bỏ logo, vẫn trả ảnh |
| Gian hàng không hiện | Trang 404 noindex như hiện nay; OG 404; view 204 không ghi |
| Redis lỗi khi chống trùng | Không ghi lượt (an toàn chống thổi số), log warn |
| Outbox giao lại | Handler xóa cache lần nữa, vô hại |

## ACCEPTANCE CRITERIA

- **Sitemap:** Given gian hàng A (hiện, `seo_index` bật), B (`seo_index` tắt), C (hết phí), D (Admin ẩn) When gọi `/sitemap.xml` Then chỉ có `/g/<A>` và `/huong-dan`, URL tuyệt đối `PORTAL_URL`; 1.001 gian hàng đủ điều kiện → keyset 2 trang không trùng / sót. Test: `store-sitemap.int.spec.ts`; Portal unit `sitemap`.
- **Robots:** `/robots.txt` trên `PORTAL_URL` có `Allow: /g/`, `Disallow: /dashboard`, dòng `Sitemap:`; trên host khác trả `Disallow: /`. Test: Portal unit `robots`.
- **JSON-LD:** Given A công khai SĐT, không công khai email Then JSON-LD `LocalBusiness` có `telephone`, không có `email`; tên chứa `</script>` vẫn an toàn; trang `noindex` không có JSON-LD. Test: `store-json-ld.spec.ts`; e2e MSW trang công khai.
- **Ảnh OG:** Given gian hàng không có ảnh bìa When mở `/g/<slug>/opengraph-image` Then PNG 1200 × 630; có ảnh bìa → meta `og:image` là ảnh bìa; gian hàng ẩn → 404. Test: Portal unit `opengraph-image` (kiểm header / kích thước), e2e meta.
- **Lượt khách:** Given khách mở `/g/<A>` 3 lần trong 10 phút cùng IP + UA Then `store_daily_guest_views` +1; UA `Googlebot` → không ghi; chủ đăng nhập xem → không ghi; `stores.view_count` không đổi. Dashboard hiện "Lượt khách xem trang công khai (7 ngày)". Test: `store-guest-view.int.spec.ts`.
- **Hết trễ 60 giây:** Given trang A đang cache When phí của chủ chuyển hết hạn / chủ bị khóa / xóa TK Then lần gọi API kế tiếp (sau khi outbox xử lý) trả 404, sitemap không còn A — không chờ 60 giây. Test: `store-public-invalidation.int.spec.ts` (3 ca).
- **Không hồi quy:** int trang công khai 810, dashboard gian hàng, store digest, need-matches xanh; `seo_index` tắt vẫn noindex như TC-494.

## CONSTRAINTS

- DO NOT:
  - cho sửa slug / thêm bảng chuyển hướng (D-136, Q-V46-820-1)
  - cộng lượt khách vào `view_count` / `store_daily_views` / tổng hợp / push (D-136 Q-810-3)
  - lưu IP thô; gọi dịch vụ phân tích ngoài (Google Analytics…), font / ảnh từ CDN ngoài lúc chạy
  - đưa trang cần đăng nhập vào sitemap; gắn `X-Robots-Tag: noindex` cho `/g/` trên host chính
  - thêm JSON-LD đánh giá / giá giả
  - query trong vòng lặp; vượt trần file
  - release `main` (D-139)
- REUSE: `visibleStoreSql`, cache `store-public:{slug}` + điểm xóa sẵn có, `storePublicSlugSchema`, `PORTAL_URL` env, outbox + handler mẫu, `store-views.query.ts`, token màu Portal.
- SKIP:
  - trang khách cho dự án / sự kiện / nhu cầu / nhóm (D-139 đóng)
  - sửa slug + chuyển hướng (giữ D-136)
  - thống kê nguồn truy cập (referrer), khách duy nhất dài hạn, biểu đồ lượt khách
  - B7 → B10 (821)

## Câu hỏi — **đã chốt theo mặc định** (owner, 08/11/2026: "chốt như mặc định"; ghi `questions.md` › TIP-V46-820)

- **Q-V46-820-1 Sửa slug.** Mặc định: **không** cho sửa, không chuyển hướng (giữ D-136: slug cố định từ lúc tạo). Lý do: link đã chia sẻ không bao giờ gãy.
- **Q-V46-820-2 Host `app.opchub.community`.** Mặc định: chặn index trên host này (`robots` `Disallow: /` + `X-Robots-Tag: noindex`), chỉ `opchub.community` được Google index.
- **Q-V46-820-3 Kiểu JSON-LD.** Mặc định: `LocalBusiness`, chỉ trường đang hiện công khai trên trang.
- **Q-V46-820-4 Ảnh chia sẻ.** Mặc định: có ảnh bìa thì dùng ảnh bìa; không có thì ảnh tự sinh (logo + tên + ngành · tỉnh, màu thương hiệu, 1200 × 630).
- **Q-V46-820-5 Định nghĩa lượt khách.** Mặc định: một lượt / người (IP + trình duyệt, băm) / gian hàng / 30 phút; bỏ bot và chính chủ.
- **Q-V46-820-6 Lượt khách hiện ở đâu.** Mặc định: chỉ một số riêng trên dashboard gian hàng (7 ngày); không cộng vào KPI "Lượt xem gian hàng", không vào tổng hợp 08:05 / push.
- **Q-V46-820-7 Cache 60 giây.** Mặc định: giữ TTL 60 giây làm lưới an toàn nhưng xóa cache ngay khi phí đổi / khóa / xóa TK.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-820-public-seo`; chỉ sửa file trong **Files touched** (điểm phát sự kiện xóa TK ghi file thật trong completion).
- [ ] Migration `--create-only`, sửa SQL tay, có `down.sql`; up → down → up trên DB test riêng owner đã duyệt (kiểm `TEST_DATABASE_URL` trỏ đúng DB riêng trước khi chạy int — bài học 818).
- [ ] EXPLAIN truy vấn sitemap (keyset) và slug theo nhiều `owner_id` — ghi `TIP-V46-820-query-plans.md`.
- [ ] Mọi AC có test PASS, ghi tên test + kết quả từng cái.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; e2e MSW không tụt; chép output thật.
- [ ] Luật liên quan:
  - **Luật 2:** body / query endpoint công khai parse zod trong `packages/shared`
  - **Luật 8:** xóa cache theo phí / khóa / xóa TK đi qua outbox, handler idempotent
  - **Luật 11 / bảo mật:** không dịch vụ phân tích / font / ảnh ngoài lúc chạy; không lưu IP thô
- [ ] Trần file BE 600 / FE 400; không `any` / `@ts-ignore` / `console.*`.
- [ ] Ghi Q-V46-820-1 → 7 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #19, `V4.6-DEBT.md` B15.
- [ ] Commit `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`; không tự merge; **không** mở PR release `main`. Completion có **git commit SHA**.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched mức file (điểm phát xóa TK cần builder xác nhận file thật)
- [x] Context: trang `/g/` hiện tại, nguyên nhân trễ 60 giây, slug, lượt xem, nginx / host trùng
- [x] SPEC 1 → 13; validation; bảng lỗi
- [x] AC Given / When / Then có tên test
- [x] Constraints trích D-136 / D-139 / luật 2 / 8 / 11
- [x] Parallel: sequential trong đợt 817 → 821
- ⚠️ Gap:
  - Prototype / đặc tả không có sitemap, OG, lượt khách riêng → phần thêm theo B15; owner duyệt ảnh OG trong PR (D-134).
  - Trình duyệt / proxy đã nhận `max-age=60` vẫn có thể giữ bản cũ tối đa 60 giây — chấp nhận (Q-V46-820-7).
  - Lọc bot theo User-Agent không chặn được bot giả mạo; chấp nhận cho một số tham khảo.
