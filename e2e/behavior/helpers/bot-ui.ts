import {
  botThreadListSchema,
  personaListSchema,
  scriptListSchema,
  type BotThread,
} from '@opchub/shared/api-domains';
import { expect, type Page } from '../../server/test';
import { ADMIN_URL } from '../../urls';

export async function openBots(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/overview$/);
  await page.locator('aside').getByText('Bot tương tác', { exact: true }).click();
  await expect(page).toHaveURL(/\/bots$/);
  await expect(page.getByText('Bot tương tác cộng đồng')).toBeVisible();
}
export const botTab = (page: Page, name: string) =>
  page.getByRole('tab', { name, exact: true }).click();
export const botCard = (page: Page, text: string, action: string) =>
  page
    .locator('div')
    .filter({ hasText: text })
    .filter({ has: page.getByRole('button', { name: action, exact: true }) })
    .last();

const responseFor = (page: Page, path: string) =>
  page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/v1/admin/${path}` &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );

/** Actual UI fixture, identical for both backends; no clock/provider/HTTP bypass. */
export async function prepareManualRun(page: Page, topic: string) {
  const personasResponse = responseFor(page, 'personas');
  const scriptsResponse = responseFor(page, 'scripts');
  await openBots(page);
  const personas = personaListSchema.parse(await (await personasResponse).json()).items;
  const script = scriptListSchema
    .parse(await (await scriptsResponse).json())
    .items.find((row) => row.topic === topic);
  if (!script) throw new Error('Missing script fixture');
  const auto = page.getByRole('switch', { name: 'Chế độ tự động', exact: true });
  if ((await auto.getAttribute('aria-checked')) === 'true') await auto.click();
  await expect(auto).toHaveAttribute('aria-checked', 'false');
  await expect(auto).toBeEnabled();
  const gen = page.getByRole('switch', { name: 'Tự sinh kịch bản từ chủ đề', exact: true });
  if ((await gen.getAttribute('aria-checked')) === 'true') await gen.click();
  await expect(gen).toHaveAttribute('aria-checked', 'false');
  await expect(gen).toBeEnabled();
  await botTab(page, 'Persona');
  for (const id of new Set(script.lines.map((line) => line.personaId))) {
    const persona = personas.find((row) => row.id === id);
    if (!persona) throw new Error('Missing script persona');
    if (!persona.enabled) {
      const toggle = page.getByRole('switch', {
        name: `Bật/tắt persona ${persona.name}`,
        exact: true,
      });
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
    }
    await botCard(page, persona.name, 'Sửa').getByRole('button', { name: 'Sửa' }).click();
    const drawer = page.getByRole('dialog', { name: 'Persona', exact: true });
    await drawer.getByLabel('Khung giờ hoạt động').selectOption('Cả ngày');
    await drawer.getByLabel('Tần suất (tin/ngày)').fill('20');
    await drawer.getByRole('button', { name: 'Lưu persona' }).click();
    await expect(drawer).toHaveCount(0);
  }
  await botTab(page, 'Kịch bản hội thoại');
  await botCard(page, topic, 'Sửa').getByRole('button', { name: 'Sửa' }).click();
  const drawer = page.getByRole('dialog', { name: 'Kịch bản hội thoại', exact: true });
  await drawer.getByLabel('Giãn cách giữa lượt (phút)').fill('1');
  await drawer.getByRole('button', { name: 'Lưu kịch bản' }).click();
  await expect(drawer).toHaveCount(0);
  await auto.click();
  await expect(auto).toHaveAttribute('aria-checked', 'true');
  await expect(auto).toBeEnabled();
  return script;
}

/** Observe real UI polling, never fulfill/mock requests or call a different backend. */
export async function observedThread(page: Page, id: string): Promise<BotThread | undefined> {
  const response = await responseFor(page, 'bot/threads');
  return botThreadListSchema.parse(await response.json()).items.find((row) => row.id === id);
}
