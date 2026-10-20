# TIP-V2-504: Redis Pub/Sub environment isolation

## HEADER
- Priority: P1; status: IMPLEMENTED / scoped regression verified; phase: V2-P5.
- Depends on existing implementation: B22 socket + TIP-V2-305 live metrics.
- Execution authorized by active P5 goal (scoped regression refinement).

## CONTEXT / RAW FINDING
Socket.IO adapter and all room/user/keyword channels reused a global channel namespace. Redis SELECT does not isolate Pub/Sub; an integration socket intermittently consumed native DB-1 metrics (online=0).
Raw failures: `D:/opchub-local/v2/501-lifecycle-all-integration.log` and
`501-gates-refine-reproduce.log`; retain normalized/redacted copies in evidence.

## SCOPE
`apps/server/src/` / `apps/server/test/`: common/redis/{pubsub-channel,redis.service}.ts; socket/redis-io.adapter.ts; realtime publishers/subscribers; persona-turn-publisher; keyword-filter; publication and pubsub integration tests.
No stack/version, business flow, UI parity or deployment changes.

## ACCEPTANCE
Namespace every Pub/Sub channel and Socket.IO adapter by REDIS_DB. Same-environment events still arrive; DB-1 and DB-2 synthetic subscribers are isolated, with an ordered cross-DB positive control proving Redis routing. No native DB-1 key mutation, service restart or database reset.

## TESTS / GATES
test/common/pubsub-isolation.int.spec.ts; test/socket/socket.int.spec.ts; test/bot/persona-publication.int.spec.ts.
Repo lint/typecheck/test/depcheck; targeted native regression, then full integration
before final P5 acceptance. No weakened assertions, hidden retries or fake PASS.

## DELIVERY
Scoped commit and push on current dev-derived feature; record actual evidence in
reports. Main is unchanged; final delivery is owner-reviewed dev -> main PR.
