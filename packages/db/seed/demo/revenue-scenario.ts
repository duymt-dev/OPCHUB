import {
  DIRECTOR_DEMO,
  REVENUE_DEMO,
  REVENUE_POLICY_DEFAULTS,
  revenueDemoCustomers,
  revenueDemoReceipt,
} from '@opchub/shared/fixtures';
import { allocateRevenue } from '@opchub/shared';
import type { DbTx } from '../../src/client';
import { seedRevenueDemoAccounts } from './revenue-scenario-accounts';

/** Seed recorded history, not runtime reconciliation or an external bank transfer. */
export async function seedRevenueDemo(tx: DbTx): Promise<void> {
  const first = revenueDemoCustomers[0];
  if (!first) throw new Error('Missing sharing fixture');
  if (await tx.revenueShare.findUnique({ where: { id: first.shareId }, select: { id: true } }))
    return;
  const director = DIRECTOR_DEMO.find((d) => d.userId === REVENUE_DEMO.directorId);
  if (!director) throw new Error('Missing north director fixture');
  await seedRevenueDemoAccounts(tx);
  await tx.affiliatePolicy.update({ where: { id: 1 }, data: REVENUE_POLICY_DEFAULTS });
  await tx.regionalDirector.update({
    where: { region: 'north', userId: director.userId, version: 1 },
    data: { appointedAt: new Date(REVENUE_DEMO.appointedAt) },
  });
  await tx.regionalDirectorHistory.create({
    data: {
      id: REVENUE_DEMO.historyId,
      region: 'north',
      action: 'appointed',
      userId: director.userId,
      memberName: director.name,
      actorId: 'admin',
      actorName: 'Super Admin',
      actorRole: 'Super Admin',
      summary: `Bổ nhiệm GĐ Vùng Miền Bắc · ${director.name}`,
      createdAt: new Date(REVENUE_DEMO.appointedAt),
    },
  });
  await tx.revenueRecipientBank.create({ data: { directorId: director.userId, ...director.bank } });
  await tx.revenueShare.createMany({
    data: revenueDemoCustomers.map((p) => {
      const r = revenueDemoReceipt(p);
      return {
        ...r,
        id: p.shareId,
        affiliateId: p.referred ? REVENUE_DEMO.agentId : null,
        directorId: p.referred ? director.userId : null,
        directorName: p.referred ? director.name : null,
        region: p.referred ? 'north' : null,
        bankName: p.referred ? director.bank.bankName : null,
        bankNo: p.referred ? director.bank.bankNo : null,
        bankHolder: p.referred ? director.bank.bankHolder : null,
        receivedAt: new Date(r.receivedAt),
        recordedAt: new Date(r.recordedAt),
        firstReceivedAt: new Date(p.first),
        monthKey: REVENUE_DEMO.month,
        ...REVENUE_POLICY_DEFAULTS,
        ...allocateRevenue({
          amount: r.amount,
          firstReceivedAt: new Date(p.first),
          receivedAt: new Date(r.receivedAt),
          policy: REVENUE_POLICY_DEFAULTS,
          hasDirector: p.referred,
        }),
      };
    }),
  });
}
