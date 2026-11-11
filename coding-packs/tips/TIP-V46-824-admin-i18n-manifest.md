# TIP-V46-824 - Exact file manifest

Mandatory HEADER appendix to [TIP-V46-824](TIP-V46-824-admin-i18n.md). This is NOT a second implementation TIP. Baseline: `dev f7c1b2b8`, 2026-11-11.

## Ownership and scope

- One serial implementation lane. No parallel Admin/shared-UI edits. Prior TIP822/823 are merged.
- Every path below is literal, including Next route brackets; there are no wildcard write grants.
- `modify` is an audited boundary, not an instruction to make artificial edits: report unchanged paths as `no change needed` with reason. Audit all listed callers, not only definitions.
- New findings outside these paths: update this manifest and intersection review BEFORE edits. Business/backend changes still require owner approval (D-93).
- Test/evidence paths are future execute deliverables, not claims that files or passing results already exist. Font licenses must come from the real upstream source.
- Planning changes in this commit are ONLY requirements D-141, task row824, TIP and this manifest.

## Catalog partition (all 10 bundles)

Keep all existing logical namespaces. The six physical settings parts are merged under `settings`, never `settings.core.*`. Duplicate top-level keys must fail tests.

| Physical part | Existing root keys owned |
|---|---|
| settings/core.json | title, sub, screenLabel, tabsLabel, tabs, tabSub, common, general, cat, lang |
| settings/access.json | roles, admins, sso |
| settings/mail.json | mail, smtp |
| settings/audit.json | log, time |
| settings/finance.json | price, renewal, bank |
| settings/ai.json | ai, app; new aiCalls labels for AI call-log UI |

New logical namespaces: `meta`, `ui`, `botOptions` (physical `bot-options.json`). All 16 other existing namespaces remain. Total physical catalog files planned: **250** (25 per bundle); no alias duplicate catalogs for en-SG/ms-BN. Add key coverage against the assembled logical tree as well as physical-file existence.

Baseline settings has **524** string leaves. Its sorted `[path,value]` entries (lexical ASCII key order, `JSON.stringify`, UTF-8, no trailing newline) have SHA-256 `390994d81ce3359924591554b33bc29792097d798ba37fa2559639bfc3c97e5a`. This is a catalog integrity fixture, **not a Git commit SHA or completion identifier**. Compare old keys/values before adding labels; additions must not overwrite existing source strings.

## Audit boundaries that must not be mechanically translated

- `features/bots/types.ts`: preset strings are existing values; introduce translated labels separately, do not change persisted prompt/tone/gender/hour values.
- `features/groups/model.ts`: search comparisons and client export formatting are not UI locale migrations. `features/groups/types.ts` regions may be canonical filter values.
- `features/projects/types.ts`: rejection presets must preserve submitted canonical value; user-authored reasons remain raw.
- `lib/permission-model.ts`: if already consumes only registry keys, leave unchanged; never replace grant logic with translated labels.
- `features/requests/model.ts`: example/author personal names are data, not copy needing translation.
- All model date parsers, API values, query keys and export files keep prior behavior. Change UI formatting signatures and callers, not the business calculations.
- API/server error messages and server notification/audit/email payloads remain raw per D-65/D-141. Client-only validation and upload errors must be localized without weakening schema checks.
- UI labels defaulting to Vietnamese in packages/ui must be overridden from Admin at call sites. Initially only UiProvider and DateRangePicker were authorized. Owner approved the11/11/2026 execute clarification: also add optional number-format props to Pagination and BulkBar, retaining all Portal defaults and numeric callbacks. No other shared production file is authorized.

## Runtime, screens, shared UI and dependencies (252 paths)

