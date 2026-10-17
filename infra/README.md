# infra/ — OPCHUB trên 1 VPS cài native (ADR-0004, ADR-0007)

Không Docker/K8s. Nginx + systemd + PostgreSQL 16 + PgBouncer + Redis 7 + RustFS (S3) trên một máy, Cloudflare phía trước.
Mục **L3** = cần chủ nhà cung cấp/quyết định, agent không tự làm.

## Topology

```
Cloudflare ─► Nginx :80/:443
              ├─ opchub.community        /            → opchub_portal  (portal@i  :310i)
              │                          /_next/static → cache 1 năm, immutable
              ├─ admin.opchub.community  /            → opchub_admin   (admin     :3200)
              ├─ (cả hai host)           /v1/         → opchub_api     (api@i     :410i, least_conn)
              │                          /socket.io/  → opchub_socket  (socket@i  :420i, ip_hash, websocket)
              └─ s3.opchub.community     /            → RustFS :9000 (presigned PUT/GET)
api@ / socket@ / worker ─► PgBouncer :6432 (transaction) ─► Postgres :5432
                       └─► Redis :6379 (db 1: BullMQ, socket.io adapter, cache)
worker ─► SMTP, SePay, S3
```

## Cổng (chỉ nghe 127.0.0.1)

| Unit                         | Cổng                     | Cách đặt                                |
| ---------------------------- | ------------------------ | --------------------------------------- |
| `opchub-api@<i>`             | `410<i>` (4101, 4102, …) | `Environment=API_PORT=410%i` trong unit |
| `opchub-socket@<i>`          | `420<i>` (4201, …)       | `Environment=SOCKET_PORT=420%i`         |
| `opchub-portal@<i>`          | `310<i>` (3101, …)       | `Environment=PORT=310%i`                |
| `opchub-admin`               | 3200                     | cố định                                 |
| `opchub-worker`              | —                        | không nghe HTTP                         |
| PgBouncer / Postgres / Redis | 6432 / 5432 / 6379       |                                         |
| RustFS S3 / console          | 9000 / 9001              | `/etc/opchub/s3.env`                    |

Instance là chữ số 1–9 (đủ cho kế hoạch 2–3 instance mỗi loại ở 8 vCPU, Vision §3.2).

## Tệp

| Đường dẫn repo                                    | Cài vào                                          |
| ------------------------------------------------- | ------------------------------------------------ |
| `nginx/opchub.conf`                               | `/etc/nginx/conf.d/opchub.conf`                  |
| `nginx/snippets/opchub-backend.conf`              | `/etc/nginx/snippets/opchub-backend.conf`        |
| `systemd/*.service`, `*.target`, `*.timer`        | `/etc/systemd/system/`                           |
| `monitoring/opchub-health.{service,timer}`        | `/etc/systemd/system/`                           |
| `rustfs/rustfs.service`                           | `/etc/systemd/system/opchub-s3.service`          |
| `pgbouncer/pgbouncer.ini`, `userlist.txt.example` | `/etc/pgbouncer/`                                |
| `redis/redis.conf.snippet`                        | ghép vào `/etc/redis/redis.conf`                 |
| `backup/wal-archive.conf.snippet`                 | `/etc/postgresql/16/main/conf.d/opchub-wal.conf` |
| `logrotate/opchub`                                | `/etc/logrotate.d/opchub`                        |
| `env/*.env.example`                               | `/etc/opchub/<tên>.env` (điền giá trị thật)      |

Script (`deploy/`, `backup/`, `monitoring/`) chạy từ `/srv/opchub/current/infra/...` — luôn là bản đã deploy.

## Secret (L3)

- Mọi secret ở `/etc/opchub/*.env` + `/etc/opchub/rclone.conf`, **owner root, group app, mode 0640**
  (`server.env`, `portal.env`, `admin.env`, `health.env`: `root:opchub`; `backup.env`, `rclone.conf`: `root:postgres`;
  `s3.env`: `root:opchub-s3`). Thư mục `/etc/opchub` `root:root 0755`.
- Repo chỉ chứa `*.env.example` không có giá trị. Script không bao giờ in env.
- Sinh: `JWT_SECRET` (48 byte base64url), `DATA_ENC_KEY` (32 byte base64), `BANK_WEBHOOK_SECRET` (≥16), mật khẩu DB/Redis/S3.
- Production bắt buộc: `NODE_ENV=production`, `MAIL_PROVIDER=smtp`, `FEATURE_BOTS=false`, `FEATURE_SERVICES=false`,
  `OTP_FIXED_CODE=` (trống), `TRUST_PROXY=true`, `REFRESH_COOKIE_SECURE=true`; Portal/Admin `NEXT_PUBLIC_API_MOCKING=off`.
- `SENTRY_DSN=` tuỳ chọn, chưa tích hợp SDK (Q-B65-1).

## Lần đầu (thứ tự)

1. **OS**: Ubuntu 24.04 LTS; `adduser --system --group --home /srv/opchub opchub`; `adduser --system --group opchub-s3`.
   Cài Node 24 LTS (`/usr/bin/node`), `corepack enable` (pnpm theo `packageManager`), git, curl, rclone, nginx, certbot.
