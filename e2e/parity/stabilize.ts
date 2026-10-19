import type { BrowserContext, Page } from '@playwright/test';
import { PNG } from 'pngjs';

/** Giờ cố định cho mọi ảnh chụp (ui-parity.md) */
export const FIXED_TIME = new Date('2026-10-16T09:00:00+07:00');

const EXTERNAL_IMAGE =
  /(images\.unsplash\.com|picsum\.photos|randomuser\.me|flagcdn\.com|maps\.googleapis\.com|maps\.gstatic\.com)/;
const FONT_CDN = /(fonts\.googleapis\.com|fonts\.gstatic\.com)/;

/** Ảnh thay thế 8×8 một màu, giống hệt ở hai bên */
const placeholder = (() => {
  const png = new PNG({ width: 8, height: 8 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0xb8;
    png.data[i + 1] = 0xc4;
    png.data[i + 2] = 0xd2;
    png.data[i + 3] = 0xff;
  }
  return PNG.sync.write(png);
})();

/** Math.random có seed (mulberry32) — prototype dùng random cho bộ mô phỏng */
const SEED_RANDOM = `(() => {
  let s = 0x2f6e2b1;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

const FREEZE_CSS = `
*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}
`;

/**
 * Đồng hồ giả bị **dừng** tại FIXED_TIME: setInterval 3 s của bộ mô phỏng không chạy,
 * toast 2,2 s đứng yên → chụp được lúc toast đang hiện. Muốn thời gian trôi: page.clock.runFor().
 */
export async function stabilize(ctx: BrowserContext) {
  await ctx.clock.install({ time: FIXED_TIME });
  await ctx.clock.pauseAt(FIXED_TIME);
  await ctx.addInitScript(SEED_RANDOM);
  await ctx.route(EXTERNAL_IMAGE, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: placeholder }),
  );
  await ctx.route(FONT_CDN, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
}

/** Gọi ngay trước khi chụp */
export async function settle(page: Page) {
  // API thật trả dữ liệu không đồng bộ (MSW gần như tức thì) → đợi hết request rồi mới chụp
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = Array.from(document.images).filter((i) => !i.complete);
    await Promise.all(
      imgs.map((i) => new Promise((r) => i.addEventListener('load', r, { once: true }))),
    );
  });
  await page.mouse.move(0, 0);
}
