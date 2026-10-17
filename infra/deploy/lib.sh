#!/usr/bin/env bash
# OPCHUB — hàm dùng chung cho deploy.sh / rollback.sh. Chỉ `source`, không chạy trực tiếp.
# Không bao giờ in nội dung /etc/opchub/*.env (chứa secret).

OPCHUB_ROOT="${OPCHUB_ROOT:-/srv/opchub}"
OPCHUB_USER="${OPCHUB_USER:-opchub}"
OPCHUB_ETC="${OPCHUB_ETC:-/etc/opchub}"
RELEASES_DIR="${OPCHUB_ROOT}/releases"
CURRENT_LINK="${OPCHUB_ROOT}/current"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

log() { printf '[opchub-deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { log "LỖI: $*" >&2; exit 1; }

require_root() {
  [[ "${EUID}" -eq 0 ]] || die "cần chạy bằng root (sudo) để systemctl restart"
}

# Chạy lệnh dưới user ứng dụng
as_app() {
  runuser -u "${OPCHUB_USER}" -- "$@"
}

# Liệt kê số instance đang bật của một unit template (vd: opchub-api@ → "1 2").
# Biến ghi đè: API_INSTANCES, SOCKET_INSTANCES, PORTAL_INSTANCES.
enabled_instances() {
  local unit="$1" override="$2" found
  if [[ -n "${override}" ]]; then
    printf '%s\n' "${override}"
    return
  fi
  found="$(systemctl list-units --type=service --all --plain --no-legend "${unit}*.service" 2>/dev/null \
    | awk '{print $1}' | sed -E "s/^${unit}([0-9]+)\.service$/\1/" | grep -E '^[0-9]+$' | sort -n | tr '\n' ' ')"
  printf '%s\n' "${found:-1}"
}

# Chờ URL trả mã HTTP chấp nhận được. $1=url $2=regex mã hợp lệ
wait_http() {
  local url="$1" ok="${2:-^2}" code i
  for ((i = 0; i < HEALTH_TIMEOUT; i++)); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "${url}" || true)"
    if [[ "${code}" =~ ${ok} ]]; then
      return 0
    fi
    sleep 1
  done
  log "health thất bại: ${url} (mã cuối: ${code:-none})"
  return 1
}

# Restart từng instance một, chờ khoẻ rồi mới sang instance kế (S-06: tránh reconnect storm).
restart_rolling() {
  local i
  for i in $(enabled_instances opchub-api@ "${API_INSTANCES:-}"); do
    log "restart opchub-api@${i}"
    systemctl restart "opchub-api@${i}"
    wait_http "http://127.0.0.1:410${i}/v1/health" '^200$' || return 1
  done
  log "restart opchub-worker"
  systemctl restart opchub-worker
  systemctl is-active --quiet opchub-worker || return 1
  for i in $(enabled_instances opchub-socket@ "${SOCKET_INSTANCES:-}"); do
    log "restart opchub-socket@${i}"
    systemctl restart "opchub-socket@${i}"
    # Socket chỉ nhận websocket: GET polling trả 400 nghĩa là process đã nghe cổng.
    wait_http "http://127.0.0.1:420${i}/socket.io/?EIO=4&transport=polling" '^(200|400)$' || return 1
    sleep "${SOCKET_STAGGER:-10}"
  done
  for i in $(enabled_instances opchub-portal@ "${PORTAL_INSTANCES:-}"); do
    log "restart opchub-portal@${i}"
    systemctl restart "opchub-portal@${i}"
    wait_http "http://127.0.0.1:310${i}/" '^(2|3)[0-9][0-9]$' || return 1
  done
  log "restart opchub-admin"
  systemctl restart opchub-admin
  wait_http "http://127.0.0.1:3200/" '^(2|3)[0-9][0-9]$' || return 1
}

# Trỏ symlink current sang bản phát hành (atomic: ln tạm rồi mv -T)
switch_current() {
  local target="$1"
  [[ -d "${target}" ]] || die "không có thư mục bản phát hành: ${target}"
  ln -sfn "${target}" "${CURRENT_LINK}.next"
  mv -Tf "${CURRENT_LINK}.next" "${CURRENT_LINK}"
  log "current → ${target}"
}
