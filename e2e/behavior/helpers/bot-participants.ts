import { personaListSchema, personaSchema } from '@opchub/shared/api-domains';
import { expect, type Page } from '../../server/test';
import { botCard, botTab, openBots } from './bot-ui';

const toggle = async (page: Page, label: string, on: boolean) => {
  const control = page.getByRole('switch', { name: label, exact: true });
  await expect(control).toBeEnabled();
  if ((await control.getAttribute('aria-checked')) !== String(on)) await control.click();
  await expect(control).toHaveAttribute('aria-checked', String(on));
  await expect(control).toBeEnabled();
};

/** Configure through real Admin UI before permitting a bounded completion. */
export async function prepareReplyParticipants(admin: Page) {
  const listing = admin.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/personas' && r.status() === 200,
  );
  await openBots(admin);
  await toggle(admin, 'Chế độ tự động', false);
  await toggle(admin, 'Tự sinh kịch bản từ chủ đề', false);
  await toggle(admin, 'Tự trả lời thành viên thật', false);
  const personas = personaListSchema.parse(await (await listing).json()).items;
  const selected = personas.slice(0, 2);
  expect(selected).toHaveLength(2);
  await botTab(admin, 'Persona');
  for (const persona of personas) {
    const enabled = selected.some((p) => p.id === persona.id);
    await toggle(admin, `Bật/tắt persona ${persona.name}`, enabled);
    if (!enabled) continue;
    await botCard(admin, persona.name, 'Sửa').getByRole('button', { name: 'Sửa' }).click();
    const drawer = admin.getByRole('dialog', { name: 'Persona', exact: true });
    await drawer.getByLabel('Khung giờ hoạt động').selectOption('Cả ngày');
    await drawer.getByLabel('Tần suất (tin/ngày)').fill('20');
    const groups = drawer.getByRole('group', { name: 'NHÓM THAM GIA', exact: true });
    const chips = groups.getByRole('button');
    for (let i = 0; i < (await chips.count()); i++) {
      const chip = chips.nth(i);
      const chosen = (await chip.textContent()) === 'OPC Hà Nội';
      if ((await chip.getAttribute('aria-pressed')) !== String(chosen)) await chip.click();
    }
    const saving = admin.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/v1/admin/personas/${persona.id}` &&
        r.request().method() === 'PATCH',
    );
    await drawer.getByRole('button', { name: 'Lưu persona' }).click();
    const response = await saving;
    expect(response.status()).toBe(200);
    expect(personaSchema.parse(await response.json())).toMatchObject({
      enabled: true,
      groupIds: ['c1'],
      postsPerDay: 20,
      activeHours: 'Cả ngày',
    });
    await expect(drawer).toHaveCount(0);
  }
  return { selected, toggle: (label: string, on: boolean) => toggle(admin, label, on) };
}
