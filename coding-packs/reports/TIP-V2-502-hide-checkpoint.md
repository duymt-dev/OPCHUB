# TIP-V2-502 hide/open-room checkpoint — IN PROGRESS

## Implemented source
- `POST /admin/bot/hide-messages`, guarded by `bots.action`; validated optional
  group scope. An explicit empty array, empty IDs, unknown fields and malformed
  input are rejected instead of accidentally becoming a global operation.
  Missing scope means all simulated messages, including already soft-deleted
  messages; human messages and previously hidden timestamps remain unchanged.
- A Chat-owned repository performs ONE conditional bulk UPDATE. A CTE returns
  the actual count/distinct rooms and at most 201 IDs, never whole message bodies
  or an array of every affected message. Above 200, the durable event carries no
  message IDs. Audit and outbox commit with the visibility update; a real audit
  inet failure rolls the entire operation back.
- A same-domain Chat visibility lock serializes hide with final persona
  publication. A publisher which read visible content before hide must recheck
  under that lock before the Redis Lua delivery; it cannot resurrect a hidden
  message with an older `message.new` after the hide committed.
- Durable `bot.messages_hidden` delivery: at most 200 neutral, masked
  `message.updated` events; otherwise one generic `room.reload` per room. Lost
  hard-deleted rows cause a room reload even if other hidden rows still exist.
  Publication is replay-safe for visibility, with no query per recipient.
- Portal handles the generic reload/hidden update, cancels stale queries, drops
  cached messages/pins/files and refreshes room previews/overview. Hidden updates
  remove rather than insert rows across every search/page cache. Hidden reply
  targets no longer leak original text through a visible human reply preview.
- Portal DTOs have no simulated-persona field. Optional generic `hiddenAt` is
  usable for any hidden message; hidden event bodies/attachments/reactions are
  masked. Admin read permission still applies, but Admin history now includes
  hidden rows with original content and a visible translated 'Đã ẩn' label.
- Reviewed additive partial index `(room_id, id) WHERE is_simulated AND
  hidden_at IS NULL`. Offline/create-only Prisma schema diff is empty (partial
  index is handwritten SQL); no migrate-dev/shadow/reset was used. Guarded
  deploy applied `20261021043000_bot_hide_visibility` to native loopback5432 /
  **opchub_test only**, not dev. No client regeneration/schema data change needed.
- Broader-plan refinement TIP-508 additionally supplies a partial covering
  equality-seek index `(is_simulated, hidden_at, room_id) INCLUDE(id) WHERE
  is_simulated` and matching multivariate column statistics. Raw failed
  expression/statistics/diagnostic rebuild attempts remain preserved; applied
  migration checksums are not rewritten. The final fixture needs no index
  rebuild, planner switch, constraint bypass or dropped competing index.
- HTTP contract table and live calls now cover 216 endpoints, bot module17.

## Evidence at this checkpoint
- Initial hide HTTP/socket suite: **7/7**. Actual 200-message boundary uses
  masked `message.updated`; 201 across two rooms uses one `room.reload` per room
  through real Socket.IO subscriptions and the real outbox relay/consumer.
- Current pre-final-hard-delete regression: **32/32 in 7 files**, including
  hide/storage, live HTTP contract/coverage, REST/socket chat and persona
  publication. Final seek-index broad bot/chat/moderation/contract run:
  **105/105 in21 files**, including the added hard-deletion fallback and actual
  row-count assertions. Actual FakeLlm worker deadline **68,467ms**, one reply /
  one keyword report; no shortened business timer. Two earlier broader plan-test
  failures (104 passes/1 failure each) remain retained in TIP-508 evidence.
- Actual final production UPDATE SQL `EXPLAIN (ANALYZE, BUFFERS)` on 10,001 wide
  human +10,001 already-hidden persona +40 eligible rows: scoped/global updates
  use `messages_persona_visibility_seek_idx` with explicit equality/null Index
  Cond; no Seq Scan on messages, exactly one Update node, correct affected and
  untouched counts. Initial uniform-fixture and broader failed plans are also
  retained. See TIP-508 for why predicate-only indexing was insufficient.
- Portal cache unit cases **3/3**: all variants remove hidden rows without
  touching humans, replay does not insert unseen hidden rows, bulk reset clears
  stale room data/metadata without clearing another room.
- Repo gates: **938 unit tests passed + 2 existing storage-provider skips**
  (server203/Admin334/Portal166/shared140/UI43/integrations52). Final unit receipt
  has six successful tasks (5 cached); preceding uncached/partial-cache runs are
  also retained. Lint8/8 (6 cached), typecheck8/8 (6 cached), depcheck no
  violations: FE/shared1,491 modules/4,090 dependencies; server753/3,325.
  Existing UI image lint warnings are disclosed, not counted as new failures.
- HOLD check remains Portal3280/PID1904, Admin3282/PID23388, API4020/PID18936,
  socket4021/PID7436. These are the prior native builds, not a deployed P5 claim.
- Raw lint failure is retained: two test object literals used `expect.any`,
  whose matcher type is any. Replaced with explicit schema-validated DTO/string
  checks; no assertion/guard relaxed and no test suppressed.
- Raw receipts: `evidence/v2-502/hide/`; originals under
  `D:/opchub-local/v2/502-hide-*`. Providers in these checks are FakeLlm.

## Not yet accepted / not DONE
Real Dashboard thread feed/cache invalidation, Admin bot emergency/hide controls
and MSW state, both browser behavior lanes including real-provider native E2E,
stable full repository integration, audits/UAT/AT/LK and UI parity remain open.
The new Admin hidden label has source/native DTO evidence, not browser/parity
acceptance. TIP-501 auto-turn-count approval is still pending. No final P5/TIP
completion, deployment, dev integration or main merge is implied. Keep HOLD
services unchanged and deliver via owner-reviewed dev -> main PR only when the
full objective has evidence.
