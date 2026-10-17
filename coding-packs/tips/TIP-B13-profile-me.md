# TIP-B13: Hồ sơ `/me` đầy đủ, `PATCH /me`, `/members/suggest`, liên kết SSO

## HEADER
- TIP-ID: TIP-B13 · Module: account (profile) · Priority: P0 · Depends on: TIP-B07 · Estimated: M (6h)
- **Files touched:**
  - `apps/server/src/modules/account/controllers/me.controller.ts` (modify), `controllers/members.controller.ts` (create)
  - `apps/server/src/modules/account/services/profile.service.ts` (create), `repositories/profile.repository.ts` (create)
  - `apps/server/src/modules/account/domain/profile.mapper.ts` (+ `.spec.ts`) (create)
  - `apps/server/src/modules/account/ports.ts` (modify — `ProfileStatsReader`), `account.module.ts` (modify)
  - `packages/db/prisma/schema/account.prisma` (modify — `country`, `city`, `bio`, `website` nếu thiếu) + migration (agent chính)
  - `apps/server/test/account/profile.int.spec.ts` (create)
- **Parallel-safe with:** TIP-B10. Sequential, shares `account.module.ts` with B11/B12.

## CONTEXT
- Hợp đồng `profileSchema` (extends `meSchema`), `updateProfileSchema`, `ssoLinkResultSchema`, `requesterProfileSchema` (services đọc cùng `/me`).
  MSW `profile.ts`. D-40: MST/tên DN khoá khi `verified` → 403 `bizLocked`.

## TASK
`GET /me` trả `profileSchema` (vẫn là superset của `meSchema` — FE cũ không vỡ). `PATCH /me` cập nhật trường cho phép, đổi email/SĐT kiểm trùng (409).
`GET /members/suggest?q=` gợi ý thành viên (dự án thêm thành viên), tìm trigram, tối đa 10. `POST/DELETE /me/sso/:provider`.

## SPECIFICATIONS
1. Stats (`groups/events/projects`) qua port, mặc định 0 cho tới khi domain có (B20/B31/B32) — không đọc bảng domain khác.
2. `phone` trả `{country, number}`; lưu E.164.
3. `PATCH` business: MST/tên DN khi `verified` → 403 `PROFILE_MESSAGES.bizLocked`.
4. `members/suggest`: dùng `users_search` (expression GIN), chỉ `status=active`, trả `{id, fullName, avatarUrl, role?}` theo schema FE.

## ACCEPTANCE CRITERIA
- `GET /me` khớp `profileSchema` và `meSchema`.
- `PATCH /me {city}` → 200 cập nhật; `{business:{taxCode}}` khi verified → 403; `{email}` trùng → 409.
- `GET /members/suggest?q=nguyen` → ≤ 10 dòng, EXPLAIN dùng `users_search`.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC int test; EXPLAIN suggest trong report; gate xanh; commit; SHA
- [ ] Rule ranh giới: stats qua port, không đọc bảng domain khác
