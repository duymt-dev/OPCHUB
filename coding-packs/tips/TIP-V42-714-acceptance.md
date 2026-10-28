# TIP-V42-714 — full v4.2 parity and acceptance verification

## HEADER

- Project: OPCHUB; module: cross-domain verification; priority:P0; effort:XL.
- Depends on:701–713 implementation, stacked on713 `6ab3adf0`.
- Branch:`feature/TIP-V42-714-acceptance`.
- Parallel-safe with:none. Sequential; shares `coding-packs/reports/V4.2-progress.md`,
  `coding-packs/reports/ui-parity/results.json`, `results.md`, `questions.md` and
  corresponding diff artifacts with713. No parallel TIP or source implementation.
- Files touched: exact staged manifests below. Extend before any corrective code.

## CONTEXT / AUTHORITY

- Workspace:`D:/CODING/OPCHUB/CODING`; stack:`../product/tech-stack.md`, unchanged.
- `../plans/GOAL-V4.2.md`, `../02-TASK-GRAPH.md:39`, requirements D-93–117,
  `../audit/SPEC-V4.2-FULL-AUDIT.md` (bot detailed findings:100–101),
  `../../docs/spec/dac-ta.html` §27–29/E2E-01–16, read-only prototype v4.2.
- `../BUILDER-HANDOFF.md` domain/transition/outbox/audit/query/security rules apply.
-713 is implemented, but its acceptance report explicitly remains IN-PROGRESS:
  two result parity failures and native browser missing. Carry these into final
  acceptance; proceeding with independent verification is not a713 PASS.
- Owner direction: record ambiguity in Questions and continue safe authorized
  work. Never change native HOLD, use a different launcher to bypass denied
  startup, or mislabel test-resource evidence as server-dev acceptance.

## APPLICABLE STANDARDS

- `../standards/testing/testing.md`: traceability, negative cases, actual native
  services, same browser assertions for MSW/native, no fake success.
- `../standards/frontend/ui-parity.md`: all reachable states,1440/390,≤3%, raw
  measured evidence. D-93 supersedes older generic source precedence.
- `../standards/global/git-workflow.md`, `global/code-structure.md`: scoped
  commits/push, caps, standalone tests, no merge/force-push/main writes.

## FILES TOUCHED — stage1 evidence baseline

Create:
- `coding-packs/tips/TIP-V42-714-acceptance.md`
- `coding-packs/tips/TIP-V42-714-parity-artifacts.json`
- `coding-packs/reports/TIP-V42-714-progress.md`

Modify:
- `coding-packs/reports/V4.2-progress.md`
- `coding-packs/reports/ui-parity/results.json`
- `coding-packs/reports/ui-parity/results.md`
- `coding-packs/reports/ui-parity/questions.md`

Create/modify/remove only corresponding raw diff PNGs enumerated exactly in
`TIP-V42-714-parity-artifacts.json`, generated from the complete Playwright test
listing before capture. This is an artifact allowlist, not permission to alter
reference images or delete failing evidence. Passing new measurements may retire
older diff artifacts through the existing reporter; previous evidence stays in Git.
Stage1 introduces no application/test logic, schema, migration or dependency.

## TASK / SEQUENTIAL STAGES

1. Inventory the entire current parity registry; run all captures against the
   v4.2 prototype using the current production MSW builds. Preserve all failures,
   exceptions, timeouts and existing unreachable states with reasons. Identify
   stale/missing captures, not merely aggregate whatever rows exist in a report.
2. Extract each §27–29 acceptance requirement and E2E-01–16 into an evidence map;
   apply later D-xx decisions over obsolete sample prices/registration details.
   Inspect existing tests and distinguish integration/MSW/native-browser proof.
3. Add exact corrective manifests before fixing genuine gaps. Retest domain
   behavior and full gates; rerun affected parity without masks/tolerance changes.
4. Run server-dev acceptance only on an authorized current native runtime while
   preserving protected services. If unavailable, record NOT RUN and continue
   independent work; no build, mock test or fixture implementation substitutes.
5. Produce `V4.2-acceptance.md`,714 completion andM4 reports with accurate status,
   criterion-level evidence, final SHA and compare/PR. Add exact paths to manifest
   before creating them. Audit all14 reports andM1–M4; existence alone is not DONE.

## ACCEPTANCE CRITERIA (Given / When / Then)

- AC1: Given the complete registered and specified UI inventory, when measured
  on v4.2 at1440/390, then every reachable required state has current evidence and
  ≤3% difference; existing unreachable states have D-xx/behavior evidence, not PASS.
- AC2: Given §27–29 and later decisions, when auditing requirements, then every
  applicable clause maps to actual passing evidence or an explicit unresolved gap.
- AC3: Given E2E-01–16, when exercised against current server-dev, then every flow
  passes real assertions with local external-service adapters; no MSW substitution.
- AC4: Given final source, when running lint/typecheck/unit/integration/depcheck/
  build/full MSW/native gates, then all required gates pass with counts and scope.
- AC5: Given14 TIP reports,M1–M4 and acceptance, when audited, then their completion
  claims match actual evidence, commits and PR/compare state; tree clean/pushed.

## CONSTRAINTS / BUILDER-CHECKLIST

- [ ] Full inventory and exact artifact manifest checked; no parallel overlap.
- [ ] No hidden controls, synthetic server data, modified reference images,
  increased tolerance, retry/timeout/assertion weakening or new skip to hide defects.
- [ ] All open711/712/713 questions remain visible until resolved by evidence or
  an actual owner decision; do not silently accept visual exceptions.
- [ ] Native PG5432/Redis6379 and existing HOLD processes preserved; no `.env`,
  secret, paid provider, real bank or VPS access.
- [ ] AC1–AC5 evidenced; final gate scopes match their claims.
- [ ] Explicit-path commit/push, clean status, no merge; report real Git SHA.

## Generation self-review

One TIP in this batch: pairwise new-TIP intersection is empty. Shared prior-TIP
artifacts are explicitly sequential. Approved task graph already contains714;
no new scope or architecture is invented. Runtime/visual gaps are known and must
remain gaps, not prerequisites for starting independent measurement.
