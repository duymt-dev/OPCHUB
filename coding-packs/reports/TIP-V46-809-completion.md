# TIP-V46-809 — Dashboard need matches — DONE

**STATUS: DONE — all required gates passed; owner review/merge remains manual.**

- Branch `feature/TIP-V46-809-need-suggestions`, based on `dev`4dcb6818.
- TIP commitf99d8fff; implementationd6442cee; parity checkpoint620d12c8, all pushed.
- [PR87 into dev](https://github.com/duymt-dev/OPCHUB/pull/87), ready for owner review.
  Owner review/merge only; no auto-merge or main changes.

## Files / implementation

Exact inventory: TIP **Files touched / Execution refinements** and
`git diff --name-status 4dcb6818..HEAD`. No dependency, stack, environment key or migration.

- Shared `api-domains/needs.ts`: additive safe response schemas; new `needs/need-match.ts`
  pure keyword/scoring/ranking/projection functions and tests, one root export.
- Shared `mock-data/domains/need-matches.ts` +tests/barrel: same scorer, candidate cap and
  visibility using existing mock store helpers; no duplicated scoring algorithm.
- Server `local-business/repositories/need-match.query.ts` and
  `services/need-match.service.ts`: fixed two SQL calls, visibility before200-ID limit,
  indexed LATERAL payload lookup, top3 and per-user Redis60s. Controller/module register
  `GET /me/needs/matches`; no investor allowance. Dedicated API/plan integration files.
- Portal dashboard API/hook, card/row/CSS and tests; screen remains an orchestrator.
  Ten `messages/*/dashboard.json` bundles add `matches.*`; mock handler validates session,
  membership and output. Personal/investor FE never requests this endpoint.
- E2E `dashboard-need-matches.spec.ts` uses identical MSW/native assertions and normal API
  fixture setup; native `demo: stores` annotation reuses existing `--stores` seed through
  `e2e/server/test.ts` and parity types. P01 captures complete dashboard/card at1440/390.
- Dev-only post-seed cache reset adds only `opchub:need-matches:*`; no production write
  invalidation. Glossary, questions, screen inventory, measured reports and progress row9.

## Gate evidence

Local logs below are ignored under `test-results/`; SQL plans/parity also tracked in repo.
Thread/pool/concurrency settings bound resources, not assertions/isolation/timeouts.

| Gate | Actual outcome | Log under `test-results/` |
|---|---|---|
| lint |PASS8/8 tasks; existing image warnings only | `v46-809-lint-final.log` |
| typecheck |PASS8/8 tasks | `v46-809-type-final.log` |
| full unit |PASS2082 +2 skipped,6/6 tasks; final-source graph5 cached +fresh Portal | `v46-809-unit-source-final.log`; first full `v46-809-unit-full.log` |
| full integration |PASS2089/2089: server1963/214 files +DB126/26 files;2/2 tasks, exit0 | `v46-809-full-integration.log` |
| scoped API/cache/plan |PASS10/10 | `v46-809-matches-int-r3.log` |
| depcheck |PASS, both frontend/package and backend boundaries | `v46-809-depcheck-final.log` |
| build |PASS root MSW3/3, final2 Portal MSW/native, native Admin | `v46-809-build-msw.log`, `v46-809-build-{msw,native}-portal-final2.log`, `v46-809-build-native-admin.log` |
| full MSW E2E |PASS375 +4 skipped, final2 assets/unchanged assertions/2 workers, exit0 | `v46-809-full-msw-r3.log`; previous attempts retained below |
| native identical behavior |PASS3/3 on final2 assets, combined with parity7/7 | `v46-809-native-final2.log` |
| selected parity |PASS MSW4/4, native4/4 (2 screenshots +2 capture-harness each) | `v46-809-msw-parity-final2.log`, `v46-809-native-final2.log` |
| final HOLD smoke |PASS health4300/3700/3701/3900/3901; restored demo has1 match37%, Zod parsed | `v46-809-hold-smoke.log` |

Unit breakdown: server239, shared687, UI63, Admin558, Portal430, integrations105 +2skip.
Full integration uncached56m3.621s; server import/isolation accounts for70% of tracked time.
No isolation, test timeout, production timeout or assertion changes to accelerate it.

```powershell
node node_modules/turbo/bin/turbo run test --concurrency=1 -- --pool=threads --maxWorkers=2
# Local runner injects the approved private environment, not original native DB/Redis:
node test-results/v46-809-run.cjs --node node_modules/turbo/bin/turbo run test:int --concurrency=1 -- --pool=threads --maxWorkers=1
```

## Acceptance criteria

| AC | Verdict / evidence |
|---|---|
| BR-478 score/98 cap/reason order/unaccent/dedup/short words |PASS shared scorer7 tests, including custom/empty field and null products |
| BR-478 top3/recency/id tie-break |PASS API `top3` and shared ranking test |
| BR-479 visibility |PASS real API: own needs, hidden/closed needs, hidden/draft suppliers, expired/deleted owners excluded; existing visibility helper reused |
| BR-480 no store / personal no request |PASS API, card unit, identical MSW/native personal registration/activation/declaration E2E |
| BR-480 none |PASS unit and identical E2E:0 count/guidance, no extra edit button, mobile no overflow |
| Own draft/hidden policy |PASS real API and shared mock tests |
| Buttons / contact |PASS identical E2E: exact title query, actual seeded Zalo link, all-industry URL; unit fallback `/needs` and nonclickable row |
| Access / failures |PASS investor403, expired402 standard, locked403, unauth401; card hides401/402/403, skeleton, network retry and cross-account cache isolation |
| Performance/cache |PASS real10k needs plan, >=2k matches, existing indexes/no needs Seq Scan/200 payloads; second call no repository SQL, TTL<=60; cache errors/corruption fallback |
| MSW scoring |PASS3 shared mock tests; same shared scorer/ranker, same seed and native parity score |
| No regression |PASS scoped needs/onboarding/stores8/8 and final full MSW375 +4skip |
| Parity D-134 |PASS captures and manual review, both viewports <3%; no masks/tolerance changes |

## Actual SQL / parity

[Complete EXPLAIN evidence](TIP-V46-809-query-plans.md): connection-local LIKE INCLUDING ALL
tables preserve migrated indexes;10,000 needs,2,500 industry/2,000 province matches. Unique
store owner/product index seek, then existing needs status/update/id index and at most200
PK payload reads. Scoped candidate5.649ms; full-root store0.132ms/candidate6.389ms. No
new index, planner flags or public fixture changes. Initial plain join chose a payload
Seq Scan; bounded LATERAL lookup fixed that without changing ordering/candidate semantics.

| P01 full-page |1440 |390 |
|---|---|---|
| MSW final2 |1.005% |2.967% |
| Native final2 |1.011% |2.967% |

Manually inspected desktop/mobile pairs under `e2e/.parity-out/P-01-*` and
`e2e/.parity-server-out/P-01-*`; final native/MSW button styling matches. Genuine extra
spacing and AntD injection-order overrides were fixed, not excused as data. Remaining
differences: authorized unaccent product match37%/extra reason versus prototype30%; TIP's
specific need-type label versus generic prototype label; prior approved flags, real unread
counts. Tracked result reports retain historical rows: only P01 was newly measured here.
Legacy native P01 diff PNGs removed automatically because both measurements now pass.

## Baseline / resolved issues / deviations

- Owner approved private `opchub_v46_801_dev` / `opchub_v46_801_test`, Memurai6381 and owned
  rolling808→809. No original native DB/Redis6379 changes or service restart.
- Q809-1→4 follow **explicit TIP defaults**, pending confirmation, not invented owner D-xx:
  draft own store eligible, hidden own store empty; folded/deduplicated keywords; no extra
  empty-state button; prototype “AI gợi ý” retained with deterministic scoring/no LLM.
- Standard unpaid402 MEMBERSHIP_REQUIRED supersedes erroneous TIP403; locked/investor403.
- Baseline full MSW371 passed/1 failed/4 skipped (old Affiliate mobile text). Unchanged
  entire file repeat3 passed9/9. First full feature run375/4skip passed, no unrelated fix.
- Final2 full attempt then hit the unchanged10-minute bot lifecycle test: script3 turns
  completed, final rendered chat count0 versus expected3. Final full rerun with2 workers
  passed375 +4skip in24.5m, including that bot test10.3m. Load-related flakiness remains
  a hypothesis, not a proven diagnosis or claimed fix. No bot/chat logic, timeout or assertion
  changed. Prior red log `v46-809-full-msw-final2.log`; retained as a known stability finding
  for later bot/E2E work, not hidden by retries inside the test.
- Baseline missing card15.396%/17.825%. First feature mobile4.428%; native initial3.751%
  exposed real spacing/button specificity defects. Final2 assets fix both.
- Initial new fixtures lacked contact/hiddenPrev fields; fixed to existing CHECKs. Locked
  test now locks an already authenticated user via DB/auth state. New E2E sets up three
  eligible rows through normal store APIs and uses SPA navigation to preserve MSW state;
  personal case registers a real account. No canned responses/state injection/weakened assertions.
- Extra narrow test infrastructure paths are documented in TIP execution refinements;
  no old feature test assertions or production business behavior changed.

## Native HOLD / verify

Implementationd6442cee retained: API4300/socket4301/worker, Portal3700/Admin3701, MSW3900/3901,
prototype4830. Portal `.next-v46-809-native-final2`, Admin `.next-v46-809-native`; MSW Portal
`.next-v46-809-msw-final2`, Admin `.next-v46-809-msw`. Original PostgreSQL5432/Memurai6379
processes and unrelated HOLD app ports preserved. Providers fake/local; no live AI enabled.

After native tests, demo seeded twice with `--affiliate --stores`, identical counts:
users96, affiliates62, referrals51, commissions53, fee periods65, shares53, payouts1,
year anchors50, appointed directors3, bank transactions5, unbalanced shares0. Manifest
`test-results/v46-809-hold.json`, logs `v46-809-hold-{seed,counts}-{1,2}.log` and cache log.
Only approved6381 DB1 cache namespaces reset, no queues/native6379 flush. Existing
unconfigured-AI warnings remain; no jobs disabled to hide them.

Verify demo business login → Dashboard card below onboarding,1 match37%. View/contact
opens filtered needs with contact link; all button filters store industry. Editing store
may take60s to refresh recommendations. Personal has no card/request. Backend API accessible
only after standard account/fee guards. Empty/draft/hidden states verified in tests.

## Hard rules / limitations / remaining

Rules1–14 reviewed: modular file caps; strict shared Zod; public domain boundaries and
existing approved visibility helper; account/fee guards (no Admin role checks); bounded
indexed repositories/no application N+1; no new realtime fanout/transitions/critical side
effects; integer VND/UTC unchanged; no new Admin write/audit obligation; no LLM/adapters;
no secrets/new env/dependencies; separate tests; scoped committed/pushed source.

Deliberate limitations: only200 newest eligible candidates scored (older better matches
can be missed), up to60s cache staleness/no write invalidation. No ML/push/new need detail
page/personal-investor recommendations. Optional empty-state prototype parity not claimed;
empty state covered by unit/identical behavior. No full native suite or fresh-DB replay
claimed; TIP requires identical new native cases, which passed.

No required gate remains red or not run. Final evidence commit follows implementation
d6442cee; resolve its Git SHA with `git log -1 --format=%h -- coding-packs/reports/TIP-V46-809-completion.md`.
Owner review/merge and optional future investigation of the recorded legacy flakes remain
manual. No fix of those flakes is claimed.

### Quality gate self-review

- Completeness:12/12 acceptance groups mapped to actual evidence; all execution gates PASS.
- Cross-reference: approved TIP defaults, REQ-626/BR-478–480, D-75/D-124/D-134 and domain boundaries preserved.
- Gaps: no missing required execution evidence;200-candidate/TTL limitations and optional
  empty-state parity/native-suite exclusions explicitly declared. Owner reviews screenshot pairs.
