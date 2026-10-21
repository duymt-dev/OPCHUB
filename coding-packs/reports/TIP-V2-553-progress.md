# TIP-V2-553 ? Keyboard fix verified locally, browser acceptance pending

Native552 Admin script CRUD reached edit drawer, but Escape left URL at
/bots/scripts/sc100 instead of /bots/scripts. Keep that original failure;
MSW552 same case passed. Both9-case suites continue on immutable552 binaries.

Found a deterministic first-commit listener gap in Sheet: passive effect installs
window Escape after DOM commit. Regression dispatches in sibling layout phase:
original code1FAIL/1PASS (close0 vs expected1), layout-effect fix2/2PASS.
Second test verifies latest callback, unrelated key, and unmount cleanup.
No browser test changes, sleeps, layout change or weakened assertion.

Root553 lint/typecheck/test/depcheck all0;1349PASS +2 existing skips.
Admin native/MSW553 builds PASS (source d351da0e + this uncommitted fix at build).
Evidence includes original red, green, root gates and build logs. No production
process cutover to553 yet: do not interrupt552 native reset or long-lived cases.
After terminal restoration, switch only owned Admin to553 and rerun original
Admin bot cases in both lanes. P5/dev promotion/PR handoff still IN PROGRESS.
