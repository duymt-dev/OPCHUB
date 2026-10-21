# TIP-V2-502 Admin emergency controls checkpoint — IN PROGRESS

## Implemented source
- Admin Bot now exposes confirmed emergency stop and hide actions through the
  existing API client/shared response contracts. Hide requires an explicit global
  scope or at least one selected group; an empty selection never means all groups.
- Both actions check `bots.action` at the mutation boundary, disable pending
  controls and disallow duplicate synchronous submissions. No destructive retry
  or optimistic success. Failure keeps the confirmation open for explicit retry;
  pending requests disable cancel, close, mask dismissal and Escape.
- A successful stop updates only `enabled` in the existing settings cache and
  invalidates bot queries. Both actions refresh cached Admin message histories.
  Existing topics/auto/reply settings are retained, including zero-count success.
- Settings PATCH no longer enables optimistically. It respects write permission
  and shares a serial mutation scope with emergency actions, so an earlier PATCH
  cannot finish after stop and re-enable the cache. The screen disables settings
  while an emergency request is pending and emergency controls during PATCH.
- Screen remains an orchestrator; mutation hook, confirmation, scope picker and
  tests are separate modules. No new dependency or schema/environment variable.

## Evidence and retained failures
- New hook/control/UI tests: **13/13** across three files, including direct
  view-only calls, stop/cache preservation, scoped/global hide, duplicate calls,
  failed requests/manual retry, cancel without API, empty selected scope, pending
  close controls and settings/stop ordering.
- Real shared AntD Modal is exercised in component tests (not replaced by a
  fake modal). Initial 8-pass/2-fail receipt is retained. Those assertions exposed
  that a closing AntD modal remained in leave animation in jsdom; the confirmation
  is now a separate conditionally mounted component, with all original close
  assertions retained and passing. Splitting also resolves the 80-line function
  gate; no lint rule was suppressed. jsdom's existing pseudo-element style
  diagnostics are not claimed as browser results.
- Repo gate receipts are stored beside this report under
  `evidence/v2-502/admin-controls/`. Final lint **8/8** tasks (7 cached),
  typecheck **8/8** (8 cached), units **951 passed + 2 existing integration-adapter
  storage skips** across 6 tasks (6 cached): server203, Admin347, Portal166,
  shared140, UI43, integrations52. Depcheck: zero violations, FE1500 modules /
  4128 dependencies; server761 / 3373. Cache reuse is explicitly disclosed;
  successful unit gates do not imply native/browser acceptance. A prior lint
  invocation observed an unresolved action type while it was being moved into
  `types.ts`; its failure receipt is retained, followed by the green rerun on
  settled source. No unsafe type rule was suppressed.

## Not yet accepted
- MSW emergency/hide handlers and full shared-state auto/reply/Dashboard/seed
  alignment are still pending. The new controls have API-boundary/component
  evidence, NOT a claim of passing MSW or native browser E2E.
- No fresh Admin build/deployment, native integration rerun, real-provider
  browser/worker test, full UAT/AT/LK/C1–C6 acceptance or parity measurement is
  claimed here. Native 3280/3282/4020/4021 stack and dev data were not changed.
- These new controls/dialogs still need parity inventory and <=3% measurement or
  owner-approved deviation after functional gates; P4 waivers do not cover them.
- P5-PLAN-01 auto-turn-count approval and remaining TIP-501/502/503 deliverables
  remain open. This is not a TIP/P5 completion or a ready-for-review PR claim.

Next: implement/verify the MSW emergency/hide contract and hidden-content reads,
then finish auto/reply/Dashboard mock/demo alignment and both browser lanes with
the same assertions. Supplied real-provider credentials remain outside Git;
this checkpoint makes no provider calls.
