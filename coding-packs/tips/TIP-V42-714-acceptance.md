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

## FILES TOUCHED — stage2 E2E-12 pricing continuity

Create:
- `e2e/behavior/price-config-cross-app.spec.ts`
- `packages/shared/src/mock-data/domains/pricing-persistence/schema.ts`
- `packages/shared/src/mock-data/domains/pricing-persistence/snapshot.ts`
- `packages/shared/src/mock-data/domains/pricing-persistence/snapshot.spec.ts`

Modify:
- `packages/shared/src/mock-data/domains/price-config.ts`
- `packages/shared/src/mock-data/domains/settings-log.ts`
- `packages/shared/src/mock-data/domains/community-persistence/schema.ts`
- `packages/shared/src/mock-data/domains/community-persistence/snapshot.ts`
- Existing714 TIP/progress/questions only; no production/native contract change.

Add one identical MSW/native browser flow: edit/save actual Admin price fields,
verify new Portal pricing and payment amount/reference, reload both applications,
and confirm configuration/version and pricing audit survive. No response routing,
localStorage injection or conditional weakening. Existing mock price state is
module-local and omitted from the persisted cross-origin domain composition;
wire an independently validated pricing snapshot into that existing transport.
Keep old snapshots readable, defaults explicit, and unrelated domain/audit rows
unchanged. Unit tests cover fresh-runtime restoration, invalid-input atomicity,
legacy absence and optimistic version conflicts. Record red test on the existing
build before rebuilding; do not rebuild apps while the full baseline uses them.
## FILES TOUCHED — stage3 acceptance evidence map

Create `coding-packs/reports/V4.2-acceptance.md`,
`coding-packs/reports/V4.2-acceptance-e2e.md`, and
`coding-packs/reports/V4.2-acceptance-spec.md`.
Keep the aggregate report small and link independent E2E/spec matrices. Enumerate
§27.1 CR-01–18, §27.2–15 including V4-01–12, §28.1–4, §29.1–6 and E2E-01–16.
Record later decisions superseding old prototype/sample flows. Label located tests
as coverage candidates until actual same-scope runtime evidence exists. All native
browser rows remain NOT RUN for714 until measured; no inherited green summary or
prototype's own “Đạt” text is acceptance evidence. No source changes in this stage.
## FILES TOUCHED — stage4 measured mobile auth header

Modify `packages/ui/src/auth/auth-layout.tsx`.
Create `packages/ui/src/auth/auth-layout.spec.tsx` and
`e2e/behavior/auth-responsive-header.spec.ts`.
The current1440 capture passes;390 auth captures show a44px vertical offset:
prototype topbar80px, application36px. Measured DOM shows the support link folded
inside a text span in the app, instead of a separate flex item. Restore separate
icon/text/link items so the existing responsive flex-wrap behaves like prototype;
no breakpoint-only screenshot hack or hidden content. Test semantic controls and
both widths on Portal/Admin, then remeasure all A-* states. Keep every raw failure.

## FILES TOUCHED — stage5 fresh-member chat acceptance

Create `e2e/behavior/new-member-chat-acceptance.spec.ts`.
Update existing714 progress/questions and acceptance E2E/spec maps.
Close the uncovered combined E2E-03/04 journey: real registration/OTP/declaration,
join a previously approval-required province group, send actual text, reload and
verify persisted membership/message. Add E2E-05/FX-01 for that new member: first
keyword violation hidden, second violation revokes the session, correct-password
login rejected, and Admin reports show two violations with the default7-day lock
deadline. Same assertions for MSW/native; no synthetic lock cookies, response
interception or direct mock state injection. Record failures before extending
the manifest for any actual implementation gap. Full MSW run already started at
eb008e0f excludes these newly added cases; do not count them in that run's scope.

## FILES TOUCHED — stage6 persisted moderation evidence

Create `packages/shared/src/mock-data/domains/moderation-persistence/schema.ts`,
`snapshot.ts`, `snapshot.spec.ts`.
Modify `packages/shared/src/mock-data/domains/report-context.ts`,
`moderation-violations.ts`, `moderation-jobs.ts`, `member-lifecycle.ts`,
`member-sessions.ts`, and existing `community-persistence/schema.ts`, `snapshot.ts`.
All existing source files remain below their caps. Add small state accessors,
with validation/composition in the separate domain module; no transport rewrite.
E2E-05 red evidence: fresh-member auto-lock and login rejection succeed, but the
Admin origin has zero matching reports. Persist actual reports, captured sender
identity, violation/settings/restoration state, keyword queue, account status,
lock metadata/reasons and session revocation epochs (not credentials). Restore
without executing a transition, replaying jobs or incrementing session epochs.
Test round-trip/deduplication, invalid-input atomicity, expiry and restoration.
No new native API, DB, authorization rule, lock duration or architecture decision.
