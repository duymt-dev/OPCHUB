# Khôi phục Postgres — OPCHUB

Mục tiêu NFR §14: **RPO 24h, RTO 4h**. Bản dump hằng đêm (02:30 Asia/Ho_Chi_Minh) + WAL archive cho PITR.
Diễn tập khôi phục ít nhất mỗi quý trên máy tạm, ghi thời gian thực tế vào `slo.md`.

## 0. Chuẩn bị

- Vào máy bằng tài khoản sudo. Không dán secret vào chat/log; credential offsite nằm trong `/etc/opchub/rclone.conf`.
- Dừng ứng dụng để không có ghi mới trong lúc khôi phục:

```bash
sudo systemctl stop opchub.target opchub-health.timer
```

## 1. Lấy bản dump

```bash
sudo -u postgres -i
export RCLONE_CONFIG=/etc/opchub/rclone.conf
ls -1 /var/backups/opchub/pg/                         # bản local (14 bản gần nhất)
rclone lsl offsite:opchub-backup/pg/ | sort -k2,3     # bản offsite (30 ngày)
rclone copy offsite:opchub-backup/pg/opchub-<TS>.dump /var/backups/opchub/restore/
rclone copy offsite:opchub-backup/pg/opchub-<TS>.dump.sha256 /var/backups/opchub/restore/
cd /var/backups/opchub/restore && sha256sum -c opchub-<TS>.dump.sha256   # chú ý: file .sha256 ghi đường dẫn gốc
pg_restore --list opchub-<TS>.dump | head                                # đọc được TOC là dump hợp lệ
```

## 2. Khôi phục logic (mất dữ liệu tới thời điểm dump — trong RPO 24h)

```bash
# Giữ DB hỏng để điều tra, không DROP ngay
psql -c "ALTER DATABASE opchub RENAME TO opchub_broken_$(date +%Y%m%d)"
psql -c "CREATE DATABASE opchub OWNER opchub_migrator"
pg_restore --dbname=opchub --jobs=4 --no-owner --role=opchub_migrator --exit-on-error opchub-<TS>.dump
psql -d opchub -c "GRANT USAGE ON SCHEMA public TO opchub_app"   # cấp lại quyền theo infra/README.md §Postgres
psql -d opchub -c "ANALYZE"
```

Kiểm: `SELECT count(*) FROM users;`, giao dịch mới nhất trong bảng thanh toán, `_prisma_migrations` khớp release đang chạy
(`cat /srv/opchub/current/.release-sha`). Nếu dump cũ hơn migration hiện tại → `deploy.sh <sha>` sẽ chạy `migrate deploy`.

## 3. PITR — khôi phục tới một thời điểm (dùng WAL archive)

Dùng khi cần dữ liệu mới hơn bản dump (ví dụ lỗi lúc 15:40 → khôi phục tới 15:39). Yêu cầu **base backup vật lý**
(`pg_basebackup`), không dùng được `pg_dump`. Base backup tuần: `pg_basebackup -D /var/backups/opchub/base/<date> -Ft -z -X none`
(L3: thêm timer tuần nếu chủ nhà cần PITR; hiện chỉ có WAL + dump logic).

```bash
sudo systemctl stop postgresql
sudo -u postgres mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.broken
sudo -u postgres mkdir -m 0700 /var/lib/postgresql/16/main
sudo -u postgres tar -xzf /var/backups/opchub/base/<date>/base.tar.gz -C /var/lib/postgresql/16/main
# Lấy WAL offsite về nếu máy mới
sudo -u postgres rclone copy offsite:opchub-backup/wal/ /var/lib/postgresql/wal-archive/
```

Thêm vào `/etc/postgresql/16/main/conf.d/zz-recovery.conf`:

```
restore_command = 'cp /var/lib/postgresql/wal-archive/%f %p'
recovery_target_time = '2026-10-17 08:39:00+00'   # UTC
recovery_target_action = 'promote'
```

```bash
sudo -u postgres touch /var/lib/postgresql/16/main/recovery.signal
sudo systemctl start postgresql
sudo -u postgres psql -c "SELECT pg_is_in_recovery()"   # f = đã promote
sudo rm /etc/postgresql/16/main/conf.d/zz-recovery.conf
```

## 4. Mở lại dịch vụ

```bash
sudo systemctl restart pgbouncer
sudo systemctl start opchub.target opchub-health.timer
sudo /srv/opchub/current/infra/monitoring/healthcheck.sh
```

- Đối soát lại giao dịch ngân hàng trong khoảng bị mất (SePay có thể gửi lại webhook / worker poll) — kiểm
  Admin › Thanh toán.
- Ghi sự cố: thời điểm lỗi, bản dump dùng, thời gian khôi phục thực tế (RTO), dữ liệu mất (RPO).

## 5. Máy chết hoàn toàn (ADR-0004: không HA)

1. Dựng VPS mới theo `infra/README.md` §Lần đầu (Postgres, PgBouncer, Redis, RustFS, Nginx, user `opchub`).
2. Chép lại `/etc/opchub/*.env` + `rclone.conf` từ kho secret của chủ nhà (L3).
3. Bước 1–2 ở trên, rồi `deploy.sh <sha cuối>`.
4. Dữ liệu S3 (ảnh, file): khôi phục từ bản sao thư mục RustFS offsite (`rclone sync offsite:opchub-backup/s3 ...`, L3 —
   B66 kiểm khôi phục RustFS).
5. Đổi DNS (Cloudflare) sang IP mới.
