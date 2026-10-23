# OPCHUB — Blueprint v4 (SRS-4.0, D-67 → D-88)

> Vibecode Kit v5.0 — BƯỚC 4 (BLUEPRINT) cho đợt nâng cấp v4. Ngày 23/10/2026, nền `dev` f4943468.
> Nguồn: `01-REQUIREMENTS-MATRIX.md` D15 (REQ-501 → 517), D-67 → D-88; `audit/SPEC-V4-DELTA.md`;
> `docs/spec/dac-ta.html` §27 + §26.6; prototype `docs/spec/index.html` (tham chiếu layout/copy/seed, **không copy code**).
> Kiến trúc tổng (1 VPS native, NestJS 3 process, Prisma, Redis, BullMQ, Socket.IO, Next.js 2 app) **giữ nguyên**,
> không ADR mới. Mọi bảng/route mới theo `standards/` hiện có.

---

## 1. Phân loại thay đổi

| Nhóm | Nội dung | Loại |
|---|---|---|
| A. Sửa domain đang chạy (đụng tiền) | Phí 3 gói, đối soát, hoa hồng theo phí thực trả, Gọi vốn có phí | Migration + logic |
| B. Bỏ quy trình | Duyệt vào nhóm, trạng thái NĐT + thread, quy trình 5 bước YC, menu Marketing | Migration xoá + gỡ UI |
| C. Domain mới | Gian hàng, Nhu cầu, Onboarding, Khai báo sau đăng nhập, Trợ lý, Báo cáo | Module mới |
| D. Mở rộng domain | Kiểm duyệt §26.6 (vi phạm, khóa N ngày, khôi phục, tự mở) | Migration + job |
| E. Khung | Menu hai cổng §27.3, parity baseline v4 | FE + e2e |

## 2. Data model (Prisma, `packages/db/prisma/schema/`)

Quy ước giữ nguyên: id `uuid(7)`, `timestamptz` UTC, tiền `Int` VND, enum Postgres, index "bằng trước, khoảng/sort sau",
migration `--create-only` rồi sửa SQL tay; xoá cột/enum làm **2 bước** (bỏ ghi → migration xoá) trong cùng TIP khi không còn đọc.

### 2.1 Phí 3 gói — `membership-fee.prisma` (sửa), `account.prisma` (giữ enum)

```prisma
enum MembershipPlan { personal business @@map("membership_plan") }   // 1.200.000 / 3.600.000

model MembershipFee {          // sửa
  amount  Int                  // BỎ @default(600000); ghi tường minh theo plan lúc tạo kỳ
  plan    MembershipPlan       // mới; backfill: personal|business theo users.account_type, investor → không có phí
  ...
}
```

- Giá gói **là cấu hình**, không hằng số rải rác: `packages/shared/src/membership/plans.ts`
  `MEMBERSHIP_PLANS = { personal: 1_200_000, business: 3_600_000 } as const`, `FUNDRAISING_PLAN = { amount: 15_000_000, months: 6 }`.
  Server, mail, MSW, Portal đọc từ đây. Xoá `FEE_AMOUNT_VND`, `FEE_AMOUNT`, `ANNUAL_LIST_AMOUNT`, `COALESCE(...,600000)`, `const FEE = 600_000`, `PLAN_PRICE`.
- **D-69**: kỳ đang hiệu lực/đang chờ trả **giữ `amount` cũ**; kỳ mới (gia hạn, đăng ký mới) lấy `MEMBERSHIP_PLANS[plan]`.
  Backfill migration: `plan` từ `account_type`; `amount` không đổi.
- Đổi `account_type` bởi Admin không sửa kỳ hiện tại (D-68).

### 2.2 Gói Gọi vốn — `project.prisma` (thêm)

