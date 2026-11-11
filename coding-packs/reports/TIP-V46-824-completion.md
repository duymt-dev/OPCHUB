# TIP-V46-824 - Admin i18n execution progress

**STATUS: IN PROGRESS / PARTIAL - goal remains the complete TIP, NOT READY TO MERGE.**

## Latest checkpoint - source55116347

- Date:2026-11-11. Branch: feature/TIP-V46-824-admin-i18n, baseline dev f7c1b2b8. Source checkpoint **55116347** is committed and pushed.
- The full original scope and all16 ACs remain required. No smaller definition of DONE, no merge/release and no owner-input blocker.
- Existing foundation9e207741 preserved. New implementation now connects request-time loading, client fallback and selected AntD locale; the earlier foundation-only description below is historical.

### Delivered since the foundation

1. Added vi meta/ui/bot-options catalogs without changing the existing2456 legacy leaves or the524-leaf settings baseline hash. Source now2608 string leaves in25 physical catalogs.
2. Localized metadata at all23 named routes, including Profile; html lang comes from the request locale. Existing vi route titles/brand/robots are preserved; profile now has its own title.
3. Removed runtime authOverrides. The cookie is allowlisted before loading exactly one resolved logical message tree, with canonical aliases and Vietnam timezone. Missing raw translations fall back at runtime, but are NOT counted as translated.
4. Added server-lazy finite AntD locale map for all10 bundles, including complete visible-string Filipino/Lao patches derived from the installed AntD en_GB dictionary. Missing new phrases fail closed. All10 dictionaries serialize without functions. SG/BN aliases share control resources.
5. Added persistent Admin control provider and client-owned message-error callbacks. No keyed subtree or async unmount on switching; the provider unit retains an unsaved draft. Dayjs locale packs register without selecting a per-request global locale. Browser refresh/draft preservation still needs final E2E proof.
6. Added localized pagination/bulk/editor/calendar label helpers; integrated selected call sites. Preserved overview range/polling/formulas, localized counts/percent displays and known chart labels without rebuilding series data.
7. Permission/menu and region-label projections now use stable registry keys. Tests verify exact old vi labels and unchanged canonical bot tone/gender/hour/script and project rejection values while showing English labels. No API, RBAC, business, seed, SQL or export contract change.
8. Added complete, raw-contract-tested English auth/common/overview/meta/ui/bot-options. Other19 English files are partial:464 unambiguous exact-text translations were reused from Portal data, not runtime cross-app imports. No VI/TODO stand-ins were generated. REVIEW explicitly records AI/native-review status.

### Current raw translation readiness - FAIL / INCOMPLETE

| Bundle | Raw files | Required files | Source-key leaves present | Required leaves |
|---|---:|---:|---:|---:|
| vi |25|25|2608|2608|
| en |25|25|879|2608|
| zh/id/th/ms/fil/km/lo/my |0 each|25 each|0 each|2608 each|

File coverage50/250 is NOT completion: English still lacks1729 source leaves; all eight other target catalogs remain absent. Six English catalogs pass explicit raw-tree/ICU checks; the final mandatory all-bundle gate still must be implemented and must fail missing locales/files/keys. See [raw audit](evidence/v46-824/catalog-audit.md) and apps/admin/messages/REVIEW.md.

### Current verification

| Check | Actual result |
|---|---|
| pnpm lint | PASS,8 tasks /7 cached; Admin fresh |
| pnpm typecheck | PASS,8 tasks /7 cached; Admin fresh |
| pnpm test | **2393 passed +2 pre-existing skips**; Admin682 fresh, UI76 / Portal476 / shared757 / server276 / integrations126 cached;6 tasks /5 cached |
| pnpm depcheck | PASS, frontend/shared2687 modules8091 dependencies; server1260/5995 |
| Admin production MSW build | PASS, .next-msw-tip824, current implementation |
| Actual production Next HTTP smoke | **4/4**: /login with vi,en,en-SG,__proto__; correct html lang/title, noindex, status200 |
| Current native-mode build / browser / API verification | NOT RUN for55116347; the old foundation build below is not current native acceptance |
| All-route, all-bundle browser assertions / screenshots / fonts / performance | NOT VERIFIED, remain required |

