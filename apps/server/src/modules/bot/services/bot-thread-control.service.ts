import { BotReplyProgressService } from '../replies/bot-reply-progress.service';
import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { canBotThreadTransition } from '../domain/bot-thread-status';
import { lockBotExecution } from '../repositories/execution-lock';
import { type Actor, BotCatalogService } from './bot-catalog.service';

@Injectable()
export class BotThreadControlService {
  constructor(
    private readonly replyProgress: BotReplyProgressService,
    private readonly prisma: PrismaService,
    private readonly catalog: BotCatalogService,
  ) {}

  stop(actor: Actor, id: string) {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      await lockBotExecution(tx);
      const thread = await tx.botThread.findUnique({ where: { id }, select: { status: true } });
      if (!thread) throw notFound('Không tìm thấy hội thoại');
      if (!canBotThreadTransition(thread.status, 'done')) throw conflict('Hội thoại đã hoàn tất');
      const result = await tx.botThread.updateMany({
        where: { id, status: thread.status },
        data: { status: 'done', nextAt: null },
      });
      if (!result.count) throw conflict('Hội thoại vừa thay đổi');
      await this.replyProgress.completeThread(tx, id, 0, new Date());
      await this.catalog.log(tx, actor, 'bot_thread.stop', 'bot_thread', id, 'Dừng hội thoại');
      return { id, status: 'done' as const };
    });
  }
}
