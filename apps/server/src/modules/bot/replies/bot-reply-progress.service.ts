import { Injectable } from '@nestjs/common';
import type { BotReplyRunModel, DbTx } from '@opchub/db';
import { botReplyDelayMs } from '@opchub/shared';
import { botReplyRunSchema } from '@opchub/shared/api-domains';
import { OutboxService } from '@/common/outbox';

export function replyRunDto(row: BotReplyRunModel | null) {
  return row
    ? botReplyRunSchema.parse({
        id: row.id,
        groupId: row.groupId,
        groupName: row.groupName,
        status: row.status,
        total: row.messageIds.length,
        processed: row.cursor,
        posted: row.posted,
        manual: row.manual,
        createdAt: row.createdAt.toISOString(),
      })
    : null;
}

/** Caller holds lockBotExecution; progress and next-work outbox share the message transaction. */
@Injectable()
export class BotReplyProgressService {
  constructor(private readonly outbox: OutboxService) {}

  async allows(tx: DbTx, threadId: string, autoEnabled: boolean) {
    if (autoEnabled) return true;
    return !!(await tx.botReplyRun.findFirst({
      where: { status: 'running', activeThreadId: threadId },
      select: { id: true },
    }));
  }

  async completeThread(tx: DbTx, threadId: string, posted: number, now: Date) {
    const run = await tx.botReplyRun.findFirst({
      where: { status: 'running', activeThreadId: threadId },
    });
    if (run) await this.advance(tx, run, posted, now);
  }

  async advance(tx: DbTx, run: BotReplyRunModel, posted: number, now: Date) {
    if (run.status !== 'running') return;
    const cursor = run.cursor + 1;
    const status = cursor === run.messageIds.length ? 'done' : 'running';
    const nextAt =
      status === 'done' ? null : new Date(now.getTime() + botReplyDelayMs(run.delaySeconds));
    const updated = await tx.botReplyRun.updateMany({
      where: {
        id: run.id,
        status: 'running',
        cursor: run.cursor,
        activeThreadId: run.activeThreadId,
      },
      data: {
        cursor,
        posted: run.posted + (posted > 0 ? 1 : 0),
        status,
        nextAt,
        activeThreadId: null,
      },
    });
    if (!updated.count) throw new Error('Reply run transition lost');
    if (nextAt)
      await this.outbox.add(tx, 'bot.reply_run_due', {
        runId: run.id,
        cursor,
        at: nextAt.toISOString(),
      });
  }

  async stopAll(tx: DbTx) {
    return tx.botReplyRun.updateMany({
      where: { status: 'running' },
      data: { status: 'stopped', nextAt: null, activeThreadId: null },
    });
  }
}
