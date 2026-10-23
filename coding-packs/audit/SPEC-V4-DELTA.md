# SPEC v4.0 delta: SRS-3.6 → SRS-4.0 (scan 23/10/2026)

> Source scanned: `docs/spec/ver4/` (untracked, received 23/10/2026): `dac-ta.html` (OPCHUB-SRS-4.0),
> `index.html` (prototype "OPC Hub Community v4 Ant"), `assets/`, `mau-bao-cao/*.csv`, PDF
> "Update 23_10 … Thiết kế giải pháp cộng đồng".
> Compared against: `docs/spec/dac-ta.html` (SRS-3.6, the current source of truth per D-49) and
> `docs/spec/index.html`, plus the code on `dev` 465d1bf9.
> Rule stated by the spec itself: **§27 overrides §1–26 when they differ.**
>
> **Status: DECIDED 23/10/2026 (RRI).** Q-V4-1…12 → D-67…D-80 in `01-REQUIREMENTS-MATRIX.md`
> (REQ-501…517, OQ-17…21). Q-V4-1→D-67, Q-V4-2→D-68/D-69, Q-V4-3→D-70, Q-V4-4→D-71, Q-V4-5/12→D-72,
> Q-V4-6→D-73, Q-V4-7→D-74/D-76, Q-V4-8→D-75, Q-V4-9→D-78, Q-V4-10→D-79, Q-V4-11→D-77.

## 1. What changed in the documents

| Section | Change |
|---|---|
| §1 | Menu lists updated for both portals (see §27.3) |
| §2–6, 8–21 | Text identical to SRS-3.6 |
| §7, §22, §23 | Unchanged text + "Đã thay thế bởi v4.0" notes (fees, group join, investor status, service workflow, registration confirmation) |
| §24 (v3.7) | **New but already superseded**: network tree / regional directors / stacked commission, "gỡ khỏi hệ thống" |
| §25 (v3.8) | New: audience types (Sinh viên/Cá nhân/Tổ chức/Doanh nghiệp), storefront filters, project detail tabs, sidebar grouping |
| §26 (v3.9/v3.10) | New: E2E test scripts UT-01..16, AT-01..12, E-01..15; business adjustments 21/10 |
| **§27 (v4.0)** | New, authoritative: change table, mindmap, menus, architecture, roles, UP-01..14, AD-01..12, flows F01–F09, data links, test results T01–T15, open issues |

Prototype screens: 24 → 35. Added: Admin Báo cáo, Cài đặt hệ thống, Gian hàng, Nhu cầu địa
phương, Quản lý mạng lưới; Popup Gói Gọi vốn, Khai báo doanh nghiệp, Thông tin cá nhân; Portal
Affiliate (không áp dụng), Gian hàng, Mạng lưới, Nhu cầu địa phương. Removed: Admin "Cài đặt &
Phân quyền" (renamed/restructured as "Cài đặt hệ thống"). Per §27.9 T15, Báo cáo, Quản lý mạng
lưới and Portal › Mạng lưới are **in the prototype code but switched off** (no menu).

## 2. §27.1 changes vs current product (code on dev)

