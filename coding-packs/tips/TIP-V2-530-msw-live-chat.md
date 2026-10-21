# TIP-V2-530 — Live MSW chat invalidation and Fake UAT-14 pair

TIP-526 persists bot/chat, but restTransport.join is a no-op and useRoomReload
returns before subscribing in MSW. An open Portal chat does not observe a reply
published by the separate Admin runtime even though F5 would restore it.

Add identical FakeLlm browser assertions for real member send -> eligible c1
persona -> actual delayed worker reply -> open chat (no reload) -> quote/F5/
public identity boundary. Reuse actual Admin participant forms. No onServer
assertion branch, HTTP fulfillment, forced completion or new provider request.
Retain before-failing MSW receipt; run unchanged test against native too.

Implement mock-only live invalidation from committed Portal-origin relay storage
events. Validate exact storage key, source origin/path and complete typed payload;
emit room IDs only, not private bot identity/content. Compare visible room data,
ignore read-only/unread/financial changes, handle hide and pin/file invalidation.
Use existing query cache/reload boundary, no new global content store or polling
of full message histories. Native Socket.IO path must remain unchanged.

Scope does not claim all community/group/session/moderation cross-app state is
persisted, a complete autonomous mock worker or full UAT-15 lifecycle. Keep
separate integration invocation immutable for backend source. Run shared/FE
regressions, fresh isolated MSW builds, both-lane browser and mandatory root
gates. Do not touch native HOLD builds or spend more real-provider budget.
