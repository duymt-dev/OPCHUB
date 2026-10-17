import { Inject, Injectable } from '@nestjs/common';
import { type TaxInfo, taxInfoSchema, type TaxLookupProvider } from '@opchub/integrations';
import { type BizLookup, TAX_CODE_RE } from '@opchub/shared/api';
import { AppError, notFound } from '@/common/errors';
import { TAX_LOOKUP } from '@/common/integrations';
import { RedisService } from '@/common/redis/redis.service';

const CACHE_TTL_SEC = 30 * 24 * 3600;
const MISS = 'none';
const key = (tax: string) => `biz:lookup:${tax}`;

/** "6201 – Lập trình máy vi tính" giữ nguyên dạng nguồn trả */
export function toBizLookup(t: TaxInfo): BizLookup {
  const [main = '', ...others] = t.industries;
  return {
    taxCode: t.taxCode,
    companyName: t.name,
    representative: t.representative ?? '',
    mainIndustry: main,
    otherIndustries: others,
  };
}

/** `GET /biz/lookup` (D-17): tra MST qua adapter, cache Redis 30 ngày (cả kết quả "không thấy") */
@Injectable()
export class BizLookupService {
  constructor(
    private readonly redis: RedisService,
    @Inject(TAX_LOOKUP) private readonly provider: TaxLookupProvider,
  ) {}

  async lookup(taxCode: string): Promise<BizLookup> {
    const tax = taxCode.trim();
    if (!TAX_CODE_RE.test(tax)) {
      throw new AppError('VALIDATION_ERROR', 'Mã số thuế gồm 10 hoặc 13 chữ số', [
        { path: 'tax', message: 'Mã số thuế gồm 10 hoặc 13 chữ số' },
      ]);
    }
    const info = await this.raw(tax);
    if (!info) throw notFound('Không tìm thấy doanh nghiệp với mã số thuế này');
    return toBizLookup(info);
  }

  /** null = nguồn không có MST; lỗi mạng ném ra (không cache) */
  async raw(taxCode: string): Promise<TaxInfo | null> {
    const cached = await this.redis.client.get(key(taxCode));
    if (cached === MISS) return null;
    if (cached) {
      const hit = taxInfoSchema.safeParse(JSON.parse(cached));
      if (hit.success) return hit.data;
    }
    const info = await this.provider.lookup(taxCode);
    await this.redis.client.set(
      key(taxCode),
      info ? JSON.stringify(info) : MISS,
      'EX',
      CACHE_TTL_SEC,
    );
    return info;
  }
}
