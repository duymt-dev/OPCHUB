# TIP-V2-524 — Complete MSW automatic conversation runtime

## Finding / scope
TIP-501, REQ-208, D-50 and owner-approved P5-PLAN-01 require automatic
topic conversations, 3–4 turns, opener closes, per-turn generation and limits.
Native scheduler admits automatic work. MSW advanceMockBot currently admits only
scheduled scripts; autoGenerate is displayed but has no automatic admission.
The native empty-history case also lacks an explicit manual-only precondition.

## Acceptance
- Share the existing approved pure persona-plan/topic-rotation algorithm with
  native through a one-line facade; no business decision changes.
- MSW tick admits eligible groups only once while occupied, respects daily
  reservations and 30-thread capacity/terminal retention, rotates topics and
  generates only the current due turn with deterministic fake text.
- Publication rechecks enabled/persona/group/hours/quota/rate, preserves execution
  metadata, idempotency, NA-07 publication path, live spacing and stop behavior.
- Default demo remains automatic. Add an explicit manual-only seed option for
  just the empty-history case: native applies it inside the seed transaction;
  MSW applies equivalent settings before the first bot handler, once per store.
  Keep all existing empty assertions, no onServer expectation split.
- Separate positive automatic tests; do not use the manual fixture to hide a
  missing automatic implementation. Dashboard/cross-app persistence is a separate
  follow-up gate, not inferred from domain tests.

## Validation / boundaries
Retain before failures, run domain/shared and Admin handler regressions, lint,
typecheck, forced root tests, depcheck, fresh builds and identical browser cases
on both lanes. Native seed/reset must be announced/restored. No SQL loop/new
schema/provider call. Keep module caps, tests separate, explicit-path commit/push
on existing authorized feature from dev; final acceptance/PR remain open.

The full integration invocation at82dfdc3f is live. Until it terminates, do not
change imported production/seed sources; new unreferenced modules/tests may be
prepared without changing that invocation's runtime dependency graph.