The production HTTP smoke used an owned temporary listener, stopped and checked absent afterward; original native services/ports and PG5432 data were not touched. curl.exe was used to send actual Cookie headers; the initial PowerShell Invoke-WebRequest cookie probe did not reliably transmit the requested identity and was superseded by explicit curl results. This is HTTP SSR smoke, NOT a headless-browser or native-API acceptance run.

Logs: [unit](evidence/v46-824/unit.log), [gate summary](evidence/v46-824/quality-gates.log), [current MSW build](evidence/v46-824/build-msw.log), [coverage / SSR evidence](evidence/v46-824/coverage.md). No test or assertion was disabled. New source files remain small; longest changed source/test file191 lines.

### Current AC audit

| AC | Current proof / remaining requirement |
|---|---|
|01|Locale allowlist/aliases/request scope/control maps unit-verified; production HTTP confirms vi/en/en-SG/invalid-cookie behavior. Remaining full-bundle browser proof is not inferred.|
|02|Raw contract helper, mutation negatives and six complete English catalogs pass; overall raw completeness FAIL.|
|03|Source/settings integrity and fallback/shape/concurrency units pass; client malformed-ICU fallback tested with readable text and no raw key.|
|04|All route metadata implemented and core English auth data present; only login SSR subset tested, other languages/browser auth remain.|
|05|Provider unit retains unsaved draft; no URL/query/session/browser acceptance yet.|
|06|Metadata, shared labels and selected domains integrated; hardcoded UI/format callers still remain.|
|07|Incomplete catalogs and missing all-bundle screenshots, not achieved.|
|08|Pure formatting and overview presentation verified by units; other domain callers, picker display formats, exports/browser boundaries remain.|
|09|All10 real serializable AntD dictionaries load, custom fil/lo complete for installed text; shared label/provider units pass. Full localized controls/browser/font proof remains.|
|10|Provider draft unit only; local Zod/upload errors and actual switch-with-form E2E remain.|
|11|Canonical key/value and vi-label equality units pass; browser save-payload assertions remain.|
|12|Backend/API errors, audit/email/CSV/user data implementations unchanged; translated-mode browser negatives remain.|
|13|Settings language configuration still disconnected as approved; no selector/config browser proof yet.|
|14|Identical MSW/native i18n E2E suites still required.|
|15|No full translated viewport/glyph/focus/hydration evidence, not achieved.|
|16|Selected server control/message loading implemented; final executable JS/RSC/font isolation/performance measurements missing.|

### Next implementation work (same goal)

- Complete English's remaining1729 source leaves and review all reused candidates/ICU contracts; then produce all eight remaining target catalogs with glossaries and native-reviewed=false.
- Finish remaining hardcoded labels, UI component label props, per-domain number/date/currency callers, local schema/upload errors, AI call-log UI and canonical-value adapters. Ensure count wording is grammatical without changing argument contracts or API data.
- Finish locale picker display formats, Vietnam date semantics and preserve D-140 ranges/formulas; do not parse display text into API parameters.
- Add licensed self-hosted fonts with script-scoped loading and provenance.
- Add the fixed all-bundle production catalog gate and source-literal audit. Missing raw files/keys must fail, regardless of runtime fallback.
- Execute identical MSW/native i18n E2E coverage across all routes/states/bundles, previous profile/overview/auth regressions, unmasked1440/390 screenshots, vi parity, current native-mode builds and performance checks. Preserve original PG5432 and existing services.
- Finalize all16 ACs from authoritative evidence, clean/push commits, PR into dev for owner review; no auto-merge/main release.

## Historical foundation checkpoint (source9e207741)

The sections below describe the earlier foundation checkpoint, NOT current verification of the whole TIP. Original evidence snapshots are retained in Git commit b61c1007. Shared log filenames above now contain the latest progress where overwritten.

- Date: 11/11/2026. Branch: `feature/TIP-V46-824-admin-i18n`, baseline `dev f7c1b2b8` plus approved planning commit `90bd954a`.
- Source checkpoint: **`9e207741`**. This is a foundation checkpoint, not delivery of the complete multilingual Admin.
- No merge, auto-merge, release, backend/SQL/schema/seed change, or original native service/DB operation was performed. No subagents or parallel implementation lanes.
- Dependencies inspected: 822/823 implementations are already in baseline; existing profile, overview, authentication and permission code remains unchanged.

### Delivered in this checkpoint

