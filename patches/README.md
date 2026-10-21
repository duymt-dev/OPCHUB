# Workspace dependency patches

## msw@3.0.3

TIP-V2-535 / P5-MSW-LIFECYCLE-01: one-way service-worker lifecycle
notifications must not keep message-event `waitUntil` promises pending while
waiting for a MessagePort reply that the browser client does not send.
The patch changes only four notification sends in the source and distributed
worker template; the request/reply helper and package version are unchanged.

Install reproducibly with `pnpm install --frozen-lockfile`. Generate public
assets through the installed patched CLI, not by editing generated workers:

```
pnpm --filter @opchub/admin exec msw init public --no-save
pnpm --filter @opchub/portal exec msw init public --no-save
pnpm --filter @opchub/shared exec vitest run src/mock-data/tests/worker-lifetime.spec.ts
```

Canonical browser regression is `e2e/behavior/bot-auto-lifecycle.spec.ts`,
including both five-minute turn deadlines and live cross-app publication.
Do not consider isolated source tests a substitute for this browser check.
Before an MSW update, re-evaluate upstream behavior and remove this patch only
after both generated-worker notification/RPC controls and browser regressions
pass without it. No new runtime dependency or major-version upgrade is involved.
