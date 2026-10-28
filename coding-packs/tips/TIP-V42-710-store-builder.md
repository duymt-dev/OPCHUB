# TIP-V42-710: Gian hàng — trình tạo / sửa 5 bước + media, gian hàng tự tạo là Nháp (trial + migration), dashboard số thật, chi tiết không dữ liệu giả

## HEADER
- TIP-ID: TIP-V42-710
- Project: OPCHUB
- Module: local-business (stores), uploads, membership-fee (mở trial → outbox); Portal stores; MSW; Admin stores (đọc trường mới)
- Priority: P1
- Depends on: TIP-V42-703 (giá), TIP-V42-701 (kiểm file); xếp chồng trên TIP-V42-709 (nhánh chưa merge)
- Estimated: XL
- REQ / D: REQ-605, D-97, D-114 (S3, S4, S5, S6, S8), §27.9, §29.3, FULL-AUDIT :116 → :125, :139 → :144; CR-16
- **Files touched:**
  - DB: migration `v42_store_builder` — `stores.ward`, `logo_url`, `logos text[]`, `covers text[]`, `hidden_covers text[]`, `vision`, `mission`,
    `gallery text[]`, `videos jsonb`, `team jsonb`, `certs jsonb`, `docs jsonb`, `phones text[]`, `emails text[]`, `addresses text[]`, `socials jsonb`,
    `auto_created bool`; bảng `store_daily_views (store_id, day, views)` PK `(store_id, day)`; INSERT gian hàng Nháp cho mọi TK DN trial / active / expiring
    chưa có gian hàng (D-114 S3); `packages/db/prisma/schema/local-business.prisma`; test `packages/db/test/migration-store-builder.int.spec.ts`
  - Shared: `api-domains/stores.ts` (+`store-builder.ts` create: media schema, `STORE_STOCK_COVERS`, `STORE_SOCIALS`, giới hạn S5, `storeStepErrors`,
    `STORE_STEP_MESSAGES`, dashboard schema), `api-domains/uploads.ts` (kind `store-logo`, `store-gallery`, `store-cert`, `store-team`, `store-video` ≤ 100 MB,
    `store-doc` ≤ 20 MB), `api-domains/upload-safety.ts` (chữ ký video), `outbox/events.ts` (`membership_fee.trial_started`),
    mock-data `domains/stores.ts`, fixtures `stores-seed.ts` (st1 MediaSoft: phường, tầm nhìn / sứ mệnh, đội ngũ, chứng nhận, tài liệu, ảnh như prototype `EX.st1`)
  - Server: `local-business/services/store-owner.service.ts` (lưu media, kiểm theo bước, Lưu thay đổi giữ hiển thị), `services/store-media.service.ts` (create),
    `services/store-dashboard.service.ts` (create), `repositories/store.repository.ts`, `repositories/store-explore.repository.ts` (lượt xem theo ngày),
    `domain/store.mapper.ts`, `domain/store-status.ts`, `controllers/store.controller.ts` (`GET /me/store/dashboard`), `services/store-auto-create.handler.ts`
    (`onTrialStarted`), `worker/processors/store.processor.ts`; `membership-fee/services/fee-writer.service.ts` (outbox khi mở trial);
    `uploads/image-ref.service.ts` / `uploads/store-file-ref.service.ts` (create: video / tài liệu), `uploads/local-uploads.controller.ts` (trần 100 MB),
    `uploads/media-gc.service.ts` (tham chiếu cột mới); `infra/nginx/opchub.conf` (`client_max_body_size 101m` khối S3)
  - Portal: `features/stores/**` (trình tạo 5 bước + xem trước, dashboard, chi tiết: logo / tầm nhìn / đội ngũ / chứng nhận / ảnh & video / reels / tài liệu /
    liên hệ nhiều / mạng xã hội), `app/(portal)/stores/mine/**`, `lib/upload-image.ts`, `messages/*/stores.json` (10 ngôn ngữ), MSW `mocks/handlers/stores.ts`,
    `mocks/handlers/profile.ts` (presign kind mới)
  - Test: int `local-business/store-builder.int.spec.ts`, `store-dashboard.int.spec.ts` (+EXPLAIN), `store-auto-create` (trial); unit shared
    `store-builder.spec.ts`, `upload-safety.spec.ts`; portal `model.spec.ts`; e2e `behavior/stores.spec.ts`; parity `scenarios/portal-stores.ts`
