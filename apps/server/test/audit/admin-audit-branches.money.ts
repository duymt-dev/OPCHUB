import { randomUUID } from 'node:crypto';
import { CommissionAdminService } from '@/modules/affiliate/services/commission-admin.service';
import { AdminFeesService } from '@/modules/membership-fee/services/admin-fees.service';
import { RegionalDirectorService, RegionalPayoutService } from '@/modules/regional-director';
import { affiliateEarning } from '../factories/affiliate-admin.factory';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { createUser } from '../factories/user.factory';
import type { RollbackCase } from './admin-audit-branches.cases';

export const financialRollbackCases: readonly RollbackCase[] = [
  {
    name: 'affiliate rate and accrued commission',
    prepare: async (t, actor) => {
      const f = await affiliateEarning(t);
      return {
        invoke: () => t.app.get(CommissionAdminService).rate(actor, [f.affiliate.id], 30),
        state: async () => ({
          affiliate: await t.prisma.db.affiliate.findUniqueOrThrow({
            where: { id: f.affiliate.id },
          }),
          commission: await t.prisma.db.commission.findUniqueOrThrow({
            where: { id: f.commission.id },
          }),
        }),
      };
    },
  },
  {
    name: 'membership-fee activation',
    prepare: async (t, actor) => {
      const u = await createUser(t, { fee: 'pending_payment' });
      return {
        invoke: () => t.app.get(AdminFeesService).collect(actor, [u.id]),
        state: async () => ({
          fee: await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } }),
          periods: await t.prisma.db.membershipFeePeriod.findMany({ where: { userId: u.id } }),
        }),
        close: () => t.prisma.db.user.delete({ where: { id: u.id } }),
      };
    },
  },
  {
    name: 'regional-director revocation and fee state',
    prepare: async (t) => {
      const f = await regionalShareFixture(t);
      return {
        invoke: () => t.app.get(RegionalDirectorService).revoke(f.who, f.region),
        state: async () => ({
          director: await t.prisma.db.regionalDirector.findUniqueOrThrow({
            where: { region: f.region },
          }),
          fee: await t.prisma.db.membershipFee.findUniqueOrThrow({
            where: { userId: f.director.id },
          }),
          provinces: await t.prisma.db.regionalDirectorProvince.findMany({
            where: { region: f.region },
            orderBy: { province: 'asc' },
          }),
        }),
      };
    },
  },
  {
    name: 'regional-director payout and payable shares',
    prepare: async (t) => {
      const f = await regionalShareFixture(t);
      await f.ledger.record(f.input);
      return {
        invoke: () =>
          t.app
            .get(RegionalPayoutService)
            .record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-11-04')),
        state: async () => ({
          shares: await t.prisma.db.regionalShare.findMany({
            where: { directorUserId: f.director.id },
            orderBy: { id: 'asc' },
          }),
          payouts: await t.prisma.db.regionalPayout.findMany({
            where: { directorUserId: f.director.id },
            orderBy: { id: 'asc' },
          }),
        }),
      };
    },
  },
];
