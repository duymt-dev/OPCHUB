import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  directorConfigSchema,
  onboardingSchema,
  storeListQuerySchema,
} from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { FeeEventsHandler } from '@/modules/membership-fee';
import { OnboardingRepository } from '@/modules/onboarding/repositories/onboarding.repository';
import { ProjectRepository } from '@/modules/project/repositories/project.repository';
import { StoreExploreRepository } from '@/modules/local-business/repositories/store-explore.repository';
import { createProject } from '../factories/project.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState, type CreatedUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const OLD_TERM = new Date('2000-01-01T00:00:00Z');
const FAR_FUTURE = new Date('2100-01-01T00:00:00Z');

describe('REQ-616 D-120 BR-462 discovery and onboarding exemption on real repositories', () => {
  let t: TestApp;
  let admin: string;
  let viewer: CreatedUser;
  let viewerToken: string;
  let original: { userId: string | null; appointedAt: Date | null; version: number };
  const ids: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    original = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
      select: { userId: true, appointedAt: true, version: true },
    });
    const actor = await createUser(t, { systemRole: 'admin' });
    viewer = await createUser(t, { fee: 'active' });
    ids.push(actor.id, viewer.id);
    admin = await tokenOf(t, actor);
    viewerToken = await tokenOf(t, viewer);
  });
  beforeEach(async () => {
    await flushAuthState(t);
    await t.prisma.db.regionalDirector.update({
      where: { region: 'north' },
      data: { userId: null, appointedAt: null },
    });
  });
  afterAll(async () => {
    await t.prisma.db.regionalDirector.update({ where: { region: 'north' }, data: original });
    await t.prisma.db.project.deleteMany({ where: { ownerId: { in: ids } } });
    await t.prisma.db.store.deleteMany({ where: { ownerId: { in: ids } } });
    await t.prisma.db.regionalDirectorHistory.deleteMany({ where: { userId: { in: ids } } });
    await t.prisma.db.adminUser.deleteMany({ where: { id: { in: ids } } });
    await t.prisma.db.user.deleteMany({ where: { id: { in: ids } } });
    await t.close();
  });

  async function owner(accountType: 'personal' | 'business') {
    const u = await createUser(t, { accountType, fee: 'active' });
    ids.push(u.id);
    return u;
  }
  async function expire(userId: string) {
    await t.prisma.db.membershipFee.update({
      where: { userId },
      data: { status: 'expired', validUntil: OLD_TERM, paidAt: new Date('1999-01-01') },
    });
    await flushAuthState(t);
  }
  async function slot() {
    const response = await t.call('/admin/gdv', { token: admin });
    expect(response.status).toBe(200);
    const result = directorConfigSchema
      .parse(await response.json())
      .slots.find((s) => s.region === 'north');
    if (!result) throw new Error('Missing permanent north slot');
    return result;
  }
  async function change(userId: string, revoke = false) {
    const { version } = await slot();
    const response = await t.call(revoke ? '/admin/gdv/north' : '/admin/gdv', {
      token: admin,
      method: revoke ? 'DELETE' : 'POST',
      json: revoke ? { version } : { userId, region: 'north', version },
    });
    expect(response.status).toBe(200);
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'membership_fee.changed', payload: { path: ['userId'], equals: userId } },
      select: { payload: true },
    });
    // Actual persisted payload; handler re-reads current DB fee (including after revocation).
    await t.app
      .get(FeeEventsHandler)
      .handle(parseOutboxPayload('membership_fee.changed', event.payload));
    const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId } });
    expect(fee.status).toBe(revoke ? 'pending_payment' : 'regional_director');
    expect(fee.validUntil).toEqual(OLD_TERM);
  }

  it('REQ-616 project raw feed/count and Prisma detail/related stay visible beyond the old term, then revoke hides them', async () => {
    const u = await owner('personal');
    const token = await tokenOf(t, u);
    const project = await createProject(t, token, { visibility: 'public' });
    const repo = t.app.get(ProjectRepository);
    const filter = { sort: 'new' as const, q: project.name };
    await expire(u.id);
    // Start the guard checks with an honestly expired JWT, then retain it through both writes.
    const expiredToken = await tokenOf(t, u);
    expect((await repo.explore(viewer.id, filter, 1, 9, FAR_FUTURE)).total).toBe(0);
    expect(await repo.findVisible(viewer.id, project.id, FAR_FUTURE)).toBeNull();
    expect((await t.call('/projects', { token: expiredToken })).status).toBe(402);

    await change(u.id);
    const feed = await repo.explore(viewer.id, filter, 1, 9, FAR_FUTURE);
    expect(feed.total).toBe(1);
    expect(feed.rows.map((p) => p.id)).toEqual([project.id]);
    expect((await repo.findVisible(viewer.id, project.id, FAR_FUTURE))?.id).toBe(project.id);
    expect((await repo.related(viewer.id, 'not-a-project', FAR_FUTURE)).map((p) => p.id)).toContain(
      project.id,
    );
    expect((await t.call(`/projects/${project.id}`, { token: viewerToken })).status).toBe(200);
    expect((await t.call('/projects', { token: expiredToken })).status).toBe(200);
    expect(await t.prisma.db.projectFundraising.count({ where: { projectId: project.id } })).toBe(
      0,
    );

    await change(u.id, true);
    expect((await repo.explore(viewer.id, filter, 1, 9, FAR_FUTURE)).total).toBe(0);
    expect(await repo.findVisible(viewer.id, project.id, FAR_FUTURE)).toBeNull();
    expect((await t.call(`/projects/${project.id}`, { token: viewerToken })).status).toBe(404);
    expect((await t.call('/projects', { token: expiredToken })).status).toBe(402);
    // Revocation never deletes the project or bypasses the retained-owner exception.
    expect((await repo.findVisible(u.id, project.id, FAR_FUTURE))?.id).toBe(project.id);
  });

  it('REQ-616 published business store discovery, facets, detail and favorite use indefinite exemption, not a renewed deadline', async () => {
    const u = await owner('business');
    // A published-store fixture isolates discovery; store publishing has its own API suite.
    const store = await t.prisma.db.store.create({
      data: {
        ownerId: u.id,
        name: `Director store ${u.id}`,
        status: 'published',
        intro: 'Published fixture',
      },
      select: { id: true, name: true },
    });
    const repo = t.app.get(StoreExploreRepository);
    const filter = storeListQuerySchema.parse({ q: store.name });
    await expire(u.id);
    const before = await repo.facets(FAR_FUTURE);
    expect((await repo.page(filter, FAR_FUTURE)).total).toBe(0);
    expect(await repo.detail(store.id, viewer.id, FAR_FUTURE)).toBeNull();

    await change(u.id);
    const page = await repo.page(filter, FAR_FUTURE);
    expect(page.total).toBe(1);
    expect(page.rows.map((s) => s.id)).toEqual([store.id]);
    expect((await repo.facets(FAR_FUTURE)).total).toBe(before.total + 1);
    expect((await repo.detail(store.id, viewer.id, FAR_FUTURE))?.id).toBe(store.id);
    expect((await t.call(`/stores/${store.id}`, { token: viewerToken })).status).toBe(200);
    expect(await repo.setFav(viewer.id, store.id, true, FAR_FUTURE)).toBe(true);
    expect(await repo.favs(viewer.id, [store.id])).toEqual(new Set([store.id]));

    await change(u.id, true);
    expect((await repo.page(filter, FAR_FUTURE)).total).toBe(0);
    expect((await repo.facets(FAR_FUTURE)).total).toBe(before.total);
    expect(await repo.detail(store.id, viewer.id, FAR_FUTURE)).toBeNull();
    expect(await repo.setFav(viewer.id, store.id, true, FAR_FUTURE)).toBe(false);
    expect((await t.call(`/stores/${store.id}`, { token: viewerToken })).status).toBe(404);
  });

  it.each(['personal', 'business'] as const)(
    'REQ-616 onboarding %s SQL snapshot unlocks existing steps only while appointed; no extra trial or fundraising',
    async (accountType) => {
      const u = await owner(accountType);
      const token = await tokenOf(t, u);
      await expire(u.id);
      const repo = t.app.get(OnboardingRepository);
      const mine = async () => {
        const response = await t.call('/me/onboarding', { token });
        expect(response.status).toBe(200);
        return onboardingSchema.parse(await response.json());
      };
      expect((await repo.snapshots([u.id])).get(u.id)?.paid).toBe(false);
      expect((await mine()).steps.filter((s) => s.locked)).toHaveLength(7);

      await change(u.id);
      expect((await repo.snapshots([u.id])).get(u.id)?.paid).toBe(true);
      const during = await mine();
      expect(during.paid).toBe(true);
      expect(during.steps.filter((s) => s.done).map((s) => s.key)).toEqual(['pay']);
      expect(during.steps.filter((s) => s.locked)).toEqual([]);
      expect(during.fundraising).toBeNull();

      await change(u.id, true);
      expect((await repo.snapshots([u.id])).get(u.id)?.paid).toBe(false);
      const after = await mine();
      expect(after.paid).toBe(false);
      expect(after.done).toBe(0);
      expect(after.steps.filter((s) => s.locked)).toHaveLength(7);
      expect(
        await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } }),
      ).toMatchObject({
        status: 'pending_payment',
        validUntil: OLD_TERM,
        paidAt: new Date('1999-01-01'),
        directorPreviousStatus: null,
        directorPreviousValidUntil: null,
      });
      expect(await t.prisma.db.membershipFeePeriod.count({ where: { userId: u.id } })).toBe(0);
    },
  );

  it('REQ-616 BR-462 old paid history is preserved byte-for-byte through appointment and revocation', async () => {
    const u = await owner('personal');
    await expire(u.id);
    const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } });
    await t.prisma.db.membershipFeePeriod.create({
      data: {
        userId: u.id,
        startsAt: new Date('1999-01-01'),
        endsAt: OLD_TERM,
        amount: fee.amount,
        source: 'manual',
        reason: 'Existing paid history fixture',
      },
    });
    const history = () =>
      t.prisma.db.membershipFeePeriod.findMany({
        where: { userId: u.id },
        orderBy: { id: 'asc' },
      });
    const before = await history();
    expect(before).toHaveLength(1);
    await change(u.id);
    expect(await history()).toEqual(before);
    await change(u.id, true);
    expect(await history()).toEqual(before);
    const after = await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } });
    expect(after).toMatchObject({
      status: 'pending_payment',
      validUntil: OLD_TERM,
      paidAt: fee.paidAt,
      amount: fee.amount,
      plan: fee.plan,
    });
  });
});
