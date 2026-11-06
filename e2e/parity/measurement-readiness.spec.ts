import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { settleScrollAtTop } from './scroll-position';
import { PORTAL_ONBOARDING } from './scenarios/portal-onboarding';
import { PORTAL_SHELL } from './scenarios/portal-shell';

test('Dashboard onboarding measures the complete same page scope as Dashboard', () => {
  const onboarding = PORTAL_ONBOARDING.find((s) => s.id === 'P-119');
  const dashboard = PORTAL_SHELL.find((s) => s.id === 'P-01');
  expect(onboarding).toBeDefined();
  expect(onboarding?.fullPage).toBe(true);
  expect(onboarding?.capture).toBeUndefined();
  expect(onboarding?.demo).toBe(dashboard?.demo);
  expect(onboarding?.fullPage).toBe(dashboard?.fullPage);
});

test('paused-clock queued smooth scroll settles to zero without clipping content', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-16T02:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-16T02:00:01Z'));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.setContent(`<style>body{margin:0}main{height:3000px;background:white}
      header{height:20px;background:green}footer{height:20px;background:red}</style>
      <header></header><main></main><footer></footer>`);
    await page.evaluate(() => {
      requestAnimationFrame(() => window.scrollTo({ top: 980, behavior: 'smooth' }));
      setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 50);
    });
    await settleScrollAtTop(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
    expect([png.width, png.height]).toEqual([width, 3040]);
    const bottom = ((png.height - 1) * png.width + 1) * 4;
    expect([...png.data.subarray(bottom, bottom + 4)]).toEqual([255, 0, 0, 255]);
  }
});