- **Parallel-safe with:** sequential — chồng trên 709; 711 dùng `stores` (QT-ST-PJ) nên chạy sau.

## CONTEXT
- D-97: "Làm đủ: trình tạo + sửa 5 bước, media (logo nhiều ảnh chọn 1, bìa, video, đội ngũ có ảnh, chứng nhận bắt buộc ảnh, hồ sơ năng lực, nhiều hotline / email /
  địa chỉ, mạng xã hội), mức hoàn thiện, xem trước. Gian hàng tự tạo ở Nháp, chủ xuất bản mới hiện." Mục Dự án OPC trong gian hàng → TIP-V42-711.
- D-114: migration tạo Nháp cho DN trial / còn phí chưa có gian hàng (thay D-84); gian hàng đang hiện giữ nguyên; gian hàng đang hiện: nút "Lưu thay đổi",
  không tự gỡ khỏi Khám phá (S8 B); Dashboard chỉ số thật (lượt xem, số SP, nhu cầu), ẩn "Khách quan tâm" / "Lịch hẹn"; ảnh ≤ 5 MB, video ≤ 100 MB, tài liệu ≤ 20 MB.
- FULL-AUDIT S5 A (đếm): 12 ảnh / 10 logo / 10 chứng nhận, video × 6, tài liệu × 10 (D-114 chỉ chốt dung lượng → dùng số đếm S5 A, Q-V42-710-1).
- Prototype v4.2 (`docs/spec/index.html`): trình tạo :1996 → 2163, logic :5304 → 5343 (`need`, `STEPS`, `go`, `saveDraft`, `publish`, `pv`), dashboard :2165 → 2235
  (`sd` :5287), chi tiết :2300 → 2410 (`dPage` :5359, `EX` :5346), `COVERS` :5209, `_socList`.
- Đặc tả §27.9 có 4 bước; prototype 5 bước thắng (D-93).

## SPECIFICATIONS
### Business Rules
1. **Tự tạo Nháp:** (a) migration: mọi TK `business` có phí `trial | active | expiring` chưa có gian hàng → gian hàng `draft`, `auto_created = true`, tên / tỉnh /
   website / địa chỉ từ hồ sơ DN, hotline / email từ TK; idempotent (`ON CONFLICT (owner_id) DO NOTHING`); gian hàng đang có giữ nguyên.
   (b) đăng ký TK DN mở trial → outbox `membership_fee.trial_started` cùng transaction → worker tạo Nháp (CR-16, FULL-AUDIT :125); (c) giữ `membership_fee.confirmed`.
   `STORE_MESSAGES.noStoreYet` đổi câu (không còn "lần đóng phí kế tiếp").
2. **Trình tạo 5 bước (prototype `STEPS`):** 1 Thông tin doanh nghiệp · 2 Giới thiệu & hình ảnh · 3 Hồ sơ & đội ngũ · 4 Sản phẩm & dịch vụ · 5 Liên hệ & xuất bản.
   Thanh bước: bấm bước sau chỉ khi các bước trước đủ (`go`), "Bước N/5", "Thoát" về dashboard. Xem trước bên phải (bìa 16/7, logo 48, tên / slogan, tag ngành /
   đối tượng / địa phương, giới thiệu 4 dòng, "N sản phẩm / dịch vụ" + 3 mục, Hotline, Địa chỉ, vòng mạng xã hội).
3. **Điều kiện theo bước (`need`, dùng chung server + FE + MSW — `storeStepErrors`):**
   B1 tên · ngành · tỉnh; B2 giới thiệu ≥ 40 + ảnh bìa; B3 không bắt buộc; B4 ≥ 1 SP / DV; B5 hotline + địa chỉ. Câu lỗi đúng prototype.
   "Lưu nháp" không kiểm bước; "Xuất bản gian hàng" kiểm đủ 5 bước, sai → nhảy về bước đầu tiên chưa đủ + toast câu lỗi.
