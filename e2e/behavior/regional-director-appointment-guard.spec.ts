import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

for (const width of [390, 1440]) {
  test(`REQ-616 full director slots show feedback and canceling revoke writes nothing at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=gcfg`);
    const cards = page.getByRole('article');
    await expect(cards).toHaveCount(3);
    const north = page.getByRole('article', { name: 'Miền Bắc', exact: true });
    await expect(north).toContainText('Trần Quốc Bảo');
    const account = north.getByRole('textbox', { name: 'Số tài khoản', exact: true });
    await expect(account).toHaveValue('001100104567');
    const writes: string[] = [];
    page.on('request', (request) => {
      if (
        new URL(request.url()).pathname.includes('/admin/gdv') &&
        ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())
      ) {
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
      }
    });

    await page.getByRole('button', { name: '+ Bổ nhiệm GĐ Vùng', exact: true }).click();
    await expect(
      page.getByText(
        'Cả ba vùng đã có người phụ trách. Thu hồi người đương nhiệm trước khi bổ nhiệm người khác.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await north.getByRole('button', { name: 'Thu hồi', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Thu hồi GĐ Vùng Trần Quốc Bảo?' });
    await expect(dialog).toContainText('Giữ nguyên hạn phí trước bổ nhiệm');
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(cards).toHaveCount(3);
    await expect(north).toContainText('Trần Quốc Bảo');
    await expect(account).toHaveValue('001100104567');
    expect(writes).toEqual([]);
  });
}
