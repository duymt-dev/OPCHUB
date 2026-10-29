import type { PriceConfig } from '../membership/pricing';

/**
 * Giá mặc định §27.2 / prototype v4.2 `_prc(s)` — CHỈ dùng cho migration / seed / test / MSW
 * (GOAL V4.2: code chạy thật đọc giá từ Cấu hình bảng giá, không dùng hằng số này).
 */
export const PRICE_DEFAULTS: PriceConfig = {
  per: { list: 200_000, y: 1_200_000 },
  biz: { list: 500_000, y: 3_600_000 },
  fund: { p: 15_000_000, r: 7_500_000, mo: 6 },
};