```prisma
enum FundraisingStatus { pending_payment pending_review active expired rejected @@map("fundraising_status") }

model ProjectFundraising {
  id         String  @id @default(uuid(7))
  projectId  String  @map("project_id")
  ownerId    String  @map("owner_id")
  amount     Int                                  // 15.000.000 tại thời điểm mua
  status     FundraisingStatus @default(pending_payment)
  paidAt     DateTime? @db.Timestamptz(6)
  reviewedBy String? ; reviewedAt DateTime? @db.Timestamptz(6)
  startsAt   DateTime? @db.Timestamptz(6) ; endsAt DateTime? @db.Timestamptz(6)  // endsAt = startsAt + 6 tháng
  createdAt  DateTime @default(now()) @db.Timestamptz(6)
  @@index([projectId, status])
  @@index([status, endsAt])                       // job hết hạn + nhắc
}
```

- `ProjectFunding` (amount, equityPct…) giữ là **khai báo**; tab Gọi vốn + nút Quan tâm chỉ hiện khi có `ProjectFundraising.status = active`.
- Thanh toán: mã CK có cấu trúc riêng (`GV` + 6 số) qua cùng adapter `bank-webhook` (fake, D-81).
- Chuyển trạng thái chỉ qua `domain/fundraising-status.ts` (cập nhật có điều kiện `WHERE status = <from>`).
- **D-82**: Cá nhân + Doanh nghiệp đều mua được; job nhắc T-14/T-0; hết hạn → `expired` (tab ẩn, dự án vẫn hiện); gia hạn = bản ghi mới.

### 2.3 Hoa hồng — `affiliate.prisma` (sửa nhỏ)

- `Commission.listAmount` = **số tiền thực trả** của khoản phí (D-70), không hằng 600.000.
- Thêm `Commission.source CommissionSource { membership fundraising }`; Gọi vốn: `rate = 10`, ghi khi Admin duyệt Gọi vốn
  (`pending_review → active`), cho đại lý giới thiệu **chủ dự án**. Unique `(source, sourceId)` chống ghi trùng.
- % mặc định Gọi vốn nằm trong `AffiliatePolicy` (`fundraisingRate Int @default(10)`), Admin sửa ở tab Chính sách.

### 2.4 Bỏ duyệt vào nhóm — `community.prisma`

- Bỏ `GroupJoinMode` và `Group.joinMode`; `GroupMemberStatus` bỏ `pending`, `rejected`, `cancelled`.
- Migration: mọi `group_members.status = 'pending'` của thành viên **đã đóng phí** → `member` (+ outbox `group.joined` để gửi tin chào); chưa đóng phí → xoá dòng.
- Xoá `join-requests.controller.ts`, `join-request.service/repository`, `admin GET admin/groups/requests`, UI duyệt ở `panel-members` + `use-room-actions` + Admin members.

### 2.5 Nhà đầu tư & Yêu cầu dịch vụ — xoá (D-72)

- `investor.prisma`: xoá `InvestorInterestStatus`, cột `status`, model `InvestorComment`; `InvestorSummary` bỏ cột theo trạng thái.
  Giữ `InvestorInterest` (dự án, loại NĐT, tên, SĐT, đơn vị, ngày) + export CSV.
- `service.prisma`: xoá `ServiceRequestStatus`, `ServiceRequest.status`, `assignee`; giữ `ServiceRequestComment` (= ghi chú nội bộ, có `mentions String[]`).
  `Service` (catalogue) thêm `description String`, `audience String?` cho Bảng giá/Trợ lý.

### 2.6 Gian hàng & Nhu cầu — `local-business.prisma` (mới)

```prisma
enum StoreStatus { draft published hidden @@map("store_status") }
enum StoreAudience { student personal organization business @@map("store_audience") }   // §25.1
enum StoreItemKind { product service @@map("store_item_kind") }
enum NeedType { buy sell partner service solution staff space capital other @@map("need_type") }  // NT prototype
enum NeedStatus { open closed hidden @@map("need_status") }

model Store {
  id String @id @default(uuid(7))
  ownerId String @unique @map("owner_id")          // 1 gian hàng / TK DN (D-75)
  name String ; slogan String? ; field String ; province String ; ward String?
  audience StoreAudience @default(business)
  coverUrl String? ; intro String? ; website String? ; phone String? ; email String? ; address String?
  status StoreStatus @default(draft)
  hiddenReason String? ; hiddenBy String?
  createdAt/updatedAt timestamptz
  @@index([status, province, field, updatedAt(sort: Desc)])
  @@index([status, updatedAt(sort: Desc)])
}
model StoreItem { id ; storeId ; kind StoreItemKind ; name ; price Int? ; description String? ; imageUrl String? ; sort Int
  @@index([storeId, sort]) }
model LocalNeed {
  id ; storeId ; ownerId ; type NeedType ; title ; description ; field String ; fieldOther String?  // "Khác" → nhập
  province ; ward? ; budget String? ; dueAt DateTime? ; standards String[] ; status NeedStatus @default(open)
  @@index([status, province, field, createdAt(sort: Desc)]) @@index([ownerId, createdAt(sort: Desc)]) }
```

