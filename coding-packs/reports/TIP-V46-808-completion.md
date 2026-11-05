# COMPLETION REPORT — TIP-V46-808

**STATUS: DONE — all required execution gates passed; owner review/merge remains manual.**

- Branch `feature/TIP-V46-808-global-search`, from `dev` `8543728d`.
- Source `69a48634`; checkpoints `b708c15e`, `8f01249a`, `782745ca`.
- [PR #86 into dev](https://github.com/duymt-dev/OPCHUB/pull/86). Owner merges; no auto-merge/main changes.

## Files / implementation

Exact inventory: TIP **Files touched** and `git diff --name-only 8543728d..69a48634`.
No new dependencies, stack changes or production environment keys.

- Shared search Zod contract, mock implementation/tests, modular `global-search/` UI,
  keyboard hook/styles and six UI tests.
- Portal/Admin shell components, API clients, user/permission-scoped debounced query hooks,
  standalone mock handlers and labels across all ten Portal locales.
- Search module orchestrates public domain services only; account/community/project/
  local-business repositories own queries. One permission checker, fixed parallel calls,
  max4/group, no total count/N+1. Domain SQL visibility helpers reuse fee rules and have
  real equivalence tests against Prisma predicates.
- Three expression GIN indexes plus down.sql. Two-character needs query limits ranked IDs
  before payload joins, preserving visibility/ranking and one SQL call.
- Dedicated unit/API/plan/E2E/parity suites. Approved regression repairs narrow old
  store/month locators and match service outbox by returned commentId; no weakened assertions.

## Final gate evidence

Local logs are ignored under `test-results/`; measured plans/parity are also tracked.
Resource flags change concurrency/pool only, not isolation, assertions or timeouts.

| Gate | Actual result | Log under `test-results/` |
|---|---|---|
| lint | PASS8/8 tasks | `v46-808-lint-query-final.log` |
| typecheck | PASS8/8 tasks | `v46-808-type-query-final.log` |
| unit | PASS2061 +2 skipped,6/6 tasks | `v46-808-unit-source-final.log`; uncached full `v46-808-unit-threads.log` |
| scoped integration | PASS38/38 (service14/search15/plans9) | `v46-808-final-scope-int.log` |
| full integration | PASS2079/2079: server1953 (212 files) + DB126 (26 files),2/2 tasks, exit0 | `v46-808-full-integration-r2.log` |
| depcheck | PASS | `v46-808-depcheck-query-final.log` |
| build | PASS root MSW, native Portal/Admin, latest server | `v46-808-build-msw-final.log`, `v46-808-build-native-{portal,admin}-final.log`, `v46-808-build-api-final.log` |
| full MSW E2E | PASS372 +4 skipped; baseline369 +4 skipped | `v46-808-full-msw-r2.log` |
| native search E2E | PASS identical3/3, latest source | `v46-808-native-source-final.log` |
| focused selector regression | PASS11/11 search/Affiliate/stores | `v46-808-selector-regression.log` |
| selected parity MSW/native | Each12/12 captures/tests (10 screenshots +2 harness) | `v46-808-parity-final-assets.log`, `v46-808-native-parity.log` |
| native API smoke | Portal/Admin Me200; literal `%_` empty; Zod valid, no Portal members | `v46-808-native-smoke.log` |

Unit breakdown: server239, integrations105 +2 skipped, UI63, shared677, Admin558, Portal419.
Final source rerun had5 cached packages and a fresh server run,6/6 successful. Full commands:

```powershell
node node_modules/turbo/bin/turbo run test --concurrency=1 -- --pool=threads --maxWorkers=2
# Local runner injects only the approved private DB/Redis environment:
node test-results/v46-808-run.cjs --node node_modules/turbo/bin/turbo run test:int --concurrency=1 -- --pool=threads --maxWorkers=1
```

## Acceptance mapping

| Criterion | Evidence / verdict |
|---|---|
| TC-491 cross-domain search and targets | PASS real API integration, UI route mapping and Portal/Admin behavior |
| Unaccent | PASS real SQL integration and shared mock tests |
| Threshold2/debounce250/max4/prefix first | PASS hook/UI and API integration; stale responses/cache isolation covered |
| Enter/Escape/outside retains/empty | PASS UI tests and identical MSW/native behavior |
| Portal visibility/private owner | PASS API and SQL/Prisma equivalence across states/fee statuses |
| Joined/unjoined targets | PASS API joined flag and E2E chat/join dialog |
| Investor/unpaid/locked | PASS API; no investor groups; canonical unpaid402, locked403 |
| Admin exact code/status/routes | PASS API, mocks, route mapping and Admin E2E |
| Admin permission matrix | PASS real integration; no role-name authorization |
| Wildcard escaping | PASS real integration and native `%_` smoke |
| Five indexed queries10k/domain | PASS nine plan/equivalence tests, >=3 chars Bitmap Index Scan/no searched-table Seq Scan |
| Two-character performance | All five measured Ne queries <50ms in final scoped run; not a universal guarantee |
| Mobile390/1023 hidden,1024 visible | PASS behavior and parity |
| Existing screen search/non-regression | PASS full MSW372 +4skip, baseline369 +4skip |
| Parity D-134 | Captured and manually inspected; new states <3%, no masks/tolerance changes |

## Plans / parity

[Actual SQL plans](TIP-V46-808-query-plans.md): latest scoped milliseconds (>=3 /2 chars)
stores0.694/33.527, needs0.639/37.967, projects1.949/35.195, groups0.284/29.604,
users0.315/34.067. Initial needs78.966ms isolated/101.447ms loaded prompted bounded
prefix/fallback ranking. Old measurements remain documented; two-character GIN may be
nonselective. No planner flags, forced index, cache tricks or timing assertions changed.

| New state | MSW1440 /390 | Native1440 /390 |
|---|---|---|
| Portal search | 0.995% /0.109% | 0.744% /0.109% |
| Admin search | 0.506% /0.349% | 0.554% /0.349% |

Tracked `ui-parity/results.{json,md}` and `ui-parity/server/results.{json,md}` retain
historical rows; only five selected states (new search +P11/P12/D02) were rerun. Final FE
assets captured; subsequent server-only two-character optimization does not affect these
longer-query scenarios. Manually inspected desktop Portal/Admin and mobile screenshots.
Native coffee results differ with eligible demo data, not a visibility leak. Initial Admin
Overview3.89% included existing chart/data differences; final scenario uses Members on
both sides. No masking/viewport/threshold changes. Flags retained per prior owner decision.

## Issues resolved / authorized deviations

- Owner approved private DB pair, Memurai6381 and owned rolling807→808; original native
  DB/Redis6379 and unrelated HOLD services preserved.
- Owner approved same-domain SQL visibility helpers plus equivalence tests because Prisma
  filter objects cannot embed directly in the required indexed SQL. Business rules unchanged.
- Q808-1→5 use explicit TIP defaults, **not new owner decisions**: unaccent; visible Portal
  records; Admin name/email plus exact member code; nondeleted states per permission;
  outside retains text and filtered targets. Recorded in `ui-parity/questions.md`.
- Standard paywall remains402 MEMBERSHIP_REQUIRED, not erroneous TIP403; locked403.
  FE silently closes on401/402/403, retaining text and no toast.
- First integration attempt lacked required seed groups: recorded/aborted, seeded private
  test DB. First root run then found two preserved outbox events with reused YC-1010.
  Owner approved returned-commentId correlation; history and assertions untouched.
- New group E2E locator narrowed from ambiguous province/industry prefix to exact province
  accessible name. Owner approved old Affiliate month-label selectors after new combobox.
- Early unit reruns hit existing audit5s timeout under load/Windows fork startup failures.
  Full bounded thread reruns passed without timeout or test changes.

### Migration incident closed

Create-only Nov5 diff proposed unrelated index/FK drops; **never deployed**. Replaced with
intended Nov11 three-index migration/down.sql. Empty Nov5 folder initially blocked deploy;
ignored temporary config deployed the identical tree excluding only that empty folder.
Owner explicitly requested removal: verified exact literal absolute path/emptiness and
removed non-recursively. Normal migration path restored, no accidental metadata edits.
Final read-only checks on both private DBs: preserved21 indexes, new3 indexes, validated
customer_years_user_fk1, intended migration1, accidental Nov5 migration0. Logs:
`v46-808-schema-{dev,test}.log`. Original native data untouched.

## Native HOLD / verification

Source69a48634: API4300/socket4301/worker, Portal3700/Admin3701 with
`.next-v46-808-native-final`; MSW3800/3801, prototype4830 retained. PID/count manifest
`test-results/v46-808-hold.json`. After native tests two demo seeds produced identical:
users80/affiliates62/referrals51/commissions53/fee periods65/shares53/payouts1/year anchors50/
appointed directors3/bank transactions5/unbalanced shares0. Only private6381 DB1 cache
namespaces flushed, no native6379/queue reset. All providers fake/local.

Verify Portal/Admin demo login, search MediaSoft/ca phe/exact Admin member code; Escape
clears, outside retains, Enter opens first hit; mobile hides topbar search. Existing
unconfigured-AI worker warnings remain; no live AI enabled or jobs disabled to hide them.
No fresh-DB replay or full native E2E suite claimed (TIP requires search native3/3).

## Hard rules / remaining

Rules1–14 reviewed: modular caps; strict shared Zod; public domain boundaries; permission
keys; bounded indexed repositories; no new per-recipient realtime work; no new transitions/
critical side effects; integer VND/UTC unchanged; read-only search/no new Admin writes;
fake adapters; no secrets/deps/new env; separate tests; scoped source commits pushed.
No unrelated business fixes or PM goal edits.

Full root integration completed in26m38.361s, uncached, exit0. No required red/not-run gate
remains. Final evidence commit follows source69a48634; obtain its Git SHA via
`git log -1 --format=%h -- coding-packs/reports/TIP-V46-808-completion.md`.
Owner review and merge are manual. Deliberate TIP exclusions (mobile search, arrow-key
selection, see-all, events/services/investors, phone search) remain unimplemented.
