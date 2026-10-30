# V46-802 — demo receipt/epoch baseline

**IN PROGRESS, not TIP-DONE.** Source `b0863055`, pushed on
`feature/TIP-V46-802-revenue-sharing`. No native HOLD replacement.

## Change and evidence

- Existing paid demo periods now have explicit, matched `demo` provider bank
  receipts with their actual historical amount/time and `OPCHUB <member code>`.
  These are local fixtures, not externally verified bank transactions. Epoch
  backfill uses those receipts, never commission creation or renewal start time.
- Include m4's previously omitted historical payment: expired/locked is not
  unpaid. Base periods increase from6 to7; optional AF0 from62 to63. Exact count
  assertions were updated with a separate test proving the date, linked receipt,
  epoch and unchanged expired/locked access. No row was hidden to keep old counts.
- No retrospective director shares or payouts are created. Current October
  appointments do not justify attributing August/September payments to them.
- Optional MSW AF0 setup now synchronizes epochs even when financial state was
  initialized earlier. Replacing a base fixture date does not depend on request
  order. Actual recorded receipt epochs remain protected; incompatible seeding
  after financial activity fails instead of silently rewriting the ledger.
- Demo reset clears share/payout/bank snapshots in FK order, before account
  deletion. A transaction-held outbox table lock prevents capture/claim racing
  the reset; pending revenue work rejects reset without deleting events or
  pretending dispatch. Drain pending work before reseeding. Delivered evidence
  remains untouched. This is a demo operation, not a production reset endpoint.

## Checks

Source `b0863055`:

- Root `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`: PASS,
  exit0 (runner50698). Lint/typecheck8/8; unit6/6,5 cached.
  **2157 passed +2 existing skips**: Admin612, Portal418, shared702,
  server266, UI56, integrations103+2skip. No new skip.
  Dependency checks2339 frontend/shared and1049 server modules, no violations.
  Log: `e2e/.parity-out/v46-802-demo-baseline-precommit.log`.
- Native PostgreSQL: `pnpm --filter @opchub/db exec node
  --env-file-if-exists=.env node_modules/vitest/vitest.mjs run
  test/seed-revenue.int.spec.ts test/seed-demo.int.spec.ts
  test/seed-directors.int.spec.ts test/affiliate-demo.int.spec.ts
  test/affiliate-payout-demo.int.spec.ts`: **24/24**,5 files,21.79s,
  exit0 (runner28290). Includes exact native/MSW epoch equivalence, idempotence,
  FK-order reset, preserved evidence, both pending event types and rollback.
  Log: `e2e/.parity-out/v46-802-demo-baseline-int-final.log`.
- Focused shared demo/affiliate suites: **10/10**, including5 new checks.
  Earlier failures exposed an initialization-order epoch mismatch and the
  omitted historical period; neither was skipped or hidden.
- No runtime endpoint query changed. Prior exact-query plans at `8ff530d7`
  still describe the unchanged read queries, not new seed performance proof.

## Scope and remaining work

Only `opchub_test` was reseeded for integration. `opchub_dev`, held dist and
API28484/socket33408/worker16200 were not modified/restarted. No external bank,
mail, AI or production operation. No migration in this slice.

This completes baseline provenance/reset support, **not** the opt-in sharing
demo or browser acceptance. Still required: common actual-receipt sharing
scenario, outer retained-total integration (prototype uses affiliate-attributed
scope), identical MSW/native browser assertions, parity and full TIP gate.
Q-V46-802-1/2/3 remain documented, not whole-goal blockers. Seed changes affect
bank/history/report displays: verify corresponding browser regression at closure.
801 FAILs remain unchanged.

[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V46-801-regional-directors...feature/TIP-V46-802-revenue-sharing).