| Action | Exact path | Responsibility |
|---|---|---|
| modify | `apps/admin/package.json` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/app/(admin)/affiliate/[[...slug]]/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/bots/[[...slug]]/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/events/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/fees/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/fees/transactions/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/groups/[id]/chat/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/groups/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/investors/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/marketing/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/members/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/needs/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/overview/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/profile/page.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/app/(admin)/projects/[[...slug]]/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/reports/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/requests/[[...tab]]/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/settings/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(admin)/stores/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(public)/first-password/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(public)/forgot-password/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(public)/login/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(public)/reset-password/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/(public)/two-factor/page.tsx` | Localize route metadata, preserve robots and routing. |
| modify | `apps/admin/src/app/layout.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/components/ai-suggest-button.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/affiliate-detail-head.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/affiliate-page-header.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/affiliate-pagination.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/affiliate-stats.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/affiliate-table-columns.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/affiliate-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/affiliate-tabs.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/affiliate.module.css` | Only if translated labels overflow; do not redesign Vietnamese layout. |
| modify | `apps/admin/src/features/affiliate/components/agent-bulk-bar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/agent-month-select.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/agent-period.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/cancel-dialog.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/commission-bulk-bar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/commission-table-columns.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/commission-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/customer-payout-history.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/customer-table-columns.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/customers-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/payout-months-table-columns.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/payout-months-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/policy-plan-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/policy-terms.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/components/rate-dialog.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/format.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/hooks/use-affiliate-policy-form.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/affiliate/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/affiliate/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/regional/components/regional-history.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/regional/components/regional-payee-bank-dialog.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/regional/components/regional-payout-dialog.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/regional/components/regional-payout-history.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/regional/components/regional-share-items.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/regional/components/regional-share-kpis.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/regional/components/regional-share-row.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/regional/components/regional-share-toolbar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/affiliate/types.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/auth/components/auth-frame.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/bots/components/bots-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/bots/components/bots.module.css` | Only if translated labels overflow; do not redesign Vietnamese layout. |
| modify | `apps/admin/src/features/bots/components/bulk/bulk-modal.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/bots/components/bulk/type-delete-dialog.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/bots/components/confirm-delete.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/bots/components/emergency-confirm.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/bots/components/persona-fields.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/bots/components/script-drawer.tsx` | Localize label props and preserve stored values/drafts. |
| modify | `apps/admin/src/features/bots/components/script-list.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/bots/hooks/use-bot-type-form.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/bots/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/bots/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| create | `apps/admin/src/features/bots/option-labels.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| modify | `apps/admin/src/features/bots/types.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/events/components/event-form.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/events/components/events-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/events/components/events-toolbar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/events/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/events/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/components/fee-bulk-bar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/components/fee-stats.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/components/fee-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/components/fees-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/components/fundraising-picker.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/components/match-dialog.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/components/txn-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/hooks/use-fee-actions.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/hooks/use-fee-transactions.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/fees/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/ai-report-actions.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/chat-viewer.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/group-form-fields.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/groups/components/group-grid.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/group-list-panel.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/group-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/groups-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/groups-toolbar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/moderation-rules.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/components/report-card.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/groups/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/groups/types.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/investors/components/investor-profile.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/investors/components/investor-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/investors/components/investor-toolbar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/investors/components/investors-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/investors/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/investors/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/marketing/components/auto-panel.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/marketing/components/campaign-form-fields.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/marketing/components/campaign-form.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/marketing/components/mail-log.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/marketing/components/marketing-head.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/marketing/components/onboarding-mail.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/marketing/hooks/use-campaign-flow.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/marketing/hooks/use-marketing-actions.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/marketing/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/marketing/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/members/components/member-bulk-bar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/members/components/member-grid.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/members/components/member-profile.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/members/components/member-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/members/components/members-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/members/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/members/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/needs/components/need-bars.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/needs/components/need-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/needs/components/needs-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/needs/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/needs/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/components/conversion-grid.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/components/growth-chart.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/components/overview-range-control.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/components/overview.module.css` | Only if translated labels overflow; do not redesign Vietnamese layout. |
| modify | `apps/admin/src/features/overview/components/stat-cards.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/components/system-flow.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/data.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/overview/data.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/flow.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/overview/flow.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/hooks/overview-range.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/overview/hooks/use-conversion.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| create | `apps/admin/src/features/overview/series-labels.spec.ts` | Dedicated types / deterministic chart-label adapter tests. |
| create | `apps/admin/src/features/overview/series-labels.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| modify | `apps/admin/src/features/profile/admin-profile.spec.tsx` | Preserve existing assertions and add locale coverage. |
| modify | `apps/admin/src/features/profile/components/profile-details.tsx` | Localize label props and preserve stored values/drafts. |
| modify | `apps/admin/src/features/profile/components/profile.module.css` | Only if translated labels overflow; do not redesign Vietnamese layout. |
| modify | `apps/admin/src/features/profile/form-errors.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/profile/hooks/use-admin-profile.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/profile/hooks/use-profile-password.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/projects/components/project-grid.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/projects/components/project-list-panel.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/projects/components/project-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/projects/components/projects-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/projects/components/review-body.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/projects/components/review-drawer.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/projects/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/projects/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| create | `apps/admin/src/features/projects/rejection-labels.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| modify | `apps/admin/src/features/projects/types.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/reports/components/report-metrics.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/reports/components/report-rows.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/reports/components/report-toolbar.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/reports/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/reports/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/requests/components/comment-composer.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/requests/components/request-comments.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/requests/components/request-info.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/requests/components/request-list-tab.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/requests/components/request-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/requests/components/requests-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/requests/components/screen-tabs.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/requests/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/requests/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/admin-create-drawer.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/ai/ai-call-columns.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/ai/ai-call-filters.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/ai/ai-call-log.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/ai/ai-limits.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/ai/ai-provider-detail.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/bank-key-field.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/bank-short-dialog.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/bank-txn-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/languages-tab.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/settings/components/price-plan-card.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/price-tab.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/renewal-cells.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/role-matrix.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/settings.module.css` | Only if translated labels overflow; do not redesign Vietnamese layout. |
| modify | `apps/admin/src/features/settings/components/sso-tab.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/components/sso.module.css` | Only if translated labels overflow; do not redesign Vietnamese layout. |
| modify | `apps/admin/src/features/settings/hooks/use-ai-calls.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/hooks/use-ai-settings.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/settings/hooks/use-app-notify-device.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/hooks/use-audit-log-filters.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/settings/hooks/use-bank-reconcile.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/settings/hooks/use-price-config.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/settings/hooks/use-welcome-mail.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/settings/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/settings/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/shell/components/admin-shell.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `apps/admin/src/features/stores/components/store-bars.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/stores/components/store-drawer.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/stores/components/store-table.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/stores/components/stores-header.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/stores/components/stores-screen.tsx` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/features/stores/model.spec.ts` | Regression: canonical behavior unchanged; locale formatting explicit. |
| modify | `apps/admin/src/features/stores/model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| create | `apps/admin/src/i18n/antd-locales.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/antd-locales.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/antd/fil.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/antd/lo.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/domain-labels.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/domain-labels.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/font-config.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/fonts.css` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/format.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/format.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/locales.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/locales.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/message-loader.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/message-loader.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/message-overlay.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/messages.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| modify | `apps/admin/src/i18n/messages.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| create | `apps/admin/src/i18n/request.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| modify | `apps/admin/src/i18n/request.ts` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| create | `apps/admin/src/i18n/source-messages.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/tests/catalog-baseline.json` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/tests/message-contract.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/tests/message-contract.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/tests/source-audit-allowlist.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/tests/source-audit.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/types.ts` | Dedicated types / deterministic chart-label adapter tests. |
| create | `apps/admin/src/i18n/ui-labels.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/use-admin-format.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/validation.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/i18n/validation.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| modify | `apps/admin/src/lib/permission-model.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| modify | `apps/admin/src/lib/upload-image.ts` | Presentation audit: labels / formatter / callers only; preserve canonical values and business logic. |
| create | `apps/admin/src/providers/admin-intl-errors.tsx` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/providers/admin-ui-locale-provider.spec.tsx` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/src/providers/admin-ui-locale-provider.tsx` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| modify | `apps/admin/src/providers/app-providers.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `packages/ui/src/date-range-picker/date-range-picker.spec.tsx` | Preserve existing assertions and add locale coverage. |
| modify | `packages/ui/src/date-range-picker/date-range-picker.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| create | `packages/ui/src/providers/ui-provider.spec.tsx` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| modify | `packages/ui/src/providers/ui-provider.tsx` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |
| modify | `pnpm-lock.yaml` | Runtime/locale wiring, label props or local validation; no API/behavior redesign. |

## Browser tests (8 paths)

| Action | Exact path | Responsibility |
|---|---|---|
| create | `e2e/behavior/admin-i18n-auth.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `e2e/behavior/admin-i18n-controls.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `e2e/behavior/admin-i18n-navigation.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `e2e/behavior/admin-i18n-screens.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `e2e/behavior/admin-i18n-values.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `e2e/behavior/admin-i18n-visual.spec.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `e2e/behavior/admin-i18n/cases.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `e2e/behavior/admin-i18n/helpers.ts` | New small module/test dedicated to the responsibilities specified in TIP-824. |

