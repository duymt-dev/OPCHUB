# TIP-B04: `common/` — logger, Prisma, Redis, exception filter, throttler, helmet/CORS

## HEADER
- TIP-ID: TIP-B04
- Project: OPCHUB
- Module: server/common
- Priority: P0
- Depends on: TIP-B01, TIP-B02 (PrismaClient)
- Estimated: M (6h)
- **Files touched:**
  - `apps/server/src/common/logger/logger.module.ts` (create)
  - `apps/server/src/common/prisma/prisma.service.ts`, `prisma.module.ts` (create)
  - `apps/server/src/common/redis/redis.service.ts`, `redis.module.ts` (create)
  - `apps/server/src/common/errors/app-error.ts`, `common/errors/app-error.spec.ts` (create)
  - `apps/server/src/common/filters/http-exception.filter.ts`, `filters/http-exception.filter.spec.ts` (create)
  - `apps/server/src/common/http/zod.ts` (create — `parseBody/parseQuery` + `ZodValidationPipe` dùng `nestjs-zod`)
  - `apps/server/src/common/http/bootstrap-http.ts` (create — helmet, CORS, cookie-parser, prefix)
  - `apps/server/src/common/throttle/throttle.module.ts` (create — `@nestjs/throttler` + Redis storage)
  - `apps/server/src/common/core.module.ts` (create — gom Config+Logger+Prisma+Redis)
  - `apps/server/src/main-api.ts`, `main-socket.ts`, `main-worker.ts`, `api/api-app.module.ts`, `socket/socket-app.module.ts`, `worker/worker-app.module.ts` (modify)
  - `apps/server/src/common/config/env.schema.ts` (modify — thêm dòng)
  - `apps/server/test/setup/test-app.ts`, `test/common/error-envelope.int.spec.ts` (create)
  - `apps/server/package.json`, `pnpm-workspace.yaml` (modify)
- **Parallel-safe with:** TIP-B05. Sequential, shares entrypoint/module files with TIP-B01/B03/B07.

## CONTEXT
- `nestjs-pino` 5 + `pino` 10, `ioredis` 5, `@nestjs/throttler` 6, `helmet` 8, `cookie-parser`, `nestjs-zod` 5.
- Redis local: `127.0.0.1:6379`, dev db 1, test db 2 (`REDIS_DB`). Key prefix `opchub:`.
- Key files: `standards/backend/api-conventions.md` (envelope lỗi), `standards/security/security.md` (rate limit, helmet, CORS),
  `packages/shared/src/errors.ts`, `packages/shared/src/api/index.ts` (`apiErrorSchema`).

## APPLICABLE STANDARDS
- [backend/api-conventions](../standards/backend/api-conventions.md) · [security/security](../standards/security/security.md) · [backend/nestjs-modules](../standards/backend/nestjs-modules.md) · [global/code-structure](../standards/global/code-structure.md)

## TASK
Hạ tầng dùng chung cho cả 3 process: logger pino có `requestId` (nhận `X-Request-Id` hoặc sinh mới, trả lại header), một PrismaClient/
một ioredis mỗi process, `AppError(code, message, fields?)` + filter biến mọi lỗi thành envelope `{error:{code,message,fields?,requestId}}`,
zod pipe trả 400 `VALIDATION_ERROR` có `fields`, throttler lưu Redis, helmet + CORS theo env, cookie-parser cho refresh token.

## SPECIFICATIONS
### Business Rules
1. Map HTTP: `VALIDATION_ERROR 400, UNAUTHORIZED 401, MEMBERSHIP_REQUIRED 402, FORBIDDEN 403, NOT_FOUND 404, CONFLICT 409, OTP_INVALID 422, RATE_LIMITED 429, INTERNAL 500`.
2. Lỗi không phải `AppError`: `HttpException` Nest → code theo status; còn lại → 500 `INTERNAL`, message chung, log error kèm stack.
3. 429 kèm header `Retry-After`.
4. Logger redact: `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.otp`, `*.token`.
5. `RedisService` có `client` (ioredis, `keyPrefix: 'opchub:'`, `db: REDIS_DB`) và `duplicate()` cho pub/sub/BullMQ.
6. `PrismaService` `onModuleDestroy` → `$disconnect`; redis `quit`.
7. Env thêm: `LOG_LEVEL`, `REDIS_URL`, `REDIS_DB`, `CORS_ORIGINS`, `TRUST_PROXY`.
8. `test/setup/test-app.ts`: dựng `ApiAppModule` với env test (`TEST_DATABASE_URL`, `REDIS_DB=2`), helper `request()` qua `fetch` tới cổng ngẫu nhiên.

### Validation
- Mọi body/query/params qua zod schema `@opchub/shared`; lỗi → `fields: [{path, message}]`.

### Error Handling
- Không nuốt lỗi; filter là nơi duy nhất format response lỗi.

## ACCEPTANCE CRITERIA
- Given route ném `AppError('CONFLICT','x')` When gọi Then 409 + body khớp `apiErrorSchema` + `requestId` trùng header `X-Request-Id`.
- Given body sai zod When POST Then 400 `VALIDATION_ERROR`, `fields[0].path` đúng.
- Given lỗi lạ When gọi Then 500 `INTERNAL`, không lộ stack.
- Given vượt giới hạn throttle When gọi Then 429 + `Retry-After`.
- Given log request có header Authorization Then log hiện `[Redacted]`.

## CONSTRAINTS
- DO NOT: `console.*`; nhiều PrismaClient; đọc `process.env`.
- REUSE: `ERROR_CODES`, `apiErrorSchema` từ shared.
- SKIP: auth guard (B07), Sentry (B65).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng *Files touched*; AC có test (unit filter + int envelope)
- [ ] Rule HANDOFF 1: parse/serialize bằng zod shared
- [ ] Rule HANDOFF 7: không `console.*`, log che secret/PII
- [ ] lint/typecheck/test/test:int xanh; commit; SHA
