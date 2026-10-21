import { z } from 'zod';
import { fetchJson, type HttpOptions } from '../http';
import type { TaxInfo, TaxLookupProvider } from './types';

/** Ngành nghề trong `industries`: tài liệu chỉ ghi "json" → nhận chuỗi hoặc object mã + tên */
const industrySchema = z.union([
  z.string(),
  z
    .object({
      code: z.string().optional(),
      name: z.string().optional(),
      industry_code: z.string().optional(),
      industry_name: z.string().optional(),
    })
    .passthrough(),
]);

const businessSchema = z
  .object({
    tax_code: z.string(),
    name: z.string(),
    address: z.string().nullish(),
    main_industry_code: z.string().nullish(),
    industry_codes: z.array(z.string()).nullish(),
    industries: z.array(industrySchema).nullish(),
  })
  .passthrough();

const dlplSchema = z.object({
  success: z.literal(true),
  data: z.array(businessSchema),
});

type Business = z.infer<typeof businessSchema>;

export interface DlplOptions extends Pick<HttpOptions, 'fetchImpl'> {
  apiKey: string;
  baseUrl?: string;
}

export const DLPL_BASE_URL = 'https://api.dulieuphapluat.vn/v1';

function industryLine(i: z.infer<typeof industrySchema>): { code: string; line: string } {
  if (typeof i === 'string') {
    const code = /^\d+/.exec(i)?.[0] ?? i;
    return { code, line: i };
  }
  const code = i.code ?? i.industry_code ?? '';
  const name = i.name ?? i.industry_name ?? '';
  return { code, line: name ? `${code} – ${name}` : code };
}

/** Ngành chính đứng đầu (toBizLookup lấy phần tử đầu làm mainIndustry), dạng "6201 – Tên ngành" */
function industries(b: Business): string[] {
  const lines = (b.industries ?? []).map(industryLine).filter((x) => x.line);
  const fromCodes = lines.length
    ? lines
    : (b.industry_codes ?? []).map((code) => ({ code, line: code }));
  const main = b.main_industry_code;
  const head = main ? (fromCodes.find((x) => x.code === main) ?? { code: main, line: main }) : null;
  const rest = fromCodes.filter((x) => x.code !== main).map((x) => x.line);
  return head ? [head.line, ...rest] : rest;
}

/**
 * DLPL API `GET /v1/businesses?tax_code=` (D-65, gói Starter+). Key chỉ gửi qua header.
 * Lỗi HTTP / hết lượt → IntegrationError để chain sang nguồn sau (không trả null, tránh cache "không thấy").
 * Nguồn không có người đại diện → null, người dùng tự nhập.
 */
export class DlplTaxProvider implements TaxLookupProvider {
  readonly name = 'dlpl';
  private readonly baseUrl: string;

  constructor(private readonly opts: DlplOptions) {
    this.baseUrl = (opts.baseUrl ?? DLPL_BASE_URL).replace(/\/+$/, '');
  }

  async lookup(taxCode: string): Promise<TaxInfo | null> {
    const r = await fetchJson(
      `${this.baseUrl}/businesses?tax_code=${encodeURIComponent(taxCode)}&per_page=1`,
      dlplSchema,
      {
        provider: this.name,
        ...(this.opts.fetchImpl ? { fetchImpl: this.opts.fetchImpl } : {}),
        init: {
          headers: { Authorization: `Bearer ${this.opts.apiKey}`, Accept: 'application/json' },
        },
      },
    );
    const b = r.data.find((x) => x.tax_code === taxCode);
    if (!b) return null;
    return {
      taxCode: b.tax_code,
      name: b.name,
      address: b.address ?? '',
      representative: null,
      industries: industries(b),
      status: null,
    };
  }
}
