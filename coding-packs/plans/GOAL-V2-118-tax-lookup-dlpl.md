# GOAL V2-118 — Tra cứu MST thật qua DLPL API, có e2e

> Câu `/goal` chỉ là bản tóm tắt và trỏ về file này. **File này mới là bản có hiệu lực.**
> Mỗi lần tiếp tục, agent đọc lại cả file. Chỉ Chủ nhà được sửa file này, agent không sửa giữa chừng.

**Mục tiêu:** Khi đăng ký doanh nghiệp, tra mã số thuế qua DLPL API (dulieuphapluat.vn) làm nguồn chính, chuỗi DLPL → ESGOO → VietQR (D-65). Có đủ unit, integration và e2e trên server thật (stub DLPL), cộng 1 lượt live bằng key thật. PR vào `dev`.

## ĐỌC TRƯỚC

`~/.claude/CLAUDE.md`, `AGENTS.md` (14 luật cứng + **Git flow 21/10/2026**), `coding-packs/BUILDER-HANDOFF.md`,
**`coding-packs/tips/TIP-V2-118-tax-lookup-dlpl.md`** (đặc tả chính),
D-17 + **D-65** trong `coding-packs/01-REQUIREMENTS-MATRIX.md`, `coding-packs/standards/{testing,global}/*`,
`e2e/server/README.md`.
Mỗi lần tiếp tục: đọc `coding-packs/reports/TIP-V2-118-completion.md` (nếu có) và `git log` của nhánh để biết đã tới bước nào.

## LÀM THEO VIBECODE (tuần tự, xong cổng mới sang bước sau)

0. **Chuẩn bị**: `pwd` = `D:\CODING\OPCHUB\Deploy` (hoặc worktree riêng). `git switch dev && git pull --ff-only`, sau đó
   `git switch -c feature/TIP-V2-118-tax-lookup-dlpl`. Không tách từ `main`.
1. **EXECUTE** `/vibecode:execute TIP-V2-118`, theo đúng thứ tự SPECIFICATIONS của TIP:
   - Bước 0: lấy response thật bằng key. Key nằm trong env shell `DLPL_API_KEY` hoặc trong `apps/server/.env` (gitignored).
     Không có key → **BLOCKED** (L3: cần secret thật), báo rồi dừng.
   - Bước 1–4: provider, env (`chain` / `dlpl`), integrations module, env example, checklist.
   - Bước 5: stub DLPL, int test, e2e `tax-lookup-dlpl.spec.ts`.
   - Commit theo từng bước, mỗi bước 1 commit (provider + unit / env + wiring / int / e2e / docs).
2. **VERIFY** (ghi số thật, chép từ output):
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`.
   - `pnpm e2e`: MSW, toàn bộ behavior. Không tụt số test so với `dev`.
   - E2E server: chạy API dev (`opchub_dev`, Redis db 1) với
     `TAX_LOOKUP_PROVIDER=dlpl DLPL_BASE_URL=http://127.0.0.1:4810/v1 DLPL_API_KEY=e2e-stub-key-000000000000`,
     cộng socket + worker. Build Portal/Admin vào `.next-server` theo README, rồi chạy
     `pnpm --filter @opchub/e2e e2e:server --project behavior`. **Toàn bộ phải xanh**, gồm 3 test D-65 mới và 2 test MST cũ.
   - Live: khởi động lại API với `TAX_LOOKUP_PROVIDER=chain` + key thật, chạy
     `E2E_TAX_LIVE=1 pnpm --filter @opchub/e2e e2e:server --project behavior -g @live`.
     Ghi `X-Quota-Remaining` trước và sau. Chỉ tra 1–3 MST, không chạy vòng lặp đốt lượt.
   - `/vibecode:verify`: soát RRI reverse + 4-check cho TIP-V2-118.
3. **REFINE**: verify ra lỗi thì sửa trong phạm vi TIP, chạy lại VERIFY. Lỗi ngoài phạm vi thì ghi báo cáo, không sửa lan.
4. **BÁO CÁO + PR**: viết `coding-packs/reports/TIP-V2-118-completion.md` (SHA, hình dạng `industries` thật, số test từng tầng,
   kết quả e2e server + live, hạn mức còn lại, file lớn nhất bao nhiêu dòng, soát luật 1–14, việc chưa làm).
   Sửa dòng V2-118 trong `02-TASK-GRAPH.md` thành **DONE** + link báo cáo. Push nhánh, mở PR `base: dev`
   (`gh pr create --base dev`). **Không merge PR**, không bật auto-merge, không đụng `main`.

## CODING RULE (vi phạm thì không được báo DONE)

1. File BE ≤ 600 dòng (tối ưu 200–400), FE/e2e ≤ 400. Không viết thêm vào file đã vượt trần.
2. TS strict: không `any`, không `@ts-ignore`, không non-null assertion. Response DLPL và env parse bằng zod.
3. Dịch vụ ngoài chỉ qua adapter `packages/integrations`. Unit/int/e2e CI **không gọi mạng thật** (dùng fetch giả / stub).
4. **Không commit secret**: không giá trị `dlpl_live_…` nào trong repo hay báo cáo (che bằng `dlpl_live_***`). Không log key,
   không để key trong URL hoặc message lỗi. Chạy `git grep -n "dlpl_live_"` trước mỗi commit phải ra rỗng (chỉ chấp nhận chuỗi ví dụ `xxxx`).
5. Lỗi/hết lượt DLPL phải ném ra để chain chuyển nguồn. Không trả `null` (sẽ bị cache "không thấy" 30 ngày).
6. Biến env mới có trong `.env.example` + zod env schema. Không `console.*`, dùng logger.
7. Test ở file riêng, tên test bắt đầu bằng `D-65`. Không sửa assertion của test cũ để cho xanh.
8. Git: `git commit -- <paths>`, cấm `git add -A`. Conventional Commits viết thường. Trước khi báo DONE, `git status --short` sạch.
   Mã báo DONE là git commit SHA.

## QUY TẮC VẬN HÀNH

- Chỉ dùng `opchub_dev` / `opchub_test` (Postgres 5432), Redis 6379 db 1/2, cổng stub 4810. Không đụng DB khác.
- e2e server dùng chung DB nên chạy tuần tự (`SERVER_WORKERS=1`). `globalSetup` tự reset `seed:demo` + flush cache.
- Xong việc thì trả `apps/server/.env` của máy dev về `TAX_LOOKUP_PROVIDER` như lúc đầu, giữ key ở local.

## DỪNG KHI

- PR `feature/TIP-V2-118-tax-lookup-dlpl → dev` đã mở, CI xanh, có link PR.
- Cổng `lint/typecheck/test/test:int/depcheck/build` xanh. `pnpm e2e` (MSW) xanh, không tụt số test.
  `e2e:server --project behavior` xanh toàn bộ. `@live` xanh 1 lần với key thật.
- Có `TIP-V2-118-completion.md` kèm số thật. `git status --short` sạch. `git grep dlpl_live_` không lộ key.
- Báo: `TIP-V2-118-DONE <sha> — PR #<n> — unit <a> / int <b> / e2e msw <c> / e2e server <d> / live <e> passed`.

**KHÔNG HỎI GIỮA CHỪNG.** Mâu thuẫn mới thì ghi `coding-packs/reports/V2-questions.md`, chọn phương án an toàn rồi làm tiếp.
Chỉ dừng khi gặp L3: thiếu/sai key, gói không phải Starter+ (`/v1/me` hoặc 403 `plan_required`), hết lượt tháng,
hoặc phải đổi hợp đồng API phá FE.
