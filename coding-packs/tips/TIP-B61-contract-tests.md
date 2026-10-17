# TIP-B61: Contract test 193 endpoint trên server thật

## HEADER
- TIP-ID: TIP-B61 · Module: server test · Priority: P0 · Depends on: B60 · Estimated: M (8h)
- **Files touched:**
  - `apps/server/test/contract/contract-table.ts` (create: 193 dòng method + path + schema response + quyền)
  - `apps/server/test/contract/*.int.spec.ts` (create, chia theo module ≤ 400 dòng)
  - `apps/server/test/contract/coverage.int.spec.ts` (create: đối chiếu bảng với `coding-packs/plans/api-contract.md`)
- **Parallel-safe with:** B64, B65.

## SPECIFICATIONS
1. Mỗi endpoint trong `plans/api-contract.md` có ≥ 1 lời gọi trên app thật (DB `opchub_test`), response 2xx parse bằng **đúng zod schema FE dùng** (`packages/shared/src/api-domains`).
2. Test coverage: parse bảng markdown (193 dòng) và so với tập `METHOD path` đã gọi — thiếu → fail, kèm danh sách.
3. Endpoint sau cờ D-05 chạy với cờ bật (dev/test).
4. Endpoint chỉ dev (`/dev/*`) nếu có trong bảng: gọi được ở non-production.

## ACCEPTANCE CRITERIA
- `pnpm --filter @opchub/server test:int test/contract` → 193/193 endpoint được gọi và parse thành công.

## ⚠️ BUILDER-CHECKLIST
- [ ] Không mock Prisma; dữ liệu tạo bằng factory, dọn sau test
- [ ] File test ≤ 400 dòng mỗi file
- [ ] Commit + SHA
