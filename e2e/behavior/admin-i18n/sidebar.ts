import type { Locator } from '@playwright/test';
import { expect } from './fixtures';

/** Page width can pass while nowrap text/badges extend beyond a clipped sidebar. */
export async function assertSidebarLabels(
  sidebar: Locator,
): Promise<{ rows: number; wrapped: number }> {
  const links = sidebar.locator(':scope > nav > a');
  expect(await links.count()).toBeGreaterThan(10);
  let badges = 0;
  let wrapped = 0;
  for (const link of await links.all()) {
    await link.scrollIntoViewIfNeeded();
    const metrics = await link.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const label = element.querySelector(':scope > span:first-of-type');
      if (!label) throw new Error('Sidebar link has no label');
      const range = document.createRange();
      range.selectNodeContents(label);
      const text = [...range.getClientRects()].map((box) => ({
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
      }));
      const badge = element.querySelector(':scope > span:nth-of-type(2)');
      const badgeBox = badge?.getBoundingClientRect();
      const icon = element.querySelector(':scope > svg')?.getBoundingClientRect();
      return {
        href: element.getAttribute('href'),
        label: label.textContent,
        text,
        link: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
        badge: badgeBox
          ? { left: badgeBox.left, right: badgeBox.right, width: badgeBox.width }
          : null,
        icon: icon ? { left: icon.left, right: icon.right, width: icon.width } : null,
      };
    });
    const context = JSON.stringify(metrics);
    if (metrics.text.length > 1) wrapped++;
    expect(metrics.text.length, context).toBeGreaterThan(0);
    for (const line of metrics.text) {
      expect(line.left, context).toBeGreaterThanOrEqual(metrics.link.left);
      expect(line.right, context).toBeLessThanOrEqual(metrics.link.right);
      expect(line.top, context).toBeGreaterThanOrEqual(metrics.link.top);
      expect(line.bottom, context).toBeLessThanOrEqual(metrics.link.bottom);
      if (metrics.badge) expect(line.right, context).toBeLessThanOrEqual(metrics.badge.left);
    }
    expect(metrics.icon?.width, context).toBe(19);
    expect(metrics.icon?.left, context).toBeGreaterThanOrEqual(metrics.link.left);
    if (metrics.badge) {
      badges++;
      expect(metrics.badge.width, context).toBeGreaterThan(14);
      expect(metrics.badge.right, context).toBeLessThanOrEqual(metrics.link.right);
    }
  }
  expect(badges, 'Seeded Admin sidebar must contain real badges').toBeGreaterThan(0);
  await sidebar.locator(':scope > nav').evaluate((nav) => {
    nav.scrollTop = 0;
  });
  await sidebar.evaluate((aside) => {
    aside.scrollTop = 0;
  });
  return { rows: await links.count(), wrapped };
}
