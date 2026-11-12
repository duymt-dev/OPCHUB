import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { env } from '../env';
import { test, expect, openLocalized } from './admin-i18n/fixtures';
import { englishChrome } from './admin-i18n/chrome';
import { assertSidebarLabels } from './admin-i18n/sidebar';

const evidence = fileURLToPath(
  new URL('../../coding-packs/reports/evidence/v46-824/', import.meta.url),
);
const SCREENS = [
  {
    path: '/overview',
    id: 'overview',
    title: 'ภาพรวม',
    heading: 'ภาพรวม',
    anchors: ['การเติบโตของสมาชิก', 'การเปลี่ยนจากฟรีเป็นชำระเงินตามภูมิภาค'],
  },
  {
    path: '/profile',
    id: 'profile',
    title: 'โปรไฟล์ส่วนตัว',
    heading: 'โปรไฟล์ส่วนตัว',
    anchors: ['ข้อมูลส่วนตัว', 'เปลี่ยนรหัสผ่าน', 'ความปลอดภัยและบทบาท'],
  },
  {
    path: '/settings',
    id: 'settings',
    title: 'ตั้งค่าและสิทธิ์',
    heading: 'ตั้งค่าระบบ',
    anchors: ['ข้อมูลแพลตฟอร์ม', 'การลงทะเบียนและเข้าร่วม'],
  },
] as const;

for (const screen of SCREENS)
  for (const width of [1440, 390]) {
    test(`D-141 AC824-07/15 Thai actual ${screen.id} ${width}, not all-language acceptance`, async ({
      page,
      guard,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openLocalized(page, screen.path, 'th');
      await expect(page).toHaveTitle(`${screen.title} · OPC Hub Admin`);
      await expect(
        page.getByRole('heading', { name: screen.heading, level: 1, exact: true }),
      ).toBeVisible();
      for (const anchor of screen.anchors)
        await expect(page.getByText(anchor, { exact: true }).first()).toBeVisible();
      // This scanner detects Vietnamese chrome, not Thai fluency; Thai anchors above are required.
      await englishChrome(page, guard);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(
        page.getByRole('status').filter({ hasText: 'เข้าสู่แดชบอร์ดผู้ดูแล' }),
      ).toBeHidden();
      await page.evaluate(() => document.fonts.ready);
      if (width === 1440) await assertSidebarLabels(page.locator('aside[data-mini]'));
      mkdirSync(evidence, { recursive: true });
      await page.screenshot({
        path: resolve(evidence, `th-${screen.id}-${env.E2E_TARGET}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
