# TIP-V46-810 — Public business store page

**STATUS: IN-PROGRESS — full gates still running; not ready to merge.**

- Branch: `feature/TIP-V46-810-store-public-page`, from dev `b5e12ac0`.
- Approved TIP commit: `acc44f62`.
- Source commit / PR: pending the complete lint/type/unit checkpoint.
- Owner confirmed reuse of `opchub_v46_801_dev` / `opchub_v46_801_test`, Memurai6381
  (dev1/test2), and rolling the private809 services to810. Original native DBs/Redis6379
  are not migration, seed or reset targets.

## Delivered scope / files

Exact inventory: TIP **Files touched**, execution refinements and
`git diff --name-status b5e12ac0..HEAD` (plus the current uncommitted checkpoint until committed).

- DB: nullable unique stable slug and3 SEO columns, additive CHECKs, deterministic single-SQL
  migration backfill, down.sql, shared name-to-slug demo seed.
- Shared: pure slug/smallest-suffix allocator, strict patch/config schemas and separate anonymous
  DTO allowlist; mock public configuration, request-local SSR cookie projection and tests.
- Server local-business: indexed unique public lookup + separately bounded50 items; protected
  owner GET/PATCH; anonymous throttled GET, Redis60s and post-commit invalidation on owner
  save/publish/unpublish/Admin moderation. No public KPI increments or account/document fields.
- Portal: anonymous dynamic SSR `/g/[slug]`, real title/description/canonical/OG/robots,
  translated404, no auth shell or session API; reusable presentation components narrowed to
  safe public props. Public configuration card in dashboard and edit wizard, serialized
  autosave/optimistic switch rollback, clipboard fallback selection and genuine new-tab guest view.
- Admin: extracted read-only public link/copy in drawer; no SEO or slug editing.
- Ten Portal message bundles, environment examples/validation, go-live/Nginx documentation,
  isolated tests, parity inventory and glossary. No dependency or stack changes.

## Actual checks so far

Logs under ignored `test-results/`; final full results will replace running entries, not
erase initial failures. Resource-bounded pools do not change assertions/isolation/timeouts.

| Gate | Current evidence |
|---|---|
| baseline809 full MSW |375 passed,4 skipped,26.5min; `v46-810-baseline-e2e.log` |
| baseline P108/P109 |6/6 harness/captures; `v46-810-baseline-parity.log` |
| scoped shared |17/17; `v46-810-shared-r2.log` |
| card + env regression |9/9 after modular extraction; `v46-810-card-unit-r2.log` |
| Admin link |3/3; `v46-810-admin-link-unit.log` |
| lint |8/8; `v46-810-lint-r4.log`; final screenshot-path-only test edit awaits cached rerun |
| typecheck |8/8; `v46-810-type-r6.log` |
| unit full |second full PASS2109 +2skip,6/6 tasks,33m6.502s; post-extraction/final CSS graph rerun running |
| integration scope |10/10 API +2 backfill +2 actual plan cases; `v46-810-public-api-r3.log`, `v46-810-public-int.log` (initial API failure retained) |
| full integration |running, private pair only; `v46-810-full-integration.log` |
| depcheck |both graphs PASS; `v46-810-depcheck-final.log` |
| root MSW build |3/3; `v46-810-build-msw-final.log` |
| native build |Portal/Admin PASS, final modular Portal rebuilt; `v46-810-build-native.log`, `v46-810-build-native-portal-final.log` |
| full MSW |first810 run361 pass/18 fail/4 skip due wrong build relay origin; corrected final full running |
| native behavior |initial and modular final-source both4/4; final visual capture rerun planned; `v46-810-native-public.log`, `v46-810-native-final.log` |
| parity reference D134 |card desktop below3%, mobile3.088%; actual UI differences fixed, remaining data/TIP differences documented below; native capture pending |

## Acceptance traceability

| Criterion | Evidence |
|---|---|
| Vietnamese normalization / fallback /60 cap / smallest suffix |shared slug tests |
| Duplicate concurrent creation, idempotency, stable rename |API `slug`; exact migration replay `store-slug-backfill.int.spec.ts` |
| Anonymous server HTML and SEO/canonical/OG, no private controls |identical MSW/native `guest view`; response body contains business/items before hydration |
| Public DTO whitelist, business contacts only, team/cert projection |API `public dto`, shared mock projection; forbidden fields independently asserted |
| TC494 immediate switch save, index/noindex, link remains accessible |API `seo index`, card unit `TC-494`, identical `google toggle` E2E |
| SEO max70/160, count, trim/strict body, default fallback |shared schema/card tests, API `seo fields`, identical E2E |
| Clipboard success/failure selection and real guest tab |card unit, identical `copy and view` E2E |
| Draft/hidden/expired/deleted/malformed/nonexistent visibility |API `visibility`/`access`, native/MSW `not found`, card warnings |
| No guest view_count/daily writes |API `no view count` |
| Personal403, missing business store404, hidden PATCH409, unauth401, oversized413 |API `access`/`seo fields` |
| Rate60/min, cache TTL/reuse/corruption/failure |API `rate limit`/`cache` |
| PUT/publish/unpublish/Admin hide/show invalidation and Admin audit retained |API `cache invalidation` (10th case), actual HTTP transitions and audit count |
| Authenticated detail share/public-profile target |`detail-hero.tsx` now uses `/g/<slug>`; full stores regressions running |
| Admin read-only link/copy/error |Admin3 tests |
| SQL seek +50 bounded items |actual10k-row EXPLAIN tests/report |
| No regression / final full behavior |not yet complete; no DONE claim |
| Card parity / guest owner screenshots |card measured; native/guest final captures being preserved for review |

