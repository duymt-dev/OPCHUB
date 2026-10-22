# TIP-V2-560 completion: P5 Bot Admin UI pixel debt

Branch `feature/TIP-V2-560-p5-bot-ui-debt` from `dev` ecc1b687. Native: API 4020, socket
4021, worker, Portal 3280, Admin 3282, `opchub_dev`, Redis db1. MSW: Playwright-owned
`next start` with an MSW build (Admin built with `NEXT_PUBLIC_PORTAL_URL`). Threshold 3%,
pixelmatch 0.1, no mask. Status: emergency bar fixed; P-01-BOTCARD measured; remaining diffs recorded in DV-V2-P5-1.

## Fix 1: emergency bar inset band (P5-BOT-UI-01)

`emergency-bar.module.css`: `.bar` padding 16px → 0. The bar sits inside the bot card,
which already has 20px padding and a 14px gap. The D-50/D-51 controls "Tắt khẩn cấp" and
"Ẩn tin bot" stay visible and enabled, and there is no "Duyệt & đăng" button.

Test `e2e/behavior/bot-ui-debt-emergency.spec.ts` (1440 and 390):
- Native before: 2/2 FAIL, bar 62px > 30.5 (`emergency-before-native.log`)
- Native after: 2/2 PASS (`emergency-after-native.log`)
- MSW after: 6/6 PASS, together with `admin-bots` (`emergency-after-msw.log`)

## Parity (raw, official values)

| State | Native before | Native after | MSW after |
|---|---|---|---|
| D-36 1440 | 6.18% | **2.03% PASS** | **2.05% PASS** |
| D-36 390 | 7.81% | 5.57% | 6.01% |
| D-37 1440 | 8.95% | 6.83% | 6.81% |
| D-37 390 | 7.86% | 6.92% | 6.87% |
| D-38 1440 / 390 | pass | 2.27% / 0.12% | 2.25% / 0.12% |
| D-39 1440 | 10.41% | 7.85% | 7.82% |
| D-39 390 | 11.16% | 9.81% | 9.54% |
| D-40 1440 / 390 | pass | 0.95% / 0.15% | 0.92% / 0.15% |
| D-41 1440 | 31.10% | 6.38% | 20.96% |
| D-41 390 | 10.48% | 25.32% | 17.64% |

The breakdown is in `ui-parity/deviations.md` (TIP-V2-560 section under DV-V2-P5-1). After
removing only the spec-required emergency band (40px net), the remainder is D-37 1.47–1.53%,
D-39 1.89–2.66% and D-36 390 4.04–4.13%. The rest is required copy and tab wrapping. D-41
height comes from live worker thread count and can't be split by bands. All FAIL values are
kept, none were turned into PASS. D-38 and D-40 still pass.

## P-01-BOTCARD (owner chose the seed fixture)

- `packages/db/seed/demo/bot-history.ts` and `seed:demo -- --bot-history`: persist the two `done`
  demo threads as real bot messages (same as MSW `seedMockBotHistory`). The `scheduled` thread
  stays pending one script delay. This is opt-in; default demo data is unchanged.
- `e2e/parity/types.ts` and `parity.spec.ts`: a new `capture` option (same locator on both sides).
  `server/test.ts`: the `bot-history` demo annotation selects that seed. These files are outside
  the TIP's Files touched list; the owner approved this approach.

| Viewport | Native | MSW |
|---|---|---|
| 1440 | **3.00% PASS** in 5 of 6 runs. Run 3 was 51.03% because 2 live worker openings entered the 10s cache window; this did not recur in runs 4–6 | **3.00% PASS** |
| 390 | 7.49% (6/6 runs, same value) | 7.34% |

The 390 residual comes from data, not card layout. The prototype's group text wraps two
destinations; the app shows only the first, as MSW history does. The relative time also differs.
I recorded this in DV-V2-P5-1 and the FAIL stays FAIL.

## Gates

`pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` exit 0 (`gates.log`): admin
451, portal 317, ui 47 tests.

## Native HOLD

Demo restored (`restore-demo.log`: seed, seed:demo --affiliate, flush all exited 0). API
`/v1/health`, Portal and Admin `/login` return 200.
