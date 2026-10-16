# Tooling & versions

## Phiên bản chốt (kiểm trên npm ngày 2026-10-16)

Dùng bản stable, ghim bằng `pnpm` catalog ở `pnpm-workspace.yaml`. Nâng **major** phải có ADR. Nâng minor/patch qua Renovate, mỗi lần một nhóm.

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 24.x LTS | `.nvmrc`, `engines` trong `package.json` gốc |
| pnpm | 12.x | `packageManager` field |
| Turborepo | 2.x | |
| TypeScript | **6.0.x** | 7.0 đã ra nhưng `typescript-eslint` mới hỗ trợ `< 6.1` |
| Next.js | 16.x | App Router |
| React | 19.x | |
| Ant Design | **6.x** + `@ant-design/nextjs-registry` + `@ant-design/icons` | **Không dùng** `@ant-design/pro-components` (chỉ hỗ trợ antd ≤ 5) |
| @ant-design/charts | 2.x | |
| TanStack Query | 5.x | |
| next-intl | 4.x | |
| zod | 4.x | |
| NestJS | **11.x** | 12 đã ra nhưng `nestjs-zod` chưa hỗ trợ; nâng khi hệ sinh thái theo kịp |
| nestjs-zod | 5.x | |
| Prisma | **7.x** | 8 đang RC |
| Socket.IO | 4.x | |
| BullMQ | 6.x | |
| Tiptap | 3.x | |
| PostgreSQL / Redis | 16 / 7 | cài native |
| Vitest / Playwright | 5.x / 1.x | |

## Công cụ ép rule (bắt buộc, cấu hình ở `packages/config`)

| Công cụ | Ép cái gì |
|---|---|
| ESLint 10 flat config + `typescript-eslint` | `max-lines` (BE 600, FE 400, bỏ qua dòng trống/comment), `max-lines-per-function` 80, `no-console`, `@typescript-eslint/no-explicit-any`, `no-non-null-assertion`, `consistent-type-imports`, `no-floating-promises` |
| `eslint-plugin-react-hooks`, `@next/eslint-plugin-next`, `jsx-a11y` | Hook rules, rule Next, accessibility |
| `no-restricted-syntax` / `no-restricted-imports` | Cấm `dangerouslySetInnerHTML` (trừ `SafeHtml`), cấm `$queryRawUnsafe`, cấm import `antd/es/*`, cấm `process.env` ngoài file env schema |
| `eslint-plugin-boundaries` + `dependency-cruiser` (`pnpm depcheck`) | App không import app; `modules/A` chỉ import `modules/B/index.ts` (public API); feature FE không import nội bộ feature khác; `packages/*` không import `apps/*`; không vòng phụ thuộc |
| Prettier | Format; không tranh luận style trong review |
| lefthook | pre-commit: lint-staged (eslint --fix, prettier); commit-msg: commitlint |
| commitlint | Conventional Commits |
| Turborepo | Cache `lint`, `typecheck`, `test`, `build` |

Rule nào không ép được bằng công cụ thì reviewer kiểm theo checklist trong Completion Report.

## CI (GitLab hoặc GitHub Actions — chọn khi dựng repo)

Mỗi merge request chạy theo thứ tự, fail bước nào thì chặn merge:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint` · `pnpm typecheck` · `pnpm depcheck`
3. `pnpm test` (unit + integration với Postgres/Redis service)
4. `pnpm build`
5. `pnpm audit --audit-level high`
6. Playwright smoke (UAT chính) trên `main`

## ADR

- Thư mục `docs/adr/`, file `NNNN-tieu-de.md` (Context · Decision · Consequences · Status).
- Viết ADR khi: đổi stack, nâng major, thêm hạ tầng, đổi ranh giới module, chọn nhà cung cấp ngoài.
- ADR khởi tạo: 0001 monorepo + `apps/server` 3 entrypoint, 0002 Prisma, 0003 auth tự viết, 0004 native VPS, 0005 outbox, 0006 Ant Design 6 không dùng pro-components.