## Catalogs and translation review (252 paths)

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/messages/en/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/en/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/fil/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/id/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/km/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/lo/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/ms/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/my/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/REVIEW.md` | New small module/test dedicated to the responsibilities specified in TIP-824. |
| create | `apps/admin/messages/th/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/th/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |
| modify | `apps/admin/messages/vi/affiliate.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/auth.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/vi/bot-options.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/bots.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/common.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/events.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/fees.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/groups.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/investors.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/marketing.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/members.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/vi/meta.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/needs.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/overview.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/projects.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/reports.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/requests.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| delete | `apps/admin/messages/vi/settings.json` | Replace with settings domain parts; preserve settings.* at runtime. |
| create | `apps/admin/messages/vi/settings/access.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/vi/settings/ai.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/vi/settings/audit.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/vi/settings/core.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/vi/settings/finance.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/vi/settings/mail.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| modify | `apps/admin/messages/vi/stores.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/vi/ui.json` | Source catalog; preserve existing logical keys and Vietnamese copy. |
| create | `apps/admin/messages/zh/affiliate.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/auth.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/bot-options.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/bots.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/common.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/events.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/fees.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/groups.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/investors.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/marketing.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/members.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/meta.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/needs.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/overview.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/projects.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/reports.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/requests.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/settings/access.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/settings/ai.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/settings/audit.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/settings/core.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/settings/finance.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/settings/mail.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/stores.json` | Complete translated catalog; exact structure and ICU argument contract. |
| create | `apps/admin/messages/zh/ui.json` | Complete translated catalog; exact structure and ICU argument contract. |

