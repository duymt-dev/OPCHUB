# TIP-V2-502 delayed MSW member replies checkpoint — IN PROGRESS

## Implemented source
- Successful real-member sends admit at most one pending reply per default room
  and one execution per source message. Duplicate client IDs return the existing
  member message without a second admission. Persona/nondefault/hidden/deleted
  triggers are excluded, as are missing/deleted groups and pre-emergency triggers.
- Admission and publication recheck feature/global/reply switches, assignment,
  Vietnamese active hours and daily quota. Eligible addressed personas outrank
  latest10 visible room speakers, followed by deterministic injected randomness.
  Hidden/cross-room legacy quotes cannot nominate an addressed persona.
- Replies have `kind=reply`, nullable script ID, one blank pending turn and a
  30s–5min deadline. A due mock worker generates the exact FakeLlm text shape,
  writes real message/execution identity, quotes the member source, advances the
  terminal cursor once and updates counts/activity. No provider/network is called.
- A 2min room cooldown considers admissions and actual prior reply publications,
  including hidden messages after terminal-thread GC and ephemeral map loss.
  Skipped-no-persona diagnostics are idempotent and cannot later replay unsolicited
  replies. The shared 30-active cap evicts only terminal history. Publication
  defers at the 30/min group gate, including other bot kinds' stored publications.
- Emergency stop now records its durable-in-runtime source-time cutoff in the
  shared mock state and terminates reply records alongside scripts. Ordinary
  flag pause retains the pending cursor and may resume; emergency stop does not.
- Admin thread/activity reads drive the existing mock tick; Portal chat GET now
  also pumps due reply work before returning fresh data. Bot replies use normal
  Portal DTOs and message-backed Dashboard openings, without simulated identity.
- Mock state/types are separate modules; legacy state/audit exports remain facades.
  No native migration/reset/restart, public environment variable or dependency.

## Evidence
- Shared admission/publication **28/28** cases: deadline endpoints, duplicate
  trigger/pending-room guards, persona priority/latest10/quote visibility, switches,
  eligibility/skip replay, topic/persona loops, cooldown/GC/cache-loss boundary,
  emergency cutoff, cap30, actual send/due publication, pause/resume, source/persona
  rechecks, burst deferral, cursor idempotency, public DTO and Dashboard identity.
- Portal HTTP workflow: idempotent member POST -> no early reply at29.999s ->
  exactly one reply at30s -> same stored ID in Dashboard -> repeated read no duplicate.
  The fake Date is explicit; this is a handler test, not browser/native E2E.
- TIP-510 separately captures and fixes three real MSW/native target-validation
  divergences. Before: three404 assertions received201; after: all four Portal
  cases pass, including the positive member-reply workflow. Original assertions
  remain unchanged; no `onServer` branch or exception to native validation.
- Final receipts live in `evidence/v2-502/msw-replies/`; original failures are
  retained privately. Full repo uncached unit results and gates are recorded there.
- Final units **1014 passed + 2 existing storage-provider skips**: server203,
  Admin360, Portal172, shared184, UI43, integrations52. All six tasks ran with
  **zero cache hits**. A subsequent literal `pnpm test` reused all six caches.
  Lint8/8 and typecheck8/8 (six cached each); depcheck zero violations,
  FE1524 modules/4245 dependencies and server761/3373. This checkpoint adds32
  cases total:28 shared, one positive Portal workflow, three TIP-510 regressions.

## Remaining full P5 scope
- Full scheduled/auto-generation mock execution (P5-PLAN-01 remains unapproved),
  NA-07 moderation side effects, metrics/cache alignment, live/cross-app transport
  and native/mock demo alignment remain open. The engine feature flag defaults
  true; complete app/mock-bootstrap environment/precondition wiring still needs
  acceptance. Fresh HTTP reads are not proof of open-room realtime propagation.
- This synchronous mock fake-output formatter is not a real adapter/network
  invocation, and these tests are not proof of the supplied provider E2E path.
- Neither browser lane, full native integration rerun, real-LLM worker/browser
  E2E, complete UAT/AT/LK/audits nor final parity was run in this checkpoint.
  Existing native acceptance processes/data were not modified.
- UAT-14 and REQ-141/411 stay partial with actual source/test references, not
  final PASS. TIP-501/502/503, final reports, dev integration and the owner-reviewed
  dev→main PR are still required; main has not been merged or pushed by the agent.
