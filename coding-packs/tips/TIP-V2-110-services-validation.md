# TIP-V2-110: Validate phiếu tư vấn theo đối tượng ở server (QT-11, LK-08, UAT-21)

## HEADER
- TIP-ID: TIP-V2-110 · Project: OPCHUB · Module: service · Priority: P1 · Depends on: — · Estimated: M (5h)
- **Files touched:**
  - `packages/shared/src/api-domains/services.ts` (modify: `createServiceRequestSchema` → `superRefine` theo `requesterType`; thêm hằng `SERVICE_DETAIL_LABELS`)
  - `apps/server/src/modules/service/services/service-request.service.ts` (modify: chuẩn hoá `details` theo nhãn chuẩn, không tin nhãn tự do)
  - `apps/portal/src/features/services/model.ts` (modify: `firstError` thêm `tax`, `size`, `pos`; `DETAIL_LABELS` dùng hằng shared) · `model.spec.ts` (modify) · `types.ts` (chỉ khi cần đổi `ConsultError`)
  - `apps/portal/src/features/services/components/consult-sections.tsx` (modify: đánh dấu `required` MST/Quy mô, Chức vụ)
  - `apps/portal/messages/vi/services.json` (chỉ thêm khoá `error.tax`, `error.size`, `error.pos`)
  - `packages/shared/src/mock-data/domains/ops-admin.ts` (modify `createServiceRequest`: MSW trả 400 giống server — parse lại bằng schema đã có `parseBody`)
  - Test: `apps/server/test/service/service.int.spec.ts` (modify), `e2e/behavior/services.spec.ts` (modify)
