# TIP-V2-306: Dọn dữ liệu 02:00, lưu giữ audit, dọn ảnh bị thay + rà NA-06/07/14/20/21/22 (NA-13, NA-26)

## HEADER
- TIP-ID: TIP-V2-306 · Project: OPCHUB · Module: worker + account + settings + export + chat + uploads + moderation + project + service · Priority: P1 · Depends on: TIP-V2-102 (ảnh qua storage — dọn ảnh chỉ áp cho URL storage), TIP-V2-109 (xuất dữ liệu, cùng `export.service.ts`), TIP-V2-110 (cùng `service-request.service.ts`), TIP-V2-201 (nhân sự nội bộ = `admin_users`) · Estimated: M (10h)
- **Files touched:**
  - Job: `apps/server/src/worker/schedules.ts` (modify: `housekeeping-nightly` `0 2 * * *` tz VN) · `packages/shared/src/queues/queues.ts` (modify: đổi `scheduler.cleanupTokens` (chưa dùng) → `scheduler.housekeeping`) · `apps/server/src/worker/processors/housekeeping.processor.ts` (create) · `apps/server/src/worker/worker-app.module.ts` (modify: thêm processor + `ExportCoreModule`/`UploadsModule`/`ChatCoreModule` nếu chưa import)
  - Dọn theo domain (mỗi module tự dọn bảng của mình, processor chỉ điều phối):
    - `apps/server/src/modules/account/repositories/refresh-token.repository.ts` (modify: `purgeExpired(before)` lô 5.000)
    - `apps/server/src/modules/settings/services/admin-accounts.service.ts` (modify: lời mời hết hạn/thu hồi > 30 ngày; bỏ nếu TIP-V2-201 đã xoá bảng `admin_invites`)
    - `apps/server/src/modules/export/export.service.ts` + `export.repository.ts` (modify: `purgeExpired` xoá file storage + `file_key=NULL`; NA-14 link 1 giờ)
    - `apps/server/src/modules/chat/services/persona-message.service.ts` (modify: `pruneSimulated` giữ 120 tin mô phỏng mới nhất/phòng; NA-07 chạy hook từ khoá)
    - `apps/server/src/modules/chat/services/message.service.ts` (modify: xuất `runSentHooks` cho đường persona)
    - `apps/server/src/modules/uploads/media-gc.service.ts` + `media-gc.service.spec.ts` (create) · `uploads/uploads.module.ts`, `uploads/index.ts` (modify)
    - `packages/db/prisma/schema/system.prisma` (modify: `model StorageGc`) · migration `<ts>_storage_gc` (**agent chính tạo, `--create-only` + review SQL**)
    - Gọi `MediaGcService.enqueueReplaced(tx, old, next)` trong tx cập nhật ảnh: `apps/server/src/modules/account/services/profile.service.ts`, `apps/server/src/modules/event/services/event-admin.service.ts`, `apps/server/src/modules/project/services/project-write.service.ts`, `apps/server/src/modules/community/services/group-admin.service.ts`, `apps/server/src/modules/settings/services/settings-admin.service.ts` (logo), `apps/server/src/modules/bot/services/bot-catalog.service.ts` (ảnh persona) (modify — mỗi chỗ 1–2 dòng)
  - Rà NA: `apps/server/src/modules/project/domain/project.mapper.ts` (modify: NA-21 ẩn URL repo private) · `apps/server/src/modules/service/services/service-request.service.ts` (modify: NA-22 mail xác nhận qua outbox) · `apps/server/src/modules/mail/templates-service.ts` (create) · `packages/shared/src/outbox/events.ts` (modify — chỉ thêm `service_request.created`) · `apps/server/src/worker/processors/notification.processor.ts` (modify: register) · `apps/portal/src/features/auth/hooks/use-tax-lookup.ts` + `apps/portal/messages/vi/auth.json` (modify: NA-06 lỗi tra cứu → nhập tay)
  - Test: `apps/server/test/system/housekeeping.int.spec.ts` (create) · `apps/server/test/system/audit-retention.int.spec.ts` (create) · `apps/server/test/project/project-social.int.spec.ts`, `apps/server/test/service/service.int.spec.ts`, `apps/server/test/moderation/*.int.spec.ts`, `apps/server/test/export/export.int.spec.ts`, `apps/server/test/account/register.int.spec.ts`, `apps/server/test/settings/settings-admin.int.spec.ts` (modify: gắn mã REQ) · `e2e/behavior/auth-flows.spec.ts` (modify: NA-06)
