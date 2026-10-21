# TIP-V2-502 ? IN PROGRESS (member-reply checkpoint)

## Implemented
- A new real-member default-room message writes chat.member_sent in the SAME
  transaction as message insertion. Duplicate clientMsgId does not create another
  event. This is a durable equivalent of a sent hook: existing onSent/NA-07 hooks
  remain unchanged, and a failed process between commit/enqueue cannot lose the
  reply request. Only IDs cross outbox/BullMQ; worker reads current state.
- BotProcessor handles bot.reply; BotReplyService gates FEATURE_BOTS, enabled,
  replyToMembers, visible/nondeleted member messages, default/live groups and
  eligible personas. A Chat public port supplies context and indexed selectors;
  no circular Chat -> Bot dependency or direct recipient fan-out query is added.
- Selection prioritizes a directly addressed eligible persona, then speakers in
  the latest 10 messages, then another eligible persona. Assignment, Vietnamese
  activity hours, enabled and actual remaining daily quota are enforced. An
  idempotent diagnostic records a no-persona skip; replay cannot later turn that
  same skipped request into an unsolicited reply.
- One scheduled reply per room, one reply per trigger. Redis cooldown is backed
  by durable admission/actual-post timestamps; it survives Redis loss and thread
  GC. The final partial UNIQUE messages(reply_to_id) invariant remains even when
  a reply was hidden/soft-deleted or its thread was pruned.
- Reply waits 30s-5m, generates one adapter turn with bounded history and replies
  to the actual member message. A changed reply switch pauses before LLM use;
  hidden/deleted trigger skips posting. Persona publication still runs NA-07.
  Persona identity remains indistinguishable on Portal.
- Reviewed additive create-only migration adds internal reply_room_id, unique
  active-room and indexed cooldown selectors, message trigger uniqueness and
  enabled-persona assignment GIN. Preflight found zero duplicate reply triggers;
  no silent deduplication. Only loopback 5432/opchub_test was migrated; dev and
  native demo services were not changed.

## Verified evidence
- **14** direct native reply cases: real HTTP/outbox idempotency, concurrent
  admission, actor identity, addressed-vs-recent preference, bounded history,
  global/reply/feature switches, nondefault room and persona-loop negatives,
  disabled/unassigned/out-of-hours/quota cases, cooldown boundaries after Redis
  loss/thread GC/deleted history, pause/resume, trigger hide/delete.
- **2** native storage cases: pending-room/message-trigger database invariants;
  EXPLAIN ANALYZE BUFFERS with 10,001 wide threads, messages and persona fixtures.
  Four selectors use covering Index Only Scan plans (visibility heap fetches are
  disclosed), assignment uses GIN Bitmap Index Scan; no Seq Scan or planner flags.
- **1** separate actual-worker pipeline: HTTP -> outbox -> BullMQ reply admission
  -> real deadline -> LLM turn -> publication/keyword worker -> report. No fake
  clock/business service override: actual scheduled delay **69,154ms**, one persona
  reply, one automatic persona report, no public simulated identity fields.
  Provider was **FakeLlm**, not the private real endpoint.
- Broader current native bot/chat/membership/join-request regression **81/81 in
  15 files**, excluding that long worker case already run separately. This is not
  the full repository integration gate. Repo unit gate **935 passed + 2 existing
  skips** (server 203, Admin 334, Portal 163, shared 140, UI 43, integrations 52).
  Lint/typecheck/depcheck pass; cache/task counts and warnings are retained.
- Raw failures are preserved: initial public reply preview fixture incorrectly
  expected an ID rather than the existing name/text contract; login fixtures hit
  auth throttling after ten logins; immutable Env needed an explicit disabled
  service fixture; a JSONB SQL bind needed a text cast; fixture conversion required
  class-scoped fields; worker test needed the ChatCoreModule export. None were
  fixed by weakening production guards, cooldowns or existing packet assertions.
- The broader regression also exposed three missed legacy PubSub test subscribers
  from TIP-504. Its follow-up updates channel names only and retains packet counts.
- Evidence: evidence/v2-502/replies/; legacy subscriber follow-up in evidence/v2-504/.

