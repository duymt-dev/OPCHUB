# Runbook: index bloat and manual reindex (P5-MAINT-01, TIP-V2-561)

Monitoring is automatic and read-only. **Reindexing is always manual.**

## Detection

- `opchub-index-bloat.timer` runs `infra/monitoring/index-bloat.sh` every Sunday at 03:30 ICT.
- Thresholds come from `/etc/opchub/index-bloat.env` (template:
  `infra/env/index-bloat.env.example`). It reports when:
  - an index is larger than `BLOAT_MIN_MB` (50) **and** its bloat is above `BLOAT_MAX_PCT` (30%), or
  - a non-unique index has `idx_scan = 0` and the statistics window is at least `UNUSED_DAYS` (30) days.
- Measurement: the script uses `pgstatindex()` when the `pgstattuple` extension is installed
  in that database, otherwise an estimate from `pg_class.reltuples` + `pg_stats`. No extension is
  required. Installing `pgstattuple` needs a superuser and gives exact leaf density.
- Where to look: `journalctl -u opchub-index-bloat --since -8d`, the `ALERT_WEBHOOK_URL`
  channel, and `systemctl list-timers opchub-index-bloat*`.
- Exit codes: 0 no finding, 1 finding (the unit treats this as success), 2 database unreachable
  or query failed (the unit fails and a webhook is sent).

## When to reindex

- Bloat finding: during low traffic only, 01:00–05:00 ICT, outside the 02:30 backup window.
  Not during a deploy or a bulk import.
- Unused-index finding: **do not drop it from this runbook.** Open a TIP and check that query
  (`database/query-indexing`). Dropping an index is a schema migration.

## Procedure (as `postgres`, directly on 5432, not through PgBouncer)

```bash
# 1. Confirm the finding and free disk (CONCURRENTLY briefly needs about one extra index size)
sudo -u postgres psql -d opchub -c "SELECT pg_size_pretty(pg_relation_size('<index>'))"
df -h /var/lib/postgresql
# 2. Rebuild without blocking writes; one index at a time, never REINDEX TABLE/DATABASE here
sudo -u postgres psql -d opchub -c "SET lock_timeout = '5s'; REINDEX INDEX CONCURRENTLY <index>"
```

`REINDEX INDEX CONCURRENTLY` can't run inside a transaction block (plain `psql -c` is fine),
and it waits for transactions already running. If `lock_timeout` stops it, retry later in
the window.

## Verify

```bash
sudo -u postgres psql -d opchub -c "SELECT pg_size_pretty(pg_relation_size('<index>')), indisvalid
  FROM pg_index WHERE indexrelid = '<index>'::regclass"
sudo -u postgres /srv/opchub/current/infra/monitoring/index-bloat.sh; echo "exit=$?"
```

Expected: smaller size, `indisvalid = t`, and the index no longer appears in the findings.

## Rollback / failed rebuild

`REINDEX CONCURRENTLY` swaps the index in only after the rebuild succeeds. If it is cancelled or
fails, the old index stays in use. It may leave an invalid `<index>_ccnew` (or `_ccold`) copy:

```bash
sudo -u postgres psql -d opchub -c "SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid"
sudo -u postgres psql -d opchub -c "DROP INDEX CONCURRENTLY <index>_ccnew"
```

No data changes, so there is nothing else to roll back. If the API p95 (SLO #1) rises during
the rebuild, cancel it with `SELECT pg_cancel_backend(<pid>)` and clean up as above.

## Local verification (TIP-V2-561, opchub_test only)

Evidence `coding-packs/reports/evidence/v2-561/`: a throwaway table with 1.5M rows and 90% deleted,
index 111 MB → finding `93.5%` (exit 1). `REINDEX INDEX CONCURRENTLY` → 8672 kB, valid, no
finding (exit 0). Unreachable DB → exit 2. Not deployed to the VPS.
