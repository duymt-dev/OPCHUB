# V46-801 — final gate checkpoint (PARTIAL)

Source under test: `4719e2ea` (production `9a9ad3ea`), docs-only HEAD
`498b59c0`. Runner-launch evidence below is historical; see terminal results
and test-only reconciliation at the end. No production/build/fixture change.

## Build coverage — all three apps compiled, HOLD outputs isolated

| Scope | Command | Result |
|---|---|---|
| Server / all three entrypoints | `pnpm --filter @opchub/server build --out-dir dist/verify-v46-4719e2ea` | PASS, 17 files, 2.652s |
| Portal + Admin | `pnpm build --concurrency=1 --filter=@opchub/portal --filter=@opchub/admin` | PASS, 2/2 tasks, 0 cached, 3m11.698s |

Frontend env: `NEXT_DIST_DIR=.next-msw-v46-gate`,
`NEXT_PUBLIC_API_MOCKING=msw`, `NEXT_PUBLIC_PORTAL_URL=http://localhost:3000`.
Both Next builds compiled and ran their TypeScript/static-page steps. The server
uses the unchanged tsdown configuration with only its documented output-dir CLI
option overridden; no backend entrypoint omitted, no fake build/check script.
These are the actual commands, not a claim that unfiltered `pnpm build` ran.

The active E2E build `.next-v46-msw-build` and native `.next-server` were not
overwritten. The server's ordinary `dist/main-api.mjs` retained its 15:27:45
mtime; new output is nested in its separately owned ignored verification
directory. Original lazy chunks and held processes are untouched. Held runtime
remains `4ba6fe16`, not silently upgraded to later SQL. API/socket/worker PIDs
28484/33408/16200 still live. No `.env`, source configuration or DB-dev change.

Logs (local, ignored): `.parity-out/v46-801-server-build.log` and
`.parity-out/v46-801-frontend-build.log` under `e2e/`.

## Full integration — launch checkpoint (now terminal)

`pnpm test:int` at `4719e2ea`; root uses `--concurrency=1`. Unified exec session
**20082**, log `e2e/.parity-out/v46-801-full-int.log`.

- DB **128/128 passed**, 27 files, 57.64s.
- Server suite continues; no whole-suite PASS claimed before terminal output.
- Worker stderr contains `Missing key ... moveToFinished/retryJob` around the
  existing real bot-worker suite. Record and inspect the terminal error summary;
  do not suppress errors, restart the run or infer success from a passing case.
- Only this one native integration runner uses Postgres test/Redis db 2. No
  second integration run or native E2E was started alongside it.

## Full MSW E2E — launch checkpoint (now terminal)

Actual command `pnpm e2e`, two workers, existing current MSW frontend builds.
Unified exec session **31525**, log
`e2e/.parity-out/v46-801-Full-MSW-e2e.log`. **346 tests collected**.

`git diff dev -- e2e/behavior` shows only three added test files (one case each),
no edits/removals of existing behavior tests. Do not skip old cases to retain a
nominal count. Full result is not yet terminal and is not green so far.

Concrete early failures to investigate once the runner exits:

Read-only native API verification on the held business implementation confirms
`GET /admin/users?size=20` returns **10** fixture members m1–m10 (m4 locked),
and `/admin/fees/summary` returns exactly total10 / active5 / trial0 /
regional_director3 / pending0 / expiring0 / expired2 / paid5 / revenue13,200,000.
The access token stayed in process memory and was not logged. Both native and
MSW summary code define the annual summary as current-price annual amounts for
active/expiring members, not historical transaction receipts. This supports
updating stale cohort expectations later, without rewriting paid history or
reintroducing charges for directors. This was a read-only check, not a native
E2E action-flow pass or newer SQL-binary proof.

- `admin-fees.spec.ts:30`: old expected `16.800.000đ` absent; actual current
  snapshot has total 10, paid 5, exempt 3, expiring 0 and annual summary
  `13.200.000đ`. The ordinary-fee status cohort changed with seeded directors.
  Confirm the exact native counterpart and existing summary definition before
  changing expected values; do not fabricate revenue or prior paid history.
- `admin-fees.spec.ts:61`: old six-tab / eight-member expectations exclude the
  required GDV tab and two newly included members. Other fee actions also fail;
  inspect each terminal trace, not just replace every number mechanically.
- `admin-members.spec.ts` several cases fail inside common setup waiting for
  literal `· 8 tài khoản`, before reaching their actual actions. Validate the
  native/demo ten-account precondition and preserve action assertions.

No test edits, retries, timeout increases or assertion relaxation were made
during this run. Full-MSW failures must be resolved and affected regression
scope rerun under the established cadence. Existing Portal/P16 visual findings
remain open; this checkpoint does not close #801 or authorize #802.

## Read-only regression diagnosis while runners remain active

The prior continuation was a verified wait, not a terminal gate. Both original
session handles were polled again and remained live; original bot lifecycle and
script-rotation E2E cases subsequently passed in 10.3m and 2.3m respectively.
Their pre-existing long deadlines were not increased. Do not restart a quiet
runner merely because no output arrives during an observation window.

Additional native fixture preconditions were checked through the held API with
an in-memory token only (no action/export/send/reset calls):

- `GET /admin/campaigns/estimate?audience=all` gives **11**, not the previous 9;
  `audience=personal` remains **5**. `audience=groups&groupIds=c1,c3` remains
  **1902**, consistent with 1248 + 654. Only the all-account cohort grew; group
  and personal campaign assertions must remain exact and unchanged.
