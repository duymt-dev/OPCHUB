# TIP-B62: Seed demo + 115 behavior e2e trên server thật

## HEADER
- TIP-ID: TIP-B62 · Module: db seed + e2e · Priority: P0 · Depends on: B61 · Estimated: L (8h+)
- **Files touched:**
  - `packages/db/seed/demo/**` (create: dựng từ `@opchub/shared` prototype-seed + mock-domains), `packages/db/seed/demo.ts`, `package.json` script `seed:demo`
  - `e2e/server/**` (create: global setup reset DB e2e + seed demo + chạy server), `e2e/playwright.server.config.ts` (create)
  - `e2e/env.ts`, `e2e/package.json` (modify: script `e2e:server`)
  - Sửa server/FE khi e2e lộ lệch hành vi (ghi từng mục vào báo cáo)
- **Parallel-safe with:** B64, B65.

## SPECIFICATIONS
1. DB riêng `opchub_e2e`? — **Không** (chỉ được dùng opchub_dev/opchub_test): e2e chạy trên `opchub_dev` sau `seed:demo` (idempotent, reset dữ liệu demo theo id cố định của prototype); Redis db 1.
2. Seed demo dựng đúng dữ liệu MSW cần cho e2e: TK demo (`an.nguyen@…`, `admin@…` mật khẩu prototype), 34 nhóm + `member_count`, thành viên M1–M8, phí, sự kiện e1–e5 + đăng ký, dự án p1–p10 + bình luận, NĐT, lĩnh vực, 4 quản trị + nhật ký, chiến dịch, mail log, persona/kịch bản/hội thoại, dịch vụ + YC, tin nhắn phòng.
3. Thời gian: e2e cố định `MOCK_NOW` qua `page.clock` (đã có); dữ liệu seed theo mốc `MOCK_NOW`.
4. Chạy `NEXT_PUBLIC_API_MOCKING=off` build portal/admin, server api+socket+worker.

## ACCEPTANCE CRITERIA
- `pnpm e2e:server --project behavior` → 115/115 (ghi danh sách test đổi + lý do nếu có).

## ⚠️ BUILDER-CHECKLIST
- [ ] Seed idempotent, không đụng DB khác; secret mật khẩu demo là dữ liệu công khai của prototype (không phải secret)
- [ ] Không sửa test để "cho qua" — sửa server/FE cho đúng hành vi, lệch thật ghi questions
- [ ] Commit + SHA
