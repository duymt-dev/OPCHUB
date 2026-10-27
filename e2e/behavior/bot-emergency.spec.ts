import { botEmergencyStoppedSchema, botMessagesHiddenSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { emergencyScene } from './helpers/bot-emergency-scene';
import { observedThread } from './helpers/bot-ui';

test.use({ botManual: true });
test('REQ-141 D-51 P5 emergency stop prevents later turns and hide removes bot from live chat (also after reload) but keeps humans', async ({
  page,
  context,
}) => {
  test.setTimeout(480000);
  const scene = await emergencyScene(page, context);
  const stop = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/v1/admin/bot/emergency-stop' &&
      r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Tắt khẩn cấp', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Tắt khẩn cấp', exact: true })
    .getByRole('button', { name: 'Xác nhận', exact: true })
    .click();
  const stopped = await stop;
  expect(stopped.status()).toBe(200);
  const result = botEmergencyStoppedSchema.parse(await stopped.json());
  expect(result.enabled).toBe(false);
  expect(result.stopped).toBeGreaterThanOrEqual(1);
  await expect(page.getByRole('switch', { name: 'Chế độ tự động', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect.poll(async () => (await observedThread(page, scene.first.id))?.status).toBe('done');
  const hide = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/v1/admin/bot/hide-messages' &&
      r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Ẩn tin bot', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Ẩn tin bot', exact: true })
    .getByRole('button', { name: 'Xác nhận', exact: true })
    .click();
  const hidden = await hide;
  expect(hidden.status()).toBe(200);
  const counts = botMessagesHiddenSchema.parse(await hidden.json());
  expect(counts.hidden).toBeGreaterThanOrEqual(1);
  expect(counts.rooms).toBeGreaterThanOrEqual(1);
  // Must update the currently open chat; no refresh to make disappearance pass.
  await expect(scene.member.getByText(scene.body, { exact: true })).toHaveCount(0, {
    timeout: 20000,
  });
  await expect(scene.member.getByText(scene.human, { exact: true })).toBeVisible();
  // Tải lại phòng: tin bot vẫn ẩn (không chỉ ẩn trên socket), tin người giữ nguyên
  await scene.member.reload({ waitUntil: 'networkidle' });
  await expect(scene.member.getByText(scene.body, { exact: true })).toHaveCount(0);
  await expect(scene.member.getByText(scene.human, { exact: true })).toBeVisible();
  await page.waitForTimeout(Math.max(0, Date.parse(scene.first.nextAt ?? '') - Date.now()) + 15000);
  expect(await observedThread(page, scene.first.id)).toMatchObject({
    status: 'done',
    cursor: 1,
    nextAt: null,
  });
});
