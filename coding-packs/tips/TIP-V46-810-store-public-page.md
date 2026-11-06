# TIP-V46-810: Trang công khai gian hàng `/g/<slug>` + khối "Trang công khai" (BR-494)

## HEADER

- TIP-ID: TIP-V46-810
- Project: OPCHUB
- Module: local-business (slug, cấu hình SEO, endpoint công khai), Portal stores (khối "Trang công khai", trang khách `/g/[slug]`)
- Priority: P2
- Depends on: none về nghiệp vụ; chạy sau 809 theo thứ tự GOAL (`dev` `b5e12ac0`)
- Estimated: L
- REQ / D: REQ-627 · BR-494, TC-494 · D-89 / D-93 (prototype thắng), D-95 (nút prototype làm theo nghiệp vụ), D-75 / OQ-12 (TK Doanh nghiệp, 1 gian hàng), D-65 (Portal 10 bộ ngôn ngữ), D-134 (parity tham khảo) · **Q-V46-810-1 → 6** (cuối file, phương án mặc định chờ owner chốt)
- **Files touched:**
  - DB
    - `packages/db/prisma/schema/local-business.prisma` (modify): `Store` thêm `slug String? @unique`, `seoIndex Boolean @default(true) @map("seo_index")`, `seoTitle String @default("") @map("seo_title")`, `seoDesc String @default("") @map("seo_desc")`
    - `packages/db/prisma/migrations/20261112090000_v46_store_public_page/{migration,down}.sql` (create): 4 cột, backfill slug, `CHECK (char_length(seo_desc) <= 160)`, `CHECK (char_length(seo_title) <= 70)`, `CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`, unique index
    - `packages/db/seed/demo/stores.ts` (modify): slug theo tên cho gian hàng mẫu
  - Shared
    - `packages/shared/src/stores/store-slug.ts` (create): `storeSlugBase(name)` thuần (SPEC 2), export ở `packages/shared/src/index.ts` (modify: 1 dòng)
    - `packages/shared/src/api-domains/store-public.ts` (create): `storePublicConfigSchema`, `storePublicPatchSchema`, `storePublicPageSchema` (DTO khách, SPEC 9); `api-domains/index.ts` (modify: 1 dòng)
    - `packages/shared/src/mock-data/domains/store-public.ts` (create), `mock-data/domains/index.ts` (modify)
  - Server (`modules/local-business`)
    - `apps/server/src/modules/local-business/domain/store-slug.ts` (create): chọn slug không trùng (SPEC 3)
    - `apps/server/src/modules/local-business/repositories/store-public.repository.ts` (create): đọc trang công khai theo slug (1 câu + items), cập nhật cấu hình, gán slug
    - `apps/server/src/modules/local-business/services/store-public.service.ts` (create): cấu hình của chủ + trang khách + cache
    - `apps/server/src/modules/local-business/controllers/store-public.controller.ts` (create): `GET /v1/public/stores/:slug` (`@Public`, `@Throttle`)
    - `apps/server/src/modules/local-business/controllers/store.controller.ts` (modify): `GET /v1/me/store/public`, `PATCH /v1/me/store/public`
    - `apps/server/src/modules/local-business/repositories/store.repository.ts` (modify: gán slug khi tạo gian hàng — `createMany` dòng ~33)
    - `apps/server/src/modules/local-business/local-business.module.ts` (modify: provider + controller)
  - Portal
    - `apps/portal/src/app/(public)/g/[slug]/page.tsx` (create): Server Component, `generateMetadata` (title / description / robots / canonical / OG), `fetch` phía server
    - `apps/portal/src/app/(public)/g/[slug]/not-found.tsx` (create)
    - `apps/portal/src/lib/server-api.ts` (create): `fetch` phía server tới `API_INTERNAL_URL` (env mới, SPEC 11)
    - `apps/portal/src/lib/env.ts` (modify: `API_INTERNAL_URL` chỉ phía server), `apps/portal/.env.example`, `infra/env/portal.env.example` (modify: 1 dòng mỗi file)
    - `apps/portal/src/features/stores/components/public/{public-store-page.tsx,public-header.tsx,public-sections.tsx,public.module.css}` (create): trang khách, chỉ hiển thị, dùng lại khối chi tiết khi không phụ thuộc API đăng nhập
    - `apps/portal/src/features/stores/components/dashboard/public-page-card.tsx` + `public-page.module.css` (create): khối "Trang công khai"
    - `apps/portal/src/features/stores/hooks/use-store-public.ts` (create), `apps/portal/src/features/stores/api.ts` (modify)
    - `apps/portal/src/features/stores/components/wizard/store-wizard.tsx` (modify: chèn khối ở chế độ sửa, SPEC 6)
    - `apps/portal/src/features/stores/components/dashboard/store-dashboard.tsx` (modify: chèn khối, **Q-V46-810-1**)
    - `apps/portal/src/features/stores/components/detail-hero.tsx` (modify: nút "Xem trang hồ sơ công khai" / "Chia sẻ" chép link `/g/<slug>`, SPEC 8)
    - `apps/portal/messages/{vi,en,zh,id,th,ms,fil,km,lo,my}/stores.json` (modify: khối `publicPage.*`, `guest.*`), `messages/*/common.json` (modify: `meta.publicStore` nếu `pageMeta` cần)
    - `apps/portal/src/mocks/handlers/stores.ts` (modify: `GET/PATCH /me/store/public`, `GET /public/stores/:slug`)
  - Admin
    - `apps/admin/src/features/stores/components/store-drawer.tsx` (modify: dòng "Trang công khai" + nút sao chép, **Q-V46-810-6**), `packages/shared/src/api-domains/stores.ts` (modify: `adminStoreSchema` thêm `slug`), mapper `toAdminStore` (modify)
    - `apps/admin/messages/vi/stores.json` (modify)
  - Infra
    - `infra/nginx/opchub.conf`, `infra/nginx/app.opchub.community.conf` (modify: chỉ thêm comment / `location ^~ /g/` nếu cần header cache; **không** đổi X-Robots-Tag của Portal)
  - Test
    - `packages/shared/src/stores/store-slug.spec.ts`, `packages/shared/src/api-domains/store-public.spec.ts`, `mock-data/domains/store-public.spec.ts` (create)
    - `apps/server/test/local-business/store-public.int.spec.ts` (create), `apps/server/test/local-business/store-slug-backfill.int.spec.ts` (create)
    - `apps/portal/src/features/stores/components/dashboard/public-page-card.spec.tsx` (create)
    - `e2e/behavior/store-public-page.spec.ts` (create), `e2e/behavior/stores.spec.ts` (modify nếu nút chia sẻ đổi link — chỉ đổi URL mong đợi, giữ assertion)
    - `e2e/parity/scenarios/portal-stores.ts` (modify: `P-V46-PUBLIC-CARD`, `P-V46-GUEST`)
  - Tài liệu
    - `coding-packs/reports/V4.6-progress.md` (dòng #10), `coding-packs/reports/ui-parity/{screens,questions,results}.md` + `results.json`, `coding-packs/reports/TIP-V46-810-completion.md`, `coding-packs/reports/TIP-V46-810-query-plans.md` (create), `coding-packs/standards/global/domain-glossary.md` ("Trang công khai", "Hiển thị trên Google"), `infra/GO-LIVE-CHECKLIST.md` (thêm dòng `API_INTERNAL_URL` + kiểm `/g/` không có `X-Robots-Tag: noindex` khi bật Google)
- **Parallel-safe with:** sequential.
  - Chia `modules/local-business/**` (`store.controller.ts`, `store.repository.ts`, `local-business.module.ts`) với V46-808 / 809 (đã merge).
  - Chia `packages/db/prisma/schema/local-business.prisma` với 808 (đã merge, chỉ migration).
  - Chia `apps/portal/messages/*/stores.json`, `mocks/handlers/stores.ts` với 808 → đã merge.
  - Không chia file với V46-811 (llm-config / settings Admin).

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-810-store-public-page` tách từ `dev` `b5e12ac0`.
- **DB:** 801 → 809 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). Builder hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed. Không reset DB native, không tắt tiến trình HOLD.
- Delta `coding-packs/audit/SPEC-V4.6-DELTA.md` **P4**: Gian hàng của tôi › khối "Trang công khai" `/g/<slug>` — bật / tắt Google, tiêu đề, mô tả ≤ 160, sao chép link, xem như khách. Đánh giá: **Backend + FE lớn** (route công khai, SEO, slug).
- Đặc tả §33.4:
  - BR-494: mỗi gian hàng có link `opchub.community/g/<tên-không-dấu>`, xem không cần đăng nhập. Chủ gian hàng bật / tắt hiển thị trên Google, sửa tiêu đề và mô tả (≤ 160 ký tự), sao chép link, xem như khách.
  - TC-494: tắt hiển thị Google → mô tả đổi thành "Chỉ người có link mới xem được".
- Prototype `docs/spec/index.html` v4.6:
  - **Khối** dòng 2007 → 2012: Gian hàng › Gian hàng của tôi, **chỉ ở chế độ sửa** (`st.wz.isEd`), thẻ đầu tiên trên thẻ trình sửa "Chỉnh sửa gian hàng".
  - **Thẻ**: nền trắng, viền `#F0F0F0`, bo 8, `padding:18px 24px`, cột, `gap:14px`.
  - **Đầu thẻ**:
    - "Trang công khai" 16px/600
    - dòng phụ "Khách hàng xem gian hàng không cần đăng nhập · chia sẻ link lên Zalo, Facebook, danh thiếp" 13px `rgba(0,0,0,0.45)`
    - phải: "Xem như khách" (trắng, viền `#D9D9D9`) + "Sao chép link" (chính `#1677FF`); cao 32, bo 6, 13px
  - **Ô link** chỉ đọc: cao 36, viền `#D9D9D9`, nền `#FAFAFA`, monospace 13px, cắt `…`; hiện `opchub.community/g/<slug>` (không `https://`).
  - **Dòng Google**:
    - "Hiển thị trên Google" 14px
    - phụ 13px: bật "Google và các công cụ tìm kiếm tìm thấy được gian hàng" / tắt "Chỉ người có link mới xem được"
    - công tắc 40 × 22 (bật `#1677FF`, tắt `#D9D9D9`)
  - **Ô nhập** (lưới `repeat(auto-fit,minmax(260px,1fr))`, gap 12; nhãn 12px `rgba(0,0,0,0.55)`; ô cao 34, bo 6, 13px):
    - "Tiêu đề trên Google"
    - "Mô tả ngắn" + bộ đếm phải "N/160", `maxlength=160`, một dòng
  - **Logic** `_ops().pub` dòng 6549 → 6552:
    - slug = tên gian hàng → NFD, bỏ dấu, `đ` → `d`, chữ thường, cụm không phải `a-z0-9` → `-`, bỏ `-` đầu / cuối; không giới hạn độ dài, không xử lý trùng
    - tiêu đề mặc định `{tên} – {ngành} tại {tỉnh}`
    - mô tả mặc định `(slogan || intro).slice(0,160)`
    - đổi là lưu ngay (không nút Lưu)
    - "Sao chép link" → toast "Đã sao chép link trang công khai"
    - "Xem như khách" → mở chi tiết gian hàng trong app + toast "Đang xem gian hàng như khách truy cập link công khai"
  - Prototype **không có** màn `/g/` riêng cho khách (prototype bắt đăng nhập mọi màn). Chi tiết gian hàng có nút "Xem trang hồ sơ công khai" / "Chia sẻ" chép link cũ `opchub.community/gian-hang/<id>` (trái `/g/`).
- Code hiện tại (đọc trước):
  - **Store** (`local-business.prisma:30-110`):
    - `ownerId @unique`, `name`, `slogan`, `field`, `province`, `ward`, `intro`, `logoUrl`, `coverUrl`, `vision`, `mission`, `gallery`, `videos`, `team`, `certs`, `docs`
    - liên hệ: `phone`, `email`, `website`, `address`, `phones[]`, `emails[]`, `addresses[]`, `socials` (zalo, fb, yt, tt, li)
    - `status draft | published | hidden`, `viewCount`, `publishedAt`
    - **chưa có slug**
    - `StoreItem` `name`, `price?`, `description`, `imageUrl`, `kind`, `sort`
  - **Chi tiết TV**:
    - `GET /v1/stores/:id` (`store.controller.ts:56`, cần đăng nhập + phí)
    - `StoreExploreService.detail` tăng lượt xem khi không phải chủ
    - `visibleStore(now)` (published + chủ chưa xóa + còn phí)
    - `STORE_DETAIL_SELECT` / `toStoreDetail` (`domain/store.mapper.ts`)
  - **Portal chi tiết**: `features/stores/components/detail-screen.tsx` + `detail-hero.tsx` (nút công khai đang chép `${origin}/stores/${id}`), `detail-items.tsx`, `detail-profile.tsx`, `detail-media.tsx`, `detail-contact.tsx`, `store-projects.tsx` (gọi API cần đăng nhập).
  - **Gian hàng của tôi**:
    - `GET/PUT /me/store`, `publish` / `unpublish` (`store-owner.service.ts`)
    - `mine-screen.tsx` → `StoreWizard` (sửa) hoặc `StoreDashboard` (`components/dashboard/store-dashboard.tsx`: chào, KPI, `DashInfo` + biểu đồ, `DashItems`)
  - **Route công khai server**:
    - `@Public()` + `@Controller('public/…')` + `@Throttle` (mẫu `affiliate/controllers/referral-public.controller.ts`, `account/controllers/public.controller.ts` có `Cache-Control: public, max-age=60`)
    - MSW bỏ kiểm phiên cho `/public/*` (`mocks/handlers/session.ts:23`)
  - **Portal**:
    - `app/(public)/…` render không cần đăng nhập (đăng nhập kiểm ở client trong `(portal)/layout.tsx` `AuthGate`); không có middleware
    - Không có helper `fetch` phía server, không có URL API nội bộ (`NEXT_PUBLIC_API_URL=/v1`; production Nginx chuyển `/v1/` tới API)
    - `app/layout.tsx` đặt `robots: { index: false, follow: false }` cho cả Portal
    - `pageMeta(key)` chỉ trả `title`
  - **Nginx**:
    - `infra/nginx/opchub.conf` (Portal `opchub.community`, Admin `admin.opchub.community` có `X-Robots-Tag: noindex`)
    - `infra/nginx/app.opchub.community.conf` (Portal `/`, Admin `/admin` có `X-Robots-Tag`, `/v1/` → API)
    - Portal không đặt `X-Robots-Tag` ở mức server
  - **Slug**: chưa có hàm dùng chung; mẫu `community/domain/group.mapper.ts:96-106` `roomSlug(name, taken)` (cắt 40, hậu tố số khi trùng); `reportFileName` (`api-domains/reports.ts:131`).
  - **Admin**: `features/stores/components/store-drawer.tsx` chưa có link Portal; mẫu chép link `features/events/components/events-screen.tsx:27-28` (`NEXT_PUBLIC_PORTAL_URL`).

## APPLICABLE STANDARDS

- [security/security](../standards/security/security.md): endpoint công khai chỉ trả trường công khai (DTO riêng, không dùng `STORE_DETAIL_SELECT`); rate limit; không lộ `ownerId` / email chủ
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) · [backend/api-conventions](../standards/backend/api-conventions.md): `public/*` theo mẫu có sẵn; repository chỉ đọc bảng local-business (+ `users` / `membership_fees` qua `visibleStoreSql` đã duyệt ở 808)
- [backend/auth-rbac](../standards/backend/auth-rbac.md): cấu hình chỉ chủ gian hàng (TK Doanh nghiệp)
- [database/prisma-migrations](../standards/database/prisma-migrations.md) · [database/query-indexing](../standards/database/query-indexing.md): backfill trong migration, unique index, CHECK độ dài
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md) · [frontend/routing-auth](../standards/frontend/routing-auth.md): trang khách là Server Component trong `(public)`, `generateMetadata`; không đụng `AuthGate`
- [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md) (D-134)
- [integrations/adapters](../standards/integrations/adapters.md) — không gọi dịch vụ ngoài (ảnh lấy URL đã lưu)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Mỗi gian hàng có **slug** cố định và trang **`/g/<slug>`** xem không cần đăng nhập. Trang render phía server, có thẻ SEO, và chỉ hiện trường công khai.