4. **Đang hiển thị (S8 B):** nút phụ "Lưu nháp" thành "Lưu thay đổi", lưu giữ `published` (không gỡ khỏi Khám phá); vì vẫn hiển thị nên phải đủ 5 bước (server 400 như Xuất bản).
   Nháp: tiêu đề "Tạo gian hàng địa phương", nút cuối "Xuất bản gian hàng"; đang hiện: "Chỉnh sửa gian hàng", nút cuối "Lưu thay đổi" (Q-V42-710-2).
   Admin ẩn: lưu được, không xuất bản (giữ `HIDDEN_BY_ADMIN`).
5. **Media:** logo nhiều ảnh (≤ 10) chọn 1, bấm ô "Chữ viết tắt" bỏ chọn, × ảnh đang chọn → chữ viết tắt; ảnh bìa: 6 ảnh mẫu `COVERS` + ảnh tải lên (≤ 12), × ảnh mẫu → ẩn
   (`hidden_covers`), × ảnh đang dùng → ảnh còn lại đầu tiên, ✎ thay ảnh; Tầm nhìn / Sứ mệnh; Hình ảnh ≤ 12; Video & Reels ≤ 6 (≤ 100 MB, tiêu đề = tên tệp bỏ đuôi);
   Đội ngũ (họ tên + chức vụ bắt buộc, ảnh tuỳ chọn, ≤ 20); Chứng nhận (tên + ảnh bắt buộc, đơn vị cấp, ≤ 10); Hồ sơ năng lực (.pdf .ppt .pptx .doc .docx ≤ 20 MB, ≤ 10);
   hotline / email / địa chỉ phụ (≤ 5 mỗi loại); mạng xã hội zalo / fb / web (= `website`) / yt / tt / li.
   Mọi URL media phải là object của chính chủ (`${kind}/${userId}/…`) đã PUT, kiểm `head` (cỡ + MIME) + chữ ký byte đầu; ảnh mẫu chỉ nhận đúng 6 URL `STORE_STOCK_COVERS`.
   Media bị thay / xoá → `storage_gc` (cùng transaction).
6. **Mức độ hoàn thiện:** 5 mục prototype (Tên & slogan · Giới thiệu ≥ 40 · Ảnh bìa · Hotline & địa chỉ · ≥ 1 SP / DV), %.
7. **Dashboard (S6 A, chỉ số thật):** "Xin chào, {DN}!", KPI: Lượt xem gian hàng (7 ngày, so với 7 ngày trước), Sản phẩm (đang hiển thị), Nhu cầu đang mở;
   "Thông tin gian hàng" (bìa, nhãn trạng thái, tên, địa phương, địa chỉ, giới thiệu 3 dòng, "Chỉnh sửa gian hàng", "Xem gian hàng"); "Hiệu suất gian hàng · 7 ngày qua"
   (đường Lượt xem từ `store_daily_views`); "Sản phẩm & Dịch vụ" + "Quản lý" (mở bước 4). Ẩn Khách quan tâm, Lịch hẹn, Lượt liên hệ, Tỷ lệ chuyển đổi, Hoạt động gần đây
   (không có nguồn dữ liệu, Q-V42-710-3). Gian hàng tự tạo còn trống (chưa giới thiệu, chưa SP) → mở thẳng trình tạo (`wzOn`).
8. **Chi tiết gian hàng:** logo ảnh (không có → chữ viết tắt), "{phường}, {tỉnh}", khối Tầm nhìn & Sứ mệnh, Đội ngũ chuyên gia, Giấy chứng nhận (ảnh), Hình ảnh & Video,
   Reels (video thật), Hồ sơ năng lực (tải tệp), liên hệ nhiều hotline / email / địa chỉ, mạng xã hội mở link thật; khối chỉ hiện khi có dữ liệu; bỏ dữ liệu giả
   (`EX` facts, gallery `FS`, reels dựng từ ảnh, `dateRange` cứng). Lượt xem cộng thêm vào `store_daily_views` cùng câu lệnh.

