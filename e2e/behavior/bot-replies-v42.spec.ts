import {
  botReplyOverviewSchema,
  botReplyScanResultSchema,
  botReplySettingsSchema,
} from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { botTab } from './helpers/bot-ui';
import { prepareReplyParticipants } from './helpers/bot-participants';

test.use({ botManual: true });

for (const width of [1440, 390]) {
  test(`D-112 reply controls persist and manual auto-off run stops at ${width}px`, async ({
    page,
  }) => {
    const prepared = await prepareReplyParticipants(page);
    await page.setViewportSize({ width, height: 900 });
    await botTab(page, 'Trả lời từng tin');
    await expect(page).toHaveURL(/\/bots\/replies$/);
    const scope = page.getByRole('region', {
      name: 'AI tự chọn nhóm và trả lời từng tin',
      exact: true,
    });
    const auto = scope.getByRole('switch', { name: 'Tự động', exact: true });
    await expect(auto).toHaveAttribute('aria-checked', 'false');
    for (const [label, key, value] of [
      ['Số tin gần nhất cần đọc', 'sampleSize', 60],
      ['Giãn cách giữa 2 phản hồi (giây)', 'delaySeconds', 60],
    ] as const) {
      const input = scope.getByLabel(label);
      await expect(input).toBeEnabled();
      const response = page.waitForResponse(
        (r) => r.url().endsWith('/bot/replies/settings') && r.request().method() === 'PATCH',
      );
      await input.fill(String(value));
      await input.press('Tab');
      expect(botReplySettingsSchema.parse(await (await response).json())[key]).toBe(value);
      await expect(input).toBeEnabled();
    }
    await page.reload();
    await expect(scope.getByLabel('Số tin gần nhất cần đọc')).toHaveValue('60');
    await expect(scope.getByLabel('Giãn cách giữa 2 phản hồi (giây)')).toHaveValue('60');
    await expect(auto).toHaveAttribute('aria-checked', 'false');
    await prepared.toggle('Chế độ tự động', true);
    const scanning = page.waitForResponse(
      (r) => r.url().endsWith('/bot/replies/scan') && r.request().method() === 'POST',
    );
    await scope.getByRole('button', { name: 'Quét & trả lời ngay' }).click();
    const response = await scanning;
    expect(response.status()).toBe(202);
    const run = botReplyScanResultSchema.parse(await response.json()).run;
    expect(run).toMatchObject({ status: 'running', manual: true, processed: 0, posted: 0 });
    await expect(scope.getByRole('status')).toContainText('Đang trả lời');
    await page.reload();
    await expect(scope.getByRole('status')).toContainText('Đang trả lời');
    const stopping = page.waitForResponse(
      (r) => r.url().endsWith(`/bot/replies/${run?.id}/stop`) && r.request().method() === 'POST',
    );
    await scope.getByRole('button', { name: 'Dừng lượt trả lời' }).click();
    expect(botReplyScanResultSchema.parse(await (await stopping).json()).run).toMatchObject({
      id: run?.id,
      status: 'stopped',
      posted: 0,
    });
    await expect(scope.getByRole('status')).toContainText('Đã dừng');
    await page.reload();
    // Observe a fresh poll after navigation, not the old document's invalidation response.
    const reloading = page.waitForResponse(
      (r) => r.url().endsWith('/bot/replies') && r.request().method() === 'GET',
    );
    expect(botReplyOverviewSchema.parse(await (await reloading).json()).run).toMatchObject({
      id: run?.id,
      status: 'stopped',
      posted: 0,
    });
    await expect(scope.getByRole('status')).toContainText('Đã dừng');
    await expect(scope.getByRole('button', { name: 'Quét & trả lời ngay' })).toBeEnabled();
    await expect(auto).toHaveAttribute('aria-checked', 'false');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
