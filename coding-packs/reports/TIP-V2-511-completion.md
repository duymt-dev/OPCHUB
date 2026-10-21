# TIP-V2-511 completion — scoped MSW moderation hide/permission/audit correction

## Verified correction
- Five HTTP failures reproduced before editing: hide returned200 but did not hide
  the source; unauthenticated report/keyword reads200; view-only writes200;
  native-citext duplicate keyword201. These original assertions are retained.
- Report and keyword handlers are now independent of mixed legacy content/group
  handlers and enforce native canonical `groups.view`/`groups.moderate` keys before
  parsing/mutation. Report action response is the native shared schema, without
  the old mock-only `action` property. Invalid IDs/state/input return404/409/400.
- Private report→message links are shared by auto and member-reported cases.
  Hide masks only the exact linked message, closes its other open cases, preserves
  content/timestamps already hidden and does not touch same-body unrelated cases.
  Dismiss resolves only the selected case and never hides the message.
- Mutations record exact action/target/actor once and appear in Admin activity
  logs. Audit storage is extracted behind the old facade to eliminate dependency
  cycles; new machine audits now use the actual request/test clock rather than
  the historical fixture constant. Keyword add/remove uses native-compatible
  case folding and retains literal `%`/Unicode words without double URI decoding.
- Historical cases now reference real `rpt-<id>` hidden messages, matching native
  `packages/db/seed/demo/chat.ts`, including the original hide timestamp. Admin
  history retains their bodies; Portal reads exclude them. Seeding emits no jobs.

## Evidence
- Before: **5/5 HTTP cases failed**. After: expanded HTTP **13/13** and shared
  identity/audit **6/6** pass. Initial mixed-handler regression cohort29/29.
- Final forced repository units **1052 passed + 2 existing storage skips**:
  server203, Admin375, Portal172, shared207, UI43, integrations52; all six tasks
  executed uncached. Literal `pnpm test` confirmation reused all six caches.
- Lint8/8, typecheck8/8 (six cached each). Depcheck zero violations:
  FE1538 modules/4309 dependencies and server763/3378.
- Two existing Admin HTTP suites now provide their legitimate Admin token as
  an explicit precondition; none of their assertions/expected values changed.
  Unauthenticated/view-only behavior has separate strict negative cases.
- `evidence/v2-511/`: sanitized before/after/expanded/full receipts. Original raw
  failures remain private, including initial unused imports after audit extraction.
  No rule suppression, relaxed assertion or `onServer` branch.

## Not full P5 acceptance
- No native behavior/schema/process/data change or provider call. Previous
  focused native8/8 is not a new run or a full integration claim for this change.
- Human warn/lock notification/session/account effects and ghost-account demo
  alignment are outside this bounded correction and still require acceptance.
  These are not declared fixed by the generic permission/audit tests.
- Full auto/scheduler/live/cross-app/cache/metrics/demo alignment, both browser
  lanes, real-provider E2E, UAT/AT/LK/audits/parity, final native full-suite and
  dev integration/owner-reviewed dev→main PR remain open. Main is not merged.
- Source/reports/receipts are committed and pushed together; their Git SHA is
  the handoff version. TIP-501/502/503 and the full goal remain IN PROGRESS.
