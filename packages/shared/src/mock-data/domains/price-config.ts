import { PRICE_DEFAULTS } from '../../fixtures/price-defaults';
import type { AdminPriceConfig, PriceConfig, PriceConfigSave } from '../../membership/pricing';
import { conflict, ok, type MockResult } from './util';

/**
 * D-94 5A ở MSW: Cấu hình bảng giá giống server — một bản ghi + version, lưu ghi nhật ký `pricing`.
 * Mọi màn MSW (Bảng giá, phí, Gọi vốn, Affiliate) đọc giá từ đây, không từ hằng số.
 */
interface PriceState {
  config: PriceConfig;
  version: number;
  updatedAt: string;
}

/**
 * Trạng thái mô-đun (không import `store` — tránh vòng `store → admin → extras → price-config`);
 * `resetMockDb()` gọi `resetMockPrices()` để mỗi test bắt đầu từ giá mặc định.
 */
let current: PriceState | null = null;
const clone = (c: PriceConfig): PriceConfig => ({
  per: { ...c.per },
  biz: { ...c.biz },
  fund: { ...c.fund },
});

function state(): PriceState {
  current ??= { config: clone(PRICE_DEFAULTS), version: 1, updatedAt: new Date(0).toISOString() };
  return current;
}

export function resetMockPrices(): void {
  current = null;
}

export const readMockPrices = (): PriceConfig => clone(state().config);

export const readMockAdminPrices = (): AdminPriceConfig => {
  const s = state();
  return { ...clone(s.config), version: s.version, updatedAt: s.updatedAt };
};

/** Lưu bảng giá; caller (handler Admin) ghi nhật ký `pricing` qua `logSetting` */
export function saveMockPrices(body: PriceConfigSave): MockResult<{
  saved: AdminPriceConfig;
  before: PriceConfig;
}> {
  const s = state();
  if (body.version !== s.version) {
    return conflict('Bảng giá vừa được người khác cập nhật — tải lại để xem giá mới');
  }
  const before = clone(s.config);
  s.config = clone(body);
  s.version += 1;
  s.updatedAt = new Date().toISOString();
  return ok({ saved: readMockAdminPrices(), before });
}
