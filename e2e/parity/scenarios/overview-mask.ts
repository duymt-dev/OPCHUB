import type { Scenario } from '../types';

/**
 * TIP-V2-305 (BUG-029): biểu đồ tăng trưởng + đường nhỏ ở thẻ số Tổng quan là số thật, trục tính
 * theo max → che vùng biểu đồ, giữ khung (DV-V2-307-4). Dùng cho mọi ảnh nền Tổng quan.
 */
export const OVERVIEW_CHART_MASK: NonNullable<Scenario['mask']> = {
  selector: (c) => [
    // khung biểu đồ = cha của vùng cột (trục + cột), cùng cấu trúc ở hai bên
    c.page.locator('[data-m="bars"]').locator('..'),
    c.page.locator('polyline'),
  ],
  reason: 'Biểu đồ tăng trưởng + đường nhỏ là số thật (DV-V2-307-4)',
};
