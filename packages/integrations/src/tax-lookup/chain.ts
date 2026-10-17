import type { TaxInfo, TaxLookupProvider } from './types';

/**
 * D-17: thử lần lượt từng nguồn; nguồn lỗi (mạng, dữ liệu lạ) thì sang nguồn sau.
 * Tất cả lỗi / không thấy → null để người dùng nhập tay, không chặn đăng ký.
 */
export class ChainTaxProvider implements TaxLookupProvider {
  readonly name = 'chain';

  constructor(
    private readonly providers: TaxLookupProvider[],
    private readonly onError: (provider: string, err: unknown) => void = () => undefined,
  ) {}

  async lookup(taxCode: string): Promise<TaxInfo | null> {
    for (const p of this.providers) {
      try {
        const r = await p.lookup(taxCode);
        if (r) return r;
      } catch (err) {
        this.onError(p.name, err);
      }
    }
    return null;
  }
}
