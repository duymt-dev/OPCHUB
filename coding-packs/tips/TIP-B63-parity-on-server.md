# TIP-B63: Parity 205 màn trên server thật

## HEADER
- TIP-ID: TIP-B63 · Module: e2e parity · Priority: P0 · Depends on: B62 · Estimated: S (4h)
- **Files touched:** `e2e/playwright.server.config.ts` (modify: project parity), sửa FE/seed khi lệch, `coding-packs/reports/ui-parity/*` (cập nhật bảng)
- **Parallel-safe with:** B64, B65.

## SPECIFICATIONS
1. `PARITY_IDS='*'` chạy với MSW off trên dữ liệu `seed:demo`.
2. Không tụt so với G6: 182 đạt / 13 deviation / 10 unreachable. Màn tụt → sửa seed/FE; lệch bắt buộc ghi deviation có lý do.

## ACCEPTANCE CRITERIA
- Kết quả parity ≥ 182 đạt, deviation ≤ 13 (cùng danh sách hoặc đã giải thích), unreachable ≤ 10.

## ⚠️ BUILDER-CHECKLIST
- [ ] Ngưỡng chênh ≤ 3% (ui-parity.md); commit + SHA
