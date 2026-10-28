# TIP-V42-713 — implementation checkpoint (not completion)

Branch: `feature/TIP-V42-713-bot-workflows`, stacked on 712. Goal remains active; proceed without asking owner at checkpoints. Q-V42-713-1 records the safe global-pause interpretation.

## Committed and pushed

- `81e883ff`: TIP and question; scope manifests expanded before each subsequent stage.
- `023c537a`: persisted VN schedule API, shared date policy, admission/draft/publication fences. Missing setting is live; malformed state fails closed. Pause retains pending cursor; clearing dates does not resume pause. Permission/audit/validation covered.
- `97211f0d`: reply contracts, exact second cadence helper, atomic 12/group +60/system rolling Redis budget. **Budget is registered but not yet wired into publication.**
- `cc48b904`: durable bounded reply-run storage, public Chat candidate-scan port with latest-N-before-filter, top-ten/eight-preview projection. **Run storage/scan are not yet wired into a reply controller or scheduler.**
- `46655576`: completes that runtime wiring: permissioned settings/scan/current/stop API, 20s automatic scan, durable outbox-driven per-message progression, same-group enabled persona policy, second-based cadence, actual publication 12/60 budget, pause/stop/emergency fences and generation-failure advancement/retry. Automatic off stops new scans but an admitted run continues (Q-V42-713-2).
- `9edf944e`: GET reply overview with actual latest100 message history, top10 groups/8 previews and current persona counts. Partial covering history index and deferred join; no synthetic history or dependency on retained30 threads.

- `2ead530e`: per-group enabled-script rotation without required runAt, durable UUIDv7 cursor, 30-slot admission/retention, GIN group candidate IDs then deferred payload load, worker concurrency4. Optional generated conversations alternate after a stored script instead of starving; Q-V42-713-3 records null/past/future scheduling semantics.

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

### Rotation verification and corrections

- Full bot integration **119 passed /27 files**, `stage2f-bot-regression-rerun.log`, before the final optional-AI alternation addition. After that addition: focused **17 passed /6 files**, `stage2f-final-native.log`. Final UUIDv7 cursor bulk-write adjustment: **8 passed /2 files**, `stage2f-cursor-final.log`.
- Final full lint8/typecheck8/unit1723+2skip passed (`stage2f-lint/types/unit.log`). Depcheck passed2080/6082 and951/4383 modules/dependencies.
- Actual BullMQ worker + local HTTP barrier proves two independent groups reach the provider **before either response is released**, both publish one actual message; duplicate cursor cannot make a third request/publication. No mocked Prisma/business provider, no paid AI.
- Rotation: racing ticks, independent groups, busy-group exclusion, wrap, script deletion, thread retention, future runAt, disabled/global pause, missing default room/deleted group, max30 slots, outbox and unique group cursor verified. Old consumed-once scheduler/worker assertions explicitly replaced by D-112 rotating behavior; original cursor idempotency remains asserted.
- Create-only/reviewed/deployed dev+test migrations `20261028171417_v42_bot_rotation` and `20261028172358_v42_bot_rotation_index_cleanup`. Unrelated generated index changes removed; first applied migration never rewritten. Second drops the unused ordered-ID index and makes read-heavy script GIN updates immediate.
- Initial query used ordered-PK filtering across unassigned groups:877–935ms. Rewritten to GIN group seek + two-part top-N cursor/wrap ordering; final10000 wide scripts EXPLAIN **10.520ms** (repeat11.593ms), no Seq Scan on bot_scripts. Only selected ≤30 payloads loaded after slot reservation.
- Initial fixture tried soft-deleting a default room;709 correctly rejected it. Fixture now removes its empty test-only room to test the missing-room fence. Refactoring the fixture to a class exposed stale local references/type errors; fixed, no lint suppression or timeout/assertion weakening.
- Repeated initial8000-future-row rollback fixtures bloated the old scheduled index to188 pages for0 live indexed rows; legacy EXPLAIN correctly failed on a Seq Scan. Test-only maintenance rebuilt **only `opchub_test.bot_scripts_schedule_due_idx`**, then VACUUM/ANALYZE; index1 page, original legacy assertions pass unchanged. Final stress fixture still has10000 wide scripts, now9999 eligible plus1 future (more candidates to rank, no needless8000-row pollution of the unrelated scheduled index). No dev index/data maintenance was performed.

## Next work — do not mark TIP complete

1. Respect1–60 minute script/auto spacing: replace old five-minute cap, update strict input ranges and explicit superseded timing tests. Append exact manifest first. Existing persisted61–120 minute settings need a safe documented migration to the approved range; no silent worker parse failure. Server rotation/concurrency is implemented, but MSW rotation/reply workflow changes are still pending with UI.
2. Persistent conversation types, real-AI bulk generation/deduplication/selected save. No fake templates or paid-provider calls in automated tests.
3. Admin schedule/reply/bulk UI, MSW boundaries, identical native behavior assertions, parity and full gates; then completion report and714/M4/final acceptance. No new UI, full713 integration/build/browser/parity gates have been claimed yet.

Native HOLD processes unchanged. New713 migrations were applied while services remained running; do not restart/kill protected4000/4001/worker. Existing API4041 serves712 build, not713. No source secrets/env edits.
