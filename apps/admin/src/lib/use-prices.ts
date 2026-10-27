'use client';

import { priceConfigSchema } from '@opchub/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';

/**
 * D-94 5A: giá gói hiện hành (Cấu hình bảng giá) cho màn đọc giá ngoài tab Cài đặt (Chính sách
 * Affiliate). Lưu bảng giá ở tab Cài đặt làm mới khoá này (`use-price-config`).
 */
export const usePrices = () =>
  useQuery({
    queryKey: ['public', 'price-config'],
    queryFn: () => api('/public/price-config', { schema: priceConfigSchema }),
  }).data;
