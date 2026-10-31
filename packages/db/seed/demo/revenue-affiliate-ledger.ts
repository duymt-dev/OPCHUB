import {
  AFFILIATE_REVENUE_APPOINTED_AT,
  AFFILIATE_REVENUE_HISTORY_ID,
  buildAffiliateRevenueDemo,
  DIRECTOR_DEMO,
  REVENUE_POLICY_DEFAULTS,
} from '@opchub/shared/fixtures';
import type { DbTx } from '../../src/client';
import { seedAffiliateRevenueAccounts } from './revenue-affiliate-accounts';

/** Explicit regenerated AF0 demo only, within the caller's reset transaction. */
export async function seedAffiliateRevenueDemo(tx: DbTx): Promise<void> {
  const demo = buildAffiliateRevenueDemo();
  const marker = demo.shares[0];
  if (!marker) throw new Error('Missing AF0 sharing fixture');
  if (await tx.revenueShare.findUnique({ where: { id: marker.id }, select: { id: true } })) return;
  await tx.affiliatePolicy.update({ where: { id: 1 }, data: REVENUE_POLICY_DEFAULTS });
  await seedAffiliateRevenueAccounts(tx);
  await seedAppointment(tx);
  await tx.revenuePayout.createMany({
    data: demo.payouts.map(({ bank, ...receipt }) => ({
      ...receipt,
      ...bank,
      amount: BigInt(receipt.amount),
      paidAt: new Date(receipt.paidAt),
      createdAt: new Date(receipt.paidAt),
      requestKey: `demo-af0-${receipt.id}`,
    })),
  });
  await tx.revenueShare.createMany({
    data: demo.shares.map((row) => ({
      id: row.id,
      source: row.source,
      sourceId: row.sourceId,
      plan: row.plan,
      customerId: row.customerId,
      affiliateId: row.affiliateId,
      region: row.region,
      ...row.policy,
      customerYear: row.customerYear,
      amount: row.amount,
      directorRate: row.directorRate,
      directorAmount: row.directorAmount,
      mediaSoftAmount: row.mediaSoftAmount,
      monthKey: row.monthKey,
      status: row.status,
      payoutId: row.payoutId,
      directorId: row.director?.id ?? null,
      directorName: row.director?.name ?? null,
      bankName: row.director?.bank.bankName ?? null,
      bankNo: row.director?.bank.bankNo ?? null,
      bankHolder: row.director?.bank.bankHolder ?? null,
      receivedAt: new Date(row.receivedAt),
      recordedAt: new Date(row.recordedAt),
      firstReceivedAt: new Date(row.firstReceivedAt),
      createdAt: new Date(row.recordedAt),
    })),
  });
}

async function seedAppointment(tx: DbTx): Promise<void> {
  const north = DIRECTOR_DEMO.find((d) => d.region === 'north');
  if (!north) throw new Error('Missing north fixture');
  await tx.regionalDirector.update({
    where: { region: 'north', userId: north.userId, version: 1 },
    data: { appointedAt: new Date(AFFILIATE_REVENUE_APPOINTED_AT) },
  });
  await tx.regionalDirectorHistory.create({
    data: {
      id: AFFILIATE_REVENUE_HISTORY_ID,
      region: 'north',
      action: 'appointed',
      userId: north.userId,
      memberName: north.name,
      actorId: 'admin',
      actorName: 'Super Admin',
      actorRole: 'Super Admin',
      summary: `Bổ nhiệm GĐ Vùng Miền Bắc · ${north.name}`,
      createdAt: new Date(AFFILIATE_REVENUE_APPOINTED_AT),
    },
  });
  await tx.revenueRecipientBank.createMany({
    data: DIRECTOR_DEMO.map((d) => ({ directorId: d.userId, ...d.bank })),
  });
}
