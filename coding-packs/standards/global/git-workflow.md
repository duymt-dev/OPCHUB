# Git workflow

## Nhánh

- `main`: luôn build được, test xanh. Không commit thẳng khi đang làm TIP.
- Nhánh task: `feature/TIP-012-membership-reconcile`, sửa lỗi: `fix/TIP-012-...` hoặc `fix/<slug>`.
- Rebase lên `main` mới nhất trước khi merge. Không force push `main`.
- Không dùng `--no-verify`, không bỏ qua hook.

## Commit

Conventional Commits, scope = domain hoặc package:

```
feat(membership): đối soát webhook SePay idempotent
fix(chat): không gửi lại tin trùng clientMsgId
refactor(db): tách index membership sang migration riêng
test(auth): UAT-03 OTP thiếu số
chore(infra): systemd unit cho socket
```

- Một commit một ý. Migration DB nằm trong commit của tính năng cần nó.
- Commit message có thể tiếng Việt. Dòng đầu ≤ 72 ký tự.

## Khi xong việc (bắt buộc)

1. `pnpm lint && pnpm typecheck && pnpm test` pass.
2. `git add` + `git commit` ngay. Cấm để code đã sửa nằm uncommitted.
3. `git status --short` không còn file `M` hoặc `??` thuộc source (`.ts`, `.tsx`, `.sql`, `.prisma`, `.json`, `.toml`).
4. Push nhánh.
5. Báo `TIP-xxx-DONE <sha>`, SHA lấy từ `git rev-parse --short HEAD`. Không dùng hash của file build.

## Biến môi trường

- `.env*` không bao giờ commit; `.env.example` luôn commit và cập nhật mỗi khi thêm biến.
- Mỗi app có zod env schema, thiếu biến thì app dừng ngay lúc khởi động.
