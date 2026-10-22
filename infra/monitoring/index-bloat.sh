#!/usr/bin/env bash
# OPCHUB — weekly index bloat / unused index check (opchub-index-bloat.timer, TIP-V2-561).
# READ-ONLY: runs infra/monitoring/index-bloat.sql (SELECT only). Never reindexes; follow
# docs/runbooks/index-maintenance.md for a manual REINDEX INDEX CONCURRENTLY.
# Env (/etc/opchub/index-bloat.env, optional):
#   PGDATABASE / PGHOST / PGPORT / PGUSER (libpq; direct 5432, not PgBouncer)  or  DATABASE_URL
#   BLOAT_MIN_MB=50  BLOAT_MAX_PCT=30  UNUSED_DAYS=30
#   ALERT_WEBHOOK_URL=  (JSON {"text": ...}); unset → journald only
# Exit: 0 no finding, 1 finding(s), 2 cannot query the database.
# Anti-spam like healthcheck.sh: only notify when the finding set changes (STATE_FILE).
set -euo pipefail

BLOAT_MIN_MB="${BLOAT_MIN_MB:-50}"
BLOAT_MAX_PCT="${BLOAT_MAX_PCT:-30}"
UNUSED_DAYS="${UNUSED_DAYS:-30}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
STATE_FILE="${STATE_FILE:-/var/lib/opchub-index-bloat/last-status}"
SQL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/index-bloat.sql"
PSQL=(psql -X -w -v ON_ERROR_STOP=1 -At)
[[ -n "${DATABASE_URL:-}" ]] && PSQL+=(-d "${DATABASE_URL%%\?*}")

notify() {
  [[ -n "${ALERT_WEBHOOK_URL}" ]] || return 0
  curl -fsS --max-time 10 -H 'Content-Type: application/json' \
    -d "{\"text\":\"[opchub-index-bloat $(hostname)] $1\"}" "${ALERT_WEBHOOK_URL}" >/dev/null || true
}

if ! HAVE="$("${PSQL[@]}" -c "SELECT count(*) > 0 FROM pg_extension WHERE extname = 'pgstattuple'" 2>&1)"; then
  printf 'fail: cannot query database: %s\n' "${HAVE}" >&2
  notify "LỖI không truy vấn được DB: ${HAVE}"
  exit 2
fi
HAVE="$([[ "${HAVE}" == "t" ]] && echo true || echo false)"
if ! ROWS="$("${PSQL[@]}" -F '|' -v have_pgstattuple="${HAVE}" -f "${SQL}" 2>&1)"; then
  printf 'fail: bloat query: %s\n' "${ROWS}" >&2
  notify "LỖI truy vấn bloat: ${ROWS}"
  exit 2
fi

FINDINGS=()
MIN_BYTES=$((BLOAT_MIN_MB * 1024 * 1024))
while IFS='|' read -r idx tbl size pct scans days uniq method; do
  [[ -n "${idx}" ]] || continue
  mb=$((size / 1024 / 1024))
  if ((size > MIN_BYTES)) && awk -v p="${pct}" -v m="${BLOAT_MAX_PCT}" 'BEGIN { exit !(p > m) }'; then
    FINDINGS+=("bloat ${idx} on ${tbl}: ${mb}MB ${pct}% (${method})")
  fi
  if [[ "${uniq}" == "f" ]] && ((scans == 0 && days >= UNUSED_DAYS)); then
    FINDINGS+=("unused ${idx} on ${tbl}: idx_scan=0 for ${days}d, ${mb}MB")
  fi
done <<<"${ROWS}"

PREV="$(cat "${STATE_FILE}" 2>/dev/null || echo ok)"
mkdir -p "$(dirname "${STATE_FILE}")" 2>/dev/null || true
if [[ "${#FINDINGS[@]}" -gt 0 ]]; then
  NOW="$(printf '%s; ' "${FINDINGS[@]}")"
  printf '%s\n' "${FINDINGS[@]}" >&2
  [[ "${PREV}" != "${NOW}" ]] && notify "CẦN XEM ${NOW}(runbook docs/runbooks/index-maintenance.md)"
  printf '%s\n' "${NOW}" >"${STATE_FILE}" 2>/dev/null || true
  exit 1
fi
[[ "${PREV}" != "ok" ]] && notify "hết cảnh báo (trước đó: ${PREV})"
printf 'ok\n' >"${STATE_FILE}" 2>/dev/null || true
printf 'ok (%s indexes checked, method %s)\n' "$(grep -c . <<<"${ROWS}")" "$([[ "${HAVE}" == true ]] && echo pgstatindex || echo estimate)"
