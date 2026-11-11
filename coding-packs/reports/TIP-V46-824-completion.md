# TIP-V46-824 — Admin i18n execution report

**STATUS: IN PROGRESS / PARTIAL — NOT DONE, NOT READY TO MERGE.**
The active goal remains the entire approved TIP and all16 ACs. No scope reduction; the agent has not opened a PR, merged or released.

## Current checkpoint

- Date:2026-11-11. Branch: `feature/TIP-V46-824-admin-i18n`, baseline `dev f7c1b2b8` (822/823 already merged). Current source **042dedaf**, committed and pushed.
- Previous goal turn made concrete progress. No blocking external condition: substantial implementation/verification remains.
- Owner explicitly approved optional number-format props for shared Pagination/BulkBar, retaining Portal defaults/callbacks. Approval is recorded in TIP/manifest before those shared edits; no Portal business/source change.
- Native safety: no operation against original PG5432 data, no reset/repair/recreate of original `opchub_test`, no service/port teardown. Native-mode compilation used the isolated proxy configuration. Read-only font audits visited login in MSW/off builds without server fixtures, API mutations, seeds or DB access; they are not database/API verification.

## Delivered cumulatively

1. Split the original591-line settings catalog into6 physical parts with unchanged logical keys. Original524 settings leaves and all2456 original legacy leaves are hash-protected against baseline f7c1b2b8. Digests are integrity fixtures, never completion Git SHAs.
2. Added allowlisted locale profiles for12 choices /10 bundles, en-SG→en and ms-BN→ms while retaining selected identity. Request loading, deep source fallback, source facade, safe client ICU-error fallback, request timezone and html lang are connected. No authOverrides, prefix/URL/preference/API change.
3. Localized metadata at23 named routes including Profile. Finite server-lazy AntD map loads10 serializable dictionaries; custom fil/lo strings are complete for the installed control dictionary. Admin dayjs registration/provider is persistent and does not select singleton locale per request.
4. Complete AI-produced English raw catalogs:25 files /2660 leaves, including52 additive labels for AI operations/moderation/local validation. Existing Vietnamese text is unchanged. Exact keys/types/ICU/NFC/nonempty/copy rules pass before fallback; native-reviewed=false.
5. Canonical permission/menu/region/bot/rejection label projections and overview counts/percent/chart labels preserve existing API values, source keys, D-140 ranges/formulas and raw custom content. AI generation requests still use their existing content locale vi.
6. AI-call filters/columns/totals/errors/export/paging and moderation actions now follow UI locale; raw providers/models/error codes/actor IDs and filter/action values remain unchanged. Profile local Zod errors translate structurally and re-render on locale switch without losing draft/session or requesting invalid mutations. API errors remain raw even when matching a known local rule.
7. Content boundaries: event default description remains Vietnamese in payload; group CSV/Excel headers/cells/BOM/escaping/raw names preserve the old contract; Settings/Marketing previews retain actual Vietnamese email content while translating Admin chrome.
8. Current source wires all42 shared control callers:13 DateRangePicker,8 Pagination,5 BulkBar,4 RichTextField,12 Modal. AST tests check translated props/import aliases and negative fixtures; domain overrides and callbacks remain. This is not a full UI-literal/browser audit.
9. Picker display patterns cover all12 choices with Gregorian year and canonical YYYY-MM-DD unchanged. Generic presets are live functions using Vietnam calendar day across17:00Z/year/month/leap boundaries. Overview retains its own D-140 preset value functions.
10. Member/fee display dates, timestamps and VND callers now take the live locale; fee summary/toast counts localize without currency conversion or eligibility/query/export changes. The current checkpoint extends this to the remaining domain models/callers below.
11. Owner-approved optional `PaginationLabels.number` / `BulkBarProps.formatCount` format visible numbers only. Default Portal rendering, numeric page/size callbacks, selection visibility and actions are regression-tested. Admin opts in; shared UI has no next-intl/app dependency.