1. Split the existing 591-line settings catalog into six physical domain files; all existing `settings.*` callers retain the same logical namespace/types through the source-messages facade. Six existing component tests now import the facade rather than the removed JSON; no existing assertions were removed.
2. Verified **524 settings string leaves unchanged**, sorted key/value SHA-256 matches the TIP baseline. The complete legacy source remains **2,456 string leaves**. The digest is a content-integrity fixture, not a completion Git SHA.
3. Added allowlisted locale profiles for all 12 selector identities / 10 bundles; SG/BN retain their Intl identities while sharing EN/MS messages. Unsafe, missing and inherited-property cookie names fail closed before imports.
4. Added staged, reader-injectable loader and source-driven deep fallback: nested objects/arrays preserve shape, unknown keys cannot enter the resolved tree, duplicate settings roots fail safely, simultaneous locale reads do not mutate the Vietnamese source. These helpers are **not yet connected to request.ts**.
5. Added pure display formatters for counts, VND/USD, percent points and dates. Vietnam timezone and Gregorian calendar are forced, null/invalid inputs remain empty, invalid/ambiguous date strings are rejected. **Existing screen formatter callers have not yet migrated.**
6. Added raw catalog contract helpers using the public IntlMessageFormat AST. Negative fixtures cover absent locale/file, missing/extra keys, wrong scalar/object/array shapes, invalid ICU, renamed/type-changed arguments, changed tags/select selectors/explicit plural cases/offsets, empty/placeholder text, copied Vietnamese and NFC. The fixed all-bundle production readiness test is **not yet implemented**; helper tests are not a substitute for it.
7. Added opt-in AntD locale to shared UiProvider and instance-scoped DateRangePicker locale. Existing Vietnamese defaults and callbacks remain unchanged; no per-request global dayjs locale setter was introduced. Tested sibling provider isolation, controlled clearing/open-ended ranges and no mutation of caller dates/global locale.
8. Added only the approved direct devDependency `intl-messageformat` from the existing catalog, version11.2.15 as already used by Portal. Lockfile change is confined to the Admin importer; no package upgrade.

### Actual verification

| Command / check | Result | Notes |
|---|---|---|
| `pnpm lint` | PASS | Final run: 8 tasks,7 cached; Admin checked freshly. |
| `pnpm typecheck` | PASS | Final run: 8 tasks,7 cached; Admin checked freshly. |
| `pnpm test` | PASS — **2,360 passed,2 existing skips** | Admin649, UI76, Portal476, shared757, server276, integrations126 +2 skips. Admin/UI fresh; four other Turbo task outputs cached. |
| `pnpm --filter @opchub/admin exec vitest run src/i18n` | PASS — **48/48**,4 files | Fresh final focused run after the foundation edits. These are unit cases, not 48 completed feature ACs. |
| shared provider/date-picker focused tests | PASS — **5/5** | Includes one existing date-picker case and4 new cases; also included in full UI76. |
| `pnpm depcheck` | PASS | Frontend/shared2658 modules8030 dependencies; server1260/5995. |
| Admin production build, `NEXT_PUBLIC_API_MOCKING=msw` | PASS | Separate `.next-msw-tip824`; existing routes build successfully. |
| Admin production build, `NEXT_PUBLIC_API_MOCKING=off` | PASS | Separate `.next-server-tip824`; **build is not native browser/API verification**. |
| manifest / file caps / diff check | PASS | All actual paths declared; changed source/test files≤193 lines; settings parts≤147 lines including trailing newline. |
| raw catalog presence precheck | **FAIL / INCOMPLETE** | **22/250 physical files present**: only vi legacy catalog. Missing3 new vi namespaces and225 foreign catalog files. |
| i18n browser MSW/native, native integration, screenshots/parity/performance | **NOT RUN / NOT VERIFIED** | No new multilingual runtime behavior is claimed; no screenshots or performance numbers fabricated. |

Evidence: [catalog readiness](evidence/v46-824/catalog-audit.md), [gate summaries](evidence/v46-824/quality-gates.log), [unit output](evidence/v46-824/unit.log), [MSW build](evidence/v46-824/build-msw.log), [native-mode build](evidence/v46-824/build-native.log).

The long root run was followed by fresh final lint/typecheck and focused48 checks; root test counts and caching are stated above. No hook or assertion was disabled. JSDOM pseudo-element warnings and the two integration adapter skips predate this work.

### Acceptance evidence map — no full feature acceptance

