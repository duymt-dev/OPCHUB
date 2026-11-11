# TIP824 coverage and production SSR smoke

**Partial evidence only.** Metadata implementation is not proof that a route body, dialog, every locale or API is verified.

## Actual production HTTP smoke

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
| `apps/admin/src/app/(public)/forgot-password/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(public)/login/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(public)/reset-password/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
| `apps/admin/src/app/(public)/two-factor/page.tsx` | generateMetadata/getTranslations(meta) | NOT VERIFIED except login SSR subset |
