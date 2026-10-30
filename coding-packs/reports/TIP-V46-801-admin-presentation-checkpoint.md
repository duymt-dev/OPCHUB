# TIP-V46-801 — P9/P16/P17 presentation checkpoint (PARTIAL)

Source commit: `4ba6fe16` (pushed).

## Scope

- P9: separate `gdv` URL tab maps to `regional_director`; summary counts exemptions
  separately from trial/paid, with the same additive field on native and mock.
  Existing grouped query is reused; no new SQL/list query or migration.
- Purple exemption label follows the observed prototype. Original Admin fee dates
  remain visible; no fee deadline or historical payment amount is rewritten.
- Exempt row actions cannot dispatch collect/renew/remind. Bulk notifications use
  actual server `updated`/`queued` counts, not the number of selected rows.
- P16: readonly EM-GDV1/EM-GDV2 catalogue before the welcome editor in AutoPanel,
  including trigger/subject/enabled labels. It is not an editable campaign template,
  does not send mail, and does not change the native mail renderer.
- P17: existing `affiliate.gdv` permission is rendered in the role matrix. Super
  Admin stays implicitly granted/locked; readonly matrix clicks cannot mutate.

## Verification

- Targeted Admin component/hook suite: **8/8**, four files.
- Shared summary/schema and default demo exemption regression: **2/2**.
- Native HTTP summary/filter integration: **1/1**, Postgres/Redis test environment.
  Initial fixture failed `membership_fees_director_snapshot`; corrected the fixture
  to preserve `directorPreviousValidUntil`, without changing the DB constraint.
  The full focused file then passed. No Prisma mock.
- Root `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck`: exit 0.
  Unit **2082 passed + 2 existing S3 skips**: shared 666, server 248, Admin 591,
  Portal 418, UI 56, integrations 103; 6/6 tasks successful. Admin output:
  `Test Files 120 passed (120)` / `Tests 591 passed (591)`; 207.21s.
  Lint/typecheck 8/8 tasks; 9 existing img warnings, no rule changes.
  Depcheck: 2270 frontend/shared/e2e modules and 1002 server modules, no violations.
- Commands: targeted Admin `vitest run` for four component/hook files; shared
  `vitest run src/mock-data/domains/fees-director-summary.spec.ts`; native
  `pnpm --filter @opchub/server exec vitest run --project int
test/membership-fee/director-fee-summary.int.spec.ts` (1/1, 17.55s).
  The added Admin API URL test passed in the final full root unit rerun.
- Portal directly, bypassing Turbo: typecheck exit 0 and **418/418**, 67 files,
  132.57s. Shared schema changed, so cached Portal output alone was not accepted.

## Not demonstrated by this checkpoint

No browser/parity claim; prototype screenshot observation is not a parity result.
No native outbox-to-fake-provider delivery or mail-link browser proof yet.
No new full integration/build/E2E gate; previous gate output does not prove these
new presentation changes. Final TIP gates, query metrics, completion report and
PR/compare evidence still remain. V46-801 stays PARTIAL; do not start V46-802.

No `.env`, production secret, old migration, external provider, native dev data or
HOLD listener was changed. Temporary prototype observation only; no baseline edit.