12. Current display migration covers93 actual model/presentation calls in50 UI files across14 modules (11 domains): stores/needs/requests/projects/investors/marketing/reports/affiliate/events/groups/settings, in addition to the earlier members/fees work. Compact money retains original VND/USD thresholds and JS toFixed/Math.round semantics; Vietnamese padded/non-padded dates, month labels and legacy email/campaign content are preserved. Event day/time projects canonical startsAt/endTime only for display, never changes form/API fields. Local calendar comparisons and group export date/search/sort remain canonical.
13. Settings bank/SSO/AI-provider, bot script and group chat/moderation inline display formatters now read the live locale. Script-type and known regional labels use exact canonical projections with custom-content fallback. Attachment size is already a raw API string and remains unchanged. The AST gate finds only one fixed-vi visible-format API exception: groups/model.ts private vnDate, exclusively used by immutable export cells/filenames. Other raw UI number interpolation/local-error/literal audits and browser acceptance are still open.

14. Added seven self-hosted WOFF2 assets from six pinned Google Fonts sources, all six byte-identical OFL/copyright files, a reproducible external build-only FontTools4.68.0/Brotli1.2.1 script and actual cmap/hash/shaping receipts. Static regular400; heavier weights use synthesis, not claimed weight masters. Latin is primary, only the selected SC/Thai/Khmer/Lao/Myanmar fallback is referenced. A9724-byte selector-only font covers all12 native names/countries; Unicode-range faces keep original per-script metrics, and the popover is bounded/scrollable. The Admin auth root overrides its shared system stack via a zero-box marker; Portal/shared code is unchanged.
15. Font technical proof:31 units, two byte-identical builds and48 font-only browser cases (12 choices x1440/390 xMSW/off). CDP checks actual custom fonts on the active label and24 native-name/country text nodes, no installed-font fallback, selected-script-only initial downloads, one extra small menu asset, viewport bounds, Escape and no browser errors. This does NOT prove absent translations, all-screen glyphs/screenshots, backend/native integration or JS performance. Current catalog glyph scope is present vi/en/zh/id plus native selector names; regenerate/assert all target catalog glyphs when those catalogs exist.

16. Complete Simplified Chinese raw catalog:25 files /2660 leaves,41 raw/context/canonical tests.692 unambiguous Portal exact-source matches retained,1962 translated/context-reviewed leaves,6 canonical copies.37 context corrections distinguish reports/abuse reports, email bodies/bank notes, open/pending states and representatives. AI-produced, native-reviewed=false. Actual request tests expose and fix nested-settings import globs by splitting each dynamic path segment; en/zh now assert all six merged settings domains and no fallback warnings. The intentional blank actions header no longer emits a false missing-translation warning; nonempty source still rejects empty targets.
17. Regenerated SC font from actual Chinese catalogs:1081440 bytes /7719 cmap entries,67 added entries, two identical generations. Chinese title/heading assertions plus four unmasked1440/390 login screenshots pass in MSW/off modes. Images are auth-only, not Profile/Dashboard. Agent visually inspected desktop/mobile MSW images for legibility/no tofu; no owner approval is claimed.

18. Complete Indonesian raw catalog:25 files /2660 leaves,45 raw/context/canonical cases.728 unambiguous exact-source Portal matches retained,1926 translated/context-corrected leaves,6 canonical examples retained.23 corrections distinguish reports/reporting actions, month-end payouts, event registration, audit categories and repository visibility. Native-reviewed=false; glossary/provenance in REVIEW. Actual request assertions cover auth/Profile/Overview/reports and all six merged settings parts with no fallback warning. Existing Latin font covers all Indonesian glyphs; no font binary or Portal change. Both production modes assert the actual Indonesian login heading/title in addition to existing Chinese and font assertions.

## Raw translation readiness — FAIL / INCOMPLETE

