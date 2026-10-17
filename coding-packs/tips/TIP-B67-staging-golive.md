# TIP-B67: Staging + checklist go-live (chỉ chuẩn bị)

## HEADER
- TIP-ID: TIP-B67 · Module: ops · Priority: P0 · Depends on: B63, B65, B66 · Estimated: S
- **Files touched (create):** `infra/GO-LIVE-CHECKLIST.md` (UAT-01 → UAT-31, secret cần Chủ nhà cấp: SePay, SSO, Brevo, MST, S3 offsite, DSN)
- **Parallel-safe with:** mọi TIP B6.

## SPECIFICATIONS
1. Không deploy (cần VPS + secret thật — mức L3). Chỉ checklist + thứ tự chạy `infra/deploy`.
