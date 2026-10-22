# TIP-V2-561 completion: index bloat monitoring (P5-MAINT-01)

Branch `feature/TIP-V2-561-p5-maint-index-bloat` from `dev` ecc1b687. Verified only on the
local `opchub_test` database. **Nothing was run on the VPS, and nothing is deployed there.**

## Delivered

| File | Purpose |
|---|---|
| `infra/monitoring/index-bloat.sql` | Read-only report (SELECT only). Uses `pgstatindex` when `pgstattuple` is installed, otherwise an estimate from `pg_class` + `pg_stats` (no required extension) |
| `infra/monitoring/index-bloat.sh` | Applies thresholds (env `BLOAT_MIN_MB=50`, `BLOAT_MAX_PCT=30`, `UNUSED_DAYS=30`). Webhook or journald, anti-spam `STATE_FILE`. Exit 0/1/2 |
| `infra/monitoring/opchub-index-bloat.{service,timer}` | Weekly, Sunday 03:30 ICT, `Persistent`, same pattern as `opchub-backup.timer` |
| `infra/env/index-bloat.env.example` | Env template (no secret) |
| `infra/monitoring/slo.md` | Row 12 + quick command |
| `docs/runbooks/index-maintenance.md` | Manual `REINDEX INDEX CONCURRENTLY`: time window, commands, verification, rollback |

The script never writes to the database and never reindexes.

**Deviation from the TIP:** the TIP's Files touched list does not include
`infra/env/index-bloat.env.example`. I added it because rule 12 requires every new env
variable to have an example file. `check-syntax.sh` did not need to change: it picks up
`*.sh` and units automatically.

## Evidence (`evidence/v2-561/`, opchub_test, real numbers)

| Step | Result |
|---|---|
| 01 setup | Throwaway table `tip561_bloat`, 1,500,000 rows, 1,350,000 deleted, VACUUM. Index `tip561_bloat_k_idx` = 111 MB |
| 02 before | `bloat tip561_bloat_k_idx on tip561_bloat: 110MB 93.5% (estimate)`, exit 1 |
| 03 reindex | `REINDEX INDEX CONCURRENTLY`: 111 MB → 8672 kB, `indisvalid = t`, 0 invalid leftovers |
| 04 after | `ok (203 indexes checked, method estimate)`, exit 0 |
| 05 unreachable DB | `fail: cannot query database: ...`, exit 2 (not silent) |
| 06 pgstatindex branch | **Not verified.** `CREATE EXTENSION pgstattuple` needs a superuser, and the test role isn't one |
| 07 cleanup | Table dropped, 0 leftovers |

Logs contain no connection string or password.

## Gates

`pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` exit 0 (`gates.log`).
`infra/scripts/check-syntax.sh` OK (`check-syntax.log`). shellcheck, nginx and
systemd-analyze are not installed locally, so they were skipped. Run them on the VPS before
enabling the timer.

## Not done

- Deploying the units and env file on the VPS, and `systemctl enable --now opchub-index-bloat.timer`.
- Running the `pgstatindex` branch with a real superuser.
