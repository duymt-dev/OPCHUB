import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QueueService } from '@/common/queue';
import { RedisService } from '@/common/redis/redis.service';
import { QUEUES } from '@opchub/shared/queues';
import { MessageService } from '@/modules/chat';
import { KeywordMatcher } from '../domain/aho-corasick';

/** Kênh báo đổi danh sách từ khoá — mọi process nạp lại */
export const KEYWORDS_CHANNEL = 'moderation:keywords';

/**
 * Lọc từ khoá in-memory (S-08): nạp `moderation_keywords` lúc khởi động + khi nhận pub/sub.
 * Đăng ký hook sau commit của MessageService: trúng → enqueue `moderation.keywordHit`
 * (worker tạo ca `auto`) — không truy vấn DB / không chặn đường gửi tin.
 */
@Injectable()
export class KeywordFilterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeywordFilterService.name);
  private matcher = new KeywordMatcher([]);
  private sub: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queue: QueueService,
    private readonly messages: MessageService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
    this.sub = this.redis.duplicate();
    this.sub.on(
      'message',
      () => void this.reload().catch((err: unknown) => this.logger.warn({ err })),
    );
    await this.sub.subscribe(KEYWORDS_CHANNEL);
    this.messages.onSent(async (m) => {
      const hit = this.matcher.firstHit(m.body);
      if (!hit) return;
      await this.queue.add(
        QUEUES.moderation,
        'keywordHit',
        { messageId: m.id, hit: hit.slice(0, 60) },
        { jobId: `kw-${m.id}` },
      );
    });
  }

  async reload(): Promise<void> {
    const rows = await this.prisma.db.moderationKeyword.findMany({ select: { word: true } });
    this.matcher = new KeywordMatcher(rows.map((r) => r.word));
  }

  firstHit(text: string): string | null {
    return this.matcher.firstHit(text);
  }

  /** Gọi sau khi đổi danh sách (Admin) */
  async publishChange(): Promise<void> {
    await this.redis.client.publish(KEYWORDS_CHANNEL, '1');
  }

  async onModuleDestroy(): Promise<void> {
    await this.sub?.quit().catch(() => undefined);
  }
}
