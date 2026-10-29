import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { captureElement } from './capture-element';
import { compare } from './compare';

const options = { animations: 'disabled' as const, caret: 'hide' as const };

test('region capture preserves the complete box at fractional origins', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`<style>
    body { margin: 0 }
    section { position: absolute; top: 100.1px; left: 12px; width: 366px; height: 202px;
      box-sizing: border-box; border: 1px solid black; background: white; }
    span { position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background: red; }
  </style><section><span></span></section>`);
  const region = page.locator('section');
  const first = await captureElement(page, region, options);
  await region.evaluate((el) => {
    el.style.top = '100.9px';
  });
  const second = await captureElement(page, region, options);
  const png = PNG.sync.read(first);
  expect([png.width, png.height]).toEqual([366, 202]);
  expect(compare(first, second).diffPct).toBe(0);
  // A real content change must remain measurable; no mask or pixel normalization is used.
  await region.locator('span').evaluate((el) => {
    el.style.background = 'blue';
  });
  expect(compare(first, await captureElement(page, region, options)).diffPct).toBeGreaterThan(0);
});

test('oversized regions retain full-element capture, including the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(
    '<style>body{margin:0}section{width:300px;height:1000px;background:red}</style><section></section>',
  );
  const image = PNG.sync.read(await captureElement(page, page.locator('section'), options));
  expect([image.width, image.height]).toEqual([300, 1000]);
  const pixel = (999 * image.width + 299) * 4;
  expect([...image.data.subarray(pixel, pixel + 4)]).toEqual([255, 0, 0, 255]);
});
