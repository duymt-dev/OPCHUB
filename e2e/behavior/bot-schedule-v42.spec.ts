import { botScheduleResponseSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { openBots } from './helpers/bot-ui';

for (const width of [1440, 390]) {
  test(`D-112 bot schedule/pause/reload/clear/resume at ${width}px`, async ({ page }) => {
    await openBots(page);
    await page.setViewportSize({ width, height: 900 });
    const scope = page.getByRole('region', { name: 'Lịch chạy bot', exact: true });
    const from = scope.getByLabel('Từ ngày');
    const to = scope.getByLabel('Đến ngày');
    const toggle = page.getByRole('switch', { name: 'Chế độ tự động', exact: true });
    const response = page.waitForResponse(
      (r) => r.url().endsWith('/admin/bot/schedule') && r.request().method() === 'PATCH',
    );
    await scope.getByRole('button', { name: 'Tạm dừng bot', exact: true }).click();
    expect(botScheduleResponseSchema.parse(await (await response).json()).schedule.paused).toBe(
      true,
    );
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(from).toBeEnabled();
    await from.fill('2099-01-01');
    await expect(from).toHaveValue('2099-01-01');
    await expect(to).toBeEnabled();
    await to.fill('2100-01-01');
    await expect(scope.getByText('Lịch chạy: 01/01/2099 → 01/01/2100')).toBeVisible();
    await expect(scope.getByRole('button', { name: 'Chạy lại bot' })).toBeEnabled();
    await page.reload();
    await expect(from).toHaveValue('2099-01-01');
    await expect(to).toHaveValue('2100-01-01');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await scope.getByRole('button', { name: 'Xóa lịch' }).click();
    await expect(from).toHaveValue('');
    await expect(to).toHaveValue('');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(scope.getByRole('button', { name: 'Chạy lại bot' })).toBeEnabled();
    await scope.getByRole('button', { name: 'Chạy lại bot' }).focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(scope.getByRole('button', { name: 'Tạm dừng bot' })).toBeEnabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
