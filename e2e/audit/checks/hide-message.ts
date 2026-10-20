import { expect } from '@playwright/test';
import { chatMessagePageSchema, chatMessageSchema } from '@opchub/shared/api-domains';
import { USER, api, apiLogin, sql } from '../lib';

/** QT-06: require a currently paid sender, and prove the message exists before hiding it. */
export async function verifyHiddenMessage(admin: string): Promise<null> {
  const room = sql(`select id from rooms where group_id='c1' and slug='general'`)[0]?.[0];
  const sender = sql(
    `select u.email from users u join group_members m on m.user_id=u.id join membership_fees f on f.user_id=u.id where m.group_id='c1' and m.status='member' and u.email<>'${USER.email}' and u.status='active' and u.deleted_at is null and u.system_role='member' and f.status in ('active','expiring') and f.valid_until > now() limit 1`,
  )[0]?.[0];
  expect(room).toBeTruthy();
  expect(sender, 'seed has another currently paid room member').toBeTruthy();
  if (!sender || !room) throw new Error('Missing paid sender or room');
  const writer = await apiLogin({ email: sender, pwd: 'User@2026' });
  const body = `audit violation ${crypto.randomUUID()}`;
  const sent = await api(`/rooms/${room}/messages`, writer, {
    method: 'POST',
    body: { body, clientMsgId: crypto.randomUUID() },
  });
  expect(sent.status).toBe(201);
  const message = chatMessageSchema.parse(sent.json);
  const reader = await apiLogin(USER);
  const before = await api(`/rooms/${room}/messages`, reader);
  expect(before.status).toBe(200);
  expect(
    chatMessagePageSchema.parse(before.json).items.find((m) => m.id === message.id)?.body,
  ).toBe(body);
  const reported = await api(`/messages/${message.id}/report`, reader, {
    method: 'POST',
    body: { reason: 'spam' },
  });
  expect(reported.status).toBeLessThan(300);
  const report = sql(`select id from reports where message_id='${message.id}'`)[0]?.[0];
  expect(report).toBeTruthy();
  const hidden = await api(`/admin/reports/${report}/action`, admin, {
    method: 'POST',
    body: { action: 'hide' },
  });
  expect(hidden.status).toBeLessThan(300);
  const after = await api(`/rooms/${room}/messages`, reader);
  expect(after.status).toBe(200);
  expect(
    chatMessagePageSchema.parse(after.json).items.find((m) => m.id === message.id)?.body,
  ).not.toBe(body);
  return null;
}
