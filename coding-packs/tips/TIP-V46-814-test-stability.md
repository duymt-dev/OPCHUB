# TIP-V46-814: Ổn định test + parity nhóm A (A13 → A22) + soát B12

## HEADER

- TIP-ID: TIP-V46-814
- Project: OPCHUB
- Module: kiểm chứng, gồm e2e behavior / parity harness, Vitest config, test int server, migration chain. Code production chỉ sửa ở 3 chỗ, đều có nêu rõ: A13 (hook reload phòng chat mock), A17 (truy vấn prune, chỉ khi đo ra cần) và B12 (nhãn mail GĐ Vùng, Q-V46-814-3).
- Priority: P2
- Depends on: V46-813 (đã merge, `dev` = `06e9627b`)
- Estimated: L (thời gian chạy gate dài, khoảng 4–5 giờ tuần tự)
- REQ / D:
  - Nguồn: `plans/V4.6-DEBT.md` › A13 → A22 + B12, phạm vi **D-137**
  - Ràng buộc: D-134 (parity tham khảo, lệch giao diện thật phải sửa), D-63 (không dùng `onServer` làm yếu), D-101 / FX-03 (popup chào xóa khi đăng nhập), BR-464
  - Câu hỏi mở: **Q-V46-814-1 → 4** (cuối file)