- **Parallel-safe with:** 301, 302, 303, 304 (khác file trừ dòng `schedules.ts`/`queues.ts`/`outbox/events.ts`/`worker-app.module.ts` chỉ thêm). `sequential, shares export.service.ts with TIP-V2-109; service-request.service.ts with TIP-V2-110; persona-message.service.ts with TIP-V2-501`.
- **Phase / nhánh:** V2-P3, `feature/V2-P3-v2-features`

## CONTEXT
- Đặc tả: §8.15 NA-13 (02:00 dọn tin mô phỏng cũ, OTP hết hạn, link xuất hết hạn; audit ≥ 12 tháng, không xoá từ giao diện), §8.28 NA-26 ("Ảnh cũ bị thay thế được dọn theo NA-13"), §8.2, §8.10 NA-08 (≤ 120 tin mô phỏng/phòng), và các NA cần rà: §8.8 NA-06, §8.9 NA-07, §8.16 NA-14, §8.22 NA-20, §8.23 NA-21, §8.24 NA-22. REQ-213, REQ-226 (phần dọn), REQ-206, REQ-207, REQ-214, REQ-220, REQ-221, REQ-222. BR-11, BR-13.
- Hiện trạng: không có job 02:00 (SPEC-V3-DELTA §4.1). OTP nằm trong Redis có TTL 600s nên tự hết, không cần dọn. `audit_logs` có trigger chặn UPDATE/DELETE/TRUNCATE (migration init), UI Nhật ký chỉ đọc 90 ngày / 500 dòng. `export_jobs.expires_at` = +24h, presign GET 300s. Job `scheduler.cleanupTokens` khai báo nhưng không ai dùng.
- Kết quả rà NA (đọc code `main`):
  - **NA-06**: tra cứu có cache Redis; MST không có → 404. Lỗi mạng ném ra, `use-tax-lookup.ts` không bắt nên form không báo "nhập tay". "MST đã có tài khoản → báo trùng" **chưa có**, và mâu thuẫn OQ-12 (cho nhiều người cùng MST, `business_profiles.tax_code` không unique).
  - **NA-07**: hook từ khoá chỉ gắn `MessageService.onSent`. `PersonaMessageService.post` **không chạy hook**, nên tin persona không qua bộ lọc (trái NA-07, D-50). Không tự ẩn tin: đúng.
  - **NA-14**: link ký 300s, job hết hạn 24h, lệch "1 giờ". File không bao giờ bị xoá. Quyền và audit thuộc TIP-V2-109.
  - **NA-20**: không xoá khi đang dùng (409), lĩnh vực tắt ẩn khỏi lựa chọn dự án (`!hidden && scopes.includes('project')`), số đếm theo dự án đang hiển thị (`visibleTo`). Đạt. Form đăng ký DN dùng ngành nghề tự do theo MST (prototype cũng vậy), không đọc danh mục (xem Câu hỏi).
  - **NA-21**: lọc private + chi tiết 404 đạt (`visibleTo`). **Thiếu**: `repoOf()` trả `url` repo private cho mọi người xem được dự án.
  - **NA-22**: mã `YC-<seq>`, ghi chú nội bộ không có API Portal, @nhắc lọc theo `staff()`. **Thiếu** email xác nhận khi gửi phiếu.

