import { expect, test } from '../server/test';
import type { Browser } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '../env';
import { compare } from './compare';
import { OUT_DIR, PROTO_DIR, RESULTS_DIR } from './paths';
import { selectScenarios } from './registry';
import { settle, stabilize } from './stabilize';
import { begin } from './steps';
import type { Scenario, Side, StepCtx, Viewport } from './types';

const MAX_DIFF_PCT = 3;
const HEIGHT: Record<Viewport, number> = { 1440: 900, 1366: 768, 390: 844 };

/** PARITY_MODE=proto-only: chỉ chạy chuỗi thao tác trên prototype, chụp ảnh gốc */
const PROTO_ONLY = env.PARITY_MODE === 'proto-only';

test.describe.configure({ mode: 'parallel' });

async function shoot(browser: Browser, s: Scenario, side: Side, vw: Viewport) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: HEIGHT[vw] } });
  await stabilize(ctx);
  if (side === 'app' && s.demo === 'affiliate') {
    await ctx.addCookies([
      {
        name: 'opchub-mock-affiliate-demo',
        value: '1',
        url: `http://localhost:${env.PORTAL_PORT}`,
      },
    ]);
  }
  const page = await ctx.newPage();
  const c: StepCtx = { page, side, vw };
  try {
    await begin(c, s);
    if (s.steps) await s.steps(c);
    await settle(page);
    return await page.screenshot({
      fullPage: s.fullPage ?? false,
      animations: 'disabled',
      caret: 'hide',
      ...(s.mask ? { mask: s.mask.selector(c), maskColor: '#FF00FF' } : {}),
    });
  } finally {
    await ctx.close();
  }
}

for (const s of selectScenarios()) {
  for (const vw of s.viewports ?? ([1440, 390] as const)) {
    const title = `${s.id} ${s.name} @${vw}`;
    const base = `${s.id}-${vw}`;

    if (PROTO_ONLY) {
      test(title, async ({ browser }) => {
        test.skip(Boolean(s.unreachable), s.unreachable);
        const png = await shoot(browser, s, 'proto', vw);
        mkdirSync(PROTO_DIR, { recursive: true });
        writeFileSync(join(PROTO_DIR, `${base}.png`), png);
      });
      continue;
    }

    test(
      title,
      { annotation: s.demo ? { type: 'demo', description: s.demo } : [] },
      async ({ browser }) => {
        test.skip(Boolean(s.unreachable), s.unreachable);
        const proto = await shoot(browser, s, 'proto', vw);
        const app = await shoot(browser, s, 'app', vw);
        const r = compare(proto, app);

        mkdirSync(OUT_DIR, { recursive: true });
        mkdirSync(RESULTS_DIR, { recursive: true });
        writeFileSync(join(OUT_DIR, `${base}.proto.png`), proto);
        writeFileSync(join(OUT_DIR, `${base}.app.png`), app);
        writeFileSync(join(OUT_DIR, `${base}.diff.png`), r.diff);
        writeFileSync(
          join(RESULTS_DIR, `${base}.json`),
          JSON.stringify({
            id: s.id,
            name: s.name,
            viewport: vw,
            diffPct: r.diffPct,
            size: `${r.width}×${r.height}`,
            ...(s.mask ? { mask: s.mask.reason } : {}),
          }),
        );
        expect(r.diffPct, `${base} chênh ${r.diffPct.toFixed(2)}%`).toBeLessThanOrEqual(
          MAX_DIFF_PCT,
        );
      },
    );
  }
}