| # | Item | SRS-3.6 / current code | SRS-4.0 | Conflicts with | Code impact |
|---|---|---|---|---|---|
| V4-01 | Positioning | One-person business community | Learning to convert to OPC under NQ 86/NQ-CP; local supply chain to ASEAN | — | Copy only |
| V4-02 | **Membership fee** | 600.000đ/năm (D-53, D-58; `600_000` in fixtures, affiliate payout, mock auth) | **3 plans**: Cá nhân 1.200.000đ/năm, Doanh nghiệp 3.600.000đ/năm, Gọi vốn 15.000.000đ/dự án/6 tháng (optional) | D-53, D-58, D-54 wording | **Large**: fee schema, reconciliation amount match, pricing popup, affiliate commission base, mail, tests |
| V4-03 | Registration confirmation | Accept terms + no-refund fee policy | "Tôi xác nhận là người đại diện hợp pháp và đồng ý với Điều khoản sử dụng" | §22.5 / D-54 display | Small (copy + validation) |
| V4-04 | Post-login declaration | None | Cá nhân: who you are, which OPC; Doanh nghiệp: company info (MST autofill) → then pricing popup | QT-02 | New popups + profile fields |
| V4-05 | Onboarding | None | Dashboard 8 steps; Admin › Thành viên column "Khởi đầu x/8", filter, "Nhắc" button | — | **New domain** (0 code today); per-member progress persistence (§27.10 open issue) |
| V4-06 | **Group join** | Approval mode exists (`GroupJoinMode.approval`, join requests: 34 files) | Paid member joins immediately, no approval | D-43 (owner approves join), QT-05 | Remove/disable approval path; data migration for pending requests |
| V4-07 | Moderation | Separate menu | Tab inside Admin › Cộng đồng › Nhóm cộng đồng; restore = show again + not counted; lock N days, auto-unlock | QT-06, NA-07, D-44/D-55 | Move UI; check restore/violation-count and auto-unlock semantics |
| V4-08 | **Investors** | Connection status Đã gửi / Đang trao đổi / Đã kết nối (9 files) | Drop status; keep interested-investor list (name, phone, org) + export | QT-10, NA-11, §22.4 | Schema/state machine removal |
| V4-09 | **Service requests** | 5-step workflow (`ServiceRequestStatus` new/consulting/quoted/won/lost) | Drop workflow; keep ticket + internal note with @mention; catalogue toggled by Admin | QT-11, NA-22, D-60 | Schema/state machine removal + new catalogue CRUD |
| V4-10 | **Local storefront** | Tech-business storefront (none in code) | Storefront for every member, auto-created on payment, visible immediately, 1-page detail | §25.2 | **New domain** (0 code) |
| V4-11 | **Local needs** | None | New menu: need to buy / sell / partner / service…; "Khác" → free text; suggest storefronts | — | **New domain** (0 code) |
| V4-12 | Network tree / regional director | §24 (never built) | Removed; only Affiliate (§20) stays | — | None (never built). Prototype keeps dead screens |
| V4-13 | **Email campaigns / Marketing** | Built (`marketing` module server + admin, 149 files match) | Removed from menu; only automatic welcome email in Settings | QT-13 | Hide/remove menu + worker job (MarketingProcessor runs every minute today) |
| V4-14 | OPC Hub Assistant | None | Assistant panel at bottom of User Portal sidebar, opens services & programmes catalogue | — | New UI, depends on V4-09 catalogue |
| V4-15 | Languages | D-65: 9 Portal translations (+vi = 10) | 10 languages | D-65 | Likely already matching; confirm Admin scope |
| V4-16 | Fundraising plan | Fundraising fields exist (22 files) | Paid "Gói Gọi vốn" 15.000.000đ/project/6 months; Admin appraises before showing; approval records **10% commission** to the referring agent | D-53 (commission base) | Payment + appraisal state + commission rule |
| V4-17 | Roles | §21 roles | Adds Cá nhân vs Doanh nghiệp member capabilities (storefront/needs only for Doanh nghiệp) | D-52 | Permission matrix extension |
| V4-18 | Menus | §1/§25.4 | §27.3 order (Portal 9 items; Admin 10 groups) | — | Shell navigation both apps |
| V4-19 | Reports templates | — | `mau-bao-cao/` B1 nhóm ngành, B2 tháng tỉnh, B3 vùng (tied to removed §24 NET-08) | §24 | Probably obsolete; confirm |

## 3. Internal inconsistencies in SRS-4.0 (ask before building)

1. §27.1 says the network tree is removed, yet §24 text remains and the prototype still contains
   "Quản lý mạng lưới" / "Mạng lưới" screens (switched off per T15).
2. §27.5: "Thành viên Doanh nghiệp: Như Cá nhân + Gian hàng, Nhu cầu", but §27.1 says the
   storefront is "cho mọi thành viên" and UP-09 says only accounts that have a storefront may post needs.
3. §26.2 UT-13 / AT-10 still test the 5-step service status, which §27.1 removes.
4. §26.6 says a group owner approves join requests in the chat room (tested 21/10), and §27.1
   says no approval is needed.
5. Affiliate base: §20/D-53 use 600.000đ × %; §27 has 3 fee amounts plus a 10% Gọi vốn commission.
   It is unspecified whether the default % applies to 1.200.000 and 3.600.000.
6. §27.10 itself lists open items: the VCB reconciliation channel, the MST source (D-66 already
   chose DLPL), separate confirmation text per account type, and the onboarding reminder email template.