| Bundle | Files present / required | Raw leaves present / required |
|---|---:|---:|
| vi |25/25|2660/2660|
| en |25/25|2660/2660|
| zh |25/25|2660/2660|
| id |25/25|2660/2660|
| th/ms/fil/km/lo/my |0/25 each|0/2660 each|

Presence100/250 and complete English/Chinese/Indonesian are NOT whole-TIP acceptance. Six target bundles, their glossaries and the final fixed10-bundle production gate remain missing. Runtime fallback never counts as a translation. See [catalog audit](evidence/v46-824/catalog-audit.md) and [REVIEW](../../apps/admin/messages/REVIEW.md).

## Current verification — source 042dedaf

| Command / check | Actual evidence |
|---|---|
| `pnpm lint` | PASS,8 tasks /6 cached; Admin/e2e fresh |
| `pnpm typecheck` | PASS,8 tasks /6 cached; Admin/e2e fresh |
| `pnpm test` | **2670 passed +2 pre-existing skips**. Admin955 fresh; UI80, Portal476, shared757, server276, integrations126 cached;6 tasks /5 cached |
| Portal regression | **476 passed**,85 files, cached in this Admin-only checkpoint; prior fresh root run8aa9c974 and direct f5bb0479 are historical, not extra current tests. |
| `pnpm depcheck` | PASS, frontend/shared2726 modules8269 dependencies; server1260/5995 |
| Admin MSW production build | PASS, `.next-msw-tip824` |
| Admin mocking-off production build | PASS, `.next-server-tip824`; build only, NOT full native API/browser acceptance |
| Portal production MSW build | Prior PASS f5bb0479 after shared changes; no Portal/shared production change in this checkpoint, not rebuilt here. |
| Manifest/caps/logs |646 unique declared table paths; no undeclared changed path, changed source/catalog files≤400 lines; UTF-8/no ANSI; source/log whitespace and credential/control-character/missing-message scans clean. Six exact upstream OFL files retain original whitespace and hashes, excluded only from whitespace normalization |
| Font technical checks |31 units, reproducible7 binaries,24/24 MSW +24/24 mocking-off browser cases; actual custom-font/network/menu/bounds proof, not full catalog/API acceptance |
| Full browser/native API/screenshots/JS performance | NOT VERIFIED; remain required |

Current logs: [root gates](evidence/v46-824/quality-gates.log), [unit (Portal cached)](evidence/v46-824/unit.log), [Admin MSW](evidence/v46-824/build-msw.log), [Admin mocking-off](evidence/v46-824/build-native.log), [fonts generation + both browser modes](evidence/v46-824/fonts.log). Historical f5bb0479 logs retained: [direct Portal unit](evidence/v46-824/portal-unit.log), [Portal build](evidence/v46-824/build-portal.log).

New unit cases this checkpoint:Indonesian45, actual request1, glyph1 (47 total). Focused6-file164 pass. Root unit results and48 browser cases are separate counts. Initial actual-request test exposed a stale Vitest filesystem module cache that still excluded the newly added id folder. The documented `vitest --clearCache` invalidated generated test caches, without source/DB/service changes; default focused/root tests then include the real bundle. No fallback assertion was removed, loader replaced with a mock, or cache issue presented as production success. Expected jsdom/AntD/NO_COLOR warnings remain in logs. Build/test timing is not a performance benchmark.

## Current acceptance audit — all16 retained

