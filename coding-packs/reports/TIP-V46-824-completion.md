# TIP-V46-824 - Admin i18n execution progress

**STATUS: IN PROGRESS / PARTIAL - goal remains the complete TIP, NOT READY TO MERGE.**

## Latest checkpoint - source 9e962712

- Date:2026-11-11. Source **9e962712** committed/pushed. Previous goal turn was concrete progress, not a wait/blocker. The complete original TIP remains active: **not DONE, not ready to merge**.
- Added40 AI-call labels,4 moderation labels and8 local-validation labels to vi/en without rewriting old source strings. Both catalogs now **2660/2660 leaves in25 files**. Other8 target bundles remain absent. A new hash fixture also protects all2456 original legacy leaves, not only their count; the original524 settings leaves retain their prior hash, with only explicitly new roots/keys excluded.
- AI-call filters, live columns, drawer/close label, totals, loading/error/retry/export/paging, purpose/status/actor-realm labels and AI limits now follow locale. Display dates remain VN/Gregorian; numbers/currency localize without changing filter timestamp strings, query keys, provider/model/error/actor IDs, budgets or export contracts. Moderation action labels/switch translate while action payloads stay canonical.
- Added pure structured Zod issue translation with finite known custom-message mapping and safe unknown fallback. Profile local errors re-render when locale changes, retaining the password draft/session and issuing no API request for invalid input. API field errors remain raw, including text identical to a known local rule. Shared schemas/checks and success/session behavior are unchanged. This does **not** claim all other form/upload errors are complete.
- Settings email preview now keeps actual Vietnamese email content and authored fields, translating only preview chrome, matching the existing Marketing content-boundary handling.

### Current gates / evidence

| Check | Actual result |
|---|---|
| pnpm lint / typecheck | PASS each,8 tasks /7 cached; Admin fresh |
| pnpm test | **2444 passed +2 pre-existing skips**, Admin733 fresh; other5 tasks cached (UI76, Portal476, shared757, server276, integrations126) |
| pnpm depcheck | PASS, frontend/shared2705 modules8141 dependencies; server1260/5995 |
| Current production builds | MSW `.next-msw-tip824` PASS; mocking-off `.next-server-tip824` PASS using isolated proxy; neither is native API/browser verification |
| Raw English |25 fixed-file cases pass, now2660 leaves; no fallback counted |
| Manifest / caps / logs |610 unique declared paths, no undeclared changed path; changed source/catalog files≤400; UTF-8 normalized logs and credential/control-character scan clean |
| Current browser/native API/visual/fonts/performance | NOT VERIFIED, remain required |

All new regressions are included in the root run:2 AI filter/column cases,2 moderation cases,1 Settings email-preview case,11 structured-validation cases and2 added Profile cases. Existing assertions remain. An initial moderation fixture used the wrong status and was corrected to the real shared enum; a test JSX comma, generic AntD NamePath typing and a type-import lint issue were fixed rather than bypassed. Ownership audit found a duplicate manifest row and the Settings preview entry missing; that preview patch was reverted, the manifest explicitly corrected, then reapplied. No source outside the final declared paths, no backend/schema/SQL/seed change, no native DB/service operation.

Current logs: [root gates](evidence/v46-824/quality-gates.log), [unit](evidence/v46-824/unit.log), [MSW](evidence/v46-824/build-msw.log), [native-mode build](evidence/v46-824/build-native.log), [raw audit](evidence/v46-824/catalog-audit.md). Previous evidence is retained in Git704810e9. Read-only AST scan found18 direct JSX/attribute/object/call candidates, including intentional technical/default content; this is **not** the final source audit or proof that every formatter/call site is localized.

### Current AC audit / next actions

| AC | Current status |
|---|---|
|01|Allowlist/alias/request units retained; selector/browser proof pending.|
|02|vi/en raw contracts pass;8 target bundles and final fixed10-bundle gate missing, overall FAIL.|
|03|Original524 settings and2456 legacy leaves now hash-protected; fallback/shape units pass.|
|04|Metadata/auth retained; all-locale auth/browser acceptance pending.|
|05|Draft/session unit strengthened for Profile; URL/query/paging browser proof pending.|
|06|AI log/moderation now localized; remaining UI audit/label callers and full English browser matrix pending.|
|07|Other8 catalogs and required translated viewport images missing.|
|08|AI display format and canonical date-filter unit added; remaining domain formatters/pickers and browser assertions pending.|
|09|Existing control-locale unit proof retained; translated browser controls/fonts pending.|
|10|Structured local issues and live Profile password error/draft units pass; other forms/uploads and browser switching pending.|
|11|AI filter/moderation payload tests added; full browser save-value assertions pending.|
|12|API raw-error negative and both Settings/Marketing email-preview boundaries verified by units; browser negatives pending.|
|13|Settings-language independence unchanged; browser proof pending.|
|14|Both current build modes compile; identical MSW/native behavior suites still NOT RUN.|
|15|Required unmasked1440/390 glyph/focus/hydration/vi-parity evidence missing.|
|16|Executable JS/catalog/font/isolation/performance measurements missing.|

Next: finish other client validation/upload and shared-control label callers, remaining per-domain display formatters and locale picker formats without touching parsers/exports/D-140; English browser smoke all domains; complete8 target catalogs/glossaries and mandatory all-bundle/source-audit gates; licensed script-scoped fonts; full identical MSW/native suites, unmasked evidence and metrics. Preserve original PG5432; finish all16 ACs, then PR to dev for owner review, never auto-merge/main release.

## Historical English checkpoint - source ec97a874

The following is historical; the source and current counts/gates above supersede it.

