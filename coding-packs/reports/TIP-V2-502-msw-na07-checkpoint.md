# TIP-V2-502 MSW NA-07 publication/keyword-job checkpoint — IN PROGRESS

## Implemented source
- Native and MSW now reuse the same Aho–Corasick matcher and seven-keyword reason
  dictionary in shared pure modules. Native imports remain small facades; matching
  and report-mapping behavior were moved unchanged, not rewritten with substring
  loops or separate mock-specific business rules.
- Runtime persona script/reply publication queues a keyword job only after a
  successful message write. Member send uses the same post-insert hook. Duplicate
  publication/client ID does not enqueue another job; demo-history seeding does
  not replay historical publication events.
- Keyword matching caches a dictionary fingerprint, captures original matched
  text and truncates the job hit to the existing60-character contract. Later
  keyword changes affect future publications, not already queued hit payloads.
- A separate deferred mock consumer parses the real shared job schema, skips
  vanished messages and upserts one OPEN auto case per message with zero member
  reporters. Human-reported cases remain separate. Hidden stored messages retain
  their original Admin case content. No automatic hide or send suppression.
- Producer replay is deduplicated. Explicit worker delivery after resolution
  follows native open-case semantics and can create a new open case; that is not
  confused with replaying the already-consumed producer event.
- Existing Admin report-list HTTP reads pump deferred jobs before pagination.
  This exposes actual stored cases to the UI without inventing a report card or
  modifying the chat message. The current native `Hệ thống` sender fallback for
  persona reports is preserved; no new identity/business decision is inferred.

## Evidence
- New shared matcher/job cases **17/17**: NFC/case/earliest/suffix matching,
  exact reason categories, actual script and delayed reply publication, member
  hook, no automatic hide, event/worker replay, open/resolved case identity,
  keyword updates/captured hits, deleted/hidden messages, source separation,
  schema validation and reset isolation.
- New Admin HTTP cases **2/2**: script run -> stored message -> one automatic
  queue case on report GET; repeat reads stay idempotent. Keyword add/remove
  through the real MSW endpoints preserves pending hits and changes later posts.
- Focused native integration **8/8** in two files:
  `test/moderation/moderation.int.spec.ts` and
  `test/contract/moderation.int.spec.ts`. Target was verified loopback native5432
  `opchub_test`; setup forces Redis2/FakeLlm. No dev database or acceptance process
  restart. This is a focused regression, NOT the required final full integration run.
- Receipts: `evidence/v2-502/msw-na07/`. Original failures remain private, with
  sanitized copies retained: initial queue-schema import used the wrong symbol;
  a test helper's inferred object lacked optional `hiddenAt`. The helper now
  uses the actual Message type and the existing `jobs` schema export. No type
  suppression, assertion change or `onServer` branch.
- Final forced repo units **1033 passed + 2 existing storage-provider skips**:
  server203, Admin362, Portal172, shared201, UI43, integrations52. Six tasks
  executed with **zero cached**; the subsequent literal `pnpm test` reused six
  caches. Final lint8/8 (six cached), typecheck8/8 (five cached), depcheck zero
  violations: FE1531 modules/4276 dependencies and server763/3378.
  Nineteen unit/handler cases are new; the eight native cases are existing
  focused integration regressions, not eight newly authored acceptance cases.

## Remaining acceptance
- Full MSW moderation action effects/permission/audit still need verification
  and any bounded correction: generating/listing an auto case does not prove
  the legacy mock hide/warn/lock action workflow. Native action behavior was
  exercised only within the named focused integration suite, not a new browser run.
- Scheduled/auto mock work, auto-plan approval, live/cross-app transport,
  cache/metrics/demo alignment and both browser behavior lanes remain open.
- No real-provider calls, parity measurement, complete UAT/AT/LK/audit closure,
  final full native integration, acceptance-stack fresh build or dev→main PR is
  claimed. Native dev data and held 3280/3282/4020/4021 services were not modified.
- TEST-GAPS REQ-207/141/411 and UAT-15 remain partial with scoped references.
  TIP-501/502/503 and P5 remain IN PROGRESS; main remains owner-merge-only.
