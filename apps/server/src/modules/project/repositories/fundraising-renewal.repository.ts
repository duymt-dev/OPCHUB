import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { fundAmountOf, type PriceConfig } from '@opchub/shared';

type Candidate = { projectId: string; ownerId: string };
const SELECT = {
  id: true,
  projectId: true,
  ownerId: true,
  code: true,
  amount: true,
  status: true,
} as const;

/** New pending renewal requests use the same project lock/sequence/price rules as start(). */
@Injectable()
export class FundraisingRenewalRepository {
  async approved(tx: DbTx, ids: string[]) {
    const rows = await tx.projectFundraising.findMany({
      where: { projectId: { in: ids }, legacy: false, status: { in: ['active', 'expired'] } },
      select: { projectId: true },
      distinct: ['projectId'],
    });
    return new Set(rows.map((r) => r.projectId));
  }

  async prepare(
    tx: DbTx,
    rows: Candidate[],
    prices: PriceConfig,
    approved: Set<string>,
    now: Date,
  ) {
    const unique = [...new Map(rows.map((r) => [r.projectId, r])).values()];
    const ids = unique.map((r) => r.projectId);
    const live = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM projects WHERE id=ANY(${ids}::text[]) AND deleted_at IS NULL ORDER BY id FOR UPDATE`;
    const liveIds = new Set(live.map((r) => r.id));
    const open = await tx.projectFundraising.findMany({
      where: {
        projectId: { in: ids },
        OR: [
          { status: { in: ['pending_payment', 'pending_review'] } },
          { status: 'active', legacy: false, endsAt: { gt: now } },
        ],
      },
      select: SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const latest = await tx.projectFundraising.findMany({
      where: { projectId: { in: ids }, legacy: false },
      select: { projectId: true, status: true },
      distinct: ['projectId'],
      orderBy: [{ projectId: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
    const rejected = new Set(latest.filter((r) => r.status === 'rejected').map((r) => r.projectId));
    const pending = open.filter((r) => r.status === 'pending_payment');
    const occupied = new Set(open.map((r) => r.projectId));
    const needed = unique.filter(
      (r) => liveIds.has(r.projectId) && !occupied.has(r.projectId) && !rejected.has(r.projectId),
    );
    if (!needed.length) return new Map(pending.map((r) => [r.projectId, r]));
    const codes = await tx.$queryRaw<{ code: string }[]>`
      SELECT 'GV'||lpad(nextval('fundraising_code_seq')::text,6,'0') AS code
      FROM generate_series(1,${needed.length})`;
    const created = await tx.projectFundraising.createManyAndReturn({
      data: needed.map((r, i) => {
        const code = codes[i]?.code;
        if (!code) throw new Error('Missing allocated fundraising code');
        return {
          projectId: r.projectId,
          ownerId: r.ownerId,
          code,
          amount: fundAmountOf(prices, approved.has(r.projectId)),
        };
      }),
      select: SELECT,
    });
    return new Map([...pending, ...created].map((r) => [r.projectId, r]));
  }
}
