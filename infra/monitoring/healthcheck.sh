#!/usr/bin/env bash
# OPCHUB — kiểm sức khoẻ mỗi phút (opchub-health.timer). Lỗi → POST ALERT_WEBHOOK_URL (nếu đặt) + exit 1.
# Env (/etc/opchub/health.env, tuỳ chọn):
#   API_INSTANCES="1 2"  SOCKET_INSTANCES="1 2"   (mặc định "1")
#   PUBLIC_HEALTH_URL=https://opchub.community/v1/health   (tuỳ chọn — kiểm cả đường Nginx/TLS)
#   ALERT_WEBHOOK_URL=  (Slack/Discord/Telegram-bridge nhận JSON {"text": ...})
# Chống spam: chỉ báo khi trạng thái đổi (lỗi mới / hồi phục), lưu ở STATE_FILE.
set -euo pipefail

API_INSTANCES="${API_INSTANCES:-1}"
SOCKET_INSTANCES="${SOCKET_INSTANCES:-1}"
PUBLIC_HEALTH_URL="${PUBLIC_HEALTH_URL:-}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
STATE_FILE="${STATE_FILE:-/var/lib/opchub-health/last-status}"

FAILS=()

# $1=tên $2=url $3=regex mã HTTP hợp lệ
probe() {
  local name="$1" url="$2" ok="$3" code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${url}" || true)"
  if [[ ! "${code}" =~ ${ok} ]]; then
    FAILS+=("${name}=${code:-timeout}")
  fi
}

for i in ${API_INSTANCES}; do
  probe "api@${i}" "http://127.0.0.1:410${i}/v1/health" '^200$'
done
for i in ${SOCKET_INSTANCES}; do
  # Socket chỉ nhận websocket → handshake polling trả 400 "Transport unknown" nghĩa là process sống.
  probe "socket@${i}" "http://127.0.0.1:420${i}/socket.io/?EIO=4&transport=polling" '^(200|400)$'
done
if [[ -n "${PUBLIC_HEALTH_URL}" ]]; then
  probe "public" "${PUBLIC_HEALTH_URL}" '^200$'
fi
if command -v systemctl >/dev/null 2>&1 && ! systemctl is-active --quiet opchub-worker; then
  FAILS+=("worker=inactive")
fi

notify() {
  [[ -n "${ALERT_WEBHOOK_URL}" ]] || return 0
  curl -fsS --max-time 10 -H 'Content-Type: application/json' \
    -d "{\"text\":\"[opchub-health $(hostname)] $1\"}" "${ALERT_WEBHOOK_URL}" >/dev/null || true
}

PREV="$(cat "${STATE_FILE}" 2>/dev/null || echo ok)"
mkdir -p "$(dirname "${STATE_FILE}")" 2>/dev/null || true

if [[ "${#FAILS[@]}" -gt 0 ]]; then
  NOW="fail: ${FAILS[*]}"
  printf '%s\n' "${NOW}" >&2
  if [[ "${PREV}" != "${NOW}" ]]; then
    notify "LỖI ${FAILS[*]}"
  fi
  printf '%s\n' "${NOW}" >"${STATE_FILE}" 2>/dev/null || true
  exit 1
fi

if [[ "${PREV}" != "ok" ]]; then
  notify "đã hồi phục (trước đó: ${PREV})"
fi
printf 'ok\n' >"${STATE_FILE}" 2>/dev/null || true
printf 'ok\n'
