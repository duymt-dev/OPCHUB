import { expect, type Page } from '@playwright/test';
import { mailJobSchema, welcomeMailSchema } from '@opchub/shared/api-domains';
import { lastMailTo } from '../../server/mailbox';
import { ADMIN, ADMIN_URL, api, login, sql } from '../lib';

/** UAT-29: inspect the delivered fake-provider mail, not the body purged after send. */
export async function verifyWelcomeMail(page: Page, session: string): Promise<string> {
  const current = await api('/admin/mail/welcome', session);
  expect(current.status).toBe(200);
  const template = welcomeMailSchema.parse(current.json);
  const marker = `AUDIT-${crypto.randomUUID()}`;
  const attachment = { title: `${marker}-document`, url: `https://example.com/${marker}.pdf` };
  const body = {
    ...template,
    intro: `${template.intro} ${marker}`,
    showGuide: true,
    attachments: [...template.attachments, attachment],
  };
  const updated = await api('/admin/mail/welcome', session, { method: 'PUT', body });
  expect(updated.status).toBe(200);
  expect(welcomeMailSchema.parse(updated.json)).toEqual(body);

  await login(page, ADMIN_URL, ADMIN);
  await page.goto(`${ADMIN_URL}/settings?tab=welcome-mail`);
  await expect(page.getByText(body.intro, { exact: true }).and(page.locator('span'))).toBeVisible();
  await expect(
    page.getByText(attachment.title, { exact: true }).and(page.locator('span')),
  ).toBeVisible();

  const since = Date.now();
  const sent = await api('/admin/mail/welcome/test', session, {
    method: 'POST',
    body: { to: ADMIN.email },
  });
  expect(sent.status).toBe(202);
  const job = mailJobSchema.parse(sent.json);
  const html = await lastMailTo(ADMIN.email, { since });
  expect(html).toContain(marker);
  expect(html).toContain(attachment.title);
  expect(html).toContain(attachment.url);
  await expect
    .poll(() => sql(`select status from mail_logs where id='${job.jobId}'`)[0]?.[0])
    .toBe('sent');
  expect(sql(`select body_html is null from mail_logs where id='${job.jobId}'`)[0]?.[0]).toBe('t');
  return 'saved template and document appear in preview/delivered mail; exact job sent, DB body purged';
}