Chủ gian hàng quản lý trang này trong khối **"Trang công khai"** (giống prototype):
- xem link, sao chép link, "Xem như khách";
- bật / tắt "Hiển thị trên Google": tắt thì thêm `noindex`, dòng phụ đổi thành "Chỉ người có link mới xem được";
- sửa tiêu đề Google và mô tả ngắn ≤ 160 ký tự.

Nút chia sẻ trên chi tiết gian hàng trong app chuyển sang chép link `/g/<slug>`.

## SPECIFICATIONS

### Slug (BR-494 "tên không dấu")

1. Cột `stores.slug` unique, chỉ gồm `a-z0-9` và `-`. Slug được gán:
   - **khi tạo** gian hàng (`store.repository.ts` createMany, tự tạo khi đăng ký DN);
   - **backfill** trong migration cho mọi gian hàng cũ.
2. `storeSlugBase(name)` (shared, thuần):
   - NFD, bỏ dấu kết hợp, `đ` / `Đ` → `d`, chữ thường;
   - cụm ký tự không phải `a-z0-9` → `-`, bỏ `-` đầu / cuối;
   - cắt **60** ký tự, không để `-` cuối sau khi cắt;
   - rỗng → `gian-hang`.
3. **Trùng**:
   - `base`, rồi `base-2`, `base-3`, …: chọn hậu tố nhỏ nhất chưa dùng bằng 1 câu `SELECT slug FROM stores WHERE slug = $1 OR slug LIKE $1 || '-%'`;
   - gán trong cùng transaction tạo gian hàng;
   - lỗi unique khi tranh chấp → thử lại tối đa 3 lần.
   - Backfill trong SQL dùng thứ tự `created_at, id` để hậu tố ổn định (gian hàng tạo trước giữ `base`).
