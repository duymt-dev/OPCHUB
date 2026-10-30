# TIP-V46-801: GĐ Vùng — bổ nhiệm, thu hồi và miễn phí thành viên

## HEADER
- TIP-ID: TIP-V46-801
- Project: OPCHUB
- Module: affiliate (regional directors), membership-fee, account directory, mail, Admin
- Priority: P0
- Depends on: dev `de526c60` (PR #73/#74 đã tích hợp); không phụ thuộc TIP triển khai khác
- REQ / D: REQ-616; D-118, D-120, D-121; BR-462, BR-464; AT-GDV01–07
- Branch: `feature/TIP-V46-801-regional-directors`
- **Files touched** (đường dẫn tương đối repo; create trừ khi ghi modify):
  - Contract: `packages/shared/src/api-domains/regional-directors.ts`, `regional-directors.spec.ts`; `packages/shared/src/api-domains/index.ts` (modify).
  - Phí chung: `packages/shared/src/enums.ts`, `packages/shared/src/membership/fee-access.ts`, `fee-access.spec.ts` (modify).
  - Các điểm tiêu thụ quyền phí: `membership-fee/domain/fee-access-query.ts` và test; project `repositories/{project.repository,project-feed.query}.ts`, local-business `repositories/store-explore.repository.ts`, onboarding `repositories/onboarding.repository.ts` (modify; giữ SQL/Prisma nhất quán với cổng shared).
  - DB: `packages/db/prisma/schema/regional-director.prisma`; `packages/db/prisma/schema/membership-fee.prisma`, `account.prisma` (modify); migration riêng `packages/db/prisma/migrations/<timestamp>_regional_directors/{migration,down}.sql`.
  - Seed: `packages/db/seed/regional-directors.ts`; `packages/db/seed/{required,catalog,seed-v4-full}.ts`, `packages/db/seed/demo/{index,reset}.ts` (modify khi nối seed).
  - Demo seed v4.6: `packages/shared/src/fixtures/regional-directors.ts`, `packages/shared/src/mock-data/domains/regional-directors/{storage,seed.spec,empty.fixture}.ts`, `packages/db/seed/demo/regional-directors.ts`, `packages/db/test/seed-directors.int.spec.ts` (create). `fixtures/index.ts`, `domains/{store,affiliate}.ts`, `regional-directors/state.ts` (modify: mặc định có m3/m9/m10, giữ mã affiliate từ snapshot phí cũ). `seed/demo/{index,reset}.ts`, `seed/seed-v4-full.ts` (modify: seed/reset có snapshot, không mail/audit). Các test đếm dữ liệu seed và precondition ô trống tại shared/Admin/Portal/native được cập nhật đúng dữ liệu mới, không nới assertion; e2e count regressions cập nhật khi chạy gate E2E. Không sửa JSON prototype gốc hoặc docs/spec.
  - Seed regression fee classification: `packages/shared/src/mock-data/domains/admin-members.ts`, `apps/server/src/modules/account/repositories/admin-member-filter.sql.ts` (modify: dùng exemption chung, không xếp GĐ Vùng vào Chưa đóng phí; test hiện hữu và seed integration kiểm chính xác). Đây là phần D-120/P9, không đổi hợp đồng lọc.
  - Seed identity consistency: `packages/shared/src/mock-data/index.ts` (modify: login lấy trạng thái/hạn phí hiện hành, không hardcode active); `packages/db/seed/demo/affiliate.ts` (modify: D-94 3A, mọi TV có affiliate, mã cũ ổn định và cùng MSW; không thay commission/ledger của #802/803).
  - Quyền: `packages/shared/src/permissions.ts` và test quyền tương ứng (modify); migration cấp quyền mặc định cho Quản trị viên.
  - Seed permission regression: `packages/db/test/seed-demo.int.spec.ts` (modify: tổng grant 54 và kiểm chính xác chỉ role admin có dòng affiliate.gdv; Super Admin vẫn implicit).
  - Domain affiliate: `apps/server/src/modules/affiliate/domain/regional-director.state.ts` và `.spec.ts`; `repositories/regional-director.repository.ts`; `services/regional-director.service.ts`; `controllers/admin-regional-directors.controller.ts`; `affiliate-core.module.ts`, `index.ts` (modify).
  - Đọc cấu hình: `apps/server/src/modules/affiliate/services/regional-director-read.service.ts`.
  - Query/evidence: `apps/server/src/modules/affiliate/repositories/regional-director-history.query.ts`, `apps/server/test/affiliate/regional-director-query.int.spec.ts`.
  - Planner metrics: `apps/server/test/affiliate/director-plan-evidence.ts` (create; parse full EXPLAIN ANALYZE/BUFFERS metrics and report actual rows/loops/buffers/timing, never planner overrides); existing query integration uses it for page/count/history.
  - Broad/count planner slice: `community/repositories/province-directory.query.ts`, `affiliate/repositories/regional-director-count.query.ts`, `apps/server/test/affiliate/regional-director-count-query.int.spec.ts` (create), `community/services/province-directory.service.ts`, `affiliate/repositories/regional-director.repository.ts`, `account/repositories/director-member.query.ts` (modify as measurement requires). Preserve earliest current province membership, deduplicate users, ignore industry/deleted/left groups; no cross-domain table access from affiliate. New covering/partial index migrations only if real plans demonstrate a need, with down.sql and dev/test deployment; no old migration edits or planner overrides.
  - Confirmed count scan correction: `packages/db/prisma/migrations/20261030100000_director_count_indexes/{migration,down}.sql` (create), schema `{account,affiliate,community}.prisma` (comments only). The 10k fixture exposed Seq Scans on users/affiliates and 40k group_members before this change; equality-leading partial covering indexes and per-user LATERAL seek address those observed plans. Empty search skips redundant unaccent wildcard; candidate semantics unchanged.
  - Compact count correction: `packages/db/prisma/migrations/20261030101000_director_compact_count/{migration,down}.sql` (create; do not edit the already deployed count-index migration). Empty candidate count uses compact status aggregate minus eligible incumbent point-lookups within one SQL snapshot; duplicate/locked/deleted/nonexistent exclusions cannot be subtracted twice. Active affiliate identities have deterministic user-ID ordering on their covering partial index. Benchmarks disclose test-only normal VACUUM/ANALYZE and never set planner flags.
  - Cổng account: `apps/server/src/modules/account/services/member-directory.service.ts` (modify: chọn/khóa thành viên hợp lệ, không đọc users từ affiliate).
  - Directory: `account/repositories/director-member.query.ts`, `admin-account/services/admin-directory.service.ts`, `community/services/province-directory.service.ts`; các module/index của admin-account/community (modify, public API không tạo vòng phụ thuộc).
  - Phí: `apps/server/src/modules/membership-fee/domain/regional-director-fee.ts` và `.spec.ts`; `services/regional-director-fee.service.ts`; `repositories/regional-director-fee.repository.ts`; `domain/membership-fee.state.ts`, `repositories/membership-fee.repository.ts`, `services/admin-fees.service.ts`, `membership-fee-core.module.ts`, `index.ts` (modify).
  - Mail: `apps/server/src/modules/mail/templates-regional-director.ts` và `.spec.ts`; `mail/index.ts`, `mail-priority.ts`, `mail.repository.ts`, `packages/db/prisma/schema/mail.prisma` (modify khi thêm kind); shared marketing schema/mock + mail history presentation (modify nếu kind đóng).
  - Cache/replay: `apps/server/src/modules/membership-fee/services/fee-events.handler.ts` (modify: đọc snapshot hiện hành khi xử lý event để replay bổ nhiệm không cấp lại miễn phí sau thu hồi).
  - Nhãn enum: `apps/admin/messages/vi/{fees,marketing}.json` (chỉ thêm khóa, giữ `.wire-lock`); `packages/shared/src/mock-data/domains/{fees-admin,ops-admin}.ts` (modify để không thu/nhắc phí người miễn).
  - Admin feature: `apps/admin/src/features/affiliate/components/regional-director-{config,card,appointment,history}.tsx`, `regional-director.module.css`; `hooks/use-regional-directors.ts`; `regional-directors-api.ts`; `model.ts`, `types.ts`, `components/{affiliate-tabs,affiliate-content,affiliate-screen}.tsx`, `hooks/{use-affiliate-tab-visibility,use-affiliate-queries}.ts`, `apps/admin/messages/vi/affiliate.json` (modify).
  - Admin extracted controls: `components/regional-director-bank.tsx`, `hooks/use-director-members.ts`, `hooks/use-regional-directors.spec.tsx`, `components/regional-director-config.spec.tsx` (create); `hooks/use-affiliate-access.ts` (modify: permission affiliate.gdv tại mutation boundary). Input ngân hàng giữ nháp AntD Form và chỉ gửi đủ bộ hợp lệ khi Lưu; nút Lưu chỉ xuất hiện lúc có nháp sửa, không lưu từng ký tự sai hợp đồng.
  - Frontend-only test fixtures: `apps/admin/src/features/affiliate/tests/regional-directors.ts` (create; không sửa fixtures shared/native khi full integration đang chạy).
  - URL/query wiring regression: `apps/admin/src/features/affiliate/model.spec.ts`, `hooks/use-affiliate-queries.spec.tsx` (modify: deep link gcfg, không tải list/policy không dùng).
  - Function-size extraction: `components/regional-director-{card-header,assignment,member-select}.tsx`, `hooks/use-director-{bank-form,appointment}.ts` (create; mỗi component/hook dưới max-lines-per-function 80, không tắt lint).
  - Fee presentation: `apps/admin/src/features/fees/model.ts` và các test/nhãn phí liên quan (modify); Portal membership status presentation và test tương ứng (modify).
  - P9/P16/P17 completion slice: `packages/shared/src/api-domains/fees-admin.ts`, `packages/shared/src/mock-data/domains/fees-admin.ts`, `apps/server/src/modules/membership-fee/services/admin-fees.service.ts` (modify: additive exemption count, no new query); `apps/admin/src/features/fees/{types,model}.ts`, `components/{fee-toolbar.tsx,fee-table.module.css}`, `hooks/use-fee-actions.ts`, `apps/admin/messages/vi/fees.json` (modify). Tests `apps/admin/src/features/fees/{director-fee-api.spec.ts,components/director-fee-tab.spec.tsx,hooks/use-fee-actions.spec.tsx}`, `packages/shared/src/mock-data/domains/fees-director-summary.spec.ts`, `apps/server/test/membership-fee/director-fee-summary.int.spec.ts` (create). `features/marketing/components/director-mail-templates.{tsx,module.css,spec.tsx}` (create), `auto-panel.tsx`, `messages/vi/marketing.json` (modify: readonly system catalogue matching prototype, not editable marketing templates). `features/settings/components/role-matrix.spec.tsx` (create), `role-matrix.tsx` (modify: readonly click must not toggle). No permission-name checks, no SMTP call, no baseline change; browser/parity gate remains separate.
  - Portal exemption presentation: `apps/portal/src/features/membership/components/plan-badge.tsx`, `apps/portal/src/features/profile/{hooks/use-billing.ts,components/billing-tab.tsx}`, `apps/portal/messages/vi/{membership,profile}.json` (modify); `plan-badge.spec.tsx`, `billing-tab.spec.tsx` cạnh component (create).
  - D-65 translation parity: thêm cùng hai khóa exemption vào `apps/portal/messages/{en,fil,id,km,lo,ms,my,th,zh}/{membership,profile}.json` (modify; không bỏ assertion kiểm đủ bản dịch).
  - Portal payment exemption: `apps/portal/src/features/membership/components/{plan-panel,plan-cards}.tsx`, `hooks/{use-membership,use-paywall}.ts` (modify); `components/plan-cards.spec.tsx`, `hooks/{use-paywall,use-transfer-confirm}.spec.tsx` (create). Không ẩn bảng giá hoặc miễn phí Gọi vốn.
  - Direct transfer-confirm: `apps/server/src/modules/membership-fee/services/membership-fee.service.ts`, `apps/server/test/membership-fee/membership.int.spec.ts`, `packages/shared/src/mock-data/domains/ops-admin.ts`, `apps/portal/src/mocks/membership-handlers.spec.ts` (modify: từ chối GĐ Vùng trước consent/webhook).
  - MSW: `packages/shared/src/mock-data/domains/regional-directors.ts` và `.spec.ts`; mock domain public index + reset (modify); `apps/admin/src/mocks/handlers/regional-directors.ts`, handler index (modify).
  - MSW persistence foundation: `packages/shared/src/mock-data/domains/regional-directors/{schema,state}.ts`, `affiliate-persistence/regional-directors.spec.ts` (create); `affiliate-persistence/{schema,snapshot}.ts` (modify). Snapshot giữ hạn/trạng thái phí trước bổ nhiệm, ba ô, lịch sử và hàng đợi mail; dữ liệu cũ không có sidecar chỉ được nạp nếu không chứa phí miễn GĐ Vùng. Restore không chạy lại command/mail/audit.
  - MSW lifecycle: `packages/shared/src/mock-data/domains/regional-directors/{index,read,write,effects,fee,access}.ts`, `{write,read}.spec.ts` (create); `domains/{index,settings-log,marketing}.ts` (modify: public facade, tên actor thật, fake mail log). `apps/admin/src/mocks/handlers/regional-directors.ts`, `apps/admin/src/mocks/regional-director-handlers.spec.ts` (create); handler index (modify). Dùng lại `admin-json.ts` cho giới hạn UTF-8 768 KiB và zod, không thêm parser trùng. Không seed incumbent tự động ở checkpoint lifecycle; seed demo là bước tiếp, vẫn cùng TIP.
  - Integration: `apps/server/test/affiliate/regional-directors.int.spec.ts`, `regional-director-fee.int.spec.ts`, `regional-director-mail.int.spec.ts`; query evidence helper khi đo 10k.
  - Native mail verification slice: `apps/server/test/affiliate/regional-director-mail.int.spec.ts` (create: HTTP/service transaction → outbox relay → real Redis/BullMQ worker → FakeMailProvider; replay does not duplicate, rollback does not send; retained versus expired prior fee copy). No SMTP/provider change. Browser link proof remains a separate E2E requirement.
  - UI test: `e2e/behavior/regional-directors.spec.ts`; parity cases P6/P9/P16/P17 trong `e2e/parity/` (modify đúng màn liên quan); test component/hook đặt cạnh file riêng.
  - Seed regression reconciliation: `e2e/behavior/{admin-fees,admin-members,admin-members-filters,admin-groups,admin-marketing,affiliate-ui-debt-agents}.spec.ts` and `apps/server/test/membership-fee/{admin-fees,admin-fees-v42}.int.spec.ts` (modify only after full-run terminal failures: exact native-supported cohort totals, seven fee tabs, all-status sum including exemption; preserve action, geometry, CSV, price-delta and two-mode assertions). No production/fixture changes, skipped cases or relaxed deadlines.
  - Browser lifecycle slice: `e2e/behavior/regional-directors.spec.ts` (create; three slots/default incumbent, confirmation/revoke/appointment/search/versioned writes/history/reload, fee filter and mail login links, same assertions in both modes). Server mailbox read is a setup helper; no native-only assertion bypass.
  - Visual verification slice: `features/settings/components/role-matrix-permissions.ts` and `.spec.ts` (create; presentation-only GDV row position, preserve every permission); `role-matrix.tsx` and `features/fees/components/fee-table.module.css` (modify: mobile action-row height retained without restoring forbidden exempt actions). `e2e/parity/scenarios/admin-regional-directors.ts` (create), `scenarios/admin.ts` (wire), screens/results/evidence (docs). Existing D-18/P9 and D-69/P17 run unmasked at 1440/390; new P6 case navigates actual UI. Do not rewrite original fee history or prototype baseline to match pixels.
  - Tài liệu: `coding-packs/standards/global/domain-glossary.md`, `coding-packs/reports/ui-parity/questions.md`, `coding-packs/audit/W1/TEST-GAPS.md` (modify); `coding-packs/reports/V4.6-progress.md`, `TIP-V46-801-completion.md`.
  - Discovery/onboarding verification: `apps/server/test/affiliate/regional-director-access.int.spec.ts` (create). Real HTTP appointment/revocation, stale original fee deadline, project SQL feed + Prisma detail/related, store discovery/detail/favorite/facets, personal/business onboarding SQL snapshot. Check disappearance/relock after revocation with unchanged original term, no fundraising exemption. Test-only fixtures; no new public contract, production query, fake Prisma or native HOLD mutation.
  - Portal browser verification: `e2e/behavior/regional-director-portal.spec.ts` (create). Same seeded director in MSW/native, sidebar exemption without countdown/renewal, billing history retained, all pricing cards preserved, paid fundraising control enabled, direct membership-pay URL redirected away from transfer details. No mode-specific assertions or native fixture shortcuts.
  - Portal visual verification: `e2e/parity/scenarios/portal-regional-director.ts` (create), `scenarios/portal.ts` (wire); full-page director sidebar (mobile drawer included), profile billing and pricing. Same real Bảo login/navigation in prototype/app, no injected prototype state, masks, baseline edits or weakened threshold. Record actual failures against known Q-V46-801-7 instead of reintroducing forbidden fees to force a visual PASS; screens/results/questions/report are evidence only.
  - P16 browser verification: `e2e/behavior/regional-director-mail-catalogue.spec.ts` (create): actual Admin Marketing auto tab exposes exactly two readonly system templates before/after reload, no campaign-edit controls in their catalogue. Same assertions MSW/native; not a substitute for still-unverified prototype parity/reachability.
  - P6 layout correction: `apps/admin/src/features/affiliate/components/regional-director-assignment.tsx` and `regional-director.module.css` (modify: assignment/province groups, mobile statistic stack, single-line identity, measured spacing). `affiliate-tabs.tsx` (modify) and `affiliate-tabs.module.css` (create): mobile net summary uses the prototype's two-line label/value layout. Preserve disabled incumbent/region selects, province actions and complete valid bank drafts; no data or prototype edits. Verify existing config/hook tests, Affiliate overview parity and MSW/native lifecycle after rebuilding affected frontend.
- **Parallel-safe with:** none; một agent code TIP này. Subagent chỉ đọc/tìm/đo. Không bắt đầu V46-802 trước khi qua cổng TIP này.

## CONTEXT
- `SPEC-V4.6-DELTA.md`: P6 (chỉ cấu hình GĐ Vùng), P9 (phí miễn), P16 (mail), P17 (permission).
- `docs/spec/dac-ta.html`: §31.4, §32.1–32.6 (QT-32, GDV-R01–08), §33.1 BR-462/464.
- Prototype `docs/spec/index.html:4390–4434`: cấu hình; `5985–5994`: tương tác; `6554–6557`: phí/thông báo.
- Hiện tại chưa có bảng GĐ Vùng. AffiliateCoreModule đã phụ thuộc MembershipFeeCoreModule và AccountCoreModule; giữ đồ thị một chiều này.
- `membership-fee/domain/membership-fee.state.ts` chứa transition; `fee-access.ts` là cổng usable duy nhất.
- `MailService.request(tx, ...)` đã ghi mail_logs + mail.requested trong cùng transaction; tái dùng, không gửi trực tiếp.

## APPLICABLE STANDARDS
- `global/{code-structure,git-workflow,domain-glossary,tooling}.md`.
- `backend/{api-conventions,auth-rbac,nestjs-modules,queues-workers}.md`.
- `database/{prisma-migrations,query-indexing}.md`.
- `frontend/{nextjs-structure,routing-auth,data-state,antd-ui,ui-parity}.md`.
- `integrations/adapters.md`, `security/security.md`, `testing/testing.md`.
- Goal hiệu lực: `coding-packs/plans/GOAL-V4.6.md`; đọc lại mỗi lần tiếp tục.

## TASK
Xây trọn cấu hình GĐ Vùng Admin, dữ liệu bền vững, miễn phí khi đương nhiệm và khôi phục hạn phí cũ khi thu hồi. Giữ hợp đồng cũ tương thích. Không làm sổ chia sẻ/chi trả hay tab Portal ở bước này.

## SPECIFICATIONS
1. D-120: ba ô cố định `north`, `central`, `south`; nhãn Bắc / Trung & Tây Nguyên / Nam. Không xóa ô. Tối đa một người đương nhiệm/ô, một ô/người. Thu hồi để trống.
2. Chỉ chọn thành viên đăng ký, chưa xóa, không khóa. Kiểm lại và khóa dòng account trong transaction để input cũ không vượt kiểm tra. Không tạo tài khoản/mật khẩu mới.
3. Tỉnh phụ trách phải hợp lệ trong 34 tỉnh. Mỗi tỉnh tối đa một vùng, DB unique bảo vệ cả cạnh tranh. Thay đổi tỉnh/tài khoản nhận cũng cần quyền ghi + audit.
4. Hợp đồng mới dưới `/admin/gdv`: đọc cấu hình, tìm thành viên, bổ nhiệm (`POST`), sửa (`PATCH /:region`), thu hồi (`DELETE /:region`). Không thêm thao tác đổi tay vùng affiliate (D-121).
5. Permission mới `affiliate.gdv`: mặc định Super Admin và Quản trị viên có. `affiliate.view` đọc; thiếu quyền ghi → 403 kể cả direct request. Không kiểm tên vai trò trong service/controller.
6. Bổ nhiệm lưu snapshot trạng thái + hạn phí cũ; đổi phí sang `regional_director`, hiển thị "Miễn phí · GĐ Vùng". Usable không phụ thuộc hạn cũ. Không paywall/nhắc phí, không bị scheduler hết hạn. Không tính thành phí thực thu. Không miễn Gói Gọi vốn.
7. BR-462/D-120: thu hồi giữ nguyên hạn, không cộng bù thời gian đương nhiệm. Trial còn hạn → trial; phí thực thu còn hạn → active/expiring theo hạn; không còn hạn → pending_payment. Ranh giới `validUntil === now` là hết hạn. Không kích hoạt trial mới.
8. Mọi chuyển phí qua domain transition, update theo nguồn + version; bổ nhiệm/thu hồi/sửa cấu hình/lịch sử/audit/mail/outbox cùng transaction. Cạnh tranh không tạo hai bổ nhiệm, không có mail/audit của thao tác rollback.
9. Outbox `membership_fee.changed` cập nhật Redis và socket bằng consumer có sẵn. `mail.requested` có sẵn xử lý email idempotent. Không thêm broker/call ngoài trong transaction.
10. EM-GDV1 có vùng/tỉnh/miễn phí/link đăng nhập/hướng dẫn; EM-GDV2 có thời điểm thu hồi, hạn phí thực tế hoặc cần thanh toán, khoản ghi nhận trước vẫn được chi. Không mật khẩu/secret. Lịch sử tự động có nhãn hai loại mail (BR-464).
11. UI theo prototype: nút bổ nhiệm, ba ô giải thích, banner chỉ xem/tỉnh chưa gán, ba thẻ, chọn thành viên/vùng/tỉnh, ngân hàng/số TK/chủ TK, lịch sử. Disable controls ghi khi chỉ xem; không copy lỗi prototype xóa ô.
12. Seed/MSW cùng mô hình, gồm ba người demo như delta. Không sửa baseline hoặc ngưỡng parity.

## ACCEPTANCE CRITERIA
- Given thành viên ở trial/active/expiring/expired/pending_payment When bổ nhiệm Then miễn phí, usable ngay, giữ snapshot (int `REQ-616 AT-GDV01 appointment fee transitions`).
- Given cùng vùng/cùng người đã có bổ nhiệm When bổ nhiệm nữa Then 409, không thêm mail/audit (int `AT-GDV05 uniqueness and concurrent appointments`).
- Given thành viên khóa hoặc vừa khóa sau khi chọn When POST Then từ chối; tìm kiếm không trả người khóa (int `AT-GDV06 locked member`).
- Given Kế toán có affiliate.view nhưng không affiliate.gdv When đọc Then 200; When POST/PATCH/DELETE Then 403 (int `AT-GDV03 view only`).
- Given tỉnh ở vùng khác When PATCH Then 409 và giữ dữ liệu (int `REQ-616 province unique`).
- Given hạn trial/phí cũ còn When thu hồi Then giữ hạn và phục hồi usable; Given hết/đúng hạn/null Then pending_payment (unit + int `BR-462 TC-462 restore original expiry`).
- Given GĐ Vùng có hạn snapshot quá khứ When sweep/remind/paywall Then không hết miễn phí, không mail nhắc, vẫn truy cập (int `REQ-616 exemption survives scheduler`).
- Given GĐ Vùng mở bảng giá hoặc direct `/membership/pay` When render/click Then gói hiện hành bị vô hiệu với nhãn miễn phí, Gọi vốn vẫn thu riêng; bổ nhiệm trong lúc chờ CK không tạo toast đã nhận tiền hoặc ghi đè phiên. Direct transfer-confirm → 409 không consent/webhook (component/hook + MSW + native int).
- Given bổ nhiệm/thu hồi thành công When relay mail lại Then mỗi hành động chỉ một thư, không mật khẩu; mail có link thật (int `BR-464 EM-GDV1 EM-GDV2`, e2e mailbox).
- Given thao tác Admin thành công When xem lịch sử/audit Then thấy giờ, hành động, thành viên, vùng, người/vai trò thao tác (int `AT-GDV07 history audit`).
- Given input sai/id lạ/body quá cỡ When gọi mỗi endpoint ghi Then lần lượt 400 fields/404/413; sai trạng thái → 409 (int `REQ-616 negative contract`).
- Given Admin UI MSW/server When thao tác cùng kịch bản Then cùng assertion trong `e2e/behavior/regional-directors.spec.ts`.
- Given các màn P6/P9/P16/P17 tại 1440/390 When đo Then mỗi màn ≤3%; có số thật trong report.
- Given query tìm người/lịch sử trên 10k dòng When EXPLAIN ANALYZE BUFFERS Then dùng index, không Seq Scan bảng lớn.

## CONSTRAINTS
- DO NOT: tự merge; thay GOAL; đổi stack; kiểm role thay permission; Prisma ngoài domain; query trong vòng lặp; gọi provider thật; sửa `.env`; dừng HOLD không do phiên tạo.
- SKIP: sổ chia sẻ/kỳ chi/phần tiền lịch sử (#802); chuyển mô hình hoa hồng (#803); tab Vùng của tôi/banner Portal (#804); cấu hình nhắc phí (#805). Chỉ thêm loại trừ GĐ Vùng vào nhắc hiện hữu.
- Nếu phát hiện mơ hồ: ghi Q-V46-801-n vào questions.md, chọn an toàn theo D mới nhất; không hỏi giữa chừng trừ L3.

## BUILDER-CHECKLIST
- [ ] Contract/schema/type suy zod; giới hạn dòng; module boundaries; glossary
- [ ] Migration create-only rồi bổ sung SQL constraints/covering indexes/down.sql; deploy dev + test
- [ ] AT-GDV01/02/03/05/06/07 + BR-462/464; AT-GDV04 được giữ cấu trúc lịch sử và kiểm đủ trong #802
- [ ] Unit + integration Postgres/Redis thật; không mock Prisma
- [ ] lint, typecheck, test, test:int, depcheck, build; output thật
- [ ] E2E MSW không tụt số test; e2e server cùng assertion
- [ ] Parity P6/P9/P16/P17 1440/390 ≤3%; EXPLAIN 10k
- [ ] Seed demo khôi phục; giữ native HOLD
- [ ] Commit đường dẫn cụ thể, push, PR vào dev (không merge)
- [ ] Completion report + V4.6-progress có số thật; working tree sạch
