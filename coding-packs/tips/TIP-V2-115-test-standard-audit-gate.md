# TIP-V2-115: Chuẩn test theo đặc tả (D-63) + gỡ 13 nhánh `onServer` + đưa bộ audit vào lint/typecheck + `pnpm audit:regression`

## HEADER
- TIP-ID: TIP-V2-115 · Project: OPCHUB · Module: testing (standards, e2e, mock MSW, apps/server/test/audit) · Priority: P1 · Depends on: **chạy cuối V2-P1** (sau TIP-V2-101 → 114 — nhiều TIP sửa cùng file e2e/MSW) · Estimated: L (12h)
- **Files touched:**
  - `coding-packs/standards/testing/testing.md` (modify: viết lại theo D-63)
  - `coding-packs/standards/README.md` (modify: 1 dòng mô tả testing nếu đổi) · `AGENTS.md` (KHÔNG sửa — chỉ ghi câu hỏi nếu cần thêm luật 15)
  - **13 nhánh `onServer`** (TEST-GAPS §4): `e2e/behavior/admin-settings.spec.ts:222`, `admin-marketing.spec.ts:53,113`, `admin-fees.spec.ts:69`, `admin-members.spec.ts:53`, `admin-requests.spec.ts:19-20`, `portal-shell.spec.ts:131`, `projects.spec.ts:155`, `chat.spec.ts:168-179`, `profile.spec.ts:65,113`, `membership.spec.ts:98`, `auth-flows.spec.ts:96-98` (modify)
  - MSW cho khớp server: `packages/shared/src/mock-data/domains/{marketing.ts,fees-admin.ts,admin-members.ts,services-admin.ts,ops-community.ts,settings-log.ts}`, `apps/admin/src/mocks/handlers/{members.ts,lists.ts,settings.ts,service-requests.ts,marketing.ts}`, `apps/portal/src/mocks/handlers/{shell.ts,projects.ts,content.ts,community.ts,membership.ts,profile.ts}` (modify — chỉ phần liên quan 13 nhánh) · `packages/shared/src/mock-data/domains/*.spec.ts` liên quan (modify)
  - `packages/db/seed/demo/settings.ts` (modify: dòng nhật ký seed có `created_at` tương lai gần/đặt cố định để luôn trong 500 dòng mới nhất — hoặc lọc theo cách ở BR 4) · `apps/admin/src/features/settings/api.ts` + `apps/server/src/modules/settings/controllers/roles.controller.ts` + `services/audit-log.service.ts` (modify: `GET /admin/audit-logs?q=` lọc — chọn theo BR 4)
  - `e2e/server/api.ts` (modify: thêm `readMail(to)`), `e2e/mail.ts` (create: helper đọc link trong thư) · `apps/server/src/modules/mail/dev-mail.controller.ts` (create: `GET /dev/mail/last?to=` chỉ khi `NODE_ENV !== 'production'` và `MAIL_PROVIDER=fake`) · `apps/server/src/api/api-app.module.ts` (thêm 1 dòng) — **chỉ nếu TIP-V2-105 chưa làm (TD-035)**
  - **Lint audit**: `e2e/audit/{lib.ts,forms.audit.ts,uat-core.audit.ts,uat-interaction.audit.ts,walk-recheck.audit.ts}` (modify: 16 lỗi eslint thực đo — xem Context) · `e2e/env.ts` (modify: thêm `AUDIT_DB_URL`, `AUDIT_PSQL`, `AUDIT_OTP`, `WALK_IDS` vào zod) · `e2e/package.json` (modify `lint`: thêm `audit server`; script `audit`) · `e2e/eslint.config.js` (modify: rule `max-lines-per-function` cho `**/*.audit.ts` giống `*.spec.ts`)
  - `apps/server/test/audit/*.audit.ts` (đã nằm trong `eslint src test` + `tsc` của server — chỉ sửa nếu lint báo lỗi) · `apps/server/package.json` (modify: script `audit` = `tsx test/audit/run-all.audit.ts`, devDependency `tsx: catalog:`)
  - `package.json` gốc (modify: `"audit:regression": "pnpm --filter @opchub/server audit && pnpm --filter @opchub/e2e audit"`) — không thêm vào `lint|typecheck|test` gate CI
  - `apps/server/test/audit/c4-transitions.audit.ts` (modify mỏ neo theo TIP-V2-113 nếu 113 chưa làm)
  - `coding-packs/audit/W1/TEST-GAPS.md` (modify mục 4: đánh dấu đã xử lý từng #) — được phép vì là tài liệu kiểm, không phải file PM
- **Parallel-safe with:** không — `sequential, cuối V2-P1; shares e2e/behavior/*.spec.ts + mock-data with TIP-V2-104…114`.
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes`

## CONTEXT
- D-63: mỗi REQ V2 có test ghi mã REQ/AT trong tên; server có test âm; e2e chạy cả msw + server; **cấm nhánh `onServer` làm yếu assertion**.
- Audit W1: TD-032 (test theo prototype, 43,5% đủ), TD-033 (13 nhánh `onServer` — TEST-GAPS §4), TD-034 (thiếu test âm body size, consumer outbox, tick worker), TD-035 (không có e2e theo link mail). TECH-DEBT "Ghi chú về script audit": `e2e/audit` lỗi eslint, script `lint` e2e không quét `audit/`.
- **Thực đo 18/10/2026** `npx eslint audit` trong `e2e/`: **16 lỗi** (brief ghi 11): 6× `process.env` trực tiếp (`forms.audit.ts:272,407`, `lib.ts:24,28,30`, `walk-recheck.audit.ts:19`), 3× `require-await` (`forms.audit.ts:90,125,166`), 6× `max-lines-per-function` (`forms.audit.ts:250,341`, `uat-core.audit.ts:60,302`, `uat-interaction.audit.ts:194,278`), 1× `no-base-to-string` (`uat-core.audit.ts:423`).
- `e2e/package.json`: `"lint": "eslint parity behavior env.ts urls.ts"` (không có `audit`, `server`); `typecheck` = `tsc -p tsconfig.json` (include `**/*.ts` → đã gồm audit). Server: `lint = eslint src test` (gồm `test/audit`), `run-all.audit.ts` chạy bằng `packages/db/node_modules/.bin/tsx`.
- Fixture `e2e/server/test.ts` reset `seed:demo` mỗi test ở chế độ server.

## APPLICABLE STANDARDS
[testing](../standards/testing/testing.md) · [git-workflow](../standards/global/git-workflow.md) · [tooling](../standards/global/tooling.md) · [code-structure](../standards/global/code-structure.md)

## TASK
Viết lại chuẩn test theo D-63 và áp ngay: gỡ 13 nhánh `onServer` để hai chế độ e2e cùng một assertion (sửa MSW cho khớp server, dựng dữ liệu bằng API thật ở cả hai chế độ). Đưa `e2e/audit` + `e2e/server` vào lint, sửa 16 lỗi, thêm script `pnpm audit:regression` (ngoài gate CI) chạy bộ audit W1.

## SPECIFICATIONS
### 1. `testing.md` — nội dung bắt buộc (TD-032…035)
1. **Truy vết**: mỗi REQ/AT/UAT/BUG có ít nhất 1 test mang mã trong tên (`it('REQ-214 …')`, `test('UAT-21 …')`, `it('BUG-019 …')`); TEST-GAPS §6 là bảng truy vết sống — TIP cập nhật dòng của mình.
2. **Test âm server** (mỗi endpoint ghi mới): thiếu quyền 403, sai trạng thái 409, input sai 400 có `fields`, **body quá cỡ 413** (không 500), id lạ 404. Transition: cả cạnh hợp lệ lẫn bị chặn.
3. **Consumer outbox**: mỗi loại sự kiện trong `packages/shared/src/outbox/events.ts` có test int: ghi outbox trong tx → relay → handler → hiệu ứng (mail/notification/socket); chạy lại cùng sự kiện → không trùng. Job định kỳ (nhắc phí, bot tick, scheduler sự kiện, dọn dữ liệu) có test truyền `now`.
4. **Link trong mail**: mail có link (OTP, đặt lại MK, chào mừng, huỷ nhận, thông báo) → e2e đọc thư từ FakeMail (`GET /dev/mail/last`, chỉ dev/test) rồi mở link tới màn đích.
5. **E2E hai chế độ**: mọi `e2e/behavior/*.spec.ts` chạy msw + server với **cùng assertion**. Được phép rẽ nhánh `onServer` **chỉ để dựng tiền điều kiện** bằng API, và phải có cùng nhánh tương đương cho MSW; cấm bỏ/nới assertion (regex thay số, đổi giá trị kỳ vọng). Hành vi MSW ≠ server → sửa MSW theo server (server là chuẩn), không sửa test.
6. **Bộ audit hồi quy**: `pnpm audit:regression` (ngoài gate) chạy trước khi chốt pha; finding mới phải vào `coding-packs/audit/` hoặc BUGS.
7. Giữ các mục cũ còn đúng (unit cạnh file, int DB thật không mock Prisma, fake provider, không phụ thuộc giờ thật). Sửa vị trí E2E (`e2e/behavior`, `e2e/parity`, `e2e/audit` — không phải `e2e/uat`).

### 2. Gỡ 13 nhánh `onServer` (TEST-GAPS §4) — cách xử lý từng #
| # | Cách |
|---|---|
| 1 admin-settings:222 | Assertion nhật ký dựa trên thao tác **trong chính test** (vừa bật DeepSeek → thấy dòng "bật đăng nhập bằng DeepSeek") thay vì dòng seed; hoặc thêm `?q=` lọc nhật ký. Chọn cách 1 (không đổi API). |
| 2,3 admin-marketing:53,113 | MSW `estimateRecipients` đếm như server (users active theo loại / `member_count` nhóm) bỏ `SCALE 480`; test assert số chính xác từ seed chung (cả hai chế độ). |
| 4 admin-fees:69 | MSW `remindAllFees` loại TK `locked` như server → `2` cả hai. |
| 5 admin-members:53 | MSW sắp xếp theo ngày tham gia mới nhất như server; tên trang 2 giống nhau. |
| 6 admin-requests:19-20 | MSW `staff` = TK quản trị có `n.edit` như server (bỏ `SERVICE_STAFF` cứng); hằng `STAFF`/`MENTION` một giá trị. |
| 7,8 portal-shell:131, projects:155 | MSW chặn `/dashboard/live`, `/me/projects` khi chưa đóng phí (402 `MEMBERSHIP_REQUIRED`) như server; test gọi `payFee` ở **cả hai** chế độ (MSW: handler `simulateTransfer` giả) và vẫn kiểm "Dashboard dựng dưới popup" bằng một test riêng chỉ dùng phần không cần phí. |
| 9,10 chat:168, profile:65 | MSW chặn chủ nhóm tự rời (409, D-43) như server; test chuyển chủ nhóm bằng API Admin ở cả hai chế độ (`setGroupOwner` gọi MSW khi msw). |
| 11 profile:113 | MSW đếm phiên thật (giữ danh sách phiên mock); `extraSessions` chạy cả hai chế độ. |
| 12 membership:98 | Một helper `simulateTransfer` cho cả hai (MSW: gọi handler webhook giả có HMAC giả) thay vì MSW tự hẹn giờ. |
| 13 auth-flows:96 | `closeRegistration()` cho cả hai (MSW: PATCH settings mock) thay cookie giả. |
- Sau khi sửa: `grep -n "onServer" e2e/behavior` chỉ còn import `onServer` trong helper dựng dữ liệu (nếu có), **không** còn trong biểu thức `expect`.

### 3. Lint/typecheck bộ audit
- `e2e/env.ts`: thêm `AUDIT_DB_URL` (optional, regex `/opchub_dev`), `AUDIT_PSQL` (default `psql`), `AUDIT_OTP` (default ''), `WALK_IDS` (default '') vào schema; `audit/*.ts` đọc qua `env`.
- Sửa `require-await` (bỏ `async` thừa), `no-base-to-string` (ép kiểu chuỗi rõ ràng), `max-lines-per-function` (tách hàm, hoặc override cho `**/*.audit.ts` như `*.spec.ts` — chọn override vì là kịch bản Playwright, ghi lý do).
- `e2e/package.json` `lint`: `eslint parity behavior audit server env.ts urls.ts mail.ts`; `typecheck` giữ nguyên (đã gồm). Kết quả: `pnpm lint` gốc (turbo) quét audit → 0 lỗi.
- Script: `@opchub/server` `"audit": "tsx test/audit/run-all.audit.ts"`; `@opchub/e2e` `"audit": "playwright test -c audit/playwright.audit.config.ts"`; gốc `"audit:regression"` gọi cả hai. **Không** thêm vào `turbo.json` task `test`/`lint` gate, không vào lefthook.

## ACCEPTANCE CRITERIA
- `testing.md` có đủ 6 mục BR 1–6, ví dụ tên test có mã (TD-032…035, D-63).
- `grep -nE "onServer \?|if \(!?onServer\)" e2e/behavior` không còn nhánh nào trong/ quanh `expect` (TD-033); `pnpm e2e` và `pnpm --filter @opchub/e2e e2e:server` xanh với cùng số test.
- `cd e2e && npx eslint audit server` → 0 lỗi; `pnpm lint && pnpm typecheck` gốc xanh (TECH-DEBT ghi chú audit).
- `pnpm audit:regression` chạy được trên máy dev có server (in bảng 6 kiểm + chạy Playwright audit), không nằm trong `pnpm test`.
- Có ít nhất 1 e2e đi theo link trong mail (TD-035) — nếu TIP-V2-105 đã thêm thì dẫn chiếu, không làm lại.

## TESTS BẮT BUỘC
- 13 test e2e ở bảng mục 2 giữ tên cũ, thêm tiền tố mã liên quan khi sửa (vd `test('D-63 TD-033 nhật ký hiện thao tác vừa làm', …)`), chạy cả msw + server.
- `packages/shared/src/mock-data/domains/marketing.spec.ts`, `admin-members.spec.ts`: `D-63 MSW ước tính/sắp xếp khớp server`.
- `apps/portal/src/mocks/domain-handlers.spec.ts`: `D-63 MSW chặn /dashboard/live khi chưa đóng phí (402)`, `D-43 MSW chủ nhóm không tự rời (409)`.

## CONSTRAINTS
- DO NOT: nới assertion để test xanh; thêm `onServer` mới; đưa audit vào gate CI/lefthook; sửa file PM (GOAL/handoff), `AGENTS.md`; đổi kết quả `coding-packs/audit/W1/*.md` ngoài TEST-GAPS mục 4.
- REUSE: `e2e/server/api.ts` helper, `e2e/env.ts` zod, `tsx` catalog.
- SKIP: viết test cho mọi REQ V2 còn TRỐNG (mỗi TIP V2 tự làm; TIP-V2-503 tổng kết).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 13 (test file riêng), luật 12 (env qua zod, không `process.env` trực tiếp), luật 1 (file ≤ 600 BE/e2e — `uat-core.audit.ts` 509 dòng: tách nếu thêm).
- [ ] Rebase lên mọi TIP V2-P1 đã merge trước khi sửa e2e/MSW; chạy toàn bộ e2e hai chế độ.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm test:int`; `pnpm e2e` + `e2e:server`; `pnpm audit:regression` (ghi kết quả, không chặn).
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-115-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-115-completion.md`.
