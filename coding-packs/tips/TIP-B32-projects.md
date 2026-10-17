# TIP-B32: Dự án Portal + Admin (BR-08, D-18, D-19, Q-G3b-*, Q-G5b-*)

## HEADER
- TIP-ID: TIP-B32 · Module: project · Priority: P0 · Depends on: TIP-B30 · Estimated: XL (16h)
- **Files touched:**
  - `apps/server/src/modules/project/**` (create: `domain/*`, `repositories/*`, `services/*`, `controllers/*`, `project-core.module.ts`, `index.ts`)
  - `apps/server/src/api/api-app.module.ts` (modify)
  - `apps/server/test/project/*.int.spec.ts`, `apps/server/test/factories/project.factory.ts` (create)
  - dependency `sanitize-html` (server) — sanitize HTML RichEditor phía server.
- **Parallel-safe with:** `sequential, shares api-app.module.ts with TIP-B31`.

## SPECIFICATIONS
1. BR-08: thấy khi `published` AND (public OR chủ OR thành viên nhóm được chia sẻ); không thấy → 404.
2. Lưu (`POST` 201 / `PATCH`): `submit ? pending_review : draft` (D-18, Q-G3b-7); PATCH khi `hidden` → 409; người khác → 404. Sanitize `description`. Đội rỗng → chủ dự án "Founder · CEO".
3. `/projects` sort new|follow|name, lọc `cat` / `stage` (`fund`) / `q`; deferred join. `/projects/stats` (featured Admin trước, rồi nhiều theo dõi nhất). `/me/projects`, `/me/projects/:id`.
4. Social: follow idempotent (±`followers_count`), góp ý 201 (`comment_count`), like idempotent, reply 201, resolved (chủ dự án, 403), repo-access 201 (404 khi repo không private, 409 lặp), share (chủ dự án; nhóm mình là thành viên; tin vào phòng Chung qua `MessageService`). `/members/suggest`.
5. Admin (`p.pub`): `approve|request_changes|reject|hide|republish` UPDATE `WHERE status=<from>` → 0 dòng 409; rời `published` bỏ featured; bulk; delete (xoá mềm); featured (UQ partial); counts; audit tag `project`.

## ACCEPTANCE CRITERIA
- Dự án riêng tư → người ngoài 404, thành viên nhóm được chia sẻ xem được.
- Duyệt `draft` → 409; approve `pending_review` → `published` + audit.
- Đặt nổi bật dự án đã ẩn → 409; ẩn dự án nổi bật → bỏ nổi bật.

## ⚠️ BUILDER-CHECKLIST
- [ ] Không N+1 khi dựng thẻ; EXPLAIN khám phá + hàng duyệt ≥10k; gate; commit; SHA
