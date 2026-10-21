# GOAL V2-117 — Portal đa ngôn ngữ (toàn văn)

> Câu `/goal` chỉ chứa tóm tắt và trỏ về file này. **File này là bản có hiệu lực.**
> Agent đọc lại nguyên file mỗi lần tiếp tục. Chỉ Chủ nhà sửa file này.

**Mục tiêu:** Portal (`apps/portal`) hiển thị đầy đủ 9 ngôn ngữ `en, zh, id, th, ms, fil, km, lo, my`
(`en-SG`→`en`, `ms-BN`→`ms`) theo TIP-V2-117 / D-65, e2e xanh trên **MSW** và trên **server thật (native)**.

## ĐỌC TRƯỚC

`~/.claude/CLAUDE.md`, `AGENTS.md`, `coding-packs/BUILDER-HANDOFF.md`, `coding-packs/tips/TIP-V2-117-portal-i18n.md`,
`coding-packs/standards/frontend/*`, `coding-packs/standards/global/domain-glossary.md`, D-06 / D-65 trong
`01-REQUIREMENTS-MATRIX.md`, `e2e/server/README.md`.
**Đầu mỗi lần tiếp tục:** đọc `coding-packs/reports/TIP-V2-117-progress.md` (log) để biết bước nào xong, làm tiếp bước kế.

## CÁCH LÀM — VIBECODE

- Làm theo `/vibecode:execute TIP-V2-117` (vai Thợ thi công): đúng `Files touched`, tự test, viết Completion Report.
- Phát sinh việc ngoài TIP mà cần làm để đạt mục tiêu → tạo TIP refine bằng `/vibecode:refine`
  (`tips/TIP-V2-117-refine-<n>-*.md`), ghi vào `02-TASK-GRAPH.md`, rồi execute.
- Kết thúc: `/vibecode:verify` → `coding-packs/reports/verify-V2-117-<ngày>.md`.

## CÁC BƯỚC (tuần tự, mỗi bước một commit)

1. **Khung:** `locales.ts` (`bundleOf`, `intlLocaleOf`), `loadMessages` (lazy, deep-merge lên `vi`), `request.ts`,
   `<html lang>`, test `locales.spec` + `messages.spec` (khoá / biến / ICU / rỗng / quên dịch).
2. **Chuỗi cứng → messages:** tiêu đề trang (`meta.*` + `generateMetadata`), nhãn truyền vào `Pagination`/`BulkBar`/
   `Modal`/`Drawer`, `toLocaleString('vi-VN')` → định dạng theo locale. Grep dấu tiếng Việt trong
   `apps/portal/src/**/*.tsx` (ngoài comment, mock) = 0.
3. **Dịch** — mỗi ngôn ngữ một commit, theo thứ tự `en → id → ms → th → zh → fil → km → lo → my`:
   12 namespace, quy tắc dịch mục 8–12 của TIP, `messages.spec` xanh cho ngôn ngữ đó trước khi commit.
   Bảng thuật ngữ từng ngôn ngữ ghi vào log.
4. **E2E MSW:** build Portal + Admin, chạy toàn bộ `pnpm --filter @opchub/e2e e2e` (behavior). Thêm e2e mới:
   `behavior/i18n.spec.ts` — với mỗi bundle ≠ vi: đặt cookie `NEXT_LOCALE`, mở `/login` + `/dashboard` (đăng nhập demo),
   kiểm `<html lang>`, tiêu đề tab và ≥ 2 chuỗi đặc trưng đã dịch; `en-SG`/`ms-BN` dùng bản gốc; chọn English trên
   màn đăng nhập → đăng nhập → Dashboard tiếng Anh, tải lại vẫn tiếng Anh.
5. **E2E native (server thật):** theo `e2e/server/README.md` — server api + socket + worker trên Postgres 5432 /
   Redis native, Portal/Admin build `.next-server` (`NEXT_PUBLIC_API_MOCKING=off`), chạy
   `pnpm e2e:server --project behavior` (toàn bộ) và riêng `i18n.spec.ts`.
