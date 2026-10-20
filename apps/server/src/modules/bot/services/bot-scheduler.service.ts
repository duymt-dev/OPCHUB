import { Inject, Injectable } from '@nestjs/common';
import { ENV, type Env } from '@/common/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QUEUES } from '@opchub/shared/queues';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { QueueService } from '@/common/queue';
import { BotAdmissionService } from './bot-admission.service';
import { BotAutoAdmissionService } from './bot-auto-admission.service';

@Injectable()
export class BotSchedulerService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly admission: BotAdmissionService,
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly automatic: BotAutoAdmissionService,
  ) {}

  async tick(now = new Date()): Promise<void> {
    if (!this.env.FEATURE_BOTS) return;
    const settings = await this.prisma.db.appSetting.findUniqueOrThrow({
      where: { key: 'bot' },
      select: { value: true },
    });
    if (!botSettingsSchema.parse(settings.value).enabled) return;
    await this.admission.due(now);
    await this.automatic.due(now);
    const rows = await this.prisma.db.botThread.findMany({
      where: {
        status: { in: ['scheduled', 'running'] },
        nextAt: { lte: now },
        OR: [{ scriptId: null }, { script: { enabled: true } }],
      },
      orderBy: [{ nextAt: 'asc' }, { id: 'asc' }],
      take: 30,
      select: { id: true, cursor: true },
    });
    // Queue jobs only; no database query in the per-job loop. Fixed job ID makes tick replay safe.
    await Promise.all(
      rows.map((row) =>
        this.queue.add(
          QUEUES.bot,
          'postTurn',
          { threadId: row.id, turn: row.cursor },
          {
            jobId: `bot-${row.id}-${row.cursor}`,
            removeOnComplete: true,
            attempts: 3,
            backoff: { type: 'exponential', delay: 30000 },
          },
        ),
      ),
    );
  }
}
