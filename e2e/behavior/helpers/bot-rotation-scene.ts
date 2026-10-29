import { scriptSchema, type Persona } from '@opchub/shared/api-domains';
import { expect, type Page } from '../../server/test';
import { botCard, botTab } from './bot-ui';
import { prepareReplyParticipants } from './bot-participants';

/** UI-only fixture: isolate stored rotation from optional AI and seed scripts. */
export async function prepareRotation(page: Page) {
  const prepared = await prepareReplyParticipants(page);
  await botTab(page, 'Kịch bản hội thoại');
  for (const topic of [
    'Thuế cho người mới lập OPC',
    'Tìm khách hàng đầu tiên',
    'Ứng dụng AI vào vận hành OPC',
  ]) {
    await botCard(page, topic, 'Xóa').getByRole('button', { name: 'Xóa' }).click();
    const dialog = page.getByRole('dialog', { name: 'Xóa kịch bản?' });
    await dialog.getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(page.getByText(topic, { exact: true })).toHaveCount(0);
  }
  const scripts = [];
  for (const suffix of ['A', 'B']) {
    scripts.push(await createRotationScript(page, `Luân phiên ${suffix}`, prepared.selected));
  }
  await botTab(page, 'Hội thoại');
  return { ...prepared, scripts: scripts.sort((a, b) => a.id.localeCompare(b.id)) };
}

async function createRotationScript(page: Page, topic: string, personas: Persona[]) {
  await page.getByRole('button', { name: '+ Tạo kịch bản', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Kịch bản hội thoại', exact: true });
  await drawer.getByPlaceholder('VD: Thuế cho người mới lập OPC').fill(topic);
  await drawer.getByRole('button', { name: 'OPC Hà Nội', exact: true }).click();
  await drawer.getByLabel('Giãn cách giữa lượt (phút)').fill('1');
  await expect(drawer.getByLabel('Bắt đầu luân phiên (để trống = ngay)')).toHaveValue('');
  for (let i = 0; i < 2; i++) {
    const persona = personas[i];
    if (!persona) throw new Error('Missing rotation participant');
    await drawer.getByLabel(`Persona lượt ${i + 1}`).selectOption(persona.id);
    await drawer.getByLabel(`Nội dung lượt ${i + 1}`).fill(`${topic} - lượt ${i + 1}`);
  }
  const saving = page.waitForResponse(
    (r) => r.url().endsWith('/admin/scripts') && r.request().method() === 'POST',
  );
  await drawer.getByRole('button', { name: 'Lưu kịch bản', exact: true }).click();
  const response = await saving;
  expect(response.status()).toBe(201);
  const script = scriptSchema.parse(await response.json());
  expect(script).toMatchObject({ enabled: true, runAt: null, delayMinutes: 1, groupIds: ['c1'] });
  await expect(drawer).toHaveCount(0);
  await expect(botCard(page, topic, 'Sửa')).toContainText('Luân phiên tự động');
  return script;
}
