import type { BrowserContext, Page } from '@playwright/test';
import { PNG } from 'pngjs';

/** Giờ cố định cho mọi ảnh chụp (ui-parity.md) */
export const FIXED_TIME = '2026-10-16T09:00:00+07:00';

const EXTERNAL_IMAGE =
  /(images\.unsplash\.com|randomuser\.me|flagcdn\.com|maps\.googleapis\.com|maps\.gstatic\.com)/;
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

const FREEZE_CSS = `
*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}
`;

/** Chặn ảnh ngoài, chặn font CDN (cả hai bên dùng font hệ thống), cố định giờ */
export async function stabilize(ctx: BrowserContext) {
  await ctx.clock.setFixedTime(new Date(FIXED_TIME));
  await ctx.route(EXTERNAL_IMAGE, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: placeholder }),
  );
  await ctx.route(FONT_CDN, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
}

/** Gọi ngay trước khi chụp */
export async function settle(page: Page) {
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
