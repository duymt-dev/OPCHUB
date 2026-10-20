# TIP-V2-502 Dashboard conversation checkpoint — IN PROGRESS

## Implemented
- Real script/auto/member-reply executions persist private thread/turn/kind and
  one opening marker per default room in the same message/cursor/outbox write.
  The first successful turn is the opener even after a skipped turn or a later
  room assignment. Hidden/soft-deleted openers are not promoted to a later turn.
  Context is paired/validated; database uniqueness protects an execution turn
  across different personas and protects one opening per room/thread.
- Message identity deliberately has no FK to the retained BotThread snapshot:
  thread GC does not remove visible discussion history. Persona ON DELETE SET
  NULL still retains content and uses a neutral member placeholder. The first
  migration's overly restrictive persona CHECK was corrected in a separate
  applied migration before validating the deletion case, not by dropping data.
- Offline/create-only schema diff reviewed; additive metadata/index migration
  backfills only recoverable canonical client IDs with a known execution kind.
  Unknown legacy identities are not guessed. Body/timestamps are unchanged.
  Backfill logic was reviewed and deployed against current test data; a separate
  historical backfill-fixture acceptance is not claimed here.
- `threads`: latest50 real message-backed openings/replies, default/live groups,
  hidden/deleted excluded BEFORE LIMIT, stable `(created_at,id)` keyset. One
  query chooses narrow IDs first, then joins body/name/color. Visible execution
  turns and direct replies are counted once via an ID union; preview body is
  fetched only after selecting the first response ID. No query per recipient.
- Short-lived discussion cache10s is separate from the existing heavy blocks60s.
  Publications, immediate bot-hide response and durable hide delivery invalidate
  both via an atomic Redis epoch. CAS prevents pre-hide computation from caching
  old content after invalidation; a race gets one fresh uncached read, no loop.
  Idempotent publication replay also retries cache invalidation after a prior
  failure. Discussions are sampled after heavy blocks so slow aggregates do not
  return an already-expired/pre-publication discussion snapshot.
- Portal serialization includes none of the internal context/simulated fields;
  persona name/color remain normal member identity. No simulated-label toggle
  or new Portal bot label was silently added.

## Current evidence
- New functional native cases7: real script/auto/reply execution, skipped first
  turn, GC, per-room first marker, hide before consumer delivery, stale-reader
  cache fence, concurrent duplicate write and persona deletion.
- Storage cases4: latest50/tied-time paging and negative scopes before LIMIT,
  deduplicated visible response counts/preview, invalid context/opening database
  invariants, actual production SQL EXPLAIN on26,182 wide fixture rows (including
  6,000 hidden/deleted responses). Fifty returned rows each have the correct two
  visible responses and first preview. Covering Index Only Scan nodes for IDs /
  response selectors plus PK body joins; heap visibility checks are disclosed in
  raw plans. No message Seq Scan, hints, reindex or test-created index.
- Focused current regression **19/19 in3 files**, including the existing prune
  suite with its original ordered-index/PK/no-Seq assertions unchanged. Earlier
  broader Dashboard/bot/chat/moderation run retained **120 passes/1 plan failure**;
  TIP-509 fixes the new index's scope/access-path competition. Final broad/gate
  result **121/121 in24 files**, including actual publication/reply/pause-resume
  workers. Actual FakeLlm member-reply deadline **139,261ms**, one reply/one
  keyword report. No shortened business timer or real-provider acceptance.
- Final repo gates: lint8/8 (6 cached), typecheck8/8 (6 cached), units938 passed
  +2 existing storage-provider skips across six tasks (5 cached). Depcheck no
  violations: FE/shared1,491 modules/4,090 dependencies; server761/3,373.
  Existing UI lint warnings remain in receipts. This is not the full repository
  integration gate or any browser/parity acceptance.
- All migrations/client generation targeted guarded native loopback5432 /
  opchub_test only. No dev migration/reset, native build/restart or real-provider
  call occurred. Providers in these checks are FakeLlm.

## Retained failures / refinements
- A test fixture tried multiple simulated replies to the same trigger; the real
  uniqueness guard rejected it. Hidden/deleted execution responses now use their
  actual thread relationship, retaining the one overlapping visible path for
  deduplication. No guard or expected count was weakened.
- Crypto randomUUID's inferred template type was too narrow for a stored string
  ID in a fixture helper; explicit string annotation fixed typecheck.
- Native plan regression from an unfiltered nullable identity index and then
  competition between identity/visibility reads: see TIP-509 and retained raw
  plans. Final identity index is partial, turn-first (all identity keys are
  equality-bound at conflict checks); opening detection uses its own unique
  marker index. Existing prune assertions were not changed.
- The original empty-response plan fixture did not exercise response selectivity;
  it now has visible/direct and hidden/deleted responses, with actual returned
  count/preview assertions. SQL fixture timestamp expressions needed explicit
  timestamptz casts; repeated fixture logins needed normal auth-state reset.
- A cache-window assertion exposed discussions being computed before a slow
  heavy block. Source sampling order was fixed; the TTL assertion was retained.
- Raw receipts: `evidence/v2-502/dashboard/`, `evidence/v2-509/`; originals remain
  private under `D:/opchub-local/v2/502-dashboard-*` / `509-*`.

## Remaining / not accepted
Admin emergency/hide controls and MSW transitions, seed/MSW/native discussion
alignment, both browser behavior lanes (including real-provider native E2E),
full repository integration, UAT/AT/LK/audits and parity remain open. Visibility
changes through other Admin paths still require broad browser/audit validation;
this checkpoint proves bot-hide/publication integration, not every legacy path.
TIP-501 auto-turn-count confirmation is still pending. No P5/TIP-502 DONE, main
merge or main push. HOLD remains the prior native builds, not a P5 deployment.
Portal3280/PID1904, Admin3282/PID23388, API4020/PID18936 and socket4021/PID7436
were rechecked listening with the same owners; no owned services were changed.
