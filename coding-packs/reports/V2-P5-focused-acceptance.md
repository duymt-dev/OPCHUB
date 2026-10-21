# P5 focused spec/behavior acceptance — IN PROGRESS

Owner clarification2026-10-21: test spec and behavior of P5 itself. Do not
expand into registration/payment/affiliate/events unless a direct P5 dependency
requires it. Earlier503 broad matrix remains historical evidence, not grounds
to keep expanding this current bot acceptance task. No overall V2 PASS claimed.

Current source scope: TIP501/502, D50/D51, NA07/08, UAT14/15, LK11/REQ411;
bot action permissions/audit and FakeLlm error handling. Keep native hold,
fake providers, explicit-path commits and dev-to-main owner-review PR rule.

Existing browser files collected by Playwright: admin-bots(4), bot-scheduling(1), bot-auto(1),
bot-auto-lifecycle(1), bot-replies(1):8 cases. Initial title-only scan missed one
multiline admin-bots declaration; the actual runner inventory corrects that count.
Their names alone do not prove
all acceptance; emergency-stop/hide cross-app browser coverage is still to
be verified/added, not inferred from backend integration reports.

Next: run these8 both lanes; map actual assertions and integration evidence to
501/502 criteria; add missing bot-only cases. Keep originals and report exact
counts. Unit/integration negative rules must not be replaced by only happy
browser flows. No pixel adjustments before these functional gates.

## Current measured evidence (TIP548)

Existing8 E2E PASS on both lanes; additional emergency/hide1PASS MSW/native
pending. Fresh integration106/106 in23files PASS (see548 report and receipts).
Coverage anchors for requirement reconciliation, not a final completion claim:

| P5 contract | Native integration anchors | Browser anchor |
|---|---|---|
| Due schedule, pause/resume, daily quota, time windows | bot-scheduler, bot-worker, bot-queue-deadline | bot-scheduling |
| Auto3–4 turns, opener closes, real context, idempotency | bot-auto-admission, bot-generation, execution-fields | bot-auto, bot-auto-lifecycle |
| Member reply, eligibility, cooldown, one trigger, no loops | bot-reply, bot-reply-context/storage/worker | bot-replies |
| NA07 and atomic publication/retention | persona-publication, persona-turn, bot-retention | Integration remains primary negative evidence |
| Emergency stop, in-flight fencing, outbox, permissions/audit | bot-emergency, bot-pending-cleanup | bot-emergency PASS both lanes |
| Hide live, human preservation, small/large socket batch | bot-hide, bot-hide-storage | bot-emergency PASS both lanes |
| Dashboard source/privacy and expiry | dashboard bot-threads/storage/thread-clock | bot-auto-lifecycle |
| Provider failure/unsafe text and retry fencing | bot-generation; adapter unit evidence still to reconcile | Not inferred from a happy reply |

Remaining: close native emergency browser result, reconcile exact501/502
criteria against these assertions, P5-screen parity and clean dev/owner PR.

## TIP549 closure

Native emergency/hide now PASS1/1, restored=true: both lanes9 passing cases
across separate8+1 runs. Provider failure integration2/2 and adapter unit27/27
PASS. See TIP-V2-549-completion.md and evidence/v2-549-bot. Earlier pending
statements above are historical; P5 parity/reconciliation/dev PR remain open.
