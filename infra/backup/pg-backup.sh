#!/usr/bin/env bash
# OPCHUB — backup Postgres hằng đêm (TIP-B65, NFR §14: backup hằng ngày, RPO 24h).
# Chạy bởi opchub-backup.service (user postgres). Bước:
#   pg_dump -Fc → kiểm bằng pg_restore --list → giữ BACKUP_KEEP_LOCAL bản local → rclone đẩy offsite
#   (offsite giữ BACKUP_KEEP_REMOTE_DAYS ngày, mặc định 30 theo §14) → đồng bộ thư mục WAL archive (PITR).
# Env (/etc/opchub/backup.env, root:postgres 0640):
#   PGDATABASE=opchub  BACKUP_DIR=/var/backups/opchub/pg  BACKUP_REMOTE=offsite:opchub-backup
#   BACKUP_KEEP_LOCAL=14  BACKUP_KEEP_REMOTE_DAYS=30  WAL_ARCHIVE_DIR=/var/lib/postgresql/wal-archive
#   RCLONE_CONFIG=/etc/opchub/rclone.conf   (credential offsite nằm trong file này, không in ra)
#   ALERT_WEBHOOK_URL=  (tuỳ chọn — báo lỗi)
# Kết nối qua unix socket bằng peer auth của user postgres → không cần mật khẩu trong env.
set -euo pipefail

PGDATABASE="${PGDATABASE:-opchub}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/opchub/pg}"
BACKUP_KEEP_LOCAL="${BACKUP_KEEP_LOCAL:-14}"
BACKUP_KEEP_REMOTE_DAYS="${BACKUP_KEEP_REMOTE_DAYS:-30}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"

log() { printf '[opchub-backup] %s\n' "$*"; }

alert() {
  local msg="$1"
  log "LỖI: ${msg}" >&2
  if [[ -n "${ALERT_WEBHOOK_URL}" ]]; then
    curl -fsS --max-time 10 -H 'Content-Type: application/json' \
      -d "{\"text\":\"[opchub-backup $(hostname)] ${msg}\"}" "${ALERT_WEBHOOK_URL}" >/dev/null || true
  fi
}

fail() { alert "$1"; exit 1; }

TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/${PGDATABASE}-${TS}.dump"
TMP="${FILE}.partial"

trap 'rm -f -- "${TMP}"' EXIT

umask 077
mkdir -p "${BACKUP_DIR}"

log "pg_dump ${PGDATABASE} → ${FILE}"
pg_dump --format=custom --compress=6 --no-owner --no-privileges --dbname="${PGDATABASE}" --file="${TMP}" \
  || fail "pg_dump thất bại"

log "kiểm tra bằng pg_restore --list"
ENTRIES="$(pg_restore --list "${TMP}" | grep -c -v '^;' || true)"
[[ "${ENTRIES}" -gt 0 ]] || fail "bản dump rỗng hoặc hỏng (${TMP})"
mv -- "${TMP}" "${FILE}"
sha256sum "${FILE}" >"${FILE}.sha256"
log "OK: ${ENTRIES} mục TOC, $(du -h "${FILE}" | cut -f1)"

log "giữ ${BACKUP_KEEP_LOCAL} bản local"
mapfile -t OLD < <(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${PGDATABASE}-*.dump" -printf '%f\n' \
  | sort -r | tail -n +"$((BACKUP_KEEP_LOCAL + 1))")
for f in "${OLD[@]}"; do
  rm -f -- "${BACKUP_DIR:?}/${f}" "${BACKUP_DIR:?}/${f}.sha256"
done

if [[ -z "${BACKUP_REMOTE}" ]]; then
  alert "BACKUP_REMOTE trống — chỉ có bản local, KHÔNG đạt yêu cầu offsite"
  exit 1
fi
command -v rclone >/dev/null 2>&1 || fail "thiếu rclone"

log "đẩy offsite → ${BACKUP_REMOTE}/pg/"
rclone copy --no-traverse "${FILE}" "${BACKUP_REMOTE}/pg/" || fail "rclone copy dump thất bại"
rclone copy --no-traverse "${FILE}.sha256" "${BACKUP_REMOTE}/pg/" || fail "rclone copy sha256 thất bại"
rclone check --one-way --size-only "${BACKUP_DIR}" "${BACKUP_REMOTE}/pg/" --include "$(basename "${FILE}")" \
  || fail "bản offsite không khớp kích thước"

log "xoá bản offsite > ${BACKUP_KEEP_REMOTE_DAYS} ngày"
rclone delete --min-age "${BACKUP_KEEP_REMOTE_DAYS}d" "${BACKUP_REMOTE}/pg/" || alert "rclone delete bản cũ lỗi (không chặn)"

if [[ -n "${WAL_ARCHIVE_DIR}" && -d "${WAL_ARCHIVE_DIR}" ]]; then
  log "đồng bộ WAL archive → ${BACKUP_REMOTE}/wal/"
  rclone copy "${WAL_ARCHIVE_DIR}" "${BACKUP_REMOTE}/wal/" || fail "rclone copy WAL thất bại"
  # WAL cũ hơn bản dump giữ lâu nhất không còn dùng cho PITR
  find "${WAL_ARCHIVE_DIR}" -type f -mtime +"${BACKUP_KEEP_LOCAL}" -delete
  rclone delete --min-age "${BACKUP_KEEP_REMOTE_DAYS}d" "${BACKUP_REMOTE}/wal/" || alert "rclone delete WAL cũ lỗi (không chặn)"
fi

log "xong"
