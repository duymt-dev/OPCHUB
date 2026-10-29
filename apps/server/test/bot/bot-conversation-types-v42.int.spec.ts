import { randomUUID } from 'node:crypto';
import { apiErrorSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BUILTIN_BOT_CONVERSATION_TYPES,
  botConversationTypeSchema,
  botConversationTypesPageSchema,
} from '@opchub/shared/api-domains';
import { BotConversationTypesService } from '@/modules/bot/bulk/bot-conversation-types.service';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('D-112 durable conversation types over native HTTP', () => {
  let t: TestApp;
  let token: string;
  let viewer: string;
  let member: string;
  let actorId: string;
  const endpoint = '/admin/bot/conversation-types';
  const prefix = `Types ${randomUUID()}`;
  const ids: string[] = [];
  const create = (json: unknown, auth = token) =>
    t.call(endpoint, { method: 'POST', token: auth, json });
  const remove = (id: string, auth = token) =>
    t.call(`${endpoint}/${id}`, { method: 'DELETE', token: auth });
  const read = async (query = '') => {
    const response = await t.call(`${endpoint}${query}`, { token });
    expect(response.status).toBe(200);
    return botConversationTypesPageSchema.parse(await response.json());
  };
  const add = async (suffix: string, description = '') => {
    const response = await create({ name: `${prefix} ${suffix}`, description });
    expect(response.status).toBe(201);
    const row = botConversationTypeSchema.parse(await response.json());
    ids.push(row.id);
    return row;
  };

  beforeAll(async () => {
    t = await createTestApp();
    const admin = await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] });
    actorId = admin.id;
    token = await tokenOf(t, admin);
    viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view'] }));
    member = await tokenOf(t, await createUser(t));
  });
  afterAll(async () => {
    await t.prisma.db.botConversationType.deleteMany({ where: { id: { in: ids } } });
    await t.close();
  });

  it('requires authentication and independent read/action permission without mutation', async () => {
    const name = `${prefix} denied`;
    expect((await t.call(endpoint)).status).toBe(401);
    expect((await t.call(endpoint, { method: 'POST', json: { name } })).status).toBe(401);
    expect((await t.call(`${endpoint}/missing`, { method: 'DELETE' })).status).toBe(401);
    expect((await t.call(endpoint, { token: member })).status).toBe(403);
    expect((await t.call(endpoint, { token: viewer })).status).toBe(200);
    expect((await create({ name }, viewer)).status).toBe(403);
    expect((await create({ name }, member)).status).toBe(403);
    expect((await remove('builtin-qa', viewer)).status).toBe(403);
    expect(await t.prisma.db.botConversationType.findUnique({ where: { name } })).toBeNull();
  });

  it('returns the four definitions without inserting default rows or requiring an LLM', async () => {
    expect((await read()).builtins).toEqual(BUILTIN_BOT_CONVERSATION_TYPES);
    expect(
      await t.prisma.db.botConversationType.count({
        where: { name: { in: BUILTIN_BOT_CONVERSATION_TYPES.map((type) => type.name) } },
      }),
    ).toBe(0);
  });

  it('persists sanitized custom definitions across an actual API restart and audits their deletion', async () => {
    const row = await add('restart', '  <b>Kinh nghiệm</b> thực tế  ');
    expect(row).toMatchObject({ custom: true, description: 'Kinh nghiệm thực tế' });
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
    await t.close();
    t = await createTestApp();
    expect((await read()).items).toContainEqual(row);
    expect((await remove(row.id)).status).toBe(200);
    expect((await remove(row.id)).status).toBe(404);
    expect((await read()).items).not.toContainEqual(row);
    expect(
      await t.prisma.db.auditLog.findMany({
        where: { entity: 'bot_conversation_type', entityId: row.id },
        select: { action: true, actorId: true },
        orderBy: { createdAt: 'asc' },
      }),
    ).toEqual([
      { action: 'bot.conversation_type.create', actorId },
      { action: 'bot.conversation_type.delete', actorId },
    ]);
  });

  it.each(BUILTIN_BOT_CONVERSATION_TYPES)(
    'protects built-in $name from deletion and case-insensitive shadowing',
    async (builtin) => {
      expect((await remove(builtin.id)).status).toBe(409);
      expect((await create({ name: ` ${builtin.name.toUpperCase()} ` })).status).toBe(409);
      expect((await read()).builtins).toEqual(BUILTIN_BOT_CONVERSATION_TYPES);
    },
  );

  it('serializes concurrent case-only duplicates through the database unique index with one audit', async () => {
    const name = `${prefix} concurrent`;
    const responses = await Promise.all([create({ name }), create({ name: name.toUpperCase() })]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const rows = await t.prisma.db.botConversationType.findMany({ where: { name } });
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    ids.push(row.id);
    expect(
      await t.prisma.db.auditLog.count({
        where: { entityId: row.id, action: 'bot.conversation_type.create' },
      }),
    ).toBe(1);
  });

  it.each([
    { name: ' ' },
    { name: '<script>invalid</script>' },
    { name: 'x'.repeat(61) },
    { name: 'Test', description: 'x'.repeat(2001) },
    { name: 'Test', custom: false },
  ])(
    'rejects malformed/sanitized-empty bodies with the existing field-error envelope %j',
    async (json) => {
      const before = await t.prisma.db.botConversationType.count();
      const response = await create(json);
      expect(response.status).toBe(400);
      const { error } = apiErrorSchema.parse(await response.json());
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields?.length).toBeGreaterThan(0);
      expect(await t.prisma.db.botConversationType.count()).toBe(before);
    },
  );

  it('rejects oversized bodies and invalid cursors without accepting unknown query fields', async () => {
    expect(
      (await create({ name: `${prefix} oversize`, description: 'x'.repeat(2_000_000) })).status,
    ).toBe(413);
    expect((await t.call(`${endpoint}?after=invalid`, { token })).status).toBe(400);
    expect((await t.call(`${endpoint}?limit=101`, { token })).status).toBe(400);
    expect((await t.call(`${endpoint}?offset=10`, { token })).status).toBe(400);
    expect((await remove('missing')).status).toBe(404);
  });

  it('keyset pages preserve built-ins and remain valid after deletion of the cursor row', async () => {
    const first = await add('page-1');
    const second = await add('page-2');
    const third = await add('page-3');
    const page = await read(`?after=${first.id}&limit=1`);
    expect(page.items).toEqual([second]);
    expect(page.nextCursor).toBe(second.id);
    expect((await remove(second.id)).status).toBe(200);
    const next = await read(`?after=${page.nextCursor}&limit=1`);
    expect(next.items).toEqual([third]);
    expect(next.nextCursor).toBeNull();
    expect(next.builtins).toEqual(BUILTIN_BOT_CONVERSATION_TYPES);
  });

  it('rolls back create/delete if the real audit insert fails instead of persisting unaudited mutations', async () => {
    const service = t.app.get(BotConversationTypesService);
    const actor = { id: actorId, ip: 'not-an-ip-address' };
    const name = `${prefix} rollback`;
    await expect(service.create(actor, { name, description: '' })).rejects.toThrow();
    expect(await t.prisma.db.botConversationType.findUnique({ where: { name } })).toBeNull();
    const row = await add('rollback-delete');
    await expect(service.remove(actor, row.id)).rejects.toThrow();
    expect(await service.get(row.id)).toEqual(row);
    expect(
      await t.prisma.db.auditLog.count({
        where: { entityId: row.id, action: 'bot.conversation_type.delete' },
      }),
    ).toBe(0);
  });

  it('deleting a definition preserves existing script labels and dialogue', async () => {
    const type = await add('saved-label');
    const script = await t.prisma.db.botScript.create({
      data: {
        id: `type-preserve-${randomUUID()}`,
        topic: 'Existing conversation',
        type: type.name,
        groupIds: [],
        lines: [{ personaId: 'historical-persona', body: 'Retained content' }],
        enabled: false,
      },
    });
    try {
      expect((await remove(type.id)).status).toBe(200);
      expect(await t.prisma.db.botScript.findUnique({ where: { id: script.id } })).toEqual(script);
      await expect(t.app.get(BotConversationTypesService).get(type.id)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    } finally {
      await t.prisma.db.botScript.delete({ where: { id: script.id } });
    }
  });
});
