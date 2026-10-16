# ADR-0001: Monorepo + apps/server một app ba entrypoint

- Status: Accepted
- Date: 2026-10-16

## Context
API REST, socket và worker đều cần cùng logic nghiệp vụ (auth, phí, chat, kiểm duyệt). Tách 3 app thì hoặc chép logic, hoặc import chéo app.

## Decision
pnpm + Turborepo monorepo. Backend là một NestJS app `apps/server` với `main-api.ts`, `main-socket.ts`, `main-worker.ts`; module nghiệp vụ ở `src/modules/` dùng chung. Mỗi entrypoint chạy thành systemd unit riêng, scale riêng.

## Consequences
Một nơi cho rule nghiệp vụ. Build một lần, deploy 3 unit. Cần kỷ luật import: gateway/processor chỉ là lớp mỏng.
