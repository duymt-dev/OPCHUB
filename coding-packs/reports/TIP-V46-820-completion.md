# COMPLETION REPORT — TIP-V46-820

**STATUS: DONE.** All functional gates passed, including a clean full-root
integration rerun. Raw parity measurements and approved differences are retained
under D-134; owner image review remains part of PR review, not a fabricated pixel PASS.

- Branch `feature/TIP-V46-820-public-seo`, from dev `1b5a28e6` with approved TIP
  and seven defaults at `e5808021`. Scope B15/D-139, REQ-627/BR-494/TC-494.
- Source `faf824de`, browser cases `82260154`, stable OG alias `6fc01245`, full
  dashboard parity/KPI coverage `cebaec68`, approved mobile grid repair `3a199fb4`;
  committed/pushed with normal hooks. Review [PR105](https://github.com/duymt-dev/OPCHUB/pull/105), base `dev`.
- No main release, auto-merge, new public-content domains or editable slugs.

## Owner approvals / environment

- Reuse private dev `opchub_v46_812_dev` / integration `opchub_v46_801_test`,
  Memurai6381 DB3/DB2. Owner approved rolling only private818 runtime to820,
  retaining API/socket4310/4311 and Portal/Admin3710/3711. Original native/HOLD
  services and Redis6379 are outside the command targets.
- Disposable `opchub_v46_820_chain_test` approved; created empty,106 migrations
  deployed,820 down/up produced identical schema dumps, owned chain DB dropped.
- Approved extra connection: no member-deletion flow existed. Add **internal**
  conditional soft-delete + audit + `user.deleted` in one transaction; no API/UI
  deletion feature or new permission policy. Durable consumers invalidate public
  caches and revoke session/auth state. Existing revoke-reason enum is reused.
- Q820-1..7 remain exactly as approved in TIP: fixed slugs, canonical-host-only
  indexing, public-field LocalBusiness, cover first/generated default OG, salted
  dedup30min/bots-owner excluded, separate7-day guest KPI, TTL60 safety net.
- Owner approved narrow pre-existing mobile product-grid repair exposed by the
  new full-page dashboard capture: two columns at390, footer wraps rather than
  overflowing; desktop auto-fill unchanged. A dual-mode responsive regression
  preserves independent guest KPI and verifies page/card overflow and columns.

## Implementation / technical file connections

1. Public sitemap endpoint returns only slug/date,1000 rows per page, timestamp
   microseconds preserved in validated base64url cursor. Published+fee/deleted
   visibility is reused; public-only active-owner check additionally excludes
   locked accounts without changing global authenticated store/need visibility.
2. Partial covering store index `(updated_at DESC,id DESC) INCLUDE(owner_id,slug)`
   for published+indexable rows. Redis page TTL600; version increment invalidates
   all pages without SCAN/per-page deletes. Owner slugs are fetched in one query.
3. Root sitemap contains guide+first50000 URLs. Additional chunks use Next
   `generateSitemaps` under `app/store-sitemaps/sitemap.ts`; robots advertises all
   chunks beyond the root alias. This avoids silently dropping URL50001 and does
   not require changes to existing proxy rewrite behavior. Revalidate3600;
   partial API failure returns guide only and a fixed, safe server warning.
4. Host-header robots permits public routes only on configured PORTAL_URL;
   duplicate/unknown hosts disallow all. Confirmed duplicate Nginx host proxies
   Portal; server-level noindex header preserves inherited security headers.
   Canonical host config is unchanged. No VPS/Nginx execution was performed.
5. Pure shared JSON-LD helper uses only anonymous DTO fields, public contact
   alternatives and visible social links; escapes `<`, omits noindex/business
   facts not supplied. Metadata preserves cover priority and adds dimensions,
   alt and Twitter large-image card.
6. OG uses Node `next/og`,1200x630, Portal tokens, Noto Sans supporting Vietnamese.
   Bundled font and original SIL OFL1.1 are in `src/assets/fonts`; fetched at
   development time from the official notofonts/noto-fonts repository, never at
   runtime. No new npm library or external font/analytics service.
7. Minimal public logo connection reads **only** configured storage through its
   existing adapter, no arbitrary URL/redirect fetch; private chat prefixes,
   unsupported types and >2MB are excluded. Read has a3-second fallback. Next
   fetches this internal API with the same bound, not the stored logo URL.
8. Beacon skips webdriver, sends once under StrictMode, uses sendBeacon or fetch
   keepalive. New preview tabs reuse existing single-flight httpOnly refresh to
   recover a bearer token; server excludes the verified owner. No session cookie
   is forwarded into anonymous SSR and no token is persisted to browser storage.
9. Server ignores bots/empty UA/invisible stores; HMAC-SHA256 uses existing server
   secret with a distinct domain label, hashes IP+UA+slug, stores only digest and
   NX/EX1800 claim. Redis failure skips counting. VN-day upsert affects only new
   guest table; dashboard reads its own7-day range. Existing view_count, member
   daily views,08:05 digest and push stay independent. MSW has separate hashed,
   in-memory guest state rather than a fabricated always-zero counter.
10. Store worker registers fee-changed/locked/deleted invalidation consumers;
    failure propagates for relay retry. Existing feeStatus08:00 already emits
    per-user changed events using addMany in the same transaction, so no new
    expired-batch event or scheduler rewrite is needed. Retry repeats DEL/version
    increment harmlessly. Browser/proxy copies already sent max-age60 remain
    subject to that accepted bound; not an instant worldwide-cache purge claim.

### Paths differing from literal TIP list

- Actual core module is `local-business.module.ts`, dashboard DTO is in
  `api-domains/store-builder.ts`; their existing files were used, not invented
  duplicate modules/shapes.
- Sitemap controller/query/service extracted for the distinct public endpoint,
  plus Portal sitemap/URL/logger helpers and extra chunk route above.
- Logo service/internal public-image endpoint and server-api helper are the
  technical storage boundary for safe OG rendering, not another service provider.
- `worker/processors/{store,account}.processor.ts`, account deletion service,
  module/barrel and shared event schema are the approved durable connections.
- Shared SEO export, mock sitemap/guest-state modules, minimal store facade
  calls; Portal Vitest-only server-marker shim/alias allow actual server-route
  unit tests without weakening production `server-only` markers.
- Route/browser/plan tests live in separate files; i18n label added in all ten
  Portal languages. No expansion of an over-cap legacy production file.

## Acceptance / actual verification

| Criterion | Actual evidence |
|---|---|
| Eligibility/noindex/locked/expired,1001 keyset rows | store-sitemap.int.spec.ts5/5 |
| Separate guest counts/dedup/owner/bots/Redis/validation/throttle | store-guest-view.int.spec.ts4/4 |
| FeeStatus/lock/delete outbox, immediate API invalidation/replay | store-public-invalidation.int.spec.ts4/4 |
| Storage allowlist/private-prefix/failed-logo/hidden | store-public-logo.int.spec.ts3/3 |
| Actual10k wide-row sitemap/owner-slug plans | store-sitemap-plan.int.spec.ts2/2 |
| JSON-LD public contacts/escape/noindex and strict input | shared SEO4/4 |
| Mock dedup/owner/bots/KPI isolation | shared mock guest2/2 |
| Sitemap pagination/fallback/50000 chunks/loop guard | Portal sitemap4/4 |
| Primary vs duplicate/malicious host | Portal robots5/5 |
| Real PNG dimensions/font/404 | Portal OG2/2 |
| Beacon once/fallback/webdriver/new-tab owner token | Portal beacon4/4 |
| Existing public810/dashboard/digest/need-match regressions | Clean root2145/2145 server cases and full MSW401/401 |

- Lint8 tasks PASS. Typecheck8 tasks PASS with explicit MSW build env.
- Final full unit **2246 passed +2 existing adapter skips**,6 tasks PASS:
  shared739, UI67, integrations126+2skip, Admin580, server263, Portal471.
  `v46-820-unit-final.log`,3m57.473s,5 cached tasks. No removed test.
- Boundary checks PASS on both frontend/shared and server graphs.
- Chain106→820 down/up/schema identical PASS; migration deploy on both private
  targets PASS. Actual indexed-query evidence accompanies the query report.
- First full MSW400 passed+5 existing skips (15.9m); after approved CSS repair,
  final full MSW **401 passed+5 existing skips**, exit0,15.8m on verified artifacts.
  Includes the new unchanged dual-mode responsive assertion. No test was removed.
- Initial focused public routes7/7 MSW and7/7 native. Current native build:
  responsive regression + public SEO3 cases4/4 PASS (34.5s).
- Final static lint8/typecheck8 tasks PASS; depcheck both graphs PASS.
- First root integration completed52m4.981s: server244/245 files,2144 passed,
  one skipped because a legacy suite's bootstrap failed before its test. Prisma
  could not start an AI-moderation settings transaction in time; cleanup then
  received an undefined test app. No820 assertion failure. Unchanged
  `group-owner-omission.int.spec.ts` immediately reran1/1 PASS (10.24s), without
  production/test code changes, retries inside the test or timeout increases.
  Separate DB suite29files/144tests PASS (82.62s). The first full command remains
  documented as exit1, not misreported as PASS. **Clean root rerun PASS**:
  server245files/2145tests + DB29files/144tests = **2289 passed**, no skips,
  no cache,2/2 tasks, exit0,30m0.035s. No source/assertion/timeout changes between
  the failed bootstrap, isolated recheck and clean full run.
  [Clean summary](evidence/v46-820-int-clean-summary.txt).
- Verified native production build3 tasks PASS,1m20.977s. Final MSW build also
  uses explicit private proxy/socket/public-origin variables; no live server/static
  files were overwritten during builds. All functional/visual evidence collected.
- Final MSW production build3 tasks PASS,1m42.254s. Concise actual gate outputs:
  [checks.txt](evidence/v46-820-checks.txt). All executable gates are closed;
  paired visual classification is complete under D-134.

## Rerun / incident notes

- Create-only diagnostic refused an **already-modified historical** migration
  checksum (`20261115090000_v46_regional_mail_kinds`) on private812, requesting
  destructive reset. No reset, old migration edit or history metadata edit was
  performed. New820 additive SQL/down were reviewed/authored separately; deploy
  and clean106-migration chain passed. Historical mismatch is not claimed fixed.
- First typecheck omitted mocking env and correctly failed native-URL validation;
  explicit MSW/loose-env invocation passed. New test assertions initially needed
  the existing nested error envelope and valid hiddenPrev fixture; corrected
  only new tests, retaining all legacy assertions and DB CHECKs.
- Initial50000-URL test exposed repeated env parsing per URL; hoisted origin once
  per sitemap load, no timeout increase. Server-only test alias is test-specific.
- Next16 produces a hashed metadata-image path. A stable `/opengraph-image` route
  alias calls the same renderer to honor the TIP's documented public URL; real
  PNG/404 unit cases now execute that GET handler. Both browser lanes verify
  actual PNG1200x630/404 and cover-first metadata successfully.
- First post-grid native rebuild omitted explicit build-time API_PROXY_URL and
  picked the default4000 rewrite; its responsive attempt timed out. First MSW
  rebuild omitted build-time public Portal origin, so Admin's mock-state bridge
  failed503. That full attempt was aborted, not passed or called app defects.
  Rebuilt fresh verified directories with explicit4310 proxy/socket4311 and
  matching Portal origins3710/3982; no assertions/timeouts were relaxed.
- Before native/browser gates, provider/settings/call-count fingerprint captured
  on private812 at21:45; final recheck23:09 exactly the same digest,
  all bot flags false, encrypted custom key retained, calls127 unchanged.
  [Before](evidence/v46-820-ai-before.json) / [after](evidence/v46-820-ai-after.json).
  No real AI call is part of this TIP; this fingerprint is not a claim that every
  private business row is restored to its task-start value.

## Native HOLD / image review

- Private API/socket4310/4311, Portal/Admin3710/3711 remain on820; MSW3982/3983
  use a separate build. [Runtime snapshot](evidence/v46-820-runtime.json) lists
  owned PIDs, exact artifact directories and HTTP200 health/login observations.
- Original native DB/Redis6379/HOLD were not command targets; no destructive
  migration/reset/down was run there. Only approved temporary chain DB dropped.
- Native public810 browser flow deliberately unpublishes its demo store; after
  that test it was republished through the authenticated domain API for the
  parity journey, not by bypassing its transition. No broad native seed/reset.
- [Parity classification and paired images](TIP-V46-820-parity.md): six pairs per
  lane, full dashboard includes new KPI. Raw8 pass/2 threshold failures per lane,
  solely the approved-feature/data dashboard differences under D-134. The actual
  mobile grid defect was fixed, not excused. Owner reviews pairs/OG on PR105.
- GitHub CI workflow triggers only main push/PR, not dev PR; absence of PR105
  checks must not be described as CI PASS. Local gates are reported separately.

## Review / intentionally not performed

- Owner reviews committed app/prototype pairs and newly generated OG images
  under D-134. Full dashboard raw percentages are informational, not pixel PASS.
- Historical applied-migration checksum mismatch remains recorded above; it was
  not introduced or destructively repaired by820. New migration and clean chain passed.
- No VPS deployment/Nginx reload, real-provider AI calls, slug editing/redirects,
  additional public-content domains,821 finance work, release/main PR or merge.
- Verification source SHA `3a199fb4`; evidence progress commit `4c1e8a02`.
  Final documentation commit SHA is supplied in the completion message.

## Quality gate / hard-rule self-review

- Rules1–3/13: modular production files, separate tests, strict typing and import
  boundaries verified by lint/typecheck/depcheck; no new dependency or monolith.
- Rules4/7/8/10: existing permission/auth boundaries retained; approved internal
  conditional soft-delete + audit + outbox transaction, replay integration PASS.
- Rules5/6/9: bounded/indexed queries and actual plans attached; no recipient DB
  loops/chat changes; VN day derived from UTC, existing integer-money rules untouched.
- Rules11/12: storage adapter only, bundled licensed font, fake external providers,
  no raw IP/secret in artifacts; existing parsed secret reused for domain-separated HMAC.
- Rule14: implementation/evidence commits pushed; final documentation commit and
  clean working tree are checked before completion. PR targets dev, not main.
- Acceptance criteria all covered above; D-134 image review and the recorded
  historical checksum mismatch are explicit, not concealed verification gaps.
