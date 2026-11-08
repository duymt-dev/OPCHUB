import { expect, it, vi } from 'vitest';
import type { DbTx } from '@opchub/db';
import type { AuditService } from '@/common/audit';
import type { PrismaService } from '@/common/prisma/prisma.service';
import type { MyRegionProjectionRepository } from '@/modules/reporting';
import { MyRegionAffiliatesService } from './my-region-affiliates.service';

it('SPEC17 exports1000-row keyset batches, hard caps20000 with note and audited truncation', async () => {
  const tx = {
    regionalDirector: { findFirst: vi.fn(() => Promise.resolve({ region: 'north' })) },
  } as unknown as DbTx;
  const prisma = {
    db: { $transaction: async <T>(fn: (tx: DbTx) => Promise<T>) => fn(tx) },
  } as unknown as PrismaService;
  const affiliates = vi.fn(() =>
    Promise.resolve(
      Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${i}`,
        name: '=unsafe',
        code: 'SAFE',
        province: 'Hà Nội',
        customers: 1,
        revenue: 100n,
        share: 20n,
        total: 20_001,
      })),
    ),
  );
  const projection = { affiliates } as unknown as MyRegionProjectionRepository;
  const log = vi.fn(async () => {}),
    audit = { log } as unknown as AuditService;
  const csv = await new MyRegionAffiliatesService(prisma, projection, audit).csv('director', null);
  expect(affiliates).toHaveBeenCalledTimes(20);
  expect(affiliates.mock.calls.every((args) => (args as unknown[])[4] === 1000)).toBe(true);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv.split('\n')).toHaveLength(20_002);
  expect(csv).toContain('"\'=unsafe"');
  expect(csv).toContain('Đã cắt tại 20.000 dòng');
  expect(log).toHaveBeenCalledWith(
    tx,
    expect.objectContaining({
      actorId: 'director',
      tag: 'affiliate',
      action: 'regional.affiliates.export',
      diff: { count: 20_000, truncated: true },
    }),
  );
});
