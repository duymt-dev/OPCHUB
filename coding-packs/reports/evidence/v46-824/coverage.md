# TIP824 coverage and production SSR smoke

**Partial evidence only.** Metadata implementation is not proof that a route body, dialog, every locale or API is verified.

## Historical production HTTP smoke (source55116347, not current browser evidence)

[
    {
        "cookie":  "vi",
        "status":  "200",
        "htmlLang":  "vi",
        "title":  "Đăng nhập · OPC Hub Admin",
        "noindex":  true
    },
    {
        "cookie":  "en-SG",
        "status":  "200",
        "htmlLang":  "en-SG",
        "title":  "Sign in · OPC Hub Admin",
        "noindex":  true
    },
    {
        "cookie":  "en",
        "status":  "200",
        "htmlLang":  "en",
        "title":  "Sign in · OPC Hub Admin",
        "noindex":  true
    },
    {
        "cookie":  "__proto__",
        "status":  "200",
        "htmlLang":  "vi",
        "title":  "Đăng nhập · OPC Hub Admin",
        "noindex":  true
    }
]

Each case used curl.exe with an explicit NEXT_LOCALE Cookie against the production MSW build. The temporary listener was stopped and its port verified absent. No headless browser or native API was exercised.

## Current public-auth local-error browser checkpoint

Tested working tree committed as77484e3f, 2026-11-11. Actual command: Playwright config `audit/playwright.admin-local-errors.config.ts`, repeated unchanged with E2E_TARGET=msw/server. **8/8 cases each mode**, four states x1440/390, vi -> en -> vi through the real selector. [Output](local-errors.log). No database setup/fixtures/seeds. Every case requires zero API mutation requests; mocking-off is genuine production UI, not backend/2FA/native-data acceptance.

| Route/state | Actual scope | Remaining |
|---|---|---|
| /login, missing password | live local error, identifier draft, metadata, URL/query/hash, cookie, no overflow/client errors | valid/invalid credentials, MFA/lock/refresh, all12 choices |
| /forgot-password, invalid email | live error and email draft plus same assertions | real reset-link request/email flow |
| /reset-password, mismatched passwords | live error and both password drafts plus same assertions | real reset request, backend fields/token expiry |
| /reset-password, missing token | live initial invalid-link copy plus same assertions | real expired/malformed-token API flow |

First-password and TOTP/2FA local/raw cases have actual component/hook unit proof, **not browser proof**. Full English domain routes, tabs/dialogs and all10 bundles remain unverified. No Dashboard image is used as Profile evidence.

## Named metadata routes

