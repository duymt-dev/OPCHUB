# TIP-V42-708 — Admin › Phí v4.2, Thành viên bỏ "Khởi đầu", tự nhắc khởi đầu, FX-02 → 04 — completion

- Nhánh `feature/TIP-V42-708-admin-fees`, xếp chồng trên `feature/TIP-V42-707-affiliate-all` (PR 707 chưa merge).
- PR: base `feature/TIP-V42-707-affiliate-all`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-707-affiliate-all...feature/TIP-V42-708-admin-fees
- REQ / D: REQ-608, REQ-609, D-100, D-101, D-107, D-115, §28.3, §29.4 (FX-02 → 04).

## Commit

| SHA | Nội dung |
|---|---|
| `241a1fd6` | TIP-V42-708 |
| `d02ffae2` | DB: enum `onboarding_reminder_kind` (`admin` / `auto`), `onboarding_reminders.kind` + `sent_by` NULL được, CHECK `kind = admin ⇔ sent_by NOT NULL`; shared: `onboardingAutoRemindSchema` + câu prototype; server `OnboardingAutoRemindService` + `POST /me/onboarding/auto-remind` (khoá tư vấn theo người, ≤ 1 lần / ngày VN, thông báo `system` → `/dashboard`, không email); giới hạn 24 giờ của Admin chỉ tính lượt `admin`; int `auto-remind` (3) |
| `a5eacf4c` | Server / shared: `feeRow.groups` (1 query theo lô), doanh thu = Σ giá năm hiện hành theo gói của `active` + `expiring` (D-101), "Gửi nhắc hàng loạt" gồm trial (mẫu trial D-113); lọc Thành viên `fee = paid \| trial \| unpaid` (D-107); FX-02 phiếu tư vấn rỗng / dịch vụ tắt → dịch vụ bật đầu tiên; MSW khớp; int `admin-fees-v42` (4, có EXPLAIN), `request-default` (1), `admin-users-filters` (+1) |
| `90d95c30` | Admin: Phí 6 thẻ, 6 tab (thêm "Miễn phí 3 tháng"), cột Tên / Email / Nhóm tham gia (chip) như prototype, trial chỉ "Gửi nhắc"; Thành viên bỏ cột / lọc / nút Nhắc "Khởi đầu" (6 ô lọc), lọc phí 3 lựa chọn |
| `1272d617` | Portal: gọi tự nhắc khi mở (fire-and-forget, làm mới chuông khi có nhắc mới); FX-03 popup mail chào mừng theo tài khoản; FX-04 + Gọi vốn "(không áp dụng miễn phí 3 tháng)"; khung Affiliate locked v4.2 (10 ngôn ngữ); FX-02 chọn sẵn dịch vụ bật đầu tiên; MSW tự nhắc |
| `29ec223f` | Chip nhóm theo thứ tự tham gia như prototype `m.groups` |
| `bbaa7af8` | e2e: Phí v4.2 (thẻ, tab, cột, tab trial), 6 ô lọc + lựa chọn phí D-107, tự nhắc (đăng ký → 1 thông báo; gọi lại cùng ngày → không), FX-03 đổi tài khoản A → B; parity D-19 theo v4.2, gỡ D-96 / D-97 (không còn cột Khởi đầu) |
| commit sửa e2e | Dòng trial không còn "Ghi nhận đã thu" (prototype v4.2 `canCollect`) → AT-LK02 kế toán thu qua thanh chọn hàng loạt, UAT-05 kiểm "Gửi nhắc"; UAT-31 thẻ Thành viên 8 ô; MSW thu hàng loạt dùng giờ thật như thao tác dòng / server |
| commit audit | Neo test cạnh Phí "Chờ TT → Đang hiệu lực" theo tên test mới (đổi ở 704) |
| commit báo cáo | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| Summary đếm đúng 6 thẻ; doanh thu = Σ giá năm theo gói của active + expiring | int `admin-fees-v42` (1); MSW `admin-members.spec` (D-101); e2e `admin-fees` (v4.2) | pass |
| Mỗi dòng có `groups`, 1 query nhóm cho cả trang (EXPLAIN ≥ 10k) | int `admin-fees-v42` (2, 4) | pass |
| Lọc phí `trial` / `paid` / `unpaid` đúng tập | int `admin-users-filters` (D-107); MSW `admin-members.spec`; e2e `admin-members-filters` | pass |
| Mở Portal hai lần trong ngày → 1 thông báo; ngày sau +1; đủ 8 bước / NĐT → không; hai tab cùng lúc → 1 | int `auto-remind` (3); MSW `onboarding-auto.spec` (2); e2e `onboarding › D-100 / D-115` | pass |
| Phiếu tư vấn không chọn dịch vụ / dịch vụ tắt → dịch vụ bật đầu tiên | int `request-default`; unit portal `model.spec` (FX-02) | pass |
| FX-03 đăng nhập / đổi tài khoản không hiện popup của phiên trước | e2e `portal-shell › FX-03` | pass |
| Parity D-07, D-18 → D-22 ≤ 3% ở 1440 + 390 | parity (bảng dưới) | pass |

## Test (số thật, máy dev)

