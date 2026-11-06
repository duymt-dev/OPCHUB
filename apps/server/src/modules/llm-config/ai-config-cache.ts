import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@opchub/db';
import { aiSettingsSchema } from '@opchub/shared/api-domains';
import { SecretBox } from '@/common/crypto/secret-box';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { AiProviderRepository } from './repositories/ai-provider.repository';
type Provider = Prisma.LlmProviderGetPayload<Record<string, never>>;
/** Decrypted keys live only in process; revision reads fence missed pub/sub invalidations. */
@Injectable()
export class AiConfigCache implements OnModuleInit {
  private readonly logger = new Logger(AiConfigCache.name);
  private readonly keys = new Map<string, { version: string; key: string }>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly box: SecretBox,
    private readonly redis: RedisService,
    private readonly providers: AiProviderRepository,
  ) {}
  async onModuleInit(): Promise<void> {
    const sub = this.redis.duplicate();
    const channel = this.redis.channel('llm:config:changed');
    sub.on('message', (name) => {
      if (name === channel) this.keys.clear();
    });
    await sub.subscribe(channel);
  }
  async snapshot() {
    // A single repeatable snapshot prevents mixed routing/key generations across config saves.
    return this.prisma.db.$transaction(
      async (tx) => {
        const row = await tx.appSetting.findUniqueOrThrow({
          where: { key: 'ai' },
          select: { value: true },
        });
        const providers = await this.providers.rows(tx);
        return { settings: aiSettingsSchema.parse(row.value), providers };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  key(row: Provider): string | null {
    if (!row.keyEnc) return null;
    const version = `${row.updatedAt.toISOString()}:${Buffer.from(row.keyEnc).toString('base64')}`;
    const hit = this.keys.get(row.id);
    if (hit?.version === version) return hit.key;
    try {
      const key = this.box.open(row.keyEnc).toString('utf8');
      this.keys.set(row.id, { version, key });
      return key;
    } catch {
      this.keys.delete(row.id);
      this.logger.warn('AI key cannot be decrypted; configure it again');
      return null;
    }
  }
  async invalidate(): Promise<void> {
    this.keys.clear();
    try {
      await this.redis.client.publish(this.redis.channel('llm:config:changed'), 'changed');
    } catch {
      this.logger.warn('AI cache notification unavailable; runtime revision checks remain active');
    }
  }
}
