# P4 Affiliate transition audit — IN-PROGRESS

This is an audit/test checkpoint, **not** TIP-404 or P4 completion. The user
requires finishing Affiliate/P4 and then stopping; P5 is not implemented here.

## Committed changes

- **`1477383`**: separate `test/audit/c4-affiliate/` checker/catalogue with a
  facade from the existing registry. Six legal edges are compared exactly with
  the actual Affiliate/referral/commission transition matrices. Two additional
  checks cover automatic creation and recorded-only rate updates.
- Each of the eight checks requires implementation anchors, every declared HTTP
  route or actual outbox worker registration, and positive plus blocked native
  test anchors. Nine auditor units reject absent sources, missing routes/worker,
  empty declarations, unstable global regex matching and incomplete graph coverage.
  Static source matching is not proof of executing the runtime path.
- Two new native terminal-referral tests use real fee confirmation/service/outbox
  payloads: a void referral cannot convert on replay after owner renewal, and a
  converted referral cannot void or alter its commission after owner expiry.
  They exercise handlers directly, not a persistent worker/browser process.
- **`a88b561`**: document twelve existing env keys across six examples, preserving
  placeholders and actual runtime defaults. No private env file was modified.
- **`bc03c9f`**: fixture identities now derive from their UUID instead of frozen
  `Date.now()` plus a process-local sequence. The committed terminal-test rerun
  exposed duplicate member codes before domain assertions. Do not delete rows,
  remove uniqueness constraints, unpin the clock or weaken assertions to hide it.
  Two fresh focused processes now pass against the same persistent test DB.

No production Affiliate service/controller, ledger, permission, schema, migration,
dependency or frontend implementation changed in this checkpoint.

## Verification

- Forced `pnpm turbo run lint typecheck test --force`: **22/22 tasks**, **822 units
  passed + 2 existing skips**. Server 130, Admin 321, Portal 163, shared 140,
  UI 43, integrations 25. The nine C4 units are included, not extra tests.
- Depcheck: **1468 modules/4036 dependencies**, server **680/2954**, both pass.
- Focused terminal-referral native tests: **2/2 in each of two fresh processes**
  after the fixture fix. These are repeat executions of two cases, not four
  distinct requirements. The pre-fix **0/2** failure is retained as evidence.
- Full native Affiliate/contract rerun on the fixture-corrected source:
  **57/57 in 24 files**, terminal exit 0, 175.55 seconds. The two terminal-referral
  cases are included in 57; focused repeats do not raise that count to 59 or 61.
- Local destination verified: PostgreSQL **5432/opchub_test**, Redis **2** pinned
  by test setup. No dev reseed/cache flush or persistent app stack was started.

## Static C1–C6 result (pass/findings)

| C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|
| 25/0 | 25/0 | 88/0 | 36/1 | 173/0 | 138/4 |

The audit exits zero even when findings remain. C4's single bot finding is P5,
excluded by user scope, **not fixed**. C6 retains four explicit S4 deferrals:

1. Three production `SENTRY_DSN` placeholders, Q-B65-1: the SDK is not integrated.
   Do not invent an env consumer or silently remove placeholders to green C6.
2. The DB example's `DATABASE_URL` is documented as a runtime/API reference;
   DB CLI uses `DIRECT_URL`, while server PrismaService consumes `DATABASE_URL`.
   The DB-scoped check does not see that cross-package consumer. Preserve this
   warning as deferred, not as proof that DB CLI reads the key.

AUDIT-P4-02 closes only the missing Affiliate audit catalogue; AUDIT-P4-03 remains
partial/deferred. Existing C5 decorator-order correction is unchanged.

## Acceptance still open

- No new browser run or pixel measurement here: last MSW **48/48** on `4949a41`,
  last measured UI group **16/22** on `2a589cb`. Six parity failures remain open;
  do not mask required terms, change real agent counts or waive them automatically.
- Native Portal/Admin browser journeys, CSV/audit-log assertions, complete state
  inventory, AT-AF/AT-RB/AT-LK/UAT/§22.6 reconciliation remain unverified for P4.
- Required post-seed final audit plus audit E2E, final TIP/P4 completion reports
  and merge/push to main remain pending. Embedded native tests cannot substitute
  for these gates. No P5 work and no claim that the overall goal is complete.

Evidence: [`evidence/v2-p4-transition-audit/`](evidence/v2-p4-transition-audit/).
