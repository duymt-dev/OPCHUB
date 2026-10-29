import { auditLog } from '../audit-store';
import { readMockAdminPrices, resetMockPrices, restoreMockPrices } from '../price-config';
import { readMockPricingSettingsLog, replaceMockPricingSettingsLog } from '../settings-log';
import { pricingSnapshotSchema, type PricingSnapshot } from './schema';

export function capturePricingSnapshot(): PricingSnapshot {
  return pricingSnapshotSchema.parse({
    config: readMockAdminPrices(),
    settingsLog: readMockPricingSettingsLog(),
    audit: auditLog().filter((row) => row.action === 'pricing.update'),
  });
}

/** A legacy snapshot has defaults, not prices left behind by a different runtime. */
export function restorePricingSnapshot(input: unknown): void {
  const data = input === undefined ? undefined : pricingSnapshotSchema.parse(input);
  if (data) restoreMockPrices(data.config);
  else resetMockPrices();
  replaceMockPricingSettingsLog(data?.settingsLog ?? []);
  const audit = auditLog();
  const unrelated = audit.filter((row) => row.action !== 'pricing.update');
  const pricing = (data?.audit ?? []).map(({ diff, ...row }) => ({
    ...row,
    ...(diff ? { diff } : {}),
  }));
  audit.splice(0, audit.length, ...pricing, ...unrelated);
}
