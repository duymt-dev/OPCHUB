import { DEFAULT_APP_NOTIFY } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { ADMIN_URL } from '../urls';
import { settingsFixture, settingsLogin } from '../llm/settings-session';
for (const width of [1440, 390]) {
  test(`REQ-629 BR-492/493 app settings ${width}: draft/save/reload and in-app test notification`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const token = await settingsLogin(page);
    await settingsFixture(page, token, 'app', DEFAULT_APP_NOTIFY, 'PATCH');
    await page.goto(`${ADMIN_URL}/settings?tab=app`);
    await expect(
      page.getByRole('heading', { name: 'Ứng dụng di động & thông báo đẩy' }),
    ).toBeVisible();
    const pwa = page.getByRole('switch', { name: 'Cho phép cài ứng dụng OPC Hub' });
    await expect(pwa).toBeChecked();
    await expect(
      page.getByRole('switch', { name: 'Lượt xem & liên hệ gian hàng' }),
    ).not.toBeChecked();
    await pwa.click();
    await page.reload();
    await expect(pwa).toBeChecked();
    await pwa.click();
    await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
    await expect(
      page.getByText('Đã lưu cấu hình ứng dụng & thông báo', { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(pwa).not.toBeChecked();
    await page.getByRole('button', { name: 'Gửi thông báo thử', exact: true }).click();
    await expect(page.getByText('Đã gửi thông báo đẩy thử', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: /Thông báo/ })
      .first()
      .click();
    await expect(page.getByText('Thông báo thử từ OPC Hub', { exact: true }).first()).toBeVisible();
    await expect(
      page
        .getByText('Thông báo đẩy đang hoạt động trên thiết bị của bạn.', { exact: true })
        .first(),
    ).toBeVisible();
  });
}
