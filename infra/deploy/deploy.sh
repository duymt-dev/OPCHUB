#!/usr/bin/env bash
# OPCHUB — triển khai một commit lên VPS (ADR-0004).
#   sudo /srv/opchub/current/infra/deploy/deploy.sh <git-sha|tag>
# Bước: fetch → tách mã ra releases/<ts>-<sha> → pnpm install --frozen-lockfile → nạp env build Next
#       → prisma migrate deploy (DIRECT_URL, bỏ qua PgBouncer) → pnpm build → trỏ current → restart từng instance
#       → giữ KEEP_RELEASES bản gần nhất. Health lỗi → tự rollback symlink về bản trước.
# Biến tuỳ chọn: OPCHUB_ROOT, KEEP_RELEASES, API_INSTANCES="1 2", SOCKET_INSTANCES, PORTAL_INSTANCES, SKIP_MIGRATE=1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/deploy/lib.sh
source "${SCRIPT_DIR}/lib.sh"

REF="${1:-}"
[[ -n "${REF}" ]] || die "thiếu tham số: deploy.sh <git-sha|tag>"
[[ "${REF}" =~ ^[A-Za-z0-9._/-]+$ ]] || die "ref không hợp lệ"
require_root

REPO_DIR="${OPCHUB_ROOT}/repo"
[[ -d "${REPO_DIR}/.git" ]] || die "chưa có clone tại ${REPO_DIR} (xem infra/README.md §Lần đầu)"

log "fetch ${REF}"
as_app git -C "${REPO_DIR}" fetch --prune --tags origin
SHA="$(as_app git -C "${REPO_DIR}" rev-parse --verify "${REF}^{commit}")"
SHORT="${SHA:0:9}"
RELEASE="${RELEASES_DIR}/$(date -u +%Y%m%d%H%M%S)-${SHORT}"

log "tạo bản phát hành ${RELEASE}"
as_app mkdir -p "${RELEASE}"
as_app bash -c 'git -C "$1" archive --format=tar "$2" | tar -x -C "$3"' _ "${REPO_DIR}" "${SHA}" "${RELEASE}"
printf '%s\n' "${SHA}" | as_app tee "${RELEASE}/.release-sha" >/dev/null

log "pnpm install --frozen-lockfile"
as_app bash -c 'cd "$1" && pnpm install --frozen-lockfile' _ "${RELEASE}"

# NEXT_PUBLIC_* nhúng vào bundle lúc build → chép env Portal/Admin thành .env.production.local (gitignored)
install -o "${OPCHUB_USER}" -g "${OPCHUB_USER}" -m 0640 "${OPCHUB_ETC}/portal.env" "${RELEASE}/apps/portal/.env.production.local"
install -o "${OPCHUB_USER}" -g "${OPCHUB_USER}" -m 0640 "${OPCHUB_ETC}/admin.env" "${RELEASE}/apps/admin/.env.production.local"

if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  log "prisma migrate deploy (DIRECT_URL)"
  # Nạp env trong subshell của user app; không in giá trị nào.
  as_app bash -c 'set -a; . "$1"; set +a; [[ -n "${DIRECT_URL:-}" ]] || { echo "thiếu DIRECT_URL" >&2; exit 1; }; cd "$2" && pnpm --filter @opchub/db exec prisma migrate deploy' \
    _ "${OPCHUB_ETC}/server.env" "${RELEASE}"
fi

log "pnpm build"
as_app bash -c 'cd "$1" && NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 pnpm build' _ "${RELEASE}"

PREVIOUS="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
switch_current "${RELEASE}"

if ! restart_rolling; then
  if [[ -n "${PREVIOUS}" && -d "${PREVIOUS}" ]]; then
    log "health lỗi → trả current về ${PREVIOUS}"
    switch_current "${PREVIOUS}"
    restart_rolling || log "rollback cũng lỗi — kiểm journalctl -u 'opchub-*'"
  fi
  die "triển khai ${SHORT} thất bại (migration KHÔNG tự hoàn tác — xem infra/README.md §Rollback)"
fi

log "dọn bản cũ, giữ ${KEEP_RELEASES}"
CURRENT_REAL="$(readlink -f "${CURRENT_LINK}")"
mapfile -t OLD < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | tail -n +"$((KEEP_RELEASES + 1))")
for d in "${OLD[@]}"; do
  [[ "${RELEASES_DIR}/${d}" == "${CURRENT_REAL}" ]] && continue
  rm -rf -- "${RELEASES_DIR:?}/${d}"
done

log "xong: ${SHORT}"
