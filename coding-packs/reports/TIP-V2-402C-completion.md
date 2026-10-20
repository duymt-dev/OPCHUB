# TIP-V2-402C — API completion; P4 remains IN-PROGRESS

Source **`986930c`**, committed/pushed. REQ-308/312, V2Q-179 API portion.
User scope remains finish P4 then stop; no P5. UI wiring/visual acceptance are
separate TIP-404 work, not implied by this API completion.

## Delivered / requirement evidence

| Requirement | Implementation and actual evidence |
|---|---|
| Server-owned draft example | Guarded GET `/admin/affiliate/policy/preview?rate=1..50`; shared query/output zod; domain helper composes existing `commissionAmount` |
| Authoritative list price | Fixed 600,000 VND from SRS/AGENTS and `membership-fee.prisma` default; no price setting exists, no historical customer's paid amount used |
| Validation | Native + fake API test missing/empty/0/51/fraction/text queries; 400 VALIDATION_ERROR with rate field; valid 1/20/27/50 return exact amounts |
| Read permissions | Existing native read-guard inventory expanded; anonymous 401, member/action-only 403, viewer 200; fake API guard runs before validation |
| Locked session | Real Admin status transition locks viewer; its issued session receives 403; unlock + fresh login restores read. MSW raw-session read regression adds the fifteenth route |
| Historical invariants | Native real September payout precedes preview; before/after compare policy, agent rate/live bank, paid commission amount/list amount/rate/date/bank snapshot and actor policy-update audit count |
| Contract completeness | Admin contract exercises all **15** routes; table/coverage updated to **215** total endpoints with no missing/extra declaration |
| No new query cost | Pure read preview: no DB query, migration, env/dependency or ledger write; no new index required |

The handler's calculation is a fake backend simulation, not a production UI
fallback. Existing policy GET/PUT, permissions and audit behavior remain intact.
The preview is not a saved policy or an affiliate's account-specific entitlement.

## Verification

- Forced lint/typecheck/unit: **22/22 tasks**, **793 passed + 2 existing skips**.
  Admin 307, Portal 163, shared 140, server 115, UI 43, integrations 25.
- Depcheck: both graphs pass, **1460/4006**, server **671/2935**.
- Native Affiliate + Portal/Admin contract + contract-coverage regression:
  **55/55, 23 files**, local Postgres **5432/opchub_test**, Redis **2**.
- Committed focused native run: **9/9, 4 files**. This reruns the new preview,
  guards and contract/coverage using the final lint-corrected assertions; these
  nine are included in the 55 distinct cases, not nine additional cases.
- Focused Admin MSW raw-handler/session tests: **27/27**. Twelve preview cases
  and the new locked read are included in the 793 unit total.
- Fresh server production build passes. Persistent native browser services were
  not started; embedded test API instances close through the test harness.

## Failed attempts retained

The first MSW focused run was 26/27: a nonexistent account fixture (`adm-hung`)
returned 401, not the intended missing-view 403. The test now uses the actual
editor account `adm-hang` and also checks invalid-query guard precedence.
The first forced gate failed server lint because `expect.any(String)` produced
an unsafe assignment; final assertions inspect the parsed field path and message
type explicitly. Final forced gates and committed native rerun pass. No guard
was weakened and no assertion was skipped by target.

## Remaining phase scope

TIP-404 source `e1cb2f7` now consumes this preview for the **current valid draft**,
handles stale/wrong-rate/error responses without inventing money and retains
editable terms/all PUT fields. Its fresh builds, 44/44 MSW and current 11/14
parity are documented in `TIP-V2-404-policy-preview-checkpoint.md`; mobile policy
still fails at 16.60%. This API is not evidence that a pixel gap is closed.
Complete Admin state inventory, native browser AT-AF/CSV audit/RBAC/
locked acceptance, seeded audits, reconciliation/final reports and P4 main merge
remain. No P5 work and no P4-DONE claim.

Evidence: [`evidence/v2-402c/`](evidence/v2-402c/).
