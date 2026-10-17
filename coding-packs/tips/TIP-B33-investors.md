# TIP-B33: Nhà đầu tư (BR-09, D-14, Q-G5c-1 → 3)

## HEADER
- TIP-ID: TIP-B33 · Module: investor · Priority: P0 · Depends on: TIP-B32 · Estimated: L (10h)
- **Files touched:**
  - `apps/server/src/modules/investor/**` (create: `repositories/*`, `services/{interest,investor-thread,investor-admin}.service.ts`, `controllers/{investor-portal,admin-investors}.controller.ts`, `investor-core.module.ts`, `index.ts`)
  - `apps/server/src/api/api-app.module.ts` (modify)
  - `apps/server/test/investor/*.int.spec.ts` (create)
- **Parallel-safe with:** `sequential, depends on project module (TIP-B32)`.

## SPECIFICATIONS
1. `POST /projects/:id/interest` (201) + `Idempotency-Key` (`IdempotencyService`): 404 "Dự án không gọi vốn" → 403 chủ dự án → 409 đã gửi (UQ) → 409 dưới mức tối thiểu. `currency` = tiền tệ dự án. `@AllowAccountTypes('investor')` (D-14).
2. `GET /projects/:id/interests` chỉ chủ dự án (403). `GET /me/investor-thread`; `POST /investor-thread/:key/messages` (201; chủ dự án trả lời → `sent → in_discussion` có điều kiện).
3. Admin (`p.pub`): gom theo `investor_key`, `key` = id quan tâm đầu tiên, `lastAt` giảm dần, lọc `kind`/`q`; summary; PATCH status (mọi quan tâm của nhà đầu tư, audit `investor.status`); ghi chú 201 (`sent → in_discussion`); export CSV + audit `investor.export`.

## ACCEPTANCE CRITERIA
- Cùng Idempotency-Key 2 lần → 1 dòng, cùng id; key khác lần 2 → 409.
- 2 quan tâm cùng người → 1 dòng Admin, `totalAmount` cộng.

## ⚠️ BUILDER-CHECKLIST
- [ ] Tiền BigInt → number an toàn; audit; gate; commit; SHA
