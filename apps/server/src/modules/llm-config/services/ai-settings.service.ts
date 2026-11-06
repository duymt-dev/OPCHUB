import { Injectable } from '@nestjs/common';
import { LocalLlmProvider } from '@opchub/integrations';
import {
  AI_PROVIDER_CATALOG,
  AI_PROVIDER_IDS,
  aiKeyLast4,
  aiSettingsResponseSchema,
  aiSettingsSchema,
  type AiProviderId,
  type AiSettingsUpdate,
  type AiVerify,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { SecretBox } from '@/common/crypto/secret-box';
import { AppError, conflict } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AiConfigCache } from '../ai-config-cache';
import { AiProviderRepository, type ProviderWrite } from '../repositories/ai-provider.repository';
import { AiBudgetService, aiMonth } from './ai-budget.service';
interface Actor {
  id: string;
  ip: string | null;
}

@Injectable()
export class AiSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rows: AiProviderRepository,
    private readonly box: SecretBox,
    private readonly audit: AuditService,
    private readonly cache: AiConfigCache,
    private readonly budget: AiBudgetService,
  ) {}
  async get() {
    const { settings, providers } = await this.cache.snapshot();
    const month = aiMonth();
    const cost = await this.budget.spend(month);
    return aiSettingsResponseSchema.parse({
      ...settings,
      providers: [...providers]
        .sort(
          (a, b) =>
            AI_PROVIDER_IDS.findIndex((id) => id === a.id) -
            AI_PROVIDER_IDS.findIndex((id) => id === b.id),
        )
        .map((p) => ({
          id: p.id,
          enabled: p.enabled,
          baseUrl: p.baseUrl,
          model: p.model,
          hasKey: p.keyEnc !== null,
          keyLast4: aiKeyLast4(this.cache.key(p)),
          status: p.status,
          checkedAt: p.checkedAt?.toISOString() ?? null,
          priceIn: p.priceIn,
          priceOut: p.priceOut,
        })),
      spend: {
        month,
        cost,
        pct: settings.budget ? Math.min(100, Math.round((cost * 100) / settings.budget)) : 0,
      },
    });
  }
  async save(actor: Actor, input: AiSettingsUpdate) {
    await this.prisma.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(712001)`;
      const old = await this.rows.rows(tx);
      const writes = input.providers.map((p): ProviderWrite => {
        const existing = old.find((r) => r.id === p.id);
        const keyEnc = p.key ? Uint8Array.from(this.box.seal(p.key)) : existing?.keyEnc;
        if (
          p.enabled &&
          (!p.baseUrl || !p.model || !keyEnc || (!p.key && existing && !this.cache.key(existing)))
        )
          throw conflict(`${AI_PROVIDER_CATALOG[p.id].name}: thiếu API key / Base URL / mô hình`);
        return {
          id: p.id,
          enabled: p.enabled,
          baseUrl: p.baseUrl,
          model: p.model,
          keyHex: keyEnc ? Buffer.from(keyEnc).toString('hex') : null,
          priceIn: p.priceIn,
          priceOut: p.priceOut,
          reset: Boolean(p.key || p.baseUrl !== existing?.baseUrl || p.model !== existing?.model),
        };
      });
      if (!writes.some((p) => p.enabled)) throw conflict('Cần bật ít nhất 1 nhà cung cấp AI');
      for (const id of [...Object.values(input.use), input.fallback]) {
        if (id && !writes.some((p) => p.id === id && p.enabled))
          throw new AppError('VALIDATION_ERROR', 'Nhà cung cấp đang tắt');
      }
      const settings = aiSettingsSchema.parse(
        Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'providers')),
      );
      await this.rows.write(tx, writes);
      await tx.appSetting.upsert({
        where: { key: 'ai' },
        create: { key: 'ai', value: settings },
        update: { value: settings },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'llm.update',
        entity: 'ai',
        entityId: 'ai',
        tag: 'settings',
        summary: 'Đã lưu cấu hình AI Provider',
        diff: { settings, keyChanged: input.providers.filter((p) => p.key).map((p) => p.id) },
      });
    });
    await this.cache.invalidate();
    return this.get();
  }
  async verify(actor: Actor, id: AiProviderId, input: AiVerify) {
    const { settings, providers } = await this.cache.snapshot();
    const row = providers.find((p) => p.id === id);
    const key = input.key || (row ? this.cache.key(row) : null);
    if (!key) throw new AppError('VALIDATION_ERROR', 'Vui lòng nhập API key');
    let ok = false;
    try {
      await new LocalLlmProvider({
        ...input,
        apiKey: key,
        maxRequests: 1,
        maxTokens: 16,
        timeoutMs: settings.timeoutMs,
      }).complete('Reply with OK.', { maxTokens: 16 });
      ok = true;
    } catch {
      /* Only the sanitized result below leaves this boundary. */
    }
    await this.prisma.db.$transaction(async (tx) => {
      await tx.llmProvider.update({
        where: { id },
        data: { status: ok ? 'ok' : 'err', checkedAt: new Date() },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'llm.verify',
        entity: 'ai',
        entityId: id,
        tag: 'settings',
        summary: ok ? 'Kiểm tra AI thành công' : 'Kiểm tra AI thất bại',
      });
    });
    await this.cache.invalidate();
    const name = AI_PROVIDER_CATALOG[id].name;
    return {
      ok,
      message: ok
        ? `${name} · kết nối thành công (${input.model})`
        : `Không kết nối được ${name} · kiểm tra API key`,
    };
  }
}
