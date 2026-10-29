import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { BotReplyScanRepository } from '../repositories/bot-reply-scan.repository';

/** Public Chat port. Bot orchestration receives candidate IDs, not a Chat repository import. */
@Injectable()
export class BotReplyScanService {
  constructor(private readonly repository: BotReplyScanRepository) {}

  candidates(db: DbTx, sampleSize: number) {
    return this.repository.scan(db, sampleSize);
  }

  async history(db: DbTx) {
    return (await this.repository.history(db)).map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async overview(db: DbTx, sampleSize: number) {
    const candidates = await this.candidates(db, sampleSize);
    const top = candidates.slice(0, 10);
    // Only load display bodies for the final top ten groups / last eight candidates.
    const rows = await this.repository.previews(
      db,
      top.flatMap((row) => row.messageIds.slice(-8)),
    );
    const byId = new Map(rows.map((row) => [row.id, row]));
    return {
      pendingTotal: candidates.reduce((count, row) => count + row.pending, 0),
      groupCount: candidates.length,
      groups: top.map((group) => ({
        groupId: group.groupId,
        groupName: group.groupName,
        roomId: group.roomId,
        pending: group.pending,
        preview: group.messageIds
          .slice(-8)
          .reverse()
          .flatMap((id) => {
            const row = byId.get(id);
            return row
              ? [
                  {
                    id,
                    senderName: row.sender?.fullName ?? '',
                    body: row.body,
                    createdAt: row.createdAt.toISOString(),
                  },
                ]
              : [];
          }),
      })),
    };
  }
}
