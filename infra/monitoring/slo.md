# SLO — OPCHUB (NFR SRS §14 / §14.1, PROJECT-CONTEXT dòng NFR & SLO)

| #   | Chỉ số                  | Ngưỡng                                    | Cách đo                                                                                                                                                              | Nơi xem / cảnh báo                                                                             |
| --- | ----------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | API p95                 | < 300ms                                   | `$request_time` trong access log Nginx `/v1/*` (thêm `rt=$request_time urt=$upstream_response_time` vào log_format); tính p95 theo cửa sổ 5 phút. k6 B66 nghiệm thu. | `goaccess` / script awk trên `/var/log/nginx/opchub-*.access.log`; > 300ms trong 15 phút → báo |
| 2   | Tin nhắn tới người nhận | < 500ms p95                               | k6 B66: 5.000 socket, 50 tin/s, đo từ `message.send` tới `message.new` ở client khác                                                                                 | Báo cáo k6 (`infra/k6`, TIP-B66)                                                               |
| 3   | Danh sách tải trên 4G   | < 2s                                      | Playwright/Lighthouse throttling "Fast 4G" trên màn danh sách chính                                                                                                  | Báo cáo e2e                                                                                    |
| 4   | OTP tới hộp thư         | < 30s                                     | Thời gian job mail (BullMQ `finishedOn - timestamp`) + nhà cung cấp SMTP                                                                                             | Log worker (journald `opchub-worker`)                                                          |
| 5   | Đối soát chuyển khoản   | < 5 phút                                  | `paid_at - bank_txn_at` từ bảng giao dịch; 1.000 CK/giờ (§14.2)                                                                                                      | Admin › Thanh toán; truy vấn định kỳ                                                           |
| 6   | Tỉ lệ 5xx               | < 0,5%                                    | Đếm `status >= 500` / tổng request `/v1/*` trong access log, cửa sổ 1 giờ                                                                                            | awk trên access log; > 0,5% → báo                                                              |
| 7   | Uptime                  | 99,5% / tháng (≤ ~3,6 giờ dừng)           | `opchub-health.timer` mỗi phút (`healthcheck.sh`) + giám sát ngoài gọi `PUBLIC_HEALTH_URL` (L3: UptimeRobot/Better Stack)                                            | Webhook `ALERT_WEBHOOK_URL`; journald `opchub-health`                                          |
| 8   | Backup                  | Hằng ngày, giữ 30 ngày offsite / 14 local | `opchub-backup.timer` 02:30 ICT; `pg_restore --list` kiểm mỗi bản                                                                                                    | `systemctl list-timers opchub-backup*`; lỗi → webhook                                          |
| 9   | RPO                     | 24h                                       | Bản dump đêm + WAL archive đồng bộ cùng lúc                                                                                                                          | Tuổi bản offsite mới nhất (`rclone lsl`) < 26h                                                 |
| 10  | RTO                     | 4h                                        | Diễn tập theo `infra/backup/restore.md` mỗi quý, ghi thời gian bên dưới                                                                                              | Bảng diễn tập                                                                                  |
| 11  | Quy mô                  | 100.000 TK, 5.000 kết nối chat            | k6 B66                                                                                                                                                               | Báo cáo k6                                                                                     |

## Đo nhanh trên máy

```bash
# p95 thời gian phản hồi /v1 trong log hôm nay (cần rt= trong log_format)
grep ' /v1/' /var/log/nginx/opchub-portal.access.log | grep -o 'rt=[0-9.]*' | cut -d= -f2 | sort -n \
  | awk '{a[NR]=$1} END {print "p95=" a[int(NR*0.95)] "s n=" NR}'
# Tỉ lệ 5xx
awk '$9 ~ /^5/ {e++} {n++} END {printf "5xx=%.3f%%\n", 100*e/n}' /var/log/nginx/opchub-portal.access.log
# Healthcheck gần nhất
journalctl -u opchub-health --since -1h --no-pager | tail
```

## Sentry (Q-B65-1)

`SENTRY_DSN` chỉ là biến giữ chỗ trong `infra/env/*.env.example`; tích hợp SDK làm sau khi chủ nhà cấp DSN.

## Nhật ký diễn tập khôi phục

| Ngày | Bản dump | Thời gian khôi phục | Ghi chú                                     |
| ---- | -------- | ------------------- | ------------------------------------------- |
| —    | —        | —                   | Chưa diễn tập (L3: lần đầu sau khi lên VPS) |
