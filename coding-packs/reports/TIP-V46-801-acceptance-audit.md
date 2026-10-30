# V46-801 — interim acceptance audit (NOT COMPLETE)

Code source `302174ed`, current doc checkpoint `1bc2aeb7`. Previous goal turn:
**progress** (committed mock/error/test fixes and launched full gates). Current
turn has verified the original two live handles and inspected evidence. This
audit is not a completion report, scope reduction or approval of deviations.

Terminal follow-up: full MSW342/4 existing skips and integration1894/1894
passed at302174ed. Test-only `db0a6df4` resolves notification fixture isolation,
shell8/8 in both modes. See `TIP-V46-801-full-gate-results.md` for actual exit
codes, source-retention scopes, warning disclosure and unchanged visual gaps.

Portal CSS follow-up `2cad6a9f` now passes director-pricing1.023999%/1.481406%
and normal P-79 popup at1440/1366/390, without semantic/baseline changes.
Corresponding final frontend regression is required after this CSS change;
the earlier full MSW342/4 is not a fresh frontend gate. Other FAIL/unverified
visual rows below remain unchanged; see the pricing-layout checkpoint.

## Requirements versus inspected evidence

| Requirement | Evidence source inspected | Current conclusion |
|---|---|---|
| Three permanent regions; one person/region, one region/person, province uniqueness, locked-member rejection | `regional-directors.int.spec.ts`: AT-GDV05/06, config/version/province/bank tests and real DB constraints; count-planner checkpoint31/31 | Focused native evidence exists; current full suite pending |
| Valid appoint/revoke across trial/active/expiring/expired/pending; exact old term and no new trial | Same HTTP suite's five-state parameterized case; `regional-director-access.int.spec.ts` personal/business cases and byte-for-byte paid-history equality | Focused evidence exists, including preserved amount/paidAt/periods; no claim of new full-suite PASS |
| Exemption remains usable beyond old term; no sweep/reminder/collection; no fundraising exemption | HTTP scheduler/charge/paywall cases; access suite5/5 at3135676a; Portal browser1/1 each mode; director summary suite1/1 | Native and same-assertion browser proof exists for this scope, not blanket payment acceptance |
| Permission key and negative direct writes | AT-GDV03 explicitly reads as accountant, POST/PATCH/DELETE403; readonly controls tested in Admin unit suite | Backend enforcement covered, not merely hidden buttons |
| Audit/history/keyset; bad input400, unknown404, oversized413; transactional rollback | AT-GDV07 and negative/rollback cases in `regional-directors.int.spec.ts` | Inspected explicit assertions; whole current integration still running |
| EM-GDV1/2 commit→outbox→relay→BullMQ→fake mail, idempotency, no password, correct revoke copy and browser links | `regional-director-mail.int.spec.ts`: active/expired plus rollback3/3; `regional-directors.spec.ts` same-assertion native/MSW lifecycle | Focused delivery/browser proof exists; fake provider only |
| New list/count/history query EXPLAIN on10k, no large-table Seq Scan | Query/count integration and count-planner report462c267c,9 query cases inside31/31 focused set | Actual page/count/history metrics retained, including test-only VACUUM/ANALYZE/REINDEX conditions; not a claim for all selectivities/bloat |
| Shared/native demo, persistence, no extra financial history | Demo/persistence reports; native/MSW exact cohort reconciliation50fd0067; original paid history preserved | Matching10 members/3 directors/66 AF0 affiliates proven; later802/803 financial work not implemented here |
| Same assertions, MSW + native browser flows | Regional lifecycle, Portal exemption and P16 readonly catalogue pass both; fee7/7 native at302174ed, shell8/8 each mode atdb0a6df4 | Notification precondition fixed with unchanged assertions; no claim of a new single fifteen-test native command |
| Root lint/typecheck/unit/depcheck before code commit | Parser checkpoint: lint/typecheck8/8; forced unit6/6,2085+2 existing skips; depcheck2279+1008; final test-only edit rechecked | Proven for302174ed; historical2083 is not current unit total |
| Full integration and MSW regression, no lost E2E cases | Original failures retained; `pnpm test:int`71620 and `pnpm e2e`52127 terminal exit0 at302174ed | Integration1894/1894 across217 files; MSW342/4 existing skips,346 collected. Retained through later test-only setup with affected shell rerun8/8 both modes |
| Full build | All three entrypoints server build at4719e2ea in isolated output; current forced Portal/Admin build2/2,0cache,3m15.958s | All app scopes compiled with actual documented commands; not an unfiltered root-build claim. Server imports no changed shared mock domain |
| Parity every related state,1440/390,≤3% | Existing unmasked `ui-parity/results.*` and visual checkpoints | **Incomplete**; failures/unreachable states below cannot be waived by this audit |
| Commit/push/PR or permitted compare, completion/progress | Source302174ed pushed; permitted compare link in progress; gh previously unauthenticated | Compare allowed, no merge. Completion report deliberately absent while gates fail;802–812 not started |

Paths for native tests above are under `apps/server/test/affiliate/`, except
the director fee-summary test under `test/membership-fee/`; browser tests are
under `e2e/behavior/`. Existing reports contain actual commands and run counts.
Static test inspection establishes coverage intent, not a new runtime PASS.

## Visual gate status (pricing updated; remaining gaps retained)

| State | 1440 difference | 390 difference | Status |
|---|---:|---:|---|
| P6 director config | 1.030529% | 1.135688% | PASS |
| P9 fee table | 0.271943% | 2.166929% | PASS |
| P17 permissions | 2.750390% | 2.262872% | PASS |
| Portal director billing | 0.901775% | 1.987733% | PASS at8b1f0a13 |
| Portal director sidebar | 1.378639% | 5.088243% | Mobile FAIL; footprint corrected at8b1f0a13, no semantic waiver |
| Portal director pricing | 1.041830% | 1.481406% | PASS both at8b1f0a13 |
| D-84 related Affiliate overview | 15.713563% | 7.356264% | FAIL both |
| D-85 related detail | 0.921373% | 2.352309% | PASS atad0d5e3f; image does not prove803 payout behavior |
| D-85-CUS customers | 1.836861% | 2.503632% | PASS atad0d5e3f, v4.6 horizontal table restored; native360/390 responsive2/2 |
| D-85-RATE edit | 0.927778% | 2.335448% | PASS atad0d5e3f |
| Other related Affiliate sub-states | Fresh396e2fad except AFF-BULK | Fresh396e2fad except AFF-BULK | Whole36-case run12 pass/24 fail;32 captures10 PASS/22 FAIL,2 AFF-BULK navigation failures. Full inventory in Affiliate capture checkpoint |
| P16 mail catalogue | No reachable prototype capture | No reachable prototype capture | Unverified, not a new skip |

Latest invisible unmatched-transaction fixture edit does not change those
screens' markup/fixtures. Retaining prior scoped image evidence is valid;
retaining FAIL/unverified is mandatory. Prototype requests director membership
payment/locks fundraising against D-120, lacks a reachable Marketing entry,
and related Affiliate views include802/803 changes not yet implemented.
Those facts explain open work; they do not lower the threshold, authorize
later-TIP implementation in801, or permit marking the goal complete.

Follow-up396e2fad replaced32 old Affiliate rows with current captures and
retains22 actual image failures. D-84-AFF-BULK still has two stale0b76e98a
rows because prototype navigation fails its exact one-row assertion (two
HAOPC matches). Do not treat these as a current PASS; no test is skipped or
weakened. See `TIP-V46-801-affiliate-capture-checkpoint.md` for every fresh
result and the retained warning against financial-model acceptance by pixels.
