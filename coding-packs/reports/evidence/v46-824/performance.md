# D-141 AC824-16 — original-baseline production measurement

**Relative JS regression gate: PASS. Absolute250KiB budget: existing debt, NOT PASS.**
Full TIP remains PARTIAL; this is not auth/2FA/state/control/value acceptance.

## Sources and safety

- Original baseline: `f7c1b2b8b5986f9fea9212d8e24f28310298442c`, isolated `git archive` outside the working tree, original frozen lock, Node24.19.0/pnpm12.11.2/Next16.4.2. All **1513 original build-input Git blobs match after install/build**; no baseline code/config patch. Original auth-override fixtures also match current Git bytes.
- Current production: `0e3803b34caba2879331195251d87c3ef17875d4`, existing verified `.next-server-tip824` output. No production/apps/packages/infra/dependency change since that build. Audit implementation: `b2b8acf0`, all9 frozen inputs match tested bytes after normal hooks. BUILD_ID and each actual resource response SHA256 are in `performance.json`.
- Same native API, approved private Admin origin/port and retained data for both builds. Native API listener/parent wrapper/launch time and isolated non5432 DB endpoint revalidated before each final run. Only login/refresh session writes; no SQL, migrations, seeds, reset/repair or original/private API service changes. Playwright owns and stops only its per-run Admin frontend helper. No credentials, token values, cookies or business response bodies persisted.
- Baseline install first failed offline on a missing store tarball; frozen online install then succeeded with scripts ignored. First PowerShell build wrapper stopped on stderr, not a compiler failure; authoritative recheck found no live process and produced artifacts. Same-input captured retry exit0. History retained in `performance-baseline-build.log`.

## Measurement method

For each of vi/en/th × login/overview/profile/settings, create a fresh browser context, block service workers and explicitly disable HTTP cache through CDP. Protected routes create a real session using context.request **before any page/JS is loaded**. Directly navigate to the measured route, require successful actual API/data/field prerequisites and no redirect, then await fonts and network idle. No previous route/login JS is included in a protected-route context.

Record unique same-origin delivered external `.js`, `.css` and font response bodies, their UTF8/binary byte lengths and SHA256. Gzip every individual body with Node zlib **level6**, summing external JS gzip for the route. This is a reproducible delivered-code size metric, not network transfer encoding, TTFB, execution-time, Next CLI estimate or cached test timing. Fonts retain binary delivered sizes, not a fabricated gzip benefit. Cross-route cache savings are intentionally excluded.

Capture the actual initial HTML response separately. Decode only JSON in Next's inline Flight queue, without eval. Require **exactly one** locale-bearing client message object, deep-equal to the physical selected raw catalog (baseline's documented Vietnamese catalog plus exact legacy auth overlay). Record separate full HTML, decoded Flight data and catalog JSON byte/gzip/hash receipts. These overlap by containment and **must not be added together**. They are not external executable JS. Three simultaneous SSR requests additionally assert exact vi/en/th catalog isolation, on both versions.

The fixed12-pair validator checks all24 raw receipts, identities, source/BUILD_ID consistency, asset sums, stable per-locale catalog hashes, selected fonts and the15% JS threshold. Missing/invalid/nonpositive measurements or >15% growth fail. The original baseline's hardcoded html lang=vi is asserted as an old defect, not copied into current expectations; current html must match locale. No translation/identity/HTTP guard was weakened to make the new version pass.

## Results

All three locales have the same executable JS totals per route; all12 individual pairs are retained in JSON.

| Route | Original JS gzip bytes | Current JS gzip bytes | Growth | Absolute250KiB |
|---|---:|---:|---:|---|
| `/login` |399816|404670|1.21%|Already exceeded on baseline; remains debt|
| `/overview` |460566|469058|1.84%|Already exceeded on baseline; remains debt|
| `/profile` |495287|503525|1.66%|Already exceeded on baseline; remains debt|
| `/settings` |653912|665617|1.79%|Already exceeded on baseline; remains debt|

| Locale | Original catalog gzip | Current catalog gzip | Current delivered fonts |
|---|---:|---:|---|
|vi|28805|31133|84076 bytes, Noto Sans Latin only|
|en|28822|29596|84076 bytes, Noto Sans Latin only|
|th|28987|35334|94712 bytes, Latin84076 +Thai10636|

One selected catalog in every measured request, not10 bundles. No SC/Khmer/Lao/Myanmar font is fetched on these vi/en/th pages. Prior same-production48 public font cases cover all12 identities; three scoped CLDR locales additionally have actual Fees payload/hash/date/VND browser proof. Those separate scopes are not re-counted as this benchmark.

Final runs on committed audit source: **baseline16 PASS** (12 route measurements +1 concurrent SSR +3 pure helper cases), **current16 PASS** with the same scopes, then **budget5 PASS** (1 actual24-receipt gate +1 numeric negative +3 repeated extraction contracts). These are37 executions, not37 unique browser workflows. Final root lint/typecheck/depcheck PASS; root3367 passed +2 existing integration skips are all6 cached tasks, not a new unit execution. No new production/Portal build is claimed by this audit-only phase.

## Repeat without changing baseline or original services

1. Extract original Git archive to a fresh local directory; install its exact lock and compile Admin mocking-off with the approved private API proxy and separate `NEXT_DIST_DIR`. Do not copy current node_modules/workspace links into baseline. Validate original tracked build-input bytes.
2. Use a private local Playwright config importing `defineConfig` from the installed e2e package. `testDir` is the absolute workspace `e2e/audit`; `testMatch` is `admin-i18n-performance.spec.ts` plus `admin-performance-contract.spec.ts`. Set workers1, timeout60000 and Chromium. No globalSetup/server reset fixtures.
3. Project `metadata` is a strict object: `{version: 'baseline'|'current', source: '<actual production Git SHA>', root: '<absolute source/archive root>', dist: '<actual .next-* output>', output: '<existing private receipt directory>', origin: '<approved isolated local Admin origin>'}`. The source root and dist must refer to the build served by the next step. `output` is shared only between these serial measurement runs, not an original service/data directory.
4. `webServer` command: `pnpm --dir "<root>/apps/admin" exec next start -p <approved-private-admin-port>`. Use that same origin as readiness URL `/login`, `reuseExistingServer:false`, and env `NEXT_DIST_DIR`, `NEXT_PUBLIC_API_MOCKING:off`, `API_PROXY_URL:<approved-private-API>`. Revalidate its listener/cluster and cookie-origin prerequisites first; do not edit API CORS or use a random unapproved origin.
5. Run `pnpm --filter @opchub/e2e exec playwright test -c <private-config.mjs>` serially for baseline and current. Preserve any failures before retrying. Same assertions except the explicit original hardcoded html defect; actual selected catalog equality is required in both.
6. After both12-receipt sets exist, run a no-webServer config with the same metadata/output and `testMatch:admin-performance-budget.spec.ts`. It writes the aggregate `performance.json`. Preserve individual hashes/build metadata and report known absolute budget debt separately from the relative gate.

Evidence: `performance.json`, `performance.log` (retained draft failures plus final exact commands/root/browser/budget outputs), `performance-baseline-build.log`. Original sources/builds are the authority, not a copied dashboard image or a narrow asset-inventory claim.
