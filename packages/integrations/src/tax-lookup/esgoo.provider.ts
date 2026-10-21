import { z } from 'zod';
import { fetchJson, type HttpOptions } from '../http';
import type { TaxInfo, TaxLookupProvider } from './types';

/**
 * Response thật (kiểm 21/10/2026): `{ error: 0, data: { ten, mst, dc, daidien, tinhtrang, dt, hoatdong } }`;
 * không thấy → `{ error: 1, data: [] }`. Không có ngành nghề. Tên cũ (`dia_chi`, `dai_dien`…) vẫn nhận.
 */
const esgooSchema = z.object({
  error: z.number(),
  data: z
    .union([
      z
        .object({
          ten: z.string(),
          mst: z.string().optional(),
          ma_so_thue: z.string().optional(),
          dc: z.string().optional(),
          dia_chi: z.string().optional(),
          daidien: z.string().optional(),
          dai_dien: z.string().optional(),
          nganh_nghe: z.array(z.string()).optional(),
          tinhtrang: z.string().optional(),
          tinh_trang: z.string().optional(),
        })
        .passthrough(),
      z.array(z.unknown()),
    ])
    .nullable()
    .optional(),
});

/** Chuỗi rỗng / khoảng trắng → null */
const text = (v: string | undefined) => v?.trim() || null;

/** esgoo.net/api-mst — miễn phí, có người đại diện, không có ngành nghề. TODO(OQ-06): xác nhận hạn mức gọi */
export class EsgooTaxProvider implements TaxLookupProvider {
  readonly name = 'esgoo';

  constructor(private readonly http: Pick<HttpOptions, 'fetchImpl'> = {}) {}

  async lookup(taxCode: string): Promise<TaxInfo | null> {
    const r = await fetchJson(
      `https://esgoo.net/api-mst/${encodeURIComponent(taxCode)}.htm`,
      esgooSchema,
      { provider: this.name, ...this.http },
    );
    const d = r.data;
    if (r.error !== 0 || !d || Array.isArray(d)) return null;
    return {
      taxCode: text(d.mst) ?? text(d.ma_so_thue) ?? taxCode,
      name: d.ten.trim(),
      address: text(d.dc) ?? text(d.dia_chi) ?? '',
      representative: text(d.daidien) ?? text(d.dai_dien),
      industries: d.nganh_nghe ?? [],
      status: text(d.tinhtrang) ?? text(d.tinh_trang),
    };
  }
}
