# TIP-V46-809 — Dashboard need matches — IN PROGRESS

- Branch: `feature/TIP-V46-809-need-suggestions`, based on `dev`4dcb6818; TIP commitf99d8fff.
- Source checkpointd6442cee pushed; [draft PR87 into dev](https://github.com/duymt-dev/OPCHUB/pull/87).
  No DONE claim while full gates run.
- Scope: deterministic recommendations for business members, shared scorer, private-aware
  bounded repositories, Redis60s cache, dashboard card, ten locales, identical MSW/native E2E.
- Owner approved private `opchub_v46_801_dev` / `opchub_v46_801_test`, Memurai6381 and owned
  rolling808→809; original native DB/Redis6379 untouched. No migration/new index/dependency.

## Evidence so far

| Gate | Actual result | Local log under `test-results/` |
|---|---|---|
| shared scorer + mock |10/10 PASS | `v46-809-shared-unit.log` |
| card/hook unit |11/11 PASS | `v46-809-card-unit-r2.log` |
| scoped real API + SQL plans |10/10 PASS | `v46-809-matches-int-r3.log` |
| typecheck |8/8 PASS | `v46-809-type-r3.log` |
| lint |8/8 PASS | `v46-809-lint-r3.log` |
| depcheck |PASS | `v46-809-depcheck.log` |
| root MSW build |3/3 PASS | `v46-809-build-msw.log` |
| native apps build |PASS initial assets; Portal CSS final rebuild running | `v46-809-build-native-{portal,admin}.log` |
| new MSW behavior |3/3 PASS | `v46-809-matches-msw-r3.log` |
| unchanged needs/onboarding/stores E2E |8/8 PASS | `v46-809-scope-msw.log` (initial new-case failures retained separately) |
| full unit / integration / final E2E |RUNNING/PENDING; no final counts claimed | `v46-809-unit-full.log`, `v46-809-full-integration.log` |

## Baseline and triage

- Baseline full MSW on808 built assets:371 passed,1 failed,4 skipped. Existing Affiliate
  region text absent after mobile resize. Unchanged entire file repeat3 then9/9 passed;
  no unrelated fix/assertion relaxation. Logs `v46-809-baseline-e2e.log`,
  `v46-809-baseline-affiliate.log`.
- Baseline P01 missing the new card:15.396% @1440 /17.825% @390. Final first capture after
  implementation2.654% /4.428%. Genuine extra inter-card spacing and bold AntD buttons fixed;
  final rebuilt captures pending. No masks/tolerance changes.
- Initial new fixtures lacked required contact/hiddenPrev fields; corrected fixtures to
  existing DB constraints. Locked access test now locks an authenticated active user and
  updates auth state instead of trying to log in an already locked account. Assertions kept.
- Initial candidate plain late join allowed a payload Seq Scan; replaced with bounded
  correlated LATERAL unique-ID lookup. Real10k plan now index-only/index scans,200 payloads,
 5.649ms in scoped measurement; no planner flags/new indexes.
- Initial new E2E expected three matches from an unmodified demo store that only has one.
  Setup now edits the store through normal APIs to a seeded industry with three matches.
  SPA navigation preserves MSW state; personal case registers/activates/declares a real new
  personal account. Contact assertion checks the seeded Zalo hyperlink, not an absent
  email/phone channel. Same setup/assertions in both modes; no fake API responses.

## Authorized defaults / limitations

- Q809-1→4 use explicit TIP defaults pending owner confirmation, not new D-xx decisions:
  own draft eligible, own hidden yields empty card; unaccent/deduplicated keywords; empty
  state has no new edit button; “AI gợi ý” retained but no LLM is called.
- Canonical unpaid402 MEMBERSHIP_REQUIRED supersedes erroneous TIP403; investor/locked403.
  FE hides on401/402/403 without blocking Dashboard.
- Only200 newest visible candidates are scored. Older higher-scoring rows may be missed;
  accepted TIP limitation. Cache may remain stale60s after edits; no production invalidation.
- Added narrow test infrastructure files beyond original inventory: `e2e/server/test.ts`,
  `e2e/parity/types.ts`, `apps/server/scripts/flush-dev-cache.mjs`. Existing `--stores` seed
  annotation and new cache namespace reset make native fixtures match MSW without weakening
  assertions. No new seed data/business behavior.

## Remaining

### Final-asset checkpoint

- First full unit graph:2082 passed +2 skipped,6/6 tasks; server239/shared687/UI63/Admin558/
  Portal430/integrations105 +2skip. Final-source cached graph rerun pending footer.
- First full MSW:375 passed +4 skipped. Final2 CSS specificity build full rerun is running;
  no baseline Affiliate failure reproduced in the first full feature run.
- Final2 native combined run7/7 PASS: behavior3 +screens2 +harness2. MSW final2 parity4/4 PASS.
  P01 MSW1.005% @1440 /2.967% @390; native1.011% /2.967%. Both manual pairs inspected;
  genuine spacing/button injection-order defects fixed, no masks/threshold changes.
- Root MSW build and final2 Portal MSW/native builds PASS; native Admin build PASS.
- Post-native-test HOLD seed twice with `--affiliate --stores`: identical users96, affiliates62,
  referrals51, commissions53, fee periods65, shares53, payouts1, year anchors50, directors3,
  bank transactions5, unbalanced0. Manifest `test-results/v46-809-hold.json`, source d6442cee.

Latest native behavior3/3 PASS (`v46-809-native-matches-r2.log`). MSW final first assets
P01 captures1.007%/2.967%; native1.055%/3.751%. Native mobile revealed AntD injection-order
overriding button sizing/weight: increased only the card action selector specificity to
`.card .action`. Both Portal final2 builds/captures are pending; no parity assertion relaxed.

Final-source unit/lint/type/depcheck, full integration footer, built-asset full MSW/native
behavior, measured/manual final parity, commit/push/PR, post-test seed/health HOLD and
final AC/rules1–14 review. Do not merge this in-progress checkpoint.