| AC824 | Status | Evidence / gap |
|---|---|---|
| 01 | PARTIAL | Unit allowlist/alias/profile resolution passes; request/AntD/dayjs bridge not wired. |
| 02 | PARTIAL, readiness FAIL | Contract helper and negative fixtures pass; raw translated files and final production catalog gate missing. |
| 03 | PASS for source split / unit fallback | Hash, all legacy leaves, disjoint physical keys, fallback shape and simultaneous-reader isolation verified; runtime rollout still pending. |
| 04 | NOT IMPLEMENTED | Auth metadata/HTML/full translated copy not integrated. |
| 05 | NOT VERIFIED | No multilingual navigation/session/browser evidence. |
| 06 | NOT IMPLEMENTED | Hardcoded labels, all-domain coverage and metadata migration remain. |
| 07 | NOT IMPLEMENTED | No foreign catalogs, no all-bundle screenshots. |
| 08 | PARTIAL | Pure formatter units pass; callers, browser controls/export invariance evidence remain. |
| 09 | PARTIAL | Shared optional locale primitives verified; Admin bridge, fil/lo patches and localized presets/editor labels remain. |
| 10 | NOT IMPLEMENTED | Local validation translation and switch-with-draft behavior remain. |
| 11 | NOT IMPLEMENTED | Canonical-value label adapters and browser save-payload assertions remain. |
| 12 | NOT VERIFIED for i18n | Existing API/auth/permission implementations untouched; dedicated translated-mode browser checks remain. |
| 13 | NOT VERIFIED | Selector/config independence is preserved by unchanged code, but no new i18n browser proof. |
| 14 | NOT RUN | Identical MSW/native feature assertion suites still required. |
| 15 | NOT RUN | No translated layout/font/glyph/keyboard/hydration evidence. |
| 16 | NOT RUN | Request payload/bundle/font isolation and performance measurements remain; builds alone do not satisfy this. |

### Findings and bounded adjustments

- The real vi source has an intentional empty action-column header: `settings.renewal.actions = ""`. Initial source-tree validation caught it. Keep the baseline UI/hash, permit only an explicitly documented exact path when both source/target are empty; tests reject blanking a nonempty source, an unrelated empty key, or whitespace. Clarification recorded in the TIP, not a namespace-wide exemption.
- Initial negative test exposed a missed Vietnamese accented character in copied-text detection; corrected the Unicode matcher and retained the regression. Final focused48 and full root results above supersede the failed exploratory runs.
- Split inventory found six existing tests importing removed settings.json. Manifest was extended before fixture-import edits. ICU AST comparison is a separate small helper, also declared before creation.
- This checkpoint deliberately retains existing request-time `authOverrides`: no untranslated fallback-resolved tree is mislabeled as nine finished translations. Missing dictionaries must be filled and independently validated before switching the runtime.

### Remaining work, in implementation order

1. Source namespaces meta/ui/bot-options, English catalog and every Admin route/tab/dialog/header/aria/title/local-validation migration, canonical-value adapters and formatter callers.
2. Full request loader integration, locale-aware HTML/metadata, Admin provider bridge, AntD fil/lo patches/dayjs integration, safe runtime message-error handling and translated shared-component label props.
3. All9 target catalogs with exact raw tree/ICU contracts; mandatory fixed-manifest catalog gate must fail missing files/locales. No Vietnamese copies as stand-ins. REVIEW/glossaries/native-reviewed=false remain to create.
4. Self-hosted script fonts with real licenses/provenance and script-selective loading.
5. Complete browser suites in both modes, all-route/bundle coverage, canonical payload/session/draft regressions, translated screenshots at1440/390, vi parity, performance/bundle measurements and fresh Portal-specific regression/build because shared UI changed.
6. Repeat final gates after full integration, update this report/traceability with actual evidence, push and open a reviewable PR into dev. Owner handles merge. Native-speaking review stays transparently pending under D-65/D-141; it is not used as an excuse to mark missing machine translations complete.

### Quality gate

- Scope/architecture: foundation changes stay inside the declared manifest; no app-to-app import, server/DB/API/permission/business change or production inline test suite.
- Verification: code/unit/static/build checkpoint passes, catalog completeness fails, runtime/browser/font/performance gates remain unverified.
- **Verdict: PARTIAL. Do not report TIP-V46-824-DONE or merge this checkpoint as the finished feature.** No owner decision is currently blocking the remaining implementation.
