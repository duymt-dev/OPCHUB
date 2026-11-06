# TIP-V46-813: Trả nợ code nhóm A (A1 → A12)

## HEADER

- TIP-ID: TIP-V46-813
- Project: OPCHUB
- Module: nhiều domain:
  - chat / community: Tổng quan chat
  - llm-config: dọn bảng / alias / env cũ
  - auth guard: chữ 403 GĐ Vùng
  - worker: log AI chưa cấu hình
  - Portal / Admin: lint `<img>`
  - regional-director / affiliate / membership-fee: test thiếu, khóa gửi nhắc tay
  - audit: test nhánh lỗi
- Priority: P2
- Depends on: V46-812 (đã merge). `dev` = `fd540d1d`.
- Estimated: L
- REQ / D:
  - Nguồn: `plans/V4.6-DEBT.md` › A1 → A12, phạm vi theo **D-137**
  - Ràng buộc liên quan:
    - ADR-0008 / ADR-0009 (AI cấu hình ở Admin, test dùng stub HTTP)
    - D-52, D-128 (vùng theo nhóm tỉnh tham gia sớm nhất), D-131 / BR-463 (không tạo khoản 0đ)
    - REQ-616 (GĐ Vùng), REQ-620 (nhắc gia hạn), REQ-624 / luật 10 (audit)
  - Câu hỏi mở: **Q-V46-813-1 → 4** (cuối file, có mặc định)
