import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { RoomEventsPublisher } from '@/common/realtime/room-events.publisher';
import { PersonaHideRepository } from '../repositories/persona-hide.repository';
import { MessageRepository } from '../repositories/message.repository';
import { lockPersonaVisibility } from '../repositories/persona-visibility';
import { toChatMessage } from '../domain/message.mapper';

/** Public Chat port; the caller owns the audit/outbox transaction. */
@Injectable()
export class PersonaVisibilityService {
  constructor(
    private readonly hidden: PersonaHideRepository,
    private readonly messages: MessageRepository,
    private readonly events: RoomEventsPublisher,
  ) {}

  async hide(tx: DbTx, at: Date, groupIds?: string[]) {
    await lockPersonaVisibility(tx);
    const result = await this.hidden.hide(tx, at, groupIds);
    return {
      ...result,
      bulk: result.hidden > 200,
      messageIds: result.hidden > 200 ? [] : result.messageIds,
    };
  }

  async publishHidden(roomIds: string[], messageIds: string[], bulk: boolean): Promise<void> {
    if (bulk) {
      await this.events.reload(roomIds);
      return;
    }
    const rows = await this.messages.dtos(messageIds, null);
    await Promise.all(
      [...rows.values()]
        .filter((r) => !!r.hidden_at)
        .map((row) => this.events.publish(row.room_id, 'message.updated', toChatMessage(row))),
    );
    // A hard-deleted row needs no message event, but stale open-room caches still reload.
    if (rows.size < messageIds.length) await this.events.reload(roomIds);
  }
}
