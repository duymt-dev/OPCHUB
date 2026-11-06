import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { FeeReminderMilestone } from '../domain/fee-reminder';
import { RenewalRepository, type RenewalCursor } from './renewal.repository';
export type { RenewalCandidate as ReminderCandidate } from './renewal.repository';

@Injectable()
export class FeeReminderRepository {
  constructor(private readonly renewal: RenewalRepository) {}
  candidates(from: Date, to: Date, after: RenewalCursor | undefined, limit: number) {
    return this.renewal.rows(from, to, after, limit);
  }
  async claim(
    tx: DbTx,
    items: readonly { userId: string; validUntil: Date; milestone: FeeReminderMilestone }[],
  ): Promise<{ userId: string; milestone: FeeReminderMilestone }[]> {
    if (!items.length) return [];
    return tx.$queryRaw<{ userId: string; milestone: FeeReminderMilestone }[]>`
      INSERT INTO fee_reminders (user_id, valid_until, milestone)
      SELECT * FROM unnest(${items.map((i) => i.userId)}::text[],
        ${items.map((i) => i.validUntil)}::timestamptz[],${items.map((i) => i.milestone)}::text[])
      ON CONFLICT DO NOTHING RETURNING user_id AS "userId", milestone`;
  }
}
