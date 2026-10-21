# TIP-V2-526 — Bot/chat cross-app persistence and actual Dashboard precondition

## Implementation / boundaries
MSW's existing Web-Lock relay previously shared only the financial ledger. New
separate bot/chat snapshot modules capture catalogs/settings, execution progress,
daily/rate/idempotency/reply checkpoints, private execution metadata and actual
messages/quotes/pins/unread. One-time manual scenario state also survives restore,
so a later explicit enable is not reset on F5. No credential/provider configuration
is included. Typed restoration normalizes optional fields rather than casting.

The transport composes optional community data with the independent financial
schema. One storage write commits both domains. Legacy ledgers upgrade lazily;
legacy callers preserve existing community payloads. Entire incoming payloads
validate before mutation/write; client abort restores both snapshots. Corruption
and quota failures remain errors, never truncation/reset. Existing same-host,
parent/source checks and Web Lock remain; no native bridge endpoint was added.

This is **bot/chat persistence**, not a claim that all community domains or live
transport are finished. Group/admin metadata, moderation jobs/report/session
epochs, full audit-history persistence and cross-page chat event delivery still
need their own implementation/acceptance. No full UAT-14/15 or LK PASS inferred.

## Requirements-driven Dashboard setup correction
Old native setup sends human messages; current Dashboard selects persisted bot
openings. Replaced only that precondition with identical actual Admin UI setup
on both lanes: eligible personas, unique first-line text, real script save/run,
worker cursor and Stop. Portal must render that unique body, retain it after F5,
return the actual group/timestamp from Dashboard API and navigate to c1 from that
specific card. No synthetic card, HTTP fulfillment or onServer expectation split.
Original navigation assertion remains, strengthened by publication provenance.
The prior native failure is retained in v2-503 evidence, not reported as old PASS.

## Evidence
- Relay regressions before wiring: **3fail/1negative control pass**. After:
  combined community + original financial persistence cohort **41/41**,7files.
  Includes atomic upgrade/legacy preservation/invalid payload, publication
  identity/replay, pending member-reply quote/cooldown and hidden-state roundtrip.
  These are domain/lease tests, not substitutes for browser transport proof.
- Browser: native Dashboard **3/3**,1.3min. MSW Portal-shell + payout + automatic
  generation **11/11**,35.6s; includes the same3 Dashboard cases and unchanged
  missing-bank same-key retry/paid snapshots. Actual cross-origin Admin-to-Portal
  body/F5/navigation proof, not a seed-only comparison.
- Root lint8/8 and typecheck8/8 (6cached each) pass. Forced root **1254pass +2
  existing storage skips**, six tasks/zero cached,2m46.668s: shared329/Admin443/
  Portal184/server203/UI43/integrations52. Depcheck zero violations:
  FE1609modules/4612dependencies, server770/3406. Fresh MSW Portal/Admin builds pass.
- Initial strict typing caught optional replyToId/actorId restoration containing
  explicit undefined. Dedicated typed state normalization corrects it; diagnostics
  retained. No any/ignore/assertion weakening.
- MSW teardown emits an empty `[WebServer] Error:` after11passed/exit0. Raw receipt
  retained as an OPEN diagnostic, not silently declared a clean browser-console
  audit or inferred product failure. Browser runtime audit remains required.

Sanitized receipts: evidence/v2-526/. Private raw originals remain outside Git.

## Historical full run / native HOLD
The immutable full MSW invocation at57274693 completed **222/222**,6.4min before
this transport change. It is retained as baseline, not a full post526PASS. Native
backend remains dist/p5-525 at57274693; existing Portal/Admin bundles unchanged.
Only browser preconditions touched native dev data; required seed + demo seed +
scoped Redis1 flush completed afterward. No process stop/migration/provider call
or protected-port action this scope. Portal3280/Admin3282/API4020/socket4021/worker
remain for owner acceptance with fake providers and normal automatic demo.

All four historical native full-run failures now have scoped fixes/verification,
but no fresh full-native222PASS is claimed. Full behavior reruns, missing UAT/AT/LK,
live reply/LLM, current integration, audits and then parity remain open. No
P5-DONE, owner-review PR readiness or main merge claimed.
