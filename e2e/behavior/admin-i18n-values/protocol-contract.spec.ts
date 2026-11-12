import { test, expect } from '@playwright/test';
import {
  groupAdminUpsertSchema,
  groupDetailSchema,
  personaUpsertSchema,
} from '@opchub/shared/api-domains';
import { ValuesProtocol } from './protocol';

const group = groupAdminUpsertSchema.parse({
  name: 'tip824-i18n-pure',
  industry: 'tip824-i18n-pure',
  kind: 'industry',
  province: 'Hà Nội',
  description: 'raw',
  ownerId: 'dummy-owner',
  roomKeys: ['general'],
});
const detail = groupDetailSchema.parse({
  ...group,
  id: 'dummy-owned',
  region: 'Miền Bắc',
  parentId: 'dummy-parent',
  memberCount: 1,
  weeklyActive: 0,
  myStatus: null,
  avatars: [],
  rooms: [],
});
const persona = personaUpsertSchema.parse({
  name: 'tip824-i18n-pure-persona',
  enabled: false,
  groupIds: ['dummy-owned'],
  title: '',
  province: 'Hà Nội',
  tone: 'raw custom',
});
function verified() {
  const p = new ValuesProtocol();
  p.response('POST', '/v1/admin/auth/login', 200, {
    accessToken: 'non-secret-pure-fixture',
    admin: {
      id: 'dummy-super',
      name: 'Dummy',
      email: 'admin@opchub.community',
      roleId: null,
      roleName: null,
      permissions: [],
      isSuperAdmin: true,
      mustChangePassword: false,
      twoFactor: false,
      twoFactorRequired: false,
    },
  });
  expect(p.errors).toEqual([]);
  return p;
}
function withGroup() {
  const p = verified();
  p.expectMutation('groups', 'POST', group);
  p.request('POST', '/v1/admin/groups', group);
  p.response('POST', '/v1/admin/groups', 201, detail);
  expect(p.errors).toEqual([]);
  return p;
}
test('D-141 AC824-11 save guard requires verified principal', () => {
  expect(() => new ValuesProtocol().expectMutation('groups', 'POST', group)).toThrow();
});
test('D-141 AC824-11 save guard rejects non-prefixed name', () => {
  expect(() =>
    verified().expectMutation('groups', 'POST', { ...group, name: 'Existing group' }),
  ).toThrow();
});
test('D-141 AC824-11 save guard rejects unowned patch ID', () => {
  expect(() =>
    withGroup().expectMutation('groups', 'PATCH', group, 'different-existing-id'),
  ).toThrow();
});
test('D-141 AC824-11 save guard rejects global writes', () => {
  const p = verified();
  p.request('PATCH', '/v1/admin/bot/settings', { enabled: true });
  expect(p.errors).toHaveLength(1);
});
test('D-141 AC824-11 save guard rejects changed wire body', () => {
  const p = verified();
  p.expectMutation('groups', 'POST', group);
  p.request('POST', '/v1/admin/groups', { ...group, province: 'translated-province' });
  expect(p.errors).toHaveLength(1);
  expect(p.expected[0]?.seen).toBe(false);
});
test('D-141 AC824-11 save guard never enables fixture persona', () => {
  expect(() =>
    withGroup().expectMutation('personas', 'POST', { ...persona, enabled: true }),
  ).toThrow();
});
test('D-141 AC824-11 save guard rejects unrelated group assignments', () => {
  expect(() =>
    withGroup().expectMutation('personas', 'POST', { ...persona, groupIds: ['existing'] }),
  ).toThrow();
});
test('D-141 AC824-11 save guard rejects translated response data', () => {
  const p = verified();
  p.expectMutation('groups', 'POST', group);
  p.request('POST', '/v1/admin/groups', group);
  p.response('POST', '/v1/admin/groups', 201, { ...detail, name: 'Translated name' });
  expect(p.errors).toHaveLength(1);
  expect(p.expected[0]?.done).toBe(false);
});
test('D-141 AC824-11 save guard rejects changed persisted identity', () => {
  const p = withGroup();
  p.expectMutation('groups', 'PATCH', group, detail.id);
  p.request('PATCH', `/v1/admin/groups/${detail.id}`, group);
  p.response('PATCH', `/v1/admin/groups/${detail.id}`, 200, { ...detail, id: 'different' });
  expect(p.errors).toHaveLength(1);
});
