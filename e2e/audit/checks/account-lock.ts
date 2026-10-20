import { expect } from '@playwright/test';
import { ADMIN, USER, api, apiLogin, sql } from '../lib';

/** D-15 public visibility must be checked by an outsider, not a project/team/share member. */
export async function verifyAccountLock(): Promise<null> {
  const session = await apiLogin(ADMIN);
  const owner = sql(
    `select u.id, u.email from users u where u.status='active' and u.system_role='member' and exists (select 1 from projects p where p.owner_id=u.id and p.status='published' and p.visibility='public') and exists (select 1 from group_members m where m.user_id=u.id and m.group_role='owner') and u.email<>'${USER.email}' limit 1`,
  )[0];
  expect(owner, 'seed has a public project owner who also owns a group').toBeDefined();
  if (!owner) throw new Error('Missing lock-effects owner');
  const [uid, email] = owner;
  const project = sql(
    `select id from projects where owner_id='${uid}' and status='published' and visibility='public' limit 1`,
  )[0]?.[0];
  const group = sql(
    `select group_id from group_members where user_id='${uid}' and group_role='owner' limit 1`,
  )[0]?.[0];
  expect(project).toBeTruthy();
  expect(group).toBeTruthy();
  const observer = sql(
    `select u.email from users u join membership_fees f on f.user_id=u.id where u.status='active' and u.deleted_at is null and u.system_role='member' and f.status in ('active','expiring') and f.valid_until > now() and u.id<>'${uid}' and not exists (select 1 from project_members pm where pm.project_id='${project}' and pm.user_id=u.id) and not exists (select 1 from project_shares ps join group_members gm on gm.group_id=ps.group_id and gm.user_id=u.id and gm.status='member' where ps.project_id='${project}') limit 1`,
  )[0]?.[0];
  expect(observer, 'paid outsider has no owner/team/shared-group access').toBeTruthy();
  if (!observer) throw new Error('Missing paid outsider');
  const viewer = await apiLogin({ email: observer, pwd: 'User@2026' });
  expect((await api(`/projects/${project}`, viewer)).status).toBe(200);
  try {
    const locked = await api(`/admin/users/${uid}/status`, session, {
      method: 'PATCH',
      body: { status: 'locked', reason: 'audit D-15' },
    });
    expect(locked.status).toBeLessThan(300);
    await expect.poll(async () => (await api(`/projects/${project}`, viewer)).status).toBe(404);
    await expect
      .poll(
        () =>
          sql(
            `select u.email from group_members m join users u on u.id=m.user_id where m.group_id='${group}' and m.group_role='owner'`,
          )[0]?.[0],
      )
      .not.toBe(email);
  } finally {
    const unlocked = await api(`/admin/users/${uid}/status`, session, {
      method: 'PATCH',
      body: { status: 'active' },
    });
    expect(unlocked.status).toBeLessThan(300);
  }
  return null;
}