| AC | Authoritative proof / remaining requirement |
|---|---|
|01|Locale/alias/unsafe-cookie/request units pass; full selector/browser identity belongs to pending browser acceptance.|
|02|vi/en/zh/id raw contracts pass;6 bundles and final fixed10-bundle gate missing — overall FAIL.|
|03|Original settings/legacy hashes, duplicate-root, shape/fallback/isolation and client safe-error units pass.|
|04|Metadata/auth implementation retained; Chinese/Indonesian login heading/title pass both modes, but all-locale auth/2FA browser flow evidence missing. Historical SSR4/4 belongs to55116347, not current browser/native proof.|
|05|Provider/Profile draft/session units pass; URL/query/hash/paging/session browser assertions pending.|
|06|AI/moderation and all shared callers localized; comprehensive literal audit and full English routes/states/tabs/dialogs browser matrix pending.|
|07|Six target catalogs absent; four Chinese auth-only images exist, required full-screen images remain incomplete.|
|08|Pure/compact/domain/event/picker/optional-number and export-byte units pass;93 model callers have live-locale AST proof, only fixed-vi export Intl remains. Raw number interpolation audit and browser boundaries still pending.|
|09|All10 AntD locale import/serialization/custom-string units and42 caller AST checks pass; actual all-locale controls/fonts/browser proof pending.|
|10|Structured local issues and live Profile password errors/draft units pass; other form/auth/upload errors and browser switching still pending.|
|11|Canonical projections, event default, AI filter/moderation/optional numeric callback units pass; browser save-value/RBAC assertions pending.|
|12|Raw API negative and CSV/Excel/email-preview boundaries pass by unit; actual translated-mode API/audit/notification/email/export browser negatives pending.|
|13|Settings-language wiring unchanged; selector/config independence browser proof missing.|
|14|Both current Admin builds and identical24-case MSW/off font-only audits pass; complete identical MSW/native i18n behavior suites still NOT RUN.|
|15|Font-only1440/390 selector glyph/custom-font/menu-bounds/Escape/no-error assertions pass in both modes. Required full-screen unmasked glyph/focus/hydration/vi-parity images remain missing; no owner image approval fabricated.|
|16|Selected-bundle/font architecture and per-locale script network isolation have font-only browser proof; font binary sizes/hashes are recorded. Executable JS/RSC/catalog/full-page isolation/baseline performance measurements remain missing.|

Chinese current browser coverage: login title + heading in both modes, with unmasked [MSW desktop](evidence/v46-824/zh-auth-msw-1440.png), [MSW mobile](evidence/v46-824/zh-auth-msw-390.png), [mocking-off desktop](evidence/v46-824/zh-auth-server-1440.png) and [mocking-off mobile](evidence/v46-824/zh-auth-server-390.png). These are actual login images, not Profile or Dashboard. Initial screenshot persistence failed on ESM __dirname; using import.meta.url fixed the test harness, and the unchanged title/heading/custom-font assertions then passed.

## Next work — same full goal

1. Finish remaining raw UI number interpolation, local form/auth/upload errors, and comprehensive AST literal audit with exact file/literal/reason exceptions. Do not alter parsers/search/date machine fields, API errors, exports, content or D-140.
2. English browser smoke every route/state/main tab/dialog, then remaining6 target catalogs/glossaries and mandatory fixed-bundle raw gate. No directory-discovery skip, copied vi or TODO stand-ins.
3. Extend font glyph assertions to every target catalog when produced; full-screen/control rendering and same MSW/native i18n assertions, profile/overview/auth/Portal regressions, unmasked1440/390 screenshots and measured baseline/current JS/catalog/font performance.
4. Re-audit every numbered requirement, all16 ACs and named artifacts against actual evidence. Only then finalize clean/push, PR into dev for owner review. Never auto-merge/release main.

## Historical evidence

Earlier detailed checkpoints remain in Git: foundation9e207741 / report b61c1007; runtime55116347 / report ee41244b; English ec97a874 / report704810e9; AI/validation9e962712 / report fbf0b481; controls/shared compatibility f5bb0479 / report a45252d6; domain display8aa9c974 / report bde191dd; fonts c90db9f8 / report29fa8a8a; Chinese f1cca64b / report7b5e3734. This compact report replaces repeated historical sections, not their Git evidence. Shared log filenames now contain the current runs. No previous partial PASS is promoted into whole-feature acceptance.
