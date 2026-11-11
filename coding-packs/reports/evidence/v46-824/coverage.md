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
