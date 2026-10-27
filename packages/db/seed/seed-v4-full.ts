import { z } from 'zod';
import { hash, argon2id } from 'argon2';
import { buildFees, buildProjects, MOCK_NOW } from '@opchub/shared/mock-domains';
import { planOf } from '@opchub/shared';
import { createPrismaClient, type DbTx } from '../src/client';
import { CATEGORIES } from './catalog';
import { DEMO_USERS } from './demo/people';
import { seedProjects } from './demo/project';
import { seedInvestors } from './demo/investor';
import { seedAffiliates } from './demo/affiliate';
import { seedAffiliateScenario } from './demo/affiliate-scenario';

const env = z
  .object({ DIRECT_URL: z.string().url() })
  // eslint-disable-next-line no-restricted-syntax -- script CLI, env parse bằng zod tại chỗ
  .parse(process.env);

const db = createPrismaClient(env.DIRECT_URL, { max: 2 });

async function seedCategories(tx: DbTx) {
  for (const c of CATEGORIES) {
    await tx.category.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        color: c.color,
        scopes: c.scopes,
        sort: c.sort,
        hidden: c.hidden,
      },
      update: {
        name: c.name,
        color: c.color,
        scopes: c.scopes,
        sort: c.sort,
        hidden: c.hidden,
      },
    });
  }
}

async function seedDemoUsers(tx: DbTx) {
  const memberHash = await hash('User@2026', { type: argon2id });
  const existingUsers = await tx.user.findMany({
    select: { id: true, memberCode: true, email: true },
  });
  const existingIds = new Set(existingUsers.map((u) => u.id));
  const existingCodes = new Set(existingUsers.map((u) => u.memberCode).filter(Boolean));
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  let nextSeq = 1;
  const allocateCode = (desired: string): string => {
    if (!existingCodes.has(desired)) {
      existingCodes.add(desired);
      return desired;
    }
    while (true) {
      const candidate = `TV${String(700000 + nextSeq).padStart(6, '0')}`;
      nextSeq++;
      if (!existingCodes.has(candidate)) {
        existingCodes.add(candidate);
        return candidate;
      }
    }
  };

  for (const u of DEMO_USERS) {
    if (existingIds.has(u.id)) continue;

    const memberCode = allocateCode(u.memberCode);
    let email = u.email;
    if (existingEmails.has(email.toLowerCase())) {
      email = `${u.id}@opchub.demo.invalid`;
    }
    existingEmails.add(email.toLowerCase());

    await tx.user.create({
      data: {
        id: u.id,
        memberCode,
        accountType: u.accountType,
        fullName: u.fullName,
        email,
        phone: u.phone,
        passwordHash: u.login ? memberHash : null,
        registrationRole: u.registrationRole,
        position: u.position,
        country: u.country,
        systemRole: u.systemRole,
        status: u.status,
        avatarUrl: u.avatarUrl,
        emailVerifiedAt: u.createdAt,
        declaredAt: u.createdAt,
        createdAt: u.createdAt,
        updatedAt: u.createdAt,
      },
    });
    existingIds.add(u.id);
  }
}

async function seedDemoFees(tx: DbTx) {
  const validUserIds = new Set((await tx.user.findMany({ select: { id: true } })).map((u) => u.id));
  const fees = buildFees().filter((f) => validUserIds.has(f.userId));

  for (const f of fees) {
    await tx.membershipFee.upsert({
      where: { userId: f.userId },
      create: {
        userId: f.userId,
        status: f.status,
        validUntil: f.validUntil ? new Date(f.validUntil) : null,
        paidAt: f.paidAt ? new Date(f.paidAt) : null,
        amount: f.amount,
        plan: planOf(f.accountType) ?? 'personal',
        createdAt: new Date(f.joinedAt),
        updatedAt: new Date(),
      },
      update: {
        status: f.status,
        validUntil: f.validUntil ? new Date(f.validUntil) : null,
        paidAt: f.paidAt ? new Date(f.paidAt) : null,
        amount: f.amount,
        plan: planOf(f.accountType) ?? 'personal',
      },
    });
  }

  await tx.membershipFeePeriod.upsert({
    where: { id: 'demo-fee-m1' },
    create: {
      id: 'demo-fee-m1',
      userId: 'm1',
      startsAt: new Date(MOCK_NOW - 120 * 86_400_000),
      endsAt: new Date(MOCK_NOW + 245 * 86_400_000),
      amount: 3_600_000,
      source: 'transfer',
    },
    update: {},
  });
}

async function seedDemoProjects(tx: DbTx) {
  const demoPjIds = buildProjects().map((p) => p.id);
  await tx.projectCommentLike.deleteMany({
    where: { comment: { projectId: { in: demoPjIds } } },
  });
  await tx.projectComment.deleteMany({ where: { projectId: { in: demoPjIds } } });
  await tx.projectFollow.deleteMany({ where: { projectId: { in: demoPjIds } } });
  await tx.projectShare.deleteMany({ where: { projectId: { in: demoPjIds } } });
  await tx.projectFunding.deleteMany({ where: { projectId: { in: demoPjIds } } });
  await tx.projectFundraising.deleteMany({ where: { projectId: { in: demoPjIds } } });
  await tx.projectMember.deleteMany({ where: { projectId: { in: demoPjIds } } });
  await tx.project.deleteMany({ where: { id: { in: demoPjIds } } });

  await seedProjects(tx);
}

async function seedDemoInvestors(tx: DbTx) {
  await tx.investorSummary.deleteMany({});
  await tx.investorInterest.deleteMany({});
  await seedInvestors(tx);
}

async function seedDemoAffiliates(tx: DbTx) {
  const agentIds = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
  await tx.affiliateClickDaily.deleteMany({
    where: { OR: [{ affiliateId: { startsWith: 'demo-' } }, { affiliateId: { in: agentIds } }] },
  });
  await tx.commission.deleteMany({
    where: { OR: [{ id: { startsWith: 'demo-' } }, { affiliateId: { in: agentIds } }] },
  });
  await tx.referral.deleteMany({
    where: { OR: [{ id: { startsWith: 'demo-' } }, { affiliateId: { in: agentIds } }] },
  });
  await tx.affiliate.deleteMany({
    where: { OR: [{ id: { startsWith: 'demo-' } }, { id: { in: agentIds } }] },
  });
  await tx.membershipFeePeriod.deleteMany({
    where: { id: { startsWith: 'demo-fee-af-' } },
  });
  await tx.user.deleteMany({
    where: { OR: [{ id: { startsWith: 'af-owner-' } }, { id: { startsWith: 'af-cust-' } }] },
  });

  await seedAffiliates(tx);
  await seedAffiliateScenario(tx, { paused: false, payout: false });
}

async function main() {
  const started = Date.now();
  await db.$transaction(
    async (tx) => {
      await seedCategories(tx);
      await seedDemoUsers(tx);
      await seedDemoFees(tx);
      await seedDemoProjects(tx);
      await seedDemoInvestors(tx);
      await seedDemoAffiliates(tx);
    },
    { timeout: 180_000, maxWait: 45_000 },
  );
  process.stdout.write(`Hoàn tất toàn bộ nạp bổ sung trong ${Date.now() - started} ms\n`);
}

main()
  .catch((e) => {
    process.stderr.write(`Lỗi khi seed: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