7. §26.1 still draws the flow as "Thanh toán phí 600.000đ"; §26.5 E-15 opens "Mục tiêu KPI"
   (network tree, removed by §27.1).
8. §26.2 UT-01 expects a 5-step "Hành trình của tôi" card; §27.6.1 UP-04 specifies 8 onboarding steps.
9. §26.3 AT-09 tests investor "trao đổi" (two-way thread); §26.6 keeps comments but drops status,
   and §27.1 says only the interested list + export remain. Whether comments survive is unclear.
10. §26.6 numbering is out of order (26.5, 26.6, then 26.4) and the 26.4 backlog still says
    "tham gia nhóm (mở form đăng ký tham gia)", i.e. a join request form, contradicting §27.1.

## 3b. Deep read 23/10/2026: superseded markers and §26.6 rules

The "Đã thay thế bởi v4.0" markers sit on exactly 8 headings: QT-03, QT-05, QT-10, QT-11, §22.4,
§22.5, §23.5 and §24. All other §1–23 text is word-for-word SRS-3.6, so D-01…D-66 that only
cite those sections are unaffected by the text itself (§27 can still override them).

§26.6 (v3.10, 21/10) adds moderation rules that §27 references ("khóa N ngày, tự mở"):

| Rule (§26.6) | Current code on dev | Gap |
|---|---|---|
| Message with banned keyword **or reported by a member** is hidden immediately, placeholder "Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng" | `hidden_at` set by an Admin action on a report case (`report.repository.ts:130`); report alone does not hide | Auto-hide on report + on keyword (NA-07 keyword filter needs checking) |
| 1st violation: hide + warning. From 2nd: **auto-lock N days** (default 7; Admin picks 1/3/7/14/30); signed-in user is logged out; login shows unlock date | Lock exists per D-44/D-55 (manual Admin lock, login lockout 5 tries/15 min); no violation counter, no timed member lock (`locked_until` only exists on `outbox_events`) | Violation count + timed lock + unlock-date message |
| "Khôi phục tin": message shown again, that violation not counted; if count < 2 and auto-locked → unlock now | No restore action, no counter | New |
| Auto-unlock: periodic check + at login | None | New job + login check |

§26.6 also says the service workflow loses its assignee, statistics and status filters
(not only the statuses), and investor Admin view loses the "Gọi điện" button.

## 4. Questions for RRI (owner decisions needed → new D-xx)

- Q-V4-1 Adopt SRS-4.0 as the new source of truth (replacing D-49's SRS-3.6)? Partly or fully?
- Q-V4-2 Fee migration: existing members on 600.000đ, how are they treated (grandfathered until
  expiry, renewal price, which plan)? Does Cá nhân vs Doanh nghiệp map from `ACCOUNT_TYPE`?
- Q-V4-3 Affiliate commission base for each plan, and the 10% Gọi vốn rule (who, when, paid how).
- Q-V4-4 Group join approval: remove entirely (incl. D-43 owner approval) or keep for unpaid members?
- Q-V4-5 Investor status and the service 5-step workflow: drop data and columns, or hide only?
- Q-V4-6 Marketing campaigns: delete module + worker job, or keep code behind no-menu?
- Q-V4-7 Storefront / Local needs / Onboarding / Assistant: go-live scope or later phase?
- Q-V4-8 Who may post local needs: storefront owners only (UP-09) or every member?
- Q-V4-9 Báo cáo / Quản lý mạng lưới screens and the `mau-bao-cao` CSVs: out of scope?
- Q-V4-11 Moderation (§26.6): adopt auto-hide on report, violation counter, auto-lock N days
  and restore-uncounts? These change D-44/D-55 behaviour.
- Q-V4-12 Investor comments (§26.6 vs §27.1): keep the comment thread or list + export only?
- Q-V4-10 Prototype parity: re-baseline the parity suite on `docs/spec/index.html` (v4)? (Affects every
  `results.md` number and the approved deviations DV-*.)

## 5. Repo housekeeping (not done, needs owner OK)

- 23/10/2026: owner said "thay thế đi". `docs/spec/` now holds the v4 package (old v3.6 files
  are in git history at 465d1bf9). The parity suite serves `docs/spec`, so **every parity number
  is now measured against the v4 prototype** and old `results.md` / DV-* values are stale until
  re-baselined (Q-V4-10). App assets live in `apps/*/public`, so removing `sv-hero-v6.png` here
  does not affect the app.