- **Tự tạo gian hàng** (D-75, D-84): handler outbox `membership.activated` → nếu `account_type = business` và chưa có `Store` → tạo `draft`
  từ hồ sơ DN (tên công ty, ngành, tỉnh). "Hiển thị ngay" = chủ bấm Xuất bản → `published`, không duyệt. Không tạo hàng loạt cho người đã đóng phí trước v4.
- Chỉ chủ `Store` (DN đã đóng phí còn hạn) được tạo `LocalNeed`. Gợi ý gian hàng: cùng `field`, ưu tiên cùng `province`, `status = published`, ≤ 6, một query có index.
- Admin chỉ `published|open → hidden` (+ lý do, audit) và ngược lại; không duyệt trước.

### 2.7 Onboarding — `onboarding.prisma` (mới, nhỏ)

```prisma
model OnboardingFlag { userId String @map("user_id") ; key OnboardingFlagKey ; at DateTime @db.Timestamptz(6)
  @@id([userId, key]) }
enum OnboardingFlagKey { explore affiliate_share @@map("onboarding_flag_key") }
model OnboardingReminder { id ; userId ; sentBy ; sentAt @@index([userId, sentAt(sort: Desc)]) }   // D-88 ≤ 1/ngày
```

- **D-85**: 8 bước **tính từ dữ liệu thật** trong `srv/onboarding/domain/steps.ts` (thuần, có unit test) — đầu vào là một snapshot đếm từ **một** query
  (phí còn hạn, hồ sơ đủ, có nhóm, có tin chat, có gian hàng có nội dung | có dự án, có nhu cầu | cờ explore, cờ affiliate_share, có đăng ký sự kiện).
- Cột Admin "Khởi đầu x/8" + bộ lọc: **không** tính lại từng dòng; bảng phụ `onboarding_progress(user_id PK, done Int, updated_at)` được cập nhật
  bởi handler các sự kiện outbox liên quan (fee, group.joined, message.sent lần đầu, store.published, project.created, need.created, event.registered, flag).
  Lọc "Chưa hoàn tất" = `done < 8` dùng index `(done)`.

### 2.8 Khai báo sau đăng nhập — `account.prisma` (sửa)

- `UserProfile` thêm `persona String?` (bạn là ai), `opcIntent String?` (OPC muốn tham gia) cho Cá nhân; DN dùng các trường DN hiện có (MST tự điền, D-66).
- `users.declared_at timestamptz?`: null → Portal mở popup khai báo trước popup bảng giá.

### 2.9 Kiểm duyệt §26.6 — `moderation.prisma`, `account.prisma`

```prisma
model ModerationViolation { id ; userId ; reportId ; messageId ; at DateTime ; revokedAt DateTime?   // Khôi phục tin
  @@index([userId, at(sort: Desc)]) }
// User: lockedUntil DateTime? @map("locked_until"); lockKind UserLockKind? (manual | auto)
```

- Tin bị **báo cáo** hoặc dính **từ khóa** → ẩn ngay (`hidden_at`) + tạo `Report` mở + `ModerationViolation` (D-77). Lần đếm = số vi phạm
  `revokedAt IS NULL AND at > now() - 90 days` (**D-83**).
- Lần 1: cảnh báo (outbox `moderation.warned`, đã có). ≥ 2: khóa tự động `lockedUntil = now + N ngày` (N = cài đặt `moderation.autoLockDays`, mặc định 7);
  dùng lại side effect khoá D-55 (`lock-effects.registry`: thu hồi refresh, ngắt socket…). Admin khoá thủ công chọn N (1/3/7/14/30).
