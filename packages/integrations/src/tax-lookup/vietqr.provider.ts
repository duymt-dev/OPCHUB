import { z } from 'zod';
import { fetchJson, type HttpOptions } from '../http';
import type { TaxInfo, TaxLookupProvider } from './types';

const vietqrSchema = z.object({
  code: z.string(),
  data: z
    .object({
      id: z.string(),
      name: z.string(),
      address: z.string().default(''),
    })
    .nullable()
    .optional(),
});

/** api.vietqr.io/v2/business/:mst — miễn phí, không có ngành nghề / người đại diện */
export class VietqrTaxProvider implements TaxLookupProvider {
  readonly name = 'vietqr';

  constructor(private readonly http: Pick<HttpOptions, 'fetchImpl'> = {}) {}

  async lookup(taxCode: string): Promise<TaxInfo | null> {
    const r = await fetchJson(
      `https://api.vietqr.io/v2/business/${encodeURIComponent(taxCode)}`,
      vietqrSchema,
      { provider: this.name, ...this.http },
    );
    if (r.code !== '00' || !r.data) return null;
    return {
      taxCode: r.data.id,
      name: r.data.name,
      address: r.data.address,
      representative: null,
      industries: [],
      status: null,
    };
  }
}