- **Files touched:**
  - **A13 — e2e vòng đời bot chập chờn**
    - `e2e/behavior/bot-auto-lifecycle.spec.ts` (modify: chỉ thêm chẩn đoán / chờ đúng tín hiệu; không đổi số đếm, không tăng timeout)
    - `apps/portal/src/features/chat/hooks/use-mock-room-reload.ts`, `use-room-reload.ts` (modify nếu là race reload)
    - `apps/portal/src/features/chat/hooks/room-reload.spec.ts` (modify: ca tái hiện)
    - `packages/shared/src/mock-data/domains/community-persistence/chat-events.ts`, `room-changes.ts` (modify nếu là race relay `storage`)
  - **A14 — quét audit đồng bộ**
    - `apps/server/test/audit/admin-audit-coverage.spec.ts` (modify: đọc bất đồng bộ, parse 1 AST / file dùng chung)
    - `apps/server/test/audit/controller-decorators.audit.ts` (modify: nhận `SourceFile` đã parse)
    - `apps/server/test/audit/controller-decorators.spec.ts` (modify theo)
  - **A15 — Vitest fork**
    - `apps/admin/vitest.config.ts`, `apps/portal/vitest.config.ts`, `packages/ui/vitest.config.ts` (modify: `cacheDir` riêng mỗi package; pool / `maxWorkers` có giới hạn)
    - `turbo.json` (modify chỉ khi cần giới hạn song song cho `test`)
  - **A16 — fixture 100 trả lời mới nhất**
    - `apps/server/test/bot/bot-reply-scan-v42.int.spec.ts` (modify: chuyển sang autocommit + `try/finally` xóa theo tiền tố, như `bot-bulk-lines-v42.int.spec.ts:78-104`)
  - **A17 — kế hoạch prune persona-turn**
    - `apps/server/test/bot/persona-turn.int.spec.ts` (modify: thêm ca dữ liệu lệch) hoặc `persona-turn-skew.int.spec.ts` (create nếu file cũ vượt 450 dòng)
    - `apps/server/src/modules/chat/repositories/persona-turn-prune.ts` (modify **chỉ khi** ca mới ra Seq Scan / Hash Join)
    - `coding-packs/reports/TIP-V46-814-query-plans.md` (create)
  - **A18 — lỗi native 147**
    - `e2e/behavior/helpers/affiliate-session.ts` (modify: chờ response đăng nhập thật rồi mới kiểm URL)
  - **A19 — 14 ảnh miễn**
    - `e2e/parity/scenarios/portal-shell.ts`, `portal-declaration.ts`, `admin-members.ts` (modify: hành trình phía prototype dùng UI đến được)
    - `e2e/parity/steps.ts` (modify nếu cần bước mới dùng chung)
    - `coding-packs/reports/evidence/v46-812-closure.json` (không sửa; 814 ghi file mới `v46-814-closure.json`)
  - **A20 — timeout chụp + nhiễu trạng thái**
    - `e2e/parity/scenarios/portal-my-region.ts`, `project-renewal.ts`, `portal-account.ts`, `admin-content.ts`, `portal-chat.ts`, `admin-members.ts` (modify)
    - `e2e/parity/stabilize.ts`, `e2e/parity/scroll-position.ts` (modify nếu thêm bước ổn định dùng chung)
  - **A21 — chuỗi migration trên DB trắng**
    - `packages/db/scripts/migration-chain-check.mjs` (create: dựng DB trắng tên `*_chain_test`, `migrate deploy` toàn chuỗi, chạy `down.sql` ngược 15 migration v46, `migrate deploy` lại)
    - `packages/db/package.json` (modify: script `migrate:chain-check`)
    - `packages/db/test/migration-chain.int.spec.ts` (create nếu chọn cách test thay script; chọn một trong hai, ghi completion)
  - **A22 — một lượt full gate cùng SHA**
    - Không sửa code. Chỉ báo cáo.
  - **B12 — soát BR-462 / 464**
    - `coding-packs/reports/V4.6-acceptance-cases.md` (modify: cập nhật dòng BR-464)
    - Nếu Q-V46-814-3 giữ mặc định:
      - `packages/db/prisma/schema/mail.prisma` (modify)
      - `packages/db/prisma/migrations/20261115090000_v46_regional_mail_kinds/{migration,down}.sql` (create)
      - `packages/shared/src/api-domains/marketing.ts` (modify: `MAIL_LOG_KIND`)
      - `apps/server/src/modules/regional-director/services/regional-director-events.handler.ts` (modify: dòng 32, 55)
      - `apps/admin/messages/vi/marketing.json` (modify: 2 nhãn)
      - MSW `apps/admin/src/mocks/**` + `packages/shared/src/mock-data/**` (modify: kind mới)
      - `apps/server/test/regional-director/appoint.int.spec.ts` (modify: kiểm kind)
      - `e2e/behavior/admin-regional-mail.spec.ts` (modify: kiểm nhãn)
  - **Báo cáo**
    - `coding-packs/reports/TIP-V46-814-completion.md` (create)
    - `coding-packs/reports/TIP-V46-814-gates.md` (create: bảng A22)
    - `coding-packs/reports/evidence/v46-814-closure.json` (create)
    - `coding-packs/reports/ui-parity/results.*`, `server/results.*`, `diffs/**` (modify: chỉ qua `report.ts`)
    - `coding-packs/reports/ui-parity/V4.6-causes.md`, `questions.md` (modify)
    - `coding-packs/reports/V4.6-progress.md` (dòng #14), `coding-packs/plans/V4.6-DEBT.md` (modify)
- **Parallel-safe with:** none, sequential sau 813, trước 815 / 816.
  - Dùng chung `e2e/parity/**`, `ui-parity/**`, `V4.6-progress.md` với mọi TIP trước.
  - 816 (Web Push) sẽ sửa Portal / notification; 814 phải xong trước để A22 là mốc xanh.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-814-test-stability` tách từ `dev` `06e9627b`.
- **DB / dịch vụ.** Hỏi owner trước khi chạy:
  - int: `opchub_v46_801_test` + Redis 6381 DB2
  - native: `opchub_v46_812_dev` + Redis 6381 DB3, API / socket 4310 / 4311
  - DB trắng mới cho A21: tên phải chứa `_test`, ví dụ `opchub_v46_814_chain_test`

  Không đụng Postgres native / Redis 6379. Không tắt HOLD. Đo xong phải trả seed demo.
- **Wrapper chạy sẵn có** (git-ignored, ở `test-results/`): `v46-813-test-run.cjs` (int), `v46-812-native-run.cjs` (native). Log nhiều file là UTF-16LE.
- **Hiện trạng từng mục** (khảo sát `dev` `06e9627b`):

  | Mục | Hiện trạng / nguyên nhân nghi ngờ |
  |---|---|
  | A13 | `bot-auto-lifecycle.spec.ts:30` (15 phút). Lỗi ở `:127` `getByText(body)` count 3 → nhận 0, trong khi Admin API báo `done` và count 2 trước đó đã PASS. Danh sách chat bị **xóa / remount**, không phải chỉ trễ. Phía MSW: `advanceMockBot` (`bot-execution.ts:63`) → sự kiện `storage` (`chat-events.ts:4-15`) → `room-changes.ts:43-62` → `use-mock-room-reload.ts`. Lượt 2 worker PASS (809). |
  | A14 | `admin-audit-coverage.spec.ts:8-17,61-73`: `readdirSync` đệ quy + `readFileSync` + `ts.createSourceFile` hai lần mỗi controller + nối text toàn `src`. Chạy ở project `unit` (timeout mặc định 5 giây). |
  | A15 | Không có `pool` / `maxWorkers` ở đâu; Vitest 5 mặc định forks. `turbo.json` `test: {}` chạy 6 package song song. Fork timeout ở Admin (805 ×7, 806 ×1); import 0 test khi hai tiến trình Vitest Admin chạy cùng lúc (nghi cache Vite dùng chung). |
  | A16 | `bot-reply-scan-v42.int.spec.ts:120-158`: `$transaction` mặc định 5.000 ms bọc 2 × 10k INSERT + ANALYZE + EXPLAIN → "5098 ms passed" (813 baseline). Tiền lệ sửa: `bot-bulk-lines-v42.int.spec.ts:78-104` (autocommit + `finally deleteMany`). |
  | A17 | `persona-turn-prune.ts` (UNION ALL theo phòng, `OFFSET 120`). Index `messages_simulated_room_idx` (partial). Test hiện phủ: trộn 10k + 10k, toàn simulated. **Chưa phủ:** 10k simulated **trong chính phòng đích** + nhiều phòng (804 red-gates 92-98 thấy Hash Join / Seq Scan khi clone stress). |
  | A18 | Test #147 = `affiliate-dialogs-responsive.spec.ts:77` (390). Lỗi ở `helpers/affiliate-session.ts:9` `not.toHaveURL(/\/login$/)` hết 5 giây, nút "Đăng nhập" còn loading. Lặp lại ở 813 MSW baseline; chạy riêng PASS 6,6 giây. Helper không chờ response đăng nhập. Admin login có `@Throttle 10/60s`. |
  | A19 | Cả 14 ảnh lỗi **phía prototype**. P-05 / P-100 → 102: hành trình prototype đăng nhập An để đọc mật khẩu tạm, nhưng D-101 / FX-03 xóa popup chào khi đăng nhập. D-09: timeout 120 giây. D-17 / D-22: chữ phân trang prototype `Hiển thị 7–8 / 8` không còn khớp. Danh sách miễn ở `evidence/v46-812-closure.json` › `waivedCaptureIds`. |
  | A20 | P-V46-REG@390 (`portal-my-region.ts:31`, click "Xem Vùng của tôi" timeout); P-56-RENEWED@390 (`project-renewal.ts`, timeout 120 giây lúc chụp app). Nhiễu: P-98 sticky header y208 / 588; D-44 cuộn drawer; P-30 / P-34 cuộn trong 88px; D-43 / D-89 trạng thái phía prototype. |
  | A21 | Chưa có test / script "DB trắng → toàn chuỗi". 101 thư mục migration; 15 migration v46 (`20261104090000` → `20261114090000_v46_drop_llm_configs`) đều có `down.sql`, mới chỉ `llm-config` có thử up / down (trên TEMP). |
  | A22 | Lệnh + thời lượng gần nhất: lint 2m40, typecheck 3m, build 2–4,5m, unit ~16m, int 28m → 1h18m, e2e MSW 26m (394), native 1,5–1,6h (391, 1 worker), parity MSW 18m (568), parity native 31m (118). Tổng ~4–5 giờ tuần tự. 806 cho thấy chạy build / e2e chồng nhau gây flake. |
  | B12 | BR-462 phủ đủ (TC-462 e2e + int). **BR-464 thiếu:** đặc tả yêu cầu lịch sử Email tự động ghi nhãn **"Bổ nhiệm GĐ Vùng" / "Thu hồi GĐ Vùng"**; app chỉ có 1 kind `regional_director` → nhãn chung "GĐ Vùng" (`marketing.json:68`; handler dòng 32, 55). 812 ghi PASS là chưa đúng phần nhãn. |

## APPLICABLE STANDARDS

- [testing/testing](../standards/testing/testing.md): sửa nguyên nhân, không che; không retry / skip / tăng timeout; MSW và native cùng assertion.
- [frontend/ui-parity](../standards/frontend/ui-parity.md) + D-134: không mask / nới ngưỡng / sửa ảnh gốc; ảnh > 3% phải có nguyên nhân.
- [database/prisma-migrations](../standards/database/prisma-migrations.md): A21 chuỗi migration, `down.sql`; B12 migration mới có `down.sql`.
- [database/query-indexing](../standards/database/query-indexing.md): A17 EXPLAIN dữ liệu lệch, không thêm index trùng / cờ planner.
- [global/tooling](../standards/global/tooling.md): A15 cấu hình Vitest / turbo.
- [global/git-workflow](../standards/global/git-workflow.md).

## TASK

Ổn định các test và lần chụp parity còn chập chờn hoặc bị miễn (A13 → A20) **bằng cách sửa nguyên nhân**. Chứng minh chuỗi migration chạy được trên DB trắng và `down.sql` v46 chạy được (A21). Chạy **một lượt full gate xanh trên cùng một SHA**, gồm unit, int, MSW, native và parity (A22). Soát lại BR-462 / 464 và sửa nhãn mail GĐ Vùng theo đặc tả (B12).

## SPECIFICATIONS

### Nguyên tắc chung

1. Mỗi mục làm theo thứ tự: **tái hiện → ghi lỗi gốc → sửa nguyên nhân → chứng minh**.
   - Tái hiện: chạy lặp có kiểm soát, ví dụ `--repeat-each` hoặc tải song song như lúc lỗi.
   - Chứng minh: lặp N lần PASS ở cùng điều kiện tải. N ghi theo từng mục.
   - Không tái hiện được sau ≥ 20 lần ở điều kiện cũ → ghi "không tái hiện" kèm log, sửa phần **chắc chắn sai** (ví dụ A18 không chờ response), không đoán thêm.
2. Không: `retries`, `fixme`, `skip`, `unreachable` mới, tăng timeout, nới assertion / ngưỡng, mask, sửa ảnh gốc, `onServer` làm yếu.

### A13 — vòng đời bot

3. Thêm chẩn đoán tạm (trace / log) để xác định vì sao danh sách về 0: remount phòng, reload ghi đè bằng snapshot rỗng, hay sự kiện `storage` đến khi đang tải. Sửa ở hook / relay cho đúng: reload không được thay danh sách bằng kết quả rỗng cũ hơn; dùng phiên bản / thứ tự sự kiện.
4. Thêm unit `room-reload.spec.ts` tái hiện thứ tự sự kiện gây lỗi.
5. Chứng minh: spec PASS 5 lần liên tiếp với 4 worker (điều kiện lúc lỗi). Assertion count 2 / 3 / 3 giữ nguyên.

### A14 → A16 — test đơn vị / int

6. **A14:**
   - đọc file bằng `fs/promises` song song có giới hạn
   - mỗi file parse **một** `SourceFile`, truyền cho `methodDecoratorMap`
   - text toàn `src` đọc một lần

   Timeout giữ mặc định. Chứng minh: PASS khi chạy cùng full `pnpm test` (tải thật) 3 lần.
7. **A15:**
   - mỗi package jsdom có `cacheDir` riêng (ví dụ `node_modules/.vite-vitest`) để hai tiến trình không dùng chung cache
   - đặt `pool: 'forks'` + `maxWorkers` hợp lý (đề xuất `50%`) cho Admin / Portal / UI
   - nếu vẫn lỗi khi `turbo` chạy song song thì giới hạn `--concurrency` cho task `test`, ghi số đo trước / sau

   Chứng minh: `pnpm test` gốc 3 lần liên tiếp, 0 fork timeout, 0 file "no test".
8. **A16:** bỏ `$transaction` bọc fixture; INSERT autocommit với tiền tố riêng, `finally` xóa reply trước rồi xóa tin nguồn (FK `reply_to_id`). Giữ nguyên assertion index `messages_bot_reply_history_idx` / không Seq Scan. Chứng minh: file PASS 5 lần + trong full `test:int`.

### A17 — kế hoạch prune

9. Thêm ca dữ liệu lệch:
   - 10k tin simulated trong **phòng đích**
   - ≥ 50 phòng khác mỗi phòng vài trăm tin
   - 10k tin thành viên trong phòng đích

   Sau `ANALYZE`, EXPLAIN phải dùng `messages_simulated_room_idx` / `messages_pkey`, không Seq Scan, không Hash Join trên `messages`.
10. Ca mới đạt ngay → chỉ thêm test + query plan. Không đạt → viết lại truy vấn trong `persona-turn-prune.ts`, ví dụ:
    - `LATERAL` theo phòng với `LIMIT` / keyset
    - lấy ngưỡng `created_at, id` của dòng thứ 120 rồi `UPDATE … WHERE (created_at, id) < ngưỡng`

    **Không** thêm index trùng, không đổi cờ planner. Hành vi giữ 120 tin mới nhất mỗi phòng không đổi (test hiện có vẫn PASS).

### A18 — đăng nhập helper

11. `affiliate-session.ts`: bấm "Đăng nhập" trong `Promise.all` với `page.waitForResponse` của API đăng nhập Admin.
    - Kiểm status 2xx rồi mới kiểm URL.
    - Status 429 (throttle) → báo lỗi rõ.
    - Không tăng timeout.
12. Nếu native lỗi do throttle `10/60s` khi chạy full: dùng phiên đăng nhập chung cho các test cùng persona (storage state theo worker), không tắt throttle production. Ghi completion.

### A19 / A20 — parity

13. **A19** sửa hành trình **phía prototype** bằng UI đến được trên prototype (D-89 / D-95), không chèn state / localStorage:
    - **P-05 / P-100 → 102:** lấy mật khẩu tạm qua đường prototype còn hiện, ví dụ bước đăng ký hiện mật khẩu, hoặc màn Admin Thành viên. Nếu prototype hoàn toàn không còn đường → Q-V46-814-1.
    - **D-17 / D-22:** chờ theo chữ phân trang thật của prototype hiện tại (đọc lại `index.html`), không cứng `/ 8`.
    - **D-09:** tìm bước treo bằng trace; sửa locator / bước chờ.

    Mỗi ảnh chụp lại ở 1440 + 390. Bỏ khỏi danh sách miễn những ảnh đã chụp được.
14. **A20:**
    - **Hai timeout:** tìm nguyên nhân bằng trace, sửa locator / bước chờ theo tín hiệu thật (response, phần tử ổn định).
    - **Nhiễu trạng thái:** thêm `beforeCapture` đưa **cả hai phía** về cùng trạng thái chuẩn (cuộn về đầu, đóng / mở cùng phần tử) bằng helper `stabilize` / `scroll-position` dùng chung. Không crop / mask.
    - Mỗi ảnh ghi số trước / sau.

### A21 — chuỗi migration

15. Script `migrate:chain-check`, bắt buộc tên DB chứa `_chain_test`, chạy các bước:
    1. tạo DB trắng
    2. `prisma migrate deploy` toàn bộ
    3. kiểm `_prisma_migrations` đủ số thư mục
    4. chạy `down.sql` của 15 migration v46 theo thứ tự ngược, xóa dòng `_prisma_migrations` tương ứng
    5. `migrate deploy` lại
    6. so schema (`pg_dump --schema-only` đã chuẩn hóa) bước 2 với bước 5 — phải giống
    7. xóa DB

    Không chạy trên DB khác. Chép output vào completion.

### A22 — một lượt full cùng SHA

16. Sau khi A13 → A21 + B12 xong và commit, lấy **một SHA** chạy tuần tự (không chồng nhau):
    1. `pnpm lint`
    2. `pnpm typecheck`
    3. `pnpm test`
    4. `pnpm test:int`
    5. `pnpm depcheck`
    6. `pnpm build`
    7. `pnpm e2e` (MSW)
    8. e2e server `--project behavior`
    9. parity MSW `PARITY_IDS='*'` (gồm 14 ảnh A19)
    10. parity native cho nhóm v4.6 + ảnh hưởng

    Ghi `TIP-V46-814-gates.md`: lệnh, SHA, thời lượng, số đạt / lỗi / bỏ qua, đường dẫn log.
17. Có lỗi → sửa, commit, chạy lại **từ đầu** trên SHA mới. Không ghép kết quả của hai SHA. Lỗi đã biết nằm ngoài A13 → A21 → ghi rõ, không gọi là xanh.

### B12 — BR-462 / 464

18. **BR-462:** soát `V4.6-acceptance-cases.md`, giữ nếu đúng.
19. **BR-464** (Q-V46-814-3 mặc định):
    - thêm 2 giá trị enum mail `regional_director_appoint`, `regional_director_revoke` (migration + `down.sql`)
    - handler bổ nhiệm / thu hồi dùng kind tương ứng
    - nhãn "Bổ nhiệm GĐ Vùng" / "Thu hồi GĐ Vùng"
    - dòng cũ `regional_director` giữ nguyên, nhãn "GĐ Vùng"
    - bộ lọc lịch sử mail hiện đủ 3

    Test int kiểm kind; e2e kiểm nhãn. Cập nhật acceptance-cases.

### Validation

- Mọi thay đổi config test có số đo trước / sau.
- `results.*` chỉ sinh qua `report.ts`.
- A21 script từ chối DB không chứa `_chain_test`.

### Error Handling

| Trường hợp | Xử lý |
|---|---|
| Không tái hiện được flake sau ≥ 20 lần | Ghi "không tái hiện" + log; chỉ sửa phần chắc chắn sai; mục ghi PARTIAL, không DONE giả |
| Sửa A13 / A17 cần đổi hành vi nghiệp vụ | Dừng mục đó, ghi Q-V46-814-n |
| Prototype không còn đường UI cho A19 | Q-V46-814-1, giữ miễn có lý do, không `unreachable` mới |
| A22 có lỗi | Sửa → chạy lại từ đầu trên SHA mới |
| Owner chưa duyệt DB `_chain_test` | A21 NOT RUN, ghi rõ; TIP chưa DONE |

## ACCEPTANCE CRITERIA

- **A13** Given 4 worker When chạy `bot-auto-lifecycle.spec.ts` 5 lần Then 5/5 PASS, assertion giữ nguyên. Unit `room-reload.spec.ts` › `A13 stale empty reload does not replace newer list` PASS.
- **A14** Given full `pnpm test` (tải thật) ×3 Then `admin-audit-coverage.spec.ts` PASS cả 3, timeout mặc định.
- **A15** Given `pnpm test` gốc ×3 liên tiếp Then 0 fork timeout, 0 file không có test (chép tóm tắt 3 lượt).
- **A16** Given `bot-reply-scan-v42.int.spec.ts` ×5 + trong full `test:int` Then PASS; assertion index giữ.
- **A17** Given dữ liệu lệch SPEC 9 Then EXPLAIN không Seq Scan / Hash Join trên `messages`; test `persona-turn` cũ PASS; plan ghi ở `TIP-V46-814-query-plans.md`.
- **A18** Given full native behavior Then `affiliate-dialogs-responsive.spec.ts` PASS; helper kiểm response đăng nhập (unit / e2e chạy riêng ×5 PASS).
- **A19** Given parity MSW Then P-05, P-100, P-101, P-102, D-09, D-17, D-22 × 1440 / 390 có ảnh mới cùng SHA. Danh sách miễn trong `v46-814-closure.json` rỗng, hoặc chỉ còn mục có Q-V46-814-1.
- **A20** Given parity MSW whole Then không còn timeout chụp ở P-V46-REG@390, P-56-RENEWED@390. P-98, D-44, P-30 / P-34, D-43, D-89 ghi số trước / sau; phần nhiễu trạng thái về 0.
- **A21** Given DB `_chain_test` trắng When `migrate:chain-check` Then up → down 15 migration v46 → up lại thành công; schema bước 2 = bước 5; DB đã xóa.
- **A22** Given một SHA Then 10 cổng ở SPEC 16 xanh (hoặc lỗi đã biết ngoài phạm vi được ghi rõ). `TIP-V46-814-gates.md` có SHA, số, thời lượng.
- **B12** Given bổ nhiệm rồi thu hồi một GĐ Vùng Then lịch sử Email tự động có 2 dòng nhãn "Bổ nhiệm GĐ Vùng", "Thu hồi GĐ Vùng". Int `appoint.int.spec.ts` › `B12 BR-464 mail kinds`; e2e `admin-regional-mail.spec.ts` › `BR-464 labels`. BR-462 giữ PASS.

## CONSTRAINTS

- DO NOT:
  - `retries` / `fixme` / `skip` / `unreachable` mới; tăng timeout (test, transaction, Playwright)
  - nới assertion / ngưỡng; mask / crop; sửa ảnh gốc / `results.*` tay; `onServer` làm yếu (D-63)
  - tắt throttle production
  - thêm index trùng / cờ planner
  - chạy gate chồng nhau khi đo A22
  - đụng DB native / Redis 6379; tắt HOLD
  - ghép kết quả hai SHA
  - `any`, `@ts-ignore`, `console.*`; tự merge PR
- REUSE:
  - mẫu autocommit `bot-bulk-lines-v42.int.spec.ts:78-104`
  - `stabilize.ts`, `scroll-position.ts`, `Scenario.beforeCapture`
  - wrapper chạy `test-results/*.cjs` (không commit)
  - `migrate-test.mjs` (mẫu nạp env)
- SKIP:
  - nhóm B khác ngoài B12 (D-137)
  - parity dòng > 3% do dữ liệu / D-xx (đã có nguyên nhân, không ép về 3%)
  - B1 / B2 (816 / 815)

## Câu hỏi chờ owner chốt (builder dùng mặc định nếu chưa có trả lời, ghi `questions.md` › TIP-V46-814)

- **Q-V46-814-1 Prototype không còn đường nào để chụp P-05 / P-100 → 102.**
  - **Mặc định:** giữ miễn cho các ảnh đó, ghi lý do kèm trace.
  - Không sửa prototype, không chèn trạng thái.
  - Hành vi vẫn được kiểm bằng e2e hiện có.
- **Q-V46-814-2 DB trắng cho A21.**
  - **Mặc định:** tạo `opchub_v46_814_chain_test` trên Postgres riêng đang dùng cho 801 → 813, xóa ngay sau khi chạy.
  - Builder hỏi owner trước khi tạo.
- **Q-V46-814-3 Nhãn mail GĐ Vùng (BR-464).**
  - **Mặc định:**
    - tách thành 2 loại "Bổ nhiệm GĐ Vùng" / "Thu hồi GĐ Vùng" đúng đặc tả;
    - thư cũ giữ nhãn "GĐ Vùng".
  - Phương án khác: giữ một nhãn và ghi lệch đặc tả.
- **Q-V46-814-4 Chạy A22 vào lúc nào.**
  - **Mặc định:** chạy một lần duy nhất sau khi mọi mục đã commit, khoảng 4–5 giờ.
  - Nếu lỗi, sửa rồi chạy lại từ đầu.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-814-test-stability`; chỉ sửa file trong **Files touched** (lộ thêm thì ghi lý do).
- [ ] Hỏi owner: DB int / native / `_chain_test`, cổng, trước khi chạy. Không tắt HOLD; đo xong `seed:demo`.
- [ ] Mỗi mục A13 → A20 có: log tái hiện → nguyên nhân → sửa → số lần PASS sau sửa (ghi số thật).
- [ ] A21 chép output script; A22 bảng `TIP-V46-814-gates.md` một SHA.
- [ ] Mỗi AC ghi PASS / FAIL thật. Chép tóm tắt output: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`, `pnpm e2e`, e2e server, parity MSW / native.
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **testing / D-63 / D-134:** không retry / skip / tăng timeout / mask / nới; native và MSW cùng assertion
  - **Luật 5:** A17 không Seq Scan bảng lớn, không index trùng
  - **Luật 13:** test ở file riêng (A17 tách file nếu > 450 dòng)
  - **Migration:** B12 có `down.sql`; A21 chứng minh mọi `down.sql` v46
- [ ] File ≤ trần; không `any` / `@ts-ignore` / `console.*`.
- [ ] Ghi Q-V46-814-1 → 4 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #14, `V4.6-DEBT.md`, `V4.6-causes.md`, `V4.6-acceptance-cases.md`.
- [ ] Commit theo mục, `git commit -- <paths>` (cấm `git add -A`). `git status --short` sạch; push; PR `base: dev`; không tự merge. Completion có **git commit SHA**, PR, số thật, mục PARTIAL (nếu có).
- [ ] KHÔNG báo DONE nếu A22 chưa có lượt xanh cùng SHA hoặc còn mục chưa có bằng chứng.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched theo từng mục, mức file; nêu rõ 3 chỗ đổi code production
- [x] Context: bảng hiện trạng / nguyên nhân nghi ngờ từng mục có đường dẫn + dòng; DB / HOLD; thời lượng gate
- [x] SPEC 1 → 19: nguyên tắc tái hiện → sửa → chứng minh; validation; bảng lỗi
- [x] AC Given / When / Then có số lần lặp và tên test
- [x] Constraints DO NOT / REUSE / SKIP; trích testing, D-63, D-134, luật 5 / 13
- [x] Parallel: sequential sau 813, trước 815 / 816
- ⚠️ Gap:
  - A13 / A18 là flake theo tải. Nguyên nhân mới là giả thuyết, có thể không tái hiện được; mục đó sẽ ghi PARTIAL có log.
  - B12 phát hiện mới: nhãn mail GĐ Vùng thiếu so đặc tả, 812 ghi PASS chưa đúng phần này. Cần owner xác nhận Q-V46-814-3.
  - A22 tốn khoảng 4–5 giờ máy chạy.
