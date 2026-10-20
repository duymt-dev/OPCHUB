# TIP-V2-509 — identity invariant versus read access paths

Status: IMPLEMENTED, scoped native verification complete. Full P5 remains open.

The first native broad run retained120 passes and one existing prune-plan
failure. The new full nullable metadata identity index included human/legacy
NULL contexts and displaced the ordered simulated-message index with a heap
filter/Sort. A separate partial-index corrective migration excludes NULL
contexts without changing valid identity uniqueness. No applied checksum rewrite.

That partial identity index still competed with room/thread visibility reads.
The final invariant index is `(bot_turn, bot_thread_id, room_id)` WHERE context
exists: all three keys are equality-bound for identity conflict checks. It is
not a misleading room-prefix read path. Opening detection uses the already
unique `(room_id,bot_thread_id) WHERE bot_opening` marker, including hidden /
soft-deleted markers. The actual producer guarantees an opening before later
turns; no visible/deleted filter may resurrect another opening.

- Only the newly introduced identity index was replaced; no older competing
  index was dropped or planner flag forced. Prisma's unsupported partial UNIQUE
  declaration stays handwritten rather than pretending a full @@unique exists.
- Native context/opening concurrency, soft-deleted first markers, persona FK
  SET NULL and the original prune assertions remain enforced.
- Broader response-plan fixture now exercises nonempty visible/direct responses
  plus6,000 hidden/deleted rows, rather than assuming an index choice on empty
  lookups. All index/no-Seq assertions remain, with stronger actual count/preview
  checks. Timestamp-bind/auth-fixture failures are retained as well.
- Discussion cache is sampled after heavy blocks, preserving the original TTL
  assertion under a slower cold Dashboard read.
- Current focused **19/19 in3 files**; final broad **121/121 in24 files**,
  including the unchanged original prune assertions and actual FakeLlm workers.
  Reply-worker deadline139,261ms, one reply/one keyword report. Raw earlier
  120-pass/1-fail run remains retained; no failed run was relabeled as green.
- Gates: lint8/8 (6 cached), typecheck8/8 (6 cached), units938 +2 existing skips,
  six successful tasks (5 cached), depcheck no violations (1,491/4,090 FE/shared;
  761/3,373 server modules/dependencies). No full P5/browser/parity acceptance.
- Receipts `evidence/v2-509/`; originals private. Native test DB only, no dev/VPS
  migration or acceptance service restart. Full P5 objective remains active.
