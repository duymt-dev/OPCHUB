import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';

/** Public Chat port: bot orchestration must not reach into Chat repositories. */
@Injectable()
export class PersonaReplyContextService {
  async trigger(tx: DbTx, messageId: string) {
    const row = await tx.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        roomId: true,
        senderId: true,
        body: true,
        isSimulated: true,
        deletedAt: true,
        hiddenAt: true,
        room: {
          select: { groupId: true, isDefault: true, group: { select: { deletedAt: true } } },
        },
        replyTo: { select: { personaId: true, roomId: true, deletedAt: true, hiddenAt: true } },
      },
    });
    if (
      !row ||
      !row.senderId ||
      row.isSimulated ||
      row.deletedAt ||
      row.hiddenAt ||
      !row.room.isDefault ||
      row.room.group.deletedAt
    )
      return null;
    const addressed =
      row.replyTo &&
      row.replyTo.roomId === row.roomId &&
      !row.replyTo.deletedAt &&
      !row.replyTo.hiddenAt
        ? row.replyTo.personaId
        : null;
    return { id: row.id, roomId: row.roomId, groupId: row.room.groupId, body: row.body, addressed };
  }

  async alreadyAnswered(tx: DbTx, messageId: string): Promise<boolean> {
    return !!(await tx.message.findFirst({
      where: { replyToId: messageId, isSimulated: true },
      select: { id: true },
    }));
  }

  async recentSpeakers(tx: DbTx, roomId: string): Promise<string[]> {
    const ids = await tx.message.findMany({
      where: { roomId, deletedAt: null, hiddenAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 10,
      select: { id: true },
    });
    const rows = await tx.message.findMany({
      where: { id: { in: ids.map((row) => row.id) } },
      select: { personaId: true },
    });
    return rows.flatMap((row) => (row.personaId ? [row.personaId] : []));
  }

  async latestReplyAt(tx: DbTx, roomId: string): Promise<Date | null> {
    const row = await tx.message.findFirst({
      where: { roomId, isSimulated: true, replyToId: { not: null } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  }

  async dailyCounts(tx: DbTx, ids: string[], start: Date): Promise<Map<string | null, number>> {
    const rows = await tx.message.groupBy({
      by: ['personaId'],
      where: {
        personaId: { in: ids },
        isSimulated: true,
        createdAt: { gte: start, lt: new Date(start.getTime() + 86400000) },
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.personaId, row._count._all]));
  }
}
