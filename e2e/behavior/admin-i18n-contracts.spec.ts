import { test } from './admin-i18n-contracts/fixtures';
import { verifyRoleMatrixSave } from './admin-i18n-contracts/matrix';
import { verifyRestrictedAccount } from './admin-i18n-contracts/restricted';
import { verifyBoundaries } from './admin-i18n-contracts/boundaries';

test('D-141 AC824-11/14 permission matrix UI save preserves canonical keys and existing roles', async ({
  page,
  audit,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await verifyRoleMatrixSave(page, audit);
});

test('D-141 AC824-06/11/14 restricted lecturer account enforces localized ViewOnlyZone and 403 boundary in en and my', async ({
  page,
  audit,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await verifyRestrictedAccount(page, audit);
});

test('D-141 AC824-10/12/14 profile avatar client upload toast and raw backend error/content boundaries', async ({
  page,
  audit,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await verifyBoundaries(page, audit);
});
