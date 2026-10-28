# TIP-V42-713 — implementation checkpoint (not completion)

Branch: `feature/TIP-V42-713-bot-workflows`, stacked on 712. Goal remains active; proceed without asking owner at checkpoints. Q-V42-713-1 records the safe global-pause interpretation.

## Committed and pushed

- `81e883ff`: TIP and question; scope manifests expanded before each subsequent stage.
- `023c537a`: persisted VN schedule API, shared date policy, admission/draft/publication fences. Missing setting is live; malformed state fails closed. Pause retains pending cursor; clearing dates does not resume pause. Permission/audit/validation covered.
- `97211f0d`: reply contracts, exact second cadence helper, atomic 12/group +60/system rolling Redis budget. **Budget is registered but not yet wired into publication.**
- `cc48b904`: durable bounded reply-run storage, public Chat candidate-scan port with latest-N-before-filter, top-ten/eight-preview projection. **Run storage/scan are not yet wired into a reply controller or scheduler.**

## Actual verification

Logs: `.git/codex-v42-713/` (local, not committed).

| Stage | Verification |
|---|---|
| Schedule | full lint8 tasks, typecheck8 tasks, unit1701 passed +2 skipped; focused native7 passed; full existing bot integration98 passed across21 files (`stage1-bot-regression.log`) |
| Reply contracts/budget | full lint8, typecheck8, unit1720 passed +2 skipped; real Redis4 passed (`stage2a-native.log`) |
| Scan/storage | full lint8, typecheck8, unit1720 passed +2 skipped; native scan3 passed, DB migration13 passed |
| Query plan | 10,000 wide message rows; latest-N Index Only Scan on `messages_room_id_created_at_id_idx`, deferred PK body fetch, reply anti-join using `messages_bot_reply_trigger_key`; no Seq Scan on messages. Measured1.175ms; small groups table sequential scan is expected. |

Create-only migration `20261028162355_v42_bot_reply_run` reviewed to remove unrelated generated index drops/recreation, deployed to native `opchub_dev` and `opchub_test`, Prisma client regenerated. It adds only reply-run metadata and constraints; no existing chat content changes.

## Next work — do not mark TIP complete

1. Append exact stage2c manifest before edits. Implement reply settings/overview/manual scan/stop API, durable run coordinator/progress, 20s automatic scan and second-based continuation. Connect rate guard at publication, not generation; wire actual same-group enabled-persona policy and D-112 removal of hour/quota/cooldown restrictions for replies only.
2. Keep existing one-pending-reply-per-room and one-simulated-reply-per-trigger DB invariants. Run progression must be atomic with publication; current-thread identity must survive terminal thread retention. Manual run works with auto-off, not with global pause. Handle failed generation without fake replies or permanently stuck progress.
3. Rotate enabled unscheduled scripts per free group; respect1–60 minute spacing, replace old five-minute cap and adjust explicitly superseded tests under D-112.
4. Persistent conversation types, real-AI bulk generation/deduplication/selected save. No fake templates or paid-provider calls in automated tests.
5. Admin schedule/reply/bulk UI, MSW boundaries, identical native behavior assertions, parity and full gates; then completion report and714/M4/final acceptance. No new UI, full713 integration/build/browser/parity gates have been claimed yet.

Native HOLD processes unchanged. New713 migrations were applied while services remained running; do not restart/kill protected4000/4001/worker. Existing API4041 serves712 build, not713. No source secrets/env edits.
