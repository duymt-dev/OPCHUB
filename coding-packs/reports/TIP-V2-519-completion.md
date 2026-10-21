# TIP-V2-519 — Preserve ownership on metadata-only group PATCH

## Reproduced bug
Native HTTP before.log fails the original owner/count assertion: PATCH without
ownerId changes a member-owned group to the editing Admin and increments member
count from1 to2. This contradicts the shared schema's documented keep-current
contract and unchanged existing Admin MSW assertion. No test was weakened.

## Correction
Resolve omitted owner using the existing owner query inside setStaff transaction,
falling back to actor only when no owner exists (including create). Return resolved
owner ID to the service so outbox notification conditions/payload use actual
ownership. Deduplicate staff IDs before the existing upsert. Explicit transfer
still demotes old owner and uses existing same-transaction outbox/audit.

No new SQL statement, index, migration or API schema. Existing group update takes
the group row lock before staff reconciliation. Existing owner equality query and
group membership primary-key lookup retain their access paths. No large list or
pagination query was introduced.

## Verification
The native regression retains the failed assertion, adds no Admin membership/no
phantom transfer, explicit-transfer demotion, subsequent omitted-owner stability
and exactly one real owner-change outbox payload. Cohort includes existing
admin-groups creation/default-Admin/lecturer/audit/explicit-transfer controls and
six D-55 lock-propagation cases. Real opchub_test/Redis2 only; borrowed seed
province/deletedAt restored in finally and factory groups removed.

Native final cohort12/12 in3files. Root lint8/8 and typecheck8/8 pass (six cached
each); forced root units1180 passed +2 existing storage skips, six tasks with
zero cached. Depcheck has zero violations. Native before/initial/final receipts
are in evidence/v2-519/; shared final root receipts are in evidence/v2-518/.
Fresh full integration on immutable source8414500f: `pnpm test:int --force`
**1304/1304 pass**, server1283 across124files + DB21 across4files, two tasks,
zero cached,11m56.063s. Private preflight verified opchub_test on native5432;
integration setup pins Redis2/FakeLlm. No source changed during the run. Receipt
full-int.log and terminal state are retained in evidence/v2-519/. This supersedes
the historical1300/1300 checkpoint for full integration, not browser acceptance.
Full P5 acceptance/parity/dev integration/owner-review
PR remain open. No dev/HOLD process/provider changes; main is not merged.
