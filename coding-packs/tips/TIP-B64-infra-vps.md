# TIP-B64: `infra/` — 1 VPS native (ADR-0004)

## HEADER
- TIP-ID: TIP-B64 · Module: infra · Priority: P0 · Depends on: B01 · Estimated: M (8h)
- **Files touched (create):**
  - `infra/nginx/opchub.conf` (portal, admin, `/v1` → api upstream, `/socket.io` → socket upstream sticky `ip_hash`/websocket, gzip, cache tĩnh `_next/static`, giới hạn body, rate limit login, TLS chỗ trống cho certbot)
  - `infra/systemd/opchub-api@.service`, `opchub-socket@.service`, `opchub-worker.service`, `opchub-portal@.service`, `opchub-admin.service`, `opchub.target`
  - `infra/pgbouncer/pgbouncer.ini`, `userlist.txt.example`
  - `infra/redis/redis.conf.snippet`, `infra/rustfs/rustfs.service` (ADR-0007 thay MinIO)
  - `infra/deploy/deploy.sh` (pull → install → migrate deploy → build → restart theo instance, giữ bản cũ để rollback), `infra/deploy/rollback.sh`
  - `infra/env/*.env.example` (không secret)
  - `infra/README.md` + `infra/scripts/check-syntax.sh` (nginx -t trong docker? — **không Docker**: dùng `nginx -t -c` nếu có, `systemd-analyze verify` nếu có, `bash -n`, `shellcheck` nếu có; thiếu công cụ → kiểm cấu trúc bằng script node)
- **Parallel-safe with:** B60, B61, B62, B63 (không chung file).

## SPECIFICATIONS
1. Không Docker/K8s; user hệ thống `opchub`; `EnvironmentFile=/etc/opchub/*.env`; `Restart=always`, giới hạn tài nguyên, `NoNewPrivileges`, `ProtectSystem=strict`.
2. Đường dẫn và cổng lấy từ env (api@1..N, socket@1..N).
3. Không secret trong repo.

## ⚠️ BUILDER-CHECKLIST
- [ ] Kiểm cú pháp thực tế, paste kết quả; commit + SHA
