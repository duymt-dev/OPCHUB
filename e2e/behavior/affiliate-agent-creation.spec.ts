import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { registerReferral, payAndOpenAffiliate } from './helpers/affiliate-registration';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });
test('AT-AF01 first confirmed fee creates one automatic agent visible to Admin after F5', async ({
  page,
  context,
}) => {
  const email = await registerReferral(page);
  await payAndOpenAffiliate(page);
  const admin = await context.newPage();
  await signInAffiliate(admin, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await admin.getByRole('tab', { name: /^Affiliate/ }).click();
  await admin.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill(email);
  const row = admin.getByRole('row').filter({ hasText: email });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Nguyễn Affiliate Trà My');
  await expect(row).toContainText('Tự động');
  await admin.reload();
  await expect(row).toHaveCount(1);
});
