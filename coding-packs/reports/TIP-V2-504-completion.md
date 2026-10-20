# TIP-V2-504: Native/test PubSub isolation ? scoped implementation verified

The Redis Socket.IO adapter and room/user/keyword channels now include REDIS_DB. The real-Redis regression uses only unique synthetic PubSub channels: DB-1 publishes to DB-2 as a positive control proving SELECT is not isolation; same-environment delivery succeeds and normal DB-1/DB-2 channels do not mix. Native DB-1 keys/services were not changed. Global adapter channels explain a plausible source of the intermittent foreign metrics packet; the original failure is retained, not declared flaky/ignored. Persona Lua publication uses the same channel resolver as ordinary publishers.

Evidence: `evidence/v2-504/`. Combined final targeted native regression is
62/62 in 14 files; repo unit/lint/typecheck/depcheck pass (927 + 2 existing skips).
This closes the scoped source/test finding, not P5 or full integration acceptance.
Original full run had 3 failures; a stable complete rerun remains a P5 gate.
No native demo restart, dev migration, UI work or main integration occurred.
Implementation is on the current dev-derived feature; final PR remains dev -> main
for owner review. See git history for the scoped implementation commit.

## Follow-up discovered by the TIP-502 broader regression

The chat REST S-04 test still subscribed to literal socket:room; the broader
native run exposed its 0/1 packet failure (71 pass / 1 fail). A repository search
found two more literal socket:user subscribers in membership/join-request tests.
All three now use the same environment-aware channel resolver as production.
Their exact packet counts/payload assertions remain unchanged. Targeted native
bot/chat/membership/join-request regression is now **81/81 in 15 files**; see
legacy-subscribers-before/after evidence. This is not a full integration PASS.
