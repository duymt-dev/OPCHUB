# TIP-B43: Export job (luật 10, Q-G4a-6)

## HEADER
- TIP-ID: TIP-B43 · Module: export · Priority: P0 · Depends on: TIP-B13 · Estimated: S (6h)
- **Files touched:**
  - `apps/server/src/modules/export/**` (create), `packages/shared/src/api-domains/export.ts` (create), `packages/shared/src/outbox/events.ts` (modify)
  - `apps/server/src/modules/account/services/admin-users.service.ts`, `community/services/group-admin.service.ts` (modify: tạo job thật)
  - `apps/server/src/worker/processors/export.processor.ts`, `worker/worker-app.module.ts` (create/modify)
  - `apps/server/test/export/export.int.spec.ts` (create)
- **Parallel-safe with:** `sequential`.

## SPECIFICATIONS
1. `ExportService.request(tx, actor, kind, params)` → `export_jobs` queued + outbox `export.requested` + audit (đã có ở caller). Users / group members export (202) tạo job thật, `jobId` = id job.
2. Worker `export.run`: dựng CSV (BOM) theo kind (`users`, `group_members`) bằng truy vấn keyset theo lô, `storage.put(exports/{id}.csv)`, `status=done`, `row_count`, `expires_at` +24h; lỗi → `failed`.
3. `GET /admin/exports/:id` (chỉ người tạo): `{id,status,rowCount,url|null}` — `url` = `presignGet` 5 phút khi done.
4. Xuất đồng bộ đang có (phí, NĐT, đăng ký sự kiện, yêu cầu dịch vụ) giữ nguyên trả CSV inline vì FE phụ thuộc (Q-B43-1).

## ACCEPTANCE CRITERIA
- Xuất thành viên → job done, file trên storage có đủ dòng, người khác GET → 404.

## ⚠️ BUILDER-CHECKLIST
- [ ] Storage qua adapter; gate; commit; SHA
