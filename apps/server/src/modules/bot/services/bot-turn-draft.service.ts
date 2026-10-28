import { BotReplyProgressService } from '../replies/bot-reply-progress.service';
import { BotScheduleService } from '../control/bot-schedule.service';
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { IntegrationError, type LlmProvider, type LlmTurnContext } from '@opchub/integrations';
import { llmTurnTextSchema } from '@opchub/shared';
import { botSettingsSchema, botStoredLinesSchema } from '@opchub/shared/api-domains';
import type { DbTx, Prisma } from '@opchub/db';

import { LLM } from '@/common/integrations';
import { PrismaService } from '@/common/prisma/prisma.service';
import { parseClean } from '@/common/html/sanitize-input';
import { botDayStart, isBotActiveHour } from '../domain/active-hours';
import { lockBotExecution } from '../repositories/execution-lock';
import { PersonaReplyContextService } from '@/modules/chat';

type StoredThread = Prisma.BotThreadGetPayload<{
  select: { topic: true; lines: true; kind: true; groupIds: true };
}>;

// Exceeds the adapter's maximum 120s timeout; another worker may reclaim after a crash.
const LEASE_MS = 180_000;
type Claim =
  { kind: 'generate'; claimId: string; context: LlmTurnContext } | { kind: 'ready' | 'blocked' };

@Injectable()
export class BotTurnDraftService {
  constructor(
    private readonly replyProgress: BotReplyProgressService,
    private readonly schedule: BotScheduleService,
    private readonly prisma: PrismaService,
    @Inject(LLM) private readonly llm: LlmProvider,
    private readonly replies: PersonaReplyContextService,
  ) {}

  async prepare(threadId: string, turn: number, now: Date): Promise<boolean> {
    const claim = await this.claim(threadId, turn, now);
    if (claim.kind !== 'generate') return claim.kind === 'ready';
    try {
      const response = await this.llm.generateTurn(claim.context);
      let body: string;
      try {
        body = parseClean(llmTurnTextSchema, response);
      } catch {
        throw new IntegrationError('llm', 'Invalid generated turn', false);
      }
      return await this.finish(threadId, turn, claim.claimId, body);
    } catch (error) {
      await this.prisma.db.botTurnDraft.updateMany({
        where: { threadId, turn, claimId: claim.claimId, body: null },
        data: { leaseUntil: now },
      });
      throw error;
    }
  }

  private claim(threadId: string, turn: number, now: Date): Promise<Claim> {
    return this.prisma.db.$transaction(async (tx): Promise<Claim> => {
      await lockBotExecution(tx);
      const setting = await tx.appSetting.findUniqueOrThrow({
        where: { key: 'bot' },
        select: { value: true },
      });
      const settings = botSettingsSchema.parse(setting.value);
      if (!settings.enabled || !(await this.schedule.allows(tx, now))) return { kind: 'blocked' };
      const thread = await tx.botThread.findUnique({
        where: { id: threadId },
        include: { script: { select: { enabled: true } } },
      });
      if (
        !thread ||
        thread.status === 'done' ||
        thread.cursor !== turn ||
        !thread.nextAt ||
        thread.nextAt > now ||
        thread.script?.enabled === false
      )
        return { kind: 'blocked' };
      if (thread.kind === 'reply') {
        if (!(await this.replyProgress.allows(tx, threadId, settings.replyToMembers)))
          return { kind: 'blocked' };
        if (
          !thread.triggerMessageId ||
          !(await this.replies.trigger(tx, thread.triggerMessageId)) ||
          (await this.replies.alreadyAnswered(tx, thread.triggerMessageId))
        )
          return { kind: 'ready' };
      }
      const lines = botStoredLinesSchema.parse(thread.lines);
      const line = lines[turn];
      if (!line || line.body || thread.kind === 'script') return { kind: 'ready' };
      const context = await this.context(tx, thread, turn, now);
      if (!context) return { kind: 'ready' };
      const draft = await tx.botTurnDraft.findUnique({
        where: { threadId_turn: { threadId, turn } },
      });
      if (draft?.body) {
        lines[turn] = { personaId: line.personaId, body: draft.body };
        await tx.botThread.update({ where: { id: threadId }, data: { lines } });
        return { kind: 'ready' };
      }
      if (draft && draft.leaseUntil > now) return { kind: 'blocked' };
      const claimId = randomUUID();
      const data = { claimId, leaseUntil: new Date(now.getTime() + LEASE_MS) };
      await tx.botTurnDraft.upsert({
        where: { threadId_turn: { threadId, turn } },
        create: { threadId, turn, ...data },
        update: data,
      });
      return { kind: 'generate', claimId, context };
    });
  }

