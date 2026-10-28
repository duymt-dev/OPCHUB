# TIP-V42-713 — implementation checkpoint (not completion)

Branch: `feature/TIP-V42-713-bot-workflows`, stacked on 712. Goal remains active; proceed without asking owner at checkpoints. Q-V42-713-1 records the safe global-pause interpretation.

## Committed and pushed

- `81e883ff`: TIP and question; scope manifests expanded before each subsequent stage.
- `023c537a`: persisted VN schedule API, shared date policy, admission/draft/publication fences. Missing setting is live; malformed state fails closed. Pause retains pending cursor; clearing dates does not resume pause. Permission/audit/validation covered.
- `97211f0d`: reply contracts, exact second cadence helper, atomic 12/group +60/system rolling Redis budget. **Budget is registered but not yet wired into publication.**
- `cc48b904`: durable bounded reply-run storage, public Chat candidate-scan port with latest-N-before-filter, top-ten/eight-preview projection. **Run storage/scan are not yet wired into a reply controller or scheduler.**
- `46655576`: completes that runtime wiring: permissioned settings/scan/current/stop API, 20s automatic scan, durable outbox-driven per-message progression, same-group enabled persona policy, second-based cadence, actual publication 12/60 budget, pause/stop/emergency fences and generation-failure advancement/retry. Automatic off stops new scans but an admitted run continues (Q-V42-713-2).
- `9edf944e`: GET reply overview with actual latest100 message history, top10 groups/8 previews and current persona counts. Partial covering history index and deferred join; no synthetic history or dependency on retained30 threads.

## Actual verification

Logs: `.git/codex-v42-713/` (local, not committed).

| Stage | Verification |
|---|---|
| Schedule | full lint8 tasks, typecheck8 tasks, unit1701 passed +2 skipped; focused native7 passed; full existing bot integration98 passed across21 files (`stage1-bot-regression.log`) |
| Reply contracts/budget | full lint8, typecheck8, unit1720 passed +2 skipped; real Redis4 passed (`stage2a-native.log`) |
| Scan/storage | full lint8, typecheck8, unit1720 passed +2 skipped; native scan3 passed, DB migration13 passed |
| Query plan | 10,000 wide message rows; latest-N Index Only Scan on `messages_room_id_created_at_id_idx`, deferred PK body fetch, reply anti-join using `messages_bot_reply_trigger_key`; no Seq Scan on messages. Measured1.175ms; small groups table sequential scan is expected. |
| Live runtime/compatibility | full lint8, typecheck8, unit1723 passed +2 skipped; complete bot integration112 passed/24 files (`stage2d-bot-regression.log`); actual worker HTTP-stub pipeline proves5000ms deadline and keyword moderation. Seven obsolete assertions were replaced according to explicit D-112 changes, not loosened. |
| Overview/history | focused native11 passed/2 files after history changes; full lint8/typecheck8/unit1723+2skip pass (`stage2e-*`); depcheck passed2080 modules/6082 dependencies and944 modules/4348 dependencies. History EXPLAIN with10,000 wide replies plus10,000 sources uses `messages_bot_reply_history_idx`, no messages Seq Scan,1.025ms. |

Create-only migration `20261028162355_v42_bot_reply_run` reviewed to remove unrelated generated index drops/recreation, deployed to native `opchub_dev` and `opchub_test`, Prisma client regenerated. It adds only reply-run metadata and constraints; no existing chat content changes.
History migration `20261028165010_v42_bot_reply_history` likewise create-only/reviewed/deployed to both native databases. Initial history test hit30s due to per-row FK checks while deleting20,000 fixture rows, also contaminating the following history assertion/teardown. Bulk fixture now runs inside a savepoint and rolls back after unchanged assertions/EXPLAIN;11/11 rerun passed without raising timeouts. Precisely identified leftover test-only rows/groups were removed; no dev data was deleted.

## Next work — do not mark TIP complete

1. Rotate enabled scripts per free group without requiring runAt; respect1–60 minute spacing, replace old five-minute cap and adjust explicitly superseded tests under D-112. Append exact manifest before edits. Consider durable per-group rotation cursor so one busy group cannot starve a script in another group; preserve explicit future runAt scheduling and global30 slots. Worker currently concurrency1, so actual cross-group parallel generation still needs wiring/verification.
2. Persistent conversation types, real-AI bulk generation/deduplication/selected save. No fake templates or paid-provider calls in automated tests.
3. Admin schedule/reply/bulk UI, MSW boundaries, identical native behavior assertions, parity and full gates; then completion report and714/M4/final acceptance. No new UI, full713 integration/build/browser/parity gates have been claimed yet.

Native HOLD processes unchanged. New713 migrations were applied while services remained running; do not restart/kill protected4000/4001/worker. Existing API4041 serves712 build, not713. No source secrets/env edits.
