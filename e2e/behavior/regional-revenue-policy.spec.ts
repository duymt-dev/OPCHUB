import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

test('REQ-617 D-119 policy edits persist, refresh live rules and never rewrite historical shares', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  const sharing = page.getByRole('tab', { name: /^GĐ Vùng 3$/ });
  const policy = page.getByRole('tab', { name: 'Chính sách', exact: true });
  await sharing.click();
  await page.getByRole('button', { name: /Trần Quốc Bảo/ }).click();
  const ledger = page.getByRole('region', { name: 'Khoản ghi nhận cho GĐ Vùng', exact: true });
  await expect(ledger.getByRole('row')).toHaveCount(9);
  const originalLedger = await ledger.innerText();
  const history = page.getByRole('region', { name: 'Lịch sử chi trả', exact: true });
  await expect(history).toContainText('TRAN QUOC BAO');
  const originalHistory = await history.innerText();
  await policy.click();
  const first = page.getByRole('spinbutton', { name: 'GĐ Vùng năm 1', exact: true });
  const decrease = page.getByRole('spinbutton', { name: 'Giảm mỗi năm từ năm 2', exact: true });
  const floor = page.getByRole('spinbutton', {
    name: 'Mức duy trì tối thiểu (chi phí vận hành)',
    exact: true,
  });
  const save = page.getByRole('button', { name: 'Lưu chính sách', exact: true });
  await expect(first).toHaveValue('50');
  await expect(decrease).toHaveValue('10');
  await expect(floor).toHaveValue('20');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const input of [first, decrease, floor]) {
      const box = await input.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  }
  let puts = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/admin/affiliate/policy') && r.method() === 'PUT') puts++;
  });
  await first.fill('19');
  await save.click();
  await expect(floor).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByText('Mức tối thiểu không được vượt tỷ lệ năm đầu', { exact: true }),
  ).toBeVisible();
  expect(puts).toBe(0);
  await first.fill('63');
  await decrease.fill('7');
  await floor.fill('21');
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/admin/affiliate/policy') && r.request().method() === 'PUT',
  );
  await save.click();
  expect((await saved).status()).toBe(200);
  expect(puts).toBe(1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await sharing.click();
  const rule = page.getByText(/^Phần GĐ Vùng theo quy tắc/);
  await expect(rule).toContainText('63% năm 1 · 56% năm 2 · 49% năm 3');
  await expect(rule).toContainText('21% từ năm 7');
  await page.getByRole('button', { name: /Trần Quốc Bảo/ }).click();
  await expect(ledger).toHaveText(originalLedger, { useInnerText: true });
  await expect(history).toHaveText(originalHistory, { useInnerText: true });
  await policy.click();
  await page.reload();
  await expect(first).toHaveValue('63');
  await expect(decrease).toHaveValue('7');
  await expect(floor).toHaveValue('21');
  // Restore by the same authorized public form, not by a mode-specific fixture write.
  await first.fill('50');
  await decrease.fill('10');
  await floor.fill('20');
  const restored = page.waitForResponse(
    (r) => r.url().endsWith('/admin/affiliate/policy') && r.request().method() === 'PUT',
  );
  await save.click();
  expect((await restored).status()).toBe(200);
});