  private async context(
    tx: DbTx,
    thread: StoredThread,
    turn: number,
    now: Date,
  ): Promise<LlmTurnContext | null> {
    const lines = botStoredLinesSchema.parse(thread.lines);
    const line = lines[turn];
    if (!line) return null;
    const persona = await tx.persona.findUnique({
      where: { id: line.personaId },
      select: {
        id: true,
        name: true,
        tone: true,
        skills: true,
        enabled: true,
        activeHours: true,
        groupIds: true,
        postsPerDay: true,
      },
    });
    if (
      !persona?.enabled ||
      (thread.kind !== 'reply' && !isBotActiveHour(persona.activeHours, now))
    )
      return null;
    const rooms = await tx.room.findMany({
      where: {
        isDefault: true,
        groupId: { in: thread.groupIds.filter((id) => persona.groupIds.includes(id)) },
        group: { deletedAt: null },
      },
      select: { id: true },
    });
    const start = botDayStart(now);
    const used =
      thread.kind === 'reply'
        ? 0
        : await tx.message.count({
            where: {
              personaId: persona.id,
              isSimulated: true,
              createdAt: { gte: start, lt: new Date(start.getTime() + 86400000) },
            },
          });
    if (!rooms.length || (thread.kind !== 'reply' && used + rooms.length > persona.postsPerDay))
      return null;
    const history =
      thread.kind === 'reply'
        ? await this.history(
            tx,
            rooms.map((room) => room.id),
          )
        : lines
            .slice(0, turn)
            .filter((line) => line.body)
            .map((line) => ({ personaId: line.personaId, body: line.body }));
    return {
      topic: thread.topic,
      persona: { id: persona.id, name: persona.name, tone: persona.tone, skills: persona.skills },
      history,
    };
  }

  private finish(threadId: string, turn: number, claimId: string, body: string): Promise<boolean> {
    return this.prisma.db.$transaction(async (tx) => {
      await lockBotExecution(tx);
      const claimed = await tx.botTurnDraft.updateMany({
        where: { threadId, turn, claimId, body: null },
        data: { body },
      });
      if (claimed.count !== 1) return false;
      const thread = await tx.botThread.findUnique({ where: { id: threadId } });
      if (!thread || thread.status === 'done' || thread.cursor !== turn) return false;
      const lines = botStoredLinesSchema.parse(thread.lines);
      const line = lines[turn];
      if (!line) return false;
      lines[turn] = { personaId: line.personaId, body };
      const result = await tx.botThread.updateMany({
        where: { id: threadId, status: thread.status, cursor: turn },
        data: { lines },
      });
      return result.count === 1;
    });
  }

  private async history(tx: DbTx, rooms: string[]) {
    const ids = await tx.message.findMany({
      where: { roomId: { in: rooms }, deletedAt: null, hiddenAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 10,
      select: { id: true },
    });
    const rows = await tx.message.findMany({
      where: { id: { in: ids.map((row) => row.id) } },
      select: { id: true, personaId: true, body: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.reverse().flatMap(({ id }) => {
      const row = byId.get(id);
      return row ? [{ personaId: row.personaId, body: row.body }] : [];
    });
  }
}
