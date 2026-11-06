import { adminConversionSchema } from '@opchub/shared/api-domains';
import type { ConversionAggregate } from './conversion.repository';

const rate = (paid: number, expired: number) =>
  paid + expired ? Math.round((paid * 100) / (paid + expired)) : 0;
/** No denominator contribution from trial or regional-director fee exemptions. */
export function buildConversion(aggregate: ConversionAggregate[]) {
  const labels = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' };
  const rows = (['north', 'central', 'south'] as const).map((region) => {
    const r = aggregate.find((a) => a.region === region);
    const trial = Number(r?.trial ?? 0),
      paid = Number(r?.paid ?? 0),
      expired = Number(r?.expired ?? 0);
    return {
      region,
      label: labels[region],
      directorName: r?.directorName ?? null,
      trial,
      paid,
      expired,
      ratePct: rate(paid, expired),
    };
  });
  const total = aggregate.reduce(
    (sum, r) => ({
      trial: sum.trial + Number(r.trial),
      paid: sum.paid + Number(r.paid),
      expired: sum.expired + Number(r.expired),
    }),
    { trial: 0, paid: 0, expired: 0 },
  );
  return adminConversionSchema.parse({
    rows,
    total: { ...total, ratePct: rate(total.paid, total.expired) },
  });
}