- `GET /admin/groups/members?groupIds=c1,c3` gives **9 rows**, including the
  new director m10 in c1, not the old eight-row export precondition. These are
  group-membership rows, not nine unique people; m7 occurs in both groups.
- The fee reminder failure context actually shows **1** queued for the all
  action. Both `needReminder()` and its MSW counterpart exclude locked m4 and
  the three directors, leaving expired m6. Explicit selection of m4 + m6 is a
  different action and must keep its existing two-target assertion; do not
  mechanically replace every reminder count with one.
- `affiliate-ui-debt-agents` currently stops on the old exact 64-affiliate tab
  before exercising its overflow/clipping assertions. Preserve those geometry,
  row-count and action assertions when reconciling the required two new members.

These reads diagnose seed-related failures; they do not prove native action
flows, full regression success or visual acceptance. Source/tests and active
builds remain unchanged until the original full runs reach a terminal result.

## Terminal full-run results and affected-test reconciliation

- Original integration **20082 terminated exit1**: DB **128/128**, server
  **1764 passed / 2 failed**, **190 files**, 2190.19s; root 37m31.391s. Both
  failures are exact total-equals-sum assertions in `admin-fees.int` and
  `admin-fees-v42.int` that omit the new `regional_director` status (difference
  exactly3). BullMQ stderr is retained; terminal summary lists those two
  assertion failures and no separate unhandled-error section. No restart.
- Original full MSW **31525 terminated exit1**: **322 passed / 20 failed /
  4 skipped**, 346 collected, 25.5m. Do not rewrite this result as green.
  Nineteen failures belong to the six seed-affected files diagnosed above;
  the remaining Portal shell failure expects no flag image despite existing
  dev commit `6d500837` deliberately changing topbar to the selected flag and
  its unit test. No production LanguageMenu change was made by this TIP.
- After full MSW termination, only those six E2E files were reconciled to
  verified native preconditions. All prior action, CSV, filters, geometry and
  no-extra-account assertions remain; pagination additionally checks m9/m10.
  Exact selected reminder count2 is retained while all-reminder count becomes1.
  Both integration assertion sites now include exemption in the exhaustive
  status sum; v4.2 additionally requires exemption unchanged by ordinary fees.
- Affected MSW suite: **38/38 passed**, 1.2m, same six files, two workers,
  `.next-v46-msw-build`; log `v46-801-seed-regression-msw.log`. This is a scoped
  rerun, not a replacement full-E2E PASS claim. The E2E-only edits during the
  final part of native integration do not touch/import any integration source;
  the two integration test edits were made only after session20082 terminated.
- Related native integration rerun: **12/12**, three complete files including
  `director-fee-summary.int`, 16.82s, Postgres test/Redis2. Log
  `v46-801-summary-regression-int.log`. Other188 server files and DB128 retain
  original full-run evidence because production/shared/fixtures are unchanged;
  no claim of a new unfiltered all-green `pnpm test:int` command.
- Same six browser files now running native, **38 collected**, one worker,
  session **28826**, log `v46-801-seed-regression-native.log`. It uses ordinary
  per-case demo reset on dev/Redis1 and existing `.next-server` builds, no
  mode-specific assertion change. Do not run another dev-mutating browser suite
  or restore demo while this runner is live; seed/restore after it terminates.

Open gates: native rerun terminal result, Portal shell test/accepted-dev mismatch,
full regression reconciliation, Portal/P16/related Affiliate parity. No #801
completion, no #802 start; no weakened acceptance criteria.

Precommit after all eight test-file edits: root lint/typecheck **8/8** each,
unit **6/6** tasks, **2083 passed + 2 existing S3 skips** (shared666, server248,
Admin592, Portal418, UI56, integrations103), depcheck **2278 + 1008** modules
without violations; command chain exit0. Server checks reran after its integration
test edits, five unaffected unit tasks reused cache. Existing nine img warnings
remain. Log `v46-801-regression-final-precommit.log`. Production/shared/fixtures
and builds have not changed, so no build rerun is needed for these test-only edits.

## Native rerun terminal result (`50fd0067`)

Session **28826 terminated exit1**, **37 passed / 1 failed**,38 collected,3.7m.
All seed-count corrections (including fee reminders, row selection, CSV/group
export, campaign audience, member filters/pagination and affiliate geometry)
passed with the unchanged MSW/native assertions. The remaining unchanged
`UAT-10 BUG-014` bank-unmatched case stops before manual matching: for content
`CHUYEN KHOAN SAI NOI DUNG`, native says exactly `Nội dung không bắt đầu bằng
OPCHUB`, while existing MSW transaction fixture and test expect `Không tìm thấy
Mã TV trong nội dung`. These are distinct parser failures, not translation or
count differences. Native prefix validation is consistent with D-104/D-123;
do not broaden to either message, bypass the assertion by mode, or change native
validation. Q-V46-801-14 records the next focused MSW-fixture reconciliation.
Do not claim all38 native tests passed or that the complete manual-match flow
was reached by this failing case.

After the runner terminated, required `seed` then `seed:demo` and
`flush:dev-cache` all exited0. Read-only native verification: health200,
fee summary total10/active5/directors3/expired2/revenue13.2m, consistent with the
restored fixture. Held API/socket/worker PIDs28484/33408/16200 remain live;
no service restart, `.env` change or held binary overwrite. No verification
runner remains live at this checkpoint. Source/test changes are committed and
pushed as `50fd0067`; this follow-up records results only.
