# COMPLETION REPORT — TIP-V2-402

**STATUS: DONE trong phạm vi API/backend TIP-402. Không phải DONE Pha 4 hoặc goal V2.**

Code đã push trên `feature/V2-P4-affiliate`: `ebc6a85` (Portal/public/đăng ký),
`fe8a974` (Admin/chi trả), `fb8ecba` (query seek, ranh giới Account, kiểm chứng cuối).
Full integration cuối chạy đúng source `fb8ecba`; các commit sau đó chỉ là tài liệu.

## Files changed

- Created: 5 controller, service/repository/query theo domain Affiliate, registry
  Referral của Account, shared DTO, migration index, test độc lập và log bằng chứng.
- Modified: bootstrap HTTP/worker, cổng đăng ký Account và mapper/SSO, audit tags,
  outbox schemas/consumer, contract table/coverage và traceability.
- Danh sách đường dẫn đầy đủ ở cuối báo cáo, lấy từ Git thay vì suy đoán.
- Không thay prototype, không thêm dependency, không sửa UI trong TIP này.

## Test results

| Lệnh / bộ kiểm | Kết quả cuối |
|---|---|
| `pnpm lint` | PASS, exit 0; chỉ còn cảnh báo img FE hiện hữu |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm test` | PASS, exit 0; riêng server unit 111/111, 30 file |
| `pnpm depcheck` | PASS, cả đồ thị FE/packages và server |
| Affiliate + contract Portal/Admin + coverage + M1 | 48/48, 21 file |
| Admin commissions sau thêm assertion lý do hai phía | 5/5 |
| `pnpm --filter @opchub/server test:int` trên source cuối | **1165/1165, 98 file, exit 0** |
| `prisma migrate status` native dev | 28 migration, schema up to date |

Log: `evidence/v2-402/affiliate-final-integration.log`, `cancel-both-sides.log`,
`server-regression-fb8ecba.log`, `lint.log`, `typecheck.log`, `unit.log`, `depcheck.log`.
Lượt full cuối: 20/10/2026, 10:40:26–10:47:47 (giờ máy), 441.11 giây.
Lượt nền `fe8a974` cũng xanh 1158/1158; không cộng số này vào lượt cuối.

### Acceptance criteria: 9/9

| # | Tiêu chí của TIP | Bằng chứng trên app/DB thật |
|---|---|---|
| 1 | Chưa phí: locked, không code/link | me-affiliate.int.spec.ts |
| 2 | OTP/SSO tạo referral cùng user | referral-code, referral-registration, referral-atomicity.int.spec.ts |
| 3 | Mã lạ/self/paused chặn, self không gửi OTP | referral-code.int.spec.ts; fields.referralCode; xem V2Q-167 về status 400 |
| 4 | Thiếu STK: 409 đúng tên, không mutation/audit/outbox | payout.int.spec.ts, AT-AF06 |
| 5 | Paused vẫn chi khoản đã ghi nhận | payout.int.spec.ts, AT-AF05 |
| 6 | Rate đơn/bulk chỉ tính lại recorded, paid/cancelled giữ nguyên | admin-commissions, admin-races.int.spec.ts |
| 7 | Hủy cần lý do; paid bỏ qua; API trả lý do ở cả hai phía | admin-commissions.int.spec.ts, cancel-both-sides.log |
| 8 | Admin không có payout; tài khoản có khóa Kế toán được chi | payout, guards.int.spec.ts; production chỉ check permission key |
| 9 | Tên chủ TK chuẩn hóa NGUYEN VAN AN | me-affiliate.int.spec.ts |

### Bổ sung kiểm chứng bắt buộc

- 6 endpoint Portal/public + 14 Admin = **20 Affiliate endpoint**. Contract table
  nền P3 194 → 214; mỗi endpoint có lời gọi `ep(...)` và parse đúng shared schema.
- Tất cả Admin GET kiểm `affiliate.view`; member/action-only không xem được STK.
  Viewer đọc được nhưng ghi trả `VIEW_ONLY`. Mọi body ghi lỗi có 400 + fields;
  có test 413, ID lạ, thiếu key, kỳ hiện tại/tương lai/rỗng và các cạnh trạng thái.
- Rate/cancel/payout: mutation + audit + outbox cùng transaction. Audit lỗi rollback
  rate/commission/outbox. Consumer thật qua relay rồi replay không trùng notice.
- Payout snapshot bất biến; hai key cạnh tranh chỉ một lần chi; retry sau xóa Redis
  trả receipt DB cũ, không thêm audit/outbox. Không gọi ngân hàng.
- Race rate/payout không pha trộn tỷ lệ trong một kỳ; cancel/payout không chi khoản
  đã hủy. Hai activation cùng email/khác mã chỉ tạo một user, phí và referral.
- CSV theo lô/keyset, contacts batch, BOM/quote/formula protection và audit export
  cùng RepeatableRead snapshot. Unknown selected IDs không xuất một phần âm thầm.
- Policy mới không đổi rate đại lý cũ; public code trả cookieDays thật (test 45 ngày).
- Affiliate đọc tên qua Account.MemberDirectory. Tên khách xóa mềm không lộ trong
  API Portal/Admin hoặc notice; list không query theo từng dòng/người nhận.

## Queries / EXPLAIN

15 mẫu dùng cùng SQL builder production: 5 Admin list/offset sâu/export keyset,
10 history/customer/tháng/referral/payout/tìm mã/tìm tên không dấu. Fixture có
10.000 affiliates/commissions và 20.000 users/referrals cho nhóm history/search.

Plan dùng index/bitmap index, không Seq Scan trên các bảng lớn trong fixture.
Commission search UNION hai tập ID (customer và affiliate) trước phân trang;
test yêu cầu Index Cond affiliate_id để chặn quay về global-date index filter.
Lượt full cuối: history/search 0.088–9.152ms; 5 mẫu Admin 0.165–1.694ms.

Đo bằng bảng tạm session-local `LIKE public.… INCLUDING ALL`, cùng columns,
checks/defaults/indexes đã deploy; seed commit rồi VACUUM ANALYZE thông thường.
LIKE không copy FK; test API chạy trên bảng thật với FK. Không đổi planner cost,
không tắt Seq Scan, không reindex bảng thật để ép PASS. Không suy rộng rằng mọi
phân bố dữ liệu hoặc mức bloat của bảng dùng chung luôn có cùng plan.
Log full cuối chứa cả 15 plan; test độc lập ở admin-plan/history-plan.int.spec.ts.

## Issues discovered / đã xử lý

- Search ban đầu chỉ có Index Scan nhưng lọc lướt hàng nghìn dòng theo ngày:
  đã đổi sang ID seek; kiểm lại API/CSV/plan và full regression.
- Fixture rollback cũ để lại index bloat ở DB dùng chung: giữ nguyên log FAIL lịch sử,
  đổi cách đo cô lập theo schema/index thật; không đổi nhãn log cũ thành PASS.
- Ranh giới đọc tên khách: bỏ JOIN users khỏi repository Affiliate; dùng Account API.
- Không còn issue đang mở trong phạm vi triển khai API TIP-402.

## Deviations from spec

- TIP ghi 422 cho zod/nghiệp vụ kiểm mã: giữ convention hệ thống **400 + fields**,
  422 dành OTP_INVALID (V2Q-167). Không làm yếu validation hoặc đổi toàn API.
- Event có thêm notificationId/payoutId để consumer retry và receipt DB idempotent.
  Đây là ID nghiệp vụ, **không dùng thay Git SHA** trong báo cáo.
- Public valid-code thêm cookieDays để route chưa đăng nhập dùng TTL policy thật
  (V2Q-172); không public bank/terms.
- Index SQL viết tay, không migrate dev/shadow DB vì chỉ được dùng dev/test native.
  Migration `20261020130000_affiliate_admin_indexes` đã áp cả hai; có down.sql.
- Export chạy batch trong một snapshot transaction; không có query từng bản ghi.

## Suggestions / chuyển tiếp

- TIP-403/404: UI Portal/Admin, MSW, e2e hai chế độ, parity A-12…20/A-31/32,
  P-97/98 và D-84/85. Các REQ tương ứng mới có phần API, vẫn CHỜ UI trong TEST-GAPS.
- Audit C1–C6 + audit e2e, seed/reset/cache và nghiệm thu UAT/AT toàn pha theo goal
  chạy khi UI hoàn thành. Báo cáo này không tuyên bố e2e/parity/UAT của P4 đã PASS.
- Pha 5 bot và nghiệm thu cuối giữ nguyên phạm vi; chưa triển khai trong TIP-402.
- Đã quan sát prototype form cá nhân bằng Chromium: ô mã nằm sau email, trước
  mật khẩu, placeholder `VD: OPCAN26`. Ảnh khảo sát ở D:/opchub-local/v2; đây chưa
  phải baseline parity của app. Python prototype server do task bật đã được dừng;
  không dừng listener IPv6 4800 của phiên khác.

## File manifest (Git)

### Created

- `apps/server/src/modules/account/repositories/member-search.query.ts`
- `apps/server/src/modules/account/services/referral.registry.ts`
- `apps/server/src/modules/affiliate/controllers/admin-affiliate-commissions.controller.ts`
- `apps/server/src/modules/affiliate/controllers/admin-affiliate-policy.controller.ts`
- `apps/server/src/modules/affiliate/controllers/admin-affiliates.controller.ts`
- `apps/server/src/modules/affiliate/controllers/me-affiliate.controller.ts`
- `apps/server/src/modules/affiliate/controllers/referral-public.controller.ts`
- `apps/server/src/modules/affiliate/domain/affiliate-csv.spec.ts`
- `apps/server/src/modules/affiliate/domain/affiliate-csv.ts`
- `apps/server/src/modules/affiliate/repositories/affiliate-admin.query.ts`
- `apps/server/src/modules/affiliate/repositories/affiliate-admin.repository.ts`
- `apps/server/src/modules/affiliate/repositories/affiliate-history.query.ts`
- `apps/server/src/modules/affiliate/repositories/affiliate-notice.repository.ts`
- `apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts`
- `apps/server/src/modules/affiliate/repositories/commission-admin.query.ts`
- `apps/server/src/modules/affiliate/repositories/commission-admin.repository.ts`
- `apps/server/src/modules/affiliate/repositories/me-affiliate.query.ts`
- `apps/server/src/modules/affiliate/repositories/me-affiliate.repository.ts`
- `apps/server/src/modules/affiliate/repositories/policy.repository.ts`
- `apps/server/src/modules/affiliate/repositories/referral.repository.ts`
- `apps/server/src/modules/affiliate/services/affiliate-admin-notify.handler.ts`
- `apps/server/src/modules/affiliate/services/affiliate-admin.service.ts`
- `apps/server/src/modules/affiliate/services/affiliate-csv.service.ts`
- `apps/server/src/modules/affiliate/services/affiliate-policy.service.ts`
- `apps/server/src/modules/affiliate/services/commission-admin.service.ts`
- `apps/server/src/modules/affiliate/services/me-affiliate.service.ts`
- `apps/server/src/modules/affiliate/services/payout.service.ts`
- `apps/server/src/modules/affiliate/services/referral-code.service.ts`
- `apps/server/src/modules/affiliate/types.ts`
- `apps/server/test/affiliate/admin-commissions.int.spec.ts`
- `apps/server/test/affiliate/admin-plan.int.spec.ts`
- `apps/server/test/affiliate/admin-races.int.spec.ts`
- `apps/server/test/affiliate/guards.int.spec.ts`
- `apps/server/test/affiliate/history-plan.int.spec.ts`
- `apps/server/test/affiliate/history.int.spec.ts`
- `apps/server/test/affiliate/me-affiliate.int.spec.ts`
- `apps/server/test/affiliate/payout.int.spec.ts`
- `apps/server/test/affiliate/policy.int.spec.ts`
- `apps/server/test/affiliate/referral-atomicity.int.spec.ts`
- `apps/server/test/affiliate/referral-code.int.spec.ts`
- `apps/server/test/affiliate/referral-registration.int.spec.ts`
- `apps/server/test/contract/affiliate-admin.int.spec.ts`
- `apps/server/test/contract/affiliate.int.spec.ts`
- `apps/server/test/factories/affiliate-admin.factory.ts`
- `apps/server/test/factories/affiliate-plan.factory.ts`
- `coding-packs/reports/TIP-V2-402-progress.md`
- `coding-packs/reports/evidence/v2-402/admin-plan.log`
- `coding-packs/reports/evidence/v2-402/affiliate-final-integration.log`
- `coding-packs/reports/evidence/v2-402/affiliate-integration.log`
- `coding-packs/reports/evidence/v2-402/cancel-both-sides.log`
- `coding-packs/reports/evidence/v2-402/depcheck.log`
- `coding-packs/reports/evidence/v2-402/lint.log`
- `coding-packs/reports/evidence/v2-402/server-regression-before-plan-fix.log`
- `coding-packs/reports/evidence/v2-402/server-regression-fe8a974.log`
- `coding-packs/reports/evidence/v2-402/typecheck.log`
- `coding-packs/reports/evidence/v2-402/unit.log`
- `packages/db/prisma/migrations/20261020130000_affiliate_admin_indexes/down.sql`
- `packages/db/prisma/migrations/20261020130000_affiliate_admin_indexes/migration.sql`
- `packages/shared/src/api-domains/affiliate-admin.ts`
- `packages/shared/src/api-domains/affiliate.ts`
- `coding-packs/reports/TIP-V2-402-completion.md`
- `coding-packs/reports/evidence/v2-402/server-regression-fb8ecba.log`

### Modified

- `apps/server/src/api/api-app.module.ts`
- `apps/server/src/modules/account/account.module.ts`
- `apps/server/src/modules/account/domain/register.mapper.ts`
- `apps/server/src/modules/account/index.ts`
- `apps/server/src/modules/account/ports.ts`
- `apps/server/src/modules/account/services/member-directory.service.ts`
- `apps/server/src/modules/account/services/register.service.ts`
- `apps/server/src/modules/account/services/sso.service.ts`
- `apps/server/src/modules/affiliate/affiliate-core.module.ts`
- `apps/server/src/modules/affiliate/index.ts`
- `apps/server/src/modules/affiliate/repositories/commission.repository.ts`
- `apps/server/src/modules/affiliate/services/affiliate-notify.handler.ts`
- `apps/server/src/worker/processors/affiliate.processor.ts`
- `apps/server/test/contract/coverage.int.spec.ts`
- `coding-packs/02-TASK-GRAPH.md`
- `coding-packs/audit/W1/TEST-GAPS.md`
- `coding-packs/plans/api-contract.md`
- `coding-packs/reports/V2-questions.md`
- `packages/shared/src/api-domains/index.ts`
- `packages/shared/src/api-domains/settings-admin.ts`
- `packages/shared/src/api/auth.ts`
- `packages/shared/src/outbox/events.ts`

