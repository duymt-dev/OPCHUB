# V46-801 — discovery/onboarding and Portal browser (PARTIAL)

Source: `3135676a`, 30/10/2026. Production code unchanged from `9a9ad3ea`.

Root precommit lint/typecheck/unit/depcheck all exit 0: lint/typecheck 8/8 tasks,
unit 6/6, **2083 passed + 2 existing S3 skips** (shared 666, server 248, Admin
592, Portal 418, UI 56, integrations 103). Server unit ran fresh, 7.305s root;
unchanged package results reused. E2E/server typechecks ran fresh (21.925s root).
Depcheck: 2276 frontend/shared/E2E and 1008 server modules, no violations.
Existing nine img warnings retained. Integration's five cases are separate from
the unit count; do not add them to 2083 or claim full integration passed.

## New native integration evidence

`pnpm --filter @opchub/server exec vitest run --project int
test/affiliate/regional-director-access.int.spec.ts`: **5/5 passed**, 7.17s,
real native Postgres test / Redis db 2; no mocked Prisma or external providers.

- HTTP appointment/revocation of an owner with the unchanged **2000-01-01**
  membership deadline. The project raw SQL feed/count and Prisma detail/related
  still include the owner at **2100-01-01** while appointed. Revocation removes
  discovery visibility; the retained-owner data exception remains. Viewer HTTP
  detail is 200 during appointment, 404 after. An originally expired JWT gets
  402 → 200 → 402 through the persisted fee-event handler, without logging in
  again between the appointment and revocation.
- Published business-store fixture: actual Prisma discovery/count, global
  facets, detail and favorite eligibility all honor indefinite exemption and
  return to their prior visibility/count after revocation. HTTP detail also
  changes 200 → 404. Store publishing is an isolated fixture here, not claimed
  as a new publishing-flow test.
- Personal **and** business onboarding SQL snapshots: paid false → true → false;
  seven locked steps → zero locked → seven locked. Only the pay step is newly
  done, no other fabricated progress or fundraising entitlement. Revocation
  retains old paidAt/deadline, clears director snapshot, returns pending_payment,
  creates no new fee period or trial.
- Existing paid-period row remains exactly equal (all returned fields, not just
  count) during and after appointment. Fee amount, plan, paidAt and old term are
  preserved; revocation does not rewrite original financial history.

The first four-case attempt had three fixture/assertion errors: a JWT minted
before manually expiring the fixture still truthfully carried its old active
claim after cache removal; and `trialStartedAt` does not exist on MembershipFee.
Corrected setup mints the expired JWT **before** the tested appointment, retaining
it for both transitions. The nonexistent-field assertion was replaced by exact
real status/term/snapshot/period invariants. No production guard/schema changes,
relaxed assertion, retry or timeout increase. Four cases then passed; adding
the fifth historical-period case and rerunning the complete file passed 5/5.

The test restores the original north-slot fixture and removes its own projects,
stores, members, administrator and history records in the test database. It
does not change native dev data or HOLD binaries.

## New Portal browser evidence

`regional-director-portal.spec.ts`, unchanged assertions in both targets:

- MSW: **1/1**, 8.5s total / 4.6s test.
- Native (`e2e:server --project=behavior regional-director-portal.spec.ts`):
  **1/1**, 13.8s total / 6.2s test.
- Login as the seeded Bảo director; no mandatory pricing overlay. Sidebar shows
  exemption/during-tenure copy, no countdown or membership payment/renewal.
  Pricing remains accessible with both membership cards and the disabled
  exemption control. Fundraising's paid 15,000,000 VND/project registration
  remains enabled, not free. Billing still exposes its history section and
  exemption. A direct `/membership/pay` load ends at `/services`, with pricing
  visible and no transfer-confirmation control.
- This browser test proves the rendered history section remains accessible;
  exact historic financial-row preservation is the native integration above.

The runners use the already verified MSW/native frontend builds: no production
source changed since those builds. Native HOLD API remains `4ba6fe16`, so the
browser result is not SQL-version proof for `462c267c`; new integration loads
current source and the earlier 31-case SQL evidence is retained. No rebuild or
restart of held API/socket/worker. After native browser run, `seed:demo` and
`flush:dev-cache` exit 0 (1150ms, 18 keys). PIDs 28484/33408/16200 still live.
No `.env`, secret, baseline, migration or provider configuration edits.

## Remaining gates

This closes the specifically missing native discovery/onboarding checks and
adds Portal exemption browser coverage, not full TIP acceptance. P6/P9/P17
parity evidence remains valid: production UI/fixtures unchanged. P16 and Portal
parity, related D-84 failure / obsolete D-85 journey (Q-V46-801-10), any remaining
behavior cases, final full integration/build/MSW E2E regression and completion/
PR-or-compare remain open. No #802 implementation, no TIP-DONE claim.
