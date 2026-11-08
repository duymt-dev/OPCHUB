import { REGION_LABEL_SHORT } from '@opchub/shared';
import type { Region } from '@opchub/db';
import { regionOf } from '@opchub/shared/fixtures';

/** Enum DB ↔ chuỗi hiển thị của hợp đồng (`groupSummarySchema.region`, fixtures `regionOf`) */
const LABEL = REGION_LABEL_SHORT;
export const OTHER_REGION = 'Khác';

export const regionLabel = (r: Region): string => LABEL[r];

/** `Khác` không có enum → null (lọc theo `Khác` trả rỗng: mọi tỉnh đều thuộc 3 miền) */
export function regionFromLabel(label: string): Region | null {
  const hit = Object.entries(LABEL).find(([, v]) => v === label);
  return hit ? (hit[0] as Region) : null;
}

/** Miền của tỉnh theo danh mục tỉnh/thành; tỉnh lạ xếp `south` không được — trả null để báo lỗi */
export const regionOfProvince = (province: string): Region | null =>
  regionFromLabel(regionOf(province));
