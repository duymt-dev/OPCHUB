# TIP-V42-714 — verification progress (NOT COMPLETE)

Branch:`feature/TIP-V42-714-acceptance`, stacked from713 `6ab3adf0`.
[Compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-713-bot-workflows...feature/TIP-V42-714-acceptance).
No PR or merge claimed. Owner direction is to record questions and continue.

## Baseline and open gates

- Full Playwright parity listing contains546 tests in one scenario file; this
  includes existing unreachable states, not546 guaranteed comparable images.
-713 final declared sweep36 PASS/2 FAIL/2 existing skips. Generated results
  remain5.50/8.08%; native browser NOT RUN after guarded startup policy rejection.
  Its report is explicitly IN-PROGRESS, not treated as passed by starting714.
-711/712 visual questions and earlier v4.2 questions remain open unless an
  explicit later decision/evidence resolves them. Full remeasurement follows.
- Current production MSW builds use isolated `.next-v42-713-msw` directories,
  mock flag `msw`, demo-account panel off; no protected native service is changed.
- Logs:`.git/codex-v42-714/`. Test listing:`parity-list.log`. Exact potential
  diff paths are declared in the TIP's artifact manifest before the run.

## Next verification

Full registry parity, then §27–29/E2E-01–16 evidence mapping and corrections under
exact manifests. Missing native runtime remains NOT RUN, not a fabricated PASS.
No714/M4/full acceptance report is marked complete.

## Full baseline completed (compiled713 source, before714 corrections)

`full-parity.log`: **421 passed,51 failed,74 existing skipped**,546 collected,
26.8m. Of51 failures,42 produced over-threshold images and9 timed out before a
fresh capture. The reporter contains463 fresh rows stamped0b76e98a (421 PASS,
42 FAIL). Its nine older rows are NOT current evidence: P-05 both widths,
P-100/101/102 both widths and P-89@1440. Preserve their old SHAs; do not count
these retained historical images as a passing full run. The74 existing exclusions
still require rationale/behavior evidence under D-95, not automatic acceptance.

The run used unchanged compiled713 MSW frontend outputs, corresponding to source
6ab3adf0 /714 inventory0b76e98a. All714 source edits happened after compilation;
none was rebuilt into the running baseline. Its owned3300/3301 servers exited
normally on completion; protected native processes were not touched.

Confirmed two defects with independent browser assertions on that same baseline:
- E2E-12: Admin saved1,560,000; Portal public endpoint returned1,200,000.
  `pricing-red-browser.log` failed at the exact equality assertion.
- Auth header: Portal and Admin both fail the390 wrap assertion; language starts
  at y30 while support ends at y58 (`auth-red.log`). Measured prototype topbar80px
  versus app36px; support item grouping is the cause, not a masked screen region.

Corrections are in progress, not accepted by this baseline commit. Initial focused
pricing/composition/relay tests15/15 and auth unit1/1 passed; final root forced
unit run1924 +2 existing skips passed with zero cached tasks, lint/typecheck and
depcheck2212/6610 plus server980/4565 passed. Browser-green proof and affected
remeasurements follow after both isolated frontend rebuilds. No current native
browser proof is claimed. Acceptance/spec/E2E maps are explicitly IN-PROGRESS.

## First corrections verified (MSW, not final acceptance)

- Persist validated pricing/version and pricing-only audit through the existing
  cross-origin snapshot. Legacy snapshots remain readable; invalid compositions
  are rejected before mutation; restoring does not duplicate pricing history.
- Split auth support icon/text/link into direct flex items; no new breakpoint,
  hidden control, image mask or threshold change.
- Both isolated frontend builds passed. `corrections-verified.log`: **15/15 passed**
  in50.2s (login8, Admin pricing3, affiliate cross-app1, responsive auth2,
  pricing cross-app1). E2E-12 registers a new trial member after saving1,560,000,
  verifies the exact payment/reference, reloads both apps and checks one actual
  pricing audit operation. Existing fee snapshots are not repriced (§27.2).
- The intermediate fresh-member run exposed test setup/selector mistakes: trial
  action is Gia hạn, membership transfer reference lives in `membershipFee`, and
  audit summary shares its element with the actor. Corrected these selectors and
  types without loosening price, reload, version or audit assertions. Red logs stay
  in `.git/codex-v42-714/` alongside the final green run.
- Final source unit evidence remains1924 passed +2 existing skips (forced,
  zero cached tasks). Final test edits also pass root lint/typecheck in
  `verified-lint.log`/`verified-types.log`; depcheck previously passed on this
  same production source. Auth A-* remeasurement and full MSW regression follow.
- Native browser NOT RUN, full parity gaps and714/M4 acceptance remain open.

## Auth visual remeasurement at1ba4db0b

`auth-parity.log`: **46 tests passed,20 existing skipped**,1.6m. This comprises
**44 measured A-* images PASS** at1440/390 plus2 capture-harness tests, not46
images. All44 current rows carry1ba4db0b; maximum difference0.677%. The18 mobile
auth failures in baseline3bf19a75 are now passing without masking or tolerance
changes. The reporter retired their diff images; baseline failures remain in Git.
Existing20 exclusions are unchanged, not newly waived states. Full-suite visual
and native gates remain open. Next: full MSW behavior regression on these builds.

## Fresh-member acceptance expansion and moderation correction

- `new-member-chat-acceptance.spec.ts` adds the previously missing combined
  E2E-03/04 and E2E-05/FX-01 chains. The first really registers/joins/sends/reloads
  and passes. The second really hides two keyword messages, revokes the session
  and rejects correct-password login; its Admin origin then lacks both reports.
  `new-chat-red.log`:1 PASS/1 FAIL, with no lock cookie or response interception.
- Q-V42-714-5: add separate validated moderation persistence (reports and captured
  sender identities, violations/settings/restorations, statuses/lock reasons and
  deadlines, revocation epochs, pending keyword jobs). Restoration does not
  execute transitions, recreate audit operations or increment epochs. No native
  schema/contract/business rule change; no credentials in the snapshot.
- Five new unit cases cover round-trip/idempotency, invalid-input atomicity,
  exact7-day expiry, restored violations and pending keyword replay. Focused
  moderation/composition24/24 passes. Full forced unit: **1929 PASS +2 existing
  skips**,6 uncached tasks,3m14.832s (`moderation-unit.log`). Root lint/typecheck
  pass; depcheck2216/6635 and server980/4565 pass. Admin and Portal builds pass in
  new isolated `.next-v42-714-msw` directories (generated output locally ignored).
- Rebuilt moderation browser verification remains pending; don't claim it from
  unit/build evidence. The older full MSW341-case run still uses eb008e0f builds,
  does not collect these two new cases, and must finish before switching outputs.
- Fresh full native integration started with forced execution, verified local
  `opchub_test`/Postgres5432 and Redis6379/db2. This is integration, not server-dev
  browser evidence. Logs:`full-native-integration.log`; results pending. No HOLD
  restart, dev-data reset, changed port or native-startup workaround.
