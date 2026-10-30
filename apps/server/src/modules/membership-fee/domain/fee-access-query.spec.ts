import { describe, expect, it } from 'vitest';
import { Prisma } from '@opchub/db';
import { usableFeeWhere, usableFeeSql } from './fee-access-query';

describe('REQ-616 V-11 fee access query', () => {
  it('indefinite director exemption does not depend on the original deadline', () => {
    const now = new Date('2099-01-01');
    expect(usableFeeWhere(now)).toEqual({
      OR: [
        { status: { in: ['regional_director'] } },
        { status: { in: ['trial', 'active', 'expiring'] }, validUntil: { gt: now } },
      ],
    });
    const query = usableFeeSql(Prisma.sql`f.status`, Prisma.sql`f.valid_until`, now);
    expect(query.values).toEqual([['regional_director'], ['trial', 'active', 'expiring'], now]);
    expect(query.sql).toContain('OR');
  });
});