## Self-hosted font assets and licenses (12 paths)

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/public/fonts/NotoSans-Regular.woff2` | Self-host licensed subset, script coverage documented; no runtime CDN. |
| create | `apps/admin/public/fonts/NotoSansKhmer-Regular.woff2` | Self-host licensed subset, script coverage documented; no runtime CDN. |
| create | `apps/admin/public/fonts/NotoSansLao-Regular.woff2` | Self-host licensed subset, script coverage documented; no runtime CDN. |
| create | `apps/admin/public/fonts/NotoSansMyanmar-Regular.woff2` | Self-host licensed subset, script coverage documented; no runtime CDN. |
| create | `apps/admin/public/fonts/NotoSansSC-Regular.woff2` | Self-host licensed subset, script coverage documented; no runtime CDN. |
| create | `apps/admin/public/fonts/NotoSansThai-Regular.woff2` | Self-host licensed subset, script coverage documented; no runtime CDN. |
| create | `apps/admin/public/fonts/OFL-NotoSans.txt` | Upstream license and attribution, not fabricated. |
| create | `apps/admin/public/fonts/OFL-NotoSansKhmer.txt` | Upstream license and attribution, not fabricated. |
| create | `apps/admin/public/fonts/OFL-NotoSansLao.txt` | Upstream license and attribution, not fabricated. |
| create | `apps/admin/public/fonts/OFL-NotoSansMyanmar.txt` | Upstream license and attribution, not fabricated. |
| create | `apps/admin/public/fonts/OFL-NotoSansSC.txt` | Upstream license and attribution, not fabricated. |
| create | `apps/admin/public/fonts/OFL-NotoSansThai.txt` | Upstream license and attribution, not fabricated. |

## Traceability and execute evidence (60 paths)

| Action | Exact path | Responsibility |
|---|---|---|
| modify | `coding-packs/01-REQUIREMENTS-MATRIX.md` | Planning/traceability only; append or update TIP824-owned sections. |
| modify | `coding-packs/02-TASK-GRAPH.md` | Planning/traceability only; append or update TIP824-owned sections. |
| modify | `coding-packs/audit/W1/TEST-GAPS.md` | Planning/traceability only; append or update TIP824-owned sections. |
| create | `coding-packs/reports/evidence/v46-824/build-msw.log` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/build-native.log` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/catalog-audit.md` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/coverage.md` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/msw-behavior.log` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/msw-en-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-en-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-en-profile-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-en-profile-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-en-settings-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-en-settings-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-km-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-km-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-lo-settings-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-lo-settings-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-my-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-my-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-th-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-th-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-th-settings-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-th-settings-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-vi-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-vi-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-vi-profile-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-vi-profile-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-zh-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/msw-zh-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-behavior.log` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/native-en-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-en-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-en-profile-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-en-profile-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-en-settings-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-en-settings-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-km-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-km-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-lo-settings-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-lo-settings-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-my-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-my-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-th-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-th-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-th-settings-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-th-settings-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-vi-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-vi-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-vi-profile-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-vi-profile-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-zh-overview-1440.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/native-zh-overview-390.png` | Unmasked actual application screenshot; include opened control where specified. |
| create | `coding-packs/reports/evidence/v46-824/parity-vi.log` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/performance.md` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/quality-gates.log` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/evidence/v46-824/unit.log` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| create | `coding-packs/reports/TIP-V46-824-completion.md` | Execute-phase evidence only; do not generate fake results during TIP planning. |
| modify | `coding-packs/tips/TIP-V46-824-admin-i18n-manifest.md` | Planning/traceability only; append or update TIP824-owned sections. |
| modify | `coding-packs/tips/TIP-V46-824-admin-i18n.md` | Planning/traceability only; append or update TIP824-owned sections. |

