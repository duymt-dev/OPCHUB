# TIP-V2-531 — Deterministic addressed-persona chronology

## Root cause and scope

Retained full post529 failure: server1288pass/1fail. Unchanged scoped file
reproduces **13pass/1fail**,24.38s: expected all10 context entries from the
other persona, got false. Its ten supposedly newest posts were anchored to
2026-10-21T05:00Z minus119seconds, whereas the real HTTP member question used
actual wall time. Before that calendar boundary the test could accidentally
pass; afterward the newer human question correctly enters the latest10.

Corrected only preconditions: addressed message is genuinely older than the
real member send; ten other-persona posts arrive afterward while the member
question waits, with timestamps derived from the actual source and injected
admission time. Original personaQueue, post result, selected persona, exact
history length10, **every history persona equals the other ID**, and exactly
one published reply assertions are all retained unchanged. No production
history filter, selector, timeout or business rule changed.

A separate opposite-order control inserts13 earlier persona posts followed
by a newest actual HTTP human message. Generated history must equal the exact
nine newest prior bodies plus that human body with null personaId. This guards
against filtering human context to make the old test pass. Uses real native
test Postgres and FakeLlm; only the adapter method is spied for captured input.

## Evidence / qualification

- After: **15/15 in2files**,10.61s, including original14 and new chronology
  control. Original full and scoped failures remain in v2-529/v2-531 evidence.
- Root lint8/8, typecheck8/8, tests6/6 (3cached;1270pass +2existing skips)
  and depcheck pass. No fresh uncached all-unit or full integration PASS
  inferred. Dependency scan: FE1620modules/4646dependencies; server772/3415.
  Exact terminal/cache receipts retained in evidence/v2-531.
- No app production source, migration, native process, dev demo data, real
  provider configuration or protected port changed. No backend rebuild needed
  for a test-precondition-only correction. Native HOLD is preserved.

Next: fresh forced complete integration after commit, then remaining same-
assertion UAT/AT/LK cases (especially full UAT-15 lifecycle), audits/parity,
final reports/dev review PR. No P5-DONE or main merge claim.

## Subsequent full invocation

At4d6656ae, forced full is terminal server1289pass/1fail in127files,
13m26.336s root, zero cached. This original14-case file and the new context
control both pass. Different remaining failure is Dashboard earliest-preview
fixture chronology (fixed05:00+serial versus real HTTP timestamp). Retain and
refine separately; DB task aborted, so full root integration remains red.
