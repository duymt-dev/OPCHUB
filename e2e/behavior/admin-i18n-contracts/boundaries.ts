import { adminLoginResponseSchema, apiErrorSchema } from '@opchub/shared/api';
import {
  auditLogPageSchema,
  IMAGE_MAX_BYTES,
  notificationListSchema,
  welcomeMailSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { openEnglish } from '../admin-i18n/fixtures';
import { selectLocale } from '../admin-i18n/navigation';
import {
  authedJson,
  expect,
  readBundleJson,
  waitApiResponse,
  type ContractAudit,
  type Page,
} from './fixtures';

const commonSchema = z.object({
  adminProfile: z.object({ imageRule: z.string().min(1) }),
  notifications: z.object({ title: z.string().min(1), tabAll: z.string().min(1) }),
  shell: z.object({
    notifications: z.string().min(1),
    settings: z.string().min(1),
  }),
});
const coreSchema = z.object({
  tabs: z.object({
    roles: z.string().min(1),
    'audit-log': z.string().min(1),
    'welcome-mail': z.string().min(1),
  }),
});
const accessSchema = z.object({
  roles: z.object({
    add: z.string().min(1),
    addName: z.string().min(1),
    addOk: z.string().min(1),
  }),
});
const auditSchema = z.object({
  log: z.object({ heading: z.string().min(1), export: z.string().min(1) }),
});
const mailSchema = z.object({
  mail: z.object({
    heading: z.string().min(1),
    subject: z.string().min(1),
    preview: z.string().min(1),
    save: z.string().min(1),
  }),
});

async function assertAvatarClientErrors(
  page: Page,
  audit: ContractAudit,
  enRule: string,
  myRule: string,
) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'invalid.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not-an-image'),
  });
  await expect(page.getByRole('status').filter({ hasText: enRule }).first()).toBeVisible();
  expect(audit.requests.filter((r) => r.includes('/uploads'))).toEqual([]);

  await selectLocale(page, 'my');
  await fileInput.setInputFiles({
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(IMAGE_MAX_BYTES + 64, 1),
  });
  await expect(page.getByRole('status').filter({ hasText: myRule }).first()).toBeVisible();
  expect(audit.requests.filter((r) => r.includes('/uploads'))).toEqual([]);
  await selectLocale(page, 'en');
}

export async function verifyBoundaries(page: Page, audit: ContractAudit) {
  const enCommon = commonSchema.parse(readBundleJson('en', 'common'));
  const myCommon = commonSchema.parse(readBundleJson('my', 'common'));
  const enCore = coreSchema.parse(readBundleJson('en', 'settings/core'));
  const enAccess = accessSchema.parse(readBundleJson('en', 'settings/access'));
  const enAudit = auditSchema.parse(readBundleJson('en', 'settings/audit'));
  const enMail = mailSchema.parse(readBundleJson('en', 'settings/mail'));

  const loginDone = waitApiResponse(page, '/v1/admin/auth/login', 'POST', 200);
  await openEnglish(page, '/profile');
  const session = adminLoginResponseSchema.parse(await (await loginDone).json());

  await assertAvatarClientErrors(
    page,
    audit,
    enCommon.adminProfile.imageRule,
    myCommon.adminProfile.imageRule,
  );

  const notifApi = await authedJson(page, session.accessToken, '/v1/notifications?size=50');
  expect(notifApi.status).toBe(200);
  const notifData = notificationListSchema.parse(notifApi.body);
  await page.getByRole('button', { name: enCommon.shell.notifications, exact: true }).click();
  await expect(page.getByText(enCommon.notifications.title, { exact: true }).first()).toBeVisible();
  if (notifData.items[0]) {
    await expect(page.getByText(notifData.items[0].title, { exact: true }).first()).toBeVisible();
  }
  await page.keyboard.press('Escape');

  await page.locator('[data-m="me"]').click();
  await page.getByRole('menuitem', { name: enCommon.shell.settings, exact: true }).click();
  await expect(page).toHaveURL(/\/settings/);

  const auditLoaded = waitApiResponse(page, '/v1/admin/audit-logs', 'GET', 200);
  await page.getByRole('button', { name: enCore.tabs['audit-log'] }).first().click();
  const auditItems = auditLogPageSchema.parse(await (await auditLoaded).json()).items;
  await expect(page.getByText(enAudit.log.heading, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: enAudit.log.export, exact: true })).toBeVisible();
  if (auditItems[0]) {
    const logList = page.getByRole('list', { name: enAudit.log.heading, exact: true });
    await expect(logList).toContainText(auditItems[0].actorName);
    await expect(logList).toContainText(auditItems[0].summary);
  }

  const mailLoaded = waitApiResponse(page, '/v1/admin/mail/welcome', 'GET', 200);
  await page.getByRole('button', { name: enCore.tabs['welcome-mail'] }).first().click();
  const welcomeData = welcomeMailSchema.parse(await (await mailLoaded).json());
  await expect(page.getByText(enMail.mail.heading, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(enMail.mail.preview, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: enMail.mail.save, exact: true })).toBeVisible();
  await expect(page.getByLabel(enMail.mail.subject)).toHaveValue(welcomeData.subject);
  await expect(page.getByText(welcomeData.intro).first()).toBeVisible();

  await page.getByRole('button', { name: enCore.tabs.roles }).first().click();
  await page.getByRole('button', { name: enAccess.roles.add, exact: true }).click();
  await page.getByLabel(enAccess.roles.addName, { exact: true }).fill('Biên tập nội dung');
  const dupRole = waitApiResponse(page, '/v1/admin/admin-roles', 'POST', 409);
  await page.getByRole('button', { name: enAccess.roles.addOk, exact: true }).click();
  const dupErr = apiErrorSchema.parse(await (await dupRole).json());
  await expect(
    page.getByRole('status').filter({ hasText: dupErr.error.message }).first(),
  ).toBeVisible();
  await audit.settle();
}
