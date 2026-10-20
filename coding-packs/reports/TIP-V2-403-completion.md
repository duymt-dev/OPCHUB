# COMPLETION REPORT — TIP-V2-403

**STATUS: DONE trong phạm vi Portal TIP-403. Không phải DONE Pha 4 hoặc goal V2.**

Source đã push: `ff6f4f1` (referral/auth), `bdbca39` (màn/bank), `e277598`
(freshness), `64630db` (AF0), `949ddd1` (layout), `f821b0e` (lifecycle/cache),
`32f6112` (copy/paused chronology). Các gate cuối chạy trên source `32f6112`;
sau đó chỉ sửa tài liệu. Báo cáo tiến trình giữ nguyên lịch sử các lượt fail.

## Phạm vi và kiến trúc

- `/affiliate` orchestrator và module `features/affiliate`: API zod, hooks,
  model, locked/paused/active, hero/share/stats/bank, referrals/payouts, mobile.
- `/r/[code]`, referral field cho cá nhân/DN/SSO, cookie theo policy, debounce,
  ưu tiên URL/cookie/thủ công, xử lý response cũ và lỗi server tại ô.
- Menu/i18n/mock handlers nối qua facade; không import nội bộ feature khác.
- Shared AdminTable cho phép tắt pager nội bộ khi feature có pager URL riêng;
  StatusTag opt-in line box, mặc định của các feature cũ có regression test.
- Optional AF0 demo pack cho MSW/native, snapshot ngân hàng và dữ liệu lịch sử
  thật; paused pack riêng có kỳ phí 365 ngày bao phủ các khoản cũ.
- Session query boundary clear cache khi đổi danh tính, không giữ welcome/me
  của người trước; không sửa backend để che lỗi UI. BUG-045 đã đóng có test.
- Không copy code prototype, không thêm dependency/migration, không sửa secret.

## Acceptance criteria: 6/6

| # | Tiêu chí TIP | Bằng chứng |
|---|---|---|
| 1 | Chưa đóng phí thấy preview 20%, 120.000đ, không link/mã, không overlay | `affiliate-screen.spec.ts` REQ-302; nút thanh toán mở dialog; MSW/native |
| 2 | `/r/HAOPC` điền đúng chủ mã và hoàn thành đăng ký/phí | `affiliate-portal.spec.ts` REQ-303 + `affiliate-lifecycle.spec.ts` AT-AF02; chủ mã thấy khách và 150.000đ, hai target |
| 3 | Mã của chính email báo lỗi, không gửi đăng ký | `affiliate-portal.spec.ts` AT-AF03; hook/email invalidation unit; hai target |
| 4 | Mã paused hiện đúng lỗi, không đăng ký/OTP | `affiliate-paused.spec.ts` AT-AF05; native expired fixture + DB integration; hai target |
| 5 | Chưa có STK thấy banner; nhập tên được chuẩn hóa, lưu ẩn banner | AT-AF02 khai lần đầu; `affiliate-screen.spec.ts` sửa/lỗi/F5; paused vẫn sửa được, snapshot kỳ cũ không đổi; hai target |
| 6 | Tháng/trang trên URL, F5 giữ nguyên | `affiliate-screen.spec.ts` HAOPC nhiều trang và hai tab; hai target |

### Specifications 1–8

1. Locked preview và paused warning: E2E trên hai target, exemption chỉ đúng
   `/affiliate`; polling chỉ paid transitional, dừng ở active/error có hook unit.
2. Clipboard thật, toast đúng tiếng Việt; Facebook/Zalo/mailto encode đúng URL:
   E2E + model/share-bar unit, có cả clipboard denied.
3. Select ngân hàng, chỉ số, chuẩn hóa holder, busy/error/refetch: bank hook unit,
   first-save/edit/expired-save E2E; native API kiểm lại input.
4. Referral/payout month/page/tab, cancellation reason, masked customer names,
   payout bank snapshot: component/model tests + AF0 history E2E/P-97/98.
5. Public redirect/click/cookie TTL/dedup và invalid link: model/session/hook,
   mock handler + E2E; không attach referral trước OTP ở server.
6. Form cá nhân/DN/SSO dùng cùng hook; debounce 400ms, email đổi kiểm lại,
   response trễ không ghi đè; 422 referralCode hiện tại ô có unit/MSW tests.
7. Menu sau Dự án, trước Gói dịch vụ; giữ khóa wiring khi tích hợp ở các
   checkpoint source trước, không thay thứ tự mục khác.
