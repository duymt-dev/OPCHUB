# TIP-V2-537 — Explicit mobile acceptance cases

IN PROGRESS: MSW2/2 PASS; identical native cases await the live full native
runner and its restoration. No native result or whole UAT-31 PASS is inferred.

New canonical mobile-acceptance.spec.ts covers390px Portal Dashboard and
community, open/closed drawer navigation, exact document scrollWidth<=clientWidth;
Admin Members list rows wrapping into cards with every8 cells inside bounds,
visible member action, real checkbox selection/count, zero page overflow, and
restoration to desktop grid with selection retained. No lane branches, masks,
network fulfillment, timing changes, style edits or app changes.

First MSW invocation: **1pass/1fail**,28.3s. Portal and all mobile/card bounds
checks passed; the new test's exact partial label 'Đã chọn' did not exist as
a standalone element. The actual DOM contains 'Đã chọn 1 mục'. Corrected the
new locator to that exact full count inside the named bulk-action region.
This strengthens the intended selection-count check; no app bug was proved by
the original locator typo. Original raw failure retained, not discarded.

After: **2/2**,7.1s, same canonical tests against existing isolated MSW apps
with a fresh browser context. Temporary ignored config uses no webServer or
teardown, so it cannot start/stop the full regression's servers or alter its
report files. It was removed after the scoped invocation was terminal.

Initial root lint/type/unit passed but depcheck hit ENOENT when that temporary
config was removed between enumeration and file read. Final rerun after cleanup:
lint8/8 and typecheck8/8 (7cached each), units6/6 (all cached; reported1280pass
plus2existing skips), depcheck pass FE1625modules/4657edges, server774/3417.
This is not an uncached unit rerun. Both gate receipts retained.

Current registry226. The already-running535 full MSW/native invocations
collected224 before this file existed; do not relabel their results226. Native
test data must not be reset by a second runner concurrently. Run these exact
two cases after that runner's finally restoration, restoring demo again.
Additional390px views beyond these representative screens require their own
acceptance review/coverage; screenshot parity is a later separate gate.

No native services, business implementation, DB schema or LLM provider changed.
Evidence: `evidence/v2-537/`.
