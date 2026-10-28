import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';

@Injectable()
export class GroupTargetsRepository {
  liveIds(tx: DbTx, ids: readonly string[]) {
    return tx.group.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      select: { id: true },
    });
  }
}
