# TIP-V2-520 — D-50 browser controls / rendered copy (native lane pending)

Fresh isolated MSW builds expose3 passing and2 failing legacy cases. The empty
activity assumption is obsolete once the worker actually posts seeded schedules;
the approve/reject workflow contradicts D-50. Raw failures and original source
are retained; this is a requirements-driven replacement, not a false PASS of
retired approval assertions. No onServer branch or response fulfillment is used.

Four catalog/navigation cases remain. The replacement scheduling case retains
run-count/group/history intent and strengthens actual run identity/status,
cursor/total/line snapshot, automatic first publication, no approval controls,
Stop response/terminal state and no extra cursor after65seconds (past configured
one-minute next turn). It uses the same real wall-time/UI/API assertions in both
lanes. Persona edit uses the actual POST-returned ID rather than ps-number-only
regex; create/update/delete/cancel assertions remain. UI fixture sets participants
enabled, all-day and quota20 rather than bypassing clocks or worker eligibility.

Two new AutoPanel component cases first fail for rendered approval claims, then
pass unchanged after correcting descriptions and the automatic-reply label.
No layout/pixel change. The first browser attempt503 came from an incorrect
build-time relay origin, not an authentication bug: Admin MSW must point to the
same-host Portal relay (localhost3240). Configuration diagnostic is retained.

The stronger actual-publication assertion then failed twice: enabling a disabled
seed participant alone was insufficient. Canonical all-day option was rejected
by the shared runtime parser. TIP-521 fixes that real product bug; the assertion
is retained, not changed to accept a skipped turn. See companion final evidence.
After TIP-521 the combined subset is **5/5 MSW browser PASS** (four catalog/URL
cases plus the stronger schedule/stop case, including65seconds real-time wait).
This is not the full MSW suite, native browser, Portal delivery or final UAT-15.
Final root gates shared with TIP-521: lint/typecheck/depcheck pass; forced root
units1193 pass +2 existing storage skips. See companion completion and receipts.

Native HOLD was not redeployed/reset. Read-only status finds12 pending P5
migrations on opchub_dev. Owned API4020/socket4021/Portal3280/Admin3282 and single
worker were identified; ports3100/3000/3001 were not touched. Native fresh build,
coordinated schema/process cutover and these identical browser cases are NEXT,
not marked PASS here. Full browser suite, bot-live/replies/Dashboard/emergency,
real-provider E2E, UAT/AT/LK, audit, parity and owner-review PR remain pending.
