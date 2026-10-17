# TIP-B65: Backup + quan sát (NFR §14.1)

## HEADER
- TIP-ID: TIP-B65 · Module: infra · Priority: P0 · Depends on: B64 · Estimated: S (6h)
- **Files touched (create):** `infra/backup/pg-backup.sh` (pg_dump -Fc hằng đêm + giữ 14 bản + đẩy offsite S3 qua `aws s3`/`rclone` cấu hình env), `infra/backup/wal-archive.conf.snippet`, `infra/backup/restore.md`, `infra/systemd/opchub-backup.{service,timer}`, `infra/logrotate/opchub`, `infra/monitoring/healthcheck.sh` (gọi `/v1/health` api + socket, cảnh báo webhook), `infra/monitoring/opchub-health.{service,timer}`, `infra/monitoring/slo.md` (ngưỡng §14.1, cách đo)
- **Parallel-safe with:** B60–B63.

## SPECIFICATIONS
1. Sentry: chỉ biến env `SENTRY_DSN` tuỳ chọn (ghi `.env.example` + README; tích hợp SDK để sau khi có DSN — Q-B65-1).
2. Script `set -euo pipefail`, không in secret.

## ⚠️ BUILDER-CHECKLIST
- [ ] `bash -n` mọi script; commit + SHA
