import type { LiveMember } from '@opchub/shared/api-domains';
import { expect } from 'vitest';
import { DashboardContentCacheService } from '@/modules/dashboard/dashboard-content-cache.service';
import type { TestApp } from '../setup/test-app';

/** The negative prototype-label test needs a source fixture without those labels.
 * Demo seed legitimately persists m5 with them; never filter real names in production.
 * Only test DB canonical PKs are touched, and original timestamps are restored too.
 */
export async function withDashboardLabelsAbsent(t: TestApp, check: () => Promise<void>) {
  const [member, profile] = await Promise.all([
    t.prisma.db.user.findUnique({
      where: { id: 'm5' },
      select: { fullName: true, updatedAt: true },
    }),
    t.prisma.db.businessProfile.findUnique({
      where: { userId: 'm5' },
      select: { companyName: true, updatedAt: true },
    }),
  ]);
  const cache = t.app.get(DashboardContentCacheService);
  try {
    await t.prisma.db.$transaction(async (tx) => {
      if (member) {
        await tx.user.update({
          where: { id: 'm5' },
          data: { fullName: 'Persisted dashboard seed member' },
        });
      }
      if (profile) {
        await tx.businessProfile.update({
          where: { userId: 'm5' },
          data: { companyName: 'Persisted dashboard seed company' },
        });
      }
    });
    await cache.invalidate();
    await check();
  } finally {
    try {
      await t.prisma.db.$transaction(async (tx) => {
        if (member) await tx.user.update({ where: { id: 'm5' }, data: member });
        if (profile) {
          await tx.businessProfile.update({ where: { userId: 'm5' }, data: profile });
        }
      });
    } finally {
      await cache.invalidate();
    }
  }
}

/** One PK-batched read, not a DB query per rendered card. */
export async function expectPersistedMembers(t: TestApp, members: LiveMember[]) {
  expect(members.length).toBeGreaterThan(0);
  const rows = await t.prisma.db.user.findMany({
    where: { id: { in: members.map((m) => m.id) } },
    select: {
      id: true,
      fullName: true,
      accountType: true,
      businessProfile: { select: { companyName: true } },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const member of members) {
    const row = byId.get(member.id);
    expect(row, `Dashboard member ${member.id} must exist in DB`).toBeDefined();
    expect(member.name).toBe(row?.fullName);
    expect(member.org).toBe(
      row?.accountType === 'business' ? (row.businessProfile?.companyName ?? '') : 'Freelancer',
    );
  }
}
