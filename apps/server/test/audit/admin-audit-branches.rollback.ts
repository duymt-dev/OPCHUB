import { randomUUID } from 'node:crypto';
import { AdminUsersService } from '@/modules/account';
import { AdminSecurityService } from '@/modules/admin-account/services/admin-security.service';
import { ProjectAdminService } from '@/modules/project/services/project-admin.service';
import { FundraisingReviewService } from '@/modules/project/services/fundraising-review.service';
import { StoreAdminService } from '@/modules/local-business/services/store-admin.service';
import { AdminModerationService } from '@/modules/moderation/services/admin-moderation.service';
import { createUser } from '../factories/user.factory';
import { createGroup, tokenOf } from '../factories/group.factory';
import { createProject } from '../factories/project.factory';
import type { TestApp } from '../setup/test-app';
import { financialRollbackCases } from './admin-audit-branches.money';

export interface RollbackFixture {
  invoke: () => Promise<unknown>;
  state: () => Promise<unknown>;
  close?: () => Promise<unknown>;
  auditMethod?: 'log' | 'logMany';
}
export interface RollbackCase {
  name: string;
  prepare: (t: TestApp, actor: { id: string; ip: null; role: string }) => Promise<RollbackFixture>;
}

export const auditRollbackCases: readonly RollbackCase[] = [
  {
    name: 'account member lock',
    prepare: async (t, actor) => {
      const u = await createUser(t, { fee: 'active' });
      return {
        invoke: () => t.app.get(AdminUsersService).setStatus(actor, [u.id], 'locked', 'A12'),
        auditMethod: 'logMany',
        state: () => t.prisma.db.user.findUniqueOrThrow({ where: { id: u.id } }),
        close: () => t.prisma.db.user.delete({ where: { id: u.id } }),
      };
    },
  },
  {
    name: 'admin-account lock',
    prepare: async (t, actor) => {
      const u = await createUser(t, { systemRole: 'moderator' });
      return {
        invoke: () => t.app.get(AdminSecurityService).setStatus(actor, u.id, 'locked', 'A12'),
        state: async () => ({
          user: await t.prisma.db.adminUser.findUniqueOrThrow({ where: { id: u.id } }),
          sessions: await t.prisma.db.adminRefreshToken.findMany({ where: { adminUserId: u.id } }),
        }),
        close: async () => {
          await t.prisma.db.adminUser.delete({ where: { id: u.id } });
          await t.prisma.db.user.delete({ where: { id: u.id } });
        },
      };
    },
  },
  {
    name: 'project approval',
    prepare: async (t, actor) => {
      const u = await createUser(t, { fee: 'active' });
      const p = await createProject(t, await tokenOf(t, u), { submit: false }, false);
      await t.prisma.db.project.update({ where: { id: p.id }, data: { status: 'pending_review' } });
      return {
        invoke: () => t.app.get(ProjectAdminService).review(actor, p.id, { decision: 'approve' }),
        state: () => t.prisma.db.project.findUniqueOrThrow({ where: { id: p.id } }),
        close: async () => {
          await t.prisma.db.project.delete({ where: { id: p.id } });
          await t.prisma.db.user.delete({ where: { id: u.id } });
        },
      };
    },
  },
  {
    name: 'project fundraising approval',
    prepare: async (t, actor) => {
      const u = await createUser(t, { fee: 'active' });
      const p = await createProject(t, await tokenOf(t, u));
      const row = await t.prisma.db.projectFundraising.create({
        data: {
          projectId: p.id,
          ownerId: u.id,
          amount: 1_000_000,
          status: 'pending_review',
          paidAt: new Date(),
          code: `GV${String(Math.floor(Math.random() * 900000) + 100000)}`,
        },
      });
      return {
        invoke: () =>
          t.app.get(FundraisingReviewService).review(actor, p.id, row.id, 'approve', undefined),
        state: () => t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id: row.id } }),
        close: async () => {
          await t.prisma.db.project.delete({ where: { id: p.id } });
          await t.prisma.db.user.delete({ where: { id: u.id } });
        },
      };
    },
  },
  {
    name: 'local-business store moderation',
    prepare: async (t, actor) => {
      const u = await createUser(t, { accountType: 'business', fee: 'active' });
      const row = await t.prisma.db.store.create({
        data: {
          ownerId: u.id,
          slug: randomUUID(),
          name: 'A12 store',
          status: 'published',
        },
      });
      return {
        invoke: () => t.app.get(StoreAdminService).moderate(actor, 'hide', [row.id], 'A12'),
        state: () => t.prisma.db.store.findUniqueOrThrow({ where: { id: row.id } }),
        close: () => t.prisma.db.user.delete({ where: { id: u.id } }),
        auditMethod: 'logMany',
      };
    },
  },
  {
    name: 'moderation report and member lock',
    prepare: async (t, actor) => {
      const u = await createUser(t, { fee: 'active' });
      const g = await createGroup(t);
      const message = await t.prisma.db.message.create({
        data: {
          roomId: `${g.id}-general`,
          senderId: u.id,
          body: 'A12 message',
          clientMsgId: randomUUID(),
        },
      });
      const report = await t.prisma.db.report.create({
        data: {
          messageId: message.id,
          source: 'report',
          reason: 'spam',
        },
      });
      return {
        invoke: () => t.app.get(AdminModerationService).act(actor, report.id, 'lock', 'A12', 7),
        state: async () => ({
          user: await t.prisma.db.user.findUniqueOrThrow({ where: { id: u.id } }),
          report: await t.prisma.db.report.findUniqueOrThrow({ where: { id: report.id } }),
          message: await t.prisma.db.message.findUniqueOrThrow({ where: { id: message.id } }),
        }),
        close: async () => {
          await t.prisma.db.group.delete({ where: { id: g.id } });
          await t.prisma.db.user.delete({ where: { id: u.id } });
        },
      };
    },
  },
  ...financialRollbackCases,
];
