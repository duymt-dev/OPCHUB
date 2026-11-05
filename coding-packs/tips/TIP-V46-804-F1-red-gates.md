# TIP-V46-804-F1: Sửa gate đỏ nền trước TIP-805

## HEADER
- TIP-ID: TIP-V46-804-F1
- Module: E2E fixtures, Portal MSW chat, Next build isolation, Bot plan tests
- Priority: P1
- Depends on: TIP-V46-804, báo cáo điều tra `94aa35de`
- REQ / D: REQ-208, REQ-209, REQ-311, REQ-516; D-61, D-63, D-78, D-133
- Owner: yêu cầu ngày 05/11/2026 «có sửa luôn được không để sang 805».
- Files touched:
  - modify `e2e/behavior/affiliate-cross-app.spec.ts`, `affiliate-screen.spec.ts`, `reports.spec.ts`
  - modify `apps/portal/src/mocks/handlers/chat.ts`
  - create `apps/portal/src/mocks/chat-topic-routes.spec.ts`
  - modify `apps/{portal,admin}/next.config.ts`
  - create `apps/{portal,admin}/src/lib/build-config.spec.ts`
  - modify `apps/server/test/bot/persona-turn.int.spec.ts`
  - create `apps/server/test/bot/persona-plan-fixture.ts`
  - create `coding-packs/reports/TIP-V46-804-F1-completion.md`
  - modify `coding-packs/reports/TIP-V46-804-completion.md`
  - modify `coding-packs/reports/V4.6-progress.md` (chỉ dòng TIP-804)
  - modify `coding-packs/01-REQUIREMENTS-MATRIX.md`, `coding-packs/reports/ui-parity/deviations.md`, `AGENTS.md`
  - modify `e2e/behavior/portal-shell.spec.ts` (D-133 giữ cờ; UI/unit không đổi)
  - modify `e2e/behavior/new-member-chat-acceptance.spec.ts` (race lộ ở full E2E R1)
  - modify `e2e/behavior/accountant-fee-link.spec.ts` (race listener tương tự lộ ở full E2E cuối)
  - modify `apps/portal/src/features/chat/transport.ts`, `socket-transport.ts`, `hooks/use-message-actions.ts`
  - create `apps/portal/src/features/chat/hooks/hidden-message-delivery.spec.ts`, `apps/portal/src/features/chat/socket-transport.spec.ts`
- Parallel-safe with: none; serial follow-up trên nhánh 804 từ dev, PR #82 base dev.

## CONTEXT
Điều tra ở `TIP-V46-804-red-gates-investigation.md`: bốn E2E lệch clock/fixture,
Chat missing handler lọt xuống proxy; all-simulated Bot fixture không kiểm được
tính chọn lọc partial index, planner hợp lệ chọn index khác. Prototype topbar globe
và commit/UI unit flag từng mâu thuẫn; owner đã chốt giữ cờ tại D-133.
Không mở TIP-805 hoặc gộp parity trong corrective scope này.

## APPLICABLE STANDARDS
`testing/testing`, `database/query-indexing`, `global/code-structure`,
`global/git-workflow`, `frontend/ui-parity`, `backend/api-conventions`.

## TASK
Sửa precondition test và mock theo nguyên nhân đã tái hiện. Giữ assertions cũ;
thêm kiểm chứng âm, isolation và hồi quy phân bố dữ liệu.

## SPECIFICATIONS
1. REQ-311: chọn tháng fixture 2026-10 rõ ràng cho lịch sử, không đổi default app.
2. REQ-516 / D-78: chỉ suite reports ghim clock fixture; không ghim global clock.
3. REQ-209 / D-61: MSW POST tạo, DELETE phòng Portal trả 404 như backend; không
   fall through network. Build MSW không rewrite request sang API thật dù URL kế thừa.
4. REQ-208: giữ nguyên 10.242 simulated rows của plan test; thêm member noise để
   partial index có tính chọn lọc. Giữ nguyên assertions index/PK/no Seq Scan/count;
   thêm case all-simulated gốc kiểm kết quả và không Seq Scan, không ép tên index.
5. Icon: owner đã chọn giữ cờ (D-133); E2E kiểm chính xác cờ Việt Nam, giữ UI/unit.
6. Full E2E R1 lộ race E2E-05: GroupsScreen gọi reports ngay lúc mount cho badge.
   Đăng ký waitForResponse trước navigation, không sau click; giữ nguyên assertions
   hai vi phạm/khóa đúng bảy ngày và timeout, không tự fetch thay cho luồng UI.
7. Native E2E-05 phát hiện D-77/D-117: DB đã ẩn tin trước publish nhưng cache bỏ
   tin thành viên mới chưa có trong cache. Phân biệt message.new với message.updated;
   tin mới/ack thành viên ẩn chỉ chèn placeholder ở luồng thường, không ở search.
   Bot ẩn và update/replay tin ẩn chưa thấy vẫn không chèn; ack + event không trùng.
   Không đổi socket wire contract hoặc backend; thêm RED/GREEN unit và native E2E.
8. Full E2E cuối lộ listener reload phí đăng ký sau click: đăng ký trước click,
   giữ nguyên kiểm API, 12 tháng, cập nhật Portal không reload và thời hạn test.

## ACCEPTANCE CRITERIA
- Given fixture 10/2026, When browser ở tháng khác, Then lịch sử/hủy vẫn kiểm đúng
  dữ liệu tháng 10 (`affiliate-screen`, `affiliate-cross-app`).
- Given reports fixed clock, When mở/xuất B1, Then nguyên assertions tháng trước,
  CSV/BOM/17 dòng/toast PASS (`reports`).
- Given MSW request tạo/xóa topic, When gửi, Then 404 không network
  (`chat-topic-routes`, E2E Chat); native contract integration vẫn PASS.
- Given MSW + inherited API URL, When config rewrites, Then []; off giữ proxy
  (`src/lib/build-config.spec.ts` của mỗi app).
- Given >=10k simulated + >=10k member noise, When exact runtime prune query,
  Then partial index + PK update, không Seq Scan, giữ 120 tin/phòng; all-simulated
  scenario riêng vẫn giữ đúng dữ liệu (`persona-turn.int`).

## CONSTRAINTS
- DO NOT: đổi business API, schema/migration/dependency; drop index, tắt planner,
  nới timeout/assertion, bỏ skip để bịa full PASS; chạm DB/Redis native.
- DB: dùng lại hai DB riêng đã duyệt, Memurai 6381; full integration chỉ test DB.
- SKIP: parity, TIP-805, main merge, auto-merge; report rõ icon nếu chưa chốt.

## BUILDER-CHECKLIST
- [x] Kiểm targeted RED/GREEN và các assertions không bị bỏ.
- [ ] lint/typecheck/unit/test:int/depcheck/build/E2E thực chạy, ghi cache/skips/gaps.
- [x] Ghi EXPLAIN và phân biệt mixed/all-simulated, không tuyên bố mọi distribution tối ưu.
- [ ] Commit scoped paths, push PR dev, git status sạch, report Git SHA.
