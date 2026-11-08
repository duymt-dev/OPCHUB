import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { QUEUES } from '@opchub/shared/queues';
import { QueueService } from '@/common/queue';
import { RedisService } from '@/common/redis/redis.service';
import { MessageService } from '@/modules/chat';
import { AiConfigCache } from '@/modules/llm-config';
import { ModerationSettingsService } from './moderation-settings.service';
import { KeywordFilterService } from './keyword-filter.service';

@Injectable()
export class AiModerationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiModerationQueueService.name);
  private enabled = false;
  private sub: Redis | null = null;
  constructor(
    private readonly settings: ModerationSettingsService,
    private readonly config: AiConfigCache,
    private readonly messages: MessageService,
    private readonly keywords: KeywordFilterService,
    private readonly queue: QueueService,
    private readonly redis: RedisService,
  ) {}
  async reload() {
    const [settings, config] = await Promise.all([this.settings.get(), this.config.snapshot()]);
    this.enabled = Boolean(
      settings.ai &&
      config.settings.use.mod &&
      config.providers.some(
        (p) => p.id === config.settings.use.mod && p.enabled && this.config.key(p),
      ),
    );
  }
  async onModuleInit() {
    await this.reload();
    this.sub = this.redis.duplicate();
    this.sub.on('message', () => {
      void this.reload().catch(() => {
        this.enabled = false;
        this.logger.warn('AI moderation config reload failed; enqueue disabled');
      });
    });
    await this.sub.subscribe(
      this.redis.channel('moderation:settings'),
      this.redis.channel('llm:config:changed'),
    );
    this.messages.onSent(async (m) => {
      if (!this.enabled || !m.senderId || !m.body.trim() || this.keywords.firstHit(m.body)) return;
      await this.queue.add(
        QUEUES.moderation,
        'aiClassify',
        { messageId: m.id },
        { jobId: `ai-mod-${m.id}`, attempts: 1 },
      );
    });
  }
  async onModuleDestroy() {
    await this.sub?.quit().catch(() => undefined);
  }
}
