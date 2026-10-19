# TIP-V2-115: Chuẩn test theo D-63 + gỡ nhánh `onServer` + lint bộ audit + `pnpm audit:regression` (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. D-63 · TD-032 → TD-035. Không đổi schema, không migration, không
> sửa server (chỉ `packages/db/seed/demo/reset.ts`). V2Q mới: V2Q-111.
> Commit: `60f9b76` (lint/typecheck audit, env audit trong zod, script `audit` + `audit:regression`), `5a6ce63`
> (MSW nhắc phí hàng loạt bỏ TK khoá), `90cad6c` (Marketing), `f9f6f5b` (Thành viên), `af87a9e` (Dịch vụ),
> `19511d9` (unit test MSW phí), `cf6d7d0` (Cài đặt · nhật ký), `1aae875` (testing.md), `5ce8292` (TEST-GAPS §4)
> + commit báo cáo này.

## Đã làm
- **Lint/typecheck audit (TECH-DEBT ghi chú audit)**: `e2e/audit` + `e2e/server` vào `lint` của `@opchub/e2e`;
  `AUDIT_DB_URL`, `AUDIT_PSQL`, `AUDIT_OTP`, `WALK_IDS` vào zod `e2e/env.ts`; script `audit` (server + e2e) và
  `audit:regression` ở gốc, ngoài gate CI/lefthook (`60f9b76`).
- **Gỡ nhánh `onServer` làm yếu assertion (TD-033)** — sửa MSW theo server, assertion một giá trị:
  - #1 `admin-settings`: bỏ `if (!onServer) expect(dòng seed)`; test mới `D-63 TD-033 nhật ký hiện thao tác vừa làm
    (tắt SSO DeepSeek)` kiểm dòng của thao tác trong chính test. MSW ghi tên nhà cung cấp như `SSO_LABEL` của
    server (trước ghi id `deepseek`).
  - #2, #3 `admin-marketing`: MSW `estimateRecipients` đếm như `AudienceRepository.estimate` (TK active theo loại,
    trừ đã huỷ nhận), bỏ `SCALE 480`; assert `Ước tính 11 người nhận` và `7 người nhận` cả hai chế độ.
    `seed:demo` reset xoá thêm `mail_suppressions` (V2Q-111).
  - #4 `admin-fees`: `5a6ce63` + unit test MSW `19511d9`.
  - #5 `admin-members`: MSW xếp `createdAt DESC, id DESC` như server; trang 2 = Ngô Thành Đạt + Trần Quốc Bảo.
  - #6 `admin-requests`: MSW `GET /admin/service-requests/staff` = TK quản trị active có `n.edit` theo ma trận quyền
    hiện hành (`serviceStaff()`); `STAFF`/`MENTION` một giá trị.
- **`testing.md`** viết lại theo D-63: 6 luật (truy vết mã, test âm server gồm 413, consumer outbox + job `now`, link
  mail qua FakeMail, e2e hai chế độ cùng assertion, audit hồi quy), sửa vị trí e2e; README standards 1 dòng.
- **TEST-GAPS §4.1**: từng mục đánh ĐÃ XỬ LÝ / HỢP LỆ (dựng dữ liệu) kèm lý do.
- Link trong mail (TD-035): đã có ở TIP-V2-105 (`FAKE_MAIL_DIR` + `e2e/server/mailbox.ts`, dùng trong
  `auth-flows.spec.ts`); không tạo `dev-mail.controller.ts`.

## Kết quả kiểm (19/10/2026)
- `pnpm lint` 8/8 task · `pnpm typecheck` 8/8 · `pnpm depcheck` 0 vi phạm (574 module).
- `pnpm test`: shared 85, server 92, portal 113, admin 141, ui 35, integrations 25 (+2 skip) — 0 fail.
- e2e server (stack sẵn 4000/4001/3220/3222): admin-marketing 6/6, admin-members 9/9, admin-requests 6/6,
  admin-settings 9/9. `unsubscribe.spec` 2 fail vì máy chạy thiếu `UNSUBSCRIBE_SECRET` trong env e2e (không do TIP).
- e2e MSW (`.next-115`, cổng 3390/3391): 5 spec đã sửa + admin-fees 36/36; cả bộ behavior 152 pass / 1 fail —
  `events.spec.ts:38` (Back khôi phục ô tìm) chập chờn, chạy lặp 3/4 pass, spec không bị TIP đụng.

## Chưa làm (chuyển TIP sau)
- TIP mục 2 #7–#11: MSW chặn `/dashboard/live`, `/me/projects` khi chưa đóng phí (402) + `payFee` cả hai chế độ;
  MSW 409 chủ nhóm tự rời (D-43) + `setGroupOwner` cả hai; MSW đếm phiên thật; `simulateTransfer` cho MSW;
  `closeRegistration()` cho MSW. Các nhánh này hiện chỉ dựng dữ liệu (không nới assertion) nên đạt luật 5 của
  testing.md, nhưng MSW còn lệch hành vi server.
- Chưa chạy toàn bộ `e2e:server` và `pnpm audit:regression` (agent chính chạy).

## Cách verify
```
grep -nE "onServer \?|if \(!?onServer\)" e2e/behavior   # chỉ còn if (onServer) dựng dữ liệu
pnpm --filter @opchub/shared exec vitest run src/mock-data
cd e2e && pnpm exec playwright test -c playwright.server.config.ts --project=behavior \
  behavior/admin-marketing.spec.ts behavior/admin-members.spec.ts behavior/admin-requests.spec.ts \
  behavior/admin-settings.spec.ts
```
