import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { MembershipFeeStatus } from '@opchub/shared';

interface DirectorFeeRow {
  status: MembershipFeeStatus;
  validUntil: Date | null;
  version: number;
  previousStatus: MembershipFeeStatus | null;
  previousValidUntil: Date | null;
}

@Injectable()
export class RegionalDirectorFeeRepository {
  async lock(tx: DbTx, userId: string): Promise<DirectorFeeRow | undefined> {
    const [row] = await tx.$queryRaw<DirectorFeeRow[]>`
      SELECT status, valid_until AS "validUntil", version,
        director_previous_status AS "previousStatus",
        director_previous_valid_until AS "previousValidUntil"
      FROM membership_fees WHERE user_id = ${userId} FOR UPDATE`;
    return row;
  }

  async appoint(tx: DbTx, userId: string, from: DirectorFeeRow): Promise<boolean> {
    const result = await tx.membershipFee.updateMany({
      where: { userId, status: from.status, version: from.version },
      data: {
        status: 'regional_director',
        directorPreviousStatus: from.status,
        directorPreviousValidUntil: from.validUntil,
        version: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async revoke(tx: DbTx, userId: string, from: DirectorFeeRow, status: MembershipFeeStatus) {
    const result = await tx.membershipFee.updateMany({
      where: { userId, status: from.status, version: from.version },
      data: {
        status,
        validUntil: from.previousValidUntil,
        directorPreviousStatus: null,
        directorPreviousValidUntil: null,
        version: { increment: 1 },
      },
    });
    return result.count === 1;
  }
}
