# SPEC v4.0 delta: SRS-3.6 → SRS-4.0 (scan 23/10/2026)

> Source scanned: `docs/spec/ver4/` (untracked, received 23/10/2026): `dac-ta.html` (OPCHUB-SRS-4.0),
> `index.html` (prototype "OPC Hub Community v4 Ant"), `assets/`, `mau-bao-cao/*.csv`, PDF
> "Update 23_10 … Thiết kế giải pháp cộng đồng".
> Compared against: `docs/spec/dac-ta.html` (SRS-3.6, the current source of truth per D-49) and
> `docs/spec/index.html`, plus the code on `dev` 465d1bf9.
> Rule stated by the spec itself: **§27 overrides §1–26 when they differ.**
>
> **Status: SCAN ONLY.** Nothing in this file is decided. Every row below needs an owner decision
> (a new D-xx) before any TIP. Do not code from this file.

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
- Q-V4-10 Prototype parity: re-baseline the parity suite on `ver4/index.html`? (Affects every
  `results.md` number and the approved deviations DV-*.)

## 5. Repo housekeeping (not done, needs owner OK)

- `docs/spec/ver4/` is **untracked**. Decide whether it replaces `docs/spec/` (then the parity
  suite's `PROTO_DIR`/serve path change) or lives beside it; then commit.
- `docs/spec/README.md` still says "dac-ta.html: OPCHUB-SRS-3.6".
