# TIP-V42-711 — resumed implementation checkpoint (not DONE)

## Source and scope

- Resumed the owner's active goal; the earlier backend-only pause is historical, not current status.
- Branch: `feature/TIP-V42-711-project-live-store-post`, stacked on TIP-710. No merge performed.
- Source commits: `a6aaa8f0` (API filter, store posting UI, MSW, translations, fixtures and tests),
  `b553b90c` (full-width project feed, preserving existing widths of unrelated store sections).
- Both commits pushed. PR authentication unavailable; [compare into dev](https://github.com/duymt-dev/OPCHUB/compare/dev...feature/TIP-V42-711-project-live-store-post).
  This is a checkpoint, not a completed TIP or milestone M3.

## Implemented since backend handoff

- `/projects?storeId=…` validates and applies the store filter before deferred pagination and existing visibility rules.
- Explicit project province takes precedence over group province; legacy empty values retain the group fallback.
- Store detail renders API-backed projects with loading/error/retry/empty states and pagination. Owners can open the project form with store name, field/category, audience, province and immutable store association.
- Linked province is read-only; standalone projects retain editable province. Editing preserves the association.
- Submission publishes immediately; the MSW implementation no longer uses the retired D-18 revision workflow.
- Public MSW visibility respects account status and usable fee expiry, with the deterministic fixture clock.
- Translations updated in all ten locales. Demo project `p10` is linked to `st1` in both MSW and native seed, matching the actual prototype.
- New native integration tests cover store filtering, province precedence, private/draft exclusion, expiry/restoration and expired-vs-trial submission.
- New browser test covers prefill, read-only province, POST response, immediate publication and reopening the saved project from its store.
- Split the existing over-limit project browser test file; extracted the existing store wizard Team component to resolve its lint violation without changing behavior.

## Decisions / discrepancies

- **Q-V42-711-2:** reuse the existing project list endpoint with `storeId` rather than introducing a circular store/project service dependency. The TIP permits an endpoint/service alternative; existing backend visibility remains authoritative.
- **Q-V42-711-3:** the actual v4.2 prototype places the project block **before** “Đang cần”, contrary to the TIP's prose. Implemented the prototype ordering under D-93.
- **Q-V42-711-4:** the prototype's MediaSoft store already contains OPC Hub Mobile. Linked the seed explicitly; no runtime inference by owner and no invented placeholder projects.
- Added covering index `(store_id, status, published_at DESC, id DESC) INCLUDE (owner_id, visibility, deleted_at)` in migration `20261028095802_v42_project_store_feed`.
  Generated with `--create-only`; removed Prisma-generated drops of unrelated handwritten indexes. Applied on both `opchub_dev` and `opchub_test`.
- Native dev drift was a missing original `projects_store_id_idx`; restored that original index with `CREATE INDEX IF NOT EXISTS` before generating the new migration. No reset or data deletion.

## Verified gates

| Command | Actual result |
|---|---|
| `pnpm lint` | 8/8 tasks passed; pre-existing admin/portal image warnings remain |
| `pnpm typecheck` | 8/8 tasks passed |
| `pnpm test` | 1663 passed, 2 skipped; 6/6 tasks passed (5 cached in the latest run) |
| Unit breakdown | shared 432; server 225; UI 52; admin 460; integrations 103 + 2 skipped; portal 391 |
| `pnpm depcheck` | passed: 2046 modules/5998 dependencies and 905 modules/4165 dependencies |
| `pnpm build` | 3/3 tasks passed |
| Native `test:int project-store-visibility` | 3/3 passed on Postgres + Redis |
| Full `pnpm test:int` | **1557 passed**: server 1497/164 files + DB 60/19 files; exit 0, 24m2.781s |
| Targeted MSW `store-projects.spec.ts projects-mine.spec.ts` | 6/6 passed |
| Full `pnpm e2e` (correct local relay origin) | **321 passed, 4 skipped**, exit 0, 14.1 minutes |

Both full gates completed successfully, without retries or weakened assertions. The full integration result supersedes the older backend handoff snapshot that reported affiliate bootstrap failures; no database reset or affiliate cleanup was performed in this resumed work.

### Parity measured on the source changes

| Scenario | 1440 | 390 |
|---|---:|---:|
| P-73 create form | 0.72% | 1.45% |
| P-74 form validation | 0.90% | 1.98% |
| P-75 form funding | 0.10% | 2.28% |
| P-76 edit form | 0.79% | 1.77% |
| P-77 saved draft | 0.02% | 0.08% |
| P-108 existing store viewport | 2.50% | 0.26% |
| P-108-PROJECTS complete new block, no mask | 0.00% | **3.34% FAIL** |

Rerun after source commit `b553b90c`: **13/14 passed** (46.0 seconds); the generated parity report stamps this SHA. The initial desktop difference was 12.83% from the old 1080px container; the new block now uses the prototype's available width. Existing store viewport parity is unchanged.

Mobile diagnostic inspection found both rendered blocks are 366px wide and 202px high, and both cards are 328×128px with identical computed typography. Their vertical fractional offsets differ; both captured PNGs were 366×203 (the earlier claim of different PNG heights was incorrect). Integer-enclosing screenshot bounds introduced a one-pixel phase shift and the comparison remained **FAIL** at that checkpoint. Diagnostic logging was removed. No baseline, mask, threshold, assertion or screenshot-comparison algorithm was altered.

### Test-run configuration finding

The first full MSW run was stopped after repeated Admin login failures: `/v1/admin/auth/login` returned 503 from `affiliate-bridge.ts`, because the Admin build's relay origin defaulted to the public site rather than the local Portal. Rebuilt Admin with process-only `NEXT_PUBLIC_PORTAL_URL=http://localhost:3040` and restarted the full run. No `.env` edits and no weakened assertions. Only the test runner created in this session and its verified descendants were stopped; native HOLD/foreign processes were untouched.

## Remaining before TIP-711 DONE

1. Resolve mobile block parity without hiding differences; add/measure the store-prefilled form scenario as needed.
2. Complete empty/visitor behavior coverage and native browser verification of the touched flow and expiry/restoration.
3. Run native E2E and restore demo seed/HOLD. Full integration and MSW gates have now passed.
4. Run actual query `EXPLAIN (ANALYZE, BUFFERS)` at ≥10k rows for project visibility and the new store feed.
5. Complete acceptance/14-rule audit, final TIP-711 report and M3 report, commit/push all evidence.
6. Only then continue TIP-712 → TIP-714 sequentially. No final acceptance file or later TIP is claimed complete.


## Follow-up checkpoint — source `552b3bcb`

- Committed and pushed optimized project feed queries in a separate module. Actual Prisma query-event SQL is replayed through EXPLAIN on connection-local temporary clones containing 10,000 projects/users/fees. Public data is untouched.
- Initial EXPLAIN found a full fee-table scan from the ORM OR-over-LEFT-JOIN shape. Correlated EXISTS predicates now use existing indexes; global page/count and store page/count pass the no-Seq-Scan assertions on projects and membership_fees. Counts (500 global/100 store) and page IDs are also asserted; no planner switches are forced.
- Measured representative execution: global page 2.945ms/count 4.630ms; store page 2.973ms/count 3.405ms. Store uses its covering index. Exact timings vary by load.
- Added validated project snapshot persistence to the existing local MSW cross-app bridge so actual owner edits and Admin moderation survive reloads. This replaces the retired revision-cookie test with real UI writes.
- Targeted E2E: **14/14 MSW and 14/14 native passed**, covering immediate edits, creation, owner/visitor empty states, hide and republish. Native visitor uses actual fake-SSO trial registration, not an expired demo member.
- Gates at this commit: lint 8/8, typecheck 8/8, unit **1665 passed + 2 skipped**, depcheck **2051 modules/6012 dependencies + 909/4177**, build 3/3. Full integration and full MSW are being rerun; do not infer final counts yet.
- Region screenshots now use exact fractional bounds when the entire element fits in the viewport, identically on both sides; oversized regions keep full-element capture. Two screenshot tests prove equal fractional boxes compare identically, real content changes remain visible, and tall content is not truncated. No masks, thresholds, baselines or pixel comparison changes.
- New block parity: **0.00% desktop / 0.296218% mobile**. The broader fresh run has **31 passed / 1 failed** (includes two screenshot tests): the newly introduced store-prefilled form scenario fails desktop because the prototype navigates to Projects, whereas the app originally kept the store behind its drawer.
- Corrective work in progress: follow the prototype navigation to Projects with a transient typed posting intent, retain required prefill, and place the required province beside stage in the existing two-column grid (no control removed or hidden). This correction is not yet accepted; rerun the form and native behavior before completing TIP-711.


## Latest verification — `9e682c9a` / `8fab79b5`

- Posting now navigates to Projects, keeps typed store prefill across the route, and places province visibly alongside stage. No control is hidden. The parity scenario resets background scroll identically on both sides because the prototype retains its store scroll position after navigation.
- **32/32 parity tests passed** (30 viewport scenarios + 2 screenshot-unit checks), report stamped `9e682c9a`. Store form 0.43% / 2.43%; full project block 0.00% / 0.30%. All selected P-73–77, P-108, new store scenarios and D-51–57 are ≤3%.
- **14/14 MSW** targeted tests passed against the corrected build. **14/14 native** targeted tests also passed (2.6 minutes).
- Added native-only lifecycle test, **1/1 passed**: a properly declared trial visitor sees p10; owner fee remains `active` but validUntil moves into the past; project disappears from search; restoring the fee makes it visible and its detail opens; project status remains published throughout. No response interception. Initial attempts correctly exposed a test precondition error: the new viewer's mandatory declaration overlay blocked clicking; the final test completes declaration instead of forcing clicks or removing assertions.
- Unit **1666 passed + 2 skipped**, lint/typecheck all passed. Latest dependency scan **2055 modules/6020 dependencies + 909/4177**, no violations. Both updated MSW frontends and native frontends built successfully.
- Demo seed and dev Redis cache restored after native checks. API 4000/socket4001/worker started by this session remain running; no foreign service was stopped.

### Full-suite reruns are NOT yet green

- Full MSW run on the older regular `.next` build: **322 passed, 1 failed, 4 skipped** (20.7 min). The sole failure expects the newly added `/projects` navigation while that old build still opens the drawer on `/stores/st1`. This is a test/build version mismatch, not accepted evidence. A clean full run on the corrected isolated `.next-parity` build (3042/3043) is underway; do not report it passed until it finishes.
- Full integration: **21 failed files / 144 passed files; 1442 passed / 57 skipped tests**, exit 1, 28m34.968s. DB suite did not complete. Failures originate in Affiliate bootstrap's code allocation, followed by teardown errors for apps that never initialized. All project-specific tests including both actual EXPLAIN cases passed.
- Diagnosis: the long-lived test DB contained **1277** factory users named `Người thử <sequence>`. Affiliate name normalization removes digits, so all use stem THU, exhausting its finite two/three-digit suffix space. This is fixture isolation debt, not a reason to change the approved business code format.
- Scoped test-data repair on **opchub_test only**: renamed exactly those 1277 synthetic records after matching all three markers (legacy full-name pattern, email derived from UUID ending `@test.opchub.vn`, and member_code derived from the same UUID). No row was deleted; no fee/status/affiliate code changed; opchub_dev was untouched. Updated the factory to use deterministic alphabetic UUID suffixes and added a unit regression. Revalidation is in progress.
- TIP-711 remains **NOT DONE** until the fresh full gates finish. TIP-712–714 have not started.


### Fixture correction committed (`bb400c76`)

- New alphabetic UUID-derived fixture names have a unit regression; full unit gate now **1667 passed + 2 skipped** (server 226, portal 392, shared 434, admin 460, UI 52, integrations 103 + 2 skips). Lint/typecheck passed before commit; source pushed.
- The first scoped repair left a second legacy cohort whose test helper had assigned real-format member codes. Identified **118** matching legacy-name + UUID-derived test-email rows, then renamed only the **112** with exact `TV` + six-digit codes. Six custom-coded fixtures were left untouched. Total renamed: **1389**, all synthetic users in opchub_test; no deletes or production-rule changes.
- Previously failing `me-affiliate.int.spec` then passed **4/4**, including real bootstrap/backfill. A fresh complete integration run is now active (`accepted-full-int.log` locally); a fresh complete MSW run against the matching corrected build is also active (`accepted-full-e2e.log`). Pending runs are not counted as successful gates.


### Completion audit found a D-109 collaborator bypass

The original visibility predicate placed fee eligibility only on the public branch, allowing team/shared-group membership to keep an expired owner's project in Explore. TIP AC4 and D-109 require it to leave Explore for other users; only the owner retains their data. The newer D-109 condition now gates both public and collaborator access. Existing BR-08 permissions still apply when the owner fee is usable. Account-lock behavior is otherwise unchanged.

The old fixture `p4` (BrandKit Mini, unpaid m6) was visible to m1 through sharing. New tests explicitly assert its exclusion and restoration after fee activation; filter/hero counts change from 11 to 10, student count 3 to 2, and connections 40 to 37. This is an intentional D-109 expectation update, not a looser assertion. Native team/group expiry tests have been added; exact query EXPLAIN still passes 2/2 on 10k rows. Full unit tests passed after correcting the obsolete fixture expectation. These additional changes need their own native, browser and parity revalidation before completion.

The prior corrected-build full MSW run completed **323 passed, 4 skipped** (19.4m). It proves the preceding source, not the new collaborator predicate; do not present it as verification of the latest change.


## Latest checkpoint — 2026-10-28 19:32, source `25503e9b`

- D-109 collaborator gating committed `f339f0f6`; native demo preconditions committed `da137038`; matched-state parity scenarios committed `25503e9b`. All pushed.
- Complete native integration on updated predicate: **1501 server tests / 166 files + 60 DB tests / 19 files passed**, exit 0, 20m59.186s (`access-full-int.log`). Subsequent full DB run including the new project-demo helper: **62/62 in 20 files**, 39.11s (`latest-db-int.log`). Latest aggregate coverage is 1563 tests, not one combined run of that count.
- Lint 8/8, typecheck 8/8, unit 1667 passed + 2 skips. Dependency checks: 2058 modules/6034 edges and 912/4186, no violations. Build server/Portal/Admin succeeded (`access-build.log`); native frontends separately built for local API4040. Actual SQL EXPLAIN 2/2 still passes with 10k rows (`access-plan.log`).
- Latest native browser **25/25 passed** (`access-native-behavior-fixed.log`), plus updated API4040 expiry/restoration lifecycle **1/1 passed** (`latest-lifecycle.log`). The earlier native run exposed missing guest-owner fees and stale expiring-owner dates in demo fixtures; optional `seed:demo --projects` now supplies valid explicit project-test preconditions. It leaves unpaid m6 unchanged and does not alter default seeds. Empty-comment behavior uses eligible ContentLoop, retaining the same form assertions.
- Latest full MSW run remains active (`access-full-e2e.log`); do not count it as completed. Previous full source run was 323 passed/4 skipped.

### Parity: retain raw failures, do not claim acceptance

Default project snapshots after D-109: P55 5.31/16.94%, P56 2.95/9.05%, P57 3.30/11.59%, P59 2.93/9.21% (desktop/mobile). Six raw failures remain: unpaid m6's p4 is correctly absent in application, but retained by prototype. Counts/filter membership/card reflow change accordingly. P67 was an obsolete ineligible fixture; switching to eligible ContentLoop restored both empty-comment viewport checks, 4/4 including capture tests.

Additional `*-RENEWED` scenarios activate m6 through the **same Admin UI action on both sides**, then log in as m1. They do not replace defaults, mask pixels or edit prototype/baseline. Full MSW matched-state comparisons **8/8 passed** (10/10 with capture checks): P55 0.04/1.36%, P56 0.05/0.13%, P57 0.10/1.70%, P59 0.07/0.14%. This isolates eligibility-data effects from UI layout, but does not convert the default FAIL rows into PASS.

A subsequent native run with explicit `projects` seed annotation completed **8 passed / 2 failed** (includes two capture checks). P55 native matched-state still fails both widths (mobile 7.4073%): actual server sorts newest by published_at, whereas prototype/MSW preserve seed insertion order for `new`. Native card order starts p11/p12/p13, prototype p10/p1/p2. Frozen login toast and native unread counters also differ. Other six native matched-state comparisons pass. These are additional evidence, not a reason to weaken thresholds; server results are recorded separately. Investigate ordering semantics and proper post-login settling next; do not falsify persisted dates to force parity.

TIP-711 remains **NOT DONE**. TIP-712–714 have not started. Protected HOLD4000/4001/worker remain untouched; local API4040 is an additional updated-source service.


## Verification closeout update — source `9745a35d`

The latest full MSW run completed **323 passed, 4 skipped**, exit 0, **20.1m** (`access-full-e2e.log`). This verifies the D-109 predicate and corrected fixtures, superseding the previously pending status. No retries, timeout changes or weakened behavior assertions.

Native/MSW temporary parity output directories are now separate. A real 3-second clock advance on **both sides** lets the frozen login toast expire rather than masking/removing it. Added a separate full-grid `P-55-RENEWED-VIEWS` scenario using the same explicit “Nhiều lượt xem” control on both sides; default/newest scenarios remain unchanged.

- Updated matched-state MSW: **12/12 tests passed** (10 viewport comparisons + 2 capture checks), `settled-renewal-parity.log`.
- Updated native matched-state: **10 passed / 2 failed** (8 viewport passes + 2 capture checks), `settled-native-renewal.log`. Only default/newest grid P55 still differs. New views-sorted native grid: **0.42% desktop / 1.08% mobile**, with all 11 projects included; no crop/mask/data injection. Dedicated native evidence: `ui-parity/server/project-renewal-results.json` and its two failed diff images. Existing unrelated historical server report/diff entries are preserved rather than deleted by the generic report cleanup.
- Latest lint/typecheck/unit all passed before source commit. Source `9745a35d` pushed. Backend query ordering remains correct `published_at DESC, id DESC`; prototype/MSW `new` preserves array order, while actual DB uses fixture dates. No persisted dates or application sorting were falsified for a screenshot.

All broad functional gates now have passing evidence. The outstanding acceptance question is specifically default-dataset parity versus D-109 and prototype's unsorted newest data; matched-state/full-content screenshots isolate these differences, but **raw failures remain failures**. TIP-711 has not been marked DONE and no later TIP has begun.


## Final available verification and blocking audit — 2026-10-28

Additional native measurement of the **new TIP UI itself** completed **6/6 passed** (four viewport comparisons + two capture checks), `native-store-parity.log`, source `2211271c`. Form: **0.48% / 2.43%**; entire store-project block: **0.00% / 0.30%**. Evidence is preserved independently in `ui-parity/server/project-store-results.json`. No masked pixels, changed baselines or placeholder native data. Source audit against TIP-710 found **82 touched source files, none over applicable 400/600-line caps**, and store translations present in all ten locales.

The same remaining acceptance conflict has persisted across the last three goal turns (checkpoints `568aa0cb`, `2211271c`, and this audit). Those turns made real verification progress; it is now exhausted for this issue:

1. D-109 and TIP AC4 require unpaid/expired owners' projects to leave Explore for every other member. Actual native tests prove absence and automatic restoration, including team/shared-group access.
2. Immutable default prototype shows unpaid m6's p4. Its removal changes project count, filter counts and cards; six original default MSW screenshots exceed 3%. These are not a CSS/layout defect: the identical real fee-activation workflow on both sides passes all ten MSW captures, and an explicit shared sort passes native full-grid capture.
3. The goal simultaneously requires original screens within 3%, prohibits editing baseline, hiding differences or changing FAIL to PASS, permits DV only for real-data differences, and forbids advancing to TIP-712 until TIP-711 passes. A prototype-vs-MSW fixture/business-state conflict cannot silently be approved as a real-data-only exception by this agent.
4. Weakening D-109, falsifying fee/date data, replacing failing default scenarios with passing alternate states, or self-approving an acceptance exception is not an authorized solution. Raw FAIL results remain intact. Native newest ordering is additionally different from prototype insertion ordering; production chronological sorting was not falsified.

No remaining safe implementation change is identified that meets both sides of this contract. Further identical reruns add no evidence. Owner resolution of the default-dataset acceptance conflict (or an authorized corrected reference) is required before TIP-711 can be called DONE and TIP-712–714 started. This is a blocked acceptance gate, **not completion**. M3/M4 and final acceptance are deliberately not fabricated. All source changes are committed/pushed; demo data/cache restored and protected HOLD processes unchanged.
