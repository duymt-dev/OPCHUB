# TIP-V2-518 — Deferred D-55 group ownership effects

## Correction and evidence
- Four original shared failures are retained in before.log, and pass unchanged.
  The expanded shared suite covers12 cases: actual owner transfer, retained
  ordinary membership, no ownership restoration on unlock, live Chat owner flags,
  null-actor system audit, no duplicate counts/notices, unlock-before-consume,
  missing-Admin retry, oldest active Super Admin ordering, bulk/reset and seed
  provenance. Newly created groups now have real staff memberships, not just a
  display count, so the same lock worker can transfer them.
- GroupAdmin state is extracted into a dedicated module. Admin/Chat read the
  same current owner; prototype owner constants only initialize seed state.
  Initial ownership follows native demo seed membership and locked-user rules.
- Real status transitions enqueue work; mock worker draining rechecks current
  locked state, selects the oldest active Super Admin, demotes former owners,
  upserts Admin membership, counts only new membership and records a system
  group.owner_transfer audit with exact from/to/reason. No notification is sent.
  Missing eligible Admin leaves the batch pending. Reset removes queued work.
- Admin actual status/detail HTTP workflow passes; the original six Admin group
  tests are unchanged. One existing omitted-owner assertion caught a genuine
  native mismatch, reproduced and corrected separately in TIP-519. It was not
  changed to accept silent ownership transfer.
- Portal actual fresh-login/Chat/send workflow checks former owner flags, ordinary
  sender role and denied pin after unlock. Initial new fixture incorrectly put
  canPin on ChatMessage (it is a UI prop derived from group.isOwner, not a DTO
  field). That diagnostic is retained; the final check invokes actual pin HTTP
  and requires403, alongside unchanged owner/sender assertions.

## Verification scope
Focused shared12/12, initial shared/cohort26/26, Admin HTTP7/7, Portal HTTP1/1.
Native existing lock propagation6/6 also passes; combined TIP-519 native cohort
is12/12 in3files. Final lint8/8 and typecheck8/8 (six cached each) pass;
forced root units1180 passed +2 existing storage skips, six tasks/zero cached:
shared269, Admin433, Portal180, server203, UI43, integrations52. Depcheck passes
with zero violations (FE1577 modules/4500 dependencies; server768/3400).
Sanitized original failures/cohorts and final root receipts: evidence/v2-518/.

## Not final acceptance
No opchub_dev changes, migration, native HOLD process restart or provider call.
Only test DB/Redis2 fixtures were exercised. This checkpoint proves current mock
runtime and focused native contract, not cross-origin persistence/live transport,
project visibility, full browser lanes or complete UAT/AT/LK. Full P5 remains open;
main is not merged and no ready-for-review claim is made.
