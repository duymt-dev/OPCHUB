# V46-801 — director sidebar layout (PARTIAL)

Source `8b1f0a13`, committed/pushed. Previous goal turn was a status-only
response (no progress); this continuation revalidated the worktree, reread
AGENTS/whole GOAL/progress and made a measured Portal-only correction.

## Actual geometry and correction

The unchanged Bảo-login/sidebar journey was measured at1440/390 with the
standard clock/font/image stabilization and disabled-animation screenshot.
Prototype markup/state/baselines, capture area and3% threshold are unchanged.

- Prototype fee card is223px tall at both widths. Exemption previously reduced
  the app card to168px, shifting its header and pricing control. The exempt
  card now retains223px minimum height,12px separation from navigation and
  bottom-aligned pricing; ordinary cards/shared AppShell/Admin are untouched.
- At390, measured app and prototype card bounds now match: y637,height223;
  pricing button y811,height34. No empty controls, fake expiry or renewal CTA.
- Onboarding remains truthfully different: prototype personal-profile
  completion only checks transient `profSaved/meAvatar`, while its event
  completion checks global `regs` seeded with e2. App/native use actual member
  profile and that member's registrations. For Bảo the app profile is complete,
  no event is registered and store is next. Profile CTA versus completed tag
  changes mobile row height by17px; subsequent rows and next-step styling differ.
  Do not falsify profile/events or replace this default journey with a prepared
  easier state to get a passing image. See Q-V46-801-11.

## Verification

- Related PlanBadge unit6/6; root lint/typecheck8/8 each, unit2085 passed plus
  two existing S3 skips (Portal418 fresh), depcheck2280+1008 clean. Final root
  precommit sequence reran after the browser assertion edit (unit cache valid).
- Portal MSW build `.next-v46-msw-build` and native `.next-server` both passed.
  One initial build invocation used invalid mocking value `enabled`; env-schema
  validation rejected it. Corrected to `msw` and rebuilt successfully; no env
  files changed. Native build uses proxy127.0.0.1:4000/socketlocalhost:4001.
- Complete MSW membership/shell/director Portal files:13/13,37.4s. Native
  director Portal file:1/1,17.4s, same assertions including desktop/mobile
  footer geometry, truthful exemption, pricing access and paid fundraising.
- Initial unmasked sidebar parity: desktop1.378639% PASS, mobile5.100539% FAIL
  (previous1.346257%/5.624571%). This is improvement, **not** acceptance.
  Post-commit all-three-director-state parity:7 passed/1 failed,22.8s,exit1;
  six full-page visual rows plus two harness cases. Source SHA8b1f0a13 recorded
  by the actual reporter; mobile remains FAIL, not a flaky-pass claim.

| State            |           1440 |            390 |
| ---------------- | -------------: | -------------: |
| Director sidebar | 1.378639% PASS | 5.088243% FAIL |
| Director billing | 0.901775% PASS | 1.987733% PASS |
| Director pricing | 1.041830% PASS | 1.481406% PASS |

Post-commit log: `v46-801-sidebar-parity-8b1f0a13.log`. Initial versus final
mobile score varies slightly without state/harness changes; neither passes.
Required seed, demo seed and dev-cache flush all exit0 after native checks;
held API28484/socket33408/worker16200 retain their original start times.

Ignored local logs: `e2e/.parity-out/v46-801-sidebar-{unit,precommit,
precommit-final,build,build-msw,native-build,msw,native,parity,restore}.log`;
read-only geometry JSON/log retained, temporary measurement specs removed.

Backend/shared/seed unchanged: integration1894/1894 at302174ed remains relevant.
The previous full MSW342/4 existing skips predates changed Portal CSS; final
frontend regression still required. API/socket/worker native HOLD is retained;
no server binary rebuild. TIP801 remains IN PROGRESS;802 not started.
