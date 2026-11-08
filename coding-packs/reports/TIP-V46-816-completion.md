# COMPLETION REPORT — TIP-V46-816

**STATUS: DONE** — D-137 Web Push + PWA; parity được phân loại theo D-134, không phải gate chức năng đỏ.

- Ngày: 08/11/2026. Branch: `feature/TIP-V46-816-web-push-pwa`, base dev `ad4c5434`.
- Git implementation: **`584742ea`**; regression thực tế nguồn **`6baf0453`**;
  test script service worker **`c720e705`**. Commit tài liệu theo sau, không đổi app.
- PR vào **dev**: [#98](https://github.com/duymt-dev/OPCHUB/pull/98). Không tự merge/deploy production.

## Files changed / triển khai

- ADR-0010, catalog/lockfile thêm `web-push 3.6.7` + `@types/web-push 3.6.4`: SDK giao thức
  mã hóa/VAPID trong adapter, không thêm dịch vụ trả phí hay đổi stack.
- Migration `20261116090000_v46_web_push` + down: subscriptions/preferences,
  dispatch/delivery ledger owner duyệt, need-match ledger, store-digest cursor và reminded_1h_at.
  Không đổi bảng/API notifications.
- Shared Zod/API/queue/outbox, adapter fake/webpush, env/factory, controller tự phục vụ,
  repository batch/index, processor push, housekeeping, hook notify nguyên tử.
- Portal manifest/icons/SW, tab Thông báo, nút thiết bị và năm tùy chọn; MSW và đầy đủ
  khóa của 10 ngôn ngữ. Đã dịch 9 bộ ngoài vi để giữ nguyên assertion i18n, không dùng placeholder.
- Admin khối thiết bị, worker riêng theo basePath, toast đếm đăng ký, giữ audit/in-app.
- Ba nguồn: `scoreNeedMatch` + `isFeeUsable`, sự kiện 1h, digest 08:05 VN chỉ lượt xem hôm qua.
  Nhu cầu/digest dùng type in-app **system** vì enum hiện có chưa có need/store.
- Test riêng từng lớp; stub loopback; Nginx no-cache worker/manifest; cặp ảnh và báo cáo query.
  Danh sách chính xác: `git diff --name-status ad4c5434..c720e705` và tab Files của PR.

### Nối kỹ thuật trong phạm vi

Owner duyệt ledger/transaction, `notification.repository.ts`, ID outbox trong processor,
transaction khi reopen need và config trả cờ loại Admin. Module HTTP/Core thực tế nằm
chung file module nên nối tại đó; thêm import DI housekeeping, hook toast/device và query
module nhỏ. Đổi giờ sự kiện cũng reset mốc 1h như mốc 24h sẵn có, không đổi luồng quyền.
Continuation digest đi qua outbox để cursor/notification không mất khi job lỗi.

## Gates — output thực tế

| Lệnh / lane | Kết quả |
|---|---|
| Baseline trước nối feature | lint/typecheck/unit/depcheck/build exit0; server int2056; MSW391 passed/4 skipped |
| `pnpm lint` | **PASS**, 8 tasks successful |
| `pnpm typecheck --env-mode=loose` | **PASS**, 8 tasks successful |
| `pnpm test` | **2196 passed**, 2 existing skipped; 6 tasks successful |
| `pnpm test:int` qua wrapper DB test riêng | **2075 server +144 DB =2219 passed**, 234+29 files; 2 tasks successful,47m2s |
| `pnpm depcheck` | **PASS**, không vi phạm import |
| `pnpm build --env-mode=loose --force` | **PASS**, server/Portal/Admin; build native mocking=off cũng PASS |
| `pnpm e2e` MSW bản cuối | **393 passed,5 skipped**,16,2 phút (baseline4 skip +1 native-only, đã chạy native) |
| E2E native private, SKIP_SEED=1 | **8/8 PASS**: thiết bị/preferences/manifest, Admin retry503, chat mention, renewal config/no-channel |
| Parity MSW + native | 6 ảnh mới/lane; P89/P93 dưới3%; D-V46-APP tham khảo D137/B16/dữ liệu, CLI exit1 được giữ nguyên |

Log local: `test-results/v46-816-{delivery-lint,delivery-typecheck,delivery-unit,int-full,depcheck-final,e2e-msw-final,native-final}.log`.
Build logs `v46-816-build-*`; baseline logs `v46-816-baseline-*`. Không dùng kết quả giả hay hash binary thay Git SHA.

## Acceptance criteria — 15/15 có bằng chứng

| AC | Bằng chứng |
|---|---|
| Đăng ký/upsert/cap10/PWA off/ownership | `push-subscriptions.int.spec.ts`, auth/schema/self-delete/preferences/90-day purge |
| Gửi msg theo Admin + TV | `push-dispatch.int.spec.ts` › mention push respects admin and member switches |
| Renew/event, không activation/registration | cùng suite, gọi **handler nghiệp vụ thực**, relay ID lặp vẫn một intent |
| Nhu cầu phù hợp một lần, loại owner/hết phí | `need-match-notify.int.spec.ts`, rollback ledger/notification/outbox và cache invalidation |
| Mốc sự kiện1h/không gửi bù24h/legacy payload | `event-reminder-1h.int.spec.ts` |
| Digest ngày một lần,0/hide/expired/off bị loại | `store-digest.int.spec.ts` |
| Gone + retry chỉ thiết bị lỗi | dispatch int và native stub: endpoint tốt1 POST; endpoint lỗi503→201, không gửi lại thiết bị tốt |
| Outbox replay/interleaved/retained ledger | dispatch int; thành công gắn từng notification/device, không dựa mốc last_success chung |
| Che PII/tiền/cắt/link an toàn | payload unit; actual SW script **6 test PASS**, display/click/focus và không fetch handler |
| Admin audit + in-app + high urgency/count | `app-notify.int.spec.ts`, app-notify/web-push E2E, realm Admin không lẫn member |
| Env production | env unit: fake bị cấm, thiếu VAPID không khởi động |
| Portal/device/preferences reload/manifest | push UI/hook unit và E2E1440/390 |
| Không tranh service worker MSW | hook unit và full MSW393; worker mock vẫn điều khiển trang |
| Query/index | [4/4 EXPLAIN, fixture10000](TIP-V46-816-query-plans.md) |
| Không hồi quy | đầy đủ gate chức năng xanh; [parity phân loại và cặp ảnh](TIP-V46-816-parity.md) |

## Issues / deviations

- Prisma create-only bị checksum migration cũ trên DB riêng chặn. Không reset, không
  sửa migration/metadata cũ; dùng read-only schema diff rồi deploy đúng migration mới
  trên cả hai DB riêng, exit0. Chi tiết trong báo cáo query.
- Giữ nguyên assertions i18n: thay placeholder được TIP cho phép bằng bản dịch thực.
- Headless Chromium báo Notification.permission denied dù Permissions query granted;
  browser protocol fixture đồng bộ trạng thái granted, không sửa app để vượt quyền.
  API → transactional outbox → BullMQ → HTTP stub vẫn chạy thật; không nhận vơ browser push live.
- Không có exactly-once tuyệt đối qua mạng ngoài: crash sau HTTP2xx trước commit kết quả
  có thể gửi lại. Ledger chống retry thành công đã lưu, tag ổn định hỗ trợ thay cùng thông báo.
- Giữ thời gian/timeout/assertion production và các test cũ; không thêm consumer no-op.
- Không sửa prototype. D-V46-APP bổ sung thiết bị theo TIP/D137, B16 đã để sau;
  pixel khác không bị đổi thành lỗi chức năng. Owner review ảnh ở PR.

## Native HOLD / an toàn

- Dev riêng `opchub_v46_812_dev`, test `opchub_v46_801_test`; Memurai6381 DB3/DB2.
- Chỉ rolling bộ riêng sang816: API4310/socket4311/Portal3710/Admin3711;
  MSW riêng3940/3941, stub4832. Không dừng Postgres/native DB/Redis6379/HOLD gốc.
- SKIP_SEED=1; không full seed dev. Fixture renewal chỉ reset/khôi phục cấu hình qua API
  có audit; không sửa sổ phí để ép ảnh/test. Dịch vụ tiếp tục chạy cho owner kiểm.
- **0 lời gọi AI thật,0 gửi push thật**. Cấu hình AI815 được giữ, provider cuối còn nguyên,
  bot enabled/autoGenerate/replyToMembers đều false. Không đọc/copy key AI.
- Runtime test dùng PUSH_PROVIDER=fake và public key tạm, không ghi env thật/secret vào repo.

## Owner làm trước production

1. Tự tạo khóa một lần: `npx web-push generate-vapid-keys`; giữ private key ngoài repo/log.
2. Cấu hình PUSH_PROVIDER=webpush + VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT
   (mailto/https liên hệ thật) **trước restart production**; fake bị cấm kể cả PWA tắt.
3. Cho outbound HTTPS tới FCM/Mozilla/Apple push; deploy migration và Nginx no-cache.
4. Kiểm push/click/install bằng trình duyệt thật; iOS16.4+ phải thêm ứng dụng vào màn hình chính.
   Chưa có thiết bị iOS/production VAPID để kiểm thủ công; đây là bước vận hành đã ghi trong TIP,
   không phải bằng chứng tự động đã có. Không triển khai VPS hay tự merge PR trong phiên này.
