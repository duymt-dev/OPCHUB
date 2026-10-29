import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AffiliateBackfillService } from '@/modules/affiliate';
import { AffiliateAllocationService } from '@/modules/affiliate/services/affiliate-allocation.service';
import { affiliateCode } from '@/modules/affiliate/domain/affiliate-code';
import { createAffiliateApp } from '../factories/affiliate.factory';
import type { TestApp } from '../setup/test-app';

describe('Affiliate backfill nhiều lô và trùng mã (TIP-V2-401)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createAffiliateApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('REQ-301 backfill 501 thành viên vượt lô 500, giữ status/% khi chạy lại', async () => {
    const prefix = `aff-batch-${randomUUID()}-`;
    await t.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO users (id, member_code, account_type, full_name, email, updated_at)
        SELECT ${prefix} || n::text, ${prefix} || n::text, 'personal',
          'Thành viên ' || chr(65 + n / 676 % 26) || chr(65 + n / 26 % 26) || chr(65 + n % 26),
          ${prefix} || n::text || '@test.opchub.vn', now()
        FROM generate_series(1, 501) AS n`;
      await tx.$executeRaw`
        INSERT INTO membership_fees (user_id, status, valid_until, amount, updated_at)
        SELECT id, CASE WHEN id = ${prefix + '501'} THEN 'expired'::membership_fee_status
          ELSE 'active'::membership_fee_status END,
          CASE WHEN id = ${prefix + '501'} THEN '2026-01-01'::timestamptz
          ELSE '2027-01-01'::timestamptz END, 1200000, now()
        FROM users WHERE id LIKE ${prefix + '%'}`;
      await tx.$executeRaw`
        INSERT INTO membership_fee_periods (id, user_id, starts_at, ends_at, amount, source)
        SELECT 'period-' || id, id, '2025-01-01'::timestamptz, '2026-01-01'::timestamptz,
          600000, 'transfer' FROM users WHERE id LIKE ${prefix + '%'}`;
    });
    try {
      const backfill = t.app.get(AffiliateBackfillService);
      await backfill.ensureForPaidMembers();
      expect(await t.prisma.db.affiliate.count({ where: { userId: { startsWith: prefix } } })).toBe(
        501,
      );
      const last = await t.prisma.db.affiliate.findUniqueOrThrow({
        where: { userId: prefix + '501' },
      });
      // D-110: mã luôn hoạt động — phí hết hạn vẫn active
      expect(last.status).toBe('active');
      await t.prisma.db.affiliate.update({ where: { id: last.id }, data: { rate: 37 } });
      expect(await backfill.ensureForPaidMembers()).toBe(0);
      expect(
        await t.prisma.db.affiliate.findUniqueOrThrow({ where: { id: last.id } }),
      ).toMatchObject({ rate: 37, status: 'active', code: last.code });
    } finally {
      await t.prisma.db.user.deleteMany({ where: { id: { startsWith: prefix } } });
    }
  });

  it('REQ-301 21 mã trùng tên chuyển sang ba chữ số; worker cùng lúc không trùng mã', async () => {
    const prefix = `aff-collision-${randomUUID()}-`;
    // D-94 3A: test đăng ký khác tạo đại lý "Nguyễn Văn An" thật → dùng tên riêng để mã gốc còn trống
    const name = 'Nguyễn Văn Trùngmã';
    const members = Array.from({ length: 22 }, (_, i) => ({
      userId: prefix + i,
      fullName: name,
      status: 'active' as const,
    }));
    await t.prisma.db.user.createMany({
      data: members.map((m) => ({
        id: m.userId,
        memberCode: m.userId,
        email: `${m.userId}@test.opchub.vn`,
        fullName: m.fullName,
        accountType: 'personal' as const,
      })),
    });
    try {
      const allocation = t.app.get(AffiliateAllocationService);
      await Promise.all([
        t.prisma.db.$transaction((tx) => allocation.ensure(tx, members.slice(0, 11))),
        t.prisma.db.$transaction((tx) => allocation.ensure(tx, members.slice(11))),
      ]);
      const rows = await t.prisma.db.affiliate.findMany({
        where: { userId: { startsWith: prefix } },
        select: { code: true },
      });
      expect(rows).toHaveLength(22);
      expect(new Set(rows.map((r) => r.code)).size).toBe(22);
      expect(rows.some((r) => /^TRUNGMOPC\d{3}$/.test(r.code))).toBe(true);
      expect(rows.some((r) => r.code === affiliateCode(name))).toBe(true);
    } finally {
      await t.prisma.db.user.deleteMany({ where: { id: { startsWith: prefix } } });
    }
  });
});
