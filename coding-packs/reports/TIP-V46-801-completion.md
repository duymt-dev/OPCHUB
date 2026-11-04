# TIP-V46-801 — Completion report

**STATUS: PARTIAL — NOT DONE.** Chức năng đã được triển khai và có bằng chứng kiểm thử bên dưới, nhưng chưa đạt toàn bộ quality gate e2e/parity. Không đề nghị merge khi các điểm mở chưa được xử lý.

## Header

- Ngày: 2026-11-04.
- Nhánh: `feature/TIP-V46-801-gdv-appoint`; base `dev` (`5c17ed0f`), TIP được chốt tại `6a480baa`.
- Implementation commit: `81556c27` (đã push).
- Follow-up source guard: `e9770746` — `WHERE status = from AND version = expected`, đã kiểm chứng và push.
- Benchmark whitelist follow-up: `ee63856` — chỉ thêm DB test riêng đã được owner cho phép.
- PR: [#79](https://github.com/duymt-dev/OPCHUB/pull/79), base `dev`, draft; không merge / auto-merge.

## Phần đã triển khai

- Ba ô vùng cố định, duy nhất thành viên / tỉnh; bổ nhiệm, thay người, thu hồi, cấu hình tỉnh và tài khoản ngân hàng.
- Phí `regional_director` không hạn; lưu trạng thái / hạn trước khi bổ nhiệm, khôi phục theo hàm transition khi thu hồi. Không xóa kỳ phí hoặc affiliate.
- Khóa ô `FOR UPDATE NOWAIT`, version CAS, xử lý SQLSTATE `55P03` của Prisma 7; slot, phí, lịch sử, audit và outbox trong cùng transaction.
- Quyền `affiliate.regional`, backend chặn ghi; Kế toán chỉ xem. Không dùng tên vai trò để quyết định quyền trong logic nghiệp vụ.
- EM-GDV1/2 và thông báo hệ thống idempotent theo outbox ID; không gửi mật khẩu. Fee event đi qua `FeeEventsHandler` hiện hữu.
- Admin: tab GĐ Vùng / Cấu hình GĐ Vùng, chip tỉnh, select ứng viên, xác nhận bổ nhiệm / thu hồi, lịch sử giờ VN, tab phí miễn phí, email hệ thống chỉ đọc.
- Seed m3 / m9 / m10 và 34 tỉnh; MSW có cùng luật, lưu / khôi phục snapshot qua bridge, hỗ trợ thành viên vừa đăng ký.

## Kết quả kiểm chứng

Các log ở `test-results/v46-801-*.log` là artifact local, không chứa URL DB / mật khẩu. Kết quả dưới đây không cộng trùng các lượt chạy lại.

| Gate | Kết quả đã ghi nhận | Evidence |
|---|---|---|
| lint | PASS, 8 tasks; còn warning `<img>` hiện hữu | `v46-801-lint-guard.log` |
| typecheck | PASS, 8 tasks | `v46-801-types-guard.log` |
| unit toàn repo | PASS: 1.953 tests, 2 skipped hiện hữu; 6 tasks | `v46-801-test-final-forks.log` |
| unit sau bổ sung source-state guard | PASS: 1.953 tests, 2 skipped; 6 tasks (4 cached), pool mặc định | `v46-801-test-guard.log` |
| integration toàn repo | **FAIL**: server 1.745 passed, 2 failed, 1 skipped; 3 file fail / 189 do một suite lỗi setup guard. DB task chưa hoàn tất do Turbo dừng sau lỗi | `v46-801-test-int-3.log` |
| integration sửa lỗi / scope GĐ Vùng | PASS: 37/37, 7 files; gồm 26 ca regional và 11 ca Admin Phí | `v46-801-regional-int-final.log` |
| integration DB toàn package | PASS: 126/126, 26 files; migration test riêng và seed assertions | `v46-801-db-int-final.log` |
| integration bulk-hide benchmark retest | PASS: 1/1; EXPLAIN và 20.042 messages, không bỏ assertion | `v46-801-benchmark-int-final.log` |
| depcheck | PASS cả FE/shared và backend | `v46-801-depcheck-final-2.log` |
| build | PASS, 3 tasks; `--env-mode=loose` để giữ biến output riêng, không ghi đè bản đang test | `v46-801-build-verified.log` |
| seed required hai lần | PASS trên DB riêng | `v46-801-seed-required-{1,2}.log` |
| e2e MSW full | **FAIL**: 331 passed, 13 failed, 4 skipped / 348; 20,2 phút | `v46-801-e2e-full.log` |
| e2e MSW scope / regression | PASS: 41/41, gồm 6 ca GĐ Vùng / mail và Thành viên / Phí / Nhóm / Marketing | `v46-801-e2e-regression-final-2.log` |
| e2e AF0 seed regression | PASS: 3/3, tổng affiliate 64 → 66 sau khi thêm m9/m10 | `v46-801-e2e-count-regression-3.log` |
| e2e server thật | PASS: 6/6, chạy lại sau build source-state guard; cùng assertions với MSW, API / socket / worker thật và Memurai riêng | `v46-801-e2e-server-guard-2.log` |
| parity | **FAIL**: 10 passed (gồm 2 harness), 12 failed / 22; ngưỡng giữ nguyên 3% | `v46-801-parity-final.log`, [results](ui-parity/results.md) |

Lượt thử dùng pool `vmThreads` không được dùng làm bằng chứng PASS: một test timer mock bulk thất bại trong pool này. Đã quay lại pool mặc định `forks`, giữ isolation và assertions; lượt mặc định đạt 1.953 tests nêu trên. Không nới timeout / retry / mask / ngưỡng parity.

Lượt integration full bắt đầu trước khi sửa fixture mã affiliate (dài hơn CHECK constraint) và assertion tổng phí chưa cộng trạng thái GĐ Vùng. Suite bulk-hide benchmark có guard chỉ nhận `opchub_test`, nên setup bị từ chối trên DB riêng; đã bổ sung đúng tên `opchub_v46_801_test`, vẫn giữ localhost / port 5432 / test-only. Cả ba file lỗi đã pass lượt retest riêng; chưa chạy lại full, không suy diễn rằng toàn bộ gate full đã xanh. Một lượt browser chạy nhầm port mặc định và một lượt native bắt đầu trước khi API health ready đều thất bại setup; kết quả PASS được ghi là các lượt đúng port / đã sẵn sàng ở bảng trên.

### Đối chiếu acceptance criteria

| AC | Bằng chứng | Nhận xét |
|---|---|---|
| AT-GDV01 | `appoint.int` từ pending / trial / expired; `realtime.int` REST, presign upload, socket; mail retry; e2e hai provider | Đã kiểm chứng đường đi chính |
| AT-GDV02 | khôi phục trial / expiring / active / pending; sự kiện live, Redis fee và REST 402 sau thu hồi | Đã kiểm chứng |
| AT-GDV03 | 5 vai trò × 3 route, audit không đổi khi bị chặn; UI Kế toán không có nút ghi và khóa input | Đã kiểm chứng; lỗi RBAC dùng thông điệp chuẩn chung |
| AT-GDV04 (801) | so sánh user, affiliate và kỳ phí trước / sau thu hồi trong `appoint.int`, đã pass retest | Không nhận là diff toàn bộ DB. Sổ chia sẻ thuộc 802 |
| AT-GDV05 / 06 | trùng vùng 409; ứng viên bỏ người vùng khác / bị khóa; investor trực tiếp 422; e2e tìm ứng viên | Đã kiểm chứng |
| AT-GDV07 | thay người ghi revoke rồi appoint, audit actor / role; lịch sử UI VN | Đã kiểm chứng |
| Concurrency | một người / hai ô chỉ một thành công; giữ khóa một ô thì thao tác cạnh tranh nhận 409 | Đã kiểm chứng; source-state CAS bổ sung có test riêng |
| Cổng phí | helper Prisma + SQL, sweep / reminder bỏ qua, thu tay 409, webhook unmatched; live REST/socket/upload | Visibility có bằng chứng helper SQL; chưa thêm e2e riêng GĐ Vùng cho toàn bộ feed / onboarding |
| Seed | seed required hai lần; seed-demo test chạy lại sau dữ liệu bị sửa; ba ô và 34 tỉnh có assertion riêng | PASS trong DB suite 126 ca |
| UI parity | bảng dưới | **Chưa đạt**, không DONE |

## Parity tại implementation `81556c27`

| Màn | 1440 | 390 | Verdict |
|---|---:|---:|---|
| D-120-GCFG | 4,34% | 8,57% | FAIL |
| D-120-GCFG-RO | 10,53% | 10,23% | FAIL |
| D-18-GDV | 0,35% | 1,66% | PASS |
| D-07 | 0,15% | 0,13% | PASS |
| D-18 | 0,27% | 2,14% | PASS |
| D-69 | 2,82% | 2,26% | PASS |
| D-84 | 15,70% | 7,85% | FAIL |
| D-84-AFF | 5,94% | 27,38% | FAIL |
| D-84-POL | 34,57% | 32,37% | FAIL |
| D-78-GDV | capture bị chặn | capture bị chặn | Prototype không có lối vào Marketing; test thực sự thất bại, không thêm skip / inject state |
| D-120-GDV | pending 802 | pending 802 | Không tính PASS trong 801 |

Ảnh diff chưa đạt được lưu ở `ui-parity/diffs/`; không che phần khác biệt. Cấu hình còn lệch form / layout; các màn Affiliate còn khác số liệu và chính sách v4.6. Không tự dựng số chia sẻ giả hoặc triển khai sổ / chính sách của 802 / 803 chỉ để giảm pixel diff.

## PostgreSQL / EXPLAIN

Đã đo trên **DB riêng** trong transaction rồi `ROLLBACK`: thêm 12.000 users / affiliates / group memberships / regional history events, tổng **12.024 users**, `ANALYZE`, không đặt `enable_seqscan=off`.

| Query thực tế | Plan chính | Execution time |
|---|---|---:|
| ứng viên tìm không dấu + loại khóa / investor / người vùng khác | `Bitmap Index Scan users_search`, deferred page, `Index Scan users_pkey` | 4,527 ms |
| đếm affiliate theo nhóm tham gia sớm nhất | một query, `Index Only Scan group_members_regional_earliest`, join PK groups | 216,284 ms |
| 50 lịch sử gần nhất | index-only chọn ID; lateral `LIMIT 1` seek PK đúng 50 hàng payload | 0,376 ms |

Không Seq Scan `users` / `group_members` lớn. Scan `affiliates` để tổng hợp toàn bộ mạng lưới là có chủ đích; ba ô vùng là bảng nhỏ. Index `(user_id, status, created_at, group_id)` đặt equality trước thứ tự; index ứng viên partial có `INCLUDE (full_name, email)`.

Lượt đầu history được planner chọn hash join + scan 12.000 event payload; đã sửa thành deferred lateral join, không ép planner bằng setting. Plan cuối lưu tại `test-results/v46-801-explain-final.log`, SQL tái hiện tại `test-results/v46-801-explain.sql`.

## Vấn đề còn mở

1. **P1 — Full e2e chưa xanh.** Lượt 348 ca có 13 lỗi. Ba lỗi đếm thành viên nhóm / người nhận marketing / AF0 đã sửa và pass trong lượt 41 ca và 3 ca AF0 riêng; chưa chạy lại full sau các sửa này. Mười lỗi còn lại liên quan response listener của accountant collection, dữ liệu / kỳ affiliate, chat topic, portal shell và báo cáo tháng. Chưa có phép đo `dev` độc lập để kết luận tất cả là baseline; không đổi assertion nghiệp vụ hoặc sửa lan ngoài TIP.
2. **P1 — Parity chưa đạt.** Cần sửa tiếp layout cấu hình và triage khác biệt Affiliate; Marketing cần prototype có lối vào thực sự. Không đánh dấu các màn này PASS.
3. **P2 — Thông điệp RBAC.** Mã 403 / VIEW_ONLY và quyền đúng, nhưng câu lỗi từ guard dùng mẫu chung thay vì câu riêng “Vai trò … không có quyền bổ nhiệm / thu hồi GĐ Vùng” của TIP.
4. **P2 — Bằng chứng visibility.** Predicate SQL / Prisma đã kiểm; chưa có ca browser riêng cho mọi feed / onboarding với tài khoản GĐ Vùng.
5. **P2 — Integration full cần chạy lại.** Ba file lỗi đã pass targeted retest và DB suite pass, nhưng lượt `pnpm test:int` toàn repo cuối vẫn là FAIL; không đổi nhãn gate thành PASS dựa trên cộng các lượt khác nhau.

## Deviations / phạm vi

- Owner cho phép DB mới do `opchub_dev` native chứa migration từ nhánh khác: dùng `opchub_v46_801_dev` / `opchub_v46_801_test`, không reset / chuẩn hóa native.
- Owner xác nhận dựng lại Redis bằng Memurai: instance riêng `127.0.0.1:6381`; không dừng / flush instance native `6379`.
- Thêm whitelist **đúng hai tên DB** trong seed guard và guard integration tương ứng; không mở cho DB tùy ý.
- Hai migration: bảng / enum / index ứng viên và index earliest-membership; tạo `--create-only`, rà / bỏ diff index không liên quan rồi deploy trên DB riêng. Enum rollback được ghi rõ là thao tác manual, không giả vờ xóa enum an toàn.
- Projection đọc chéo account / affiliate / group đặt trong `modules/reporting/regional`, không nhét query các domain khác vào repository ghi GĐ Vùng.
- Mail / outbox có API bổ sung idempotency theo event ID; đường đăng ký handler cũ giữ nguyên.
- `regional-revoke` dùng chung server / MSW; metadata snapshot mới giữ trạng thái qua reload / bridge. Các file mới ngoài danh sách TIP phục vụ các ranh giới / test này, không thêm dependency.
- Câu hỏi Q-V46-801-1 → 6 đã ghi ở [questions](ui-parity/questions.md). Không làm sổ chia sẻ, năm khách, kỳ chi, chính sách 802/803, Portal “Vùng của tôi” hoặc tự thu hồi khi khóa.

## Soát luật cứng 1–14

1. Module / component / hook tách nhỏ; không file TS/TSX thay đổi vượt 400 dòng; CSS mới lớn nhất 317 dòng. Không mở rộng monolith.
2. TS strict, không `any` / `@ts-ignore`; input HTTP / event / snapshot dùng zod shared.
3. Không import chéo app; projection reporting theo boundary đọc; depcheck đạt.
4. Backend permission key, không tên vai trò trong logic cấp quyền.
5. Batch / deferred join / index; EXPLAIN thực trên >10k như trên.
6. Fee event dùng publisher / handler hiện hữu, không query DB theo người nhận.
7. Transition domain + row lock + version CAS; source status predicate đang được kiểm chứng bổ sung.
8. Slot / fee / audit / outbox atomic; consumer mail / notification idempotent.
9. VND integer; timestamp UTC / `timestamptz`, UI lịch sử `Asia/Ho_Chi_Minh`.
10. Audit mọi ghi regional; không đưa số tài khoản vào audit diff / logger.
11. Tích hợp ngoài qua adapter hiện hữu; native verification dùng fake providers.
12. Không thêm secret / dependency / major version / biến env mới; không sửa `.env` được quản lý.
13. Test ở file riêng.
14. Implementation đã commit / push SHA trên; completion / evidence được commit riêng sau khi chốt số liệu, không báo DONE khi gate fail.

## Runtime HOLD / cách verify

- PostgreSQL native 5432 và DB native cũ giữ nguyên; chỉ hai DB riêng được migration / seed / test.
- Memurai riêng 6381; API 4300, socket 4301, worker riêng; Next server 3400/3401; MSW 3300/3301; prototype 4830.
- Startup / runner local ở `test-results/v46-801-{run,start-server,start-next}.cjs`, chỉ load env có sẵn rồi override DB / Redis / ports; không hard-code credential vào Git.
- Với các biến trỏ đúng DB riêng và Redis riêng: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:int`, `pnpm depcheck`, `pnpm build`; dùng `--env-mode=loose` cho build khi cần giữ `NEXT_DIST_DIR` riêng qua Turbo.
- E2E: MSW `pnpm --filter @opchub/e2e e2e admin-regional`; server `pnpm --filter @opchub/e2e e2e:server admin-regional` sau khi build `NEXT_PUBLIC_API_MOCKING=off`. Không làm yếu assertions theo provider.

## Files changed

Danh sách chính xác của source / tests được thêm ở phần manifest cuối báo cáo; artifact parity và tài liệu thuộc `coding-packs/reports/`, glossary thuộc `coding-packs/standards/global/domain-glossary.md`.

- `apps/admin/messages/vi/affiliate.json`
- `apps/admin/messages/vi/fees.json`
- `apps/admin/messages/vi/marketing.json`
- `apps/admin/src/features/affiliate/components/affiliate-content.tsx`
- `apps/admin/src/features/affiliate/components/affiliate-tabs.tsx`
- `apps/admin/src/features/affiliate/model.ts`
- `apps/admin/src/features/affiliate/regional/api.ts`
- `apps/admin/src/features/affiliate/regional/components/regional-assignment.tsx`
- `apps/admin/src/features/affiliate/regional/components/regional-bank-fields.tsx`
- `apps/admin/src/features/affiliate/regional/components/regional-config-panel.tsx`
- `apps/admin/src/features/affiliate/regional/components/regional-history.tsx`
- `apps/admin/src/features/affiliate/regional/components/regional-list.tsx`
- `apps/admin/src/features/affiliate/regional/components/regional-province-picker.tsx`
- `apps/admin/src/features/affiliate/regional/components/regional-slot-card.tsx`
- `apps/admin/src/features/affiliate/regional/components/regional-slot-summary.tsx`
- `apps/admin/src/features/affiliate/regional/components/regional.module.css`
- `apps/admin/src/features/affiliate/regional/hooks/use-regional-confirmations.ts`
- `apps/admin/src/features/affiliate/regional/hooks/use-regional-directors.ts`
- `apps/admin/src/features/affiliate/regional/hooks/use-regional-writes.ts`
- `apps/admin/src/features/affiliate/regional/types.ts`
- `apps/admin/src/features/fees/components/fee-table.module.css`
- `apps/admin/src/features/fees/components/fee-toolbar.tsx`
- `apps/admin/src/features/fees/model.ts`
- `apps/admin/src/features/fees/types.ts`
- `apps/admin/src/features/marketing/components/auto-panel.tsx`
- `apps/admin/src/features/marketing/components/regional-mail-list.tsx`
- `apps/admin/src/features/marketing/components/regional-mail.module.css`
- `apps/admin/src/mocks/admin-groups.spec.ts`
- `apps/admin/src/mocks/affiliate-handlers.spec.ts`
- `apps/admin/src/mocks/fee-handlers.spec.ts`
- `apps/admin/src/mocks/handlers/index.ts`
- `apps/admin/src/mocks/handlers/regional-directors.ts`
- `apps/admin/src/mocks/onboarding-handlers.spec.ts`
- `apps/admin/src/mocks/overview-handlers.spec.ts`
- `apps/server/src/api/api-app.module.ts`
- `apps/server/src/common/auth/fee-where.ts`
- `apps/server/src/common/auth/index.ts`
- `apps/server/src/common/outbox/outbox-relay.service.ts`
- `apps/server/src/modules/account/repositories/admin-member-filter.sql.ts`
- `apps/server/src/modules/local-business/repositories/store-explore.repository.ts`
- `apps/server/src/modules/mail/index.ts`
- `apps/server/src/modules/mail/mail-priority.ts`
- `apps/server/src/modules/mail/mail.repository.ts`
- `apps/server/src/modules/mail/mail.service.ts`
- `apps/server/src/modules/mail/templates-regional.ts`
- `apps/server/src/modules/membership-fee/domain/membership-fee.state.spec.ts`
- `apps/server/src/modules/membership-fee/domain/membership-fee.state.ts`
- `apps/server/src/modules/membership-fee/index.ts`
- `apps/server/src/modules/membership-fee/membership-fee-core.module.ts`
- `apps/server/src/modules/membership-fee/repositories/membership-fee.repository.ts`
- `apps/server/src/modules/membership-fee/services/admin-fees.service.ts`
- `apps/server/src/modules/membership-fee/services/membership-fee.service.ts`
- `apps/server/src/modules/membership-fee/services/regional-fee.service.ts`
- `apps/server/src/modules/onboarding/repositories/onboarding.repository.ts`
- `apps/server/src/modules/project/repositories/project-feed.query.ts`
- `apps/server/src/modules/project/repositories/project.repository.ts`
- `apps/server/src/modules/regional-director/controllers/admin-regional-directors.controller.ts`
- `apps/server/src/modules/regional-director/domain/regional-director.rules.spec.ts`
- `apps/server/src/modules/regional-director/domain/regional-director.rules.ts`
- `apps/server/src/modules/regional-director/index.ts`
- `apps/server/src/modules/regional-director/regional-director-core.module.ts`
- `apps/server/src/modules/regional-director/repositories/regional-director.repository.ts`
- `apps/server/src/modules/regional-director/services/regional-director-events.handler.ts`
- `apps/server/src/modules/regional-director/services/regional-director-read.service.ts`
- `apps/server/src/modules/regional-director/services/regional-director.service.ts`
- `apps/server/src/modules/reporting/index.ts`
- `apps/server/src/modules/reporting/regional/regional-projection.module.ts`
- `apps/server/src/modules/reporting/regional/regional-projection.repository.ts`
- `apps/server/src/worker/processors/regional-director.processor.ts`
- `apps/server/src/worker/worker-app.module.ts`
- `apps/server/test/bot/bot-hide-storage.int.spec.ts`
- `apps/server/test/membership-fee/admin-fees-v42.int.spec.ts`
- `apps/server/test/membership-fee/admin-fees.int.spec.ts`
- `apps/server/test/regional-director/appoint.int.spec.ts`
- `apps/server/test/regional-director/fee-gate.int.spec.ts`
- `apps/server/test/regional-director/permissions.int.spec.ts`
- `apps/server/test/regional-director/realtime.int.spec.ts`
- `apps/server/test/regional-director/reconcile.int.spec.ts`
- `e2e/behavior/admin-fees.spec.ts`
- `e2e/behavior/admin-groups.spec.ts`
- `e2e/behavior/admin-marketing.spec.ts`
- `e2e/behavior/admin-members-filters.spec.ts`
- `e2e/behavior/admin-members.spec.ts`
- `e2e/behavior/admin-regional-directors.spec.ts`
- `e2e/behavior/admin-regional-mail.spec.ts`
- `e2e/behavior/affiliate-ui-debt-agents.spec.ts`
- `e2e/parity/registry.ts`
- `e2e/parity/scenarios/admin-regional.ts`
- `packages/db/prisma/migrations/20261104090000_v46_regional_directors/down.sql`
- `packages/db/prisma/migrations/20261104090000_v46_regional_directors/migration.sql`
- `packages/db/prisma/migrations/20261104091000_v46_regional_membership_order/down.sql`
- `packages/db/prisma/migrations/20261104091000_v46_regional_membership_order/migration.sql`
- `packages/db/prisma/schema/account.prisma`
- `packages/db/prisma/schema/mail.prisma`
- `packages/db/prisma/schema/membership-fee.prisma`
- `packages/db/prisma/schema/regional-director.prisma`
- `packages/db/seed/demo/account.ts`
- `packages/db/seed/demo/guard.ts`
- `packages/db/seed/demo/index.ts`
- `packages/db/seed/demo/project-fees.ts`
- `packages/db/seed/demo/regional-directors.ts`
- `packages/db/seed/demo/reset.ts`
- `packages/db/test/affiliate-payout-demo.int.spec.ts`
- `packages/db/test/bot-demo-scenario.int.spec.ts`
- `packages/db/test/bot-workflow-demo.int.spec.ts`
- `packages/db/test/seed-demo.int.spec.ts`
- `packages/shared/src/api-domains/fees-admin.ts`
- `packages/shared/src/api-domains/index.ts`
- `packages/shared/src/api-domains/marketing.ts`
- `packages/shared/src/api-domains/regional-directors.ts`
- `packages/shared/src/enums.ts`
- `packages/shared/src/fixtures/prototype-seed.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/membership/fee-access.spec.ts`
- `packages/shared/src/membership/fee-access.ts`
- `packages/shared/src/membership/regional-revoke.spec.ts`
- `packages/shared/src/membership/regional-revoke.ts`
- `packages/shared/src/mock-data/domains/admin-members.spec.ts`
- `packages/shared/src/mock-data/domains/admin-members.ts`
- `packages/shared/src/mock-data/domains/admin.ts`
- `packages/shared/src/mock-data/domains/affiliate-demo.spec.ts`
- `packages/shared/src/mock-data/domains/affiliate-payout-scenario.spec.ts`
- `packages/shared/src/mock-data/domains/affiliate-persistence/schema.ts`
- `packages/shared/src/mock-data/domains/affiliate-persistence/snapshot.spec.ts`
- `packages/shared/src/mock-data/domains/affiliate-persistence/snapshot.ts`
- `packages/shared/src/mock-data/domains/fees-admin.ts`
- `packages/shared/src/mock-data/domains/index.ts`
- `packages/shared/src/mock-data/domains/marketing.spec.ts`
- `packages/shared/src/mock-data/domains/onboarding.spec.ts`
- `packages/shared/src/mock-data/domains/ops-admin.ts`
- `packages/shared/src/mock-data/domains/regional-directors.spec.ts`
- `packages/shared/src/mock-data/domains/regional-directors.ts`
- `packages/shared/src/mock-data/domains/regional-persistence.spec.ts`
- `packages/shared/src/mock-data/domains/regional-snapshot.ts`
- `packages/shared/src/mock-data/domains/registration/registration.spec.ts`
- `packages/shared/src/mock-data/domains/util.ts`
- `packages/shared/src/outbox/events.ts`
- `packages/shared/src/permissions.spec.ts`
- `packages/shared/src/permissions.ts`