## Remaining / not accepted yet
Emergency-stop Admin UI/browser, hide-messages + realtime reload, real Dashboard thread feed,
Admin controls/MSW behavior, updated bot-live browser cases on BOTH lanes,
real-provider native browser E2E, stable full integration, audits/UAT/AT/LK and
parity remain open. No TIP-502 or P5 DONE is claimed. TIP-501's proposed auto
conversation turn-count confirmation also remains pending. No main merge/push;
final delivery stays owner-reviewed dev -> main PR after full P5 evidence.

## Completion-clock refinement and final checkpoint evidence

Source review also found that production time was sampled before the provider
returned. TIP-507 fixes posting/spacing/window checks using completion time;
two additional generation regressions pass. Latest generation/reply/storage
cohort **25/25 in 3 files**; broader **81/81 in 15 files** above was run before
this final scoped timing refinement, not an immutable full-suite acceptance run.
Latest repo gates remain 935 + 2 existing skips, lint/typecheck/depcheck green.
New reply fixtures use checked values instead of non-null assertions; initial
failures and all receipts remain retained. No emergency/hide/Dashboard/browser or
real-provider acceptance is inferred from this checkpoint.

## Emergency-stop backend checkpoint (still not TIP-502 completion)

See [emergency checkpoint](TIP-V2-502-emergency-checkpoint.md) for source,
native race/queue/rollback coverage and retained raw failures. Emergency stop
now has a permission-checked/audited HTTP endpoint, terminal transitions under
the execution lock and durable pending-job cleanup. Old member requests remain
fenced after re-enable/Redis loss; late cleanup preserves new accepted work.
Ordinary pause/resume retains the existing worker contract and assertions.
Hide, Dashboard and Admin/browser acceptance remain open; no P5 DONE is claimed.

## Hide/open-room backend checkpoint (still not TIP-502 completion)

See [hide checkpoint](TIP-V2-502-hide-checkpoint.md): audited scoped/global bulk
hide, durable <=200 masked updates / >200 room reloads, late-publication fence,
hidden Admin history label and Portal cache invalidation are implemented. Native
socket, indexed SQL and Portal cache tests provide scoped evidence. Dashboard,
Admin bot controls/MSW and both browser behavior lanes still require work; the
new checkpoint does not supersede the full remaining acceptance scope above.

## Real Dashboard conversation checkpoint (still not TIP-502 completion)

See [Dashboard checkpoint](TIP-V2-502-dashboard-checkpoint.md). Runtime writes now
persist private per-room opening/turn identity, with first-success/GC/deletion
handling. A latest50 keyset feed, indexed response preview/count and cache10s
replace the old trending selector. Epoch/CAS invalidation covers bot publication
and bot-hide, including stale-reader races. Scoped native cases/SQL plans are
recorded there; Admin controls/MSW/seed alignment and browser acceptance remain
open. TIP-509 preserves existing prune behavior after adding the identity index.

## Admin emergency controls checkpoint (still not TIP-502 completion)

See [Admin controls checkpoint](TIP-V2-502-admin-controls-checkpoint.md): confirmed
stop/scoped/global hide controls, permission/pending/duplicate/error guards,
settings/stop request ordering and cache refresh now have 13 scoped hook/component
regressions. MSW handlers/full mock-state alignment, seed/demo, actual browser
lanes and parity remain open. This source checkpoint did not rebuild/restart the
native acceptance stack or call the supplied real provider.

## MSW emergency/hidden-read checkpoint (still not TIP-502 completion)

See [MSW emergency checkpoint](TIP-V2-502-msw-emergency-checkpoint.md): the two new
Admin endpoints now enforce authentication/permission, strict hide input,
terminal stop/idempotent hide and actor audit. Portal mock history, room/pin/file
previews and member quotes exclude hidden content while Admin retains originals.
Seventeen new handler/read-boundary cases pass. Complete auto/reply/Dashboard
mock-state/seed alignment, cross-app/live propagation and both browser lanes are
still open; these scoped tests do not establish full MSW or native acceptance.