4. **Slug không tự đổi khi đổi tên** (**Q-V46-810-2** mặc định), để link đã chia sẻ không chết. Chủ không sửa slug tay trong TIP này.

### Cấu hình của chủ (khối "Trang công khai")

5. API (chủ gian hàng, TK Doanh nghiệp, mẫu `own()` của `store-owner.service.ts`; Cá nhân 403 `BUSINESS_ONLY`, chưa có 404 `NO_STORE_YET`):
   - `GET /v1/me/store/public` → `{ slug, url, seoIndex, title, desc, defaultTitle, defaultDesc, status }`
     - `url` = `${PORTAL_URL}/g/${slug}` (env server sẵn có)
     - `title` / `desc` = giá trị đã lưu (có thể rỗng)
     - `defaultTitle` = `{tên} – {ngành} tại {tỉnh}` (bỏ phần rỗng, giữ dấu `–`)
     - `defaultDesc` = `(slogan || intro)` cắt 160
   - `PATCH /v1/me/store/public` body `{ seoIndex?, title?, desc? }` (`strict`) → cập nhật có điều kiện theo `owner_id`; trả lại như GET.
     - Gian hàng `hidden` (Admin ẩn) → 409 `HIDDEN_BY_ADMIN` như sửa gian hàng.
     - Không ghi audit (thao tác của thành viên, không phải Admin).
