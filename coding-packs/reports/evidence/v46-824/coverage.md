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
| `apps/admin/src/app/(admin)/affiliate/[[...slug]]/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/bots/[[...slug]]/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/events/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/fees/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/fees/transactions/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/groups/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/groups/[id]/chat/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/investors/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/marketing/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/members/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/needs/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/overview/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/profile/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/projects/[[...slug]]/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/reports/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/requests/[[...tab]]/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/settings/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(admin)/stores/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(public)/first-password/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(public)/forgot-password/page.tsx` | generateMetadata/getTranslations(meta) | vi/en local-error switching at1440/390, MSW/off: draft/query/hash/cookie/title/no-overflow/no-client-error/zero API mutations; not full auth flow |
| `apps/admin/src/app/(public)/login/page.tsx` | generateMetadata/getTranslations(meta) | vi/en local-error switching at1440/390, MSW/off: draft/query/hash/cookie/title/no-overflow/no-client-error/zero API mutations; not full auth flow |
| `apps/admin/src/app/(public)/reset-password/page.tsx` | generateMetadata/getTranslations(meta) | vi/en local-error switching at1440/390, MSW/off: draft/query/hash/cookie/title/no-overflow/no-client-error/zero API mutations; not full auth flow |
| `apps/admin/src/app/(public)/two-factor/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |

## Domain client-validation unit checkpoint e6c241bb

Affiliate policy/bank, bot type, pricing and notification errors now have19 new schema/hook/component tests, plus11 existing validation regressions in a focused30-case run. Complete fresh root tests pass. Raw API collisions, cleared/stale errors, unchanged drafts/whitelists, integer/parser/version payloads and bank normalization only on explicit save are covered. These are NOT domain browser or native API verification; route rows above remain unverified outside their stated public-auth scope. Current vi/en/zh/id raw bundles have2666 leaves each; six bundles remain absent.
