import { randomUUID } from 'node:crypto';
import { adminLoginResponseSchema, pageSchema } from '@opchub/shared/api';
import {
  groupAdminUpsertSchema,
  groupDetailSchema,
  groupItemSchema,
  personaListSchema,
  personaSchema,
  personaUpsertSchema,
} from '@opchub/shared/api-domains';
import { openEnglish } from '../admin-i18n/fixtures';
import { browserApi, waitApi } from './api';
import { expect, type Page, type ValuesAudit } from './fixtures';
import { PREFIX, requireOwned, type OwnedValues } from './types';

export async function readOwned(page: Page, token: string, previous: OwnedValues) {
  const g = await browserApi(page, token, `groups/${encodeURIComponent(previous.group.id)}`);
  const p = await browserApi(page, token, 'personas');
  expect(g.status).toBe(200);
  expect(p.status).toBe(200);
  const group = groupDetailSchema.parse(g.body);
  const persona = personaListSchema
    .parse(p.body)
    .items.find((item) => item.id === previous.persona.id);
  if (!persona) throw new Error('Retained owned persona prerequisite missing');
  requireOwned(group.name);
  requireOwned(persona.name);
  expect(group.name).toBe(previous.group.name);
  expect(persona.name).toBe(previous.persona.name);
  expect(persona.enabled).toBe(false);
  expect(persona.groupIds).toEqual([group.id]);
  return { group, persona };
}
async function createGroup(page: Page, token: string, audit: ValuesAudit) {
  const list = await browserApi(page, token, 'groups?page=1&size=100');
  expect(list.status).toBe(200);
  const groups = pageSchema(groupItemSchema).parse(list.body);
  expect(
    groups.total,
    'Existing UI loads at most100 groups; do not hide fixture outside that page',
  ).toBeLessThan(100);
  const parent = groups.items.find((g) => g.kind === 'province' && g.province === 'Hà Nội');
  expect(groups.items.some((g) => g.kind === 'province' && g.province === 'Đà Nẵng')).toBe(true);
  if (!parent) throw new Error('Existing province-group prerequisite missing');
  const detail = await browserApi(page, token, `groups/${encodeURIComponent(parent.id)}`);
  expect(detail.status).toBe(200);
  const ownerId = groupDetailSchema.parse(detail.body).ownerId;
  if (!ownerId) throw new Error('Province-group owner prerequisite missing');
  const name = `${PREFIX}${randomUUID()}`;
  const body = groupAdminUpsertSchema.parse({
    name,
    kind: 'industry',
    industry: name,
    province: 'Hà Nội',
    ownerId,
    description: 'Mô tả tự nhập giữ nguyên tip824 – raw content',
    rules: ['Nội quy tự nhập giữ nguyên tip824'],
    roomKeys: ['general'],
    lecturerIds: [],
    extraRooms: [],
  });
  requireOwned(body.name);
  audit.protocol.expectMutation('groups', 'POST', body);
  const result = await browserApi(page, token, 'groups', body);
  expect(result.status).toBe(201);
  await audit.settle();
  return groupDetailSchema.parse(result.body);
}
async function createPersona(page: Page, token: string, audit: ValuesAudit, groupId: string) {
  const body = personaUpsertSchema.parse({
    name: `${PREFIX}${randomUUID()}`,
    title: 'Chức danh tự nhập tip824',
    province: 'Hà Nội',
    tone: 'tip824 giọng tự nhập',
    bio: 'Giới thiệu tự nhập giữ nguyên – tip824',
    skills: 'tip824, cà phê',
    activeHours: 'tip824 giờ tự nhập',
    groupIds: [groupId],
    enabled: false,
  });
  requireOwned(body.name);
  audit.protocol.expectMutation('personas', 'POST', body);
  const result = await browserApi(page, token, 'personas', body);
  expect(result.status).toBe(201);
  await audit.settle();
  return personaSchema.parse(result.body);
}
export async function provision(page: Page, audit: ValuesAudit) {
  const login = waitApi(page, 'auth/login');
  await openEnglish(page, '/profile');
  const session = adminLoginResponseSchema.parse(await (await login).json());
  await audit.settle();
  const group = await createGroup(page, session.accessToken, audit);
  const owned = { group, persona: await createPersona(page, session.accessToken, audit, group.id) };
  audit.protocol.own(owned);
  return { owned, token: session.accessToken };
}
