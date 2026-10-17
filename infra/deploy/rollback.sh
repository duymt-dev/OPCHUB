#!/usr/bin/env bash
# OPCHUB — quay về bản phát hành trước (hoặc bản chỉ định) rồi restart từng instance.
#   sudo infra/deploy/rollback.sh                 # bản liền trước current
#   sudo infra/deploy/rollback.sh <tên-thư-mục>   # vd 20261017083000-5f2bceb12
# Chỉ đổi code. Migration đã chạy KHÔNG hoàn tác — migration phải tương thích ngược (expand/contract).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/deploy/lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_root

CURRENT_REAL="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
[[ -n "${CURRENT_REAL}" ]] || die "chưa có ${CURRENT_LINK}"

if [[ -n "${1:-}" ]]; then
  [[ "${1}" =~ ^[A-Za-z0-9._-]+$ ]] || die "tên bản phát hành không hợp lệ"
  TARGET="${RELEASES_DIR}/${1}"
else
  mapfile -t ALL < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)
  TARGET=""
  for ((i = ${#ALL[@]} - 1; i >= 0; i--)); do
    if [[ "${RELEASES_DIR}/${ALL[i]}" == "${CURRENT_REAL}" && "${i}" -gt 0 ]]; then
      TARGET="${RELEASES_DIR}/${ALL[i - 1]}"
      break
    fi
  done
  [[ -n "${TARGET}" ]] || die "không tìm thấy bản trước current"
fi

[[ "${TARGET}" != "${CURRENT_REAL}" ]] || die "đích trùng current"
switch_current "${TARGET}"
restart_rolling || die "health lỗi sau rollback — kiểm journalctl -u 'opchub-*'"
log "rollback xong: $(cat "${TARGET}/.release-sha" 2>/dev/null || basename "${TARGET}")"
