import { verify } from 'argon2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DIRECTOR_DEMO } from '@opchub/shared/fixtures';
import { buildFees, affiliateMockState } from '@opchub/shared/mock-domains';
import { createPrismaClient } from '../src/client';
import { seedDemo } from '../seed/demo/index';
import { seedDemoDirectors } from '../seed/demo/regional-directors';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });
beforeAll(() => seedDemo(db));
afterAll(() => db.$disconnect());

describe('REQ-616 native director demo seed', () => {
  it('has three registered unlocked accounts, correct banks and BR-462 snapshots matching MSW', async () => {
    const slots = await db.regionalDirector.findMany({ orderBy: { region: 'asc' } });
    expect(slots).toHaveLength(3);
    const users = await db.user.findMany({
      where: { id: { in: DIRECTOR_DEMO.map((row) => row.userId) } },
      include: { membershipFee: true },
    });
    expect(users).toHaveLength(3);
    const original = buildFees();
    for (const demo of DIRECTOR_DEMO) {
      const user = users.find((row) => row.id === demo.userId);
      const fee = original.find((row) => row.userId === demo.userId);
      if (!user || !fee) throw new Error('Incomplete native seed');
      expect(user).toMatchObject({
        fullName: demo.name,
        email: demo.email,
        deletedAt: null,
        status: 'active',
      });
      expect(await verify(user.passwordHash ?? '', 'User@2026')).toBe(true);
      expect(user.membershipFee).toMatchObject({
        status: 'regional_director',
        directorPreviousStatus: fee.status,
        validUntil: fee.validUntil ? new Date(fee.validUntil) : null,
        directorPreviousValidUntil: fee.validUntil ? new Date(fee.validUntil) : null,
        paidAt: fee.paidAt ? new Date(fee.paidAt) : null,
        amount: fee.amount,
      });
      expect(slots.find((slot) => slot.region === demo.region)).toMatchObject({
        userId: demo.userId,
        version: 1,
        bankName: demo.bank.bankName,
        bankNo: demo.bank.bankNo,
        bankHolder: demo.bank.bankHolder,
      });
    }
  });

  it('rerunning the helper preserves original snapshots and adds no business effects', async () => {
    const before = await db.membershipFee.findMany({
      where: { status: 'regional_director' },
      orderBy: { userId: 'asc' },
    });
    const outbox = await db.outboxEvent.count();
    const audit = await db.auditLog.count();
    const mail = await db.mailLog.count();
    await db.$transaction((tx) => seedDemoDirectors(tx));
    expect(
      await db.membershipFee.findMany({
        where: { status: 'regional_director' },
        orderBy: { userId: 'asc' },
      }),
    ).toEqual(before);
    expect(await db.outboxEvent.count()).toBe(outbox);
    expect(await db.auditLog.count()).toBe(audit);
    expect(await db.mailLog.count()).toBe(mail);
    expect(await db.regionalDirectorHistory.count()).toBe(0);
    const affiliates = await db.affiliate.findMany({
      orderBy: { userId: 'asc' },
      select: { userId: true, code: true, status: true },
    });
    expect(affiliates).toHaveLength(10);
    expect(affiliates).toEqual(
      [...affiliateMockState().agents.values()]
        .map((agent) => ({ userId: agent.userId, code: agent.code, status: 'active' }))
        .sort((a, b) => a.userId.localeCompare(b.userId)),
    );
  });

  it('full demo reset restores province assignments, banks and incumbents after Admin edits', async () => {
    await db.regionalDirector.update({
      where: { region: 'north' },
      data: {
        version: 4,
        userId: null,
        appointedAt: null,
        bankName: null,
        bankNo: null,
        bankHolder: null,
      },
    });
    await db.regionalDirectorProvince.deleteMany({ where: { region: 'north' } });
    await seedDemo(db);
    expect(await db.regionalDirectorProvince.count()).toBe(34);
    expect(
      await db.regionalDirector.findUniqueOrThrow({ where: { region: 'north' } }),
    ).toMatchObject({ userId: 'm3', version: 1, bankName: 'Vietcombank' });
    expect(
      await db.user.count({
        where: { deletedAt: null, accountType: { in: ['business', 'personal'] } },
      }),
    ).toBe(10);
  });
});
