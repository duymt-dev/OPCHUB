# TIP-V46-818 — actual query plans

## Audit pagination

Actual exported `auditLogPageQuery` executed as parameterized SQL with
`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)` against a connection-local TEMP clone of
`public.audit_logs` including deployed indexes.200,000 wide rows,13 actors,
four tags, about100 days; VACUUM ANALYZE. No public business/audit mutation,
planner forcing, disabled Seq Scan, changed statistics target or index hints.

| Filter | ID-page access | Final payload | Execution |
|---|---|---|---|
| None | Index Only Scan `audit_logs_created_at_id_idx`,51 IDs | PK late join |1.004ms |
| tag=member | Index Only Scan `audit_logs_tag_created_at_id_idx`,51 IDs | PK late join |0.744ms |
| actorId=actor-3 | Index Only Scan `audit_logs_actor_id_created_at_id_idx`,51 IDs | PK late join |0.808ms |
| actorId=system | Planner chose existing timestamp index,969 rows filtered before51 IDs | PK late join |0.741ms |
| tag+actor+30 days | Planner chose existing timestamp index,3,241 rows filtered before51 IDs | PK late join |1.620ms |

Both new equality-first indexes are available and independently used. For the
combined/system synthetic distributions the cost-based planner chose the old
ordered index instead; this is disclosed rather than claiming a new-index seek
or Index Only Scan that did not occur. No audit Seq Scan; LIMIT precedes payload
fetch. These are fixture observations, not a production latency/SLO claim.
Raw JSON: [tracked actual rerun plans](evidence/v46-818-audit-plans.json).
The initial ignored raw file was lost in external artifact cleanup; the same
actual query builder and TEMP-fixture procedure were rerun to preserve evidence.

## Need candidates

Existing real `need-matches-plan.int.spec.ts` runs the actual two-branch builder
on10,000 TEMP needs (wide descriptions), with indexed TEMP stores/users/fees/items.
Both visibility-filtered branches have their own200-ID LIMIT, then deduplication
and PK late payload joins. The focused plan run passed its existing no-needs-Seq
Scan, existing-index, row-order and200-unique-result assertions. In that fixture
both windows overlap, so200 unique rows is correct; general maximum is400 IDs.

- Strong branch and broad branch: existing `needs_status_updated_at_id_idx`
  scans, visibility semi joins through store/fee/user primary keys.
- Final payload: `needs_pkey` per bounded ID, no wide-payload load before LIMIT.
- Actual complete candidate query:13.732ms,200 output rows in focused run.
- Store lookup: unique owner index and indexed item list,0.130ms.
- Functional real-data regression separately proves an older industry+province
  match survives250 newer province-only needs and ranks first.
- Full integration independently reruns these unchanged plan assertions; final
  gate result remains to be recorded in the completion report.

## Migration verification

`20261118090000_v46_audit_filters`: two B-tree indexes only. Existing append-only
UPDATE/DELETE/TRUNCATE triggers are unchanged. Owner-approved blank chain DB:
105 deploys →818 down →818 up → identical schema dump; owned chain DB dropped.
No down/reset on reused development/integration databases.