## Parallel-break result

Batch = one TIP824. Pairwise conflicts inside the batch = zero. Overlaps with historical TIP822/823 exist and are declared sequential in the main HEADER; both are already in baseline. Do not rewrite old TIPs to create a fake parallel authorization. Recompute this result if another active TIP is introduced.

## Counts and verification

621 explicit paths: 367 create, 253 modify, 1 delete. Modify/delete paths were checked against the working baseline; create paths are planned and absent except the planning documents being created in this phase. No app source file is changed by generating this manifest.

## Execute inventory additions (2026-11-11, same serial lane)

The split removes the old settings JSON import used by six existing tests; redirect fixtures to the public source-messages facade, keeping every assertion. ICU structural comparison is separated from tree traversal. These paths do not overlap any active TIP.

| Action | Exact path | Responsibility |
|---|---|---|
| modify | `apps/admin/src/features/settings/components/renewal-tab.spec.tsx` | Redirect obsolete settings fixture import; preserve assertions. |
| modify | `apps/admin/src/features/settings/components/bank-tab.spec.tsx` | Redirect obsolete settings fixture import; preserve assertions. |
| modify | `apps/admin/src/features/settings/components/audit-log-tab.spec.tsx` | Redirect obsolete settings fixture import; preserve assertions. |
| modify | `apps/admin/src/features/settings/components/app-notify-tab.spec.tsx` | Redirect obsolete settings fixture import; preserve assertions. |
| modify | `apps/admin/src/features/settings/components/app-notify-device.spec.tsx` | Redirect obsolete settings fixture import; preserve assertions. |
| modify | `apps/admin/src/features/settings/components/ai/ai-tab.spec.tsx` | Redirect obsolete settings fixture import and include real ui labels; preserve assertions. |
| create | `apps/admin/src/i18n/tests/icu-contract.ts` | Public IntlMessageFormat AST contract comparison, tests only. |

## Execute inventory additions - presentation and control locale integration

One serial TIP lane; no active file overlap. Exact additional paths:

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/src/i18n/antd/translate-locale.ts` | Strict complete translation of installed AntD locale text; no silent English fallback. |
| create | `apps/admin/src/i18n/ui-labels.spec.tsx` | Live-locale UI label tests and editor/datepicker label contracts. |
| modify | `apps/admin/src/features/affiliate/components/affiliate-pagination.spec.tsx` | Add required i18n provider around newly localized pager; retain existing assertions. |
| modify | `apps/admin/src/features/overview/components/overview-controls.spec.tsx` | Supply the new UI namespace to focused provider fixtures. |

## Execute inventory additions - fallback and renderer fixtures

Exact paths, same serial lane:

| Action | Exact path | Responsibility |
|---|---|---|
| modify | `apps/admin/src/features/overview/components/conversion-table.spec.tsx` | Supply the UI namespace for translated region/count labels; keep existing assertions. |
| create | `apps/admin/src/providers/admin-intl-errors.spec.tsx` | Verify safe readable fallback without raw message keys/ICU variables. |

## Execute inventory additions - raw English catalog verification

Same serial TIP lane, no active overlap.

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/src/i18n/tests/english-catalog.spec.ts` | Fixed explicit raw-English catalog checks before fallback; exact-key exceptions for proper names and canonical syntax only. |

## Execute inventory additions - canonical content boundaries

