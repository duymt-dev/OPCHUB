# TIP-V2-561: Chính sách giám sát phình index và reindex (P5-MAINT-01)

## HEADER
- TIP-ID: TIP-V2-561
- Project: OPCHUB
- Module: Vận hành (`infra/`) + tài liệu
- Priority: P2
- Depends on: none
- Estimated: M
- **Files touched:**
  - `infra/monitoring/index-bloat.sql` (create: truy vấn đo bloat index/bảng)
  - `infra/monitoring/index-bloat.sh` (create: chạy truy vấn, so ngưỡng, báo qua `ALERT_WEBHOOK_URL` như `healthcheck.sh`)
  - `infra/monitoring/opchub-index-bloat.service`, `opchub-index-bloat.timer` (create: tuần 1 lần)
  - `infra/monitoring/slo.md` (modify: thêm dòng chỉ số bloat + quy trình)
  - `infra/scripts/check-syntax.sh` (modify chỉ khi cần đăng ký script mới)
  - `docs/runbooks/index-maintenance.md` hoặc mục trong `infra/README.md` (create/modify: quy trình `REINDEX INDEX CONCURRENTLY`)
  - `coding-packs/audit/V2-P5-BUGS.md` (chỉ dòng P5-MAINT-01), `coding-packs/reports/TIP-V2-561-completion.md`, `coding-packs/reports/evidence/v2-561/**`, `coding-packs/02-TASK-GRAPH.md` (chỉ dòng V2-561)
- **Parallel-safe with:** TIP-V2-559, TIP-V2-560. Chung `V2-P5-BUGS.md`/`02-TASK-GRAPH.md` → chỉ sửa dòng của mình.

## CONTEXT
- Nhánh `feature/TIP-V2-561-p5-maint-index-bloat` từ `dev`.
- P5-MAINT-01: TIP-508 đo index test 485 pages/40 tuples sau fixture bị huỷ; chưa có chính sách giám sát/reindex production.
- Hạ tầng: 1 VPS native, systemd, PostgreSQL 16 + PgBouncer, không Docker. Mẫu: `infra/monitoring/healthcheck.sh` + `opchub-health.{service,timer}`, `infra/backup/`.

## APPLICABLE STANDARDS
- [database/query-indexing](../standards/database/query-indexing.md), [global/tooling](../standards/global/tooling.md)

## TASK
Thiết lập giám sát phình index định kỳ (đo, ngưỡng, cảnh báo) và quy trình reindex an toàn không khoá ghi, kiểm chứng trên `opchub_dev`/`opchub_test` local. Không chạy gì trên VPS production.

## SPECIFICATIONS
### Business Rules
1. Đo bằng thống kê có sẵn (`pg_stat_user_indexes`, `pg_relation_size`, ước lượng bloat theo `pgstattuple` nếu extension có, nếu không dùng ước lượng từ `pg_stats`); không thêm extension bắt buộc mà không ghi lý do.
2. Ngưỡng cảnh báo mặc định: index > 50 MB và bloat ước lượng > 30%, hoặc index không được dùng (`idx_scan = 0`) > 30 ngày → báo; cấu hình qua env.
3. Reindex chỉ `REINDEX INDEX CONCURRENTLY`, ngoài giờ cao điểm, chạy tay theo runbook (không tự động reindex).
4. Script chỉ đọc; không có lệnh ghi DB.

### Validation
- Chạy script trên `opchub_test` local: tạo bloat có kiểm soát trên bảng tạm, script phải báo; sau `REINDEX CONCURRENTLY` script hết báo. Lưu output vào `evidence/v2-561/`.
- `bash -n` / `shellcheck` (nếu có) pass; `infra/scripts/check-syntax.sh` pass.

### Error Handling
- Không kết nối được DB → exit khác 0 + báo, không im lặng.
- Thiếu `ALERT_WEBHOOK_URL` → chỉ log journald.

## ACCEPTANCE CRITERIA
1. Given index bị phình trên DB test, When chạy `index-bloat.sh`, Then báo đúng tên index và số đo; sau reindex không còn báo.
2. Timer tuần 1 lần, cùng mẫu với `opchub-health.timer`.
3. `slo.md` có dòng chỉ số + nơi xem; runbook có lệnh, thời điểm, cách xác minh, rollback.
4. P5-MAINT-01 → FIXED (policy + tooling), ghi rõ chưa triển khai lên VPS.
5. Gates repo exit 0.

## CONSTRAINTS
- DO NOT: chạy trên VPS/production; tự động reindex; secret trong repo (env qua file `/etc/opchub/*.env`).
- REUSE: cấu trúc `healthcheck.sh` (STATE_FILE chống spam, webhook).
- SKIP: thay đổi schema/index ứng dụng.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng nhánh; commit theo đường dẫn
- [ ] Bằng chứng báo trước/sau reindex trên DB test
- [ ] Rule: (1) script chỉ đọc; (2) reindex CONCURRENTLY chạy tay; (3) không secret
- [ ] Gates exit 0; `git status` sạch; DONE kèm SHA
