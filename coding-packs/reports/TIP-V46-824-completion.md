# TIP-V46-824 — Admin i18n execution report

**STATUS: IN PROGRESS / PARTIAL — NOT DONE, NOT READY TO MERGE.**
The active goal remains the entire approved TIP and all16 ACs. No scope reduction; the agent has not opened a PR, merged or released.

## Current checkpoint

- Date:2026-11-11. Branch: `feature/TIP-V46-824-admin-i18n`, baseline `dev f7c1b2b8` (822/823 already merged). Current source **f5bb0479**, committed and pushed.
- Previous goal turn made concrete progress. No blocking external condition: substantial implementation/verification remains.
- Owner explicitly approved optional number-format props for shared Pagination/BulkBar, retaining Portal defaults/callbacks. Approval is recorded in TIP/manifest before those shared edits; no Portal business/source change.
- Native safety: no operation against original PG5432 data, no reset/repair/recreate of original `opchub_test`, no service/port teardown. Native-mode compilation used the isolated proxy configuration, not database/API verification.

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
10. Member/fee display dates, timestamps and VND callers now take the live locale; fee summary/toast counts localize without currency conversion or eligibility/query/export changes. Other domains still need formatter migration.
11. Owner-approved optional `PaginationLabels.number` / `BulkBarProps.formatCount` format visible numbers only. Default Portal rendering, numeric page/size callbacks, selection visibility and actions are regression-tested. Admin opts in; shared UI has no next-intl/app dependency.

## Raw translation readiness — FAIL / INCOMPLETE

| Bundle | Files present / required | Raw leaves present / required |
|---|---:|---:|
| vi |25/25|2660/2660|
| en |25/25|2660/2660|
| zh/id/th/ms/fil/km/lo/my |0/25 each|0/2660 each|

Presence50/250 and complete English are NOT whole-TIP acceptance. Eight target bundles, their glossaries and the final fixed10-bundle production gate remain missing. Runtime fallback never counts as a translation. See [catalog audit](evidence/v46-824/catalog-audit.md) and [REVIEW](../../apps/admin/messages/REVIEW.md).

## Current verification — source f5bb0479

| Command / check | Actual evidence |
|---|---|
| `pnpm lint` | PASS,8 tasks /6 cached; Admin/UI fresh |
| `pnpm typecheck` | PASS,8 tasks /6 cached; Admin/UI fresh |
| `pnpm test` | **2477 passed +2 pre-existing skips**. Admin762 and UI80 fresh; Portal476/shared757/server276/integrations126 cached;6 tasks /4 cached |
| `pnpm --filter @opchub/portal test` | **476 passed**,85 files, fresh direct run (not Turbo replay); do not double-count these in root total |
| `pnpm depcheck` | PASS, frontend/shared2710 modules8179 dependencies; server1260/5995 |
| Admin MSW production build | PASS, `.next-msw-tip824` |
| Admin mocking-off production build | PASS, `.next-server-tip824`; build only, NOT native API/browser acceptance |
| Portal production MSW build | PASS, `.next-msw-tip824`, after shared changes |
| Manifest/caps/logs |621 unique declared paths; no undeclared changed path, changed source/catalog files≤400 lines; UTF-8/no ANSI/trailing spaces; credential/control-character scan and unexpected missing-message scan clean |
| Current browser/native API/visual/fonts/performance | NOT VERIFIED; remain required |

Current logs: [root gates](evidence/v46-824/quality-gates.log), [unit](evidence/v46-824/unit.log), [fresh Portal unit](evidence/v46-824/portal-unit.log), [Admin MSW](evidence/v46-824/build-msw.log), [Admin mocking-off](evidence/v46-824/build-native.log), [Portal build](evidence/v46-824/build-portal.log).

New tests this checkpoint:13 picker +7 control-caller AST +5 member +4 fee +4 shared optional-prop cases. Focused runs also retained existing control/default/affiliate assertions. Initial root run found2 failed affiliate bulk tests because their shared provider fixture lacked ui messages; added the actual catalog, kept assertions, and reran all root gates. A TypeScript JSX-name union was handled properly, not suppressed. Duplicate manifest entries were consolidated; absent fee model suite was declared create before writing it. Expected jsdom pseudo-element getComputedStyle warnings remain; they are not browser proof or silenced assertions. Slow/cached task timings are not performance benchmarks.

## Current acceptance audit — all16 retained

| AC | Authoritative proof / remaining requirement |
|---|---|
|01|Locale/alias/unsafe-cookie/request units pass; full selector/browser identity belongs to pending browser acceptance.|
|02|vi/en raw contracts pass;8 bundles and final fixed10-bundle gate missing — overall FAIL.|
|03|Original settings/legacy hashes, duplicate-root, shape/fallback/isolation and client safe-error units pass.|
|04|Metadata/auth implementation retained; all-locale auth/browser flow evidence missing. Historical SSR4/4 belongs to55116347, not current browser/native proof.|
|05|Provider/Profile draft/session units pass; URL/query/hash/paging/session browser assertions pending.|
|06|AI/moderation and all shared callers localized; comprehensive literal audit and full English routes/states/tabs/dialogs browser matrix pending.|
|07|Eight target catalogs and required translated viewport images absent.|
|08|Pure/overview/member/fee/picker/optional-number and export-byte units pass; remaining domain display formatters and browser boundaries pending.|
|09|All10 AntD locale import/serialization/custom-string units and42 caller AST checks pass; actual all-locale controls/fonts/browser proof pending.|
|10|Structured local issues and live Profile password errors/draft units pass; other form/auth/upload errors and browser switching still pending.|
|11|Canonical projections, event default, AI filter/moderation/optional numeric callback units pass; browser save-value/RBAC assertions pending.|
|12|Raw API negative and CSV/Excel/email-preview boundaries pass by unit; actual translated-mode API/audit/notification/email/export browser negatives pending.|
|13|Settings-language wiring unchanged; selector/config independence browser proof missing.|
|14|Both current Admin build modes compile; identical MSW/native i18n behavior suites still NOT RUN.|
|15|Required unmasked1440/390 glyph/focus/hydration and vi-parity evidence missing; no owner image approval fabricated.|
|16|Selected-bundle architecture exists; executable JS/RSC/catalog/font/isolation/performance measurements missing.|

## Next work — same full goal

1. Finish other domain display formatters/callers, remaining local form/auth/upload errors, and comprehensive AST literal audit with exact file/literal/reason exceptions. Do not alter parsers/search/date machine fields, API errors, exports, content or D-140.
2. English browser smoke every route/state/main tab/dialog, then all8 target catalogs/glossaries and mandatory fixed-bundle raw gate. No directory-discovery skip, copied vi or TODO stand-ins.
3. Licensed self-hosted script-scoped fonts/provenance; actual glyph/control rendering, same MSW/native assertions, profile/overview/auth/Portal language/shell regressions, unmasked1440/390 screenshots and measured baseline/current JS/catalog/font performance.
4. Re-audit every numbered requirement, all16 ACs and named artifacts against actual evidence. Only then finalize clean/push, PR into dev for owner review. Never auto-merge/release main.

## Historical evidence

Earlier detailed checkpoints remain in Git: foundation9e207741 / report b61c1007; runtime55116347 / report ee41244b; English ec97a874 / report704810e9; AI/validation9e962712 / report fbf0b481. This compact report replaces repeated historical sections, not their Git evidence. Shared log filenames now contain the current runs. No previous partial PASS is promoted into whole-feature acceptance.
