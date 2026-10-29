import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BotReplyScanService } from '@/modules/chat';
import { BotReplySettingsService } from './bot-reply-settings.service';
import { replyRunDto } from './bot-reply-progress.service';

@Injectable()
export class BotReplyOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: BotReplyScanService,
    private readonly settings: BotReplySettingsService,
  ) {}

  get() {
    return this.prisma.db.$transaction(async (tx) => {
      const { settings, control } = await this.settings.read(tx);
      const scan = await this.chat.overview(tx, settings.sampleSize);
      const [personas, history, run] = await Promise.all([
        tx.persona.findMany({
          where: { enabled: true, groupIds: { hasSome: scan.groups.map((g) => g.groupId) } },
          select: { groupIds: true },
        }),
        this.chat.history(tx),
        tx.botReplyRun.findFirst({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      ]);
      const counts = new Map<string, number>();
      for (const persona of personas)
        for (const groupId of persona.groupIds) counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
      return {
        ...scan,
        settings,
        lastScanAt: control.lastScanAt,
        run: replyRunDto(run),
        history,
        groups: scan.groups.map((g) => ({ ...g, personaCount: counts.get(g.groupId) ?? 0 })),
      };
    });
  }
}
