# TIP-V2-506: D-50 B5 audit assertion ? scoped implementation verified

The gate now requires exactly one script.run audit for the actual script AND unique current actor. Seed sequence IDs are reusable while audit history is append-only, so script ID alone counted old rows; actor scoping prevents a historical false pass. The retired approve assertion is replaced by the required scheduling audit; identity, permissions, campaign/request and remaining audit assertions are preserved.

Evidence: `evidence/v2-506/`. Combined final targeted native regression is
62/62 in 14 files; repo unit/lint/typecheck/depcheck pass (927 + 2 existing skips).
This closes the scoped source/test finding, not P5 or full integration acceptance.
Original full run had 3 failures; a stable complete rerun remains a P5 gate.
No native demo restart, dev migration, UI work or main integration occurred.
Implementation is on the current dev-derived feature; final PR remains dev -> main
for owner review. See git history for the scoped implementation commit.