6. **UI** khối "Trang công khai": số đo / chữ đúng prototype ở CONTEXT.
   - Vị trí (**Q-V46-810-1** mặc định):
     - (a) đầu trình sửa khi chủ bấm "Chỉnh sửa gian hàng" (như prototype);
     - (b) thêm vào **Dashboard gian hàng**, sau hàng `DashInfo` + biểu đồ, để chủ thấy link mà không phải vào trình sửa.
     - Một component dùng ở cả hai chỗ.
   - **Lưu**:
     - công tắc lưu ngay khi gạt (optimistic, lỗi thì trả lại + toast lỗi);
     - tiêu đề / mô tả lưu khi rời ô (`blur`) hoặc sau 800 ms ngừng gõ, không có nút Lưu (prototype);
     - toast "Đã lưu" không hiện cho mỗi lần gõ — chỉ hiện lỗi.
   - Ô hiển thị giá trị đã lưu. Rỗng thì để trống, placeholder = giá trị mặc định (prototype điền sẵn mặc định; app dùng placeholder để biết chủ đã sửa hay chưa — ghi D-134 loại D-xx nếu lệch).
   - "Mô tả ngắn" `maxLength=160`, bộ đếm `N/160` theo giá trị đang gõ. "Tiêu đề trên Google" tối đa **70** ký tự (prototype không giới hạn; **Q-V46-810-4**).
   - **"Sao chép link"**: `navigator.clipboard.writeText(url)` → toast "Đã sao chép link trang công khai"; lỗi clipboard → toast lỗi + chọn sẵn chữ trong ô link.
   - **"Xem như khách"**: mở `/g/<slug>` ở **tab mới** (`target="_blank"`, `rel="noopener"`), không toast. Đây là trang khách thật; prototype mở chi tiết trong app vì chưa có trang khách — D-95, ghi D-xx.
   - Gian hàng `draft` / `hidden`: khối vẫn hiện, ô link có dòng cảnh báo 12px cam "Trang công khai chỉ hiển thị khi gian hàng đã xuất bản" / "Gian hàng đang bị Admin ẩn"; nút "Xem như khách" vẫn mở (trang khách trả 404).