### Validation
- `storeUpsertSchema` mở rộng: `ward` ≤ 80, `vision` / `mission` ≤ 1000, `logoUrl` ∈ `logos`, `coverUrl` ∈ `covers` ∪ ảnh mẫu, mảng media đúng trần S5, `team[].name/role` 1–80,
  `certs[].name` 1–120 + `imageUrl` bắt buộc, `docs[]` {name, url, bytes}, `videos[]` {url, title ≤ 120}, `phones[]` theo regex hotline, `emails[]` email, `addresses[]` ≤ 200,
  `socials` mỗi mục '' hoặc URL / tên miền ≤ 200.
- Presign: `store-video` MIME `video/mp4 | video/webm | video/quicktime` ≤ 100 MB; `store-doc` MIME pdf / ppt / pptx / doc / docx ≤ 20 MB; kind ảnh mới ≤ 5 MB.

### Error Handling
- TK Cá nhân 403 `BUSINESS_ONLY` (D-75 giữ); chưa có gian hàng 404; Xuất bản / Lưu thay đổi thiếu bước → 400 câu lỗi bước đầu tiên + `path` `step.N`;
  media không phải của chủ / chưa PUT / sai MIME / quá cỡ → 400; tệp thực thi đội lốt → `FILE_REJECTED` (xoá object); Admin đang ẩn → 409 khi xuất bản.

## ACCEPTANCE CRITERIA
- Given TK DN trial / active chưa có gian hàng và TK có gian hàng đang hiện When chạy migration Then TK đầu có gian hàng `draft` `auto_created`, TK sau không đổi; chạy lại không tạo thêm (db int).
- Given đăng ký TK DN mới When worker chạy outbox Then có gian hàng Nháp; TK Cá nhân không có (int).
- Given Nháp thiếu ảnh bìa When Xuất bản Then 400 "Vui lòng chọn hoặc thêm ảnh bìa"; Lưu nháp vẫn được (int + unit `storeStepErrors`).
- Given gian hàng đang hiện When "Lưu thay đổi" đủ bước Then vẫn `published`, Khám phá thấy thay đổi; thiếu hotline → 400 (int).
- Given URL logo / video / tài liệu của người khác hoặc chưa tải When lưu Then 400; `.exe` đổi tên `.pdf` ở hồ sơ năng lực → `FILE_REJECTED` (int).
- Given 10k gian hàng × 30 ngày lượt xem When GET dashboard Then EXPLAIN dùng PK `(store_id, day)`, không Seq Scan (int).
- Given Portal When đi 5 bước, thêm logo / bìa / đội ngũ / chứng nhận / SP / hotline, Xuất bản Then toast "Gian hàng đã xuất bản và hiển thị ngay trên Gian hàng địa phương",
  chi tiết hiện đủ khối thật; bấm bước 5 khi bước 1 thiếu → toast lỗi bước 1 (e2e MSW).
- Given parity v4.2 When so Gian hàng của tôi (trình tạo bước 1 → 5, dashboard) và chi tiết Then ≤ 3% ở 1440 + 390 (P-108, P-109, ID mới).

## CONSTRAINTS
- DO NOT: số liệu giả trên dashboard / chi tiết; nhận data URL; query trong vòng lặp; đổi trạng thái không có điều kiện; hardcode giá; check tên vai trò; ẩn control prototype có.
- REUSE: `ImageRefService` (ảnh), `upload-safety.ts` (đuôi / chữ ký), `MediaGcService`, `StoreRepository.step`, `useImageUpload` / `uploadImage`, `storeInitials`, `completeness`.
- SKIP: khối "Dự án OPC" + "+ Đăng dự án OPC" (TIP-V42-711); bucket S3 production; nén / chuyển mã video.

## ⚠️ BUILDER-CHECKLIST
- [ ] Migration `--create-only` rồi sửa SQL (INSERT Nháp idempotent); áp `opchub_dev` + `opchub_test`; test migration
- [ ] Điều kiện bước một nguồn (`storeStepErrors`) cho server + FE + MSW; câu đúng prototype
- [ ] Media kiểm chủ sở hữu + `head` + chữ ký; outbox / GC cùng transaction; EXPLAIN ≥ 10k cho lượt xem theo ngày
- [ ] FE ≤ 400 dòng / file, hàm ≤ 80; 10 ngôn ngữ; parity 1440 + 390; e2e không tụt