- **Parallel-safe with:** mọi TIP V2-P1 trừ TIP-V2-106 — `sequential, shares apps/portal/src/features/services/{model.ts,hooks/use-consult-form.ts,components/*} with TIP-V2-106` (BUG-022 lỗi tại ô): làm 110 trước, 106 rebase. TIP-V2-302 (P3, popup V4) làm sau.
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes`

## CONTEXT
- Đặc tả QT-11 "Quy tắc nghiệp vụ": Cá nhân: họ tên, SĐT, email, nghề nghiệp, tỉnh, nhu cầu; DN: thêm tên DN, MST, loại hình, quy mô, chức vụ. Bước 3 "Kiểm tra bắt buộc → tạo YC-xxxx = Mới". UAT-21 "Gửi form tư vấn thiếu trường bắt buộc → Bị chặn". LK-08 (REQ-408).
- Audit W1: BUG-019 (UAT-21 TRƯỢT: `POST /service-requests` DN không `organization`/`taxCode` → 201).
- Hiện server chỉ kiểm trường chung; `details` là `record<string,string>` tự do, FE gửi nhãn tiếng Việt ("Loại hình", "Quy mô nhân sự", "Chức vụ người liên hệ", "Nghề nghiệp / vai trò") — `apps/portal/src/features/services/model.ts:86-96`.
- MST đã có regex `TAX_CODE_RE` ở `packages/shared/src/api/auth.ts:8` (10 hoặc 13 số).

## APPLICABLE STANDARDS
[api-conventions](../standards/backend/api-conventions.md) (400 + `fields`) · [security](../standards/security/security.md) (không tin client) · [testing](../standards/testing/testing.md) (test âm server, D-63)

## TASK
Đưa luật bắt buộc của QT-11 về server: phiếu DN thiếu tên DN, MST, loại hình, quy mô hoặc chức vụ bị 400 có `fields`; phiếu cá nhân thiếu nghề nghiệp, tỉnh hoặc nhu cầu bị 400. FE kiểm cùng bộ luật (dùng chung hằng nhãn), MSW trả lỗi như server.

## SPECIFICATIONS
### Business Rules
1. **Nhãn chuẩn** `SERVICE_DETAIL_LABELS` trong `services.ts`: `job` "Nghề nghiệp / vai trò", `field` "Lĩnh vực hoạt động", `bizSt` "Tình trạng kinh doanh", `orgType` "Loại hình", `size` "Quy mô nhân sự", `pos` "Chức vụ người liên hệ", `web` "Website", `when` "Thời gian triển khai", `budget` "Ngân sách dự kiến" (giữ đúng chuỗi đang lưu để phiếu cũ hiển thị như cũ). FE `DETAIL_LABELS` import hằng này.
2. **Chung (cả hai)**: `fullName` ≥ 2, `phone` `^[+0-9 ().-]{9,}$`, `email`, `address` (tỉnh) bắt buộc, `note` có chữ (bỏ thẻ HTML, `&nbsp;`) bắt buộc.
3. **Cá nhân** (`personal`): `details["Nghề nghiệp / vai trò"]` bắt buộc.
4. **DN** (`business`) — QT-11: `organization` bắt buộc; `taxCode` bắt buộc và khớp `TAX_CODE_RE`; `details["Loại hình"]`, `details["Quy mô nhân sự"]`, `details["Chức vụ người liên hệ"]` bắt buộc.
5. Server bỏ khoá `details` không thuộc `SERVICE_DETAIL_LABELS` (chuẩn hoá trước khi lưu); giá trị ≤ 200 ký tự (đã có).
6. **LK-08**: phiếu hợp lệ vẫn tạo `YC-<seq>` trạng thái `new`, hiện ở Admin › Dịch vụ (luồng hiện có; không đổi máy trạng thái — xem TIP-V2-113 BUG-041).

### Validation / Error Handling
- 400 `VALIDATION_ERROR`, `fields: [{ path, message }]` với `path` = `organization` | `taxCode` | `details.orgType` | `details.size` | `details.pos` | `details.job` | `address` | `note`; message tiếng Việt khớp `services.json › error.*` (thêm: "Vui lòng nhập mã số thuế (10 hoặc 13 số)", "Vui lòng chọn quy mô nhân sự", "Vui lòng nhập chức vụ người liên hệ").
- FE `firstError` thứ tự: name → phone → email → org → orgType → tax → size → pos → job → addr → note (vẫn toast lỗi đầu — lỗi tại ô là việc của TIP-V2-106).

### Data / Migration
- Không có migration.

## ACCEPTANCE CRITERIA
- Given `requesterType:'business'` không `organization`, When `POST /service-requests`, Then 400, `fields[0].path = 'organization'`, không tạo phiếu (BUG-019, UAT-21, QT-11).
- Given DN có tên nhưng thiếu MST / MST 9 số / thiếu quy mô / thiếu chức vụ, Then 400 đúng `path` (QT-11).
- Given cá nhân thiếu nghề nghiệp, Then 400 `details.job` (QT-11).
- Given DN đủ trường, When gửi từ popup "Tư vấn →", Then 201 `YC-xxxx` `new`, Admin › Dịch vụ thấy phiếu với "Loại hình", "Quy mô nhân sự", "Chức vụ người liên hệ" (LK-08, REQ-408).
- Given form Portal DN bỏ trống MST, When bấm Gửi, Then không gọi API, toast "Vui lòng nhập mã số thuế (10 hoặc 13 số)" (msw + server) (UAT-21).

## TESTS BẮT BUỘC
- `apps/server/test/service/service.int.spec.ts`: `UAT-21 BUG-019 phiếu DN thiếu tên DN/MST/loại hình/quy mô/chức vụ → 400` (bảng test âm, mỗi trường 1 case), `UAT-21 phiếu cá nhân thiếu nghề nghiệp → 400`, `REQ-408 LK-08 phiếu DN hợp lệ → 201 YC new, details chuẩn hoá bỏ khoá lạ`.
- `apps/portal/src/features/services/model.spec.ts`: `QT-11 thứ tự kiểm DN: org → orgType → tax → size → pos`.
- `e2e/behavior/services.spec.ts`: `UAT-21 form DN thiếu MST bị chặn`, `REQ-408 LK-08 Tư vấn → tạo phiếu DN đủ trường` (cùng assertion msw + server).

## CONSTRAINTS
- DO NOT: thêm cột DB cho loại hình/quy mô/chức vụ (giữ `details` JSON, đã chốt Q-G3a-4); kiểm luật chỉ ở FE; đổi nhãn đã lưu.
- REUSE: `TAX_CODE_RE` (`@opchub/shared/api`), `parseBody` MSW, `fieldError` server (nếu cần ngoài zod).
- SKIP: lỗi tại ô (TIP-V2-106), popup V4 6 dịch vụ (TIP-V2-302).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 2 (dữ liệu vào parse bằng zod trong `packages/shared`), luật 13 (test ở file riêng), D-63 (test âm server, tên test có mã UAT/REQ).
- [ ] `services.json` chỉ thêm khoá, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm test:int`; e2e msw + `e2e:server`.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-110-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-110-completion.md`.
