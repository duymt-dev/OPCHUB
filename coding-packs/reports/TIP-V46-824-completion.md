# TIP-V46-824 — Admin i18n execution checkpoint

**STATUS: PARTIAL / IN PROGRESS — NOT DONE, NOT READY TO MERGE.**

- Date: 11/11/2026. Branch: `feature/TIP-V46-824-admin-i18n`, baseline `dev f7c1b2b8` plus approved planning commit `90bd954a`.
- Source checkpoint: **`9e207741`**. This is a foundation checkpoint, not delivery of the complete multilingual Admin.
- No merge, auto-merge, release, backend/SQL/schema/seed change, or original native service/DB operation was performed. No subagents or parallel implementation lanes.
- Dependencies inspected: 822/823 implementations are already in baseline; existing profile, overview, authentication and permission code remains unchanged.

## Delivered in this checkpoint

1. Split the existing 591-line settings catalog into six physical domain files; all existing `settings.*` callers retain the same logical namespace/types through the source-messages facade. Six existing component tests now import the facade rather than the removed JSON; no existing assertions were removed.
2. Verified **524 settings string leaves unchanged**, sorted key/value SHA-256 matches the TIP baseline. The complete legacy source remains **2,456 string leaves**. The digest is a content-integrity fixture, not a completion Git SHA.
3. Added allowlisted locale profiles for all 12 selector identities / 10 bundles; SG/BN retain their Intl identities while sharing EN/MS messages. Unsafe, missing and inherited-property cookie names fail closed before imports.
4. Added staged, reader-injectable loader and source-driven deep fallback: nested objects/arrays preserve shape, unknown keys cannot enter the resolved tree, duplicate settings roots fail safely, simultaneous locale reads do not mutate the Vietnamese source. These helpers are **not yet connected to request.ts**.
5. Added pure display formatters for counts, VND/USD, percent points and dates. Vietnam timezone and Gregorian calendar are forced, null/invalid inputs remain empty, invalid/ambiguous date strings are rejected. **Existing screen formatter callers have not yet migrated.**
6. Added raw catalog contract helpers using the public IntlMessageFormat AST. Negative fixtures cover absent locale/file, missing/extra keys, wrong scalar/object/array shapes, invalid ICU, renamed/type-changed arguments, changed tags/select selectors/explicit plural cases/offsets, empty/placeholder text, copied Vietnamese and NFC. The fixed all-bundle production readiness test is **not yet implemented**; helper tests are not a substitute for it.
7. Added opt-in AntD locale to shared UiProvider and instance-scoped DateRangePicker locale. Existing Vietnamese defaults and callbacks remain unchanged; no per-request global dayjs locale setter was introduced. Tested sibling provider isolation, controlled clearing/open-ended ranges and no mutation of caller dates/global locale.
8. Added only the approved direct devDependency `intl-messageformat` from the existing catalog, version11.2.15 as already used by Portal. Lockfile change is confined to the Admin importer; no package upgrade.

## Actual verification

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

## Acceptance evidence map — no full feature acceptance

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

## Findings and bounded adjustments

- The real vi source has an intentional empty action-column header: `settings.renewal.actions = ""`. Initial source-tree validation caught it. Keep the baseline UI/hash, permit only an explicitly documented exact path when both source/target are empty; tests reject blanking a nonempty source, an unrelated empty key, or whitespace. Clarification recorded in the TIP, not a namespace-wide exemption.
- Initial negative test exposed a missed Vietnamese accented character in copied-text detection; corrected the Unicode matcher and retained the regression. Final focused48 and full root results above supersede the failed exploratory runs.
- Split inventory found six existing tests importing removed settings.json. Manifest was extended before fixture-import edits. ICU AST comparison is a separate small helper, also declared before creation.
- This checkpoint deliberately retains existing request-time `authOverrides`: no untranslated fallback-resolved tree is mislabeled as nine finished translations. Missing dictionaries must be filled and independently validated before switching the runtime.

## Remaining work, in implementation order

1. Source namespaces meta/ui/bot-options, English catalog and every Admin route/tab/dialog/header/aria/title/local-validation migration, canonical-value adapters and formatter callers.
2. Full request loader integration, locale-aware HTML/metadata, Admin provider bridge, AntD fil/lo patches/dayjs integration, safe runtime message-error handling and translated shared-component label props.
3. All9 target catalogs with exact raw tree/ICU contracts; mandatory fixed-manifest catalog gate must fail missing files/locales. No Vietnamese copies as stand-ins. REVIEW/glossaries/native-reviewed=false remain to create.
4. Self-hosted script fonts with real licenses/provenance and script-selective loading.
5. Complete browser suites in both modes, all-route/bundle coverage, canonical payload/session/draft regressions, translated screenshots at1440/390, vi parity, performance/bundle measurements and fresh Portal-specific regression/build because shared UI changed.
6. Repeat final gates after full integration, update this report/traceability with actual evidence, push and open a reviewable PR into dev. Owner handles merge. Native-speaking review stays transparently pending under D-65/D-141; it is not used as an excuse to mark missing machine translations complete.

## Quality gate

- Scope/architecture: foundation changes stay inside the declared manifest; no app-to-app import, server/DB/API/permission/business change or production inline test suite.
- Verification: code/unit/static/build checkpoint passes, catalog completeness fails, runtime/browser/font/performance gates remain unverified.
- **Verdict: PARTIAL. Do not report TIP-V46-824-DONE or merge this checkpoint as the finished feature.** No owner decision is currently blocking the remaining implementation.
