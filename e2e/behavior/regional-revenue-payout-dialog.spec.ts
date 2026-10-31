import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [1440, 390]) {
  test(`REQ-617 payout confirmation cancels without writes or lost history at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.getByRole('tab', { name: /^GĐ Vùng 3$/ }).click();
    const identity = page.getByRole('button', { name: /Trần Quốc Bảo/ });
    await identity.click();
    const ledger = page.getByRole('region', { name: 'Khoản ghi nhận cho GĐ Vùng', exact: true });
    const history = page.getByRole('region', { name: 'Lịch sử chi trả', exact: true });
    await expect(ledger.getByRole('row')).toHaveCount(9);
    await expect(history).toContainText('TRAN QUOC BAO');
    const beforeLedger = await ledger.innerText();
    const beforeHistory = await history.innerText();
    let posts = 0;
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        /\/admin\/affiliate\/revenue\/[^/]+\/payouts$/.test(request.url())
      )
        posts++;
    });
    const open = identity.locator('../..').getByRole('button', { name: 'Chi trả', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Chi trả GĐ Vùng', exact: true });
    for (const dismissal of ['escape', 'close']) {
      await open.click();
      await expect(dialog).toContainText('TRAN QUOC BAO · Vietcombank · 001100104567');
      const month = dialog.getByRole('combobox', { name: 'Kỳ chi', exact: true });
      await expect(month).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Chi trả', exact: true })).toBeDisabled();
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(posts).toBe(0);
      if (dismissal === 'escape') await page.keyboard.press('Escape');
      else
        await dialog
          .getByRole('button', { name: 'Đóng', exact: true })
          .filter({ hasText: 'Đóng' })
          .click();
      await expect(dialog).toBeHidden();
      expect(posts).toBe(0);
      await expect(ledger).toHaveText(beforeLedger, { useInnerText: true });
      await expect(history).toHaveText(beforeHistory, { useInnerText: true });
    }
    await page.reload();
    await identity.click();
    await expect(ledger).toHaveText(beforeLedger, { useInnerText: true });
    await expect(history).toHaveText(beforeHistory, { useInnerText: true });
    expect(posts).toBe(0);
  });
}
