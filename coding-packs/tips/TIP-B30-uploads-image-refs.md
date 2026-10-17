# TIP-B30: Upload — loại ảnh mới + kiểm ảnh khi gắn (security upload)

## HEADER
- TIP-ID: TIP-B30 · Module: uploads · Priority: P0 · Depends on: TIP-B13 · Estimated: S (4h)
- **Files touched:**
  - `packages/shared/src/api-domains/profile.ts` (modify: `UPLOAD_KINDS` thêm `project-cover`, `team-avatar`, `event-cover`)
  - `apps/server/src/modules/uploads/{image-ref.service.ts,uploads.module.ts,index.ts}` (create/modify)
  - `apps/server/test/uploads/image-ref.int.spec.ts` (create)
- **Parallel-safe with:** none — B31/B32 dùng `ImageRefService`.

## CONTEXT
- FE hiện gửi ảnh bìa dự án/sự kiện/avatar thành viên đội dưới dạng **data URL** (DV-G3b-3, DV-G5a-3); `adminEventUpsertSchema.coverUrl ≤ 2.000.000` ký tự.
- `StorageProvider.head(key)` có sẵn (`packages/integrations/src/storage/types.ts`).

## APPLICABLE STANDARDS
- [backend/security](../standards/backend/security.md) — upload qua presign, kiểm lại `head`.

## SPECIFICATIONS
1. `ImageRefService.resolve({ userId, url, kind, current, path })` → URL lưu DB hoặc ném 400 `VALIDATION_ERROR` tại `path`:
   - `null` / `''` → `null`; bằng `current` (không đổi) → giữ nguyên.
   - `data:image/(png|jpeg|webp);base64,…` ≤ 2.000.000 ký tự → giữ nguyên (tương thích FE hiện tại, Q-B30-1).
   - URL dưới gốc `publicUrl` → key phải `${kind}/${userId}/…`, `head(key)` có, MIME ảnh, ≤ 5MB.
   - Khác → 400 "Ảnh không hợp lệ".
2. Không gọi storage trong transaction (luật 9): resolve trước, ghi sau.

## ACCEPTANCE CRITERIA
- Given key upload của người khác When resolve Then 400.
- Given object chưa tải When resolve Then 400 "Ảnh chưa được tải lên".
- Given data URL hợp lệ When resolve Then trả nguyên chuỗi.

## ⚠️ BUILDER-CHECKLIST
- [ ] int test (fake storage dev/test); gate xanh; commit; SHA