## Message-backed MSW Dashboard checkpoint (still not TIP-502 completion)

See [MSW Dashboard checkpoint](TIP-V2-502-msw-dashboard-checkpoint.md): the mock
feed now selects actual stored opening messages, with private identity, real
demo history, first-successful per-room publication, latest50/keyset/visibility,
reply union/preview and GC/persona fallback. Twelve new shared and two Portal
HTTP cases cover those boundaries. Complete auto/reply/NA-07/metrics/cache/live
mock transport, native demo alignment and actual browser acceptance still remain
open; this does not establish full P5 readiness or waive new parity differences.

## Delayed MSW member-reply checkpoint (still not TIP-502 completion)

See [MSW replies checkpoint](TIP-V2-502-msw-replies-checkpoint.md): actual member
sends now admit delayed persona replies with source/room/idempotency/cooldown,
persona priority, hours/quota/switch/retention/emergency gates and fresh due-time
rechecks. Twenty-eight shared regressions and a Portal HTTP send/deadline/chat/
Dashboard workflow cover these boundaries. TIP-510 repairs independently exposed
MSW reply-target validation drift without changing the native contract. Auto,
NA-07, metrics/cache/bootstrap/live bridge, full native/demo/browser/real-provider
acceptance and parity remain open. No provider calls or native changes here.

## MSW NA-07 publication/job checkpoint (still not TIP-502 completion)

See [MSW NA-07 checkpoint](TIP-V2-502-msw-na07-checkpoint.md): native and mock
reuse the matcher/reason dictionary; real mock persona/member publications queue
deferred, contract-validated keyword jobs with automatic-case deduplication and
no automatic hide. Seventeen shared and two Admin HTTP regressions pass, plus
focused native moderation8/8 after the pure-helper move. Legacy mock moderation
actions, auto/scheduler/live/cache/metrics/demo alignment, browser lanes and final
P5 acceptance remain open; case generation/listing is not full NA-07 UAT closure.

## Scoped moderation-hide contract refinement

[TIP-511](TIP-V2-511-completion.md) repairs reproduced MSW/native hide, read/write
permission, case-link/transition, audit and case-insensitive keyword differences.
Nineteen new HTTP/shared cases cover those boundaries; hidden reported demo
messages now match native history instead of existing only as detached cards.
Human warn/lock account/notification effects and open-room/live/browser acceptance
remain unproven; this does not close full NA-07 or the remaining P5 deliverables.

## Scheduled MSW script admission / live spacing checkpoint

[TIP-513](TIP-V2-513-completion.md) adds native-compatible due-script ordering,
one-shot/rearm checkpoints, shared manual admission, active dedupe/terminal-only
retention and live script spacing. Seven original failures are retained; expanded
shared13/13 and actual Admin HTTP2/2 pass, forced root units1067 +2 existing skips.
Auto plan/limits/metrics/live bridge, legacy bot CRUD/run/stop RBAC/audit and human
moderation effects remain open. The full native1300/1300 receipt belongs to the
preceding TIP-512 checkpoint, not a browser or real-provider acceptance claim.

## Bot permission / successful-command audit checkpoint

[TIP-514](TIP-V2-514-completion.md) replaces unauthenticated legacy bot handlers
with native permission-key boundaries and successful-command actor/ID audit.
Seventeen original failures are unchanged; expanded HTTP54/54 covers read/write
guards, current grants, CRUD/settings/run/stop, replay and negative byte/validation/
status contracts. Catalog storage/avatar/cascade alignment, auto/limits/live bridge,
human moderation and final dual-browser/real-provider acceptance remain open.

## Shared posting limits and Vietnamese-day activity checkpoint

[TIP-515](TIP-V2-515-completion.md) aligns scripted destinations, durable daily
quota and shared per-group burst admission with native behavior, and fixes
script/reply todayCount across Vietnamese midnight while preserving all-time
postCount/history. Six original failures remain unchanged; expanded shared14/14
plus two HTTP workflows cover cache loss, retention, multi-room atomic deferral
and day boundaries. Auto/business-plan approval, catalog storage/live bridge,
human moderation and full browser/real-provider acceptance are still open.
