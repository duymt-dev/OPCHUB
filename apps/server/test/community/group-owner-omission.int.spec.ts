import { groupDetailSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-229 NA-29 optional owner on metadata updates', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });

  async function borrowedProvince(groupId: string, original: string) {
    const seed = await t.prisma.db.group.findUniqueOrThrow({
      where: { id: 'c33' },
      select: { province: true, deletedAt: true },
    });
    await t.prisma.db.group.update({ where: { id: 'c33' }, data: { deletedAt: new Date() } });
    try {
      await t.prisma.db.group.update({ where: { id: groupId }, data: { province: seed.province } });
    } catch (error) {
      await t.prisma.db.group.update({ where: { id: 'c33' }, data: { deletedAt: seed.deletedAt } });
      throw error;
    }
    return {
      province: seed.province,
      restore: async () => {
        await t.prisma.db.group.update({
          where: { id: groupId },
          data: { province: original, deletedAt: new Date() },
        });
        await t.prisma.db.group.update({
          where: { id: 'c33' },
          data: { deletedAt: seed.deletedAt },
        });
      },
    };
  }
  const transfers = (groupId: string) =>
    t.prisma.db.outboxEvent.findMany({
      where: { type: 'group.owner_changed', payload: { path: ['groupId'], equals: groupId } },
      select: { payload: true },
    });

  it('omitted owner preserves member ownership, count and absence of phantom transfer; explicit transfer still works', async () => {
    const actor = await createUser(t, { systemRole: 'admin' });
    const owner = await createUser(t, { fee: 'active' });
    const nextOwner = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, actor);
    const g = await createGroup(t);
    await addMember(t, g.id, owner.id, 'owner');
    const fixture = await borrowedProvince(g.id, g.province);
    try {
      const body = {
        name: g.name,
        province: fixture.province,
        description: 'Metadata only',
        joinMode: 'open',
      };
      const response = await t.call(`/admin/groups/${g.id}`, {
        method: 'PATCH',
        token,
        json: body,
      });
      expect(response.status).toBe(200);
      expect(groupDetailSchema.parse(await response.json())).toMatchObject({
        ownerId: owner.id,
        memberCount: 1,
      });
      expect(
        await t.prisma.db.groupMember.findUnique({
          where: { groupId_userId: { groupId: g.id, userId: actor.id } },
          select: { userId: true },
        }),
      ).toBeNull();
      expect(await transfers(g.id)).toEqual([]);
      const explicit = await t.call(`/admin/groups/${g.id}`, {
        method: 'PATCH',
        token,
        json: { ...body, ownerId: nextOwner.id },
      });
      expect(explicit.status).toBe(200);
      expect(groupDetailSchema.parse(await explicit.json())).toMatchObject({
        ownerId: nextOwner.id,
        memberCount: 2,
      });
      expect(
        await t.prisma.db.groupMember.findUniqueOrThrow({
          where: { groupId_userId: { groupId: g.id, userId: owner.id } },
          select: { groupRole: true, status: true },
        }),
      ).toEqual({ groupRole: 'member', status: 'member' });
      const repeated = await t.call(`/admin/groups/${g.id}`, {
        method: 'PATCH',
        token,
        json: body,
      });
      expect(groupDetailSchema.parse(await repeated.json())).toMatchObject({
        ownerId: nextOwner.id,
        memberCount: 2,
      });
      expect((await transfers(g.id)).map((row) => row.payload)).toEqual([
        { groupId: g.id, userId: nextOwner.id },
      ]);
    } finally {
      await fixture.restore();
    }
  });
});