### Trang khách `/g/<slug>`

7. **Hiển thị** (**Q-V46-810-3** mặc định): trang khách trả dữ liệu khi và chỉ khi gian hàng thỏa `visibleStore(now)` (published + chủ chưa xóa + còn phí), giống chi tiết trong app. Ngược lại trả 404 (trang "Không tìm thấy gian hàng" + nút "Về trang chủ OPC Hub").
   - `seoIndex = false` **không** chặn xem: ai có link vẫn xem được (TC-494), chỉ thêm `noindex`.
8. **Chia sẻ trong app**:
   - `detail-hero.tsx` "Xem trang hồ sơ công khai" → mở `/g/<slug>` tab mới;
   - "Chia sẻ" → chép `https://…/g/<slug>`, toast hiện có;
   - `storeDetailSchema` thêm `slug`.
9. **API** `GET /v1/public/stores/:slug`:
   - `@Public()`, `@Throttle({ default: { limit: 60, ttl: 60_000 } })`, header `Cache-Control: public, max-age=60`
   - `slug` parse zod (`^[a-z0-9-]{1,64}$`, sai → 404, không 400 để không dò được)
   - DTO `storePublicPageSchema`, **danh sách trắng**:
     - Có: `slug`, `name`, `slogan`, `field`, `province`, `ward`, `intro`, `logoUrl`, `coverUrl`, `vision`, `mission`, `gallery`, `videos`, `team` (tên, chức danh, ảnh — **không** liên hệ cá nhân), `certs` (tên, ảnh), `items` (tên, loại, mô tả, ảnh, giá hoặc "Liên hệ báo giá", ≤ 50 theo `sort`), `seo: { index, title, desc }` (đã áp mặc định)
     - Liên hệ: **Q-V46-810-5**, xem mục ngay dưới
     - **Không** có: `ownerId`, tên chủ, `status`, `docs` (file hồ sơ), `hiddenCovers`, `logos` / `covers` (kho ảnh trình tạo), `viewCount`, nhu cầu, dự án, `fav`, `isMine`
   - Liên hệ (**Q-V46-810-5** mặc định): hiện thông tin liên hệ **doanh nghiệp** đã khai trong bước "Liên hệ & xuất bản" (`phone`, `email`, `website`, `address`, `phones`, `emails`, `addresses`, `socials`) — đây là liên hệ công khai doanh nghiệp tự nhập để khách liên hệ, giống template "equip" của prototype. Không có tên / email tài khoản chủ.
   - **Lượt xem**: không tăng `view_count` từ trang khách (**Q-V46-810-3**; tránh bot / crawler làm sai số KPI chủ gian hàng).
   - Cache Redis `store-public:{slug}` 60 giây. Chủ `PATCH` cấu hình / `PUT /me/store` / publish / unpublish / Admin ẩn → xóa key (gọi trong service sau commit).