- **Files touched:**
  - **A1 Tổng quan chat > 100 nhóm**
    - `apps/server/src/modules/community/repositories/group.repository.ts` (modify: `joinedBy(userId)`)
    - `apps/server/src/modules/community/services/group.service.ts` (modify: `joined(userId)`, dùng lại `toGroupItem` + `avatarsOf`)
    - `apps/server/src/modules/community/index.ts` (modify nếu cần export)
    - `apps/server/src/modules/chat/services/chat-overview.service.ts` (modify)
    - `apps/server/test/chat/chat-overview-many-groups.int.spec.ts` (create)
    - `apps/server/test/chat/chat-rest.int.spec.ts` (modify: chỉ sửa chú thích fixture "without … changing the 100-row API", giữ assertion)
    - `coding-packs/reports/TIP-V46-813-query-plans.md` (create)
  - **A2 Xóa `llm_configs`**
    - `packages/db/prisma/schema/llm-config.prisma` (modify: bỏ `model LlmConfig`, giữ 3 model còn lại)
    - `packages/db/prisma/migrations/20261114090000_v46_drop_llm_configs/{migration,down}.sql` (create). `down.sql` tạo lại bảng + 4 CHECK theo `20261028144206_v42_llm_config`.
    - `apps/server/src/modules/llm-config/llm-config-cache.ts` (delete: alias `LlmConfigCache`)
    - `apps/server/src/modules/llm-config/llm-config.service.ts` (delete: alias `LlmConfigService`)
    - `apps/server/src/modules/llm-config/llm-config.controller.ts` → `ai-settings.controller.ts` (rename, class `AiSettingsController`; route `admin/settings/ai` giữ nguyên)
    - `apps/server/src/modules/llm-config/index.ts`, `llm-config-core.module.ts`, `llm-config-http.module.ts` (modify: import / export mới)
    - `packages/shared/src/api-domains/llm-config.ts`, `llm-config.spec.ts` (delete); `packages/shared/src/api-domains/index.ts` (modify: bỏ 1 dòng export)
    - `apps/server/test/audit/admin-audit-manifest.ts` (modify: `LlmConfigController.*` → `AiSettingsController.*`)
    - `apps/server/test/settings/ai-migration.int.spec.ts` (modify: tạo bảng tạm `llm_configs` bằng DDL viết rõ, không dùng `LIKE public.llm_configs`)
    - `apps/server/test/settings/llm-runtime.int.spec.ts` (modify: `AiConfigCache`)
    - `packages/db/test/migration-llm-config.int.spec.ts` (modify: DDL nguồn inline; thêm ca up / down của migration xóa)
  - **A3 Bỏ `BOT_LLM_PROVIDER` / `LLM_LOCAL_*`**
    - `apps/server/src/common/config/env.schema.ts` (modify: bỏ khóa + nhánh kiểm `local`)
    - `apps/server/src/common/integrations/llm-provider.ts` (modify: luôn trả runtime; bỏ `LlmEnv`)
    - `apps/server/src/common/integrations/llm-provider.spec.ts` (modify), `apps/server/src/common/config/bot-env.spec.ts` (modify / delete phần LLM)
    - `apps/server/.env.example` (modify: bỏ dòng 28 → 35 phần LLM)
    - `apps/server/test/setup/env.ts` (modify: bỏ dòng 18)
    - Test int boot app mà chưa override `LLM`: chuyển sang override tường minh `[LLM, new FakeLlmProvider()]` qua `createTestApp({ overrides })` hoặc stub HTTP qua `helpers/ai-config.ts`. Gồm `apps/server/test/bot/{bot-bulk-worker-v42,bot-worker,bot-reply-worker,persona-publication,bot-hide}.int.spec.ts` và mọi file khác test full lộ ra (ghi danh sách vào completion).
    - `apps/server/test/settings/llm-runtime.int.spec.ts` (modify: bỏ override `NODE_ENV: 'development'`)
    - `docs/adr/0008-llm-config-in-admin.md`, `docs/adr/0009-multi-ai-providers.md` (modify: ghi chú env đã bỏ, test dùng override provider / stub HTTP)
  - **A4 Chữ 403 GĐ Vùng**
    - `packages/shared/src/errors.ts` (modify: `regionalDirectorDeniedMessage(roleName)`)
    - `apps/server/src/common/auth/decorators.ts`, `guards.ts` (modify: tham số tùy chọn chữ từ chối cho `RequireAdmin`, mặc định giữ nguyên)
    - `apps/server/src/modules/regional-director/controllers/admin-regional-directors.controller.ts` (modify: 3 route ghi)
    - `apps/admin/src/mocks/handlers/regional-directors.ts` (modify: cùng chữ)
    - `apps/server/test/regional-director/permissions.int.spec.ts`, `appoint.int.spec.ts` (modify: kiểm `code` + `message`)
  - **A5 Log "Chưa cấu hình AI"**
    - `packages/integrations/src/errors.ts` (modify: `IntegrationError` thêm `reason?: 'not_configured'`; giữ chữ ký cũ)
    - `apps/server/src/modules/llm-config/services/ai-router.service.ts` (modify: gắn `reason` ở dòng 48 / 85)
    - `apps/server/src/common/queue/worker.factory.ts` (modify: lỗi `not_configured` log `debug`, các lỗi khác vẫn `warn`)
    - `apps/server/src/modules/outbox/outbox-relay.service.ts` (modify chỉ khi lỗi đi qua relay; cùng quy tắc)
    - `apps/server/src/common/queue/worker.factory.spec.ts` (create hoặc modify), `apps/server/test/bot/bot-provider-failure.int.spec.ts` (modify: spy logger)
  - **A6 Lint `<img>`** (modify: thêm `// eslint-disable-next-line @next/next/no-img-element -- <lý do>` như `chat/group-rail.tsx:39`)
    - `apps/admin/src/features/events/components/event-form-fields.tsx`, `event-grid.tsx`
    - `apps/admin/src/features/groups/components/group-form-fields.tsx`, `group-grid.tsx`
    - `apps/portal/src/features/events/components/event-parts.tsx`
    - `apps/portal/src/features/profile/components/profile-card.tsx`
    - `apps/portal/src/features/shell/components/welcome-mail-modal.tsx`
  - **A7 Test 802**
    - `apps/server/test/regional-director/share-ledger.int.spec.ts` (modify: ca nhóm ngành con)
    - `apps/server/test/regional-director/share-relay-replay.int.spec.ts` (create: relay giao 2 lần)
    - `apps/server/test/factories/regional-share.factory.ts` (modify nếu cần)
  - **A8 Audit MSW**
    - `packages/shared/src/mock-data/domains/affiliate-persistence/snapshot.ts`, `schema.ts` (modify: helper chung `isAffiliateAuditAction` nhận `affiliate.` + `regional_share.` + `regional_director.`)
    - `packages/shared/src/mock-data/domains/affiliate-persistence/snapshot.spec.ts`, `packages/shared/src/mock-data/domains/regional-shares.spec.ts` (modify)
  - **A9 Test 803**
    - `apps/server/test/affiliate/commission-guards.int.spec.ts` (create: tự giới thiệu + làm tròn 0đ, cho phí thành viên và Gọi vốn)
    - `apps/server/test/affiliate/region-column.int.spec.ts` (modify: trang đủ 20 dòng)
  - **A10 e2e GĐ Vùng**
    - `e2e/behavior/helpers/director-session.ts` (create)
    - `e2e/behavior/regional-director-portal.spec.ts` (create)
    - `packages/shared/src/mock-data/**` (modify chỉ khi MSW chặn sai TK `regional_director`; ghi completion)
  - **A11 Gửi nhắc tay chồng nhau**
    - `apps/server/src/modules/membership-fee/services/renewal.service.ts` (modify: khóa advisory)
    - `apps/server/src/modules/membership-fee/repositories/renewal.repository.ts` (modify nếu khóa đặt ở repository)
    - `apps/server/test/membership-fee/renewal-concurrency.int.spec.ts` (create)
    - `apps/admin/src/features/settings/components/renewal-*` (modify chỉ để hiện thông báo 409; theo mẫu lỗi hiện có)
  - **A12 Audit nhánh lỗi**
    - `apps/server/test/audit/admin-audit-branches.int.spec.ts` (create)
    - `apps/server/test/audit/admin-audit-branches.cases.ts` (create: bảng ca theo domain)
  - **Tài liệu**
    - `coding-packs/reports/TIP-V46-813-completion.md` (create)
    - `coding-packs/reports/V4.6-progress.md` (modify: dòng #13)
    - `coding-packs/plans/V4.6-DEBT.md` (modify: đánh dấu A1 → A12 xong)
    - `coding-packs/reports/ui-parity/questions.md` (modify: mục TIP-V46-813)
- **Parallel-safe with:** none, sequential. Làm trước TIP-V46-814.
  - 814 sửa `apps/server/test/audit/admin-audit-coverage.spec.ts` (A14). 813 **không** sửa file đó, chỉ sửa `admin-audit-manifest.ts`.
  - 814 chạy lại chuỗi migration (A21), gồm migration xóa của A2.
  - 816 (Web Push) sửa `notification` / `settings`; 813 không đụng.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-813-debt-code` tách từ `dev` `fd540d1d`.
- **DB:** `opchub_v46_801_test` (int) và Redis `127.0.0.1:6381` như 801 → 812. **Hỏi owner** đích DB trước khi chạy `migrate deploy` / `test:int` / e2e server / seed. Không tắt HOLD.
- Migration mới nhất: `20261113090000_v46_ai_providers`. Migration của A2 phải là **thư mục mới sau đó**. **Không sửa** migration 811, vì nó đọc `llm_configs` khi chạy trên DB trắng.
- **A1 — Tổng quan chat chỉ đọc 100 nhóm đầu.**
  - `chat-overview.service.ts:22-57`:

    ```ts
    const { items } = await this.groups.page(user.sub, { page: 1, size: 100 });
    const joined = items.filter((g) => g.myStatus === 'member').map((g) => g.id);
    ```

  - `GroupRepository.page` sắp theo `createdAt asc, id asc`, phân trang skip/take. Nhóm thứ 101 trở đi không bao giờ vào `joined`.
  - Luồng gọi: route `GET /me/chat` (`me-chat.controller.ts:19`) → Portal `features/chat/api.ts:41` → `use-chat-data.ts:19`. DTO `ChatOverview { joined, others }` ở `packages/shared/src/api-domains/chat-room.ts:28`.
  - Index sẵn có:
    - `group_members_user_id_status_idx (user_id, status)`
    - `group_members_regional_earliest (user_id, status, created_at, group_id)`
  - 807 đã thu hẹp fixture test (`chat-rest.int.spec.ts:48-52`), chưa sửa production (`reports/TIP-V46-807-completion.md:118,147-148`).
- **A2 — bảng `llm_configs` còn trong schema.** Runtime không đọc. Còn tồn:
  - alias `LlmConfigCache = AiConfigCache`, `LlmConfigService = AiSettingsService`
  - class `LlmConfigController` (route đã là `admin/settings/ai`)
  - schema shared `@deprecated` (`api-domains/llm-config.ts`)
  - 2 test dựa vào bảng thật: `ai-migration.int.spec.ts` (`CREATE TEMP TABLE … LIKE public.llm_configs`), `packages/db/test/migration-llm-config.int.spec.ts`
- **A3 — `BOT_LLM_PROVIDER`** có ở:
  - `env.schema.ts:50-58,143-147`
  - `llm-provider.ts:5-31` (`NODE_ENV === 'test'` → `FakeLlmProvider`)
  - `.env.example:28-35`, `test/setup/env.ts:17-18`
  - `bot-env.spec.ts`, `llm-provider.spec.ts`

  Bảy spec bot đã override `[LLM, new FakeLlmProvider()]` qua `createTestApp({ overrides })` (`bot-emergency`, `bot-generation`, `bot-provider-failure`, `bot-reply-runs-v42`, `bot-schedule-window`, `bot-bulk-api-v42`, `bot-bulk-generation-v42`). Spec boot app mà không override sẽ nhận lỗi "Chưa cấu hình AI" sau khi bỏ env.

  Helper sẵn có: `test/helpers/{llm-http-stub,ai-config,llm-barrier-stub}.ts`.
- **A4 — chữ 403.**
  - `PermissionGuard` (`common/auth/guards.ts:148-163`) trả:
    - `VIEW_ONLY` "Vai trò X chỉ có quyền xem mục này" (`packages/shared/src/errors.ts:30`)
    - `FORBIDDEN` "Bạn không có quyền thực hiện thao tác này"
  - TIP-801 (`tips/TIP-V46-801-gdv-appoint.md:239`) yêu cầu chữ "Vai trò {tên} không có quyền bổ nhiệm / thu hồi GĐ Vùng" cho cả 2 mã. Route ghi ở `admin-regional-directors.controller.ts` (`@RequireAdmin('affiliate.regional')` dòng 52, 65, 79; dòng 43 là GET ứng viên).
- **A5 — log lặp.**
  - `ai-router.service.ts:48,85` ném `IntegrationError('admin-configured-llm', 'Chưa cấu hình AI', false)`.
  - `bot.processor.ts:64-72` đổi thành `UnrecoverableError`. `worker.factory.ts:55-57` log `warn` mọi job lỗi.
  - `bot-tick` chạy mỗi 10 giây, `bot-reply-scan` mỗi 20 giây (`worker/schedules.ts:8-9`), nên log `warn` lặp liên tục khi chưa cấu hình AI.
- **A6:** 9 cảnh báo `@next/next/no-img-element` ở 7 file (Files touched). Các `<img>` khác đã có disable kèm lý do (ảnh storage động, `onError` dự phòng BUG-011 / D-36).
- **A7 — test 802 còn thiếu.**
  - Vùng của affiliate theo `earliest-group.sql.ts:3-9`: `COALESCE(parent.region, g.region)`, nhóm ngành con lấy tỉnh của nhóm cha. Chưa có ca nhóm ngành con có vùng khác nhóm cha.
  - Chống trùng chia sẻ dựa `createManyAndReturn({ skipDuplicates })` (`regional-share.repository.ts:14-21`), id thông báo `regional-share:${shareId}`. Chưa có test relay giao sự kiện 2 lần.
  - Mẫu: `test/affiliate/region-column.int.spec.ts:52-82` (nhóm con), `test/affiliate/commission.int.spec.ts:28-31` (`relayOnce`), `test/regional-director/my-region.int.spec.ts:20` (`providers: [RegionalDirectorProcessor]`).
- **A8:** `affiliate-persistence/snapshot.ts:50,82` + `schema.ts:39` chỉ giữ audit `affiliate.*`. Audit mock `regional_share.payout` (`regional-shares.ts:199-209`) mất sau khi tải lại.
- **A9:**
  - Chặn ở `affiliate-lifecycle.handler.ts:53-65` (tự giới thiệu, `Math.round` → 0) và `fundraising-commission.handler.ts:28,34,43`. Chưa có int riêng.
  - `region-column.int.spec.ts:13-51` lọc `q` theo email nên trang chỉ có 1 dòng.
- **A10:**
  - Persona GĐ Vùng: `bao.tran@solobooks.vn` / `User@2026` (seed `packages/db/seed/demo/regional-directors.ts`, trạng thái phí `regional_director`, `valid_until NULL`).
  - Server mới có `regional-director/fee-gate.int.spec.ts`; chưa có ca trình duyệt đi qua các feed.
- **A11:**
  - `renewal.service.ts:85-135` (`send`) chạy một transaction, không khóa. `renewal.repository.ts:59-67` upsert `fee_reminders` (`M:<ngày VN>`, `DO UPDATE SET sent_at`). Hai lần gửi chồng nhau đều gửi mail + thông báo.
  - Gửi lại cùng ngày là hành vi đúng (test dòng 191), nên không chặn theo ngày.
  - Mẫu khóa: `affiliate-allocation.repository.ts:8`, `bot-bulk.repository.ts:54`.
- **A12:**
  - `admin-audit-coverage.spec.ts` (AST) chỉ chứng minh mỗi route ghi Admin có trong manifest và có chuỗi action trong `src`.
  - Bằng chứng nhánh lỗi hiện chỉ có ở `affiliate/admin-races`, `membership-fee/bank-reconcile-admin`, `renewal-admin` (spy `AuditService.log` ném lỗi), `regional-director/permissions` (403 không ghi audit).

## APPLICABLE STANDARDS

- [database/query-indexing](../standards/database/query-indexing.md): A1 truy vấn theo thành viên trước, dùng index `(user_id, status)`; EXPLAIN trên ≥ 10k dòng; không `select *`.
- [database/prisma-migrations](../standards/database/prisma-migrations.md): A2 thư mục migration riêng, `--create-only` rồi sửa SQL, có `down.sql`, không sửa migration cũ.
- [backend/auth-rbac](../standards/backend/auth-rbac.md): A4 vẫn kiểm bằng permission key, chỉ đổi chữ; giữ mã `VIEW_ONLY` / `FORBIDDEN`.
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): A1 chat gọi community qua `index.ts`, không import nội bộ repository.
- [integrations/adapters](../standards/integrations/adapters.md): A3 không fake ở runtime; test dùng override provider tường minh / stub HTTP.
- [backend/queues-workers](../standards/backend/queues-workers.md): A5 job vẫn thất bại như cũ, chỉ hạ mức log; A7 relay idempotent.
- [testing/testing](../standards/testing/testing.md): test ở file riêng; ca âm; không nới assertion.
- [global/code-structure](../standards/global/code-structure.md), [global/git-workflow](../standards/global/git-workflow.md).

## TASK

Trả 12 khoản nợ code / test nhóm A còn lại sau GOAL-V4.6, **không đổi nghiệp vụ, API hay giao diện**. Phần lớn là bổ sung test hoặc dọn code chết. Ba khoản có đổi hành vi, được nêu rõ ở SPEC:

- A1: sửa lỗi production, Tổng quan chat chỉ đọc 100 nhóm đầu
- A4: chữ thông báo 403 GĐ Vùng
- A11: hai lần gửi nhắc tay chồng nhau

## SPECIFICATIONS

### A1 — Tổng quan chat

1. Thêm `GroupRepository.joinedBy(userId)`:
   - `group_members.user_id = $1 AND status = 'member'` JOIN `groups` (`deleted_at IS NULL`)
   - cùng thứ tự `created_at, id` như `page`
   - chỉ select cột `toGroupItem` cần
   - **Không giới hạn 100.** Trần an toàn = trần số nhóm một TV được tham gia nếu đã có; không có thì 1.000, kèm ghi chú.
2. `ChatOverviewService.overview()`:
   - `joined` lấy từ `joinedBy`
   - `others` giữ trang 100 hiện tại nhưng **loại id đã joined**
   - DTO `ChatOverview` không đổi; `isOwner`, `unread`, `online`, `thumbUrl` giữ cách tính hiện tại
3. Truy vấn còn tối đa 1 lần cho `joined` + 1 lần cho `others` + các truy vấn theo lô sẵn có. Không truy vấn trong vòng lặp.
4. Giữ fixture thu hẹp của 807. Chỉ sửa chú thích cho đúng, không bỏ assertion cũ.

### A2 — Xóa `llm_configs`

5. Migration `20261114090000_v46_drop_llm_configs`:
   - `migration.sql`: `DROP TABLE IF EXISTS llm_configs;`
   - `down.sql`: tạo lại đúng bảng + 4 CHECK của v42, không chép dữ liệu (ghi chú trong file)
   - **Không** sửa migration 811
6. Bỏ `model LlmConfig` khỏi Prisma.
7. Bỏ alias `LlmConfigCache` / `LlmConfigService`. Đổi `LlmConfigController` → `AiSettingsController` (file `ai-settings.controller.ts`). Route, quyền, audit action (`llm.update`, `llm.verify`) **giữ nguyên**.
8. Tên thư mục module `llm-config` và class `LlmConfigCoreModule` / `LlmConfigHttpModule` **giữ nguyên** (Q-V46-813-1).
9. Xóa `packages/shared/src/api-domains/llm-config.ts` + spec + dòng export. Giữ `llmLocalConfigSchema`.
10. `ai-migration.int.spec.ts` vẫn kiểm luồng chuyển dữ liệu của migration 811, bằng bảng tạm tạo từ DDL viết rõ. `migration-llm-config.int.spec.ts` kiểm CHECK v42 bằng DDL inline, thêm ca: migration xóa chạy được, `down.sql` tạo lại bảng có đủ CHECK.

### A3 — Bỏ env LLM test

11. Xóa `BOT_LLM_PROVIDER`, `LLM_LOCAL_*` khỏi zod env, `.env.example`, `test/setup/env.ts`. Token `LLM` luôn là `LlmRuntimeService`, trong mọi `NODE_ENV`.
12. Spec cần LLM giả phải override tường minh `[LLM, new FakeLlmProvider()]` (cho phép, vì không dựa vào env) hoặc dùng stub HTTP + `aiDraft`. Không thêm nhánh `NODE_ENV` mới trong code production.
13. Chạy full `pnpm test:int` để lộ mọi spec thiếu override; sửa từng file, ghi danh sách vào completion. **Không** nới assertion bot.
14. Sửa ADR-0008 / 0009: ghi "env `BOT_LLM_PROVIDER` đã bỏ ở TIP-V46-813", thay câu "router preserves the explicit fake/local boundary". Không đổi quyết định kiến trúc.

### A4 — Chữ 403 GĐ Vùng

15. `RequireAdmin(...keys, { deniedMessage?: (roleName) => string })`, hoặc tham số tương đương không phá chữ ký cũ. Guard dùng chữ này cho **cả** `VIEW_ONLY` và `FORBIDDEN`. Mã lỗi và HTTP status không đổi. Route khác không đổi chữ.
16. 3 route ghi của GĐ Vùng (bổ nhiệm, thu hồi, cập nhật) dùng `regionalDirectorDeniedMessage(roleName)`: "Vai trò {tên vai trò} không có quyền bổ nhiệm / thu hồi GĐ Vùng". GET ứng viên giữ chữ chung (Q-V46-813-2). MSW Admin trả cùng chữ.

### A5 — Log AI chưa cấu hình

17. `IntegrationError` thêm trường tùy chọn `reason?: 'not_configured'`. Chữ ký cũ vẫn chạy. Router gắn `reason` ở 2 chỗ "chưa cấu hình" và "thiếu key".
18. `WorkerFactory` (và outbox relay nếu lỗi đi qua đó) log lỗi `reason = 'not_configured'` ở mức `debug`; mọi lỗi khác giữ `warn`. Không nuốt lỗi; job vẫn thất bại như cũ.

### A6 — Lint

19. Thêm disable kèm lý do cụ thể cho 9 chỗ (ảnh URL storage / ngoài, cần `onError` dự phòng). **Không** chuyển sang `next/image` trong TIP này. Sau sửa, `pnpm lint` Portal / Admin còn 0 cảnh báo `no-img-element`.

### A7 → A9 — Test bổ sung

20. **A7 nhóm ngành con:** affiliate tham gia sớm nhất một nhóm ngành con (`kind: 'industry'`, `parentId` = nhóm tỉnh miền A, bản thân ghi vùng / tỉnh miền B) → khoản chia sẻ vào GĐ Vùng miền A (D-128).
21. **A7 relay 2 lần:** cùng sự kiện `membership_fee.confirmed` qua `OutboxRelayService.relayOnce()` hai lần (đặt lại `dispatched_at` hoặc thêm lại cùng payload) → đúng 1 dòng `regional_share`, 1 thông báo, không lỗi.
22. **A8:** helper `isAffiliateAuditAction(action)` dùng ở cả capture, restore, schema; nhận `affiliate.`, `regional_share.`, `regional_director.`. Audit `regional_share.payout` còn sau khi khôi phục; audit domain khác vẫn không bị xóa.
23. **A9 tự giới thiệu / làm tròn 0đ:** cho cả phí thành viên và Gọi vốn → 0 dòng `commissions`, 0 outbox, handler không ném lỗi (BR-463, D-131).
24. **A9 cột vùng:** trang 20 dòng có nhóm trộn lẫn, lọc bằng token riêng. Vẫn chỉ 1 lần `affiliateRegions`, 1 `FROM unnest(`.

### A10 — e2e GĐ Vùng

25. Helper `directorSession(page)` đăng nhập persona GĐ Vùng. Spec `regional-director-portal.spec.ts` đi qua: Dashboard, Cộng đồng, Chat, Sự kiện, Dự án, Nhu cầu, Gian hàng, Dịch vụ, Thông báo, `/affiliate?tab=reg`. Mỗi trang:
    - **không** popup phí / paywall, không 402
    - nội dung chính hiện
    - thẻ onboarding hiện đúng như TV đã đóng phí

    Chạy được cả MSW và server, cùng assertion. Nếu MSW chặn sai thì sửa mock (ghi completion).

### A11 — Gửi nhắc tay chồng nhau

26. Đầu transaction `send`, gọi `pg_try_advisory_xact_lock(<khóa cố định renewal-manual>)`.
    - Không lấy được khóa → 409 `RENEWAL_SEND_BUSY` "Đang gửi nhắc gia hạn, vui lòng thử lại sau", không gửi, không audit (Q-V46-813-3).
    - Gửi lại cùng ngày sau khi lần trước xong vẫn được (giữ test dòng 191).
27. Thêm mã lỗi vào `packages/shared` theo mẫu mã hiện có. Admin hiện toast lỗi theo cách các lỗi 409 khác đang hiện.

### A12 — Audit nhánh lỗi

28. `admin-audit-branches.cases.ts` gồm mỗi domain trong manifest ít nhất 1 ca route ghi đại diện.
    - **(a) bị từ chối:** 403 do thiếu quyền, hoặc 409 / 422 do trạng thái sai → số `audit_logs` không đổi, dữ liệu không đổi.
    - **(b) audit ném lỗi:** cho domain thuộc luật 8 (phí / tiền, khóa TK, duyệt dự án / Gọi vốn / gian hàng, GĐ Vùng, chi trả) → `AuditService.log` ném lỗi thì thay đổi nghiệp vụ được hoàn tác.
29. Một spec chạy bảng ca. Mỗi file ≤ 450 dòng; vượt thì tách theo nhóm domain. Không sửa `admin-audit-coverage.spec.ts` (thuộc 814).

### Validation

- DTO / route / quyền / audit action không đổi (trừ class controller A2, chữ 403 A4, mã 409 A11).
- `pnpm depcheck` không vi phạm (A1 chat → community qua `index.ts`).
- Không còn chuỗi `BOT_LLM_PROVIDER`, `LLM_LOCAL_`, `LlmConfigCache`, `LlmConfigService`, `llmConfigSchema` trong `apps/`, `packages/` (trừ migration cũ và DDL trong test). Kiểm bằng `rg`, ghi output vào completion.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| TV > 100 nhóm | `joined` đủ mọi nhóm đang là thành viên (tới trần ở SPEC 1) |
| Chạy migration A2 trên DB trắng | Chuỗi 811 → A2 chạy được (811 vẫn đọc `llm_configs` lúc đó còn tồn tại) |
| Spec quên override LLM | "Chưa cấu hình AI" → sửa spec, không thêm fake vào runtime |
| Vai trò thiếu `affiliate.regional` gọi bổ nhiệm | 403 `FORBIDDEN` / `VIEW_ONLY` với chữ GĐ Vùng |
| Bot chạy khi chưa cấu hình AI | Job lỗi như cũ; log `debug` |
| Hai lần "Gửi" nhắc tay đồng thời | Một lần 200; lần kia 409 `RENEWAL_SEND_BUSY`, không mail / thông báo / audit |

## ACCEPTANCE CRITERIA

- **A1:** Given TV tham gia 1 nhóm đứng sau 120 nhóm khác (thứ tự `created_at`) When `GET /me/chat` Then nhóm đó có trong `joined` với `isOwner` / `unread` đúng, không có trong `others`, và tổng truy vấn không tăng theo số nhóm. Test: int `chat-overview-many-groups.int.spec.ts` › `A1 joined beyond first 100 groups`. `chat-rest.int.spec.ts` và contract `chat.int.spec.ts` vẫn PASS. Có EXPLAIN `joinedBy` trên ≥ 10k `group_members`: Index Scan, không Seq Scan.
- **A2:** Given DB trắng When `migrate deploy` toàn chuỗi Then bảng `llm_configs` không còn, `down.sql` tạo lại đủ 4 CHECK. Test: `migration-llm-config.int.spec.ts` › `A2 drop migration up and down`. `ai-migration.int.spec.ts` vẫn kiểm chuyển dữ liệu 811. `rg` không còn alias / schema cũ. Audit manifest PASS với `AiSettingsController.*`.
- **A3:** Given env không có `BOT_LLM_PROVIDER` When boot app ở `NODE_ENV=test` Then token `LLM` là runtime. Toàn bộ `apps/server/test/bot/*` PASS với override tường minh. Test: unit `llm-provider.spec.ts` › `always runtime`; `bot-env.spec.ts` sửa theo; full `test:int` PASS.
- **A4:** Given Kế toán (chỉ xem) và Giảng viên (không có khóa) When `POST` bổ nhiệm / thu hồi Then 403 `VIEW_ONLY` / `FORBIDDEN` với chữ "Vai trò … không có quyền bổ nhiệm / thu hồi GĐ Vùng", không audit. Route khác giữ chữ cũ. Test: `permissions.int.spec.ts` › `A4 denied message`; unit guard.
- **A5:** Given chưa cấu hình AI When `bot-tick` chạy Then job lỗi `UnrecoverableError` như cũ, logger **không** có `warn` cho lỗi này (có `debug`). Lỗi AI khác (401 / timeout) vẫn `warn`. Test: unit `worker.factory.spec.ts`; int `bot-provider-failure.int.spec.ts` › `A5 not configured logs debug`.
- **A6:** `pnpm lint` Portal + Admin: 0 cảnh báo `@next/next/no-img-element` (chép output).
- **A7:** int `share-ledger.int.spec.ts` › `A7 industry child resolves parent region`; `share-relay-replay.int.spec.ts` › `A7 relay twice creates one share and one notification`.
- **A8:** unit `snapshot.spec.ts` › `A8 keeps regional audit on restore`; `regional-shares.spec.ts` (ca payout còn sau restore).
- **A9:** int `commission-guards.int.spec.ts` › `A9 self referral no commission` (phí + Gọi vốn), `A9 rounded zero no commission`; `region-column.int.spec.ts` › `A9 full page of 20 batches region lookup once`.
- **A10:** e2e `regional-director-portal.spec.ts` › `A10 regional director browses every feed without paywall`, PASS trên MSW và server.
- **A11:** Given 30 TV hợp lệ When 2 request `POST /admin/renewal/send` đồng thời Then đúng một 200, một 409 `RENEWAL_SEND_BUSY`. Mail, outbox, audit bằng đúng 1 lần gửi. Gửi lại sau đó 200. Test: `renewal-concurrency.int.spec.ts` › `A11 overlapping manual sends`. Toàn bộ `renewal-admin.int.spec.ts` vẫn PASS.
- **A12:** `admin-audit-branches.int.spec.ts`: mọi domain trong manifest có ca (a) PASS; domain luật 8 có ca (b) PASS. Danh sách domain + số ca ghi vào completion.
- **Không hồi quy:** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build` xanh. `pnpm e2e` MSW không tụt so với baseline `dev`. e2e server cho `chat`, `admin-regional-directors`, `admin-renewal`, `regional-director-portal`.

## CONSTRAINTS

- DO NOT:
  - đổi DTO / route / quyền / audit action (ngoài phần nêu ở Validation)
  - sửa migration 811 hoặc migration cũ khác
  - thêm fake LLM vào code production, thêm nhánh `NODE_ENV` mới
  - nới assertion, thêm `retries` / `skip` / `fixme`, tăng timeout
  - chuyển `<img>` sang `next/image`
  - sửa `admin-audit-coverage.spec.ts` (thuộc 814)
  - đổi tên thư mục module `llm-config`
  - truy vấn trong vòng lặp; `select *`
  - `any`, `@ts-ignore`, `console.*`
  - sửa `.env` thật; tắt HOLD; tự merge PR
- REUSE:
  - `toGroupItem`, `avatarsOf`, `statusesOf` (community)
  - `test/helpers/{ai-config,llm-http-stub}.ts`, `createTestApp({ overrides })`, `FakeLlmProvider`
  - mẫu khóa advisory `affiliate-allocation.repository.ts`
  - mẫu `relayOnce` `commission.int.spec.ts`
  - mẫu nhóm con `region-column.int.spec.ts`
  - disable lint có lý do như `chat/group-rail.tsx:39`
  - mã lỗi / toast lỗi hiện có
- SKIP:
  - đổi tên thư mục / module `llm-config` → `ai` (Q-V46-813-1)
  - A13 → A22 (TIP-814), B1 / B2 (816 / 815), B3 → B18 (để sau, D-137)
  - phân trang `others` ở Tổng quan chat (giữ trang 100 hiện tại)

## Câu hỏi chờ owner chốt (builder dùng mặc định nếu chưa có trả lời, ghi `questions.md` › TIP-V46-813)

- **Q-V46-813-1 Đổi tên module `llm-config` thành `ai`?**
  - **Mặc định:** giữ tên thư mục và tên module. Chỉ bỏ alias và đổi tên class controller, để tránh sửa 6 module khác cùng lúc.
- **Q-V46-813-2 Chữ 403 riêng của GĐ Vùng có áp cho xem danh sách ứng viên không?**
  - **Mặc định:** không. Chỉ áp cho 3 thao tác ghi: bổ nhiệm, thu hồi, cập nhật. Phần xem giữ chữ chung.
- **Q-V46-813-3 Hai Admin cùng bấm "Gửi" nhắc gia hạn.**
  - **Mặc định:** người bấm sau nhận "Đang gửi nhắc gia hạn, vui lòng thử lại sau" (409), không xếp hàng chờ. Sau khi lần đầu gửi xong, gửi lại vẫn được như hiện nay.
- **Q-V46-813-4 Trần số nhóm ở Tổng quan chat.**
  - **Mặc định:** hiện đủ mọi nhóm TV đang tham gia, trần kỹ thuật 1.000 nhóm.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-813-debt-code`; chỉ sửa file trong **Files touched** (A3 / A10 lộ thêm spec / mock thì ghi rõ lý do vào completion).
- [ ] Hỏi owner DB đích trước khi `migrate deploy` / `test:int` / e2e server / seed. Migration `--create-only` rồi sửa SQL; thử up + down trên bản sao.
- [ ] Đo baseline `dev` trước (gate + e2e MSW) để tách lỗi cũ / mới.
- [ ] Mỗi AC A1 → A12 có test đúng tên, ghi PASS / FAIL thật từng cái.
- [ ] Chép tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`, `pnpm e2e`, e2e server các spec ở AC, `rg` của Validation.
- [ ] EXPLAIN `joinedBy` → `TIP-V46-813-query-plans.md`.
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 4:** quyền vẫn kiểm bằng permission key, chỉ đổi chữ (A4)
  - **Luật 5:** A1 truy vấn theo index thành viên, không vòng lặp, không `select *`
  - **Luật 10 / 8:** A12 chứng minh từ chối không ghi audit, audit lỗi thì hoàn tác; A11 bị chặn không audit
  - **Luật 11 / ADR-0008:** A3 không fake ở runtime, test override tường minh / stub HTTP
  - **Luật 12:** A3 bỏ biến khỏi `.env.example` + zod env cùng lúc
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`.
- [ ] Ghi Q-V46-813-1 → 4 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #13 và `V4.6-DEBT.md`.
- [ ] Commit theo bước (mỗi khoản A# một hoặc vài commit), `git commit -- <paths>` (cấm `git add -A`). `git status --short` sạch, push, PR `base: dev`, không tự merge. Completion có **git commit SHA**, PR, số test thật, phần chưa làm.
- [ ] KHÔNG báo DONE nếu còn gate đỏ.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched theo từng khoản A#, mức file
- [x] Context:
  - DB / HOLD; migration mới nhất; không sửa 811
  - hiện trạng từng khoản có đường dẫn + dòng
- [x] Task rõ: 3 thay đổi hành vi (A1, A4, A11), còn lại dọn code / thêm test
- [x] SPEC 1 → 29 theo khoản; validation có `rg`; bảng lỗi
- [x] AC Given / When / Then có tên test cho cả 12 khoản + không hồi quy
- [x] Constraints DO NOT / REUSE / SKIP; trích luật 4 / 5 / 8 / 10 / 11 / 12, ADR-0008
- [x] Parallel: sequential trước 814 (khai rõ không sửa `admin-audit-coverage.spec.ts`)
- ⚠️ Gap:
  - A3 có thể lộ nhiều spec int boot app không override LLM. Chưa đếm được trước khi chạy full; builder ghi danh sách.
  - A12 khối lượng phụ thuộc số domain (~30 trong manifest). Nếu vượt L, builder tách A12 thành commit theo nhóm domain, không tách TIP.
  - Q-V46-813-1 → 4 chưa chốt; mặc định chọn hướng ít đổi nhất.
