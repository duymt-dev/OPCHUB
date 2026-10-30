# V46-801 — visual/native browser checkpoint (PARTIAL)

Source: `4b798f82`, 30/10/2026. This is not TIP completion.

## Changes

- P9 mobile fee cards retain the 28px action row when every action is forbidden
  for an incumbent director. No collect/remind action is reintroduced; no prior
  fee, payment date or expiry fixture is rewritten to match an image.
- P17 renders the director permission after store permissions, matching the
  prototype. A presentation-only module preserves all permission keys, grants
  and the relative order of other permissions, including reporting.
- P6 has a new full-page, unmasked configuration scenario at 1440/390, using
  the existing `affiliate` demo precondition, just like the other Affiliate
  scenarios. It does not conceal the unresolved differences or implement #802.

## Checks

- Root `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck`: exit 0 before
  source commit. Lint/typecheck 8/8 tasks; unit 6/6 tasks. **2083 passed + 2
  existing S3 skips**: shared 666, server 248, Admin 592, Portal 418, UI 56,
  integrations 103. Nine existing img warnings remain. Admin ran fresh in the
  first gate (121 files, 150.46s); the subsequent scenario-only edit reran E2E
  lint/typecheck and reused unchanged package unit results. No shared change.
- Related component tests: **8/8**, four files, including the new permission
  ordering invariant and existing readonly/fee action checks.
- Admin MSW build and Admin native `.next-server` build exit 0 with these
  presentation changes. Portal native build also passed earlier in this slice;
  Portal source did not change. This is not the final root build gate.
- Canonical native command:
  `pnpm --filter @opchub/e2e e2e:server --project=behavior regional-directors.spec.ts`,
  `FAKE_MAIL_DIR=D:/opchub-local/v46-mailbox`, `SERVER_WORKERS=1`: **1/1 passed**,
  28.2s total, 16.6s test. Same lifecycle/exemption/history/reload/mail-login-link
  assertions as MSW, actual fake-provider mailbox files. The project runner
  starts/stops its own native frontend listeners; no manual launch bypass.
- Native HOLD API/socket/worker were not stopped or rebuilt. API is still the
  previously held `4ba6fe16` binary, so this browser result does **not** prove
  the later SQL implementation in `462c267c`; its 31 native integration cases
  remain the source-level SQL evidence. FE source matches this checkpoint.
- After native browser verification, `seed:demo` and `flush:dev-cache` exit 0
  (1259ms; 14 keys removed), restoring the three demo incumbents. API/socket
  listeners remain PIDs 28484/33408. No `.env`, secret or old migration edit.

## Visual gate, still incomplete

Command: `PARITY_IDS=D-18,D-69,D-V46-GDV-CONFIG`, `PARITY_WORKERS=1`,
`NEXT_DIST_DIR=.next-v46-msw-build`, MSW mode, `pnpm --filter @opchub/e2e parity`.
Pixelmatch threshold 0.1 and maximum 3% unchanged. Full pages, no new masks.

| State | 1440 | 390 | Status |
|---|---|---|---|
| D-18 / P9 fees | 0.271943% | 2.166929% | PASS both |
| D-69 / P17 permissions | 2.750390% | 2.262872% | PASS both |
| D-V46-GDV-CONFIG / P6 | 5.723746% | 9.154529% | FAIL both |

The initial P6 run lacked the Affiliate demo precondition (5.865855% /
10.343397%). Correcting the precondition did not make it pass. Keep the actual
failing result/diffs; do not crop cards, rewrite payment history, remove controls
or modify prototype/baselines. P6 needs further layout work, particularly mobile
header wrapping, statistic stacking, spacing and bank form presentation. Preserve
revoke-first semantics and the valid-bank draft API, despite prototype defects.
The real automatic-affiliate dataset must not be reduced to the prototype's
older 15 rows just to improve pixels.

## Remaining #801 work

P6 corrections; P16 catalogue navigation/parity (prototype route reachability
still needs verification, not an authorized skip); related Portal parity and
discovery/onboarding evidence; remaining behavior coverage; final full
integration/build/MSW E2E regression gates, completion report and PR/compare.
No #802 work started. No TIP-DONE or goal-complete claim.
