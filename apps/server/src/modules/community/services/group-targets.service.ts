import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { GroupTargetsRepository } from '../repositories/group-targets.repository';

/** Public bounded multi-group availability port; callers never query Community tables directly. */
@Injectable()
export class GroupTargetsService {
  constructor(private readonly targets: GroupTargetsRepository) {}
  async allLive(tx: DbTx, ids: readonly string[]): Promise<boolean> {
    if (!ids.length || ids.length > 100) return false;
    return (await this.targets.liveIds(tx, ids)).length === new Set(ids).size;
  }
}
