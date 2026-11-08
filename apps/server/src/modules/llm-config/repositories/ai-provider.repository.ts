import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

export const AI_PROVIDER_SELECT = {
  id: true,
  enabled: true,
  baseUrl: true,
  model: true,
  keyEnc: true,
  status: true,
  checkedAt: true,
  priceIn: true,
  priceOut: true,
  updatedAt: true,
} as const;
export interface ProviderWrite {
  id: string;
  enabled: boolean;
  baseUrl: string;
  model: string;
  keyHex: string | null;
  priceIn: number;
  priceOut: number;
  reset: boolean;
}
@Injectable()
export class AiProviderRepository {
  constructor(private readonly prisma: PrismaService) {}
  async settingsForUpdate(tx: DbTx) {
    const [row] = await tx.$queryRaw<
      { value: unknown }[]
    >`SELECT value FROM app_settings WHERE key='ai' FOR UPDATE`;
    if (!row) throw Error('Missing AI settings');
    return row;
  }
  rows(tx: DbTx = this.prisma.db) {
    return tx.llmProvider.findMany({ select: AI_PROVIDER_SELECT, orderBy: { id: 'asc' } });
  }
  async write(tx: DbTx, rows: ProviderWrite[]): Promise<void> {
    // Six fixed providers, one parameterized update; no per-provider SQL loop.
    await tx.$executeRaw(Prisma.sql`
      UPDATE llm_providers p SET enabled = x.enabled, base_url = x."baseUrl",
        model = x.model, key_enc = decode(x."keyHex", 'hex'), price_in = x."priceIn",
        price_out = x."priceOut", updated_at = now(),
        status = CASE WHEN x.reset THEN 'none' ELSE p.status END,
        checked_at = CASE WHEN x.reset THEN NULL ELSE p.checked_at END
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(
        id text, enabled boolean, "baseUrl" text, model text, "keyHex" text,
        "priceIn" integer, "priceOut" integer, reset boolean)
      WHERE p.id = x.id`);
  }
}