10. **Trang Portal** `app/(public)/g/[slug]/page.tsx`:
    - Server Component, `export const revalidate = 60` (hoặc `dynamic = 'force-dynamic'` + `fetch(..., { next: { revalidate: 60 } })`).
    - **Không** bọc `AuthGate` / `PortalShell`.
    - `generateMetadata`:
      - `title` = `seo.title`
      - `description` = `seo.desc`
      - `robots`: `{ index: true, follow: true }` khi `seo.index`, ngược lại `{ index: false, follow: false }` (ghi đè mặc định `noindex` của `app/layout.tsx` chỉ cho trang này)
      - `alternates.canonical` = `${PORTAL_URL}/g/<slug>`
      - `openGraph` `{ title, description, images: [coverUrl ?? logoUrl], url, type: 'website', locale: 'vi_VN' }`
    - 404 → `notFound()`; trang 404 cũng `noindex`.
    - **Bố cục** (prototype không có màn khách; dùng lại phong cách chi tiết gian hàng v4, chỉ hiển thị):
      - Đầu trang khách: logo OPC Hub (bấm về `/`) + nút "Đăng nhập" / "Tham gia OPC Hub" (`/login`, `/register`). Chỉ là link, không gọi API phiên.
      - Hero: ảnh bìa, logo, tên, slogan, `ngành · phường, tỉnh`.
      - Các khối khi có dữ liệu: Giới thiệu doanh nghiệp, Sản phẩm & Dịch vụ, Tầm nhìn & Sứ mệnh, Đội ngũ, Giấy chứng nhận, Hình ảnh & Video, Thông tin liên hệ. Ẩn khối rỗng.
      - Chân trang: "© 2026 OPC Hub" + "Trang được tạo trên OPC Hub — cộng đồng doanh nghiệp một người".
      - Không có: Dự án OPC, Nhu cầu, nút sửa, yêu thích, `DateRangePicker`.
    - Component khách đặt ở `features/stores/components/public/**`, dùng lại component trình bày thuần (`detail-items`, `detail-profile`, `detail-media`, `detail-contact`) **nếu** chúng không gọi hook API / router của app. Ngược lại tách phần trình bày ra, không nhân bản logic.
    - **i18n**: trang khách dùng locale từ cookie như mọi trang (mặc định `vi`); chuỗi mới trong `stores.guest.*` cho 10 bộ.
11. **Gọi API phía server** (`lib/server-api.ts`):
    - URL gốc = `API_INTERNAL_URL` (env server-only, vd `http://127.0.0.1:4101/v1`), **bắt buộc** khi `NEXT_PUBLIC_API_MOCKING=off`.
    - Chế độ MSW (dev / e2e MSW): server component không chạy MSW → đọc thẳng `mock-data/domains/store-public.ts` (import có điều kiện theo env, không bundle vào client).
    - Thêm `API_INTERNAL_URL` vào zod env Portal, `.env.example`, `infra/env/portal.env.example`, `GO-LIVE-CHECKLIST` (luật 12).
12. **Nginx / robots**:
    - Portal không có `X-Robots-Tag` ở mức server: **giữ nguyên**, `noindex` của `/g/` do thẻ meta quyết.
    - Không thêm `sitemap.xml` / `robots.txt` trong TIP này (SKIP, ghi completion).
    - Nếu domain chạy thật là `app.opchub.community` mà link hiển thị `opchub.community/g/…` thì `PORTAL_URL` server phải đúng domain thật (GO-LIVE ghi chú).

### Admin

13. `store-drawer.tsx` thêm dòng "Trang công khai: `opchub.community/g/<slug>`" + nút "Sao chép" (mẫu `events-screen.tsx`, `NEXT_PUBLIC_PORTAL_URL`) (**Q-V46-810-6** mặc định có; prototype không có). Admin không sửa slug / SEO.

### Validation

- `storePublicPatchSchema`: `{ seoIndex?: boolean, title?: string().trim().max(70), desc?: string().trim().max(160) }.strict()`, ít nhất 1 trường.
- DB `CHECK`: `seo_title` ≤ 70, `seo_desc` ≤ 160, slug theo regex.
- Response parse bằng schema `@opchub/shared` ở server test, MSW, FE (cả server component).

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| Slug không tồn tại / sai dạng / gian hàng nháp / ẩn / chủ hết phí / chủ đã xóa | `GET /public/stores/:slug` 404; trang `/g/` 404 `noindex` |
| TK Cá nhân gọi `/me/store/public` | 403 `BUSINESS_ONLY` |
| Chưa có gian hàng | 404 `NO_STORE_YET` |
| Gian hàng bị Admin ẩn khi PATCH | 409 `HIDDEN_BY_ADMIN` |
| Mô tả > 160 / tiêu đề > 70 | 400 `VALIDATION_ERROR` (FE đã chặn bằng `maxLength`) |
| Vượt rate limit trang khách | 429 |
| API nội bộ lỗi khi SSR | trang lỗi 500 chung của Next, không lộ chi tiết |

## ACCEPTANCE CRITERIA

- **Slug** (unit `store-slug.spec.ts`):
  - "HTX Cà phê Hòa Phú" → `htx-ca-phe-hoa-phu`;
  - "Đặc sản Đà Lạt!!" → `dac-san-da-lat`;
  - tên toàn ký hiệu → `gian-hang`;
  - tên 100 ký tự → ≤ 60, không `-` cuối.
- **Slug trùng** Given 2 gian hàng tên "Cà phê Ngon" Then slug `ca-phe-ngon` (tạo trước) và `ca-phe-ngon-2`; backfill migration cho kết quả giống; đổi tên gian hàng không đổi slug (int `store-public.int.spec.ts` › `slug`, `store-slug-backfill.int.spec.ts`).
- **BR-494 xem không đăng nhập** Given gian hàng đã xuất bản When khách (không cookie) mở `/g/htx-ca-phe-hoa-phu` Then:
  - HTML trả từ server có tên, slogan, sản phẩm;
  - `<title>` = tiêu đề SEO, `<meta name="description">` = mô tả;
  - `<link rel="canonical">`, `og:title`, `og:image`;
  - không có nút sửa / yêu thích / dự án / nhu cầu.

  Test: e2e `store-public-page.spec.ts` › `guest view` (context không đăng nhập); int `› public dto`.
