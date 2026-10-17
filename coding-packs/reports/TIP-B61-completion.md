# TIP-B61 — Contract test 193 endpoint (hoàn thành)

## Kết quả

```
pnpm --filter @opchub/server exec vitest run --project int test/contract
 Test Files  18 passed (18)
      Tests  42 passed (42)
```

- `coverage.int.spec.ts` parse bảng `coding-packs/plans/api-contract.md` (193 dòng, không trùng) và đối chiếu với mọi
  khai báo `ep(t, 'METHOD', '/path', …)` trong spec contract: **thiếu 0, ngoài bảng 0**.
- Mỗi lời gọi chạy trên app Nest thật (DB `opchub_test`, Redis db 2), response 2xx parse bằng **đúng zod schema FE**
  (`apps/{portal,admin}/src/features/*/api.ts`); endpoint FE chưa gọi dùng schema server truyền vào `respond(...)`.
- Không mock Prisma; dữ liệu bằng factory, dọn ở `afterAll`; trạng thái toàn cục (cài đặt, SMTP, ma trận quyền, bot)
  được ghi lại đúng giá trị đã đọc hoặc khôi phục.

## Thay đổi server (lỗ hổng hợp đồng)

Đối chiếu bảng với route thật lộ 7 endpoint chưa có + 1 tên tham số lệch (Q-B61-1, Q-B61-2):

| Endpoint | Cách làm |
|---|---|
| `GET /admin/bot/log` | `BotLogService` — deferred join theo idx `(created_at DESC, id)` |
| `GET /admin/groups/requests` | `JoinRequestService.listAll` (`c.room`, chỉ xem; duyệt vẫn là chủ nhóm D-43) |
| `POST /admin/groups/:id/members/export` | Bọc job xuất B43 cho một nhóm, thân tuỳ chọn |
| `GET /admin/reports/:id/action` | Chi tiết một ca (`c.mod`) |
| `PATCH /admin/service-requests/:code` | `ServiceRequestPatchService`: transition có điều kiện từ trạng thái hiện tại + giao việc |
| `GET\|PUT /uploads/:key` | `STORAGE_PROVIDER=local` (dev/e2e, cấm production): `LocalStorageProvider` + URL ký HMAC |
| `/groups/:id/requests/:uid/:decision` | Bảng đổi thành `:userId` (đường thật không đổi) |

## File

- `apps/server/test/contract/`: `contract-table.ts`, `harness.ts`, `coverage.int.spec.ts`, 18 spec theo module
  (lớn nhất 235 dòng), `account.helpers.ts`, `lane-b.helpers.ts`.
- `packages/integrations/src/storage/local.provider.ts` (+ spec), server: `bot/services/bot-log.service.ts`,
  `service/services/service-request-patch.service.ts`, `uploads/local-uploads.controller.ts`, env `STORAGE_PROVIDER`,
  `LOCAL_STORAGE_DIR`.

## Commit

`5c7b7e7` (lỗ hổng + harness + event) · `d4c9270` (account/audit/notification/reporting/export) ·
`46a5d93` (community/investor/project) · `de98535` (membership-fee/marketing/service-request/settings) ·
`435cca4` (bot/chat/moderation/storage/mail).

## Câu hỏi đã ghi

Q-B61-1, Q-B61-2, Q-B61-A1…A3, Q-B61-B1…B3, Q-B61-C1…C2, Q-B61-D1…D3 trong `reports/ui-parity/questions.md`.
