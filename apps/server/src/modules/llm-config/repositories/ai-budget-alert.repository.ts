import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import { aiSettingsSchema, type AiSettings } from '@opchub/shared/api-domains';

@Injectable()
export class AiBudgetAlertRepository {
  async current(tx: DbTx) {
    const [row] = await tx.$queryRaw<
      { value: unknown }[]
    >`SELECT value FROM app_settings WHERE key='ai' FOR SHARE`;
    return aiSettingsSchema.parse(row?.value);
  }
  async claim(tx: DbTx, month: string, settings: AiSettings, refused: boolean) {
    // Create a zero-usage month too: the first refused reservation must alert.
    await tx.$executeRaw`INSERT INTO llm_usage_months (month) VALUES (${month}) ON CONFLICT DO NOTHING`;
    return tx.$queryRaw<{ warn: boolean; exhausted: boolean }[]>(Prisma.sql`
      WITH before AS (
        SELECT month, cost, warned_at, exhausted_at FROM llm_usage_months
        WHERE month = ${month} FOR UPDATE
      ), changed AS (
        UPDATE llm_usage_months m SET
          warned_at = CASE WHEN b.warned_at IS NULL AND b.cost * 100 >=
            ${settings.budget}::bigint * ${settings.warnPct} THEN now() ELSE b.warned_at END,
          exhausted_at = CASE WHEN b.exhausted_at IS NULL AND
            (b.cost >= ${settings.budget}::bigint OR ${refused}) THEN now() ELSE b.exhausted_at END
        FROM before b WHERE m.month = b.month
        RETURNING (b.warned_at IS NULL AND m.warned_at IS NOT NULL) AS warn,
          (b.exhausted_at IS NULL AND m.exhausted_at IS NOT NULL) AS exhausted
      ) SELECT warn, exhausted FROM changed`);
  }
  async rearm(tx: DbTx, month: string, old: AiSettings, next: AiSettings) {
    if (next.budget > old.budget || next.warnPct > old.warnPct) {
      await tx.llmUsageMonth.updateMany({
        where: { month },
        data: { warnedAt: null, exhaustedAt: null },
      });
    }
  }
}
