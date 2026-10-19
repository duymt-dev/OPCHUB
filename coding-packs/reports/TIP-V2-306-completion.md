# TIP-V2-306: Dọn dữ liệu 02:00, lưu giữ audit, dọn ảnh bị thay + rà NA-06/07/14/20/21/22 (completion)

> V2-P3, nhánh `feature/V2-P3-business-v2`. §8.15 NA-13 · §8.28 NA-26 · NA-08 · rà NA-06/07/14/20/21/22 ·
> REQ-213, REQ-214, REQ-226, REQ-206, REQ-207, REQ-220, REQ-221, REQ-222 · BR-11, BR-13.
> Migration `20261020090000_storage_gc`. V2Q mới: V2Q-159 → V2Q-162.

## Đã làm
- **Job 02:00 (NA-13)**: queue `housekeeping` (thay `cleanupTokens`), lịch `housekeeping-nightly` `0 2 * * *`
  Asia/Ho_Chi_Minh. `HousekeepingService` (module `system`) chỉ điều phối, mỗi domain tự dọn bảng của mình:
  token thành viên + token quản trị hết hạn/thu hồi quá 7 ngày (xoá theo lô 5000), file xuất hết hạn, tin mô phỏng,
  ảnh bị thay. Các bước độc lập: một bước lỗi thì ghi log rồi chạy tiếp, cuối cùng ném lỗi để BullMQ giữ job failed.
  Chạy lại idempotent. **Không đụng `audit_logs`.**
- **Tin mô phỏng (NA-08)**: mỗi phòng giữ 120 tin `is_simulated` mới nhất, còn lại xoá mềm bằng 1 câu `UPDATE … row_number()
  OVER (PARTITION BY room_id)`, có index partial `messages_simulated_room_idx`. Tin người thật không đụng.
- **NA-14 xuất dữ liệu**: file sống 1 giờ (trước là 24h), link ký `min(3600, thời gian còn lại)`. Job xoá object storage
  và đặt `file_key = NULL`, giữ dòng cho audit (index partial `export_jobs_expired_file_idx`). Lỗi storage một file thì
  lần sau thử lại.
- **NA-26 ảnh bị thay**: bảng `storage_gc(key PK, reason, enqueued_at)`.
  - `MediaGcService.enqueueReplaced(tx, cũ, mới)` chạy trong transaction cập nhật của: avatar thành viên, bìa nhóm,
    bìa sự kiện, bìa dự án + avatar đội ngũ bị bỏ, avatar persona, logo Cài đặt chung.
  - Data URL, URL ngoài và trường hợp ảnh không đổi đều bỏ qua.
  - `sweep` xoá object quá ân hạn 24h, theo lô 500 keyset. Trước khi xoá kiểm còn tham chiếu không bằng 1 query
    `UNION ALL` các cột ảnh; còn dùng thì bỏ khỏi hàng, không xoá.
- **NA-07**: `PersonaMessageService.post` chạy `MessageService.runSentHooks` như tin người thật, nên tin bot cũng
  qua bộ lọc từ khoá.
- **NA-21**: repo private trả `url: null` với người không phải chủ dự án (`projectRepoSchema.url` nullable). Admin vẫn
  thấy URL. Portal không có URL thì hiện nhãn nhà cung cấp; MSW làm tương tự.
- **NA-22**: gửi phiếu thì `MailService.request(tx, {kind:'service'})` ghi `mail_logs` + outbox `mail.requested` cùng
  transaction (luật 8). Mail kind mới `service`, ưu tiên 3 (giao dịch). Mẫu `serviceRequestMail` gồm mã YC, tên dịch
  vụ, "OPC Hub sẽ liên hệ lại". Admin Nhật ký mail có nhãn "Phiếu dịch vụ".
- **NA-06**: Portal bắt lỗi tra cứu (mạng, 5xx, 404) và toast "Không tra cứu được mã số thuế, vui lòng nhập thông tin
  doanh nghiệp", form vẫn nhập tay được. Server đã không chặn đăng ký từ trước (D-40, `lookupTax().catch(() => null)`).
  Quy ước fake: MST kết thúc `999` thì nguồn lỗi (FakeTaxProvider ném lỗi, MSW trả 500).

## Lệch so với TIP
- NA-22: TIP gợi ý outbox `service_request.created` rồi notification processor dựng mail. Mình dùng thẳng
  `MailService.request` trong transaction, kết quả tương đương (mail_logs + outbox cùng transaction) và bớt một bước
  trung gian. Vì vậy không sửa `outbox/events.ts` và `notification.processor.ts`.
- NA-21: chỉ chủ dự án thấy URL. Thành viên đội ngũ trong `project_members` là dữ liệu hiển thị, không có `user_id`, nên
  không xác định được "đội ngũ" là tài khoản nào (V2Q-160).

## Bảng rà NA
| NA | Kết quả | Ghi chú / test |
|---|---|---|
| NA-06 | **Đã sửa** | FE báo nhập tay khi tra lỗi; chặn trùng MST **còn mở**, chờ OQ-12 (V2Q-159). `register.int` REQ-206, e2e `auth-flows` REQ-206 |
| NA-07 | **Đã sửa** | Tin persona qua bộ lọc từ khoá. `moderation.int` REQ-207 |
| NA-14 | **Đã sửa** | Link/file 1 giờ, job xoá file. `housekeeping.int` REQ-214, `export.int` REQ-214 (TTL ≤ 3600) |
| NA-20 | Đạt | `settings-admin.int` REQ-220 (đổi tên test) |
| NA-21 | **Đã sửa** | Ẩn URL repo private. `project-social.int` REQ-221 |
| NA-22 | **Đã sửa** | Mail xác nhận phiếu. `service.int` REQ-222 (+ đổi tên test @nhắc) |
| NA-13 | Làm mới | `housekeeping.int` (5 test REQ-213/214/226), `audit-retention.int` (3 test REQ-213) |
| NA-26 (dọn) | Làm mới | `housekeeping.int` REQ-226 ×2, unit `media-gc.service.spec` |

## Test
- Int mới: `test/system/housekeeping.int.spec.ts` (6), `test/system/audit-retention.int.spec.ts` (3, gồm test âm: trigger
  chặn DELETE/UPDATE, `DELETE /admin/audit-logs*` → 404). Bổ sung REQ-221, REQ-222, REQ-207, REQ-206; đổi tên REQ-220,
  REQ-222; `export.int` cập nhật TTL.
- Unit: `media-gc.service.spec.ts` (REQ-226 `storageKeyOf`).
- e2e: `auth-flows` REQ-206 (MSW + server, không có nhánh `onServer`).

## Cổng
- lint 0 lỗi (5 cảnh báo `<img>` có sẵn) · typecheck sạch · depcheck sạch.
- Unit: server 99 · shared 90 · admin 157 · portal 115 · ui 37 · integrations 25.
- Int: 1051/1051.
- e2e behavior: MSW **178/178**, server (stack-b, seed:demo + flush:dev-cache) **178/178**.
- Commit: `36ef30c` (server, migration, test) + commit FE/e2e/báo cáo ngay sau.

## Chưa làm / chuyển
- Chặn trùng MST (OQ-12, V2Q-159). Tra cứu nhật ký quá 90 ngày (V2Q-161). Giới hạn 30 hội thoại bot: TIP-V2-501.
