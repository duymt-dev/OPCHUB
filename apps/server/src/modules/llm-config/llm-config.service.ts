import { Injectable } from '@nestjs/common';
import { LocalLlmProvider } from '@opchub/integrations';
import {
  EMPTY_LLM_CONFIG,
  llmConfigSchema,
  type LlmConfig,
  type LlmConfigUpdate,
  type LlmConfigVerifyResult,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { SecretBox } from '@/common/crypto/secret-box';
import { conflict } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LlmConfigCache } from './llm-config-cache';

interface Actor {
  id: string;
  ip: string | null;
}

@Injectable()
export class LlmConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly box: SecretBox,
    private readonly audit: AuditService,
    private readonly cache: LlmConfigCache,
  ) {}

  async get(): Promise<LlmConfig> {
    const row = await this.cache.row();
    if (!row) return { ...EMPTY_LLM_CONFIG };
    const key = this.cache.key(row);
    return llmConfigSchema.parse({
      baseUrl: row.baseUrl,
      model: row.model,
      maxTokens: row.maxTokens,
      timeoutMs: row.timeoutMs,
      enabled: row.enabled,
      hasKey: row.keyEnc !== null,
      keyLast4: key ? key.slice(-4) : null,
      configured: Boolean(row.enabled && row.baseUrl && row.model && key),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  async save(actor: Actor, input: LlmConfigUpdate): Promise<LlmConfig> {
    const { key, ...fields } = input;
    await this.prisma.db.$transaction(async (tx) => {
      // Serialize first creation and key-retaining saves without racing a key replacement.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(712001)`;
      const existing = await tx.llmConfig.findUnique({ where: { id: 1 } });
      const keyEnc = key ? Uint8Array.from(this.box.seal(key)) : (existing?.keyEnc ?? null);
      if (fields.enabled && !keyEnc) throw conflict('Chưa cấu hình khóa API AI');
      const data = { ...fields, keyEnc };
      await tx.llmConfig.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'llm.update',
        entity: 'llm_config',
        entityId: '1',
        tag: 'settings',
        summary: key ? 'Cập nhật AI và khóa API' : 'Cập nhật AI',
      });
    });
    await this.cache.invalidate();
    return this.get();
  }

  async verify(actor: Actor, input: LlmConfigUpdate): Promise<LlmConfigVerifyResult> {
    const row = await this.cache.row();
    const key = input.key ?? (row ? this.cache.key(row) : null);
    let ok = false;
    if (key) {
      try {
        const adapter = new LocalLlmProvider({
          baseUrl: input.baseUrl,
          model: input.model,
          apiKey: key,
          maxRequests: 1,
          maxTokens: input.maxTokens,
          timeoutMs: input.timeoutMs,
        });
        await adapter.complete('Reply with OK.', { maxTokens: 16 });
        ok = true;
      } catch {
        // Never propagate endpoint credentials or raw provider response/errors to clients/logs.
        ok = false;
      }
    }
    await this.prisma.db.$transaction((tx) =>
      this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'llm.verify',
        entity: 'llm_config',
        entityId: '1',
        tag: 'settings',
        summary: ok ? 'Kiểm tra AI thành công' : 'Kiểm tra AI thất bại',
      }),
    );
    return {
      ok,
      message: ok
        ? 'Kết nối AI thành công'
        : 'Không kết nối được AI. Kiểm tra cấu hình và khóa API.',
    };
  }
}
