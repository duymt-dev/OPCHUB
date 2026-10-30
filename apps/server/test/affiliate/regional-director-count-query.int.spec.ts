import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { directorMemberQueries } from '@/modules/account/repositories/director-member.query';
import { activeAffiliateUsersQuery } from '@/modules/affiliate/repositories/regional-director-count.query';
import { provinceMembershipQuery } from '@/modules/community/repositories/province-directory.query';
import { ProvinceDirectoryService } from '@/modules/community';
import { createTestApp, type TestApp } from '../setup/test-app';
import { directorPlanEvidence, directorStorageEvidence } from './director-plan-evidence';

describe('REQ-616 D-121 broad/count EXPLAIN on 10k affiliates', () => {
  let t: TestApp;
  let baselineCandidates: number;
  const tag = `director-broad-${randomUUID()}`;
  const codePrefix = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
  const ids = Array.from({ length: 10_000 }, (_, i) => `${tag}-${i}`);
  const groups = ['a', 'b', 'industry', 'deleted'].map((kind) => `${tag}-${kind}`);
  const at = new Date('2000-01-01T00:00:00Z');
  beforeAll(async () => {
    t = await createTestApp();
    const before = await t.prisma.db.$queryRaw<{ total: number }[]>(
      directorMemberQueries({ q: '', page: 1, size: 20 }, []).count,
    );
    const row = before[0];
    if (!row) throw new Error('Missing candidate count');
    baselineCandidates = row.total;
    const firstProvince = groups[0];
    const secondProvince = groups[1];
    if (!firstProvince || !secondProvince) throw new Error('Missing province fixture');
    await t.prisma.db.user.createMany({
      data: ids.map((id) => ({
        id,
        memberCode: id,
        fullName: id,
        email: `${id}@query.example.test`,
        accountType: 'personal',
      })),
    });
    await t.prisma.db.affiliate.createMany({
      data: ids.map((userId, i) => ({
        id: `${tag}-af-${i}`,
        userId,
        code: `${codePrefix}${i.toString(36).padStart(4, '0').toUpperCase()}`,
        rate: 20,
      })),
    });
    await t.prisma.db.group.createMany({
      data: groups.map((id, i) => ({
        id,
        slug: id,
        name: id,
        province: i === 2 ? secondProvince : id,
        region: 'north',
        kind: i === 2 ? 'industry' : 'province',
        industry: i === 2 ? 'Query industry' : null,
        parentId: i === 2 ? secondProvince : null,
        deletedAt: i === 3 ? at : null,
      })),
    });
    await t.prisma.db.groupMember.createMany({
      data: ids.flatMap((userId) =>
        groups.map((groupId, i) => ({
          userId,
          groupId,
          createdAt: new Date(at.getTime() + (i < 2 ? 1000 : 0)),
        })),
      ),
    });
    // Benchmark steady-state index-only paths after normal visibility-map maintenance,
    // not the artificially all-new/unvacuumed bulk fixture. No planner options are changed.
    await t.prisma.db.$executeRaw`VACUUM (ANALYZE) users`;
    await t.prisma.db.$executeRaw`VACUUM (ANALYZE) affiliates`;
    await t.prisma.db.$executeRaw`VACUUM (ANALYZE) group_members`;
    await t.prisma.db.$executeRaw`ANALYZE groups`;
    const relations = [
      'affiliates',
      'affiliates_director_active_users',
      'users',
      'users_director_count',
      'users_director_count_compact',
    ];
    await directorStorageEvidence(t, relations, 'before-fixture-index-maintenance');
    // Repeated 10k insert/delete test runs bloat this identity index beyond the heap.
    // Rebuild ONLY this test-DB fixture index; emit both sizes, never override planner costs.
    await t.prisma.db.$executeRaw`REINDEX INDEX affiliates_director_active_users`;
    await directorStorageEvidence(t, relations, 'after-fixture-index-maintenance');
  });
  afterAll(async () => {
    await t.prisma.db.group.deleteMany({ where: { id: { in: groups } } });
    await t.prisma.db.user.deleteMany({ where: { id: { in: ids } } });
    await t.close();
  });

  it('D-121 counts all 10k affiliates once, choosing earliest current province, not industry/deleted', async () => {
    const rows = await t.app.get(ProvinceDirectoryService).provincesOf([...ids, ids[0] ?? '']);
    expect(rows).toHaveLength(10_000);
    expect(new Set(rows.map((row) => row.userId)).size).toBe(10_000);
    expect(new Set(rows.map((row) => row.province))).toEqual(new Set([groups[0]]));
    const nodes = await directorPlanEvidence(
      t,
      'affiliate-province-memberships-all',
      provinceMembershipQuery(ids),
    );
    expect(nodes.some((n) => n.relation === 'group_members' && n.type === 'Seq Scan')).toBe(false);
  });

  it('REQ-616 active affiliate identity projection avoids scanning wide affiliate heap rows', async () => {
    const rows = await t.prisma.db.$queryRaw<{ userId: string }[]>(activeAffiliateUsersQuery());
    const requested = new Set(ids);
    expect(rows.filter((row) => requested.has(row.userId))).toHaveLength(10_000);
    expect(rows.map((row) => row.userId)).toEqual(rows.map((row) => row.userId).sort());
    const nodes = await directorPlanEvidence(
      t,
      'active-affiliate-identities',
      activeAffiliateUsersQuery(),
    );
    expect(nodes.some((n) => n.relation === 'affiliates' && n.type === 'Seq Scan')).toBe(false);
  });

  it('REQ-616 empty candidate search pages/counts without applying a redundant unaccent wildcard', async () => {
    const query = directorMemberQueries({ q: '', page: 1, size: 20 }, []);
    const page = await t.prisma.db.$queryRaw<{ id: string }[]>(query.page);
    expect(page).toHaveLength(20);
    const count = await t.prisma.db.$queryRaw<{ total: number }[]>(query.count);
    expect(count[0]?.total).toBe(baselineCandidates + 10_000);
    const pageNodes = await directorPlanEvidence(t, 'member-page-empty-search', query.page);
    const countNodes = await directorPlanEvidence(t, 'member-count-empty-search', query.count);
    for (const nodes of [pageNodes, countNodes])
      expect(nodes.some((n) => n.relation === 'users' && n.type === 'Seq Scan')).toBe(false);
  });

  it('D-121 empty inputs stay empty and leaving the earliest province selects the next current membership', async () => {
    const userId = ids[0];
    const first = groups[0];
    const next = groups[1];
    if (!userId || !first || !next) throw new Error('Missing membership fixture');
    const directory = t.app.get(ProvinceDirectoryService);
    expect(await directory.provincesOf([])).toEqual([]);
    await t.prisma.db.groupMember.update({
      where: { groupId_userId: { groupId: first, userId } },
      data: { status: 'left' },
    });
    try {
      expect(await directory.provincesOf([userId, userId])).toEqual([{ userId, province: next }]);
    } finally {
      await t.prisma.db.groupMember.update({
        where: { groupId_userId: { groupId: first, userId } },
        data: { status: 'member' },
      });
    }
  });

  it('REQ-616 paused affiliates do not enter the director count directory', async () => {
    const userId = ids[0];
    if (!userId) throw new Error('Missing affiliate fixture');
    await t.prisma.db.affiliate.update({ where: { userId }, data: { status: 'paused' } });
    try {
      const rows = await t.prisma.db.$queryRaw<{ userId: string }[]>(activeAffiliateUsersQuery());
      const requested = new Set(ids);
      expect(rows.filter((row) => requested.has(row.userId))).toHaveLength(9999);
      expect(rows.some((row) => row.userId === userId)).toBe(false);
    } finally {
      await t.prisma.db.affiliate.update({ where: { userId }, data: { status: 'active' } });
    }
  });

  it('REQ-616 empty search count excludes locked/deleted members and incumbents exactly once', async () => {
    const [locked, deleted, incumbent] = ids;
    if (!locked || !deleted || !incumbent) throw new Error('Missing eligibility fixture');
    await t.prisma.db.user.update({ where: { id: locked }, data: { status: 'locked' } });
    await t.prisma.db.user.update({ where: { id: deleted }, data: { deletedAt: at } });
    try {
      const queries = directorMemberQueries({ q: '', page: 1, size: 20 }, [
        incumbent,
        incumbent,
        locked,
        deleted,
        'missing-incumbent',
      ]);
      const rows = await t.prisma.db.$queryRaw<{ total: number }[]>(queries.count);
      expect(rows[0]?.total).toBe(baselineCandidates + 9997);
    } finally {
      await t.prisma.db.user.update({ where: { id: locked }, data: { status: 'active' } });
      await t.prisma.db.user.update({ where: { id: deleted }, data: { deletedAt: null } });
    }
  });
});