6. **Cổng kiểm:** `pnpm lint`, `typecheck`, `test`, `depcheck`, `build` xanh; đo kích thước JS client trang
   `/dashboard` so với `dev` (≤ +15%); `/vibecode:verify`; PR vào `dev`.

## E2E — QUY TẮC KẾT QUẢ

- Test **mới** (i18n) phải xanh trên cả MSW và native.
- Test **cũ** fail: chạy lại cùng test trên `dev` @ `224d07cf` (worktree tạm, xoá sau khi xong).
  Fail giống `dev` → ghi "lỗi sẵn có" vào log + báo cáo, không chặn. Chỉ fail trên nhánh → **phải sửa**.
  Chập chờn → chạy `--repeat-each=3` trên cả hai, ghi số lần pass/fail.
- Không nới assertion, không `test.skip` để cho xanh.

## LOG — `coding-packs/reports/TIP-V2-117-progress.md`

Sau **mỗi** bước / commit, append một mục (không sửa mục cũ):

```
## <YYYY-MM-DD HH:mm> — Bước <n>: <tên>
- Commit: <sha> — <subject>
- Đã làm: …
- Lệnh đã chạy + kết quả: `<lệnh>` → <x passed / y failed> (dán dòng tổng kết thật)
- Lỗi / quyết định / lệch TIP: …
- Bước kế: …
```

Không ghi "pass" khi chưa chạy. Lệnh dài chạy nền thì ghi khi có kết quả.

## CODING RULE (vi phạm = không qua cổng)

1. FE tối ưu 150–250 dòng, trần 400 (JSON messages không tính); screen chỉ là orchestrator.
2. Không chuỗi giao diện cứng trong component; mọi nhãn ở `messages/<locale>/*.json`.
3. Không đổi tên khoá `vi`; không prefix URL; không thư viện / API dịch lúc runtime.
4. Không sửa `apps/admin`, `apps/server`, mẫu email (D-65). `packages/ui` chỉ thêm prop tuỳ chọn, giữ mặc định.
5. TypeScript strict, không `any`, không `@ts-ignore`; test ở file riêng.
6. Git: commit theo đường dẫn cụ thể, cấm `git add -A`; Conventional Commits, subject viết thường;
   `git status --short` sạch trước khi báo DONE; báo DONE kèm **git commit SHA**.
7. Native: chỉ DB `opchub_dev` / `opchub_test` trên Postgres 5432, Redis 6379; giữ dữ liệu + tiến trình để Chủ nhà kiểm (HOLD).

## DỪNG KHI

- 9 bundle đủ 12 namespace, `messages.spec` xanh; grep chuỗi cứng tiếng Việt ở Portal = 0.
- E2E behavior MSW toàn bộ + `i18n.spec` xanh (trừ lỗi sẵn có trên `dev`, đã ghi log).
- E2E behavior native toàn bộ + `i18n.spec` xanh (cùng điều kiện).
- `lint`, `typecheck`, `test`, `depcheck`, `build` xanh; kích thước JS trong giới hạn.
- Có `reports/TIP-V2-117-completion.md` (bảng thuật ngữ, AC 1–7 PASS/FAIL, ngôn ngữ độ tin cậy thấp km/lo/my),
  `reports/verify-V2-117-*.md`, log đầy đủ; nhánh đã push, PR vào `dev` đã mở; báo DONE kèm SHA cuối.

**KHÔNG HỎI GIỮA CHỪNG.** Mâu thuẫn → ghi mục "Câu hỏi" trong log, chọn phương án an toàn, làm tiếp.
Chỉ dừng hỏi khi: phải sửa Admin/server/email, đổi kiến trúc i18n (prefix URL, thư viện mới), cần secret,
hoặc e2e native không dựng được môi trường (Postgres/Redis không chạy).