## Migration / query evidence

Prisma create-only generated in an ignored staging migrations path, with all prior migration
history copied unchanged. `TERM=dumb` initially made Prisma noninteractive; setting an actual
interactive TERM and confirming creation generated the SQL. Its unrelated DROP FK/index
proposals were inspected and excluded; none were applied. Only the reviewed migration
`20261112090000_v46_store_public_page` was deployed successfully to both private DBs.
No old migration SQL, applied checksum, or `_prisma_migrations` history was edited/deleted.
Exact migration replay and down/CHECK tests both passed on connection-local temporary tables.

[Actual query plans](TIP-V46-810-query-plans.md):10k wide stores/10k items, cloned real indexes,
no planner forcing/public fixture rewrites. Unique slug → indexed owner/fee checks0.127ms;
items existing store_id/sort index + incremental sort0.148ms,50 results/51 boundary index rows.
No wide-table Seq Scan. No need to enlarge a unique B-tree with all public JSON/text payloads.

## Findings resolved / retained history

1. New JSON-default edge: direct Store rows may have `socials={}`. Initial scoped API responses
   failed schema validation (5 API cases), not a database/index failure. Public mapper now
   applies the existing empty-contact/array defaults and strips private JSON keys.10/10 API
   cases pass afterwards; original red log retained.
2. New env contract broke one existing native build-config fixture. It now supplies the required
   `API_INTERNAL_URL`; both original proxy assertions are unchanged, with an extra missing-env
   rejection test. No production fallback to a wrong/public origin.
3. Initial guest E2E used `toHaveText(title)` (hidden innerText was empty despite a correct title).
   Changed to document-title assertion, not different expected text. All4 cases passed both modes.
4. Initial card parity exposed genuine height/heading/button differences; measured computed
   boxes, fixed the actual CSS. Prototype mobile retained scroll also put its sticky topbar over
   the card; resetting scroll on both sides captures the whole unobscured card, no mask/crop.
5. Initial810 MSW infrastructure used new3910/3911 listeners but an Admin build targeting the
   old3900 relay. The shared cross-app persistence bridge therefore wrote to a different Portal
   origin: bot opening-history0, prices and other cross-app cases failed. An isolated bot run
   reproduced it. This is an810 build/setup error, **not proof of a production bot regression or
   a repaired legacy flake**. Rebuilt both apps with matching3910 target; full rerun in progress.
   No bot/price assertions, fixtures, production logic or timeouts were changed.

## Parity / explicit TIP defaults / limitations

- Q810-1..6 use the TIP's explicit defaults, not invented owner decisions: card in both places;
  stable slug; visibleStore only/no KPI; title70; declared business contacts; read-only Admin link.
- Saved-empty inputs intentionally use placeholders rather than prototype filled defaults:
  gray text/counter0 versus40, as specified in TIP. Local3910/3700 link differs from prototype
  `opchub.community` by deployment data. Guest opens a real new tab rather than a prototype toast.
- After real CSS fixes, the reviewed mobile pair has matching layout;3.088% remaining is the
  domain/placeholder/counter difference; final exact button-padding/shadow refinement is being recaptured. D134 is reference + owner review, not
  a fabricated parity PASS. No masks, relaxed tolerance, baseline replacement or ledger edits.
- Prototype has no anonymous guest page: guest images are actual app captures, pixel score N/A. The white existing brand asset now uses the existing navy brand background so it remains visible on the white guest header.
- Redis/API is the single60s data cache. SSR uses force-dynamic/no Next data cache (plus React
  request-local metadata/page deduplication) so write invalidation is not followed by another
  stale60s Next layer. Fee/deletion changes and externally cached API responses can remain
  stale for up to the documented60s; hide/owner changes invalidate server keys immediately.
- Additive optional-nullable detail slug preserves legacy typed fixtures; migration/create/demo
  paths provide real stable slugs. No slug editor/redirect, sitemap, robots.txt, JSON-LD, public
  view analytics, guest needs/projects, or generated OG images.

## Native HOLD / final review (pending final verification)

Private API4300/socket4301/worker and Next3700/3701 have been rolled with owner authorization.
Separate MSW3910/3911 avoids replacing809's3900/3901 baseline listeners. Actual final process
manifest, two idempotent demo seeds/counts and final smoke will be recorded before DONE.
Do not merge while any required full gate remains red/running.

Hard rules review: modular caps and separate tests; shared input/response schemas; no app/domain
cross-import cycle; normal backend ownership/permission guards; indexed/bounded SQL; no new
chat fanout; conditional writes/transitions and existing publish outbox; integer VND; existing
Admin moderation audit retained; no external providers/dependencies/secrets; server-only new
env keys declared in both examples/schema/go-live. Final git cleanliness/commit/push/PR pending.
