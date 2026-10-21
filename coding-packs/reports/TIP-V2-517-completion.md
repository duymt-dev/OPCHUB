# TIP-V2-517 — Captured-member lock and stale mock session revocation

## Reproduced / corrected
All four original Portal HTTP cases failed before editing and now pass unchanged:
moderation lock must lock the actual sender/access session, locked refresh must
fail, unlock must not resurrect old access/refresh, and correct credentials must
not create a session for a locked account. Original raw517-before.log is retained.

- A separate member lifecycle module owns conditional status changes, reasons,
  per-account audit and session-version invalidation. Existing single/bulk domain
  exports are facades; unchanged/unknown bulk targets are skipped, duplicate IDs
  count once, and only actual transitions bump versions and write user audit.
- Moderation lock follows report resolution/audit, using captured runtime source
  IDs, never display names. Note/default chat reason reaches the actual account
  and user.lock audit diff. Persona/null/already-locked cases do not produce a
  spurious account transition. Source removal does not lose the captured target.
- Mock-only access tokens and refresh-cookie envelopes carry non-secret epochs.
  Epoch0 keeps legacy `mock.<id>` compatibility. Locked access/login403 and revoked
  refresh401 mirror native; unlock bumps the epoch again, so only a fresh session
  can operate. Legacy Me-only refresh cookies parse as epoch0, never bypassing a
  later lock/unlock. No real access token or credential is saved in the cookie.
- Central token decoding preserves the actual non-default member ID after fresh
  issuance. Protected auth/password-change and revoke-others routes cannot bypass
  session checks via the public auth-prefix exemption. Existing cookie-only lock
  precondition is retained. The real locked state now works without that cookie.
- Independent Admin status handlers enforce members.action, native768KiB limit,
  shared schemas and actor/reason audit for single/bulk commands. Moderators can
  still perform moderation lock using groups.moderate, without an unrelated
  members.action requirement. Native single-status unknown targets return409;
  this existing controller contract is deliberately retained, not invented404.
- Generic bounded Admin JSON parsing is extracted from the bot-specific helper;
  old bot exports remain facades. Existing bot byte-limit/error regressions pass.

## Verification
- Shared lifecycle/token controls **12/12** pass.
- Admin HTTP cohort **29/29** (seven new controls plus22 existing bot error cases).
- Portal HTTP cohort **8/8** (six new controls plus two existing refresh cases).
- Root lint8/8 (seven cached) and typecheck8/8 (six cached) pass. Forced repository
  units **1166 passed + 2 existing storage skips**, six tasks, zero cached:
  shared257/Admin432/Portal179/server203/UI43/integrations52. Depcheck zero
  violations: FE1571 modules/4461 dependencies, server767/3396.
  `evidence/v2-517/` retains sanitized before/after/cohort/root gate receipts,
  including the additional test-fixture and strict-typecheck diagnostics.
- An initial added non-default-user test tried to import a private memberMe helper;
  it now obtains the actual Me via the public mocked `/me` precondition, retaining
  its ID/token assertions. An initial strict typecheck exposed fixture narrowing
  across a function boundary; an explicit fixture initializer fixes it. These
  diagnostic failures are retained, not mislabeled as product bugs or hidden.

## Remaining goal / limits of this checkpoint
- Session invalidation is proven within the current MockDb runtime and on the
  next protected HTTP request, not yet cross-origin persistence/reload or a live
  socket push. Those require the still-pending shared browser bridge/transport.
- D-55 owned-group transfer, locked-owner project visibility and historical ghost
  account seed alignment remain open; no full account lifecycle acceptance claim.
- No native production/schema/dev-data/process or provider changes this checkpoint.
  Native behavior is the contract; preceding focused native14/full1300 receipts
  are historical checkpoints, not a new native run for this MSW-only correction.
- Auto/business-plan decision, both full browser lanes/real-provider E2E, UAT/AT/
  LK/audits/parity/final reports/dev integration and owner-reviewed dev-to-main PR
  remain open. Main is not merged; full P5 goal stays active.
