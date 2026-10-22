import { test } from '../server/test';
import { ADMIN_URL } from '../urls';
import { expectCompactEmpty } from './helpers/affiliate-empty';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [1440, 390]) {
  test(`D-84-AFF-EMPTY TD-P4-UI-05 agent empty search keeps compact guidance at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
    await expectCompactEmpty(page, 'Tìm tên, mã giới thiệu, email...', width);
  });
}
