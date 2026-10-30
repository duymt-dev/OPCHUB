# V46-801 — backend checkpoint — PARTIAL

Không phải completion của TIP. Chưa có UI cấu hình, MSW mới, parity hoặc nghiệm thu trình duyệt.

Source checkpoint: `a61a71ac` trên `feature/TIP-V46-801-regional-directors`; [compare vào dev](https://github.com/duymt-dev/OPCHUB/compare/dev...feature/TIP-V46-801-regional-directors). Không tự merge. `gh` chưa đăng nhập nên chưa mở được PR; không dò token.

## Đã triển khai

- Hai migration bổ sung: ba ô vùng cố định, incumbent unique, tỉnh unique, lịch sử, snapshot hạn phí cũ, enum phí/mail, quyền mặc định và index tìm người/lịch sử.
- API `GET /admin/gdv`, `/members`, `/history`; `POST /admin/gdv`; `PATCH/DELETE /admin/gdv/:region`.
- Transaction bổ nhiệm/thu hồi/cấu hình gồm domain transition phí, version/status conditional update, audit, lịch sử và mail/outbox. Khóa account để kiểm trạng thái thực tại thời điểm ghi.
- Miễn phí `regional_director` không phụ thuộc hạn cũ; không phải khoản đã trả. Scheduler không làm hết miễn phí; nhắc tay/tự động bỏ qua; thu phí khi đương nhiệm bị chặn.
- Biểu thức usable tập trung cho Prisma/SQL được nối vào khám phá gian hàng/dự án và onboarding.
- Consumer phí đọc snapshot DB hiện hành: replay bổ nhiệm sau thu hồi không khôi phục nhầm quyền miễn phí.
- EM-GDV1/2 dùng renderer có escape, thời gian VN, link đăng nhập cấu hình; không mật khẩu. Nhãn mail/fee mới đã thêm vào Admin.
- Seed bắt buộc khởi tạo tỉnh khi cấu hình chưa chỉnh; reset demo giữ ba ô cố định trước khi xóa người demo. **Chưa seed ba GĐ Vùng demo**, chưa viết MSW tương ứng.

## Kiểm thử đã quan sát

Root checkpoint: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck` đều exit 0; `pnpm --filter @opchub/server build` exit 0. Unit: shared 619 + server 248 + Admin 548 + Portal 392 + UI 56 + integrations 103 = **1966 passed**, 2 skip S3 có sẵn. Không coi server build là bằng chứng full root build. Chín cảnh báo img có sẵn, warning tsdown noExternal/bundled dependencies không bị tắt.

`pnpm --filter @opchub/server exec vitest run --project int test/affiliate/regional-directors.int.spec.ts test/affiliate/regional-director-query.int.spec.ts test/membership-fee/admin-fees.int.spec.ts test/membership-fee/fee-reminders.int.spec.ts test/membership-fee/membership.int.spec.ts`

```text
Test Files  5 passed (5)
Tests       38 passed (38)
Duration    92.89s
```

- 19 ca lifecycle/HTTP: 5 trạng thái phí nguồn, cạnh bị chặn, quyền âm, thành viên khóa, cạnh tranh, tỉnh, lịch sử actor/role thật, 400/404/409/413, scheduler/nhắc phí, replay outbox → Redis → paywall bằng token cũ, ràng buộc DB và rollback thật.
- 2 ca EXPLAIN trên 10k user + 10k history, cleanup bằng prefix/actor test riêng.
- 17 ca hồi quy phí/nhắc phí cũ. Postgres `opchub_test`, Redis db 2 thật, không mock Prisma.
- Lượt đầu gặp lỗi import/type/nhãn dịch, fixture lịch sử tương lai từ lượt trước; đã sửa mã và cô lập fixture, không nới assertion.
- Planner dùng global covering index khi vùng chiếm nửa bảng (không Seq Scan). Dataset vùng lệch dùng để kiểm equality-leading seek chọn đúng index theo vùng; assertion index vùng vẫn giữ nguyên, không đổi cost/disable Seq Scan.

## Query evidence

Lệnh thật trong test: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` với chính query factory production.

| Query | Kết quả quan sát trên 10k |
|---|---|
| Tìm thành viên / trang ID rồi JOIN | Bitmap Index Scan `users_director_search` → Bitmap Heap Scan → Sort/Limit → PK Index Scan `users_pkey` |
| Count theo cùng biểu thức tìm | Bitmap Index Scan `users_director_search` → Bitmap Heap Scan → Aggregate |
| Lịch sử vùng/keyset | Index Only Scan `regional_director_history_region_keyset` → Limit |

Không Seq Scan bảng lớn trong các ca đã đo. Chưa lưu số thời gian/buffers chi tiết vào completion cuối; query đếm affiliate theo membership còn cần đo riêng nếu đưa vào bảng query mới.

## Môi trường / migration

- `migrate dev --create-only` bị checksum drift migration cũ chặn; **không reset/resolve hoặc sửa migration cũ**. Q-V46-801-4 ghi đầy đủ fallback DDL bổ sung từ diff chỉ đọc, giữ nguyên các index ngoài TIP.
- `migrate deploy`: cả hai migration mới đã áp dụng thành công vào `opchub_dev` và `opchub_test`; Prisma generate thành công.
- `pnpm seed` tại `packages/db` thành công. Không sửa `.env`, không dừng tiến trình HOLD hay gọi provider thật.
- Có warning pg về query đồng thời trên một client trong integration; không phải failure, không đổi assertion/timeout để che.

## Còn lại trước khi báo TIP-DONE

- Commit/push checkpoint và tiếp tục cùng TIP; root lint/typecheck/unit/depcheck + server build đã pass.
- Admin cấu hình GĐ Vùng, nhãn/hiển thị miễn phí Portal, bộ lọc/stat phí, P16/P17; MSW + ba tài khoản demo tương ứng.
- Mail relay → fake provider idempotency/link browser; đầy đủ hồi quy discovery/onboarding GĐ Vùng.
- Full `test:int`, full `build`, e2e MSW + server cùng assertion, parity ≤3% tại 1440/390, evidence query đầy đủ.
- Completion report, progress/PR (không merge). `gh pr list` hiện báo chưa đăng nhập; không dò token. Dùng compare link nếu vẫn không có quyền mở PR khi chốt TIP.
