# TIP-V2-502 MSW emergency/visibility checkpoint — IN PROGRESS

## Current implementation
- MSW implements `POST /admin/bot/emergency-stop` and
  `POST /admin/bot/hide-messages` with shared contracts and real permission-key
  checks. Missing/invalid mock sessions return 401; missing `bots.action` returns
  403 before mutation or audit. The existing Affiliate guard was moved unchanged
  into a domain-neutral helper, retaining its old export as a one-line facade.
- Stop does not tick the mock worker first: all scheduled/running records become
  terminal with `nextAt=null`, `enabled=false`, and historical records/settings
  remain intact. Re-enable does not revive those records. Repeated explicit stop
  returns zero and records another audit, consistent with the native contract.
- Hide only touches previously visible simulated messages in eligible groups;
  duplicate group IDs do not double count, humans and original Admin content are
  preserved. Both operations record actor/action in the Bot audit and shared
  Admin audit/activity-log state, including successful zero-count actions.
- Hide JSON is parsed strictly. Null, arrays, empty group selections, unknown
  properties, oversized group lists, missing bodies and malformed JSON cannot
  silently become `{}` and accidentally request global hide.
- Portal mock history filters hidden rows before cursor pagination/search.
  Room previews choose the last visible message; pins/files exclude hidden rows.
  Private quote references allow existing and subsequently sent member replies
  to suppress hidden-source previews without exposing those IDs or simulated
  identity. Direct hidden-message DTO mapping also masks body/attachments,
  reactions and pins; Admin history still retains body plus `hiddenAt`.
- These changes are mock/client-contract code only: no SQL, native migration,
  demo-data reset, service restart, external provider call or dependency addition.

## Evidence
- New Admin handler cases **13/13**; focused cohort **28/28** in three files
  (13 new + 7 existing bot + 8 existing Affiliate contract cases).
- New shared chat-visibility cases **4/4**: pre-pagination filtering, Admin
  original-content retention, room/pin/file previews, old/new member quotes,
  masked DTOs and D-48 private-field exclusion. **17 new cases** in this checkpoint.
- Final repo units **968 passed + 2 existing storage-provider skips**:
  server203, Admin360, Portal166, shared144, UI43, integrations52.
  Six tasks successful, five cached. Lint8/8 (7 cached), typecheck8/8 (7 cached).
  Depcheck: zero violations; FE1505 modules/4153 dependencies, server761/3373.
- Receipts: `evidence/v2-502/msw-emergency/`. Private originals remain intact.
  Initial failures retained: fixture omitted parsed `mentions`; an unsafe
  asymmetric timestamp matcher violated lint; replacing it with exact time
  exposed a wall-clock millisecond race. Fixtures now include `mentions` and
  freeze Date deterministically, keeping the exact timestamp assertion. No
  existing assertion was removed, relaxed or branched on `onServer`.

## Remaining full scope (not a completion report)
- MSW auto/member-reply scheduling, Dashboard real-message identity/feed and
  seed/demo alignment still need implementation and acceptance. The historical
  Dashboard mock still derives discussions from seed scripts, not live messages;
  its response to hide is NOT accepted by this checkpoint.
- MSW has no Socket.IO push channel and each browser runtime owns separate mock
  state. Cross-app state propagation/open-room invalidation still needs a tested
  mock bridge/transport; hidden-content read tests are not a claim of live browser
  propagation. Neither MSW nor native browser E2E was run in this checkpoint.
- Full native integration rerun, real-provider browser/worker E2E, UAT/AT/LK,
  C1–C6/browser audits, fresh builds/demo and registry parity remain pending.
  Existing native stack is held unchanged. P5-PLAN-01 approval remains open.
- `TEST-GAPS` REQ-141 stays **MỘT PHẦN** with these actual additional source/test
  references. TIP-501/502/503 and P5 are not DONE; dev→main PR is not yet ready.

Next: align complete mock bot execution/Dashboard/demo state and its live
transport, then run the same browser assertions on MSW and the fresh native stack
before parity work. The full goal and owner-only main merge rule are unchanged.
