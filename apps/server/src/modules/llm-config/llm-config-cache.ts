import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { LlmConfigModel as LlmConfig } from '@opchub/db';
import { SecretBox } from '@/common/crypto/secret-box';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

/** Cache decrypted material in process only. DB revision check fences missed pub/sub events. */
@Injectable()
export class LlmConfigCache implements OnModuleInit {
  private readonly logger = new Logger(LlmConfigCache.name);
  private cached: { version: string; key: string } | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly box: SecretBox,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    const subscriber = this.redis.duplicate();
    const channel = this.redis.channel('llm:config:changed');
    subscriber.on('message', (name) => {
      if (name === channel) this.cached = undefined;
    });
    await subscriber.subscribe(channel);
  }

  row(): Promise<LlmConfig | null> {
    // One singleton PK read per AI operation, never one read per message recipient.
    return this.prisma.db.llmConfig.findUnique({ where: { id: 1 } });
  }

  key(row: LlmConfig): string | null {
    if (!row.keyEnc) return null;
    const version = `${row.updatedAt.toISOString()}:${Buffer.from(row.keyEnc).toString('base64')}`;
    if (this.cached?.version === version) return this.cached.key;
    try {
      const key = this.box.open(row.keyEnc).toString('utf8');
      this.cached = { version, key };
      return key;
    } catch {
      this.cached = undefined;
      this.logger.warn('AI key cannot be decrypted; configure it again');
      return null;
    }
  }

  async invalidate(): Promise<void> {
    this.cached = undefined;
    try {
      await this.redis.client.publish(this.redis.channel('llm:config:changed'), 'changed');
    } catch {
      // Save is already committed. Runtime's PK read still observes disables/key rotation.
      this.logger.warn('AI cache notification unavailable; runtime revision checks remain active');
    }
  }
}
