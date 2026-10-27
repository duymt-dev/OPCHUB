import { expect, test } from '../server/test';
import { openBots } from './helpers/bot-ui';

/** D-36..D-41 TIP-V2-560: spec emergency controls (D-50/D-51) stay, without a padded extra band. */
for (const width of [1440, 390]) {
  test(`D-36 D-37 D-39 D-41 P5-BOT-UI-01 emergency controls sit in the card rhythm at ${width}px`, async ({
    page,
  }) => {
    // Sign in on the desktop sidebar, then measure at the target width (390 uses a drawer).
    await openBots(page);
    await page.setViewportSize({ width, height: 900 });
    const bar = page.getByRole('region', { name: 'Thao tác khẩn cấp bot', exact: true });
    const stop = bar.getByRole('button', { name: 'Tắt khẩn cấp', exact: true });
    const hide = bar.getByRole('button', { name: 'Ẩn tin bot', exact: true });
    const more = bar.getByRole('button', { name: 'Thao tác khẩn cấp', exact: true });
    if (width < 768) {
      // D-91 (4): ≤ 767px thanh thu vào nút ⋯ ở góc thẻ — mở mới thấy 2 nút, chức năng giữ nguyên
      await expect(stop).toBeHidden();
      await expect(more).toHaveAttribute('aria-expanded', 'false');
      await more.click();
      await expect(more).toHaveAttribute('aria-expanded', 'true');
    } else await expect(more).toBeHidden();
    // Required controls are kept visible and usable, and no approval action returns.
    await expect(stop).toBeVisible();
    await expect(stop).toBeEnabled();
    await expect(hide).toBeVisible();
    await expect(hide).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Duyệt & đăng' })).toHaveCount(0);
    const tabs = page.getByRole('tablist', { name: 'Bot tương tác', exact: true });
    if (width < 768) {
      // Menu nằm trong khung nhìn, không chiếm hàng riêng giữa thẻ
      for (const b of [stop, hide, more]) {
        const box = (await b.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      await stop.click();
      await expect(page.getByRole('dialog', { name: 'Tắt khẩn cấp', exact: true })).toBeVisible();
      return;
    }
    const [barBox, stopBox, tabsBox] = await Promise.all([
      bar.boundingBox(),
      stop.boundingBox(),
      tabs.boundingBox(),
    ]);
    if (!barBox || !stopBox || !tabsBox) throw new Error('Emergency bar and tabs must be laid out');
    // The bar is only as tall as its 30px buttons and keeps the card's 14px gap to the tabs.
    expect(barBox.height).toBeLessThanOrEqual(stopBox.height + 0.5);
    expect(stopBox.height).toBeLessThanOrEqual(30.5);
    expect(tabsBox.y - (barBox.y + barBox.height)).toBeLessThanOrEqual(14.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
