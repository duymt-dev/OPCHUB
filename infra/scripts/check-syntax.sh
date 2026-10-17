#!/usr/bin/env bash
# OPCHUB — kiểm cú pháp infra/ (TIP-B64). Chạy từ gốc repo: bash infra/scripts/check-syntax.sh
# bash -n mọi *.sh → shellcheck (nếu có) → nginx -t (nếu có) → systemd-analyze verify (nếu có)
# → luôn chạy node infra/scripts/check-units.mjs (kiểm cấu trúc, không cần công cụ hệ thống).
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=0

section() { printf '\n== %s ==\n' "$*"; }

section "bash -n"
mapfile -t SCRIPTS < <(find "${INFRA_DIR}" -type f -name '*.sh' | sort)
for f in "${SCRIPTS[@]}"; do
  if bash -n "${f}"; then
    printf 'ok   %s\n' "${f#"${INFRA_DIR}"/}"
  else
    printf 'FAIL %s\n' "${f#"${INFRA_DIR}"/}"
    FAILED=1
  fi
done

section "shellcheck"
if command -v shellcheck >/dev/null 2>&1; then
  if shellcheck -x -S warning "${SCRIPTS[@]}"; then
    echo "ok   ${#SCRIPTS[@]} script"
  else
    FAILED=1
  fi
else
  echo "skip (không có shellcheck)"
fi

section "nginx -t"
if command -v nginx >/dev/null 2>&1; then
  TMP="$(mktemp -d)"
  mkdir -p "${TMP}/snippets" "${TMP}/logs"
  cp "${INFRA_DIR}/nginx/snippets/opchub-backend.conf" "${TMP}/snippets/"
  sed "s#/etc/nginx/snippets/#${TMP}/snippets/#; s#/var/log/nginx/#${TMP}/logs/#" \
    "${INFRA_DIR}/nginx/opchub.conf" >"${TMP}/opchub.conf"
  printf 'pid %s/nginx.pid;\nerror_log %s/logs/error.log;\nevents {}\nhttp {\n include %s/opchub.conf;\n}\n' \
    "${TMP}" "${TMP}" "${TMP}" >"${TMP}/nginx.conf"
  if nginx -t -p "${TMP}" -c "${TMP}/nginx.conf"; then echo "ok"; else FAILED=1; fi
  rm -rf "${TMP}"
else
  echo "skip (không có nginx)"
fi

section "systemd-analyze verify"
if command -v systemd-analyze >/dev/null 2>&1; then
  mapfile -t UNITS < <(find "${INFRA_DIR}/systemd" "${INFRA_DIR}/monitoring" -type f \
    \( -name '*.service' -o -name '*.timer' -o -name '*.target' \) | sort)
  # Unit tham chiếu đường dẫn trên VPS (/srv/opchub, /etc/opchub) — cảnh báo thiếu file là bình thường ở máy dev.
  if systemd-analyze verify "${UNITS[@]}"; then echo "ok"; else echo "cảnh báo (xem trên) — kiểm lại trên VPS"; fi
else
  echo "skip (không có systemd-analyze)"
fi

section "check-units.mjs"
if node "${INFRA_DIR}/scripts/check-units.mjs" "${INFRA_DIR}"; then :; else FAILED=1; fi

if [[ "${FAILED}" -ne 0 ]]; then
  printf '\nKẾT QUẢ: LỖI\n'
  exit 1
fi
printf '\nKẾT QUẢ: OK\n'