- **Khôi phục tin**: `hidden_at = null`, `revokedAt = now`; nếu đếm lại < 2 và `lockKind = auto` → mở khoá ngay.
- **Tự mở khoá**: job BullMQ mỗi 5 phút `UPDATE users SET status='active' … WHERE lock_kind='auto' AND locked_until <= now()` (index partial
  `WHERE status='locked' AND locked_until IS NOT NULL`) + kiểm tra khi đăng nhập. Login của TK đang khoá trả 403 kèm ngày mở khoá.
- Kiểm duyệt chuyển thành **tab** trong Admin › Nhóm cộng đồng (route giữ nguyên, chỉ đổi nav).

### 2.10 Báo cáo (D-78) — không bảng mới

- `srv/reporting` thêm `ReportExportService`: tổng hợp từ bảng sẵn có (users, membership_fees, group_members, messages, stores, needs, events, stats_daily)
  theo nhóm/tỉnh/vùng (`regionOf` có sẵn) cho tháng chọn → CSV đúng cột `docs/spec/mau-bao-cao/Mau-B1/B2/B3`. Xuất qua job `export` hiện có (audit_logs).

## 3. API contracts (REST `/v1`, zod schema trong `packages/shared/src/api-domains/`)

Envelope, lỗi, phân trang keyset theo `standards/backend/*`. Quyền theo `packages/shared/src/permissions.ts` (ADMIN_PERMISSIONS):
thêm menu `local` (Gian hàng & Nhu cầu) với `local.view`, `local.action`; menu `reports` với `reports.view`. Nhắc onboarding dùng `members.action`;
kiểm duyệt dùng `groups.moderate`. Bỏ menu `marketing` khỏi nav (D-73). `investors.action` đổi nhãn thành "Xuất dữ liệu nhà đầu tư".

| Method | Path | Auth | Request → Response |
|---|---|---|---|
| GET | `/v1/plans` | public | → `{ personal, business, fundraising: { amount, months } }` |
| GET | `/v1/me/onboarding` | member | → `{ steps: [{ key, done, locked }] ×8, done, optional?: { fundraising } }` |
| POST | `/v1/me/onboarding/flags/:key` | member | `explore \| affiliate_share` → 204 (idempotent) |
| PUT | `/v1/me/declaration` | member | Cá nhân `{ persona, opcIntent }` / DN `{ taxCode, … }` → profile |
| GET | `/v1/stores` | member | `?field&province&audience&kind&cursor` → `{ items, nextCursor, facets }` |
| GET | `/v1/stores/:id` | member | → store + items |
| GET/PUT | `/v1/me/store` | DN đã trả phí | upsert thông tin + items; `POST /v1/me/store/publish \| unpublish` |
| GET | `/v1/needs` | member | `?type&field&province&cursor` |
| GET/POST | `/v1/me/needs`, PATCH `/v1/me/needs/:id` (close/reopen), DELETE | chủ gian hàng | → need; response kèm `suggestions` (≤ 6 store) |
| POST | `/v1/projects/:id/fundraising` | chủ dự án đã trả phí | → `{ id, amount, transferCode }` |
| GET | `/v1/admin/stores`, `/v1/admin/needs` | `local.view` | filter + KPI |
| POST | `/v1/admin/stores/hide` `/show`, `/v1/admin/needs/hide` `/show` | `local.action` | `{ ids[], reason }` hàng loạt, audit |
| POST | `/v1/admin/projects/:id/fundraising/:fid/review` | `projects.action` | `{ decision: approve \| reject }` → ghi hoa hồng 10% khi approve |
| GET | `/v1/admin/members?onboarding=incomplete` | `members.view` | thêm cột `onboardingDone` |
| POST | `/v1/admin/members/:id/onboarding-remind` | `members.action` | → 204 / 429 nếu < 1 ngày |
| POST | `/v1/admin/moderation/reports/:id/restore` | `groups.moderate` | → khôi phục tin + mở khoá nếu đủ |
| POST | `/v1/admin/users/:id/lock` | (đã có) | thêm `{ days: 1\|3\|7\|14\|30 }` |
| GET | `/v1/admin/reports/:template` | `reports.view` | `B1\|B2\|B3`, `?month` → job export CSV |
| — | **Xoá** | | `groups/:id/requests*`, `admin/groups/requests`, `admin/investors/:key/status`, investor comments + `me/investor-thread`, `admin/services/requests/:id/transition \| assign`, summary `byStatus` |

