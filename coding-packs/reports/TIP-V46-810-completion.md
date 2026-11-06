# TIP-V46-810 — Public business store page

**STATUS: DONE — required execution gates PASS; PR ready for owner review.**

- Branch: `feature/TIP-V46-810-store-public-page`, from dev `b5e12ac0`.
- Approved TIP commit: `acc44f62`.
- Source commit: `6dbd352a49efdc36e96e4fb93c4ee7c288c9f48f`.
- Additional identical MSW/native hero Share assertion: `f2646cfd`.
- PR: [#88](https://github.com/duymt-dev/OPCHUB/pull/88), base `dev`; ready for owner review; no merge performed.
- Owner confirmed reuse of `opchub_v46_801_dev` / `opchub_v46_801_test`, Memurai6381
  (dev1/test2), and rolling the private809 services to810. Original native DBs/Redis6379
  are not migration, seed or reset targets.

## Delivered scope / files

Exact inventory: TIP **Files touched**, execution refinements and
`git diff --name-status b5e12ac0..HEAD`.

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

## Actual final checks

Logs under ignored `test-results/`; initial failures remain recorded below.
Resource-bounded pools do not change assertions/isolation/timeouts.

| Gate | Current evidence |
|---|---|
| baseline809 full MSW |375 passed,4 skipped,26.5min; `v46-810-baseline-e2e.log` |
| baseline P108/P109 |6/6 harness/captures; `v46-810-baseline-parity.log` |
| scoped shared |17/17; `v46-810-shared-r2.log` |
| card + env regression |9/9 after modular extraction; `v46-810-card-unit-r2.log` |
| Admin link |3/3; `v46-810-admin-link-unit.log` |
| lint |8/8; `v46-810-lint-source-final.log`, 12.988s |
| typecheck |8/8; `v46-810-type-source-final.log`, 14.949s |
| unit full |PASS2109 +2skip,6/6 tasks13m29.088s; `v46-810-unit-source-final.log` (final source graph) |
| integration scope |10/10 API +2 backfill +2 actual plan cases; `v46-810-public-api-r3.log`, `v46-810-public-int.log` (initial API failure retained) |
| full integration |PASS2103 (server1977 +DB126),243 files,2/2 tasks55m10.247s; private pair only, `v46-810-full-integration.log` |
| depcheck |both graphs PASS (2437 modules/7390 dependencies;1117/5229), exit0; `v46-810-depcheck-source-final.log` |
| root MSW build |3/3; `v46-810-build-msw-final.log` |
| native build |Portal/Admin PASS; `v46-810-build-native.log`, Portal final3 `v46-810-build-native-portal-final3.log`; MSW Portal final3 `v46-810-build-msw-portal-final3.log` |
| full MSW |corrected full379 pass/4 skip25.6min, `v46-810-full-msw-final.log`; final3 targeted18 pass/2 guest-reference skips, `v46-810-msw-final3.log` |
| native behavior |final3 combined8 pass/2 guest-reference skips; latest authenticated Share assertion4/4, `v46-810-native-share.log` |
| parity reference D134 |MSW card1440/390:1.5011%/2.4963%; native1.5708%/2.5094%; both below3%. Guest reference absent: N/A, actual captures retained |

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
| Authenticated detail share/public-profile target |identical MSW/native E2E asserts hero public link and Share clipboard `/g/<slug>`; existing stores/store-projects6 regressions PASS |
| Admin read-only link/copy/error |Admin3 tests |
| SQL seek +50 bounded items |actual10k-row EXPLAIN tests/report |
| No regression / final full behavior |MSW379+4skip; final3 targeted18+2skip; integration2103/2103 |
| Card parity / guest owner screenshots |6 actual native PNGs retained in `ui-parity/captures/TIP-V46-810-*`; guest desktop/mobile visually reviewed, no invented baseline |

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
   a repaired legacy flake**. Rebuilt both apps with matching3910 target; full rerun379 pass/4skip.
   No bot/price assertions, fixtures, production logic or timeouts were changed.

## Parity / explicit TIP defaults / limitations

- Q810-1..6 use the TIP's explicit defaults, not invented owner decisions: card in both places;
  stable slug; visibleStore only/no KPI; title70; declared business contacts; read-only Admin link.
- Saved-empty inputs intentionally use placeholders rather than prototype filled defaults:
  gray text/counter0 versus40, as specified in TIP. Local3910/3700 link differs from prototype
  `opchub.community` by deployment data. Guest opens a real new tab rather than a prototype toast.
- After real CSS fixes, both card views are below3% in both modes (exact values above). Remaining differences are domain/placeholder/counter data. D134 remains reference + owner review. No masks, relaxed tolerance, baseline replacement or manually altered measurement ledger.
- Full MSW379+4skip ran against the corrected final1 relay builds; final3 only refines card button padding/shadow and guest logo background. Final3 scoped behavior/regression/parity18+2skip and native8+2skip cover those actual final assets; no claim of a second full final3 run.
- Prototype has no anonymous guest page: guest images are actual app captures, pixel score N/A. The white existing brand asset now uses the existing navy brand background so it remains visible on the white guest header.
- Redis/API is the single60s data cache. SSR uses force-dynamic/no Next data cache (plus React
  request-local metadata/page deduplication) so write invalidation is not followed by another
  stale60s Next layer. Fee/deletion changes and externally cached API responses can remain
  stale for up to the documented60s; hide/owner changes invalidate server keys immediately.
- Additive optional-nullable detail slug preserves legacy typed fixtures; migration/create/demo
  paths provide real stable slugs. No slug editor/redirect, sitemap, robots.txt, JSON-LD, public
  view analytics, guest needs/projects, or generated OG images.

## Native HOLD / final review

Private API4300/socket4301/worker and Next3700/3701 have been rolled with owner authorization.
Separate MSW3910/3911 avoids replacing809's3900/3901 baseline listeners. Final private API/socket/worker PIDs30520/17828/18380 and native Portal/Admin20500/18996 are running.
Two demo seed runs have identical counts:96 users,62 affiliates,51 referrals,53 commissions,
65 periods,53 shares,1 payout,50 anchors,3 directors,5 bank transactions,17 stores,
0 missing slugs,0 unbalanced shares. `test-results/v46-810-hold.json` records source6dbd352a,
ports/DBs/Redis and manifests. Original PostgreSQL PID5932 and Redis6379 PID1244 remain running.
Final HOLD smoke6/6: `/v1/health`, native and MSW guest SSR, public API and both Admin
login pages return200 after reseed; SSR contains business HTML/index robots and public
response excludes owner identity/bank keys (`v46-810-smoke-final.json`).
No required gate remains red/running. Owner review and merge remain manual.

Hard rules review: modular caps and separate tests; shared input/response schemas; no app/domain
cross-import cycle; normal backend ownership/permission guards; indexed/bounded SQL; no new
chat fanout; conditional writes/transitions and existing publish outbox; integer VND; existing
Admin moderation audit retained; no external providers/dependencies/secrets; server-only new
env keys declared in both examples/schema/go-live. Implementation and test commits are pushed; final report/evidence commit follows.
Resolve its Git SHA with `git log -1 --format=%h -- coding-packs/reports/TIP-V46-810-completion.md`.

## Verification / owner review

- Native Portal: `http://localhost:3700/g/htx-ca-phe-hoa-phu` (no login).
- Native Admin: `http://localhost:3701`; owner card: Portal `/stores/mine`, then edit.
- Review [guest desktop](ui-parity/captures/TIP-V46-810-native-guest-1440.png) /
  [guest mobile](ui-parity/captures/TIP-V46-810-native-guest-390.png), and
  [card desktop](ui-parity/captures/TIP-V46-810-native-card-1440.app.png) /
  [prototype](ui-parity/captures/TIP-V46-810-native-card-1440.proto.png),
  [card mobile](ui-parity/captures/TIP-V46-810-native-card-390.app.png) /
  [prototype](ui-parity/captures/TIP-V46-810-native-card-390.proto.png).
- No full native suite or fresh-empty-database full migration replay claimed.
  Required new native cases and exact migration backfill/down/CHECK replay passed.
- Owner reviews PR into `dev`; no merge, main push or auto-merge performed.

### Quality gate self-review

- Completeness: all17 acceptance groups mapped above; required lint/type/unit/int/depcheck/build,
  full MSW E2E and identical new native cases PASS.
- Cross-reference: REQ-627/BR-494/TC-494, approved TIP defaults and D-134 preserved.
- Gaps: no missing required execution evidence. Guest has no prototype baseline (N/A),
  owner reviews saved screenshots;60s cache and explicit SKIP scope remain documented.