- `pnpm lint` / `pnpm typecheck`: 8 / 8 task. `pnpm depcheck`: 0 vi phạm (891 module).
- Unit: shared 422, server 225, portal 388, admin 458, integrations 103 (+2 skip), ui 52 — **1648** (707: 1648; admin −5 spec cột Khởi đầu đã gỡ, +4 shared, +1 portal).
- `test:int`: server **159 file, 1473 / 1473** (+`auto-remind` 3, `admin-fees-v42` 4, `request-default` 1, `admin-users-filters` +1), db 17 / 54 — tổng **1527** (707: 1518).
- Audit C4: 25 đạt / 3 không đạt — cả 3 là Hội thoại bot (có từ trước, TIP-V42-713). Sửa neo test cạnh "Chờ TT → Đang hiệu lực" (tên test đổi ở 704).
- `pnpm build` (MSW) portal + admin: thành công.
- e2e MSW behavior toàn bộ (bản build cuối): **319 pass / 0 fail / 4 skip** (13,0 phút; 707: 317 → +2: tự nhắc khởi đầu, FX-03 đổi tài khoản; AD-02 cũ viết lại). Lần chạy đầu 316 / 3 fail — 3 spec còn giả định v4 (nút thu trên dòng trial, 9 ô thẻ Thành viên) → sửa theo prototype v4.2, chạy lại toàn bộ xanh.

## EXPLAIN (≥ 10k dòng)

`feeGroupNamesQuery` (cột "Nhóm tham gia") trên bản sao tạm theo schema đã triển khai, 10.000 TV × 2 nhóm (20.000 `group_members`), 20 `user_id` của trang:
`Bitmap Index Scan on group_members_user_id_status_idx` (Index Cond `user_id = ANY(…) AND status = 'member'`, 40 dòng) → Hash Join `groups` (200 dòng) →
GroupAggregate; không Seq Scan `group_members`; **0,57 ms**. Thẻ thống kê là `GROUP BY status, plan` trên `membership_fees` (không đổi chỉ mục).

## Parity (MSW, ngưỡng 3%, prototype v4.2)

| Màn | 1440 | 390 |
|---|---|---|
| D-07 Thành viên · danh sách | 0,04% | 0,05% |
| D-17 Thành viên · 6/trang, trang 2 | 0,04% | 0,06% |
| D-18 Phí thành viên | 0,16% | 0,27% |
| D-19 Phí · chờ thanh toán | 0,16% | 0,14% |
| D-20 Phí · chọn nhiều | 0,35% | 0,54% |
| D-21 Phí · ghi nhận đã thu | 0,22% | 0,22% |
| D-22 Phí · 6/trang, trang 2 | 0,16% | 0,06% |
| P-01 / P-119 Dashboard · Hướng dẫn bắt đầu | 0 / 0% | 0 / 0% |
| P-05 Modal mail chào mừng | 0,25% | 0,46% |
| P-07 → P-10 Thông báo | 0,01 – 1,95% | 0,03 – 0,49% |
| P-80 → P-82 Form tư vấn | 0,01 – 0,54% | 0,04 – 0,50% |
| P-97 / P-98 Affiliate | 0,79 / 0,86% | 0,65 / 0,92% |

Trước 708: D-18 15,13 / 20,08%, D-20 14,92 / 19,92%, D-21 15,06 / 21,37%, D-22 2,05 / 14,06%, D-07 1,59 / 6,18% → đều đạt.
D-96 / D-97 (cột / lọc "Khởi đầu") gỡ khỏi bộ parity — prototype v4.2 không còn màn này; `parity/report.ts` bỏ số đo của kịch bản đã gỡ.
Tổng `ui-parity/results.md`: **437 / 440** ảnh đạt; 3 ảnh còn lại là ngoại lệ D-91 (P-40 @390, D-84-AFF @1440 + @390).

## Soát luật cứng

1. File trong trần (`admin-fees.service.ts` 275, `fee-table.tsx` 166, `onboarding-auto-remind.service.ts` 63; `ConsultForm` / `Row` tách hàm ≤ 80 dòng).
2. Không `any`; body / phản hồi parse zod (`onboardingAutoRemindSchema`, `feeRowSchema.groups`, `createServiceRequestSchema.serviceId`).
3. depcheck sạch; Portal shell dùng `useOnboardingAutoRemind` qua index feature onboarding.
5. Không query trong vòng lặp: nhóm theo lô (`= ANY`), doanh thu 1 `GROUP BY`.
6. Tự nhắc ghi 1 thông báo / người qua `NotificationService` (id = id lượt nhắc → gọi lại không nhân bản).
8. Tự nhắc: khoá tư vấn `pg_advisory_xact_lock` theo người trong transaction ghi `onboarding_reminders`.
9. Tiền số nguyên VND (giá từ `PriceConfigService`, không hằng số giá); ngày theo giờ VN (UTC+7).
12. Không biến env mới.
14. Commit theo đường dẫn.

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token).
- Q-V42-708-1 → 4 trong `ui-parity/questions.md` (seed MSW coi TK mẫu đã được nhắc trong ngày demo; endpoint Admin nhắc khởi đầu giữ cho client cũ; FX-02 id lạ vẫn 404; doanh thu theo giá hiện hành).
- `messages/{km,my}/profile.json` lệch prettier từ trước (ngoài phạm vi, không sửa).
