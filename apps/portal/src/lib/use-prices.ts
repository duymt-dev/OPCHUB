'use client';

import { priceConfigSchema } from '@opchub/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';

export const priceKeys = { config: ['public', 'price-config'] as const };

/**
 * D-94 5A: Cấu hình bảng giá (Admin › Cài đặt) — Portal không giữ hằng số giá. Không cần đăng nhập
 * (câu đồng ý phí ở đăng ký); giữ 30 giây như mặc định, lần mở Bảng giá kế tiếp thấy giá mới (E2E-12).
 */
export const usePrices = () =>
  useQuery({
    queryKey: priceKeys.config,
    queryFn: () => api('/public/price-config', { schema: priceConfigSchema }),
  }).data;
