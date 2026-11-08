import { readFile } from 'node:fs/promises';
import { myRegionSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { directorSession } from './helpers/director-session';

test.use({ affiliateDemo: true });
for (const width of [1440, 390]) {
  test(`TIP-V46-821 regional affiliate table exports private audited CSV at${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await directorSession(page);
    const pending = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/v1/me/gdv' && r.request().method() === 'GET',
    );
    await page.goto(`${PORTAL_URL}/affiliate?tab=reg`);
    const response = await pending;
    expect(response.status()).toBe(200);
    const data = myRegionSchema.parse(await response.json());
    expect(data.state).toBe('director');
    if (data.state !== 'director') throw new Error('Expected current director');
    const section = page
      .getByRole('heading', { name: 'Affiliate trong vùng · căn cứ để chia cho cấp dưới' })
      .locator('../..');
    await expect(section.getByRole('table')).toBeVisible();
    await expect(section.getByRole('row')).toHaveCount(data.affiliates.length + 1);
    if (width === 390) {
      const months = page
        .getByRole('heading', { name: 'Lịch sử Media Soft chi trả theo tháng', exact: true })
        .locator('..')
        .getByRole('table');
      expect(Math.round((await months.boundingBox())?.width ?? 0)).toBe(480);
      expect(
        Math.round((await months.getByRole('columnheader').first().boundingBox())?.width ?? 0),
      ).toBe(90);
    }
    if (data.more)
      await expect(section.getByRole('button', { name: `Xem thêm (${data.more})` })).toBeVisible();
    else await expect(section.getByRole('button', { name: /Xem thêm/ })).toHaveCount(0);
    const downloading = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Tải CSV', exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('regional-affiliates.csv');
    const path = await download.path();
    if (!path) throw new Error('Missing downloaded CSV');
    const csv = await readFile(path);
    expect([...csv.subarray(0, 3)]).toEqual([239, 187, 191]);
    expect(csv.toString('utf8')).toContain(
      'Họ tên,Mã affiliate,Tỉnh,Khách hàng,Doanh thu,Chia cho vùng',
    );
    expect(csv.toString('utf8')).not.toMatch(/SĐT|Số điện thoại|Email/i);
    expect(csv.toString('utf8').split('\n').length).toBeGreaterThanOrEqual(
      data.affiliates.length + 1,
    );
  });
}