- **DTO an toàn** Then response `GET /v1/public/stores/:slug` không có `ownerId`, tên chủ, `status`, `docs`, `viewCount`, `hiddenCovers`, `logos`, `covers`, `fav`, `isMine`; `team[]` không có liên hệ cá nhân (int `› public dto`, so khóa với danh sách trắng).
- **TC-494** Given bật Google When chủ gạt tắt Then:
  - dòng phụ đổi "Chỉ người có link mới xem được";
  - `GET /me/store/public` `seoIndex=false`;
  - trang `/g/` có `<meta name="robots" content="noindex, nofollow">` (sau ≤ 60 giây hoặc ngay nhờ xóa cache);
  - khách có link vẫn xem được (200).
  - Bật lại → `index, follow`.

  Test: unit `public-page-card.spec.tsx` › `TC-494`; e2e `› google toggle`; int `› seo index`.
- **Tiêu đề / mô tả** Given chủ nhập mô tả 170 ký tự Then ô dừng ở 160, đếm `160/160`; API 161 ký tự → 400; xóa trắng → trang khách dùng mặc định `{tên} – {ngành} tại {tỉnh}` / slogan (int + unit `› seo fields`).
- **Sao chép / xem như khách** When "Sao chép link" Then clipboard = `https://…/g/<slug>`, toast "Đã sao chép link trang công khai"; When "Xem như khách" Then tab mới mở `/g/<slug>` (e2e `› copy and view`).
- **Phạm vi hiển thị** Given gian hàng nháp / Admin ẩn / chủ hết phí / slug lạ Then `/g/<slug>` 404 có `noindex`; khối "Trang công khai" của chủ hiện cảnh báo đúng (int `› visibility`, e2e `› not found`).
- **Không tăng lượt xem** Given khách mở `/g/` 3 lần Then `stores.view_count` và `store_daily_views` không đổi (int `› no view count`).
- **Quyền** Given TK Cá nhân Then `GET/PATCH /me/store/public` 403; TK DN chưa có gian hàng 404; gian hàng Admin ẩn PATCH 409 (int `› access`).
- **Rate limit / cache** `GET /public/stores/:slug` có `Cache-Control: public, max-age=60`; lần 2 trong 60 giây không query DB; PATCH xóa cache (int `› cache`).
- **Chia sẻ trong app** Given TV mở chi tiết gian hàng When "Chia sẻ" Then chép link `/g/<slug>` (không còn `/stores/<id>`) (e2e `stores.spec.ts` cập nhật URL mong đợi).
- **Admin** Given Admin mở drawer gian hàng Then thấy dòng "Trang công khai" + "Sao chép" (unit / e2e admin stores).
- **Hiệu năng** EXPLAIN `SELECT … FROM stores WHERE slug = $1` dùng unique index; trang khách 1 câu gian hàng + 1 câu items (≤ 50) (`TIP-V46-810-query-plans.md`).
- **Không hồi quy**: `stores.spec.ts`, `store-projects.spec.ts`, `stores.int.spec.ts`, `store-builder.int.spec.ts`, e2e MSW không tụt so với `dev`; mọi trang Portal khác vẫn `noindex`.
- **Parity (D-134, tham khảo)**:
  - `P-V46-PUBLIC-CARD`: khối trong trình sửa ở 1440 + 390.
  - `P-V46-GUEST`: trang khách, không có ảnh prototype tương ứng → chỉ chụp lưu, owner duyệt ảnh.
  - Ghi % + nguyên nhân; lệch giao diện thật của khối phải sửa.

## CONSTRAINTS

- DO NOT:
  - dùng `STORE_DETAIL_SELECT` / `toStoreDetail` cho endpoint công khai (lộ trường nội bộ) — DTO danh sách trắng riêng
  - trả tên / email / id tài khoản chủ, `docs`, nhu cầu, dự án ra trang khách
  - đổi slug khi đổi tên; cho chủ / Admin sửa slug
  - bọc `/g/` trong `AuthGate` / `PortalShell`; gọi API cần đăng nhập từ trang khách
  - bỏ `noindex` mặc định của các trang Portal khác; thêm `X-Robots-Tag` mức server cho Portal
  - tăng lượt xem từ trang khách
  - query trong vòng lặp khi backfill (dùng 1 câu SQL window function); `select *`
  - `any`, `@ts-ignore`, `console.*`; sửa `.env` thật; mask / nới assertion (D-134)
- REUSE:
  - `visibleStoreSql` / `visibleStore`, `own()` + `BUSINESS_ONLY` / `NO_STORE_YET` / `HIDDEN_BY_ADMIN`, `explore.invalidate()` (mẫu xóa cache)
  - `@Public`, `@Throttle`, mẫu `public.controller.ts` (Cache-Control)
  - component trình bày chi tiết gian hàng (khi không phụ thuộc hook đăng nhập), `formatVnd`, `pageMeta`
  - mẫu chép link `events-screen.tsx`