## APPLICABLE STANDARDS
[queues-workers](../standards/backend/queues-workers.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [query-indexing](../standards/database/query-indexing.md) · [security](../standards/security/security.md) · [integrations/adapters](../standards/integrations/adapters.md) (storage) · [testing](../standards/testing/testing.md)

## TASK
Thêm job dọn dữ liệu 02:00 giờ VN: token hết hạn, file xuất hết hạn, tin mô phỏng vượt 120/phòng, ảnh bị thay thế. Không bao giờ đụng `audit_logs`. Sửa các lỗ hổng tìm thấy khi rà NA-06/07/14/21/22. Gắn mã REQ vào test hiện có cho các NA đã đạt (NA-20, phần còn lại của NA-21/22).

## SPECIFICATIONS
### Business Rules
1. **Lịch** `housekeeping-nightly` (`0 2 * * *`, `Asia/Ho_Chi_Minh`), handler `scheduler.housekeeping` concurrency 1. Mỗi bước độc lập (lỗi một bước ghi log và chạy tiếp, cuối cùng ném nếu có bước lỗi để BullMQ giữ failed). Xoá theo lô (≤ 5.000 dòng/lệnh, lặp tới hết), không query theo từng dòng.
2. **Token**: `refresh_tokens` có `expires_at < now − 7d` hoặc `revoked_at < now − 7d`. Lời mời quản trị hết hạn/thu hồi > 30 ngày (nếu bảng còn).
3. **Xuất dữ liệu (NA-14)**: `expires_at = createdAt + 1h` (đặc tả: "link ký số hết hạn 1 giờ"; nếu TIP-V2-109 đã đổi thì giữ bản của 109), presign GET TTL = `min(3600, expires_at − now)`. Job dọn: `status='done' AND expires_at < now AND file_key IS NOT NULL` → `storage.delete(file_key)` rồi `file_key = NULL` (giữ dòng để audit tra cứu). Lỗi storage một file → bỏ qua, lần sau thử lại.
4. **Tin mô phỏng** (NA-08, NA-13): mỗi phòng giữ 120 tin `is_simulated` mới nhất, phần còn lại xoá mềm (`deleted_at = now`), một câu `UPDATE … FROM (SELECT id, row_number() OVER (PARTITION BY room_id ORDER BY created_at DESC, id DESC) rn FROM messages WHERE is_simulated AND deleted_at IS NULL) x WHERE x.rn > 120`. Không đụng tin người thật, kể cả tin trả lời persona. Giới hạn ≤ 30 hội thoại bot thuộc TIP-V2-501.
5. **Ảnh bị thay (NA-26)**: bảng `storage_gc (key PK, reason, enqueued_at)`. Khi một domain đổi ảnh (avatar, bìa nhóm/sự kiện/dự án, ảnh đội ngũ, logo, persona) từ URL storage A sang B, gọi `MediaGcService.enqueueReplaced(tx, A, B)` **trong cùng transaction** (A khác B, A thuộc `storage.publicUrl('')`). Data URL và URL ngoài thì bỏ qua. Job xoá object có `enqueued_at < now − 24h` (ân hạn cho cache/CDN), xoá dòng sau khi `storage.delete` thành công. Trước khi xoá, kiểm key không còn được tham chiếu (1 query `UNION ALL` các cột ảnh `= ANY($keys)`); còn dùng thì bỏ khỏi hàng.
6. **Audit (NA-13, BR-13)**: job **không** đụng `audit_logs`. Không có API xoá nhật ký (test âm: `DELETE /admin/audit-logs*` → 404; `DELETE FROM audit_logs` → lỗi trigger). Màn Nhật ký giữ 90 ngày/500 dòng (D-cũ). Tra cứu xa hơn 90 ngày xem Câu hỏi.
7. **NA-07**: `PersonaMessageService.post` gọi cùng hook sau commit như tin người thật (`MessageService.runSentHooks`), nên trúng từ khoá thì tạo ca `auto`. Không tự ẩn.
8. **NA-21**: `repoOf(r, viewer)`: repo `private` và người xem không phải chủ hoặc đội ngũ thì trả `{ provider, visibility: 'private', url: null }` (schema `url` nullable) cùng nút "Xin quyền truy cập" như hiện tại. Admin (`toAdminProject`) vẫn thấy URL.
9. **NA-22**: tạo phiếu ghi outbox `service_request.created { code }` cùng transaction → mail xác nhận kind mới `service` (thêm vào enum `MailKind`, cùng migration) gửi tới email trên phiếu, nội dung: mã YC, tên dịch vụ, "OPC Hub sẽ liên hệ lại". Badge YC mới đã có (`/admin/badges`).
10. **NA-06**: FE bắt lỗi tra cứu (mạng/5xx/404): toast "Không tra cứu được mã số thuế, vui lòng nhập thông tin doanh nghiệp" và để trống cho nhập tay, không chặn đăng ký. "MST đã có tài khoản": **không làm** trong TIP này vì đang mâu thuẫn OQ-12 (ghi Câu hỏi; nếu PM chốt chặn thì thêm `registered: boolean` vào `bizLookupSchema` + 409 ở đăng ký).

### Data / Migration
- `storage_gc (key text PK, reason text NOT NULL, enqueued_at timestamptz NOT NULL DEFAULT now())`, index `(enqueued_at)`. `ALTER TYPE mail_kind ADD VALUE 'service'`. Partial index `messages (room_id, created_at DESC, id DESC) WHERE is_simulated AND deleted_at IS NULL` nếu EXPLAIN bước 4 seq scan. Migration do agent chính tạo, `--create-only` + review SQL.

## ACCEPTANCE CRITERIA
- Given 130 tin mô phỏng + 5 tin thật trong phòng, When job 02:00 chạy, Then còn 120 tin mô phỏng mới nhất + 5 tin thật (NA-13, NA-08, REQ-213).
- Given file xuất tạo lúc T, Then link hết hạn sau 1 giờ; job sau T+1h xoá object, `GET /exports/:id` trả không có `url` (NA-14, REQ-214).
- Given TV đổi avatar A → B, When job chạy sau 24h, Then object A bị xoá, B còn; A đang được dùng ở bản ghi khác thì không xoá (NA-26, REQ-226).
- Given refresh token hết hạn 8 ngày, Then bị xoá; token còn hạn giữ nguyên (NA-13).
- `audit_logs` không đổi số dòng sau job; `DELETE` trực tiếp bị trigger chặn; không route xoá nhật ký (NA-13, REQ-213, BR-13).
- Given persona đăng tin chứa từ khoá "chuyển khoản trước", Then có ca kiểm duyệt nguồn `auto` (NA-07, REQ-207).
- Given dự án public có repo private, When người ngoài xem chi tiết, Then `repo.url = null`; chủ dự án và Admin thấy URL (NA-21, REQ-221).
- Given gửi phiếu tư vấn hợp lệ, Then `mail_logs` có mail xác nhận tới email phiếu, mã `YC-xxxx` (NA-22, REQ-222, UAT-22).
- Given tra MST lỗi mạng, Then form báo nhập tay và vẫn đăng ký được (NA-06, REQ-206).

## TESTS BẮT BUỘC
- Unit `apps/server/src/modules/uploads/media-gc.service.spec.ts`: `REQ-226 chỉ enqueue URL storage khác nhau`.
- Int `apps/server/test/system/housekeeping.int.spec.ts`: `REQ-213 prune 120 tin mô phỏng/phòng`, `REQ-213 token hết hạn`, `REQ-214 file xuất quá 1 giờ bị xoá`, `REQ-226 ảnh bị thay xoá sau 24h, ảnh còn tham chiếu giữ`, `REQ-213 chạy 2 lần idempotent`. `apps/server/test/system/audit-retention.int.spec.ts`: `REQ-213 job không đụng audit`, test âm `REQ-213 DELETE audit_logs bị trigger chặn`, `REQ-213 không có route xoá nhật ký`. `project-social.int.spec.ts`: `REQ-221 repo private ẩn URL với người ngoài`. `service.int.spec.ts`: `REQ-222 mail xác nhận phiếu`, đổi tên test @nhắc thành `REQ-222`. Moderation: `REQ-207 tin persona qua bộ lọc`. `settings-admin.int.spec.ts`: đổi tên test lĩnh vực thành `REQ-220 …`. `register.int.spec.ts`: `REQ-206 tra cứu lỗi không chặn đăng ký`.
- e2e `auth-flows.spec.ts`: `REQ-206 tra cứu MST lỗi → nhập tay` (msw: handler trả 503; server: provider fake cấu hình lỗi), không có nhánh `onServer` làm yếu assertion (D-63).

## CONSTRAINTS
- DO NOT: xoá hoặc sửa `audit_logs` dưới bất kỳ hình thức nào; xoá ảnh ngay lúc thay (phải qua hàng + ân hạn); gọi storage trong transaction DB; query trong vòng lặp.
- REUSE: `STORAGE` provider (`@/common/integrations`), `OutboxService`, `MailService.request`, `vnDay`, mẫu `FeeProcessor` (đăng ký handler `scheduler`).
- SKIP: chặn trùng MST (chờ PM, OQ-12); giới hạn 30 hội thoại bot (TIP-V2-501); quyền/audit tải file xuất (TIP-V2-109); cắt 50 thông báo (TIP-V2-305).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 8 (enqueue ảnh + mail phiếu qua outbox cùng tx), luật 10 (audit bất biến), luật 11 (storage chỉ qua adapter), luật 5 (xoá theo lô, không lặp query).
- [ ] File dùng chung chỉ thêm dòng (`schedules.ts`, `queues.ts`, `outbox/events.ts`, `worker-app.module.ts`, `notification.processor.ts`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + `pnpm test:int` + `pnpm e2e` msw và server.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-306-DONE <sha> — <N> test passed`, viết `coding-packs/reports/TIP-V2-306-completion.md` kèm bảng rà NA-06/07/14/20/21/22 (đạt / đã sửa / còn mở).