Sequential extension, checked before editing. These adapters preserve current Vietnamese event defaults, export bytes and email-preview content independently of Admin presentation locale. No server/DB/shared registry changes or overlap with another active implementation.

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/src/features/events/content-defaults.ts` | Stable source-language event default content, not a translated UI label. |
| create | `apps/admin/src/features/events/content-defaults.spec.ts` | Blank/rich-text default and authored content payload regression. |
| create | `apps/admin/src/features/groups/export-content.ts` | Source-language exported headers/cells independent of dialog language. |
| create | `apps/admin/src/features/groups/export-content.spec.ts` | CSV/Excel bytes and raw personal content regression. |
| modify | `apps/admin/src/features/groups/hooks/use-export.ts` | Keep audited export workflow; render exact export-content preview. |
| modify | `apps/admin/src/features/marketing/components/welcome-preview.tsx` | Keep email body preview in current email-contract language, not GUI locale. |
| create | `apps/admin/src/features/marketing/components/welcome-preview.spec.tsx` | Verify unchanged email preview under English Admin provider. |

## Execute inventory additions - AI UI and email-boundary regressions

Sequential extension inspected before editing; all production callers and catalogs are already declared. No parallel implementation or backend changes. New `settings.aiCalls` and four `groups.mod.ai*` source labels are additions only; original524 settings leaves and2456 legacy leaves remain protected separately from additions.

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/src/features/settings/components/ai/ai-call-i18n.spec.tsx` | Live-locale AI filters/columns, canonical filter values and raw provider/model/error/actor data. |
| create | `apps/admin/src/features/groups/components/moderation-i18n.spec.tsx` | Localized moderation action labels with identical action payloads. |
| create | `apps/admin/src/features/settings/components/welcome-preview.spec.tsx` | Localized preview chrome with unchanged Vietnamese email body and authored content. |
| modify | `apps/admin/src/features/settings/components/welcome-preview.tsx` | Keep actual Vietnamese email body distinct from localized preview chrome. |
| create | `apps/admin/src/features/profile/hooks/use-profile-errors.ts` | Keep structured client issues for live locale changes; preserve raw API field errors and hidden-avatar toast behavior. |

## Execute inventory additions - complete shared-control callers

Sequential extension checked before editing; all production control callers are already enumerated above. Preserve domain overrides and callback values; optional shared defaults remain unchanged for Portal. No API/date parser/export changes.

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/src/i18n/date-picker.ts` | Locale/Gregorian display pattern and live Vietnam-calendar presets, without global dayjs selection. |
| create | `apps/admin/src/i18n/date-picker.spec.ts` | All12 locale patterns, VN boundary/month/year, live preset values and unchanged canonical date strings. |
| create | `apps/admin/src/i18n/tests/control-callers.spec.ts` | AST regression for all Admin shared control callers passing translated label props. |
| modify | `apps/admin/src/features/stores/components/stores-header.spec.tsx` | Supply real ui messages after wiring the localized date control; retain assertions. |
| create | `apps/admin/src/features/fees/model.spec.ts` | Locale money/timestamps/null regression with unchanged fee values and actions; no existing domain model suite at this path. |

## Owner-approved execute extension - optional numeric labels (11/11/2026)

Owner answered: “Đồng ý thêm props tùy chọn, giữ nguyên Portal”. No data, calculation, pagination/selection state or callback contract changes. Keep default rendering identical for every existing caller; Admin opts in with its live formatter. Fresh shared-UI/Portal regression and Portal build required.

| Action | Exact path | Responsibility |
|---|---|---|
| modify | `packages/ui/src/pagination/pagination.tsx` | Optional numeric button label formatter, preserve numeric callbacks/default output. |
| modify | `packages/ui/src/bulk-bar/bulk-bar.tsx` | Optional count formatter, preserve selection visibility and callbacks/default output. |
| create | `packages/ui/src/controls-i18n.spec.tsx` | Optional/default rendering and raw numeric callback regression. |
| modify | `apps/admin/src/features/affiliate/tests/context.tsx` | Add real ui catalog to shared provider fixture; preserve existing assertions. |
| create | `coding-packs/reports/evidence/v46-824/build-portal.log` | Actual Portal build after owner-approved shared changes; no Portal business edits. |
| create | `coding-packs/reports/evidence/v46-824/portal-unit.log` | Fresh direct Portal regression, bypassing consumer cache after shared changes. |

## Execute extension - remaining domain display formatters (11/11/2026)

Sequential presentation-only work; existing domain models and their UI callers are already individually declared above. Preserve compact thresholds/rounding, canonical inputs, search/sort, business flags, API/query parameters and export bytes. Invalid display values remain distinct from zero.

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/src/i18n/compact-money.ts` | Locale-aware project/investor compact display with original Vietnamese rounding and currency retained. |
| create | `apps/admin/src/i18n/compact-money.spec.ts` | Original thresholds/rounding and all-locale/null/negative/large currency display regression. |
| create | `apps/admin/src/i18n/tests/domain-formatters.spec.ts` | Cross-domain live display formatting, VN/Gregorian boundary and unchanged parser/export/content contracts. |
| create | `apps/admin/src/i18n/tests/formatter-callers.spec.ts` | AST regression that declared UI formatter callers supply the current locale. |
| modify | `apps/admin/src/features/marketing/components/campaign-table.tsx` | Pass selected locale into campaign display cells; keep action eligibility and DTO values unchanged. |
| modify | `apps/admin/src/features/affiliate/summary-presentation.ts` | Localize display ratio/month-end date, retaining the existing formula and VN calendar. |
| create | `apps/admin/src/features/events/presentation.ts` | Locale date/time projection from canonical timestamps, retaining original vi labels and raw DTOs. |
| create | `apps/admin/src/features/events/presentation.spec.ts` | Event display locale/VN boundary and unchanged raw date/time/payload regression. |
| modify | `apps/admin/src/features/events/components/event-grid.tsx` | Localize event date/time and visible counts only. |
| modify | `apps/admin/src/features/events/components/event-table.tsx` | Localize event date/time and visible counts only. |
| modify | `apps/admin/src/features/events/components/upcoming-block.tsx` | Localize event date/time, mode and visible counts, preserve Meet/content/actions. |
| modify | `apps/admin/src/features/events/components/registrants-drawer.tsx` | Localize event display and visible counts, preserve check-in/export contracts. |
| modify | `apps/admin/src/features/events/components/event-form-fields.tsx` | Localize mode labels/edit-date hint; retain form values and datetime parsing. |