| Route source | Metadata implementation | Browser/body/locale coverage |
|---|---|---|
| `apps/admin/src/app/(admin)/affiliate/[[...slug]]/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/bots/[[...slug]]/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/events/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/fees/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/fees/transactions/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/groups/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/groups/[id]/chat/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/investors/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/marketing/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/members/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/needs/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/overview/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/profile/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/projects/[[...slug]]/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/reports/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/requests/[[...tab]]/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/settings/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(admin)/stores/page.tsx` | generateMetadata/getTranslations(meta) | en loaded title/body/chrome/tab assertions pass in MSW/private-native; see explicit matrix below. Other states/locales incomplete |
| `apps/admin/src/app/(public)/first-password/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(public)/forgot-password/page.tsx` | generateMetadata/getTranslations(meta) | vi/en local-error switching at1440/390, MSW/off: draft/query/hash/cookie/title/no-overflow/no-client-error/zero API mutations; not full auth flow |
| `apps/admin/src/app/(public)/login/page.tsx` | generateMetadata/getTranslations(meta) | vi/en local-error switching at1440/390, MSW/off: draft/query/hash/cookie/title/no-overflow/no-client-error/zero API mutations; not full auth flow |
| `apps/admin/src/app/(public)/reset-password/page.tsx` | generateMetadata/getTranslations(meta) | vi/en local-error switching at1440/390, MSW/off: draft/query/hash/cookie/title/no-overflow/no-client-error/zero API mutations; not full auth flow |
| `apps/admin/src/app/(public)/two-factor/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |

## Domain client-validation unit checkpoint e6c241bb

Affiliate policy/bank, bot type, pricing and notification errors now have19 new schema/hook/component tests, plus11 existing validation regressions in a focused30-case run. Complete fresh root tests pass. Raw API collisions, cleared/stale errors, unchanged drafts/whitelists, integer/parser/version payloads and bank normalization only on explicit save are covered. These are NOT domain browser or native API verification; route rows above remain unverified outside their stated public-auth scope. Current vi/en/zh/id raw bundles have2666 leaves each; six bundles remain absent.

## Malay raw/runtime/font checkpoint f76118f9

Actual fixed25-file raw validation,23 Admin-context cases and6 canonical-copy cases (54); real ms/ms-BN request configuration asserts selected identity, translated auth/Profile/Overview/reports and all six merged settings parts without fallback. These request assertions are unit-level, not authenticated-route browser verification.32 font units cover actual vi/en/zh/id/ms glyphs. Actual24/24 MSW +24/24 mocking-off font cases now also assert Malay login headings/titles for ms/ms-BN at1440/390, with the same custom-font/network/menu-bounds/Escape/no-client-error assertions. No native database setup/fixtures/seeds, full API acceptance or full-screen Malay/Profile/Dashboard screenshots are implied. Earlier vi/en public local-error cases remain sourcee6c241bb historical evidence. Current raw presence is125/250 files; th/fil/km/lo/my remain missing. Full route rows above retain their stated incomplete status.

## Source-number/literal checkpoint — sourcecba91c9f

All production584 Admin TS/TSX files outside named test/mock/declaration fixtures were scanned with real TypeScript syntax/semantic validation. The AST scan retains301 exact contractual findings with zero unreviewed/stale/invalid exceptions; no broad feature/file exemption.19 scanner negative cases protect English/unaccented visible text, aria/placeholder/indirect/tagged literals, numeric/coercion/interpolation/fallback expressions and exact-enum exception values. This is static AST/type analysis, not arbitrary interprocedural taint analysis; all English runtime route/tab/dialog states still require browser review.172 raw number expressions across87 UI files and2 static denominators now use live-locale display strings, with numeric drafts/DTOs/callbacks preserved. Known persona presets project labels; custom content and age values remain raw.

On the committed source, both production build modes and the identical24-case font /8-case public-auth local-error browser suites per mode pass. The16 public local-error cases are refreshed current evidence, not merely the earlier historical run. Native mode is mocking-off public pages with no database fixtures/seeds/API mutations, NOT full native API/domain acceptance. Existing full route rows remain incomplete. Current125/250 raw files have2667 leaves per present vi/en/zh/id/ms bundle; th/fil/km/lo/my remain absent. No native linguistic or owner visual approval claimed.


## Authenticated loaded-screen checkpoint — source016b9077

Identical standalone Playwright config e2e/playwright.admin-i18n.config.ts, test behavior/admin-i18n-screens.spec.ts, --project=behavior --workers=1, E2E_TARGET=msw/server. Production builds are separate. MSW uses the real existing Portal relay; server requires explicitly approved private API/DB configuration and SKIP_SEED=1, fails closed on original/default ports. No old global demo-reset/seed fixtures are imported. **68/68 each mode**:35 loaded viewport cases,1 case looping14 settings tabs,2 Settings screenshots,28 dialog cases,1 injected chrome negative,1 VI bot mobile five-tab navigation/transition case. 33 main states +14 settings =47 unique loaded states across17 base routes.

All browser cases demand real UI login200, expected html lang/title/body/active tab, no unexpected API failures or client errors, and no business writes (only login/refresh POST allowed). Native live listener parent and unchanged launch file were revalidated before use, not assumed from stale TEMP metadata. Existing private data was retained; common visible prerequisites pass but counts/content are not identical to MSW. No seed/reset/SQL/migration or original PG5432/test-DB change. Full native/all-language acceptance remains incomplete.

| Base route | Explicit English loaded states | Representative dialog/form opened/closed at1440/390 |
|---|---|---|
| /overview | Overview1440/390; actual member chart/conversion table | no dialog claimed |
| /members | list | Registration profile (not Dashboard evidence) |
| /fees | Membership fees | fee matching tested on transactions route |
| /fees/transactions | Transactions to reconcile | Match transaction manually; Cancel, never match |
| /groups | Group list, Message moderation | Create group; Export options/preview, never export |
| /bots | Automatic activity log, Personas, Conversation scripts, Conversations, Per-message replies | Create persona, Create script |
| /events | Content & Events | Create event |
| /stores | Stores | Store details |
| /needs | Local needs | no dedicated dialog claimed |
| /projects | Published, Pending review, Hidden, Changes required, Rejected, Drafts | View & review, never approve/reject |
| /investors | Investors | Investor details |
| /requests | Registration requests, Program & service catalog | Request details/internal discussion |
| /affiliate | Commissions, Affiliates, Regional Director, Regional Director settings, Policy | no policy edit/mutation claimed |
| /marketing | Campaigns, Automated email, Delivery log | Create campaign, never send/save |
| /reports | Reports | no actual export |
| /profile | My profile1440/390; Personal details, Change password, Security & Role | no save/password/upload mutation claimed |
| /settings | General, Industry categories, Roles & Permissions, Welcome email, SMTP, AI Provider, Pricing, Renewal reminders, Bank reconciliation, App & Notifications, Administrator accounts, Activity log, SSO, Languages | Create administrator; AI call log + custom provider filter (assert raw GET provider=custom), never create/save |

Every dialog requires the real visible trigger, English field labels, chrome scan, bounds at both sizes, document width<=viewport, visible close action and hidden panel afterward. VI bot navigation verifies all five actual tabs at390, waiting for busy indicators and pending API observations; long tabs and loading skeletons stay inside viewport. These are subset assertions, not arbitrary all-state or all-locale layout guarantees.

### Content boundary and negative proof

The chrome scanner checks visible headings/buttons/labels/table headers/tabs and aria-label/title/placeholder attributes for Vietnamese text while requiring named English anchors. It is not a general linguistic/whole-program proof. Content scalar fields are exact retained API fields (name/fullName/companyName/title/description/bio/note/body/subject/skills/intro/rules/reason); keywords and email-template label/hint use their endpoint-specific zod schemas. Native names/country labels,34 canonical province names and finite proper-name examples remain intentional. Actual CSV/Excel preview headers are exempt only on the preview table THs, using exactly nine existing Vietnamese export headers; field-picker chrome remains asserted English. No whole table/feature bypass. No actual export request occurs. An actual-app negative case injects text/aria/placeholder Vietnamese fixtures, requires scanner rejection, then removes them; no masks or positive-scan suppression.

### Images and limitations

Twelve full-page, unmasked images: en-{overview,profile,settings}-{msw,server}-{1440,390}.png. Captures wait for fonts and actual welcome toast lifecycle, not CSS hiding. [Profile native1440](en-profile-server-1440.png), [Overview native390](en-overview-server-390.png), [Settings native1440](en-settings-server-1440.png) were visually inspected for representative legibility/no tofu. No owner/native-language approval. Native profile identity/counts are existing fixture content, not translated or reseeded. Four Chinese auth images remain separate auth-only proof. [MSW output](english-msw.log), [private-native output](english-native.log).

Fresh current font24+24 and public-auth local-error8+8 suites also pass; together with authenticated68+68 and the20 navigation/probe cases below this is220 cases with distinct scopes, not a full TIP PASS. Root2823 passed +2 existing skips includes Admin1105 fresh and5 cached suites; focused3 are included, not additional root coverage. Source audit584/301/zero unreviewed has committed SHA/dirty=false.

Still unverified: group chat viewer, public first-password/2FA full flow, error/empty/403/loading matrix beyond observed Bot transitions, all secondary dialogs, remaining navigation/draft/session/control/value/API-content/export negatives, other-locale full-screen/control states, VI prototype/owner review, named full regressions and JS/RSC/catalog performance. Five bundles th/fil/km/lo/my remain absent; current vi/en/zh/id/ms each2667 leaves,125/250 files. Historical sections above retain their dated source scope; this section supersedes old statements that no authenticated English route subset had run. Whole TIP remains PARTIAL / NOT READY TO MERGE.


## Real-selector navigation and provider-refresh checkpoint — source016b9077

Actual command: same standalone config, behavior/admin-i18n-navigation.spec.ts, E2E_TARGET=msw/server. **10/10 each mode**, identical assertions and private-native safety guard. Eight cases per mode are actual pointer interactions through the existing selector; two are explicitly synthetic covered-selector React-handler events to probe provider refresh while a full-screen modal covers the topbar. No forced pointer clicks, cookie injection during switches, CSS/z-index/mask changes or business writes. Initial locale is set only before login by the existing openEnglish helper. This is not all-language/native acceptance or proof that a user can access a covered selector.

| Test scope (1440/390) | Actual assertions | Remaining |
|---|---|---|
| /members?view=list&st=active&page=2&size=1#i18n-member-state | real vi/en/vi selection; exact URL/query/hash, active status/raw page-size1, same single second-page row identity, Previous page enabled; F5 protected data and vi cookie/html persist; no logout/business writes | required Thai sequence, broader filters/selection/session expiry/RBAC |
| /profile?i18n=draft#profile-draft | unsaved name/phone/current/new/confirm password drafts retained; client weak-password error changes vi/en/vi, email remains disabled/raw, localized title; no profile/password request | actual uploads and backend errors/2FA |
| /profile?alias=identity#alias-draft | en-SG/ms-BN/en/vi real selector; exact selected cookie/html lang/native label/country flag/title, no draft reset | alias number/date boundaries and all-bundle body/control proof |
| /settings?tab=languages#language-settings | saved default and switch enabled-state snapshot unchanged across real vi/en/vi/F5; all12 choices, no settings PATCH; final English chrome scan | explicit disabled-config negative fixture, independent default change by authorized business action |
| /groups?tab=list#group-draft | synthetic actual selector React-handler events only; open drawer/title/labels and raw province/name/Vietnamese description survive vi/en/vi provider refresh; English computed region label projected, close action remains functional | not modal pointer/keyboard accessibility or business-save proof; existing drawer intentionally covers topbar |

Each locale choice also asserts active flag src and native text, exact unchanged URL and selected cookie. No test skips or mode-specific assertions. All cases reuse actual successful UI login200 and read-only API/browser-error guard. [MSW10](navigation-msw.log), [private-native10](navigation-native.log). The initial attempt to click the covered topbar was correctly rejected by real pointer actionability; the synthetic probe is separately named/documented and must not be promoted into user-accessibility evidence. No layout redesign was introduced to make a test green.

Three real group-field component cases additionally prove all north/central/south province projections en→vi→en, with unchanged raw name/description/province. The only production change this checkpoint projects regionOf(province) through the existing canonical-region adapter. Original Vietnamese label/value and field callbacks stay unchanged. Source audit corpus2022fe8ac2abd4a92823c93a5720ac81adbed57110c49907922546bcf1651b4f,584 source files/301 retained/zero unreviewed; root2823 +2 pre-existing skips, Admin1105 fresh. Current loaded68+68, navigation10+10, font24+24 and public-error8+8 total220 cases, including4 synthetic probes. Five catalogs and full acceptance remain incomplete.


## Filipino partial raw/auth checkpoint — sourcec12b477d

Twelve explicit raw files contain941/2667 leaves: affiliate/auth/bot-options/common/investors/needs/meta/overview/reports/requests/stores/ui.43 fixed cases pass before fallback:12 raw shape/key/ICU/NFC/nonempty/no-copy checks,30 Admin-context cases,1 actual Latin-cmap case over all941 leaves. Provenance277 retained Portal exact-source +664 direct/context-corrected leaves;40 reused matches corrected,537 distinct direct context pairs cover624 leaves. Native-reviewed=false. No source-prose/canonical/business/Portal/shared/font-binary/API change.

Whole Filipino bundle remains incomplete: bots/events/fees/groups/marketing/members/projects and six settings parts are absent (13/25 files,1726 missing leaves). Four other bundles th/km/lo/my remain absent; total137/250 files, final10-bundle raw gate still FAIL. Missing content is not filled with copied Vietnamese/English/TODO or counted through fallback. [Fixed inventory and43 tests](filipino.log), [readiness](catalog-audit.md), glossary/provenance in REVIEW.

Both Admin production builds pass. Fresh24/24 MSW +24/24 mocking-off font audits additionally assert actual Filipino login heading Maligayang pagbabalik! and title Mag-sign in at1440/390. This is auth/meta staged-file proof only, not whole Filipino authenticated body/control/native data acceptance. Existing font/network/menu/bounds assertions are unchanged; no font binary regeneration. Fresh8+8 public local-error cases still cover vi/en, not Filipino credential/2FA flows. No new Filipino full-screen Profile/Overview/Settings screenshots or owner/native-human review claimed. Earlier authenticated68+10 per mode remain source016b9077 evidence, not newly run for this partial catalog checkpoint.

Root2866 passed +2 pre-existing skips, Admin1148/179 files fresh and5 cached suites. First4-worker full run passed1147 with one existing enum fixture exceeding5000ms; complete2-worker rerun passes unchanged assertions/skips/timeouts. Current lint/typecheck8 tasks/6 cached, depcheck2779 modules/8528 dependencies, source audit584/301/zero unreviewed/dirty=false. The production-source fingerprint is unchanged and excludes catalogs/browser proof; raw941-leaf tests are separate evidence. Original database/services preserved. Whole TIP and all16 ACs stay open where requirements remain missing.


## Complete Filipino raw and actual three-screen checkpoint — sourcec0b97b51

Supersedes the staged12-file inventory above: all25 raw files/2667 leaves now exist.82 fixed Filipino cases (25 raw,50 Admin-context,6 canonical,1 full Latin-cmap),11 request cases (including real Filipino domains/all6 merged settings without fallback) and33 font cases pass; focused126 is included in root2907 +2 existing skips, Admin1189/179 files fresh,5 suites cached. Production loader unchanged; installed Vitest fsModuleCache had a stale pre-Filipino dynamic-import map. A temporary comment-only diagnostic identified it, then was removed; documented vitest --clearCache made the unchanged loader/assertions pass. No DB/source/API workaround.

Actual same-source browser command: standalone playwright.admin-i18n.config.ts behavior/admin-i18n-visual.spec.ts, repeated E2E_TARGET=msw/server. **6/6 each mode**: Filipino Overview/Profile/Settings x1440/390. Requires real login200/read-only API guard, exact Filipino html/title/h1/body anchors, Vietnamese-chrome scan with existing finite raw-content exceptions, document width<=viewport, fonts ready and actual welcome toast lifecycle before unmasked full-page capture. The scanner detects Vietnamese chrome, not Filipino fluency. Native live launch/port prerequisites were revalidated by the existing approved private-API wrapper check; no seed/reset/SQL/original service stop/business writes. Existing private data/counts deliberately differ from MSW, not reseeded.

Twelve images fil-{overview,profile,settings}-{msw,server}-{1440,390}.png; separate Profile is never replaced with Dashboard. [Native Profile1440](fil-profile-server-1440.png), [Overview390](fil-overview-server-390.png), [Settings390](fil-settings-server-390.png) were visually inspected. **Real finding: desktop sidebar labels and the community-group badge are clipped at the sidebar edge.** No-page-overflow assertions passed but are insufficient for this internal overflow. This is an owned AC15 FAIL, not waived by pixel tolerance or an external blocker. Next: Admin-only navigation label wrapping (new shell style module imported by RootLayout), exact text-range/badge bounds regression on expanded and mobile navigation, then rebuild/retest/rerender. Keep shared/Portal production, VI single-line layout, badges, collapsed icons and callbacks unchanged; do not shorten copy or mask images to hide it. No owner/native-human approval.

Fresh24+24 font and8+8 public local-error cases pass separately. Earlier English68+10 per mode remain source016b9077 evidence, not newly rerun. Current raw readiness150/250 files; th/km/lo/my and final fixed10-bundle gate absent. Complete Filipino catalog is not whole-TIP acceptance: sidebar correction, all-language/state/chat/auth/control/value/native/VI/visual/performance and named regressions remain open. [Filipino126](filipino.log), [MSW6](filipino-msw.log), [native6](filipino-native.log).


## Sidebar internal-clipping correction

Admin-only sidebar correction — source d6efb178 (2026-11-11). Original Filipino fees label extended to283.9375px while its link ended at231px desktop /255px mobile, despite a passing page-width assertion. RootLayout now imports a10-line Admin-only navigation stylesheet: min-width0, normal whitespace/overflow-wrap on labels and nonshrinking badges. Shared/Portal production, copy, fonts, colors, sidebar widths248/76/272 and icon19 remain unchanged.

Actual same-source sidebar7/7 MSW +7/7 approved private-native cases: vi/en/fil at1440/390, every actual text Range line and badge within its link, label/badge separation, full real badges, VI retains single-line layout, Filipino wraps. Real collapse/expand, visible icons/hidden mini labels, unchanged hrefs, focus+Enter navigation and mobile drawer close pass. The seventh case intentionally restores nowrap only on the actual long Filipino label, requires the internal-bounds assertion to fail while document width still passes, then removes the fixture and passes again. This is2 explicitly injected negative cases across modes, not extra user flows. Four unmasked expanded-sidebar images fil-sidebar-{msw,server}-{1440,390}.png and regenerated12 Filipino/12 English images; representative final native Profile1440 and expanded sidebars1440/390 were visually inspected. No owner/native-human approval.

Fresh full regression chain:68 loaded English +10 navigation/probe +6 Filipino +24 font +8 public-error cases per mode, plus7 sidebar =123/mode /246 total. The20 navigation cases include4 explicitly synthetic covered-modal selector-handler probes, not pointer-accessibility evidence. Fonts/public errors have distinct limited scopes. All authenticated subsets require real login200/read-only guard; native listener/approved launch isolation revalidated, no seed/reset/SQL/business writes/original PG5432/testDB/service change; login/refresh sessions only.

Root2910 passed +2 existing skips, Admin1192/180 files fresh,5 suites cached; lint/typecheck8 tasks/6 cached, depcheck2784modules/8543deps plus server1260/5995. Both Admin production builds pass; unchanged Portal build remains historical77484e3f, no fresh Portal build claimed.828 unique manifest paths, no undeclared changed source, all source caps/UTF8/log scans pass. Source AST584 files/301 retained findings/291 exceptions/zero unreviewed, corpus071a0c2dac01e16a2f8ac522f73e62f82dc4b7694d7e421078a3f6f20fd7f54f; CSS/catalogs/browser proof are outside that fingerprint.

Specific sidebar clipping finding is corrected and regression-verified, NOT a whole AC15/TIP PASS. vi/en/zh/id/ms/fil each25files/2667leaves; th/km/lo/my absent,150/250 files and final10-bundle raw gate still FAIL. All-language/state/chat/auth/control/value/API/export/native/VI/visual/performance and named regressions remain open. Owner has now approved an optional AppShell/Sidebar badge-number presentation callback with unchanged raw counts/navigation/default Portal; approved, not yet implemented in this source checkpoint. Entire TIP remains IN PROGRESS / NOT DONE / NOT READY TO MERGE.


## Approved optional badge formatting — actual regression

Source e7c6ca13 — approved optional AppShell/Sidebar badge formatter (2026-11-11). Added optional formatBadgeCount to shared types/Sidebar; AppShell already forwards props, so its implementation is unchanged. Admin opts in with its existing locale and pure numberText projection. Raw numeric badges, zero/absent truthiness, dots, hrefs/callbacks and Portal defaults remain unchanged. Shared UI has no next-intl dependency; Portal does not opt in and no Portal production file changed.

Browser red run exposed a real reduced-ICU difference: Node formats my-MM with Myanmar digits, Chromium156 resolves unsupported my-MM as en-US/Latin. Admin formatNumber now defaults numberingSystem=mymr only for selected my; explicit caller options still win. Unit simulation of reduced ICU verifies digits/zero/negative, plus VI and caller options. This preserves raw data/precision; it is not a new Myanmar prose catalog. Initial AdminShell81-line lint finding was fixed by reusing its existing locale with the pure formatter, not disabling the80-line rule. Initial shared-unit fixture names incorrectly assumed spaces between label/badge; corrected to actual accessible names, no production accessibility change.

Focused8 =5 actual shared AppShell/Sidebar tests +1 actual AdminShell contract test +2 number-format units. Shared tests exercise real forwarding, defaults, formatted numeric input, zero/absent/dot, rerender/removal, collapsed state and unchanged raw navigation. Admin composition mocks the shared boundary but uses the actual locale projection; reduced-ICU units and actual production browser cases are separate complementary proof. These8 are included in root2918, not extra.

Actual sidebar9/9 MSW +9/9 private-native: prior7 clipping/collapse/mobile/keyboard/negative cases retained, plus actual my→vi→en selector transitions at1440/390. Real seeded badge counts and hrefs remain unchanged; expected digits match, every line/badge stays inside links, URL/query/hash retained, mobile overlay closed by a normal uncovered pointer click. No forced handler/pointer event in these new cases. Myanmar body copy still falls back to VI because its raw catalog is absent; badge proof must not be called full Myanmar acceptance. Full fresh browser chain250 =2×(9sidebar+68loadedEnglish+10navigation/probe+6Filipino+24font+8public-error), including4 synthetic covered-modal handlers,2 internal-clipping negatives and the English scanner's injected negatives. Authenticated cases require real login200/read-only API guard; original PG5432/testDB/native services unchanged, no SQL/reset/seed/business write, approved private authentication sessions only.

Root2918 passed +2 pre-existing skips; Admin1195/182files and UI88 fresh,4 cached suites (Portal476/shared757/server276/integrations126). Lint8 tasks/7 cached, typecheck8/5 cached, depcheck2788modules/8550deps plus server1260/5995. Both Admin production builds pass. Fresh direct Portal476/85files and fresh Portal production MSW build pass against identical final shared/Portal inputs; Portal build preceded the final Admin-only Intl correction, which does not enter Portal. Existing store_sitemap_unavailable warnings retained, not sitemap/API acceptance.835 manifest paths; no undeclared changed file/cap violations. Source audit584/301/291exact exceptions/0unreviewed/0errors, committed dirty=false, corpusb145416ef4c6391489ba21d77aeaae2a4c29af4d8f7f69a9d2324025e6df5e81 (CSS/catalogs/browser proof excluded). All10 tested source/test/TIP/manifest blobs match the commit and worktree after normal hooks.

Entire TIP remains PARTIAL / NOT DONE / NOT READY TO MERGE. Six raw bundles vi/en/zh/id/ms/fil each25files/2667leaves,150/250 files; th/km/lo/my and final fixed10-bundle gate remain missing. All-language states/chat/auth/controls/values/API/export/native/VI/visual/performance and named acceptance regressions still require work. No PR/merge/release or native-human/owner visual approval claimed.


## Complete Thai catalog and actual three-screen proof

Complete Thai checkpoint source 264842f8 (2026-11-11). All25 physical files/2667 leaves, including6 settings parts.693 exact-source Portal Thai leaves retained,1968 direct/Admin-context-corrected leaves (includes1 existing blank header),6 canonical examples preserved.1693 distinct VI/English direct draft pairs,37 Portal context corrections. Reviewed ambiguous email body versus transfer reference, attendee list versus bullet list, pending-review states, referral affiliate versus general partner, funds, projects, month-end timing, clear versus delete, raw brand/URL and positive/negative status. Native-reviewed=false; no fallback/filler counts as translation.

83 fixed Thai cases =25 raw shape/key/ICU/NFC/no-copy +50 context +6 canonical +1 full2667-leaf English-filler/Thai-script check with53 exact neutral examples +1 unchanged Thai/Latin cmap check. Actual request test loads auth/Profile/Overview/reports and all6 settings parts without fallback;34 full font/asset cases now include all25 Thai files. Focused129 =83 Thai +12 request +34 font, included in root3003, not additional. Known Vitest fsModuleCache was cleared with documented --clearCache when introducing the new Thai directory; production loader code was not changed. All original2456 legacy /524 settings source leaves remain hash-protected. One pre-existing native badge test took its baseline before the async badge response; it now awaits the first actual badge attachment before the unchanged raw-count assertions, in both modes with the same default timeout. No fixture/production workaround. No production TS, API/DTO/callback/parser/enum/RBAC/query/export/email/DB/Portal/shared/font binary/license/dependency change.

Actual Thai6/6 MSW +6/6 approved private-native: Overview/Profile/Settings1440/390, actual login200, Thai html/title/h1/body anchors, Vietnamese-chrome scan with existing finite raw-content exceptions, no page-width overflow or browser/API failures, no business writes. Every desktop sidebar text/badge line also stays within links. Twelve unmasked full-page th-{overview,profile,settings}-{msw,server}-{1440,390}.png; separate Profile is never replaced by Dashboard evidence. Representative native Profile1440, Overview390 and Settings390 were visually inspected for legibility/no tofu/real wrapping, not native-human or owner approval. Mobile tables keep their existing internal horizontal scrolling; canonical timezone names/API data are intentionally raw. Native fixtures/counts retained, not reseeded to mimic MSW.

Fresh auth/font suites also assert actual Thai welcome heading/title and capture4 unmasked th-auth-{msw,server}-{1440,390}.png. That is auth-only proof within24 font cases/mode, not full credential/2FA/control/API acceptance. Same-source complete regression chain262 browser cases =2×(6 Thai+9 sidebar+68 English loaded+10 navigation/probe+6 Filipino+24 font+8 public-error); includes4 explicitly synthetic covered-modal selector-handler probes and the clipping/chrome scanner's injected negatives, not262 independent user workflows. Native listener/approved launch wrapper/isolated endpoint preconditions are revalidated, no SQL/seed/reset/original PG5432/testDB/service change, login/refresh sessions only.

Root3003 passed +2 existing skips, Admin1280/183 files fresh and5 suites cached (Portal476/UI88/shared757/server276/integrations126). Initial lint/typecheck8tasks/6cached; final harness-only readiness rerun8tasks/7cached, all6 root unit suites cache-replayed with identical unit inputs, depcheck2790modules/8561deps plus server1260/5995; both Admin production builds pass. Source e7c6ca13 fresh Portal476/build remains unchanged-input historical proof, not a fresh Portal rerun this checkpoint.856 unique manifest paths; no undeclared changed source or cap violations. All35 final tested catalog/test/README/manifest blobs match committed HEAD and worktree after normal hooks. Source CLI584/301/291 exact exceptions/zero unreviewed/dirty=false retains corpusb145416ef4c6391489ba21d77aeaae2a4c29af4d8f7f69a9d2324025e6df5e81; catalogs/browser tests are explicitly outside that fingerprint.

Whole TIP remains IN PROGRESS / PARTIAL / NOT DONE / NOT READY TO MERGE. Seven complete raw bundles vi/en/zh/id/ms/fil/th each25/2667;175/250 files. km/lo/my and final fixed10-bundle production gate remain missing. Full English error/empty/loading/403/chat/auth/secondary controls/values/API/export negatives, all-locale native controls/formatting/session/RBAC, VI/visual and JS/RSC/catalog/performance measurements and named full regressions remain open. Same full16-AC goal, no reduced success criteria or PR/merge/release.
