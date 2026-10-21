# TIP-V2-526 — Persist bot/chat across MSW apps and prove Dashboard delivery

REQ-208/411 and TIP-503: current browser relay persists affiliate ledger only.
Bot/chat are per-page WeakMap state, so Admin publication cannot prove Portal
delivery across pages/F5. Native Dashboard's old human-reply precondition also
does not create the bot opening that the current specification selects.

Implement separate typed bot/chat snapshot modules, composed as an optional
community payload on the existing same-host, source-validated, Web-Lock lease.
Keep financial snapshot schema/business logic separate. Commit both payloads
atomically, preserve legacy ledgers/commands, fail closed on corruption/quota,
validate the complete payload before state changes and restore both on abort.
Persist actual messages/execution metadata, runtime checkpoints and Chat quotes,
pins/unread, not synthetic Dashboard cards. No credentials in this payload.

Replace the obsolete Dashboard precondition with actual eligible Admin UI bot
publication on BOTH lanes; keep navigation assertion and strengthen exact
published body/identity/F5 visibility. Use actual APIs/worker, no response
fulfillment or onServer expectation branches. New browser cases must distinguish
snapshot/domain proof from live transport proof; do not claim all UAT-14/15 or
cross-app moderation/session behavior from this bounded bot/chat implementation.

Retain failures; test roundtrip, unchanged idempotency/quota/hidden boundaries,
malformed payload rollback, legacy financial compatibility, real cross-origin
browser flow. Run root gates, fresh builds, identical native/MSW cases, explicit
path commit/push on authorized feature. Preserve/restore native HOLD; no main
merge or provider call. Do not modify imported source while current222-case
MSW invocation is live; prepare new unreferenced modules first.