8. Screen chỉ ghép module, lint max-lines/typecheck/depcheck forced pass;
   test để file riêng. Danh mục thay đổi lấy từ Git ở `source-files.txt`.

## Gate và bằng chứng cuối

Evidence: [`evidence/v2-403/acceptance/`](evidence/v2-403/acceptance/).

| Bộ kiểm | Kết quả |
|---|---|
| `pnpm exec turbo run lint --force` | exit 0, 8/8 tasks; chỉ cảnh báo img cũ |
| `pnpm exec turbo run typecheck --force` | exit 0, 8/8 tasks |
| `pnpm exec turbo run test --force` | exit 0, 6/6 tasks; **599 passed, 2 existing skipped** |
| `pnpm depcheck` | exit 0, cả hai đồ thị |
| DB integration optional demo pack | **19/19**, 3 files; 28 migration không pending |
| Portal production builds MSW/native | exit 0 cả hai |
| Native Affiliate + auth regression | **26/26** (12 + 14), exit 0 |
| MSW full selection có trace | **26/26**, exit 0 |
| MSW full selection chạy lại hai lần, không trace | **52/52**, exit 0; vẫn chỉ 26 case duy nhất |
| MSW UAT-11 isolated repeats | 3/3 và 12/12, không cộng vào số case duy nhất |
| P-97/98, desktop/mobile | **4/4 MSW + 4/4 native**, mọi ảnh dưới 3% |
| Selected Auth A-12…20, A-31/32 | 18/22 mỗi target; bốn raw fail có deviation dưới đây |

Không cộng lại các lượt chạy trùng nhau thành số test nghiệp vụ mới. Full server
integration 1165/1165 thuộc TIP-402, không tuyên bố đã chạy lại ở checkpoint này.

### Parity Affiliate cuối (%)

| Màn / viewport | MSW | Native |
|---|---:|---:|
| P-97 / 1440 | 0,869271 | 0,900872 |
| P-97 / 390 | 0,774784 | 0,776675 |
| P-98 / 1440 | 0,836806 | 0,873920 |
| P-98 / 390 | 2,447735 | 2,449875 |

Auth A-17/A-20 empty-submit có field errors/focus theo SRS/BUG-022 khác prototype
chỉ toast: `DV-V2-403-1`, không tăng threshold/che vùng ảnh hoặc bỏ validation.
Native Auth snapshot lấy ở `f821b0e`; `32f6112` không đổi Auth layout. Không dùng
selected parity này để tuyên bố toàn bộ registry đã chạy lại.

## Cảnh báo hồi quy và phần tiếp theo

- Một lượt MSW đầu 25/26 timeout UAT-11 ở lần login thứ hai. Log fail được giữ.
  Không sửa assertion/timeout hay đoán nguyên nhân; sau đó cùng source chạy
  toàn bộ 26/26 và 52/52, isolated 15/15. **Chưa chứng minh nguyên nhân flake đã
  được sửa**. Theo dõi lại ở acceptance P4/P5; nếu tái hiện giữ DOM/trace ngoài
  repo để chẩn đoán. Không coi đây là bằng chứng lỗi mật khẩu backend/native.
- Admin Affiliate TIP-404, chi trả/hủy hai phía và AT-AF01…06 toàn hệ thống còn
  phải hoàn tất. REQ-309 phần chi trả Admin, REQ-310 luồng hủy hai phía,
  REQ-312 UI Admin vẫn ghi chờ, không đóng thay bằng Portal tests.
- Chưa audit C1–C6/audit e2e toàn P4, chưa merge P4, chưa bắt đầu P5.
- Không triển khai VPS hoặc dùng provider thật. DB/Redis/native service do lượt
  kiểm này sở hữu đã cleanup khi chốt checkpoint: so khớp PID, creation epoch,
  command line và listener trước khi dừng API/socket/Admin/worker. Portal và
  MSW do Playwright bật đã tự dừng. Giữ DB/Redis/dữ liệu, prototype 4800 và
  worker có sẵn PID 688; không chạm cổng bảo vệ. Không có Portal preview ổn định
  được giữ chạy sau lượt này; không dùng cổng test đang tắt làm link bàn giao.

## Verify

Build hai target theo `e2e/server/README.md`, dùng native API/socket/worker và
demo dev có fake providers. Chạy tuần tự `affiliate-{lifecycle,paused,portal,
screen}.spec.ts` + `auth-flows.spec.ts` bằng config MSW/native, project behavior;
chạy parity selected A-12…20,A-31/32,P-97/98 với threshold 3%. Không chạy hai
target đồng thời vì globalTeardown dùng chung raw parity directory.
