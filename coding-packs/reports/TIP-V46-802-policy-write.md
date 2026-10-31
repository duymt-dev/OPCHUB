# V46-802 — configurable sharing policy checkpoint

Source **d7e080c1**, committed/pushed on `feature/TIP-V46-802-revenue-sharing`,
based on420099cd. Not TIP-DONE.

## Implemented — REQ-617 / D-119

- Extended the existing Admin policy GET/PUT with required integer percentages
  yearOneRate, annualDecrease and minimumRate. Reuses the shared0–100 constraints
  and floor<=year-one refinement, without production defaults/coercion.
- Repository SELECT, locked before image and UPDATE now include all three fields.
  Existing affiliate.action authorization and transactional before/after audit
  cover the complete change. Existing legacy policy values remain intact.
- Extracted an accessible three-field section into its own component/CSS module.
  Form errors map to the new fields, drafts survive400 responses, inputs disable
  while saving, and success invalidates both affiliate and director-revenue reads.
- MSW uses revenue.policy as its canonical sharing policy. Save records the same
  before/after audit. Financial persistence retains the original policy envelope;
  sharing configuration stays in revenue.policy, avoiding duplicate truth and
  preserving legacy snapshots without replaying money effects.
- No migration or large-list query: the existing singleton policy primary key and
  columns suffice. No payout operation, historical recalculation or bank transfer
  was added. Source files remain below hard caps; tests are separate.

## Related evidence

Logs below are under `e2e/.parity-out/v46-802-policy-` (ignored).

| Scope | Result | Evidence |
|---|---|---|
| Shared policy/revenue/persistence |104/104 across17files,5.05s |`shared.log` |
| Admin affected components/hooks/API/MSW HTTP |71/71 across8files,18.57s |`admin-final2.log` |
| Native HTTP/DB policy, snapshot and legacy policy/fundraising-rate suites |11/11 across3files,27.31s |`native-int.log` |
| Admin production MSW build |1/1,0cached,27.902s |`build-msw.log` |
| Admin production native build |1/1,0cached,27.005s |`build-native.log` |
| Isolated server build |17files,1206ms |`build-server.log` |
| Browser MSW |3/3,22.4s |`browser-msw-final.log` |
| Browser native |3/3,14.5s |`browser-native.log` |

Final mandatory root gate87337 terminal exit0, source stable throughout:
`pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` PASS.
Lint8/8 (7cached),50.099s; typecheck8/8 (4cached),32.785s; unit6/6
(3cached),3m44.965s: **2225passed +2existing S3 skips** (Admin643,
shared739,Portal418,server266,UI56,integrations103). Depcheck2389frontend/
1061server modules PASS. Logs `precommit-{lint,types,unit,deps}.log`.
Committed immediately afterward with normal formatting/commit hooks, then pushed.

Native tests exercise actual policy PUT, viewer GET, dashboard GET, negative
permissions, field errors/no audit on rejection, and immutable paid/recorded/
pending snapshots after a save. New receipts use63/7/21 with exact integer VND
rounding and eventual floor. No Prisma mock.

Browser uses **identical assertions** in both modes: edit all three values,
invalid floor blocks PUT, successful save immediately refreshes the dashboard
rule, complete visible ledger/history remain unchanged, F5 retains configuration,
and the public form restores50/10/20. Inputs fit1440/390; existing responsive
policy/terms flow also passes at360/390. No mode-dependent assertion or retry.
Native uses opchub_test5432/Redis2 with SKIP_SEED=1 after guarded AF0 setup;
no mutation of held dev data. Portal production outputs are unchanged.

Build/browser evidence precedes only a lint-only rewrite of the numeric validator
from async throw/return to equivalent Promise.reject/resolve, plus its test mock.
No branch, field, validation condition, markup or style changed in that rewrite.
Final root component/unit gate checks the current implementation. This is not a
claim that the earlier production outputs were rebuilt after that equivalent edit.

## Honest intermediate failures

- Initial Admin6 failures exposed incorrectly encoded newly added translations
  from a Windows pipe. Fixed the actual UTF-8 text, kept exact accessible names.
- A component test read animated field help before its render: now awaits that
  exact message (no timeout increase), and also proves correction can save.
- Initial mock negative test incorrectly chose an actor that has affiliate.action;
  corrected the precondition to a seeded actor without that key.403 remains exact.
- Initial MSW browser2PASS/1FAIL compared innerText capture with textContent,
  including hidden duplicate AntD headers. It now compares full innerText at the
  same viewport, preserving every financial value rather than weakening to a subset.
- Intermediate lint rejected an unused test binding, then two async functions
  without await. Fixed code/test syntax, no lint waiver. Final precommit is separate.

## Measured policy parity — FAIL, next work

Actual `D-84-POL` full-page captures: **34.790233% at1440** and
**16.312345% at390**, both FAIL (unchanged3% threshold). Runner1544 exit1.
Recorded capture HEAD420099cd plus the working tree committed asd7e080c1
(before the equivalent validator syntax cleanup); results.json retains that
actual capture SHA. Both failing diffs are retained. No masks/reference changes.

Viewed app and prototype captures: controls now work, but the screen still has
the legacy policy body. Missing v4.6 policy-year allocation table and per-plan
sharing table; old commission inputs/rules and820px form differ from960px v4.6
layout. This is not a small spacing discrepancy and must not be called parityPASS.
Next: reconcile the touched policy presentation with D-119/prototype and the803
boundary explicitly in the TIP; do not simply defer an unpassed802 acceptance
gate or keep the old direct-affiliate-payout explanation as final behavior.

Prior P7 sharing captures8/8PASS atf147809a remain historical evidence for those
unchanged layouts, not new policy-screen evidence. Payout-state parity/cutoff,
recorded fundraising calendar failure, shared-fixture full regression and final
native-dev acceptance still remain. No full integration/full E2E was rerun after
every small edit; final gates still required once implementation settles.

## Cleanup

Real integration teardown left no pending sharing/payout events. After browser
tests, verified owned API PID592 command line before stopping it; no own worker
needed for policy writes. Reset opchub_test to base demo, cleared only Redis2,
audited pending `[]` again. Held API28484/socket33408/worker16200 retain their
30October start times; held dist and dev DB untouched. Browser-owned ports released.
