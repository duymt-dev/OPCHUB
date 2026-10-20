import { Injectable } from '@nestjs/common';
import { LIVE_FEED_MAX, liveActivitySchema } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  DAY_TTL_SEC,
  FEED,
  MSG_MIN,
  WINDOW_MS,
  dayKey,
  vnDay,
} from '@/common/realtime/live-counter-keys';
import {
  ROOM_EVENTS_CHANNEL,
  roomEventEnvelopeSchema,
} from '@/common/realtime/room-events.publisher';
import { RedisService } from '@/common/redis/redis.service';
import { toChatMessage } from '../domain/message.mapper';
import { MessageRepository } from '../repositories/message.repository';
import { MessageService } from './message.service';
import { PERSONA_PUBLICATION_SCRIPT, personaDeliveredKey } from './persona-publication-script';
import { lockPersonaVisibility } from '../repositories/persona-visibility';
import { DashboardContentCacheService } from '@/modules/dashboard';

/** Durable outbox consumer: one message job, no DB query per recipient. */
@Injectable()
export class PersonaTurnPublisher {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly messages: MessageRepository,
    private readonly sent: MessageService,
    private readonly dashboard: DashboardContentCacheService,
  ) {}

  async publish(messageId: string): Promise<boolean> {
    const source = await this.prisma.db.message.findUnique({
      where: { id: messageId },
      select: {
        isSimulated: true,
        deletedAt: true,
        hiddenAt: true,
        room: {
          select: {
            groupId: true,
            group: { select: { name: true, deletedAt: true } },
          },
        },
      },
    });
    if (!source?.isSimulated || source.deletedAt || source.hiddenAt || source.room.group.deletedAt)
      return false;
    const row = (await this.messages.dtos([messageId], null)).get(messageId);
    if (!row) return false;
    const dto = toChatMessage(row);
    // Strict mode: a failed NA-07 enqueue must retry publication, not silently lose moderation.
    await this.sent.runSentHooks(
      { id: row.id, roomId: row.room_id, senderId: null, body: dto.body },
      true,
    );
    const activity = liveActivitySchema.parse({
      id: `msg:${row.id}`,
      memberName: dto.sender.name,
      avatarUrl: dto.sender.avatarUrl,
      kind: 'msg',
      target: source.room.group.name,
      at: row.created_at.toISOString(),
    });
    const message = roomEventEnvelopeSchema.parse({
      roomId: row.room_id,
      event: 'message.new',
      data: { ...dto, myReactions: [], reportedByMe: false },
    });
    const bump = roomEventEnvelopeSchema.parse({
      groupId: source.room.groupId,
      event: 'unread.bump',
      data: { roomId: row.room_id, groupId: source.room.groupId, senderId: null },
    });
    const delivered = await this.deliver(row.id, [
      'chat:seq',
      personaDeliveredKey(row.room_id),
      FEED,
      MSG_MIN,
      dayKey(vnDay(row.created_at)),
      row.id,
      row.room_id,
      row.created_at.getTime(),
      JSON.stringify(activity),
      LIVE_FEED_MAX,
      WINDOW_MS,
      DAY_TTL_SEC,
      this.redis.channel(ROOM_EVENTS_CHANNEL),
      JSON.stringify(message),
      JSON.stringify(bump),
    ]);
    // Also invalidate on an idempotent replay after a previous cache failure.
    await this.dashboard.invalidate();
    return delivered;
  }

  private deliver(id: string, args: (string | number)[]): Promise<boolean> {
    return this.prisma.db.$transaction(async (tx) => {
      await lockPersonaVisibility(tx);
      const fresh = await tx.message.findUnique({
        where: { id },
        select: { hiddenAt: true, deletedAt: true },
      });
      if (!fresh || fresh.hiddenAt || fresh.deletedAt) return false;
      // Hold the visibility lock through Redis delivery so a concurrent hide event
      // can never be followed by an older visible message.new for the same row.
      const result = await this.redis.client.eval(PERSONA_PUBLICATION_SCRIPT, 5, ...args);
      return Number(result) === 1;
    });
  }
}