## 4. Module & component tree

```
apps/server/src/modules/
  membership-fee/   sửa: plan, amount theo plan, mã GV cho Gọi vốn (reconcile dispatch theo prefix)
  affiliate/        sửa: listAmount = phí thực trả, source fundraising, fundraisingRate
  project/          + domain/fundraising-status.ts, services/fundraising.service.ts, admin review
  local-business/   MỚI: store.*, need.*, suggestion.repository, store-auto-create.handler (outbox)
  onboarding/       MỚI: domain/steps.ts, progress.handler (outbox), reminder.service
  moderation/       sửa: violation.repository, auto-lock.service, restore; worker job auto-unlock
  community/        sửa: xoá join-request*, join = member ngay
  investor/ service/ sửa: xoá status/thread/assignee
  reporting/        + report-export.service (B1/B2/B3)
  marketing/        giữ code; gỡ schedule campaigns-due + nav
apps/portal/src/features/
  stores/  needs/  onboarding/ (Dashboard card)  declaration/ (popup)  assistant/ (sidebar)
  membership/ sửa (Bảng giá 3 gói UP-12)  projects/ sửa (Gói Gọi vốn)  shell/nav.ts (§27.3)
apps/admin/src/features/
  stores/  needs/ (2 mục con "Gian hàng & Nhu cầu")  reports/  members/ (cột Khởi đầu, Nhắc)
  groups/ (+ tab Kiểm duyệt)  investors/ requests/ (gỡ trạng thái)  shell/nav.ts (§27.3, bỏ marketing)
packages/shared/src/
  membership/plans.ts  api-domains/{stores,needs,onboarding,fundraising,reports}.ts  mock-data/domains/{stores,needs,onboarding}.ts
```

Mỗi màn: page = orchestrator; component ≤ 250 dòng (trần 400); hooks/types tách file; MSW handler + seed từ prototype cho mọi API mới.

## 5. Tích hợp

- Ngân hàng: **fake provider** (D-81) qua `packages/integrations/bank-webhook`; thêm prefix `GV` cho Gọi vốn. Không gọi API thật.
- MST: D-66 (DLPL → ESGOO → VietQR) cho popup Khai báo DN.
- Mail: mẫu mới "Nhắc onboarding" (D-88), "Gọi vốn sắp hết hạn", "Tài khoản bị khoá đến ngày…" — Admin sửa được ở Cài đặt › Email tự động.
- Ảnh gian hàng/sản phẩm: MinIO qua `uploads` hiện có (giới hạn kích thước như ảnh dự án).

## 6. NFR

- Danh sách Gian hàng/Nhu cầu: keyset + deferred join, p95 API < 300 ms với 10.000 gian hàng; facet đếm bằng 1 query `GROUP BY` có cache Redis 60 s.
- Onboarding: `GET /me/onboarding` ≤ 1 query snapshot; cột Admin đọc `onboarding_progress` (không N+1).
- Auto-unlock job idempotent, chạy mỗi 5 phút, 1 UPDATE có index.
- Loading/empty/error state cho mọi màn mới (copy theo prototype). Không polling rộng; invalidation TanStack Query có mục tiêu.

## 7. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Đổi số tiền làm lệch đối soát kỳ đang chờ | D-69: kỳ cũ giữ `amount`; test reconcile cho cả kỳ 600.000 và kỳ gói mới |
| Xoá cột trạng thái làm gãy export/báo cáo cũ | TIP xoá phải grep toàn repo + test export; migration 2 bước |
| Parity cũ vô hiệu (D-79) | TIP parity riêng chạy sau cùng; không dùng số cũ làm cổng |
| Prototype v4 còn màn đã gỡ (Mạng lưới) | parity `unreachable` + không build |
