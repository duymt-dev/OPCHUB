# OPCHUB — Task Graph

> **Đồ thị hiện hành: V4.6** (ngay dưới). V4.2, V4, V2, B1 → B6 đã xong, giữ để tra cứu.
> (Lịch sử 23/10/2026 — V4 (SRS-4.0, D15): 16 TIP, 5 pha, thiết kế `plans/V4-BLUEPRINT.md`; nguồn REQ D15 (REQ-501 → 517) + D-67 → D-88.)
> Git flow (owner 21/10/2026): mỗi TIP nhánh `feature/TIP-<id>-<slug>` từ `dev` mới nhất (hoặc xếp chồng theo GOAL) → PR vào `dev`, **không tự merge**; `dev → main` chỉ qua PR do owner merge.

> **Cập nhật 27/10/2026 — V4.2 (D16, D-93 → D-117).** 14 TIP tuần tự theo `plans/GOAL-V4.2.md` — **đã xong** (V42-701 → 714, PR #65; `reports/V4.2-progress.md`, `V4.2-M1` → `M4-completion.md`). Giữ để tra cứu.
> Phần V4 bên dưới đã xong (V4-601 → 624), giữ để tra cứu.

> **Cập nhật 04/11/2026 — V4.6 (D17, D-118 → D-127).** Phần **V4.6** ngay dưới là đồ thị đang chạy (12 TIP, **tuần tự** theo `plans/GOAL-V4.6.md`, thứ tự D-126).
> Nguồn REQ: `01-REQUIREMENTS-MATRIX.md` D17 (REQ-616 → 630); đối chiếu đặc tả ↔ code: `audit/SPEC-V4.6-DELTA.md` (P1 → P17).
> **TIP viết đến đâu làm đến đấy**: chưa có file TIP nào cho v4.6; cột "Vùng file" dưới đây chỉ là dự kiến, chốt trong từng TIP theo code `dev` lúc viết.
> Tiến độ: `reports/V4.6-progress.md` (agent tạo khi bắt đầu V46-801).

## V4.6 — DEPENDENCY GRAPH

```
801 gdv-appoint ── 802 gdv-revenue-share ──┬─ 803 admin-affiliate-policy
   (nền)              (nền)                └─ 804 portal-my-region
805 renewal-reminders        (sau 801: bỏ qua GĐ Vùng đương nhiệm)
806 bank-reconcile-settings  (dùng adapter bank-webhook hiện có, D-123 / D-125)
807 group1-audit-conversion  (sau 801: chuyển đổi theo vùng; sau 803: BR-463 hoa hồng 0đ)
808 global-search ── 809 need-suggestions ── 810 store-public-page
811 ai-providers + app-notify-settings (mở rộng llm-config của V42-712)
812 parity-v4.6 + acceptance (cuối, sau tất cả)
```

Chạy **một TIP một lúc** theo số thứ tự 801 → 812 (GOAL-V4.6), dù đồ thị cho phép song song. Tên slug chốt khi viết TIP.

## V4.6 — TIP SUMMARY TABLE

| TIP | Tên | REQ / D | Phụ thuộc | P# (`SPEC-V4.6-DELTA`) | Ước lượng | Vùng file dự kiến (chốt trong TIP) |
|---|---|---|---|---|---|---|
| V46-801 | [TIP](tips/TIP-V46-801-gdv-appoint.md) · nhánh `feature/TIP-V46-801-gdv-appoint` · **TIP viết, chưa code** — GĐ Vùng — dữ liệu + bổ nhiệm / thu hồi: 3 vùng cố định, mỗi vùng đúng 1, mỗi TV 1 vùng, mỗi tỉnh 1 vùng; tỉnh phụ trách, tài khoản nhận, lịch sử; trạng thái phí "Miễn phí · GĐ Vùng" (transition + `isFeeUsable` + paywall + nhắc phí bỏ qua); thu hồi giữ hạn phí cũ (BR-462); EM-GDV1/2; permission key; audit; Admin › Affiliate › Cấu hình GĐ Vùng | REQ-616, D-120, D-121 | — | P6, P9, P16, P17 | L | schema mới GĐ Vùng + `membership-fee.prisma` (enum), `shared/{permissions.ts,membership/**}`, `srv/membership-fee/**`, `srv/affiliate/**` hoặc module mới, mail template, `admin/features/{affiliate,fees,settings}/**`, MSW + seed |
| V46-802 | [TIP](tips/TIP-V46-802-gdv-revenue-share.md) · nhánh `feature/TIP-V46-802-gdv-revenue-share` · **TIP viết, chưa code** — Sổ chia sẻ Media Soft ↔ GĐ Vùng: 3 thông số Chính sách, năm của khách (backfill), ghi khi phí / Gọi vốn được đối soát (outbox), gán theo tỉnh, vùng trống → Media Soft, kỳ chi cuối tháng, Chi trả từng GĐ Vùng (idempotent), lịch sử chi trả; Admin › Affiliate › GĐ Vùng | REQ-617, D-119, D-121, D-122 | 801 | P6 | XL | schema sổ chia sẻ + kỳ chi, migration backfill, `srv/affiliate/**` (hoặc module GĐ Vùng), outbox consumer đối soát, worker chốt kỳ, `admin/features/affiliate/**` |
| V46-803 | [TIP](tips/TIP-V46-803-affiliate-policy-reference.md) · nhánh `feature/TIP-V46-803-affiliate-policy-reference` · **TIP viết, chưa code** — Admin › Affiliate: Chính sách theo §31, Hoa hồng chỉ tham khảo (bỏ chi trả trực tiếp, "Xem đối soát", "GĐ Vùng chi"), cột "Thuộc vùng (theo tỉnh)" chỉ hiển thị; hoa hồng theo năm của khách (năm 2 → tối đa % gia hạn, D-131); seed / MSW sinh lại | REQ-619, D-119, D-121, D-131 | 802 | P7, P8 | XL | `srv/affiliate/**`, `shared/api-domains/affiliate*`, `admin/features/affiliate/**`, seed + mock affiliate |
| V46-804 | [TIP](tips/TIP-V46-804-portal-my-region.md) · nhánh `feature/TIP-V46-804-portal-my-region` · **TIP viết, chưa code** — Portal › Affiliate › tab "Vùng của tôi" (chỉ xem) + banner GĐ Vùng; consumer `regional_share.recorded` (thông báo khoản mới, đóng M1); nhãn affiliate gọn (BR-495); danh sách giới thiệu theo khoản (D-131) | REQ-618, REQ-630 | 803 | P5 | M | `srv/affiliate/controllers/me*`, `shared/api-domains/affiliate*`, `portal/features/affiliate/**`, `messages/vi/*.json` |
| V46-805 | [TIP](tips/TIP-V46-805-renewal-reminders.md) · nhánh `feature/TIP-V46-805-renewal-reminders` · **TIP viết, chưa code** — Nhắc gia hạn: Cài đặt › Nhắc gia hạn (mốc 30 / 7 / 1, Email + Thông báo, **không Zalo**), job hằng ngày dùng `FeeReminder`, gửi tay từng người / tất cả, cột Lần gửi; bỏ qua GĐ Vùng đương nhiệm | REQ-620, D-125 | 801 | P11 | M | `membership-fee.prisma` (`FeeReminder`), `srv/membership-fee/**`, `srv/settings/**`, worker `fee.processor`, `admin/features/settings/**` |
| V46-806 | [TIP](tips/TIP-V46-806-bank-reconcile-settings.md) · nhánh `feature/TIP-V46-806-bank-reconcile-settings` · **TIP viết, chưa code** — Cài đặt › Đối soát ngân hàng: webhook URL, khóa bí mật + tạo lại, bật / tắt tự kích hoạt, giao dịch gần đây 4 trạng thái, Gán / Ghi nhận thiếu, cú pháp hiển thị `OPCHUB …` | REQ-621, D-123 | — | P12 | M | `integrations/bank-webhook/**`, `srv/membership-fee/services/reconcile*`, `srv/settings/**`, `admin/features/settings/**` |
| V46-807 | [TIP](tips/TIP-V46-807-group1-audit-conversion.md) · nhánh `feature/TIP-V46-807-group1-audit-conversion` · **TIP viết, chưa code** — Nhóm 1 + minh bạch: BR-461, BR-463, BR-465; nhãn quyền `affiliate.payout` → "Chi trả GĐ Vùng" (D-132); nhật ký thao tác Admin đủ phủ + Xuất CSV 4 màn; chuyển đổi theo vùng ở Tổng quan; copy đăng nhập / chào | REQ-622 → 624, REQ-630, D-127 | 801, 803 | P1, P10, P15 | L | `portal/features/{chat,auth}/**`, `srv/affiliate/**` (0đ), `srv/account/**` + worker `account-lock`, audit interceptor, `srv/export/**`, `srv/dashboard/**`, `admin/features/{overview,settings}/**` |
| V46-808 | [TIP](tips/TIP-V46-808-global-search.md) · nhánh `feature/TIP-V46-808-global-search` · **TIP viết, chưa code** — Tìm kiếm chung topbar Portal / Admin (server, 4 kết quả / nhóm, index phù hợp) | REQ-625 | — | P2 | M | module search mới, migration index (`pg_trgm` / `unaccent`), `shared/api-domains/search*`, `{portal,admin}/features/shell/**` |
| V46-809 | [TIP](tips/TIP-V46-809-need-suggestions.md) · nhánh `feature/TIP-V46-809-need-suggestions` · **TIP viết, chưa code** — Gợi ý nhu cầu phù hợp gian hàng trên Dashboard (chấm điểm BR-478 → 480, không gọi LLM) | REQ-626 | — | P3 | M | `srv/local-business/need*`, `shared/api-domains/needs.ts`, `portal/features/dashboard/**` |
| V46-810 | [TIP](tips/TIP-V46-810-store-public-page.md) · nhánh `feature/TIP-V46-810-store-public-page` · **TIP viết, chưa code** — Trang công khai gian hàng `/g/<slug>` (SSR, chỉ trường công khai, bật / tắt Google = `noindex`, tiêu đề, mô tả ≤ 160, sao chép link, xem như khách) | REQ-627 | — | P4 | L | `local-business.prisma` (slug, SEO), `srv/local-business/store*` + controller public, `portal/app/g/[slug]/**`, `portal/features/stores/**` |
| V46-811 | [TIP](tips/TIP-V46-811-ai-providers-app-notify.md) · nhánh `feature/TIP-V46-811-ai-providers-app-notify` · **TIP viết, chưa code** — Nhà cung cấp AI nhiều bên: phân bổ theo chức năng + dự phòng, hạn mức / ngân sách / cảnh báo, nhật ký gọi AI 90 ngày, ẩn PII; **ẩn dòng Trợ lý**; màn Ứng dụng & thông báo chỉ lưu cấu hình (không Web Push) | REQ-628, REQ-629, D-124, D-125 | — | P13, P14 | L | `llm-config.prisma`, `srv/llm-config/**`, `integrations/llm/**`, `srv/settings/**`, `admin/features/settings/**` |
| V46-812 | [TIP](tips/TIP-V46-812-parity-acceptance.md) · nhánh `feature/TIP-V46-812-parity-acceptance` · **TIP viết, chưa code** — Đo parity lại toàn bộ màn đổi ở v4.6 (P1 → P17) + nghiệm thu AT-GDV01 → 07, TC-461 → 494 trên server dev | D-118 | tất cả | P1 → P17 | L | `e2e/{parity,behavior,server}/**`, `reports/{ui-parity/**,V4.6-acceptance.md}` |

Tổng: 4 M · 6 L · 1 XL (+ 812 L). Mốc: **M1 = 801 → 804**, **M2 = 805 → 807**, **M3 = 808 → 812** → `reports/V4.6-M<n>-completion.md` (số thật, SHA).
Cổng mỗi TIP: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; e2e MSW không tụt so với `dev` + e2e server
cho luồng TIP đụng tới; **parity ≤ 3% (1440 + 390) cho mọi màn TIP đụng tới**; query mới có `EXPLAIN (ANALYZE, BUFFERS)` ≥ 10k dòng; migration sạch trên `opchub_dev` + `opchub_test`.

## V4.6 — TRẢ NỢ (sau 812, danh sách ở [`plans/V4.6-DEBT.md`](plans/V4.6-DEBT.md))

| TIP | Tên | Nguồn nợ | Phụ thuộc | Ước lượng | Vùng file dự kiến (chốt trong TIP) |
|---|---|---|---|---|---|
| V46-813 | [TIP](tips/TIP-V46-813-debt-code.md) · nhánh `feature/TIP-V46-813-debt-code` · **TIP viết, chưa code** — Nợ code nhóm A (A1 → A12): Tổng quan chat > 100 nhóm, xóa `llm_configs` + `BOT_LLM_PROVIDER`, chữ 403 GĐ Vùng, log "Chưa cấu hình AI", lint `<img>`, test thiếu 801 / 802 / 803 / 805 / 807 | 801 → 811 completion | 812 | L | `srv/chat/**`, `llm-config.prisma`, `srv/llm-config/**`, `common/config/env.schema.ts`, `common/integrations/llm-provider.ts`, `test/{regional-director,affiliate,audit}/**`, `e2e/behavior/**` |
| V46-814 | [TIP](tips/TIP-V46-814-test-stability.md) · nhánh `feature/TIP-V46-814-test-stability` · **TIP viết, chưa code** — Ổn định test + parity nhóm A (A13 → A22): flake bot, timeout audit / Vitest fork, plan persona-turn, native 147, 14 ảnh miễn, nhiễu chụp, chuỗi migration DB trắng + `down.sql`, một lượt full gate xanh | 804 / 806 / 808 / 809 / 812 | 813 | L | `e2e/{parity,behavior}/**`, `apps/server/test/**`, `vitest` config, `reports/ui-parity/**` |
| V46-815 | [TIP](tips/TIP-V46-815-live-ai-check.md) · nhánh `feature/TIP-V46-815-live-ai-check` · **TIP viết, chưa code** — B2: kiểm AI bằng key thật — lượt `@live` chạy tay, "Kiểm tra kết nối" từng nhà cung cấp có key, sửa adapter nếu lệch chuẩn OpenAI (D-137) | 811 | 814 | S–M | `e2e/llm/**`, `packages/integrations/src/llm/**` (chỉ khi lệch) |
| V46-816 | [TIP](tips/TIP-V46-816-web-push-pwa.md) · nhánh `feature/TIP-V46-816-web-push-pwa` · **TIP viết, chưa code** — B1: Web Push + PWA thật qua dịch vụ đẩy của trình duyệt (VAPID, `web-push`, `push_subscriptions`, manifest + service worker, công tắc TV) (D-137, thay D-125) | 805 / 811 | 815 | L | `packages/db/prisma/schema/**`, `srv/notification/**`, `srv/settings/**`, `worker/**`, `portal/public/**`, `portal/features/{account,shell}/**`, `docs/adr/**` |

Chạy tuần tự 813 → 814 → 815 → 816 — **đã xong**, release #99 lên production 08/11/2026.

## V4.6 — VẬN HÀNH AI (D-138)

| TIP | Tên | Nguồn nợ | Phụ thuộc | Ước lượng | Vùng file dự kiến (chốt trong TIP) |
|---|---|---|---|---|---|
| V46-817 | [TIP](tips/TIP-V46-817-ai-ops.md) · nhánh `feature/TIP-V46-817-ai-ops` · **TIP viết, chưa code** — Vận hành AI: B3 nhật ký gọi AI (xem / lọc / xuất), B4 AI cho Soạn nội dung / Kiểm duyệt, B5 cảnh báo ngân sách + giữ chỗ chi phí + model theo chức năng | 811 | 816 | L | `srv/llm-config/**`, `srv/settings/**`, `packages/integrations/src/llm/**`, `admin/features/settings/**` |

Các mục B khác để sau (D-138). TIP viết lúc tới bước, dựa trên `dev` lúc ấy.

## V4.6 — ĐỢT 818 → 821 (D-139, release một lượt sau 821)

| TIP | Tên | Nguồn nợ | Phụ thuộc | Ước lượng | Vùng file dự kiến (chốt trong TIP) |
|---|---|---|---|---|---|
| V46-818 | [TIP](tips/TIP-V46-818-admin-log-search.md) · nhánh `feature/TIP-V46-818-admin-log-search` · **DONE** - source5c562e14; static/unit/both builds PASS, full integration2271/2271, MSW397+5 existing skips, native focused PASS; parity D134/D139 classified, PR104 ready for review, no auto-merge. [Completion](reports/TIP-V46-818-completion.md) | 807 / 808 / 809 | 817 | M | `srv/settings/**`, `packages/shared/src/api-domains/{audit-log-page,regional-directors,reports}.ts`, `packages/ui/src/global-search/**`, `srv/local-business/**`, `admin/features/settings/**` |
| V46-820 | [TIP](tips/TIP-V46-820-public-seo.md) · nhánh `feature/TIP-V46-820-public-seo` · **DONE** — SEO trang công khai (B15): sitemap, robots, JSON-LD, ảnh OG, lượt khách riêng, xóa cache theo phí / khóa / xóa TK | 810 | 818 | M | [Report](reports/TIP-V46-820-completion.md) · [PR105](https://github.com/duymt-dev/OPCHUB/pull/105) · `3a199fb4` |
| V46-821 | [TIP](tips/TIP-V46-821-finance-region.md) · nhánh `feature/TIP-V46-821-finance-region` · **TIP viết, chưa code** — Tài chính & vùng (B7 → B10): sửa tài khoản nhận GĐ Vùng (P0), tự thu hồi khi khóa / xóa TK, QR trong mail + mail Gọi vốn hết hạn, logger client, trang + CSV affiliate vùng; B9 đóng | 801 → 805 | 820 | L | — |
| V46-822 | [TIP](tips/TIP-V46-822-admin-profile.md) · nhánh `feature/TIP-V46-822-admin-profile` · **TIP viết, chưa code** — Hồ sơ quản trị viên & Đổi mật khẩu Admin: xem & sửa thông tin cá nhân (họ tên, SĐT, avatar), đổi mật khẩu trong phiên, bảo vệ GC, đồng bộ avatar lên Admin Topbar | RB-R02, RB-R03, D-52, D-89, SEC-R01 | 821 | M | `packages/shared/src/api/admin-auth.ts`, `apps/server/src/modules/admin-account/**`, `apps/server/src/modules/uploads/media-gc.service.ts`, `apps/admin/src/app/(admin)/profile/**`, `apps/admin/src/features/profile/**`, `apps/admin/src/features/shell/**` |

Số 819 không dùng (gộp vào 818 theo D-139).

## V4.6 — GIT (nhánh xếp chồng, không tự merge)

- TIP #1 tách từ `dev`. TIP #k: PR #k-1 đã merge → tách từ `dev` mới; chưa merge → tách từ nhánh TIP #k-1 (PR `base` = nhánh đó, ghi "Stacked on #…").
- Nhánh `feature/TIP-V46-8xx-<slug>`; commit đường dẫn cụ thể, cấm `git add -A`; cấm tự merge, auto-merge, push `main`, force-push nhánh đã có PR.
- Mỗi TIP một thư mục migration riêng (`--create-only` rồi sửa SQL).

## V4.6 — PARITY UI (prototype `docs/spec/index.html` v4.6, chuẩn `standards/frontend/ui-parity.md`)

| TIP | Màn phải đo (P# trong `SPEC-V4.6-DELTA.md` §2) |
|---|---|
| V46-801 | Admin › Affiliate › Cấu hình GĐ Vùng (P6), Admin › Phí trạng thái "Miễn phí · GĐ Vùng" (P9), Marketing › Email EM-GDV1/2 (P16), Cài đặt › Vai trò quyền GĐ Vùng (P17) |
| V46-802 | Admin › Affiliate › GĐ Vùng: khoản ghi nhận, "Phải chi cuối tháng", Chi trả, lịch sử (P6) |
| V46-803 | Admin › Affiliate › Chính sách (P7), › Hoa hồng (P8) |
| V46-804 | Portal › Affiliate › Vùng của tôi + banner (P5) |
| V46-805 | Admin › Cài đặt › Nhắc gia hạn (P11) |
| V46-806 | Admin › Cài đặt › Đối soát ngân hàng (P12) |
| V46-807 | Đăng nhập / trang chào (P1), Admin › Tổng quan bảng chuyển đổi (P10), Nhật ký hoạt động (P15) |
| V46-808 | Topbar Portal + Admin, dropdown kết quả (P2) |
| V46-809 | Dashboard Portal thẻ "Nhu cầu phù hợp" (P3) |
| V46-810 | Gian hàng của tôi › Trang công khai + trang `/g/<slug>` (P4) |
| V46-811 | Admin › Cài đặt › Nhà cung cấp AI (P13, không có dòng Trợ lý), › Ứng dụng & thông báo (P14) |
| V46-812 | Đo lại toàn bộ P1 → P17 + màn cũ bị ảnh hưởng; tổng hợp `reports/ui-parity/results.md` |

---

## V4.2 — DEPENDENCY GRAPH (đã xong)

```
701 bugs-b1-b6 ── 702 trial-fee-gate ── 703 price-config ──┬─ 704 reconcile-28-1 ── 705 vietqr ── 706 fundraising-renew-review
                                                           ├─ 707 affiliate-all-members (sau 704: hoa hồng theo khoản đã đối soát)
                                                           └─ 708 admin-fees-members-onboarding
709 chat-topics-group-files (sau 701: B4 / B5 / B6 cùng file chat / upload)
710 store-builder (sau 702: Nháp theo trial) ── 711 projects-instant-store
712 llm-config-admin ── 713 bot-schedule-reply-ai
714 parity-v4.2 + acceptance (cuối)
```

## V4.2 — TIP SUMMARY TABLE (đã xong)

| TIP | Tên | REQ / D | Phụ thuộc | Ước lượng | Vùng file chính (chi tiết trong TIP) |
|---|---|---|---|---|---|
| V42-701 | Sửa lỗi B1 → B6 | REQ-615, D-117 | — | M | `srv/affiliate/repositories/affiliate-write*`, `srv/project/services/fundraising*`, `integrations/bank-webhook/content.ts`, `srv/chat/services/message*`, `srv/moderation/**`, `shared/api-domains/uploads.ts`, `srv/uploads/**` |
| V42-702 | Miễn phí 3 tháng + `isFeeUsable` + migration TK cũ + nhắc T-7 / T-0 + huỷ khoản 600.000 | REQ-601, D-94 1A/2A, D-113, D-116 | 701 | L | `db/schema/membership-fee.prisma`, `shared/membership/**`, `srv/membership-fee/**`, `srv/common/guards*`, socket auth, `srv/register/**`, worker schedule, `portal/features/{membership,shell}/**` |
| V42-703 | Cấu hình bảng giá (`price_configs`, lịch sử, audit, cache) + tab Admin | REQ-603, D-94 5A | 702 | L | `db/schema/price-config.prisma`(new), `srv/pricing/**`(new), `shared/api-domains/pricing*`(new), `admin/features/settings/**`, mọi chỗ đọc `plans.ts` / `FUNDRAISING_PLAN` |
| V42-704 | Đối soát §28.1 + nội dung CK Gọi vốn + khớp tay Gọi vốn + email biên nhận | REQ-610, D-104, D-105, D-113 | 703 | L | `integrations/bank-webhook/**`, `srv/membership-fee/services/reconcile*`, `srv/project/services/fundraising*`, `srv/mail/templates-*`, `admin/features/fees/**` (đối soát) |
| V42-705 | VietQR EMVCo ở server + popup Gọi vốn 2 cột, 1 dự án / khoản | REQ-604, D-96, D-94 4B | 704 | M | `srv/payment-qr/**`(new), `shared/api-domains/membership*`, `portal/features/{membership,projects}/**` (pay-details, fundraising-host) |
| V42-706 | Gia hạn Gọi vốn khi hết hạn + từ chối → bổ sung → duyệt lại | REQ-611, D-106, D-113 | 705 | M | `srv/project/{domain,services}/fundraising*`, `admin/features/projects/**`, `portal/features/projects/**` |
| V42-707 | Affiliate mọi TV, mã luôn hoạt động, cột `plan`, khôi phục, làm tròn | REQ-602, REQ-613, D-94 3A, D-110 | 704 | L | `db/schema/affiliate.prisma`, `srv/affiliate/**`, `srv/register/**` (outbox), `{admin,portal}/features/affiliate/**` |
| V42-708 | Admin › Phí + Thành viên, tự nhắc khởi đầu, FX-02 → 04 | REQ-608, REQ-609, D-100, D-101, D-107, D-115 | 703 | M | `srv/membership-fee/admin*`, `srv/onboarding/**`, `admin/features/{fees,members}/**`, `portal/features/{onboarding,dashboard}/**` |
| V42-709 | Chủ đề đổi tên + xoá mềm, File chia sẻ nhóm, đính kèm 20 MB | REQ-606, REQ-614, D-98, D-111 | 701 | L | `db/schema/chat.prisma`, `srv/chat/**`, `srv/community/services/group-admin*`, `portal/features/chat/**`, `admin/features/groups/**` |
| V42-710 | Trình tạo / sửa gian hàng 5 bước + media, Nháp, migration Nháp | REQ-605, D-97, D-114 | 702 | XL | `db/schema/local-business.prisma`, `srv/local-business/store*`, `shared/api-domains/stores.ts`, `shared/api-domains/uploads.ts` (video, tài liệu), `portal/features/stores/**` |
| V42-711 | Dự án hiện ngay + hậu kiểm, ẩn khi chủ hết hạn, đăng Dự án từ gian hàng | REQ-612, D-108, D-109 | 710 | M | `db/schema/project.prisma`, `srv/project/**`, `admin/features/projects/**`, `portal/features/{projects,stores}/**` |
| V42-712 | Cấu hình AI trong Admin (ADR-0008) + stub HTTP test | REQ-607, D-99, D-103 | — | M | `db/schema/llm-config.prisma`(new), `srv/llm-config/**`(new), `integrations/llm/**`, `admin/features/settings/**`, `e2e/llm/**` |
| V42-713 | Bot: lịch, Trả lời từng tin, AI tạo kịch bản hàng loạt, loại hội thoại | REQ-607, D-99, D-112 | 712 | XL | `db/schema/bot.prisma`, `srv/bot/**`, worker bot processor, `shared/api-domains/bot*`, `admin/features/bots/**` |
| V42-714 | Parity v4.2 đo lại toàn bộ + nghiệm thu §27 → §29, E2E-01 → 16 | D-93, D-95 | tất cả | L | `e2e/{parity,behavior,server}/**`, `coding-packs/reports/{ui-parity/**,V4.2-acceptance.md}` |

Tổng: 6 M · 5 L · 2 XL (+ 714 L). Cổng mỗi TIP: lint, typecheck, test, test:int, depcheck, build, e2e MSW + server xanh;
**parity ≤ 3% (1440 + 390) cho mọi màn TIP đụng tới**; migration sạch trên DB native. Mốc M1 = 701–703, M2 = 704–707, M3 = 708–711, M4 = 712–714.

## V4 — PHA VÀ CỔNG KIỂM

| Pha | Nội dung | TIP | Cổng kiểm (mọi pha: lint, typecheck, test, depcheck, e2e msw + server xanh; **parity ≤ 3% cho mọi màn TIP đụng tới**; migration chạy sạch trên DB native; `reports/V4-P<n>-completion.md` kèm SHA) |
|---|---|---|---|
| **V4-P1** | Nền + gỡ quy trình | 601, 603, 604, 605, 606 | Giá 3 gói ở một chỗ; không còn đường duyệt vào nhóm / trạng thái NĐT / quy trình YC / menu Marketing; grep `600000` = 0 ngoài migration + test D-69 |
| **V4-P2** | Tiền + khai báo | 602, 607, 610 | Đối soát kỳ cũ 600.000 và kỳ gói mới đều khớp; hoa hồng = % × phí thực trả; Gọi vốn mua → duyệt → hoa hồng 10% → hết hạn |
| **V4-P3** | Domain mới | 608, 609, 611, 613 | Gian hàng tự tạo khi DN đóng phí; Nhu cầu + gợi ý; Onboarding 8 bước tính từ dữ liệu thật, cột x/8 không N+1; **mọi màn Gian hàng / Nhu cầu / Khởi đầu / Trợ lý parity ≤ 3%** |
| **V4-P4** | Kiểm duyệt + Báo cáo | 612, 614 | §26.6 đủ 4 luật (tự ẩn, khoá N ngày, khôi phục, tự mở) có test integration; CSV B1/B2/B3 đúng cột mẫu |
| **V4-P5** | Parity + nghiệm thu | 615, 616 | Parity v4 đo lại toàn bộ (≤ 3%, DV mới được owner duyệt); test nghiệm thu §27 (D-86) 100% trên server dev |

## V4 — DEPENDENCY GRAPH

```
P1  601 plans-fee-3-tiers ──┬─ 602 affiliate-paid-base ──┐
                            │                            ├─ 610 fundraising-plan
    604 investor-list-only ─┼────────────────────────────┘
                            ├─ 607 declaration-pricing-popup ── 612 moderation-26-6
                            └─ 608 storefront ── 609 local-needs ──┬─ 614 report-export-b123
    603 group-join-instant ────────────────────────────────────────┼─ 611 onboarding-8-steps (cũng sau 607)
    605 service-ticket-catalog ── 613 assistant                    │
    606 nav-27-3-marketing-off ── trước 608, 613, 614 ─────────────┘
P5  615 parity-v4-rebaseline (sau mọi TIP có UI) ── 616 acceptance-27 (cuối)
```

## V4 — TIP SUMMARY TABLE

| TIP | Tên | Pha | REQ / D | Phụ thuộc | Ước lượng | Files touched chính (chi tiết trong TIP) |
|---|---|---|---|---|---|---|
| V4-601 | Phí 3 gói: `MEMBERSHIP_PLANS`, `MembershipFee.plan`, amount theo gói, đối soát, mail, Bảng giá UP-12 + popup, MSW | P1 | REQ-501, D-68/69/81 | — | L | `shared/src/membership/plans.ts`(new), `db/schema/membership-fee.prisma`, `srv/membership-fee/**`, `srv/mail/templates-fee.ts`, admin-fees service, `portal/features/membership/**`, mock `extras/fees-admin/admin/auth` |
| V4-602 | Hoa hồng trên phí thực trả, `CommissionSource`, `fundraisingRate` | P2 | REQ-502, D-70 | 601 | M | `db/schema/affiliate.prisma`, `srv/affiliate/**`, `admin/features/affiliate/**` (tab Chính sách), mock affiliate |
| V4-603 | Vào nhóm ngay; xoá `GroupJoinMode` + join request; migration tự duyệt | P1 | REQ-506, D-71 | — | M | `db/schema/community.prisma`, `srv/community/**` (xoá join-request*), `portal/features/{community,chat}/**`, `admin/features/{groups,members}/**`, mock community |
| V4-604 | NĐT = danh sách + xuất; xoá status, comment, investor-thread, nút Gọi | P1 | REQ-508, D-72 | — | M | `db/schema/investor.prisma`, `srv/investor/**`, `shared/api-domains/investors-admin.ts`, `admin/features/investors/**`, `portal/features/projects/components/{funding-box,invest-modal}.tsx`, mock investor* |
| V4-605 | YC dịch vụ = phiếu + ghi chú @nhắc; xoá quy trình 5 bước, assignee; CRUD danh mục | P1 | REQ-509, D-72 | — | M | `db/schema/service.prisma`, `srv/service/**`, `shared/api-domains/{services,services-admin}.ts`, `admin/features/requests/**`, `portal/features/services/**` |
| V4-606 | Menu §27.3 hai cổng; quyền `local.*`, `reports.view`; gỡ menu + job Marketing | P1 | REQ-514/515, D-73/80 | — | S | `shared/src/permissions.ts`, `portal/features/shell/nav.ts`, `admin/features/shell/nav.ts`, `admin/lib/permission-model.ts`, `server/src/worker/schedules.ts`, messages vi nav |
| V4-607 | Câu xác nhận đăng ký (D-87) + popup Khai báo sau đăng nhập → popup Bảng giá | P2 | REQ-503/504 | 601 | M | `db/schema/account.prisma` (`declared_at`, persona, opcIntent), `srv/account/**` (declaration), `portal/features/{auth,declaration}/**` |
| V4-608 | Gian hàng: `local-business.prisma`, tự tạo khi DN đóng phí, khám phá + lọc §25.2, Gian hàng của tôi, Admin ẩn/hiện | P3 | REQ-510, D-75/84 | 601, 606 | XL | `db/schema/local-business.prisma`(new), `srv/local-business/store*`(new), `portal/features/stores/**`(new), `admin/features/local/**`(new), `shared/api-domains/stores.ts`(new), mock stores(new) |
| V4-609 | Nhu cầu địa phương: đăng/đóng/mở/xoá, gợi ý gian hàng, Admin ẩn/hiện | P3 | REQ-511 | 608 | L | `local-business.prisma` (sequential với 608), `srv/local-business/need*`, `portal/features/needs/**`, `admin/features/local/needs*`, `shared/api-domains/needs.ts`, mock needs |
| V4-610 | Gói Gọi vốn: mua (mã GV), thẩm định, hiện tab Gọi vốn, hoa hồng 10%, nhắc + hết hạn | P2 | REQ-512, D-70/82 | 601, 602, 604 | L | `db/schema/project.prisma`, `srv/project/{domain,services}/fundraising*`, reconcile dispatch theo prefix, `portal/features/projects/**`, `admin/features/projects/**`, worker schedule |
| V4-611 | Onboarding 8 bước (thẻ Dashboard), cờ explore/affiliate_share, `onboarding_progress`, Admin cột x/8 + lọc + Nhắc | P3 | REQ-505, D-76/85/88 | 603, 607, 608, 609 | L | `db/schema/onboarding.prisma`(new), `srv/onboarding/**`(new), `portal/features/onboarding/**`(new), `admin/features/members/**`, mail template nhắc |
| V4-612 | Kiểm duyệt §26.6: tự ẩn khi báo cáo/từ khoá, `ModerationViolation`, khoá N ngày, khôi phục, tự mở; tab trong Nhóm cộng đồng | P4 | REQ-507, D-77/83 | 607 (cùng `account.prisma`) | L | `db/schema/{moderation,account}.prisma`, `srv/moderation/**`, `srv/account/services/{login*,admin-users*}`, worker job auto-unlock, `admin/features/groups/**` (tab), `portal/features/chat/**` (placeholder) |
| V4-613 | Trợ lý OPC Hub ở chân sidebar Portal, mở danh mục dịch vụ & chương trình — **đã gỡ (D-92)** | P3 | REQ-513 | 605, 606 | S | `portal/features/assistant/**`(new), `portal/features/shell/**` (1 dòng) |
| V4-614 | Admin › Báo cáo: xuất CSV B1/B2/B3 theo tháng, audit | P4 | REQ-516, D-78 | 606, 609 | M | `srv/reporting/report-export*`(new), worker export processor, `admin/features/reports/**`(new), `shared/api-domains/reports.ts`(new) |
| V4-615 | Parity v4: đo lại các màn cũ còn lại (màn mới đã đo trong TIP của nó), màn gỡ = `unreachable`, DV mới, tổng hợp `results.md` | P5 | REQ-517, D-79 | mọi TIP có UI | L | `e2e/parity/**`, `coding-packs/reports/ui-parity/**` |
| V4-616 | Nghiệm thu §27 (D-86): UP-01→14, AD-01→12, F01→F09 trên server dev | P5 | D-86 | tất cả | M | `e2e/behavior/**`, `coding-packs/reports/V4-acceptance.md` |

Tổng: 2 S · 7 M · 6 L · 1 XL ≈ 5–6 tuần một thợ, ≈ 3 tuần với 3 thợ song song.

## V4 — PARITY UI (bắt buộc, chuẩn `standards/frontend/ui-parity.md` không đổi)

Ngưỡng **≤ 3% pixel khác (pixelmatch threshold 0.1)** ở 1440 và 390, prototype `docs/spec/index.html` v4. Không nới ngưỡng, không mask che lệch;
lệch có chủ đích ghi `reports/ui-parity/deviations.md` chờ owner duyệt. **Mỗi TIP có UI tự thêm dòng vào `screens.md` + spec parity + test hành vi
cho màn của mình và phải đạt ≤ 3% trước khi báo DONE**; V4-615 chỉ đo lại các màn cũ không thuộc TIP nào và tổng hợp.

| TIP | Màn mới / đổi phải đo (chuỗi thao tác trên prototype) | ID parity mới |
|---|---|---|
| V4-601 | Portal › Bảng giá 3 gói (`pTab=services`), popup thanh toán theo gói, Admin › Phí thành viên (cột gói) | P-99…, D-90… |
| V4-603 | Cộng đồng: nút Tham gia không còn form duyệt; Chat › Thành viên không còn mục chờ duyệt | cập nhật P-xx cũ |
| V4-604 | Admin › Nhà đầu tư (danh sách + xuất, không trạng thái/bình luận); tab Gọi vốn Portal | cập nhật D-xx cũ |
| V4-605 | Admin › Yêu cầu dịch vụ (phiếu + ghi chú, không trạng thái) + Danh mục; Portal › form tư vấn | cập nhật + mới |
| V4-606 | Sidebar Portal 9 mục, sidebar Admin §27.3 (+ Báo cáo, không Marketing) | cập nhật A/P/D shell |
| V4-607 | Đăng ký (câu xác nhận), popup Khai báo Cá nhân, popup Khai báo Doanh nghiệp | A-xx, P-xx mới |
| V4-608 | **Gian hàng địa phương** (`pTab=store`): khám phá + lọc + ô danh mục + rỗng; chi tiết 1 trang; Gian hàng của tôi (sửa, sản phẩm, xuất bản); Admin › Gian hàng (`aTab=stores`) | P-xx, D-xx mới |
| V4-609 | **Nhu cầu địa phương** (`pTab=needs`): danh sách, form đăng (ngành "Khác"), Nhu cầu của tôi, thẻ gợi ý gian hàng; Admin › Nhu cầu (`aTab=lneeds`) | P-xx, D-xx mới |
| V4-610 | Popup Gói Gọi vốn, tab Gọi vốn dự án; Admin › Dự án thẩm định Gọi vốn | P-xx, D-xx mới |
| V4-611 | Dashboard thẻ Khởi đầu 8 bước (chưa phí / đã phí, Cá nhân / DN); Admin › Thành viên cột x/8 + lọc + Nhắc | P-xx, D-xx mới |
| V4-612 | Chat: tin "đã bị ẩn do vi phạm"; Admin › Nhóm cộng đồng › tab Kiểm duyệt (Khôi phục, khoá N ngày); Đăng nhập báo ngày mở khoá | P/D/A mới |
| V4-613 | Trợ lý OPC Hub ở chân sidebar Portal (đóng/mở) | P-xx mới |
| V4-614 | Admin › Báo cáo (`aTab=reports`) | D-xx mới |
| V4-615 | Đo lại toàn bộ màn còn lại trên v4; màn gỡ (`network`, `netreport`, `netplan`, `netkpi`, `marketing`, Portal `network`) = `unreachable` | tổng hợp |

## V4 — SONG SONG

| Đợt | Chạy song song | Lý do an toàn |
|---|---|---|
| 1 | 601 ‖ 603 ‖ 604 ‖ 605 ‖ 606 | Khác file schema + module; mock-data khác file domain |
| 2 | 602 ‖ 607 ‖ 608 ‖ 613 | 602 affiliate, 607 account, 608 module mới, 613 FE thuần |
| 3 | 609 ‖ 610 ‖ 612 | 609 local-business, 610 project, 612 moderation + account (607 đã merge) |
| 4 | 611 ‖ 614 | onboarding vs reporting |
| 5 | 615 → 616 | tuần tự |

File dùng chung chỉ **thêm dòng** (giữ `.wire-lock`): `{admin,portal}/features/shell/nav.ts`, `messages/vi/*.json`, `packages/shared/src/index.ts`, `apps/server/src/worker/schedules.ts`, `app.module`.
Migration: mỗi TIP một thư mục migration riêng; đổi timestamp theo thứ tự merge vào `dev` trước khi mở PR.

---

> **(Lịch sử) 18/10/2026 — GOAL V2-BUILD (SRS-3.6).** Phần **V2** ngay dưới là đồ thị đang chạy. Phần **B1 → B6** (đã xong, SHA `70cfcbb`) giữ nguyên bên dưới để tra cứu.
> Nguồn REQ: `01-REQUIREMENTS-MATRIX.md` D9 → D14 + quyết định D-49 → D-63. Lỗi/nợ: `audit/W1/BUGS.md`, `TECH-DEBT.md`.

## V2 — PHA VÀ CỔNG KIỂM

| Pha | Nhánh | Nội dung | Cổng kiểm (mọi pha: lint, typecheck, test, depcheck, e2e msw + server xanh; **parity ≤ 3% cho mọi màn TIP đụng tới**; audit hồi quy; `reports/V2-P<n>-completion.md` kèm SHA; merge main) |
|---|---|---|---|
| **V2-P0** | `feature/V2-P0-coding-packs` | Cập nhật coding-packs theo SRS-3.6 (REQ, D-xx, số §, TIP, TEST-GAPS) | Không code; commit + push |
| **V2-P1** | `feature/V2-P1-foundation-fixes` | Trả nợ nền W1 + lỗi S1/S2/S3 không thuộc pha sau | BUG S1/S2 trong phạm vi đóng, mỗi lỗi có test bắt; bộ audit W1 không còn 4 lỗi đã biết |
| **V2-P2** | `feature/V2-P2-admin-rbac` | TK quản trị tách khỏi thành viên, 25 quyền, chỉ xem, xem thử, 2FA, đổi MK lần đầu | AT-RB01→06, AT-SEC01 xanh; test ma trận quyền mọi route `/admin` |
| **V2-P3** | `feature/V2-P3-v2-features` | NA còn thiếu, sự kiện Meet/check-in, vai trò trong nhóm, popup V4, không hoàn lại, số liệu thật, parity ver2 | AT-EV, AT-GR, AT-NR, AT-LK04/05 xanh; registry parity cập nhật |
| **V2-P4** | `feature/V2-P4-affiliate` | Module Affiliate §20 | AT-AF01→06 xanh (msw + server) |
| **V2-P5** | `feature/V2-P5-bot-acceptance` | Bot tự động NA-08 + nghiệm thu tổng | UAT-01→31 + mọi AT 100% trên server dev; parity ≤ 3%; TEST-GAPS mục 6 không còn TRỐNG |

## V2 — DEPENDENCY GRAPH

```
P1  101 outbox-reliability ──┬─ 104 lock-revoke-propagation
                             ├─ 107 investor-thread
                             └─ 108 fee-guard-reconcile-ui
    102 media-storage ─────── 111 chat-attachments-covers
    103 richtext-sanitize      105 password-reset-and-links     106 form-errors-hydration
    109 exports-privacy        110 services-validation          112 security-hardening
    113 project-revision-ux    114 marketing-compliance         115 test-standard-audit-gate (cuối P1)
P2  201 admin-accounts-schema ── 202 admin-auth-security ── 203 rbac-guards-live ── 204 admin-fe-roles
P3  301 fee-reminders-status   302 popup-v4-nonrefund   303 events-meet-checkin
    304 groups-topics-roles    305 realtime-metrics-unread   306 retention-housekeeping
    307 parity-registry-v2 (sau 204, 301–305)
P4  401 affiliate-domain ── 402 affiliate-api ──┬─ 403 affiliate-portal
                                                └─ 404 affiliate-admin
P5  501 bot-scheduler ── 502 bot-member-replies ── 503 final-acceptance (sau mọi TIP)
```

## V2 — TIP SUMMARY TABLE

| TIP | Tên | Pha | REQ / BUG / TD chính |
|---|---|---|---|
| V2-101 | Outbox tin cậy, consumer đủ | P1 | TD-023, TD-019, M1 |
| V2-102 | Ảnh qua storage, giới hạn body thống nhất | P1 | REQ-226, BUG-002, 003, 037, TD-014, 015 |
| V2-103 | Sanitize rich text ở server | P1 | REQ-227, BUG-020, TD-017 |
| V2-104 | Khoá TK lan truyền (socket, dự án, nhóm) | P1 | REQ-216, BUG-004, 005, D-55 |
| V2-105 | Đặt lại MK + link mail + SSO redirect | P1 | REQ-217, BUG-001, 023, 034, TD-035 |
| V2-106 | Lỗi tại ô, đăng ký không nuốt lỗi, hydration | P1 | BUG-009, 022, 024, 040, TD-036 |
| V2-107 | Trao đổi nhà đầu tư một luồng | P1 | REQ-211, 371–373, BUG-006, 007 |
| V2-108 | Guard phí tức thời, khớp tay giao dịch, membership.updated | P1 | REQ-202, 203, BUG-014, 018, 025 |
| V2-109 | Xuất dữ liệu + quyền riêng tư | P1 | REQ-214, BUG-013, 016, 017, 021, 039 |
| V2-110 | Validate phiếu tư vấn DN | P1 | REQ-408, BUG-019 |
| V2-111 | Tệp chat thật, ảnh bìa thật, ?join= | P1 | BUG-010, 011, 026, TD-011 |
| V2-112 | Gia cố bảo mật | P1 | BUG-030, 031, 032, TD-018 |
| V2-113 | Bản sửa dự án + UX nhỏ | P1 | REQ-106, BUG-027, 033, 038, 041, 043, 044 |
| V2-114 | Marketing tuân thủ, hàng đợi mail | P1 | REQ-205, BUG-036 |
| V2-115 | Chuẩn test + cổng audit | P1 | TD-032–035, D-63 |
| V2-116 | Google SSO thật (+ ChatGPT/Gemini/DeepSeek), state/nonce/PKCE, chặn fake ở production — nhánh `feature/login-sso` — **DONE** [báo cáo](reports/TIP-V2-116-completion.md) | P1 | REQ-002, 217, D-64, OQ-04, TD-009 |
| V2-117 | Portal đa ngôn ngữ: dịch đủ 9 ngôn ngữ, tiêu đề trang, định dạng số theo locale, test khoá/biến — nhánh `feature/i18n-languages` — **DONE** [báo cáo](reports/TIP-V2-117-completion.md) | P1 | D-06, D-65, Q-24 |
| V2-118 | Tra MST thật qua DLPL API → ESGOO → VietQR, env `DLPL_API_KEY` — nhánh `feature/TIP-V2-118-tax-lookup-dlpl` | P1 | REQ-001, D-65, D-17 |
| V2-201 | Schema TK quản trị, 25 khoá, seed vai trò | P2 | REQ-322, 324, 325, D-52 |
| V2-202 | Auth Admin: đổi MK lần đầu, 2FA, khoá | P2 | REQ-201, 215, 217, 323, 328, 351–353, BUG-015 |
| V2-203 | Guard 25 khoá, chỉ xem, quyền hiệu lực ngay | P2 | REQ-228, 324, 325, 327, BUG-035 |
| V2-204 | Admin FE: vai trò, ẩn menu, chỉ xem, xem thử | P2 | REQ-321, 326, 327, 329, BUG-042 |
| V2-301 | Hạn phí + nhắc T-30/T-7/T-0/T+3 | P3 | REQ-204, 383, D-57 |
| V2-302 | Popup V4 + không hoàn lại | P3 | REQ-219, 381, 382, 391, 409, D-58, D-60 |
| V2-303 | Sự kiện Meet, Sắp diễn ra, check-in, scheduler 15' | P3 | REQ-223, 341–345, 405, D-59 |
| V2-304 | Chủ đề Admin, khởi tạo nhóm, vai trò trong nhóm | P3 | REQ-209, 212, 218, 229, 361, 362, D-56, D-61 |
| V2-305 | Số liệu realtime, chưa đọc, bỏ số giả | P3 | REQ-210, 224, 225, BUG-012, 028, 029 |
| V2-306 | Lưu giữ, dọn dữ liệu, rà NA còn lại | P3 | REQ-206, 207, 213, 220–222 |
| V2-307 | Registry parity ver2 + baseline mới | P3 | ui-parity |
| V2-401 | Affiliate domain + outbox phí → hoa hồng — [backend xong](reports/TIP-V2-401-completion.md) | P4 | REQ-301, 305–307, D-53 |
| V2-402 | Affiliate API — [backend xong](reports/TIP-V2-402-completion.md) | P4 | REQ-302–304, 308–310 |
| V2-403 | Affiliate Portal + mã giới thiệu khi đăng ký — [Portal xong](reports/TIP-V2-403-completion.md) | P4 | REQ-302–304, 311 |
| V2-404 | Affiliate Admin | P4 | REQ-308–310, 312, 410 |
| V2-501 | Bot scheduler tự động 100% | P5 | REQ-208, BUG-008, D-50 |
| V2-502 | Bot trả lời thành viên, Dashboard | P5 | REQ-411, UAT-14, UAT-15 |
| V2-503 | Nghiệm thu tổng + cập nhật TEST-GAPS/BUGS | P5 | REQ-401–412, mọi AT |

## V2 — SONG SONG

- P1: 101 làm trước (104, 107, 108 cần outbox tin cậy). 102 trước 111. Các TIP còn lại song song theo `Parallel-safe with` trong từng TIP. 115 chạy cuối P1.
- P2 tuần tự 201 → 202 → 203 → 204 (đổi mô hình auth).
- P3: 301–306 song song (theo khai báo file); 307 cuối P3.
- P4 sau P2 (vai trò Kế toán) và 302 (form đăng ký mới).
- P5: 501 → 502 → 503.
- **Kiểm chồng file (18/10/2026):** trong cùng pha, mọi cặp TIP đụng chung file đều đã khai báo `sequential` trong TIP. Giữa các pha có 119 file dùng chung (`worker-app.module.ts`, `outbox/events.ts`, `queues.ts`, `schedules.ts`, `env.schema.ts`, `index.ts` barrel, `messages/vi/*.json`, seed…): các pha chạy **tuần tự** nên không xung đột; TIP pha sau rebase lên `main` mới nhất, chỉ thêm dòng vào file đăng ký chung, giữ `.wire-lock`.

---

# (Lưu trữ) B1 → B6 — Task Graph backend + tích hợp


> Vibecode Kit v5.0 — BƯỚC 5 (TASK GRAPH). Cập nhật 17/10/2026 sau `/vibecode:blueprint`.
> FE (Portal + Admin) đã xong trên MSW ở pha G0 → G6 (`reports/G*-completion.md`). Đồ thị dưới là phần còn lại:
> **39 TIP backend + tích hợp + vận hành, 6 pha (B1 → B6), ~10 tuần** cho 1 agent chính + 3–4 agent song song.
> TIP file sinh bằng `/vibecode:tip TIP-Bxx` khi tới pha; tên file `tips/TIP-Bxx-<slug>.md`.

---

## PHA VÀ CỔNG KIỂM

| Pha | Nội dung | Cổng kiểm (mọi pha: lint, typecheck, test, depcheck, build xanh; commit + push; `reports/B<n>-completion.md`) |
|---|---|---|
| **B1** Nền tảng | Monorepo server, DB, Redis, outbox, audit, auth, guard | Integration test auth/guard/outbox trên Postgres + Redis thật; `pnpm --filter @opchub/server dev` chạy 3 process |
| **B2** Thành viên & phí | Đăng ký, OTP, SSO, hồ sơ, phí, đối soát, Admin Thành viên/Phí | Portal + Admin chạy với `NEXT_PUBLIC_API_MOCKING=off` cho luồng đăng ký → trả phí → kích hoạt; contract test nhóm account/fee |
| **B3** Cộng đồng & chat | Nhóm, yêu cầu vào nhóm, socket, chat, kiểm duyệt, thông báo | k6 1.000 socket / 10 tin/s xanh trên máy dev; behavior e2e chat chạy trên server thật |
| **B4** Nội dung | Sự kiện, dự án, nhà đầu tư, upload, dashboard | Contract test nhóm event/project/investor; EXPLAIN mọi list mới |
| **B5** Quản trị | Cài đặt, RBAC, mail, export, marketing, Tổng quan, bot + dịch vụ sau flag | Contract test toàn bộ `/admin/*`; audit có đủ dòng cho mọi thao tác ghi |
| **B6** Chuyển FE sang server thật + go-live | Bỏ MSW, e2e + parity trên server thật, k6 5.000, hạ tầng VPS | 115 behavior + 205 parity xanh với MSW tắt; k6 §14.2 đạt; deploy staging |

## DEPENDENCY GRAPH

```
B1  B01 scaffold-server ──┬── B02 db-schema-core ── B03 outbox-audit ──┐
                          ├── B04 common (config/log/redis/filter) ────┤
                          └── B05 shared-contract (socket/queues/err) ─┤
                                                                       ▼
                               B06 auth-core (JWT/refresh/argon2) ── B07 guards-rbac-paywall
                                         │
B2      ┌────────────────────────────────┼──────────────────────────────┐
        ▼                                ▼                              ▼
   B10 integrations-adapters      B11 register-otp-sso          B13 profile-me
        │                          │       │                          │
        ▼                          ▼       ▼                          │
   B12 password-totp ◄────────────┘   B14 membership-fee-reconcile ◄─┘
                                        │
                                        ▼
                                   B15 admin-members-fees
B3      B20 community-groups ── B21 group-requests-owner
             │
             ▼
        B22 socket-gateway ── B23 chat-messages ── B24 moderation-keywords
             │                      │
             ▼                      ▼
        B25 notifications ◄──── (mentions)
B4      B30 storage-upload ─┬─ B31 events
                            ├─ B32 projects-review ── B33 investors
                            └─ B34 dashboard-reporting
B5      B40 settings-rbac ── B41 mail-welcome-smtp ── B42 marketing
        B43 export-jobs        B44 admin-overview-stats
        B45 bot (flag) ◄── B23        B46 service-requests (flag)
B6      B60 fe-real-api-switch ── B61 contract-tests ── B62 e2e-on-server ── B63 parity-on-server
        B64 infra-vps-systemd-nginx ── B65 backup-observability ── B66 k6-load ── B67 staging-golive
```

## TIP SUMMARY TABLE

| TIP | Tên | Depends on | Priority | Est. h | Tuần | REQ / quyết định |
|-----|-----|-----------|----------|-------:|-----:|---|
| B01 | `apps/server` NestJS 11, 3 entrypoint, turbo task, env zod | — | P0 | 6 | 1 | ADR-0001 |
| B02 | `packages/db`: Prisma 7 schema theo domain (core: account, fee, community, system), migration đầu + extension, seed bắt buộc | B01 | P0 | 10 | 1 | data-model §1–3, §14 |
| B03 | Outbox (bảng, `OutboxService.add(tx)`, relay worker SKIP LOCKED) + `AuditService` (insert-only, REVOKE) | B02 | P0 | 6 | 1 | ADR-0005, luật 8, 10 |
| B04 | `common/`: config, pino + requestId, Prisma/Redis provider, exception filter → envelope lỗi, throttler Redis, helmet/CORS | B01 | P0 | 6 | 1 | api-conventions, security |
| B05 | `packages/shared`: `socket/` (event + zod), `queues/` (tên + payload), bổ sung `errors.ts`; `nestjs-zod` pipe | B01 | P0 | 4 | 1 | socket-chat, queues-workers |
| B06 | Auth core: argon2id, JWT 15', refresh xoay vòng + family revoke, `/auth/login|logout|refresh`, khoá 5 lần (D-44) | B02, B04 | P0 | 10 | 2 | REQ-001…, D-34, D-44 |
| B07 | Guards: JwtAuth → AccountStatus → MembershipFee (claim + Redis, S-03) → Permission (D-20/46) → GroupRole; decorator; test ma trận | B06 | P0 | 8 | 2 | auth-rbac, D-14, D-43 |
| B10 | `packages/integrations`: mail (smtp + fake/Mailpit), bank-webhook (sepay + fake + `/dev/bank/simulate`), tax-lookup (esgoo → vietqr + fake), storage (s3/MinIO), llm (fake) | B01 | P0 | 10 | 2 | adapters, D-07, D-17 |
| B11 | Đăng ký cá nhân/DN (tra MST D-40), OTP Redis, kích hoạt + mail chào mừng qua outbox (D-47), SSO + `/auth/sso/complete` (D-45), `/public/settings`, `/public/stats` | B07, B10 | P0 | 14 | 3 | BR-01, BR-06, D-30, D-38, D-45 |
| B12 | Quên/đặt lại mật khẩu, đổi mật khẩu, thu hồi phiên khác, TOTP admin (D-27) | B06, B10 | P0 | 8 | 3 | D-10, D-27 |
| B13 | `/me` GET/PATCH, hồ sơ DN, `/members/suggest`, `/me/sso/:provider` | B07 | P0 | 6 | 3 | REQ hồ sơ |
| B14 | Phí: `/me/membership`, transfer-confirm (Idempotency-Key), `/webhooks/bank` HMAC, reconcile job + poll 2', scheduler expiring/expired, `membership.updated` | B07, B10, B03 | P0 | 14 | 3–4 | BR-03…05, D-31, D-41 |
| B15 | Admin Thành viên (deferred join, counts, khoá/mở + thu hồi phiên, gán nhóm BR-07, xác minh DN, role qua s.role) + Admin Phí (summary, collect có lý do, nhắc, GD không khớp) | B14, B13 | P0 | 14 | 4 | REQ-045, D-32, D-41, D-42 |
| B20 | Nhóm: `/groups` lọc/tìm/sắp xếp, join/leave, Admin Nhóm CRUD, member-counts | B07 | P0 | 10 | 4 | REQ-044, BR-06 |
| B21 | Yêu cầu vào nhóm: chủ nhóm duyệt/từ chối (D-43), `member.request`, Admin `/admin/groups/requests` | B20, B03 | P0 | 6 | 5 | QT-28…30 |
| B22 | Socket process: handshake JWT, `user:{id}`, `room.join` cache quyền, presence Redis gom 5s, `session.revoked`, redis-adapter | B07, B05 | P0 | 12 | 5 | S-01, S-02, S-06 |
| B23 | Chat: `message.send` (idempotent, ack sau commit), react/pin/reply, REST lịch sử keyset + `after=`, read cursor + counter Redis, rooms/members/files/pins, `/me/chat` | B22, B20 | P0 | 16 | 5–6 | S-02, S-04, S-05, S-12 |
| B24 | Kiểm duyệt: báo cáo tin, từ khoá Aho-Corasick reload pub/sub, Admin reports + action (ẩn/cảnh báo/khoá qua outbox), xem chat chỉ đọc (D-26) | B23 | P0 | 10 | 6 | S-08, D-26 |
| B25 | Thông báo: tạo theo S-04, `/notifications` keyset, đánh dấu đọc, `notification.new` | B22 | P0 | 6 | 6 | S-04 |
| B30 | Upload: `/uploads/presign` (MIME/5MB/key ngẫu nhiên), kiểm `head`, gắn avatar/cover/logo/persona (Q-G*-2/3) | B10 | P0 | 6 | 6 | security upload |
| B31 | Sự kiện Portal + Admin: CRUD, đăng ký/huỷ (khoá chỗ), check-in, xuất, `registrationOpen` (Q-G5a-5), mail thay đổi | B30, B03 | P0 | 10 | 7 | REQ sự kiện |
| B32 | Dự án: CRUD (sanitize HTML), state machine D-18, bình luận/like/resolve, follow, share, repo-access, Admin duyệt/bulk/featured/counts | B30, B03 | P0 | 16 | 7 | BR-08, D-18, D-19 |
| B33 | Nhà đầu tư: interest (BR-09, Idempotency-Key), thread, Admin list gom người + transition + ghi chú + xuất | B32 | P0 | 10 | 8 | BR-09, D-14 |
| B34 | Dashboard Portal `/dashboard/live` + `/projects/stats` từ `stats_daily`/Redis | B23, B32 | P1 | 6 | 8 | S-10 |
| B40 | Cài đặt: general, security (D-33/D-44), languages, categories (BR-11), role permissions (s.role + bump permVersion), admin invite/revoke, audit log | B07, B03 | P0 | 12 | 8 | D-20, D-33, D-42, D-46 |
| B41 | Mail: template chào mừng (D-47) GET/PUT/test, SMTP (key AES-GCM, verify/test), worker `mail` + `mail_logs`, `/me/welcome-mail` | B10, B40 | P0 | 8 | 8 | D-13, D-47 |
| B42 | Marketing: campaigns CRUD, estimate, send qua outbox 202, templates, mail log + resend | B41 | P1 | 8 | 9 | D-33, Q-G6b-* |
| B43 | Export jobs: queue `export` → CSV MinIO → `/admin/exports/:id` presigned GET, audit (users, fees, groups, events, investors, requests) | B10, B03 | P0 | 6 | 9 | luật 10, Q-G4a-6 |
| B44 | Admin Tổng quan `/admin/overview` + scheduler `stats_daily`; badge sidebar counts | B15, B32 | P1 | 6 | 9 | S-10 |
| B45 | Bot (flag): personas, scripts, run → thread `pending`, approve → đăng qua đường chat với `persona_id` (D-48), rate limit nhóm (S-11), log/activity | B23 | P2 | 12 | 10 | D-04, D-48, BR-10 |
| B46 | Dịch vụ (flag): services, `/service-requests` (Idempotency-Key), Admin list/summary/transition/assignee/comments + mention notification | B25 | P2 | 10 | 10 | D-21, Q-G5c-4 |
| B60 | FE: `NEXT_PUBLIC_API_MOCKING=off` chạy được — api-client refresh 401, socket transport thay `restTransport`, upload MinIO thật, bỏ số cứng Tổng quan | B23, B30, B44 | P0 | 10 | 9 | data-state, routing-auth |
| B61 | Contract test: gọi từng endpoint của `plans/api-contract.md` trên server, parse bằng zod schema FE | B60 | P0 | 8 | 10 | api-contract |
| B62 | `seed:demo` từ mock-data + 115 behavior e2e chạy trên server thật | B61 | P0 | 8 | 10 | testing |
| B63 | Parity 205 dòng chạy trên server thật (MSW tắt) — không tụt so với G6 | B62 | P0 | 4 | 10 | ui-parity |
| B64 | `infra/`: Nginx, systemd units (portal@, admin, api@, socket@, worker), PgBouncer, MinIO, Redis, deploy script | B01 | P0 | 8 | 9 | ADR-0004, Vision §3.2 |
| B65 | Backup pg_dump + WAL offsite, Sentry, healthcheck, log rotate, cảnh báo SLO §14.1 | B64 | P0 | 6 | 10 | NFR |
| B66 | k6: đăng ký 200/phút, 5.000 socket 50 tin/s, Admin 100 phiên, 1.000 CK/giờ | B23, B14, B64 | P0 | 8 | 10 | §14.2 |
| B67 | Staging + checklist go-live (UAT-01 → UAT-31 trên staging) | B63, B65, B66 | P0 | 6 | 10 | §15 |

**Tổng ~334 giờ.** Ước tính cho agent; đo lại sau B1 rồi chỉnh.

## PARALLELIZATION OPPORTUNITIES

| Pha | Chạy song song (worktree riêng, mỗi agent một thư mục `modules/<domain>`) | Tuần tự bắt buộc |
|---|---|---|
| B1 | B03 ‖ B04 ‖ B05 (sau B02/B01) | B01 → B02; B06 → B07 |
| B2 | B10 ‖ B13 ; rồi B11 ‖ B12 | B14 sau B10 + B03; B15 cuối pha |
| B3 | B20 ‖ B22 ; B24 ‖ B25 | B21 sau B20; B23 sau B22 + B20 |
| B4 | B31 ‖ B32 ‖ B34 (sau B30) | B33 sau B32 |
| B5 | B40 ‖ B43 ‖ B45 ‖ B46 ; B41 → B42 ; B44 | — |
| B6 | B64 ‖ B60 ; B65 ‖ B61 | B62 → B63 → B67; B66 sau B64 |

File dùng chung (chỉ thêm dòng, như G2–G6): `apps/server/src/api/api-app.module.ts`, `socket-app.module.ts`, `worker-app.module.ts`,
`packages/db/prisma/schema/*.prisma` (mỗi domain một file → ít đụng), `packages/shared/src/{socket,queues}/index.ts`, `worker/schedules.ts`.
Migration Prisma: **chỉ agent chính tạo migration** sau khi gộp schema của các làn (tránh hai migration xung đột thứ tự).

## TEAM ALLOCATION

| Vai | Ai | Việc |
|---|---|---|
| Chủ nhà | Bạn | Chốt OQ còn mở (xem `BUILDER-HANDOFF.md` → Escalation), cấp secret (SSO, SePay, Brevo, VPS) |
| Agent chính (Chủ thầu + thợ tích hợp) | Claude Code phiên chính | Sinh TIP, chia làn, tạo migration, gộp, cổng kiểm, completion report |
| Làn A | subagent worktree | account / auth / settings (B06, B11–B13, B40) |
| Làn B | subagent worktree | membership-fee / integrations / export / mail (B10, B14, B41–B43) |
| Làn C | subagent worktree | community / chat / socket / moderation / notification (B20–B25, B45) |
| Làn D | subagent worktree | event / project / investor / reporting / service-request (B31–B34, B44, B46) |

## P5 scoped verification refinements (2026-10-21)

| TIP | Scope | Status | Evidence requirement |
|---|---|---|---|
| V2-504 | Native/test PubSub channel isolation | IMPLEMENTED | Real Redis cross-DB control + socket/publication regressions |
| V2-505 | Large permission matrix audit caption | IMPLEMENTED | 50-role HTTP mutation + complete audit diff |
| V2-506 | D-50 B5 audit contract assertion | IMPLEMENTED | Exact current actor/script audit, no historic-row false pass |
| V2-507 | Production posting clock after LLM completion | IMPLEMENTED | 45s delay preserves spacing; window closes during generation; native cohort 25/25 |
| V2-508 | Bulk-hide visibility equality seek + matching statistics | IMPLEMENTED | Native105/105, >20k mixed rows/actual production UPDATE, no Seq Scan and explicit equality/null Index Cond; reports/TIP-V2-508-completion.md |
| V2-509 | Partial execution identity invariant / read access paths | IMPLEMENTED | Native121/121, focused19/19, unchanged prune assertions; reports/TIP-V2-509-completion.md |
| V2-510 | MSW reply-target validation before insert/idempotent return | IMPLEMENTED | Three404 HTTP regressions fail before/pass after; full forced units1014 +2 existing skips; reports/TIP-V2-510-completion.md |
| V2-511 | MSW moderation hide/permission/audit/case-link contract | IMPLEMENTED | Five original HTTP failures retained; expanded19/19; forced units1052 +2 existing skips; reports/TIP-V2-511-completion.md |
| V2-512 | Native Dashboard persisted-source negative fixture / positive provenance control | IMPLEMENTED | Original assertions retained, focused6/6; uncached root integration1300/1300 at6ce5094b; reports/TIP-V2-512-completion.md |
| V2-513 | MSW due script admission / lastRunAt / live spacing | IMPLEMENTED | Seven before failures retained; shared13/13 and Admin HTTP2/2; forced root units1067 +2 existing skips; reports/TIP-V2-513-completion.md |
| V2-514 | MSW bot permission / successful-command actor audit boundary | IMPLEMENTED |17 original failures unchanged; expanded HTTP54/54; forced root units1112 +2 existing skips; reports/TIP-V2-514-completion.md |
| V2-515 | MSW script destinations/shared posting limits/VN-day activity | IMPLEMENTED | Six original failures retained; expanded shared14/14 + HTTP11/11; forced units1128 +2 existing skips; reports/TIP-V2-515-completion.md |
| V2-516 | Deferred member warnings / native report-correlated notification retry identity | IMPLEMENTED | MSW2+native1 original failures retained; shared16/16, two HTTP workflows, native14/14; forced units1141 +2 existing skips; reports/TIP-V2-516-completion.md |
| V2-517 | MSW moderation lock/member status/session epoch revocation | IMPLEMENTED | Original4 HTTP failures unchanged; shared12/12, Admin29/29, Portal8/8; forced units1166 +2 existing skips; reports/TIP-V2-517-completion.md |
| V2-518 | MSW D-55 deferred locked-owner group transfer | IMPLEMENTED | Original4 failures retained; shared12/12, Admin HTTP7/7 + Portal1/1; native lock6/6; reports/TIP-V2-518-completion.md |
| V2-519 | Native optional-owner metadata PATCH safety | IMPLEMENTED | Original native ownership/count failure retained; native cohort12/12 in3files; reports/TIP-V2-519-completion.md |
| V2-520 | D-50 browser scheduling/copy and backend-neutral entity identity | MSW VERIFIED; native browser PENDING | Legacy3pass/2fail retained; replacement stronger scheduling/stop/no-next-turn assertion; new copy2/2; reports/TIP-V2-520-progress.md |
| V2-521 | Canonical all-day persona activity option | IMPLEMENTED; full acceptance PENDING | Original shared6fail/5pass retained; shared11/11, native pure35/35, native worker/reply16/16, combined MSW browser5/5; reports/TIP-V2-521-completion.md |
| V2-522 | Wait for public registration configuration before navigating | IMPLEMENTED; full acceptance PENDING | Three original delayed-load failures retained; hook4/4; browser21pass/1 unrelated UAT-11 timeout retained, standalone UAT-11 then1pass; root1197 +2 existing skips; reports/TIP-V2-522-completion.md |
| V2-523 | Stable accessible payout action during loading | IMPLEMENTED; full acceptance PENDING | Original loading-name failure retained; component11/11, unchanged native10/10 and MSW2/2; root1198 +2existing skips; reports/TIP-V2-523-completion.md |
| V2-524 | MSW automatic runtime and explicit manual-only demo scenario | IMPLEMENTED; full acceptance PENDING | Original5fail/8controls retained; expanded33domain, DB2/2; identical native/MSW5/5 each after525; reports/TIP-V2-524-completion.md |
| V2-525 | Preserve omitted false bot toggles in partial settings PATCH | IMPLEMENTED; full acceptance PENDING | Schema5beforefail/1control, native3beforefail; native7/7 after; joint forced units1244+2existing skips; reports/TIP-V2-525-completion.md |
| V2-526 | Bot/chat persistence and actual Admin-to-Dashboard publication setup | IMPLEMENTED scoped; full acceptance PENDING | Relay3beforefail/1control; persistence41/41; nativeDashboard3/3, MSWcross-app11/11; forced units1254+2existing skips; reports/TIP-V2-526-completion.md |
| V2-527 | Bounded real-provider opening/reply native proof | PARTIAL | Original opening locator failed after publication; corrected not rerun; real reply1/1 including live chat/F5; cumulative2upstream200, Fake/demo restored; reports/TIP-V2-527-completion.md |
| V2-528 | Full native behavior and forced integration checkpoint | Behavior222/222; integration FAILED | Native28.5min plus MSW222/222 at27731c1e; integration1286pass/1fail retained, refine529; reports/TIP-V2-528-completion.md |
| V2-529 | Bot queue fixed timestamp/delay anchor consistency | IMPLEMENTED scoped; full acceptance PENDING | Actual Redis deadline25ms early before, unchanged2/2 after; original worker/publication/emergency18/18; reports/TIP-V2-529-completion.md |
| V2-530 | Live MSW bot/chat invalidation and Fake UAT-14 pair | IMPLEMENTED scoped; full acceptance PENDING | Original MSW open-chat failure retained; shared13 +Portal3 new controls; MSW11/11/native1/1 with same assertions, units1270+2existing skips; reports/TIP-V2-530-completion.md |
| V2-531 | Correct addressed-persona history fixture chronology | IMPLEMENTED scoped; full integration PENDING | Original13pass/1fail, after15/15; all assertions unchanged plus exact newest-human history control; reports/TIP-V2-531-completion.md |
| V2-532 | Full three-turn automatic browser lifecycle, opener closes and Dashboard | IN PROGRESS: nativePASS / MSWFAILED | Identical native1/1 in10.4min; MSW cursor1 instead of2 in6min, retained for refine; reports/TIP-V2-532-progress.md |
| V2-558 | P4 Affiliate Admin UI pixel debt TD-P4-UI-01..08, native acceptance | IMPLEMENTED; 5 deviations PENDING owner | Native+MSW parity 29/34 (was 27/34): TD-06/07/08 fixed, D-84-AFF/POL390/empty390 pending DV-P4-558-1..4; 13 debt tests before-fail/after-pass both lanes; native 52/52, MSW 65/65, gates 0; reports/TIP-V2-558-completion.md |
| V2-559 | P5 OPEN bugs: native paid-cache acceptance, UAT-11 reset login root cause, MSW diag, fee-clock ledger | PLANNED | 546 native 3/3 + MSW; UAT-11 cohort before-fail/after 3/3 both lanes; tips/TIP-V2-559-p5-open-bugs.md |
| V2-560 | P5 Bot Admin UI pixel debt D-36/37/39/41 + P-01-BOTCARD | DONE; DV-V2-P5-1 approved by owner 2026-10-22; PR #11 to dev | Emergency bar fix: debt test native fail→pass, MSW pass; native D-36 1440 6.18→2.03%, D-37 6.83/6.92, D-39 7.85/9.81, D-41 6.38/25.32 (decomposed in DV-V2-P5-1); P-01-BOTCARD (owner-approved --bot-history seed) native 1440 3.00% PASS 5/6, 390 7.49% (data copy) in DV-V2-P5-1; reports/TIP-V2-560-completion.md |
| V2-561 | P5-MAINT-01 index bloat monitoring + concurrent reindex runbook | PLANNED | Read-only bloat script alerts before/after reindex on local test DB; weekly timer; tips/TIP-V2-561-p5-maint-index-bloat.md |
