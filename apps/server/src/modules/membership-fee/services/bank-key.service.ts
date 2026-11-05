import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { bankSealedKeySchema } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { ENV, type Env } from '@/common/config';
import { SecretBox } from '@/common/crypto/secret-box';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { BankKeyRepository } from '../repositories/bank-key.repository';

const CACHE = 'bank:webhook-key';
const VERSION = 'bank:webhook-key-version';
@Injectable()
export class BankKeyService {
  private readonly logger = new Logger(BankKeyService.name);
  constructor(
    private readonly repo: BankKeyRepository,
    private readonly prisma: PrismaService,
    private readonly box: SecretBox,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}
  private async sealed() {
    const version = (await this.redis.client.get(VERSION)) ?? '0';
    const cached = await this.redis.client.get(CACHE);
    if (cached) {
      const hit = bankSealedKeySchema.safeParse(JSON.parse(cached));
      if (hit.success) return hit.data;
    }
    const row = await this.repo.read();
    const value = {
      encrypted: Buffer.from(row?.keyEnc ?? this.box.seal(this.env.BANK_WEBHOOK_SECRET)).toString(
        'base64',
      ),
      hint: row?.hint ?? this.env.BANK_WEBHOOK_SECRET.slice(-4),
    };
    // An in-flight old read must not repopulate the cache after rotation invalidation.
    await this.redis.client.eval(
      "if (redis.call('GET',KEYS[1]) or '0')==ARGV[1] then return redis.call('SET',KEYS[2],ARGV[2],'EX',60) end return 0",
      2,
      VERSION,
      CACHE,
      version,
      JSON.stringify(value),
    );
    return value;
  }
  async hint() {
    return (await this.sealed()).hint;
  }
  async current(): Promise<string> {
    try {
      return this.box.open(Buffer.from((await this.sealed()).encrypted, 'base64')).toString('utf8');
    } catch {
      this.logger.error('Cannot decrypt bank webhook credential');
      throw new Error('Không thể đọc khóa webhook');
    }
  }
  async rotate(actor: { id: string; ip: string | null }) {
    const key = randomBytes(32).toString('base64url');
    const hint = key.slice(-4);
    await this.prisma.db.$transaction(async (tx) => {
      await this.repo.rotate(tx, new Uint8Array(this.box.seal(key)), hint, actor.id);
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'bank.key_rotate',
        entity: 'bank_webhook_key',
        entityId: '1',
        tag: 'settings',
        summary: 'Tạo lại khóa webhook ngân hàng',
        diff: { hint },
      });
    });
    await this.redis.client.multi().incr(VERSION).del(CACHE).exec();
    return { key, hint };
  }
}