2. **Postgres 16**: tạo role `opchub_migrator` (owner DB, chạy migration) và `opchub_app` (ứng dụng, quyền DML),
   DB `opchub`. Ghép `backup/wal-archive.conf.snippet`, `mkdir -m 0700 /var/lib/postgresql/wal-archive` (owner postgres).
3. **PgBouncer**: chép `pgbouncer.ini`, tạo `userlist.txt` từ `pg_authid` (xem file mẫu), `systemctl enable --now pgbouncer`.
4. **Redis 7**: ghép `redis.conf.snippet` (+ `requirepass` L3), `systemctl restart redis-server`.
5. **RustFS**: cài binary, `/var/lib/opchub-s3/data` (owner opchub-s3), `/etc/opchub/s3.env`, enable `opchub-s3`.
   Tạo bucket `opchub` + CORS cho origin Portal/Admin (PUT/GET).
6. **Env**: điền `/etc/opchub/{server,portal,admin,backup,health}.env` từ `env/*.example` (L3).
7. **Mã nguồn**: `sudo -u opchub git clone <repo> /srv/opchub/repo`; `mkdir /srv/opchub/releases` (owner opchub).
   Lần đầu chưa có `current` → chạy script từ clone: `sudo /srv/opchub/repo/infra/deploy/deploy.sh <sha>`.
8. **systemd**: chép unit, `systemctl daemon-reload`, rồi
   `systemctl enable opchub.target opchub-api@1 opchub-socket@1 opchub-worker opchub-portal@1 opchub-admin`
   `systemctl enable --now opchub-backup.timer opchub-health.timer`.
9. **Nginx + TLS (L3)**: chép conf + snippet, `nginx -t`, reload; certbot cho 4 tên miền; bật `listen 443 ssl`, HSTS,
   dải IP Cloudflare (`set_real_ip_from`).
10. **journald**: `SystemMaxUse=2G` trong `/etc/systemd/journald.conf` (log pino của app đi journald).
11. **Firewall**: chỉ mở 22, 80, 443 (`ufw`); mọi dịch vụ khác nghe 127.0.0.1.

## Deploy / rollback

```bash
sudo /srv/opchub/current/infra/deploy/deploy.sh <git-sha|tag>
sudo /srv/opchub/current/infra/deploy/rollback.sh            # về bản liền trước
```

`deploy.sh`: tách mã vào `releases/<UTC-ts>-<sha>` → `pnpm install --frozen-lockfile` → chép `portal.env`/`admin.env`
thành `.env.production.local` (NEXT_PUBLIC nhúng lúc build) → `prisma migrate deploy` với `DIRECT_URL` (bỏ qua PgBouncer)
→ `pnpm build` → trỏ `current` → restart **từng instance**, chờ `/v1/health` (api), handshake (socket), `/` (portal/admin)
→ giữ 5 bản. Health lỗi → tự trả `current` về bản trước. Migration **không** tự hoàn tác: viết migration tương thích ngược
(thêm cột/bảng trước, xoá ở release sau).

## Scale

Nâng máy 4→8→16 vCPU (ADR-0004), không đổi code:

```bash
sudo systemctl enable --now opchub-api@2 opchub-socket@2 opchub-portal@2
# bỏ comment server 127.0.0.1:4102 / 4202 / 3102 trong /etc/nginx/conf.d/opchub.conf
sudo nginx -t && sudo systemctl reload nginx
# cập nhật API_INSTANCES / SOCKET_INSTANCES trong /etc/opchub/health.env
```

Ngân sách DB: (số process server) × `DB_POOL_MAX` ≤ `max_client_conn` PgBouncer; Postgres chỉ thấy `default_pool_size`.

## Backup & quan sát (TIP-B65)

- `backup/pg-backup.sh` qua `opchub-backup.timer` 02:30 ICT: `pg_dump -Fc`, kiểm `pg_restore --list`, giữ 14 local,
  `rclone` lên `BACKUP_REMOTE` (giữ 30 ngày), đồng bộ WAL archive. Khôi phục: `backup/restore.md`.
- `monitoring/healthcheck.sh` mỗi phút: api `/v1/health`, socket handshake, worker active, URL công khai; lỗi → `ALERT_WEBHOOK_URL`.
- SLO và cách đo: `monitoring/slo.md`.

## Kiểm cú pháp

```bash
bash infra/scripts/check-syntax.sh
```

`bash -n` mọi `*.sh`; `shellcheck` / `nginx -t` / `systemd-analyze verify` nếu máy có; luôn chạy
`node infra/scripts/check-units.mjs` (kiểm cấu trúc unit, nginx, ini).

## Việc còn chờ chủ nhà (L3)

- Tên miền thật + DNS Cloudflare; chứng chỉ TLS (certbot), bật HSTS; dải IP Cloudflare cho `set_real_ip_from`.
- Toàn bộ secret trong `/etc/opchub/*.env`, `userlist.txt`, `requirepass` Redis, credential RustFS.
- Remote offsite cho rclone (`BACKUP_REMOTE`) + backup thư mục dữ liệu RustFS; webhook cảnh báo; giám sát uptime ngoài.
- Tài khoản SePay thật (`BANK_PROVIDER=sepay`), SMTP thật; DSN Sentry (tuỳ chọn).
- Base backup vật lý hằng tuần nếu cần PITR thật sự (hiện: dump logic hằng ngày + WAL archive).