- Date:2026-11-11. Source **ec97a874** committed and pushed to `feature/TIP-V46-824-admin-i18n`. Full original TIP remains the goal; **not DONE, not ready to merge**, no owner-input blocker or scope reduction.
- Completed all25 English physical catalogs: **2608/2608 raw source leaves**, up from879. Fixed explicit raw-file tests check exact keys/types, ICU arguments/tags/selectors, NFC, nonempty and copied-Vietnamese exceptions before fallback. All25 cases pass. Source vi remains unchanged, including524 settings leaves and their baseline integrity hash. Six exact proper-name/geographic/canonical exceptions and the single legacy blank header are documented in REVIEW.
- Preserved content boundaries exposed by broad translation: event default descriptions sent to the server stay Vietnamese; group-export CSV/Excel headers, enum cells, BOM/escaping/bytes and raw names stay unchanged; welcome-email preview keeps actual Vietnamese email text while surrounding Admin controls can translate. New focused regressions:4 event cases,3 export cases and1 email case. No API/DB/schema/seed/business changes.
- English is AI-produced, **native-reviewed=false**. All eight other target bundles remain absent; presence50/250 and full English are **not** whole-TIP acceptance. Final fixed10-bundle production gate, hardcode/formatter/local-validation completion, fonts and browser/native evidence remain required.

### Current verification for ec97a874

| Check | Actual result |
|---|---|
| English raw catalog + content-boundary focused suite | **33 passed**,4 files;25 catalog +8 content cases |
| pnpm lint | PASS,8 tasks /7 cached, Admin fresh |
| pnpm typecheck | PASS,8 tasks /7 cached, Admin fresh |
| pnpm test | **2426 passed +2 pre-existing skips**; Admin715 fresh, other5 task results cached: UI76, Portal476, shared757, server276, integrations126 |
| pnpm depcheck | PASS, frontend/shared2694 modules8109 dependencies; server1260/5995 |
| Admin production MSW build | PASS, `.next-msw-tip824`, Portal relay origin configured from the owned MSW port config |
| Admin production native-mode build | PASS, `.next-server-tip824`, mocking off and isolated API proxy; **build only, not native API/browser acceptance** |
| Browser/HTTP smoke for this source | NOT RUN; historical login SSR4/4 below belongs to55116347 |
| Full i18n native/browser/visual/font/performance acceptance | NOT VERIFIED; remains required |

Logs: [root gates](evidence/v46-824/quality-gates.log), [unit](evidence/v46-824/unit.log), [MSW build](evidence/v46-824/build-msw.log), [native-mode build](evidence/v46-824/build-native.log), [raw catalog audit](evidence/v46-824/catalog-audit.md). Logs were normalized to UTF-8/no ANSI/trailing spaces. The initial PowerShell wrapper incorrectly treated ordinary pnpm stderr as a terminating exception; it was corrected and all four root commands were rerun using real exit codes. An initial MSW build used the wrong port-property name; its output was superseded by the successful rebuild with `PORTAL_PORT`. No assertion was weakened. No original native service or PG5432 data was changed; build commands did not seed or exercise a database.

### Current AC status (all16 still retained)

| AC | Evidence / remaining work |
|---|---|
|01|Existing allowlist/alias/request units pass in current root run; full selector browser evidence remains.|
|02|All25 English raw contracts pass; other8 bundles absent and final fixed10-bundle gate pending — overall FAIL.|
|03|Source/hash/shape/fallback units pass; no vi source change.|
|04|Metadata/auth implementation retained; no new all-locale browser proof.|
|05|Provider draft unit retained; URL/query/session/paging browser tests pending.|
|06|English catalog now complete, but remaining UI literals/call sites and all-route browser matrix pending.|
|07|Other8 catalogs and required viewport images absent; not achieved.|
|08|Existing formatter units plus exact export-byte regression pass; remaining per-domain/date-picker callers and browser evidence pending.|
|09|Existing10 control-locale unit coverage retained; localized controls and fonts not browser-verified.|
|10|Provider draft unit retained; local validation/upload errors and switch-with-form tests pending.|
|11|Existing canonical projection tests plus event-content payload regressions pass; browser save-value assertions pending.|
|12|New canonical CSV/Excel/email-preview regressions pass; translated-mode API/email/audit/notification/export browser negatives pending.|
|13|Settings language wiring unchanged; independence browser proof pending.|
|14|Both current build modes compile; identical MSW/native behavior suites NOT RUN.|
|15|Unmasked1440/390, glyph/focus/hydration and vi parity evidence missing.|
|16|Selected-bundle architecture retained; current JS/RSC/font/isolation/performance measurements missing.|

### Next implementation work (same full goal)

1. Finish remaining UI literals/shared label props, local validation/upload errors and per-domain display formatters, preserving canonical content/API/export contracts. Read-only direct-JSX AST inventory found28 candidates; it is not the final comprehensive source audit.
2. Browser-smoke every English domain/tab/dialog, then complete zh/id/th/ms/fil/km/lo/my with glossaries and native-reviewed=false. Add mandatory fixed-bundle raw gate and full source-literal audit; never make missing directories pass through discovery/fallback.
3. Licensed script-scoped fonts; identical MSW/native behavior and existing profile/overview/auth/Portal regressions, unmasked1440/390 evidence, vi parity, measured performance/isolation. Preserve original native5432 data/services.
4. Close all16 ACs with actual evidence, clean/push and PR to dev for owner review. No automatic merge/main release.

## Historical presentation integration checkpoint - source55116347

The following checkpoint is historical, superseded by ec97a874 above. Shared log files now contain the latest runs; previous versions remain in Git ee41244b.

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
