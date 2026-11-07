import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma } from '@opchub/db';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { chatOverviewSchema } from '@opchub/shared/api-domains';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import {
  GroupRepository,
  joinedGroupsQuery,
} from '@/modules/community/repositories/group.repository';

describe('A1 chat overview membership-first lookup', () => {
  let t: TestApp;
  const groups: string[] = [];
  const users: string[] = [];
  const rooms: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await t.prisma.db.group.deleteMany({ where: { id: { in: groups.splice(0) } } });
    await t.prisma.db.user.deleteMany({ where: { id: { in: users } } });
    if (rooms.length) await t.redis.client.hdel('chat:seq', ...rooms.splice(0));
    if (users.length) await t.redis.client.del(...users.splice(0).map((id) => `chat:read:${id}`));
  });
  afterAll(() => t.close());

  it('A1 joined beyond first 100 groups', async () => {
    await flushAuthState(t);
    const user = await createUser(t, { fee: 'active' });
    users.push(user.id);
    const token = await tokenOf(t, user);
    const data = Array.from({ length: 124 }, (_, index) => {
      const id = randomUUID();
      groups.push(id);
      return {
        id,
        slug: id,
        name: `A1 group ${index}`,
        province: `A1 province ${id}`,
        region: 'central' as const,
        coverUrl: 'https://storage.example.test/a1-cover.png',
        createdAt: new Date(
          index < 120 ? Date.UTC(2000, 0, 1, 0, index) : Date.UTC(2100, 0, index),
        ),
        ...(index === 121 ? { deletedAt: new Date() } : {}),
      };
    });
    await t.prisma.db.group.createMany({ data });
    const target = data[120];
    const deleted = data[121];
    const left = data[122];
    const removed = data[123];
    if (!target || !deleted || !left || !removed) throw Error('Missing A1 fixture groups');
    await t.prisma.db.groupMember.createMany({
      data: [
        { groupId: target.id, userId: user.id, status: 'member', groupRole: 'owner' },
        { groupId: deleted.id, userId: user.id, status: 'member' },
        { groupId: left.id, userId: user.id, status: 'left' },
        { groupId: removed.id, userId: user.id, status: 'removed' },
      ],
    });
    const room = `${target.id}-general`;
    rooms.push(room);
    await t.prisma.db.room.create({
      data: { id: room, groupId: target.id, slug: 'general', name: 'General', isDefault: true },
    });
    await t.redis.client.hset('chat:seq', room, '7');
    await t.redis.client.hset(`chat:read:${user.id}`, room, '4');
    const raw = vi.spyOn(t.prisma.db, '$queryRaw');
    const membership = vi.spyOn(t.prisma.db.groupMember, 'findMany');
    const read = async () => {
      raw.mockClear();
      membership.mockClear();
      const response = await t.call('/me/chat', { token });
      expect(response.status).toBe(200);
      return {
        overview: chatOverviewSchema.parse(await response.json()),
        queries: { raw: raw.mock.calls.length, membership: membership.mock.calls.length },
      };
    };
    const first = await read();
    expect(first.overview.joined).toHaveLength(1);
    expect(first.overview.joined[0]).toMatchObject({
      id: target.id,
      isOwner: true,
      unread: 3,
      online: 0,
      thumbUrl: target.coverUrl,
    });
    expect(first.overview.others.some((g) => g.id === target.id)).toBe(false);
    const excluded = new Set<string>([deleted.id, left.id, removed.id]);
    expect(first.overview.joined.some((g) => excluded.has(g.id))).toBe(false);
    await t.prisma.db.groupMember.createMany({
      data: data
        .slice(0, 20)
        .map((g) => ({ groupId: g.id, userId: user.id, status: 'member' as const })),
    });
    const many = await read();
    expect(many.overview.joined).toHaveLength(21);
    expect(many.overview.joined.at(-1)?.id).toBe(target.id);
    expect(
      many.overview.others.every((g) => !many.overview.joined.some((j) => j.id === g.id)),
    ).toBe(true);
    expect(many.queries).toEqual(first.queries);
  });

  it('A1 actual membership-first query seeks 10000 rows and caps payloads at 1000', async () => {
    const filler = await createUser(t);
    const needle = await createUser(t);
    users.push(filler.id, needle.id);
    const prefix = `A1-plan-${randomUUID()}-`;
    const ids = Array.from({ length: 10000 }, (_, n) => `${prefix}${n + 1}`);
    groups.push(...ids);
    await t.prisma.db.$executeRaw`
      INSERT INTO groups (id, slug, province, region, name, description, created_at, updated_at)
      SELECT ${prefix} || n::text, ${prefix} || n::text, ${prefix} || n::text,
        'central'::region, 'A1 query plan', repeat('g', 1024),
        '2000-01-01'::timestamptz, now()
      FROM generate_series(1, 10000) AS n`;
    await t.prisma.db.$executeRaw`
      INSERT INTO group_members (group_id, user_id, status, created_at, updated_at)
      SELECT ${prefix} || n::text, ${filler.id}, 'member'::group_member_status, now(), now()
      FROM generate_series(1, 10000) AS n`;
    await t.prisma.db.groupMember.createMany({
      data: ids.slice(0, 3).map((groupId) => ({ groupId, userId: needle.id, status: 'member' })),
    });
    await t.prisma.db.$executeRaw`ANALYZE groups`;
    await t.prisma.db.$executeRaw`ANALYZE group_members`;
    const plan = await t.prisma.db.$queryRaw<{ 'QUERY PLAN': unknown }[]>(
      Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${joinedGroupsQuery(needle.id)}`,
    );
    const serialized = JSON.stringify(plan);
    expect(serialized).toMatch(/Index (Only )?Scan/);
    expect(serialized).not.toContain('"Node Type":"Seq Scan"');
    expect((await t.app.get(GroupRepository).joinedBy(needle.id)).map((g) => g.id)).toEqual(
      ids.slice(0, 3),
    );
    const bounded = await t.app.get(GroupRepository).joinedBy(filler.id);
    expect(bounded).toHaveLength(1000);
    expect(bounded.map((g) => g.id)).toEqual([...ids].sort().slice(0, 1000));
    const output = resolve('../../test-results');
    mkdirSync(output, { recursive: true });
    writeFileSync(
      resolve(output, 'v46-813-A1-joined-plan.json'),
      JSON.stringify(
        {
          fixtureGroups: 10000,
          fixtureMemberships: 10003,
          query: joinedGroupsQuery(needle.id).text,
          plan,
        },
        null,
        2,
      ),
    );
  });
});
