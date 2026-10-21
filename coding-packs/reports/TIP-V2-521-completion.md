# TIP-V2-521 — Canonical all-day activity window

## Reproduction / fix
The browser scheduling case reached cursor1 but actual activity was “Bỏ lượt1”
despite saving participants enabled, all-day and quota20. Its publication/log
assertion stayed red; no skipped-turn outcome was accepted. Shared parser accepts
numeric windows only, although the actual persona form offers “Cả ngày”.

Six new positive shared cases fail before the fix; five negative controls pass.
The one-line correction recognizes only the exact trimmed canonical option,
after invalid-Date guard. Unknown text still fails closed; numeric/overnight/
start-inclusive/end-exclusive rules remain unchanged. Both native and MSW use
this same pure runtime function. No SQL/index/schema/provider changes.

## Evidence / qualification
Shared11/11 and existing native unit hours/auto-plan/reply-pick35/35 pass. Focused
native worker/reply16/16 pass, including a new real DB runner all-day publication
and idempotent replay. Original pause/resume assertion still requires zero
messages while paused. An initial added test left its message behind after
deleting its thread, causing that unchanged zero assertion to fail; exact fixture
message cleanup before thread removal fixes test isolation. The diagnostic is
retained, not hidden or “fixed” by weakening the old assertion.

Combined current MSW browser subset **5/5 PASS**, including real-time65second
post-Stop deadline check and the unchanged actual-publication activity assertion.
Final root lint8/8 and typecheck8/8 pass (seven cached each). Forced root units
**1193 passed +2 existing storage skips**, six tasks/zero cached: shared280,
Admin435, Portal180, server203, UI43, integrations52. Depcheck zero violations
(FE1581 modules/4512 dependencies; server768/3400). Sanitized failures/final gate
and browser receipts are in evidence/v2-520/ and evidence/v2-521/.
Strict typecheck also caught nullable Prisma JsonValue in the added fixture's
settings restore; parsing the existing required bot settings schema removes that
ambiguity without a cast or ignored diagnostic. Final native16/16 is after both
cleanup/type corrections; the initial diagnostics remain in the receipts.
Historical full integration1304 at8414500f predates this change; do not claim it
as a fresh all-day full suite. Native browser/full P5 acceptance remains pending.
No dev migrations/reset/process restart/provider call performed this checkpoint.

## Owner decision
P5-PLAN-01 is now explicitly approved:3–4 automatic turns, opener returns to
close. Requirements matrix and automatic checkpoint reflect the owner's direct
answer; this does not by itself prove automatic MSW or browser implementation.
