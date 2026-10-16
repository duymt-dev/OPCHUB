import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compare } from './compare';
import { OUT_DIR, RESULTS_DIR } from './paths';
import { SCREENS, VIEWPORTS } from './screens';
import { settle, stabilize } from './stabilize';

const MAX_DIFF_PCT = 3;

for (const screen of SCREENS) {
  for (const vp of VIEWPORTS) {
    test(`${screen.id} ${screen.name} @${vp.width}`, async ({ browser }) => {
      const shoot = async (run: typeof screen.proto) => {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
        await stabilize(ctx);
        const page = await ctx.newPage();
        await run(page);
        await settle(page);
        const png = await page.screenshot({
          fullPage: screen.fullPage,
          animations: 'disabled',
          caret: 'hide',
        });
        await ctx.close();
        return png;
      };

      const proto = await shoot(screen.proto);
      const app = await shoot(screen.app);
      const r = compare(proto, app);

      const base = `${screen.id}-${vp.width}`;
      mkdirSync(OUT_DIR, { recursive: true });
      mkdirSync(RESULTS_DIR, { recursive: true });
      writeFileSync(join(OUT_DIR, `${base}.proto.png`), proto);
      writeFileSync(join(OUT_DIR, `${base}.app.png`), app);
      writeFileSync(join(OUT_DIR, `${base}.diff.png`), r.diff);
      writeFileSync(
        join(RESULTS_DIR, `${base}.json`),
        JSON.stringify({
          id: screen.id,
          name: screen.name,
          viewport: vp.width,
          diffPct: r.diffPct,
          size: `${r.width}×${r.height}`,
        }),
      );

      expect(r.diffPct, `${base} chênh ${r.diffPct.toFixed(2)}%`).toBeLessThanOrEqual(MAX_DIFF_PCT);
    });
  }
}
