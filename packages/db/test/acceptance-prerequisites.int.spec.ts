import { afterEach, describe, expect, it, vi } from 'vitest';

const isolated = 'postgresql://fixture:fixture@127.0.0.1:5432/opchub_v46_812_dev';
const mocks = vi.hoisted(() => ({
  users: vi.fn(),
  registrations: vi.fn(),
  removeRegistrations: vi.fn(),
  sql: vi.fn(),
  events: vi.fn(),
  deliveries: vi.fn(),
  project: vi.fn(),
  disconnect: vi.fn(),
}));

async function run(mode: string, target = isolated) {
  vi.resetModules();
  vi.stubEnv('DIRECT_URL', target);
  vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'fixture', mode]);
  const tx = {
    user: { createMany: mocks.users },
    eventRegistration: { createMany: mocks.registrations, deleteMany: mocks.removeRegistrations },
    $executeRaw: mocks.sql,
  };
  vi.doMock('../src/client', () => ({
    createPrismaClient: () => ({
      ...tx,
      $transaction: async (fn: (value: typeof tx) => Promise<void>) => fn(tx),
      event: { updateMany: mocks.events },
      mailLog: { updateMany: mocks.deliveries },
      project: { create: mocks.project },
      $disconnect: mocks.disconnect,
    }),
  }));
  await import('../seed/acceptance-prerequisites');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.doUnmock('../src/client');
});

describe('isolated acceptance prerequisites', () => {
  it('creates historical pending data without changing the direct-publication API', async () => {
    await run('pending-project');
    expect(mocks.project).toHaveBeenCalledExactlyOnceWith({
      data: {
        ownerId: 'm2',
        name: 'Historical pending review fixture',
        summary: 'Legacy moderation queue badge prerequisite',
        status: 'pending_review',
      },
      select: { id: true },
    });
    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
  });
  it('materializes391 real registrations before updating aggregate counts', async () => {
    await run('events-list');
    const rows = mocks.registrations.mock.calls[0]?.[0] as {
      data: { eventId: string; userId: string }[];
    };
    expect(rows.data).toHaveLength(391);
    expect(new Set(rows.data.map((r) => `${r.eventId}:${r.userId}`)).size).toBe(391);
    expect(rows.data).toContainEqual({ eventId: 'e2', userId: 'm1' });
    expect(mocks.removeRegistrations).toHaveBeenCalledExactlyOnceWith({
      where: { eventId: { in: ['e1', 'e2', 'e3', 'e4', 'e5'] } },
    });
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
  });

  it('normalizes only e1 open-state before testing the close switch', async () => {
    mocks.events.mockResolvedValueOnce({ count: 1 });
    await run('events-open');
    expect(mocks.events).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'e1' },
      data: { registrationOpen: true, closedAt: null },
    });
  });

  it('keeps real counts and makes registration/full-capacity prerequisites future/open', async () => {
    await run('events-portal');
    const rows = mocks.registrations.mock.calls[0]?.[0] as { data: unknown[] };
    const change = mocks.events.mock.calls[0]?.[0] as {
      where: { id: { in: string[] } };
      data: { startsAt: Date; endsAt: null; registrationOpen: boolean; closedAt: null };
    };
    expect(rows.data).toHaveLength(391);
    expect(mocks.events).toHaveBeenCalledTimes(1);
    expect(change.where).toEqual({ id: { in: ['e1', 'e4'] } });
    expect(change.data).toMatchObject({ endsAt: null, registrationOpen: true, closedAt: null });
    expect(change.data.startsAt).toBeInstanceOf(Date);
    expect(change.data.startsAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('creates two future upcoming prerequisites without changing event counts', async () => {
    await run('events-upcoming');
    expect(mocks.sql.mock.calls[0]?.[1]).toEqual(['e2', 'e3']);
    expect(mocks.registrations).not.toHaveBeenCalled();
    expect(mocks.users).not.toHaveBeenCalled();
  });

  it('requires exactly4052 actual delivered messages, never invents the KPI', async () => {
    mocks.deliveries.mockResolvedValueOnce({ count: 4052 });
    await run('marketing-summary');
    expect(mocks.deliveries).toHaveBeenCalledTimes(1);
    const change = mocks.deliveries.mock.calls[0]?.[0] as {
      data: { createdAt: Date; sentAt: Date };
    };
    expect(change.data.createdAt).toBeInstanceOf(Date);
    expect(change.data.createdAt.getTime()).toBe(change.data.sentAt.getTime());
    expect(change.data.createdAt.getTime()).toBeGreaterThan(Date.now() - 30 * 86400000);
    mocks.deliveries.mockResolvedValueOnce({ count: 1842 });
    await expect(run('marketing-summary')).rejects.toThrow('Expected 4052 seeded deliveries');
  });

  it('refuses the original native database before any fixture write', async () => {
    await expect(
      run('events-list', isolated.replace('opchub_v46_812_dev', 'opchub_dev')),
    ).rejects.toThrow('exact isolated TIP-812 database');
    expect(mocks.users).not.toHaveBeenCalled();
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
