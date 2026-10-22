# Branded HTML emails — implementation and verification

Date: 2026-10-22. Branch: `feature/branded-html-emails`, based on `dev` at `959ce399`.

## Scope

Owner request: improve email formatting to match OPCHUB's colors.

- Shared, dependency-free HTML layout in `apps/server/src/modules/mail/email-layout.ts`.
- Palette matches UI tokens: primary `#1677FF`, navy `#0B1F4D`, background `#F3F8FF`.
- White content card, official website logo header, prominent selectable OTP, consistent CTA buttons.
- Table-based layout, inline core styles, 600px maximum width, mobile spacing, UTF-8,
  Vietnamese language, hidden title preheader and Outlook conditional width wrapper.
- Applied to OTP, email change, password reset (both portals), welcome, admin account,
  fee reminders, event registration/reminders, service requests, SMTP tests, campaign
  delivery and reconstruction of previously sent campaigns.
- No new dependency, database migration, environment variable, provider or queue change.
- Existing subjects, business copy, TTLs, configured links, attachments, fee notices,
  escaping, marketing variable replacement and new-campaign unsubscribe footer retained.

## Preview

- [Welcome email HTML](evidence/branded-html-emails/welcome.html)
- [Welcome desktop screenshot](evidence/branded-html-emails/welcome-800.png)
- [OTP email HTML](evidence/branded-html-emails/otp.html)
- [OTP mobile screenshot](evidence/branded-html-emails/otp-360.png)
- [Browser measurements](evidence/branded-html-emails/visual-results.json)

Preview content uses fake values only. Chromium renders of OTP, welcome, password reset
and event emails at 360px and 800px: **8/8** without horizontal overflow, each with one H1.
Desktop welcome and mobile OTP screenshots were visually inspected. This does not certify
actual Gmail/Outlook rendering; mailbox-client acceptance is still required.

### Owner follow-up: use the real OPCHUB logo

Replaced the text-built header with the website's dark-background logo:
`https://opchub.community/assets/logo-opchub-white.png`.
Verified the public URL returns HTTP 200 and `image/png`, then inspected the image.
The Portal/Admin/prototype also share a logo asset, but their app-relative URL is not
the current public website asset URL. No image was generated or altered.
The same bytes are included at `apps/portal/public/assets/logo-opchub-white.png`, so the
email URL stays available when the Next.js Portal is deployed on the public domain.

The image uses an absolute HTTPS URL, 240px display width, responsive sizing and descriptive
alt text. All eight preview renders loaded the real remote logo and retained no horizontal
overflow. The HTML/screenshots/measurements linked above reflect this update. Mail clients
may still block remote images until the recipient permits them; body text, OTP and CTA
remain independent of the image. Prior E2E findings below remain open.

## Verification

| Command/check | Result |
| --- | --- |
| `pnpm lint` | PASS, existing frontend warnings remain |
| `pnpm typecheck` | PASS |
| `pnpm test` | 1,496 passed, 2 skipped; server 228 passed |
| `pnpm depcheck` | PASS, no dependency violations |
| `pnpm --filter @opchub/server test -- src/modules/mail src/modules/marketing/domain/personalize.spec.ts` | 26 passed |
| `pnpm --filter @opchub/server test:int -- test/mail test/account/password.int.spec.ts test/contract/mail.int.spec.ts test/marketing` | 43 passed, 7 files |
| `pnpm --filter @opchub/e2e e2e -- auth-flows.spec.ts --grep 'UAT-11\|D-62' --workers=1` | 2 failed, see below |

Integration tests use the existing isolated test database and fake mail provider.
Assertions cover branded SMTP/welcome/event delivery, password-reset token and expiry,
campaign personalization and campaign resend layout. The existing reset integration flow
reads the token from FakeMail, resets the password and verifies login/token reuse rules.

### Remaining verification / limitations

- MSW E2E used the existing Next builds: UAT-11 timed out waiting for the exact
  `Đăng nhập` button; D-62 could not find `Liên kết có hiệu lực trong 15 phút.` after
  requesting a reset. Assertions were not weakened and frontend code was not changed.
  This run does not verify the new server-rendered emails. See `e2e-msw.log` in evidence.
- Native browser E2E was not run: a matching API/worker/frontend test environment for
  this revision was not brought up. Existing running services and demo data were not reset.
- Gmail/Outlook inbox tests and actual SMTP delivery were not performed; no real mail sent.
- Admin/Portal in-app welcome preview components were not redesigned in this backend task.
- Already queued/failed messages retain their stored HTML; no historical mail migration.
- Pre-existing campaign resend behavior uses saved campaign body without re-personalizing
  or rebuilding its unsubscribe footer. This task adds layout only to that path; changing
  that behavior requires a separate scoped fix. New campaign delivery retains its footer.

Code is ready for review, not production/E2E sign-off. No merge to `dev`/`main` or deployment
performed. To verify visually, open the preview HTML above. After deploying, use Admin's
welcome/SMTP test actions to inspect an actual mailbox before rollout.
