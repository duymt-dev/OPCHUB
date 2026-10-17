import { z } from 'zod';
import { fetchJson, type HttpOptions } from '../http';
import type { TaxInfo, TaxLookupProvider } from './types';

const esgooSchema = z.object({
  error: z.number(),
  data: z
    .object({
      ma_so_thue: z.string().optional(),
      ten: z.string(),
      dia_chi: z.string().default(''),
      dai_dien: z.string().optional(),
      nganh_nghe: z.array(z.string()).optional(),
      tinh_trang: z.string().optional(),
    })
    .passthrough()
    .nullable()
    .optional(),
});

/** esgoo.net/api-mst — nguồn chính (D-17). TODO(OQ-06): xác nhận hạn mức gọi */
export class EsgooTaxProvider implements TaxLookupProvider {
  readonly name = 'esgoo';

  constructor(private readonly http: Pick<HttpOptions, 'fetchImpl'> = {}) {}

  async lookup(taxCode: string): Promise<TaxInfo | null> {
    const r = await fetchJson(
      `https://esgoo.net/api-mst/${encodeURIComponent(taxCode)}.htm`,
      esgooSchema,
      { provider: this.name, ...this.http },
    );
    if (r.error !== 0 || !r.data) return null;
    return {
      taxCode: r.data.ma_so_thue ?? taxCode,
      name: r.data.ten,
      address: r.data.dia_chi,
      representative: r.data.dai_dien ?? null,
      industries: r.data.nganh_nghe ?? [],
      status: r.data.tinh_trang ?? null,
    };
  }
}
