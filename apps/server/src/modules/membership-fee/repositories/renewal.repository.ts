import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { RenewalQuery } from '@opchub/shared/api-domains';
import { renewalRowsQuery, renewalEligible } from './renewal-query';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface RenewalCandidate {
  user_id: string;
  full_name: string;
  email: string;
  member_code: string;
  phone: string | null;
  valid_until: Date;
  amount: number;
  plan: 'personal' | 'business';
  trial: boolean;
  last_sent_at: Date | null;
  sent: string[];
}
export type RenewalCursor = NonNullable<RenewalQuery['cursor']>;

export const renewalWindow = (now: Date) => {
  const midnight =
    Math.floor((now.getTime() + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000;
  return { from: new Date(midnight + 86_400_000), to: new Date(midnight + 31 * 86_400_000) };
};

@Injectable()
export class RenewalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async tryManualLock(tx: DbTx): Promise<boolean> {
    const [row] = await tx.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(hashtextextended('opchub:renewal-manual', 0)) AS locked`;
    return row?.locked === true;
  }

  async count(now: Date): Promise<number> {
    const { from, to } = renewalWindow(now);
    const [r] = await this.prisma.db.$queryRaw<{ total: bigint }[]>`
      SELECT count(*) AS total FROM membership_fees f WHERE ${renewalEligible(from, to)}`;
    return Number(r?.total ?? 0);
  }

  rows(
    from: Date,
    to: Date,
    cursor: RenewalCursor | undefined,
    limit: number,
    userIds?: string[],
    tx?: DbTx,
  ): Promise<RenewalCandidate[]> {
    return (tx ?? this.prisma.db).$queryRaw<RenewalCandidate[]>(
      renewalRowsQuery(from, to, cursor, limit, userIds),
    );
  }

  async lockSettings(tx: DbTx) {
    const [row] = await tx.$queryRaw<
      { value: unknown }[]
    >`SELECT value FROM app_settings WHERE key='renewal' FOR UPDATE`;
    return row?.value;
  }

  async recordManual(tx: DbTx, rows: RenewalCandidate[], now: Date): Promise<void> {
    if (!rows.length) return;
    const vnDay = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
    await tx.$executeRaw`
      INSERT INTO fee_reminders (user_id,valid_until,milestone,sent_at)
      SELECT user_id,valid_until,${'M:' + vnDay},${now} FROM unnest(
        ${rows.map((r) => r.user_id)}::text[],${rows.map((r) => r.valid_until)}::timestamptz[]) AS x(user_id,valid_until)
      ON CONFLICT(user_id,valid_until,milestone) DO UPDATE SET sent_at=EXCLUDED.sent_at`;
  }
}