## Execute extension - reproducible self-hosted fonts (11/11/2026)

Sequential Admin-only presentation work. Existing six font/OFL assets, font-config/fonts.css, root layout and REVIEW paths are declared above. No Portal/shared UI edits, runtime CDN or new application dependency. A small merged menu-only font covers the twelve native language names without downloading five full script fonts merely to open the selector; main UI loads Latin plus only the selected script. Build-time FontTools/Brotli live in an isolated external venv, never the runtime dependency graph.

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/public/fonts/LanguageMenu-Regular.woff2` | Licensed merged subset containing only the twelve native language-name glyphs; main UI never uses it. |
| create | `apps/admin/src/i18n/font-assets.json` | Reproducible asset hashes, sizes, actual cmap ranges and pinned upstream provenance; not translated messages. |
| create | `apps/admin/src/i18n/font-config.spec.ts` | Finite locale/script CSS stack map, font receipts/catalog glyph coverage and CSS scoping regression. |
| create | `infra/scripts/build-admin-fonts.py` | Reproducible pinned-upstream conversion/subsetting and actual cmap/byte verification; no project/runtime dependency. |
| create | `coding-packs/reports/evidence/v46-824/fonts.log` | Actual font generation/glyph/hash/size evidence, not browser glyph acceptance. |
| create | `e2e/audit/admin-i18n-fonts.spec.ts` | Same MSW/off font-only browser assertions:12 choices,1440/390, actual custom fonts/no platform fallback, native-name menu subset and selected-script network isolation. Does not count as translated catalog acceptance. |
| create | `e2e/audit/playwright.admin-fonts.config.ts` | Read-only auth-page font audit using isolated configured ports/build outputs; no API fixture/DB seed/reset. |

## Execute extension - complete Simplified Chinese catalog (11/11/2026)

All25 zh catalog paths are already explicitly declared. Reuse Portal translations only for unambiguous exact Vietnamese source matches, translate remaining Admin prose separately, preserve canonical data/examples and ICU contracts. This is one more complete raw bundle, not the final10-bundle gate. No runtime Portal import or translation service. Regenerate the existing SC subset/receipt and extend glyph coverage after adding the catalog.

| Action | Exact path | Responsibility |
|---|---|---|
| create | `apps/admin/src/i18n/tests/chinese-catalog.spec.ts` | Fixed25-file Chinese raw-contract/ICU/copy/NFC checks before fallback; missing bundle/file fails. Other seven absent targets remain explicitly incomplete. |
| create | `coding-packs/reports/evidence/v46-824/zh-auth-msw-1440.png` | Unmasked actual Chinese login screen, MSW desktop; not Profile or Dashboard evidence. |
| create | `coding-packs/reports/evidence/v46-824/zh-auth-msw-390.png` | Unmasked actual Chinese login screen, MSW mobile. |
| create | `coding-packs/reports/evidence/v46-824/zh-auth-server-1440.png` | Same Chinese login assertions/image on mocking-off desktop; no API/DB acceptance claim. |
| create | `coding-packs/reports/evidence/v46-824/zh-auth-server-390.png` | Same Chinese login assertions/image on mocking-off mobile. |

## Indonesian raw catalog checkpoint

Serial follow-up within the same TIP. The25 Indonesian catalog paths above are already declared; context review must distinguish financial reports, abuse reports, open needs, email bodies and bank references. Other six missing targets remain incomplete; no runtime fallback counts as translation.

| Action | Exact path | Ownership / reason |
|---|---|---|
| create | `apps/admin/src/i18n/tests/indonesian-catalog.spec.ts` | Fixed25-file raw contracts before fallback, Admin-context and canonical-copy cases; missing file or key must fail. |

## Local auth/upload error-state follow-up

Serial AC824-10/12 implementation. Store client error codes and translate at render; keep API field/message strings raw, drafts and validation predicates unchanged. No shared LoginPanel change without the separately requested owner clarification.

| Action | Exact path | Ownership / reason |
|---|---|---|
| create | `apps/admin/src/i18n/use-local-errors.ts` | Typed local-code/raw-text error state; live rendering without reverse-matching server messages. |
| create | `apps/admin/src/i18n/use-local-errors.spec.tsx` | Local rerender/clear/raw collision regressions. |
| create | `apps/admin/src/i18n/use-upload-image.ts` | Admin-only localized wrapper around typed local upload failures; API exceptions pass through unchanged. |
| create | `apps/admin/src/i18n/use-upload-image.spec.tsx` | Live-locale/local-kind/raw-API upload boundary and caller coverage tests. |
| create | `apps/admin/src/lib/image-upload-error.ts` | Typed browser/storage-local upload error identity, separate from ApiError. |
| create | `apps/admin/src/lib/upload-image.spec.ts` | Compression/presign/storage contracts and local failure identity. |
| create | `apps/admin/src/features/auth/hooks/use-first-password.ts` | Extract existing hook; preserve strength/equality/session/routing, render local errors from codes. |
| create | `apps/admin/src/features/auth/tests/local-errors.spec.tsx` | Actual auth form/hook draft/error locale-switch regressions and raw API negatives. |
| modify | `apps/admin/src/features/auth/components/first-password-screen.tsx` | Hook extraction facade; no auth-flow redesign. |
| modify | `apps/admin/src/features/auth/components/forgot-screen.tsx` | Local email validation remains live under locale switch. |
| modify | `apps/admin/src/features/auth/components/reset-screen.tsx` | Structured local link/password errors, raw server errors unchanged. |
| modify | `apps/admin/src/features/auth/components/totp-step.tsx` | Local six-digit error code; raw API errors unchanged. |
| modify | `apps/admin/src/features/auth/components/two-factor-form.tsx` | Local six-digit error code; raw API errors unchanged. |
| modify | `apps/admin/src/features/bots/components/persona-drawer.tsx` | Opt into typed local upload error translation; file rules/values unchanged. |
| modify | `apps/admin/src/features/groups/components/group-form.tsx` | Opt into typed local upload error translation; file rules/values unchanged. |
| modify | `apps/admin/src/features/settings/components/logo-picker.tsx` | Opt into typed local upload error translation; immediate logo save semantics unchanged. |

## Owner-approved optional LoginPanel error formatting

Owner explicitly approved optional error formatting for Admin while retaining Portal defaults. The formatter changes displayed errors only; onSubmit returns the same string/undefined contract, drafts, demo-account clearing, pending state and actions remain unchanged. No Portal production file is edited. Shared/UI and fresh Portal regression plus Portal production build are required.

| Action | Exact path | Ownership / reason |
|---|---|---|
| modify | `packages/ui/src/auth/types.ts` | Optional typed formatError prop, default behavior unchanged. |
| modify | `packages/ui/src/auth/login-panel.tsx` | Present formatted error without mutating internal login form state. |
| create | `packages/ui/src/auth/login-panel-i18n.spec.tsx` | Default/raw output, live opt-in formatting, draft/demo/error-clear and callback regressions. |
| modify | `apps/admin/src/features/auth/components/login-screen.tsx` | Retain known client/auth-message provenance; formatter rerenders only known local keys and leaves raw API strings unchanged. |
| create | `e2e/audit/admin-local-errors.spec.ts` | Actual vi/en public-auth local-error/draft/query/hash/cookie checks at1440/390, same assertions in both modes, no submitted API mutations. Not the final all-language/auth suite. |
| create | `e2e/audit/playwright.admin-local-errors.config.ts` | Reuse isolated font-audit startup only; no fixtures/seeds/global database setup. |
| create | `coding-packs/reports/evidence/v46-824/local-errors.log` | Actual same-assertion MSW/off public-auth local-error output; never whole native API acceptance. |
