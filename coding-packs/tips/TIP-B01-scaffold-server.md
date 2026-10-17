# TIP-B01: `apps/server` NestJS 11 — một app, ba entrypoint

## HEADER
- TIP-ID: TIP-B01
- Project: OPCHUB
- Module: server (khung)
- Priority: P0
- Depends on: none
- Estimated: M (6h)
- **Files touched:**
  - `apps/server/package.json` (create)
  - `apps/server/tsconfig.json` (create), `apps/server/tsdown.config.ts` (create), `apps/server/vitest.config.ts` (create)
  - `apps/server/eslint.config.js` (create), `apps/server/.env.example` (create)
  - `apps/server/src/main-api.ts`, `src/main-socket.ts`, `src/main-worker.ts` (create)
  - `apps/server/src/api/api-app.module.ts`, `src/api/health.controller.ts` (create)
  - `apps/server/src/socket/socket-app.module.ts` (create)
  - `apps/server/src/worker/worker-app.module.ts` (create)
  - `apps/server/src/common/config/env.schema.ts`, `src/common/config/env.ts`, `src/common/config/config.module.ts` (create)
  - `apps/server/src/common/config/env.schema.spec.ts` (create)
  - `pnpm-workspace.yaml` (modify — thêm catalog server), `turbo.json` (modify — env `NODE_ENV`, task `test:int`)
  - `tsconfig.depcruise.json` (modify — alias `@/*` của server), `.dependency-cruiser.cjs` (modify — rule `server-module-public-api`)
- **Parallel-safe with:** none — sequential, mọi TIP B1 phụ thuộc. Shares `pnpm-workspace.yaml` with TIP-B02, TIP-B04, TIP-B06 (sequential).

## CONTEXT
- Working dir: `D:\CODING\OPCHUB\CODING`
- Tech stack: `standards/global/tooling.md` — NestJS **11.x** (12 chưa được `nestjs-zod` hỗ trợ), Node 24, TS 6.0, ESM.
- Build: `tsdown` (rolldown, hỗ trợ `emitDecoratorMetadata` — đã chạy thử Nest DI OK). Test: Vitest 5 (đã chạy thử DI OK).
- Key files: `coding-packs/BUILDER-HANDOFF.md` (Workspace Structure), `standards/backend/nestjs-modules.md`, `packages/config/eslint/base.js`.
- Pattern: package khác (`packages/shared/package.json`, `eslint.config.js`) — dùng `catalog:` cho version.

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) — 3 entrypoint, `common/config`, graceful shutdown
- [global/code-structure](../standards/global/code-structure.md) — max-lines 600, alias `@/`, không default export
- [global/tooling](../standards/global/tooling.md) — version chốt, ESLint rule
- [global/git-workflow](../standards/global/git-workflow.md) — `.env.example`, env zod

## TASK
Tạo `apps/server` (`@opchub/server`): một NestJS app ESM với 3 entrypoint `main-api.ts` (REST `/v1`, cổng `API_PORT`),
`main-socket.ts` (HTTP server rỗng cho Socket.IO, cổng `SOCKET_PORT`, gateway thêm ở B22), `main-worker.ts`
(`createApplicationContext`, chưa có processor). Env đọc **một chỗ** qua zod (`common/config`), thiếu biến thì dừng ngay.

## SPECIFICATIONS
### Business Rules
1. `package.json` scripts: `dev` (tsdown watch + chạy lại 3 process, hoặc `dev:api|dev:socket|dev:worker`), `build` (tsdown 3 entry → `dist/`),
   `start:api|start:socket|start:worker` (`node --enable-source-maps dist/main-*.mjs`), `typecheck` (`tsc --noEmit`),
   `lint` (`eslint src test`), `test` (vitest unit `src/**/*.spec.ts`), `test:int` (vitest `test/**/*.int.spec.ts`).
2. Catalog thêm (ghim version, ghi lý do trong commit body): `@nestjs/common|core|platform-express|testing|websockets|platform-socket.io` 11.2.7,
   `@nestjs/config` 4.0.4, `reflect-metadata`, `rxjs`, `tsdown` 0.23.1.
3. `tsconfig.json` extends `@opchub/config/tsconfig/base.json` + `experimentalDecorators`, `emitDecoratorMetadata`, `paths: {"@/*": ["./src/*"]}`, `lib: ES2023`.
4. `env.schema.ts`: zod object `NODE_ENV (development|test|production)`, `API_PORT`, `SOCKET_PORT`, `CORS_ORIGINS` (csv → string[]),
   `LOG_LEVEL`, `DATABASE_URL`, `REDIS_URL`, `REDIS_DB` (int), các biến khác do TIP sau **thêm vào cùng schema** (chỉ thêm dòng).
   `env.ts` là file **duy nhất** đọc `process.env` (eslint-disable có lý do một dòng).
5. `ConfigModule` global cung cấp token `ENV` (giá trị đã parse, `Readonly`).
6. `main-api.ts`: `setGlobalPrefix('v1')`, `enableShutdownHooks()`, `GET /v1/health` → `{ ok: true }` (`@Public` thêm ở B07; tạm controller trần).
7. `.env.example` liệt kê đủ tên biến, giá trị rỗng/placeholder, không secret. `apps/server/.env` (gitignored) tạo từ `D:\opchub-local\db.env`.
8. dependency-cruiser thêm rule: `apps/server/src/modules/A/**` chỉ import `modules/B/index.ts`.

### Validation
- Env sai/thiếu → in lỗi zod (tên biến, không in giá trị) qua stderr của Nest logger rồi `process.exit(1)`.

### Error Handling
- Lỗi bootstrap → log + exit code 1 (systemd restart).

## ACCEPTANCE CRITERIA
- Given env hợp lệ When `pnpm --filter @opchub/server build` Then sinh `dist/main-api.mjs`, `dist/main-socket.mjs`, `dist/main-worker.mjs`.
- Given server api chạy When `GET /v1/health` Then 200 `{ "ok": true }`.
- Given thiếu `DATABASE_URL` When parse env Then ném lỗi nêu tên `DATABASE_URL` (unit test `env.schema.spec.ts`).
- Given `CORS_ORIGINS="a,b"` When parse Then `['a','b']`.
- Given 3 process When `pnpm --filter @opchub/server dev` Then cả 3 khởi động không lỗi.

## CONSTRAINTS
- DO NOT: dùng `process.env` ngoài `env.ts`; default export; NestJS 12; webpack/nest-cli build.
- REUSE: `@opchub/config` eslint `base(600)` + tsconfig base.
- SKIP: logger pino, Prisma, Redis (B04/B02), guard (B07).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng *Files touched*; không file ngoài scope
- [ ] Từng AC có bằng chứng (lệnh + output thật)
- [ ] `pnpm --filter @opchub/server lint typecheck test build` xanh — dán tóm tắt output
- [ ] Rule HANDOFF 7: file ≤ 600 dòng, không `any`, không `console.*`, env chỉ qua zod + `.env.example`
- [ ] Rule HANDOFF 2: không import chéo app; `pnpm depcheck` xanh
- [ ] Commit `git commit -- <paths>`, `git status --short` sạch, báo kèm SHA