- SKIP:
  - `sitemap.xml`, `robots.txt`, structured data (JSON-LD)
  - Chủ tự đặt slug, chuyển hướng slug cũ
  - Thống kê lượt xem trang công khai riêng
  - Trang khách cho nhu cầu / dự án
  - Ảnh OG tự sinh

## Câu hỏi chờ owner chốt (phương án mặc định đã ghi trong SPEC; builder dùng mặc định nếu owner chưa trả lời, ghi completion)

- **Q-V46-810-1 Vị trí khối "Trang công khai".** Prototype chỉ hiện trong trình sửa gian hàng.
  - **Mặc định:** hiện ở cả trình sửa (như prototype) và Dashboard gian hàng, để chủ thấy link ngay.
- **Q-V46-810-2 Đổi tên gian hàng có đổi slug?**
  - **Mặc định:** không. Slug cố định từ lần tạo để link đã chia sẻ không chết.
- **Q-V46-810-3 Ai xem được `/g/` và có tính lượt xem không.**
  - **Mặc định:** chỉ gian hàng đang hiển thị trong app (đã xuất bản, chủ còn phí); nháp / ẩn / hết phí → 404. Không tăng lượt xem từ trang khách.
- **Q-V46-810-4 Giới hạn tiêu đề Google.** Prototype không giới hạn.
  - **Mặc định:** tối đa 70 ký tự (Google cắt khoảng 60–70).
- **Q-V46-810-5 Liên hệ trên trang khách.**
  - **Mặc định:** hiện thông tin liên hệ doanh nghiệp đã khai trong bước "Liên hệ & xuất bản" (SĐT, email, web, địa chỉ, mạng xã hội); không hiện tên / email tài khoản chủ.
- **Q-V46-810-6 Admin có thấy link công khai không.** Prototype không có.
  - **Mặc định:** drawer Gian hàng có dòng link + nút sao chép, chỉ xem.

Ghi 6 câu vào `reports/ui-parity/questions.md` › V4.6 (dạng "mặc định, chờ owner").

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-810-store-public-page`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed; migration `--create-only` rồi sửa SQL (backfill 1 câu), có `down.sql`
- [ ] Env mới `API_INTERNAL_URL` có trong zod env Portal + `.env.example` + `infra/env/portal.env.example` + GO-LIVE (luật 12); không sửa `.env` thật
- [ ] Đo baseline `dev` trước (e2e MSW, `stores.spec.ts`, parity P-108 / P-109) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `store-public-page.spec.ts` (khách không cookie, kiểm HTML SSR + meta robots)
- [ ] EXPLAIN tra slug + items → `TIP-V46-810-query-plans.md`
- [ ] Parity (D-134): `P-V46-PUBLIC-CARD` 1440 + 390 ghi % + nguyên nhân; `P-V46-GUEST` chụp lưu cho owner duyệt; sửa hết lệch giao diện thật của khối
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 2 / bảo mật**: endpoint công khai DTO danh sách trắng, parse zod slug; không lộ dữ liệu tài khoản chủ
  - **Luật 3**: trang khách không import nội bộ feature khác ngoài `stores`; server chỉ đọc bảng local-business (+ `visibleStoreSql` đã duyệt)
  - **Luật 5 / 7**: tra slug qua unique index; PATCH cấu hình có điều kiện `owner_id`; backfill 1 câu
  - **Luật 12**: env `API_INTERNAL_URL` đủ 3 chỗ
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] D-65: 9 bộ dịch Portal có `stores.publicPage.*`, `stores.guest.*`; `messages.spec.ts` PASS
- [ ] Ghi Q-V46-810-1 → 6 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #10; glossary; GO-LIVE
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity (tham khảo), EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ (lint / type / unit / int / e2e / depcheck / build); parity theo D-134 không chặn nhưng phải có nguyên nhân

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority P2, depends, estimate L, REQ / D)
- [x] Context: DB đích, delta P4, BR-494 / TC-494, dòng prototype + số đo + logic, code hiện tại (Store không slug, chi tiết cần đăng nhập, `(public)`, không fetch phía server, `noindex` toàn Portal, Nginx)
- [x] Task rõ + SKIP (sitemap, sửa slug, thống kê riêng, OG tự sinh)
- [x] Business rules đánh số 1 → 13, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: slug, slug trùng, xem không đăng nhập, DTO an toàn, TC-494, tiêu đề / mô tả, sao chép / xem như khách, phạm vi, lượt xem, quyền, cache, chia sẻ trong app, Admin, hiệu năng, không hồi quy, parity
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential (local-business đã merge 808 / 809; không đụng 811)
- [x] BUILDER-CHECKLIST trích luật 2 / 3 / 5 / 7 / 12
- ⚠️ Gap:
  - Prototype không có màn khách. Bố cục `/g/` dựa trên chi tiết gian hàng v4, nên không có ảnh parity chuẩn; owner duyệt ảnh.
  - Trang khách là SSR đầu tiên của Portal, cần env mới `API_INTERNAL_URL` và nhánh MSW riêng cho server component. Builder phải kiểm cả build MSW lẫn build server.
  - Q-V46-810-1 → 6 chưa chốt. Mặc định giữ link ổn định, không lộ dữ liệu tài khoản chủ, không làm sai KPI lượt xem.
